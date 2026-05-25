/**
 * EquityPlanReport Routes Unit Tests
 * Issue #110: Implement Equity Plan Reports
 * Issue #234: Fix Reports Page 401 Unauthorized Errors
 * TDD: Tests for route configuration and authentication
 */
process.env.SKIP_DB_SETUP = 'true';

const express = require('express');
const request = require('supertest');

// Mock the controller
jest.mock('../../../../controllers/equityPlanReportController', () => ({
  createReport: jest.fn((req, res) => res.status(201).json({ reportId: 'RPT-001' })),
  getReports: jest.fn((req, res) => res.status(200).json([])),
  getReportById: jest.fn((req, res) => res.status(200).json({ reportId: 'RPT-001' })),
  deleteReport: jest.fn((req, res) => res.status(200).json({ message: 'Deleted' })),
  generateOptionPoolSummary: jest.fn((req, res) => res.status(200).json({ generatedData: {} })),
  generateGrantStatusReport: jest.fn((req, res) => res.status(200).json({ generatedData: {} })),
  generateVestingScheduleReport: jest.fn((req, res) => res.status(200).json({ generatedData: {} })),
  generateDilutionAnalysis: jest.fn((req, res) => res.status(200).json({ generatedData: {} })),
  exportReport: jest.fn((req, res) => res.status(200).json({ format: 'json', data: '{}' })),
  getAvailableReportTypes: jest.fn((req, res) => res.status(200).json([{ type: 'option_pool_summary' }])),
  getAvailableFormats: jest.fn((req, res) => res.status(200).json(['json', 'csv', 'pdf', 'excel']))
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
      role: 'employee',
      permissions: [],
      companyId: 'COMP-001'
    };

    next();
  })
};

jest.mock('../../../../middleware/authMiddleware', () => mockAuthMiddleware);

const equityPlanReportRoutes = require('../../../../routes/v1/equityPlanReportRoutes');
const equityPlanReportController = require('../../../../controllers/equityPlanReportController');

describe('EquityPlanReport Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/equity-plan-reports', equityPlanReportRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/equity-plan-reports')
        .expect(401);

      expect(response.body).toEqual({ message: 'No token provided' });
      expect(mockAuthMiddleware.authenticateToken).toHaveBeenCalled();
      expect(equityPlanReportController.getReports).not.toHaveBeenCalled();
    });

    it('should reject requests with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/equity-plan-reports')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toEqual({ message: 'No token provided' });
      expect(mockAuthMiddleware.authenticateToken).toHaveBeenCalled();
    });

    it('should reject requests with Bearer but no token', async () => {
      const response = await request(app)
        .get('/api/v1/equity-plan-reports')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toEqual({ message: 'No token provided' });
    });

    it('should accept requests with valid Bearer token', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(mockAuthMiddleware.authenticateToken).toHaveBeenCalled();
      expect(equityPlanReportController.getReports).toHaveBeenCalled();
    });
  });

  describe('GET /types', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/types')
        .expect(401);

      expect(equityPlanReportController.getAvailableReportTypes).not.toHaveBeenCalled();
    });

    it('should route to getAvailableReportTypes when authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/equity-plan-reports/types')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(equityPlanReportController.getAvailableReportTypes).toHaveBeenCalled();
      expect(response.body).toContainEqual(expect.objectContaining({ type: 'option_pool_summary' }));
    });
  });

  describe('GET /formats', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/formats')
        .expect(401);

      expect(equityPlanReportController.getAvailableFormats).not.toHaveBeenCalled();
    });

    it('should route to getAvailableFormats when authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/equity-plan-reports/formats')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(equityPlanReportController.getAvailableFormats).toHaveBeenCalled();
      expect(response.body).toContain('json');
    });
  });

  describe('POST /generate/option-pool-summary', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/option-pool-summary')
        .send({ companyId: 'COMP-001' })
        .expect(401);

      expect(equityPlanReportController.generateOptionPoolSummary).not.toHaveBeenCalled();
    });

    it('should route to generateOptionPoolSummary when authenticated', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/option-pool-summary')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateOptionPoolSummary).toHaveBeenCalled();
    });
  });

  describe('POST /generate/grant-status', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/grant-status')
        .send({ companyId: 'COMP-001' })
        .expect(401);

      expect(equityPlanReportController.generateGrantStatusReport).not.toHaveBeenCalled();
    });

    it('should route to generateGrantStatusReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/grant-status')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateGrantStatusReport).toHaveBeenCalled();
    });
  });

  describe('POST /generate/vesting-schedule', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/vesting-schedule')
        .send({ companyId: 'COMP-001' })
        .expect(401);

      expect(equityPlanReportController.generateVestingScheduleReport).not.toHaveBeenCalled();
    });

    it('should route to generateVestingScheduleReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/vesting-schedule')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateVestingScheduleReport).toHaveBeenCalled();
    });
  });

  describe('POST /generate/dilution-analysis', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/dilution-analysis')
        .send({ companyId: 'COMP-001' })
        .expect(401);

      expect(equityPlanReportController.generateDilutionAnalysis).not.toHaveBeenCalled();
    });

    it('should route to generateDilutionAnalysis when authenticated', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/dilution-analysis')
        .set('Authorization', 'Bearer valid-token-123')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateDilutionAnalysis).toHaveBeenCalled();
    });
  });

  describe('POST /', () => {
    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports')
        .send({
          reportType: 'option_pool_summary',
          companyId: 'COMP-001'
        })
        .expect(401);

      expect(equityPlanReportController.createReport).not.toHaveBeenCalled();
    });

    it('should route to createReport when authenticated', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports')
        .set('Authorization', 'Bearer valid-token-123')
        .send({
          reportType: 'option_pool_summary',
          companyId: 'COMP-001'
        })
        .expect(201);

      expect(equityPlanReportController.createReport).toHaveBeenCalled();
    });
  });

  describe('GET /', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports')
        .query({ companyId: 'COMP-001' })
        .expect(401);

      expect(equityPlanReportController.getReports).not.toHaveBeenCalled();
    });

    it('should route to getReports when authenticated', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports')
        .set('Authorization', 'Bearer valid-token-123')
        .query({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.getReports).toHaveBeenCalled();
    });
  });

  describe('GET /:id', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/report123')
        .expect(401);

      expect(equityPlanReportController.getReportById).not.toHaveBeenCalled();
    });

    it('should route to getReportById when authenticated', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/report123')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(equityPlanReportController.getReportById).toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    it('should require authentication', async () => {
      await request(app)
        .delete('/api/v1/equity-plan-reports/report123')
        .expect(401);

      expect(equityPlanReportController.deleteReport).not.toHaveBeenCalled();
    });

    it('should route to deleteReport when authenticated', async () => {
      await request(app)
        .delete('/api/v1/equity-plan-reports/report123')
        .set('Authorization', 'Bearer valid-token-123')
        .expect(200);

      expect(equityPlanReportController.deleteReport).toHaveBeenCalled();
    });
  });

  describe('GET /:id/export', () => {
    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/report123/export')
        .query({ format: 'csv' })
        .expect(401);

      expect(equityPlanReportController.exportReport).not.toHaveBeenCalled();
    });

    it('should route to exportReport when authenticated', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/report123/export')
        .set('Authorization', 'Bearer valid-token-123')
        .query({ format: 'csv' })
        .expect(200);

      expect(equityPlanReportController.exportReport).toHaveBeenCalled();
    });
  });
});
