'use strict';

/**
 * Tests for readinessController
 * Issue #651: Investor readiness score API + lead magnet
 */

const request = require('supertest');
const express = require('express');

// Mock auth middleware
jest.mock('../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'user-1', role: 'founder', companyId: 'company-1' };
    } else if (req.headers.authorization === 'Bearer admin-token') {
      req.user = { id: 'user-2', role: 'admin', companyId: 'company-1' };
    } else if (req.headers.authorization === 'Bearer employee-token') {
      req.user = { id: 'user-3', role: 'employee', companyId: 'company-1' };
    }
    next();
  },
  optionalAuth: (req, res, next) => {
    if (req.headers.authorization === 'Bearer valid-token') {
      req.user = { id: 'user-1', role: 'founder', companyId: 'company-1' };
    }
    next();
  },
}));

// Mock rbacMiddleware
jest.mock('../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: 'Access denied: Insufficient role permissions' });
  },
  hasPermission: () => (req, res, next) => next(),
}));

// Mock ZeroDB service
jest.mock('../../../services/zerodbService', () => ({
  query: jest.fn().mockResolvedValue({ results: [] }),
}));

// Mock the database adapter for company data fetching
jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn().mockResolvedValue([]),
}));

const { createReadinessRouter } = require('../../../routes/v1/readinessRoutes');

function createApp() {
  // Use the factory to get a fresh router with its own rate limiter store
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/v1/readiness', createReadinessRouter());
  return app;
}

describe('readinessController', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('POST /api/v1/readiness/score (public)', () => {
    it('should return a score for provided documents', async () => {
      const res = await request(app)
        .post('/api/v1/readiness/score')
        .send({
          documents: [
            { name: 'cap_table.xlsx', textContent: 'Share classes and equity grants listed.' },
            { name: 'certificate_of_incorporation.pdf', textContent: 'Delaware COI for Acme Inc.' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.score).toBeDefined();
      expect(typeof res.body.score).toBe('number');
      expect(res.body.score).toBeGreaterThan(0);
      expect(res.body.criticalGaps).toBeDefined();
      expect(res.body.criticalGaps.length).toBeLessThanOrEqual(3);
      expect(res.body.upgradePrompt).toBeDefined();
      // Public endpoint should NOT include allGaps
      expect(res.body.allGaps).toBeUndefined();
    });

    it('should return 0 for empty documents', async () => {
      const res = await request(app)
        .post('/api/v1/readiness/score')
        .send({ documents: [] });

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(0);
    });

    it('should return 400 if documents field is missing', async () => {
      const res = await request(app)
        .post('/api/v1/readiness/score')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('should rate limit after 3 requests per day', async () => {
      // Create a completely fresh app so no prior requests count
      const freshApp = createApp();

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        const res = await request(freshApp)
          .post('/api/v1/readiness/score')
          .send({ documents: [] });
        expect(res.status).toBe(200);
      }

      // 4th request should be rate limited
      const res = await request(freshApp)
        .post('/api/v1/readiness/score')
        .send({ documents: [] });
      expect(res.status).toBe(429);
    });
  });

  describe('POST /api/v1/readiness/score/full (authenticated)', () => {
    it('should return full gap list for authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/readiness/score/full')
        .set('Authorization', 'Bearer valid-token')
        .send({
          documents: [
            { name: 'cap_table.xlsx', textContent: 'Share classes listed.' },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.score).toBeDefined();
      expect(res.body.allGaps).toBeDefined();
      expect(res.body.topRecommendations).toBeDefined();
      expect(res.body.breakdown).toBeDefined();
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/readiness/score/full')
        .send({ documents: [] });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/readiness/score/:companyId (admin/founder)', () => {
    it('should return score for admin user', async () => {
      const zerodbService = require('../../../services/zerodbService');
      zerodbService.query.mockResolvedValueOnce({
        results: [
          { documentType: 'certificate_of_incorporation', name: 'COI.pdf' },
        ],
      });
      // share classes query
      zerodbService.query.mockResolvedValueOnce({
        results: [{ name: 'Common' }],
      });
      // equity grants query
      zerodbService.query.mockResolvedValueOnce({
        results: [],
      });
      // safes query
      zerodbService.query.mockResolvedValueOnce({
        results: [],
      });

      const res = await request(app)
        .get('/api/v1/readiness/score/company-1')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.score).toBeDefined();
      expect(res.body.breakdown).toBeDefined();
      expect(res.body.allGaps).toBeDefined();
    });

    it('should return score for founder user', async () => {
      const zerodbService = require('../../../services/zerodbService');
      zerodbService.query.mockResolvedValueOnce({ results: [] });
      zerodbService.query.mockResolvedValueOnce({ results: [] });
      zerodbService.query.mockResolvedValueOnce({ results: [] });
      zerodbService.query.mockResolvedValueOnce({ results: [] });

      const res = await request(app)
        .get('/api/v1/readiness/score/company-1')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.score).toBe(0);
    });

    it('should return 403 for employee user', async () => {
      const res = await request(app)
        .get('/api/v1/readiness/score/company-1')
        .set('Authorization', 'Bearer employee-token');

      expect(res.status).toBe(403);
    });

    it('should return 401 for unauthenticated request', async () => {
      const res = await request(app)
        .get('/api/v1/readiness/score/company-1');

      expect(res.status).toBe(401);
    });
  });
});
