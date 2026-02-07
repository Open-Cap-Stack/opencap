/**
 * ScheduledTrigger Model
 *
 * Issue #88: Build Automated Triggered Messages
 *
 * Stores scheduled and delayed triggers that need to be executed
 * at a future time. Used by the trigger engine to process
 * time-based message dispatches.
 *
 * Migrated to ZeroDB
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid trigger types
const TRIGGER_TYPES = ['scheduled', 'delayed', 'recurring'];

// Valid statuses
const VALID_STATUSES = ['pending', 'processing', 'completed', 'failed', 'cancelled'];

// Schema definition for documentation and validation
const scheduledTriggerSchema = {
  scheduleId: { type: 'string', required: true, unique: true },
  triggerId: { type: 'string', required: true },
  triggerType: { type: 'string', required: true, enum: TRIGGER_TYPES },
  scheduledAt: { type: 'date', required: true },
  status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
  payload: { type: 'object', default: {} },
  recipientIds: { type: 'array', default: [] },
  companyId: { type: 'string', default: null },
  attempts: { type: 'number', default: 0 },
  maxAttempts: { type: 'number', default: 3 },
  lastAttemptAt: { type: 'date', default: null },
  lastError: { type: 'string', default: null },
  completedAt: { type: 'date', default: null },
  historyId: { type: 'string', default: null },
  metadata: { type: 'object', default: {} },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('scheduled_triggers', scheduledTriggerSchema);

// Extended ScheduledTrigger model with business logic
const ScheduledTrigger = {
  ...baseModel,
  tableName: 'scheduled_triggers',
  schema: scheduledTriggerSchema,

  // Export constants
  TRIGGER_TYPES,
  VALID_STATUSES,

  /**
   * Create a new scheduled trigger with defaults
   * @param {Object} data - Trigger data
   * @returns {Object} Created trigger
   */
  async create(data) {
    if (!data.scheduleId) {
      data.scheduleId = `sched_${uuidv4()}`;
    }

    // Validate trigger type
    if (!TRIGGER_TYPES.includes(data.triggerType)) {
      throw new Error(`triggerType must be one of: ${TRIGGER_TYPES.join(', ')}`);
    }

    if (!data.status) {
      data.status = 'pending';
    }

    return baseModel.create.call(baseModel, data);
  },

  /**
   * Find trigger by scheduleId
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Trigger or null
   */
  async findByScheduleId(scheduleId) {
    return baseModel.findOne.call(baseModel, { scheduleId });
  },

  /**
   * Find due scheduled triggers
   * @param {Date} asOf - Reference time (defaults to now)
   * @param {number} limit - Max records to return
   * @returns {Array} Due scheduled triggers
   */
  async findDue(asOf = new Date(), limit = 100) {
    const triggers = await baseModel.find.call(baseModel, { status: 'pending' });

    const dueTime = new Date(asOf);
    const dueTriggers = triggers
      .filter(t => new Date(t.scheduledAt) <= dueTime)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    return dueTriggers.slice(0, limit);
  },

  /**
   * Find triggers by triggerId
   * @param {string} triggerId - Trigger ID
   * @param {Object} options - Query options
   * @returns {Array} Scheduled triggers
   */
  async findByTriggerId(triggerId, options = {}) {
    const query = { triggerId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Find triggers by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Array} Scheduled triggers
   */
  async findByCompany(companyId, options = {}) {
    const query = { companyId };
    if (options.status) {
      query.status = options.status;
    }
    return baseModel.find.call(baseModel, query);
  },

  /**
   * Mark trigger as processing
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Updated trigger or null if not pending
   */
  async markProcessing(scheduleId) {
    const trigger = await this.findByScheduleId(scheduleId);
    if (!trigger || trigger.status !== 'pending') {
      return null;
    }

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'processing',
          lastAttemptAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Mark trigger as completed
   * @param {string} scheduleId - Schedule ID
   * @param {string} historyId - Associated history record ID
   * @returns {Object} Updated trigger
   */
  async markCompleted(scheduleId, historyId = null) {
    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date().toISOString(),
          historyId
        }
      }
    );
  },

  /**
   * Mark trigger as failed
   * @param {string} scheduleId - Schedule ID
   * @param {string} error - Error message
   * @returns {Object} Updated trigger
   */
  async markFailed(scheduleId, error) {
    const trigger = await this.findByScheduleId(scheduleId);
    if (!trigger) {
      throw new Error('Scheduled trigger not found');
    }

    const attempts = (trigger.attempts || 0) + 1;
    const status = attempts >= trigger.maxAttempts ? 'failed' : 'pending';

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      {
        $set: {
          status,
          attempts,
          lastError: error,
          lastAttemptAt: new Date().toISOString()
        }
      }
    );
  },

  /**
   * Cancel trigger
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Updated trigger or null if not pending
   */
  async cancel(scheduleId) {
    const trigger = await this.findByScheduleId(scheduleId);
    if (!trigger || trigger.status !== 'pending') {
      return null;
    }

    return baseModel.updateOne.call(baseModel,
      { scheduleId },
      { $set: { status: 'cancelled' } }
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

module.exports = ScheduledTrigger;
