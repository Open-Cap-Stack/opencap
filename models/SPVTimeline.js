/**
 * SPVTimeline Model
 * Issue #269: SPV Timeline Events
 *
 * Tracks timeline events for an SPV including status changes,
 * LP activity, document events, and system events.
 */

const { createModel } = require('./base/ZeroDBModel');

// Valid event types
const VALID_TYPES = ['status_change', 'lp_activity', 'document', 'system', 'wizard'];

const validators = {
  isValidType: (type) => VALID_TYPES.includes(type)
};

// Schema definition for documentation and validation
const spvTimelineSchema = {
  spvId: { type: 'string', required: true },
  companyId: { type: 'string', required: true },
  type: { type: 'string', required: true, enum: VALID_TYPES },
  description: { type: 'string' },
  message: { type: 'string' },
  userName: { type: 'string' },
  userId: { type: 'string' },
  timestamp: { type: 'date' },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spv_timeline', spvTimelineSchema);

// Extended SPVTimeline model with business logic
const SPVTimeline = {
  ...baseModel,
  tableName: 'spv_timeline',
  schema: spvTimelineSchema,
  validators,
  VALID_TYPES,

  /**
   * Create a new timeline event with validation
   * @param {Object} data - Event data
   * @returns {Object} Created event
   */
  async create(data) {
    if (!data.spvId) {
      throw new Error('spvId is required');
    }
    if (!data.companyId) {
      throw new Error('companyId is required');
    }
    if (!data.type) {
      throw new Error('type is required');
    }
    if (!validators.isValidType(data.type)) {
      throw new Error(`Invalid type. Valid values: ${VALID_TYPES.join(', ')}`);
    }

    const doc = {
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    };

    return baseModel.create.call(baseModel, doc);
  },

  /**
   * Find all timeline events for a given SPV, sorted by createdAt desc
   * @param {string} spvId - SPV identifier
   * @param {Object} options - Query options (limit)
   * @returns {Array} Matching events sorted newest first
   */
  async findBySPV(spvId, options = {}) {
    const { limit = 50 } = options;
    const events = await baseModel.find.call(baseModel, { spvId }, { limit });
    // Sort by createdAt descending (newest first)
    return events.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0);
      const dateB = new Date(b.createdAt || b.timestamp || 0);
      return dateB - dateA;
    });
  },

  // Expose base model methods
  find: baseModel.find.bind(baseModel),
  findOne: baseModel.findOne.bind(baseModel),
  findById: baseModel.findById.bind(baseModel),
  updateOne: baseModel.updateOne.bind(baseModel),
  findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
  findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
  deleteOne: baseModel.deleteOne.bind(baseModel),
  findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
  findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
  countDocuments: baseModel.countDocuments.bind(baseModel),
  exists: baseModel.exists.bind(baseModel)
};

module.exports = SPVTimeline;
