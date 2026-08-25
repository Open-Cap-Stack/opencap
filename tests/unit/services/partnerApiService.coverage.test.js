/**
 * Partner API Service - Coverage Gap Tests
 *
 * Covers uncovered lines:
 * - validateApiKey: error throw on DB failure (157-158)
 * - suspendApiKey: not found, already revoked (287, 291)
 * - reactivateApiKey: not found (317)
 * - getApiKeyById: basic call (354)
 * - updateApiKey: not found, filtering logic (364-380)
 * - deleteApiKey: not found, success (394-402)
 * - recordApiUsage: not found, today exists, today new, trim over 30 (415, 442-463)
 * - checkPermission: empty permissions (415)
 */
process.env.SKIP_DB_SETUP = 'true';

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

describe('PartnerApiService (Coverage Gaps)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── validateApiKey error path ──
  describe('validateApiKey - error handling', () => {
    it('should throw when database lookup fails', async () => {
      databaseAdapter.findOne.mockRejectedValue(new Error('DB connection error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(partnerApiService.validateApiKey('key', 'secret'))
        .rejects.toThrow('DB connection error');
      consoleSpy.mockRestore();
    });
  });

  // ── suspendApiKey edge cases ──
  describe('suspendApiKey edge cases', () => {
    it('should return error when API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.suspendApiKey('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not found');
    });

    it('should return error when API key is revoked', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'id1',
        apiKeyId: 'APIK-1',
        status: 'revoked'
      });

      const result = await partnerApiService.suspendApiKey('APIK-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot suspend a revoked API key');
    });

    it('should use default reason when none provided', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'id1',
        apiKeyId: 'APIK-1',
        status: 'active'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await partnerApiService.suspendApiKey('APIK-1');
      expect(result.success).toBe(true);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'ApiKey',
        'id1',
        expect.objectContaining({
          suspensionReason: 'No reason provided'
        }),
        { new: true }
      );
    });
  });

  // ── reactivateApiKey edge cases ──
  describe('reactivateApiKey edge cases', () => {
    it('should return error when API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.reactivateApiKey('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not found');
    });

    it('should return error when API key is revoked (not suspended)', async () => {
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'id1',
        status: 'revoked'
      });

      const result = await partnerApiService.reactivateApiKey('APIK-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('API key is not suspended');
    });
  });

  // ── getApiKeyById ──
  describe('getApiKeyById', () => {
    it('should return API key by ID', async () => {
      const mockKey = { apiKeyId: 'APIK-1', name: 'Test Key' };
      databaseAdapter.findOne.mockResolvedValue(mockKey);

      const result = await partnerApiService.getApiKeyById('APIK-1');
      expect(result).toEqual(mockKey);
      expect(databaseAdapter.findOne).toHaveBeenCalledWith('ApiKey', { apiKeyId: 'APIK-1' });
    });

    it('should return null when not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.getApiKeyById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── updateApiKey ──
  describe('updateApiKey', () => {
    it('should return null when API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.updateApiKey('nonexistent', { name: 'New Name' });
      expect(result).toBeNull();
    });

    it('should only update allowed fields', async () => {
      const mockKey = { _id: 'id1', apiKeyId: 'APIK-1' };
      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockKey, name: 'Updated' });

      const updates = {
        name: 'Updated',
        description: 'New description',
        permissions: ['read:*'],
        rateLimit: { requestsPerMinute: 120, requestsPerHour: 2000 },
        ipWhitelist: ['192.168.1.1'],
        expiresAt: new Date('2025-12-31'),
        // These should be filtered out
        keyHash: 'should-be-filtered',
        secretHash: 'should-be-filtered',
        status: 'should-be-filtered',
        partnerId: 'should-be-filtered'
      };

      await partnerApiService.updateApiKey('APIK-1', updates);

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
      const filteredUpdates = updateCall[2];

      expect(filteredUpdates.name).toBe('Updated');
      expect(filteredUpdates.description).toBe('New description');
      expect(filteredUpdates.permissions).toEqual(['read:*']);
      expect(filteredUpdates.rateLimit).toBeDefined();
      expect(filteredUpdates.ipWhitelist).toEqual(['192.168.1.1']);
      expect(filteredUpdates.expiresAt).toBeDefined();

      // Sensitive fields should NOT be included
      expect(filteredUpdates.keyHash).toBeUndefined();
      expect(filteredUpdates.secretHash).toBeUndefined();
      expect(filteredUpdates.status).toBeUndefined();
      expect(filteredUpdates.partnerId).toBeUndefined();
    });

    it('should handle update with no allowed fields', async () => {
      const mockKey = { _id: 'id1', apiKeyId: 'APIK-1' };
      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockKey);

      await partnerApiService.updateApiKey('APIK-1', {
        keyHash: 'filtered',
        secretHash: 'filtered'
      });

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[2]).toEqual({});
    });
  });

  // ── deleteApiKey ──
  describe('deleteApiKey', () => {
    it('should return error when API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await partnerApiService.deleteApiKey('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not found');
    });

    it('should delete API key successfully', async () => {
      const mockKey = { _id: 'id1', apiKeyId: 'APIK-1' };
      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockKey);

      const result = await partnerApiService.deleteApiKey('APIK-1');
      expect(result.success).toBe(true);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('ApiKey', 'id1');
    });
  });

  // ── recordApiUsage ──
  describe('recordApiUsage', () => {
    it('should return early when API key not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      await partnerApiService.recordApiUsage('nonexistent');
      expect(databaseAdapter.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should increment count for existing today entry', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockKey = {
        _id: 'id1',
        apiKeyId: 'APIK-1',
        usageCount: 100,
        usageHistory: [
          { date: today, count: 50 }
        ]
      };

      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await partnerApiService.recordApiUsage('APIK-1');

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[2].usageCount).toBe(101);
      // The today entry should have been incremented
      expect(updateCall[2].usageHistory[0].count).toBe(51);
    });

    it('should create new today entry when it does not exist', async () => {
      const mockKey = {
        _id: 'id1',
        apiKeyId: 'APIK-1',
        usageCount: 100,
        usageHistory: [
          { date: '2024-01-01', count: 50 }
        ]
      };

      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await partnerApiService.recordApiUsage('APIK-1');

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
      const today = new Date().toISOString().split('T')[0];
      expect(updateCall[2].usageHistory.length).toBe(2);
      expect(updateCall[2].usageHistory[1].date).toBe(today);
      expect(updateCall[2].usageHistory[1].count).toBe(1);
    });

    it('should trim history when exceeding 30 entries', async () => {
      // Create 30 existing entries
      const entries = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        count: 10
      }));

      const mockKey = {
        _id: 'id1',
        apiKeyId: 'APIK-1',
        usageCount: 300,
        usageHistory: entries
      };

      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await partnerApiService.recordApiUsage('APIK-1');

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
      // Should have trimmed to 30 (added 1 new, shifted 1 old)
      expect(updateCall[2].usageHistory.length).toBeLessThanOrEqual(30);
    });

    it('should handle empty usageHistory', async () => {
      const mockKey = {
        _id: 'id1',
        apiKeyId: 'APIK-1',
        usageCount: 0,
        usageHistory: null
      };

      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await partnerApiService.recordApiUsage('APIK-1');

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[2].usageCount).toBe(1);
    });

    it('should handle undefined usageCount', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockKey = {
        _id: 'id1',
        apiKeyId: 'APIK-1',
        // usageCount is undefined
        usageHistory: []
      };

      databaseAdapter.findOne.mockResolvedValue(mockKey);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await partnerApiService.recordApiUsage('APIK-1');

      const updateCall = databaseAdapter.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[2].usageCount).toBe(1); // (undefined || 0) + 1
    });
  });

  // ── checkPermission edge cases ──
  describe('checkPermission edge cases', () => {
    it('should return false when permissions array is empty', () => {
      const result = partnerApiService.checkPermission({ permissions: [] }, 'read:companies');
      expect(result).toBe(false);
    });

    it('should return false when permissions is null', () => {
      const result = partnerApiService.checkPermission({ permissions: null }, 'read:companies');
      expect(result).toBe(false);
    });

    it('should return false when permissions is undefined', () => {
      const result = partnerApiService.checkPermission({}, 'read:companies');
      expect(result).toBe(false);
    });

    it('should match write:* wildcard', () => {
      const result = partnerApiService.checkPermission(
        { permissions: ['write:*'] },
        'write:stakeholders'
      );
      expect(result).toBe(true);
    });

    it('should not match different action wildcards', () => {
      const result = partnerApiService.checkPermission(
        { permissions: ['read:*'] },
        'write:companies'
      );
      expect(result).toBe(false);
    });
  });

  // ── getApiKeyUsage with defaults ──
  describe('getApiKeyUsage defaults', () => {
    it('should return default values when fields are missing', async () => {
      const mockKey = {
        apiKeyId: 'APIK-1'
        // No usageCount, lastUsedAt, usageHistory
      };

      databaseAdapter.findOne.mockResolvedValue(mockKey);

      const result = await partnerApiService.getApiKeyUsage('APIK-1');

      expect(result.totalRequests).toBe(0);
      expect(result.usageHistory).toEqual([]);
    });
  });

  // ── generateApiKey defaults ──
  describe('generateApiKey defaults', () => {
    it('should use default values for optional fields', async () => {
      databaseAdapter.create.mockResolvedValue({
        _id: 'id1',
        apiKeyId: 'APIK-12345678',
        status: 'active',
        createdAt: new Date()
      });

      const result = await partnerApiService.generateApiKey({
        partnerId: 'p1',
        companyId: 'c1',
        name: 'Test'
        // No description, permissions, rateLimit, expiresAt, ipWhitelist
      });

      expect(result.key).toMatch(/^oc_/);
      expect(result.secret).toMatch(/^ocs_/);

      const createCall = databaseAdapter.create.mock.calls[0][1];
      expect(createCall.description).toBe('');
      expect(createCall.permissions).toEqual([]);
      expect(createCall.rateLimit).toEqual({
        requestsPerMinute: 60,
        requestsPerHour: 1000
      });
      expect(createCall.expiresAt).toBeNull();
      expect(createCall.ipWhitelist).toEqual([]);
    });
  });
});
