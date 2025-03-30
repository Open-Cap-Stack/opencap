/**
 * Company Routes RBAC Tests
 * [Feature] OCAE-302: Implement role-based access control
 * [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
 */

const request = require('supertest');
const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasPermission } = require('../../middleware/rbacMiddleware');
const { generateAuthToken } = require('../utils/rbacTestUtils');
const { mockCompanyController } = require('../mocks/companyMocks');

// Create a test Express app for isolated testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Create company routes with RBAC applied
  const router = express.Router();
  
  // GET /api/companies - Get all companies
  router.get('/', 
    authenticateToken,
    hasPermission('read:companies'),
    mockCompanyController.getAllCompanies
  );
  
  // POST /api/companies - Create a new company
  router.post('/', 
    authenticateToken,
    hasPermission('write:companies'),
    mockCompanyController.createCompany
  );
  
  // PUT /api/companies/:id - Update company
  router.put('/:id', 
    authenticateToken,
    hasPermission('write:companies'),
    mockCompanyController.updateCompanyById
  );
  
  // DELETE /api/companies/:id - Delete company
  router.delete('/:id', 
    authenticateToken,
    hasPermission(['delete:companies', 'admin:all']),
    mockCompanyController.deleteCompanyById
  );
  
  // Apply router
  app.use('/api/companies', router);
  
  return app;
};

describe('Company Routes with RBAC', () => {
  let testApp;
  let adminToken, managerToken, userToken, clientToken;
  
  beforeAll(() => {
    // Create isolated test app
    testApp = createTestApp();
    
    // Generate tokens for different roles
    adminToken = generateAuthToken({ 
      userId: 'test-admin',
      email: 'admin@example.com',
      role: 'admin'
    });
    
    managerToken = generateAuthToken({ 
      userId: 'test-manager',
      email: 'manager@example.com',
      role: 'manager'
    });
    
    userToken = generateAuthToken({ 
      userId: 'test-user',
      email: 'user@example.com',
      role: 'user'
    });
    
    clientToken = generateAuthToken({ 
      userId: 'test-client',
      email: 'client@example.com',
      role: 'client'
    });
  });
  
  describe('GET /api/companies - Get all companies', () => {
    it('should allow admin users to access companies', async () => {
      const res = await request(testApp)
        .get('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should allow manager users to access companies', async () => {
      const res = await request(testApp)
        .get('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should allow regular users to access companies', async () => {
      const res = await request(testApp)
        .get('/api/companies')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should allow client users to access companies', async () => {
      const res = await request(testApp)
        .get('/api/companies')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should reject requests without authentication', async () => {
      const res = await request(testApp).get('/api/companies');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/companies - Create company', () => {
    const newCompany = {
      name: 'New Test Company',
      description: 'Created during RBAC testing',
      industry: 'Finance',
      foundedYear: 2021,
      website: 'https://new-example.com'
    };

    it('should allow admin users to create companies', async () => {
      const res = await request(testApp)
        .post('/api/companies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newCompany);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(newCompany.name);
    });

    it('should allow manager users to create companies', async () => {
      const res = await request(testApp)
        .post('/api/companies')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newCompany);

      expect(res.status).toBe(201);
      expect(res.body.name).toBe(newCompany.name);
    });

    it('should forbid regular users from creating companies', async () => {
      const res = await request(testApp)
        .post('/api/companies')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newCompany);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should forbid client users from creating companies', async () => {
      const res = await request(testApp)
        .post('/api/companies')
        .set('Authorization', `Bearer ${clientToken}`)
        .send(newCompany);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('PUT /api/companies/:id - Update company', () => {
    const updateData = {
      description: 'Updated during RBAC testing',
      industry: 'Updated Industry'
    };
    const companyId = '60d21b4667d0d8992e610c85'; // From our mock data

    it('should allow admin users to update companies', async () => {
      const res = await request(testApp)
        .put(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.description).toBe(updateData.description);
    });

    it('should allow manager users to update companies', async () => {
      const res = await request(testApp)
        .put(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.description).toBe(updateData.description);
    });

    it('should forbid regular users from updating companies', async () => {
      const res = await request(testApp)
        .put(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should forbid client users from updating companies', async () => {
      const res = await request(testApp)
        .put(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(updateData);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('DELETE /api/companies/:id - Delete company', () => {
    const companyId = '60d21b4667d0d8992e610c86'; // From our mock data

    it('should allow admin users to delete companies', async () => {
      const res = await request(testApp)
        .delete(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
    });

    it('should forbid manager users from deleting companies', async () => {
      const res = await request(testApp)
        .delete(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should forbid regular users from deleting companies', async () => {
      const res = await request(testApp)
        .delete(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });

    it('should forbid client users from deleting companies', async () => {
      const res = await request(testApp)
        .delete(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Access denied');
    });
  });
  
  describe('Custom permissions test', () => {
    it('should respect custom permissions in the token', async () => {
      // Create a token with explicit permissions regardless of role
      const customToken = generateAuthToken({
        userId: 'custom-user',
        email: 'custom@example.com',
        role: 'user', // User role normally can't delete
        permissions: ['delete:companies'] // But we give explicit permission
      });
      
      const companyId = '60d21b4667d0d8992e610c85';
      
      const res = await request(testApp)
        .delete(`/api/companies/${companyId}`)
        .set('Authorization', `Bearer ${customToken}`);
      
      // Should succeed because of explicit permission
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
    });
  });
});
