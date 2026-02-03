/**
 * Feature Gating Service Test Suite
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Tests for the feature gating service that handles tier-based access control
 */

const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

// Import service after mocking
const featureGatingService = require('../../../services/featureGatingService');

describe('Feature Gating Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTierFeatures', () => {
    it('should return features for a valid tier', async () => {
      const mockTier = {
        tierId: 'tier-starter',
        name: 'starter',
        features: {
          basicCapTable: true,
          documentStorage: true,
          stakeholderManagement: true,
          advancedReporting: true,
          apiAccess: false,
          ssoIntegration: false,
          customBranding: false,
          prioritySupport: false,
          dedicatedAccountManager: false,
          auditLogs: true
        }
      };

      zerodbService.queryTable.mockResolvedValue([mockTier]);

      const features = await featureGatingService.getTierFeatures('starter');

      expect(zerodbService.queryTable).toHaveBeenCalledWith('subscription_tiers', {
        filter: { name: 'starter' }
      });
      expect(features).toEqual(mockTier.features);
    });

    it('should return null for non-existent tier', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      const features = await featureGatingService.getTierFeatures('non-existent');

      expect(features).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      zerodbService.queryTable.mockRejectedValue(new Error('Database error'));

      await expect(featureGatingService.getTierFeatures('starter'))
        .rejects.toThrow('Failed to get tier features');
    });
  });

  describe('hasFeature', () => {
    const mockCompany = {
      companyId: 'company-001',
      subscriptionTier: 'professional'
    };

    const mockTier = {
      tierId: 'tier-professional',
      name: 'professional',
      features: {
        basicCapTable: true,
        documentStorage: true,
        stakeholderManagement: true,
        advancedReporting: true,
        apiAccess: true,
        ssoIntegration: true,
        customBranding: false,
        prioritySupport: true,
        dedicatedAccountManager: false,
        auditLogs: true
      }
    };

    it('should return true when company has the feature', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const hasFeature = await featureGatingService.hasFeature('company-001', 'apiAccess');

      expect(hasFeature).toBe(true);
    });

    it('should return false when company does not have the feature', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const hasFeature = await featureGatingService.hasFeature('company-001', 'customBranding');

      expect(hasFeature).toBe(false);
    });

    it('should return false for non-existent company', async () => {
      zerodbService.queryTable.mockResolvedValueOnce([]);

      const hasFeature = await featureGatingService.hasFeature('non-existent', 'apiAccess');

      expect(hasFeature).toBe(false);
    });

    it('should return false for invalid feature name', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const hasFeature = await featureGatingService.hasFeature('company-001', 'invalidFeature');

      expect(hasFeature).toBe(false);
    });

    it('should default to free tier if company has no subscription', async () => {
      const companyWithoutTier = {
        companyId: 'company-002'
      };

      const freeTier = {
        tierId: 'tier-free',
        name: 'free',
        features: {
          basicCapTable: true,
          apiAccess: false
        }
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([companyWithoutTier])
        .mockResolvedValueOnce([freeTier]);

      const hasFeature = await featureGatingService.hasFeature('company-002', 'basicCapTable');

      expect(hasFeature).toBe(true);
    });
  });

  describe('getUsageLimits', () => {
    const mockCompany = {
      companyId: 'company-001',
      subscriptionTier: 'starter'
    };

    const mockTier = {
      tierId: 'tier-starter',
      name: 'starter',
      limits: {
        maxStakeholders: 50,
        maxDocuments: 500,
        storageGB: 10,
        apiCallsPerMonth: 1000,
        maxUsers: 5,
        maxCompanies: 1
      }
    };

    it('should return usage limits for a company', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const limits = await featureGatingService.getUsageLimits('company-001');

      expect(limits).toEqual(mockTier.limits);
    });

    it('should return null for non-existent company', async () => {
      zerodbService.queryTable.mockResolvedValueOnce([]);

      const limits = await featureGatingService.getUsageLimits('non-existent');

      expect(limits).toBeNull();
    });

    it('should return free tier limits for company without subscription', async () => {
      const companyWithoutTier = {
        companyId: 'company-002'
      };

      const freeTier = {
        tierId: 'tier-free',
        name: 'free',
        limits: {
          maxStakeholders: 10,
          maxDocuments: 50,
          storageGB: 1,
          apiCallsPerMonth: 0,
          maxUsers: 2,
          maxCompanies: 1
        }
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([companyWithoutTier])
        .mockResolvedValueOnce([freeTier]);

      const limits = await featureGatingService.getUsageLimits('company-002');

      expect(limits).toEqual(freeTier.limits);
    });
  });

  describe('checkLimit', () => {
    const mockCompany = {
      companyId: 'company-001',
      subscriptionTier: 'starter'
    };

    const mockTier = {
      tierId: 'tier-starter',
      name: 'starter',
      limits: {
        maxStakeholders: 50,
        maxDocuments: 500,
        storageGB: 10,
        apiCallsPerMonth: 1000,
        maxUsers: 5,
        maxCompanies: 1
      }
    };

    it('should return true when usage is within limit', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const result = await featureGatingService.checkLimit('company-001', 'maxStakeholders', 25);

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(25);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(25);
    });

    it('should return false when usage exceeds limit', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const result = await featureGatingService.checkLimit('company-001', 'maxStakeholders', 60);

      expect(result.allowed).toBe(false);
      expect(result.currentUsage).toBe(60);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(0);
    });

    it('should return true when usage equals limit', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const result = await featureGatingService.checkLimit('company-001', 'maxStakeholders', 50);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should always return true for unlimited (-1) limits', async () => {
      const enterpriseCompany = {
        companyId: 'company-enterprise',
        subscriptionTier: 'enterprise'
      };

      const enterpriseTier = {
        tierId: 'tier-enterprise',
        name: 'enterprise',
        limits: {
          maxStakeholders: -1,
          maxDocuments: -1,
          storageGB: -1,
          apiCallsPerMonth: -1,
          maxUsers: -1,
          maxCompanies: -1
        }
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([enterpriseCompany])
        .mockResolvedValueOnce([enterpriseTier]);

      const result = await featureGatingService.checkLimit('company-enterprise', 'maxStakeholders', 10000);

      expect(result.allowed).toBe(true);
      expect(result.unlimited).toBe(true);
    });

    it('should return error for invalid limit name', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const result = await featureGatingService.checkLimit('company-001', 'invalidLimit', 10);

      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Invalid limit name');
    });
  });

  describe('getUpgradeOptions', () => {
    const mockTiers = [
      {
        tierId: 'tier-free',
        name: 'free',
        displayName: 'Free',
        monthlyPrice: 0,
        sortOrder: 1,
        isPublic: true
      },
      {
        tierId: 'tier-starter',
        name: 'starter',
        displayName: 'Starter',
        monthlyPrice: 49,
        sortOrder: 2,
        isPublic: true
      },
      {
        tierId: 'tier-professional',
        name: 'professional',
        displayName: 'Professional',
        monthlyPrice: 149,
        sortOrder: 3,
        isPublic: true
      },
      {
        tierId: 'tier-enterprise',
        name: 'enterprise',
        displayName: 'Enterprise',
        monthlyPrice: 499,
        sortOrder: 4,
        isPublic: true
      }
    ];

    it('should return all tiers above the current tier for free tier', async () => {
      const mockCompany = {
        companyId: 'company-001',
        subscriptionTier: 'free'
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce(mockTiers);

      const upgrades = await featureGatingService.getUpgradeOptions('company-001');

      expect(upgrades).toHaveLength(3);
      expect(upgrades[0].name).toBe('starter');
      expect(upgrades[1].name).toBe('professional');
      expect(upgrades[2].name).toBe('enterprise');
    });

    it('should return only enterprise for professional tier', async () => {
      const mockCompany = {
        companyId: 'company-001',
        subscriptionTier: 'professional'
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce(mockTiers);

      const upgrades = await featureGatingService.getUpgradeOptions('company-001');

      expect(upgrades).toHaveLength(1);
      expect(upgrades[0].name).toBe('enterprise');
    });

    it('should return empty array for enterprise tier', async () => {
      const mockCompany = {
        companyId: 'company-001',
        subscriptionTier: 'enterprise'
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce(mockTiers);

      const upgrades = await featureGatingService.getUpgradeOptions('company-001');

      expect(upgrades).toHaveLength(0);
    });

    it('should only return public tiers', async () => {
      const tiersWithPrivate = [
        ...mockTiers,
        {
          tierId: 'tier-internal',
          name: 'internal',
          displayName: 'Internal',
          monthlyPrice: 0,
          sortOrder: 5,
          isPublic: false
        }
      ];

      const mockCompany = {
        companyId: 'company-001',
        subscriptionTier: 'free'
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce(tiersWithPrivate);

      const upgrades = await featureGatingService.getUpgradeOptions('company-001');

      expect(upgrades.some(t => t.name === 'internal')).toBe(false);
    });
  });

  describe('compareTiers', () => {
    const mockTiers = [
      {
        tierId: 'tier-starter',
        name: 'starter',
        displayName: 'Starter',
        monthlyPrice: 49,
        annualPrice: 470,
        features: {
          basicCapTable: true,
          documentStorage: true,
          advancedReporting: true,
          apiAccess: false,
          ssoIntegration: false
        },
        limits: {
          maxStakeholders: 50,
          maxDocuments: 500,
          storageGB: 10
        }
      },
      {
        tierId: 'tier-professional',
        name: 'professional',
        displayName: 'Professional',
        monthlyPrice: 149,
        annualPrice: 1430,
        features: {
          basicCapTable: true,
          documentStorage: true,
          advancedReporting: true,
          apiAccess: true,
          ssoIntegration: true
        },
        limits: {
          maxStakeholders: 200,
          maxDocuments: 2000,
          storageGB: 50
        }
      }
    ];

    it('should compare features between two tiers', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockTiers[0]])
        .mockResolvedValueOnce([mockTiers[1]]);

      const comparison = await featureGatingService.compareTiers('starter', 'professional');

      expect(comparison).toBeDefined();
      expect(comparison.tier1.name).toBe('starter');
      expect(comparison.tier2.name).toBe('professional');
      expect(comparison.featureDifferences).toBeDefined();
      expect(comparison.limitDifferences).toBeDefined();
      expect(comparison.priceDifference).toBeDefined();
    });

    it('should identify features gained in upgrade', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockTiers[0]])
        .mockResolvedValueOnce([mockTiers[1]]);

      const comparison = await featureGatingService.compareTiers('starter', 'professional');

      expect(comparison.featuresGained).toContain('apiAccess');
      expect(comparison.featuresGained).toContain('ssoIntegration');
    });

    it('should calculate limit improvements', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockTiers[0]])
        .mockResolvedValueOnce([mockTiers[1]]);

      const comparison = await featureGatingService.compareTiers('starter', 'professional');

      expect(comparison.limitImprovements.maxStakeholders).toBe(150); // 200 - 50
      expect(comparison.limitImprovements.maxDocuments).toBe(1500); // 2000 - 500
      expect(comparison.limitImprovements.storageGB).toBe(40); // 50 - 10
    });

    it('should calculate monthly price difference', async () => {
      zerodbService.queryTable
        .mockResolvedValueOnce([mockTiers[0]])
        .mockResolvedValueOnce([mockTiers[1]]);

      const comparison = await featureGatingService.compareTiers('starter', 'professional');

      expect(comparison.priceDifference.monthly).toBe(100); // 149 - 49
      expect(comparison.priceDifference.annual).toBe(960); // 1430 - 470
    });

    it('should throw error for non-existent tier', async () => {
      zerodbService.queryTable.mockResolvedValueOnce([]);

      await expect(featureGatingService.compareTiers('non-existent', 'professional'))
        .rejects.toThrow();
    });
  });

  describe('getAllTiers', () => {
    const mockTiers = [
      { tierId: 'tier-free', name: 'free', sortOrder: 1, isPublic: true },
      { tierId: 'tier-starter', name: 'starter', sortOrder: 2, isPublic: true },
      { tierId: 'tier-professional', name: 'professional', sortOrder: 3, isPublic: true },
      { tierId: 'tier-enterprise', name: 'enterprise', sortOrder: 4, isPublic: true }
    ];

    it('should return all public tiers sorted by sortOrder', async () => {
      zerodbService.queryTable.mockResolvedValue(mockTiers);

      const tiers = await featureGatingService.getAllTiers();

      expect(tiers).toHaveLength(4);
      expect(tiers[0].name).toBe('free');
      expect(tiers[3].name).toBe('enterprise');
    });

    it('should optionally include private tiers', async () => {
      const allTiers = [
        ...mockTiers,
        { tierId: 'tier-internal', name: 'internal', sortOrder: 5, isPublic: false }
      ];

      zerodbService.queryTable.mockResolvedValue(allTiers);

      const tiers = await featureGatingService.getAllTiers({ includePrivate: true });

      expect(tiers).toHaveLength(5);
    });
  });

  describe('getTierByName', () => {
    it('should return tier details by name', async () => {
      const mockTier = {
        tierId: 'tier-professional',
        name: 'professional',
        displayName: 'Professional',
        monthlyPrice: 149
      };

      zerodbService.queryTable.mockResolvedValue([mockTier]);

      const tier = await featureGatingService.getTierByName('professional');

      expect(tier).toEqual(mockTier);
    });

    it('should return null for non-existent tier', async () => {
      zerodbService.queryTable.mockResolvedValue([]);

      const tier = await featureGatingService.getTierByName('non-existent');

      expect(tier).toBeNull();
    });
  });

  describe('canAccessFeature', () => {
    it('should return detailed access information', async () => {
      const mockCompany = {
        companyId: 'company-001',
        subscriptionTier: 'starter'
      };

      const mockTier = {
        tierId: 'tier-starter',
        name: 'starter',
        features: {
          advancedReporting: true,
          apiAccess: false
        }
      };

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockTier]);

      const access = await featureGatingService.canAccessFeature('company-001', 'apiAccess');

      expect(access.hasAccess).toBe(false);
      expect(access.currentTier).toBe('starter');
      expect(access.featureName).toBe('apiAccess');
    });

    it('should suggest upgrade tier when feature not available', async () => {
      const mockCompany = {
        companyId: 'company-001',
        subscriptionTier: 'starter'
      };

      const mockStarterTier = {
        tierId: 'tier-starter',
        name: 'starter',
        sortOrder: 2,
        features: {
          apiAccess: false
        }
      };

      const allTiers = [
        { name: 'free', sortOrder: 1, features: { apiAccess: false }, isPublic: true },
        { name: 'starter', sortOrder: 2, features: { apiAccess: false }, isPublic: true },
        { name: 'professional', sortOrder: 3, features: { apiAccess: true }, isPublic: true },
        { name: 'enterprise', sortOrder: 4, features: { apiAccess: true }, isPublic: true }
      ];

      zerodbService.queryTable
        .mockResolvedValueOnce([mockCompany])
        .mockResolvedValueOnce([mockStarterTier])
        .mockResolvedValueOnce(allTiers);

      const access = await featureGatingService.canAccessFeature('company-001', 'apiAccess');

      expect(access.hasAccess).toBe(false);
      expect(access.suggestedUpgrade).toBe('professional');
    });
  });
});
