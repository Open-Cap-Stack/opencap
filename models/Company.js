/**
 * Company Model
 * Migrated: ZeroDB Migration - Issue #175
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const companySchema = {
    companyId: { type: 'string', required: true, unique: true },
    CompanyName: { type: 'string', required: true },
    CompanyType: {
        type: 'string',
        required: true,
        enum: ['startup', 'corporation', 'non-profit', 'government']
    },
    RegisteredAddress: { type: 'string', required: true },
    TaxID: { type: 'string', required: true },
    corporationDate: { type: 'date', required: true },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('companies', companySchema);

// Extended Company model with business logic
const Company = {
    ...baseModel,
    tableName: 'companies',
    schema: companySchema,

    /**
     * Create a new company with defaults
     * @param {Object} data - Company data
     * @returns {Object} Created company
     */
    async create(data) {
        // Generate companyId if not provided
        if (!data.companyId) {
            data.companyId = `company_${uuidv4()}`;
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find company by companyId
     * @param {string} companyId - Company ID
     * @returns {Object|null} Company or null
     */
    async findByCompanyId(companyId) {
        return baseModel.findOne.call(baseModel, { companyId });
    },

    /**
     * Find companies by type
     * @param {string} type - Company type
     * @returns {Array} Companies of given type
     */
    async findByType(type) {
        return baseModel.find.call(baseModel, { CompanyType: type });
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

module.exports = Company;
