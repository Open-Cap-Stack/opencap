/**
 * Integration Tests: Company Routes Auth/RBAC
 *
 * Verifies that all company CRUD endpoints enforce authentication
 * and role-based access control correctly.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../setup/app');

// Mock ZeroDB service to avoid real DB calls
jest.mock('../../services/zerodbService', () => ({
  insertRow: jest.fn().mockResolvedValue({ rows: [{ _id: 'mock-id' }] }),
  queryTable: jest.fn().mockResolvedValue([{ _id: 'mock-id', companyId: 'COMP-001', CompanyName: 'Test' }]),
  updateRows: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  deleteRows: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  initialize: jest.fn(),
  projectId: 'test-project'
}));

// Mock User model to avoid DB lookups during auth
jest.mock('../../models/User', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null),
  find: jest.fn().mockResolvedValue([])
}));

describe('Company Routes - Auth/RBAC Integration', () => {
  let app;
  const JWT_SECRET = 'test-jwt-secret-for-company-auth';

  const makeToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  };

  const adminToken = () => makeToken({
    id: 'user-admin',
    email: 'admin@test.com',
    role: 'admin',
    permissions: ['admin:all']
  });

  const managerToken = () => makeToken({
    id: 'user-manager',
    email: 'manager@test.com',
    role: 'manager',
    permissions: []
  });

  const readOnlyToken = () => makeToken({
    id: 'user-readonly',
    email: 'reader@test.com',
    role: 'user',
    permissions: []
  });

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.NODE_ENV = 'test';
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('No Token (401)', () => {
    const endpoints = [
      { method: 'get', path: '/api/v1/companies' },
      { method: 'get', path: '/api/v1/companies/mock-id' },
      { method: 'post', path: '/api/v1/companies' },
      { method: 'put', path: '/api/v1/companies/mock-id' },
      { method: 'delete', path: '/api/v1/companies/mock-id' }
    ];

    endpoints.forEach(({ method, path }) => {
      it(`${method.toUpperCase()} ${path} should return 401 without token`, async () => {
        const res = await request(app)[method](path)
          .send({ companyId: 'X', CompanyName: 'X', CompanyType: 'startup', RegisteredAddress: 'X', TaxID: 'X', corporationDate: '2024-01-01' });

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Invalid Token (401)', () => {
    it('GET /api/v1/companies should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 'user-1', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
    });

    it('GET /api/v1/companies should reject malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', 'Bearer not-a-real-token');

      expect(res.status).toBe(401);
    });
  });

  describe('Read-only user (role: user)', () => {
    it('GET /api/v1/companies should succeed (has read:companies)', async () => {
      const res = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${readOnlyToken()}`);

      // Should not be 401 or 403
      expect([200, 404]).toContain(res.status);
    });

    it('GET /api/v1/companies/:id should succeed (has read:companies)', async () => {
      const res = await request(app)
        .get('/api/v1/companies/mock-id')
        .set('Authorization', `Bearer ${readOnlyToken()}`);

      expect([200, 404]).toContain(res.status);
    });

    it('POST /api/v1/companies should be denied (no write:companies)', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${readOnlyToken()}`)
        .send({
          companyId: 'COMP-001',
          CompanyName: 'Test Corp',
          CompanyType: 'startup',
          RegisteredAddress: '123 Main St',
          TaxID: '12-3456789',
          corporationDate: '2024-01-01'
        });

      expect(res.status).toBe(403);
    });

    it('PUT /api/v1/companies/:id should be denied (no write:companies)', async () => {
      const res = await request(app)
        .put('/api/v1/companies/mock-id')
        .set('Authorization', `Bearer ${readOnlyToken()}`)
        .send({ CompanyName: 'Updated' });

      expect(res.status).toBe(403);
    });

    it('DELETE /api/v1/companies/:id should be denied (no delete:companies)', async () => {
      const res = await request(app)
        .delete('/api/v1/companies/mock-id')
        .set('Authorization', `Bearer ${readOnlyToken()}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Manager (role: manager)', () => {
    it('GET /api/v1/companies should succeed', async () => {
      const res = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${managerToken()}`);

      expect([200, 404]).toContain(res.status);
    });

    it('POST /api/v1/companies should succeed (has write:companies)', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${managerToken()}`)
        .send({
          companyId: 'COMP-001',
          CompanyName: 'Manager Corp',
          CompanyType: 'startup',
          RegisteredAddress: '123 Main St',
          TaxID: '12-3456789',
          corporationDate: '2024-01-01'
        });

      // Manager has write:companies, so should get 201 or at least not 403
      expect(res.status).not.toBe(403);
    });

    it('PUT /api/v1/companies/:id should succeed (has write:companies)', async () => {
      const res = await request(app)
        .put('/api/v1/companies/mock-id')
        .set('Authorization', `Bearer ${managerToken()}`)
        .send({ CompanyName: 'Updated by Manager' });

      expect(res.status).not.toBe(403);
    });

    it('DELETE /api/v1/companies/:id should be denied (no delete:companies)', async () => {
      const res = await request(app)
        .delete('/api/v1/companies/mock-id')
        .set('Authorization', `Bearer ${managerToken()}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Admin (role: admin)', () => {
    it('GET /api/v1/companies should succeed', async () => {
      const res = await request(app)
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect([200, 404]).toContain(res.status);
    });

    it('POST /api/v1/companies should succeed', async () => {
      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({
          companyId: 'COMP-ADMIN',
          CompanyName: 'Admin Corp',
          CompanyType: 'corporation',
          RegisteredAddress: '456 Admin Blvd',
          TaxID: '98-7654321',
          corporationDate: '2024-01-01'
        });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('PUT /api/v1/companies/:id should succeed', async () => {
      const res = await request(app)
        .put('/api/v1/companies/mock-id')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ CompanyName: 'Updated by Admin' });

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it('DELETE /api/v1/companies/:id should succeed (has admin:all)', async () => {
      const res = await request(app)
        .delete('/api/v1/companies/mock-id')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  describe('Permission Matrix Summary', () => {
    it('should enforce correct permission for each route', async () => {
      // This test verifies the route->permission mapping in companyRoutes.js
      // POST/PUT require write:companies
      // GET requires read:companies
      // DELETE requires delete:companies or admin:all

      const routes = [
        { method: 'get',    path: '/api/v1/companies',         perm: 'read:companies' },
        { method: 'get',    path: '/api/v1/companies/mock-id', perm: 'read:companies' },
        { method: 'post',   path: '/api/v1/companies',         perm: 'write:companies' },
        { method: 'put',    path: '/api/v1/companies/mock-id', perm: 'write:companies' },
        { method: 'delete', path: '/api/v1/companies/mock-id', perm: 'delete:companies or admin:all' }
      ];

      // Verify read-only user can access GET routes
      for (const route of routes.filter(r => r.perm === 'read:companies')) {
        const res = await request(app)[route.method](route.path)
          .set('Authorization', `Bearer ${readOnlyToken()}`);
        expect(res.status).not.toBe(403);
      }

      // Verify read-only user cannot access write routes
      for (const route of routes.filter(r => r.perm.startsWith('write') || r.perm.startsWith('delete'))) {
        const res = await request(app)[route.method](route.path)
          .set('Authorization', `Bearer ${readOnlyToken()}`)
          .send({ companyId: 'X', CompanyName: 'X', CompanyType: 'startup', RegisteredAddress: 'X', TaxID: 'X', corporationDate: '2024-01-01' });
        expect(res.status).toBe(403);
      }
    });
  });
});
