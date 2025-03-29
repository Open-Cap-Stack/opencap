/**
 * Authentication Middleware Tests
 * Bug: OCDI-302: Fix User Authentication Test Failures
 * 
 * This test file verifies the fixes for the auth middleware:
 * 1. Mongoose connection timeouts with retry logic
 * 2. JWT verification with timeouts
 * 3. Improved token blacklisting
 * 4. Model naming consistency
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { 
  authenticateToken, 
  checkTokenBlacklist, 
  blacklistToken, 
  isTokenBlacklisted,
  verifyTokenWithTimeout
} = require('../../middleware/authMiddleware');
const mongoDbConnection = require('../../utils/mongoDbConnection');

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../models/User');
jest.mock('../../utils/mongoDbConnection');

// Import mocks after they've been set up
const User = require('../../models/User');

describe('Authentication Middleware (OCDI-302)', () => {
  // Mock Express request and response objects
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock Express req/res/next
    req = {
      headers: {},
      user: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Set up mongoDbConnection mock
    mongoDbConnection.withRetry.mockImplementation(async (fn) => {
      return await fn();
    });
    
    // Default JWT behavior
    jwt.verify.mockReturnValue({ userId: 'test-user-id' });
  });

  describe('MongoDB Connection Improvements', () => {
    it('should use retry logic for database operations', async () => {
      // Setup
      req.headers.authorization = 'Bearer valid-token';
      User.findOne.mockResolvedValue({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        status: 'active'
      });
      
      // Act
      await authenticateToken(req, res, next);
      
      // Assert
      expect(mongoDbConnection.withRetry).toHaveBeenCalled();
      expect(User.findOne).toHaveBeenCalledWith({ userId: 'test-user-id' });
      expect(next).toHaveBeenCalled();
    });
    
    it('should handle database operation failures gracefully', async () => {
      // Setup
      req.headers.authorization = 'Bearer valid-token';
      
      // Simulate MongoDB operation failure
      mongoDbConnection.withRetry.mockRejectedValueOnce(new Error('Database error'));
      
      // Act
      await authenticateToken(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Authentication error'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('JWT Verification Improvements', () => {
    it('should handle expired tokens correctly', async () => {
      // Setup
      req.headers.authorization = 'Bearer expired-token';
      
      // Mock JWT verify to throw TokenExpiredError
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementationOnce(() => {
        throw error;
      });
      
      // Act
      await authenticateToken(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Token expired'
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should handle invalid tokens correctly', async () => {
      // Setup
      req.headers.authorization = 'Bearer invalid-token';
      
      // Mock JWT verify to throw JsonWebTokenError
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementationOnce(() => {
        throw error;
      });
      
      // Act
      await authenticateToken(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid token'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('Token Blacklist Improvements', () => {
    it('should correctly add tokens to the blacklist', async () => {
      // Setup - add a token to the blacklist
      await blacklistToken('test-token');
      
      // Assert it's added
      const isBlacklisted = await isTokenBlacklisted('test-token');
      expect(isBlacklisted).toBe(true);
    });
    
    it('should correctly check for blacklisted tokens', async () => {
      // Setup - token not blacklisted yet
      const notBlacklisted = await isTokenBlacklisted('new-token');
      expect(notBlacklisted).toBe(false);
      
      // Blacklist the token
      await blacklistToken('new-token');
      
      // Check again
      const isBlacklisted = await isTokenBlacklisted('new-token');
      expect(isBlacklisted).toBe(true);
    });
    
    it('should support the legacy synchronous checkTokenBlacklist function', async () => {
      // Setup - add a token to the blacklist
      await blacklistToken('legacy-token');
      
      // Check with the legacy function
      const isBlacklisted = checkTokenBlacklist('legacy-token');
      expect(isBlacklisted).toBe(true);
      
      // Non-blacklisted token
      const notBlacklisted = checkTokenBlacklist('unknown-token');
      expect(notBlacklisted).toBe(false);
    });
  });
  
  describe('Full Authentication Flow', () => {
    it('should authenticate a valid request', async () => {
      // Setup
      req.headers.authorization = 'Bearer valid-token';
      
      // Setup user mock
      User.findOne.mockResolvedValueOnce({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
        companyId: 'company123',
        status: 'active'
      });
      
      // Act
      await authenticateToken(req, res, next);
      
      // Assert
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
        companyId: 'company123'
      });
      expect(req.token).toBe('valid-token'); // Should attach token to request
    });
    
    it('should reject a blacklisted token', async () => {
      // Setup - blacklist a token
      await blacklistToken('blacklisted-token');
      
      // Setup request with blacklisted token
      req.headers.authorization = 'Bearer blacklisted-token';
      
      // Act
      await authenticateToken(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Token is invalidated'
      }));
      expect(next).not.toHaveBeenCalled();
    });
    
    it('should reject inactive user accounts', async () => {
      // Setup
      req.headers.authorization = 'Bearer valid-token';
      
      // Setup inactive user mock
      User.findOne.mockResolvedValueOnce({
        userId: 'inactive-user',
        email: 'inactive@example.com',
        role: 'user',
        status: 'suspended' // Not active
      });
      
      // Act
      await authenticateToken(req, res, next);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Account is not active'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });
});
