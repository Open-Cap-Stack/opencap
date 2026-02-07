/**
 * Termination Model
 * Issue #81: Implement Termination Equity Workflow
 *
 * Handles employee departures, vested share calculations,
 * exercise window tracking, and forfeiture management.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');

// Valid termination types
const TERMINATION_TYPES = ['voluntary', 'involuntary', 'for_cause', 'layoff', 'retirement', 'death', 'disability'];

// Valid statuses
const VALID_STATUSES = ['pending', 'processing', 'exercise_window_open', 'exercise_window_expired', 'completed', 'cancelled'];

// Valid vesting schedule types
const VESTING_TYPES = ['monthly', 'quarterly', 'annual', 'immediate', 'custom'];

// Valid repurchase price methods
const REPURCHASE_METHODS = ['lower_of_exercise_or_fmv', 'fmv_only', 'exercise_price_only', 'custom'];

// Valid notification channels
const NOTIFICATION_CHANNELS = ['email', 'sms', 'in_app'];

// Schema definition for documentation and validation
const terminationSchema = {
  terminationId: { type: 'string', required: true, unique: true },
  employeeId: { type: 'string', required: true },
  companyId: { type: 'string', required: true },
  terminationDate: { type: 'date', required: true },
  terminationType: { type: 'string', required: true, enum: TERMINATION_TYPES },
  terminationReason: { type: 'string', default: null },
  totalGrantedShares: { type: 'number', default: 0 },
  vestedSharesAtTermination: { type: 'number', default: 0 },
  unvestedSharesForfeited: { type: 'number', default: 0 },
  vestingPercentage: { type: 'number', default: 0 },
  grants: { type: 'array', default: [] },
  exerciseWindowDays: { type: 'number', default: 90 },
  exerciseWindowEndDate: { type: 'date', default: null },
  exerciseWindowExtended: { type: 'boolean', default: false },
  extensionReason: { type: 'string', default: null },
  extensionApprovedBy: { type: 'string', default: null },
  extensionApprovedDate: { type: 'date', default: null },
  sharesExercised: { type: 'number', default: 0 },
  sharesForfeited: { type: 'number', default: 0 },
  exerciseHistory: { type: 'array', default: [] },
  repurchaseRightEnabled: { type: 'boolean', default: false },
  repurchasePrice: { type: 'number', default: null },
  repurchaseDeadline: { type: 'date', default: null },
  repurchasePriceMethod: { type: 'string', enum: REPURCHASE_METHODS, default: null },
  totalRepurchaseValue: { type: 'number', default: null },
  status: { type: 'string', enum: VALID_STATUSES, required: true, default: 'pending' },
  documentsGenerated: { type: 'array', default: [] },
  immediateForfeiture: { type: 'boolean', default: false },
  cliffNotMet: { type: 'boolean', default: false },
  notificationsSent: { type: 'array', default: [] },
  notes: { type: 'string', default: null },
  processedBy: { type: 'string', default: null },
  processedAt: { type: 'date', default: null },
  approvedBy: { type: 'string', default: null },
  approvedAt: { type: 'date', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('terminations', terminationSchema);

// Extended Termination model with business logic
const Termination = {
  ...baseModel,
  tableName: 'terminations',
  schema: terminationSchema,

  // Export constants
  TERMINATION_TYPES,
  VALID_STATUSES,
  VESTING_TYPES,
  REPURCHASE_METHODS,
  NOTIFICATION_CHANNELS,

  /**
   * Create a new termination record with defaults
   * @param {Object} data - Termination data
   * @returns {Object} Created termination
   */
  async create(data) {
    // Generate terminationId if not provided
    if (!data.terminationId) {
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      data.terminationId = `TERM-${year}-${random}`;
    }

    // Validate termination type
    if (!TERMINATION_TYPES.includes(data.terminationType)) {
      throw new Error(`terminationType must be one of: ${TERMINATION_TYPES.join(', ')}`);
    }

    if (!data.status) {
      data.status = 'pending';
    }

    // Calculate exercise window end date if not provided
    if (data.terminationDate && data.exerciseWindowDays && !data.exerciseWindowEndDate) {
      const endDate = new Date(data.terminationDate);
      endDate.setDate(endDate.getDate() + data.exerciseWindowDays);
      data.exerciseWindowEndDate = endDate.toISOString();
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find termination by terminationId
   * @param {string} terminationId - Termination ID
   * @returns {Object|null} Termination or null
   */
  async findByTerminationId(terminationId) {
    return baseModel.findOne.call(baseModel, { terminationId });
  },

  /**
   * Find terminations by employee
   * @param {string} employeeId - Employee ID
   * @param {Object} options - Query options
   * @returns {Array} Terminations for employee
   */
  async findByEmployee(employeeId, options = {}) {
    const query = { employeeId };
    if (options.status) {
      query.status = options.status;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by terminationDate descending
    records.sort((a, b) => new Date(b.terminationDate) - new Date(a.terminationDate));

    return records;
  },

  /**
   * Find terminations by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Terminations for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.terminationType) {
      query.terminationType = options.terminationType;
    }

    let records = await baseModel.find.call(baseModel, query);

    // Sort by terminationDate descending
    records.sort((a, b) => new Date(b.terminationDate) - new Date(a.terminationDate));

    return records;
  },

  /**
   * Find terminations with expiring exercise windows
   * @param {string} companyId - Company ID
   * @param {number} daysUntilExpiry - Days until expiry threshold
   * @returns {Array} Terminations with expiring windows
   */
  async findExpiringWindows(companyId, daysUntilExpiry = 7) {
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    const records = await baseModel.find.call(baseModel, {
      companyId,
      status: 'exercise_window_open'
    });

    return records.filter(r => {
      const windowEnd = new Date(r.exerciseWindowEndDate);
      return windowEnd >= now && windowEnd <= expiryDate;
    });
  },

  /**
   * Calculate days until exercise window expires
   * @param {Object} termination - Termination object
   * @returns {number|null} Days until expiry or null
   */
  getDaysUntilExerciseExpiry(termination) {
    if (!termination.exerciseWindowEndDate) return null;
    const now = new Date();
    const windowEnd = new Date(termination.exerciseWindowEndDate);
    if (windowEnd < now) return 0;
    return Math.ceil((windowEnd - now) / (1000 * 60 * 60 * 24));
  },

  /**
   * Check if exercise window is expired
   * @param {Object} termination - Termination object
   * @returns {boolean} True if expired
   */
  isExerciseWindowExpired(termination) {
    if (!termination.exerciseWindowEndDate) return false;
    return new Date(termination.exerciseWindowEndDate) < new Date();
  },

  /**
   * Get shares available to exercise
   * @param {Object} termination - Termination object
   * @returns {number} Shares available
   */
  getSharesAvailableToExercise(termination) {
    return Math.max(0, termination.vestedSharesAtTermination - termination.sharesExercised);
  },

  /**
   * Get total exercise cost from history
   * @param {Object} termination - Termination object
   * @returns {number} Total exercise cost
   */
  getTotalExerciseCost(termination) {
    if (!termination.exerciseHistory || termination.exerciseHistory.length === 0) return 0;
    return termination.exerciseHistory.reduce((sum, exercise) => sum + (exercise.totalCost || 0), 0);
  },

  /**
   * Check if shares can be exercised
   * @param {Object} termination - Termination object
   * @param {number} sharesToExercise - Number of shares
   * @returns {boolean} True if can exercise
   */
  canExercise(termination, sharesToExercise) {
    if (this.isExerciseWindowExpired(termination)) return false;
    if (sharesToExercise > this.getSharesAvailableToExercise(termination)) return false;
    return true;
  },

  /**
   * Record an exercise
   * @param {string} terminationId - Termination ID
   * @param {Object} exerciseData - Exercise details
   * @returns {Object} Updated termination
   */
  async recordExercise(terminationId, exerciseData) {
    const termination = await this.findByTerminationId(terminationId);
    if (!termination) {
      throw new Error('Termination not found');
    }

    const exerciseHistory = termination.exerciseHistory || [];
    exerciseHistory.push({
      date: exerciseData.date || new Date().toISOString(),
      shares: exerciseData.shares,
      exercisePrice: exerciseData.exercisePrice,
      fmvAtExercise: exerciseData.fmvAtExercise,
      totalCost: exerciseData.totalCost,
      taxWithholding: exerciseData.taxWithholding
    });

    const sharesExercised = (termination.sharesExercised || 0) + exerciseData.shares;

    return baseModel.updateOne.call(baseModel,
      { terminationId },
      {
        $set: {
          exerciseHistory,
          sharesExercised
        }
      }
    );
  },

  /**
   * Extend exercise window
   * @param {string} terminationId - Termination ID
   * @param {number} additionalDays - Days to extend
   * @param {string} approvedBy - Approver ID
   * @param {string} reason - Extension reason
   * @returns {Object} Updated termination
   */
  async extendExerciseWindow(terminationId, additionalDays, approvedBy, reason) {
    const termination = await this.findByTerminationId(terminationId);
    if (!termination) {
      throw new Error('Termination not found');
    }

    const newEndDate = new Date(termination.exerciseWindowEndDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    return baseModel.updateOne.call(baseModel,
      { terminationId },
      {
        $set: {
          exerciseWindowEndDate: newEndDate.toISOString(),
          exerciseWindowExtended: true,
          extensionReason: reason,
          extensionApprovedBy: approvedBy,
          extensionApprovedDate: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Update termination status
   * @param {string} terminationId - Termination ID
   * @param {string} status - New status
   * @param {Object} options - Additional data
   * @returns {Object} Updated termination
   */
  async updateStatus(terminationId, status, options = {}) {
    const updateData = { status };

    if (status === 'processing' && options.processedBy) {
      updateData.processedBy = options.processedBy;
      updateData.processedAt = new Date().toISOString();
    }

    if (options.notes) {
      updateData.notes = options.notes;
    }

    return baseModel.updateOne.call(baseModel,
      { terminationId },
      { $set: updateData }
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

module.exports = Termination;
