/**
 * SAFEConversion Model
 * Feature: Issue #68 - SAFE Conversion Engine
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const conversionCalculationSchema = new mongoose.Schema({
  // Input values
  investmentAmount: { type: Number, required: true },
  valuationCap: { type: Number },
  discountRate: { type: Number },
  seriesPrice: { type: Number, required: true },
  fullyDilutedShares: { type: Number, required: true },

  // Calculated values
  capPrice: { type: Number },
  discountPrice: { type: Number },
  effectivePrice: { type: Number, required: true },
  methodUsed: {
    type: String,
    enum: ['cap', 'discount', 'mfn', 'series_price'],
    required: true
  },

  // Results
  sharesIssued: { type: Number, required: true },
  ownershipPercentage: { type: Number },

  // Comparison data
  priceComparison: {
    capPrice: { type: Number },
    discountPrice: { type: Number },
    seriesPrice: { type: Number },
    savings: { type: Number }
  }
}, { _id: false });

const SAFEConversionSchema = new mongoose.Schema({
  // Unique identifier
  conversionId: {
    type: String,
    unique: true,
    default: () => `conv_${uuidv4()}`,
    index: true
  },

  // References
  safeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SAFE',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  fundingRoundId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FundraisingRound',
    required: true
  },

  // Investor info (denormalized for reporting)
  investorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stakeholder',
    required: true
  },
  investorName: { type: String, required: true },

  // SAFE terms at conversion (snapshot)
  safeTerms: {
    safeType: {
      type: String,
      enum: ['post-money', 'pre-money', 'mfn'],
      required: true
    },
    investmentAmount: { type: Number, required: true },
    valuationCap: { type: Number },
    discountRate: { type: Number },
    proRataRights: { type: Boolean, default: false }
  },

  // Funding round terms
  roundTerms: {
    roundName: { type: String, required: true },
    roundType: { type: String },
    preMoneyValuation: { type: Number, required: true },
    pricePerShare: { type: Number, required: true },
    fullyDilutedShares: { type: Number, required: true },
    totalRoundSize: { type: Number }
  },

  // Conversion calculation
  calculation: conversionCalculationSchema,

  // Output
  shareClassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShareClass',
    required: true
  },
  shareClassName: { type: String },
  sharesIssued: { type: Number, required: true, min: 0 },
  pricePerShare: { type: Number, required: true, min: 0 },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'executed', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Timestamps
  calculatedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  executedAt: { type: Date },
  executedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancellationReason: { type: String },

  // Pro-rata tracking
  proRata: {
    eligible: { type: Boolean, default: false },
    allocationAmount: { type: Number },
    participated: { type: Boolean },
    participationAmount: { type: Number }
  },

  // Equity grant reference (created on execution)
  equityGrantId: { type: mongoose.Schema.Types.ObjectId, ref: 'EquityGrant' },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
SAFEConversionSchema.index({ companyId: 1, fundingRoundId: 1 });
SAFEConversionSchema.index({ safeId: 1 }, { unique: true });
SAFEConversionSchema.index({ investorId: 1, status: 1 });

// Instance methods
SAFEConversionSchema.methods.approve = async function(userId) {
  if (this.status !== 'pending') {
    throw new Error(`Cannot approve conversion in ${this.status} status`);
  }

  this.status = 'approved';
  this.approvedAt = new Date();
  this.approvedBy = userId;
  this.updatedBy = userId;

  return this.save();
};

SAFEConversionSchema.methods.execute = async function(userId, equityGrantId = null) {
  if (this.status !== 'approved') {
    throw new Error('Conversion must be approved before execution');
  }

  this.status = 'executed';
  this.executedAt = new Date();
  this.executedBy = userId;
  this.updatedBy = userId;

  if (equityGrantId) {
    this.equityGrantId = equityGrantId;
  }

  return this.save();
};

SAFEConversionSchema.methods.cancel = async function(userId, reason) {
  if (this.status === 'executed') {
    throw new Error('Cannot cancel an executed conversion');
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;
  this.updatedBy = userId;

  return this.save();
};

// Static methods
SAFEConversionSchema.statics.findByFundingRound = function(fundingRoundId) {
  return this.find({ fundingRoundId }).sort({ createdAt: -1 });
};

SAFEConversionSchema.statics.findByCompany = function(companyId, status = null) {
  const query = { companyId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

SAFEConversionSchema.statics.getPendingForRound = function(fundingRoundId) {
  return this.find({ fundingRoundId, status: 'pending' });
};

SAFEConversionSchema.statics.getTotalSharesForRound = async function(fundingRoundId) {
  const result = await this.aggregate([
    { $match: { fundingRoundId: new mongoose.Types.ObjectId(fundingRoundId), status: 'executed' } },
    { $group: { _id: null, totalShares: { $sum: '$sharesIssued' } } }
  ]);
  return result[0]?.totalShares || 0;
};

SAFEConversionSchema.statics.calculateConversion = function(safeTerms, roundTerms) {
  const { investmentAmount, valuationCap, discountRate, safeType } = safeTerms;
  const { pricePerShare: seriesPrice, fullyDilutedShares, preMoneyValuation } = roundTerms;

  let capPrice = null;
  let discountPrice = null;
  let effectivePrice;
  let methodUsed;

  // Calculate cap price if valuation cap exists
  if (valuationCap) {
    if (safeType === 'post-money') {
      capPrice = valuationCap / fullyDilutedShares;
    } else {
      // Pre-money SAFE
      capPrice = valuationCap / fullyDilutedShares;
    }
  }

  // Calculate discount price if discount rate exists
  if (discountRate) {
    discountPrice = seriesPrice * (1 - discountRate);
  }

  // Determine effective price (lowest of available options)
  if (safeType === 'mfn') {
    // MFN gets the best terms from any other SAFE
    effectivePrice = seriesPrice;
    methodUsed = 'mfn';
  } else if (capPrice && discountPrice) {
    if (capPrice <= discountPrice) {
      effectivePrice = capPrice;
      methodUsed = 'cap';
    } else {
      effectivePrice = discountPrice;
      methodUsed = 'discount';
    }
  } else if (capPrice) {
    effectivePrice = capPrice;
    methodUsed = 'cap';
  } else if (discountPrice) {
    effectivePrice = discountPrice;
    methodUsed = 'discount';
  } else {
    effectivePrice = seriesPrice;
    methodUsed = 'series_price';
  }

  // Calculate shares issued
  const sharesIssued = Math.floor(investmentAmount / effectivePrice);

  // Calculate ownership percentage (post-conversion)
  const postConversionShares = fullyDilutedShares + sharesIssued;
  const ownershipPercentage = (sharesIssued / postConversionShares) * 100;

  // Calculate savings compared to series price
  const savingsPerShare = seriesPrice - effectivePrice;
  const totalSavings = savingsPerShare * sharesIssued;

  return {
    investmentAmount,
    valuationCap,
    discountRate,
    seriesPrice,
    fullyDilutedShares,
    capPrice,
    discountPrice,
    effectivePrice,
    methodUsed,
    sharesIssued,
    ownershipPercentage,
    priceComparison: {
      capPrice,
      discountPrice,
      seriesPrice,
      savings: totalSavings
    }
  };
};

module.exports = mongoose.model('SAFEConversion', SAFEConversionSchema);
