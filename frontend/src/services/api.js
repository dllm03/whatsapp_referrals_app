import axios from 'axios';

// Define your base URL for API requests
const API_URL = 'https://your-api-url.com/api'; // Replace with your actual backend API URL

// Function to fetch all referrals
export const getReferrals = async () => {
  try {
    const response = await axios.get(`${API_URL}/referrals`);
    return response.data; // Returns the list of referrals
  } catch (error) {
    console.error("Error fetching referrals:", error);
    throw error; // You can handle the error more gracefully depending on your app's needs
  }
};

// Function to add a new referral
export const addReferral = async (referralData) => {
  try {
    const response = await axios.post(`${API_URL}/referrals`, referralData);
    return response.data; // Returns the added referral details
  } catch (error) {
    console.error("Error adding referral:", error);
    throw error;
  }
};

// Function to filter referrals based on parameters
export const filterReferrals = async (filters) => {
  try {
    const response = await axios.get(`${API_URL}/referrals/filter`, {
      params: filters, // You can pass filter params such as name, area, profession
    });
    return response.data;
  } catch (error) {
    console.error("Error filtering referrals:", error);
    throw error;
  }
};

// Function to authenticate a user (login)
export const authenticateUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    return response.data; // Returns user authentication info (like JWT token)
  } catch (error) {
    console.error("Error authenticating user:", error);
    throw error;
  }
};

// Function to register a new user
export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, userData);
    return response.data; // Returns new user details
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};