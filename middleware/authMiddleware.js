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
const auth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Extract token from "Bearer TOKEN" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');
    
    // Add user data to request
    req.user = decoded;
    
    // Continue with the request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = auth;
