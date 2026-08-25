/**
 * Valuation Routes Authentication Integration Tests
 * Issue #250: Fix 401 Unauthorized errors on Valuations page
 *
 * Tests authentication middleware for valuation endpoints
 */

const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { __clearCacheForTesting } = require('../../middleware/authMiddleware');
const Valuation409A = require('../../models/Valuation409A');
const ValuationPartner = require('../../models/ValuationPartner');

describe('Valuation Routes Authentication', () => {
  let validToken;
  let expiredToken;
  let invalidToken;
  let testUser;
  let testCompany;

  const testSecret = process.env.JWT_SECRET || 'test-jwt-secret';

  beforeAll(async () => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = testSecret;
    }

    // Define test user (no real DB call)
    testUser = {
      userId: 'user_valuation_test_1',
      email: 'valuation-test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      permissions: ['admin:all'],
      companyId: 'test-company-123'
    };

    testCompany = 'test-company-123';

    // Generate valid token
    validToken = jwt.sign(
      {
        userId: testUser.userId,
        email: testUser.email,
        role: testUser.role,
        companyId: testUser.companyId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Generate expired token
    expiredToken = jwt.sign(
      {
        userId: testUser.userId,
        email: testUser.email,
        role: testUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // Already expired
    );

    // Invalid token
    invalidToken = 'invalid.token.here';
  });

  beforeEach(() => {
    __clearCacheForTesting();
    // Mock User.findOne to return the active test user by default
    jest.spyOn(User, 'findOne').mockResolvedValue(testUser);
    jest.spyOn(User, 'findByEmail').mockResolvedValue(testUser);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    // No real DB cleanup needed
  });

  describe('GET /api/v1/valuations - Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/no token provided/i);
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid token/i);
    });

    it('should return 401 when expired token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/token expired/i);
    });

    it('should return 401 when Bearer prefix is missing', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', validToken) // Missing 'Bearer ' prefix
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should successfully authenticate with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${validToken}`)
        .expect('Content-Type', /json/);

      // Should not be 401
      expect(response.status).not.toBe(401);

      // Should be 200 or 500 (depending on database state)
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/v1/valuations - Authentication', () => {
    const validPayload = {
      companyId: 'test-company-123',
      reason: 'annual_valuation',
      reasonDetails: 'Annual 409A refresh'
    };

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/valuations')
        .send(validPayload)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/no token provided/i);
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/valuations')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(validPayload)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid token/i);
    });

    it('should return 401 when expired token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/valuations')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(validPayload)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/token expired/i);
    });

    it('should successfully authenticate with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/valuations')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload)
        .expect('Content-Type', /json/);

      // Should not be 401
      expect(response.status).not.toBe(401);

      // Should be 201, 400, or 500 (depending on validation/database)
      expect([201, 400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/v1/valuations/:valuationId - Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/val_test123')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/no token provided/i);
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/val_test123')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid token/i);
    });

    it('should successfully authenticate with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/val_test123')
        .set('Authorization', `Bearer ${validToken}`)
        .expect('Content-Type', /json/);

      // Should not be 401
      expect(response.status).not.toBe(401);

      // Should be 404 (not found) or 500 (database error), but NOT 401
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/v1/valuation-partners - Authentication', () => {
    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuation-partners')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/no token provided/i);
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuation-partners')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid token/i);
    });

    it('should return 401 when expired token is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuation-partners')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/token expired/i);
    });

    it('should successfully authenticate with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/valuation-partners')
        .set('Authorization', `Bearer ${validToken}`)
        .expect('Content-Type', /json/);

      // Should not be 401
      expect(response.status).not.toBe(401);

      // Should be 200 or 500 (depending on database state)
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('POST /api/v1/valuation-partners - Authentication', () => {
    const validPayload = {
      companyId: 'test-company-123',
      name: 'Test Valuation Firm',
      type: 'valuation_firm'
    };

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/valuation-partners')
        .send(validPayload)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/no token provided/i);
    });

    it('should return 401 when invalid token is provided', async () => {
      const response = await request(app)
        .post('/api/v1/valuation-partners')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(validPayload)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid token/i);
    });

    it('should successfully authenticate with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/valuation-partners')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload)
        .expect('Content-Type', /json/);

      // Should not be 401
      expect(response.status).not.toBe(401);

      // Should be 201, 400, or 500 (depending on validation/database)
      expect([201, 400, 500]).toContain(response.status);
    });
  });

  describe('Token Blacklisting', () => {
    it('should return 401 when using a blacklisted token', async () => {
      // Create a token specifically for blacklisting
      const tokenToBlacklist = jwt.sign(
        {
          userId: testUser.userId,
          email: testUser.email,
          role: testUser.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Blacklist the token
      const { blacklistToken } = require('../../middleware/authMiddleware');
      await blacklistToken(tokenToBlacklist);

      // Try to use the blacklisted token
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${tokenToBlacklist}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/token is invalidated/i);
    });
  });

  describe('User Status Validation', () => {
    let inactiveUserToken;
    let inactiveUser;

    beforeAll(async () => {
      // Define inactive user (no real DB call)
      inactiveUser = {
        userId: 'user_inactive_test_1',
        email: 'inactive-user@example.com',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'employee',
        status: 'inactive',
        permissions: [],
        companyId: 'test-company-123'
      };

      // Generate token for inactive user
      inactiveUserToken = jwt.sign(
        {
          userId: inactiveUser.userId,
          email: inactiveUser.email,
          role: inactiveUser.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });

    it('should return 403 when user account is inactive', async () => {
      // Clear cache and mock User.findOne to return the inactive user
      __clearCacheForTesting();
      jest.restoreAllMocks();
      jest.spyOn(User, 'findOne').mockResolvedValue(inactiveUser);
      jest.spyOn(User, 'findByEmail').mockResolvedValue(inactiveUser);

      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${inactiveUserToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/account is not active/i);
    });
  });

  describe('Error Response Format', () => {
    it('should return consistent error format for authentication failures', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
    });

    it('should not expose sensitive error details', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      // Should not include stack traces or sensitive info
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('config');

      // Should have a clean error message
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).not.toContain('JWT');
      expect(response.body.message).not.toContain('secret');
    });
  });
});
