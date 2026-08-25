/**
 * Feature Gating Service - Coverage Gap Tests
 *
 * Covers uncovered lines:
 * - getTierFeatures: null tiers response (53)
 * - hasFeature: error handling, null tier/features (58-59, 84-85)
 * - getUsageLimits: error throw, null tier (79, 84-85)
 * - checkLimit: company not found, tier not found, error catch (100, 113, 156-157)
 * - getUpgradeOptions: company not found throw (176)
 * - compareTiers: tier2 not found, features lost (193-194, 212, 215, 240-241)
 * - getAllTiers: null response, error throw (317, 328-329)
 * - getTierByName: null response (365)
 * - canAccessFeature: company not found, tier not found, error (376, 409-410)
 * - _getCompany: error catch returns null (434-471)
 * - seedDefaultTiers: all branches (434-471)
 */

const zerodbService = require('../../../services/zerodbService');

jest.mock('../../../services/zerodbService');

const featureGatingService = require('../../../services/featureGatingService');

describe('FeatureGatingService (Coverage Gaps)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── getTierFeatures ──
  describe('getTierFeatures edge cases', () => {
    it('should return null when queryTable returns null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);

      const result = await featureGatingService.getTierFeatures('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ── hasFeature ──
  describe('hasFeature edge cases', () => {
    it('should return false when getTierByName returns null', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'custom' };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany]) // _getCompany
        .mockResolvedValueOnce([]); // getTierByName returns no results

      const result = await featureGatingService.hasFeature('c1', 'someFeature');
      expect(result).toBe(false);
    });

    it('should return false when tier has no features', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'custom' };
      const mockTier = { name: 'custom' }; // No features property

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const result = await featureGatingService.hasFeature('c1', 'someFeature');
      expect(result).toBe(false);
    });

    it('should return false when an error occurs', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await featureGatingService.hasFeature('c1', 'someFeature');
      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  // ── getUsageLimits ──
  describe('getUsageLimits edge cases', () => {
    it('should return null when tier not found', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'missing' };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([]); // No tier

      const result = await featureGatingService.getUsageLimits('c1');
      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'starter' };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockRejectedValueOnce(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(featureGatingService.getUsageLimits('c1'))
        .rejects.toThrow('Failed to get usage limits');
      consoleSpy.mockRestore();
    });
  });

  // ── checkLimit ──
  describe('checkLimit edge cases', () => {
    it('should return error when company not found', async () => {
      zerodbService.queryTable.mockResolvedValueOnce([]); // No company

      const result = await featureGatingService.checkLimit('nonexistent', 'maxStakeholders', 10);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Company not found');
    });

    it('should return error when tier not found', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'missing' };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([]); // No tier

      const result = await featureGatingService.checkLimit('c1', 'maxStakeholders', 10);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Tier not found');
    });

    it('should return error when tier has no limits', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'basic' };
      const mockTier = { name: 'basic' }; // No limits property

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const result = await featureGatingService.checkLimit('c1', 'maxStakeholders', 10);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Tier not found');
    });

    it('should handle errors gracefully when _getCompany throws', async () => {
      // _getCompany catches errors and returns null -> 'Company not found'
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await featureGatingService.checkLimit('c1', 'maxStakeholders', 10);

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Company not found');
      consoleSpy.mockRestore();
    });

    it('should catch errors after company found', async () => {
      // _getCompany succeeds, but getTierByName throws
      const mockCompany = { companyId: 'c1', subscriptionTier: 'starter' };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany]) // _getCompany
        .mockRejectedValueOnce(new Error('Tier lookup failed')); // getTierByName

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await featureGatingService.checkLimit('c1', 'maxStakeholders', 10);

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Failed to check limit');
      consoleSpy.mockRestore();
    });
  });

  // ── getUpgradeOptions ──
  describe('getUpgradeOptions edge cases', () => {
    it('should throw when company not found', async () => {
      zerodbService.queryTable.mockResolvedValueOnce([]); // No company

      await expect(featureGatingService.getUpgradeOptions('nonexistent'))
        .rejects.toThrow('Company not found');
    });

    it('should handle company without subscriptionTier (defaults to free)', async () => {
      const mockCompany = { companyId: 'c1' }; // No subscriptionTier
      const mockTiers = [
        { name: 'free', sortOrder: 1, isPublic: true },
        { name: 'starter', sortOrder: 2, isPublic: true }
      ];

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce(mockTiers);

      const result = await featureGatingService.getUpgradeOptions('c1');
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('starter');
    });

    it('should handle when currentTier not found in tiers list', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'deleted_tier' };
      const mockTiers = [
        { name: 'free', sortOrder: 1, isPublic: true },
        { name: 'starter', sortOrder: 2, isPublic: true }
      ];

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce(mockTiers);

      // currentTier not found = sortOrder 0, so all tiers with sortOrder > 0 are upgrades
      const result = await featureGatingService.getUpgradeOptions('c1');
      expect(result.length).toBe(2);
    });
  });

  // ── compareTiers ──
  describe('compareTiers edge cases', () => {
    it('should throw when tier2 not found', async () => {
      const mockTier1 = { name: 'starter', features: {}, limits: {} };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockTier1])
        .mockResolvedValueOnce([]); // tier2 not found

      await expect(featureGatingService.compareTiers('starter', 'nonexistent'))
        .rejects.toThrow("Tier 'nonexistent' not found");
    });

    it('should detect features lost in comparison', async () => {
      const tier1 = {
        name: 'professional',
        displayName: 'Professional',
        monthlyPrice: 75,
        annualPrice: 720,
        features: { apiAccess: true, customBranding: true, basicCap: true },
        limits: { maxUsers: 100 }
      };
      const tier2 = {
        name: 'starter',
        displayName: 'Starter',
        monthlyPrice: 25,
        annualPrice: 240,
        features: { apiAccess: false, customBranding: false, basicCap: true },
        limits: { maxUsers: 10 }
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([tier1])
        .mockResolvedValueOnce([tier2]);

      const result = await featureGatingService.compareTiers('professional', 'starter');

      expect(result.featuresLost).toContain('apiAccess');
      expect(result.featuresLost).toContain('customBranding');
      expect(result.featuresGained).toHaveLength(0);
    });

    it('should calculate unlimited limit improvements', async () => {
      const tier1 = {
        name: 'starter',
        displayName: 'Starter',
        monthlyPrice: 25,
        annualPrice: 240,
        features: {},
        limits: { maxUsers: 10, maxDocs: 100 }
      };
      const tier2 = {
        name: 'enterprise',
        displayName: 'Enterprise',
        monthlyPrice: 250,
        annualPrice: 2400,
        features: {},
        limits: { maxUsers: -1, maxDocs: -1 } // unlimited
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([tier1])
        .mockResolvedValueOnce([tier2]);

      const result = await featureGatingService.compareTiers('starter', 'enterprise');

      expect(result.limitImprovements.maxUsers).toBe(Infinity);
      expect(result.limitImprovements.maxDocs).toBe(Infinity);
    });

    it('should handle tiers with no features or limits', async () => {
      const tier1 = {
        name: 't1', displayName: 'T1',
        monthlyPrice: 0, annualPrice: 0
      };
      const tier2 = {
        name: 't2', displayName: 'T2',
        monthlyPrice: 10, annualPrice: 100
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([tier1])
        .mockResolvedValueOnce([tier2]);

      const result = await featureGatingService.compareTiers('t1', 't2');

      expect(result.featureDifferences).toEqual({});
      expect(result.limitDifferences).toEqual({});
      expect(result.priceDifference.monthly).toBe(10);
    });

    it('should propagate errors', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(featureGatingService.compareTiers('t1', 't2'))
        .rejects.toThrow(); // getTierByName wraps with 'Failed to get tier'
      consoleSpy.mockRestore();
    });
  });

  // ── getAllTiers ──
  describe('getAllTiers edge cases', () => {
    it('should return empty array when queryTable returns null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);

      const result = await featureGatingService.getAllTiers();
      expect(result).toEqual([]);
    });

    it('should filter out private tiers by default', async () => {
      const tiers = [
        { name: 'free', sortOrder: 1, isPublic: true },
        { name: 'internal', sortOrder: 2, isPublic: false }
      ];
      zerodbService.queryTable.mockResolvedValue(tiers);

      const result = await featureGatingService.getAllTiers();
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('free');
    });

    it('should handle tiers without sortOrder', async () => {
      const tiers = [
        { name: 'b', isPublic: true },
        { name: 'a', sortOrder: 1, isPublic: true }
      ];
      zerodbService.queryTable.mockResolvedValue(tiers);

      const result = await featureGatingService.getAllTiers();
      expect(result[0].name).toBe('b'); // sortOrder 0 (default) < 1
    });

    it('should throw on error', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(featureGatingService.getAllTiers())
        .rejects.toThrow('Failed to get subscription tiers');
      consoleSpy.mockRestore();
    });
  });

  // ── getTierByName ──
  describe('getTierByName edge cases', () => {
    it('should return null when queryTable returns null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);

      const result = await featureGatingService.getTierByName('nonexistent');
      expect(result).toBeNull();
    });

    it('should throw on error', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await expect(featureGatingService.getTierByName('test'))
        .rejects.toThrow('Failed to get tier');
      consoleSpy.mockRestore();
    });
  });

  // ── canAccessFeature ──
  describe('canAccessFeature edge cases', () => {
    it('should return error when company not found', async () => {
      zerodbService.queryTable.mockResolvedValueOnce([]); // No company

      const result = await featureGatingService.canAccessFeature('nonexistent', 'apiAccess');
      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Company not found');
    });

    it('should return error when tier not found', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'missing' };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([]); // No tier

      const result = await featureGatingService.canAccessFeature('c1', 'apiAccess');
      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Tier not found');
      expect(result.currentTier).toBe('missing');
    });

    it('should return hasAccess=true when feature is available', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'pro' };
      const mockTier = {
        name: 'pro',
        sortOrder: 3,
        features: { apiAccess: true }
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const result = await featureGatingService.canAccessFeature('c1', 'apiAccess');
      expect(result.hasAccess).toBe(true);
      expect(result.currentTier).toBe('pro');
    });

    it('should handle when no upgrade tier has the feature', async () => {
      const mockCompany = { companyId: 'c1', subscriptionTier: 'starter' };
      const mockTier = {
        name: 'starter',
        sortOrder: 2,
        features: { uniqueFeature: false }
      };
      const allTiers = [
        { name: 'starter', sortOrder: 2, isPublic: true, features: { uniqueFeature: false } },
        { name: 'pro', sortOrder: 3, isPublic: true, features: { uniqueFeature: false } }
      ];

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier])
        .mockResolvedValueOnce(allTiers);

      const result = await featureGatingService.canAccessFeature('c1', 'uniqueFeature');
      expect(result.hasAccess).toBe(false);
      expect(result.suggestedUpgrade).toBeUndefined();
    });

    it('should handle errors gracefully when _getCompany throws', async () => {
      // _getCompany catches errors and returns null, which triggers 'Company not found'
      zerodbService.queryTable.mockRejectedValue(new Error('DB error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await featureGatingService.canAccessFeature('c1', 'someFeature');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Company not found');
      consoleSpy.mockRestore();
    });

    it('should catch errors in canAccessFeature after company found', async () => {
      // _getCompany succeeds, but getTierByName throws
      const mockCompany = { companyId: 'c1', subscriptionTier: 'pro' };
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany]) // _getCompany
        .mockRejectedValueOnce(new Error('Tier lookup failed')); // getTierByName

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await featureGatingService.canAccessFeature('c1', 'someFeature');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Failed to check feature access');
      consoleSpy.mockRestore();
    });

    it('should default to free tier when company has no subscriptionTier', async () => {
      const mockCompany = { companyId: 'c1' }; // No subscriptionTier
      const freeTier = {
        name: 'free',
        sortOrder: 1,
        features: { basicCap: true, apiAccess: false }
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([freeTier]);

      const result = await featureGatingService.canAccessFeature('c1', 'basicCap');
      expect(result.hasAccess).toBe(true);
      expect(result.currentTier).toBe('free');
    });
  });

  // ── _getCompany ──
  describe('_getCompany error handling', () => {
    it('should return null when queryTable throws', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await featureGatingService._getCompany('c1');
      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null when queryTable returns null', async () => {
      zerodbService.queryTable.mockResolvedValue(null);

      const result = await featureGatingService._getCompany('c1');
      expect(result).toBeNull();
    });
  });

  // ── seedDefaultTiers ──
  describe('seedDefaultTiers', () => {
    it('should seed default tiers', async () => {
      // Mock the SubscriptionTier model
      jest.mock('../../../models/SubscriptionTier', () => ({
        schema: {
          statics: {
            getDefaultTiers: () => [
              { name: 'free', displayName: 'Free', monthlyPrice: 0 },
              { name: 'starter', displayName: 'Starter', monthlyPrice: 25 }
            ]
          }
        }
      }), { virtual: true });

      // First tier doesn't exist, second already exists
      zerodbService.queryTable
        .mockResolvedValueOnce([]) // getTierByName for 'free' - not found
        .mockResolvedValueOnce([{ name: 'starter' }]); // getTierByName for 'starter' - exists

      zerodbService.insertRow = jest.fn().mockResolvedValue({});

      const result = await featureGatingService.seedDefaultTiers();

      expect(result.created).toContain('free');
      expect(result.skipped).toContain('starter');
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors during tier creation', async () => {
      jest.mock('../../../models/SubscriptionTier', () => ({
        schema: {
          statics: {
            getDefaultTiers: () => [
              { name: 'error_tier', displayName: 'Error', monthlyPrice: 0 }
            ]
          }
        }
      }), { virtual: true });

      zerodbService.queryTable.mockResolvedValue([]); // Tier doesn't exist
      zerodbService.insertRow = jest.fn().mockRejectedValue(new Error('Insert failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await featureGatingService.seedDefaultTiers();

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toBe('Insert failed');
      consoleSpy.mockRestore();
    });
  });
});
