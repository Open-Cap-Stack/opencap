/**
 * Auth Bypass Regression Tests
 * Issue #172: Non-production auth bypass trusts JWT claims without DB validation
 *
 * Verifies that the middleware never sets req.user from raw JWT claims when
 * no matching DB user exists, regardless of NODE_ENV.
 */

const jwt = require('jsonwebtoken');

jest.mock('../../../models/User');

const User = require('../../../models/User');
const axios = require('axios');

const JWT_SECRET = 'bypass-test-secret';

// Helper: generate a valid JWT with arbitrary claims
function makeToken(claims) {
  return jwt.sign(claims, JWT_SECRET);
}

// Helper: build Express-style req/res/next mocks
function mockHttp() {
  const req = { headers: {}, user: null, token: null };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('Issue #172 – JWT claim bypass', () => {
  let authMiddleware;
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    authMiddleware = require('../../../middleware/authMiddleware');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authMiddleware.__clearCacheForTesting();
    // Ensure AINative fallback does not rescue the request
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('no ainative'));
    // Default: no user in DB
    User.findOne = jest.fn().mockResolvedValue(null);
    User.findByEmail = jest.fn().mockResolvedValue(null);
  });

  // -----------------------------------------------------------
  // 1. Non-production env, no DB user => must return 401
  // -----------------------------------------------------------
  describe('non-production env with no DB user', () => {
    it('returns 401 even when JWT contains a role claim (NODE_ENV=development)', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MOCK_AUTH;

      const token = makeToken({
        userId: 'attacker-id',
        email: 'attacker@example.com',
        role: 'super_admin',
        permissions: ['*'],
        companyId: 'comp-123',
      });

      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      // req.user must NOT have been populated from JWT claims
      expect(req.user).toBeNull();
    });

    it('returns 401 even when JWT contains a role claim (NODE_ENV=test, MOCK_AUTH unset)', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.MOCK_AUTH;

      const token = makeToken({
        userId: 'attacker-id',
        email: 'attacker@example.com',
        role: 'admin',
      });

      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(req.user).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // 2. Production env, no DB user => must return 401
  // -----------------------------------------------------------
  describe('production env with no DB user', () => {
    it('returns 401 when JWT contains a role claim', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.MOCK_AUTH;

      const token = makeToken({
        userId: 'attacker-id',
        email: 'attacker@example.com',
        role: 'super_admin',
      });

      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      expect(req.user).toBeNull();
    });
  });

  // -----------------------------------------------------------
  // 3. Valid DB user works in both environments
  // -----------------------------------------------------------
  describe('valid DB user authenticates successfully', () => {
    const dbUser = {
      userId: 'real-user-id',
      _id: 'real-user-id',
      email: 'real@example.com',
      role: 'employee',
      permissions: ['read'],
      companyId: 'comp-456',
      status: 'active',
    };

    it('authenticates in development', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MOCK_AUTH;
      User.findOne = jest.fn().mockResolvedValue(dbUser);

      const token = makeToken({ userId: 'real-user-id', email: 'real@example.com' });
      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('real-user-id');
      expect(req.user.role).toBe('employee');
    });

    it('authenticates in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.MOCK_AUTH;
      User.findOne = jest.fn().mockResolvedValue(dbUser);

      const token = makeToken({ userId: 'real-user-id', email: 'real@example.com' });
      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('real-user-id');
      expect(req.user.role).toBe('employee');
    });

    it('authenticates in test env without MOCK_AUTH', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.MOCK_AUTH;
      User.findOne = jest.fn().mockResolvedValue(dbUser);

      const token = makeToken({ userId: 'real-user-id', email: 'real@example.com' });
      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('real-user-id');
    });
  });

  // -----------------------------------------------------------
  // 4. MOCK_AUTH=true + NODE_ENV=test is the only allowed bypass
  // -----------------------------------------------------------
  describe('MOCK_AUTH=true bypass', () => {
    it('allows JWT-claim-based user only when MOCK_AUTH=true AND NODE_ENV=test', async () => {
      process.env.NODE_ENV = 'test';
      process.env.MOCK_AUTH = 'true';

      const token = makeToken({
        userId: 'mock-user',
        email: 'mock@test.com',
        role: 'admin',
        permissions: ['all'],
        companyId: 'test-comp',
      });

      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.role).toBe('admin');
      expect(req.user.userId).toBe('mock-user');
    });

    it('does NOT allow bypass when MOCK_AUTH=true but NODE_ENV=development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.MOCK_AUTH = 'true';

      const token = makeToken({
        userId: 'mock-user',
        email: 'mock@test.com',
        role: 'super_admin',
      });

      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(req.user).toBeNull();
    });

    it('does NOT allow bypass when MOCK_AUTH=true but NODE_ENV=production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.MOCK_AUTH = 'true';

      const token = makeToken({
        userId: 'mock-user',
        email: 'mock@test.com',
        role: 'super_admin',
      });

      const { req, res, next } = mockHttp();
      req.headers.authorization = `Bearer ${token}`;

      await authMiddleware.authenticateToken(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(req.user).toBeNull();
    });
  });
});
