/**
 * Employee Self-Service Routes Tests
 *
 * Phase 3: Employee self-service equity API routes
 * Verifies /me/* endpoint middleware chain and handler wiring
 */

const express = require('express');
const request = require('supertest');

// Mock middleware before requiring routes.
// authenticateToken passes through — tests set req.user directly via app.use before the route.
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => next()
}));

jest.mock('../../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'Access denied: Insufficient role permissions' });
  }
}));

jest.mock('../../../../controllers/employeeSelfServiceController', () => ({
  getMyEquity: jest.fn((req, res) => res.status(200).json([])),
  getMyDocuments: jest.fn((req, res) => res.status(200).json([])),
  getMyValuation: jest.fn((req, res) => res.status(200).json({ pricePerShare: 10, valuationDate: '2026-01-01', totalShares: 100000, employeeShareValue: 2500 })),
  getMyProfile: jest.fn((req, res) => res.status(200).json({ userId: 'user_emp_001', firstName: 'Jane' }))
}));

const employeeSelfServiceController = require('../../../../controllers/employeeSelfServiceController');
const employeeSelfServiceRoutes = require('../../../../routes/v1/employeeSelfServiceRoutes');

describe('Employee Self-Service Routes (/me/*)', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Default employee user set before the route middleware
    app.use((req, res, next) => {
      req.user = { userId: 'user_emp_001', role: 'employee', companyId: 'company_test' };
      next();
    });
    app.use('/api/v1/me', employeeSelfServiceRoutes);
    jest.clearAllMocks();
  });

  describe('GET /api/v1/me/equity', () => {
    it('should call getMyEquity handler for employee', async () => {
      const res = await request(app).get('/api/v1/me/equity');

      expect(res.status).toBe(200);
      expect(employeeSelfServiceController.getMyEquity).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for roles outside the allowed set', async () => {
      // Build a fresh app with investor role (investor is not in SELF_SERVICE_ROLES)
      const restrictedApp = express();
      restrictedApp.use(express.json());
      restrictedApp.use((req, res, next) => {
        req.user = { userId: 'user_investor_001', role: 'investor', companyId: 'company_test' };
        next();
      });
      restrictedApp.use('/api/v1/me', employeeSelfServiceRoutes);

      const res = await request(restrictedApp).get('/api/v1/me/equity');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/me/documents', () => {
    it('should call getMyDocuments handler for employee', async () => {
      const res = await request(app).get('/api/v1/me/documents');

      expect(res.status).toBe(200);
      expect(employeeSelfServiceController.getMyDocuments).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/v1/me/valuation', () => {
    it('should call getMyValuation handler for employee', async () => {
      const res = await request(app).get('/api/v1/me/valuation');

      expect(res.status).toBe(200);
      expect(employeeSelfServiceController.getMyValuation).toHaveBeenCalledTimes(1);
    });

    it('should be accessible to admin users (preview employee view)', async () => {
      const adminApp = express();
      adminApp.use(express.json());
      adminApp.use((req, res, next) => {
        req.user = { userId: 'user_admin_001', role: 'admin', companyId: 'company_test' };
        next();
      });
      adminApp.use('/api/v1/me', employeeSelfServiceRoutes);

      const res = await request(adminApp).get('/api/v1/me/valuation');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/me/profile', () => {
    it('should call getMyProfile handler for employee', async () => {
      const res = await request(app).get('/api/v1/me/profile');

      expect(res.status).toBe(200);
      expect(employeeSelfServiceController.getMyProfile).toHaveBeenCalledTimes(1);
    });

    it('should be accessible to founder (preview employee view)', async () => {
      const founderApp = express();
      founderApp.use(express.json());
      founderApp.use((req, res, next) => {
        req.user = { userId: 'user_founder_001', role: 'founder', companyId: 'company_test' };
        next();
      });
      founderApp.use('/api/v1/me', employeeSelfServiceRoutes);

      const res = await request(founderApp).get('/api/v1/me/profile');

      expect(res.status).toBe(200);
    });
  });
});
