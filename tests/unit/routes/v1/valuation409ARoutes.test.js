/**
 * 409A Valuation Routes Unit Tests
 *
 * Verifies route registration, middleware chain, and controller delegation
 * for all 409A valuation endpoints including CRUD, workflow, compliance,
 * and audit trail.
 */

const request = require('supertest');
const express = require('express');

// Mock middleware
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user', role: 'admin', companyId: 'co-001' };
    next();
  }
}));

jest.mock('../../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ message: 'Forbidden' });
  },
  hasPermission: () => (req, res, next) => next(),
  hasAgentCapability: () => (req, res, next) => next()
}));

jest.mock('../../../../middleware/auditLog', () => ({
  auditAction: () => (req, res, next) => next()
}));

jest.mock('../../../../services/valuation409ATriggerService', () => ({
  analyzeStaleness: jest.fn().mockResolvedValue({
    isStale: false,
    daysSinceLastValuation: 120,
    triggerConditions: []
  })
}));

jest.mock('../../../../controllers/valuation409AController', () => ({
  getAllValuations: jest.fn((req, res) => res.status(200).json({ valuations: [] })),
  getValuationAnalytics: jest.fn((req, res) => res.status(200).json({ analytics: {} })),
  createValuationRequest: jest.fn((req, res) => res.status(201).json({ valuation: req.body })),
  getCompanyValuations: jest.fn((req, res) => res.status(200).json({ valuations: [] })),
  getValuation: jest.fn((req, res) => res.status(200).json({ valuation: { _id: req.params.valuationId } })),
  updateValuation: jest.fn((req, res) => res.status(200).json({ valuation: req.body })),
  deleteValuation: jest.fn((req, res) => res.status(200).json({ message: 'deleted' })),
  assignValuationFirm: jest.fn((req, res) => res.status(200).json({ assigned: true })),
  receiveDraft: jest.fn((req, res) => res.status(200).json({ received: true })),
  startReview: jest.fn((req, res) => res.status(200).json({ reviewing: true })),
  approveValuation: jest.fn((req, res) => res.status(200).json({ approved: true })),
  cancelValuation: jest.fn((req, res) => res.status(200).json({ cancelled: true })),
  addDocument: jest.fn((req, res) => res.status(200).json({ added: true })),
  getCurrentValuation: jest.fn((req, res) => res.status(200).json({ valuation: {} })),
  getExpiringValuations: jest.fn((req, res) => res.status(200).json({ valuations: [] })),
  getValuationHistory: jest.fn((req, res) => res.status(200).json({ history: [] })),
  getCompanySummary: jest.fn((req, res) => res.status(200).json({ summary: {} })),
  processExpiredValuations: jest.fn((req, res) => res.status(200).json({ processed: 0 })),
  getLatestValuation: jest.fn((req, res) => res.status(200).json({ valuation: null })),
  getValuationAuditTrail: jest.fn((req, res) => res.status(200).json({ auditTrail: [] })),
  generateIRSComplianceReport: jest.fn((req, res) => res.status(200).json({ report: {} })),
  generateGAAPComplianceReport: jest.fn((req, res) => res.status(200).json({ report: {} })),
  generateAuditReport: jest.fn((req, res) => res.status(200).json({ report: {} })),
  exportAuditData: jest.fn((req, res) => res.status(200).json({ export: {} })),
  submitInputs: jest.fn((req, res) => res.status(200).json({ submitted: true })),
  createPaymentSession: jest.fn((req, res) => res.status(200).json({ sessionId: 'sess-001' })),
  markPaid: jest.fn((req, res) => res.status(200).json({ paid: true })),
  runAI: jest.fn((req, res) => res.status(200).json({ started: true })),
  getAIStatus: jest.fn((req, res) => res.status(200).json({ status: 'pending' })),
  getAIReport: jest.fn((req, res) => res.status(200).json({ report: {} })),
  downloadPDF: jest.fn((req, res) => res.status(200).json({ url: 'pdf-url' }))
}));

const valuationRoutes = require('../../../../routes/v1/valuation409ARoutes');
const valuationController = require('../../../../controllers/valuation409AController');
const triggerService = require('../../../../services/valuation409ATriggerService');

describe('409A Valuation Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/valuations', valuationRoutes);
    jest.clearAllMocks();
  });

  // ── CRUD Operations ──────────────────────────────────────────────────

  describe('GET /api/v1/valuations', () => {
    it('should route to getAllValuations', async () => {
      const response = await request(app).get('/api/v1/valuations');

      expect(response.status).toBe(200);
      expect(valuationController.getAllValuations).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/analytics', () => {
    it('should route to getValuationAnalytics', async () => {
      const response = await request(app).get('/api/v1/valuations/analytics');

      expect(response.status).toBe(200);
      expect(valuationController.getValuationAnalytics).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations', () => {
    it('should route to createValuationRequest', async () => {
      const response = await request(app)
        .post('/api/v1/valuations')
        .send({ companyId: 'co-001', reason: 'annual_valuation' });

      expect(response.status).toBe(201);
      expect(valuationController.createValuationRequest).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/:valuationId', () => {
    it('should route to getValuation', async () => {
      const response = await request(app).get('/api/v1/valuations/val-001');

      expect(response.status).toBe(200);
      expect(valuationController.getValuation).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/valuations/:valuationId', () => {
    it('should route to updateValuation', async () => {
      const response = await request(app)
        .put('/api/v1/valuations/val-001')
        .send({ reason: 'fundraising_round' });

      expect(response.status).toBe(200);
      expect(valuationController.updateValuation).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/valuations/:valuationId', () => {
    it('should route to deleteValuation', async () => {
      const response = await request(app).delete('/api/v1/valuations/val-001');

      expect(response.status).toBe(200);
      expect(valuationController.deleteValuation).toHaveBeenCalled();
    });
  });

  // ── Valuation Workflow ───────────────────────────────────────────────

  describe('POST /api/v1/valuations/:valuationId/assign-firm', () => {
    it('should route to assignValuationFirm', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/assign-firm')
        .send({ name: 'ValuationCo', contactEmail: 'firm@example.com' });

      expect(response.status).toBe(200);
      expect(valuationController.assignValuationFirm).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/receive-draft', () => {
    it('should route to receiveDraft', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/receive-draft')
        .send({ fairMarketValue: 5.25, valuationMethod: 'income' });

      expect(response.status).toBe(200);
      expect(valuationController.receiveDraft).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/start-review', () => {
    it('should route to startReview', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/start-review');

      expect(response.status).toBe(200);
      expect(valuationController.startReview).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/approve', () => {
    it('should route to approveValuation', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/approve')
        .send({ resolution: 'Board approved', notes: 'Unanimous' });

      expect(response.status).toBe(200);
      expect(valuationController.approveValuation).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/cancel', () => {
    it('should route to cancelValuation', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/cancel')
        .send({ reason: 'No longer needed' });

      expect(response.status).toBe(200);
      expect(valuationController.cancelValuation).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/documents', () => {
    it('should route to addDocument', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/documents')
        .send({ documentId: 'doc-001', type: 'valuation_report' });

      expect(response.status).toBe(200);
      expect(valuationController.addDocument).toHaveBeenCalled();
    });
  });

  // ── Company-scoped endpoints ─────────────────────────────────────────

  describe('GET /api/v1/valuations/company/:companyId', () => {
    it('should route to getCompanyValuations', async () => {
      const response = await request(app).get('/api/v1/valuations/company/co-001');

      expect(response.status).toBe(200);
      expect(valuationController.getCompanyValuations).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/company/:companyId/current', () => {
    it('should route to getCurrentValuation', async () => {
      const response = await request(app).get('/api/v1/valuations/company/co-001/current');

      expect(response.status).toBe(200);
      expect(valuationController.getCurrentValuation).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/company/:companyId/history', () => {
    it('should route to getValuationHistory', async () => {
      const response = await request(app).get('/api/v1/valuations/company/co-001/history');

      expect(response.status).toBe(200);
      expect(valuationController.getValuationHistory).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/company/:companyId/summary', () => {
    it('should route to getCompanySummary', async () => {
      const response = await request(app).get('/api/v1/valuations/company/co-001/summary');

      expect(response.status).toBe(200);
      expect(valuationController.getCompanySummary).toHaveBeenCalled();
    });
  });

  // ── Expiring and latest ──────────────────────────────────────────────

  describe('GET /api/v1/valuations/latest', () => {
    it('should route to getLatestValuation', async () => {
      const response = await request(app).get('/api/v1/valuations/latest?companyId=co-001');

      expect(response.status).toBe(200);
      expect(valuationController.getLatestValuation).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/expiring', () => {
    it('should route to getExpiringValuations', async () => {
      const response = await request(app).get('/api/v1/valuations/expiring?days=60');

      expect(response.status).toBe(200);
      expect(valuationController.getExpiringValuations).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/process-expired', () => {
    it('should route to processExpiredValuations', async () => {
      const response = await request(app).post('/api/v1/valuations/process-expired');

      expect(response.status).toBe(200);
      expect(valuationController.processExpiredValuations).toHaveBeenCalled();
    });
  });

  // ── Staleness Check (inline handler) ─────────────────────────────────

  describe('GET /api/v1/valuations/409a/staleness-check', () => {
    it('should return staleness analysis when companyId is provided', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/409a/staleness-check?companyId=co-001');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isStale', false);
      expect(triggerService.analyzeStaleness).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'co-001' })
      );
    });

    it('should return 400 when companyId is missing', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/409a/staleness-check');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'companyId query parameter is required');
    });

    it('should return 500 when service throws an error', async () => {
      triggerService.analyzeStaleness.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/v1/valuations/409a/staleness-check?companyId=co-001');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Service unavailable');
    });
  });

  // ── AI-powered workflow ──────────────────────────────────────────────

  describe('POST /api/v1/valuations/:valuationId/submit-inputs', () => {
    it('should route to submitInputs', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/submit-inputs')
        .send({ revenue: 1000000, employees: 25 });

      expect(response.status).toBe(200);
      expect(valuationController.submitInputs).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/payment-session', () => {
    it('should route to createPaymentSession', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/payment-session');

      expect(response.status).toBe(200);
      expect(valuationController.createPaymentSession).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/mark-paid', () => {
    it('should route to markPaid', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/mark-paid');

      expect(response.status).toBe(200);
      expect(valuationController.markPaid).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/valuations/:valuationId/run-ai', () => {
    it('should route to runAI', async () => {
      const response = await request(app)
        .post('/api/v1/valuations/val-001/run-ai');

      expect(response.status).toBe(200);
      expect(valuationController.runAI).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/:valuationId/ai-status', () => {
    it('should route to getAIStatus', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/val-001/ai-status');

      expect(response.status).toBe(200);
      expect(valuationController.getAIStatus).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/:valuationId/report', () => {
    it('should route to getAIReport', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/val-001/report');

      expect(response.status).toBe(200);
      expect(valuationController.getAIReport).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/:valuationId/pdf', () => {
    it('should route to downloadPDF', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/val-001/pdf');

      expect(response.status).toBe(200);
      expect(valuationController.downloadPDF).toHaveBeenCalled();
    });
  });

  // ── Audit Trail ──────────────────────────────────────────────────────

  describe('GET /api/v1/valuations/:valuationId/audit-trail', () => {
    it('should route to getValuationAuditTrail', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/val-001/audit-trail');

      expect(response.status).toBe(200);
      expect(valuationController.getValuationAuditTrail).toHaveBeenCalled();
    });
  });

  // ── Compliance Reports ───────────────────────────────────────────────

  describe('GET /api/v1/valuations/company/:companyId/compliance/irs', () => {
    it('should route to generateIRSComplianceReport', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/company/co-001/compliance/irs?fiscalYear=2026');

      expect(response.status).toBe(200);
      expect(valuationController.generateIRSComplianceReport).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/company/:companyId/compliance/gaap', () => {
    it('should route to generateGAAPComplianceReport', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/company/co-001/compliance/gaap?fiscalYear=2026');

      expect(response.status).toBe(200);
      expect(valuationController.generateGAAPComplianceReport).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/company/:companyId/audit-report', () => {
    it('should route to generateAuditReport', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/company/co-001/audit-report');

      expect(response.status).toBe(200);
      expect(valuationController.generateAuditReport).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/valuations/company/:companyId/audit-export', () => {
    it('should route to exportAuditData', async () => {
      const response = await request(app)
        .get('/api/v1/valuations/company/co-001/audit-export?format=json');

      expect(response.status).toBe(200);
      expect(valuationController.exportAuditData).toHaveBeenCalled();
    });
  });
});
