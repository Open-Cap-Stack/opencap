/**
 * Authentication Middleware
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * JWT-based authentication middleware for API routes
 */

const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT token in the Authorization header
 * Usage: Add this middleware to routes that require authentication
 */
const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Extract token from "Bearer TOKEN" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');
    
    // Add user data to request
    req.user = decoded;
    
    // Continue with the request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

// Check token blacklist for logout functionality
const checkTokenBlacklist = (token) => {
  // In a real implementation, this would check a Redis cache or database
  // For now, we'll use a simple in-memory store
  return global.tokenBlacklist && global.tokenBlacklist.has(token);
};

// Add token to blacklist for logout functionality
const blacklistToken = (token) => {
  // Initialize the blacklist if it doesn't exist
  if (!global.tokenBlacklist) {
    global.tokenBlacklist = new Set();
  }
  global.tokenBlacklist.add(token);
};

module.exports = { 
  authenticateToken,
  checkTokenBlacklist,
  blacklistToken
};
