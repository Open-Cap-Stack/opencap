/**
 * Rule 701 Disclosure Model
 * Feature: Issue #74 - Rule 701 Compliance Tracking
 * SEC Rule 701: Exemption for securities issued under compensatory benefit plans
 */
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const grantSummarySchema = new mongoose.Schema({
  grantId: { type: mongoose.Schema.Types.ObjectId, ref: 'EquityGrant' },
  grantDate: { type: Date },
  grantType: { type: String },
  recipientName: { type: String },
  recipientType: { type: String, enum: ['employee', 'director', 'consultant'] },
  sharesGranted: { type: Number },
  exercisePrice: { type: Number },
  fairMarketValue: { type: Number },
  aggregateValue: { type: Number }
}, { _id: false });

const Rule701DisclosureSchema = new mongoose.Schema({
  // Unique identifier
  disclosureId: {
    type: String,
    unique: true,
    default: () => `r701_${uuidv4()}`,
    index: true
  },

  // Company reference
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },

  // Period
  periodType: {
    type: String,
    enum: ['annual', 'quarterly', 'rolling_12_month'],
    default: 'rolling_12_month'
  },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },

  // Company financial data for threshold calculation
  companyFinancials: {
    totalAssets: { type: Number, required: true },
    annualRevenue: { type: Number },
    outstandingSecurities: {
      commonShares: { type: Number },
      preferredShares: { type: Number },
      optionsOutstanding: { type: Number },
      warrantsOutstanding: { type: Number }
    },
    // For threshold calculation
    fifteenPercentOfAssets: { type: Number },
    fifteenPercentOfSecurities: { type: Number }
  },

  // Rule 701 thresholds
  thresholds: {
    // Sales during any 12-month period
    basic: {
      type: Number,
      default: 1000000 // $1 million basic threshold
    },
    // 15% of total assets threshold
    assetBased: { type: Number },
    // 15% of outstanding securities threshold
    securityBased: { type: Number },
    // Applicable threshold (highest of the three)
    applicable: { type: Number }
  },

  // Aggregate sales calculation
  aggregateSales: {
    totalSales: { type: Number, required: true },
    // Breakdown by type
    stockOptions: { type: Number, default: 0 },
    restrictedStock: { type: Number, default: 0 },
    rsus: { type: Number, default: 0 },
    espp: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },

  // Compliance status
  compliance: {
    isCompliant: { type: Boolean, required: true },
    thresholdUtilization: { type: Number }, // percentage
    remainingCapacity: { type: Number },
    disclosureRequired: { type: Boolean, default: false },
    disclosureLevel: {
      type: String,
      enum: ['none', 'basic', 'enhanced'],
      default: 'none'
    }
  },

  // Disclosure requirements (when > $5M or > $10M)
  disclosureRequirements: {
    riskFactorsRequired: { type: Boolean, default: false },
    financialStatementsRequired: { type: Boolean, default: false },
    summaryOfPlanRequired: { type: Boolean, default: false },
    additionalDisclosures: [{ type: String }]
  },

  // Grant details for the period
  grantsInPeriod: [grantSummarySchema],
  grantsSummary: {
    totalGrants: { type: Number, default: 0 },
    totalRecipients: { type: Number, default: 0 },
    byRecipientType: {
      employees: { type: Number, default: 0 },
      directors: { type: Number, default: 0 },
      consultants: { type: Number, default: 0 }
    }
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'filed', 'archived'],
    default: 'draft',
    index: true
  },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
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
Rule701DisclosureSchema.index({ companyId: 1, periodStart: 1, periodEnd: 1 });
Rule701DisclosureSchema.index({ status: 1 });

// Pre-save: calculate thresholds and compliance
Rule701DisclosureSchema.pre('save', function(next) {
  // Calculate 15% thresholds
  this.thresholds.assetBased = this.companyFinancials.totalAssets * 0.15;

  if (this.companyFinancials.outstandingSecurities) {
    const totalSecurities =
      (this.companyFinancials.outstandingSecurities.commonShares || 0) +
      (this.companyFinancials.outstandingSecurities.preferredShares || 0);
    // This would need FMV per share to calculate dollar value
    this.thresholds.securityBased = totalSecurities * 0.15;
  }

  // Applicable threshold is the highest
  this.thresholds.applicable = Math.max(
    this.thresholds.basic,
    this.thresholds.assetBased || 0,
    this.thresholds.securityBased || 0
  );

  // Calculate compliance
  this.compliance.isCompliant = this.aggregateSales.totalSales <= this.thresholds.applicable;
  this.compliance.thresholdUtilization =
    (this.aggregateSales.totalSales / this.thresholds.applicable) * 100;
  this.compliance.remainingCapacity =
    this.thresholds.applicable - this.aggregateSales.totalSales;

  // Determine disclosure requirements
  if (this.aggregateSales.totalSales > 10000000) {
    this.compliance.disclosureRequired = true;
    this.compliance.disclosureLevel = 'enhanced';
    this.disclosureRequirements = {
      riskFactorsRequired: true,
      financialStatementsRequired: true,
      summaryOfPlanRequired: true,
      additionalDisclosures: [
        'Risk factors relating to the company and its business',
        'Financial statements (audited if available)',
        'Summary of material terms of the plan',
        'Any additional information required to make disclosures not misleading'
      ]
    };
  } else if (this.aggregateSales.totalSales > 5000000) {
    this.compliance.disclosureRequired = true;
    this.compliance.disclosureLevel = 'basic';
    this.disclosureRequirements = {
      riskFactorsRequired: true,
      financialStatementsRequired: false,
      summaryOfPlanRequired: true,
      additionalDisclosures: [
        'Summary of material plan terms',
        'Risk factors disclosure'
      ]
    };
  } else {
    this.compliance.disclosureRequired = false;
    this.compliance.disclosureLevel = 'none';
    this.disclosureRequirements = {
      riskFactorsRequired: false,
      financialStatementsRequired: false,
      summaryOfPlanRequired: false,
      additionalDisclosures: []
    };
  }

  next();
});

// Virtuals
Rule701DisclosureSchema.virtual('isOverThreshold').get(function() {
  return this.aggregateSales.totalSales > this.thresholds.applicable;
});

Rule701DisclosureSchema.virtual('utilizationStatus').get(function() {
  const util = this.compliance.thresholdUtilization;
  if (util >= 100) return 'exceeded';
  if (util >= 90) return 'critical';
  if (util >= 75) return 'warning';
  return 'normal';
});

// Instance methods
Rule701DisclosureSchema.methods.approve = async function(userId) {
  if (this.status !== 'pending_review') {
    throw new Error('Disclosure must be in pending_review status');
  }

  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.updatedBy = userId;

  return this.save();
};

Rule701DisclosureSchema.methods.addGrant = async function(grantData) {
  this.grantsInPeriod.push(grantData);

  // Update aggregates
  this.aggregateSales.totalSales += grantData.aggregateValue;
  this.grantsSummary.totalGrants++;

  // Update by type
  const typeMap = {
    iso: 'stockOptions',
    nso: 'stockOptions',
    rsu: 'rsus',
    rsa: 'restrictedStock'
  };
  const category = typeMap[grantData.grantType] || 'other';
  this.aggregateSales[category] += grantData.aggregateValue;

  // Update by recipient type
  if (grantData.recipientType) {
    const recipientKey = `${grantData.recipientType}s`;
    this.grantsSummary.byRecipientType[recipientKey] =
      (this.grantsSummary.byRecipientType[recipientKey] || 0) + 1;
  }

  return this.save();
};

// Static methods
Rule701DisclosureSchema.statics.findByCompany = function(companyId) {
  return this.find({ companyId }).sort({ periodEnd: -1 });
};

Rule701DisclosureSchema.statics.getCurrentPeriod = function(companyId) {
  const now = new Date();
  return this.findOne({
    companyId,
    periodStart: { $lte: now },
    periodEnd: { $gte: now }
  });
};

Rule701DisclosureSchema.statics.getComplianceHistory = async function(companyId, years = 3) {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - years);

  return this.find({
    companyId,
    periodStart: { $gte: startDate }
  }).sort({ periodStart: 1 });
};

Rule701DisclosureSchema.statics.createRolling12MonthDisclosure = async function(companyId, companyFinancials, userId) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  const disclosure = new this({
    companyId,
    periodType: 'rolling_12_month',
    periodStart: startDate,
    periodEnd: endDate,
    companyFinancials,
    aggregateSales: {
      totalSales: 0,
      stockOptions: 0,
      restrictedStock: 0,
      rsus: 0,
      espp: 0,
      other: 0
    },
    createdBy: userId
  });

  return disclosure.save();
};

module.exports = mongoose.model('Rule701Disclosure', Rule701DisclosureSchema);
