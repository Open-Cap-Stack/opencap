/**
 * Subscription Tier Controller Test Suite
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Tests for the subscription tier controller endpoints
 */

const zerodbService = require('../../../services/zerodbService');
const featureGatingService = require('../../../services/featureGatingService');

// Mock dependencies
jest.mock('../../../services/zerodbService');
jest.mock('../../../services/featureGatingService');

// Import controller after mocking
const subscriptionTierController = require('../../../controllers/subscriptionTierController');

describe('Subscription Tier Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('getAllTiers', () => {
    it('should return all public tiers successfully', async () => {
      const mockTiers = [
        { tierId: 'tier-free', name: 'free', displayName: 'Free', sortOrder: 1 },
        { tierId: 'tier-starter', name: 'starter', displayName: 'Starter', sortOrder: 2 },
        { tierId: 'tier-professional', name: 'professional', displayName: 'Professional', sortOrder: 3 },
        { tierId: 'tier-enterprise', name: 'enterprise', displayName: 'Enterprise', sortOrder: 4 }
      ];

      featureGatingService.getAllTiers.mockResolvedValue(mockTiers);

      await subscriptionTierController.getAllTiers(mockReq, mockRes);

      expect(featureGatingService.getAllTiers).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTiers
      });
    });

    it('should include private tiers when requested by admin', async () => {
      mockReq.query.includePrivate = 'true';
      mockReq.user = { role: 'admin' };

      const mockTiers = [
        { tierId: 'tier-free', name: 'free', isPublic: true },
        { tierId: 'tier-internal', name: 'internal', isPublic: false }
      ];

      featureGatingService.getAllTiers.mockResolvedValue(mockTiers);

      await subscriptionTierController.getAllTiers(mockReq, mockRes);

      expect(featureGatingService.getAllTiers).toHaveBeenCalledWith({ includePrivate: true });
    });

    it('should return 500 on service error', async () => {
      featureGatingService.getAllTiers.mockRejectedValue(new Error('Database error'));

      await subscriptionTierController.getAllTiers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch subscription tiers'
      });
    });
  });

  describe('getTierByName', () => {
    it('should return tier details successfully', async () => {
      mockReq.params.name = 'professional';

      const mockTier = {
        tierId: 'tier-professional',
        name: 'professional',
        displayName: 'Professional',
        monthlyPrice: 149,
        annualPrice: 1430,
        features: {
          basicCapTable: true,
          apiAccess: true
        },
        limits: {
          maxStakeholders: 200
        }
      };

      featureGatingService.getTierByName.mockResolvedValue(mockTier);

      await subscriptionTierController.getTierByName(mockReq, mockRes);

      expect(featureGatingService.getTierByName).toHaveBeenCalledWith('professional');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockTier
      });
    });

    it('should return 404 for non-existent tier', async () => {
      mockReq.params.name = 'non-existent';

      featureGatingService.getTierByName.mockResolvedValue(null);

      await subscriptionTierController.getTierByName(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Subscription tier not found'
      });
    });

    it('should return 400 for missing tier name', async () => {
      mockReq.params.name = '';

      await subscriptionTierController.getTierByName(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tier name is required'
      });
    });
  });

  describe('getTierFeatures', () => {
    it('should return features for a tier', async () => {
      mockReq.params.name = 'starter';

      const mockFeatures = {
        basicCapTable: true,
        documentStorage: true,
        stakeholderManagement: true,
        advancedReporting: true,
        apiAccess: false,
        ssoIntegration: false
      };

      featureGatingService.getTierFeatures.mockResolvedValue(mockFeatures);

      await subscriptionTierController.getTierFeatures(mockReq, mockRes);

      expect(featureGatingService.getTierFeatures).toHaveBeenCalledWith('starter');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          tierName: 'starter',
          features: mockFeatures
        }
      });
    });

    it('should return 404 for non-existent tier', async () => {
      mockReq.params.name = 'non-existent';

      featureGatingService.getTierFeatures.mockResolvedValue(null);

      await subscriptionTierController.getTierFeatures(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('compareTiers', () => {
    it('should compare two tiers successfully', async () => {
      mockReq.params.tier1 = 'starter';
      mockReq.params.tier2 = 'professional';

      const mockComparison = {
        tier1: { name: 'starter', monthlyPrice: 49 },
        tier2: { name: 'professional', monthlyPrice: 149 },
        featureDifferences: { apiAccess: { starter: false, professional: true } },
        limitDifferences: { maxStakeholders: { starter: 50, professional: 200 } },
        priceDifference: { monthly: 100, annual: 960 },
        featuresGained: ['apiAccess', 'ssoIntegration'],
        limitImprovements: { maxStakeholders: 150 }
      };

      featureGatingService.compareTiers.mockResolvedValue(mockComparison);

      await subscriptionTierController.compareTiers(mockReq, mockRes);

      expect(featureGatingService.compareTiers).toHaveBeenCalledWith('starter', 'professional');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockComparison
      });
    });

    it('should return 400 for missing tier parameters', async () => {
      mockReq.params.tier1 = 'starter';
      // tier2 is missing

      await subscriptionTierController.compareTiers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Both tier names are required for comparison'
      });
    });

    it('should return 404 when tier not found', async () => {
      mockReq.params.tier1 = 'starter';
      mockReq.params.tier2 = 'non-existent';

      featureGatingService.compareTiers.mockRejectedValue(new Error('Tier not found'));

      await subscriptionTierController.compareTiers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('checkFeatureAccess', () => {
    it('should check feature access for a company', async () => {
      mockReq.params.companyId = 'company-001';
      mockReq.params.featureName = 'apiAccess';

      const mockAccess = {
        hasAccess: true,
        currentTier: 'professional',
        featureName: 'apiAccess'
      };

      featureGatingService.canAccessFeature.mockResolvedValue(mockAccess);

      await subscriptionTierController.checkFeatureAccess(mockReq, mockRes);

      expect(featureGatingService.canAccessFeature).toHaveBeenCalledWith('company-001', 'apiAccess');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAccess
      });
    });

    it('should return upgrade suggestion when feature not available', async () => {
      mockReq.params.companyId = 'company-001';
      mockReq.params.featureName = 'apiAccess';

      const mockAccess = {
        hasAccess: false,
        currentTier: 'starter',
        featureName: 'apiAccess',
        suggestedUpgrade: 'professional'
      };

      featureGatingService.canAccessFeature.mockResolvedValue(mockAccess);

      await subscriptionTierController.checkFeatureAccess(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockAccess
      });
    });

    it('should return 400 for missing parameters', async () => {
      mockReq.params.companyId = '';
      mockReq.params.featureName = 'apiAccess';

      await subscriptionTierController.checkFeatureAccess(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('checkUsageLimit', () => {
    it('should check usage limit for a company', async () => {
      mockReq.params.companyId = 'company-001';
      mockReq.params.limitName = 'maxStakeholders';
      mockReq.query.currentUsage = '25';

      const mockResult = {
        allowed: true,
        currentUsage: 25,
        limit: 50,
        remaining: 25
      };

      featureGatingService.checkLimit.mockResolvedValue(mockResult);

      await subscriptionTierController.checkUsageLimit(mockReq, mockRes);

      expect(featureGatingService.checkLimit).toHaveBeenCalledWith('company-001', 'maxStakeholders', 25);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should return exceeded status when over limit', async () => {
      mockReq.params.companyId = 'company-001';
      mockReq.params.limitName = 'maxStakeholders';
      mockReq.query.currentUsage = '60';

      const mockResult = {
        allowed: false,
        currentUsage: 60,
        limit: 50,
        remaining: 0
      };

      featureGatingService.checkLimit.mockResolvedValue(mockResult);

      await subscriptionTierController.checkUsageLimit(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('should default currentUsage to 0 if not provided', async () => {
      mockReq.params.companyId = 'company-001';
      mockReq.params.limitName = 'maxStakeholders';
      // currentUsage not provided

      const mockResult = {
        allowed: true,
        currentUsage: 0,
        limit: 50,
        remaining: 50
      };

      featureGatingService.checkLimit.mockResolvedValue(mockResult);

      await subscriptionTierController.checkUsageLimit(mockReq, mockRes);

      expect(featureGatingService.checkLimit).toHaveBeenCalledWith('company-001', 'maxStakeholders', 0);
    });
  });

  describe('getUpgradeOptions', () => {
    it('should return upgrade options for a company', async () => {
      mockReq.params.companyId = 'company-001';

      const mockUpgrades = [
        { tierId: 'tier-professional', name: 'professional', monthlyPrice: 149 },
        { tierId: 'tier-enterprise', name: 'enterprise', monthlyPrice: 499 }
      ];

      featureGatingService.getUpgradeOptions.mockResolvedValue(mockUpgrades);

      await subscriptionTierController.getUpgradeOptions(mockReq, mockRes);

      expect(featureGatingService.getUpgradeOptions).toHaveBeenCalledWith('company-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          currentTier: expect.any(String),
          upgradeOptions: mockUpgrades
        }
      });
    });

    it('should return empty array for enterprise tier', async () => {
      mockReq.params.companyId = 'company-enterprise';

      featureGatingService.getUpgradeOptions.mockResolvedValue([]);

      await subscriptionTierController.getUpgradeOptions(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          currentTier: expect.any(String),
          upgradeOptions: []
        }
      });
    });

    it('should return 404 for non-existent company', async () => {
      mockReq.params.companyId = 'non-existent';

      featureGatingService.getUpgradeOptions.mockRejectedValue(new Error('Company not found'));

      await subscriptionTierController.getUpgradeOptions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getCompanyLimits', () => {
    it('should return all limits for a company', async () => {
      mockReq.params.companyId = 'company-001';

      const mockLimits = {
        maxStakeholders: 50,
        maxDocuments: 500,
        storageGB: 10,
        apiCallsPerMonth: 1000,
        maxUsers: 5,
        maxCompanies: 1
      };

      featureGatingService.getUsageLimits.mockResolvedValue(mockLimits);

      await subscriptionTierController.getCompanyLimits(mockReq, mockRes);

      expect(featureGatingService.getUsageLimits).toHaveBeenCalledWith('company-001');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockLimits
      });
    });

    it('should return 404 for non-existent company', async () => {
      mockReq.params.companyId = 'non-existent';

      featureGatingService.getUsageLimits.mockResolvedValue(null);

      await subscriptionTierController.getCompanyLimits(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createTier (Admin)', () => {
    it('should create a new tier successfully', async () => {
      mockReq.body = {
        tierId: 'tier-custom',
        name: 'custom',
        displayName: 'Custom Tier',
        description: 'A custom tier for specific needs',
        monthlyPrice: 99,
        annualPrice: 950,
        currency: 'USD',
        features: {
          basicCapTable: true,
          documentStorage: true
        },
        limits: {
          maxStakeholders: 100,
          maxDocuments: 1000
        },
        isPublic: false,
        sortOrder: 5
      };

      const mockCreatedTier = {
        id: 'zerodb-id-123',
        ...mockReq.body,
        createdAt: new Date().toISOString()
      };

      zerodbService.insertRow.mockResolvedValue({
        rows: [mockCreatedTier]
      });

      await subscriptionTierController.createTier(mockReq, mockRes);

      expect(zerodbService.insertRow).toHaveBeenCalledWith('subscription_tiers', mockReq.body);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedTier
      });
    });

    it('should return 400 for missing required fields', async () => {
      mockReq.body = {
        displayName: 'Custom Tier'
        // Missing tierId and name
      };

      await subscriptionTierController.createTier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'tierId, name, and displayName are required'
      });
    });

    it('should return 409 for duplicate tier name', async () => {
      mockReq.body = {
        tierId: 'tier-starter',
        name: 'starter',
        displayName: 'Starter'
      };

      zerodbService.queryTable.mockResolvedValue([{ name: 'starter' }]);

      await subscriptionTierController.createTier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'A tier with this name already exists'
      });
    });
  });

  describe('updateTier (Admin)', () => {
    it('should update a tier successfully', async () => {
      mockReq.params.tierId = 'tier-starter';
      mockReq.body = {
        monthlyPrice: 59,
        annualPrice: 566
      };

      const mockUpdatedTier = {
        tierId: 'tier-starter',
        name: 'starter',
        monthlyPrice: 59,
        annualPrice: 566
      };

      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 1,
        rows: [mockUpdatedTier]
      });

      await subscriptionTierController.updateTier(mockReq, mockRes);

      expect(zerodbService.updateRows).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedTier
      });
    });

    it('should return 404 for non-existent tier', async () => {
      mockReq.params.tierId = 'non-existent';
      mockReq.body = { monthlyPrice: 59 };

      zerodbService.updateRows.mockResolvedValue({
        modifiedCount: 0,
        rows: []
      });

      await subscriptionTierController.updateTier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should not allow updating protected fields', async () => {
      mockReq.params.tierId = 'tier-free';
      mockReq.body = {
        name: 'new-name' // Protected field
      };

      await subscriptionTierController.updateTier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot modify protected fields: name, tierId'
      });
    });
  });

  describe('deleteTier (Admin)', () => {
    it('should delete a tier successfully', async () => {
      mockReq.params.tierId = 'tier-custom';

      zerodbService.deleteRows.mockResolvedValue({
        deletedCount: 1
      });

      await subscriptionTierController.deleteTier(mockReq, mockRes);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith('subscription_tiers', { tierId: 'tier-custom' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Subscription tier deleted successfully'
      });
    });

    it('should return 404 for non-existent tier', async () => {
      mockReq.params.tierId = 'non-existent';

      zerodbService.deleteRows.mockResolvedValue({
        deletedCount: 0
      });

      await subscriptionTierController.deleteTier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should prevent deletion of default tiers', async () => {
      mockReq.params.tierId = 'tier-free';

      await subscriptionTierController.deleteTier(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot delete default subscription tiers'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      featureGatingService.getAllTiers.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await subscriptionTierController.getAllTiers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should not expose internal error details', async () => {
      const internalError = new Error('Database connection failed with sensitive info');
      featureGatingService.getAllTiers.mockRejectedValue(internalError);

      await subscriptionTierController.getAllTiers(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch subscription tiers'
      });
    });
  });
});
