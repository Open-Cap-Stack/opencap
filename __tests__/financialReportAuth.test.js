// __tests__/financialReportAuth.test.js
const { 
    checkUserPermissions,
    validateApiKey,
    authorizeReportAccess
  } = require('../controllers/financialReportAuthController');
  const FinancialReport = require('../models/financialReport');
  const httpMocks = require('node-mocks-http');
  
  jest.mock('../models/financialReport');
  
  describe('Financial Report Authorization', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = httpMocks.createRequest();
      res = httpMocks.createResponse();
      next = jest.fn();
      jest.clearAllMocks();
    });
  
    describe('User Permissions', () => {
      it('should authorize users with admin role', async () => {
        req.user = {
          role: 'admin',
          permissions: ['create:reports', 'read:reports', 'update:reports', 'delete:reports']
        };
  
        await checkUserPermissions(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalledWith(expect.any(Error));
      });
  
      it('should restrict access for users without proper permissions', async () => {
        req.user = {
          role: 'user',
          permissions: ['read:reports']
        };
        req.method = 'POST';
  
        await checkUserPermissions(req, res, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Insufficient permissions',
            statusCode: 403
          })
        );
      });
    });
  
    describe('API Key Validation', () => {
      it('should validate valid API key', async () => {
        req.headers = { 'x-api-key': 'valid-api-key-123' };
  
        await validateApiKey(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalledWith(expect.any(Error));
        expect(req.apiPermissions).toContain('read:reports');
      });
  
      it('should reject missing API key', async () => {
        req.headers = {};
  
        await validateApiKey(req, res, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'API key is required',
            statusCode: 401
          })
        );
      });
    });
  
    describe('Report Access Authorization', () => {
      it('should authorize access to own reports', async () => {
        const reportId = 'test-report-123';
        req.params = { id: reportId };
        req.user = {
          id: 'user-123',
          role: 'user'
        };
  
        const mockReport = {
          ReportID: reportId,
          userId: 'user-123'
        };
  
        FinancialReport.findOne = jest.fn().mockResolvedValue(mockReport);
  
        await authorizeReportAccess(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalledWith(expect.any(Error));
      });
  
      it('should deny access to other users reports', async () => {
        const reportId = 'test-report-123';
        req.params = { id: reportId };
        req.user = {
          id: 'different-user',
          role: 'user'
        };
  
        const mockReport = {
          ReportID: reportId,
          userId: 'user-123'
        };
  
        FinancialReport.findOne = jest.fn().mockResolvedValue(mockReport);
  
        await authorizeReportAccess(req, res, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Unauthorized access to report',
            statusCode: 403
          })
        );
      });
    });
  });