const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const generateToken = (payload, options = { expiresIn: '1h' }) => {
  return jwt.sign(payload, JWT_SECRET, options);
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
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  next();
};

module.exports = {
  generateToken,
  validateApiKey
};
