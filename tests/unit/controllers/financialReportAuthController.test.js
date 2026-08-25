/**
 * Financial Report Auth Controller Tests
 *
 * Tests for permission checking, API key validation, and report access
 * authorization middleware in financialReportAuthController.js
 */

const httpMocks = require('node-mocks-http');
const { checkUserPermissions, validateApiKey, authorizeReportAccess } = require('../../../controllers/financialReportAuthController');
const FinancialReport = require('../../../models/financialReport');

// Mock the FinancialReport model
jest.mock('../../../models/financialReport', () => ({
  findOne: jest.fn()
}));

describe('financialReportAuthController', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
  });

  // ─── checkUserPermissions ──────────────────────────────────────────

  describe('checkUserPermissions', () => {
    it('should allow admin users without checking permissions', async () => {
      req.user = { role: 'admin', permissions: [] };
      req.method = 'GET';

      await checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should allow users with the correct permission for GET', async () => {
      req.user = { role: 'user', permissions: ['read:reports'] };
      req.method = 'GET';

      await checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow users with the correct permission for POST', async () => {
      req.user = { role: 'user', permissions: ['create:reports'] };
      req.method = 'POST';

      await checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow users with the correct permission for PUT', async () => {
      req.user = { role: 'user', permissions: ['update:reports'] };
      req.method = 'PUT';

      await checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow users with the correct permission for DELETE', async () => {
      req.user = { role: 'user', permissions: ['delete:reports'] };
      req.method = 'DELETE';

      await checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject users without the required permission', async () => {
      req.user = { role: 'user', permissions: ['read:reports'] };
      req.method = 'POST';

      await checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
    });

    it('should reject users with empty permissions array', async () => {
      req.user = { role: 'user', permissions: [] };
      req.method = 'GET';

      await checkUserPermissions(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });

    it('should call next with 500 error when user object is missing', async () => {
      // user is undefined, accessing user.role will throw
      req.user = undefined;
      req.method = 'GET';

      await checkUserPermissions(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(500);
    });
  });

  // ─── validateApiKey ────────────────────────────────────────────────

  describe('validateApiKey', () => {
    it('should reject request without API key', async () => {
      // No x-api-key header

      await validateApiKey(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('API key is required');
      expect(error.statusCode).toBe(401);
    });

    it('should set apiPermissions and call next when API key is present', async () => {
      req.headers['x-api-key'] = 'some-valid-key';

      await validateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.apiPermissions).toEqual(['read:reports']);
    });

    it('should handle any truthy API key value', async () => {
      req.headers['x-api-key'] = 'abc123';

      await validateApiKey(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.apiPermissions).toBeDefined();
    });
  });

  // ─── authorizeReportAccess ─────────────────────────────────────────

  describe('authorizeReportAccess', () => {
    it('should allow admin access to any report', async () => {
      req.params = { id: 'RPT-001' };
      req.user = { id: 'user-1', role: 'admin' };

      const mockReport = { ReportID: 'RPT-001', userId: 'user-2' };
      FinancialReport.findOne.mockResolvedValue(mockReport);

      await authorizeReportAccess(req, res, next);

      expect(FinancialReport.findOne).toHaveBeenCalledWith({ ReportID: 'RPT-001' });
      expect(next).toHaveBeenCalledWith();
    });

    it('should allow owner access to their report', async () => {
      req.params = { id: 'RPT-001' };
      req.user = { id: 'user-1', role: 'user' };

      const mockReport = { ReportID: 'RPT-001', userId: 'user-1' };
      FinancialReport.findOne.mockResolvedValue(mockReport);

      await authorizeReportAccess(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should reject non-owner access to a report', async () => {
      req.params = { id: 'RPT-001' };
      req.user = { id: 'user-1', role: 'user' };

      const mockReport = { ReportID: 'RPT-001', userId: 'user-2' };
      FinancialReport.findOne.mockResolvedValue(mockReport);

      await authorizeReportAccess(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Unauthorized access to report');
      expect(error.statusCode).toBe(403);
    });

    it('should return 404 when report is not found', async () => {
      req.params = { id: 'RPT-MISSING' };
      req.user = { id: 'user-1', role: 'user' };

      FinancialReport.findOne.mockResolvedValue(null);

      await authorizeReportAccess(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Report not found');
      expect(error.statusCode).toBe(404);
    });

    it('should call next with 500 error on database failure', async () => {
      req.params = { id: 'RPT-001' };
      req.user = { id: 'user-1', role: 'user' };

      FinancialReport.findOne.mockRejectedValue(new Error('DB connection failed'));

      await authorizeReportAccess(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(500);
    });
  });
});
