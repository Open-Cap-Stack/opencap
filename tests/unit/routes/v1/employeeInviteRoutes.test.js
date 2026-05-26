/**
 * Employee Invite Routes Tests
 *
 * Phase 3: Employee invite flow routes
 * Verifies middleware chain and handler wiring
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

jest.mock('../../../../controllers/employeeInviteController', () => ({
  inviteEmployee: jest.fn((req, res) => res.status(201).json({ success: true, inviteToken: 'tok', userId: 'u1' })),
  acceptInvite: jest.fn((req, res) => res.status(200).json({ token: 'jwt', user: {} })),
  listEmployees: jest.fn((req, res) => res.status(200).json([])),
  getEmployee: jest.fn((req, res) => res.status(200).json({ userId: req.params.userId }))
}));

const employeeInviteController = require('../../../../controllers/employeeInviteController');
const employeeInviteRoutes = require('../../../../routes/v1/employeeInviteRoutes');

describe('Employee Invite Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Set default admin user before the route middleware
    app.use((req, res, next) => {
      req.user = { userId: 'user_admin_001', role: 'admin', companyId: 'company_test' };
      next();
    });
    app.use('/api/v1/employees', employeeInviteRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/employees/invite', () => {
    it('should call inviteEmployee handler for admin user', async () => {
      const res = await request(app)
        .post('/api/v1/employees/invite')
        .send({ email: 'jane@acme.com', firstName: 'Jane', lastName: 'Doe' });

      expect(res.status).toBe(201);
      expect(employeeInviteController.inviteEmployee).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when user role is employee (not admin/founder/manager)', async () => {
      // Build a fresh app with employee role set before the route
      const restrictedApp = express();
      restrictedApp.use(express.json());
      restrictedApp.use((req, res, next) => {
        req.user = { userId: 'user_emp_001', role: 'employee', companyId: 'company_test' };
        next();
      });
      restrictedApp.use('/api/v1/employees', employeeInviteRoutes);

      const res = await request(restrictedApp)
        .post('/api/v1/employees/invite')
        .send({ email: 'new@acme.com', firstName: 'New', lastName: 'User' });

      // hasRole(['super_admin','admin','founder','manager']) excludes 'employee'
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/employees/accept-invite', () => {
    it('should call acceptInvite handler (public endpoint)', async () => {
      const res = await request(app)
        .post('/api/v1/employees/accept-invite')
        .send({ inviteToken: 'tok123', password: 'Secret123!' });

      expect(res.status).toBe(200);
      expect(employeeInviteController.acceptInvite).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/v1/employees', () => {
    it('should call listEmployees handler for admin user', async () => {
      const res = await request(app).get('/api/v1/employees');

      expect(res.status).toBe(200);
      expect(employeeInviteController.listEmployees).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /api/v1/employees/:userId', () => {
    it('should call getEmployee handler', async () => {
      const res = await request(app).get('/api/v1/employees/user_emp_001');

      expect(res.status).toBe(200);
      expect(employeeInviteController.getEmployee).toHaveBeenCalledTimes(1);
    });
  });
});
