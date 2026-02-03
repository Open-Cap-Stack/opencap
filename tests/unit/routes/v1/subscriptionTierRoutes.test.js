/**
 * Subscription Tier Routes Test Suite
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Tests for the subscription tier API routes
 */

const express = require('express');
const request = require('supertest');

// Mock the controller and middleware
jest.mock('../../../../controllers/subscriptionTierController', () => ({
  getAllTiers: jest.fn((req, res) => res.status(200).json({ success: true, data: [] })),
  getTierByName: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  getTierFeatures: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  compareTiers: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  checkFeatureAccess: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  checkUsageLimit: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  getUpgradeOptions: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  getCompanyLimits: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  createTier: jest.fn((req, res) => res.status(201).json({ success: true, data: {} })),
  updateTier: jest.fn((req, res) => res.status(200).json({ success: true, data: {} })),
  deleteTier: jest.fn((req, res) => res.status(200).json({ success: true, message: 'Deleted' }))
}));

jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = { id: 'user-001', role: 'user' };
    next();
  }),
  requireAdmin: jest.fn((req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  })
}));

const subscriptionTierRoutes = require('../../../../routes/v1/subscriptionTierRoutes');
const subscriptionTierController = require('../../../../controllers/subscriptionTierController');
const { authenticateToken, requireAdmin } = require('../../../../middleware/authMiddleware');

describe('Subscription Tier Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/subscription-tiers', subscriptionTierRoutes);
  });

  describe('GET /api/v1/subscription-tiers', () => {
    it('should call getAllTiers controller', async () => {
      const response = await request(app)
        .get('/api/v1/subscription-tiers')
        .expect(200);

      expect(subscriptionTierController.getAllTiers).toHaveBeenCalled();
      expect(response.body.success).toBe(true);
    });

    it('should pass query parameters', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers?includePrivate=true')
        .expect(200);

      expect(subscriptionTierController.getAllTiers).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription-tiers/:name', () => {
    it('should call getTierByName controller with tier name', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers/professional')
        .expect(200);

      expect(subscriptionTierController.getTierByName).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription-tiers/:name/features', () => {
    it('should call getTierFeatures controller', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers/starter/features')
        .expect(200);

      expect(subscriptionTierController.getTierFeatures).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription-tiers/compare/:tier1/:tier2', () => {
    it('should call compareTiers controller', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers/compare/starter/professional')
        .expect(200);

      expect(subscriptionTierController.compareTiers).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription-tiers/company/:companyId/feature/:featureName', () => {
    it('should call checkFeatureAccess controller', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers/company/company-001/feature/apiAccess')
        .expect(200);

      expect(subscriptionTierController.checkFeatureAccess).toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      authenticateToken.mockImplementationOnce((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });

      await request(app)
        .get('/api/v1/subscription-tiers/company/company-001/feature/apiAccess')
        .expect(401);
    });
  });

  describe('GET /api/v1/subscription-tiers/company/:companyId/limit/:limitName', () => {
    it('should call checkUsageLimit controller', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers/company/company-001/limit/maxStakeholders?currentUsage=25')
        .expect(200);

      expect(subscriptionTierController.checkUsageLimit).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription-tiers/company/:companyId/upgrades', () => {
    it('should call getUpgradeOptions controller', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers/company/company-001/upgrades')
        .expect(200);

      expect(subscriptionTierController.getUpgradeOptions).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/subscription-tiers/company/:companyId/limits', () => {
    it('should call getCompanyLimits controller', async () => {
      await request(app)
        .get('/api/v1/subscription-tiers/company/company-001/limits')
        .expect(200);

      expect(subscriptionTierController.getCompanyLimits).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/subscription-tiers (Admin)', () => {
    beforeEach(() => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'admin-001', role: 'admin' };
        next();
      });
      requireAdmin.mockImplementation((req, res, next) => {
        if (req.user && req.user.role === 'admin') {
          next();
        } else {
          res.status(403).json({ error: 'Admin access required' });
        }
      });
    });

    it('should call createTier controller for admin users', async () => {
      const newTier = {
        tierId: 'tier-custom',
        name: 'custom',
        displayName: 'Custom Tier',
        monthlyPrice: 99
      };

      await request(app)
        .post('/api/v1/subscription-tiers')
        .send(newTier)
        .expect(201);

      expect(subscriptionTierController.createTier).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'user-001', role: 'user' };
        next();
      });

      await request(app)
        .post('/api/v1/subscription-tiers')
        .send({ name: 'custom' })
        .expect(403);
    });
  });

  describe('PUT /api/v1/subscription-tiers/:tierId (Admin)', () => {
    beforeEach(() => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'admin-001', role: 'admin' };
        next();
      });
      requireAdmin.mockImplementation((req, res, next) => {
        if (req.user && req.user.role === 'admin') {
          next();
        } else {
          res.status(403).json({ error: 'Admin access required' });
        }
      });
    });

    it('should call updateTier controller for admin users', async () => {
      await request(app)
        .put('/api/v1/subscription-tiers/tier-custom')
        .send({ monthlyPrice: 109 })
        .expect(200);

      expect(subscriptionTierController.updateTier).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'user-001', role: 'user' };
        next();
      });

      await request(app)
        .put('/api/v1/subscription-tiers/tier-custom')
        .send({ monthlyPrice: 109 })
        .expect(403);
    });
  });

  describe('DELETE /api/v1/subscription-tiers/:tierId (Admin)', () => {
    beforeEach(() => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'admin-001', role: 'admin' };
        next();
      });
      requireAdmin.mockImplementation((req, res, next) => {
        if (req.user && req.user.role === 'admin') {
          next();
        } else {
          res.status(403).json({ error: 'Admin access required' });
        }
      });
    });

    it('should call deleteTier controller for admin users', async () => {
      await request(app)
        .delete('/api/v1/subscription-tiers/tier-custom')
        .expect(200);

      expect(subscriptionTierController.deleteTier).toHaveBeenCalled();
    });

    it('should reject non-admin users', async () => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'user-001', role: 'user' };
        next();
      });

      await request(app)
        .delete('/api/v1/subscription-tiers/tier-custom')
        .expect(403);
    });
  });

  describe('Route Structure', () => {
    it('should have all required routes defined', () => {
      const routes = [];
      subscriptionTierRoutes.stack.forEach(layer => {
        if (layer.route) {
          routes.push({
            path: layer.route.path,
            methods: Object.keys(layer.route.methods)
          });
        }
      });

      // Check for essential routes
      expect(routes.some(r => r.path === '/' && r.methods.includes('get'))).toBe(true);
      expect(routes.some(r => r.path === '/' && r.methods.includes('post'))).toBe(true);
      expect(routes.some(r => r.path === '/:name' && r.methods.includes('get'))).toBe(true);
      expect(routes.some(r => r.path === '/:name/features' && r.methods.includes('get'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle controller errors gracefully', async () => {
      subscriptionTierController.getAllTiers.mockImplementation((req, res) => {
        res.status(500).json({ success: false, error: 'Internal server error' });
      });

      const response = await request(app)
        .get('/api/v1/subscription-tiers')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Validation', () => {
    it('should pass request body to controller', async () => {
      authenticateToken.mockImplementation((req, res, next) => {
        req.user = { id: 'admin-001', role: 'admin' };
        next();
      });
      requireAdmin.mockImplementation((req, res, next) => next());

      const requestBody = {
        tierId: 'tier-test',
        name: 'test',
        displayName: 'Test Tier',
        monthlyPrice: 50
      };

      subscriptionTierController.createTier.mockImplementation((req, res) => {
        expect(req.body).toEqual(requestBody);
        res.status(201).json({ success: true, data: requestBody });
      });

      await request(app)
        .post('/api/v1/subscription-tiers')
        .send(requestBody)
        .expect(201);
    });

    it('should pass URL parameters to controller', async () => {
      subscriptionTierController.getTierByName.mockImplementation((req, res) => {
        expect(req.params.name).toBe('enterprise');
        res.status(200).json({ success: true, data: { name: 'enterprise' } });
      });

      await request(app)
        .get('/api/v1/subscription-tiers/enterprise')
        .expect(200);
    });
  });
});
