/**
 * Balance Sheet Model
 * 
 * [Feature] OCDI-202: Create financial reporting database models
 * 
 * Comprehensive balance sheet model for tracking assets, liabilities, and equity
 * with proper validation and calculation methods for financial reporting.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Current Assets Schema
 */
const currentAssetsSchema = new Schema({
  cash: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Cash and cash equivalents'
  },
  accountsReceivable: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Amounts owed by customers'
  },
  inventory: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Inventory at cost'
  },
  prepaidExpenses: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Prepaid expenses and deposits'
  },
  shortTermInvestments: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Short-term marketable securities'
  },
  other: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Other current assets'
  }
}, { _id: false });

/**
 * Non-Current Assets Schema
 */
const nonCurrentAssetsSchema = new Schema({
  propertyPlantEquipment: {
    gross: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Property, plant, and equipment at cost'
    },
    accumulatedDepreciation: {
      type: Number,
      default: 0,
      min: 0,
      description: 'Accumulated depreciation'
    },
    net: {
      type: Number,
      default: 0,
      description: 'Net PP&E (gross - accumulated depreciation)'
    }
  },
  intangibleAssets: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Patents, trademarks, goodwill, etc.'
  },
  longTermInvestments: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Long-term investments'
  },
  deferredTaxAssets: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Deferred tax assets'
  },
  other: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Other non-current assets'
  }
}, { _id: false });

/**
 * Current Liabilities Schema
 */
const currentLiabilitiesSchema = new Schema({
  accountsPayable: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Amounts owed to suppliers'
  },
  shortTermDebt: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Short-term borrowings and current portion of long-term debt'
  },
  accruedExpenses: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Accrued salaries, interest, taxes, etc.'
  },
  deferredRevenue: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Unearned revenue'
  },
  currentTaxLiabilities: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Current tax liabilities'
  },
  other: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Other current liabilities'
  }
}, { _id: false });

/**
 * Non-Current Liabilities Schema
 */
const nonCurrentLiabilitiesSchema = new Schema({
  longTermDebt: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Long-term debt and borrowings'
  },
  deferredTaxLiabilities: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Deferred tax liabilities'
  },
  pensionObligations: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Pension and post-employment benefit obligations'
  },
  other: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Other non-current liabilities'
  }
}, { _id: false });

/**
 * Equity Schema
 */
const equitySchema = new Schema({
  shareCapital: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Issued share capital'
  },
  retainedEarnings: {
    type: Number,
    default: 0,
    description: 'Accumulated retained earnings'
  },
  additionalPaidInCapital: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Additional paid-in capital'
  },
  treasuryStock: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Treasury stock at cost'
  },
  accumulatedOtherComprehensiveIncome: {
    type: Number,
    default: 0,
    description: 'Accumulated other comprehensive income/loss'
  },
  nonControllingInterest: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Non-controlling interest in subsidiaries'
  }
}, { _id: false });

/**
 * Main Balance Sheet Schema
 */
const balanceSheetSchema = new Schema({
  companyId: {
    type: Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  
  reportingDate: {
    type: Date,
    required: true,
    index: true
  },
  
  reportingPeriod: {
    type: String,
    required: true,
    trim: true,
    description: 'e.g., 2024-Q1, 2024-12-31'
  },
  
  // Assets
  currentAssets: {
    type: currentAssetsSchema,
    required: true
  },
  
  nonCurrentAssets: {
    type: nonCurrentAssetsSchema,
    required: true
  },
  
  totalCurrentAssets: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalNonCurrentAssets: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalAssets: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Liabilities
  currentLiabilities: {
    type: currentLiabilitiesSchema,
    required: true
  },
  
  nonCurrentLiabilities: {
    type: nonCurrentLiabilitiesSchema,
    required: true
  },
  
  totalCurrentLiabilities: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalNonCurrentLiabilities: {
    type: Number,
    default: 0,
    min: 0
  },
  
  totalLiabilities: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Equity
  equity: {
    type: equitySchema,
    required: true
  },
  
  totalEquity: {
    type: Number,
    default: 0
  },
  
  totalLiabilitiesAndEquity: {
    type: Number,
    default: 0
  },
  
  // Metadata
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
    description: 'Reporting currency'
  },
  
  preparedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  status: {
    type: String,
    enum: ['draft', 'under_review', 'approved', 'published'],
    default: 'draft'
  },
  
  notes: {
    type: String,
    trim: true,
    description: 'Additional notes or explanations'
  },
  
  isConsolidated: {
    type: Boolean,
    default: false,
    description: 'Whether this is a consolidated balance sheet'
  },
  
  auditStatus: {
    type: String,
    enum: ['unaudited', 'reviewed', 'audited'],
    default: 'unaudited'
  }
  
}, {
  timestamps: true,
  collection: 'balancesheets'
});

// Indexes for efficient querying
balanceSheetSchema.index({ companyId: 1, reportingDate: -1 });
balanceSheetSchema.index({ reportingPeriod: 1 });
balanceSheetSchema.index({ status: 1 });
balanceSheetSchema.index({ companyId: 1, reportingPeriod: 1 }, { unique: true });

/**
 * Calculate all totals and validate balance sheet equation
 */
balanceSheetSchema.methods.calculateTotals = function() {
  // Calculate current assets total
  this.totalCurrentAssets = Object.values(this.currentAssets.toObject())
    .reduce((sum, val) => sum + (Number(val) || 0), 0);
  
  // Calculate non-current assets total (handle PP&E net calculation)
  const ppNet = (this.nonCurrentAssets.propertyPlantEquipment.gross || 0) - 
                (this.nonCurrentAssets.propertyPlantEquipment.accumulatedDepreciation || 0);
  this.nonCurrentAssets.propertyPlantEquipment.net = ppNet;
  
  this.totalNonCurrentAssets = ppNet + 
    (this.nonCurrentAssets.intangibleAssets || 0) +
    (this.nonCurrentAssets.longTermInvestments || 0) +
    (this.nonCurrentAssets.deferredTaxAssets || 0) +
    (this.nonCurrentAssets.other || 0);
  
  // Total assets
  this.totalAssets = this.totalCurrentAssets + this.totalNonCurrentAssets;
  
  // Calculate current liabilities total
  this.totalCurrentLiabilities = Object.values(this.currentLiabilities.toObject())
    .reduce((sum, val) => sum + (Number(val) || 0), 0);
  
  // Calculate non-current liabilities total
  this.totalNonCurrentLiabilities = Object.values(this.nonCurrentLiabilities.toObject())
    .reduce((sum, val) => sum + (Number(val) || 0), 0);
  
  // Total liabilities
  this.totalLiabilities = this.totalCurrentLiabilities + this.totalNonCurrentLiabilities;
  
  // Calculate total equity (subtract treasury stock as it reduces equity)
  this.totalEquity = (this.equity.shareCapital || 0) +
                     (this.equity.retainedEarnings || 0) +
                     (this.equity.additionalPaidInCapital || 0) +
                     (this.equity.accumulatedOtherComprehensiveIncome || 0) +
                     (this.equity.nonControllingInterest || 0) -
                     (this.equity.treasuryStock || 0);
  
  // Total liabilities and equity
  this.totalLiabilitiesAndEquity = this.totalLiabilities + this.totalEquity;
  
  return this;
};

/**
 * Validate balance sheet equation: Assets = Liabilities + Equity
 */
balanceSheetSchema.methods.validateBalance = function() {
  const tolerance = 0.01; // Allow for small rounding differences
  const difference = Math.abs(this.totalAssets - this.totalLiabilitiesAndEquity);
  return difference <= tolerance;
};

/**
 * Calculate key financial ratios
 */
balanceSheetSchema.methods.calculateRatios = function() {
  const ratios = {};
  
  // Liquidity ratios
  if (this.totalCurrentLiabilities > 0) {
    ratios.currentRatio = this.totalCurrentAssets / this.totalCurrentLiabilities;
    
    // Quick ratio (excluding inventory)
    const quickAssets = this.totalCurrentAssets - (this.currentAssets.inventory || 0);
    ratios.quickRatio = quickAssets / this.totalCurrentLiabilities;
  }
  
  // Leverage ratios
  if (this.totalAssets > 0) {
    ratios.debtToAssetsRatio = this.totalLiabilities / this.totalAssets;
    
    if (this.totalEquity > 0) {
      ratios.debtToEquityRatio = this.totalLiabilities / this.totalEquity;
    }
  }
  
  if (this.totalEquity > 0) {
    ratios.equityMultiplier = this.totalAssets / this.totalEquity;
  }
  
  return ratios;
};

/**
 * Get working capital
 */
balanceSheetSchema.methods.getWorkingCapital = function() {
  return this.totalCurrentAssets - this.totalCurrentLiabilities;
};

/**
 * Pre-validate hook
 */
balanceSheetSchema.pre('validate', function(next) {
  // Calculate totals before validation
  this.calculateTotals();
  
  // Validate balance sheet equation
  if (!this.validateBalance()) {
    return next(new Error('Balance sheet does not balance: Assets must equal Liabilities + Equity'));
  }
  
  next();
});

/**
 * Pre-save hook
 */
balanceSheetSchema.pre('save', function(next) {
  // Ensure totals are calculated
  this.calculateTotals();
  next();
});

/**
 * Static method to get comparative balance sheets
 */
balanceSheetSchema.statics.getComparative = async function(companyId, periods) {
  return this.find({
    companyId,
    reportingPeriod: { $in: periods }
  }).sort({ reportingDate: 1 });
};

/**
 * Static method to get latest balance sheet for a company
 */
balanceSheetSchema.statics.getLatest = async function(companyId) {
  return this.findOne({ companyId }).sort({ reportingDate: -1 });
};

module.exports = mongoose.model('BalanceSheet', balanceSheetSchema);