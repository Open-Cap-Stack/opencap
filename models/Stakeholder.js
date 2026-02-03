/**
 * Stakeholder Model
 * Migrated: ZeroDB Migration - Issue #175
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const stakeholderSchema = {
    stakeholderId: { type: 'string', required: true, unique: true },
    name: { type: 'string', required: true },
    role: { type: 'string', required: true },
    projectId: { type: 'string', required: true },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('stakeholders', stakeholderSchema);

// Extended Stakeholder model with business logic
const Stakeholder = {
    ...baseModel,
    tableName: 'stakeholders',
    schema: stakeholderSchema,

    /**
     * Create a new stakeholder with defaults
     * @param {Object} data - Stakeholder data
     * @returns {Object} Created stakeholder
     */
    async create(data) {
        // Generate stakeholderId if not provided
        if (!data.stakeholderId) {
            data.stakeholderId = `stakeholder_${uuidv4()}`;
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find stakeholder by stakeholderId
     * @param {string} stakeholderId - Stakeholder ID
     * @returns {Object|null} Stakeholder or null
     */
    async findByStakeholderId(stakeholderId) {
        return baseModel.findOne.call(baseModel, { stakeholderId });
    },

    /**
     * Find stakeholders by project
     * @param {string} projectId - Project ID
     * @returns {Array} Stakeholders in project
     */
    async findByProject(projectId) {
        return baseModel.find.call(baseModel, { projectId });
    },

    /**
     * Find stakeholders by role
     * @param {string} role - Stakeholder role
     * @returns {Array} Stakeholders with given role
     */
    async findByRole(role) {
        return baseModel.find.call(baseModel, { role });
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

module.exports = Stakeholder;
