// backend/services/authService.js
require('dotenv').config();
const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize Cognito Identity Provider
const cognito = new AWS.CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_APP_CLIENT_SECRET; // Optional, if using client secret

/**
 * Generate SECRET_HASH for Cognito (if client secret is configured)
 */
const generateSecretHash = (username) => {
  if (!CLIENT_SECRET) return undefined;
  
  return crypto
    .createHmac('SHA256', CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest('base64');
};

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Sanitize user input to prevent injection attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML/script tags
    .substring(0, 256); // Limit length
};

/**
 * Register new user
 */
const registerUser = async (email, password, additionalAttributes = {}) => {
  try {
    // Validate inputs
    email = sanitizeInput(email);
    
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!isValidPassword(password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }

    // Prepare user attributes
    const attributes = [
      {
        Name: 'email',
        Value: email
      },
      {
        Name: 'email_verified',
        Value: 'false' // Will be verified through confirmation code
      }
    ];

    // Add optional attributes (sanitized)
    Object.keys(additionalAttributes).forEach(key => {
      if (key !== 'email' && additionalAttributes[key]) {
        attributes.push({
          Name: key,
          Value: sanitizeInput(additionalAttributes[key])
        });
      }
    });

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: attributes,
      SecretHash: generateSecretHash(email)
    };

    const result = await cognito.signUp(params).promise();

    return {
      success: true,
      userId: result.UserSub,
      userConfirmed: result.UserConfirmed,
      message: 'User registered successfully. Please check your email for verification code.'
    };
  } catch (error) {
    console.error('Registration error:', error);
    
    // Sanitize error messages to prevent information disclosure
    if (error.code === 'UsernameExistsException') {
      throw new Error('An account with this email already exists');
    } else if (error.code === 'InvalidPasswordException') {
      throw new Error('Password does not meet requirements');
    } else if (error.code === 'InvalidParameterException') {
      throw new Error('Invalid registration parameters');
    }
    
    throw new Error('Registration failed. Please try again.');
  }
};

/**
 * Confirm user registration with verification code
 */
const confirmRegistration = async (email, confirmationCode) => {
  try {
    email = sanitizeInput(email);
    confirmationCode = sanitizeInput(confirmationCode);

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      SecretHash: generateSecretHash(email)
    };

    await cognito.confirmSignUp(params).promise();

    return {
      success: true,
      message: 'Email verified successfully'
    };
  } catch (error) {
    console.error('Confirmation error:', error);
    
    if (error.code === 'CodeMismatchException') {
      throw new Error('Invalid verification code');
    } else if (error.code === 'ExpiredCodeException') {
      throw new Error('Verification code has expired');
    }
    
    throw new Error('Verification failed. Please try again.');
  }
};

/**
 * Resend confirmation code
 */
const resendConfirmationCode = async (email) => {
  try {
    email = sanitizeInput(email);

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      SecretHash: generateSecretHash(email)
    };

    await cognito.resendConfirmationCode(params).promise();

    return {
      success: true,
      message: 'Verification code sent'
    };
  } catch (error) {
    console.error('Resend code error:', error);
    throw new Error('Failed to resend verification code');
  }
};

/**
 * User login
 */
const loginUser = async (email, password) => {
  try {
    email = sanitizeInput(email);

    const params = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: generateSecretHash(email)
      }
    };

    const result = await cognito.initiateAuth(params).promise();

    if (result.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      return {
        success: false,
        challengeName: 'NEW_PASSWORD_REQUIRED',
        session: result.Session,
        message: 'New password required'
      };
    }

    return {
      success: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
      tokenType: result.AuthenticationResult.TokenType
    };
  } catch (error) {
    console.error('Login error:', error);

    // Generic error message to prevent user enumeration
    if (error.code === 'NotAuthorizedException' || 
        error.code === 'UserNotFoundException') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'UserNotConfirmedException') {
      throw new Error('Please verify your email before logging in');
    } else if (error.code === 'TooManyRequestsException') {
      throw new Error('Too many login attempts. Please try again later.');
    }
    
    throw new Error('Login failed. Please try again.');
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (refreshTokenValue) => {
  try {
    const params = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshTokenValue
      }
    };

    const result = await cognito.initiateAuth(params).promise();

    return {
      success: true,
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
      tokenType: result.AuthenticationResult.TokenType
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    throw new Error('Failed to refresh token. Please login again.');
  }
};

/**
 * Change user password
 */
const changePassword = async (accessToken, oldPassword, newPassword) => {
  try {
    if (!isValidPassword(newPassword)) {
      throw new Error('New password does not meet requirements');
    }

    const params = {
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
      AccessToken: accessToken
    };

    await cognito.changePassword(params).promise();

    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (error) {
    console.error('Password change error:', error);
    
    if (error.code === 'NotAuthorizedException') {
      throw new Error('Current password is incorrect');
    } else if (error.code === 'InvalidPasswordException') {
      throw new Error('New password does not meet requirements');
    }
    
    throw new Error('Failed to change password');
  }
};

/**
 * Initiate forgot password flow
 */
const forgotPassword = async (email) => {
  try {
    email = sanitizeInput(email);

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      SecretHash: generateSecretHash(email)
    };

    await cognito.forgotPassword(params).promise();

    return {
      success: true,
      message: 'Password reset code sent to your email'
    };
  } catch (error) {
    console.error('Forgot password error:', error);
    
    // Generic message to prevent user enumeration
    return {
      success: true,
      message: 'If an account exists, a password reset code will be sent'
    };
  }
};

/**
 * Confirm forgot password with code
 */
const confirmForgotPassword = async (email, confirmationCode, newPassword) => {
  try {
    email = sanitizeInput(email);
    confirmationCode = sanitizeInput(confirmationCode);

    if (!isValidPassword(newPassword)) {
      throw new Error('Password does not meet requirements');
    }

    const params = {
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
      SecretHash: generateSecretHash(email)
    };

    await cognito.confirmForgotPassword(params).promise();

    return {
      success: true,
      message: 'Password reset successfully'
    };
  } catch (error) {
    console.error('Confirm forgot password error:', error);
    
    if (error.code === 'CodeMismatchException') {
      throw new Error('Invalid confirmation code');
    } else if (error.code === 'ExpiredCodeException') {
      throw new Error('Confirmation code has expired');
    }
    
    throw new Error('Password reset failed');
  }
};

/**
 * Sign out user (invalidate tokens)
 */
const signOut = async (accessToken) => {
  try {
    const params = {
      AccessToken: accessToken
    };

    await cognito.globalSignOut(params).promise();

    return {
      success: true,
      message: 'Signed out successfully'
    };
  } catch (error) {
    console.error('Sign out error:', error);
    // Don't throw error on sign out failure
    return {
      success: true,
      message: 'Signed out'
    };
  }
};

module.exports = {
  registerUser,
  confirmRegistration,
  resendConfirmationCode,
  loginUser,
  refreshToken,
  changePassword,
  forgotPassword,
  confirmForgotPassword,
  signOut
};