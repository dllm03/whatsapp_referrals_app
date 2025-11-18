// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

// Cache for Cognito public keys
let cachedPems = null;
let cacheExpiry = 0;

/**
 * Fetches and caches Cognito public keys for JWT verification
 */
const getCognitoPublicKeys = async () => {
  const now = Date.now();
  
  // Return cached keys if still valid (cache for 1 hour)
  if (cachedPems && cacheExpiry > now) {
    return cachedPems;
  }

  const region = process.env.AWS_REGION;
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

  try {
    const response = await axios.get(jwksUrl);
    const keys = response.data.keys;
    
    // Convert JWKs to PEM format for verification
    cachedPems = keys.reduce((acc, key) => {
      const pem = jwkToPem(key);
      acc[key.kid] = pem;
      return acc;
    }, {});
    
    // Cache for 1 hour
    cacheExpiry = now + (60 * 60 * 1000);
    
    return cachedPems;
  } catch (error) {
    console.error('Error fetching Cognito public keys:', error);
    throw new Error('Unable to fetch authentication keys');
  }
};

/**
 * Verifies JWT token from Cognito
 */
const verifyToken = async (token) => {
  try {
    // Decode token header to get key ID
    const decodedHeader = jwt.decode(token, { complete: true });
    
    if (!decodedHeader) {
      throw new Error('Invalid token structure');
    }

    const kid = decodedHeader.header.kid;
    const pems = await getCognitoPublicKeys();
    const pem = pems[kid];

    if (!pem) {
      throw new Error('Invalid token key');
    }

    // Verify token signature and claims
    const decoded = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      audience: process.env.COGNITO_APP_CLIENT_ID
    });

    // Additional validation
    if (decoded.token_use !== 'access' && decoded.token_use !== 'id') {
      throw new Error('Invalid token use');
    }

    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    throw error;
  }
};

/**
 * Express middleware to authenticate requests
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = await verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.sub,
      email: decoded.email || decoded.username,
      groups: decoded['cognito:groups'] || [],
      tokenExp: decoded.exp
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
};

/**
 * Optional middleware for role-based access control
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userGroups = req.user.groups || [];
    const hasRole = allowedRoles.some(role => userGroups.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Rate limiting by user ID
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  const requestCounts = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.userId;
    const now = Date.now();
    const userRecord = requestCounts.get(userId) || { count: 0, resetTime: now + windowMs };

    // Reset counter if window expired
    if (now > userRecord.resetTime) {
      userRecord.count = 0;
      userRecord.resetTime = now + windowMs;
    }

    userRecord.count++;
    requestCounts.set(userId, userRecord);

    if (userRecord.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((userRecord.resetTime - now) / 1000)
      });
    }

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      for (const [key, value] of requestCounts.entries()) {
        if (now > value.resetTime) {
          requestCounts.delete(key);
        }
      }
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole,
  rateLimitByUser,
  verifyToken
};