/**
 * JWT Authentication Middleware (DEPRECATED)
 * [Bug] OCAE-304: Fix SPVasset tests with JWT authentication
 *
 * DEPRECATED: Use middleware/authMiddleware.js (authenticateToken) instead.
 * This file uses req.user.roles (array) which is inconsistent with the
 * authoritative single req.user.role field from authMiddleware.js.
 * Kept only to avoid breaking legacy tests — do not use in new routes.
 */
const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens from the Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const tokenParts = authHeader.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const token = tokenParts[1];
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Middleware factory to check if user has the required role(s)
 * @param {String|Array} roles - Required role(s) for access
 * @returns {Function} Middleware function
 */
exports.authenticateRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const userRoles = req.user.roles || [];
    
    // Convert single role to array for consistent handling
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    // Check if user has at least one of the required roles
    const hasPermission = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Access denied: Insufficient permissions' 
      });
    }
    
    next();
  };
};
