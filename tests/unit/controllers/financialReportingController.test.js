/**
 * Financial Reporting Controller Tests
 *
 * Tests for the class-based FinancialReportController exported from
 * financialReportingController.js. Contains business logic, auth middleware,
 * and CRUD methods.
 */

const httpMocks = require('node-mocks-http');
const jwt = require('jsonwebtoken');

// Mock the FinancialReport model before requiring the controller
jest.mock('../../../models/financialReport', () => {
  const mockQuery = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis()
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
  MockModel.create = jest.fn();
  MockModel._mockQuery = mockQuery;
  return MockModel;
});

// Mock config
jest.mock('../../../config', () => ({
  JWT_SECRET: 'test-secret-key'
}));

const FinancialReport = require('../../../models/financialReport');
const config = require('../../../config');
const controller = require('../../../controllers/financialReportingController');

describe('financialReportingController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    // Reset constructor mock
    FinancialReport.mockImplementation(function (data) {
      this.data = data;
      this.save = jest.fn().mockResolvedValue({ _id: 'id-1', ...data });
    });
    // Reset chain mock
    const mockQuery = FinancialReport._mockQuery;
    FinancialReport.find.mockReturnValue(mockQuery);
    mockQuery.skip.mockReturnThis();
    mockQuery.limit.mockReturnThis();
    mockQuery.sort.mockReturnThis();
  });

  // ─── calculateFinancialMetrics ─────────────────────────────────────

  describe('calculateFinancialMetrics', () => {
    it('should return valid when net income matches', () => {
      const result = controller.calculateFinancialMetrics({
        TotalRevenue: 50000,
        TotalExpenses: 30000,
        NetIncome: 20000
      });

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return invalid when net income mismatches', () => {
      const result = controller.calculateFinancialMetrics({
        TotalRevenue: 50000,
        TotalExpenses: 30000,
        NetIncome: 25000
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Net income does not match revenue minus expenses');
    });

    it('should handle string values', () => {
      const result = controller.calculateFinancialMetrics({
        TotalRevenue: '10000',
        TotalExpenses: '6000',
        NetIncome: '4000'
      });

      expect(result.isValid).toBe(true);
    });

    it('should return error for null input', () => {
      const result = controller.calculateFinancialMetrics(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error for NaN values', () => {
      const result = controller.calculateFinancialMetrics({
        TotalRevenue: 'abc',
        TotalExpenses: 'xyz',
        NetIncome: 'bad'
      });

      expect(result.isValid).toBe(false);
    });
  });

  // ─── validateReportingPeriod ───────────────────────────────────────

  describe('validateReportingPeriod', () => {
    it('should validate annual report with all quarters', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Annual',
        Data: {
          revenue: { q1: 100, q2: 200, q3: 300, q4: 400 },
          expenses: { q1: 50, q2: 100, q3: 150, q4: 200 }
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject annual report with missing quarters', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Annual',
        Data: {
          revenue: { q1: 100, q2: 200 },
          expenses: { q1: 50 }
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Annual report must include data for all quarters');
    });

    it('should validate quarterly report with one quarter', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Quarterly',
        Data: {
          revenue: { q1: 100 },
          expenses: { q1: 50 }
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

    it('should reject invalid report type', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Monthly',
        Data: {
          revenue: { jan: 100 },
          expenses: { jan: 50 }
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid report type. Must be either Annual or Quarterly');
    });

    it('should return error for null input', () => {
      const result = controller.validateReportingPeriod(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return error for missing revenue or expenses', () => {
      const result = controller.validateReportingPeriod({
        Type: 'Annual',
        Data: {}
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Missing revenue or expenses data');
    });
  });

  // ─── validateFinancialReport ───────────────────────────────────────

  describe('validateFinancialReport', () => {
    const validReport = {
      ReportID: 'RPT-001',
      Type: 'Quarterly',
      Data: {
        revenue: { q1: 10000 },
        expenses: { q1: 6000 }
      },
      TotalRevenue: 10000,
      TotalExpenses: 6000,
      NetIncome: 4000,
      Timestamp: '2026-01-01T00:00:00Z'
    };

    it('should validate a correct report', () => {
      const result = controller.validateFinancialReport(validReport);

      expect(result.isValid).toBe(true);
    });

    it('should reject report with missing fields', () => {
      const result = controller.validateFinancialReport({
        ReportID: 'RPT-001'
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should reject report with negative values', () => {
      const result = controller.validateFinancialReport({
        ...validReport,
        TotalRevenue: -100
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Financial values cannot be negative');
    });

    it('should reject report with negative quarterly data', () => {
      const result = controller.validateFinancialReport({
        ...validReport,
        Data: { revenue: { q1: -100 }, expenses: { q1: 50 } }
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Financial values cannot be negative');
    });

    it('should return error for null input', () => {
      const result = controller.validateFinancialReport(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  // ─── checkUserPermissions ──────────────────────────────────────────

  describe('checkUserPermissions', () => {
    it('should allow admin users', async () => {
      req.user = { role: 'admin', permissions: [] };
      req.method = 'GET';

      await controller.checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow users with correct permission', async () => {
      req.user = { role: 'user', permissions: ['read:reports'] };
      req.method = 'GET';

      await controller.checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject users without required permission', async () => {
      req.user = { role: 'user', permissions: ['read:reports'] };
      req.method = 'POST';

      await controller.checkUserPermissions(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should return 401 when no user', async () => {
      req.user = undefined;
      req.method = 'GET';

      await controller.checkUserPermissions(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });
  });

  // ─── validateApiKey ────────────────────────────────────────────────

  describe('validateApiKey', () => {
    it('should return 401 when no API key', async () => {
      await controller.validateApiKey(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('API key is required');
    });

    it('should validate JWT-based API key and set permissions', async () => {
      const apiKey = jwt.sign({ permissions: ['read:reports'] }, config.JWT_SECRET);
      req.headers['x-api-key'] = apiKey;

      await controller.validateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.apiPermissions).toEqual(['read:reports']);
    });

    it('should reject invalid JWT', async () => {
      req.headers['x-api-key'] = 'invalid-jwt-token';

      await controller.validateApiKey(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should reject JWT without permissions', async () => {
      const apiKey = jwt.sign({ sub: 'user-1' }, config.JWT_SECRET);
      req.headers['x-api-key'] = apiKey;

      await controller.validateApiKey(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Invalid API key permissions');
    });
  });

  // ─── authorizeReportAccess ─────────────────────────────────────────

  describe('authorizeReportAccess', () => {
    it('should allow admin access', async () => {
      req.params = { id: 'RPT-001' };
      req.user = { id: 'user-1', role: 'admin' };
      FinancialReport.findOne.mockResolvedValue({ ReportID: 'RPT-001', userId: 'user-2' });

      await controller.authorizeReportAccess(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow owner access', async () => {
      req.params = { id: 'RPT-001' };
      req.user = { id: 'user-1', role: 'user' };
      FinancialReport.findOne.mockResolvedValue({ ReportID: 'RPT-001', userId: 'user-1' });

      await controller.authorizeReportAccess(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject non-owner', async () => {
      req.params = { id: 'RPT-001' };
      req.user = { id: 'user-1', role: 'user' };
      FinancialReport.findOne.mockResolvedValue({ ReportID: 'RPT-001', userId: 'user-2' });

      await controller.authorizeReportAccess(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should return 404 when not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      req.user = { id: 'user-1', role: 'user' };
      FinancialReport.findOne.mockResolvedValue(null);

      await controller.authorizeReportAccess(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
    });

    it('should return 401 when no user', async () => {
      req.params = { id: 'RPT-001' };
      req.user = undefined;

      await controller.authorizeReportAccess(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(401);
    });

    it('should return 400 when no id', async () => {
      req.params = {};
      req.user = { id: 'user-1', role: 'user' };

      await controller.authorizeReportAccess(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(400);
    });
  });

  // ─── createFinancialReport ─────────────────────────────────────────

  describe('createFinancialReport', () => {
    const validBody = {
      ReportID: 'RPT-001',
      Type: 'Quarterly',
      Data: { revenue: { q1: 10000 }, expenses: { q1: 6000 } },
      TotalRevenue: 10000,
      TotalExpenses: 6000,
      NetIncome: 4000,
      Timestamp: '2026-01-01T00:00:00Z'
    };

    it('should create and return 201 for valid data', async () => {
      req.body = validBody;

      await controller.createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(201);
    });

    it('should return 400 for invalid data', async () => {
      req.body = { ReportID: 'RPT-BAD' };

      await controller.createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error).toContain('Missing required fields');
    });

    it('should call next on save error', async () => {
      req.body = validBody;
      FinancialReport.mockImplementation(function () {
        this.save = jest.fn().mockRejectedValue(new Error('Save failed'));
      });

      await controller.createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getFinancialReport ────────────────────────────────────────────

  describe('getFinancialReport', () => {
    it('should return 200 with the report', async () => {
      req.params = { id: 'RPT-001' };
      FinancialReport.findOne.mockResolvedValue({ ReportID: 'RPT-001', TotalRevenue: 5000 });

      await controller.getFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      FinancialReport.findOne.mockResolvedValue(null);

      await controller.getFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when id is missing', async () => {
      req.params = {};

      await controller.getFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should call next on error', async () => {
      req.params = { id: 'RPT-001' };
      FinancialReport.findOne.mockRejectedValue(new Error('DB error'));

      await controller.getFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── listFinancialReports ──────────────────────────────────────────

  describe('listFinancialReports', () => {
    it('should return paginated results', async () => {
      req.query = { page: '2', limit: '5' };
      req.user = { companyId: 'COMP-001' };

      const mockReports = [{ ReportID: 'RPT-001' }];
      const mockQuery = FinancialReport._mockQuery;
      mockQuery.sort.mockResolvedValue(mockReports);
      FinancialReport.countDocuments.mockResolvedValue(6);

      await controller.listFinancialReports(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.currentPage).toBe(2);
      expect(data.totalCount).toBe(6);
      expect(data.totalPages).toBe(2);
    });

    it('should use default page and limit', async () => {
      req.query = {};
      req.user = {};

      const mockQuery = FinancialReport._mockQuery;
      mockQuery.sort.mockResolvedValue([]);
      FinancialReport.countDocuments.mockResolvedValue(0);

      await controller.listFinancialReports(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.currentPage).toBe(1);
    });

    it('should call next on error', async () => {
      req.query = {};
      req.user = {};
      FinancialReport.countDocuments.mockRejectedValue(new Error('DB error'));
      FinancialReport._mockQuery.sort.mockResolvedValue([]);

      await controller.listFinancialReports(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should scope by companyId from query param', async () => {
      req.query = { companyId: 'COMP-XYZ' };
      req.user = { companyId: 'COMP-001' };

      const mockQuery = FinancialReport._mockQuery;
      mockQuery.sort.mockResolvedValue([]);
      FinancialReport.countDocuments.mockResolvedValue(0);

      await controller.listFinancialReports(req, res, next);

      expect(FinancialReport.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'COMP-XYZ' })
      );
    });
  });

  // ─── updateFinancialReport ─────────────────────────────────────────

  describe('updateFinancialReport', () => {
    function makeValidBody() {
      return {
        ReportID: 'RPT-001',
        Type: 'Quarterly',
        Data: { revenue: { q1: 10000 }, expenses: { q1: 6000 } },
        TotalRevenue: 10000,
        TotalExpenses: 6000,
        NetIncome: 4000,
        Timestamp: '2026-01-01T00:00:00Z'
      };
    }

    it('should update and return 200', async () => {
      const body = makeValidBody();
      req.params = { id: 'RPT-001' };
      req.body = body;
      FinancialReport.findOneAndUpdate.mockResolvedValue({ _id: 'id-1', ...body });

      await controller.updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for invalid data', async () => {
      req.params = { id: 'RPT-001' };
      req.body = { ReportID: 'RPT-001' };

      await controller.updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when id is missing', async () => {
      req.params = {};
      req.body = makeValidBody();

      await controller.updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      req.body = makeValidBody();
      FinancialReport.findOneAndUpdate.mockResolvedValue(null);

      await controller.updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should call next on database error', async () => {
      req.params = { id: 'RPT-001' };
      req.body = makeValidBody();
      FinancialReport.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

      await controller.updateFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── deleteFinancialReport ─────────────────────────────────────────

  describe('deleteFinancialReport', () => {
    it('should delete and return 200', async () => {
      req.params = { id: 'RPT-001' };
      FinancialReport.findOneAndDelete.mockResolvedValue({ ReportID: 'RPT-001' });

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

    it('should return 400 when id is missing', async () => {
      req.params = {};

      await controller.deleteFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should call next on error', async () => {
      req.params = { id: 'RPT-001' };
      FinancialReport.findOneAndDelete.mockRejectedValue(new Error('DB error'));

      await controller.deleteFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── generateReport ───────────────────────────────────────────────

  describe('generateReport', () => {
    const validBody = {
      ReportID: 'RPT-001',
      Type: 'Quarterly',
      Data: { revenue: { q1: 10000 }, expenses: { q1: 6000 } },
      TotalRevenue: 10000,
      TotalExpenses: 6000,
      NetIncome: 4000,
      Timestamp: '2026-01-01T00:00:00Z'
    };

    it('should generate report and return 201', async () => {
      req.body = validBody;
      FinancialReport.create.mockResolvedValue([{ _id: 'id-1', ...validBody }]);

      await controller.generateReport(req, res, next);

      expect(res.statusCode).toBe(201);
    });

    it('should return 400 for invalid data', async () => {
      req.body = { ReportID: 'RPT-BAD' };

      await controller.generateReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should call next on create error', async () => {
      req.body = validBody;
      FinancialReport.create.mockRejectedValue(new Error('Create failed'));

      await controller.generateReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
