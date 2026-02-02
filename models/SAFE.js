/**
 * SAFE Model (Simple Agreement for Future Equity)
 * Feature: Issue #64 - Create SAFE Data Model and Core Workflow
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const signatureSchema = new mongoose.Schema({
  signerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signerName: { type: String, required: true },
  signerEmail: { type: String, required: true },
  signerTitle: { type: String },
  signedAt: { type: Date },
  signatureData: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const SAFESchema = new mongoose.Schema({
  // Unique identifier
  safeId: {
    type: String,
    unique: true,
    default: () => `safe_${uuidv4()}`,
    index: true
  },

  // Company reference
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Investor information
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stakeholder',
    required: true,
    index: true
  },
  investorName: { type: String, required: true, trim: true },
  investorEmail: { type: String, trim: true, lowercase: true },
  investorType: {
    type: String,
    enum: ['individual', 'entity', 'fund'],
    default: 'individual'
  },

  // Investment terms
  investmentAmount: {
    type: Number,
    required: true,
    min: [0, 'Investment amount must be positive']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD']
  },
  safeType: {
    type: String,
    enum: ['post-money', 'pre-money', 'mfn'],
    default: 'post-money',
    required: true
  },
  valuationCap: {
    type: Number,
    min: [0, 'Valuation cap must be positive']
  },
  discountRate: {
    type: Number,
    min: [0, 'Discount rate must be between 0 and 1'],
    max: [1, 'Discount rate must be between 0 and 1']
  },
  proRataRights: { type: Boolean, default: false },

  // Status workflow
  status: {
    type: String,
    enum: ['draft', 'sent', 'fully_signed', 'funded', 'converted', 'cancelled', 'expired'],
    default: 'draft',
    required: true,
    index: true
  },

  // Timeline dates
  sentAt: { type: Date },
  signedAt: { type: Date },
  fundedAt: { type: Date },
  conversionAt: { type: Date },
  cancelledAt: { type: Date },
  expiresAt: { type: Date },

  // Conversion details
  convertedToRound: { type: mongoose.Schema.Types.ObjectId, ref: 'FundraisingRound' },
  convertedToShareClass: { type: mongoose.Schema.Types.ObjectId, ref: 'ShareClass' },
  conversionShares: { type: Number, min: 0 },
  conversionPrice: { type: Number, min: 0 },
  conversionDetails: {
    methodUsed: { type: String, enum: ['cap', 'discount', 'mfn'] },
    effectivePrice: { type: Number },
    calculationDetails: { type: mongoose.Schema.Types.Mixed }
  },

  // Signatures
  investorSignature: signatureSchema,
  companySignature: signatureSchema,

  // Document references
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  signedDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },

  // Audit trail
  statusHistory: [statusHistorySchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Additional data
  notes: { type: String },
  tags: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SAFESchema.index({ companyId: 1, status: 1 });
SAFESchema.index({ investorId: 1, status: 1 });
SAFESchema.index({ status: 1, createdAt: -1 });
SAFESchema.index({ companyId: 1, createdAt: -1 });

// Virtuals
SAFESchema.virtual('isFullySigned').get(function() {
  return !!(this.investorSignature?.signedAt && this.companySignature?.signedAt);
});

SAFESchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt && this.status !== 'converted';
});

// Valid status transitions
const validTransitions = {
  draft: ['sent', 'cancelled'],
  sent: ['fully_signed', 'cancelled', 'expired'],
  fully_signed: ['funded', 'cancelled'],
  funded: ['converted', 'cancelled'],
  converted: [],
  cancelled: [],
  expired: []
};

// Instance methods
SAFESchema.methods.canTransitionTo = function(newStatus) {
  return validTransitions[this.status]?.includes(newStatus) || false;
};

SAFESchema.methods.transitionTo = async function(newStatus, userId, reason = null, metadata = {}) {
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
    sent: 'sentAt',
    fully_signed: 'signedAt',
    funded: 'fundedAt',
    converted: 'conversionAt',
    cancelled: 'cancelledAt'
  };

  if (timestampMap[newStatus]) {
    this[timestampMap[newStatus]] = new Date();
  }

  return this.save();
};

SAFESchema.methods.addInvestorSignature = async function(signatureData, userId) {
  this.investorSignature = {
    ...signatureData,
    signedAt: new Date()
  };
  this.updatedBy = userId;

  if (this.companySignature?.signedAt) {
    await this.transitionTo('fully_signed', userId, 'Both parties signed');
  }

  return this.save();
};

SAFESchema.methods.addCompanySignature = async function(signatureData, userId) {
  this.companySignature = {
    ...signatureData,
    signedAt: new Date()
  };
  this.updatedBy = userId;

  if (this.investorSignature?.signedAt) {
    await this.transitionTo('fully_signed', userId, 'Both parties signed');
  }

  return this.save();
};

SAFESchema.methods.recordConversion = async function(conversionData, userId) {
  if (this.status !== 'funded') {
    throw new Error('SAFE must be funded before conversion');
  }

  this.convertedToRound = conversionData.fundingRoundId;
  this.convertedToShareClass = conversionData.shareClassId;
  this.conversionShares = conversionData.shares;
  this.conversionPrice = conversionData.pricePerShare;
  this.conversionDetails = {
    methodUsed: conversionData.methodUsed,
    effectivePrice: conversionData.effectivePrice,
    calculationDetails: conversionData.calculationDetails
  };

  return this.transitionTo('converted', userId, 'Converted to equity');
};

// Static methods
SAFESchema.statics.findByCompany = function(companyId, status = null) {
  const query = { companyId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

SAFESchema.statics.findByInvestor = function(investorId, status = null) {
  const query = { investorId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

SAFESchema.statics.getTotalFundedAmount = async function(companyId) {
  const result = await this.aggregate([
    { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: 'funded' } },
    { $group: { _id: null, total: { $sum: '$investmentAmount' } } }
  ]);
  return result[0]?.total || 0;
};

SAFESchema.statics.getPendingConversion = function(companyId) {
  return this.find({ companyId, status: 'funded' }).sort({ fundedAt: 1 });
};

module.exports = mongoose.model('SAFE', SAFESchema);
