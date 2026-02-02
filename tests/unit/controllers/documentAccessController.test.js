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
      params: {}
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
      expect(mockJson).toHaveBeenCalledWith(insertedAccess);
    });

    it('should handle creation errors', async () => {
      mockReq.body = { AccessLevel: 'Read' };

      zerodbService.insertRow = jest.fn().mockRejectedValue(new Error('Insertion failed'));

      await documentAccessController.createDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Insertion failed' });
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
    it('should update document access using ZeroDB updateRows', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Write', Permissions: 'view,edit,delete' };

      const updatedAccess = {
        id: 'access-123',
        accessId: 'access-001',
        AccessLevel: 'Write',
        Permissions: 'view,edit,delete'
      };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 1 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [updatedAccess] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith('document_access',
        { id: 'access-123' },
        { $set: expect.objectContaining({ AccessLevel: 'Write' }) }
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(updatedAccess);
    });

    it('should return 404 if document access to update not found', async () => {
      mockReq.params = { id: 'non-existent' };
      mockReq.body = { AccessLevel: 'Write' };

      zerodbService.updateRows = jest.fn().mockResolvedValue({ modifiedCount: 0 });
      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [] });

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ message: 'Document access not found' });
    });

    it('should handle update errors', async () => {
      mockReq.params = { id: 'access-123' };
      mockReq.body = { AccessLevel: 'Write' };

      zerodbService.updateRows = jest.fn().mockRejectedValue(new Error('Update failed'));

      await documentAccessController.updateDocumentAccess(mockReq, mockRes);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Update failed' });
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
    it('should delete document access using ZeroDB deleteRows', async () => {
      mockReq.params = { id: 'access-123' };

      const deletedAccess = {
        id: 'access-123',
        accessId: 'access-001',
        AccessLevel: 'Read'
      };

      zerodbService.queryTable = jest.fn().mockResolvedValue({ rows: [deletedAccess] });
      zerodbService.deleteRows = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await documentAccessController.deleteDocumentAccess(mockReq, mockRes);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith('document_access', { id: 'access-123' });
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
});
