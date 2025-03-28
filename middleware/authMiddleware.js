/**
 * Authentication Middleware
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * [Feature] OCAE-302: Implement role-based access control
 * JWT-based authentication middleware for API routes
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verifies the JWT token in the Authorization header
 * Usage: Add this middleware to routes that require authentication
 */
const authenticateToken = async (req, res, next) => {
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
    
    // Get full user data from database to include permissions
    const user = await User.findOne({ userId: decoded.userId });
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    
    // Add user data to request
    req.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      companyId: user.companyId
    };
    
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
