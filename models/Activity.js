/**
 * Activity Model
 * Migrated: ZeroDB Migration - Issue #175
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid activity types
const activityTypes = [
    'DocumentUpload',
    'StakeholderUpdate',
    'FinancialReportCreated',
    'UserLogin',
    'SystemUpdate'
];

// Schema definition for documentation and validation
const activitySchema = {
    activityId: { type: 'string', required: true, unique: true },
    activityType: { type: 'string', required: true, enum: activityTypes },
    timestamp: { type: 'date', required: true },
    userInvolved: { type: 'string', required: true },
    changesMade: { type: 'string' },
    relatedObjects: { type: 'array', default: [] },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('audit_logs', activitySchema);

// Extended Activity model with business logic
const Activity = {
    ...baseModel,
    tableName: 'audit_logs',
    schema: activitySchema,
    activityTypes,

    /**
     * Create a new activity with defaults
     * @param {Object} data - Activity data
     * @returns {Object} Created activity
     */
    async create(data) {
        // Generate activityId if not provided
        if (!data.activityId) {
            data.activityId = `activity_${uuidv4()}`;
        }

        // Set timestamp if not provided
        if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
        }

        // Validate activity type
        if (data.activityType && !activityTypes.includes(data.activityType)) {
            throw new Error(`Invalid activity type: ${data.activityType}`);
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find activity by activityId
     * @param {string} activityId - Activity ID
     * @returns {Object|null} Activity or null
     */
    async findByActivityId(activityId) {
        return baseModel.findOne.call(baseModel, { activityId });
    },

    /**
     * Find activities by user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Array} User's activities
     */
    async findByUser(userId, options = {}) {
        return baseModel.find.call(baseModel, { userInvolved: userId }, options);
    },

    /**
     * Find activities by type
     * @param {string} activityType - Activity type
     * @param {Object} options - Query options
     * @returns {Array} Activities of given type
     */
    async findByType(activityType, options = {}) {
        return baseModel.find.call(baseModel, { activityType }, options);
    },

    /**
     * Find recent activities
     * @param {number} limit - Maximum number of activities
     * @returns {Array} Recent activities
     */
    async findRecent(limit = 50) {
        return baseModel.find.call(baseModel, {}, { limit, sort: { timestamp: -1 } });
    },

    /**
     * Log a new activity
     * @param {string} activityType - Type of activity
     * @param {string} userId - User involved
     * @param {string} changesMade - Description of changes
     * @param {Array} relatedObjects - Related object IDs
     * @returns {Object} Created activity
     */
    async log(activityType, userId, changesMade = '', relatedObjects = []) {
        return this.create({
            activityType,
            userInvolved: userId,
            changesMade,
            relatedObjects,
            timestamp: new Date().toISOString()
        });
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

module.exports = Activity;
