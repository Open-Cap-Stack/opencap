const { createFinancialReport } = require('../controllers/financialReportingController');
const FinancialReport = require('../models/financialReport');
const httpMocks = require('node-mocks-http');

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

  it('should create a new financial report and return 201 status', async () => {
    // Setup request body with fixed timestamp
    const testData = {
      ReportID: 'test-id',
      Type: 'Annual',
      Data: { key: 'test-data' },
      TotalRevenue: '1000.00',
      TotalExpenses: '500.00',
      NetIncome: '500.00',
      EquitySummary: ['uuid1', 'uuid2'],
      Timestamp: new Date().toISOString() // Convert to ISO string format
    };

    req.body = testData;

    // Mock the constructor and save method
    const mockSave = jest.fn().mockResolvedValue(testData);
    const mockInstance = { save: mockSave };
    FinancialReport.mockImplementation(() => mockInstance);

    // Execute controller
    await createFinancialReport(req, res, next);

    // Get response data and parse it
    const responseData = JSON.parse(res._getData());

    // Assertions
    expect(FinancialReport).toHaveBeenCalledWith(testData);
    expect(mockSave).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(responseData).toEqual(testData); // Compare with the original test data
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle errors and pass them to the error handling middleware', async () => {
    // Setup request body with fixed timestamp
    const testData = {
      ReportID: 'test-id',
      Type: 'Annual',
      Data: { key: 'test-data' },
      TotalRevenue: '1000.00',
      TotalExpenses: '500.00',
      NetIncome: '500.00',
      EquitySummary: ['uuid1', 'uuid2'],
      Timestamp: new Date().toISOString() // Convert to ISO string format
    };

    req.body = testData;

    // Mock constructor and save method to throw error
    const error = new Error('Failed to create financial report');
    const mockSave = jest.fn().mockRejectedValue(error);
    FinancialReport.mockImplementation(() => ({ save: mockSave }));

    // Execute controller
    await createFinancialReport(req, res, next);

    // Assertions
    expect(FinancialReport).toHaveBeenCalledWith(testData);
    expect(mockSave).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});