/**
 * TaxWithholding Model
 * Feature: Issue #72 - Tax Withholding Calculator
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const witholdingBreakdownSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['federal', 'state', 'local', 'social_security', 'medicare', 'amt'],
    required: true
  },
  jurisdiction: { type: String }, // State/local code
  rate: { type: Number, required: true },
  baseAmount: { type: Number, required: true },
  withholdingAmount: { type: Number, required: true },
  notes: { type: String }
}, { _id: false });

const TaxWithholdingSchema = new mongoose.Schema({
  // Unique identifier
  withholdingId: {
    type: String,
    unique: true,
    default: () => `twh_${uuidv4()}`,
    index: true
  },

  // References
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stakeholder',
    required: true,
    index: true
  },

  // Event type
  eventType: {
    type: String,
    enum: ['iso_exercise', 'nso_exercise', 'rsu_vest', 'stock_sale', 'bonus_payment'],
    required: true
  },

  // Source reference
  sourceType: {
    type: String,
    enum: ['OptionExercise', 'RSUVest', 'StockSale', 'BonusPayment']
  },
  sourceId: { type: mongoose.Schema.Types.ObjectId },

  // Tax year and period
  taxYear: {
    type: Number,
    required: true,
    index: true
  },
  eventDate: { type: Date, required: true },

  // Income details
  income: {
    grossAmount: { type: Number, required: true },
    ordinaryIncome: { type: Number, default: 0 },
    capitalGains: {
      shortTerm: { type: Number, default: 0 },
      longTerm: { type: Number, default: 0 }
    },
    amtIncome: { type: Number, default: 0 }
  },

  // Employee tax profile
  employeeProfile: {
    filingStatus: {
      type: String,
      enum: ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'],
      required: true
    },
    federalAllowances: { type: Number, default: 0 },
    stateCode: { type: String, required: true },
    stateAllowances: { type: Number, default: 0 },
    additionalWithholding: { type: Number, default: 0 },
    isSubjectToAMT: { type: Boolean, default: false }
  },

  // Withholding breakdown
  withholdings: [witholdingBreakdownSchema],

  // Summary
  summary: {
    totalWithholding: { type: Number, required: true },
    federalWithholding: { type: Number, default: 0 },
    stateWithholding: { type: Number, default: 0 },
    localWithholding: { type: Number, default: 0 },
    socialSecurityWithholding: { type: Number, default: 0 },
    medicareWithholding: { type: Number, default: 0 },
    additionalMedicare: { type: Number, default: 0 },
    netAmount: { type: Number }
  },

  // Withholding method
  method: {
    type: String,
    enum: ['flat_rate', 'supplemental', 'aggregate', 'percentage'],
    default: 'supplemental'
  },

  // Status
  status: {
    type: String,
    enum: ['calculated', 'approved', 'processed', 'remitted', 'corrected'],
    default: 'calculated',
    index: true
  },

  // Payment tracking
  payment: {
    processedDate: { type: Date },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remittedDate: { type: Date },
    remittanceConfirmation: { type: String }
  },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },

  notes: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
TaxWithholdingSchema.index({ companyId: 1, taxYear: 1 });
TaxWithholdingSchema.index({ employeeId: 1, taxYear: 1 });
TaxWithholdingSchema.index({ eventDate: 1 });
TaxWithholdingSchema.index({ sourceType: 1, sourceId: 1 });

// Pre-save: calculate net amount
TaxWithholdingSchema.pre('save', function(next) {
  this.summary.netAmount = this.income.grossAmount - this.summary.totalWithholding;
  next();
});

// Instance methods
TaxWithholdingSchema.methods.approve = async function(userId) {
  if (this.status !== 'calculated') {
    throw new Error('Can only approve calculated withholdings');
  }

  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.updatedBy = userId;

  return this.save();
};

TaxWithholdingSchema.methods.markProcessed = async function(userId) {
  if (this.status !== 'approved') {
    throw new Error('Must be approved before processing');
  }

  this.status = 'processed';
  this.payment.processedDate = new Date();
  this.payment.processedBy = userId;
  this.updatedBy = userId;

  return this.save();
};

TaxWithholdingSchema.methods.markRemitted = async function(userId, confirmation) {
  if (this.status !== 'processed') {
    throw new Error('Must be processed before remittance');
  }

  this.status = 'remitted';
  this.payment.remittedDate = new Date();
  this.payment.remittanceConfirmation = confirmation;
  this.updatedBy = userId;

  return this.save();
};

// Static methods
TaxWithholdingSchema.statics.findByEmployee = function(employeeId, taxYear = null) {
  const query = { employeeId };
  if (taxYear) query.taxYear = taxYear;
  return this.find(query).sort({ eventDate: -1 });
};

TaxWithholdingSchema.statics.findByCompany = function(companyId, taxYear = null) {
  const query = { companyId };
  if (taxYear) query.taxYear = taxYear;
  return this.find(query).sort({ eventDate: -1 });
};

TaxWithholdingSchema.statics.getEmployeeYearSummary = async function(employeeId, taxYear) {
  const result = await this.aggregate([
    { $match: { employeeId: new mongoose.Types.ObjectId(employeeId), taxYear } },
    {
      $group: {
        _id: null,
        totalGrossIncome: { $sum: '$income.grossAmount' },
        totalWithholding: { $sum: '$summary.totalWithholding' },
        totalFederal: { $sum: '$summary.federalWithholding' },
        totalState: { $sum: '$summary.stateWithholding' },
        totalSocialSecurity: { $sum: '$summary.socialSecurityWithholding' },
        totalMedicare: { $sum: '$summary.medicareWithholding' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);

  return result[0] || {
    totalGrossIncome: 0,
    totalWithholding: 0,
    totalFederal: 0,
    totalState: 0,
    totalSocialSecurity: 0,
    totalMedicare: 0,
    transactionCount: 0
  };
};

TaxWithholdingSchema.statics.getCompanyQuarterSummary = async function(companyId, taxYear, quarter) {
  const quarterMonths = {
    1: [1, 2, 3],
    2: [4, 5, 6],
    3: [7, 8, 9],
    4: [10, 11, 12]
  };

  const months = quarterMonths[quarter];
  const startDate = new Date(taxYear, months[0] - 1, 1);
  const endDate = new Date(taxYear, months[2], 0);

  return this.aggregate([
    {
      $match: {
        companyId: new mongoose.Types.ObjectId(companyId),
        eventDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$eventType',
        totalWithholding: { $sum: '$summary.totalWithholding' },
        count: { $sum: 1 }
      }
    }
  ]);
};

module.exports = mongoose.model('TaxWithholding', TaxWithholdingSchema);
