/**
 * DilutionScenario Model
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Data model for dilution scenarios with ZeroDB storage.
 * Supports funding rounds, SAFE conversions, option pools, and multi-round forecasts.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const dilutionScenarioSchema = {
  scenarioId: { type: 'string', required: true, unique: true },
  companyId: { type: 'string', required: true, index: true },
  name: { type: 'string', required: true },
  description: { type: 'string' },
  type: { type: 'string', required: true, enum: ['funding_round', 'safe_conversion', 'option_pool', 'multi_round', 'custom'] },

  // Valuation fields
  preMoney: { type: 'number', required: true, min: 0 },
  newInvestment: { type: 'number', required: true, min: 0 },
  postMoney: { type: 'number', required: true, min: 0 },

  // Share fields
  sharePrice: { type: 'number', min: 0 },
  sharesOutstanding: { type: 'number', min: 0 },
  newShares: { type: 'number', min: 0 },

  // Option pool fields
  optionPoolSize: { type: 'number', min: 0 },
  optionPoolPercentage: { type: 'number', min: 0, max: 100 },

  // SAFE fields
  safeAmount: { type: 'number', min: 0 },

  // Metadata
  metadata: { type: 'object' },
  tags: { type: 'array' },

  // Timestamps
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
  createdBy: { type: 'string' },
  updatedBy: { type: 'string' }
};

// Create the base model
const baseModel = createModel('dilution_scenarios', dilutionScenarioSchema);

// Extended DilutionScenario model with business logic
const DilutionScenario = {
  ...baseModel,
  tableName: 'dilution_scenarios',
  schema: dilutionScenarioSchema,

  /**
   * Create a new dilution scenario with validation
   * @param {Object} data - Scenario data
   * @returns {Object} Created scenario
   */
  async create(data) {
    // Validate required fields
    if (!data.companyId) {
      throw new Error('Company ID is required');
    }
    if (!data.name) {
      throw new Error('Scenario name is required');
    }
    if (!data.type) {
      throw new Error('Scenario type is required');
    }

    // Validate type is valid enum
    const validTypes = ['funding_round', 'safe_conversion', 'option_pool', 'multi_round', 'custom'];
    if (!validTypes.includes(data.type)) {
      throw new Error(`Invalid scenario type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate valuation fields are required
    if (data.preMoney === undefined) {
      throw new Error('Pre-money valuation is required');
    }
    if (data.newInvestment === undefined) {
      throw new Error('New investment is required');
    }
    if (data.postMoney === undefined) {
      throw new Error('Post-money valuation is required');
    }

    // Validate non-negative values
    if (data.preMoney < 0) {
      throw new Error('Pre-money valuation cannot be negative');
    }
    if (data.newInvestment < 0) {
      throw new Error('New investment cannot be negative');
    }
    if (data.postMoney < 0) {
      throw new Error('Post-money valuation cannot be negative');
    }

    // Generate scenarioId if not provided
    if (!data.scenarioId) {
      data.scenarioId = `DS-${uuidv4().slice(0, 8).toUpperCase()}`;
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find scenario by scenarioId
   * @param {string} scenarioId - Scenario ID
   * @returns {Object|null} Scenario or null
   */
  async findByScenarioId(scenarioId) {
    return baseModel.findOne.call(baseModel, { scenarioId });
  },

  /**
   * Find scenarios by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Scenarios for the company
   */
  async findByCompany(companyId, options = {}) {
    return baseModel.find.call(baseModel, { companyId }, options);
  },

  /**
   * Find scenarios by type
   * @param {string} type - Scenario type
   * @param {Object} options - Query options
   * @returns {Array} Scenarios of the given type
   */
  async findByType(type, options = {}) {
    return baseModel.find.call(baseModel, { type }, options);
  },

  /**
   * Calculate dilution percentage from scenario
   * @param {Object} scenario - Scenario object
   * @returns {number} Dilution percentage
   */
  calculateDilution(scenario) {
    // If shares are provided, calculate from shares
    if (scenario.sharesOutstanding && scenario.newShares !== undefined) {
      const totalShares = scenario.sharesOutstanding + scenario.newShares;
      if (totalShares === 0) return 0;
      return (scenario.newShares / totalShares) * 100;
    }

    // Otherwise calculate from valuations
    if (scenario.postMoney === 0) return 0;
    return (scenario.newInvestment / scenario.postMoney) * 100;
  },

  /**
   * Calculate ownership percentage for a given shareholding
   * @param {Object} scenario - Scenario object
   * @param {number} shareholding - Number of shares held
   * @returns {number} Ownership percentage
   */
  calculateOwnershipPercentage(scenario, shareholding) {
    if (!shareholding) return 0;

    const totalShares = (scenario.sharesOutstanding || 0) + (scenario.newShares || 0);
    if (totalShares === 0) return 0;

    return (shareholding / totalShares) * 100;
  },

  /**
   * Validate scenario data
   * @param {Object} scenario - Scenario object
   * @returns {Object} Validation result { valid: boolean, errors: Array }
   */
  validate(scenario) {
    const errors = [];

    if (!scenario.companyId) {
      errors.push('Company ID is required');
    }
    if (!scenario.name) {
      errors.push('Scenario name is required');
    }
    if (!scenario.type) {
      errors.push('Scenario type is required');
    }
    if (scenario.preMoney === undefined) {
      errors.push('Pre-money valuation is required');
    }
    if (scenario.newInvestment === undefined) {
      errors.push('New investment is required');
    }
    if (scenario.postMoney === undefined) {
      errors.push('Post-money valuation is required');
    }

    // Validate non-negative values
    if (scenario.preMoney < 0) {
      errors.push('Pre-money valuation cannot be negative');
    }
    if (scenario.newInvestment < 0) {
      errors.push('New investment cannot be negative');
    }
    if (scenario.postMoney < 0) {
      errors.push('Post-money valuation cannot be negative');
    }

    // Validate post-money calculation
    const expectedPostMoney = scenario.preMoney + scenario.newInvestment;
    if (Math.abs(scenario.postMoney - expectedPostMoney) > 0.01) {
      errors.push('Post-money valuation should equal pre-money + new investment');
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

module.exports = DilutionScenario;
