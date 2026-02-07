/**
 * ApiKey Model Unit Tests
 * Issue #119: Create API Access for Partners
 * Adapted for ZeroDB model interface
 */
process.env.SKIP_DB_SETUP = 'true';

describe('ApiKey Model', () => {
  let ApiKey;

  beforeAll(() => {
    jest.resetModules();
    ApiKey = require('../../../models/ApiKey');
  });

  describe('Schema Validation', () => {
    it('should have all required fields defined in schema', () => {
      expect(ApiKey.schema).toBeDefined();
      expect(ApiKey.schema).toHaveProperty('apiKeyId');
      expect(ApiKey.schema).toHaveProperty('partnerId');
      expect(ApiKey.schema).toHaveProperty('companyId');
      expect(ApiKey.schema).toHaveProperty('keyHash');
      expect(ApiKey.schema).toHaveProperty('secretHash');
      expect(ApiKey.schema).toHaveProperty('name');
    });

    it('should require apiKeyId', () => {
      expect(ApiKey.schema.apiKeyId.required).toBe(true);
    });

    it('should require partnerId', () => {
      expect(ApiKey.schema.partnerId.required).toBe(true);
    });

    it('should require companyId', () => {
      expect(ApiKey.schema.companyId.required).toBe(true);
    });

    it('should require keyHash', () => {
      expect(ApiKey.schema.keyHash.required).toBe(true);
    });

    it('should require secretHash', () => {
      expect(ApiKey.schema.secretHash.required).toBe(true);
    });

    it('should require name', () => {
      expect(ApiKey.schema.name.required).toBe(true);
    });
  });

  describe('Status Enum Validation', () => {
    it('should accept valid status values in schema', () => {
      const validStatuses = ApiKey.schema.status.enum;
      expect(validStatuses).toContain('active');
      expect(validStatuses).toContain('suspended');
      expect(validStatuses).toContain('revoked');
    });

    it('should not include invalid status values', () => {
      const validStatuses = ApiKey.schema.status.enum;
      expect(validStatuses).not.toContain('invalid_status');
    });

    it('should default status to active', () => {
      expect(ApiKey.schema.status.default).toBe('active');
    });
  });

  describe('Rate Limit Configuration', () => {
    it('should have default rate limit configuration', () => {
      const defaultRateLimit = ApiKey.schema.rateLimit.default;
      expect(defaultRateLimit.requestsPerMinute).toBe(60);
      expect(defaultRateLimit.requestsPerHour).toBe(1000);
    });

    it('should have rateLimit field as object type', () => {
      expect(ApiKey.schema.rateLimit.type).toBe('object');
    });
  });

  describe('Permissions Array', () => {
    it('should have permissions field as array type', () => {
      expect(ApiKey.schema.permissions.type).toBe('array');
    });

    it('should default to empty permissions array', () => {
      expect(ApiKey.schema.permissions.default).toEqual([]);
    });
  });

  describe('IP Whitelist', () => {
    it('should have ipWhitelist field as array type', () => {
      expect(ApiKey.schema.ipWhitelist.type).toBe('array');
    });

    it('should default to empty IP whitelist', () => {
      expect(ApiKey.schema.ipWhitelist.default).toEqual([]);
    });
  });

  describe('Expiration and Usage Tracking', () => {
    it('should have expiresAt field', () => {
      expect(ApiKey.schema).toHaveProperty('expiresAt');
      expect(ApiKey.schema.expiresAt.type).toBe('date');
    });

    it('should have lastUsedAt field', () => {
      expect(ApiKey.schema).toHaveProperty('lastUsedAt');
      expect(ApiKey.schema.lastUsedAt.type).toBe('date');
    });

    it('should have null lastUsedAt by default', () => {
      expect(ApiKey.schema.lastUsedAt.default).toBeNull();
    });
  });

  describe('Description Field', () => {
    it('should have description field', () => {
      expect(ApiKey.schema).toHaveProperty('description');
    });

    it('should have empty string description by default', () => {
      expect(ApiKey.schema.description.default).toBe('');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields in schema', () => {
      expect(ApiKey.schema).toHaveProperty('createdAt');
      expect(ApiKey.schema).toHaveProperty('updatedAt');
    });
  });

  describe('toJSON Transform', () => {
    it('should hide sensitive fields in JSON output', () => {
      const mockApiKey = {
        apiKeyId: 'APIK-12345678',
        partnerId: 'partner-123',
        companyId: 'company-456',
        keyHash: 'hashed_key_value',
        secretHash: 'hashed_secret_value',
        name: 'Test Key'
      };

      const json = ApiKey.toJSON(mockApiKey);

      // keyHash and secretHash should be removed from JSON
      expect(json.keyHash).toBeUndefined();
      expect(json.secretHash).toBeUndefined();
      expect(json.apiKeyId).toBe('APIK-12345678');
      expect(json.name).toBe('Test Key');
    });

    it('should return null for null input', () => {
      expect(ApiKey.toJSON(null)).toBeNull();
    });
  });

  describe('Schema Field Types', () => {
    it('should have apiKeyId as unique', () => {
      expect(ApiKey.schema.apiKeyId.unique).toBe(true);
    });

    it('should have usageCount as number type', () => {
      expect(ApiKey.schema.usageCount.type).toBe('number');
      expect(ApiKey.schema.usageCount.default).toBe(0);
    });

    it('should have usageHistory as array type', () => {
      expect(ApiKey.schema.usageHistory.type).toBe('array');
      expect(ApiKey.schema.usageHistory.default).toEqual([]);
    });
  });
});
