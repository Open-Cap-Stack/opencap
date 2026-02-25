/**
 * Company Model
 * Migrated: ZeroDB Migration - Issue #175
 * Enhanced: Issue #261 - Added legal structure fields for 409A compliance
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Entity type enum values for 409A compliance
const ENTITY_TYPES = [
    'C_CORP',
    'S_CORP',
    'LLC',
    'LP',
    'DELAWARE_C_CORP',
    'DELAWARE_LLC'
];

// US States enum for state of incorporation
const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

// Tax status enum values
const TAX_STATUS_TYPES = ['ACTIVE', 'SUSPENDED', 'DISSOLVED'];

// Fiscal year end months
const FISCAL_YEAR_END_MONTHS = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

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

    // Legal structure fields for 409A compliance (Issue #261)
    entityType: {
        type: 'string',
        enum: ENTITY_TYPES,
        required: false
    },
    stateOfIncorporation: {
        type: 'string',
        enum: US_STATES,
        required: false
    },
    dateOfIncorporation: { type: 'date', required: false },
    qualifiedSmallBusiness: { type: 'boolean', default: false },
    section1202Eligible: { type: 'boolean', default: false },
    taxStatus: {
        type: 'string',
        enum: TAX_STATUS_TYPES,
        default: 'ACTIVE'
    },
    registeredAgentName: { type: 'string', required: false },
    registeredAgentAddress: {
        type: 'object',
        properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string', enum: US_STATES },
            zip: { type: 'string' },
            country: { type: 'string', default: 'USA' }
        },
        required: false
    },
    ein: { type: 'string', encrypted: true, required: false },
    fiscalYearEnd: {
        type: 'string',
        enum: FISCAL_YEAR_END_MONTHS,
        required: false
    },
    authorizedShares: { type: 'number', required: false },

    // Stripe billing integration
    stripeCustomerId: { type: 'string', required: false, default: null },

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

        const createdCompany = await baseModel.create.call(baseModel, data);

        // Create default settings for the company asynchronously (don't wait)
        // This will not block company creation if settings creation fails
        try {
            const Settings = require('./Settings');
            await Settings.createCompanySettings(createdCompany.companyId);
        } catch (settingsError) {
            console.error('Failed to create default company settings:', settingsError);
            // Continue anyway - settings can be created later if needed
        }

        return createdCompany;
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

    /**
     * Find companies by entity type (for 409A compliance)
     * @param {string} entityType - Entity type (C_CORP, S_CORP, LLC, etc.)
     * @returns {Array} Companies with the specified entity type
     */
    async findByEntityType(entityType) {
        return baseModel.find.call(baseModel, { entityType });
    },

    /**
     * Find companies by state of incorporation
     * @param {string} state - US state code (e.g., 'DE', 'CA')
     * @returns {Array} Companies incorporated in the specified state
     */
    async findByStateOfIncorporation(state) {
        return baseModel.find.call(baseModel, { stateOfIncorporation: state });
    },

    /**
     * Find companies eligible for QSBS (Qualified Small Business Stock)
     * @returns {Array} Companies with qualifiedSmallBusiness = true
     */
    async findQSBSEligible() {
        return baseModel.find.call(baseModel, { qualifiedSmallBusiness: true });
    },

    /**
     * Find companies eligible for Section 1202 tax exclusion
     * @returns {Array} Companies with section1202Eligible = true
     */
    async findSection1202Eligible() {
        return baseModel.find.call(baseModel, { section1202Eligible: true });
    },

    /**
     * Find companies by tax status
     * @param {string} status - Tax status (ACTIVE, SUSPENDED, DISSOLVED)
     * @returns {Array} Companies with the specified tax status
     */
    async findByTaxStatus(status) {
        return baseModel.find.call(baseModel, { taxStatus: status });
    },

    /**
     * Update legal structure fields for a company
     * @param {string} companyId - Company ID
     * @param {Object} legalStructureData - Legal structure data to update
     * @returns {Object} Updated company
     */
    async updateLegalStructure(companyId, legalStructureData) {
        const allowedFields = [
            'entityType', 'stateOfIncorporation', 'dateOfIncorporation',
            'qualifiedSmallBusiness', 'section1202Eligible', 'taxStatus',
            'registeredAgentName', 'registeredAgentAddress', 'ein',
            'fiscalYearEnd', 'authorizedShares'
        ];

        // Filter to only allowed fields
        const updateData = {};
        for (const field of allowedFields) {
            if (legalStructureData[field] !== undefined) {
                updateData[field] = legalStructureData[field];
            }
        }

        return baseModel.findOneAndUpdate.call(
            baseModel,
            { companyId },
            { $set: updateData },
            { new: true }
        );
    },

    /**
     * Check if a company is Delaware incorporated (common for startups)
     * @param {string} companyId - Company ID
     * @returns {boolean} True if incorporated in Delaware
     */
    async isDelawareIncorporated(companyId) {
        const company = await baseModel.findOne.call(baseModel, { companyId });
        if (!company) return false;
        return company.stateOfIncorporation === 'DE' ||
               company.entityType === 'DELAWARE_C_CORP' ||
               company.entityType === 'DELAWARE_LLC';
    },

    /**
     * Validate entity type value
     * @param {string} entityType - Entity type to validate
     * @returns {boolean} True if valid
     */
    isValidEntityType(entityType) {
        return ENTITY_TYPES.includes(entityType);
    },

    /**
     * Validate state code
     * @param {string} state - State code to validate
     * @returns {boolean} True if valid
     */
    isValidState(state) {
        return US_STATES.includes(state);
    },

    /**
     * Validate tax status
     * @param {string} status - Tax status to validate
     * @returns {boolean} True if valid
     */
    isValidTaxStatus(status) {
        return TAX_STATUS_TYPES.includes(status);
    },

    /**
     * Validate fiscal year end month
     * @param {string} month - Month to validate
     * @returns {boolean} True if valid
     */
    isValidFiscalYearEnd(month) {
        return FISCAL_YEAR_END_MONTHS.includes(month);
    },

    // Enum exports for external use
    ENTITY_TYPES,
    US_STATES,
    TAX_STATUS_TYPES,
    FISCAL_YEAR_END_MONTHS,

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
