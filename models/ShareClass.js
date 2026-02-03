/**
 * ShareClass Model
 * Migrated: ZeroDB Migration - Issue #175
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const shareClassSchema = {
    shareClassId: { type: 'string', required: true, unique: true },
    name: { type: 'string', required: true },
    description: { type: 'string', required: true },
    amountRaised: { type: 'number', required: true, min: 0 },
    ownershipPercentage: { type: 'number', required: true, min: 0, max: 100 },
    dilutedShares: { type: 'number', required: true, min: 0 },
    authorizedShares: { type: 'number', required: true, min: 0 },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('securities', shareClassSchema);

// Extended ShareClass model with business logic
const ShareClass = {
    ...baseModel,
    tableName: 'securities',
    schema: shareClassSchema,

    /**
     * Create a new share class with defaults
     * @param {Object} data - ShareClass data
     * @returns {Object} Created share class
     */
    async create(data) {
        // Validate required fields
        if (!data.name) {
            throw new Error('Share class name is required');
        }
        if (!data.description) {
            throw new Error('Description is required');
        }
        if (data.amountRaised === undefined || data.amountRaised < 0) {
            throw new Error('Amount raised is required and cannot be negative');
        }
        if (data.ownershipPercentage === undefined || data.ownershipPercentage < 0 || data.ownershipPercentage > 100) {
            throw new Error('Ownership percentage must be between 0 and 100');
        }
        if (data.dilutedShares === undefined || data.dilutedShares < 0) {
            throw new Error('Diluted shares is required and cannot be negative');
        }
        if (data.authorizedShares === undefined || data.authorizedShares < 0) {
            throw new Error('Authorized shares is required and cannot be negative');
        }

        // Generate shareClassId if not provided
        if (!data.shareClassId) {
            data.shareClassId = `sc_${uuidv4()}`;
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find share class by shareClassId
     * @param {string} shareClassId - ShareClass ID
     * @returns {Object|null} ShareClass or null
     */
    async findByShareClassId(shareClassId) {
        return baseModel.findOne.call(baseModel, { shareClassId });
    },

    /**
     * Find share classes by name
     * @param {string} name - ShareClass name
     * @returns {Array} Share classes with given name
     */
    async findByName(name) {
        return baseModel.find.call(baseModel, { name });
    },

    /**
     * Calculate conversion rate for a share class
     * @param {Object} shareClass - ShareClass object
     * @returns {number} Conversion rate
     */
    getConversionRate(shareClass) {
        if (shareClass.dilutedShares > 0) {
            return parseFloat((shareClass.authorizedShares / shareClass.dilutedShares).toFixed(2));
        }
        return 0;
    },

    /**
     * Validate shares (diluted <= authorized)
     * @param {Object} shareClass - ShareClass object
     * @returns {boolean} True if valid
     */
    validateShares(shareClass) {
        return shareClass.dilutedShares <= shareClass.authorizedShares;
    },

    /**
     * Search share classes by text
     * @param {string} searchText - Text to search
     * @returns {Array} Matching share classes
     */
    async search(searchText) {
        const results = await baseModel.find.call(baseModel, {});
        const lowerSearch = searchText.toLowerCase();
        return results.filter(sc =>
            sc.name?.toLowerCase().includes(lowerSearch) ||
            sc.description?.toLowerCase().includes(lowerSearch) ||
            sc.shareClassId?.toLowerCase().includes(lowerSearch)
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

module.exports = ShareClass;
