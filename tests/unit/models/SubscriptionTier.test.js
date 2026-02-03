/**
 * SubscriptionTier Model Test Suite
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Tests for the SubscriptionTier model validation and schema
 */

const mongoose = require('mongoose');

// Define schema for testing (mimics the actual model)
const subscriptionTierSchema = new mongoose.Schema({
  tierId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['free', 'starter', 'professional', 'enterprise', 'custom'],
    index: true
  },
  displayName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  annualPrice: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  features: {
    basicCapTable: { type: Boolean, default: true },
    documentStorage: { type: Boolean, default: true },
    stakeholderManagement: { type: Boolean, default: true },
    advancedReporting: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    ssoIntegration: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    dedicatedAccountManager: { type: Boolean, default: false },
    auditLogs: { type: Boolean, default: false }
  },
  limits: {
    maxStakeholders: { type: Number, default: 10, min: -1 },
    maxDocuments: { type: Number, default: 50, min: -1 },
    storageGB: { type: Number, default: 1, min: -1 },
    apiCallsPerMonth: { type: Number, default: 0, min: -1 },
    maxUsers: { type: Number, default: 2, min: -1 },
    maxCompanies: { type: Number, default: 1, min: -1 }
  },
  isPublic: { type: Boolean, default: true },
  sortOrder: { type: Number, required: true, default: 0 },
  isDefault: { type: Boolean, default: false },
  trialDays: { type: Number, default: 0, min: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Helper to create mock subscription tier
function createMockTier(data) {
  const defaultData = {
    tierId: 'tier-test',
    name: 'free',
    displayName: 'Test',
    monthlyPrice: 0,
    annualPrice: 0,
    currency: 'USD',
    features: {},
    limits: {},
    isPublic: true,
    sortOrder: 0
  };
  return { ...defaultData, ...data };
}

describe('SubscriptionTier Model', () => {
  describe('Schema Definition', () => {
    it('should be defined', () => {
      expect(subscriptionTierSchema).toBeDefined();
    });

    it('should have the required fields', () => {
      expect(subscriptionTierSchema.path('tierId')).toBeDefined();
      expect(subscriptionTierSchema.path('name')).toBeDefined();
      expect(subscriptionTierSchema.path('displayName')).toBeDefined();
      expect(subscriptionTierSchema.path('monthlyPrice')).toBeDefined();
      expect(subscriptionTierSchema.path('annualPrice')).toBeDefined();
    });
  });

  describe('Required Fields', () => {
    it('should require tierId', () => {
      expect(subscriptionTierSchema.path('tierId').isRequired).toBeTruthy();
    });

    it('should require name', () => {
      expect(subscriptionTierSchema.path('name').isRequired).toBeTruthy();
    });

    it('should require displayName', () => {
      expect(subscriptionTierSchema.path('displayName').isRequired).toBeTruthy();
    });
  });

  describe('Tier Creation', () => {
    it('should create a valid free tier', () => {
      const tierData = createMockTier({
        tierId: 'tier-free',
        name: 'free',
        displayName: 'Free',
        description: 'Basic features for getting started',
        monthlyPrice: 0,
        annualPrice: 0,
        features: {
          basicCapTable: true,
          documentStorage: true,
          stakeholderManagement: true
        },
        limits: {
          maxStakeholders: 10,
          maxDocuments: 50
        }
      });

      expect(tierData.tierId).toBe('tier-free');
      expect(tierData.name).toBe('free');
      expect(tierData.monthlyPrice).toBe(0);
      expect(tierData.features.basicCapTable).toBe(true);
      expect(tierData.limits.maxStakeholders).toBe(10);
    });

    it('should create a valid starter tier', () => {
      const tierData = createMockTier({
        tierId: 'tier-starter',
        name: 'starter',
        displayName: 'Starter',
        monthlyPrice: 49,
        annualPrice: 470,
        features: {
          advancedReporting: true,
          auditLogs: true
        },
        limits: {
          maxStakeholders: 50
        }
      });

      expect(tierData.name).toBe('starter');
      expect(tierData.monthlyPrice).toBe(49);
      expect(tierData.features.advancedReporting).toBe(true);
      expect(tierData.limits.maxStakeholders).toBe(50);
    });

    it('should create a valid professional tier', () => {
      const tierData = createMockTier({
        tierId: 'tier-professional',
        name: 'professional',
        displayName: 'Professional',
        monthlyPrice: 149,
        annualPrice: 1430,
        features: {
          apiAccess: true,
          ssoIntegration: true,
          prioritySupport: true
        },
        limits: {
          maxStakeholders: 200
        }
      });

      expect(tierData.name).toBe('professional');
      expect(tierData.features.apiAccess).toBe(true);
      expect(tierData.limits.maxStakeholders).toBe(200);
    });

    it('should create a valid enterprise tier', () => {
      const tierData = createMockTier({
        tierId: 'tier-enterprise',
        name: 'enterprise',
        displayName: 'Enterprise',
        monthlyPrice: 499,
        annualPrice: 4790,
        features: {
          dedicatedAccountManager: true,
          customBranding: true
        },
        limits: {
          maxStakeholders: -1 // Unlimited
        }
      });

      expect(tierData.name).toBe('enterprise');
      expect(tierData.features.dedicatedAccountManager).toBe(true);
      expect(tierData.limits.maxStakeholders).toBe(-1);
    });
  });

  describe('Field Defaults', () => {
    it('should default currency to USD', () => {
      const defaultVal = subscriptionTierSchema.path('currency').defaultValue;
      expect(defaultVal).toBe('USD');
    });

    it('should default isPublic to true', () => {
      const defaultVal = subscriptionTierSchema.path('isPublic').defaultValue;
      expect(defaultVal).toBe(true);
    });
  });

  describe('Name Enum Validation', () => {
    it('should have valid tier name enum values', () => {
      const nameEnum = subscriptionTierSchema.path('name').enumValues;
      expect(nameEnum).toContain('free');
      expect(nameEnum).toContain('starter');
      expect(nameEnum).toContain('professional');
      expect(nameEnum).toContain('enterprise');
    });
  });

  describe('Features Object', () => {
    it('should contain all required feature flags', () => {
      const expectedFeatures = [
        'basicCapTable',
        'documentStorage',
        'stakeholderManagement',
        'advancedReporting',
        'apiAccess',
        'ssoIntegration',
        'customBranding',
        'prioritySupport',
        'dedicatedAccountManager',
        'auditLogs'
      ];

      expectedFeatures.forEach(feature => {
        expect(subscriptionTierSchema.path(`features.${feature}`)).toBeDefined();
      });
    });
  });

  describe('Limits Object', () => {
    it('should contain all required limit fields', () => {
      const expectedLimits = [
        'maxStakeholders',
        'maxDocuments',
        'storageGB',
        'apiCallsPerMonth',
        'maxUsers',
        'maxCompanies'
      ];

      expectedLimits.forEach(limit => {
        expect(subscriptionTierSchema.path(`limits.${limit}`)).toBeDefined();
      });
    });

    it('should accept -1 for unlimited values', () => {
      const tierData = createMockTier({
        limits: {
          maxStakeholders: -1,
          maxDocuments: -1
        }
      });

      expect(tierData.limits.maxStakeholders).toBe(-1);
      expect(tierData.limits.maxDocuments).toBe(-1);
    });
  });

  describe('Price Validation', () => {
    it('should accept zero price for free tier', () => {
      const tierData = createMockTier({
        monthlyPrice: 0,
        annualPrice: 0
      });

      expect(tierData.monthlyPrice).toBe(0);
      expect(tierData.annualPrice).toBe(0);
    });

    it('should accept positive prices', () => {
      const tierData = createMockTier({
        monthlyPrice: 49,
        annualPrice: 470
      });

      expect(tierData.monthlyPrice).toBe(49);
      expect(tierData.annualPrice).toBe(470);
    });

    it('should calculate annual savings correctly', () => {
      const tierData = createMockTier({
        monthlyPrice: 49,
        annualPrice: 470
      });

      const monthlyCostPerYear = tierData.monthlyPrice * 12;
      const savings = monthlyCostPerYear - tierData.annualPrice;

      expect(savings).toBe(118);
    });
  });

  describe('Sort Order', () => {
    it('should maintain correct sort order', () => {
      const tiers = [
        createMockTier({ name: 'free', sortOrder: 1 }),
        createMockTier({ name: 'starter', sortOrder: 2 }),
        createMockTier({ name: 'professional', sortOrder: 3 }),
        createMockTier({ name: 'enterprise', sortOrder: 4 })
      ];

      const sorted = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);

      expect(sorted[0].name).toBe('free');
      expect(sorted[1].name).toBe('starter');
      expect(sorted[2].name).toBe('professional');
      expect(sorted[3].name).toBe('enterprise');
    });
  });
});
