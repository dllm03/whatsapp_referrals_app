const fs = require('fs');

const parseWhatsAppChat = (filePath) => {
  const chatData = fs.readFileSync(filePath, 'utf-8');
  const messages = chatData.split('\n').filter(line => line.includes(':'));
  
  return messages.map(line => {
    const parts = line.split(': ');
    return { timestamp: parts[0], sender: parts[1], message: parts.slice(2).join(': ') };
  });
};

module.exports = { parseWhatsAppChat };