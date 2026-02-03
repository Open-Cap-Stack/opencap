/**
 * Partner API Service Unit Tests
 * Issue #119: Create API Access for Partners
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const partnerApiService = require('../../../services/partnerApiService');
const crypto = require('crypto');

describe('PartnerApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateApiKey', () => {
    it('should generate a new API key pair', async () => {
      const partnerData = {
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Test API Key',
        description: 'API key for testing',
        permissions: ['read:companies', 'read:stakeholders'],
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      databaseAdapter.create.mockResolvedValue({
        _id: 'db-id-123',
        apiKeyId: 'APIK-12345678',
        ...partnerData,
        status: 'active'
      });

      const result = await partnerApiService.generateApiKey(partnerData);

      expect(result).toHaveProperty('apiKeyId');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('secret');
      expect(result.apiKeyId).toMatch(/^APIK-/);
      expect(result.key).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(databaseAdapter.create).toHaveBeenCalledWith('ApiKey', expect.objectContaining({
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Test API Key'
      }));
    });

    it('should hash the key and secret before storing', async () => {
      const partnerData = {
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Test API Key'
      };

      databaseAdapter.create.mockResolvedValue({
        _id: 'db-id-123',
        apiKeyId: 'APIK-12345678',
        ...partnerData,
        status: 'active'
      });

      await partnerApiService.generateApiKey(partnerData);

      expect(databaseAdapter.create).toHaveBeenCalledWith('ApiKey', expect.objectContaining({
        keyHash: expect.any(String),
        secretHash: expect.any(String)
      }));

      const createCall = databaseAdapter.create.mock.calls[0][1];
      // Verify hashes are not the same as plaintext (they should be hashed)
      expect(createCall.keyHash).not.toBe(createCall.key);
      expect(createCall.secretHash).not.toBe(createCall.secret);
    });

    it('should set default rate limits if not provided', async () => {
      const partnerData = {
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Test API Key'
      };

      databaseAdapter.create.mockResolvedValue({
        _id: 'db-id-123',
        ...partnerData,
        status: 'active'
      });

      await partnerApiService.generateApiKey(partnerData);

      expect(databaseAdapter.create).toHaveBeenCalledWith('ApiKey', expect.objectContaining({
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      }));
    });

    it('should set expiration date if provided', async () => {
      const expiresAt = new Date('2025-12-31');
      const partnerData = {
        partnerId: 'partner-123',
        companyId: 'company-456',
        name: 'Test API Key',
        expiresAt
      };

      databaseAdapter.create.mockResolvedValue({
        _id: 'db-id-123',
        ...partnerData,
        status: 'active'
      });

      await partnerApiService.generateApiKey(partnerData);

      expect(databaseAdapter.create).toHaveBeenCalledWith('ApiKey', expect.objectContaining({
        expiresAt
      }));
    });
  });

  describe('validateApiKey', () => {
    it('should validate a correct API key', async () => {
      const key = 'test_key_123';
      const secret = 'test_secret_456';
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash,
        secretHash,
        status: 'active',
        permissions: ['read:companies'],
        expiresAt: new Date(Date.now() + 86400000) // expires tomorrow
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.validateApiKey(key, secret);

      expect(result.valid).toBe(true);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.apiKeyId).toBe('APIK-12345678');
    });

    it('should reject invalid key', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.validateApiKey('invalid_key', 'some_secret');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid API key');
    });

    it('should reject invalid secret', async () => {
      const key = 'test_key_123';
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');

      const mockApiKey = {
        _id: 'db-id-123',
        keyHash,
        secretHash: 'different_hash',
        status: 'active'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.validateApiKey(key, 'wrong_secret');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid API secret');
    });

    it('should reject suspended API key', async () => {
      const key = 'test_key_123';
      const secret = 'test_secret_456';
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

      const mockApiKey = {
        keyHash,
        secretHash,
        status: 'suspended'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.validateApiKey(key, secret);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('API key is suspended');
    });

    it('should reject revoked API key', async () => {
      const key = 'test_key_123';
      const secret = 'test_secret_456';
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

      const mockApiKey = {
        keyHash,
        secretHash,
        status: 'revoked'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.validateApiKey(key, secret);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('API key is revoked');
    });

    it('should reject expired API key', async () => {
      const key = 'test_key_123';
      const secret = 'test_secret_456';
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

      const mockApiKey = {
        keyHash,
        secretHash,
        status: 'active',
        expiresAt: new Date(Date.now() - 86400000) // expired yesterday
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.validateApiKey(key, secret);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('API key has expired');
    });

    it('should update lastUsedAt on successful validation', async () => {
      const key = 'test_key_123';
      const secret = 'test_secret_456';
      const keyHash = crypto.createHash('sha256').update(key).digest('hex');
      const secretHash = crypto.createHash('sha256').update(secret).digest('hex');

      const mockApiKey = {
        _id: 'db-id-123',
        keyHash,
        secretHash,
        status: 'active'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockApiKey);

      await partnerApiService.validateApiKey(key, secret);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ApiKey',
        'db-id-123',
        expect.objectContaining({
          lastUsedAt: expect.any(Date)
        }),
        expect.any(Object)
      );
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      const apiKeyId = 'APIK-12345678';
      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId,
        status: 'active'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockApiKey, status: 'revoked' });

      const result = await partnerApiService.revokeApiKey(apiKeyId);

      expect(result.success).toBe(true);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ApiKey',
        'db-id-123',
        { status: 'revoked', revokedAt: expect.any(Date) },
        { new: true }
      );
    });

    it('should return error if API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.revokeApiKey('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not found');
    });

    it('should return error if API key already revoked', async () => {
      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId: 'APIK-12345678',
        status: 'revoked'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.revokeApiKey('APIK-12345678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key is already revoked');
    });
  });

  describe('refreshApiKey', () => {
    it('should generate a new secret for the API key', async () => {
      const apiKeyId = 'APIK-12345678';
      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId,
        status: 'active'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.refreshApiKey(apiKeyId);

      expect(result.success).toBe(true);
      expect(result.newSecret).toBeDefined();
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ApiKey',
        'db-id-123',
        expect.objectContaining({
          secretHash: expect.any(String)
        }),
        { new: true }
      );
    });

    it('should return error if API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.refreshApiKey('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not found');
    });

    it('should return error if API key is revoked', async () => {
      const mockApiKey = {
        _id: 'db-id-123',
        status: 'revoked'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.refreshApiKey('APIK-12345678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot refresh a revoked API key');
    });
  });

  describe('getApiKeyUsage', () => {
    it('should return usage statistics for an API key', async () => {
      const apiKeyId = 'APIK-12345678';
      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId,
        lastUsedAt: new Date(),
        usageCount: 1500,
        usageHistory: [
          { date: '2024-01-01', count: 500 },
          { date: '2024-01-02', count: 1000 }
        ]
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.getApiKeyUsage(apiKeyId);

      expect(result.apiKeyId).toBe(apiKeyId);
      expect(result.totalRequests).toBe(1500);
      expect(result.lastUsedAt).toBeDefined();
    });

    it('should return error if API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.getApiKeyUsage('nonexistent');

      expect(result.error).toBe('API key not found');
    });
  });

  describe('checkRateLimit', () => {
    it('should allow request within rate limit', async () => {
      const apiKeyId = 'APIK-12345678';
      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId,
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      const result = await partnerApiService.checkRateLimit(mockApiKey, {
        minuteCount: 30,
        hourCount: 500
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining.minute).toBe(30);
      expect(result.remaining.hour).toBe(500);
    });

    it('should reject request exceeding per-minute limit', async () => {
      const mockApiKey = {
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      const result = await partnerApiService.checkRateLimit(mockApiKey, {
        minuteCount: 61,
        hourCount: 100
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Rate limit exceeded (per minute)');
    });

    it('should reject request exceeding per-hour limit', async () => {
      const mockApiKey = {
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        }
      };

      const result = await partnerApiService.checkRateLimit(mockApiKey, {
        minuteCount: 30,
        hourCount: 1001
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Rate limit exceeded (per hour)');
    });
  });

  describe('suspendApiKey', () => {
    it('should suspend an active API key', async () => {
      const apiKeyId = 'APIK-12345678';
      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId,
        status: 'active'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockApiKey, status: 'suspended' });

      const result = await partnerApiService.suspendApiKey(apiKeyId, 'Suspicious activity');

      expect(result.success).toBe(true);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ApiKey',
        'db-id-123',
        expect.objectContaining({
          status: 'suspended',
          suspendedAt: expect.any(Date),
          suspensionReason: 'Suspicious activity'
        }),
        { new: true }
      );
    });
  });

  describe('reactivateApiKey', () => {
    it('should reactivate a suspended API key', async () => {
      const apiKeyId = 'APIK-12345678';
      const mockApiKey = {
        _id: 'db-id-123',
        apiKeyId,
        status: 'suspended'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockApiKey, status: 'active' });

      const result = await partnerApiService.reactivateApiKey(apiKeyId);

      expect(result.success).toBe(true);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ApiKey',
        'db-id-123',
        expect.objectContaining({
          status: 'active',
          reactivatedAt: expect.any(Date),
          suspendedAt: null,
          suspensionReason: null
        }),
        { new: true }
      );
    });

    it('should return error if API key is not suspended', async () => {
      const mockApiKey = {
        _id: 'db-id-123',
        status: 'active'
      };

      databaseAdapter.findOne.mockResolvedValue(mockApiKey);

      const result = await partnerApiService.reactivateApiKey('APIK-12345678');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key is not suspended');
    });
  });

  describe('getApiKeysByPartner', () => {
    it('should return all API keys for a partner', async () => {
      const partnerId = 'partner-123';
      const mockApiKeys = [
        { apiKeyId: 'APIK-1', name: 'Key 1', status: 'active' },
        { apiKeyId: 'APIK-2', name: 'Key 2', status: 'revoked' }
      ];

      databaseAdapter.find.mockResolvedValue(mockApiKeys);

      const result = await partnerApiService.getApiKeysByPartner(partnerId);

      expect(result).toHaveLength(2);
      expect(databaseAdapter.find).toHaveBeenCalledWith('ApiKey', { partnerId });
    });
  });

  describe('checkPermission', () => {
    it('should return true if API key has required permission', () => {
      const apiKey = {
        permissions: ['read:companies', 'write:companies', 'read:stakeholders']
      };

      const result = partnerApiService.checkPermission(apiKey, 'read:companies');

      expect(result).toBe(true);
    });

    it('should return false if API key lacks required permission', () => {
      const apiKey = {
        permissions: ['read:companies', 'read:stakeholders']
      };

      const result = partnerApiService.checkPermission(apiKey, 'write:companies');

      expect(result).toBe(false);
    });

    it('should return true for wildcard permission', () => {
      const apiKey = {
        permissions: ['*']
      };

      const result = partnerApiService.checkPermission(apiKey, 'write:anything');

      expect(result).toBe(true);
    });

    it('should return true for category wildcard permission', () => {
      const apiKey = {
        permissions: ['read:*', 'write:companies']
      };

      const result = partnerApiService.checkPermission(apiKey, 'read:stakeholders');

      expect(result).toBe(true);
    });
  });
});
