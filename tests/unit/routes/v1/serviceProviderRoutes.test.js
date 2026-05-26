'use strict';

/**
 * Service Provider Routes Tests
 *
 * Phase 4: Service provider invite flow
 */

jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = req.headers['x-test-user']
      ? JSON.parse(req.headers['x-test-user'])
      : { userId: 'admin_1', role: 'admin', companyId: 'company_abc' };
    next();
  },
}));

jest.mock('../../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: Insufficient role permissions' });
    }
    next();
  },
}));

jest.mock('../../../../middleware/engagementScope', () => ({
  requireEngagementScope: () => (req, res, next) => next(),
}));

jest.mock('../../../../controllers/serviceProviderController', () => ({
  inviteServiceProvider: jest.fn((req, res) => res.status(201).json({ success: true, inviteToken: 'tok', userId: 'u-1' })),
  acceptServiceProviderInvite: jest.fn((req, res) => res.status(200).json({ token: 'jwt', user: {} })),
  listServiceProviders: jest.fn((req, res) => res.status(200).json([])),
  getServiceProvider: jest.fn((req, res) => res.status(200).json({ userId: req.params.userId })),
  updateServiceProviderScopes: jest.fn((req, res) => res.status(200).json({ success: true })),
  revokeServiceProvider: jest.fn((req, res) => res.status(200).json({ success: true })),
}));

const request = require('supertest');
const express = require('express');

const router = require('../../../../routes/v1/serviceProviderRoutes');
const controller = require('../../../../controllers/serviceProviderController');

const app = express();
app.use(express.json());
app.use('/api/v1/service-providers', router);

describe('Service Provider Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/service-providers/invite', () => {
    it('returns 201 for admin', async () => {
      const res = await request(app)
        .post('/api/v1/service-providers/invite')
        .set('x-test-user', JSON.stringify({ userId: 'admin_1', role: 'admin', companyId: 'c1' }))
        .send({ email: 'sp@firm.com', firstName: 'A', lastName: 'B', engagementType: 'legal', accessScopes: ['documents'] });

      expect(res.status).toBe(201);
      expect(controller.inviteServiceProvider).toHaveBeenCalled();
    });

    it('returns 403 for service_provider role', async () => {
      const res = await request(app)
        .post('/api/v1/service-providers/invite')
        .set('x-test-user', JSON.stringify({ userId: 'sp_1', role: 'service_provider', companyId: 'c1' }))
        .send({});

      expect(res.status).toBe(403);
    });

    it('returns 403 for employee role', async () => {
      const res = await request(app)
        .post('/api/v1/service-providers/invite')
        .set('x-test-user', JSON.stringify({ userId: 'emp_1', role: 'employee', companyId: 'c1' }))
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/service-providers/accept-invite', () => {
    it('returns 200 with no auth required', async () => {
      const res = await request(app)
        .post('/api/v1/service-providers/accept-invite')
        .send({ inviteToken: 'tok', password: 'pass' });

      expect(res.status).toBe(200);
      expect(controller.acceptServiceProviderInvite).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/service-providers', () => {
    it('returns 200 for admin', async () => {
      const res = await request(app)
        .get('/api/v1/service-providers')
        .set('x-test-user', JSON.stringify({ userId: 'admin_1', role: 'admin', companyId: 'c1' }));

      expect(res.status).toBe(200);
      expect(controller.listServiceProviders).toHaveBeenCalled();
    });

    it('returns 403 for employee role', async () => {
      const res = await request(app)
        .get('/api/v1/service-providers')
        .set('x-test-user', JSON.stringify({ userId: 'emp_1', role: 'employee', companyId: 'c1' }));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/service-providers/:userId', () => {
    it('returns 200 for admin', async () => {
      const res = await request(app)
        .get('/api/v1/service-providers/sp_user_1')
        .set('x-test-user', JSON.stringify({ userId: 'admin_1', role: 'admin', companyId: 'c1' }));

      expect(res.status).toBe(200);
      expect(controller.getServiceProvider).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/service-providers/:userId/scopes', () => {
    it('returns 200 for founder', async () => {
      const res = await request(app)
        .patch('/api/v1/service-providers/sp_user_1/scopes')
        .set('x-test-user', JSON.stringify({ userId: 'founder_1', role: 'founder', companyId: 'c1' }))
        .send({ accessScopes: ['documents'] });

      expect(res.status).toBe(200);
      expect(controller.updateServiceProviderScopes).toHaveBeenCalled();
    });

    it('returns 403 for manager role', async () => {
      const res = await request(app)
        .patch('/api/v1/service-providers/sp_user_1/scopes')
        .set('x-test-user', JSON.stringify({ userId: 'mgr_1', role: 'manager', companyId: 'c1' }))
        .send({ accessScopes: ['documents'] });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/service-providers/:userId', () => {
    it('returns 200 for admin', async () => {
      const res = await request(app)
        .delete('/api/v1/service-providers/sp_user_1')
        .set('x-test-user', JSON.stringify({ userId: 'admin_1', role: 'admin', companyId: 'c1' }));

      expect(res.status).toBe(200);
      expect(controller.revokeServiceProvider).toHaveBeenCalled();
    });

    it('returns 403 for employee role', async () => {
      const res = await request(app)
        .delete('/api/v1/service-providers/sp_user_1')
        .set('x-test-user', JSON.stringify({ userId: 'emp_1', role: 'employee', companyId: 'c1' }));

      expect(res.status).toBe(403);
    });
  });
});
