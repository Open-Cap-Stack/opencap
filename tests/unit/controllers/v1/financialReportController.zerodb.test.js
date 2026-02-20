/**
 * Unit Tests for Financial Report Controller (ZeroDB Migration)
 *
 * Feature: OCAE-18: Migrate Financial controllers to ZeroDB
 * TDD Red Phase: Tests written before implementation
 */

const financialReportController = require('../../../../controllers/v1/financialReportController.zerodb');
const zerodbService = require('../../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../../services/zerodbService');

describe('Financial Report Controller (ZeroDB)', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user-123', role: 'user' }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset ZeroDB mock
    zerodbService.queryTable = jest.fn();
    zerodbService.insertRow = jest.fn();
    zerodbService.updateRows = jest.fn();
    zerodbService.deleteRows = jest.fn();
    zerodbService.countRows = jest.fn();
  });

  describe('createFinancialReport', () => {
    const validReportData = {
      companyId: 'company-123',
      reportingPeriod: 'Q1 2024',
      reportType: 'quarterly',
      revenue: { sales: 100000, services: 50000, other: 5000 },
      expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
    };

    it('should create a new financial report using ZeroDB', async () => {
      mockReq.body = validReportData;
      const createdReport = {
        ...validReportData,
        id: 'report-123',
        userId: 'user-123',
        totalRevenue: 155000,
        totalExpenses: 100000,
        netIncome: 55000,
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow.mockResolvedValue({ rows: [createdReport] });

      await financialReportController.createFinancialReport(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          companyId: 'company-123',
          reportingPeriod: 'Q1 2024',
          reportType: 'quarterly',
          userId: 'user-123'
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = { companyId: 'company-123' }; // Missing reportingPeriod and reportType

      await financialReportController.createFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });

    it('should calculate totals before saving', async () => {
      mockReq.body = validReportData;
      zerodbService.insertRow.mockResolvedValue({ rows: [mockReq.body] });

      await financialReportController.createFinancialReport(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          totalRevenue: 155000,
          totalExpenses: 100000,
          netIncome: 55000
        })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.body = validReportData;
      zerodbService.insertRow.mockRejectedValue(new Error('ZeroDB connection failed'));

      await financialReportController.createFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to create financial report' })
      );
    });

    it('should handle duplicate report error', async () => {
      mockReq.body = validReportData;
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;

      zerodbService.insertRow.mockRejectedValue(duplicateError);

      await financialReportController.createFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });

  describe('getAllFinancialReports', () => {
    const mockReports = [
      { id: 'report-1', companyId: 'company-123', reportingPeriod: 'Q1 2024' },
      { id: 'report-2', companyId: 'company-123', reportingPeriod: 'Q2 2024' }
    ];

    it('should retrieve all financial reports with pagination', async () => {
      mockReq.query = { page: 1, limit: 10 };
      zerodbService.queryTable.mockResolvedValue(mockReports);

      await financialReportController.getAllFinancialReports(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          skip: 0,
          limit: 10,
          sort: { reportDate: -1 }
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockReports);
    });

    it('should filter reports by companyId', async () => {
      mockReq.query = { companyId: 'company-456' };
      zerodbService.queryTable.mockResolvedValue([]);

      await financialReportController.getAllFinancialReports(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          filter: expect.objectContaining({ companyId: 'company-456' })
        })
      );
    });

    it('should filter reports by reportType', async () => {
      mockReq.query = { reportType: 'quarterly' };
      zerodbService.queryTable.mockResolvedValue([]);

      await financialReportController.getAllFinancialReports(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          filter: expect.objectContaining({ reportType: 'quarterly' })
        })
      );
    });

    it('should filter reports by date range', async () => {
      mockReq.query = {
        startDate: '2024-01-01',
        endDate: '2024-06-30'
      };
      zerodbService.queryTable.mockResolvedValue([]);

      await financialReportController.getAllFinancialReports(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          filter: expect.objectContaining({
            reportDate: expect.any(Object)
          })
        })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query failed'));

      await financialReportController.getAllFinancialReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to retrieve financial reports' })
      );
    });
  });

  describe('getFinancialReportById', () => {
    const mockReport = {
      id: '507f1f77bcf86cd799439011',
      companyId: 'company-123',
      reportingPeriod: 'Q1 2024',
      totalRevenue: 155000,
      totalExpenses: 100000,
      netIncome: 55000
    };

    it('should retrieve a financial report by ID', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      zerodbService.queryTable.mockResolvedValue([mockReport]);

      await financialReportController.getFinancialReportById(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          filter: { _id: '507f1f77bcf86cd799439011' }
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockReport);
    });

    it('should return 400 for invalid report ID format', async () => {
      mockReq.params.id = 'invalid-id';

      await financialReportController.getFinancialReportById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid financial report ID format' })
      );
    });

    it('should return 404 when report not found', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011'; // Valid ObjectId format
      zerodbService.queryTable.mockResolvedValue([]);

      await financialReportController.getFinancialReportById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Financial report not found' })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB query failed'));

      await financialReportController.getFinancialReportById(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to retrieve financial report' })
      );
    });
  });

  describe('updateFinancialReport', () => {
    const updateData = {
      revenue: { sales: 120000, services: 60000, other: 8000 },
      expenses: { salaries: 70000, marketing: 25000, operations: 18000, other: 7000 }
    };

    it('should update a financial report successfully', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = updateData;

      const existingReport = {
        id: '507f1f77bcf86cd799439011',
        companyId: 'company-123',
        reportingPeriod: 'Q1 2024'
      };

      zerodbService.queryTable.mockResolvedValue([existingReport]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      await financialReportController.updateFinancialReport(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'financial_reports',
        { _id: '507f1f77bcf86cd799439011' },
        expect.objectContaining({
          $set: expect.objectContaining({
            lastModifiedBy: 'user-123'
          })
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid report ID format', async () => {
      mockReq.params.id = 'invalid-id';
      mockReq.body = updateData;

      await financialReportController.updateFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when report not found', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = updateData;
      zerodbService.queryTable.mockResolvedValue([]);

      await financialReportController.updateFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should recalculate totals on update', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = updateData;

      zerodbService.queryTable.mockResolvedValue([{ id: '507f1f77bcf86cd799439011' }]);
      zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });

      await financialReportController.updateFinancialReport(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'financial_reports',
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({
            totalRevenue: 188000,
            totalExpenses: 120000,
            netIncome: 68000
          })
        })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      mockReq.body = updateData;
      zerodbService.queryTable.mockResolvedValue([{ id: '507f1f77bcf86cd799439011' }]);
      zerodbService.updateRows.mockRejectedValue(new Error('ZeroDB update failed'));

      await financialReportController.updateFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteFinancialReport', () => {
    it('should delete a financial report successfully', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';

      zerodbService.queryTable.mockResolvedValue([{ id: '507f1f77bcf86cd799439011' }]);
      zerodbService.deleteRows.mockResolvedValue({ deletedCount: 1 });

      await financialReportController.deleteFinancialReport(mockReq, mockRes);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'financial_reports',
        { _id: '507f1f77bcf86cd799439011' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Financial report deleted successfully'
        })
      );
    });

    it('should return 400 for invalid report ID format', async () => {
      mockReq.params.id = 'invalid-id';

      await financialReportController.deleteFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 when report not found', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      zerodbService.queryTable.mockResolvedValue([]);

      await financialReportController.deleteFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.params.id = '507f1f77bcf86cd799439011';
      zerodbService.queryTable.mockResolvedValue([{ id: '507f1f77bcf86cd799439011' }]);
      zerodbService.deleteRows.mockRejectedValue(new Error('ZeroDB delete failed'));

      await financialReportController.deleteFinancialReport(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchFinancialReports', () => {
    it('should search financial reports by keyword', async () => {
      mockReq.query = { q: 'Q2 2024' };
      const searchResults = [
        { id: 'report-1', reportingPeriod: 'Q2 2024' }
      ];

      zerodbService.queryTable.mockResolvedValue(searchResults);

      await financialReportController.searchFinancialReports(mockReq, mockRes);

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'financial_reports',
        expect.objectContaining({
          filter: expect.objectContaining({
            $or: expect.arrayContaining([
              { reportingPeriod: expect.any(Object) }
            ])
          })
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(searchResults);
    });

    it('should return 400 for missing search query', async () => {
      mockReq.query = {};

      await financialReportController.searchFinancialReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Search query is required' })
      );
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.query = { q: 'test' };
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB search failed'));

      await financialReportController.searchFinancialReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFinancialReportAnalytics', () => {
    const mockReports = [
      { totalRevenue: 100000, totalExpenses: 60000, netIncome: 40000 },
      { totalRevenue: 120000, totalExpenses: 70000, netIncome: 50000 },
      { totalRevenue: 150000, totalExpenses: 80000, netIncome: 70000 }
    ];

    it('should calculate analytics for financial reports', async () => {
      mockReq.query = { companyId: 'company-123', year: '2024' };
      zerodbService.queryTable.mockResolvedValue(mockReports);

      await financialReportController.getFinancialReportAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        totalReports: 3,
        averageRevenue: expect.any(Number),
        averageExpenses: expect.any(Number),
        totalRevenue: expect.any(Number),
        totalExpenses: expect.any(Number),
        totalNetIncome: expect.any(Number)
      }));
    });

    it('should return empty analytics when no reports found', async () => {
      mockReq.query = { companyId: 'company-456' };
      zerodbService.queryTable.mockResolvedValue([]);

      await financialReportController.getFinancialReportAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        totalReports: 0,
        averageRevenue: 0,
        totalRevenue: 0
      }));
    });

    it('should handle ZeroDB errors gracefully', async () => {
      mockReq.query = { companyId: 'company-123' };
      zerodbService.queryTable.mockRejectedValue(new Error('ZeroDB aggregation failed'));

      await financialReportController.getFinancialReportAnalytics(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('bulkCreateFinancialReports', () => {
    const bulkReports = [
      {
        companyId: 'company-123',
        reportingPeriod: 'Q1 2024',
        reportType: 'quarterly',
        revenue: { sales: 100000 },
        expenses: { salaries: 50000 }
      },
      {
        companyId: 'company-123',
        reportingPeriod: 'Q2 2024',
        reportType: 'quarterly',
        revenue: { sales: 120000 },
        expenses: { salaries: 60000 }
      }
    ];

    it('should create multiple financial reports', async () => {
      mockReq.body = bulkReports;
      zerodbService.insertRow.mockResolvedValue({ rows: bulkReports });

      await financialReportController.bulkCreateFinancialReports(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for non-array input', async () => {
      mockReq.body = { notAnArray: true };

      await financialReportController.bulkCreateFinancialReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bulk operation requires an array of financial reports'
        })
      );
    });

    it('should handle partial failures', async () => {
      mockReq.body = bulkReports;
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;

      zerodbService.insertRow.mockRejectedValue(duplicateError);

      await financialReportController.bulkCreateFinancialReports(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should add userId to each report', async () => {
      mockReq.body = bulkReports;
      zerodbService.insertRow.mockResolvedValue({ rows: [] });

      await financialReportController.bulkCreateFinancialReports(mockReq, mockRes);

      const insertedReports = zerodbService.insertRow.mock.calls[0][1];
      if (Array.isArray(insertedReports)) {
        insertedReports.forEach(report => {
          expect(report.userId).toBe('user-123');
        });
      }
    });
  });
});
