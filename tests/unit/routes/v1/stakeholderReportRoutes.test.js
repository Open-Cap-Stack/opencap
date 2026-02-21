/**
 * Stakeholder Report Routes Unit Tests
 * Issue #234: Fix Reports Page 401 Unauthorized Errors
 * TDD: Tests for authentication middleware on stakeholder report routes
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock the controller before requiring routes
jest.mock('../../../../controllers/stakeholderReportController', () => ({
  getStakeholderReports: jest.fn((req, res) => res.status(200).json({ reports: [] })),
  generateHoldingsReport: jest.fn((req, res) => res.status(201).json({ reportId: 'RPT-001' })),
  generateTransactionsReport: jest.fn((req, res) => res.status(201).json({ reportId: 'RPT-002' })),
  generateValuationsReport: jest.fn((req, res) => res.status(201).json({ reportId: 'RPT-003' })),
  generateTaxReport: jest.fn((req, res) => res.status(201).json({ reportId: 'RPT-004' })),
  scheduleAutomatedDelivery: jest.fn((req, res) => res.status(201).json({ scheduleId: 'SCH-001' })),
  emailReport: jest.fn((req, res) => res.status(200).json({ status: 'sent' })),
  getReportById: jest.fn((req, res) => res.status(200).json({ reportId: 'RPT-001' })),
  downloadReport: jest.fn((req, res) => res.status(200).json({ downloadUrl: 'https://example.com/report.pdf' }))
}));

// Mock authentication middleware
const mockAuthMiddleware = {
  authenticateToken: jest.fn((req, res, next) => {
    // Check for Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Mock successful authentication
    req.user = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
      permissions: [],
      companyId: 'COMP-001'
    };

    next();
  })
};

jest.mock('../../../../middleware/authMiddleware', () => mockAuthMiddleware);

const stakeholderReportRoutes = require('../../../../routes/v1/stakeholderReportRoutes');
const stakeholderReportController = require('../../../../controllers/stakeholderReportController');

describe('Stakeholder Report Routes - Authentication Tests', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/stakeholders', stakeholderReportRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/stakeholders/SH-001/reports')
        .expect(401);

      expect(response.body).toEqual({ message: 'No token provided' });
      expect(mockAuthMiddleware.authenticateToken).toHaveBeenCalled();
      expect(stakeholderReportController.getStakeholderReports).not.toHaveBeenCalled();
    });

    it('should reject requests with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/stakeholders/SH-001/reports')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toEqual({ message: 'No token provided' });
      expect(mockAuthMiddleware.authenticateToken).toHaveBeenCalled();
    });

    it('should reject requests with Bearer but no token', async () => {
      const response = await request(app)
        .get('/api/v1/stakeholders/SH-001/reports')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toEqual({ message: 'No token provided' });
    });

    it('should accept requests with valid Bearer token', async () => {
      await request(app)
        .get('/api/v1/stakeholders/SH-001/reports')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(mockAuthMiddleware.authenticateToken).toHaveBeenCalled();
      expect(stakeholderReportController.getStakeholderReports).toHaveBeenCalled();
    });
  });

  describe('GET /:id/reports', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/stakeholders/SH-001/reports')
        .expect(401);

      expect(stakeholderReportController.getStakeholderReports).not.toHaveBeenCalled();
    });

    it('should route to getStakeholderReports when authenticated', async () => {
      await request(app)
        .get('/api/v1/stakeholders/SH-001/reports')
        .set('Authorization', 'Bearer valid-token-123')
        .query({ reportType: 'holdings' })
        .expect(200);

      expect(stakeholderReportController.getStakeholderReports).toHaveBeenCalled();
    });
  });

  describe('POST /:id/reports/holdings', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/holdings')
        .send({ companyId: 'COMP-001' })
        .expect(401);

      expect(stakeholderReportController.generateHoldingsReport).not.toHaveBeenCalled();
    });

    it('should route to generateHoldingsReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/holdings')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001', format: 'pdf' })
        .expect(201);

      expect(stakeholderReportController.generateHoldingsReport).toHaveBeenCalled();
    });
  });

  describe('POST /:id/reports/transactions', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/transactions')
        .send({ companyId: 'COMP-001' })
        .expect(401);

      expect(stakeholderReportController.generateTransactionsReport).not.toHaveBeenCalled();
    });

    it('should route to generateTransactionsReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/transactions')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001', startDate: '2024-01-01', endDate: '2024-12-31' })
        .expect(201);

      expect(stakeholderReportController.generateTransactionsReport).toHaveBeenCalled();
    });
  });

  describe('POST /:id/reports/valuations', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/valuations')
        .send({ companyId: 'COMP-001' })
        .expect(401);

      expect(stakeholderReportController.generateValuationsReport).not.toHaveBeenCalled();
    });

    it('should route to generateValuationsReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/valuations')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001' })
        .expect(201);

      expect(stakeholderReportController.generateValuationsReport).toHaveBeenCalled();
    });
  });

  describe('POST /:id/reports/tax', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/tax')
        .send({ companyId: 'COMP-001', taxYear: 2023 })
        .expect(401);

      expect(stakeholderReportController.generateTaxReport).not.toHaveBeenCalled();
    });

    it('should route to generateTaxReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/tax')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001', taxYear: 2023 })
        .expect(201);

      expect(stakeholderReportController.generateTaxReport).toHaveBeenCalled();
    });
  });

  describe('POST /:id/reports/schedule', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/schedule')
        .send({
          companyId: 'COMP-001',
          reportType: 'holdings',
          schedule: '0 9 1 * *',
          recipients: ['test@example.com']
        })
        .expect(401);

      expect(stakeholderReportController.scheduleAutomatedDelivery).not.toHaveBeenCalled();
    });

    it('should route to scheduleAutomatedDelivery when authenticated', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/schedule')
        .set('Authorization', 'Bearer valid-token-123')
        .send({
          companyId: 'COMP-001',
          reportType: 'holdings',
          schedule: '0 9 1 * *',
          recipients: ['test@example.com']
        })
        .expect(201);

      expect(stakeholderReportController.scheduleAutomatedDelivery).toHaveBeenCalled();
    });
  });

  describe('POST /:id/reports/:reportId/email', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/RPT-001/email')
        .send({ to: 'investor@example.com' })
        .expect(401);

      expect(stakeholderReportController.emailReport).not.toHaveBeenCalled();
    });

    it('should route to emailReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/stakeholders/SH-001/reports/RPT-001/email')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ to: 'investor@example.com' })
        .expect(200);

      expect(stakeholderReportController.emailReport).toHaveBeenCalled();
    });
  });

  describe('GET /:id/reports/:reportId', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/stakeholders/SH-001/reports/RPT-001')
        .expect(401);

      expect(stakeholderReportController.getReportById).not.toHaveBeenCalled();
    });

    it('should route to getReportById when authenticated', async () => {
      await request(app)
        .get('/api/v1/stakeholders/SH-001/reports/RPT-001')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(stakeholderReportController.getReportById).toHaveBeenCalled();
    });
  });

  describe('GET /:id/reports/:reportId/download', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/stakeholders/SH-001/reports/RPT-001/download')
        .expect(401);

      expect(stakeholderReportController.downloadReport).not.toHaveBeenCalled();
    });

    it('should route to downloadReport when authenticated', async () => {
      await request(app)
        .get('/api/v1/stakeholders/SH-001/reports/RPT-001/download')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(stakeholderReportController.downloadReport).toHaveBeenCalled();
    });
  });
});
