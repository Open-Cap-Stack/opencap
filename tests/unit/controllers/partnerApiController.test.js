/**
 * Partner API Controller Unit Tests
 * Issue #119: Create API Access for Partners
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/partnerApiService', () => ({
  generateApiKey: jest.fn(),
  validateApiKey: jest.fn(),
  revokeApiKey: jest.fn(),
  refreshApiKey: jest.fn(),
  getApiKeyUsage: jest.fn(),
  checkRateLimit: jest.fn(),
  suspendApiKey: jest.fn(),
  reactivateApiKey: jest.fn(),
  getApiKeysByPartner: jest.fn(),
  getApiKeyById: jest.fn(),
  updateApiKey: jest.fn(),
  deleteApiKey: jest.fn()
}));

jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const partnerApiController = require('../../../controllers/partnerApiController');
const partnerApiService = require('../../../services/partnerApiService');

describe('PartnerApiController', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('should create a new API key successfully', async () => {
      req.body = {
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Production API Key',
        description: 'API key for production',
        permissions: ['read:companies', 'read:stakeholders'],
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      const mockResult = {
        apiKeyId: 'APIK-12345678',
        key: 'generated_key',
        secret: 'generated_secret',
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Production API Key'
      };

      partnerApiService.generateApiKey.mockResolvedValue(mockResult);

      await partnerApiController.createApiKey(req, res);

      expect(partnerApiService.generateApiKey).toHaveBeenCalledWith(req.body);
      expect(res.statusCode).toBe(201);
      const response = JSON.parse(res._getData());
      expect(response).toHaveProperty('apiKeyId', 'APIK-12345678');
      expect(response).toHaveProperty('key', 'generated_key');
      expect(response).toHaveProperty('secret', 'generated_secret');
      expect(response).toHaveProperty('message');
    });

    it('should return 400 for missing required fields', async () => {
      req.body = {
        name: 'Test Key'
        // missing partnerId and companyId
      };

      await partnerApiController.createApiKey(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });

    it('should return 500 on service error', async () => {
      req.body = {
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Test Key'
      };

      partnerApiService.generateApiKey.mockRejectedValue(new Error('Database error'));

      await partnerApiController.createApiKey(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('error');
    });
  });

  describe('getApiKeys', () => {
    it('should return all API keys for a partner', async () => {
      req.query = { partnerId: 'partner-123' };

      const mockApiKeys = [
        { apiKeyId: 'APIK-1', name: 'Key 1', status: 'active' },
        { apiKeyId: 'APIK-2', name: 'Key 2', status: 'revoked' }
      ];

      partnerApiService.getApiKeysByPartner.mockResolvedValue(mockApiKeys);

      await partnerApiController.getApiKeys(req, res);

      expect(partnerApiService.getApiKeysByPartner).toHaveBeenCalledWith('partner-123');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockApiKeys);
    });

    it('should return 400 if partnerId not provided', async () => {
      req.query = {};

      await partnerApiController.getApiKeys(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Partner ID required');
    });
  });

  describe('getApiKeyById', () => {
    it('should return API key by ID', async () => {
      req.params = { id: 'APIK-12345678' };

      const mockApiKey = {
        apiKeyId: 'APIK-12345678',
        name: 'Test Key',
        status: 'active'
      };

      partnerApiService.getApiKeyById.mockResolvedValue(mockApiKey);

      await partnerApiController.getApiKeyById(req, res);

      expect(partnerApiService.getApiKeyById).toHaveBeenCalledWith('APIK-12345678');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockApiKey);
    });

    it('should return 404 if API key not found', async () => {
      req.params = { id: 'nonexistent' };

      partnerApiService.getApiKeyById.mockResolvedValue(null);

      await partnerApiController.getApiKeyById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key not found');
    });
  });

  describe('updateApiKey', () => {
    it('should update API key successfully', async () => {
      req.params = { id: 'APIK-12345678' };
      req.body = {
        name: 'Updated Key Name',
        description: 'Updated description',
        permissions: ['read:companies', 'write:companies']
      };

      const mockUpdatedKey = {
        apiKeyId: 'APIK-12345678',
        ...req.body
      };

      partnerApiService.updateApiKey.mockResolvedValue(mockUpdatedKey);

      await partnerApiController.updateApiKey(req, res);

      expect(partnerApiService.updateApiKey).toHaveBeenCalledWith('APIK-12345678', req.body);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdatedKey);
    });

    it('should return 404 if API key not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { name: 'Updated Name' };

      partnerApiService.updateApiKey.mockResolvedValue(null);

      await partnerApiController.updateApiKey(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key not found');
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke API key successfully', async () => {
      req.params = { id: 'APIK-12345678' };

      partnerApiService.revokeApiKey.mockResolvedValue({
        success: true,
        message: 'API key revoked'
      });

      await partnerApiController.revokeApiKey(req, res);

      expect(partnerApiService.revokeApiKey).toHaveBeenCalledWith('APIK-12345678');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'API key revoked');
    });

    it('should return 404 if API key not found', async () => {
      req.params = { id: 'nonexistent' };

      partnerApiService.revokeApiKey.mockResolvedValue({
        success: false,
        error: 'API key not found'
      });

      await partnerApiController.revokeApiKey(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key not found');
    });

    it('should return 400 if API key already revoked', async () => {
      req.params = { id: 'APIK-12345678' };

      partnerApiService.revokeApiKey.mockResolvedValue({
        success: false,
        error: 'API key is already revoked'
      });

      await partnerApiController.revokeApiKey(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key is already revoked');
    });
  });

  describe('refreshApiKey', () => {
    it('should refresh API key secret successfully', async () => {
      req.params = { id: 'APIK-12345678' };

      partnerApiService.refreshApiKey.mockResolvedValue({
        success: true,
        newSecret: 'new_secret_value'
      });

      await partnerApiController.refreshApiKey(req, res);

      expect(partnerApiService.refreshApiKey).toHaveBeenCalledWith('APIK-12345678');
      expect(res.statusCode).toBe(200);
      const response = JSON.parse(res._getData());
      expect(response).toHaveProperty('newSecret', 'new_secret_value');
      expect(response).toHaveProperty('message');
    });

    it('should return 404 if API key not found', async () => {
      req.params = { id: 'nonexistent' };

      partnerApiService.refreshApiKey.mockResolvedValue({
        success: false,
        error: 'API key not found'
      });

      await partnerApiController.refreshApiKey(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key not found');
    });
  });

  describe('getApiKeyUsage', () => {
    it('should return usage statistics', async () => {
      req.params = { id: 'APIK-12345678' };

      const mockUsage = {
        apiKeyId: 'APIK-12345678',
        totalRequests: 1500,
        lastUsedAt: new Date().toISOString(),
        usageByDay: [
          { date: '2024-01-01', count: 500 },
          { date: '2024-01-02', count: 1000 }
        ]
      };

      partnerApiService.getApiKeyUsage.mockResolvedValue(mockUsage);

      await partnerApiController.getApiKeyUsage(req, res);

      expect(partnerApiService.getApiKeyUsage).toHaveBeenCalledWith('APIK-12345678');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('totalRequests', 1500);
    });

    it('should return 404 if API key not found', async () => {
      req.params = { id: 'nonexistent' };

      partnerApiService.getApiKeyUsage.mockResolvedValue({
        error: 'API key not found'
      });

      await partnerApiController.getApiKeyUsage(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('suspendApiKey', () => {
    it('should suspend API key successfully', async () => {
      req.params = { id: 'APIK-12345678' };
      req.body = { reason: 'Suspicious activity' };

      partnerApiService.suspendApiKey.mockResolvedValue({
        success: true,
        message: 'API key suspended'
      });

      await partnerApiController.suspendApiKey(req, res);

      expect(partnerApiService.suspendApiKey).toHaveBeenCalledWith('APIK-12345678', 'Suspicious activity');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'API key suspended');
    });

    it('should return 404 if API key not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { reason: 'Test' };

      partnerApiService.suspendApiKey.mockResolvedValue({
        success: false,
        error: 'API key not found'
      });

      await partnerApiController.suspendApiKey(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('reactivateApiKey', () => {
    it('should reactivate suspended API key', async () => {
      req.params = { id: 'APIK-12345678' };

      partnerApiService.reactivateApiKey.mockResolvedValue({
        success: true,
        message: 'API key reactivated'
      });

      await partnerApiController.reactivateApiKey(req, res);

      expect(partnerApiService.reactivateApiKey).toHaveBeenCalledWith('APIK-12345678');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'API key reactivated');
    });

    it('should return 400 if API key is not suspended', async () => {
      req.params = { id: 'APIK-12345678' };

      partnerApiService.reactivateApiKey.mockResolvedValue({
        success: false,
        error: 'API key is not suspended'
      });

      await partnerApiController.reactivateApiKey(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'API key is not suspended');
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key successfully', async () => {
      req.params = { id: 'APIK-12345678' };

      partnerApiService.deleteApiKey.mockResolvedValue({
        success: true
      });

      await partnerApiController.deleteApiKey(req, res);

      expect(partnerApiService.deleteApiKey).toHaveBeenCalledWith('APIK-12345678');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'API key deleted');
    });

    it('should return 404 if API key not found', async () => {
      req.params = { id: 'nonexistent' };

      partnerApiService.deleteApiKey.mockResolvedValue({
        success: false,
        error: 'API key not found'
      });

      await partnerApiController.deleteApiKey(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('validateApiKey', () => {
    it('should validate API key from request', async () => {
      req.body = {
        key: 'test_key',
        secret: 'test_secret'
      };

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: true,
        apiKey: {
          apiKeyId: 'APIK-12345678',
          status: 'active'
        }
      });

      await partnerApiController.validateApiKey(req, res);

      expect(partnerApiService.validateApiKey).toHaveBeenCalledWith('test_key', 'test_secret');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('valid', true);
    });

    it('should return invalid status for bad credentials', async () => {
      req.body = {
        key: 'invalid_key',
        secret: 'invalid_secret'
      };

      partnerApiService.validateApiKey.mockResolvedValue({
        valid: false,
        reason: 'Invalid API key'
      });

      await partnerApiController.validateApiKey(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('valid', false);
      expect(JSON.parse(res._getData())).toHaveProperty('reason', 'Invalid API key');
    });
  });
});
