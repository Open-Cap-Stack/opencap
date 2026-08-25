/**
 * Backup Controller Tests
 *
 * Tests for controllers/backup.js which is a backup copy of
 * financialReportingController.js containing both business logic
 * and CRUD functions.
 */

const httpMocks = require('node-mocks-http');

// Mock the FinancialReport model before requiring the controller
jest.mock('../../../models/financialReport', () => {
  const mockQuery = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  };
  const MockModel = jest.fn(function (data) {
    this.data = data;
    this.save = jest.fn().mockResolvedValue({ _id: 'id-1', ...data });
  });
  MockModel.findOne = jest.fn();
  MockModel.find = jest.fn().mockReturnValue(mockQuery);
  MockModel.countDocuments = jest.fn();
  MockModel.findOneAndUpdate = jest.fn();
  MockModel.findOneAndDelete = jest.fn();
  MockModel._mockQuery = mockQuery;
  return MockModel;
});

const FinancialReport = require('../../../models/financialReport');
const controller = require('../../../controllers/backup');

describe('backup controller (financialReportingController backup)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    FinancialReport.mockImplementation(function (data) {
      this.data = data;
      this.save = jest.fn().mockResolvedValue({ _id: 'id-1', ...data });
    });
  });

  // ─── calculateFinancialMetrics ─────────────────────────────────────

  describe('calculateFinancialMetrics', () => {
    it('should return valid when net income matches revenue minus expenses', () => {
      const result = controller.calculateFinancialMetrics({
        TotalRevenue: 80000,
        TotalExpenses: 50000,
        NetIncome: 30000
      });

      expect(result.isValid).toBe(true);
      expect(result.calculatedNetIncome).toBe('30000.00');
      expect(result.error).toBeNull();
    });

    it('should return invalid when net income does not match', () => {
      const result = controller.calculateFinancialMetrics({
        TotalRevenue: 80000,
        TotalExpenses: 50000,
        NetIncome: 40000
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Net income does not match revenue minus expenses');
    });

    it('should handle zero values', () => {
      const result = controller.calculateFinancialMetrics({
        TotalRevenue: 0,
        TotalExpenses: 0,
        NetIncome: 0
      });

      expect(result.isValid).toBe(true);
    });

    it('should return error on exception', () => {
      const result = controller.calculateFinancialMetrics(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Error calculating financial metrics');
    });
  });

  // ─── validateReportingPeriod ───────────────────────────────────────

  describe('validateReportingPeriod', () => {
    it('should validate annual report with all four quarters', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Annual',
        Data: {
          revenue: { q1: 100, q2: 200, q3: 300, q4: 400 },
          expenses: { q1: 50, q2: 100, q3: 150, q4: 200 }
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject annual report missing quarters', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Annual',
        Data: {
          revenue: { q1: 100 },
          expenses: { q1: 50 }
        }
      });

      expect(result.isValid).toBe(false);
    });

    it('should validate quarterly report with one quarter', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Quarterly',
        Data: {
          revenue: { q2: 5000 },
          expenses: { q2: 3000 }
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject quarterly report with multiple quarters', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Quarterly',
        Data: {
          revenue: { q1: 100, q2: 200 },
          expenses: { q1: 50, q2: 100 }
        }
      });

      expect(result.isValid).toBe(false);
    });

    it('should return error on exception', () => {
      const result = controller.validateReportingPeriod(undefined);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Error validating reporting period');
    });
  });

  // ─── validateFinancialReport ───────────────────────────────────────

  describe('validateFinancialReport', () => {
    const validReport = {
      ReportID: 'RPT-100',
      Type: 'Quarterly',
      Data: { revenue: { q1: 20000 }, expenses: { q1: 12000 } },
      TotalRevenue: 20000,
      TotalExpenses: 12000,
      NetIncome: 8000,
      Timestamp: '2026-06-01T00:00:00Z'
    };

    it('should validate a correct report', () => {
      const result = controller.validateFinancialReport(validReport);
      expect(result.isValid).toBe(true);
    });

    it('should reject report with missing fields', () => {
      const result = controller.validateFinancialReport({ ReportID: 'RPT-001' });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should reject negative financial values', () => {
      const result = controller.validateFinancialReport({
        ...validReport,
        TotalExpenses: -500
      });
      expect(result.isValid).toBe(false);
    });

    it('should reject negative quarterly data', () => {
      const result = controller.validateFinancialReport({
        ...validReport,
        Data: { revenue: { q1: -100 }, expenses: { q1: 50 } }
      });
      expect(result.isValid).toBe(false);
    });

    it('should return error on exception', () => {
      const result = controller.validateFinancialReport(null);
      expect(result.isValid).toBe(false);
    });
  });

  // ─── createFinancialReport ─────────────────────────────────────────

  describe('createFinancialReport', () => {
    const validBody = {
      ReportID: 'RPT-100',
      Type: 'Quarterly',
      Data: { revenue: { q1: 20000 }, expenses: { q1: 12000 } },
      TotalRevenue: 20000,
      TotalExpenses: 12000,
      NetIncome: 8000,
      Timestamp: '2026-06-01T00:00:00Z'
    };

    it('should create and return 201', async () => {
      req.body = validBody;

      await controller.createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(201);
    });

    it('should return 400 for invalid data', async () => {
      req.body = { ReportID: 'RPT-BAD' };

      await controller.createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should call next on save error', async () => {
      req.body = validBody;
      FinancialReport.mockImplementation(function () {
        this.save = jest.fn().mockRejectedValue(new Error('DB error'));
      });

      await controller.createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getFinancialReport ────────────────────────────────────────────

  describe('getFinancialReport', () => {
    it('should return 200 with report data', async () => {
      req.params = { id: 'RPT-100' };
      FinancialReport.findOne.mockResolvedValue({ ReportID: 'RPT-100' });

      await controller.getFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      FinancialReport.findOne.mockResolvedValue(null);

      await controller.getFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should call next on error', async () => {
      req.params = { id: 'RPT-100' };
      FinancialReport.findOne.mockRejectedValue(new Error('DB error'));

      await controller.getFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── listFinancialReports ──────────────────────────────────────────

  describe('listFinancialReports', () => {
    it('should return paginated results', async () => {
      req.query = { page: '1', limit: '10' };
      FinancialReport._mockQuery.limit.mockResolvedValue([{ ReportID: 'RPT-100' }]);
      FinancialReport.countDocuments.mockResolvedValue(1);

      await controller.listFinancialReports(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.totalCount).toBe(1);
      expect(data.currentPage).toBe(1);
    });

    it('should use defaults when query params are missing', async () => {
      req.query = {};
      FinancialReport._mockQuery.limit.mockResolvedValue([]);
      FinancialReport.countDocuments.mockResolvedValue(0);

      await controller.listFinancialReports(req, res, next);

      expect(res.statusCode).toBe(200);
    });

    it('should call next on error', async () => {
      req.query = {};
      FinancialReport.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('DB error'))
        })
      });

      await controller.listFinancialReports(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── updateFinancialReport ─────────────────────────────────────────

  describe('updateFinancialReport', () => {
    const validBody = {
      ReportID: 'RPT-100',
      Type: 'Quarterly',
      Data: { revenue: { q1: 20000 }, expenses: { q1: 12000 } },
      TotalRevenue: 20000,
      TotalExpenses: 12000,
      NetIncome: 8000,
      Timestamp: '2026-06-01T00:00:00Z'
    };

    it('should update and return 200', async () => {
      req.params = { id: 'RPT-100' };
      req.body = validBody;
      FinancialReport.findOneAndUpdate.mockResolvedValue({ _id: 'id-1', ...validBody });

      await controller.updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for invalid data', async () => {
      req.params = { id: 'RPT-100' };
      req.body = { ReportID: 'RPT-100' };

      await controller.updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      req.body = validBody;
      FinancialReport.findOneAndUpdate.mockResolvedValue(null);

      await controller.updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should call next on error', async () => {
      req.params = { id: 'RPT-100' };
      req.body = validBody;
      FinancialReport.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

      await controller.updateFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── deleteFinancialReport ─────────────────────────────────────────

  describe('deleteFinancialReport', () => {
    it('should delete and return 200', async () => {
      req.params = { id: 'RPT-100' };
      FinancialReport.findOneAndDelete.mockResolvedValue({ ReportID: 'RPT-100' });

      await controller.deleteFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.message).toBe('Financial report deleted successfully');
    });

    it('should return 404 when not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      FinancialReport.findOneAndDelete.mockResolvedValue(null);

      await controller.deleteFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should call next on error', async () => {
      req.params = { id: 'RPT-100' };
      FinancialReport.findOneAndDelete.mockRejectedValue(new Error('DB error'));

      await controller.deleteFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
