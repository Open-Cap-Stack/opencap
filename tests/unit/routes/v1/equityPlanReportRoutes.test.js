/**
 * EquityPlanReport Routes Unit Tests
 * Issue #110: Implement Equity Plan Reports
 * TDD: Tests for route configuration
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

  describe('GET /types', () => {
    it('should route to getAvailableReportTypes', async () => {
      const response = await request(app)
        .get('/api/v1/equity-plan-reports/types')
        .expect(200);

      expect(equityPlanReportController.getAvailableReportTypes).toHaveBeenCalled();
      expect(response.body).toContainEqual(expect.objectContaining({ type: 'option_pool_summary' }));
    });
  });

  describe('GET /formats', () => {
    it('should route to getAvailableFormats', async () => {
      const response = await request(app)
        .get('/api/v1/equity-plan-reports/formats')
        .expect(200);

      expect(equityPlanReportController.getAvailableFormats).toHaveBeenCalled();
      expect(response.body).toContain('json');
    });
  });

  describe('POST /generate/option-pool-summary', () => {
    it('should route to generateOptionPoolSummary', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/option-pool-summary')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateOptionPoolSummary).toHaveBeenCalled();
    });
  });

  describe('POST /generate/grant-status', () => {
    it('should route to generateGrantStatusReport', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/grant-status')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateGrantStatusReport).toHaveBeenCalled();
    });
  });

  describe('POST /generate/vesting-schedule', () => {
    it('should route to generateVestingScheduleReport', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/vesting-schedule')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateVestingScheduleReport).toHaveBeenCalled();
    });
  });

  describe('POST /generate/dilution-analysis', () => {
    it('should route to generateDilutionAnalysis', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports/generate/dilution-analysis')
        .send({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.generateDilutionAnalysis).toHaveBeenCalled();
    });
  });

  describe('POST /', () => {
    it('should route to createReport', async () => {
      await request(app)
        .post('/api/v1/equity-plan-reports')
        .send({
          reportType: 'option_pool_summary',
          companyId: 'COMP-001'
        })
        .expect(201);

      expect(equityPlanReportController.createReport).toHaveBeenCalled();
    });
  });

  describe('GET /', () => {
    it('should route to getReports', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports')
        .query({ companyId: 'COMP-001' })
        .expect(200);

      expect(equityPlanReportController.getReports).toHaveBeenCalled();
    });
  });

  describe('GET /:id', () => {
    it('should route to getReportById', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/report123')
        .expect(200);

      expect(equityPlanReportController.getReportById).toHaveBeenCalled();
    });
  });

  describe('DELETE /:id', () => {
    it('should route to deleteReport', async () => {
      await request(app)
        .delete('/api/v1/equity-plan-reports/report123')
        .expect(200);

      expect(equityPlanReportController.deleteReport).toHaveBeenCalled();
    });
  });

  describe('GET /:id/export', () => {
    it('should route to exportReport', async () => {
      await request(app)
        .get('/api/v1/equity-plan-reports/report123/export')
        .query({ format: 'csv' })
        .expect(200);

      expect(equityPlanReportController.exportReport).toHaveBeenCalled();
    });
  });
});
