/**
 * Financial Report CRUD Controller Tests
 *
 * Tests for create, read, list, update, and delete operations
 * in financialReportCrudController.js
 */

const httpMocks = require('node-mocks-http');
const {
  createFinancialReport,
  getFinancialReport,
  listFinancialReports,
  updateFinancialReport,
  deleteFinancialReport
} = require('../../../controllers/financialReportCrudController');
const FinancialReport = require('../../../models/financialReport');

// Mock the FinancialReport model
jest.mock('../../../models/financialReport', () => {
  const mockQuery = {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis()
  };
  return {
    findOne: jest.fn(),
    find: jest.fn().mockReturnValue(mockQuery),
    countDocuments: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    _mockQuery: mockQuery
  };
});

// Mock the business validation
jest.mock('../../../controllers/financialReportBusinessController', () => ({
  validateFinancialReport: jest.fn()
}));

const { validateFinancialReport: mockValidate } = require('../../../controllers/financialReportBusinessController');

describe('financialReportCrudController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
  });

  // ─── createFinancialReport ─────────────────────────────────────────

  describe('createFinancialReport', () => {
    it('should create a report and return 201', async () => {
      const reportData = {
        ReportID: 'RPT-001',
        Type: 'Quarterly',
        Data: { revenue: { q1: 1000 }, expenses: { q1: 500 } },
        TotalRevenue: 1000,
        TotalExpenses: 500,
        NetIncome: 500,
        Timestamp: '2026-01-01T00:00:00Z'
      };

      req.body = reportData;

      mockValidate.mockReturnValue({ isValid: true, error: null });

      // Mock FinancialReport constructor and save
      const savedReport = { _id: 'id-1', ...reportData };
      // The controller uses `new FinancialReport(req.body)` then `.save()`.
      // Since we're mocking the module, we need to handle the constructor.
      // Instead, let's directly test the controller function call flow:
      // validateFinancialReport is already mocked above.
      // We need to mock the constructor. For this test, we'll use a different approach:
      // Override the module to return a constructable mock.
      jest.resetModules();

      // Re-require with constructor mock
      jest.doMock('../../../models/financialReport', () => {
        const mockInstance = { save: jest.fn().mockResolvedValue(savedReport) };
        const MockModel = jest.fn(() => mockInstance);
        MockModel.findOne = jest.fn();
        MockModel.find = jest.fn().mockReturnValue({ skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis() });
        MockModel.countDocuments = jest.fn();
        MockModel.findOneAndUpdate = jest.fn();
        MockModel.findOneAndDelete = jest.fn();
        return MockModel;
      });

      jest.doMock('../../../controllers/financialReportBusinessController', () => ({
        validateFinancialReport: jest.fn().mockReturnValue({ isValid: true, error: null })
      }));

      const crud = require('../../../controllers/financialReportCrudController');

      await crud.createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(201);
      const data = res._getJSONData();
      expect(data.ReportID).toBe('RPT-001');
    });

    it('should return 400 when validation fails', async () => {
      req.body = { ReportID: 'RPT-BAD' };

      mockValidate.mockReturnValue({
        isValid: false,
        error: 'Missing required fields: Type, Data'
      });

      await createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data.error).toBe('Missing required fields: Type, Data');
    });

    it('should call next on database error', async () => {
      req.body = {
        ReportID: 'RPT-001',
        Type: 'Quarterly',
        Data: { revenue: { q1: 1000 }, expenses: { q1: 500 } },
        TotalRevenue: 1000,
        TotalExpenses: 500,
        NetIncome: 500,
        Timestamp: '2026-01-01T00:00:00Z'
      };

      mockValidate.mockReturnValue({ isValid: true, error: null });

      // Reset to get the constructor-throwing version
      jest.resetModules();
      jest.doMock('../../../models/financialReport', () => {
        const mockInstance = { save: jest.fn().mockRejectedValue(new Error('DB error')) };
        const MockModel = jest.fn(() => mockInstance);
        MockModel.findOne = jest.fn();
        MockModel.find = jest.fn();
        MockModel.countDocuments = jest.fn();
        MockModel.findOneAndUpdate = jest.fn();
        MockModel.findOneAndDelete = jest.fn();
        return MockModel;
      });

      jest.doMock('../../../controllers/financialReportBusinessController', () => ({
        validateFinancialReport: jest.fn().mockReturnValue({ isValid: true, error: null })
      }));

      const crud = require('../../../controllers/financialReportCrudController');
      const nextFn = jest.fn();
      await crud.createFinancialReport(req, res, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(1);
      expect(nextFn.mock.calls[0][0].message).toBe('DB error');
    });
  });

  // ─── getFinancialReport ────────────────────────────────────────────

  describe('getFinancialReport', () => {
    it('should return a report by ID', async () => {
      req.params = { id: 'RPT-001' };
      const mockReport = { ReportID: 'RPT-001', TotalRevenue: 1000 };

      FinancialReport.findOne.mockResolvedValue(mockReport);

      await getFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(FinancialReport.findOne).toHaveBeenCalledWith({ ReportID: 'RPT-001' });
      const data = res._getJSONData();
      expect(data.ReportID).toBe('RPT-001');
    });

    it('should return 404 when report is not found', async () => {
      req.params = { id: 'RPT-MISSING' };

      FinancialReport.findOne.mockResolvedValue(null);

      await getFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
      const data = res._getJSONData();
      expect(data.message).toBe('Financial report not found');
    });

    it('should call next on database error', async () => {
      req.params = { id: 'RPT-001' };

      FinancialReport.findOne.mockRejectedValue(new Error('DB error'));

      await getFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── listFinancialReports ──────────────────────────────────────────

  describe('listFinancialReports', () => {
    it('should return paginated reports', async () => {
      req.query = { page: '1', limit: '10' };
      req.user = { companyId: 'COMP-001' };

      const mockReports = [
        { ReportID: 'RPT-001' },
        { ReportID: 'RPT-002' }
      ];

      const mockQuery = FinancialReport._mockQuery;
      mockQuery.limit.mockResolvedValue(mockReports);
      FinancialReport.countDocuments.mockResolvedValue(2);

      await listFinancialReports(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.reports).toEqual(mockReports);
      expect(data.totalCount).toBe(2);
      expect(data.currentPage).toBe(1);
      expect(data.totalPages).toBe(1);
    });

    it('should use default pagination when not provided', async () => {
      req.query = {};
      req.user = {};

      const mockQuery = FinancialReport._mockQuery;
      mockQuery.limit.mockResolvedValue([]);
      FinancialReport.countDocuments.mockResolvedValue(0);

      await listFinancialReports(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.currentPage).toBe(1);
    });

    it('should call next on database error', async () => {
      req.query = {};
      req.user = {};

      FinancialReport.find.mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('DB error'))
        })
      });

      await listFinancialReports(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── updateFinancialReport ─────────────────────────────────────────

  describe('updateFinancialReport', () => {
    it('should update a report and return 200', async () => {
      req.params = { id: 'RPT-001' };
      req.body = {
        ReportID: 'RPT-001',
        Type: 'Quarterly',
        Data: { revenue: { q1: 2000 }, expenses: { q1: 1000 } },
        TotalRevenue: 2000,
        TotalExpenses: 1000,
        NetIncome: 1000,
        Timestamp: '2026-01-01T00:00:00Z'
      };

      mockValidate.mockReturnValue({ isValid: true, error: null });

      const updatedReport = { _id: 'id-1', ...req.body };
      FinancialReport.findOneAndUpdate.mockResolvedValue(updatedReport);

      await updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(FinancialReport.findOneAndUpdate).toHaveBeenCalledWith(
        { ReportID: 'RPT-001' },
        req.body,
        { new: true, runValidators: true }
      );
    });

    it('should return 400 when validation fails', async () => {
      req.params = { id: 'RPT-001' };
      req.body = { ReportID: 'RPT-001' };

      mockValidate.mockReturnValue({
        isValid: false,
        error: 'Missing required fields'
      });

      await updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      req.body = {
        ReportID: 'RPT-MISSING',
        Type: 'Quarterly',
        Data: { revenue: { q1: 1000 }, expenses: { q1: 500 } },
        TotalRevenue: 1000,
        TotalExpenses: 500,
        NetIncome: 500,
        Timestamp: '2026-01-01T00:00:00Z'
      };

      mockValidate.mockReturnValue({ isValid: true, error: null });
      FinancialReport.findOneAndUpdate.mockResolvedValue(null);

      await updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should call next on database error', async () => {
      req.params = { id: 'RPT-001' };
      req.body = {
        ReportID: 'RPT-001',
        Type: 'Quarterly',
        Data: { revenue: { q1: 1000 }, expenses: { q1: 500 } },
        TotalRevenue: 1000,
        TotalExpenses: 500,
        NetIncome: 500,
        Timestamp: '2026-01-01T00:00:00Z'
      };

      mockValidate.mockReturnValue({ isValid: true, error: null });
      FinancialReport.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

      await updateFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  // ─── deleteFinancialReport ─────────────────────────────────────────

  describe('deleteFinancialReport', () => {
    it('should delete a report and return 200', async () => {
      req.params = { id: 'RPT-001' };
      const mockReport = { ReportID: 'RPT-001', TotalRevenue: 1000 };

      FinancialReport.findOneAndDelete.mockResolvedValue(mockReport);

      await deleteFinancialReport(req, res, next);

      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data.message).toBe('Financial report deleted successfully');
      expect(data.report).toEqual(mockReport);
    });

    it('should return 404 when report not found', async () => {
      req.params = { id: 'RPT-MISSING' };

      FinancialReport.findOneAndDelete.mockResolvedValue(null);

      await deleteFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should call next on database error', async () => {
      req.params = { id: 'RPT-001' };

      FinancialReport.findOneAndDelete.mockRejectedValue(new Error('DB error'));

      await deleteFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
