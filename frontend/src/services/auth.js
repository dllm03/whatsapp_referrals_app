// src/services/auth.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Authentication Service
export const authService = {
  // Register new user
  register: async (email, password, additionalAttributes = {}) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email,
      password,
      ...additionalAttributes
    });
    return response.data;
  },

  // Confirm registration with code
  confirmRegistration: async (email, confirmationCode) => {
    const response = await axios.post(`${API_BASE_URL}/auth/confirm`, {
      email,
      confirmationCode
    });
    return response.data;
  },

  // Resend confirmation code
  resendConfirmationCode: async (email) => {
    const response = await axios.post(`${API_BASE_URL}/auth/resend-code`, {
      email
    });
    return response.data;
  },

  // Login user
  login: async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      // Store tokens securely
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('idToken', response.data.idToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('tokenExpiry', Date.now() + (response.data.expiresIn * 1000));
    }
    
    return response.data;
  },

  // Refresh access token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    });
    
    if (response.data.success) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('idToken', response.data.idToken);
      localStorage.setItem('tokenExpiry', Date.now() + (response.data.expiresIn * 1000));
    }
    
    return response.data;
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(`${API_BASE_URL}/auth/change-password`, {
      oldPassword,
      newPassword
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  // Forgot password
  forgotPassword: async (email) => {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
      email
    });
    return response.data;
  },

  // Reset password with code
  resetPassword: async (email, confirmationCode, newPassword) => {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
      email,
      confirmationCode,
      newPassword
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        await axios.post(`${API_BASE_URL}/auth/signout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('idToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiry');
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('accessToken');
    const expiry = localStorage.getItem('tokenExpiry');
    
    if (!token || !expiry) {
      return false;
    }

    // Check if token is expired
    return Date.now() < parseInt(expiry);
  },

  // Get current access token
  getAccessToken: () => {
    return localStorage.getItem('accessToken');
  }
};

// API Client with automatic token handling
export const apiClient = axios.create({
  baseURL: API_BASE_URL
});

// Request interceptor - add auth token to all requests
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await authService.refreshToken();
        
        // Retry the original request with new token
        const token = authService.getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Referrals API
export const referralsAPI = {
  // Create referral
  create: async (referralData) => {
    const response = await apiClient.post('/referrals', referralData);
    return response.data;
  },

  // Get referral by ID
  getById: async (id) => {
    const response = await apiClient.get(`/referrals/${id}`);
    return response.data;
  },

  // Query referrals with filters
  query: async (filters = {}, limit = 50) => {
    const response = await apiClient.get('/referrals', {
      params: { ...filters, limit }
    });
    return response.data;
  },

  // Update referral
  update: async (id, updates) => {
    const response = await apiClient.put(`/referrals/${id}`, updates);
    return response.data;
  },

  // Delete referral
  delete: async (id) => {
    const response = await apiClient.delete(`/referrals/${id}`);
    return response.data;
  },

  // Get statistics
  getStats: async () => {
    const response = await apiClient.get('/referrals/stats');
    return response.data;
  }
};

// File Upload API
export const fileAPI = {
  // Upload file
  upload: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    });
    
    return response.data;
  },

  // Get download URL
  getDownloadUrl: async (fileKey) => {
    const response = await apiClient.get(`/files/${encodeURIComponent(fileKey)}/download`);
    return response.data;
  },

  // List user files
  listFiles: async () => {
    const response = await apiClient.get('/files');
    return response.data;
  },

  // Delete file
  delete: async (fileKey) => {
    const response = await apiClient.delete(`/files/${encodeURIComponent(fileKey)}`);
    return response.data;
  }
};