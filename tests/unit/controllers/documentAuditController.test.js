/**
 * DocumentAuditController Tests
 *
 * Issue #102: Add Document Audit Trail
 *
 * Comprehensive tests for the document audit controller.
 */

const httpMocks = require('node-mocks-http');
const documentAuditController = require('../../../controllers/documentAuditController');
const DocumentAuditService = require('../../../services/documentAuditService');

// Mock the service
jest.mock('../../../services/documentAuditService', () => ({
  getAuditTrail: jest.fn(),
  getAuditByUser: jest.fn(),
  getAuditByDateRange: jest.fn(),
  generateAuditReport: jest.fn(),
  searchAuditTrail: jest.fn(),
  getDocumentActionStats: jest.fn(),
  getActionTypes: jest.fn(),
  logAction: jest.fn()
}));

describe('DocumentAuditController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
  });

  describe('getDocumentAuditTrail', () => {
    it('should get audit trail for a document', async () => {
      req.params = { documentId: 'doc-123' };
      req.query = {};

      const mockAuditTrail = [
        { auditId: 'audit-1', actionType: 'viewed' },
        { auditId: 'audit-2', actionType: 'edited' }
      ];

      DocumentAuditService.getAuditTrail.mockResolvedValue(mockAuditTrail);

      await documentAuditController.getDocumentAuditTrail(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockAuditTrail);
      expect(data.count).toBe(2);
    });

    it('should return 400 when documentId is missing', async () => {
      req.params = {};
      req.query = {};

      await documentAuditController.getDocumentAuditTrail(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Document ID is required');
    });

    it('should pass query filters to service', async () => {
      req.params = { documentId: 'doc-123' };
      req.query = {
        actionType: 'viewed',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        limit: '50',
        skip: '10'
      };

      DocumentAuditService.getAuditTrail.mockResolvedValue([]);

      await documentAuditController.getDocumentAuditTrail(req, res);

      expect(DocumentAuditService.getAuditTrail).toHaveBeenCalledWith(
        'doc-123',
        expect.objectContaining({
          actionType: 'viewed',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          limit: 50,
          skip: 10
        })
      );
    });

    it('should handle service errors', async () => {
      req.params = { documentId: 'doc-123' };
      req.query = {};

      DocumentAuditService.getAuditTrail.mockRejectedValue(new Error('Database error'));

      await documentAuditController.getDocumentAuditTrail(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch document audit trail');
    });
  });

  describe('getAuditByUser', () => {
    it('should get audit entries for a user', async () => {
      req.params = { userId: 'user-456' };
      req.query = {};

      const mockEntries = [
        { auditId: 'audit-1', actionType: 'created' }
      ];

      DocumentAuditService.getAuditByUser.mockResolvedValue(mockEntries);

      await documentAuditController.getAuditByUser(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEntries);
    });

    it('should return 400 when userId is missing', async () => {
      req.params = {};
      req.query = {};

      await documentAuditController.getAuditByUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('User ID is required');
    });

    it('should pass filters to service', async () => {
      req.params = { userId: 'user-456' };
      req.query = {
        actionType: 'viewed',
        documentId: 'doc-123'
      };

      DocumentAuditService.getAuditByUser.mockResolvedValue([]);

      await documentAuditController.getAuditByUser(req, res);

      expect(DocumentAuditService.getAuditByUser).toHaveBeenCalledWith(
        'user-456',
        expect.objectContaining({
          actionType: 'viewed',
          documentId: 'doc-123'
        })
      );
    });
  });

  describe('getAuditByDateRange', () => {
    it('should get audit entries by date range', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const mockEntries = [
        { auditId: 'audit-1', timestamp: '2024-01-15T00:00:00.000Z' }
      ];

      DocumentAuditService.getAuditByDateRange.mockResolvedValue(mockEntries);

      await documentAuditController.getAuditByDateRange(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].auditId).toBe('audit-1');
    });

    it('should return 400 when dates are missing', async () => {
      req.query = {};

      await documentAuditController.getAuditByDateRange(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('startDate and endDate are required');
    });

    it('should pass all filters to service', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        documentId: 'doc-123',
        actionType: 'viewed',
        companyId: 'company-789',
        userId: 'user-456',
        limit: '100',
        skip: '0'
      };

      DocumentAuditService.getAuditByDateRange.mockResolvedValue([]);

      await documentAuditController.getAuditByDateRange(req, res);

      expect(DocumentAuditService.getAuditByDateRange).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31',
        expect.objectContaining({
          documentId: 'doc-123',
          actionType: 'viewed',
          companyId: 'company-789',
          userId: 'user-456',
          limit: 100,
          skip: 0
        })
      );
    });
  });

  describe('generateAuditReport', () => {
    it('should generate audit report', async () => {
      req.body = {
        companyId: 'company-789',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        reportType: 'comprehensive'
      };

      const mockReport = {
        reportId: 'report-123',
        reportType: 'comprehensive',
        summary: { totalActions: 100 }
      };

      DocumentAuditService.generateAuditReport.mockResolvedValue(mockReport);

      await documentAuditController.generateAuditReport(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockReport);
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      await documentAuditController.generateAuditReport(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('companyId is required');
    });

    it('should return 400 when dates are missing', async () => {
      req.body = {
        companyId: 'company-789'
      };

      await documentAuditController.generateAuditReport(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('startDate and endDate are required');
    });
  });

  describe('searchAuditTrail', () => {
    it('should search audit trail', async () => {
      req.query = {
        documentId: 'doc-123',
        actionType: 'viewed'
      };

      const mockResult = {
        results: [{ auditId: 'audit-1' }],
        pagination: { total: 1, limit: 100, skip: 0, hasMore: false }
      };

      DocumentAuditService.searchAuditTrail.mockResolvedValue(mockResult);

      await documentAuditController.searchAuditTrail(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult.results);
      expect(data.pagination).toEqual(mockResult.pagination);
    });

    it('should handle comma-separated action types', async () => {
      req.query = {
        actionType: 'viewed,edited,downloaded'
      };

      DocumentAuditService.searchAuditTrail.mockResolvedValue({
        results: [],
        pagination: { total: 0 }
      });

      await documentAuditController.searchAuditTrail(req, res);

      expect(DocumentAuditService.searchAuditTrail).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: ['viewed', 'edited', 'downloaded']
        })
      );
    });

    it('should pass all search parameters', async () => {
      req.query = {
        documentId: 'doc-123',
        userId: 'user-456',
        actionType: 'viewed',
        companyId: 'company-789',
        ipAddress: '192.168.1.1',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        keyword: 'admin',
        limit: '50',
        skip: '10'
      };

      DocumentAuditService.searchAuditTrail.mockResolvedValue({
        results: [],
        pagination: { total: 0 }
      });

      await documentAuditController.searchAuditTrail(req, res);

      expect(DocumentAuditService.searchAuditTrail).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-123',
          userId: 'user-456',
          actionType: 'viewed',
          companyId: 'company-789',
          ipAddress: '192.168.1.1',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          keyword: 'admin',
          limit: 50,
          skip: 10
        })
      );
    });
  });

  describe('getDocumentAuditStats', () => {
    it('should get document audit statistics', async () => {
      req.params = { documentId: 'doc-123' };
      req.query = {};

      const mockStats = {
        documentId: 'doc-123',
        totalActions: 50,
        actionCounts: { viewed: 30, edited: 15, downloaded: 5 },
        uniqueUserCount: 10
      };

      DocumentAuditService.getDocumentActionStats.mockResolvedValue(mockStats);

      await documentAuditController.getDocumentAuditStats(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockStats);
    });

    it('should return 400 when documentId is missing', async () => {
      req.params = {};
      req.query = {};

      await documentAuditController.getDocumentAuditStats(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Document ID is required');
    });

    it('should pass date filters to service', async () => {
      req.params = { documentId: 'doc-123' };
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      DocumentAuditService.getDocumentActionStats.mockResolvedValue({});

      await documentAuditController.getDocumentAuditStats(req, res);

      expect(DocumentAuditService.getDocumentActionStats).toHaveBeenCalledWith(
        'doc-123',
        '2024-01-01',
        '2024-01-31'
      );
    });
  });

  describe('getActionTypes', () => {
    it('should return available action types', async () => {
      const mockActionTypes = ['created', 'viewed', 'edited', 'deleted'];

      DocumentAuditService.getActionTypes.mockReturnValue(mockActionTypes);

      await documentAuditController.getActionTypes(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockActionTypes);
    });
  });

  describe('logAuditEntry', () => {
    it('should log a manual audit entry', async () => {
      req.body = {
        documentId: 'doc-123',
        actionType: 'viewed',
        metadata: { companyId: 'company-789' },
        reason: 'Manual audit'
      };
      req.user = {
        id: 'user-456',
        email: 'user@example.com',
        name: 'Test User',
        role: 'admin'
      };
      req.headers = {
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0'
      };
      req.ip = '192.168.1.1';
      req.originalUrl = '/api/v1/audit/log';

      const mockEntry = {
        auditId: 'audit-123',
        documentId: 'doc-123',
        actionType: 'viewed'
      };

      DocumentAuditService.getActionTypes.mockReturnValue(['viewed', 'edited', 'deleted']);
      DocumentAuditService.logAction.mockResolvedValue(mockEntry);

      await documentAuditController.logAuditEntry(req, res);

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockEntry);
    });

    it('should return 400 when documentId is missing', async () => {
      req.body = {
        actionType: 'viewed'
      };
      req.user = { id: 'user-456' };

      await documentAuditController.logAuditEntry(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('documentId is required');
    });

    it('should return 400 when actionType is missing', async () => {
      req.body = {
        documentId: 'doc-123'
      };
      req.user = { id: 'user-456' };

      await documentAuditController.logAuditEntry(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('actionType is required');
    });

    it('should return 400 when actionType is invalid', async () => {
      req.body = {
        documentId: 'doc-123',
        actionType: 'invalid_action'
      };
      req.user = { id: 'user-456' };

      DocumentAuditService.getActionTypes.mockReturnValue(['viewed', 'edited', 'deleted']);

      await documentAuditController.logAuditEntry(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain('Invalid actionType');
    });

    it('should return 401 when user is not authenticated', async () => {
      req.body = {
        documentId: 'doc-123',
        actionType: 'viewed'
      };
      req.user = {};

      DocumentAuditService.getActionTypes.mockReturnValue(['viewed', 'edited', 'deleted']);

      await documentAuditController.logAuditEntry(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Authentication required');
    });
  });
});
