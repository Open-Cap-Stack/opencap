/**
 * SPV Asset Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * [Feature] OCAE-212: Implement SPV Asset Management API
 * [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 *
 * Defines the schema for SPV Assets with proper indexing and validation
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid enums
const VALID_ASSET_TYPES = ['real_estate', 'private_equity', 'venture_capital', 'debt', 'other'];
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY'];
const VALID_STATUSES = ['active', 'sold', 'written_off', 'in_litigation'];

// Validation functions
const validators = {
    isValidAssetType: (type) => VALID_ASSET_TYPES.includes(type),
    isValidCurrency: (currency) => VALID_CURRENCIES.includes(currency?.toUpperCase()),
    isValidStatus: (status) => VALID_STATUSES.includes(status),
    isValidPositiveNumber: (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
    isValidName: (name) => name && name.length <= 100,
    isValidDescription: (desc) => !desc || desc.length <= 1000
};

// Schema definition for documentation and validation
const spvAssetModelSchema = {
    spvId: { type: 'string', required: true },
    name: { type: 'string', required: true, maxLength: 100 },
    description: { type: 'string', maxLength: 1000 },
    type: { type: 'string', required: true, enum: VALID_ASSET_TYPES },
    acquisitionDate: { type: 'date', required: true },
    acquisitionCost: { type: 'number', required: true, min: 0 },
    currentValue: { type: 'number', required: true, min: 0 },
    currency: { type: 'string', required: true, enum: VALID_CURRENCIES, default: 'USD' },
    status: { type: 'string', required: true, enum: VALID_STATUSES, default: 'active' },
    annualReturn: { type: 'number' },
    irr: { type: 'number' },
    multiple: { type: 'number' },
    documents: { type: 'array' },
    notes: { type: 'array' },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spv_asset_models', spvAssetModelSchema);

// Extended SPVAssetModel with business logic
const SPVAssetModel = {
    ...baseModel,
    tableName: 'spv_asset_models',
    schema: spvAssetModelSchema,
    validators,
    VALID_ASSET_TYPES,
    VALID_CURRENCIES,
    VALID_STATUSES,

    /**
     * Create a new SPV Asset with validation
     * @param {Object} data - Asset data
     * @returns {Object} Created asset
     */
    async create(data) {
        // Validate required fields
        if (!data.spvId) {
            throw new Error('SPV ID is required');
        }

        if (!data.name) {
            throw new Error('Asset name is required');
        }
        if (!validators.isValidName(data.name)) {
            throw new Error('Asset name cannot exceed 100 characters');
        }

        if (data.description && !validators.isValidDescription(data.description)) {
            throw new Error('Description cannot exceed 1000 characters');
        }

        if (!data.type || !validators.isValidAssetType(data.type)) {
            throw new Error(`Invalid asset type. Valid types: ${VALID_ASSET_TYPES.join(', ')}`);
        }

        if (!data.acquisitionDate) {
            throw new Error('Acquisition date is required');
        }

        if (data.acquisitionCost === undefined || data.acquisitionCost === null) {
            throw new Error('Acquisition cost is required');
        }
        if (!validators.isValidPositiveNumber(data.acquisitionCost)) {
            throw new Error('Acquisition cost cannot be negative');
        }

        if (data.currentValue === undefined || data.currentValue === null) {
            throw new Error('Current value is required');
        }
        if (!validators.isValidPositiveNumber(data.currentValue)) {
            throw new Error('Current value cannot be negative');
        }

        if (!data.createdBy) {
            throw new Error('createdBy is required');
        }

        // Set defaults
        if (!data.currency) {
            data.currency = 'USD';
        } else {
            data.currency = data.currency.toUpperCase();
        }

        if (!validators.isValidCurrency(data.currency)) {
            throw new Error(`Unsupported currency. Valid currencies: ${VALID_CURRENCIES.join(', ')}`);
        }

        if (!data.status) {
            data.status = 'active';
        }
        if (!validators.isValidStatus(data.status)) {
            throw new Error(`Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`);
        }

        // Initialize arrays if not provided
        if (!data.documents) {
            data.documents = [];
        }
        if (!data.notes) {
            data.notes = [];
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find assets by SPV ID
     * @param {string} spvId - SPV ID
     * @returns {Array} Assets belonging to the SPV
     */
    async findBySPVId(spvId) {
        if (!spvId) return [];
        return baseModel.find.call(baseModel, { spvId });
    },

    /**
     * Find assets by type
     * @param {string} type - Asset type
     * @returns {Array} Assets of given type
     */
    async findByType(type) {
        if (!validators.isValidAssetType(type)) return [];
        return baseModel.find.call(baseModel, { type });
    },

    /**
     * Find assets by status
     * @param {string} status - Asset status
     * @returns {Array} Assets with given status
     */
    async findByStatus(status) {
        if (!validators.isValidStatus(status)) return [];
        return baseModel.find.call(baseModel, { status });
    },

    /**
     * Find active assets for an SPV
     * @param {string} spvId - SPV ID
     * @returns {Array} Active assets
     */
    async findActiveAssets(spvId) {
        if (!spvId) return [];
        return baseModel.find.call(baseModel, { spvId, status: 'active' });
    },

    /**
     * Add a document to an asset
     * @param {string} assetId - Asset ID
     * @param {Object} document - Document data
     * @returns {Object} Updated asset
     */
    async addDocument(assetId, document) {
        const asset = await baseModel.findById.call(baseModel, assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }

        const doc = {
            name: document.name,
            url: document.url,
            uploadDate: new Date().toISOString()
        };

        const documents = asset.documents || [];
        documents.push(doc);

        return baseModel.findByIdAndUpdate.call(baseModel, assetId, { $set: { documents } }, { new: true });
    },

    /**
     * Add a note to an asset
     * @param {string} assetId - Asset ID
     * @param {Object} note - Note data
     * @returns {Object} Updated asset
     */
    async addNote(assetId, note) {
        const asset = await baseModel.findById.call(baseModel, assetId);
        if (!asset) {
            throw new Error('Asset not found');
        }

        const noteEntry = {
            content: note.content,
            createdBy: note.createdBy,
            createdAt: new Date().toISOString()
        };

        const notes = asset.notes || [];
        notes.push(noteEntry);

        return baseModel.findByIdAndUpdate.call(baseModel, assetId, { $set: { notes } }, { new: true });
    },

    /**
     * Update asset value
     * @param {string} assetId - Asset ID
     * @param {number} newValue - New current value
     * @param {string} updatedBy - User ID
     * @returns {Object} Updated asset
     */
    async updateValue(assetId, newValue, updatedBy) {
        if (!validators.isValidPositiveNumber(newValue)) {
            throw new Error('Current value cannot be negative');
        }

        return baseModel.findByIdAndUpdate.call(
            baseModel,
            assetId,
            { $set: { currentValue: newValue, updatedBy } },
            { new: true }
        );
    },

    /**
     * Update asset status
     * @param {string} assetId - Asset ID
     * @param {string} status - New status
     * @param {string} updatedBy - User ID
     * @returns {Object} Updated asset
     */
    async updateStatus(assetId, status, updatedBy) {
        if (!validators.isValidStatus(status)) {
            throw new Error(`Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`);
        }

        return baseModel.findByIdAndUpdate.call(
            baseModel,
            assetId,
            { $set: { status, updatedBy } },
            { new: true }
        );
    },

    /**
     * Get formatted value with currency
     * @param {Object} asset - Asset document
     * @returns {string} Formatted value
     */
    getFormattedValue(asset) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: asset.currency || 'USD'
        }).format(asset.currentValue);
    },

    /**
     * Calculate total portfolio value for an SPV
     * @param {string} spvId - SPV ID
     * @returns {number} Total current value
     */
    async getTotalValue(spvId) {
        const assets = await this.findActiveAssets(spvId);
        return assets.reduce((total, asset) => total + (asset.currentValue || 0), 0);
    },

    /**
     * Get valid asset types
     * @returns {Array} Valid asset types
     */
    getValidTypes() {
        return [...VALID_ASSET_TYPES];
    },

    /**
     * Get valid currencies
     * @returns {Array} Valid currencies
     */
    getValidCurrencies() {
        return [...VALID_CURRENCIES];
    },

    /**
     * Get valid statuses
     * @returns {Array} Valid statuses
     */
    getValidStatuses() {
        return [...VALID_STATUSES];
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

module.exports = SPVAssetModel;
