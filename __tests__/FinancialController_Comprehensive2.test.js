// __tests__/ComprehensiveController.test.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const httpMocks = require('node-mocks-http');

// Mock setup
jest.mock('jsonwebtoken');
jest.mock('../models/financialReport');
jest.mock('../config', () => ({
  JWT_SECRET: 'test-secret',
  MONGODB_URI: 'mongodb://localhost:27017/opencap_test',
  API_VERSION: 'v1',
  AUTH: {
    TOKEN_EXPIRATION: '24h',
    REFRESH_TOKEN_EXPIRATION: '7d',
    SALT_ROUNDS: 10
  },
  PERMISSIONS: {
    GET: 'read:reports',
    POST: 'create:reports',
    PUT: 'update:reports',
    PATCH: 'update:reports',
    DELETE: 'delete:reports'
  }
}));

// Mock MongoDB session
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn()
};

mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

const FinancialReport = require('../models/financialReport');
const FinancialReportController = require('../controllers/financialReportingController');

describe('Financial Report Controller', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();

    // Reset session mocks
    mockSession.startTransaction.mockClear();
    mockSession.commitTransaction.mockClear();
    mockSession.abortTransaction.mockClear();
    mockSession.endSession.mockClear();
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
    Timestamp: new Date().toISOString(),
    userId: 'test-user-id'
  };

  describe('Business Logic Validation', () => {
    describe('calculateFinancialMetrics', () => {
      test('should validate correct calculations', () => {
        const result = FinancialReportController.calculateFinancialMetrics(validTestData);
        expect(result.isValid).toBe(true);
        expect(result.calculatedNetIncome).toBe('500000.00');
        expect(result.error).toBeNull();
      });

      test('should reject invalid calculations', () => {
        const invalidData = { ...validTestData, NetIncome: '600000.00' };
        const result = FinancialReportController.calculateFinancialMetrics(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Net income does not match revenue minus expenses');
      });

      test('should handle invalid numerical values', () => {
        const invalidData = { ...validTestData, TotalRevenue: 'invalid' };
        const result = FinancialReportController.calculateFinancialMetrics(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid numerical values provided');
      });

      test('should handle missing data', () => {
        const result = FinancialReportController.calculateFinancialMetrics(null);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Report data is required for calculation');
      });
    });

    describe('validateReportingPeriod', () => {
      test('should validate annual reports', () => {
        const result = FinancialReportController.validateReportingPeriod(validTestData);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should validate quarterly reports', () => {
        const quarterlyData = {
          ...validTestData,
          Type: 'Quarterly',
          Data: {
            revenue: { q1: 250000 },
            expenses: { q1: 125000 }
          }
        };
        const result = FinancialReportController.validateReportingPeriod(quarterlyData);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should reject invalid annual reports', () => {
        const invalidData = {
          ...validTestData,
          Data: {
            revenue: { q1: 250000 },
            expenses: { q1: 125000 }
          }
        };
        const result = FinancialReportController.validateReportingPeriod(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Annual report must include data for all quarters');
      });

      test('should reject invalid quarterly reports', () => {
        const invalidData = {
          ...validTestData,
          Type: 'Quarterly',
          Data: {
            revenue: { q1: 250000, q2: 250000 },
            expenses: { q1: 125000 }
          }
        };
        const result = FinancialReportController.validateReportingPeriod(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Quarterly report must include data for exactly one quarter');
      });

      test('should reject invalid report types', () => {
        const invalidData = { ...validTestData, Type: 'Monthly' };
        const result = FinancialReportController.validateReportingPeriod(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid report type. Must be either Annual or Quarterly');
      });
    });

    describe('validateFinancialReport', () => {
      test('should validate complete reports', () => {
        const result = FinancialReportController.validateFinancialReport(validTestData);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });

      test('should reject missing required fields', () => {
        const { TotalRevenue, ...incompleteData } = validTestData;
        const result = FinancialReportController.validateFinancialReport(incompleteData);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Missing required fields');
        expect(result.error).toContain('TotalRevenue');
      });

      test('should reject negative values', () => {
        const invalidData = { ...validTestData, TotalRevenue: '-1000000.00' };
        const result = FinancialReportController.validateFinancialReport(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Financial values cannot be negative');
      });

      test('should reject negative quarterly values', () => {
        const invalidData = {
          ...validTestData,
          Data: {
            revenue: { q1: -250000 },
            expenses: { q1: 125000 }
          }
        };
        const result = FinancialReportController.validateFinancialReport(invalidData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Financial values cannot be negative');
      });
    });
  });

  describe('Authorization', () => {
    describe('checkUserPermissions', () => {
      test('should allow admin access', async () => {
        req.user = { role: 'admin' };
        await FinancialReportController.checkUserPermissions(req, res, next);
        expect(next).toHaveBeenCalledWith();
      });

      test('should check user permissions', async () => {
        req.user = { role: 'user', permissions: ['read:reports'] };
        req.method = 'GET';
        await FinancialReportController.checkUserPermissions(req, res, next);
        expect(next).toHaveBeenCalledWith();
      });

      test('should reject unauthorized access', async () => {
        req.user = { role: 'user', permissions: ['read:reports'] };
        req.method = 'POST';
        await FinancialReportController.checkUserPermissions(req, res, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Insufficient permissions',
            statusCode: 403
          })
        );
      });

      test('should handle missing user', async () => {
        await FinancialReportController.checkUserPermissions(req, res, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'User not authenticated',
            statusCode: 401
          })
        );
      });
    });

    describe('validateApiKey', () => {
      test('should validate valid API key', async () => {
        const apiKey = 'valid-key';
        req.headers = { 'x-api-key': apiKey };
        jwt.verify.mockReturnValueOnce({ permissions: ['read:reports'] });

        await FinancialReportController.validateApiKey(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.apiPermissions).toEqual(['read:reports']);
      });

      test('should reject missing API key', async () => {
        await FinancialReportController.validateApiKey(req, res, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'API key is required',
            statusCode: 401
          })
        );
      });

      test('should reject invalid API key', async () => {
        req.headers = { 'x-api-key': 'invalid-key' };
        jwt.verify.mockImplementationOnce(() => {
          throw new Error('Invalid token');
        });

        await FinancialReportController.validateApiKey(req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid API key',
            statusCode: 401
          })
        );
      });

      test('should reject invalid permissions format', async () => {
        req.headers = { 'x-api-key': 'valid-key' };
        jwt.verify.mockReturnValueOnce({ permissions: 'invalid' });

        await FinancialReportController.validateApiKey(req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid API key permissions',
            statusCode: 401
          })
        );
      });
    });

    describe('authorizeReportAccess', () => {
      test('should authorize admin access', async () => {
        req.params = { id: 'test-id' };
        req.user = { role: 'admin' };
        FinancialReport.findOne.mockResolvedValueOnce(validTestData);

        await FinancialReportController.authorizeReportAccess(req, res, next);
        
        expect(next).toHaveBeenCalledWith();
      });

      test('should authorize owner access', async () => {
        const report = { ...validTestData, userId: 'user-123' };
        req.params = { id: 'test-id' };
        req.user = { id: 'user-123', role: 'user' };
        FinancialReport.findOne.mockResolvedValueOnce(report);

        await FinancialReportController.authorizeReportAccess(req, res, next);
        
        expect(next).toHaveBeenCalledWith();
      });

      test('should reject unauthorized access', async () => {
        const report = { ...validTestData, userId: 'other-user' };
        req.params = { id: 'test-id' };
        req.user = { id: 'user-123', role: 'user' };
        FinancialReport.findOne.mockResolvedValueOnce(report);

        await FinancialReportController.authorizeReportAccess(req, res, next);
        
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Unauthorized access to report',
            statusCode: 403
          })
        );
      });
    });
  });

  // Comment out CRUD Operations section
  /*
  describe('CRUD Operations', () => {
    beforeEach(() => {
      mongoose.startSession.mockClear();
      mockSession.startTransaction.mockClear();
      mockSession.commitTransaction.mockClear();
      mockSession.abortTransaction.mockClear();
      mockSession.endSession.mockClear();
      mongoose.startSession.mockResolvedValue(mockSession);
    });
  
    describe('Create Operations', () => {
      // ... (all create operation tests)
    });
  
    describe('Read Operations', () => {
      // ... (all read operation tests)
    });
  
    describe('Delete Operations', () => {
      // ... (all delete operation tests)
    });
  });
  */
});