/**
 * SubscriptionPlan Model
 * Issue #115: Implement Subscription System
 *
 * Data model for subscription plans including:
 * - Pricing configuration
 * - Feature flags
 * - Usage limits
 */
const mongoose = require('mongoose');

const limitsSchema = new mongoose.Schema({
  stakeholders: {
    type: Number,
    default: -1 // -1 means unlimited
  },
  documents: {
    type: Number,
    default: -1
  },
  storageGB: {
    type: Number,
    default: -1
  },
  users: {
    type: Number,
    default: -1
  },
  apiCallsPerMonth: {
    type: Number,
    default: -1
  }
}, { _id: false });

const subscriptionPlanSchema = new mongoose.Schema({
  // Unique identifier for the plan
  planId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Plan display name
  name: {
    type: String,
    required: true
  },

  // Plan description
  description: {
    type: String
  },

  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },

  // Currency code
  currency: {
    type: String,
    default: 'USD'
  },

  // Billing interval
  interval: {
    type: String,
    enum: ['month', 'year'],
    default: 'month'
  },

  // Trial period in days
  trialPeriodDays: {
    type: Number,
    default: 14,
    min: 0
  },

  // Feature flags - array of feature identifiers
  features: [{
    type: String
  }],

  // Usage limits
  limits: {
    type: limitsSchema,
    default: () => ({
      stakeholders: -1,
      documents: -1,
      storageGB: -1,
      users: -1,
      apiCallsPerMonth: -1
    })
  },

  // Whether the plan is currently available
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Sort order for display
  sortOrder: {
    type: Number,
    default: 0
  },

  // Stripe/payment provider plan ID (optional)
  externalPlanId: {
    type: String
  },

  // Metadata for custom data
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Audit fields
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

// Virtual to check if plan has trial
subscriptionPlanSchema.virtual('hasTrial').get(function() {
  return this.trialPeriodDays > 0;
});

// Virtual for formatted price
subscriptionPlanSchema.virtual('formattedPrice').get(function() {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency || 'USD'
  });
  return formatter.format(this.price);
});

// Method to check if a feature is included
subscriptionPlanSchema.methods.hasFeature = function(featureName) {
  return this.features && this.features.includes(featureName);
};

// Method to get limit value
subscriptionPlanSchema.methods.getLimit = function(limitType) {
  if (!this.limits || this.limits[limitType] === undefined) {
    return -1; // Unlimited by default
  }
  return this.limits[limitType];
};

// Method to check if limit is unlimited
subscriptionPlanSchema.methods.isLimitUnlimited = function(limitType) {
  return this.getLimit(limitType) === -1;
};

// Ensure virtuals are included in JSON
subscriptionPlanSchema.set('toJSON', { virtuals: true });
subscriptionPlanSchema.set('toObject', { virtuals: true });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan;
