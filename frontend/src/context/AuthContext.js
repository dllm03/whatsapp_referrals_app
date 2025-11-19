// frontend/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize authentication state
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      await apiService.init();
      
      if (apiService.isAuthenticated()) {
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, additionalData = {}) => {
    try {
      const response = await apiService.register(email, password, additionalData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const confirmRegistration = async (email, code) => {
    try {
      const response = await apiService.confirmRegistration(email, code);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const resendCode = async (email) => {
    try {
      const response = await apiService.resendConfirmationCode(email);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const response = await apiService.login(email, password);
      
      if (response.success) {
        const userData = { email };
        setUser(userData);
        setIsAuthenticated(true);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await apiService.changePassword(oldPassword, newPassword);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await apiService.forgotPassword(email);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      const response = await apiService.resetPassword(email, code, newPassword);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    register,
    confirmRegistration,
    resendCode,
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};