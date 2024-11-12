// utils/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers['authorization'];

  if (!apiKey && !authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (apiKey && apiKey !== 'valid-key') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  next();
};

// Make sure to export both functions
module.exports = {
  generateToken,
  validateApiKey
};