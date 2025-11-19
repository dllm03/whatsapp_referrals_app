// backend/server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Import services and middleware
const { authenticate, requireRole, rateLimitByUser } = require('./middleware/auth');
const authService = require('./services/authService');
const fileUploadService = require('./services/fileUploadService');
const dynamodbService = require('./services/dynamodbService');

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Body parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Sanitize data against XSS attacks
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Rate limiting for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later.'
});

// ============================================
// HEALTH CHECK & INFO
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// User registration
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const { email, password, ...additionalAttributes } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.registerUser(email, password, additionalAttributes);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Confirm registration
app.post('/api/auth/confirm', authLimiter, async (req, res) => {
  try {
    const { email, confirmationCode } = req.body;

    if (!email || !confirmationCode) {
      return res.status(400).json({
        success: false,
        error: 'Email and confirmation code are required'
      });
    }

    const result = await authService.confirmRegistration(email, confirmationCode);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Resend confirmation code
app.post('/api/auth/resend-code', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await authService.resendConfirmationCode(email);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// User login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await authService.loginUser(email, password);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    const result = await authService.refreshToken(refreshToken);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

// Change password (protected route)
app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const accessToken = req.headers.authorization.substring(7);

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Old and new passwords are required'
      });
    }

    const result = await authService.changePassword(accessToken, oldPassword, newPassword);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Password change error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Forgot password
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const result = await authService.forgotPassword(email);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Confirm forgot password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { email, confirmationCode, newPassword } = req.body;

    if (!email || !confirmationCode || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, confirmation code, and new password are required'
      });
    }

    const result = await authService.confirmForgotPassword(email, confirmationCode, newPassword);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Sign out
app.post('/api/auth/signout', authenticate, async (req, res) => {
  try {
    const accessToken = req.headers.authorization.substring(7);
    const result = await authService.signOut(accessToken);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(200).json({
      success: true,
      message: 'Signed out'
    });
  }
});

// ============================================
// FILE UPLOAD ROUTES (Protected)
// ============================================

// Upload WhatsApp chat file
app.post('/api/upload', 
  authenticate, 
  rateLimitByUser(10, 60000), // 10 uploads per minute per user
  fileUploadService.upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }

      const result = await fileUploadService.uploadToS3(req.file, req.user.userId);
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Upload error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// Get presigned download URL
app.get('/api/files/:fileKey/download', authenticate, async (req, res) => {
  try {
    const fileKey = decodeURIComponent(req.params.fileKey);
    const result = await fileUploadService.getPresignedDownloadUrl(fileKey, req.user.userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Download URL error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// List user files
app.get('/api/files', authenticate, async (req, res) => {
  try {
    const result = await fileUploadService.listUserFiles(req.user.userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('List files error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete file
app.delete('/api/files/:fileKey', authenticate, async (req, res) => {
  try {
    const fileKey = decodeURIComponent(req.params.fileKey);
    const result = await fileUploadService.deleteFromS3(fileKey, req.user.userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// REFERRAL ROUTES (Protected)
// ============================================

// Create referral
app.post('/api/referrals', authenticate, async (req, res) => {
  try {
    const result = await dynamodbService.insertReferral(req.body, req.user.userId);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Create referral error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get referral statistics
app.get('/api/referrals/stats', authenticate, async (req, res) => {
  try {
    const result = await dynamodbService.getReferralStats(req.user.userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get referral by ID
app.get('/api/referrals/:id', authenticate, async (req, res) => {
  try {
    const result = await dynamodbService.getReferralById(req.params.id, req.user.userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Get referral error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

// Query referrals with filters
app.get('/api/referrals', authenticate, async (req, res) => {
  try {
    const filters = {
      city: req.query.city,
      profession: req.query.profession,
      businessName: req.query.businessName,
      status: req.query.status
    };
    
    const limit = parseInt(req.query.limit) || 50;
    
    const result = await dynamodbService.queryReferrals(filters, req.user.userId, limit);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Query referrals error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Update referral
app.put('/api/referrals/:id', authenticate, async (req, res) => {
  try {
    const result = await dynamodbService.updateReferral(req.params.id, req.body, req.user.userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Update referral error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete referral
app.delete('/api/referrals/:id', authenticate, async (req, res) => {
  try {
    const result = await dynamodbService.deleteReferral(req.params.id, req.user.userId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Delete referral error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});



// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  // Don't leak error details in production
  const error = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({
    success: false,
    error: error
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;