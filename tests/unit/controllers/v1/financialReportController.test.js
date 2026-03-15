/**
 * Financial Report Controller Unit Tests
 *
 * Tests for all Financial Report controller methods including validation,
 * error handling, and edge cases. Issue #39: Controller Test Coverage
 * Updated for ZeroDB migration
 */

// Mock the FinancialReport model as a constructor function with static methods
jest.mock('../../../../models/financialReport', () => {
  const mockConstructor = jest.fn();
  mockConstructor.find = jest.fn();
  mockConstructor.findOne = jest.fn();
  mockConstructor.findById = jest.fn();
  mockConstructor.findByIdAndUpdate = jest.fn();
  mockConstructor.findByIdAndDelete = jest.fn();
  mockConstructor.create = jest.fn();
  mockConstructor.updateOne = jest.fn();
  mockConstructor.aggregate = jest.fn();
  mockConstructor.countDocuments = jest.fn();
  mockConstructor.deleteMany = jest.fn();
  return mockConstructor;
});

jest.mock('../../../../services/vectorService');
jest.mock('../../../../services/streamingService');
jest.mock('../../../../services/memoryService');

const financialReportController = require('../../../../controllers/v1/financialReportController');
const FinancialReport = require('../../../../models/financialReport');
const vectorService = require('../../../../services/vectorService');
const streamingService = require('../../../../services/streamingService');
const memoryService = require('../../../../services/memoryService');

describe('Financial Report Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { userId: 'user-123' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('createFinancialReport', () => {
    const validReportData = {
      companyId: 'company-123',
      reportingPeriod: 'Q1 2024',
      reportType: 'quarterly',
      revenue: { sales: 100000, services: 50000, other: 5000 },
      expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
    };

    it('should create a new financial report successfully', async () => {
      req.body = validReportData;

      const mockReport = {
        ...validReportData,
        _id: { toString: () => 'report-123' },
        userId: 'user-123',
        totalRevenue: 155000,
        totalExpenses: 100000,
        netIncome: 55000
      };

      FinancialReport.create.mockResolvedValue(mockReport);
      vectorService.indexDocument.mockResolvedValue({});
      streamingService.publishFinancialTransaction.mockResolvedValue({});

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(FinancialReport.create).toHaveBeenCalled();
    });

    it('should return 400 for missing companyId', async () => {
      req.body = {
        reportingPeriod: 'Q1 2024',
        reportType: 'quarterly'
      };

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('companyId') })
      );
    });

    it('should return 400 for missing reportingPeriod', async () => {
      req.body = {
        companyId: 'company-123',
        reportType: 'quarterly'
      };

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('reportingPeriod') })
      );
    });

    it('should return 400 for missing reportType', async () => {
      req.body = {
        companyId: 'company-123',
        reportingPeriod: 'Q1 2024'
      };

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('reportType') })
      );
    });

    it('should handle duplicate key error (409)', async () => {
      req.body = validReportData;

      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;

      FinancialReport.create.mockRejectedValue(duplicateError);

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should handle validation error', async () => {
      req.body = validReportData;

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      FinancialReport.create.mockRejectedValue(validationError);

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors gracefully', async () => {
      req.body = validReportData;

      FinancialReport.create.mockRejectedValue(new Error('Database error'));

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to create financial report' })
      );
    });

    it('should continue when ZeroDB integration fails', async () => {
      req.body = validReportData;

      const mockReport = {
        ...validReportData,
        _id: { toString: () => 'report-123' },
        totalRevenue: 155000,
        totalExpenses: 100000,
        netIncome: 55000
      };

      FinancialReport.create.mockResolvedValue(mockReport);
      vectorService.indexDocument.mockRejectedValue(new Error('ZeroDB error'));

      await financialReportController.createFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getAllFinancialReports', () => {
    const mockReports = [
      { _id: 'report-1', companyId: 'company-123', reportingPeriod: 'Q1 2024' },
      { _id: 'report-2', companyId: 'company-123', reportingPeriod: 'Q2 2024' }
    ];

    it('should retrieve all financial reports with default pagination', async () => {
      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockReports)
          })
        })
      });

      await financialReportController.getAllFinancialReports(req, res);

      expect(FinancialReport.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    it('should filter by companyId', async () => {
      req.query = { companyId: 'company-456' };

      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await financialReportController.getAllFinancialReports(req, res);

      expect(FinancialReport.find).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-456' })
      );
    });

    it('should filter by reportType', async () => {
      req.query = { reportType: 'annual' };

      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await financialReportController.getAllFinancialReports(req, res);

      expect(FinancialReport.find).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: 'annual' })
      );
    });

    it('should filter by date range', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-06-30'
      };

      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await financialReportController.getAllFinancialReports(req, res);

      expect(FinancialReport.find).toHaveBeenCalledWith(
        expect.objectContaining({
          reportDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date)
          })
        })
      );
    });

    it('should filter by startDate only', async () => {
      req.query = { startDate: '2024-01-01' };

      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      await financialReportController.getAllFinancialReports(req, res);

      expect(FinancialReport.find).toHaveBeenCalledWith(
        expect.objectContaining({
          reportDate: expect.objectContaining({
            $gte: expect.any(Date)
          })
        })
      );
    });

    it('should apply pagination parameters', async () => {
      req.query = { page: 2, limit: 10 };

      const mockSkip = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([])
      });
      const mockSort = jest.fn().mockReturnValue({
        skip: mockSkip
      });

      FinancialReport.find.mockReturnValue({ sort: mockSort });

      await financialReportController.getAllFinancialReports(req, res);

      expect(mockSkip).toHaveBeenCalledWith(10); // (page-1) * limit
    });

    it('should handle database errors', async () => {
      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      await financialReportController.getAllFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to retrieve financial reports' })
      );
    });
  });

  describe('getFinancialReportById', () => {
    const mockReport = {
      _id: '507f1f77bcf86cd799439011',
      companyId: 'company-123',
      reportingPeriod: 'Q1 2024',
      totalRevenue: 155000
    };

    it('should retrieve a financial report by valid ID', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      FinancialReport.findById.mockResolvedValue(mockReport);

      await financialReportController.getFinancialReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReport);
    });

    it('should return 400 for invalid ID format', async () => {
      req.params.id = 'invalid-id';

      await financialReportController.getFinancialReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid financial report ID format' })
      );
    });

    it('should return 404 when report not found', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      FinancialReport.findById.mockResolvedValue(null);

      await financialReportController.getFinancialReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Financial report not found' })
      );
    });

    it('should handle database errors', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      FinancialReport.findById.mockRejectedValue(new Error('Database error'));

      await financialReportController.getFinancialReportById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to retrieve financial report' })
      );
    });
  });

  describe('updateFinancialReport', () => {
    const updateData = {
      revenue: { sales: 120000, services: 60000, other: 8000 }
    };

    it('should update a financial report successfully', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = updateData;

      const existingReport = { _id: '507f1f77bcf86cd799439011' };
      const updatedReport = {
        ...existingReport,
        ...updateData,
        totalRevenue: 188000,
        totalExpenses: 0,
        netIncome: 188000
      };

      FinancialReport.findById
        .mockResolvedValueOnce(existingReport)   // first call: check existence
        .mockResolvedValueOnce(updatedReport);     // second call: after updateOne
      FinancialReport.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await financialReportController.updateFinancialReport(req, res);

      expect(FinancialReport.updateOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 for invalid ID format', async () => {
      req.params.id = 'invalid-id';
      req.body = updateData;

      await financialReportController.updateFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid financial report ID format' })
      );
    });

    it('should return 404 when report not found', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = updateData;
      FinancialReport.findById.mockResolvedValue(null);

      await financialReportController.updateFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Financial report not found' })
      );
    });

    it('should handle validation error', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = updateData;

      const existingReport = { _id: '507f1f77bcf86cd799439011' };
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      FinancialReport.findById.mockResolvedValue(existingReport);
      FinancialReport.updateOne.mockRejectedValue(validationError);

      await financialReportController.updateFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.body = updateData;

      const existingReport = { _id: '507f1f77bcf86cd799439011' };

      FinancialReport.findById.mockResolvedValue(existingReport);
      FinancialReport.updateOne.mockRejectedValue(new Error('Database error'));

      await financialReportController.updateFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('deleteFinancialReport', () => {
    it('should delete a financial report successfully', async () => {
      req.params.id = '507f1f77bcf86cd799439011';

      const deletedReport = { _id: '507f1f77bcf86cd799439011' };
      FinancialReport.findByIdAndDelete.mockResolvedValue(deletedReport);

      await financialReportController.deleteFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Financial report deleted successfully',
          id: '507f1f77bcf86cd799439011'
        })
      );
    });

    it('should return 400 for invalid ID format', async () => {
      req.params.id = 'invalid-id';

      await financialReportController.deleteFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid financial report ID format' })
      );
    });

    it('should return 404 when report not found', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      FinancialReport.findByIdAndDelete.mockResolvedValue(null);

      await financialReportController.deleteFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Financial report not found' })
      );
    });

    it('should handle database errors', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      FinancialReport.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      await financialReportController.deleteFinancialReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to delete financial report' })
      );
    });
  });

  describe('searchFinancialReports', () => {
    it('should search reports by keyword', async () => {
      req.query = { q: 'Q2 2024' };
      const searchResults = [{ _id: 'report-1', reportingPeriod: 'Q2 2024' }];

      FinancialReport.find.mockResolvedValue(searchResults);

      await financialReportController.searchFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(searchResults);
    });

    it('should handle Q2 specific search', async () => {
      req.query = { q: 'Q2' };
      const searchResults = [{ _id: 'report-1', reportingPeriod: 'Q2 2024' }];

      FinancialReport.find.mockResolvedValue(searchResults);

      await financialReportController.searchFinancialReports(req, res);

      expect(FinancialReport.find).toHaveBeenCalledWith(
        expect.objectContaining({
          reportingPeriod: expect.any(Object)
        })
      );
    });

    it('should return 400 for missing search query', async () => {
      req.query = {};

      await financialReportController.searchFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Search query is required' })
      );
    });

    it('should handle database errors', async () => {
      req.query = { q: 'test' };
      FinancialReport.find.mockRejectedValue(new Error('Database error'));

      await financialReportController.searchFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to search financial reports' })
      );
    });
  });

  describe('getFinancialReportAnalytics', () => {
    const mockAnalytics = [{
      totalReports: 5,
      averageRevenue: 150000,
      averageExpenses: 100000,
      totalRevenue: 750000,
      totalExpenses: 500000,
      totalNetIncome: 250000,
      maxRevenue: 200000,
      minRevenue: 100000,
      revenueVariance: 25000,
      averageProfitMargin: 0.33,
      revenueGrowthRate: 1.0
    }];

    it('should return analytics for financial reports', async () => {
      req.query = { companyId: 'company-123' };
      FinancialReport.aggregate.mockResolvedValue(mockAnalytics);

      await financialReportController.getFinancialReportAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAnalytics[0]);
    });

    it('should filter analytics by reportType', async () => {
      req.query = { reportType: 'quarterly' };
      FinancialReport.aggregate.mockResolvedValue(mockAnalytics);

      await financialReportController.getFinancialReportAnalytics(req, res);

      expect(FinancialReport.aggregate).toHaveBeenCalled();
    });

    it('should filter analytics by year', async () => {
      req.query = { year: '2024' };
      FinancialReport.aggregate.mockResolvedValue(mockAnalytics);

      await financialReportController.getFinancialReportAnalytics(req, res);

      expect(FinancialReport.aggregate).toHaveBeenCalled();
    });

    it('should return default analytics when no reports found', async () => {
      req.query = { companyId: 'company-999' };
      FinancialReport.aggregate.mockResolvedValue([]);

      await financialReportController.getFinancialReportAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          totalReports: 0,
          averageRevenue: 0,
          totalRevenue: 0
        })
      );
    });

    it('should handle database errors', async () => {
      req.query = { companyId: 'company-123' };
      FinancialReport.aggregate.mockRejectedValue(new Error('Aggregation error'));

      await financialReportController.getFinancialReportAnalytics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Failed to get analytics' })
      );
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
      req.body = bulkReports;

      FinancialReport.create.mockImplementation((data) => {
        return Promise.resolve({ ...data, _id: 'report-' + Math.random() });
      });

      await financialReportController.bulkCreateFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(FinancialReport.create).toHaveBeenCalledTimes(2);
    });

    it('should return 400 for non-array input', async () => {
      req.body = { notAnArray: true };

      await financialReportController.bulkCreateFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Bulk operation requires an array of financial reports'
        })
      );
    });

    it('should handle duplicate key error (409)', async () => {
      req.body = bulkReports;

      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;

      FinancialReport.create.mockRejectedValue(duplicateError);

      await financialReportController.bulkCreateFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should handle validation error', async () => {
      req.body = bulkReports;

      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';

      FinancialReport.create.mockRejectedValue(validationError);

      await financialReportController.bulkCreateFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle database errors', async () => {
      req.body = bulkReports;

      FinancialReport.create.mockRejectedValue(new Error('Database error'));

      await financialReportController.bulkCreateFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('searchFinancialReportsVector', () => {
    it('should search reports using vector similarity with empty results', async () => {
      req.body = { query: 'revenue growth Q2', limit: 5 };

      const vectorResults = {
        results: [],
        search_time_ms: 50
      };

      vectorService.searchFinancialDocuments.mockResolvedValue(vectorResults);
      FinancialReport.find.mockResolvedValue([]);

      await financialReportController.searchFinancialReportsVector(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'revenue growth Q2',
          total_results: 0
        })
      );
    });

    it('should return 400 for missing search query', async () => {
      req.body = { limit: 5 };

      await financialReportController.searchFinancialReportsVector(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Search query is required' })
      );
    });

    it('should handle vector service errors', async () => {
      req.body = { query: 'test' };
      vectorService.searchFinancialDocuments.mockRejectedValue(new Error('Vector error'));

      await financialReportController.searchFinancialReportsVector(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getSimilarFinancialReports', () => {
    it('should find similar financial reports with empty results', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      req.query = { limit: 5 };

      const similarResults = {
        similar_documents: []
      };

      vectorService.findSimilarDocuments.mockResolvedValue(similarResults);
      FinancialReport.find.mockResolvedValue([]);

      await financialReportController.getSimilarFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          source_report_id: '507f1f77bcf86cd799439011',
          similar_reports: [],
          total_count: 0
        })
      );
    });

    it('should return 400 for invalid ID format', async () => {
      req.params.id = 'invalid-id';

      await financialReportController.getSimilarFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle vector service errors', async () => {
      req.params.id = '507f1f77bcf86cd799439011';
      vectorService.findSimilarDocuments.mockRejectedValue(new Error('Vector error'));

      await financialReportController.getSimilarFinancialReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getFinancialReportInsights', () => {
    const mockReports = [
      { totalRevenue: 100000, totalExpenses: 60000, netIncome: 40000, reportDate: new Date() },
      { totalRevenue: 120000, totalExpenses: 70000, netIncome: 50000, reportDate: new Date() }
    ];

    it('should generate insights for financial reports', async () => {
      req.query = { companyId: 'company-123' };

      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockReports)
        })
      });

      memoryService.cacheData.mockResolvedValue({});

      await financialReportController.getFinancialReportInsights(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          insights: expect.any(Object)
        })
      );
    });

    it('should return 404 when no reports found', async () => {
      req.query = { companyId: 'company-999' };

      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      });

      await financialReportController.getFinancialReportInsights(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'No financial reports found for analysis' })
      );
    });

    it('should handle database errors', async () => {
      req.query = { companyId: 'company-123' };

      FinancialReport.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      });

      await financialReportController.getFinancialReportInsights(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
