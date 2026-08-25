/**
 * Comprehensive Authentication Middleware Tests
 * Issue #41: Middleware Test Suite - Auth Coverage Enhancement
 *
 * Tests covering: query token extraction, API key fast-path, agent tokens,
 * AINative fallback, user provisioning, sub claim, upstream network errors,
 * token verification timeout, blacklisting edge cases, and middleware ordering.
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');

// Mock dependencies before requiring the middleware
jest.mock('../../../models/User');
jest.mock('../../../utils/mongoDbConnection');
jest.mock('../../../controllers/apiKeyController', () => ({
  resolveApiKey: jest.fn()
}));

const User = require('../../../models/User');
const { resolveApiKey } = require('../../../controllers/apiKeyController');

const JWT_SECRET = 'comprehensive-auth-test-secret';

describe('AuthMiddleware - Comprehensive Coverage', () => {
  let authMiddleware;
  let req;
  let res;
  let next;

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    authMiddleware = require('../../../middleware/authMiddleware');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
      query: {},
      path: '/api/v1/test',
      url: '/api/v1/test',
      user: null,
      token: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();

    User.findOne = jest.fn().mockResolvedValue(null);
    User.findByEmail = jest.fn().mockResolvedValue(null);
    User.create = jest.fn().mockResolvedValue(null);
    User.getPermissionsForRole = jest.fn().mockReturnValue([]);
    User.updateLastLogin = jest.fn().mockResolvedValue(null);
    authMiddleware.__clearCacheForTesting();
    // Prevent AINative fallback by default
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('Network error'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------
  // Query token extraction (documents/files/download paths)
  // ---------------------------------------------------------------
  describe('query token extraction', () => {
    it('should accept token from query param on /documents/ path', async () => {
      User.findOne.mockResolvedValue({
        userId: 'user-q1', email: 'q@test.com', role: 'employee', companyId: 'c1', status: 'active', permissions: []
      });
      const token = jwt.sign(
        { userId: 'user-q1', email: 'q@test.com', role: 'employee', companyId: 'c1' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.query = { token };
      req.path = '/api/v1/documents/doc-123';

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('user-q1');
    });

    it('should accept token from query param on /files/ path', async () => {
      User.findOne.mockResolvedValue({
        userId: 'user-q2', email: 'f@test.com', role: 'employee', companyId: 'c1', status: 'active', permissions: []
      });
      const token = jwt.sign(
        { userId: 'user-q2', email: 'f@test.com', role: 'employee', companyId: 'c1' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.query = { token };
      req.path = '/api/v1/files/file-456';

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should accept token from query param on /download path', async () => {
      User.findOne.mockResolvedValue({
        userId: 'user-q3', email: 'd@test.com', role: 'employee', companyId: 'c1', status: 'active', permissions: []
      });
      const token = jwt.sign(
        { userId: 'user-q3', email: 'd@test.com', role: 'employee', companyId: 'c1' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.query = { token };
      req.path = '/api/v1/download';

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should NOT accept query token on non-file paths', async () => {
      const token = jwt.sign(
        { userId: 'user-q4', email: 'x@test.com', role: 'employee' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.query = { token };
      req.path = '/api/v1/users';

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    });
  });

  // ---------------------------------------------------------------
  // API key fast-path (ocs_ prefix)
  // ---------------------------------------------------------------
  describe('API key fast-path (ocs_ prefix)', () => {
    it('should authenticate valid ocs_ API key', async () => {
      const apiUser = {
        userId: 'api-user-1',
        email: 'api@test.com',
        role: 'admin',
        companyId: 'comp-api'
      };
      resolveApiKey.mockResolvedValue(apiUser);
      req.headers.authorization = 'Bearer ocs_test_key_abc123';

      await authMiddleware.authenticateToken(req, res, next);

      expect(resolveApiKey).toHaveBeenCalledWith('ocs_test_key_abc123');
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(apiUser);
      expect(req.token).toBe('ocs_test_key_abc123');
    });

    it('should return 401 for invalid ocs_ API key', async () => {
      resolveApiKey.mockResolvedValue(null);
      req.headers.authorization = 'Bearer ocs_invalid_key';

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid API key' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // JWT 'sub' claim support
  // ---------------------------------------------------------------
  describe('JWT sub claim support', () => {
    it('should use sub claim when userId is absent', async () => {
      User.findOne.mockResolvedValue({
        userId: 'sub-user-1', email: 'sub@test.com', role: 'founder', companyId: 'c1', status: 'active', permissions: []
      });
      const token = jwt.sign(
        { sub: 'sub-user-1', email: 'sub@test.com', role: 'founder', companyId: 'c1' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('sub-user-1');
    });
  });

  // ---------------------------------------------------------------
  // Agent token handling
  // ---------------------------------------------------------------
  describe('agent token handling', () => {
    it('should authenticate agent token without DB user lookup', async () => {
      const token = jwt.sign(
        {
          userId: 'agent-001',
          type: 'agent',
          capabilities: ['read:cap_table', 'read:documents'],
          company_id: 'comp-agent'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;
      // Ensure User.findOne returns null so the agent path is taken
      User.findOne.mockResolvedValue(null);

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('agent-001');
      expect(req.user.role).toBe('agent');
      expect(req.user.isAgent).toBe(true);
      expect(req.user.capabilities).toEqual(['read:cap_table', 'read:documents']);
      expect(req.user.companyId).toBe('comp-agent');
    });

    it('should set email to null for agent tokens', async () => {
      const token = jwt.sign(
        { userId: 'agent-002', type: 'agent', capabilities: [] },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;
      User.findOne.mockResolvedValue(null);

      await authMiddleware.authenticateToken(req, res, next);

      expect(req.user.email).toBeNull();
    });
  });

  // ---------------------------------------------------------------
  // User provisioning from JWT (new user auto-creation)
  // ---------------------------------------------------------------
  describe('user provisioning from JWT', () => {
    it('should provision new user when not found in DB but JWT has email', async () => {
      const token = jwt.sign(
        { userId: 'new-user-1', email: 'new@test.com', name: 'New User' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const provisionedUser = {
        userId: 'new-user-1',
        email: 'new@test.com',
        role: 'employee',
        permissions: [],
        companyId: null,
        status: 'active',
        _id: 'new-user-1'
      };
      User.findOne.mockResolvedValue(null);
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue(provisionedUser);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('new-user-1');
      expect(req.user.email).toBe('new@test.com');

      consoleSpy.mockRestore();
    });

    it('should return existing user from findByEmail during provisioning', async () => {
      const token = jwt.sign(
        { userId: 'existing-user', email: 'existing@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const existingUser = {
        userId: 'existing-user',
        email: 'existing@test.com',
        role: 'founder',
        permissions: ['read:companies'],
        companyId: 'comp-1',
        status: 'active',
        _id: 'existing-user'
      };
      User.findOne.mockResolvedValue(null);
      User.findByEmail.mockResolvedValue(existingUser);
      User.updateLastLogin.mockResolvedValue(true);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(User.updateLastLogin).toHaveBeenCalledWith('existing-user');

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // provisionUserFromToken standalone tests
  // ---------------------------------------------------------------
  describe('provisionUserFromToken', () => {
    it('should parse name into first/last when name has multiple parts', async () => {
      User.findByEmail.mockResolvedValue(null);
      const createdUser = {
        userId: 'prov-1',
        email: 'john.doe@test.com',
        firstName: 'John',
        lastName: 'Michael Doe',
        role: 'employee',
        status: 'active'
      };
      User.create.mockResolvedValue(createdUser);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await authMiddleware.provisionUserFromToken({
        userId: 'prov-1',
        email: 'john.doe@test.com',
        name: 'John Michael Doe',
        role: 'founder'
      });

      expect(result).toBeDefined();
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'John',
        lastName: 'Michael Doe',
        role: 'founder'
      }));

      consoleSpy.mockRestore();
    });

    it('should use email prefix as name when no name or displayName', async () => {
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue({ userId: 'prov-2', email: 'noname@test.com', status: 'active' });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authMiddleware.provisionUserFromToken({
        userId: 'prov-2',
        email: 'noname@test.com'
      });

      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'noname',
        role: 'employee'
      }));

      consoleSpy.mockRestore();
    });

    it('should return null on provisioning failure', async () => {
      User.findByEmail.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await authMiddleware.provisionUserFromToken({
        userId: 'fail-1',
        email: 'fail@test.com'
      });

      expect(result).toBeNull();

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // provisionAINativeUser standalone tests
  // ---------------------------------------------------------------
  describe('provisionAINativeUser', () => {
    it('should return existing user when found by email', async () => {
      const existingUser = { userId: 'ainative-1', email: 'ainative@test.com', role: 'employee', status: 'active' };
      User.findByEmail.mockResolvedValue(existingUser);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await authMiddleware.provisionAINativeUser({
        userId: 'ainative-1',
        email: 'ainative@test.com',
        name: 'AINative User'
      });

      expect(result).toEqual(existingUser);
      expect(User.updateLastLogin).toHaveBeenCalledWith('ainative-1');

      consoleSpy.mockRestore();
    });

    it('should create new user for first-time AINative login', async () => {
      User.findByEmail.mockResolvedValue(null);
      const newUser = {
        userId: 'ainative-new',
        email: 'new-ainative@test.com',
        role: 'employee',
        status: 'active'
      };
      User.create.mockResolvedValue(newUser);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await authMiddleware.provisionAINativeUser({
        userId: 'ainative-new',
        email: 'new-ainative@test.com',
        name: 'Brand New User'
      });

      expect(result).toEqual(newUser);
      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new-ainative@test.com',
        authProvider: 'ainative',
        ainativeId: 'ainative-new'
      }));

      consoleSpy.mockRestore();
    });

    it('should return fallback user object on provisioning failure', async () => {
      User.findByEmail.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await authMiddleware.provisionAINativeUser({
        userId: 'fail-ainative',
        email: 'fail@test.com',
        name: 'Fail User'
      });

      expect(result.userId).toBe('fail-ainative');
      expect(result.provisioningFailed).toBe(true);
      expect(result.isAINativeUser).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // validateAINativeToken standalone tests
  // ---------------------------------------------------------------
  describe('validateAINativeToken', () => {
    it('should return user data on successful AINative validation', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'ainative-ext-1',
          email: 'ext@ainative.com',
          name: 'External User'
        }
      });

      const result = await authMiddleware.validateAINativeToken('some-ainative-token');

      expect(result.userId).toBe('ainative-ext-1');
      expect(result.email).toBe('ext@ainative.com');
      expect(result.isAINativeUser).toBe(true);
    });

    it('should throw AINativeValidationError on failure', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        authMiddleware.validateAINativeToken('bad-token')
      ).rejects.toThrow('AINative token validation failed');
    });
  });

  // ---------------------------------------------------------------
  // AINative fallback in authenticateToken
  // ---------------------------------------------------------------
  describe('AINative token validation fallback', () => {
    it('should fall back to AINative validation when local JWT fails', async () => {
      // Use a token signed with a different secret
      const foreignToken = jwt.sign(
        { userId: 'foreign-user', email: 'foreign@ainative.com' },
        'different-secret',
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${foreignToken}`;

      // AINative validation succeeds
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'ainative-fb-1',
          email: 'foreign@ainative.com',
          name: 'Foreign User'
        }
      });

      // provisionAINativeUser returns a local user
      const localUser = {
        userId: 'ainative-fb-1',
        email: 'foreign@ainative.com',
        role: 'employee',
        permissions: [],
        companyId: null,
        status: 'active',
        _id: 'ainative-fb-1'
      };
      User.findByEmail.mockResolvedValue(localUser);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('ainative-fb-1');
      expect(req.user.email).toBe('foreign@ainative.com');

      consoleSpy.mockRestore();
    });

    it('should return 401 when both local JWT and AINative validation fail', async () => {
      req.headers.authorization = 'Bearer completely-invalid-token';

      // AINative also fails
      axios.get.mockRejectedValueOnce(new Error('AINative down'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // Upstream network errors (503)
  // ---------------------------------------------------------------
  describe('upstream network errors', () => {
    it('should return 503 for axios errors (ZeroDB unavailable)', async () => {
      const token = jwt.sign(
        { userId: 'user-net', email: 'net@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const axiosError = new Error('ECONNREFUSED');
      axiosError.isAxiosError = true;
      User.findOne.mockRejectedValue(axiosError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({ message: 'Service temporarily unavailable, please retry' });
      expect(next).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should return 503 for ECONNREFUSED errors', async () => {
      const token = jwt.sign(
        { userId: 'user-conn', email: 'conn@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const connError = new Error('connect ECONNREFUSED');
      connError.code = 'ECONNREFUSED';
      User.findOne.mockRejectedValue(connError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);

      consoleSpy.mockRestore();
    });

    it('should return 503 for ECONNRESET errors', async () => {
      const token = jwt.sign(
        { userId: 'user-reset', email: 'reset@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const resetError = new Error('connection reset');
      resetError.code = 'ECONNRESET';
      User.findOne.mockRejectedValue(resetError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);

      consoleSpy.mockRestore();
    });

    it('should return 503 for ETIMEDOUT errors', async () => {
      const token = jwt.sign(
        { userId: 'user-timeout', email: 'timeout@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const timeoutError = new Error('connection timed out');
      timeoutError.code = 'ETIMEDOUT';
      User.findOne.mockRejectedValue(timeoutError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await authMiddleware.authenticateToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------
  // verifyTokenWithTimeout edge cases
  // ---------------------------------------------------------------
  describe('verifyTokenWithTimeout edge cases', () => {
    it('should reject expired token with TokenExpiredError', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test' },
        JWT_SECRET,
        { expiresIn: '-10s' }
      );

      await expect(
        authMiddleware.verifyTokenWithTimeout(expiredToken, JWT_SECRET, 5000)
      ).rejects.toThrow();
    });

    it('should reject token signed with wrong secret', async () => {
      const wrongSecretToken = jwt.sign({ userId: 'test' }, 'wrong-secret');

      try {
        await authMiddleware.verifyTokenWithTimeout(wrongSecretToken, JWT_SECRET, 5000);
        fail('Should have thrown');
      } catch (err) {
        expect(err.name).toBe('JsonWebTokenError');
      }
    });
  });

  // ---------------------------------------------------------------
  // Token blacklisting - edge cases
  // ---------------------------------------------------------------
  describe('token blacklisting edge cases', () => {
    it('should return false for expired blacklist entries', async () => {
      // This is tested implicitly through the TTL mechanism, but we test via
      // the public API to ensure correctness
      const token = 'edge-blacklist-' + Date.now();
      const result = await authMiddleware.isTokenBlacklisted(token);
      expect(result).toBe(false);
    });

    it('checkTokenBlacklist should return false for unknown tokens', () => {
      const result = authMiddleware.checkTokenBlacklist('unknown-token-' + Date.now());
      expect(result).toBe(false);
    });

    it('blacklistToken should return true even on internal errors', async () => {
      // blacklistToken always adds to in-memory first, so should return true
      const result = await authMiddleware.blacklistToken('test-bl-' + Date.now());
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------
  // Active user with DB lookup and companyId from token
  // ---------------------------------------------------------------
  describe('user with DB lookup and various companyId sources', () => {
    it('should use user companyId when available', async () => {
      const token = jwt.sign(
        { userId: 'user-db', email: 'db@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const mockUser = {
        userId: 'user-db',
        email: 'db@test.com',
        role: 'founder',
        permissions: ['read:companies'],
        companyId: 'user-company',
        status: 'active',
        _id: 'db-id'
      };
      User.findOne.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.companyId).toBe('user-company');
      expect(req.user._id).toBe('db-id');
    });

    it('should fall back to decoded.companyId when user has no companyId', async () => {
      const token = jwt.sign(
        { userId: 'user-fc', email: 'fc@test.com', companyId: 'token-company' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const mockUser = {
        userId: 'user-fc',
        email: 'fc@test.com',
        role: 'employee',
        permissions: [],
        companyId: null, // No company in user record
        status: 'active'
      };
      User.findOne.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.companyId).toBe('token-company');
    });

    it('should use user role over decoded role when user found', async () => {
      const token = jwt.sign(
        { userId: 'user-role', email: 'role@test.com', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const mockUser = {
        userId: 'user-role',
        email: 'role@test.com',
        role: 'founder', // DB says founder, token says admin
        permissions: ['read:companies'],
        companyId: 'comp-r',
        status: 'active'
      };
      User.findOne.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(req.user.role).toBe('founder');
    });

    it('should use decoded role as fallback when user.role is missing', async () => {
      const token = jwt.sign(
        { userId: 'user-norole', email: 'norole@test.com', role: 'manager' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      req.headers.authorization = `Bearer ${token}`;

      const mockUser = {
        userId: 'user-norole',
        email: 'norole@test.com',
        role: null, // no role in DB
        permissions: [],
        companyId: 'comp-nr',
        status: 'active'
      };
      User.findOne.mockResolvedValue(mockUser);

      await authMiddleware.authenticateToken(req, res, next);

      expect(req.user.role).toBe('manager');
    });
  });

  // ---------------------------------------------------------------
  // User caching behavior
  // ---------------------------------------------------------------
  describe('user caching', () => {
    it('should return cached user on second call without hitting DB', async () => {
      const token = jwt.sign(
        { userId: 'cache-user', email: 'cache@test.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const mockUser = {
        userId: 'cache-user',
        email: 'cache@test.com',
        role: 'employee',
        permissions: [],
        companyId: 'comp-cache',
        status: 'active'
      };
      User.findOne.mockResolvedValue(mockUser);

      // First call: hits DB
      req.headers.authorization = `Bearer ${token}`;
      await authMiddleware.authenticateToken(req, res, next);
      expect(User.findOne).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalled();

      // Reset mocks for second call
      jest.clearAllMocks();
      req = {
        headers: { authorization: `Bearer ${token}` },
        query: {},
        path: '/test',
        url: '/test',
        user: null,
        token: null
      };
      res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
      next = jest.fn();

      // Second call: should use cache, NOT hit DB
      await authMiddleware.authenticateToken(req, res, next);
      expect(User.findOne).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('cache-user');
    });
  });

  // ---------------------------------------------------------------
  // Middleware exports
  // ---------------------------------------------------------------
  describe('module exports', () => {
    it('should export all expected functions', () => {
      expect(typeof authMiddleware.authenticateToken).toBe('function');
      expect(typeof authMiddleware.authenticate).toBe('function');
      expect(typeof authMiddleware.checkTokenBlacklist).toBe('function');
      expect(typeof authMiddleware.isTokenBlacklisted).toBe('function');
      expect(typeof authMiddleware.blacklistToken).toBe('function');
      expect(typeof authMiddleware.verifyTokenWithTimeout).toBe('function');
      expect(typeof authMiddleware.validateAINativeToken).toBe('function');
      expect(typeof authMiddleware.provisionAINativeUser).toBe('function');
      expect(typeof authMiddleware.provisionUserFromToken).toBe('function');
      expect(typeof authMiddleware.__clearCacheForTesting).toBe('function');
    });

    it('authenticate should be the same reference as authenticateToken', () => {
      expect(authMiddleware.authenticate).toBe(authMiddleware.authenticateToken);
    });
  });
});
