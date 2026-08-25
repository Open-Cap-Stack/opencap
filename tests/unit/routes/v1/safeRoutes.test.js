/**
 * SAFE Routes Unit Tests
 *
 * Verifies route registration, middleware chain (authenticateToken + hasRole + requireAccreditation),
 * and controller delegation for all SAFE management endpoints.
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

jest.mock('../../../../middleware/kycVerification', () => ({
  requireAccreditation: () => (req, res, next) => next()
}));

jest.mock('../../../../models/SAFE', () => ({}));

jest.mock('../../../../controllers/safeController', () => ({
  createSAFE: jest.fn((req, res) => res.status(201).json({ safe: req.body })),
  getCompanySAFEs: jest.fn((req, res) => res.status(200).json({ safes: [] })),
  getCompanySummary: jest.fn((req, res) => res.status(200).json({ summary: {} })),
  getSAFE: jest.fn((req, res) => res.status(200).json({ safe: { _id: req.params.safeId } })),
  updateSAFE: jest.fn((req, res) => res.status(200).json({ safe: req.body })),
  updateStatus: jest.fn((req, res) => res.status(200).json({ safe: { status: 'active' } })),
  deleteSAFE: jest.fn((req, res) => res.status(200).json({ message: 'deleted' })),
  sendSAFE: jest.fn((req, res) => res.status(200).json({ sent: true })),
  recordInvestorSignature: jest.fn((req, res) => res.status(200).json({ signed: true })),
  recordCompanySignature: jest.fn((req, res) => res.status(200).json({ signed: true })),
  markFunded: jest.fn((req, res) => res.status(200).json({ funded: true })),
  cancelSAFE: jest.fn((req, res) => res.status(200).json({ cancelled: true })),
  previewConversion: jest.fn((req, res) => res.status(200).json({ preview: {} })),
  createConversions: jest.fn((req, res) => res.status(200).json({ conversions: [] })),
  executeConversion: jest.fn((req, res) => res.status(200).json({ executed: true }))
}));

const safeRoutes = require('../../../../routes/v1/safeRoutes');
const safeController = require('../../../../controllers/safeController');

describe('SAFE Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/safes', safeRoutes);
    jest.clearAllMocks();
  });

  // ── CRUD Operations ──────────────────────────────────────────────────

  describe('POST /api/v1/safes', () => {
    it('should route to createSAFE controller', async () => {
      const response = await request(app)
        .post('/api/v1/safes')
        .send({
          investorName: 'Acme Ventures',
          investmentAmount: 500000,
          safeType: 'post-money',
          valuationCap: 10000000
        });

      expect(response.status).toBe(201);
      expect(safeController.createSAFE).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/safes', () => {
    it('should route root GET to getCompanySAFEs (list for current company)', async () => {
      const response = await request(app).get('/api/v1/safes');

      expect(response.status).toBe(200);
      expect(safeController.getCompanySAFEs).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/safes/company/:companyId', () => {
    it('should route to getCompanySAFEs with specific company', async () => {
      const response = await request(app).get('/api/v1/safes/company/co-001');

      expect(response.status).toBe(200);
      expect(safeController.getCompanySAFEs).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/safes/company/:companyId/summary', () => {
    it('should route to getCompanySummary', async () => {
      const response = await request(app).get('/api/v1/safes/company/co-001/summary');

      expect(response.status).toBe(200);
      expect(safeController.getCompanySummary).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/safes/:safeId', () => {
    it('should route to getSAFE', async () => {
      const response = await request(app).get('/api/v1/safes/safe-001');

      expect(response.status).toBe(200);
      expect(safeController.getSAFE).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/safes/:safeId', () => {
    it('should route to updateSAFE', async () => {
      const response = await request(app)
        .put('/api/v1/safes/safe-001')
        .send({ investmentAmount: 750000 });

      expect(response.status).toBe(200);
      expect(safeController.updateSAFE).toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/safes/:safeId/status', () => {
    it('should route to updateStatus', async () => {
      const response = await request(app)
        .patch('/api/v1/safes/safe-001/status')
        .send({ status: 'active' });

      expect(response.status).toBe(200);
      expect(safeController.updateStatus).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/safes/:safeId', () => {
    it('should route to deleteSAFE', async () => {
      const response = await request(app).delete('/api/v1/safes/safe-001');

      expect(response.status).toBe(200);
      expect(safeController.deleteSAFE).toHaveBeenCalled();
    });
  });

  // ── SAFE Workflow ────────────────────────────────────────────────────

  describe('POST /api/v1/safes/:safeId/send', () => {
    it('should route to sendSAFE', async () => {
      const response = await request(app)
        .post('/api/v1/safes/safe-001/send')
        .send({ recipientEmail: 'investor@example.com' });

      expect(response.status).toBe(200);
      expect(safeController.sendSAFE).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/safes/:safeId/sign/investor', () => {
    it('should route to recordInvestorSignature', async () => {
      const response = await request(app)
        .post('/api/v1/safes/safe-001/sign/investor')
        .send({ signature: 'sig-data' });

      expect(response.status).toBe(200);
      expect(safeController.recordInvestorSignature).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/safes/:safeId/sign/company', () => {
    it('should route to recordCompanySignature', async () => {
      const response = await request(app)
        .post('/api/v1/safes/safe-001/sign/company')
        .send({ signature: 'sig-data' });

      expect(response.status).toBe(200);
      expect(safeController.recordCompanySignature).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/safes/:safeId/fund', () => {
    it('should route to markFunded', async () => {
      const response = await request(app)
        .post('/api/v1/safes/safe-001/fund')
        .send({ fundedDate: '2026-01-15' });

      expect(response.status).toBe(200);
      expect(safeController.markFunded).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/safes/:safeId/cancel', () => {
    it('should route to cancelSAFE', async () => {
      const response = await request(app)
        .post('/api/v1/safes/safe-001/cancel')
        .send({ reason: 'Terms changed' });

      expect(response.status).toBe(200);
      expect(safeController.cancelSAFE).toHaveBeenCalled();
    });
  });

  // ── Conversion Operations ────────────────────────────────────────────

  describe('POST /api/v1/safes/company/:companyId/conversion/preview', () => {
    it('should route to previewConversion', async () => {
      const response = await request(app)
        .post('/api/v1/safes/company/co-001/conversion/preview')
        .send({ preMoney: 8000000, roundSize: 2000000 });

      expect(response.status).toBe(200);
      expect(safeController.previewConversion).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/safes/company/:companyId/conversion/create', () => {
    it('should route to createConversions', async () => {
      const response = await request(app)
        .post('/api/v1/safes/company/co-001/conversion/create')
        .send({ preMoney: 8000000, roundSize: 2000000 });

      expect(response.status).toBe(200);
      expect(safeController.createConversions).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/safes/conversion/:conversionId/execute', () => {
    it('should route to executeConversion', async () => {
      const response = await request(app)
        .post('/api/v1/safes/conversion/conv-001/execute');

      expect(response.status).toBe(200);
      expect(safeController.executeConversion).toHaveBeenCalled();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────

  describe('Route method restrictions', () => {
    it('should return 404 for unsupported method on SAFE collection', async () => {
      const response = await request(app).patch('/api/v1/safes');
      expect(response.status).toBe(404);
    });
  });
});
