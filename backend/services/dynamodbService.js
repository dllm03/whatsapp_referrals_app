// backend/services/dynamodbService.js
require('dotenv').config();
const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize DynamoDB with IAM role (no hardcoded credentials)
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION
});

const TABLE_NAME = process.env.DYNAMO_TABLE_NAME;

/**
 * Sanitize input to prevent injection attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .substring(0, 500); // Limit length
};

/**
 * Validate UUID format
 */
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Generate secure unique ID
 */
const generateId = () => {
  return crypto.randomUUID();
};

/**
 * Insert referral with security checks
 */
const insertReferral = async (referralData, userId) => {
  try {
    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Sanitize all input fields
    const sanitizedData = {
      referralId: generateId(),
      userId: userId, // Link referral to user
      name: sanitizeInput(referralData.name),
      businessName: sanitizeInput(referralData.businessName),
      profession: sanitizeInput(referralData.profession),
      city: sanitizeInput(referralData.city),
      state: sanitizeInput(referralData.state),
      country: sanitizeInput(referralData.country),
      contact: sanitizeInput(referralData.contact),
      message: sanitizeInput(referralData.message),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      // Add metadata for tracking
      sourceFile: referralData.sourceFile || null,
      verified: false
    };

    // Validate required fields
    if (!sanitizedData.businessName || !sanitizedData.profession) {
      throw new Error('Missing required fields: businessName and profession');
    }

    const params = {
      TableName: TABLE_NAME,
      Item: sanitizedData,
      // Prevent overwriting existing items
      ConditionExpression: 'attribute_not_exists(referralId)'
    };

    await dynamodb.put(params).promise();

    return {
      success: true,
      referralId: sanitizedData.referralId,
      data: sanitizedData
    };
  } catch (error) {
    console.error('Insert referral error:', error);
    
    if (error.code === 'ConditionalCheckFailedException') {
      throw new Error('Referral already exists');
    }
    
    throw new Error('Failed to create referral');
  }
};

/**
 * Get referral by ID with ownership check
 */
const getReferralById = async (referralId, userId) => {
  try {
    if (!isValidUUID(referralId)) {
      throw new Error('Invalid referral ID format');
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        referralId: referralId
      }
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      throw new Error('Referral not found');
    }

    // Verify ownership
    if (result.Item.userId !== userId) {
      throw new Error('Unauthorized access to referral');
    }

    return {
      success: true,
      data: result.Item
    };
  } catch (error) {
    console.error('Get referral error:', error);
    throw error;
  }
};

/**
 * Query referrals with filters (using GSI)
 */
const queryReferrals = async (filters, userId, limit = 50) => {
  try {
    // Always filter by userId to ensure users only see their own data
    let params = {
      TableName: TABLE_NAME,
      IndexName: 'UserIdIndex', // GSI with userId as partition key
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: Math.min(limit, 100) // Cap at 100 items
    };

    // Add filter expressions for additional filters
    const filterExpressions = [];
    const expressionAttributeNames = {};

    if (filters.city) {
      filterExpressions.push('contains(#city, :city)');
      expressionAttributeNames['#city'] = 'city';
      params.ExpressionAttributeValues[':city'] = sanitizeInput(filters.city);
    }

    if (filters.profession) {
      filterExpressions.push('contains(#profession, :profession)');
      expressionAttributeNames['#profession'] = 'profession';
      params.ExpressionAttributeValues[':profession'] = sanitizeInput(filters.profession);
    }

    if (filters.businessName) {
      filterExpressions.push('contains(#businessName, :businessName)');
      expressionAttributeNames['#businessName'] = 'businessName';
      params.ExpressionAttributeValues[':businessName'] = sanitizeInput(filters.businessName);
    }

    if (filters.status) {
      filterExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      params.ExpressionAttributeValues[':status'] = sanitizeInput(filters.status);
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await dynamodb.query(params).promise();

    return {
      success: true,
      items: result.Items || [],
      count: result.Count,
      scannedCount: result.ScannedCount,
      lastEvaluatedKey: result.LastEvaluatedKey
    };
  } catch (error) {
    console.error('Query referrals error:', error);
    throw new Error('Failed to query referrals');
  }
};

/**
 * Update referral with ownership check
 */
const updateReferral = async (referralId, updates, userId) => {
  try {
    if (!isValidUUID(referralId)) {
      throw new Error('Invalid referral ID format');
    }

    // First verify ownership
    const existing = await getReferralById(referralId, userId);
    if (!existing.success) {
      throw new Error('Referral not found');
    }

    // Sanitize updates
    const sanitizedUpdates = {};
    const allowedFields = ['businessName', 'profession', 'city', 'state', 'country', 'contact', 'message', 'status', 'verified'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = sanitizeInput(value);
      }
    }

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(sanitizedUpdates).forEach((key, index) => {
      updateExpressions.push(`#field${index} = :value${index}`);
      expressionAttributeNames[`#field${index}`] = key;
      expressionAttributeValues[`:value${index}`] = sanitizedUpdates[key];
    });

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: TABLE_NAME,
      Key: {
        referralId: referralId
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      // Ensure userId hasn't changed (additional security)
      ConditionExpression: 'userId = :userId',
      ReturnValues: 'ALL_NEW'
    };

    expressionAttributeValues[':userId'] = userId;

    const result = await dynamodb.update(params).promise();

    return {
      success: true,
      data: result.Attributes
    };
  } catch (error) {
    console.error('Update referral error:', error);
    
    if (error.code === 'ConditionalCheckFailedException') {
      throw new Error('Unauthorized to update this referral');
    }
    
    throw new Error('Failed to update referral');
  }
};

/**
 * Delete referral with ownership check
 */
const deleteReferral = async (referralId, userId) => {
  try {
    if (!isValidUUID(referralId)) {
      throw new Error('Invalid referral ID format');
    }

    // Verify ownership before deletion
    await getReferralById(referralId, userId);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        referralId: referralId
      },
      // Ensure userId matches (additional security)
      ConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    await dynamodb.delete(params).promise();

    return {
      success: true,
      message: 'Referral deleted successfully'
    };
  } catch (error) {
    console.error('Delete referral error:', error);
    
    if (error.code === 'ConditionalCheckFailedException') {
      throw new Error('Unauthorized to delete this referral');
    }
    
    throw new Error('Failed to delete referral');
  }
};

/**
 * Batch insert referrals (for WhatsApp import)
 */
const batchInsertReferrals = async (referrals, userId, sourceFile) => {
  try {
    if (!Array.isArray(referrals) || referrals.length === 0) {
      throw new Error('Invalid referrals array');
    }

    // Limit batch size
    const maxBatchSize = 25; // DynamoDB limit
    const batches = [];
    
    for (let i = 0; i < referrals.length; i += maxBatchSize) {
      batches.push(referrals.slice(i, i + maxBatchSize));
    }

    const results = [];
    const errors = [];

    for (const batch of batches) {
      const putRequests = batch.map(referral => {
        const sanitizedData = {
          referralId: generateId(),
          userId: userId,
          name: sanitizeInput(referral.name || ''),
          businessName: sanitizeInput(referral.businessName || referral.business_name || ''),
          profession: sanitizeInput(referral.profession || 'Unknown'),
          city: sanitizeInput(referral.city || ''),
          state: sanitizeInput(referral.state || ''),
          country: sanitizeInput(referral.country || ''),
          contact: sanitizeInput(referral.contact || ''),
          message: sanitizeInput(referral.message || ''),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
          sourceFile: sourceFile,
          verified: false
        };

        return {
          PutRequest: {
            Item: sanitizedData
          }
        };
      });

      const params = {
        RequestItems: {
          [TABLE_NAME]: putRequests
        }
      };

      try {
        const result = await dynamodb.batchWrite(params).promise();
        
        // Handle unprocessed items
        if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
          errors.push({
            message: 'Some items were not processed',
            unprocessedCount: result.UnprocessedItems[TABLE_NAME].length
          });
        }
        
        results.push({
          processed: putRequests.length,
          batch: batch
        });
      } catch (error) {
        console.error('Batch write error:', error);
        errors.push({
          message: error.message,
          batch: batch
        });
      }
    }

    return {
      success: errors.length === 0,
      totalProcessed: results.reduce((sum, r) => sum + r.processed, 0),
      totalBatches: batches.length,
      errors: errors
    };
  } catch (error) {
    console.error('Batch insert error:', error);
    throw new Error('Failed to batch insert referrals');
  }
};

/**
 * Get referral statistics for user
 */
const getReferralStats = async (userId) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Select: 'COUNT'
    };

    const result = await dynamodb.query(params).promise();

    // Get counts by status
    const statusParams = {
      TableName: TABLE_NAME,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    };

    const allItems = await dynamodb.query(statusParams).promise();
    
    const stats = {
      total: result.Count,
      active: 0,
      inactive: 0,
      verified: 0
    };

    allItems.Items.forEach(item => {
      if (item.status === 'active') stats.active++;
      if (item.status === 'inactive') stats.inactive++;
      if (item.verified) stats.verified++;
    });

    return {
      success: true,
      stats
    };
  } catch (error) {
    console.error('Get stats error:', error);
    throw new Error('Failed to get referral statistics');
  }
};

module.exports = {
  insertReferral,
  getReferralById,
  queryReferrals,
  updateReferral,
  deleteReferral,
  batchInsertReferrals,
  getReferralStats
};