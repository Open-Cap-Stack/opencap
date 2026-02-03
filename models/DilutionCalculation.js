/**
 * DilutionCalculation Model
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Data model for storing dilution calculation results with ZeroDB storage.
 * Stores detailed breakdown by stakeholder and share class.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const dilutionCalculationSchema = {
  calculationId: { type: 'string', required: true, unique: true },
  scenarioId: { type: 'string', required: true, index: true },
  companyId: { type: 'string', required: true, index: true },
  calculationType: { type: 'string', required: true, enum: ['funding_round', 'safe_conversion', 'option_pool', 'multi_round', 'comparison'] },

  // Input data used for calculation
  inputs: { type: 'object', required: true },

  // Calculation results
  results: { type: 'object', required: true },

  // Metadata
  metadata: { type: 'object' },
  status: { type: 'string', default: 'completed', enum: ['pending', 'completed', 'failed'] },

  // Timestamps
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
  createdBy: { type: 'string' }
};

// Create the base model
const baseModel = createModel('dilution_calculations', dilutionCalculationSchema);

// Extended DilutionCalculation model with business logic
const DilutionCalculation = {
  ...baseModel,
  tableName: 'dilution_calculations',
  schema: dilutionCalculationSchema,

  /**
   * Create a new calculation with validation
   * @param {Object} data - Calculation data
   * @returns {Object} Created calculation
   */
  async create(data) {
    // Validate required fields
    if (!data.scenarioId) {
      throw new Error('Scenario ID is required');
    }
    if (!data.companyId) {
      throw new Error('Company ID is required');
    }
    if (!data.calculationType) {
      throw new Error('Calculation type is required');
    }

    // Validate type is valid enum
    const validTypes = ['funding_round', 'safe_conversion', 'option_pool', 'multi_round', 'comparison'];
    if (!validTypes.includes(data.calculationType)) {
      throw new Error(`Invalid calculation type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Ensure inputs and results exist
    if (!data.inputs) {
      data.inputs = {};
    }
    if (!data.results) {
      data.results = {};
    }

    // Generate calculationId if not provided
    if (!data.calculationId) {
      data.calculationId = `DC-${uuidv4().slice(0, 8).toUpperCase()}`;
    }

    // Set default status
    if (!data.status) {
      data.status = 'completed';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find calculation by calculationId
   * @param {string} calculationId - Calculation ID
   * @returns {Object|null} Calculation or null
   */
  async findByCalculationId(calculationId) {
    return baseModel.findOne.call(baseModel, { calculationId });
  },

  /**
   * Find calculations by scenario
   * @param {string} scenarioId - Scenario ID
   * @param {Object} options - Query options
   * @returns {Array} Calculations for the scenario
   */
  async findByScenario(scenarioId, options = {}) {
    return baseModel.find.call(baseModel, { scenarioId }, options);
  },

  /**
   * Find calculations by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Calculations for the company
   */
  async findByCompany(companyId, options = {}) {
    return baseModel.find.call(baseModel, { companyId }, options);
  },

  /**
   * Find calculations by type
   * @param {string} calculationType - Calculation type
   * @param {Object} options - Query options
   * @returns {Array} Calculations of the given type
   */
  async findByType(calculationType, options = {}) {
    return baseModel.find.call(baseModel, { calculationType }, options);
  },

  /**
   * Get the latest calculation for a scenario
   * @param {string} scenarioId - Scenario ID
   * @returns {Object|null} Latest calculation or null
   */
  async getLatestForScenario(scenarioId) {
    const results = await baseModel.find.call(baseModel, { scenarioId }, {
      sort: { createdAt: -1 },
      limit: 1
    });
    return results[0] || null;
  },

  /**
   * Calculate total dilution from calculation results
   * @param {Object} calculation - Calculation object
   * @returns {number} Total dilution percentage
   */
  calculateTotalDilution(calculation) {
    if (!calculation.results || !calculation.results.stakeholders) {
      return 0;
    }

    const stakeholders = calculation.results.stakeholders;
    if (!Array.isArray(stakeholders) || stakeholders.length === 0) {
      return 0;
    }

    return stakeholders.reduce((total, stakeholder) => {
      return total + (stakeholder.dilutionPercentage || 0);
    }, 0);
  },

  /**
   * Get dilution data for a specific stakeholder
   * @param {Object} calculation - Calculation object
   * @param {string} stakeholderId - Stakeholder ID
   * @returns {Object|null} Stakeholder dilution data or null
   */
  getStakeholderDilution(calculation, stakeholderId) {
    if (!calculation.results || !calculation.results.stakeholders) {
      return null;
    }

    const stakeholder = calculation.results.stakeholders.find(
      s => s.stakeholderId === stakeholderId
    );

    return stakeholder || null;
  },

  /**
   * Get share class breakdown from calculation
   * @param {Object} calculation - Calculation object
   * @returns {Array} Share class breakdown
   */
  getShareClassBreakdown(calculation) {
    if (!calculation.results || !calculation.results.shareClasses) {
      return [];
    }

    return calculation.results.shareClasses;
  },

  /**
   * Calculate ownership percentage changes for all stakeholders
   * @param {Object} calculation - Calculation object
   * @returns {Array} Ownership changes
   */
  getOwnershipChanges(calculation) {
    if (!calculation.results || !calculation.results.stakeholders) {
      return [];
    }

    return calculation.results.stakeholders.map(stakeholder => ({
      stakeholderId: stakeholder.stakeholderId,
      name: stakeholder.name,
      preRoundOwnership: stakeholder.preRoundOwnership || 0,
      postRoundOwnership: stakeholder.postRoundOwnership || 0,
      change: (stakeholder.postRoundOwnership || 0) - (stakeholder.preRoundOwnership || 0),
      dilutionPercentage: stakeholder.dilutionPercentage || 0
    }));
  },

  /**
   * Get summary statistics from calculation
   * @param {Object} calculation - Calculation object
   * @returns {Object} Summary statistics
   */
  getSummary(calculation) {
    if (!calculation.results) {
      return {
        totalDilution: 0,
        stakeholderCount: 0,
        shareClassCount: 0,
        calculationType: calculation.calculationType
      };
    }

    return {
      totalDilution: this.calculateTotalDilution(calculation),
      stakeholderCount: calculation.results.stakeholders?.length || 0,
      shareClassCount: calculation.results.shareClasses?.length || 0,
      calculationType: calculation.calculationType,
      postMoney: calculation.results.postMoney,
      totalShares: calculation.results.totalShares,
      createdAt: calculation.createdAt
    };
  },

  /**
   * Validate calculation data
   * @param {Object} calculation - Calculation object
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validate(calculation) {
    const errors = [];

    if (!calculation.scenarioId) {
      errors.push('Scenario ID is required');
    }
    if (!calculation.companyId) {
      errors.push('Company ID is required');
    }
    if (!calculation.calculationType) {
      errors.push('Calculation type is required');
    }
    if (!calculation.inputs) {
      errors.push('Inputs are required');
    }
    if (!calculation.results) {
      errors.push('Results are required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
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

module.exports = DilutionCalculation;
