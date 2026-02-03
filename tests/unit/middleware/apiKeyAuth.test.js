/**
 * API Key Authentication Middleware Unit Tests
 * Issue #119: Create API Access for Partners
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock partnerApiService
jest.mock('../../../services/partnerApiService', () => ({
  validateApiKey: jest.fn(),
  checkRateLimit: jest.fn(),
  checkPermission: jest.fn(),
  recordApiUsage: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const partnerApiService = require('../../../services/partnerApiService');
const {
  authenticateApiKey,
  checkApiPermission,
  applyApiRateLimit,
  checkIpWhitelist
} = require('../../../middleware/apiKeyAuth');

describe('API Key Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateApiKey', () => {
    it('should authenticate valid API key from Authorization header', async () => {
      const key = 'test_api_key';
      const secret = 'test_api_secret';
      req.headers['authorization'] = `ApiKey ${key}:${secret}`;

      const mockApiKey = {
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        permissions: ['read:companies'],
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: true,
        apiKey: mockApiKey
      });

      await authenticateApiKey(req, res, next);

      expect(partnerApiService.validateApiKey).toHaveBeenCalledWith(key, secret);
      expect(req.apiKey).toEqual(mockApiKey);
      expect(next).toHaveBeenCalled();
    });

    it('should authenticate valid API key from X-API-Key header', async () => {
      const key = 'test_api_key';
      const secret = 'test_api_secret';
      req.headers['x-api-key'] = key;
      req.headers['x-api-secret'] = secret;

      const mockApiKey = {
        apiKeyId: 'APIK-12345678',
        permissions: ['read:companies']
      };

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: true,
        apiKey: mockApiKey
      });

      await authenticateApiKey(req, res, next);

      expect(partnerApiService.validateApiKey).toHaveBeenCalledWith(key, secret);
      expect(req.apiKey).toEqual(mockApiKey);
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 if no API key provided', async () => {
      await authenticateApiKey(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'API key required',
        code: 'MISSING_API_KEY'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is invalid', async () => {
      req.headers['x-api-key'] = 'invalid_key';
      req.headers['x-api-secret'] = 'invalid_secret';

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: false,
        reason: 'Invalid API key'
      });

      await authenticateApiKey(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if API key is suspended', async () => {
      req.headers['x-api-key'] = 'suspended_key';
      req.headers['x-api-secret'] = 'some_secret';

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: false,
        reason: 'API key is suspended'
      });

      await authenticateApiKey(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key is suspended');
    });

    it('should return 401 if API key is expired', async () => {
      req.headers['x-api-key'] = 'expired_key';
      req.headers['x-api-secret'] = 'some_secret';

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: false,
        reason: 'API key has expired'
      });

      await authenticateApiKey(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key has expired');
    });

    it('should return 500 on service error', async () => {
      req.headers['x-api-key'] = 'some_key';
      req.headers['x-api-secret'] = 'some_secret';

      partnerApiService.validateApiKey.mockRejectedValue(new Error('Database error'));

      await authenticateApiKey(req, res, next);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Authentication error');
    });
  });

  describe('checkApiPermission', () => {
    it('should allow request if API key has required permission', async () => {
      req.apiKey = {
        permissions: ['read:companies', 'write:companies']
      };

      partnerApiService.checkPermission.mockReturnValue(true);

      const middleware = checkApiPermission('read:companies');
      await middleware(req, res, next);

      expect(partnerApiService.checkPermission).toHaveBeenCalledWith(req.apiKey, 'read:companies');
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if API key lacks required permission', async () => {
      req.apiKey = {
        permissions: ['read:companies']
      };

      partnerApiService.checkPermission.mockReturnValue(false);

      const middleware = checkApiPermission('write:companies');
      await middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: 'write:companies'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if no API key in request', async () => {
      const middleware = checkApiPermission('read:companies');
      await middleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key required');
    });
  });

  describe('applyApiRateLimit', () => {
    it('should allow request within rate limit', async () => {
      req.apiKey = {
        apiKeyId: 'APIK-12345678',
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      partnerApiService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: {
          minute: 59,
          hour: 999
        }
      });

      await applyApiRateLimit(req, res, next);

      expect(res.getHeader('X-RateLimit-Limit-Minute')).toBe(60);
      expect(res.getHeader('X-RateLimit-Remaining-Minute')).toBe(59);
      expect(res.getHeader('X-RateLimit-Limit-Hour')).toBe(1000);
      expect(res.getHeader('X-RateLimit-Remaining-Hour')).toBe(999);
      expect(next).toHaveBeenCalled();
    });

    it('should return 429 if rate limit exceeded', async () => {
      req.apiKey = {
        apiKeyId: 'APIK-12345678',
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      partnerApiService.checkRateLimit.mockResolvedValue({
        allowed: false,
        reason: 'Rate limit exceeded (per minute)',
        retryAfter: 30
      });

      await applyApiRateLimit(req, res, next);

      expect(res.statusCode).toBe(429);
      expect(res.getHeader('Retry-After')).toBe(30);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Rate limit exceeded (per minute)',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 30
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip rate limit if no API key', async () => {
      await applyApiRateLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(partnerApiService.checkRateLimit).not.toHaveBeenCalled();
    });
  });

  describe('checkIpWhitelist', () => {
    it('should allow request from whitelisted IP', async () => {
      req.apiKey = {
        ipWhitelist: ['192.168.1.1', '10.0.0.0/8']
      };
      req.ip = '192.168.1.1';

      await checkIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow request if IP whitelist is empty', async () => {
      req.apiKey = {
        ipWhitelist: []
      };
      req.ip = '192.168.1.100';

      await checkIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should return 403 if IP not in whitelist', async () => {
      req.apiKey = {
        ipWhitelist: ['192.168.1.1', '10.0.0.0/8']
      };
      req.ip = '203.0.113.50';

      await checkIpWhitelist(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'IP address not allowed',
        code: 'IP_NOT_WHITELISTED'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle CIDR notation in whitelist', async () => {
      req.apiKey = {
        ipWhitelist: ['10.0.0.0/8']
      };
      req.ip = '10.255.255.255';

      await checkIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should skip IP check if no API key', async () => {
      req.ip = '192.168.1.1';

      await checkIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Combined Middleware Flow', () => {
    it('should work with full authentication flow', async () => {
      const key = 'test_api_key';
      const secret = 'test_api_secret';
      req.headers['x-api-key'] = key;
      req.headers['x-api-secret'] = secret;
      req.ip = '192.168.1.1';

      const mockApiKey = {
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        permissions: ['read:companies', 'write:companies'],
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        },
        ipWhitelist: ['192.168.1.1']
      };

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: true,
        apiKey: mockApiKey
      });

      partnerApiService.checkPermission.mockReturnValue(true);

      partnerApiService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: { minute: 59, hour: 999 }
      });

      // Test auth
      await authenticateApiKey(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.apiKey).toEqual(mockApiKey);

      next.mockClear();

      // Test permission
      const permMiddleware = checkApiPermission('read:companies');
      await permMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();

      next.mockClear();

      // Test rate limit
      await applyApiRateLimit(req, res, next);
      expect(next).toHaveBeenCalled();

      next.mockClear();

      // Test IP whitelist
      await checkIpWhitelist(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
