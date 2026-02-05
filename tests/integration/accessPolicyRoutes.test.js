/**
 * Access Policy Routes Integration Tests
 *
 * Integration tests for access policy API endpoints
 * Issue #247: Implement Access Policies Endpoints
 *
 * Tests:
 * - Authentication enforcement
 * - Complete CRUD workflow
 * - Template endpoint
 * - Error handling
 */

const request = require('supertest');
const app = require('../../app');
const jwt = require('jsonwebtoken');
const zerodbService = require('../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../services/zerodbService');

// Mock User model
jest.mock('../../models/User', () => {
  const mockUser = {
    userId: 'test-user-123',
    email: 'test@opencap.com',
    firstName: 'Test',
    lastName: 'User',
    displayName: 'Test User',
    role: 'admin',
    status: 'active',
    permissions: ['read', 'write', 'delete', 'admin:all'],
    companyId: 'company-123'
  };

  return {
    findOne: jest.fn().mockResolvedValue(mockUser),
    findByEmail: jest.fn().mockResolvedValue(mockUser),
    create: jest.fn().mockResolvedValue(mockUser),
    updateLastLogin: jest.fn().mockResolvedValue(true),
    getPermissionsForRole: jest.fn((role) => {
      const permissions = {
        admin: ['read', 'write', 'delete', 'admin:all'],
        user: ['read']
      };
      return permissions[role] || [];
    })
  };
});

describe('Access Policy Routes Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(() => {
    // Create test user and auth token
    testUser = {
      userId: 'test-user-123',
      email: 'test@opencap.com',
      role: 'admin',
      companyId: 'company-123',
      permissions: ['read', 'write', 'delete']
    };

    authToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret', {
      expiresIn: '1h'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset ZeroDB service mock
    zerodbService.insertRow = jest.fn();
    zerodbService.queryTable = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
  });

  describe('Given authentication requirements', () => {
    describe('When accessing endpoints without token', () => {
      it('Then GET /api/v1/access-policies should return 401', async () => {
        const response = await request(app)
          .get('/api/v1/access-policies')
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });

      it('Then POST /api/v1/access-policies should return 401', async () => {
        const response = await request(app)
          .post('/api/v1/access-policies')
          .send({ name: 'Test Policy' })
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });

      it('Then GET /api/v1/access-policies/templates should return 401', async () => {
        const response = await request(app)
          .get('/api/v1/access-policies/templates')
          .expect(401);

        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('Given a complete CRUD workflow', () => {
    let createdPolicyId;

    it('Should create a new access policy', async () => {
      const policyData = {
        name: 'Document Read Access',
        description: 'Allows read access to documents',
        resourceType: 'document',
        actions: ['read', 'download'],
        conditions: {
          roleRequired: 'investor'
        },
        status: 'active'
      };

      const mockCreatedPolicy = {
        row_id: 'row-001',
        row_data: {
          policyId: 'POL-ABC123',
          ...policyData,
          createdBy: testUser.userId,
          companyId: testUser.companyId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [mockCreatedPolicy]
      });

      const response = await request(app)
        .post('/api/v1/access-policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(policyData)
        .expect(201);

      expect(response.body).toHaveProperty('policyId');
      expect(response.body.name).toBe(policyData.name);
      expect(response.body.resourceType).toBe(policyData.resourceType);
      expect(response.body.actions).toEqual(policyData.actions);

      createdPolicyId = response.body.policyId;
    });

    it('Should list all access policies', async () => {
      const mockPolicies = [
        {
          row_id: 'row-001',
          row_data: {
            policyId: 'POL-ABC123',
            name: 'Document Read Access',
            resourceType: 'document',
            actions: ['read'],
            companyId: testUser.companyId
          }
        },
        {
          row_id: 'row-002',
          row_data: {
            policyId: 'POL-DEF456',
            name: 'Share Class Management',
            resourceType: 'share_class',
            actions: ['read', 'write'],
            companyId: testUser.companyId
          }
        }
      ];

      zerodbService.queryTable.mockResolvedValue({
        data: mockPolicies
      });

      const response = await request(app)
        .get('/api/v1/access-policies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('policyId');
      expect(response.body[1]).toHaveProperty('policyId');
    });

    it('Should get a specific access policy by ID', async () => {
      const mockPolicy = {
        row_id: 'row-001',
        row_data: {
          policyId: 'POL-ABC123',
          name: 'Document Read Access',
          resourceType: 'document',
          actions: ['read', 'download']
        }
      };

      zerodbService.queryTable.mockResolvedValue({
        data: [mockPolicy]
      });

      const response = await request(app)
        .get('/api/v1/access-policies/POL-ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('policyId', 'POL-ABC123');
      expect(response.body.name).toBe('Document Read Access');
    });

    it('Should update an existing access policy', async () => {
      const updateData = {
        name: 'Updated Document Access',
        actions: ['read', 'write', 'download']
      };

      zerodbService.updateRows.mockResolvedValue({
        modified_count: 1
      });

      const mockUpdatedPolicy = {
        row_id: 'row-001',
        row_data: {
          policyId: 'POL-ABC123',
          name: updateData.name,
          actions: updateData.actions,
          resourceType: 'document',
          updatedAt: new Date().toISOString()
        }
      };

      zerodbService.queryTable.mockResolvedValue({
        data: [mockUpdatedPolicy]
      });

      const response = await request(app)
        .put('/api/v1/access-policies/POL-ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.actions).toEqual(updateData.actions);
    });

    it('Should delete an access policy', async () => {
      zerodbService.deleteRows.mockResolvedValue({
        deleted_count: 1
      });

      const response = await request(app)
        .delete('/api/v1/access-policies/POL-ABC123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('deleted successfully');
    });
  });

  describe('Given the templates endpoint', () => {
    it('Should return policy templates', async () => {
      const response = await request(app)
        .get('/api/v1/access-policies/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);

      const template = response.body.templates[0];
      expect(template).toHaveProperty('id');
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('resourceType');
      expect(template).toHaveProperty('actions');
      expect(Array.isArray(template.actions)).toBe(true);
    });

    it('Should include templates for various resource types', async () => {
      const response = await request(app)
        .get('/api/v1/access-policies/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const resourceTypes = new Set(
        response.body.templates.map(t => t.resourceType)
      );

      expect(resourceTypes.has('document')).toBe(true);
      expect(resourceTypes.has('share_class')).toBe(true);
      expect(resourceTypes.has('stakeholder')).toBe(true);
      expect(resourceTypes.has('financial_data')).toBe(true);
      expect(resourceTypes.has('data_room')).toBe(true);
    });
  });

  describe('Given validation requirements', () => {
    it('Should reject policy creation without required fields', async () => {
      const invalidPolicy = {
        description: 'Missing required fields'
      };

      const response = await request(app)
        .post('/api/v1/access-policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPolicy)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('required');
    });

    it('Should reject policy creation with empty actions array', async () => {
      const invalidPolicy = {
        name: 'Invalid Policy',
        resourceType: 'document',
        actions: []
      };

      const response = await request(app)
        .post('/api/v1/access-policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPolicy)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Given error handling scenarios', () => {
    it('Should return 404 when policy not found', async () => {
      zerodbService.queryTable.mockResolvedValue({
        data: []
      });

      const response = await request(app)
        .get('/api/v1/access-policies/POL-NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    it('Should return 404 when updating non-existent policy', async () => {
      zerodbService.updateRows.mockResolvedValue({
        modified_count: 0
      });

      const response = await request(app)
        .put('/api/v1/access-policies/POL-NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('Should return 404 when deleting non-existent policy', async () => {
      zerodbService.deleteRows.mockResolvedValue({
        deleted_count: 0
      });

      const response = await request(app)
        .delete('/api/v1/access-policies/POL-NONEXISTENT')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('Should handle database errors gracefully', async () => {
      zerodbService.queryTable.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/api/v1/access-policies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Error fetching');
    });
  });
});
