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
  
    describe('READ Operations', () => {
      it('should get a single financial report by ID', async () => {
        const reportId = 'test-id-123';
        req.params = { id: reportId };
        
        FinancialReport.findOne = jest.fn().mockResolvedValue(sampleReport);
  
        await getFinancialReport(req, res, next);
  
        expect(FinancialReport.findOne).toHaveBeenCalledWith({ ReportID: reportId });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res._getData())).toEqual(sampleReport);
      });
  
      it('should handle non-existent report', async () => {
        req.params = { id: 'non-existent-id' };
        
        FinancialReport.findOne = jest.fn().mockResolvedValue(null);
  
        await getFinancialReport(req, res, next);
  
        expect(res.statusCode).toBe(404);
        expect(JSON.parse(res._getData())).toEqual({ 
          message: 'Financial report not found' 
        });
      });
  
      it('should list all financial reports with pagination', async () => {
        req.query = { page: 1, limit: 10 };
        const reports = [sampleReport, { ...sampleReport, ReportID: 'test-id-456' }];
        const totalCount = 2;
  
        FinancialReport.find = jest.fn().mockReturnThis();
        FinancialReport.skip = jest.fn().mockReturnThis();
        FinancialReport.limit = jest.fn().mockResolvedValue(reports);
        FinancialReport.countDocuments = jest.fn().mockResolvedValue(totalCount);
  
        await listFinancialReports(req, res, next);
  
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res._getData())).toEqual({
          reports,
          totalCount,
          currentPage: 1,
          totalPages: 1
        });
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
  
        FinancialReport.findOneAndUpdate = jest.fn()
          .mockResolvedValue(updatedData);
  
        await updateFinancialReport(req, res, next);
  
        expect(FinancialReport.findOneAndUpdate).toHaveBeenCalledWith(
          { ReportID: reportId },
          updatedData,
          { new: true, runValidators: true }
        );
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res._getData())).toEqual(updatedData);
      });
  
      it('should handle update validation errors', async () => {
        const reportId = 'test-id-123';
        const invalidData = {
          ...sampleReport,
          TotalRevenue: '-1000000.00' // Invalid negative value
        };
  
        req.params = { id: reportId };
        req.body = invalidData;
  
        await updateFinancialReport(req, res, next);
  
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res._getData())).toEqual({
          error: 'Financial values cannot be negative'
        });
      });
    });
  
    describe('DELETE Operations', () => {
      it('should delete an existing financial report', async () => {
        const reportId = 'test-id-123';
        req.params = { id: reportId };
  
        FinancialReport.findOneAndDelete = jest.fn()
          .mockResolvedValue(sampleReport);
  
        await deleteFinancialReport(req, res, next);
  
        expect(FinancialReport.findOneAndDelete)
          .toHaveBeenCalledWith({ ReportID: reportId });
        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res._getData())).toEqual({
          message: 'Financial report deleted successfully',
          report: sampleReport
        });
      });
  
      it('should handle deletion of non-existent report', async () => {
        req.params = { id: 'non-existent-id' };
  
        FinancialReport.findOneAndDelete = jest.fn()
          .mockResolvedValue(null);
  
        await deleteFinancialReport(req, res, next);
  
        expect(res.statusCode).toBe(404);
        expect(JSON.parse(res._getData())).toEqual({
          message: 'Financial report not found'
        });
      });
    });
  });