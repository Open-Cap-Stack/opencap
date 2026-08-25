/**
 * Authentication Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for JWT authentication middleware
 * Target coverage: 80%+
 */

const jwt = require('jsonwebtoken');

// Mock dependencies before requiring the middleware
jest.mock('../../../models/User');
jest.mock('../../../utils/mongoDbConnection');

const User = require('../../../models/User');
const mongoDbConnection = require('../../../utils/mongoDbConnection');
const axios = require('axios');

// Store original env
const originalEnv = process.env;

describe('AuthMiddleware', () => {
  let authMiddleware;
  let req;
  let res;
  let next;

  beforeAll(() => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = 'test-secret-key-for-middleware-testing';
    process.env.NODE_ENV = 'test';

    // Now require the middleware after env is set
    authMiddleware = require('../../../middleware/authMiddleware');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request
    req = {
      headers: {},
      user: null,
      token: null
    };

    // Setup mock response
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Setup mock next function
    next = jest.fn();

    // Setup default mock implementations
    mongoDbConnection.withRetry = jest.fn(fn => fn());
    User.findOne = jest.fn();
    // Clear the in-memory user cache so tests don't share cached state
    authMiddleware.__clearCacheForTesting();
    // Mock axios.get to reject immediately so AINative validation fails fast
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));
  });

  describe('authenticateToken', () => {
    it('should return 401 if no authorization header is provided', async () => {
      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic sometoken';

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if token is empty', async () => {
      req.headers.authorization = 'Bearer ';

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token expired' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for valid token with role in payload but no DB user (issue #172)', async () => {
      const validToken = jwt.sign(
        {
          userId: 'user123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['read:users', 'write:users'],
          companyId: 'company123'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      await authMiddleware.authenticateToken(req, res, next);

      // Issue #172: JWT role claims must not be trusted without DB validation
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should lookup user from database when role not in token', async () => {
      const validToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'employee',
        permissions: ['read:companies'],
        companyId: 'company456',
        status: 'active'
      };
      User.findOne.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(User.findOne).toHaveBeenCalledWith({ userId: 'user123' });
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        userId: 'user123',
        _id: 'user123',
        email: 'test@example.com',
        role: 'employee',
        permissions: ['read:companies'],
        companyId: 'company456'
      });
    });

    it('should return 401 if user not found in database', async () => {
      const validToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      User.findOne.mockResolvedValue(null);

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user account is not active', async () => {
      const validToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'employee',
        status: 'suspended'
      };
      User.findOne.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Account is not active' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 for server errors', async () => {
      const validToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      User.findOne.mockRejectedValue(new Error('Database error'));

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Authentication error' });
      expect(next).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle user with no permissions array', async () => {
      const validToken = jwt.sign(
        { userId: 'user123', email: 'test@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${validToken}`;

      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'employee',
        companyId: 'company456',
        status: 'active'
        // No permissions array
      };
      User.findOne.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.permissions).toEqual([]);
    });
  });

  describe('authenticate (alias)', () => {
    it('should be an alias for authenticateToken', () => {
      expect(authMiddleware.authenticate).toBe(authMiddleware.authenticateToken);
    });
  });

  describe('verifyTokenWithTimeout', () => {
    it('should verify valid token', async () => {
      const token = jwt.sign({ userId: 'test' }, process.env.JWT_SECRET);

      const decoded = await authMiddleware.verifyTokenWithTimeout(
        token,
        process.env.JWT_SECRET,
        5000
      );

      expect(decoded.userId).toBe('test');
    });

    it('should reject invalid token', async () => {
      await expect(
        authMiddleware.verifyTokenWithTimeout('invalid-token', process.env.JWT_SECRET, 5000)
      ).rejects.toThrow();
    });

    it('should reject on malformed secret', async () => {
      const token = jwt.sign({ userId: 'test' }, process.env.JWT_SECRET);

      await expect(
        authMiddleware.verifyTokenWithTimeout(token, 'wrong-secret', 5000)
      ).rejects.toThrow();
    });
  });

  describe('Token Blacklisting', () => {
    describe('isTokenBlacklisted', () => {
      it('should return false for non-blacklisted token', async () => {
        const result = await authMiddleware.isTokenBlacklisted('some-token');
        expect(result).toBe(false);
      });

      it('should return true for blacklisted token', async () => {
        const token = 'blacklisted-token-' + Date.now();
        await authMiddleware.blacklistToken(token);

        const result = await authMiddleware.isTokenBlacklisted(token);
        expect(result).toBe(true);
      });
    });

    describe('blacklistToken', () => {
      it('should successfully blacklist a token', async () => {
        const token = 'test-blacklist-token-' + Date.now();

        const result = await authMiddleware.blacklistToken(token);
        expect(result).toBe(true);

        const isBlacklisted = await authMiddleware.isTokenBlacklisted(token);
        expect(isBlacklisted).toBe(true);
      });
    });

    describe('checkTokenBlacklist (deprecated)', () => {
      it('should check token blacklist synchronously', async () => {
        const token = 'sync-check-token-' + Date.now();

        // Initially not blacklisted
        expect(authMiddleware.checkTokenBlacklist(token)).toBe(false);

        // Blacklist the token
        await authMiddleware.blacklistToken(token);

        // Now should be blacklisted
        expect(authMiddleware.checkTokenBlacklist(token)).toBe(true);
      });
    });

    it('should reject blacklisted token in authenticateToken', async () => {
      const token = jwt.sign(
        {
          userId: 'user123',
          email: 'test@example.com',
          role: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Blacklist the token first
      await authMiddleware.blacklistToken(token);

      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token is invalidated' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
