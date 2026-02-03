/**
 * ApiKey Model Unit Tests
 * Issue #119: Create API Access for Partners
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

// Clear any existing models
if (mongoose.models.ApiKey) {
  delete mongoose.models.ApiKey;
}

describe('ApiKey Model', () => {
  let ApiKey;

  beforeAll(() => {
    // Load the model after clearing
    ApiKey = require('../../../models/ApiKey');
  });

  afterAll(async () => {
    // Clean up mongoose models
    if (mongoose.models.ApiKey) {
      delete mongoose.models.ApiKey;
    }
  });

  describe('Schema Validation', () => {
    it('should create a valid API key with all required fields', async () => {
      const validApiKey = {
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key_value',
        secretHash: 'hashed_secret_value',
        name: 'Production API Key',
        description: 'API key for production environment',
        permissions: ['read:companies', 'read:stakeholders'],
        rateLimit: {
          requestsPerMinute: 60,
          requestsPerHour: 1000
        },
        status: 'active'
      };

      const apiKey = new ApiKey(validApiKey);
      const validationError = apiKey.validateSync();

      expect(validationError).toBeUndefined();
      expect(apiKey.apiKeyId).toBe('APIK-12345678');
      expect(apiKey.partnerId).toBe('partner-123');
      expect(apiKey.companyId).toBe('company-456');
      expect(apiKey.status).toBe('active');
    });

    it('should require apiKeyId', async () => {
      const apiKey = new ApiKey({
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      const validationError = apiKey.validateSync();
      expect(validationError.errors.apiKeyId).toBeDefined();
    });

    it('should require partnerId', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      const validationError = apiKey.validateSync();
      expect(validationError.errors.partnerId).toBeDefined();
    });

    it('should require companyId', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      const validationError = apiKey.validateSync();
      expect(validationError.errors.companyId).toBeDefined();
    });

    it('should require keyHash', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      const validationError = apiKey.validateSync();
      expect(validationError.errors.keyHash).toBeDefined();
    });

    it('should require secretHash', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        name: 'Test Key'
      });

      const validationError = apiKey.validateSync();
      expect(validationError.errors.secretHash).toBeDefined();
    });

    it('should require name', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret'
      });

      const validationError = apiKey.validateSync();
      expect(validationError.errors.name).toBeDefined();
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status values', async () => {
      const validStatuses = ['active', 'suspended', 'revoked'];

      for (const status of validStatuses) {
        const apiKey = new ApiKey({
          apiKeyId: `APIK-${status}`,
          partnerId: 'partner-123',
          companyId: 'company-456',
          keyHash: 'hashed_key',
          secretHash: 'hashed_secret',
          name: 'Test Key',
          status
        });

        const validationError = apiKey.validateSync();
        expect(validationError).toBeUndefined();
      }
    });

    it('should reject invalid status values', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key',
        status: 'invalid_status'
      });

      const validationError = apiKey.validateSync();
      expect(validationError.errors.status).toBeDefined();
    });

    it('should default status to active', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      expect(apiKey.status).toBe('active');
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should accept valid rate limit configuration', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key',
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerHour: 5000
        }
      });

      expect(apiKey.rateLimit.requestsPerMinute).toBe(100);
      expect(apiKey.rateLimit.requestsPerHour).toBe(5000);
    });

    it('should have default rate limits', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      expect(apiKey.rateLimit.requestsPerMinute).toBe(60);
      expect(apiKey.rateLimit.requestsPerHour).toBe(1000);
    });
  });

  describe('Permissions Array', () => {
    it('should accept an array of permissions', async () => {
      const permissions = ['read:companies', 'write:companies', 'read:stakeholders'];

      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key',
        permissions
      });

      expect(apiKey.permissions).toEqual(permissions);
      expect(apiKey.permissions.length).toBe(3);
    });

    it('should default to empty permissions array', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      expect(apiKey.permissions).toEqual([]);
    });
  });

  describe('IP Whitelist', () => {
    it('should accept IP whitelist array', async () => {
      const ipWhitelist = ['192.168.1.1', '10.0.0.0/8', '2001:db8::1'];

      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key',
        ipWhitelist
      });

      expect(apiKey.ipWhitelist).toEqual(ipWhitelist);
    });

    it('should default to empty IP whitelist', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      expect(apiKey.ipWhitelist).toEqual([]);
    });
  });

  describe('Expiration and Usage Tracking', () => {
    it('should accept expiresAt date', async () => {
      const expiresAt = new Date('2025-12-31');

      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key',
        expiresAt
      });

      expect(apiKey.expiresAt).toEqual(expiresAt);
    });

    it('should track lastUsedAt', async () => {
      const lastUsedAt = new Date();

      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key',
        lastUsedAt
      });

      expect(apiKey.lastUsedAt).toEqual(lastUsedAt);
    });

    it('should have null lastUsedAt by default', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      expect(apiKey.lastUsedAt).toBeNull();
    });
  });

  describe('Description Field', () => {
    it('should accept description', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key',
        description: 'This is a test API key for development'
      });

      expect(apiKey.description).toBe('This is a test API key for development');
    });

    it('should have empty string description by default', async () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      expect(apiKey.description).toBe('');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt timestamps enabled', () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key',
        secretHash: 'hashed_secret',
        name: 'Test Key'
      });

      // Check that timestamps option is enabled in schema
      expect(ApiKey.schema.options.timestamps).toBe(true);
    });
  });

  describe('toJSON Transform', () => {
    it('should hide sensitive fields in JSON output', () => {
      const apiKey = new ApiKey({
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key_value',
        secretHash: 'hashed_secret_value',
        name: 'Test Key'
      });

      const json = apiKey.toJSON();

      // keyHash and secretHash should be removed from JSON
      expect(json.keyHash).toBeUndefined();
      expect(json.secretHash).toBeUndefined();
      expect(json.apiKeyId).toBe('APIK-12345678');
      expect(json.name).toBe('Test Key');
    });
  });
});
