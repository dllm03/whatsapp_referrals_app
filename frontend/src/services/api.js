// frontend/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Token storage keys
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

/**
 * API Service with authentication and error handling
 */
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Initialize service by loading tokens from storage
   */
  async init() {
    try {
      this.accessToken = await AsyncStorage.getItem(TOKEN_KEY);
      this.refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  /**
   * Save tokens to storage
   */
  async saveTokens(accessToken, refreshToken) {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  /**
   * Clear tokens from storage
   */
  async clearTokens() {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser() {
    try {
      const userStr = await AsyncStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Save current user to storage
   */
  async saveCurrentUser(user) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to save current user:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.accessToken;
  }

  /**
   * Make HTTP request with authentication
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if token exists
    if (this.accessToken && !options.skipAuth) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Handle token expiration
      if (response.status === 401 && data.code === 'TOKEN_EXPIRED') {
        // Try to refresh token
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, { ...config, headers });
          return await retryResponse.json();
        } else {
          // Refresh failed, logout user
          await this.clearTokens();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await this.saveTokens(data.accessToken, this.refreshToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // ============================================
  // AUTHENTICATION METHODS
  // ============================================

  /**
   * Register new user
   */
  async register(email, password, additionalData = {}) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        ...additionalData,
      }),
      skipAuth: true,
    });

    return response;
  }

  /**
   * Confirm registration with verification code
   */
  async confirmRegistration(email, confirmationCode) {
    const response = await this.request('/auth/confirm', {
      method: 'POST',
      body: JSON.stringify({
        email,
        confirmationCode,
      }),
      skipAuth: true,
    });

    return response;
  }

  /**
   * Resend confirmation code
   */
  async resendConfirmationCode(email) {
    const response = await this.request('/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });

    return response;
  }

  /**
   * Login user
   */
  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
      skipAuth: true,
    });

    if (response.success) {
      await this.saveTokens(response.accessToken, response.refreshToken);
      
      // Save user info
      const user = {
        email,
        // Additional user info can be extracted from token if needed
      };
      await this.saveCurrentUser(user);
    }

    return response;
  }

  /**
   * Change password
   */
  async changePassword(oldPassword, newPassword) {
    const response = await this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        oldPassword,
        newPassword,
      }),
    });

    return response;
  }

  /**
   * Forgot password
   */
  async forgotPassword(email) {
    const response = await this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });

    return response;
  }

  /**
   * Reset password with confirmation code
   */
  async resetPassword(email, confirmationCode, newPassword) {
    const response = await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        confirmationCode,
        newPassword,
      }),
      skipAuth: true,
    });

    return response;
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await this.request('/auth/signout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      await this.clearTokens();
    }
  }

  // ============================================
  // FILE UPLOAD METHODS
  // ============================================

  /**
   * Upload file
   */
  async uploadFile(fileUri, fileName, fileType) {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    return data;
  }

  /**
   * Get presigned download URL for file
   */
  async getFileDownloadUrl(fileKey) {
    const encodedKey = encodeURIComponent(fileKey);
    const response = await this.request(`/files/${encodedKey}/download`, {
      method: 'GET',
    });

    return response;
  }

  /**
   * List user's files
   */
  async listFiles() {
    const response = await this.request('/files', {
      method: 'GET',
    });

    return response;
  }

  /**
   * Delete file
   */
  async deleteFile(fileKey) {
    const encodedKey = encodeURIComponent(fileKey);
    const response = await this.request(`/files/${encodedKey}`, {
      method: 'DELETE',
    });

    return response;
  }

  // ============================================
  // REFERRAL METHODS
  // ============================================

  /**
   * Create referral
   */
  async createReferral(referralData) {
    const response = await this.request('/referrals', {
      method: 'POST',
      body: JSON.stringify(referralData),
    });

    return response;
  }

  /**
   * Get referral by ID
   */
  async getReferral(referralId) {
    const response = await this.request(`/referrals/${referralId}`, {
      method: 'GET',
    });

    return response;
  }

  /**
   * Query referrals with filters
   */
  async queryReferrals(filters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });

    const response = await this.request(`/referrals?${queryParams.toString()}`, {
      method: 'GET',
    });

    return response;
  }

  /**
   * Update referral
   */
  async updateReferral(referralId, updates) {
    const response = await this.request(`/referrals/${referralId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return response;
  }

  /**
   * Delete referral
   */
  async deleteReferral(referralId) {
    const response = await this.request(`/referrals/${referralId}`, {
      method: 'DELETE',
    });

    return response;
  }

  /**
   * Get referral statistics
   */
  async getReferralStats() {
    const response = await this.request('/referrals/stats', {
      method: 'GET',
    });

    return response;
  }
}

// Export singleton instance
const apiService = new ApiService();
export default apiService