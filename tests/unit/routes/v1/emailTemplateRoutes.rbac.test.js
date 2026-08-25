/**
 * Email Template Routes RBAC Tests
 *
 * Issue #177: Verify role-based access control on email template endpoints.
 *
 * - GET / and GET /:id are open to all authenticated users.
 * - POST / and PUT /:id are restricted to admin, super_admin, founder.
 * - DELETE /:id is restricted to admin, super_admin.
 */

const request = require('supertest');
const express = require('express');

// Track the role that authenticateToken will inject for each request.
// Tests set this before each request to simulate different users.
let mockUserRole = 'admin';
let mockUserId = 'user-001';
let mockCompanyId = 'company-001';

jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      userId: mockUserId,
      companyId: mockCompanyId,
      role: mockUserRole,
    };
    next();
  },
}));

jest.mock('../../../../controllers/emailTemplateController', () => ({
  listTemplates: (req, res) => res.status(200).json([]),
  createTemplate: (req, res) => res.status(201).json({ id: 'new-1' }),
  getTemplate: (req, res) => res.status(200).json({ template: { id: req.params.id } }),
  updateTemplate: (req, res) => res.status(200).json({ template: { id: req.params.id } }),
  deleteTemplate: (req, res) => res.status(200).json({ message: 'deleted' }),
}));

const emailTemplateRoutes = require('../../../../routes/v1/emailTemplateRoutes');

describe('Email Template Routes - RBAC (Issue #177)', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/email-templates', emailTemplateRoutes);
  });

  beforeEach(() => {
    // Reset to a privileged role before each test
    mockUserRole = 'admin';
    mockUserId = 'user-001';
    mockCompanyId = 'company-001';
  });

  // ----------------------------------------------------------------
  // GET / — open to all authenticated users
  // ----------------------------------------------------------------
  describe('GET / (listTemplates)', () => {
    const allRoles = ['super_admin', 'admin', 'founder', 'manager', 'employee', 'investor', 'accountant', 'service_provider', 'client'];

    it.each(allRoles)('should allow %s to list templates', async (role) => {
      mockUserRole = role;

      const res = await request(app).get('/api/v1/email-templates');

      expect(res.status).toBe(200);
    });
  });

  // ----------------------------------------------------------------
  // GET /:id — open to all authenticated users
  // ----------------------------------------------------------------
  describe('GET /:id (getTemplate)', () => {
    const allRoles = ['super_admin', 'admin', 'founder', 'manager', 'employee', 'investor', 'accountant', 'service_provider', 'client'];

    it.each(allRoles)('should allow %s to get a template by ID', async (role) => {
      mockUserRole = role;

      const res = await request(app).get('/api/v1/email-templates/tpl-1');

      expect(res.status).toBe(200);
    });
  });

  // ----------------------------------------------------------------
  // POST / — restricted to admin, super_admin, founder
  // ----------------------------------------------------------------
  describe('POST / (createTemplate)', () => {
    const allowedRoles = ['super_admin', 'admin', 'founder'];
    const deniedRoles = ['manager', 'employee', 'investor', 'accountant', 'service_provider', 'client'];

    it.each(allowedRoles)('should allow %s to create a template', async (role) => {
      mockUserRole = role;

      const res = await request(app)
        .post('/api/v1/email-templates')
        .send({ name: 'Test', subject: 'Sub', body: 'Body' });

      expect(res.status).toBe(201);
    });

    it.each(deniedRoles)('should deny %s from creating a template (403)', async (role) => {
      mockUserRole = role;

      const res = await request(app)
        .post('/api/v1/email-templates')
        .send({ name: 'Test', subject: 'Sub', body: 'Body' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
  });

  // ----------------------------------------------------------------
  // PUT /:id — restricted to admin, super_admin, founder
  // ----------------------------------------------------------------
  describe('PUT /:id (updateTemplate)', () => {
    const allowedRoles = ['super_admin', 'admin', 'founder'];
    const deniedRoles = ['manager', 'employee', 'investor', 'accountant', 'service_provider', 'client'];

    it.each(allowedRoles)('should allow %s to update a template', async (role) => {
      mockUserRole = role;

      const res = await request(app)
        .put('/api/v1/email-templates/tpl-1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
    });

    it.each(deniedRoles)('should deny %s from updating a template (403)', async (role) => {
      mockUserRole = role;

      const res = await request(app)
        .put('/api/v1/email-templates/tpl-1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
  });

  // ----------------------------------------------------------------
  // DELETE /:id — restricted to admin, super_admin only
  // ----------------------------------------------------------------
  describe('DELETE /:id (deleteTemplate)', () => {
    const allowedRoles = ['super_admin', 'admin'];
    const deniedRoles = ['founder', 'manager', 'employee', 'investor', 'accountant', 'service_provider', 'client'];

    it.each(allowedRoles)('should allow %s to delete a template', async (role) => {
      mockUserRole = role;

      const res = await request(app).delete('/api/v1/email-templates/tpl-1');

      expect(res.status).toBe(200);
    });

    it.each(deniedRoles)('should deny %s from deleting a template (403)', async (role) => {
      mockUserRole = role;

      const res = await request(app).delete('/api/v1/email-templates/tpl-1');

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/access denied/i);
    });
  });
});
