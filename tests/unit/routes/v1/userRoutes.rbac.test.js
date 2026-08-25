/**
 * User Routes RBAC Tests
 *
 * Verifies that role restrictions on user management endpoints are
 * correctly enforced per Issue #173:
 *   - DELETE /:id/hard  => super_admin only
 *   - POST /bulk-delete => admin, super_admin only
 *   - PUT  /:id         => admin, super_admin, founder only
 */

const request = require('supertest');
const express = require('express');

// We need a role-aware mock so we can exercise the actual role arrays
// declared in the route file.
let mockCurrentRole = 'admin';

jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticate: (req, res, next) => {
    req.user = { userId: 'user-1', role: mockCurrentRole, companyId: 'co-001' };
    next();
  },
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'user-1', role: mockCurrentRole, companyId: 'co-001' };
    next();
  }
}));

jest.mock('../../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'Access denied: Insufficient role permissions' });
  },
  hasPermission: () => (req, res, next) => next(),
  hasAgentCapability: () => (req, res, next) => next(),
  requireUserNotAgent: (req, res, next) => next()
}));

jest.mock('../../../../middleware/profilePhotoUpload', () => ({
  uploadSingle: (req, res, next) => next(),
  handleUploadError: (req, res, next) => next()
}));

jest.mock('../../../../controllers/userController', () => ({
  createUser: jest.fn((req, res) => res.status(201).json({ user: {} })),
  getAllUsers: jest.fn((req, res) => res.status(200).json({ users: [] })),
  getUserById: jest.fn((req, res) => res.status(200).json({ user: {} })),
  updateUserById: jest.fn((req, res) => res.status(200).json({ user: {} })),
  deleteUserById: jest.fn((req, res) => res.status(200).json({ message: 'deleted' })),
  hardDeleteUserById: jest.fn((req, res) => res.status(200).json({ message: 'hard deleted' })),
  bulkDeleteUsers: jest.fn((req, res) => res.status(200).json({ deleted: [] })),
  getProfile: jest.fn((req, res) => res.status(200).json({ profile: {} })),
  uploadProfilePhoto: jest.fn((req, res) => res.status(200).json({ success: true })),
  deleteProfilePhoto: jest.fn((req, res) => res.status(200).json({ success: true })),
  BULK_DELETE_MAX: 10
}));

jest.mock('../../../../controllers/settingsController', () => ({
  getUserSettings: jest.fn((req, res) => res.status(200).json({})),
  updateUserSettings: jest.fn((req, res) => res.status(200).json({})),
  getCompanySettings: jest.fn((req, res) => res.status(200).json({})),
  updateCompanySettings: jest.fn((req, res) => res.status(200).json({})),
  resetUserSettings: jest.fn((req, res) => res.status(200).json({})),
  resetCompanySettings: jest.fn((req, res) => res.status(200).json({}))
}));

const userRoutes = require('../../../../routes/v1/userRoutes');

const ALL_ROLES = [
  'super_admin', 'admin', 'founder', 'accountant',
  'manager', 'service_provider', 'investor', 'employee', 'client'
];

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/users', userRoutes);
  return app;
}

describe('User Routes RBAC (Issue #173)', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------
  // DELETE /:id/hard — super_admin only
  // ---------------------------------------------------------------
  describe('DELETE /api/v1/users/:id/hard', () => {
    const allowedRoles = ['super_admin'];
    const deniedRoles = ALL_ROLES.filter(r => !allowedRoles.includes(r));

    it.each(allowedRoles)('should allow %s', async (role) => {
      mockCurrentRole = role;
      const res = await request(app).delete('/api/v1/users/user-99/hard');
      expect(res.status).toBe(200);
    });

    it.each(deniedRoles)('should deny %s with 403', async (role) => {
      mockCurrentRole = role;
      const res = await request(app).delete('/api/v1/users/user-99/hard');
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // POST /bulk-delete — admin, super_admin only
  // ---------------------------------------------------------------
  describe('POST /api/v1/users/bulk-delete', () => {
    const allowedRoles = ['admin', 'super_admin'];
    const deniedRoles = ALL_ROLES.filter(r => !allowedRoles.includes(r));

    it.each(allowedRoles)('should allow %s', async (role) => {
      mockCurrentRole = role;
      const res = await request(app)
        .post('/api/v1/users/bulk-delete')
        .send({ userIds: ['u1'], confirm: true });
      expect(res.status).toBe(200);
    });

    it.each(deniedRoles)('should deny %s with 403', async (role) => {
      mockCurrentRole = role;
      const res = await request(app)
        .post('/api/v1/users/bulk-delete')
        .send({ userIds: ['u1'], confirm: true });
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // PUT /:id — admin, super_admin, founder only
  // ---------------------------------------------------------------
  describe('PUT /api/v1/users/:id', () => {
    const allowedRoles = ['admin', 'super_admin', 'founder'];
    const deniedRoles = ALL_ROLES.filter(r => !allowedRoles.includes(r));

    it.each(allowedRoles)('should allow %s', async (role) => {
      mockCurrentRole = role;
      const res = await request(app)
        .put('/api/v1/users/user-99')
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
    });

    it.each(deniedRoles)('should deny %s with 403', async (role) => {
      mockCurrentRole = role;
      const res = await request(app)
        .put('/api/v1/users/user-99')
        .send({ name: 'Updated' });
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------
  // DELETE /:id (soft-delete) — admin, super_admin, founder
  // (already restricted in prior fix; included for completeness)
  // ---------------------------------------------------------------
  describe('DELETE /api/v1/users/:id (soft-delete)', () => {
    const allowedRoles = ['admin', 'super_admin', 'founder'];
    const deniedRoles = ALL_ROLES.filter(r => !allowedRoles.includes(r));

    it.each(allowedRoles)('should allow %s', async (role) => {
      mockCurrentRole = role;
      const res = await request(app).delete('/api/v1/users/user-99');
      expect(res.status).toBe(200);
    });

    it.each(deniedRoles)('should deny %s with 403', async (role) => {
      mockCurrentRole = role;
      const res = await request(app).delete('/api/v1/users/user-99');
      expect(res.status).toBe(403);
    });
  });
});
