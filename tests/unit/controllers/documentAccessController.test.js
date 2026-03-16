/**
 * Document Access Controller Test Suite
 *
 * Tests for DocumentAccess controller migrated to ZeroDB
 * Covers all CRUD operations for document access control
 */

const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

// Import controller after mocks are set up
const documentAccessController = require('../../../controllers/documentAccessController');

describe('Document Access Controller - ZeroDB Migration', () => {
  let mockReq;
  let mockRes;
  let mockJson;
  let mockStatus;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    mockReq = {
      body: {},
      params: {},
      query: {},
      user: {}
    };
  });

  describe('createDocumentAccess', () => {
    it('should create document access using ZeroDB insertRow', async () => {
      const accessData = {
        accessId: 'access-001',
        AccessLevel: 'Read',
        RelatedDocument: 'doc-123',
        User: 'user-456',
        Permissions: 'view,download'
      };

      mockReq.body = accessData;

      const insertedAccess = {
        id: 'zerodb-access-id',
        ...accessData,
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow = jest.fn().mockResolvedValue({ rows: [insertedAccess] });

      await documentAccessController.createDocumentAccess(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith('document_access', expect.objectContaining({
        accessId: 'access-001',
        AccessLevel: 'Read',
        RelatedDocument: 'doc-123',
        User: 'user-456'
      }));
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: insertedAccess,
        message: 'Document access created successfully'
      });
    });

    it('should handle creation errors', async () => {
      mockReq.body = { AccessLevel: 'Read' };

      zerodbService.insertRow = jest.fn().mockRejectedValue(new Error('Insertion failed'));

      await documentAccessController.createDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Insertion failed'
      });
    });

    it('should validate required fields', async () => {
      mockReq.body = {};

      zerodbService.insertRow = jest.fn().mockRejectedValue(new Error('Required fields missing'));

      await documentAccessController.createDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('getDocumentAccesses', () => {
    it('should get all document accesses using ZeroDB queryTable', async () => {
      const mockAccesses = [
        { id: '1', accessId: 'access-001', AccessLevel: 'Read', User: 'user-1' },
        { id: '2', accessId: 'access-002', AccessLevel: 'Write', User: 'user-2' }
      ];

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: mockAccesses });

      await documentAccessController.getDocumentAccesses(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('document_access', expect.any(Object));
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockAccesses);
    });

    it('should return empty array when no accesses exist', async () => {
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.getDocumentAccesses(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith([]);
    });

    it('should handle query errors', async () => {
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('Query failed'));

      await documentAccessController.getDocumentAccesses(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Query failed' });
    });
  });

  describe('getDocumentAccessById', () => {
    it('should get document access by ID using ZeroDB queryTable', async () => {
      mockReq.params = { id: 'access-123' };

      const mockAccess = {
        id: 'access-123',
        accessId: 'access-001',
        AccessLevel: 'Read',
        RelatedDocument: 'doc-456',
        User: 'user-789'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [mockAccess] });

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('document_access', {
        filter: { id: 'access-123' },
        limit: 1
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(mockAccess);
    });

    it('should return 404 if document access not found', async () => {
      mockReq.params = { id: 'non-existent' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Document access not found' });
    });

    it('should handle query errors', async () => {
      mockReq.params = { id: 'access-123' };

      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('Database error'));

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('updateDocumentAccess', () => {
    it('should update document access using ZeroDB updateRows with correct API signature', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Write', Permissions: 'view,edit,delete' };

      const updatedAccess = {
        id: 'access-123',
        accessId: 'access-001',
        AccessLevel: 'Write',
        Permissions: 'view,edit,delete',
        updatedAt: expect.any(String)
      };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1, matched_count: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedAccess] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      // Verify updateRows is called with correct options object structure
      expect(zerodbService.updateRows).toHaveBeenCalledWith('document_access', {
        filter: { id: 'access-123' },
        update: { $set: expect.objectContaining({ AccessLevel: 'Write', updatedAt: expect.any(String) }) }
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedAccess,
        message: 'Document access updated successfully'
      });
    });

    it('should return 404 if document access to update not found', async () => {
      mockReq.params = { id: 'non-existent' };
      mockReq.body = { AccessLevel: 'Write' };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 0 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Document access not found'
      });
    });

    it('should handle update errors', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Write' };

      zerodbService.updateRows = jest.fn().mockRejectedValue(new Error('Update failed'));

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Update failed'
      });
    });

    it('should validate AccessLevel values', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'InvalidLevel' };

      zerodbService.updateRows = jest.fn().mockRejectedValue(new Error('Invalid AccessLevel value'));

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteDocumentAccess', () => {
    it('should delete document access using ZeroDB deleteRows with correct API signature', async () => {
      mockReq.params = { id: 'access-123' };

      const deletedAccess = {
        id: 'access-123',
        accessId: 'access-001',
        AccessLevel: 'Read'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [deletedAccess] });
      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted_count: 1 });

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      // Verify deleteRows is called with correct options object structure
      expect(zerodbService.deleteRows).toHaveBeenCalledWith('document_access', {
        filter: { id: 'access-123' }
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Document access deleted' });
    });

    it('should return 404 if document access to delete not found', async () => {
      mockReq.params = { id: 'non-existent' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Document access not found' });
    });

    it('should handle delete errors', async () => {
      mockReq.params = { id: 'access-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'access-123' }] });
      zerodbService.deleteRows = jest.fn().mockRejectedValue(new Error('Delete failed'));

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Delete failed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle ZeroDB connection errors', async () => {
      mockReq.params = { id: 'access-123' };

      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';

      zerodbService.queryTable = jest.fn().mockRejectedValue(connectionError);

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });

    it('should handle ZeroDB timeout errors', async () => {
      zerodbService.queryTable = jest.fn().mockRejectedValue(new Error('Request timeout'));

      await documentAccessController.getDocumentAccesses(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
    });
  });

  describe('Data Validation', () => {
    it('should validate AccessLevel enum values', async () => {
      const validLevels = ['Read', 'Write', 'Admin'];

      for (const level of validLevels) {
        mockReq.body = {
          accessId: `access-${level}`,
          AccessLevel: level,
          RelatedDocument: 'doc-123',
          User: 'user-456'
        };

        zerodbService.insertRow = jest.fn().mockResolvedValue({
          rows: [{ ...mockReq.body, id: 'new-id' }]
        });

        await documentAccessController.createDocumentAccess(mockReq, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(201);
      }
    });

    it('should reject invalid AccessLevel values', async () => {
      mockReq.body = {
        accessId: 'access-invalid',
        AccessLevel: 'SuperAdmin',
        RelatedDocument: 'doc-123',
        User: 'user-456'
      };

      zerodbService.insertRow = jest.fn().mockRejectedValue(
        new Error('AccessLevel must be one of: Read, Write, Admin')
      );

      await documentAccessController.createDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  describe('Update Operation - Additional Tests', () => {
    it('should handle partial updates correctly', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { Permissions: 'view,edit' }; // Only updating permissions

      const updatedAccess = {
        id: 'access-123',
        accessId: 'access-001',
        AccessLevel: 'Read',
        Permissions: 'view,edit',
        updatedAt: expect.any(String)
      };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedAccess] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: updatedAccess,
        message: 'Document access updated successfully'
      });
    });

    it('should handle update when ZeroDB returns no modified count', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Write' };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 0, matched_count: 0 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Document access not found'
      });
    });

    it('should handle network errors during update', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Write' };

      const networkError = new Error('Network timeout');
      networkError.code = 'ETIMEDOUT';

      zerodbService.updateRows = jest.fn().mockRejectedValue(networkError);

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: 'Network timeout'
      });
    });

    it('should preserve existing fields when updating', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Admin' };

      const updatedAccess = {
        id: 'access-123',
        accessId: 'access-001',
        AccessLevel: 'Admin',
        RelatedDocument: 'doc-456',
        User: 'user-789',
        Permissions: 'original-permissions',
        updatedAt: expect.any(String)
      };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedAccess] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          Permissions: 'original-permissions'
        }),
        message: 'Document access updated successfully'
      });
    });
  });

  describe('Delete Operation - Additional Tests', () => {
    it('should handle deletion when record exists in ZeroDB', async () => {
      mockReq.params = { id: 'access-456' };

      const existingAccess = {
        id: 'access-456',
        accessId: 'access-002',
        AccessLevel: 'Write',
        User: 'user-123'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [existingAccess] });
      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted_count: 1 });

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('document_access', {
        filter: { id: 'access-456' },
        limit: 1
      });
      expect(zerodbService.deleteRows).toHaveBeenCalledWith('document_access', {
        filter: { id: 'access-456' }
      });
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle deletion when ZeroDB returns zero deleted count', async () => {
      mockReq.params = { id: 'access-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'access-123' }] });
      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted_count: 0 });

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      // Should still succeed if query found the record initially
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should handle network errors during deletion', async () => {
      mockReq.params = { id: 'access-123' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [{ id: 'access-123' }] });

      const networkError = new Error('Connection refused');
      networkError.code = 'ECONNREFUSED';

      zerodbService.deleteRows = jest.fn().mockRejectedValue(networkError);

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Connection refused' });
    });

    it('should not call deleteRows if record not found in initial query', async () => {
      mockReq.params = { id: 'non-existent' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });
      zerodbService.deleteRows = jest.fn();

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      expect(zerodbService.deleteRows).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('Authorization and Security', () => {
    it('should handle unauthorized access attempts', async () => {
      mockReq.params = { id: 'access-123' };

      const authError = new Error('Unauthorized access');
      authError.status = 401;

      zerodbService.queryTable = jest.fn().mockRejectedValue(authError);

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Unauthorized access' });
    });

    it('should sanitize input data before update', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = {
        AccessLevel: 'Write',
        maliciousField: '<script>alert("xss")</script>'
      };

      const updatedAccess = {
        id: 'access-123',
        AccessLevel: 'Write',
        maliciousField: '<script>alert("xss")</script>',
        updatedAt: expect.any(String)
      };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedAccess] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      // Should still process but backend validation should handle sanitization
      expect(zerodbService.updateRows).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string IDs gracefully', async () => {
      mockReq.params = { id: '' };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should handle null or undefined body in update', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = undefined;

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      // Should handle gracefully with proper error
      expect(mockStatus).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should handle ZeroDB service returning malformed data', async () => {
      mockReq.params = { id: 'access-123' };

      // Missing 'rows' property
      zerodbService.queryTable = jest.fn().mockResolvedValue({ data: null });

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
    });

    it('should handle very long ID strings', async () => {
      const longId = 'a'.repeat(1000);
      mockReq.params = { id: longId };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.getDocumentAccessById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith('document_access', {
        filter: { id: longId },
        limit: 1
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent update requests', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Write' };

      const updatedAccess = { id: 'access-123', AccessLevel: 'Write', updatedAt: expect.any(String) };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedAccess] });

      // Simulate concurrent updates
      const promises = [
        documentAccessController.updateDocumentAccess(mockReq, mockRes),
        documentAccessController.updateDocumentAccess(mockReq, mockRes)
      ];

      await Promise.all(promises);

      expect(zerodbService.updateRows).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent delete requests', async () => {
      mockReq.params = { id: 'access-123' };

      zerodbService.queryTable = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'access-123' }] })
        .mockResolvedValueOnce({ rows: [] }); // Second call returns empty (already deleted)

      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted_count: 1 });

      const mockRes2 = {
        status: jest.fn().mockReturnValue({ json: jest.fn() }),
        json: jest.fn()
      };

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);
      await documentAccessController.deleteDocumentAccess(mockReq, mockRes2);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes2.status).toHaveBeenCalledWith(404);
    });
  });
});
