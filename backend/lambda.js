// Import AWS SDK and other necessary modules
const AWS = require('aws-sdk');
const { parseWhatsAppChat } = require('./whatsapp_processing');  // This is the parsing logic you already have

// DynamoDB setup
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMO_TABLE_NAME;  // Set the DynamoDB table name in environment variables

// Lambda handler
exports.handler = async (event) => {
  const { filePath } = JSON.parse(event.body); // Assuming the file path comes in the body
  
  try {
    // Parse WhatsApp chat file (this is a simplified example, adapt it as per your needs)
    const chatMessages = await parseWhatsAppChat(filePath);

    // Example: Process chat and extract referrals
    const referrals = chatMessages.filter(msg => msg.includes('referral'));  // Adjust based on your referral format
    
    // Store referrals in DynamoDB
    const putPromises = referrals.map(referral => {
      const params = {
        TableName: TABLE_NAME,
        Item: {
          referralId: AWS.util.uuid.v4(),  // Generate a unique ID for each referral
          referralData: referral,
          timestamp: new Date().toISOString(),
        },
      };

      return dynamoDb.put(params).promise();
    });

    // Wait for all writes to finish
    await Promise.all(putPromises);

    // Return response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Chat processed successfully' }),
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process chat' }),
    };
  }
};