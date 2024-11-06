// __tests__/FinancialReportAuth.test.js
const { 
    checkUserPermissions,
    validateApiKey,
    authorizeReportAccess
  } = require('../controllers/financialReportingController');
  const httpMocks = require('node-mocks-http');
  const jwt = require('jsonwebtoken');
  
  jest.mock('jsonwebtoken');
  
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
  
      it('should handle role-based access control', async () => {
        req.user = {
          role: 'financial_analyst',
          permissions: ['create:reports', 'read:reports', 'update:reports']
        };
        req.method = 'DELETE';
  
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
        const apiKey = 'valid-api-key-123';
        req.headers = { 'x-api-key': apiKey };
  
        jwt.verify.mockImplementation(() => ({
          permissions: ['create:reports', 'read:reports']
        }));
  
        await validateApiKey(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(next).not.toHaveBeenCalledWith(expect.any(Error));
      });
  
      it('should reject invalid API key', async () => {
        const apiKey = 'invalid-api-key';
        req.headers = { 'x-api-key': apiKey };
  
        jwt.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
  
        await validateApiKey(req, res, next);
        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Invalid API key',
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
          ReportID: reportI