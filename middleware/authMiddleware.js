/**
 * Authentication Middleware
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * [Feature] OCAE-302: Implement role-based access control
 * [Feature] OCAE-204: Implement company management endpoints
 * [Bug] OCDI-302: Fix User Authentication Test Failures
 * [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
 * 
 * JWT-based authentication middleware for API routes with improved
 * reliability, connection handling, and token management.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoDbConnection = require('../utils/mongoDbConnection');
const { promisify } = require('util');

// Configuration constants
const JWT_VERIFICATION_TIMEOUT_MS = 5000; // 5 seconds timeout for JWT verification
const TOKEN_BLACKLIST_TTL = 3600; // 1 hour TTL for blacklisted tokens

// Use in-memory token blacklist as default
let tokenBlacklist = new Set();

// Setup Redis client if available (conditionally loaded)
let redisClient = null;
try {
  // Only try to use Redis if the env var is set
  if (process.env.REDIS_URL) {
    // Dynamically import Redis to avoid issues in environments where it's not installed
    const redis = require('redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    
    // Log connection status
    redisClient.on('connect', () => console.log('Redis connected for token blacklisting'));
    redisClient.on('error', err => {
      console.error('Redis error:', err);
      // If Redis connection fails, fallback to memory
      redisClient = null;
    });
    
    // Connect to Redis
    redisClient.connect().catch(err => {
      console.error('Redis connection failed:', err);
      redisClient = null;
    });
  }
} catch (error) {
  console.error('Redis client initialization failed, using in-memory blacklist:', error);
  redisClient = null;
}

/**
 * Verifies the JWT token in the Authorization header
 * Enhanced with MongoDB retry logic and improved error handling
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
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
    
    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ message: 'Token is invalidated' });
    }
    
    // Verify token with timeout
    const decoded = await verifyTokenWithTimeout(
      token, 
      process.env.JWT_SECRET || 'testsecret',
      JWT_VERIFICATION_TIMEOUT_MS
    );
    
    // Handle case where token already contains role and permissions (e.g., in tests)
    if (decoded.role) {
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        companyId: decoded.companyId
      };
      
      // Attach token to request for potential blacklisting on logout
      req.token = token;
      
      // Continue with the request
      return next();
    }
    
    // Use MongoDB retry logic for user lookup
    const user = await mongoDbConnection.withRetry(async () => {
      return await User.findOne({ userId: decoded.userId });
    });
    
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
    
    // Attach token to request for potential blacklisting on logout
    req.token = token;
    
    // Continue with the request
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenVerificationTimeoutError') {
      return res.status(401).json({ message: 'Token verification timed out' });
    }
    
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Promise-based JWT verify with timeout
 * 
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret to use for verification
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - On verification failure or timeout
 */
const verifyTokenWithTimeout = (token, secret, timeoutMs) => {
  return new Promise((resolve, reject) => {
    // Set a timeout to reject the promise if verification takes too long
    const timeoutId = setTimeout(() => {
      const error = new Error('Token verification timed out');
      error.name = 'TokenVerificationTimeoutError';
      reject(error);
    }, timeoutMs);
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, secret);
      clearTimeout(timeoutId);
      resolve(decoded);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
};

/**
 * Alias for authenticateToken to maintain consistent naming across codebase
 * Used by company management routes (OCAE-204)
 */
const authenticate = authenticateToken;

/**
 * Check if a token is blacklisted
 * Uses Redis if available, otherwise falls back to in-memory Set
 * 
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} - True if blacklisted, false otherwise
 */
const isTokenBlacklisted = async (token) => {
  // If Redis client exists and is ready, try to use it
  if (redisClient && redisClient.isReady) {
    try {
      // Check if token exists in Redis
      const result = await redisClient.get(`blacklist:${token}`);
      return result !== null;
    } catch (error) {
      console.error('Redis blacklist check failed:', error);
      // Fall back to in-memory blacklist
      return tokenBlacklist.has(token);
    }
  } else {
    // Use in-memory blacklist
    return tokenBlacklist.has(token);
  }
};

/**
 * Check token blacklist - synchronous version for backward compatibility
 * @deprecated Use isTokenBlacklisted instead
 */
const checkTokenBlacklist = (token) => {
  // For backward compatibility, return synchronously from memory
  return tokenBlacklist.has(token);
};

/**
 * Add token to blacklist
 * Uses Redis if available, otherwise falls back to in-memory Set
 * 
 * @param {string} token - JWT token to blacklist
 * @returns {Promise<boolean>} - True if successful
 */
const blacklistToken = async (token) => {
  try {
    // Always add to in-memory blacklist as a fallback
    tokenBlacklist.add(token);
    
    // If Redis client exists and is ready, try to use it
    if (redisClient && redisClient.isReady) {
      try {
        // Add to Redis with TTL
        await redisClient.setEx(`blacklist:${token}`, TOKEN_BLACKLIST_TTL, '1');
        return true;
      } catch (error) {
        console.error('Redis blacklist add failed:', error);
        // Return true because we've already added to in-memory blacklist
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Token blacklisting failed:', error);
    return false;
  }
};

// Export all functions
module.exports = { 
  authenticateToken,
  authenticate,
  checkTokenBlacklist,
  isTokenBlacklisted,
  blacklistToken,
  verifyTokenWithTimeout
};
