/**
 * Middleware Ordering Tests
 * Issue #41: Middleware Test Suite
 *
 * Verifies that authenticateToken runs BEFORE verifyCompanyAccess.
 * This was a critical bug fix: verifyCompanyAccess was running before
 * authenticateToken, causing 401s because req.user was not yet set.
 *
 * The fix is in app.js where:
 *   1. authenticateToken is mounted first (line ~633)
 *   2. verifyCompanyAccess is mounted second (line ~641)
 *
 * These tests verify the correct ordering by:
 *   - Ensuring verifyCompanyAccess returns 401 when req.user is null
 *   - Ensuring authenticateToken sets req.user before company checks
 *   - Testing the full pipeline: auth -> company access -> handler
 */

const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');

jest.mock('../../../models/User');
jest.mock('../../../utils/mongoDbConnection');

const User = require('../../../models/User');
const { authenticateToken } = require('../../../middleware/authMiddleware');
const { verifyCompanyAccess } = require('../../../middleware/companyAuth');

const JWT_SECRET = 'ordering-test-secret';

describe('Middleware Ordering - authenticateToken before verifyCompanyAccess', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    // Enable MOCK_AUTH so authenticateToken accepts JWT claims without a DB user record
    process.env.MOCK_AUTH = 'true';
  });

  afterAll(() => {
    delete process.env.MOCK_AUTH;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne = jest.fn().mockResolvedValue(null);
    // Clear auth middleware user cache
    const authMiddleware = require('../../../middleware/authMiddleware');
    authMiddleware.__clearCacheForTesting();
  });

  it('verifyCompanyAccess returns 401 when called without prior authentication', () => {
    const req = {
      user: null,  // not set because authenticateToken has not run
      body: {},
      params: {},
      query: { companyId: 'comp-1' },
      method: 'GET'
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    verifyCompanyAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('authenticateToken sets req.user so subsequent verifyCompanyAccess works', async () => {
    const token = jwt.sign(
      {
        userId: 'user-order-1',
        email: 'order@test.com',
        role: 'founder',
        companyId: 'comp-order'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
      query: {},
      path: '/test',
      url: '/test',
      user: null,
      token: null,
      body: {},
      params: {},
      method: 'GET'
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next1 = jest.fn();
    const next2 = jest.fn();

    // Step 1: authenticateToken sets req.user
    await authenticateToken(req, res, next1);
    expect(next1).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('user-order-1');
    expect(req.user.companyId).toBe('comp-order');

    // Step 2: verifyCompanyAccess uses the already-set req.user
    verifyCompanyAccess()(req, res, next2);
    expect(next2).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('correct ordering: auth -> company access -> handler (integration)', async () => {
    const app = express();
    app.use(express.json());

    // Mount middleware in correct order (as done in app.js)
    app.use(authenticateToken);
    app.use(verifyCompanyAccess());

    app.get('/test', (req, res) => {
      res.json({
        userId: req.user.userId,
        companyId: req.user.companyId
      });
    });

    const token = jwt.sign(
      {
        userId: 'user-int-1',
        email: 'int@test.com',
        role: 'admin',
        companyId: 'comp-int'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe('user-int-1');
  });

  it('wrong ordering: company access first fails with 401', async () => {
    const app = express();
    app.use(express.json());

    // WRONG ORDER: company access before auth
    app.use(verifyCompanyAccess());
    app.use(authenticateToken);

    app.get('/test', (req, res) => {
      res.json({ success: true });
    });

    const token = jwt.sign(
      {
        userId: 'user-wrong-1',
        email: 'wrong@test.com',
        role: 'admin',
        companyId: 'comp-wrong'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    // Should fail because verifyCompanyAccess runs first, before req.user is set
    expect(response.status).toBe(401);
  });

  it('unauthenticated request fails at authenticateToken layer', async () => {
    const app = express();
    app.use(express.json());

    // Correct order
    app.use(authenticateToken);
    app.use(verifyCompanyAccess());

    app.get('/test', (req, res) => {
      res.json({ success: true });
    });

    const response = await request(app)
      .get('/test');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('No token provided');
  });

  it('admin bypasses company access check', async () => {
    const app = express();
    app.use(express.json());

    app.use(authenticateToken);
    app.use(verifyCompanyAccess());

    app.get('/test', (req, res) => {
      res.json({ success: true, role: req.user.role });
    });

    const token = jwt.sign(
      {
        userId: 'admin-bypass',
        email: 'admin@test.com',
        role: 'admin',
        companyId: 'comp-admin'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.role).toBe('admin');
  });

  it('non-admin user with matching company passes both middleware', async () => {
    const app = express();
    app.use(express.json());

    app.use(authenticateToken);
    app.use(verifyCompanyAccess());

    app.get('/test', (req, res) => {
      res.json({ success: true, companyId: req.user.companyId });
    });

    const token = jwt.sign(
      {
        userId: 'employee-1',
        email: 'emp@test.com',
        role: 'employee',
        companyId: 'comp-emp'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .get('/test')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.companyId).toBe('comp-emp');
  });
});
