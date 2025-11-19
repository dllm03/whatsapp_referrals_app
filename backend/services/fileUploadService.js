// backend/services/fileUploadService.js
require('dotenv').config();
const AWS = require('aws-sdk');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

// Initialize S3 with IAM role (no hardcoded credentials)
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  signatureVersion: 'v4'
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['text/plain', 'text/csv'];
const ALLOWED_EXTENSIONS = ['.txt', '.csv'];

/**
 * Validate file type
 */
const isValidFileType = (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  return ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(mimeType);
};

/**
 * Sanitize filename
 */
const sanitizeFilename = (filename) => {
  // Remove any characters that aren't alphanumeric, dash, underscore, or dot
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
};

/**
 * Generate secure random filename
 */
const generateSecureFilename = (userId, originalFilename) => {
  const ext = path.extname(originalFilename);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  
  return `uploads/${userId}/${timestamp}_${randomString}${ext}`;
};

/**
 * Scan file content for malicious patterns
 */
const scanFileContent = (content) => {
  // Check for common script injection patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /<iframe/i,
    /eval\(/i,
    /document\./i,
    /window\./i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return false;
    }
  }

  return true;
};

/**
 * Configure multer for memory storage
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    if (!isValidFileType(file)) {
      return cb(new Error('Invalid file type. Only .txt and .csv files are allowed.'));
    }
    cb(null, true);
  }
});

/**
 * Upload file to S3 with security measures
 */
const uploadToS3 = async (file, userId) => {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Generate secure filename
    const secureFilename = generateSecureFilename(userId, file.originalname);
    
    // Scan file content for malicious patterns
    const content = file.buffer.toString('utf-8');
    if (!scanFileContent(content)) {
      throw new Error('File contains potentially malicious content');
    }

    // Prepare S3 upload parameters
    const params = {
      Bucket: BUCKET_NAME,
      Key: secureFilename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256', // Enable server-side encryption
      Metadata: {
        'user-id': userId,
        'original-filename': sanitizeFilename(file.originalname),
        'upload-timestamp': new Date().toISOString()
      },
      // Prevent public access
      ACL: 'private',
      // Add content disposition for safer downloads
      ContentDisposition: `attachment; filename="${sanitizeFilename(file.originalname)}"`
    };

    // Upload to S3
    const result = await s3.upload(params).promise();

    return {
      success: true,
      fileKey: result.Key,
      fileUrl: result.Location,
      fileSize: file.size,
      originalName: sanitizeFilename(file.originalname),
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('File upload failed');
  }
};

/**
 * Generate presigned URL for secure file download
 */
const getPresignedDownloadUrl = async (fileKey, userId, expiresIn = 3600) => {
  try {
    // Verify user owns this file
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey
    };

    // Get file metadata
    const metadata = await s3.headObject(params).promise();
    
    // Check if user owns this file
    if (metadata.Metadata['user-id'] !== userId) {
      throw new Error('Unauthorized access to file');
    }

    // Generate presigned URL
    const url = s3.getSignedUrl('getObject', {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: expiresIn, // URL expires in specified seconds
      ResponseContentDisposition: metadata.ContentDisposition
    });

    return {
      success: true,
      url,
      expiresIn
    };
  } catch (error) {
    console.error('Presigned URL error:', error);
    throw new Error('Failed to generate download URL');
  }
};

/**
 * Download file from S3 for processing
 */
const downloadFromS3 = async (fileKey, userId) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey
    };

    // Get file metadata first
    const metadata = await s3.headObject(params).promise();
    
    // Verify ownership
    if (metadata.Metadata['user-id'] !== userId) {
      throw new Error('Unauthorized access to file');
    }

    // Download file
    const data = await s3.getObject(params).promise();

    return {
      success: true,
      content: data.Body.toString('utf-8'),
      contentType: data.ContentType,
      metadata: metadata.Metadata
    };
  } catch (error) {
    console.error('S3 download error:', error);
    throw new Error('Failed to download file');
  }
};

/**
 * Delete file from S3
 */
const deleteFromS3 = async (fileKey, userId) => {
  try {
    // Verify ownership first
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey
    };

    const metadata = await s3.headObject(params).promise();
    
    if (metadata.Metadata['user-id'] !== userId) {
      throw new Error('Unauthorized file deletion');
    }

    // Delete file
    await s3.deleteObject(params).promise();

    return {
      success: true,
      message: 'File deleted successfully'
    };
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error('Failed to delete file');
  }
};

/**
 * List user's files
 */
const listUserFiles = async (userId, maxKeys = 100) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Prefix: `uploads/${userId}/`,
      MaxKeys: maxKeys
    };

    const data = await s3.listObjectsV2(params).promise();

    const files = await Promise.all(
      data.Contents.map(async (item) => {
        try {
          const metadata = await s3.headObject({
            Bucket: BUCKET_NAME,
            Key: item.Key
          }).promise();

          return {
            key: item.Key,
            size: item.Size,
            lastModified: item.LastModified,
            originalName: metadata.Metadata['original-filename'],
            uploadedAt: metadata.Metadata['upload-timestamp']
          };
        } catch (error) {
          // Skip files that can't be accessed
          return null;
        }
      })
    );

    return {
      success: true,
      files: files.filter(f => f !== null)
    };
  } catch (error) {
    console.error('List files error:', error);
    throw new Error('Failed to list files');
  }
};

/**
 * Set up S3 bucket CORS configuration (run once during setup)
 */
const configureBucketCORS = async () => {
  const corsConfiguration = {
    CORSRules: [
      {
        AllowedOrigins: [process.env.FRONTEND_URL || '*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
        AllowedHeaders: ['*'],
        MaxAgeSeconds: 3000,
        ExposeHeaders: ['ETag']
      }
    ]
  };

  try {
    await s3.putBucketCors({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration
    }).promise();

    console.log('CORS configuration applied successfully');
  } catch (error) {
    console.error('CORS configuration error:', error);
  }
};

/**
 * Set up S3 bucket lifecycle policy (run once during setup)
 */
const configureBucketLifecycle = async () => {
  const lifecycleConfiguration = {
    Rules: [
      {
        Id: 'DeleteOldUploads',
        Status: 'Enabled',
        Prefix: 'uploads/',
        Expiration: {
          Days: 90 // Delete files older than 90 days
        }
      }
    ]
  };

  try {
    await s3.putBucketLifecycleConfiguration({
      Bucket: BUCKET_NAME,
      LifecycleConfiguration: lifecycleConfiguration
    }).promise();

    console.log('Lifecycle policy applied successfully');
  } catch (error) {
    console.error('Lifecycle policy error:', error);
  }
};

module.exports = {
  upload,
  uploadToS3,
  getPresignedDownloadUrl,
  downloadFromS3,
  deleteFromS3,
  listUserFiles,
  configureBucketCORS,
  configureBucketLifecycle
};