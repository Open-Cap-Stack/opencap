/**
 * Valuation Routes Authentication Unit Tests
 * Issue #250: Fix 401 Unauthorized errors on Valuations page
 *
 * Tests authentication middleware configuration for valuation endpoints
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock axios to prevent real HTTP calls to AINative API during token fallback
const mockInterceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
jest.mock('axios', () => ({
  get: jest.fn().mockRejectedValue(new Error('Mock: AINative validation rejected')),
  post: jest.fn().mockRejectedValue(new Error('Mock: AINative validation rejected')),
  create: jest.fn(() => ({
    get: jest.fn().mockRejectedValue(new Error('Mock')),
    post: jest.fn().mockRejectedValue(new Error('Mock')),
    interceptors: mockInterceptors,
    defaults: { headers: { common: {} } }
  })),
  defaults: { headers: { common: {} } },
  interceptors: mockInterceptors
}));

// Mock the models before requiring routes
jest.mock('../../../models/Valuation409A');
jest.mock('../../../models/ValuationPartner');
jest.mock('../../../models/User');

const { authenticateToken } = require('../../../middleware/authMiddleware');
const User = require('../../../models/User');

describe('Valuation Routes Authentication Middleware', () => {
  let app;
  let validToken;
  let expiredToken;
  let invalidToken;

  beforeAll(() => {
    // Ensure JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-secret-key-for-testing';
    }

    // Generate test tokens
    validToken = jwt.sign(
      {
        userId: 'user_test123',
        email: 'test@example.com',
        role: 'admin',
        companyId: 'company_123'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    expiredToken = jwt.sign(
      {
        userId: 'user_test123',
        email: 'test@example.com',
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' }
    );

    invalidToken = 'invalid.token.string';
  });

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());

    // Clear all mocks
    jest.clearAllMocks();

    // Mock User.findOne to return a valid user
    User.findOne = jest.fn().mockResolvedValue({
      userId: 'user_test123',
      email: 'test@example.com',
      role: 'admin',
      status: 'active',
      permissions: ['read:valuations', 'write:valuations'],
      companyId: 'company_123'
    });
  });

  describe('409A Valuation Routes (/api/v1/valuations)', () => {
    beforeEach(() => {
      // Apply auth middleware to routes
      const router = express.Router();
      router.use(authenticateToken);

      router.get('/', (req, res) => {
        res.json({ success: true, user: req.user });
      });

      router.post('/', (req, res) => {
        res.status(201).json({ success: true, user: req.user });
      });

      router.get('/:valuationId', (req, res) => {
        res.json({ success: true, user: req.user, valuationId: req.params.valuationId });
      });

      app.use('/api/v1/valuations', router);
    });

    describe('GET /api/v1/valuations', () => {
      it('should return 401 when no Authorization header is provided', async () => {
        const response = await request(app)
          .get('/api/v1/valuations')
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/no token provided/i);
      });

      it('should return 401 when Authorization header does not start with "Bearer "', async () => {
        const response = await request(app)
          .get('/api/v1/valuations')
          .set('Authorization', validToken) // Missing 'Bearer ' prefix
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/no token provided/i);
      });

      it('should return 401 when token is invalid', async () => {
        const response = await request(app)
          .get('/api/v1/valuations')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/invalid token/i);
      });

      it('should return 401 when token is expired', async () => {
        const response = await request(app)
          .get('/api/v1/valuations')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toMatch(/token expired/i);
      });

      it('should successfully authenticate with valid token', async () => {
        const response = await request(app)
          .get('/api/v1/valuations')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('userId');
        expect(response.body.user).toHaveProperty('email');
      });

      it('should attach user data to request object', async () => {
        const response = await request(app)
          .get('/api/v1/valuations')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body.user).toMatchObject({
          userId: 'user_test123',
          email: 'test@example.com',
          role: 'admin'
        });
      });
    });

    describe('POST /api/v1/valuations', () => {
      const validPayload = {
        companyId: 'company_123',
        reason: 'annual_valuation'
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

      it('should successfully authenticate with valid token', async () => {
        const response = await request(app)
          .post('/api/v1/valuations')
          .set('Authorization', `Bearer ${validToken}`)
          .send(validPayload)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('user');
      });
    });

    describe('GET /api/v1/valuations/:valuationId', () => {
      it('should return 401 when no token is provided', async () => {
        const response = await request(app)
          .get('/api/v1/valuations/val_test123')
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });

      it('should successfully authenticate with valid token', async () => {
        const response = await request(app)
          .get('/api/v1/valuations/val_test123')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('valuationId', 'val_test123');
      });
    });
  });

  describe('Valuation Partner Routes (/api/v1/valuation-partners)', () => {
    beforeEach(() => {
      // Apply auth middleware to routes
      const router = express.Router();
      router.use(authenticateToken);

      router.get('/', (req, res) => {
        res.json({ success: true, user: req.user });
      });

      router.post('/', (req, res) => {
        res.status(201).json({ success: true, user: req.user });
      });

      router.get('/:partnerId', (req, res) => {
        res.json({ success: true, user: req.user, partnerId: req.params.partnerId });
      });

      app.use('/api/v1/valuation-partners', router);
    });

    describe('GET /api/v1/valuation-partners', () => {
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
      });

      it('should successfully authenticate with valid token', async () => {
        const response = await request(app)
          .get('/api/v1/valuation-partners')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('user');
      });
    });

    describe('POST /api/v1/valuation-partners', () => {
      const validPayload = {
        companyId: 'company_123',
        name: 'Test Valuation Firm',
        type: 'valuation_firm'
      };

      it('should return 401 when no token is provided', async () => {
        const response = await request(app)
          .post('/api/v1/valuation-partners')
          .send(validPayload)
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });

      it('should successfully authenticate with valid token', async () => {
        const response = await request(app)
          .post('/api/v1/valuation-partners')
          .set('Authorization', `Bearer ${validToken}`)
          .send(validPayload)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
      });
    });
  });

  describe('Inactive User Handling', () => {
    beforeEach(() => {
      // Mock inactive user
      User.findOne = jest.fn().mockResolvedValue({
        userId: 'user_inactive',
        email: 'inactive@example.com',
        role: 'user',
        status: 'inactive', // Inactive status
        permissions: [],
        companyId: 'company_123'
      });

      const router = express.Router();
      router.use(authenticateToken);
      router.get('/', (req, res) => {
        res.json({ success: true });
      });

      app.use('/api/v1/valuations', router);
    });

    it('should return 403 when user account is inactive', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/account is not active/i);
    });
  });

  describe('Token Blacklisting', () => {
    let router;

    beforeEach(() => {
      router = express.Router();
      router.use(authenticateToken);
      router.get('/', (req, res) => {
        res.json({ success: true });
      });

      app.use('/api/v1/valuations', router);
    });

    it('should return 401 when using a blacklisted token', async () => {
      // Blacklist the token
      const { blacklistToken } = require('../../../middleware/authMiddleware');
      await blacklistToken(validToken);

      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/token is invalidated/i);
    });
  });

  describe('Error Response Format', () => {
    beforeEach(() => {
      const router = express.Router();
      router.use(authenticateToken);
      router.get('/', (req, res) => {
        res.json({ success: true });
      });

      app.use('/api/v1/valuations', router);
    });

    it('should return consistent JSON error format', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .expect(401)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('should not expose sensitive information in error responses', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      // Should not include stack traces or internal details
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('config');
      expect(response.body).not.toHaveProperty('code');

      // Message should not expose JWT implementation details
      const message = response.body.message.toLowerCase();
      expect(message).not.toContain('secret');
      expect(message).not.toContain('verify');
      expect(message).not.toContain('jsonwebtoken');
    });
  });

  describe('Authorization Header Parsing', () => {
    beforeEach(() => {
      const router = express.Router();
      router.use(authenticateToken);
      router.get('/', (req, res) => {
        res.json({ success: true });
      });

      app.use('/api/v1/valuations', router);
    });

    it('should handle empty Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', '')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle Bearer with empty token', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle Bearer with whitespace token', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', 'Bearer    ')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('User Not Found Scenario', () => {
    let freshToken;

    beforeEach(() => {
      // Generate a fresh token that is not blacklisted
      freshToken = jwt.sign(
        {
          userId: 'user_not_found',
          email: 'notfound@example.com'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Mock user not found
      User.findOne = jest.fn().mockResolvedValue(null);

      const router = express.Router();
      router.use(authenticateToken);
      router.get('/', (req, res) => {
        res.json({ success: true });
      });

      app.use('/api/v1/valuations', router);
    });

    it('should return 401 when user is not found in database', async () => {
      const response = await request(app)
        .get('/api/v1/valuations')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/user not found/i);
    });
  });
});
