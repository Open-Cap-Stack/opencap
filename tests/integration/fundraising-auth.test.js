/**
 * Fundraising Routes Authentication Tests
 *
 * Issue #252: Fix Fundraising Model Page 401 Unauthorized Error
 * TDD Red Phase - Route authentication tests
 *
 * Test Strategy:
 * 1. Verify all fundraising endpoints require authentication
 * 2. Test JWT token validation and handling
 * 3. Verify proper 401 responses for missing/invalid tokens
 * 4. Test authorization checks for protected resources
 * 5. Verify error handling for authentication failures
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticate, __clearCacheForTesting } = require('../../middleware/authMiddleware');
const User = require('../../models/User');

// Import the routes to test
const fundraisingAnalyticsRoutes = require('../../routes/v1/fundraisingAnalyticsRoutes');
const fundraisingRoundRoutes = require('../../routes/v1/fundraisingRoundRoutes');
const fundraiseModelRoutes = require('../../routes/v1/fundraiseModelRoutes');

// Mock User model
jest.mock('../../models/User');

describe('Fundraising Routes Authentication', () => {
  let app;
  let validToken;
  let expiredToken;
  let invalidToken;
  const mockUserId = 'user-123';
  const mockCompanyId = 'company-123';
  const testSecret = 'test-jwt-secret-key-for-testing';

  beforeAll(() => {
    // Set JWT_SECRET for tests
    process.env.JWT_SECRET = testSecret;

    // Create a valid token
    validToken = jwt.sign(
      {
        userId: mockUserId,
        email: 'test@example.com',
        role: 'admin',
        companyId: mockCompanyId
      },
      testSecret,
      { expiresIn: '1h' }
    );

    // Create an expired token
    expiredToken = jwt.sign(
      {
        userId: mockUserId,
        email: 'test@example.com',
        role: 'admin',
        companyId: mockCompanyId
      },
      testSecret,
      { expiresIn: '-1h' } // Expired 1 hour ago
    );

    // Create an invalid token
    invalidToken = 'invalid.jwt.token.here';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    __clearCacheForTesting();

    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());

    // Setup default mock user
    const mockUser = {
      userId: mockUserId,
      email: 'test@example.com',
      role: 'admin',
      status: 'active',
      permissions: ['fundraising:read', 'fundraising:write'],
      companyId: mockCompanyId
    };

    // Mock User model methods AFTER clearAllMocks
    User.findOne = jest.fn().mockResolvedValue(mockUser);
    User.findByEmail = jest.fn().mockResolvedValue(mockUser);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  describe('Fundraising Analytics Routes Authentication', () => {
    beforeEach(() => {
      // Mount routes - THESE SHOULD HAVE AUTHENTICATION
      app.use('/api/v1/fundraising', fundraisingAnalyticsRoutes);
    });

    describe('GET /api/v1/fundraising/analytics/:companyId', () => {
      it('should return 401 when no token is provided', async () => {
        const response = await request(app)
          .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/token/i);
      });

      it('should return 401 when invalid token is provided', async () => {
        const response = await request(app)
          .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/invalid token/i);
      });

      it('should return 401 when expired token is provided', async () => {
        const response = await request(app)
          .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/expired/i);
      });

      it('should return 401 when malformed Authorization header is provided', async () => {
        const response = await request(app)
          .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
          .set('Authorization', validToken) // Missing "Bearer " prefix
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });

      it('should accept valid token and pass authentication', async () => {
        // This test should pass once authentication is added
        const response = await request(app)
          .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
          .set('Authorization', `Bearer ${validToken}`);

        // Should NOT be 401
        expect(response.status).not.toBe(401);
      });
    });

    describe('GET /api/v1/fundraising/metrics/:companyId', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get(`/api/v1/fundraising/metrics/${mockCompanyId}`)
          .expect(401);

        expect(response.body.message).toMatch(/token/i);
      });

      it('should accept valid token', async () => {
        const response = await request(app)
          .get(`/api/v1/fundraising/metrics/${mockCompanyId}`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(401);
      });
    });

    describe('GET /api/v1/fundraising/timeline/:companyId', () => {
      it('should require authentication', async () => {
        await request(app)
          .get(`/api/v1/fundraising/timeline/${mockCompanyId}`)
          .expect(401);
      });
    });

    describe('GET /api/v1/fundraising/investor-breakdown/:companyId', () => {
      it('should require authentication', async () => {
        await request(app)
          .get(`/api/v1/fundraising/investor-breakdown/${mockCompanyId}`)
          .expect(401);
      });
    });

    describe('GET /api/v1/fundraising/dilution-history/:companyId', () => {
      it('should require authentication', async () => {
        await request(app)
          .get(`/api/v1/fundraising/dilution-history/${mockCompanyId}`)
          .expect(401);
      });
    });

    describe('GET /api/v1/fundraising/benchmarks/:companyId', () => {
      it('should require authentication', async () => {
        await request(app)
          .get(`/api/v1/fundraising/benchmarks/${mockCompanyId}`)
          .expect(401);
      });
    });

    describe('GET /api/v1/fundraising/projections/:companyId', () => {
      it('should require authentication', async () => {
        await request(app)
          .get(`/api/v1/fundraising/projections/${mockCompanyId}`)
          .expect(401);
      });
    });
  });

  describe('Fundraising Round Routes Authentication', () => {
    beforeEach(() => {
      app.use('/api/v1/fundraising-rounds', fundraisingRoundRoutes);
    });

    describe('POST /api/v1/fundraising-rounds', () => {
      it('should require authentication for creating rounds', async () => {
        await request(app)
          .post('/api/v1/fundraising-rounds')
          .send({ name: 'Series A', targetAmount: 5000000 })
          .expect(401);
      });

      it('should accept valid token for creating rounds', async () => {
        const response = await request(app)
          .post('/api/v1/fundraising-rounds')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ name: 'Series A', targetAmount: 5000000 });

        expect(response.status).not.toBe(401);
      });
    });

    describe('GET /api/v1/fundraising-rounds', () => {
      it('should require authentication for listing rounds', async () => {
        await request(app)
          .get('/api/v1/fundraising-rounds')
          .expect(401);
      });
    });

    describe('GET /api/v1/fundraising-rounds/:id', () => {
      it('should require authentication for getting round details', async () => {
        await request(app)
          .get('/api/v1/fundraising-rounds/round-123')
          .expect(401);
      });
    });

    describe('PUT /api/v1/fundraising-rounds/:id', () => {
      it('should require authentication for updating rounds', async () => {
        await request(app)
          .put('/api/v1/fundraising-rounds/round-123')
          .send({ status: 'closed' })
          .expect(401);
      });
    });

    describe('DELETE /api/v1/fundraising-rounds/:id', () => {
      it('should require authentication for deleting rounds', async () => {
        await request(app)
          .delete('/api/v1/fundraising-rounds/round-123')
          .expect(401);
      });
    });
  });

  describe('Fundraise Model Routes Authentication', () => {
    beforeEach(() => {
      app.use('/api/v1/fundraise-models', fundraiseModelRoutes);
    });

    describe('GET /api/v1/fundraise-models', () => {
      it('should require authentication (already implemented)', async () => {
        await request(app)
          .get('/api/v1/fundraise-models')
          .expect(401);
      });

      it('should accept valid token (already implemented)', async () => {
        const response = await request(app)
          .get('/api/v1/fundraise-models')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).not.toBe(401);
      });
    });
  });

  describe('JWT Token Validation', () => {
    beforeEach(() => {
      app.use('/api/v1/fundraising', fundraisingAnalyticsRoutes);
    });

    it('should validate token signature', async () => {
      const tokenWithWrongSignature = jwt.sign(
        { userId: mockUserId, email: 'test@example.com', role: 'admin' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', `Bearer ${tokenWithWrongSignature}`)
        .expect(401);
    });

    it('should reject tokens without required claims', async () => {
      const tokenWithoutUserId = jwt.sign(
        { email: 'test@example.com' }, // Missing userId
        testSecret,
        { expiresIn: '1h' }
      );

      // Mock User.findOne to return null (user not found)
      User.findOne.mockResolvedValue(null);
      User.findByEmail.mockResolvedValue(null);

      await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', `Bearer ${tokenWithoutUserId}`)
        .expect(401);
    });

    it('should handle inactive user accounts', async () => {
      // Mock an inactive user
      User.findOne.mockResolvedValue({
        userId: mockUserId,
        email: 'test@example.com',
        role: 'admin',
        status: 'inactive', // Inactive status
        permissions: [],
        companyId: mockCompanyId
      });

      await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403); // Should be forbidden, not unauthorized
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      app.use('/api/v1/fundraising', fundraisingAnalyticsRoutes);
    });

    it('should return proper error message for missing token', async () => {
      const response = await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('No token provided');
    });

    it('should return proper error message for invalid token format', async () => {
      const response = await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);

      expect(response.body.message).toMatch(/invalid token/i);
    });

    it('should return proper error message for expired token', async () => {
      const response = await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.message).toMatch(/expired/i);
    });

    it('should handle database errors gracefully', async () => {
      User.findOne.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/authentication error/i);
    });
  });

  describe('Authorization Checks', () => {
    beforeEach(() => {
      app.use('/api/v1/fundraising', fundraisingAnalyticsRoutes);
    });

    it('should attach user information to request object', async () => {
      // Create a route that checks req.user
      app.get('/test-user', authenticate, (req, res) => {
        res.json({ user: req.user });
      });

      const response = await request(app)
        .get('/test-user')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.userId).toBe(mockUserId);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.role).toBe('admin');
    });

    it('should handle users with different roles', async () => {
      const userToken = jwt.sign(
        {
          userId: 'user-456',
          email: 'user@example.com',
          role: 'employee', // Regular user, not admin
          companyId: mockCompanyId
        },
        testSecret,
        { expiresIn: '1h' }
      );

      User.findOne.mockResolvedValue({
        userId: 'user-456',
        email: 'user@example.com',
        role: 'employee',
        status: 'active',
        permissions: ['fundraising:read'],
        companyId: mockCompanyId
      });

      const response = await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Should authenticate successfully
      expect(response.status).not.toBe(401);
    });
  });

  describe('Security Best Practices', () => {
    beforeEach(() => {
      app.use('/api/v1/fundraising', fundraisingAnalyticsRoutes);
    });

    it('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      // Should not expose internal details
      expect(response.body.message).not.toMatch(/secret/i);
      expect(response.body.message).not.toMatch(/database/i);
      expect(response.body).not.toHaveProperty('stack');
    });

    it('should handle missing Authorization header gracefully', async () => {
      const response = await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .expect(401);

      expect(response.body.message).toBe('No token provided');
    });

    it('should validate token before processing request', async () => {
      // Track if User.findOne was called
      User.findOne.mockClear();

      await request(app)
        .get(`/api/v1/fundraising/analytics/${mockCompanyId}`)
        .set('Authorization', 'Bearer invalid.token')
        .expect(401);

      // User lookup should not be called for invalid tokens
      // This ensures we fail fast on invalid tokens
      expect(User.findOne).not.toHaveBeenCalled();
    });
  });
});
