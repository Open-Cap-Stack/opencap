/**
 * DocumentAuditService Tests
 *
 * Issue #102: Add Document Audit Trail
 *
 * Comprehensive tests for the document audit service.
 */

const DocumentAuditService = require('../../../services/documentAuditService');
const databaseAdapter = require('../../../services/databaseAdapter');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

describe('DocumentAuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logAction', () => {
    const validLogParams = {
      documentId: 'doc-123',
      actionType: 'viewed',
      actor: {
        userId: 'user-456',
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin'
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should log an action successfully', async () => {
      const mockCreatedEntry = {
        auditId: 'audit-123',
        ...validLogParams,
        timestamp: new Date()
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedEntry);

      const result = await DocumentAuditService.logAction(validLogParams);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          documentId: validLogParams.documentId,
          actionType: validLogParams.actionType,
          actor: expect.objectContaining({
            userId: validLogParams.actor.userId
          }),
          ipAddress: validLogParams.ipAddress
        })
      );
      expect(result).toEqual(mockCreatedEntry);
    });

    it('should throw error when documentId is missing', async () => {
      const params = { ...validLogParams };
      delete params.documentId;

      await expect(DocumentAuditService.logAction(params)).rejects.toThrow('documentId is required');
    });

    it('should throw error when actionType is missing', async () => {
      const params = { ...validLogParams };
      delete params.actionType;

      await expect(DocumentAuditService.logAction(params)).rejects.toThrow('actionType is required');
    });

    it('should throw error when actionType is invalid', async () => {
      const params = { ...validLogParams, actionType: 'invalid_action' };

      await expect(DocumentAuditService.logAction(params)).rejects.toThrow('Invalid actionType');
    });

    it('should throw error when actor is missing', async () => {
      const params = { ...validLogParams };
      delete params.actor;

      await expect(DocumentAuditService.logAction(params)).rejects.toThrow('actor with userId is required');
    });

    it('should throw error when actor.userId is missing', async () => {
      const params = { ...validLogParams, actor: { email: 'test@example.com' } };

      await expect(DocumentAuditService.logAction(params)).rejects.toThrow('actor with userId is required');
    });

    it('should throw error when ipAddress is missing', async () => {
      const params = { ...validLogParams };
      delete params.ipAddress;

      await expect(DocumentAuditService.logAction(params)).rejects.toThrow('ipAddress is required');
    });

    it('should log action with changes', async () => {
      const params = {
        ...validLogParams,
        actionType: 'edited',
        changes: [
          { field: 'name', previousValue: 'Old', newValue: 'New' }
        ],
        previousValues: { name: 'Old' },
        newValues: { name: 'New' }
      };

      databaseAdapter.create.mockResolvedValue({ auditId: 'audit-123', ...params });

      await DocumentAuditService.logAction(params);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          changes: params.changes,
          previousValues: params.previousValues,
          newValues: params.newValues
        })
      );
    });

    it('should log action with metadata', async () => {
      const params = {
        ...validLogParams,
        metadata: {
          companyId: 'company-789',
          sessionId: 'session-abc',
          reason: 'Regular review'
        }
      };

      databaseAdapter.create.mockResolvedValue({ auditId: 'audit-123', ...params });

      await DocumentAuditService.logAction(params);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          metadata: expect.objectContaining({
            companyId: params.metadata.companyId,
            sessionId: params.metadata.sessionId,
            reason: params.metadata.reason
          })
        })
      );
    });

    it('should log action with sharedWith details', async () => {
      const params = {
        ...validLogParams,
        actionType: 'shared',
        sharedWith: {
          users: ['user-1', 'user-2'],
          emails: ['external@example.com'],
          accessLevel: 'view'
        }
      };

      databaseAdapter.create.mockResolvedValue({ auditId: 'audit-123', ...params });

      await DocumentAuditService.logAction(params);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          sharedWith: expect.objectContaining({
            users: params.sharedWith.users,
            accessLevel: 'view'
          })
        })
      );
    });

    it('should log action with signature details', async () => {
      const params = {
        ...validLogParams,
        actionType: 'signed',
        signatureDetails: {
          signatureId: 'sig-123',
          signatureType: 'electronic'
        }
      };

      databaseAdapter.create.mockResolvedValue({ auditId: 'audit-123', ...params });

      await DocumentAuditService.logAction(params);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          signatureDetails: expect.objectContaining({
            signatureId: 'sig-123',
            signatureType: 'electronic'
          })
        })
      );
    });
  });

  describe('getAuditTrail', () => {
    it('should get audit trail for a document', async () => {
      const documentId = 'doc-123';
      const mockEntries = [
        { auditId: 'audit-1', documentId, actionType: 'viewed' },
        { auditId: 'audit-2', documentId, actionType: 'edited' }
      ];

      databaseAdapter.find.mockResolvedValue(mockEntries);

      const result = await DocumentAuditService.getAuditTrail(documentId);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        { documentId },
        expect.objectContaining({ sort: { timestamp: -1 } })
      );
      expect(result).toEqual(mockEntries);
    });

    it('should throw error when documentId is missing', async () => {
      await expect(DocumentAuditService.getAuditTrail()).rejects.toThrow('documentId is required');
    });

    it('should filter by actionType', async () => {
      const documentId = 'doc-123';
      databaseAdapter.find.mockResolvedValue([]);

      await DocumentAuditService.getAuditTrail(documentId, { actionType: 'viewed' });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        { documentId, actionType: 'viewed' },
        expect.any(Object)
      );
    });

    it('should filter by date range', async () => {
      const documentId = 'doc-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      databaseAdapter.find.mockResolvedValue([]);

      await DocumentAuditService.getAuditTrail(documentId, { startDate, endDate });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          documentId,
          timestamp: {
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          }
        }),
        expect.any(Object)
      );
    });

    it('should apply pagination', async () => {
      const documentId = 'doc-123';
      databaseAdapter.find.mockResolvedValue([]);

      await DocumentAuditService.getAuditTrail(documentId, { limit: 10, skip: 20 });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        { documentId },
        expect.objectContaining({ limit: 10, skip: 20 })
      );
    });
  });

  describe('getAuditByUser', () => {
    it('should get audit entries for a user', async () => {
      const userId = 'user-456';
      const mockEntries = [
        { auditId: 'audit-1', 'actor.userId': userId, actionType: 'created' },
        { auditId: 'audit-2', 'actor.userId': userId, actionType: 'viewed' }
      ];

      databaseAdapter.find.mockResolvedValue(mockEntries);

      const result = await DocumentAuditService.getAuditByUser(userId);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        { 'actor.userId': userId },
        expect.objectContaining({ sort: { timestamp: -1 } })
      );
      expect(result).toEqual(mockEntries);
    });

    it('should throw error when userId is missing', async () => {
      await expect(DocumentAuditService.getAuditByUser()).rejects.toThrow('userId is required');
    });

    it('should filter by documentId', async () => {
      const userId = 'user-456';
      const documentId = 'doc-123';

      databaseAdapter.find.mockResolvedValue([]);

      await DocumentAuditService.getAuditByUser(userId, { documentId });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        { 'actor.userId': userId, documentId },
        expect.any(Object)
      );
    });
  });

  describe('getAuditByDateRange', () => {
    it('should get audit entries by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockEntries = [
        { auditId: 'audit-1', timestamp: new Date('2024-01-15') }
      ];

      databaseAdapter.find.mockResolvedValue(mockEntries);

      const result = await DocumentAuditService.getAuditByDateRange(startDate, endDate);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          timestamp: {
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          }
        }),
        expect.any(Object)
      );
      expect(result).toEqual(mockEntries);
    });

    it('should throw error when dates are missing', async () => {
      await expect(DocumentAuditService.getAuditByDateRange()).rejects.toThrow('startDate and endDate are required');
      await expect(DocumentAuditService.getAuditByDateRange('2024-01-01')).rejects.toThrow('startDate and endDate are required');
    });

    it('should filter by companyId', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const companyId = 'company-789';

      databaseAdapter.find.mockResolvedValue([]);

      await DocumentAuditService.getAuditByDateRange(startDate, endDate, { companyId });

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          'metadata.companyId': companyId
        }),
        expect.any(Object)
      );
    });
  });

  describe('generateAuditReport', () => {
    it('should generate a comprehensive audit report', async () => {
      const params = {
        companyId: 'company-789',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockEntries = [
        {
          auditId: 'audit-1',
          documentId: 'doc-1',
          actionType: 'viewed',
          actor: { userId: 'user-1', name: 'User 1', email: 'user1@example.com' },
          timestamp: new Date('2024-01-15'),
          metadata: {}
        },
        {
          auditId: 'audit-2',
          documentId: 'doc-1',
          actionType: 'edited',
          actor: { userId: 'user-1', name: 'User 1', email: 'user1@example.com' },
          timestamp: new Date('2024-01-16'),
          metadata: {}
        },
        {
          auditId: 'audit-3',
          documentId: 'doc-2',
          actionType: 'deleted',
          actor: { userId: 'user-2', name: 'User 2', email: 'user2@example.com' },
          timestamp: new Date('2024-01-20'),
          metadata: { reason: 'Outdated' }
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockEntries);

      const result = await DocumentAuditService.generateAuditReport(params);

      expect(result).toHaveProperty('reportId');
      expect(result).toHaveProperty('reportType', 'comprehensive');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('companyId', params.companyId);
      expect(result).toHaveProperty('summary');
      expect(result.summary.totalActions).toBe(3);
      expect(result.summary.uniqueUsers).toBe(2);
      expect(result.summary.uniqueDocuments).toBe(2);
      expect(result.summary.highRiskActionsCount).toBe(1); // deleted
    });

    it('should throw error when companyId is missing', async () => {
      await expect(DocumentAuditService.generateAuditReport({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      })).rejects.toThrow('companyId is required');
    });

    it('should throw error when dates are missing', async () => {
      await expect(DocumentAuditService.generateAuditReport({
        companyId: 'company-789'
      })).rejects.toThrow('startDate and endDate are required');
    });

    it('should identify high-risk activities', async () => {
      const params = {
        companyId: 'company-789',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockEntries = [
        { auditId: 'a1', actionType: 'deleted', actor: { userId: 'u1' }, timestamp: new Date(), metadata: {} },
        { auditId: 'a2', actionType: 'access_granted', actor: { userId: 'u1' }, timestamp: new Date(), metadata: {} },
        { auditId: 'a3', actionType: 'access_revoked', actor: { userId: 'u1' }, timestamp: new Date(), metadata: {} },
        { auditId: 'a4', actionType: 'shared', actor: { userId: 'u1' }, timestamp: new Date(), metadata: {} },
        { auditId: 'a5', actionType: 'viewed', actor: { userId: 'u1' }, timestamp: new Date(), metadata: {} }
      ];

      databaseAdapter.find.mockResolvedValue(mockEntries);

      const result = await DocumentAuditService.generateAuditReport(params);

      expect(result.summary.highRiskActionsCount).toBe(4);
      expect(result.highRiskActivities.length).toBe(4);
    });
  });

  describe('searchAuditTrail', () => {
    it('should search with various filters', async () => {
      const searchParams = {
        documentId: 'doc-123',
        userId: 'user-456',
        actionType: 'viewed',
        companyId: 'company-789',
        limit: 50
      };

      const mockResults = [{ auditId: 'audit-1', actionType: 'viewed' }];
      databaseAdapter.find.mockResolvedValue(mockResults);
      databaseAdapter.count.mockResolvedValue(1);

      const result = await DocumentAuditService.searchAuditTrail(searchParams);

      expect(result).toHaveProperty('results', mockResults);
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toHaveProperty('total', 1);
      expect(result.pagination).toHaveProperty('limit', 50);
      expect(result.pagination).toHaveProperty('hasMore', false);
    });

    it('should support multiple action types', async () => {
      const searchParams = {
        actionType: ['viewed', 'edited', 'downloaded']
      };

      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await DocumentAuditService.searchAuditTrail(searchParams);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          actionType: { $in: ['viewed', 'edited', 'downloaded'] }
        }),
        expect.any(Object)
      );
    });

    it('should support keyword search', async () => {
      const searchParams = {
        keyword: 'admin'
      };

      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      await DocumentAuditService.searchAuditTrail(searchParams);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          $or: expect.arrayContaining([
            { 'metadata.reason': expect.any(Object) },
            { 'actor.email': expect.any(Object) },
            { 'actor.name': expect.any(Object) }
          ])
        }),
        expect.any(Object)
      );
    });

    it('should handle empty search params', async () => {
      databaseAdapter.find.mockResolvedValue([]);
      databaseAdapter.count.mockResolvedValue(0);

      const result = await DocumentAuditService.searchAuditTrail();

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        {},
        expect.objectContaining({ limit: 100, skip: 0 })
      );
      expect(result.pagination.limit).toBe(100);
    });
  });

  describe('getDocumentActionStats', () => {
    it('should get action statistics for a document', async () => {
      const documentId = 'doc-123';
      const mockEntries = [
        { actionType: 'viewed', actor: { userId: 'u1' }, timestamp: new Date('2024-01-01') },
        { actionType: 'viewed', actor: { userId: 'u2' }, timestamp: new Date('2024-01-02') },
        { actionType: 'viewed', actor: { userId: 'u1' }, timestamp: new Date('2024-01-03') },
        { actionType: 'edited', actor: { userId: 'u1' }, timestamp: new Date('2024-01-04') },
        { actionType: 'downloaded', actor: { userId: 'u3' }, timestamp: new Date('2024-01-05') }
      ];

      databaseAdapter.find.mockResolvedValue(mockEntries);

      const result = await DocumentAuditService.getDocumentActionStats(documentId);

      expect(result).toHaveProperty('documentId', documentId);
      expect(result).toHaveProperty('totalActions', 5);
      expect(result.actionCounts).toEqual({
        viewed: 3,
        edited: 1,
        downloaded: 1
      });
      expect(result).toHaveProperty('uniqueUserCount', 3);
      expect(result).toHaveProperty('firstAction');
      expect(result).toHaveProperty('lastAction');
    });

    it('should throw error when documentId is missing', async () => {
      await expect(DocumentAuditService.getDocumentActionStats()).rejects.toThrow('documentId is required');
    });

    it('should support date range filtering', async () => {
      const documentId = 'doc-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      databaseAdapter.find.mockResolvedValue([]);

      await DocumentAuditService.getDocumentActionStats(documentId, startDate, endDate);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'DocumentAuditTrail',
        expect.objectContaining({
          documentId,
          timestamp: {
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          }
        }),
        expect.any(Object)
      );
    });
  });

  describe('getActionTypes', () => {
    it('should return list of valid action types', () => {
      const actionTypes = DocumentAuditService.getActionTypes();

      expect(Array.isArray(actionTypes)).toBe(true);
      expect(actionTypes).toContain('created');
      expect(actionTypes).toContain('viewed');
      expect(actionTypes).toContain('downloaded');
      expect(actionTypes).toContain('edited');
      expect(actionTypes).toContain('signed');
      expect(actionTypes).toContain('shared');
      expect(actionTypes).toContain('deleted');
      expect(actionTypes).toContain('restored');
    });

    it('should return a copy (not mutable reference)', () => {
      const actionTypes1 = DocumentAuditService.getActionTypes();
      const actionTypes2 = DocumentAuditService.getActionTypes();

      actionTypes1.push('custom_action');

      expect(actionTypes2).not.toContain('custom_action');
    });
  });
});
