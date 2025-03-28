# WhatsApp Referrals App Setup

This guide will help you set up the WhatsApp Referrals App with React Native frontend and AWS Lambda backend.

## Frontend (React Native) Setup

### Install Node.js and React Native CLI
If not already installed, download and install the latest version of Node.js from the official website: https://nodejs.org.

Install React Native CLI globally:
```bash
npm install -g react-native-cli
```

### Create the React Native App
Create the app by running:
```bash
react-native init WhatsAppReferrals
cd WhatsAppReferrals
```

### Install Dependencies
Install the required libraries for the app:
```bash
npm install axios react-navigation react-navigation-stack react-native-gesture-handler react-native-reanimated react-native-safe-area-context react-native-screens
```

### Set up Environment Variables
In the root directory of your React Native app, create a `.env` file with the following content:
```env
API_URL=https://your-backend-api-url.com/api
AWS_COGNITO_USER_POOL_ID=your-user-pool-id
AWS_COGNITO_CLIENT_ID=your-client-id
AWS_COGNITO_REGION=your-region
```

### Run the App Locally
To start the app locally for development, run the Metro Bundler:
```bash
npx react-native start
```

Run the app on an emulator/device:
- For iOS:
  ```bash
  npx react-native run-ios
  ```
- For Android:
  ```bash
  npx react-native run-android
  ```

## Backend (AWS Lambda + DynamoDB) Setup

### Install AWS CLI
To install AWS CLI, run:
```bash
pip install awscli
```

Configure AWS CLI:
```bash
aws configure
```

### Set up DynamoDB
To set up DynamoDB, you can use the AWS Management Console or AWS CLI. To create a table using AWS CLI, run:
```bash
aws dynamodb create-table --table-name your_table_name --attribute-definitions AttributeName=id,AttributeType=S --key-schema AttributeName=id,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

### Install Dependencies for Lambda Function
Install the AWS SDK for DynamoDB:
```bash
npm install aws-sdk
```

### Create and Deploy Lambda Function
To deploy your Lambda function to AWS, zip your function files and use the AWS CLI:
```bash
zip -r function.zip .
aws lambda update-function-code --function-name your-function-name --zip-file fileb://function.zip
```

### Set up Environment Variables for Backend
In your Lambda function directory, create a `.env` file for the backend:
```env
DB_TABLE=your_table_name
AWS_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
```

You can store sensitive data like passwords using AWS Secrets Manager.

## Running the Application Locally

### For Frontend (React Native)
- Start the React Native Metro Bundler:
  ```bash
  npx react-native start
  ```
- Run the app on your emulator/device:
  - For iOS:
    ```bash
    npx react-native run-ios
    ```
  - For Android:
    ```bash
    npx react-native run-android
    ```

### For Backend (Lambda)
Use AWS SAM or the Serverless framework to test your Lambda function locally.

- Install AWS SAM CLI:
  ```bash
  brew install aws/tap/aws-sam-cli
  ```
- Start the Lambda function locally:
  ```bash
  sam local invoke -e event.json
  ```

## Deployment

### For Frontend
Once the app is ready for production, you can build and publish it to the Apple App Store or Google Play Store following the React Native documentation.

### For Backend
Deploy the backend API to AWS using API Gateway and Lambda, or use AWS Elastic Beanstalk for Node.js applications.

## Conclusion
This setup guide will help you get started with both the frontend and backend for the WhatsApp Referrals App. If you need further assistance or encounter issues, feel free to reach out.
