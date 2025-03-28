const { registerUser, loginUser } = require('./auth');

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    await registerUser(email, password);
    res.status(200).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const token = await loginUser(email, password);
    res.status(200).json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});
app.post('/upload-chat', async (req, res) => {
    try {
      const chatMessages = parseWhatsAppChat(req.body.filePath);
      for (let msg of chatMessages) {
        if (msg.message.includes('recommend')) {
          await pool.query("INSERT INTO referrals (name, profession, area) VALUES ($1, $2, $3)", 
            [msg.sender, 'Service Provider', 'Unknown']);
        }
      }
      res.json({ message: 'Chat processed' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });