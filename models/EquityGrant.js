/**
 * EquityGrant Model
 * Issue #77: Create Equity Grant Model and Workflow
 * Issue #266: Link equity grants to 409A valuations for ASC 718 compliance
 *
 * Represents equity grants (stock options, RSUs, etc.) given to employees.
 * Tracks grant details, vesting schedules, exercise history, and 409A valuation linkage.
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

// Issue #266: FMV source tracking for 409A compliance
const FMV_SOURCES = ['409A_VALUATION', 'BOARD_RESOLUTION', 'EXTERNAL_APPRAISAL', 'SAFE_HARBOR', 'OTHER'];

// Issue #266: Grant vs FMV status for cheap stock analysis
const GRANT_FMV_STATUS = ['AT_FMV', 'ABOVE_FMV', 'BELOW_FMV', 'PENDING_VALUATION'];

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

  // Issue #266: 409A Valuation Linkage Fields
  valuation409AId: { type: 'string', default: null },
  fmvAtGrant: { type: 'number', default: null },
  fmvSource: { type: 'string', enum: FMV_SOURCES, default: null },
  grantVsFmvStatus: { type: 'string', enum: GRANT_FMV_STATUS, default: 'PENDING_VALUATION' },
  asc718ExpenseTotal: { type: 'number', default: null },
  asc718ExpenseRecognized: { type: 'number', default: 0 },
  asc718ExpensePerShare: { type: 'number', default: null },
  cheapStockRisk: { type: 'boolean', default: false },
  valuation409AExpiredAtGrant: { type: 'boolean', default: false },

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
  FMV_SOURCES,
  GRANT_FMV_STATUS,

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

    // Issue #266: Set default 409A-related fields
    if (!data.grantVsFmvStatus) {
      data.grantVsFmvStatus = 'PENDING_VALUATION';
    }
    if (data.cheapStockRisk === undefined) {
      data.cheapStockRisk = false;
    }
    if (data.valuation409AExpiredAtGrant === undefined) {
      data.valuation409AExpiredAtGrant = false;
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

  // ============================================================
  // Issue #266: 409A Valuation Linkage Methods
  // ============================================================

  /**
   * Link a grant to a 409A valuation
   * @param {string} grantId - Grant ID
   * @param {Object} valuation - Valuation object with valuationId, fairMarketValue, effectiveDate, expirationDate
   * @param {Object} options - Options (fmvSource, recalculateExpense)
   * @returns {Object} Updated grant
   */
  async linkValuation(grantId, valuation, options = {}) {
    const grant = await this.findByGrantId(grantId);
    if (!grant) {
      throw new Error('Grant not found');
    }

    if (!valuation || !valuation.valuationId) {
      throw new Error('Valid valuation with valuationId required');
    }

    const grantDate = new Date(grant.grantDate);
    const valuationEffective = valuation.effectiveDate ? new Date(valuation.effectiveDate) : null;
    const valuationExpiration = valuation.expirationDate ? new Date(valuation.expirationDate) : null;

    // Check if valuation was expired at grant date
    const expiredAtGrant = valuationExpiration && grantDate > valuationExpiration;

    // Determine grant vs FMV status
    let grantVsFmvStatus = 'PENDING_VALUATION';
    let cheapStockRisk = false;

    if (valuation.fairMarketValue !== undefined && valuation.fairMarketValue !== null) {
      const fmv = valuation.fairMarketValue;
      const strikePrice = grant.strikePrice;

      if (strikePrice === fmv) {
        grantVsFmvStatus = 'AT_FMV';
      } else if (strikePrice > fmv) {
        grantVsFmvStatus = 'ABOVE_FMV';
      } else {
        grantVsFmvStatus = 'BELOW_FMV';
        cheapStockRisk = true;
      }
    }

    const updateData = {
      valuation409AId: valuation.valuationId,
      fmvAtGrant: valuation.fairMarketValue || null,
      fmvSource: options.fmvSource || '409A_VALUATION',
      grantVsFmvStatus,
      cheapStockRisk,
      valuation409AExpiredAtGrant: expiredAtGrant
    };

    // Calculate ASC 718 expense if requested
    if (options.recalculateExpense !== false && valuation.fairMarketValue) {
      const expenseData = this.calculateASC718Expense(grant, valuation.fairMarketValue);
      updateData.asc718ExpenseTotal = expenseData.totalExpense;
      updateData.asc718ExpensePerShare = expenseData.expensePerShare;
    }

    await baseModel.updateOne.call(baseModel, { grantId }, { $set: updateData });
    return this.findByGrantId(grantId);
  },

  /**
   * Validate a grant against a 409A valuation
   * @param {Object} grant - Grant object
   * @param {Object} valuation - Valuation object
   * @returns {Object} Validation result with isValid, warnings, errors
   */
  validateGrant(grant, valuation) {
    const result = {
      isValid: true,
      warnings: [],
      errors: [],
      grantVsFmvStatus: 'PENDING_VALUATION',
      cheapStockRisk: false,
      valuation409AExpiredAtGrant: false
    };

    if (!grant) {
      result.isValid = false;
      result.errors.push('Grant is required');
      return result;
    }

    if (!valuation) {
      result.warnings.push('No valuation provided - cannot validate FMV compliance');
      return result;
    }

    const grantDate = new Date(grant.grantDate);
    const valuationEffective = valuation.effectiveDate ? new Date(valuation.effectiveDate) : null;
    const valuationExpiration = valuation.expirationDate ? new Date(valuation.expirationDate) : null;

    // Check if valuation status is approved
    if (valuation.status && valuation.status !== 'approved') {
      result.warnings.push(`Valuation status is '${valuation.status}' - should be 'approved' for compliance`);
    }

    // Check if valuation was expired at grant date
    if (valuationExpiration && grantDate > valuationExpiration) {
      result.valuation409AExpiredAtGrant = true;
      result.errors.push('409A valuation was expired at grant date - potential IRC 409A violation');
      result.isValid = false;
    }

    // Check if grant date is before valuation effective date
    if (valuationEffective && grantDate < valuationEffective) {
      result.warnings.push('Grant date is before valuation effective date');
    }

    // Check strike price vs FMV
    if (valuation.fairMarketValue !== undefined && valuation.fairMarketValue !== null) {
      const fmv = valuation.fairMarketValue;
      const strikePrice = grant.strikePrice;

      if (strikePrice === fmv) {
        result.grantVsFmvStatus = 'AT_FMV';
      } else if (strikePrice > fmv) {
        result.grantVsFmvStatus = 'ABOVE_FMV';
        result.warnings.push('Strike price is above FMV - may not be tax optimal for employee');
      } else {
        result.grantVsFmvStatus = 'BELOW_FMV';
        result.cheapStockRisk = true;
        const discount = ((fmv - strikePrice) / fmv * 100).toFixed(2);
        result.errors.push(`Strike price is ${discount}% below FMV - cheap stock risk (IRC 409A violation)`);
        result.isValid = false;
      }
    }

    return result;
  },

  /**
   * Calculate ASC 718 stock compensation expense
   * @param {Object} grant - Grant object
   * @param {number} fmv - Fair market value at grant
   * @param {Object} options - Options (volatility, riskFreeRate, expectedTerm)
   * @returns {Object} Expense calculation with totalExpense, expensePerShare, intrinsicValue, timeValue
   */
  calculateASC718Expense(grant, fmv, options = {}) {
    if (!grant || !fmv) {
      return {
        totalExpense: 0,
        expensePerShare: 0,
        intrinsicValue: 0,
        timeValue: 0
      };
    }

    const strikePrice = grant.strikePrice || 0;
    const numberOfShares = grant.numberOfShares || 0;

    // Intrinsic value component
    const intrinsicValuePerShare = Math.max(0, fmv - strikePrice);
    const intrinsicValue = intrinsicValuePerShare * numberOfShares;

    // Time value component (simplified calculation)
    // In production, this would use Black-Scholes or binomial model
    const volatility = options.volatility || 0.5; // 50% default volatility
    const expectedTermYears = options.expectedTerm || 6; // 6 years default
    const timeValueMultiplier = volatility * Math.sqrt(expectedTermYears) * 0.4; // Simplified
    const timeValuePerShare = fmv * timeValueMultiplier;
    const timeValue = timeValuePerShare * numberOfShares;

    // Total expense
    const expensePerShare = intrinsicValuePerShare + timeValuePerShare;
    const totalExpense = intrinsicValue + timeValue;

    return {
      totalExpense: Math.round(totalExpense * 100) / 100,
      expensePerShare: Math.round(expensePerShare * 100) / 100,
      intrinsicValue: Math.round(intrinsicValue * 100) / 100,
      timeValue: Math.round(timeValue * 100) / 100,
      intrinsicValuePerShare: Math.round(intrinsicValuePerShare * 100) / 100,
      timeValuePerShare: Math.round(timeValuePerShare * 100) / 100
    };
  },

  /**
   * Update ASC 718 expense recognition
   * @param {string} grantId - Grant ID
   * @param {number} amountRecognized - Amount of expense recognized
   * @returns {Object} Updated grant
   */
  async updateASC718Expense(grantId, amountRecognized) {
    const grant = await this.findByGrantId(grantId);
    if (!grant) {
      throw new Error('Grant not found');
    }

    const currentRecognized = grant.asc718ExpenseRecognized || 0;
    const totalExpense = grant.asc718ExpenseTotal || 0;
    const newRecognized = currentRecognized + amountRecognized;

    if (newRecognized > totalExpense && totalExpense > 0) {
      throw new Error('Cannot recognize more expense than total ASC 718 expense');
    }

    await baseModel.updateOne.call(baseModel,
      { grantId },
      { $set: { asc718ExpenseRecognized: newRecognized } }
    );

    return this.findByGrantId(grantId);
  },

  /**
   * Find grants pending valuation linkage
   * @param {string} companyId - Company ID
   * @returns {Array} Grants without 409A valuation linkage
   */
  async findPendingValuation(companyId) {
    const query = { companyId };
    const grants = await baseModel.find.call(baseModel, query);
    return grants.filter(g =>
      !g.valuation409AId &&
      g.grantVsFmvStatus === 'PENDING_VALUATION'
    );
  },

  /**
   * Find grants with cheap stock risk
   * @param {string} companyId - Company ID
   * @returns {Array} Grants with cheap stock risk flag
   */
  async findCheapStockRisk(companyId) {
    const query = { companyId, cheapStockRisk: true };
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get ASC 718 expense summary for a company
   * @param {string} companyId - Company ID
   * @returns {Object} Summary with totalExpense, recognizedExpense, unrecognizedExpense
   */
  async getASC718ExpenseSummary(companyId) {
    const grants = await baseModel.find.call(baseModel, { companyId });

    let totalExpense = 0;
    let recognizedExpense = 0;
    let grantCount = 0;
    let linkedCount = 0;

    for (const grant of grants) {
      if (grant.asc718ExpenseTotal) {
        totalExpense += grant.asc718ExpenseTotal;
        grantCount++;
      }
      if (grant.asc718ExpenseRecognized) {
        recognizedExpense += grant.asc718ExpenseRecognized;
      }
      if (grant.valuation409AId) {
        linkedCount++;
      }
    }

    return {
      totalExpense: Math.round(totalExpense * 100) / 100,
      recognizedExpense: Math.round(recognizedExpense * 100) / 100,
      unrecognizedExpense: Math.round((totalExpense - recognizedExpense) * 100) / 100,
      grantCount,
      linkedCount,
      pendingLinkageCount: grantCount - linkedCount
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

module.exports = EquityGrant;
