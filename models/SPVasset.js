/**
 * SPV Asset Management API Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Previously tracked as OCAE-003
 * Updated as part of OCDI-304: Fix SPV Asset Model Validation issues
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid asset types
const VALID_ASSET_TYPES = ['Real Estate', 'Financial Instrument'];

// Validation functions - exposed separately for better testability
const validators = {
    isValidAssetID: (id) => {
        if (!id) return false;
        return /^[A-Za-z0-9\-]+$/.test(id);
    },

    isValidNumber: (value) => {
        return typeof value === 'number' && Number.isFinite(value);
    },

    isValidPositiveNumber: (value) => {
        return validators.isValidNumber(value) && value >= 0;
    },

    isValidDate: (date) => {
        return date instanceof Date && !isNaN(date);
    },

    isValidType: (type) => {
        return VALID_ASSET_TYPES.includes(type);
    }
};

// Schema definition for documentation and validation
const spvAssetSchema = {
    AssetID: { type: 'string', required: true, unique: true },
    SPVID: { type: 'string', required: true },
    Type: { type: 'string', required: true, enum: VALID_ASSET_TYPES },
    Value: { type: 'number', required: true },
    Description: { type: 'string', required: true },
    AcquisitionDate: { type: 'date', required: true },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spv_assets', spvAssetSchema);

// Extended SPVAsset model with business logic
const SPVAsset = {
    ...baseModel,
    tableName: 'spv_assets',
    schema: spvAssetSchema,
    validators,
    VALID_ASSET_TYPES,

    /**
     * Create a new SPV Asset with validation
     * @param {Object} data - Asset data
     * @returns {Object} Created asset
     */
    async create(data) {
        // Generate AssetID if not provided
        if (!data.AssetID) {
            data.AssetID = `asset_${uuidv4()}`;
        }

        // Validate AssetID format
        if (!validators.isValidAssetID(data.AssetID)) {
            throw new Error('Asset ID must contain only alphanumeric characters and hyphens');
        }

        // Validate required fields
        if (!data.SPVID) {
            throw new Error('SPV ID is required');
        }

        // Validate Type
        if (!data.Type || !validators.isValidType(data.Type)) {
            throw new Error(`Asset type is required and must be one of: ${VALID_ASSET_TYPES.join(', ')}`);
        }

        // Validate Value
        if (data.Value === undefined || data.Value === null) {
            throw new Error('Asset value is required');
        }
        if (!validators.isValidPositiveNumber(data.Value)) {
            throw new Error('Asset value must be a valid positive number');
        }

        // Validate Description
        if (!data.Description) {
            throw new Error('Asset description is required');
        }
        if (data.Description.length > 500) {
            throw new Error('Description cannot exceed 500 characters');
        }

        // Validate AcquisitionDate
        if (!data.AcquisitionDate) {
            throw new Error('Acquisition date is required');
        }

        // Normalize IDs to uppercase
        data.AssetID = data.AssetID.trim().toUpperCase();
        data.SPVID = data.SPVID.trim().toUpperCase();

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find asset by AssetID
     * @param {string} assetId - Asset ID
     * @returns {Object|null} Asset or null
     */
    async findByAssetID(assetId) {
        if (!assetId) return null;
        return baseModel.findOne.call(baseModel, { AssetID: assetId.trim().toUpperCase() });
    },

    /**
     * Find assets by SPV ID
     * @param {string} spvId - SPV ID
     * @returns {Array} Assets belonging to the SPV
     */
    async findBySPVID(spvId) {
        if (!spvId) return [];
        return baseModel.find.call(baseModel, { SPVID: spvId.trim().toUpperCase() });
    },

    /**
     * Find assets by type
     * @param {string} type - Asset type
     * @returns {Array} Assets of given type
     */
    async findByType(type) {
        if (!validators.isValidType(type)) return [];
        return baseModel.find.call(baseModel, { Type: type });
    },

    /**
     * Find assets that match criteria
     * @param {Object} filters - Filter criteria
     * @returns {Array} Matching assets
     */
    async findByFilters(filters = {}) {
        const query = {};

        if (filters.spvId) {
            query.SPVID = filters.spvId.trim().toUpperCase();
        }

        // Check type first and return empty array if invalid
        if (filters.type && !validators.isValidType(filters.type)) {
            return [];
        } else if (filters.type) {
            query.Type = filters.type;
        }

        if (filters.minValue && validators.isValidPositiveNumber(filters.minValue)) {
            query.Value = { $gte: filters.minValue };
        }

        if (filters.maxValue && validators.isValidPositiveNumber(filters.maxValue)) {
            query.Value = { ...query.Value, $lte: filters.maxValue };
        }

        return baseModel.find.call(baseModel, query);
    },

    /**
     * Get total value of assets by SPV ID
     * @param {string} spvId - SPV ID
     * @returns {number} Total value of assets
     */
    async getTotalValueBySPVID(spvId) {
        if (!spvId) return 0;
        const assets = await baseModel.find.call(baseModel, { SPVID: spvId.trim().toUpperCase() });
        return assets.reduce((total, asset) => total + asset.Value, 0);
    },

    /**
     * Get valid asset types
     * @returns {Array} Valid asset types
     */
    getValidTypes() {
        return [...VALID_ASSET_TYPES];
    },

    /**
     * Format asset for API response
     * @param {Object} asset - Asset document
     * @returns {Object} Formatted asset
     */
    toApiResponse(asset) {
        return {
            id: asset._id,
            assetId: asset.AssetID,
            spvId: asset.SPVID,
            type: asset.Type,
            value: asset.Value,
            description: asset.Description,
            acquisitionDate: asset.AcquisitionDate
        };
    },

    /**
     * Calculate current value (extensibility point)
     * @param {Object} asset - Asset document
     * @returns {number} Current value
     */
    calculateCurrentValue(asset) {
        // For now, just return the stored value
        // This can be extended later with appreciation/depreciation logic
        return asset.Value;
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

module.exports = SPVAsset;
