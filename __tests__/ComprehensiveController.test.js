const { createFinancialReport } = require('../controllers/financialReportingController');
const FinancialReport = require('../models/financialReport');
const httpMocks = require('node-mocks-http');
const mongoose = require('mongoose');

// Mock the entire model
jest.mock('../models/financialReport');

describe('createFinancialReport Controller', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  const validTestData = {
    ReportID: 'test-id',
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

  describe('Successful Operations', () => {
    it('should create a new financial report and return 201 status', async () => {
      req.body = validTestData;
      const mockSave = jest.fn().mockResolvedValue(validTestData);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      const responseData = JSON.parse(res._getData());
      expect(FinancialReport).toHaveBeenCalledWith(validTestData);
      expect(mockSave).toHaveBeenCalled();
      expect(res.statusCode).toBe(201);
      expect(responseData).toEqual(validTestData);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle quarterly reports correctly', async () => {
      const quarterlyData = { ...validTestData, Type: 'Quarterly' };
      req.body = quarterlyData;
      const mockSave = jest.fn().mockResolvedValue(quarterlyData);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(quarterlyData);
    });
  });

  describe('Validation Errors', () => {
    it('should handle invalid report type', async () => {
      const invalidData = { ...validTestData, Type: 'Monthly' };
      req.body = invalidData;
      
      const validationError = new mongoose.Error.ValidationError();
      validationError.errors.Type = new mongoose.Error.ValidatorError({
        message: 'Invalid report type. Must be either Annual or Quarterly',
        path: 'Type'
      });
      
      const mockSave = jest.fn().mockRejectedValue(validationError);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
    });

    it('should handle missing required fields', async () => {
      const { TotalRevenue, ...incompleteData } = validTestData;
      req.body = incompleteData;

      const validationError = new mongoose.Error.ValidationError();
      validationError.errors.TotalRevenue = new mongoose.Error.ValidatorError({
        message: 'TotalRevenue is required',
        path: 'TotalRevenue'
      });

      const mockSave = jest.fn().mockRejectedValue(validationError);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        name: 'ValidationError'
      }));
    });
  });

  describe('Data Integrity', () => {
    it('should handle duplicate ReportID', async () => {
      req.body = validTestData;
      
      // Create a duplicate key error that matches Mongoose's error structure
      const duplicateError = new Error('E11000 duplicate key error');
      duplicateError.code = 11000;
      duplicateError.index = 0;
      duplicateError.keyPattern = { ReportID: 1 };
      duplicateError.keyValue = { ReportID: validTestData.ReportID };
      
      const mockSave = jest.fn().mockRejectedValue(duplicateError);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        code: 11000,
        keyPattern: { ReportID: 1 },
        keyValue: { ReportID: validTestData.ReportID }
      }));
    });

    it('should verify financial calculations', async () => {
      const invalidCalculations = {
        ...validTestData,
        TotalRevenue: '1000000.00',
        TotalExpenses: '500000.00',
        NetIncome: '400000.00' // Incorrect net income
      };
      req.body = invalidCalculations;

      const validationError = new Error('Net income does not match revenue minus expenses');
      const mockSave = jest.fn().mockRejectedValue(validationError);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Net income does not match revenue minus expenses'
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      req.body = validTestData;
      
      const dbError = new Error('Database connection failed');
      const mockSave = jest.fn().mockRejectedValue(dbError);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(dbError);
    });

    it('should handle unexpected errors', async () => {
      req.body = validTestData;
      
      const unexpectedError = new Error('Unexpected server error');
      const mockSave = jest.fn().mockRejectedValue(unexpectedError);
      FinancialReport.mockImplementation(() => ({ save: mockSave }));

      await createFinancialReport(req, res, next);

      expect(next).toHaveBeenCalledWith(unexpectedError);
    });
  });
});