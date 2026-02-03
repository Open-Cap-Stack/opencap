/**
 * EquityPlanReport Controller Unit Tests
 * Issue #110: Implement Equity Plan Reports
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn()
}));

jest.mock('../../../services/equityPlanReportService', () => ({
  generateReportId: jest.fn().mockReturnValue('RPT-TEST-001'),
  generateOptionPoolSummary: jest.fn(),
  generateGrantStatusReport: jest.fn(),
  generateVestingScheduleReport: jest.fn(),
  generateDilutionAnalysis: jest.fn(),
  exportReport: jest.fn(),
  createReport: jest.fn(),
  getReportById: jest.fn(),
  getReportsByCompany: jest.fn(),
  updateReportStatus: jest.fn(),
  deleteReport: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const equityPlanReportController = require('../../../controllers/equityPlanReportController');
const equityPlanReportService = require('../../../services/equityPlanReportService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('EquityPlanReport Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('should create a new report request', async () => {
      req.body = {
        reportType: 'option_pool_summary',
        companyId: 'COMP-001',
        format: 'pdf'
      };

      const mockCreatedReport = {
        _id: 'report123',
        reportId: 'RPT-TEST-001',
        ...req.body,
        status: 'pending'
      };

      equityPlanReportService.createReport.mockResolvedValue(mockCreatedReport);

      await equityPlanReportController.createReport(req, res);

      expect(equityPlanReportService.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          reportType: 'option_pool_summary',
          companyId: 'COMP-001'
        })
      );
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockCreatedReport);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { reportType: 'option_pool_summary' }; // Missing companyId

      await equityPlanReportController.createReport(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 for invalid report type', async () => {
      req.body = {
        reportType: 'invalid_type',
        companyId: 'COMP-001'
      };

      await equityPlanReportController.createReport(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should handle service errors', async () => {
      req.body = {
        reportType: 'option_pool_summary',
        companyId: 'COMP-001'
      };

      equityPlanReportService.createReport.mockRejectedValue(new Error('Service error'));

      await equityPlanReportController.createReport(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getReports', () => {
    it('should return all reports for a company', async () => {
      req.query = { companyId: 'COMP-001' };
      const mockReports = [
        { reportId: 'RPT-001', reportType: 'option_pool_summary', status: 'completed' },
        { reportId: 'RPT-002', reportType: 'grant_status', status: 'pending' }
      ];

      equityPlanReportService.getReportsByCompany.mockResolvedValue(mockReports);

      await equityPlanReportController.getReports(req, res);

      expect(equityPlanReportService.getReportsByCompany).toHaveBeenCalledWith('COMP-001', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveLength(2);
    });

    it('should filter by report type', async () => {
      req.query = { companyId: 'COMP-001', reportType: 'option_pool_summary' };
      const mockReports = [
        { reportId: 'RPT-001', reportType: 'option_pool_summary', status: 'completed' }
      ];

      equityPlanReportService.getReportsByCompany.mockResolvedValue(mockReports);

      await equityPlanReportController.getReports(req, res);

      expect(equityPlanReportService.getReportsByCompany).toHaveBeenCalledWith(
        'COMP-001',
        { reportType: 'option_pool_summary' }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should filter by status', async () => {
      req.query = { companyId: 'COMP-001', status: 'completed' };
      const mockReports = [
        { reportId: 'RPT-001', reportType: 'option_pool_summary', status: 'completed' }
      ];

      equityPlanReportService.getReportsByCompany.mockResolvedValue(mockReports);

      await equityPlanReportController.getReports(req, res);

      expect(equityPlanReportService.getReportsByCompany).toHaveBeenCalledWith(
        'COMP-001',
        { status: 'completed' }
      );
    });

    it('should return 400 when companyId is missing', async () => {
      req.query = {};

      await equityPlanReportController.getReports(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 500 on service error', async () => {
      req.query = { companyId: 'COMP-001' };
      equityPlanReportService.getReportsByCompany.mockRejectedValue(new Error('Service error'));

      await equityPlanReportController.getReports(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getReportById', () => {
    it('should return a report by ID', async () => {
      req.params = { id: 'report123' };
      const mockReport = {
        _id: 'report123',
        reportId: 'RPT-001',
        reportType: 'option_pool_summary',
        status: 'completed'
      };

      equityPlanReportService.getReportById.mockResolvedValue(mockReport);

      await equityPlanReportController.getReportById(req, res);

      expect(equityPlanReportService.getReportById).toHaveBeenCalledWith('report123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockReport);
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: 'nonexistent' };
      equityPlanReportService.getReportById.mockResolvedValue(null);

      await equityPlanReportController.getReportById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Report not found');
    });

    it('should return 500 on service error', async () => {
      req.params = { id: 'report123' };
      equityPlanReportService.getReportById.mockRejectedValue(new Error('Service error'));

      await equityPlanReportController.getReportById(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('deleteReport', () => {
    it('should delete a report', async () => {
      req.params = { id: 'report123' };
      const mockDeletedReport = { _id: 'report123', reportId: 'RPT-001' };

      equityPlanReportService.deleteReport.mockResolvedValue(mockDeletedReport);

      await equityPlanReportController.deleteReport(req, res);

      expect(equityPlanReportService.deleteReport).toHaveBeenCalledWith('report123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Report deleted successfully');
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: 'nonexistent' };
      equityPlanReportService.deleteReport.mockResolvedValue(null);

      await equityPlanReportController.deleteReport(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on service error', async () => {
      req.params = { id: 'report123' };
      equityPlanReportService.deleteReport.mockRejectedValue(new Error('Service error'));

      await equityPlanReportController.deleteReport(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('generateOptionPoolSummary', () => {
    it('should generate option pool summary report', async () => {
      req.body = { companyId: 'COMP-001' };

      const mockSummary = {
        totalPoolShares: 1000000,
        grantedShares: 150000,
        availableShares: 850000,
        byGrantType: { ISO: { totalShares: 100000 }, NSO: { totalShares: 50000 } }
      };

      const mockCreatedReport = {
        _id: 'report123',
        reportId: 'RPT-TEST-001',
        reportType: 'option_pool_summary',
        status: 'completed',
        generatedData: mockSummary
      };

      equityPlanReportService.generateOptionPoolSummary.mockResolvedValue(mockSummary);
      equityPlanReportService.createReport.mockResolvedValue(mockCreatedReport);
      equityPlanReportService.updateReportStatus.mockResolvedValue(mockCreatedReport);

      await equityPlanReportController.generateOptionPoolSummary(req, res);

      expect(equityPlanReportService.generateOptionPoolSummary).toHaveBeenCalledWith('COMP-001', {});
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.generatedData).toBeDefined();
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = {};

      await equityPlanReportController.generateOptionPoolSummary(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should handle generation errors', async () => {
      req.body = { companyId: 'COMP-001' };
      equityPlanReportService.generateOptionPoolSummary.mockRejectedValue(new Error('Generation failed'));

      await equityPlanReportController.generateOptionPoolSummary(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('generateGrantStatusReport', () => {
    it('should generate grant status report', async () => {
      req.body = {
        companyId: 'COMP-001',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      const mockReport = {
        totalGrants: 10,
        grants: [],
        summary: { byStatus: { active: 8, pending: 2 } }
      };

      const mockCreatedReport = {
        _id: 'report123',
        reportId: 'RPT-TEST-001',
        reportType: 'grant_status',
        status: 'completed',
        generatedData: mockReport
      };

      equityPlanReportService.generateGrantStatusReport.mockResolvedValue(mockReport);
      equityPlanReportService.createReport.mockResolvedValue(mockCreatedReport);
      equityPlanReportService.updateReportStatus.mockResolvedValue(mockCreatedReport);

      await equityPlanReportController.generateGrantStatusReport(req, res);

      expect(equityPlanReportService.generateGrantStatusReport).toHaveBeenCalledWith(
        'COMP-001',
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = { startDate: '2024-01-01' };

      await equityPlanReportController.generateGrantStatusReport(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('generateVestingScheduleReport', () => {
    it('should generate vesting schedule report', async () => {
      req.body = {
        companyId: 'COMP-001',
        forecastMonths: 12
      };

      const mockReport = {
        schedules: [],
        upcomingVestingEvents: [],
        summary: { totalVested: 5000, totalUnvested: 15000 }
      };

      const mockCreatedReport = {
        _id: 'report123',
        reportId: 'RPT-TEST-001',
        reportType: 'vesting_schedule',
        status: 'completed',
        generatedData: mockReport
      };

      equityPlanReportService.generateVestingScheduleReport.mockResolvedValue(mockReport);
      equityPlanReportService.createReport.mockResolvedValue(mockCreatedReport);
      equityPlanReportService.updateReportStatus.mockResolvedValue(mockCreatedReport);

      await equityPlanReportController.generateVestingScheduleReport(req, res);

      expect(equityPlanReportService.generateVestingScheduleReport).toHaveBeenCalledWith(
        'COMP-001',
        { forecastMonths: 12 }
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = { forecastMonths: 12 };

      await equityPlanReportController.generateVestingScheduleReport(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('generateDilutionAnalysis', () => {
    it('should generate dilution analysis report', async () => {
      req.body = { companyId: 'COMP-001' };

      const mockReport = {
        issuedShares: 800000,
        fullyDilutedShares: 880000,
        currentDilution: 9.09,
        dilutionBreakdown: { options: {}, rsus: {} }
      };

      const mockCreatedReport = {
        _id: 'report123',
        reportId: 'RPT-TEST-001',
        reportType: 'dilution_analysis',
        status: 'completed',
        generatedData: mockReport
      };

      equityPlanReportService.generateDilutionAnalysis.mockResolvedValue(mockReport);
      equityPlanReportService.createReport.mockResolvedValue(mockCreatedReport);
      equityPlanReportService.updateReportStatus.mockResolvedValue(mockCreatedReport);

      await equityPlanReportController.generateDilutionAnalysis(req, res);

      expect(equityPlanReportService.generateDilutionAnalysis).toHaveBeenCalledWith('COMP-001', {});
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when companyId is missing', async () => {
      req.body = {};

      await equityPlanReportController.generateDilutionAnalysis(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('exportReport', () => {
    it('should export report to specified format', async () => {
      req.params = { id: 'report123' };
      req.query = { format: 'csv' };

      const mockReport = {
        _id: 'report123',
        reportId: 'RPT-001',
        reportType: 'grant_status',
        status: 'completed',
        generatedData: { grants: [] }
      };

      const mockExportResult = {
        format: 'csv',
        data: 'grantId,numberOfShares\nGRANT-001,10000'
      };

      equityPlanReportService.getReportById.mockResolvedValue(mockReport);
      equityPlanReportService.exportReport.mockResolvedValue(mockExportResult);

      await equityPlanReportController.exportReport(req, res);

      expect(equityPlanReportService.exportReport).toHaveBeenCalledWith(mockReport, 'csv');
      expect(res.statusCode).toBe(200);
    });

    it('should default to JSON format', async () => {
      req.params = { id: 'report123' };
      req.query = {};

      const mockReport = {
        _id: 'report123',
        status: 'completed',
        generatedData: {}
      };

      equityPlanReportService.getReportById.mockResolvedValue(mockReport);
      equityPlanReportService.exportReport.mockResolvedValue({ format: 'json', data: '{}' });

      await equityPlanReportController.exportReport(req, res);

      expect(equityPlanReportService.exportReport).toHaveBeenCalledWith(mockReport, 'json');
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: 'nonexistent' };
      req.query = { format: 'csv' };

      equityPlanReportService.getReportById.mockResolvedValue(null);

      await equityPlanReportController.exportReport(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when report is not completed', async () => {
      req.params = { id: 'report123' };
      req.query = { format: 'csv' };

      const mockReport = {
        _id: 'report123',
        status: 'pending',
        generatedData: null
      };

      equityPlanReportService.getReportById.mockResolvedValue(mockReport);

      await equityPlanReportController.exportReport(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 400 for invalid format', async () => {
      req.params = { id: 'report123' };
      req.query = { format: 'invalid' };

      const mockReport = {
        _id: 'report123',
        status: 'completed',
        generatedData: {}
      };

      equityPlanReportService.getReportById.mockResolvedValue(mockReport);
      equityPlanReportService.exportReport.mockRejectedValue(new Error('Unsupported export format'));

      await equityPlanReportController.exportReport(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getAvailableReportTypes', () => {
    it('should return list of available report types', async () => {
      await equityPlanReportController.getAvailableReportTypes(req, res);

      expect(res.statusCode).toBe(200);
      const types = JSON.parse(res._getData());
      expect(types).toContainEqual(expect.objectContaining({ type: 'option_pool_summary' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'grant_status' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'vesting_schedule' }));
      expect(types).toContainEqual(expect.objectContaining({ type: 'dilution_analysis' }));
    });
  });
});
