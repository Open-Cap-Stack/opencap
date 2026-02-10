/**
 * DocumentAuditRoutes Tests
 *
 * Issue #102: Add Document Audit Trail
 *
 * Tests for the document audit routes configuration.
 */

const express = require('express');
const request = require('supertest');

// Mock auth middleware before requiring routes
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  },
  authenticate: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin' };
    next();
  }
}));

const documentAuditRoutes = require('../../../../routes/v1/documentAuditRoutes');
const documentAuditController = require('../../../../controllers/documentAuditController');

// Mock the controller
jest.mock('../../../../controllers/documentAuditController', () => ({
  getDocumentAuditTrail: jest.fn((req, res) => res.status(200).json({ success: true })),
  getAuditByUser: jest.fn((req, res) => res.status(200).json({ success: true })),
  getAuditByDateRange: jest.fn((req, res) => res.status(200).json({ success: true })),
  generateAuditReport: jest.fn((req, res) => res.status(200).json({ success: true })),
  searchAuditTrail: jest.fn((req, res) => res.status(200).json({ success: true })),
  getDocumentAuditStats: jest.fn((req, res) => res.status(200).json({ success: true })),
  getActionTypes: jest.fn((req, res) => res.status(200).json({ success: true })),
  logAuditEntry: jest.fn((req, res) => res.status(201).json({ success: true }))
}));

describe('DocumentAuditRoutes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/audit', documentAuditRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/audit/action-types', () => {
    it('should call getActionTypes controller', async () => {
      const response = await request(app)
        .get('/api/v1/audit/action-types');

      expect(response.status).toBe(200);
      expect(documentAuditController.getActionTypes).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/audit/search', () => {
    it('should call searchAuditTrail controller', async () => {
      const response = await request(app)
        .get('/api/v1/audit/search')
        .query({
          documentId: 'doc-123',
          actionType: 'viewed',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(documentAuditController.searchAuditTrail).toHaveBeenCalled();
    });

    it('should pass query parameters correctly', async () => {
      await request(app)
        .get('/api/v1/audit/search')
        .query({
          companyId: 'company-789',
          userId: 'user-456',
          keyword: 'admin'
        });

      const calledReq = documentAuditController.searchAuditTrail.mock.calls[0][0];
      expect(calledReq.query.companyId).toBe('company-789');
      expect(calledReq.query.userId).toBe('user-456');
      expect(calledReq.query.keyword).toBe('admin');
    });
  });

  describe('GET /api/v1/audit/date-range', () => {
    it('should call getAuditByDateRange controller', async () => {
      const response = await request(app)
        .get('/api/v1/audit/date-range')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(documentAuditController.getAuditByDateRange).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/audit/user/:userId', () => {
    it('should call getAuditByUser controller', async () => {
      const response = await request(app)
        .get('/api/v1/audit/user/user-456');

      expect(response.status).toBe(200);
      expect(documentAuditController.getAuditByUser).toHaveBeenCalled();
    });

    it('should pass userId parameter correctly', async () => {
      await request(app)
        .get('/api/v1/audit/user/user-789');

      const calledReq = documentAuditController.getAuditByUser.mock.calls[0][0];
      expect(calledReq.params.userId).toBe('user-789');
    });
  });

  describe('POST /api/v1/audit/report', () => {
    it('should call generateAuditReport controller', async () => {
      const response = await request(app)
        .post('/api/v1/audit/report')
        .send({
          companyId: 'company-789',
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      expect(response.status).toBe(200);
      expect(documentAuditController.generateAuditReport).toHaveBeenCalled();
    });

    it('should pass body parameters correctly', async () => {
      await request(app)
        .post('/api/v1/audit/report')
        .send({
          companyId: 'company-abc',
          startDate: '2024-02-01',
          endDate: '2024-02-29',
          reportType: 'summary'
        });

      const calledReq = documentAuditController.generateAuditReport.mock.calls[0][0];
      expect(calledReq.body.companyId).toBe('company-abc');
      expect(calledReq.body.reportType).toBe('summary');
    });
  });

  describe('POST /api/v1/audit/log', () => {
    it('should call logAuditEntry controller', async () => {
      const response = await request(app)
        .post('/api/v1/audit/log')
        .send({
          documentId: 'doc-123',
          actionType: 'viewed'
        });

      expect(response.status).toBe(201);
      expect(documentAuditController.logAuditEntry).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/audit/documents/:documentId', () => {
    it('should call getDocumentAuditTrail controller', async () => {
      const response = await request(app)
        .get('/api/v1/audit/documents/doc-123');

      expect(response.status).toBe(200);
      expect(documentAuditController.getDocumentAuditTrail).toHaveBeenCalled();
    });

    it('should pass documentId parameter correctly', async () => {
      await request(app)
        .get('/api/v1/audit/documents/doc-xyz');

      const calledReq = documentAuditController.getDocumentAuditTrail.mock.calls[0][0];
      expect(calledReq.params.documentId).toBe('doc-xyz');
    });

    it('should pass query filters correctly', async () => {
      await request(app)
        .get('/api/v1/audit/documents/doc-123')
        .query({
          actionType: 'edited',
          startDate: '2024-01-01',
          limit: '50'
        });

      const calledReq = documentAuditController.getDocumentAuditTrail.mock.calls[0][0];
      expect(calledReq.query.actionType).toBe('edited');
      expect(calledReq.query.startDate).toBe('2024-01-01');
      expect(calledReq.query.limit).toBe('50');
    });
  });

  describe('GET /api/v1/audit/documents/:documentId/stats', () => {
    it('should call getDocumentAuditStats controller', async () => {
      const response = await request(app)
        .get('/api/v1/audit/documents/doc-123/stats');

      expect(response.status).toBe(200);
      expect(documentAuditController.getDocumentAuditStats).toHaveBeenCalled();
    });

    it('should pass documentId and date filters correctly', async () => {
      await request(app)
        .get('/api/v1/audit/documents/doc-456/stats')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        });

      const calledReq = documentAuditController.getDocumentAuditStats.mock.calls[0][0];
      expect(calledReq.params.documentId).toBe('doc-456');
      expect(calledReq.query.startDate).toBe('2024-01-01');
      expect(calledReq.query.endDate).toBe('2024-01-31');
    });
  });

  describe('Route Structure', () => {
    it('should have all expected routes defined', () => {
      const routes = [];
      documentAuditRoutes.stack.forEach(layer => {
        if (layer.route) {
          routes.push({
            path: layer.route.path,
            methods: Object.keys(layer.route.methods)
          });
        }
      });

      // Check for expected routes
      expect(routes).toContainEqual({ path: '/action-types', methods: ['get'] });
      expect(routes).toContainEqual({ path: '/search', methods: ['get'] });
      expect(routes).toContainEqual({ path: '/date-range', methods: ['get'] });
      expect(routes).toContainEqual({ path: '/user/:userId', methods: ['get'] });
      expect(routes).toContainEqual({ path: '/report', methods: ['post'] });
      expect(routes).toContainEqual({ path: '/log', methods: ['post'] });
      expect(routes).toContainEqual({ path: '/documents/:documentId', methods: ['get'] });
      expect(routes).toContainEqual({ path: '/documents/:documentId/stats', methods: ['get'] });
    });
  });
});
