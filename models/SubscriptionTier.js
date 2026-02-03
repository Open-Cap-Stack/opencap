/**
 * SubscriptionTier Model
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * Defines subscription tier schema including pricing, features, and limits
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionTierSchema = new Schema({
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
    basicCapTable: {
      type: Boolean,
      default: true
    },
    documentStorage: {
      type: Boolean,
      default: true
    },
    stakeholderManagement: {
      type: Boolean,
      default: true
    },
    advancedReporting: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    ssoIntegration: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    dedicatedAccountManager: {
      type: Boolean,
      default: false
    },
    auditLogs: {
      type: Boolean,
      default: false
    },
    vestingSchedules: {
      type: Boolean,
      default: false
    },
    equityPlans: {
      type: Boolean,
      default: false
    },
    taxCalculations: {
      type: Boolean,
      default: false
    },
    valuations409A: {
      type: Boolean,
      default: false
    },
    safeConversions: {
      type: Boolean,
      default: false
    },
    waterfallAnalysis: {
      type: Boolean,
      default: false
    },
    investorCommunications: {
      type: Boolean,
      default: false
    },
    bulkMessaging: {
      type: Boolean,
      default: false
    },
    webhookIntegrations: {
      type: Boolean,
      default: false
    },
    multiCompanySupport: {
      type: Boolean,
      default: false
    }
  },
  limits: {
    maxStakeholders: {
      type: Number,
      default: 10,
      min: -1 // -1 means unlimited
    },
    maxDocuments: {
      type: Number,
      default: 50,
      min: -1
    },
    storageGB: {
      type: Number,
      default: 1,
      min: -1
    },
    apiCallsPerMonth: {
      type: Number,
      default: 0,
      min: -1
    },
    maxUsers: {
      type: Number,
      default: 2,
      min: -1
    },
    maxCompanies: {
      type: Number,
      default: 1,
      min: -1
    },
    maxShareClasses: {
      type: Number,
      default: 5,
      min: -1
    },
    maxEquityPlans: {
      type: Number,
      default: 1,
      min: -1
    },
    maxVestingSchedules: {
      type: Number,
      default: 10,
      min: -1
    },
    maxInvestors: {
      type: Number,
      default: 10,
      min: -1
    },
    maxTransactionsPerMonth: {
      type: Number,
      default: 50,
      min: -1
    }
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    required: true,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  trialDays: {
    type: Number,
    default: 0,
    min: 0
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
subscriptionTierSchema.index({ isPublic: 1, sortOrder: 1 });
subscriptionTierSchema.index({ name: 1 });

// Virtual for calculating annual savings percentage
subscriptionTierSchema.virtual('annualSavingsPercentage').get(function() {
  if (this.monthlyPrice === 0) return 0;
  const annualFromMonthly = this.monthlyPrice * 12;
  const savings = annualFromMonthly - this.annualPrice;
  return Math.round((savings / annualFromMonthly) * 100);
});

// Virtual for monthly equivalent of annual price
subscriptionTierSchema.virtual('monthlyEquivalent').get(function() {
  if (this.annualPrice === 0) return 0;
  return Math.round((this.annualPrice / 12) * 100) / 100;
});

// Static method to get default tiers
subscriptionTierSchema.statics.getDefaultTiers = function() {
  return [
    {
      tierId: 'tier-free',
      name: 'free',
      displayName: 'Free',
      description: 'Get started with basic cap table management',
      monthlyPrice: 0,
      annualPrice: 0,
      currency: 'USD',
      features: {
        basicCapTable: true,
        documentStorage: true,
        stakeholderManagement: true,
        advancedReporting: false,
        apiAccess: false,
        ssoIntegration: false,
        customBranding: false,
        prioritySupport: false,
        dedicatedAccountManager: false,
        auditLogs: false,
        vestingSchedules: false,
        equityPlans: false,
        taxCalculations: false,
        valuations409A: false,
        safeConversions: false,
        waterfallAnalysis: false,
        investorCommunications: false,
        bulkMessaging: false,
        webhookIntegrations: false,
        multiCompanySupport: false
      },
      limits: {
        maxStakeholders: 10,
        maxDocuments: 50,
        storageGB: 1,
        apiCallsPerMonth: 0,
        maxUsers: 2,
        maxCompanies: 1,
        maxShareClasses: 3,
        maxEquityPlans: 0,
        maxVestingSchedules: 0,
        maxInvestors: 5,
        maxTransactionsPerMonth: 20
      },
      isPublic: true,
      sortOrder: 1,
      isDefault: true,
      trialDays: 0
    },
    {
      tierId: 'tier-starter',
      name: 'starter',
      displayName: 'Starter',
      description: 'For growing startups managing their equity',
      monthlyPrice: 49,
      annualPrice: 470,
      currency: 'USD',
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
        auditLogs: true,
        vestingSchedules: true,
        equityPlans: true,
        taxCalculations: false,
        valuations409A: false,
        safeConversions: true,
        waterfallAnalysis: false,
        investorCommunications: true,
        bulkMessaging: false,
        webhookIntegrations: false,
        multiCompanySupport: false
      },
      limits: {
        maxStakeholders: 50,
        maxDocuments: 500,
        storageGB: 10,
        apiCallsPerMonth: 1000,
        maxUsers: 5,
        maxCompanies: 1,
        maxShareClasses: 10,
        maxEquityPlans: 2,
        maxVestingSchedules: 50,
        maxInvestors: 25,
        maxTransactionsPerMonth: 100
      },
      isPublic: true,
      sortOrder: 2,
      isDefault: true,
      trialDays: 14
    },
    {
      tierId: 'tier-professional',
      name: 'professional',
      displayName: 'Professional',
      description: 'Advanced features for scaling companies',
      monthlyPrice: 149,
      annualPrice: 1430,
      currency: 'USD',
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
        auditLogs: true,
        vestingSchedules: true,
        equityPlans: true,
        taxCalculations: true,
        valuations409A: true,
        safeConversions: true,
        waterfallAnalysis: true,
        investorCommunications: true,
        bulkMessaging: true,
        webhookIntegrations: true,
        multiCompanySupport: true
      },
      limits: {
        maxStakeholders: 200,
        maxDocuments: 2000,
        storageGB: 50,
        apiCallsPerMonth: 10000,
        maxUsers: 20,
        maxCompanies: 3,
        maxShareClasses: 25,
        maxEquityPlans: 10,
        maxVestingSchedules: 200,
        maxInvestors: 100,
        maxTransactionsPerMonth: 500
      },
      isPublic: true,
      sortOrder: 3,
      isDefault: true,
      trialDays: 14
    },
    {
      tierId: 'tier-enterprise',
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'Custom solutions for large organizations',
      monthlyPrice: 499,
      annualPrice: 4790,
      currency: 'USD',
      features: {
        basicCapTable: true,
        documentStorage: true,
        stakeholderManagement: true,
        advancedReporting: true,
        apiAccess: true,
        ssoIntegration: true,
        customBranding: true,
        prioritySupport: true,
        dedicatedAccountManager: true,
        auditLogs: true,
        vestingSchedules: true,
        equityPlans: true,
        taxCalculations: true,
        valuations409A: true,
        safeConversions: true,
        waterfallAnalysis: true,
        investorCommunications: true,
        bulkMessaging: true,
        webhookIntegrations: true,
        multiCompanySupport: true
      },
      limits: {
        maxStakeholders: -1, // Unlimited
        maxDocuments: -1,
        storageGB: -1,
        apiCallsPerMonth: -1,
        maxUsers: -1,
        maxCompanies: -1,
        maxShareClasses: -1,
        maxEquityPlans: -1,
        maxVestingSchedules: -1,
        maxInvestors: -1,
        maxTransactionsPerMonth: -1
      },
      isPublic: true,
      sortOrder: 4,
      isDefault: true,
      trialDays: 30
    }
  ];
};

// Instance method to check if a feature is enabled
subscriptionTierSchema.methods.hasFeature = function(featureName) {
  return this.features && this.features[featureName] === true;
};

// Instance method to check if usage is within limit
subscriptionTierSchema.methods.isWithinLimit = function(limitName, currentUsage) {
  const limit = this.limits && this.limits[limitName];
  if (limit === undefined) return false;
  if (limit === -1) return true; // Unlimited
  return currentUsage <= limit;
};

// Pre-save hook to ensure consistency
subscriptionTierSchema.pre('save', function(next) {
  // Ensure annual price is not more than monthly * 12 (would be illogical)
  if (this.annualPrice > this.monthlyPrice * 12) {
    this.annualPrice = this.monthlyPrice * 12;
  }
  next();
});

const SubscriptionTier = mongoose.model('SubscriptionTier', subscriptionTierSchema);

module.exports = SubscriptionTier;
