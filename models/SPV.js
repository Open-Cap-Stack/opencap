/**
 * SPV Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Special Purpose Vehicle (SPV) entity for managing investment structures.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid status values
const VALID_STATUSES = ['active', 'draft', 'pending', 'closed', 'liquidated'];
const VALID_COMPLIANCE_STATUSES = ['Compliant', 'NonCompliant', 'PendingReview'];

// Validation functions
const validators = {
    isValidStatus: (status) => VALID_STATUSES.includes(status),
    isValidComplianceStatus: (status) => VALID_COMPLIANCE_STATUSES.includes(status),
    isValidDate: (date) => date instanceof Date && !isNaN(date)
};

// Schema definition for documentation and validation
const spvSchema = {
    SPVID: { type: 'string', required: true, unique: true },
    Name: { type: 'string', required: true },
    Purpose: { type: 'string', required: true },
    CreationDate: { type: 'date', required: true },
    Status: {
        type: 'string',
        required: true,
        enum: VALID_STATUSES
    },
    ParentCompanyID: { type: 'string', required: true },
    ComplianceStatus: {
        type: 'string',
        required: true,
        enum: VALID_COMPLIANCE_STATUSES
    },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spvs', spvSchema);

// Extended SPV model with business logic
const SPV = {
    ...baseModel,
    tableName: 'spvs',
    schema: spvSchema,
    validators,
    VALID_STATUSES,
    VALID_COMPLIANCE_STATUSES,

    /**
     * Create a new SPV with defaults and validation
     * @param {Object} data - SPV data
     * @returns {Object} Created SPV
     */
    async create(data) {
        // Generate SPVID if not provided
        if (!data.SPVID) {
            data.SPVID = `spv_${uuidv4()}`;
        }

        // Validate required fields
        if (!data.Name) {
            throw new Error('Name is required');
        }
        if (!data.Purpose) {
            throw new Error('Purpose is required');
        }
        if (!data.ParentCompanyID) {
            throw new Error('ParentCompanyID is required');
        }

        // Validate Status
        if (data.Status && !validators.isValidStatus(data.Status)) {
            throw new Error(`Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`);
        }

        // Validate ComplianceStatus
        if (data.ComplianceStatus && !validators.isValidComplianceStatus(data.ComplianceStatus)) {
            throw new Error(`Invalid compliance status. Valid values: ${VALID_COMPLIANCE_STATUSES.join(', ')}`);
        }

        // Ensure CreationDate is set
        if (!data.CreationDate) {
            data.CreationDate = new Date().toISOString();
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find SPV by SPVID
     * @param {string} spvId - SPV ID
     * @returns {Object|null} SPV or null
     */
    async findBySPVID(spvId) {
        return baseModel.findOne.call(baseModel, { SPVID: spvId });
    },

    /**
     * Find SPVs by parent company
     * @param {string} parentCompanyId - Parent Company ID
     * @returns {Array} SPVs belonging to the parent company
     */
    async findByParentCompany(parentCompanyId) {
        return baseModel.find.call(baseModel, { ParentCompanyID: parentCompanyId });
    },

    /**
     * Find SPVs by status
     * @param {string} status - SPV status
     * @returns {Array} SPVs with given status
     */
    async findByStatus(status) {
        if (!validators.isValidStatus(status)) {
            return [];
        }
        return baseModel.find.call(baseModel, { Status: status });
    },

    /**
     * Find SPVs by compliance status
     * @param {string} complianceStatus - Compliance status
     * @returns {Array} SPVs with given compliance status
     */
    async findByComplianceStatus(complianceStatus) {
        if (!validators.isValidComplianceStatus(complianceStatus)) {
            return [];
        }
        return baseModel.find.call(baseModel, { ComplianceStatus: complianceStatus });
    },

    /**
     * Find active SPVs
     * @returns {Array} Active SPVs
     */
    async findActive() {
        return baseModel.find.call(baseModel, { Status: 'active' });
    },

    /**
     * Update SPV status
     * @param {string} spvId - SPV ID
     * @param {string} status - New status
     * @returns {Object} Update result
     */
    async updateStatus(spvId, status) {
        if (!validators.isValidStatus(status)) {
            throw new Error(`Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`);
        }
        return baseModel.updateOne.call(baseModel, { SPVID: spvId }, { $set: { Status: status } });
    },

    /**
     * Update SPV compliance status
     * @param {string} spvId - SPV ID
     * @param {string} complianceStatus - New compliance status
     * @returns {Object} Update result
     */
    async updateComplianceStatus(spvId, complianceStatus) {
        if (!validators.isValidComplianceStatus(complianceStatus)) {
            throw new Error(`Invalid compliance status. Valid values: ${VALID_COMPLIANCE_STATUSES.join(', ')}`);
        }
        return baseModel.updateOne.call(baseModel, { SPVID: spvId }, { $set: { ComplianceStatus: complianceStatus } });
    },

    /**
     * Get valid status values
     * @returns {Array} Valid status values
     */
    getValidStatuses() {
        return [...VALID_STATUSES];
    },

    /**
     * Get valid compliance status values
     * @returns {Array} Valid compliance status values
     */
    getValidComplianceStatuses() {
        return [...VALID_COMPLIANCE_STATUSES];
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

module.exports = SPV;
