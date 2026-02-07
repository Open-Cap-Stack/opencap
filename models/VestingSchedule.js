/**
 * VestingSchedule Model
 * Issue #78: Implement Automated Vesting Schedules
 *
 * Data model for tracking equity vesting schedules with support for:
 * - Cliff periods and vesting frequencies
 * - Single and double trigger acceleration
 * - Status tracking and notifications
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid grant types
const GRANT_TYPES = ['ISO', 'NSO', 'RSA', 'RSU', 'SAR', 'phantom'];

// Valid vesting frequencies
const VESTING_FREQUENCIES = ['daily', 'monthly', 'quarterly', 'annually'];

// Valid statuses
const VALID_STATUSES = ['active', 'paused', 'completed', 'terminated', 'accelerated'];

// Valid termination types
const TERMINATION_TYPES = [
  'voluntary',
  'involuntary_without_cause',
  'involuntary_with_cause',
  'constructive_termination',
  'good_reason',
  'death',
  'disability'
];

// Valid acceleration types
const ACCELERATION_TYPES = ['single_trigger', 'double_trigger', 'board_discretion'];

// Valid trigger events
const TRIGGER_EVENTS = ['change_of_control', 'ipo', 'merger', 'acquisition'];

// Valid vesting event types
const VESTING_EVENT_TYPES = ['cliff', 'periodic', 'acceleration', 'manual'];

// Schema definition for documentation and validation
const vestingScheduleSchema = {
  scheduleId: { type: 'string', required: true, unique: true },
  equityPlanId: { type: 'string', required: true },
  stakeholderId: { type: 'string', required: true },
  companyId: { type: 'string', default: null },
  totalShares: { type: 'number', required: true },
  grantDate: { type: 'date', required: true },
  grantType: { type: 'string', enum: GRANT_TYPES, default: 'ISO' },
  exercisePrice: { type: 'number', default: 0 },
  vestingStartDate: { type: 'date', required: true },
  cliffPeriodMonths: { type: 'number', default: 12 },
  vestingPeriodMonths: { type: 'number', default: 48 },
  vestingFrequency: { type: 'string', enum: VESTING_FREQUENCIES, default: 'monthly' },
  accelerationTerms: {
    type: 'object',
    default: {
      singleTrigger: {
        enabled: false,
        accelerationPercentage: 0,
        events: []
      },
      doubleTrigger: {
        enabled: false,
        accelerationPercentage: 100,
        terminationTypes: [],
        windowPeriodMonths: 12
      }
    }
  },
  vestedShares: { type: 'number', default: 0 },
  unvestedShares: { type: 'number', default: 0 },
  lastVestingDate: { type: 'date', default: null },
  nextVestingDate: { type: 'date', default: null },
  cliffDate: { type: 'date', default: null },
  vestingEndDate: { type: 'date', default: null },
  status: { type: 'string', enum: VALID_STATUSES, default: 'active' },
  vestingHistory: { type: 'array', default: [] },
  pausedAt: { type: 'date', default: null },
  pausedDays: { type: 'number', default: 0 },
  terminationDate: { type: 'date', default: null },
  terminationType: { type: 'string', enum: TERMINATION_TYPES, default: null },
  accelerationDate: { type: 'date', default: null },
  accelerationType: { type: 'string', enum: ACCELERATION_TYPES, default: null },
  acceleratedShares: { type: 'number', default: 0 },
  notes: { type: 'string', default: '' },
  metadata: { type: 'object', default: {} },
  createdBy: { type: 'string', default: null },
  updatedBy: { type: 'string', default: null },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('vesting_schedules', vestingScheduleSchema);

// Extended VestingSchedule model with business logic
const VestingSchedule = {
  ...baseModel,
  tableName: 'vesting_schedules',
  schema: vestingScheduleSchema,

  // Export constants
  GRANT_TYPES,
  VESTING_FREQUENCIES,
  VALID_STATUSES,
  TERMINATION_TYPES,
  ACCELERATION_TYPES,
  TRIGGER_EVENTS,
  VESTING_EVENT_TYPES,

  /**
   * Create a new vesting schedule with defaults
   * @param {Object} data - Schedule data
   * @returns {Object} Created schedule
   */
  async create(data) {
    if (!data.scheduleId) {
      data.scheduleId = `vs_${uuidv4()}`;
    }

    // Validate total shares
    if (data.totalShares < 1) {
      throw new Error('totalShares must be at least 1');
    }

    // Calculate cliff date
    if (data.vestingStartDate) {
      const vestingStart = new Date(data.vestingStartDate);

      if (data.cliffPeriodMonths > 0) {
        const cliffDate = new Date(vestingStart);
        cliffDate.setMonth(cliffDate.getMonth() + (data.cliffPeriodMonths || 12));
        data.cliffDate = cliffDate.toISOString();
      } else {
        data.cliffDate = vestingStart.toISOString();
      }

      // Calculate vesting end date
      const endDate = new Date(vestingStart);
      endDate.setMonth(endDate.getMonth() + (data.vestingPeriodMonths || 48));
      data.vestingEndDate = endDate.toISOString();
    }

    // Initialize unvested shares
    if (data.unvestedShares === undefined) {
      data.unvestedShares = data.totalShares - (data.vestedShares || 0);
    }

    if (!data.status) {
      data.status = 'active';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find schedule by scheduleId
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Schedule or null
   */
  async findByScheduleId(scheduleId) {
    return baseModel.findOne.call(baseModel, { scheduleId });
  },

  /**
   * Find schedules by stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {Object} options - Query options
   * @returns {Array} Schedules for stakeholder
   */
  async findByStakeholder(stakeholderId, options = {}) {
    const query = { stakeholderId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find schedules by equity plan
   * @param {string} equityPlanId - Equity plan ID
   * @param {Object} options - Query options
   * @returns {Array} Schedules for plan
   */
  async findByEquityPlan(equityPlanId, options = {}) {
    const query = { equityPlanId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find schedules by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Schedules for company
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Get vesting percentage
   * @param {Object} schedule - Schedule object
   * @returns {number} Vesting percentage
   */
  getVestingPercentage(schedule) {
    if (schedule.totalShares === 0) return 0;
    return (schedule.vestedShares / schedule.totalShares) * 100;
  },

  /**
   * Check if cliff has passed
   * @param {Object} schedule - Schedule object
   * @returns {boolean} True if cliff passed
   */
  cliffPassed(schedule) {
    if (!schedule.cliffDate) return true;
    return new Date() >= new Date(schedule.cliffDate);
  },

  /**
   * Check if fully vested
   * @param {Object} schedule - Schedule object
   * @returns {boolean} True if fully vested
   */
  isFullyVested(schedule) {
    return schedule.vestedShares >= schedule.totalShares;
  },

  /**
   * Add vesting event
   * @param {string} scheduleId - Schedule ID
   * @param {Object} event - Vesting event
   * @returns {Object} Updated schedule
   */
  async addVestingEvent(scheduleId, event) {
    const schedule = await this.findByScheduleId(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const vestingHistory = schedule.vestingHistory || [];
    vestingHistory.push({
      eventDate: event.eventDate || new Date().toISOString(),
      eventType: event.eventType,
      sharesVested: event.sharesVested,
      cumulativeVested: event.cumulativeVested || schedule.vestedShares,
      notes: event.notes
    });

    const newVestedShares = schedule.vestedShares + event.sharesVested;
    const newUnvestedShares = schedule.totalShares - newVestedShares;

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          vestingHistory,
          vestedShares: newVestedShares,
          unvestedShares: newUnvestedShares,
          lastVestingDate: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Pause vesting
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Updated schedule
   */
  async pause(scheduleId) {
    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'paused',
          pausedAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Resume vesting
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Updated schedule
   */
  async resume(scheduleId) {
    const schedule = await this.findByScheduleId(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    let pausedDays = schedule.pausedDays || 0;
    if (schedule.pausedAt) {
      const pausedTime = new Date() - new Date(schedule.pausedAt);
      pausedDays += Math.floor(pausedTime / (1000 * 60 * 60 * 24));
    }

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'active',
          pausedAt: null,
          pausedDays
        }
      }
    );
  },

  /**
   * Terminate vesting
   * @param {string} scheduleId - Schedule ID
   * @param {string} terminationType - Termination type
   * @returns {Object} Updated schedule
   */
  async terminate(scheduleId, terminationType) {
    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'terminated',
          terminationDate: new Date().toISOString(),
          terminationType
        }
      }
    );
  },

  /**
   * Accelerate vesting
   * @param {string} scheduleId - Schedule ID
   * @param {string} accelerationType - Acceleration type
   * @param {number} sharesToAccelerate - Number of shares to accelerate
   * @returns {Object} Updated schedule
   */
  async accelerate(scheduleId, accelerationType, sharesToAccelerate) {
    const schedule = await this.findByScheduleId(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const acceleratedShares = Math.min(sharesToAccelerate, schedule.unvestedShares);
    const newVestedShares = schedule.vestedShares + acceleratedShares;
    const newUnvestedShares = schedule.totalShares - newVestedShares;

    // Add acceleration event to history
    const vestingHistory = schedule.vestingHistory || [];
    vestingHistory.push({
      eventDate: new Date().toISOString(),
      eventType: 'acceleration',
      sharesVested: acceleratedShares,
      cumulativeVested: newVestedShares,
      notes: `Accelerated via ${accelerationType}`
    });

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'accelerated',
          accelerationDate: new Date().toISOString(),
          accelerationType,
          acceleratedShares,
          vestedShares: newVestedShares,
          unvestedShares: newUnvestedShares,
          vestingHistory
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

module.exports = VestingSchedule;
