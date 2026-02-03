/**
 * WaterfallAnalysis Model
 * Issue #56: Create waterfall analysis engine
 *
 * Data model for analyzing exit scenarios and liquidation preferences.
 * Supports:
 * - Multiple exit types (acquisition, IPO, liquidation, merger, dissolution)
 * - Complex preference structures (participating, non-participating, capped)
 * - Seniority stacks for multiple preferred share classes
 * - Results tracking by stakeholder and share class
 */
const mongoose = require('mongoose');

/**
 * Schema for share class preference details in waterfall analysis
 */
const shareClassPreferenceSchema = new mongoose.Schema({
  shareClassId: {
    type: String,
    required: [true, 'Share class ID is required']
  },
  name: {
    type: String,
    required: [true, 'Share class name is required']
  },
  preferenceType: {
    type: String,
    enum: ['common', 'non_participating', 'participating', 'participating_capped'],
    default: 'common'
  },
  liquidationMultiple: {
    type: Number,
    default: 1,
    min: [0, 'Liquidation multiple cannot be negative']
  },
  participationCap: {
    type: Number,
    default: null,
    min: [0, 'Participation cap cannot be negative']
  },
  seniorityRank: {
    type: Number,
    default: 1,
    min: [1, 'Seniority rank must be at least 1']
  },
  totalShares: {
    type: Number,
    required: [true, 'Total shares is required'],
    min: [0, 'Total shares cannot be negative']
  },
  pricePerShare: {
    type: Number,
    required: [true, 'Price per share is required'],
    min: [0, 'Price per share cannot be negative']
  },
  originalInvestment: {
    type: Number,
    min: [0, 'Original investment cannot be negative']
  },
  conversionRatio: {
    type: Number,
    default: 1,
    min: [0, 'Conversion ratio cannot be negative']
  },
  isConverted: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/**
 * Schema for waterfall distribution results by stakeholder
 */
const stakeholderResultSchema = new mongoose.Schema({
  stakeholderId: {
    type: String,
    required: [true, 'Stakeholder ID is required']
  },
  stakeholderName: {
    type: String
  },
  shareClassId: {
    type: String,
    required: [true, 'Share class ID is required']
  },
  shareClassName: {
    type: String
  },
  sharesOwned: {
    type: Number,
    default: 0,
    min: [0, 'Shares owned cannot be negative']
  },
  proceedsFromPreference: {
    type: Number,
    default: 0,
    min: [0, 'Preference proceeds cannot be negative']
  },
  proceedsFromParticipation: {
    type: Number,
    default: 0,
    min: [0, 'Participation proceeds cannot be negative']
  },
  proceedsFromConversion: {
    type: Number,
    default: 0,
    min: [0, 'Conversion proceeds cannot be negative']
  },
  totalProceeds: {
    type: Number,
    default: 0,
    min: [0, 'Total proceeds cannot be negative']
  },
  percentageOfExit: {
    type: Number,
    default: 0,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  multipleOnInvestment: {
    type: Number,
    default: 0
  },
  optedForConversion: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/**
 * Schema for share class level results
 */
const shareClassResultSchema = new mongoose.Schema({
  shareClassId: {
    type: String,
    required: true
  },
  shareClassName: {
    type: String
  },
  totalShares: {
    type: Number,
    default: 0
  },
  preferenceAmount: {
    type: Number,
    default: 0
  },
  participationAmount: {
    type: Number,
    default: 0
  },
  conversionAmount: {
    type: Number,
    default: 0
  },
  totalProceeds: {
    type: Number,
    default: 0
  },
  percentageOfExit: {
    type: Number,
    default: 0
  },
  effectiveMultiple: {
    type: Number,
    default: 0
  },
  conversionElected: {
    type: Boolean,
    default: false
  }
}, { _id: false });

/**
 * Schema for waterfall summary
 */
const waterfallSummarySchema = new mongoose.Schema({
  totalDistributed: {
    type: Number,
    default: 0
  },
  totalToPreferred: {
    type: Number,
    default: 0
  },
  totalToCommon: {
    type: Number,
    default: 0
  },
  remainingProceeds: {
    type: Number,
    default: 0
  },
  effectiveExitMultiple: {
    type: Number,
    default: 0
  },
  fullyDilutedShares: {
    type: Number,
    default: 0
  },
  pricePerShareAtExit: {
    type: Number,
    default: 0
  }
}, { _id: false });

/**
 * Main WaterfallAnalysis schema
 */
const waterfallAnalysisSchema = new mongoose.Schema({
  analysisId: {
    type: String,
    unique: true,
    index: true
  },

  // Company reference
  companyId: {
    type: String,
    required: [true, 'Company ID is required'],
    index: true
  },

  // Exit scenario details
  exitValuation: {
    type: Number,
    required: [true, 'Exit valuation is required'],
    min: [0, 'Exit valuation cannot be negative']
  },
  exitType: {
    type: String,
    required: [true, 'Exit type is required'],
    enum: {
      values: ['acquisition', 'ipo', 'liquidation', 'merger', 'dissolution'],
      message: '{VALUE} is not a valid exit type'
    }
  },

  // Transaction costs and adjustments
  transactionCosts: {
    type: Number,
    default: 0,
    min: [0, 'Transaction costs cannot be negative']
  },
  escrowAmount: {
    type: Number,
    default: 0,
    min: [0, 'Escrow amount cannot be negative']
  },
  debtPayoff: {
    type: Number,
    default: 0,
    min: [0, 'Debt payoff cannot be negative']
  },
  netProceeds: {
    type: Number,
    default: 0
  },

  // Scenario identification
  scenarioName: {
    type: String,
    trim: true,
    maxlength: [200, 'Scenario name cannot exceed 200 characters']
  },
  scenarioDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Scenario description cannot exceed 2000 characters']
  },

  // Share class configuration
  shareClasses: [shareClassPreferenceSchema],

  // Results
  results: [stakeholderResultSchema],
  shareClassResults: [shareClassResultSchema],
  summary: waterfallSummarySchema,

  // Calculation metadata
  calculatedAt: {
    type: Date
  },
  calculationVersion: {
    type: String,
    default: '1.0'
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'calculated', 'finalized', 'archived'],
    default: 'draft',
    index: true
  },

  // Comparison group
  comparisonGroupId: {
    type: String,
    index: true
  },

  // Notes and metadata
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // Audit
  createdBy: {
    type: String
  },
  updatedBy: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
waterfallAnalysisSchema.index({ companyId: 1, status: 1 });
waterfallAnalysisSchema.index({ companyId: 1, exitType: 1 });
waterfallAnalysisSchema.index({ comparisonGroupId: 1 });
waterfallAnalysisSchema.index({ createdAt: -1 });

// Pre-save hook to generate analysisId and calculate netProceeds
waterfallAnalysisSchema.pre('save', function(next) {
  // Generate analysisId if not present
  if (!this.analysisId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.analysisId = `WF-${timestamp}-${random}`;
  }

  // Calculate net proceeds
  this.netProceeds = this.exitValuation -
    (this.transactionCosts || 0) -
    (this.escrowAmount || 0) -
    (this.debtPayoff || 0);

  next();
});

// Virtual for total preference stack value
waterfallAnalysisSchema.virtual('totalPreferenceStack').get(function() {
  if (!this.shareClasses || this.shareClasses.length === 0) return 0;

  return this.shareClasses
    .filter(sc => sc.preferenceType !== 'common')
    .reduce((total, sc) => {
      const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);
      return total + (investment * sc.liquidationMultiple);
    }, 0);
});

// Virtual for whether exit covers all preferences
waterfallAnalysisSchema.virtual('coversAllPreferences').get(function() {
  return this.netProceeds >= this.totalPreferenceStack;
});

// Method to sort share classes by seniority
waterfallAnalysisSchema.methods.getOrderedShareClasses = function() {
  if (!this.shareClasses) return [];

  return [...this.shareClasses].sort((a, b) => a.seniorityRank - b.seniorityRank);
};

// Method to get preferred share classes only
waterfallAnalysisSchema.methods.getPreferredClasses = function() {
  if (!this.shareClasses) return [];

  return this.shareClasses
    .filter(sc => sc.preferenceType !== 'common')
    .sort((a, b) => a.seniorityRank - b.seniorityRank);
};

// Method to get common share classes only
waterfallAnalysisSchema.methods.getCommonClasses = function() {
  if (!this.shareClasses) return [];

  return this.shareClasses.filter(sc => sc.preferenceType === 'common');
};

// Ensure virtuals are included in JSON
waterfallAnalysisSchema.set('toJSON', { virtuals: true });
waterfallAnalysisSchema.set('toObject', { virtuals: true });

const WaterfallAnalysis = mongoose.model('WaterfallAnalysis', waterfallAnalysisSchema);

module.exports = WaterfallAnalysis;
