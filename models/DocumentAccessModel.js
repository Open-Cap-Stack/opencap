/**
 * DocumentAccess Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages document access permissions for users.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const documentAccessSchema = {
    _id: { type: 'string', required: true },
    accessId: { type: 'string', unique: true, required: true },
    AccessLevel: {
        type: 'string',
        enum: ['Read', 'Write', 'Admin'],
        required: true
    },
    RelatedDocument: { type: 'string', required: true }, // Reference to Document
    User: { type: 'string', required: true }, // Reference to User
    Permissions: { type: 'string', optional: true },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
};

// Valid access levels for validation
const VALID_ACCESS_LEVELS = ['Read', 'Write', 'Admin'];

// Create base model
const baseModel = createModel('document_access', documentAccessSchema);

/**
 * DocumentAccess Model with custom methods
 */
const DocumentAccessModel = {
    // Base model reference
    _baseModel: baseModel,
    tableName: baseModel.tableName,
    schema: documentAccessSchema,

    // Expose base model methods
    find: (query, options) => baseModel.find(query, options),
    findOne: (query, options) => baseModel.findOne(query, options),
    findById: (id, options) => baseModel.findById(id, options),
    findOneAndUpdate: (query, update, options) => baseModel.findOneAndUpdate(query, update, options),
    findByIdAndUpdate: (id, update, options) => baseModel.findByIdAndUpdate(id, update, options),
    updateOne: (query, update, options) => baseModel.updateOne(query, update, options),
    updateMany: (query, update, options) => baseModel.updateMany(query, update, options),
    deleteOne: (query) => baseModel.deleteOne(query),
    deleteMany: (query) => baseModel.deleteMany(query),
    findOneAndDelete: (query) => baseModel.findOneAndDelete(query),
    findByIdAndDelete: (id) => baseModel.findByIdAndDelete(id),
    countDocuments: (query) => baseModel.countDocuments(query),
    exists: (query) => baseModel.exists(query),
    distinct: (field, query) => baseModel.distinct(field, query),
    aggregate: (pipeline) => baseModel.aggregate(pipeline),
    insertMany: (dataArray) => baseModel.insertMany(dataArray),

    /**
     * Validate access level
     * @param {string} level - Access level to validate
     * @returns {boolean} True if valid
     */
    isValidAccessLevel(level) {
        return VALID_ACCESS_LEVELS.includes(level);
    },

    /**
     * Create a new document access record with validation
     * @param {Object} data - Access data
     * @returns {Object} Created access record
     */
    async create(data) {
        // Validate required fields
        if (!data.accessId) {
            throw new Error('accessId is required');
        }
        if (!data.AccessLevel) {
            throw new Error('AccessLevel is required');
        }
        if (!this.isValidAccessLevel(data.AccessLevel)) {
            throw new Error(`AccessLevel must be one of: ${VALID_ACCESS_LEVELS.join(', ')}`);
        }
        if (!data.RelatedDocument) {
            throw new Error('RelatedDocument is required');
        }
        if (!data.User) {
            throw new Error('User is required');
        }

        // Check for duplicate accessId
        const existing = await baseModel.findOne({ accessId: data.accessId });
        if (existing) {
            throw new Error('accessId must be unique');
        }

        return baseModel.create(data);
    },

    /**
     * Find access records by document
     * @param {string} documentId - Document ID
     * @returns {Array} Access records
     */
    async findByDocument(documentId) {
        return baseModel.find({ RelatedDocument: documentId });
    },

    /**
     * Find access records by user
     * @param {string} userId - User ID
     * @returns {Array} Access records
     */
    async findByUser(userId) {
        return baseModel.find({ User: userId });
    },

    /**
     * Find access record by user and document
     * @param {string} userId - User ID
     * @param {string} documentId - Document ID
     * @returns {Object|null} Access record
     */
    async findByUserAndDocument(userId, documentId) {
        return baseModel.findOne({ User: userId, RelatedDocument: documentId });
    },

    /**
     * Check if user has specific access level
     * @param {string} userId - User ID
     * @param {string} documentId - Document ID
     * @param {string} requiredLevel - Required access level
     * @returns {boolean} True if user has required access
     */
    async hasAccess(userId, documentId, requiredLevel) {
        const access = await this.findByUserAndDocument(userId, documentId);
        if (!access) return false;

        // Admin has all access
        if (access.AccessLevel === 'Admin') return true;

        // Write includes Read
        if (access.AccessLevel === 'Write' && requiredLevel === 'Read') return true;

        return access.AccessLevel === requiredLevel;
    },

    /**
     * Update access level for a user on a document
     * @param {string} userId - User ID
     * @param {string} documentId - Document ID
     * @param {string} newLevel - New access level
     * @returns {Object} Updated access record
     */
    async updateAccessLevel(userId, documentId, newLevel) {
        if (!this.isValidAccessLevel(newLevel)) {
            throw new Error(`AccessLevel must be one of: ${VALID_ACCESS_LEVELS.join(', ')}`);
        }

        return baseModel.findOneAndUpdate(
            { User: userId, RelatedDocument: documentId },
            { $set: { AccessLevel: newLevel } },
            { new: true }
        );
    },

    /**
     * Grant access to a user for a document
     * @param {string} userId - User ID
     * @param {string} documentId - Document ID
     * @param {string} level - Access level
     * @param {string} permissions - Additional permissions
     * @returns {Object} Created or updated access record
     */
    async grantAccess(userId, documentId, level, permissions = null) {
        const existing = await this.findByUserAndDocument(userId, documentId);

        if (existing) {
            return this.updateAccessLevel(userId, documentId, level);
        }

        return this.create({
            accessId: `access_${uuidv4()}`,
            User: userId,
            RelatedDocument: documentId,
            AccessLevel: level,
            Permissions: permissions
        });
    },

    /**
     * Revoke access for a user on a document
     * @param {string} userId - User ID
     * @param {string} documentId - Document ID
     * @returns {Object} Deleted access record
     */
    async revokeAccess(userId, documentId) {
        return baseModel.findOneAndDelete({ User: userId, RelatedDocument: documentId });
    },

    /**
     * Revoke all access for a document
     * @param {string} documentId - Document ID
     * @returns {Object} Delete result
     */
    async revokeAllForDocument(documentId) {
        return baseModel.deleteMany({ RelatedDocument: documentId });
    }
};

module.exports = DocumentAccessModel;
