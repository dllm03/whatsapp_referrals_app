// db.js
const AWS = require('aws-sdk');

// Initialize DynamoDB
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1', // specify the region
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Define a function to insert a referral
const insertReferral = async (referralData) => {
  const params = {
    TableName: process.env.DYNAMO_TABLE_NAME, // Your DynamoDB table name
    Item: referralData,
  };

  try {
    const result = await dynamoDB.put(params).promise();
    console.log('Referral inserted:', result);
    return result;
  } catch (error) {
    console.error('Error inserting referral:', error);
    throw new Error('Error inserting referral');
  }
};

// Define a function to get referrals based on filter (e.g., by name, city, profession)
const getReferrals = async (filterParams) => {
  const params = {
    TableName: process.env.DYNAMO_TABLE_NAME,
    KeyConditionExpression: 'city = :city AND profession = :profession', // example query filter
    ExpressionAttributeValues: {
      ':city': filterParams.city,
      ':profession': filterParams.profession,
    },
  };

  try {
    const result = await dynamoDB.query(params).promise();
    console.log('Referrals found:', result.Items);
    return result.Items;
  } catch (error) {
    console.error('Error fetching referrals:', error);
    throw new Error('Error fetching referrals');
  }
};

module.exports = {
  insertReferral,
  getReferrals,
};