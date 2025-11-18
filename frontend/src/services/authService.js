import { Auth } from 'aws-amplify';
import awsconfig from '../aws-exports'; // AWS Amplify configuration file

// Configure AWS Amplify with the settings from aws-exports.js
Auth.configure(awsconfig);

// User sign-up function (AWS Cognito)
export const signUp = async (email, password) => {
  try {
    const { user } = await Auth.signUp({
      username: email, // Using email as the username for Cognito
      password,
      attributes: {
        email, // Store the email as an attribute in Cognito
      },
    });
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// User sign-in function (AWS Cognito)
export const signIn = async (email, password) => {
  try {
    const user = await Auth.signIn(email, password);
    const token = user.signInUserSession.accessToken.jwtToken; // JWT token for access

    return { success: true, token, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Optional: You can add a function to confirm registration (when the user is required to confirm their email)
export const confirmSignUp = async (email, code) => {
  try {
    await Auth.confirmSignUp(email, code); // Email confirmation code
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Optional: Add a function to handle user sign-out (AWS Cognito)
export const signOut = async () => {
  try {
    await Auth.signOut();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};