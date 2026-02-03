/**
 * Subscription Model
 * Issue #115: Implement Subscription System
 *
 * Data model for managing company subscriptions including:
 * - Subscription lifecycle (trial, active, paused, canceled)
 * - Billing period tracking
 * - Usage tracking for limits
 */
const mongoose = require('mongoose');

const subscriptionHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['created', 'activated', 'paused', 'resumed', 'canceled', 'renewed', 'plan_changed', 'quantity_changed'],
    required: true
  },
  fromStatus: { type: String },
  toStatus: { type: String },
  fromPlanId: { type: String },
  toPlanId: { type: String },
  fromQuantity: { type: Number },
  toQuantity: { type: Number },
  reason: { type: String },
  performedBy: { type: String },
  performedAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const subscriptionSchema = new mongoose.Schema({
  // Unique identifier for the subscription
  subscriptionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Company this subscription belongs to
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Plan this subscription is for
  planId: {
    type: String,
    required: true,
    index: true
  },

  // Subscription status
  status: {
    type: String,
    enum: ['trialing', 'active', 'past_due', 'canceled', 'paused'],
    default: 'trialing',
    index: true
  },

  // Billing period tracking
  currentPeriodStart: {
    type: Date
  },
  currentPeriodEnd: {
    type: Date
  },

  // Trial period tracking
  trialStart: {
    type: Date
  },
  trialEnd: {
    type: Date
  },

  // Cancellation tracking
  canceledAt: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  cancellationReason: {
    type: String
  },

  // Quantity (seats/units)
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },

  // Pause tracking
  pausedAt: {
    type: Date
  },
  resumesAt: {
    type: Date
  },

  // Metadata for custom data
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Status change history
  history: [subscriptionHistorySchema],

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

// Compound indexes for common queries
subscriptionSchema.index({ companyId: 1, status: 1 });
subscriptionSchema.index({ planId: 1, status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1, status: 1 });
subscriptionSchema.index({ trialEnd: 1, status: 1 });

// Pre-save hook to record history
subscriptionSchema.pre('save', function(next) {
  if (this.isNew) {
    this.history = this.history || [];
    this.history.push({
      action: 'created',
      toStatus: this.status,
      toPlanId: this.planId,
      toQuantity: this.quantity,
      performedAt: new Date()
    });
  }
  next();
});

// Virtual for checking if subscription is in trial
subscriptionSchema.virtual('isTrialing').get(function() {
  return this.status === 'trialing' && this.trialEnd && new Date() < new Date(this.trialEnd);
});

// Virtual for checking if subscription is active (including trial)
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' || this.status === 'trialing';
});

// Virtual for days remaining in current period
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.currentPeriodEnd) return null;
  const now = new Date();
  const end = new Date(this.currentPeriodEnd);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for trial days remaining
subscriptionSchema.virtual('trialDaysRemaining').get(function() {
  if (!this.trialEnd || this.status !== 'trialing') return null;
  const now = new Date();
  const end = new Date(this.trialEnd);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Method to add history entry
subscriptionSchema.methods.addHistoryEntry = function(entry) {
  this.history = this.history || [];
  this.history.push({
    ...entry,
    performedAt: new Date()
  });
};

// Ensure virtuals are included in JSON
subscriptionSchema.set('toJSON', { virtuals: true });
subscriptionSchema.set('toObject', { virtuals: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
