/**
 * Authentication Middleware
 * 
 * [Feature] OCAE-301: Implement JWT authentication
 * 
 * This middleware validates JWT tokens for protected routes.
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and add user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = (req, res, next) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Extract token
  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');
    
    // Add user object to request
    req.user = {
      id: decodedToken.id,
      email: decodedToken.email,
      roles: decodedToken.roles || []
    };
    
    next();
  } catch (error) {
    // Handle token verification errors
    console.error('JWT verification error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authMiddleware;
