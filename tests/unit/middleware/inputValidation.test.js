/**
 * Input Validation Middleware Test Suite
 * [Test] Issue #41: Implement Middleware Test Suite
 *
 * Comprehensive tests for request validation middleware
 * Target coverage: 80%+
 */

const {
  sanitizeBody,
  sanitizeQuery,
  validateObjectId,
  preventOperatorInjection,
  logInjectionAttempts,
  enforceSizeLimits,
  validatePagination,
  preventRegexInjection,
  securityMiddleware
} = require('../../../middleware/inputValidation');

// Mock the inputSanitizer utilities
jest.mock('../../../utils/inputSanitizer', () => ({
  sanitizeMongoQuery: jest.fn(obj => obj),
  sanitizeRequestBody: jest.fn(obj => obj),
  sanitizeQueryParams: jest.fn(obj => obj),
  isValidObjectId: jest.fn(id => /^[0-9a-fA-F]{24}$/.test(id))
}));

const {
  sanitizeMongoQuery,
  sanitizeRequestBody,
  sanitizeQueryParams,
  isValidObjectId
} = require('../../../utils/inputSanitizer');

describe('Input Validation Middleware', () => {
  let req;
  let res;
  let next;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      path: '/api/test',
      method: 'POST',
      get: jest.fn()
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    next = jest.fn();

    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('sanitizeBody', () => {
    it('should call next when body is valid', () => {
      req.body = { name: 'Test', email: 'test@example.com' };
      sanitizeRequestBody.mockReturnValue(req.body);

      const middleware = sanitizeBody();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(sanitizeRequestBody).toHaveBeenCalledWith(req.body, {});
    });

    it('should apply schema validation when provided', () => {
      const schema = { name: { type: 'string' } };
      req.body = { name: 'Test' };
      sanitizeRequestBody.mockReturnValue(req.body);

      const middleware = sanitizeBody(schema);
      middleware(req, res, next);

      expect(sanitizeRequestBody).toHaveBeenCalledWith(req.body, schema);
    });

    it('should call next when body is not an object', () => {
      req.body = null;

      const middleware = sanitizeBody();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 on sanitization error', () => {
      req.body = { name: 'Test' };
      sanitizeRequestBody.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const middleware = sanitizeBody();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request body format'
      });
      expect(next).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle undefined body', () => {
      req.body = undefined;

      const middleware = sanitizeBody();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('sanitizeQuery', () => {
    it('should sanitize query parameters', () => {
      req.query = { page: '1', limit: '10' };
      sanitizeQueryParams.mockReturnValue(req.query);

      const middleware = sanitizeQuery();
      middleware(req, res, next);

      expect(sanitizeQueryParams).toHaveBeenCalledWith(req.query);
      expect(next).toHaveBeenCalled();
    });

    it('should call next when query is not an object', () => {
      req.query = null;

      const middleware = sanitizeQuery();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 on sanitization error', () => {
      req.query = { page: '1' };
      sanitizeQueryParams.mockImplementation(() => {
        throw new Error('Query sanitization failed');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const middleware = sanitizeQuery();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid query parameters'
      });

      consoleSpy.mockRestore();
    });
  });

  describe('validateObjectId', () => {
    it('should call next for valid ObjectId', () => {
      req.params.id = '507f1f77bcf86cd799439011';
      isValidObjectId.mockReturnValue(true);

      const middleware = validateObjectId('id');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 400 for missing parameter', () => {
      req.params = {};

      const middleware = validateObjectId('id');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required parameter: id'
      });
    });

    it('should return 400 for invalid ObjectId', () => {
      req.params.id = 'invalid-id';
      isValidObjectId.mockReturnValue(false);

      const middleware = validateObjectId('id');
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid id format'
      });
    });

    it('should use default param name "id"', () => {
      req.params.id = '507f1f77bcf86cd799439011';
      isValidObjectId.mockReturnValue(true);

      const middleware = validateObjectId();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate custom parameter names', () => {
      req.params.userId = '507f1f77bcf86cd799439011';
      isValidObjectId.mockReturnValue(true);

      const middleware = validateObjectId('userId');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('preventOperatorInjection', () => {
    it('should call next for safe requests', () => {
      req.query = { name: 'test' };
      req.body = { email: 'test@example.com' };
      sanitizeMongoQuery.mockReturnValue(req.query);

      const middleware = preventOperatorInjection();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block MongoDB operators in body', () => {
      req.body = { $where: 'malicious code' };

      const middleware = preventOperatorInjection();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request format'
      });
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      req.query = { name: 'test' };
      sanitizeMongoQuery.mockReturnValue({ name: 'test' });

      const middleware = preventOperatorInjection();
      middleware(req, res, next);

      expect(sanitizeMongoQuery).toHaveBeenCalledWith(
        req.query,
        expect.objectContaining({ allowOperators: false })
      );
    });

    it('should handle sanitization errors', () => {
      req.query = { page: '1' };
      sanitizeMongoQuery.mockImplementation(() => {
        throw new Error('Sanitization error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const middleware = preventOperatorInjection();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request format'
      });

      consoleSpy.mockRestore();
    });
  });

  describe('logInjectionAttempts', () => {
    it('should call next for safe requests', () => {
      req.query = { name: 'test' };
      req.body = { email: 'test@example.com' };
      req.params = { id: '123' };

      const middleware = logInjectionAttempts();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should log and call next for $where pattern', () => {
      req.body = { query: '$where something' };
      req.get.mockReturnValue('Mozilla/5.0');

      const middleware = logInjectionAttempts();
      middleware(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Potential injection attempt detected',
        expect.objectContaining({
          ip: '127.0.0.1',
          path: '/api/test'
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should detect SQL DROP TABLE pattern', () => {
      req.body = { query: 'DROP TABLE users' };
      req.get.mockReturnValue('Mozilla/5.0');

      const middleware = logInjectionAttempts();
      middleware(req, res, next);

      expect(consoleSpy).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it('should detect SQL UNION SELECT pattern', () => {
      req.query = { search: "' UNION SELECT * FROM users" };
      req.get.mockReturnValue('Mozilla/5.0');

      const middleware = logInjectionAttempts();
      middleware(req, res, next);

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should check all request parts', () => {
      req.query = { safe: 'value' };
      req.body = { also: 'safe' };
      req.params = { id: 'safe' };

      const middleware = logInjectionAttempts();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('enforceSizeLimits', () => {
    it('should call next for requests within limits', () => {
      req.body = { name: 'test' };
      req.query = { page: '1' };

      const middleware = enforceSizeLimits();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 413 for oversized body', () => {
      // Create a body that exceeds 1MB default limit
      req.body = { data: 'x'.repeat(1024 * 1024 + 100) };

      const middleware = enforceSizeLimits();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request body too large'
      });
    });

    it('should return 400 for too many query parameters', () => {
      // Create more than 50 query params
      req.query = {};
      for (let i = 0; i < 60; i++) {
        req.query[`param${i}`] = 'value';
      }

      const middleware = enforceSizeLimits();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many query parameters'
      });
    });

    it('should use custom limits', () => {
      req.body = { data: 'x'.repeat(500) };

      const middleware = enforceSizeLimits({ maxBodySize: 100 });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('should check string length limits', () => {
      req.body = { name: 'x'.repeat(15000) };

      const middleware = enforceSizeLimits({ maxStringLength: 10000 });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Input exceeds maximum allowed length'
      });
    });

    it('should check array length limits', () => {
      req.body = { items: new Array(1500).fill('item') };

      const middleware = enforceSizeLimits({ maxArrayLength: 1000 });
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors gracefully', () => {
      // Mock JSON.stringify to throw
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn(() => {
        throw new Error('Stringify error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      req.body = { name: 'test' };

      const middleware = enforceSizeLimits();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);

      JSON.stringify = originalStringify;
      consoleSpy.mockRestore();
    });
  });

  describe('validatePagination', () => {
    it('should normalize page parameter', () => {
      req.query = { page: '5' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.page).toBe(5);
      expect(next).toHaveBeenCalled();
    });

    it('should set minimum page to 1', () => {
      req.query = { page: '0' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.page).toBe(1);
    });

    it('should set maximum page to 10000', () => {
      req.query = { page: '20000' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.page).toBe(10000);
    });

    it('should normalize limit parameter', () => {
      req.query = { limit: '50' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.limit).toBe(50);
    });

    it('should set default limit for invalid value', () => {
      req.query = { limit: 'invalid' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.limit).toBe(10);
    });

    it('should cap limit at 100', () => {
      req.query = { limit: '500' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.limit).toBe(100);
    });

    it('should normalize skip parameter', () => {
      req.query = { skip: '100' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.skip).toBe(100);
    });

    it('should set minimum skip to 0', () => {
      req.query = { skip: '-10' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.skip).toBe(0);
    });

    it('should cap skip at 100000', () => {
      req.query = { skip: '200000' };

      const middleware = validatePagination();
      middleware(req, res, next);

      expect(req.query.skip).toBe(100000);
    });
  });

  describe('preventRegexInjection', () => {
    it('should call next for safe queries', () => {
      req.query = { search: 'normal search' };
      req.body = {};

      const middleware = preventRegexInjection();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block dangerous regex patterns in query', () => {
      req.query = { $regex: '(a+)*' };

      const middleware = preventRegexInjection();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid query pattern'
      });
    });

    it('should block dangerous regex patterns in body', () => {
      req.body = { filter: { $regex: '(a+)*' } };

      const middleware = preventRegexInjection();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request pattern'
      });
    });

    it('should allow safe regex patterns', () => {
      req.query = { search: { $regex: '^test' } };
      req.body = {};

      const middleware = preventRegexInjection();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should detect nested dangerous patterns', () => {
      req.body = {
        filter: {
          name: {
            $regex: '(.*)+'
          }
        }
      };

      const middleware = preventRegexInjection();
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('securityMiddleware', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(securityMiddleware)).toBe(true);
      expect(securityMiddleware.length).toBeGreaterThan(0);
    });

    it('should contain all security middleware', () => {
      expect(securityMiddleware.length).toBe(6);
    });
  });
});
