/**
 * Access Policy Controller Test Suite
 *
 * Tests for the ZeroDB-based access policy controller
 * Issue #247: Implement Access Policies Endpoints
 *
 * Test Coverage:
 * - CRUD operations (create, read, update, delete)
 * - Template retrieval
 * - Validation
 * - Error handling
 */

const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

// Import controller after mocking
const accessPolicyController = require('../../../controllers/accessPolicyController');

describe('Access Policy Controller (ZeroDB)', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock request and response
    mockReq = {
      body: {},
      params: {},
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        companyId: 'company-123'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Reset ZeroDB service mock
    zerodbService.insertRow = jest.fn();
    zerodbService.queryRows = jest.fn();
    zerodbService.queryTable = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
  });

  describe('Given the createAccessPolicy function', () => {
    describe('When creating a new access policy with valid data', () => {
      it('Then it should create and return the access policy successfully', async () => {
        const policyData = {
          name: 'Investor Document Access',
          description: 'Access policy for investor documents',
          resourceType: 'document',
          actions: ['read', 'download'],
          conditions: {
            roleRequired: 'investor',
            documentType: 'financial_report'
          },
          status: 'active'
        };
        mockReq.body = policyData;

        const mockCreatedPolicy = {
          row_id: 'policy-001',
          row_data: {
            policyId: 'POL-001',
            ...policyData,
            createdBy: 'user-123',
            companyId: 'company-123',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        };

        zerodbService.insertRow.mockResolvedValue({
          data: [mockCreatedPolicy]
        });

        await accessPolicyController.createAccessPolicy(mockReq, mockRes);

        expect(zerodbService.insertRow).toHaveBeenCalledWith(
          'access_policies',
          expect.objectContaining({
            name: policyData.name,
            description: policyData.description,
            resourceType: policyData.resourceType,
            actions: policyData.actions,
            conditions: policyData.conditions,
            status: policyData.status,
            createdBy: 'user-123',
            companyId: 'company-123'
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            policyId: 'POL-001',
            name: policyData.name
          })
        );
      });
    });

    describe('When creating a policy without required fields', () => {
      it('Then it should return 400 when name is missing', async () => {
        mockReq.body = {
          description: 'Test policy',
          resourceType: 'document',
          actions: ['read']
        };

        await accessPolicyController.createAccessPolicy(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Name, resourceType, and actions are required'
        });
        expect(zerodbService.insertRow).not.toHaveBeenCalled();
      });

      it('Then it should return 400 when resourceType is missing', async () => {
        mockReq.body = {
          name: 'Test Policy',
          actions: ['read']
        };

        await accessPolicyController.createAccessPolicy(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Name, resourceType, and actions are required'
        });
      });

      it('Then it should return 400 when actions is missing or empty', async () => {
        mockReq.body = {
          name: 'Test Policy',
          resourceType: 'document',
          actions: []
        };

        await accessPolicyController.createAccessPolicy(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Name, resourceType, and actions are required'
        });
      });
    });

    describe('When database error occurs', () => {
      it('Then it should return 500 with error message', async () => {
        mockReq.body = {
          name: 'Test Policy',
          resourceType: 'document',
          actions: ['read']
        };

        zerodbService.insertRow.mockRejectedValue(new Error('Database error'));

        await accessPolicyController.createAccessPolicy(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Error creating access policy'
        });
      });
    });
  });

  describe('Given the getAllAccessPolicies function', () => {
    describe('When fetching all access policies', () => {
      it('Then it should return all policies for the company', async () => {
        const mockPolicies = [
          {
            row_id: 'policy-001',
            row_data: {
              policyId: 'POL-001',
              name: 'Document Access',
              resourceType: 'document',
              actions: ['read'],
              companyId: 'company-123'
            }
          },
          {
            row_id: 'policy-002',
            row_data: {
              policyId: 'POL-002',
              name: 'Share Class Access',
              resourceType: 'share_class',
              actions: ['read', 'write'],
              companyId: 'company-123'
            }
          }
        ];

        zerodbService.queryTable.mockResolvedValue({
          data: mockPolicies
        });

        await accessPolicyController.getAllAccessPolicies(mockReq, mockRes);

        expect(zerodbService.queryTable).toHaveBeenCalledWith(
          'access_policies',
          expect.objectContaining({
            filter: { companyId: 'company-123' }
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ policyId: 'POL-001' }),
            expect.objectContaining({ policyId: 'POL-002' })
          ])
        );
      });

      it('Then it should return empty array when no policies exist', async () => {
        zerodbService.queryTable.mockResolvedValue({
          data: []
        });

        await accessPolicyController.getAllAccessPolicies(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith([]);
      });

      it('Then it should handle database errors gracefully', async () => {
        zerodbService.queryTable.mockRejectedValue(new Error('Database error'));

        await accessPolicyController.getAllAccessPolicies(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Error fetching access policies'
        });
      });
    });
  });

  describe('Given the getAccessPolicyById function', () => {
    describe('When fetching a specific access policy', () => {
      it('Then it should return the policy when found', async () => {
        mockReq.params.id = 'POL-001';

        const mockPolicy = {
          row_id: 'policy-001',
          row_data: {
            policyId: 'POL-001',
            name: 'Document Access',
            resourceType: 'document',
            actions: ['read']
          }
        };

        zerodbService.queryTable.mockResolvedValue({
          data: [mockPolicy]
        });

        await accessPolicyController.getAccessPolicyById(mockReq, mockRes);

        expect(zerodbService.queryTable).toHaveBeenCalledWith(
          'access_policies',
          expect.objectContaining({
            filter: { policyId: 'POL-001' },
            limit: 1
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ policyId: 'POL-001' })
        );
      });

      it('Then it should return 404 when policy not found', async () => {
        mockReq.params.id = 'POL-NONEXISTENT';

        zerodbService.queryTable.mockResolvedValue({
          data: []
        });

        await accessPolicyController.getAccessPolicyById(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access policy not found'
        });
      });
    });
  });

  describe('Given the updateAccessPolicy function', () => {
    describe('When updating an existing access policy', () => {
      it('Then it should update and return the updated policy', async () => {
        mockReq.params.id = 'POL-001';
        mockReq.body = {
          name: 'Updated Document Access',
          actions: ['read', 'write', 'delete']
        };

        zerodbService.updateRows.mockResolvedValue({
          modified_count: 1
        });

        const mockUpdatedPolicy = {
          row_id: 'policy-001',
          row_data: {
            policyId: 'POL-001',
            name: 'Updated Document Access',
            actions: ['read', 'write', 'delete'],
            updatedAt: new Date().toISOString()
          }
        };

        zerodbService.queryTable.mockResolvedValue({
          data: [mockUpdatedPolicy]
        });

        await accessPolicyController.updateAccessPolicy(mockReq, mockRes);

        expect(zerodbService.updateRows).toHaveBeenCalledWith(
          'access_policies',
          expect.objectContaining({
            filter: { policyId: 'POL-001' },
            update: expect.objectContaining({
              name: 'Updated Document Access',
              actions: ['read', 'write', 'delete']
            })
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            policyId: 'POL-001',
            name: 'Updated Document Access'
          })
        );
      });

      it('Then it should return 404 when policy not found', async () => {
        mockReq.params.id = 'POL-NONEXISTENT';
        mockReq.body = { name: 'Updated Name' };

        zerodbService.updateRows.mockResolvedValue({
          modified_count: 0
        });

        await accessPolicyController.updateAccessPolicy(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access policy not found'
        });
      });
    });
  });

  describe('Given the deleteAccessPolicy function', () => {
    describe('When deleting an access policy', () => {
      it('Then it should delete the policy successfully', async () => {
        mockReq.params.id = 'POL-001';

        zerodbService.deleteRows.mockResolvedValue({
          deleted_count: 1
        });

        await accessPolicyController.deleteAccessPolicy(mockReq, mockRes);

        expect(zerodbService.deleteRows).toHaveBeenCalledWith(
          'access_policies',
          expect.objectContaining({
            filter: { policyId: 'POL-001' }
          })
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          message: 'Access policy deleted successfully'
        });
      });

      it('Then it should return 404 when policy not found', async () => {
        mockReq.params.id = 'POL-NONEXISTENT';

        zerodbService.deleteRows.mockResolvedValue({
          deleted_count: 0
        });

        await accessPolicyController.deleteAccessPolicy(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access policy not found'
        });
      });
    });
  });

  describe('Given the getAccessPolicyTemplates function', () => {
    describe('When fetching policy templates', () => {
      it('Then it should return predefined policy templates', async () => {
        await accessPolicyController.getAccessPolicyTemplates(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const templates = mockRes.json.mock.calls[0][0];

        expect(templates).toHaveProperty('templates');
        expect(Array.isArray(templates.templates)).toBe(true);
        expect(templates.templates.length).toBeGreaterThan(0);

        // Verify template structure
        const firstTemplate = templates.templates[0];
        expect(firstTemplate).toHaveProperty('id');
        expect(firstTemplate).toHaveProperty('name');
        expect(firstTemplate).toHaveProperty('description');
        expect(firstTemplate).toHaveProperty('resourceType');
        expect(firstTemplate).toHaveProperty('actions');
        expect(Array.isArray(firstTemplate.actions)).toBe(true);
      });

      it('Then it should include common templates for different resource types', async () => {
        await accessPolicyController.getAccessPolicyTemplates(mockReq, mockRes);

        const templates = mockRes.json.mock.calls[0][0].templates;

        // Check for document template
        const documentTemplate = templates.find(t => t.resourceType === 'document');
        expect(documentTemplate).toBeDefined();

        // Check for share class template
        const shareClassTemplate = templates.find(t => t.resourceType === 'share_class');
        expect(shareClassTemplate).toBeDefined();

        // Check for stakeholder template
        const stakeholderTemplate = templates.find(t => t.resourceType === 'stakeholder');
        expect(stakeholderTemplate).toBeDefined();
      });
    });
  });
});
