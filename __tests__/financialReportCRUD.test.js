// __tests__/financialReportCRUD.test.js
const { 
  createFinancialReport,
  getFinancialReport,
  listFinancialReports,
  updateFinancialReport,
  deleteFinancialReport
} = require('../controllers/financialReportCrudController');
const FinancialReport = require('../models/financialReport');
const httpMocks = require('node-mocks-http');

jest.mock('../models/financialReport');

describe('Financial Report CRUD Operations', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  const sampleReport = {
    ReportID: 'test-id-123',
    Type: 'Annual',
    Data: { 
      revenue: { q1: 250000, q2: 250000, q3: 250000, q4: 250000 },
      expenses: { q1: 125000, q2: 125000, q3: 125000, q4: 125000 }
    },
    TotalRevenue: '1000000.00',
    TotalExpenses: '500000.00',
    NetIncome: '500000.00',
    EquitySummary: ['uuid1', 'uuid2'],
    Timestamp: new Date().toISOString()
  };

  describe('CREATE Operations', () => {
    it('should create a new financial report', async () => {
      const newReport = { ...sampleReport };
      req.body = newReport;
      
      FinancialReport.prototype.save = jest.fn().mockResolvedValue(newReport);

      await createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(newReport);
    });

    it('should handle validation errors during creation', async () => {
      const invalidReport = { ...sampleReport };
      delete invalidReport.Type;
      req.body = invalidReport;

      await createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Missing required fields: Type'
      });
    });

    it('should handle duplicate ReportID', async () => {
      req.body = sampleReport;
      
      const duplicateError = new Error('Duplicate key error');
      duplicateError.code = 11000;
      
      FinancialReport.prototype.save = jest.fn().mockRejectedValue(duplicateError);

      await createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(duplicateError);
    });
  });

  describe('READ Operations', () => {
    it('should list financial reports with pagination', async () => {
      req.query = { page: 1, limit: 10 };
      const reports = [sampleReport, { ...sampleReport, ReportID: 'test-id-456' }];
  
      FinancialReport.find = jest.fn().mockReturnThis();
      FinancialReport.skip = jest.fn().mockReturnThis();
      FinancialReport.limit = jest.fn().mockResolvedValue(reports);
      FinancialReport.countDocuments = jest.fn().mockResolvedValue(2);
  
      await listFinancialReports(req, res, next);
  
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        reports: reports,
        totalCount: 2,
        currentPage: 1,
        totalPages: 1
      });
  
      expect(FinancialReport.find).toHaveBeenCalled();
      expect(FinancialReport.skip).toHaveBeenCalledWith(0);
      expect(FinancialReport.limit).toHaveBeenCalledWith(10);
    });
  
    it('should handle edge case pagination parameters', async () => {
      req.query = { page: -1, limit: 'invalid' };
      
      const mockReports = [];
      FinancialReport.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockReports)
        })
      });
      FinancialReport.countDocuments = jest.fn().mockResolvedValue(0);
  
      await listFinancialReports(req, res, next);
  
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        reports: [], // Ensure empty array instead of empty object
        totalCount: 0,
        currentPage: -1,
        totalPages: 0
      });
    });
  
    it('should list all financial reports with pagination', async () => {
      req.query = { page: 1, limit: 10 };
      const reports = [sampleReport, { ...sampleReport, ReportID: 'test-id-456' }];
      const totalCount = 2;
  
      FinancialReport.find = jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(reports)
        })
      });
      FinancialReport.countDocuments = jest.fn().mockResolvedValue(totalCount);
  
      await listFinancialReports(req, res, next);
  
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        reports,
        totalCount,
        currentPage: 1,
        totalPages: 1
      });
  
      const skip = (1 - 1) * 10;
      expect(FinancialReport.find().skip).toHaveBeenCalledWith(skip);
      expect(FinancialReport.find().skip().limit).toHaveBeenCalledWith(10);
    });
  
    it('should handle database errors during read', async () => {
      req.params = { id: 'test-id' };
      
      const dbError = new Error('Database connection lost');
      FinancialReport.findOne = jest.fn().mockRejectedValue(dbError);
  
      await getFinancialReport(req, res, next);
  
      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  describe('UPDATE Operations', () => {
    it('should update an existing financial report', async () => {
      const reportId = 'test-id-123';
      const updatedData = { 
        ...sampleReport,
        TotalRevenue: '1100000.00',
        TotalExpenses: '600000.00',
        NetIncome: '500000.00'
      };

      req.params = { id: reportId };
      req.body = updatedData;

      FinancialReport.findOneAndUpdate = jest.fn().mockResolvedValue(updatedData);

      await updateFinancialReport(req, res, next);

      expect(FinancialReport.findOneAndUpdate).toHaveBeenCalledWith(
        { ReportID: reportId },
        updatedData,
        { new: true, runValidators: true }
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(updatedData);
    });

    it('should handle validation errors during update', async () => {
      const reportId = 'test-id-123';
      const invalidData = {
        TotalRevenue: '1100000.00'  // Missing required fields
      };

      req.params = { id: reportId };
      req.body = invalidData;

      await updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Missing required fields: ReportID, Type, Data, TotalExpenses, NetIncome, Timestamp'
      });
    });

    it('should handle non-existent report update', async () => {
      const reportId = 'non-existent-id';
      req.params = { id: reportId };
      req.body = sampleReport;

      FinancialReport.findOneAndUpdate = jest.fn().mockResolvedValue(null);

      await updateFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Financial report not found'
      });
    });
  });

  describe('DELETE Operations', () => {
    it('should delete an existing financial report', async () => {
      const reportId = 'test-id-123';
      req.params = { id: reportId };

      FinancialReport.findOneAndDelete = jest.fn().mockResolvedValue(sampleReport);

      await deleteFinancialReport(req, res, next);

      expect(FinancialReport.findOneAndDelete).toHaveBeenCalledWith({ ReportID: reportId });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Financial report deleted successfully',
        report: sampleReport
      });
    });

    it('should handle deletion of non-existent report', async () => {
      req.params = { id: 'non-existent-id' };

      FinancialReport.findOneAndDelete = jest.fn().mockResolvedValue(null);

      await deleteFinancialReport(req, res, next);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toEqual({
        message: 'Financial report not found'
      });
    });

    it('should handle database errors during deletion', async () => {
      req.params = { id: 'test-id' };
      
      const dbError = new Error('Database error');
      FinancialReport.findOneAndDelete = jest.fn().mockRejectedValue(dbError);

      await deleteFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });
});