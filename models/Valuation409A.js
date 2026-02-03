/**
 * Valuation409A Model
 * Feature: Issue #59 - Create 409A Valuation Request System
 *
 * Implements workflow for requesting, tracking, and storing 409A valuations.
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const documentReferenceSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  type: {
    type: String,
    enum: ['valuation_report', 'draft_report', 'supporting_data', 'board_approval', 'other'],
    required: true
  },
  name: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const valuationFirmSchema = new mongoose.Schema({
  name: { type: String },
  contactName: { type: String },
  contactEmail: { type: String },
  phone: { type: String },
  assignedAt: { type: Date }
}, { _id: false });

const Valuation409ASchema = new mongoose.Schema({
  // Unique identifier
  valuationId: {
    type: String,
    unique: true,
    default: () => `val_${uuidv4()}`,
    index: true
  },

  // Company reference
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Request details
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    enum: [
      'annual_valuation',
      'fundraising_round',
      'material_event',
      'option_grant',
      'board_request',
      'audit_requirement',
      'other'
    ],
    required: true
  },
  reasonDetails: { type: String },

  // Status workflow
  status: {
    type: String,
    enum: [
      'requested',
      'in_progress',
      'draft_received',
      'under_review',
      'approved',
      'expired',
      'cancelled'
    ],
    default: 'requested',
    required: true,
    index: true
  },

  // Valuation details
  fairMarketValue: {
    type: Number,
    min: [0, 'Fair market value must be positive']
  },
  valuationMethod: {
    type: String,
    enum: ['income', 'market', 'asset', 'hybrid', 'other']
  },
  effectiveDate: { type: Date },
  expirationDate: { type: Date },

  // Valuation firm
  valuationFirm: valuationFirmSchema,

  // Timeline dates
  draftReceivedAt: { type: Date },
  reviewStartedAt: { type: Date },
  approvedAt: { type: Date },
  cancelledAt: { type: Date },

  // Document references
  documents: [documentReferenceSchema],

  // Board approval
  boardApproval: {
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    resolution: { type: String }
  },

  // Audit trail
  statusHistory: [statusHistorySchema],

  // Metadata
  notes: { type: String },
  tags: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

  // Tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
Valuation409ASchema.index({ companyId: 1, status: 1 });
Valuation409ASchema.index({ companyId: 1, effectiveDate: -1 });
Valuation409ASchema.index({ status: 1, expirationDate: 1 });
Valuation409ASchema.index({ companyId: 1, createdAt: -1 });

// Virtuals
Valuation409ASchema.virtual('isExpired').get(function() {
  if (!this.expirationDate) return false;
  return new Date() > this.expirationDate && this.status === 'approved';
});

Valuation409ASchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expirationDate) return null;
  const now = new Date();
  const diff = this.expirationDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

Valuation409ASchema.virtual('needsRenewalReminder').get(function() {
  if (!this.expirationDate || this.status !== 'approved') return false;
  const daysUntil = this.daysUntilExpiration;
  return daysUntil !== null && daysUntil <= 60 && daysUntil > 0;
});

// Valid status transitions
const validTransitions = {
  requested: ['in_progress', 'cancelled'],
  in_progress: ['draft_received', 'cancelled'],
  draft_received: ['under_review', 'cancelled'],
  under_review: ['approved', 'draft_received', 'cancelled'],
  approved: ['expired'],
  expired: [],
  cancelled: []
};

// Instance methods
Valuation409ASchema.methods.canTransitionTo = function(newStatus) {
  return validTransitions[this.status]?.includes(newStatus) || false;
};

Valuation409ASchema.methods.transitionTo = async function(newStatus, userId, reason = null, metadata = {}) {
  if (!this.canTransitionTo(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }

  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy: userId,
    reason,
    metadata
  });

  this.status = newStatus;
  this.updatedBy = userId;

  // Set appropriate timestamp
  const timestampMap = {
    in_progress: null,
    draft_received: 'draftReceivedAt',
    under_review: 'reviewStartedAt',
    approved: 'approvedAt',
    cancelled: 'cancelledAt'
  };

  if (timestampMap[newStatus]) {
    this[timestampMap[newStatus]] = new Date();
  }

  // Calculate expiration date when approved (12 months from effective date)
  if (newStatus === 'approved' && this.effectiveDate) {
    const expiration = new Date(this.effectiveDate);
    expiration.setFullYear(expiration.getFullYear() + 1);
    this.expirationDate = expiration;
  }

  return this.save();
};

Valuation409ASchema.methods.assignValuationFirm = async function(firmData, userId) {
  this.valuationFirm = {
    ...firmData,
    assignedAt: new Date()
  };
  this.updatedBy = userId;

  if (this.status === 'requested') {
    await this.transitionTo('in_progress', userId, 'Valuation firm assigned');
  } else {
    await this.save();
  }

  return this;
};

Valuation409ASchema.methods.receiveDraft = async function(draftData, userId) {
  if (this.status !== 'in_progress') {
    throw new Error('Can only receive draft when valuation is in progress');
  }

  if (draftData.fairMarketValue) {
    this.fairMarketValue = draftData.fairMarketValue;
  }
  if (draftData.valuationMethod) {
    this.valuationMethod = draftData.valuationMethod;
  }
  if (draftData.effectiveDate) {
    this.effectiveDate = draftData.effectiveDate;
  }

  return this.transitionTo('draft_received', userId, 'Draft report received', draftData);
};

Valuation409ASchema.methods.startReview = async function(userId, reviewNotes = null) {
  if (this.status !== 'draft_received') {
    throw new Error('Can only start review after draft is received');
  }

  return this.transitionTo('under_review', userId, reviewNotes || 'Review started');
};

Valuation409ASchema.methods.approve = async function(userId, boardApprovalData = null) {
  if (this.status !== 'under_review') {
    throw new Error('Can only approve after review');
  }

  if (!this.fairMarketValue) {
    throw new Error('Fair market value must be set before approval');
  }

  if (!this.effectiveDate) {
    throw new Error('Effective date must be set before approval');
  }

  if (boardApprovalData) {
    this.boardApproval = {
      approved: true,
      approvedBy: userId,
      approvedAt: new Date(),
      resolution: boardApprovalData.resolution
    };
  }

  return this.transitionTo('approved', userId, 'Valuation approved');
};

Valuation409ASchema.methods.addDocument = async function(documentData, userId) {
  this.documents.push({
    ...documentData,
    uploadedAt: new Date(),
    uploadedBy: userId
  });
  this.updatedBy = userId;
  return this.save();
};

Valuation409ASchema.methods.markExpired = async function() {
  if (this.status !== 'approved') {
    throw new Error('Only approved valuations can expire');
  }

  this.status = 'expired';
  this.statusHistory.push({
    status: 'expired',
    changedAt: new Date(),
    reason: 'Valuation expired after 12 months'
  });

  return this.save();
};

// Static methods
Valuation409ASchema.statics.findByCompany = function(companyId, status = null) {
  const query = { companyId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

Valuation409ASchema.statics.findCurrentValuation = function(companyId) {
  return this.findOne({
    companyId,
    status: 'approved',
    expirationDate: { $gt: new Date() }
  }).sort({ effectiveDate: -1 });
};

Valuation409ASchema.statics.findExpiringValuations = function(daysThreshold = 60) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return this.find({
    status: 'approved',
    expirationDate: {
      $gt: new Date(),
      $lte: thresholdDate
    }
  }).populate('companyId', 'name');
};

Valuation409ASchema.statics.findExpiredValuations = async function() {
  const expiredValuations = await this.find({
    status: 'approved',
    expirationDate: { $lt: new Date() }
  });

  // Auto-update status to expired
  for (const valuation of expiredValuations) {
    await valuation.markExpired();
  }

  return expiredValuations;
};

Valuation409ASchema.statics.getCompanyValuationHistory = function(companyId) {
  return this.find({ companyId })
    .select('valuationId status fairMarketValue effectiveDate expirationDate reason createdAt')
    .sort({ effectiveDate: -1 });
};

module.exports = mongoose.model('Valuation409A', Valuation409ASchema);
