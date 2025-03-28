const express = require('express');
const bodyParser = require('body-parser');
const { registerUser, loginUser } = require('./auth');
const { parseWhatsAppChat } = require('./whatsapp_processing');

const app = express();
app.use(bodyParser.json());

// Routes for user registration and login
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await registerUser(email, password);
    res.status(200).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const token = await loginUser(email, password);
    res.status(200).json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

// Route for processing WhatsApp chat messages
app.post('/upload-chat', async (req, res) => {
  const { filePath } = req.body;
  try {
    const chatMessages = parseWhatsAppChat(filePath);
    // Process the chat data and store referrals in PostgreSQL (simplified)
    res.status(200).json({ message: 'Chat processed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});