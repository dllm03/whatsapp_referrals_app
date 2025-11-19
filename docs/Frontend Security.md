# Frontend Security Implementation Guide

## 📋 Overview

This guide will help you implement the secure frontend components for your WhatsApp Referrals application with complete authentication and API integration.

## 🗂️ File Structure

```
frontend/
├── App.js (Updated with navigation)
├── .env (Environment configuration)
├── package.json (Updated dependencies)
├── context/
│   └── AuthContext.js (Authentication state management)
├── services/
│   └── api.js (Secure API service with token management)
├── screens/
│   ├── LoginScreen.js (User login)
│   ├── RegisterScreen.js (User registration)
│   ├── ConfirmRegistrationScreen.js (Email verification)
│   ├── ForgotPasswordScreen.js (Password reset request)
│   ├── ResetPasswordScreen.js (Password reset confirmation)
│   ├── HomeScreen.js (Dashboard)
│   ├── UploadScreen.js (File upload with secure API)
│   ├── ReferralsScreen.js (View and manage referrals)
│   └── ProfileScreen.js (User profile and settings)
└── components/
    └── (Reusable components as needed)
```

## 🚀 Implementation Steps

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

Or with Expo:

```bash
expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage expo-document-picker expo-file-system react-native-vector-icons
```

### Step 2: Create Environment Configuration

1. Copy `.env.example` to `.env`
2. Update `REACT_APP_API_URL` with your backend URL
3. **Never commit `.env` to Git!**

### Step 3: Set Up File Structure

Create the following directories:
```bash
mkdir -p context services screens components
```

### Step 4: Implement Core Files

1. **AuthContext.js** - Authentication state management
2. **api.js** - API service with secure token handling
3. **App.js** - Main app with navigation
4. All screen components

### Step 5: Update Existing Screens

Replace any existing API calls in your screens with the new `apiService` methods:

```javascript
// OLD CODE (Remove this)
fetch('http://localhost:5000/api/referrals', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})

// NEW CODE (Use this)
import apiService from '../services/api';

const response = await apiService.queryReferrals();
```

## 🔐 Security Features Implemented

### 1. Token Management
- Automatic token storage in AsyncStorage
- Automatic token refresh on expiration
- Secure token transmission in Authorization header
- Automatic logout on authentication failure

### 2. Request Handling
- Centralized API service
- Automatic retry on token expiration
- Error handling and user-friendly messages
- Request timeouts

### 3. Input Validation
- Client-side validation for emails
- Password strength requirements
- File type and size validation
- Sanitized user inputs

### 4. Secure File Upload
- File type validation (only .txt and .csv)
- File size limits (10MB max)
- Multipart form data with authentication
- Secure file processing

## 📱 Screen Implementations

### Authentication Screens

#### LoginScreen
- Email and password inputs
- Client-side validation
- Loading states
- Error handling
- Navigation to register and forgot password

#### RegisterScreen
- Email and password registration
- Password confirmation
- Password strength validation
- Navigation to email confirmation

#### ConfirmRegistrationScreen
- Email verification code input
- Resend code functionality
- Error handling

### Main App Screens

#### HomeScreen (Dashboard)
- Welcome message
- Quick stats
- Navigation shortcuts
- Recent activity

#### UploadScreen
- File picker with validation
- Upload progress indicator
- File information display
- Automatic referral processing

#### ReferralsScreen
- List of all referrals
- Search functionality
- Filters (city, profession, status)
- Pull-to-refresh
- Edit and delete actions

#### ProfileScreen
- User information
- Change password
- Logout functionality
- App settings

## 🔄 API Service Usage

### Authentication

```javascript
import apiService from '../services/api';

// Register
await apiService.register(email, password);

// Login
const response = await apiService.login(email, password);

// Logout
await apiService.logout();

// Change password
await apiService.changePassword(oldPassword, newPassword);
```

### Referrals

```javascript
// Create referral
await apiService.createReferral({
  businessName: 'Example Business',
  profession: 'Doctor',
  city: 'New York'
});

// Query referrals
const response = await apiService.queryReferrals({
  city: 'New York',
  profession: 'Doctor'
});

// Update referral
await apiService.updateReferral(referralId, {
  verified: true
});

// Delete referral
await apiService.deleteReferral(referralId);
```

### File Upload

```javascript
// Upload file
const response = await apiService.uploadFile(
  fileUri,
  fileName,
  fileType
);

// Get download URL
const urlResponse = await apiService.getFileDownloadUrl(fileKey);

// List files
const files = await apiService.listFiles();

// Delete file
await apiService.deleteFile(fileKey);
```

## ⚠️ Common Issues and Solutions

### Issue 1: Token Expired Errors
**Solution**: The API service automatically handles token refresh. Ensure your backend refresh endpoint is working correctly.

### Issue 2: CORS Errors
**Solution**: Update your backend CORS configuration to include your frontend URL in `ALLOWED_ORIGINS`.

### Issue 3: File Upload Fails
**Solution**: 
- Check file size (must be under 10MB)
- Verify file type (.txt or .csv only)
- Ensure backend S3 permissions are correct

### Issue 4: AsyncStorage Errors
**Solution**: Install AsyncStorage properly:
```bash
expo install @react-native-async-storage/async-storage
```

## 🧪 Testing

### Manual Testing Checklist

- [ ] User registration works
- [ ] Email verification works
- [ ] Login works
- [ ] Token refresh works automatically
- [ ] File upload works
- [ ] Referrals are created correctly
- [ ] Search and filters work
- [ ] Edit and delete work
- [ ] Logout works
- [ ] Password change works

### Test User Flow

1. Register new user
2. Verify email with code
3. Login with credentials
4. Upload WhatsApp chat file
5. View processed referrals
6. Search and filter referrals
7. Edit a referral
8. Delete a referral
9. Change password
10. Logout

## 📊 Performance Optimization

### Implemented Optimizations

1. **Token Caching**: Tokens stored in AsyncStorage
2. **Automatic Retry**: Failed requests retry once after token refresh
3. **Lazy Loading**: Screens loaded on demand
4. **Pull to Refresh**: Manual refresh for latest data
5. **Search Debouncing**: Reduce API calls during search

### Recommended Additions

1. **Pagination**: Load referrals in chunks
2. **Caching**: Cache referral list locally
3. **Offline Support**: Queue operations when offline
4. **Image Optimization**: Compress before upload

## 🔄 Migration from Old Code

### Step-by-Step Migration

1. **Backup your current code**
   ```bash
   git checkout -b backup-before-security-update
   git add .
   git commit -m "Backup before security update"
   ```

2. **Replace API calls**
   - Find all `fetch()` calls
   - Replace with `apiService` methods
   - Remove hardcoded URLs

3. **Add authentication**
   - Wrap App in AuthProvider
   - Add authentication checks to protected screens
   - Implement login/logout flows

4. **Test thoroughly**
   - Test all user flows
   - Verify API calls work
   - Check error handling

## 📚 Additional Resources

### Documentation
- React Navigation: https://reactnavigation.org/
- Expo Documentation: https://docs.expo.dev/
- React Native AsyncStorage: https://react-native-async-storage.github.io/

### Security Best Practices
- Never store sensitive data in plain text
- Always use HTTPS in production
- Implement proper error handling
- Keep dependencies updated
- Use environment variables for configuration

## ✅ Post-Implementation Checklist

- [ ] All screens implemented
- [ ] API service integrated
- [ ] Authentication working
- [ ] File upload working
- [ ] Navigation working
- [ ] Error handling implemented
- [ ] Loading states implemented
- [ ] Environment variables configured
- [ ] .env added to .gitignore
- [ ] App tested on device/simulator
- [ ] Production URL configured
- [ ] Security review completed

## 🆘 Getting Help

If you encounter issues:

1. Check the browser/app console for errors
2. Verify environment variables are set correctly
3. Ensure backend is running and accessible
4. Check network requests in developer tools
5. Review API service error messages

## 🎉 You're Done!

Your frontend is now secure and integrated with the new backend API. All user data is protected, tokens are managed automatically, and file uploads are secure.

Remember to:
- Test thoroughly before deploying
- Keep dependencies updated
- Monitor for security vulnerabilities
- Backup your code regularly