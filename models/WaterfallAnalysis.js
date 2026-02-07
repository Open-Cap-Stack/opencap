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
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid exit types
const EXIT_TYPES = ['acquisition', 'ipo', 'liquidation', 'merger', 'dissolution'];

// Valid preference types
const PREFERENCE_TYPES = ['common', 'non_participating', 'participating', 'participating_capped'];

// Valid statuses
const VALID_STATUSES = ['draft', 'calculated', 'finalized', 'archived'];

// Schema definition for documentation and validation
const waterfallAnalysisSchema = {
  analysisId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true },
  exitValuation: { type: 'number', required: true },
  exitType: { type: 'string', required: true, enum: EXIT_TYPES },
  transactionCosts: { type: 'number', default: 0 },
  escrowAmount: { type: 'number', default: 0 },
  debtPayoff: { type: 'number', default: 0 },
  netProceeds: { type: 'number', default: 0 },
  scenarioName: { type: 'string', default: '' },
  scenarioDescription: { type: 'string', default: '' },
  shareClasses: { type: 'array', default: [] },
  results: { type: 'array', default: [] },
  shareClassResults: { type: 'array', default: [] },
  summary: {
    type: 'object',
    default: {
      totalDistributed: 0,
      totalToPreferred: 0,
      totalToCommon: 0,
      remainingProceeds: 0,
      effectiveExitMultiple: 0,
      fullyDilutedShares: 0,
      pricePerShareAtExit: 0
    }
  },
  calculatedAt: { type: 'date', default: null },
  calculationVersion: { type: 'string', default: '1.0' },
  status: { type: 'string', enum: VALID_STATUSES, default: 'draft' },
  comparisonGroupId: { type: 'string', default: null },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('waterfall_analyses', waterfallAnalysisSchema);

// Extended WaterfallAnalysis model with business logic
const WaterfallAnalysis = {
  ...baseModel,
  tableName: 'waterfall_analyses',
  schema: waterfallAnalysisSchema,

  // Export constants
  EXIT_TYPES,
  PREFERENCE_TYPES,
  VALID_STATUSES,

  /**
   * Create a new waterfall analysis with defaults
   * @param {Object} data - Analysis data
   * @returns {Object} Created analysis
   */
  async create(data) {
    if (!data.analysisId) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      data.analysisId = `WF-${timestamp}-${random}`;
    }

    // Validate exit valuation
    if (data.exitValuation < 0) {
      throw new Error('Exit valuation cannot be negative');
    }

    // Validate exit type
    if (!EXIT_TYPES.includes(data.exitType)) {
      throw new Error(`exitType must be one of: ${EXIT_TYPES.join(', ')}`);
    }

    // Calculate net proceeds
    data.netProceeds = data.exitValuation -
      (data.transactionCosts || 0) -
      (data.escrowAmount || 0) -
      (data.debtPayoff || 0);

    if (!data.status) {
      data.status = 'draft';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find analysis by analysisId
   * @param {string} analysisId - Analysis ID
   * @returns {Object|null} Analysis or null
   */
  async findByAnalysisId(analysisId) {
    return baseModel.findOne.call(baseModel, { analysisId });
  },

  /**
   * Find analyses by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Analyses for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.exitType) {
      query.exitType = options.exitType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find analyses by comparison group
   * @param {string} comparisonGroupId - Comparison group ID
   * @returns {Array} Analyses in group
   */
  async findByComparisonGroup(comparisonGroupId) {
    return baseModel.find.call(baseModel, { comparisonGroupId });
  },

  /**
   * Get total preference stack value
   * @param {Object} analysis - Analysis object
   * @returns {number} Total preference stack
   */
  getTotalPreferenceStack(analysis) {
    if (!analysis.shareClasses || analysis.shareClasses.length === 0) return 0;

    return analysis.shareClasses
      .filter(sc => sc.preferenceType !== 'common')
      .reduce((total, sc) => {
        const investment = sc.originalInvestment || (sc.totalShares * sc.pricePerShare);
        return total + (investment * sc.liquidationMultiple);
      }, 0);
  },

  /**
   * Check if exit covers all preferences
   * @param {Object} analysis - Analysis object
   * @returns {boolean} True if covers all preferences
   */
  coversAllPreferences(analysis) {
    return analysis.netProceeds >= this.getTotalPreferenceStack(analysis);
  },

  /**
   * Get ordered share classes by seniority
   * @param {Object} analysis - Analysis object
   * @returns {Array} Ordered share classes
   */
  getOrderedShareClasses(analysis) {
    if (!analysis.shareClasses) return [];
    return [...analysis.shareClasses].sort((a, b) => a.seniorityRank - b.seniorityRank);
  },

  /**
   * Get preferred share classes only
   * @param {Object} analysis - Analysis object
   * @returns {Array} Preferred classes
   */
  getPreferredClasses(analysis) {
    if (!analysis.shareClasses) return [];
    return analysis.shareClasses
      .filter(sc => sc.preferenceType !== 'common')
      .sort((a, b) => a.seniorityRank - b.seniorityRank);
  },

  /**
   * Get common share classes only
   * @param {Object} analysis - Analysis object
   * @returns {Array} Common classes
   */
  getCommonClasses(analysis) {
    if (!analysis.shareClasses) return [];
    return analysis.shareClasses.filter(sc => sc.preferenceType === 'common');
  },

  /**
   * Mark as calculated
   * @param {string} analysisId - Analysis ID
   * @param {Object} results - Calculation results
   * @returns {Object} Updated analysis
   */
  async markCalculated(analysisId, results = {}) {
    return baseModel.updateOne.call(baseModel,
      { analysisId },
      {
        $set: {
          status: 'calculated',
          calculatedAt: new Date().toISOString(),
          results: results.results || [],
          shareClassResults: results.shareClassResults || [],
          summary: results.summary || {}
        }
      }
    );
  },

  /**
   * Finalize analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Object} Updated analysis
   */
  async finalize(analysisId) {
    return baseModel.updateOne.call(baseModel,
      { analysisId },
      { $set: { status: 'finalized' } }
    );
  },

  /**
   * Archive analysis
   * @param {string} analysisId - Analysis ID
   * @returns {Object} Updated analysis
   */
  async archive(analysisId) {
    return baseModel.updateOne.call(baseModel,
      { analysisId },
      { $set: { status: 'archived' } }
    );
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  updateMany: baseModel.updateMany.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  deleteMany: baseModel.deleteMany.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel),
  distinct: baseModel.distinct.bind(baseModel),
  aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = WaterfallAnalysis;
