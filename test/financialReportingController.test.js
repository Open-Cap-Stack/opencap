const { createFinancialReport } = require('../controllers/financialReportingController');
const FinancialReport = require('../models/financialReport');

const httpMocks = require('node-mocks-http');
const mongoose = require('mongoose');

// Mock the FinancialReport model
jest.mock('../models/financialReport');

describe('createFinancialReport Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
  });

  it('should create a new financial report and return 201 status', async () => {
    // Mock request body
    req.body = {
      ReportID: 'test-id',
      Type: 'test-type',
      Data: 'test-data',
      Timestamp: new Date(),
    };

    // Mock the save function
    FinancialReport.prototype.save = jest.fn().mockResolvedValue(req.body);

    await createFinancialReport(req, res, next);

    // Assertions
    expect(FinancialReport).toHaveBeenCalledWith(req.body);
    expect(FinancialReport.prototype.save).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res._getJSONData()).toEqual(req.body);
    expect(next).not.toHaveBeenCalled();
  });

  it('should handle errors and pass them to the error handling middleware', async () => {
    const errorMessage = 'Failed to create financial report';
    const rejectedPromise = Promise.reject(new Error(errorMessage));
    FinancialReport.prototype.save = jest.fn().mockReturnValue(rejectedPromise);

    await createFinancialReport(req, res, next);

    expect(FinancialReport.prototype.save).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: errorMessage }));
  });
});
