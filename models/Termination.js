/**
 * Termination Model
 * Issue #81: Implement Termination Equity Workflow
 *
 * Handles employee departures, vested share calculations,
 * exercise window tracking, and forfeiture management.
 */

const mongoose = require('mongoose');

const exerciseHistorySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  shares: { type: Number, required: true, min: 0 },
  exercisePrice: { type: Number, required: true, min: 0 },
  fmvAtExercise: { type: Number, min: 0 },
  totalCost: { type: Number, min: 0 },
  taxWithholding: { type: Number, min: 0 }
}, { _id: true });

const grantSummarySchema = new mongoose.Schema({
  grantId: { type: String, required: true },
  grantDate: { type: Date, required: true },
  totalShares: { type: Number, required: true, min: 0 },
  vestedShares: { type: Number, required: true, min: 0 },
  unvestedShares: { type: Number, required: true, min: 0 },
  exercisePrice: { type: Number, min: 0 },
  vestingSchedule: {
    type: { type: String, enum: ['monthly', 'quarterly', 'annual', 'immediate', 'custom'] },
    cliffMonths: { type: Number, min: 0 },
    totalMonths: { type: Number, min: 0 }
  }
}, { _id: true });

const terminationSchema = new mongoose.Schema({
  // Unique identifier for the termination record
  terminationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Employee reference
  employeeId: {
    type: String,
    required: true,
    index: true
  },

  // Company reference
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Termination details
  terminationDate: {
    type: Date,
    required: true,
    index: true
  },

  terminationType: {
    type: String,
    required: true,
    enum: ['voluntary', 'involuntary', 'for_cause', 'layoff', 'retirement', 'death', 'disability'],
    index: true
  },

  terminationReason: {
    type: String
  },

  // Vesting summary
  totalGrantedShares: {
    type: Number,
    default: 0,
    min: 0
  },

  vestedSharesAtTermination: {
    type: Number,
    default: 0,
    min: 0
  },

  unvestedSharesForfeited: {
    type: Number,
    default: 0,
    min: 0
  },

  vestingPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Grant-level details
  grants: [grantSummarySchema],

  // Exercise window tracking
  exerciseWindowDays: {
    type: Number,
    default: 90,
    min: 0
  },

  exerciseWindowEndDate: {
    type: Date,
    index: true
  },

  exerciseWindowExtended: {
    type: Boolean,
    default: false
  },

  extensionReason: {
    type: String
  },

  extensionApprovedBy: {
    type: String
  },

  extensionApprovedDate: {
    type: Date
  },

  // Exercise tracking
  sharesExercised: {
    type: Number,
    default: 0,
    min: 0
  },

  sharesForfeited: {
    type: Number,
    default: 0,
    min: 0
  },

  exerciseHistory: [exerciseHistorySchema],

  // Repurchase rights
  repurchaseRightEnabled: {
    type: Boolean,
    default: false
  },

  repurchasePrice: {
    type: Number,
    min: 0
  },

  repurchaseDeadline: {
    type: Date
  },

  repurchasePriceMethod: {
    type: String,
    enum: ['lower_of_exercise_or_fmv', 'fmv_only', 'exercise_price_only', 'custom']
  },

  totalRepurchaseValue: {
    type: Number,
    min: 0
  },

  // Status tracking
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'exercise_window_open', 'exercise_window_expired', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Documents generated
  documentsGenerated: [{
    type: { type: String },
    generatedAt: { type: Date },
    url: { type: String },
    documentId: { type: String }
  }],

  // Processing flags
  immediateForfeiture: {
    type: Boolean,
    default: false
  },

  cliffNotMet: {
    type: Boolean,
    default: false
  },

  // Notifications
  notificationsSent: [{
    type: { type: String },
    sentAt: { type: Date },
    recipient: { type: String },
    channel: { type: String, enum: ['email', 'sms', 'in_app'] }
  }],

  // Audit trail
  notes: {
    type: String
  },

  processedBy: {
    type: String
  },

  processedAt: {
    type: Date
  },

  approvedBy: {
    type: String
  },

  approvedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: Calculate days until exercise window expires
terminationSchema.virtual('daysUntilExerciseExpiry').get(function() {
  if (!this.exerciseWindowEndDate) return null;
  const now = new Date();
  if (this.exerciseWindowEndDate < now) return 0;
  return Math.ceil((this.exerciseWindowEndDate - now) / (1000 * 60 * 60 * 24));
});

// Virtual: Check if exercise window is expired
terminationSchema.virtual('isExerciseWindowExpired').get(function() {
  if (!this.exerciseWindowEndDate) return false;
  return this.exerciseWindowEndDate < new Date();
});

// Virtual: Calculate shares available to exercise
terminationSchema.virtual('sharesAvailableToExercise').get(function() {
  return Math.max(0, this.vestedSharesAtTermination - this.sharesExercised);
});

// Virtual: Calculate total exercise cost
terminationSchema.virtual('totalExerciseCost').get(function() {
  if (!this.exerciseHistory || this.exerciseHistory.length === 0) return 0;
  return this.exerciseHistory.reduce((sum, exercise) => sum + (exercise.totalCost || 0), 0);
});

// Indexes for common queries
terminationSchema.index({ companyId: 1, status: 1 });
terminationSchema.index({ companyId: 1, terminationDate: -1 });
terminationSchema.index({ exerciseWindowEndDate: 1, status: 1 });
terminationSchema.index({ employeeId: 1, terminationDate: -1 });

// Pre-save middleware to generate terminationId if not provided
terminationSchema.pre('save', function(next) {
  if (!this.terminationId) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.terminationId = `TERM-${year}-${random}`;
  }
  next();
});

// Pre-save middleware to calculate exercise window end date
terminationSchema.pre('save', function(next) {
  if (this.terminationDate && this.exerciseWindowDays && !this.exerciseWindowEndDate) {
    const endDate = new Date(this.terminationDate);
    endDate.setDate(endDate.getDate() + this.exerciseWindowDays);
    this.exerciseWindowEndDate = endDate;
  }
  next();
});

// Method to check if shares can be exercised
terminationSchema.methods.canExercise = function(sharesToExercise) {
  if (this.isExerciseWindowExpired) return false;
  if (sharesToExercise > this.sharesAvailableToExercise) return false;
  return true;
};

// Static method to find terminations with expiring exercise windows
terminationSchema.statics.findExpiringWindows = function(companyId, daysUntilExpiry = 7) {
  const now = new Date();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

  return this.find({
    companyId,
    status: 'exercise_window_open',
    exerciseWindowEndDate: {
      $gte: now,
      $lte: expiryDate
    }
  });
};

const Termination = mongoose.model('Termination', terminationSchema);

module.exports = Termination;
