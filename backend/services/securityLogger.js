// services/securityLogger.js
const winston = require('winston');

const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'security.log' })
  ]
});

const logSecurityEvent = (event, userId, details) => {
  securityLogger.info({
    timestamp: new Date().toISOString(),
    event,
    userId,
    details,
    ip: details.ip
  });
};

module.exports = { logSecurityEvent };