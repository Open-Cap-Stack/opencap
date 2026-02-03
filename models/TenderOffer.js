/**
 * TenderOffer Model
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * Data model for company-initiated liquidity events (share buybacks)
 * Supports:
 * - Offer configuration and eligibility
 * - Status lifecycle management
 * - Participation limits
 * - Submission tracking
 */
const mongoose = require('mongoose');

const eligibilityCriteriaSchema = new mongoose.Schema({
  minTenureMonths: { type: Number, default: 0 },
  minSharesHeld: { type: Number, default: 0 },
  employeeStatus: [{
    type: String,
    enum: ['active', 'former', 'terminated', 'retired']
  }],
  excludedStakeholders: [{ type: String }],
  customRules: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const tenderOfferSchema = new mongoose.Schema({
  offerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Offer details
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // Pricing
  pricePerShare: {
    type: Number,
    required: true,
    min: 0
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 0
  },

  // Eligible share classes
  shareClasses: [{
    type: String
  }],

  // Offer period
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },

  // Status lifecycle
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'canceled', 'settled'],
    default: 'draft',
    index: true
  },

  // Participation limits per stakeholder
  minShares: {
    type: Number,
    default: 1,
    min: 0
  },
  maxShares: {
    type: Number,
    min: 0
  },

  // Eligibility criteria
  eligibilityCriteria: {
    type: eligibilityCriteriaSchema,
    default: () => ({
      minTenureMonths: 0,
      minSharesHeld: 0,
      employeeStatus: ['active', 'former'],
      excludedStakeholders: [],
      customRules: {}
    })
  },

  // Submission tracking
  totalSharesTendered: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSharesAccepted: {
    type: Number,
    default: 0,
    min: 0
  },
  totalPayoutAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Prorata details (if oversubscribed)
  prorataPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  isOversubscribed: {
    type: Boolean,
    default: false
  },

  // Important dates
  publishedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  settledAt: {
    type: Date
  },
  canceledAt: {
    type: Date
  },

  // Notes and metadata
  notes: {
    type: String
  },
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

// Compound indexes for efficient queries
tenderOfferSchema.index({ companyId: 1, status: 1 });
tenderOfferSchema.index({ status: 1, startDate: 1 });
tenderOfferSchema.index({ status: 1, endDate: 1 });

// Virtual for maximum shares that can be purchased
tenderOfferSchema.virtual('maxPurchasableShares').get(function() {
  if (this.pricePerShare === 0) return 0;
  return Math.floor(this.totalBudget / this.pricePerShare);
});

// Virtual for remaining budget
tenderOfferSchema.virtual('remainingBudget').get(function() {
  return this.totalBudget - this.totalPayoutAmount;
});

// Virtual for subscription ratio
tenderOfferSchema.virtual('subscriptionRatio').get(function() {
  const maxShares = this.maxPurchasableShares;
  if (maxShares === 0) return 0;
  return this.totalSharesTendered / maxShares;
});

// Virtual to check if offer is active (open and within date range)
tenderOfferSchema.virtual('isActive').get(function() {
  if (this.status !== 'open') return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
});

// Ensure virtuals are included in JSON
tenderOfferSchema.set('toJSON', { virtuals: true });
tenderOfferSchema.set('toObject', { virtuals: true });

const TenderOffer = mongoose.model('TenderOffer', tenderOfferSchema);

module.exports = TenderOffer;
