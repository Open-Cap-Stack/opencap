/**
 * EquityGrant Model
 * Issue #77: Create Equity Grant Model and Workflow
 *
 * Represents equity grants (stock options, RSUs, etc.) given to employees.
 * Tracks grant details, vesting schedules, and exercise history.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid enums
const GRANT_TYPES = ['ISO', 'NSO', 'RSU', 'RSA', 'SAR', 'phantom'];
const GRANT_STATUSES = ['pending', 'approved', 'active', 'exercised', 'cancelled', 'expired'];
const VESTING_FREQUENCIES = ['monthly', 'quarterly', 'annually'];
const PAYMENT_METHODS = ['cash', 'cashless', 'stock_swap'];

// Schema definition for documentation and validation
const equityGrantSchema = {
  grantId: { type: 'string', required: true, unique: true },
  employeeId: { type: 'string', required: true },
  companyId: { type: 'string', required: true },
  equityPlanId: { type: 'string', default: null },
  grantType: { type: 'string', required: true, enum: GRANT_TYPES },
  numberOfShares: { type: 'number', required: true },
  strikePrice: { type: 'number', required: true },
  grantDate: { type: 'date', required: true },
  expirationDate: { type: 'date', default: null },
  vestingSchedule: {
    type: 'object',
    default: {
      vestingStartDate: null,
      vestingPeriodMonths: 48,
      cliffMonths: 12,
      vestingFrequency: 'monthly'
    }
  },
  status: { type: 'string', enum: GRANT_STATUSES, default: 'pending' },
  exercisedShares: { type: 'number', default: 0 },
  exerciseHistory: { type: 'array', default: [] },
  approvedDate: { type: 'date', default: null },
  approvedBy: { type: 'string', default: null },
  cancellationDate: { type: 'date', default: null },
  cancellationReason: { type: 'string', default: null },
  terminationDate: { type: 'date', default: null },
  postTerminationExercisePeriodDays: { type: 'number', default: 90 },
  fairMarketValueAtGrant: { type: 'number', default: null },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('equity_grants', equityGrantSchema);

// Extended EquityGrant model with business logic
const EquityGrant = {
  ...baseModel,
  tableName: 'equity_grants',
  schema: equityGrantSchema,

  // Export constants
  GRANT_TYPES,
  GRANT_STATUSES,
  VESTING_FREQUENCIES,
  PAYMENT_METHODS,

  /**
   * Create a new equity grant with defaults
   * @param {Object} data - Grant data
   * @returns {Object} Created grant
   */
  async create(data) {
    if (!data.grantId) {
      data.grantId = `grant_${uuidv4()}`;
    }

    // Validate grant type
    if (!GRANT_TYPES.includes(data.grantType)) {
      throw new Error(`${data.grantType} is not a valid grant type`);
    }

    // Validate number of shares
    if (data.numberOfShares < 1) {
      throw new Error('Number of shares must be positive');
    }

    // Validate strike price
    if (data.strikePrice < 0) {
      throw new Error('Strike price cannot be negative');
    }

    // Ensure exercised shares don't exceed total shares
    if ((data.exercisedShares || 0) > data.numberOfShares) {
      throw new Error('Exercised shares cannot exceed total number of shares');
    }

    // Set expiration date if not provided (default 10 years for options)
    if (!data.expirationDate && ['ISO', 'NSO'].includes(data.grantType)) {
      const expirationDate = new Date(data.grantDate);
      expirationDate.setFullYear(expirationDate.getFullYear() + 10);
      data.expirationDate = expirationDate.toISOString();
    }

    // Set vesting start date to grant date if not provided
    if (data.vestingSchedule && !data.vestingSchedule.vestingStartDate) {
      data.vestingSchedule.vestingStartDate = data.grantDate;
    }

    if (!data.status) {
      data.status = 'pending';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find grant by grantId
   * @param {string} grantId - Grant ID
   * @returns {Object|null} Grant or null
   */
  async findByGrantId(grantId) {
    return baseModel.findOne.call(baseModel, { grantId });
  },

  /**
   * Find grants by employee
   * @param {string} employeeId - Employee ID
   * @param {Object} options - Query options
   * @returns {Array} Grants for employee
   */
  async findByEmployee(employeeId, options = {}) {
    const query = { employeeId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find grants by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Grants for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.grantType) {
      query.grantType = options.grantType;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get unvested shares
   * @param {Object} grant - Grant object
   * @returns {number} Unvested shares
   */
  getUnvestedShares(grant) {
    return grant.numberOfShares - (grant.exercisedShares || 0);
  },

  /**
   * Check if fully exercised
   * @param {Object} grant - Grant object
   * @returns {boolean} True if fully exercised
   */
  isFullyExercised(grant) {
    return (grant.exercisedShares || 0) >= grant.numberOfShares;
  },

  /**
   * Record exercise
   * @param {string} grantId - Grant ID
   * @param {Object} exerciseData - Exercise data
   * @returns {Object} Updated grant
   */
  async recordExercise(grantId, exerciseData) {
    const grant = await this.findByGrantId(grantId);
    if (!grant) {
      throw new Error('Grant not found');
    }

    if (exerciseData.sharesExercised < 1) {
      throw new Error('Must exercise at least 1 share');
    }

    const newExercisedTotal = (grant.exercisedShares || 0) + exerciseData.sharesExercised;
    if (newExercisedTotal > grant.numberOfShares) {
      throw new Error('Cannot exercise more shares than available');
    }

    const exerciseHistory = grant.exerciseHistory || [];
    exerciseHistory.push({
      exerciseDate: exerciseData.exerciseDate || new Date().toISOString(),
      sharesExercised: exerciseData.sharesExercised,
      exercisePrice: exerciseData.exercisePrice || grant.strikePrice,
      paymentMethod: exerciseData.paymentMethod || 'cash',
      totalCost: exerciseData.totalCost || (exerciseData.sharesExercised * (exerciseData.exercisePrice || grant.strikePrice)),
      notes: exerciseData.notes || '',
      timestamp: new Date().toISOString()
    });

    const updateData = {
      exercisedShares: newExercisedTotal,
      exerciseHistory
    };

    // Update status if fully exercised
    if (newExercisedTotal >= grant.numberOfShares) {
      updateData.status = 'exercised';
    }

    return baseModel.updateOne.call(baseModel,
      { grantId },
      { $set: updateData }
    );
  },

  /**
   * Approve grant
   * @param {string} grantId - Grant ID
   * @param {string} approvedBy - User ID who approved
   * @returns {Object} Updated grant
   */
  async approve(grantId, approvedBy) {
    return baseModel.updateOne.call(baseModel,
      { grantId },
      {
        $set: {
          status: 'approved',
          approvedDate: new Date().toISOString(),
          approvedBy
        }
      }
    );
  },

  /**
   * Cancel grant
   * @param {string} grantId - Grant ID
   * @param {string} reason - Cancellation reason
   * @returns {Object} Updated grant
   */
  async cancel(grantId, reason) {
    return baseModel.updateOne.call(baseModel,
      { grantId },
      {
        $set: {
          status: 'cancelled',
          cancellationDate: new Date().toISOString(),
          cancellationReason: reason
        }
      }
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

module.exports = EquityGrant;
