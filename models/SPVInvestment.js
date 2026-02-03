/**
 * SPV Investment Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Issue #123: Add SPV Nested Endpoints
 * Tracks investments made by investors in Special Purpose Vehicles (SPVs).
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid enums
const VALID_INVESTOR_TYPES = ['individual', 'institutional', 'accredited', 'qualified'];
const VALID_STATUSES = ['pending', 'active', 'redeemed', 'cancelled'];

// Validation functions
const validators = {
    isValidInvestorType: (type) => VALID_INVESTOR_TYPES.includes(type),
    isValidStatus: (status) => VALID_STATUSES.includes(status),
    isValidPositiveNumber: (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
    isValidPercentage: (value) => validators.isValidPositiveNumber(value) && value <= 100
};

// Schema definition for documentation and validation
const spvInvestmentSchema = {
    spvId: { type: 'string', required: true },
    investorId: { type: 'string', required: true },
    investorName: { type: 'string', required: true },
    investorType: { type: 'string', enum: VALID_INVESTOR_TYPES, default: 'individual' },
    investmentAmount: { type: 'number', required: true, min: 0 },
    equityPercentage: { type: 'number', required: true, min: 0, max: 100 },
    investmentDate: { type: 'date', required: true },
    currency: { type: 'string', default: 'USD' },
    status: { type: 'string', enum: VALID_STATUSES, default: 'pending' },
    documents: { type: 'array' },
    notes: { type: 'string' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('spv_investments', spvInvestmentSchema);

// Extended SPVInvestment model with business logic
const SPVInvestment = {
    ...baseModel,
    tableName: 'spv_investments',
    schema: spvInvestmentSchema,
    validators,
    VALID_INVESTOR_TYPES,
    VALID_STATUSES,

    /**
     * Create a new SPV Investment with validation
     * @param {Object} data - Investment data
     * @returns {Object} Created investment
     */
    async create(data) {
        // Validate required fields
        if (!data.spvId) {
            throw new Error('SPV ID is required');
        }

        if (!data.investorId) {
            throw new Error('Investor ID is required');
        }

        if (!data.investorName) {
            throw new Error('Investor name is required');
        }

        // Validate investor type
        if (data.investorType && !validators.isValidInvestorType(data.investorType)) {
            throw new Error(`Invalid investor type. Valid types: ${VALID_INVESTOR_TYPES.join(', ')}`);
        }

        // Validate investment amount
        if (data.investmentAmount === undefined || data.investmentAmount === null) {
            throw new Error('Investment amount is required');
        }
        if (!validators.isValidPositiveNumber(data.investmentAmount)) {
            throw new Error('Investment amount must be a positive number');
        }

        // Validate equity percentage
        if (data.equityPercentage === undefined || data.equityPercentage === null) {
            throw new Error('Equity percentage is required');
        }
        if (!validators.isValidPercentage(data.equityPercentage)) {
            throw new Error('Equity percentage must be between 0 and 100');
        }

        // Validate investment date
        if (!data.investmentDate) {
            throw new Error('Investment date is required');
        }

        // Validate status
        if (data.status && !validators.isValidStatus(data.status)) {
            throw new Error(`Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`);
        }

        // Set defaults
        if (!data.investorType) {
            data.investorType = 'individual';
        }
        if (!data.currency) {
            data.currency = 'USD';
        }
        if (!data.status) {
            data.status = 'pending';
        }
        if (!data.documents) {
            data.documents = [];
        }

        return baseModel.create.call(baseModel, data);
    },

    /**
     * Find investments by SPV ID
     * @param {string} spvId - SPV ID
     * @returns {Array} Investments for the SPV
     */
    async findBySPVId(spvId) {
        if (!spvId) return [];
        return baseModel.find.call(baseModel, { spvId });
    },

    /**
     * Find investments by investor ID
     * @param {string} investorId - Investor ID
     * @returns {Array} Investments by the investor
     */
    async findByInvestorId(investorId) {
        if (!investorId) return [];
        return baseModel.find.call(baseModel, { investorId });
    },

    /**
     * Find investments by status
     * @param {string} status - Investment status
     * @returns {Array} Investments with given status
     */
    async findByStatus(status) {
        if (!validators.isValidStatus(status)) return [];
        return baseModel.find.call(baseModel, { status });
    },

    /**
     * Find active investments for an SPV
     * @param {string} spvId - SPV ID
     * @returns {Array} Active investments
     */
    async findActiveInvestments(spvId) {
        if (!spvId) return [];
        return baseModel.find.call(baseModel, { spvId, status: 'active' });
    },

    /**
     * Find investments by investor type
     * @param {string} investorType - Investor type
     * @returns {Array} Investments by investor type
     */
    async findByInvestorType(investorType) {
        if (!validators.isValidInvestorType(investorType)) return [];
        return baseModel.find.call(baseModel, { investorType });
    },

    /**
     * Find investments within a date range
     * @param {string} spvId - SPV ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Investments within date range
     */
    async findByDateRange(spvId, startDate, endDate) {
        const investments = await this.findBySPVId(spvId);
        return investments.filter(inv => {
            const investmentDate = new Date(inv.investmentDate);
            return investmentDate >= startDate && investmentDate <= endDate;
        });
    },

    /**
     * Update investment status
     * @param {string} investmentId - Investment ID
     * @param {string} status - New status
     * @returns {Object} Updated investment
     */
    async updateStatus(investmentId, status) {
        if (!validators.isValidStatus(status)) {
            throw new Error(`Invalid status. Valid statuses: ${VALID_STATUSES.join(', ')}`);
        }

        return baseModel.findByIdAndUpdate.call(
            baseModel,
            investmentId,
            { $set: { status } },
            { new: true }
        );
    },

    /**
     * Add a document to an investment
     * @param {string} investmentId - Investment ID
     * @param {Object} document - Document data
     * @returns {Object} Updated investment
     */
    async addDocument(investmentId, document) {
        const investment = await baseModel.findById.call(baseModel, investmentId);
        if (!investment) {
            throw new Error('Investment not found');
        }

        const doc = {
            name: document.name,
            url: document.url,
            uploadedAt: new Date().toISOString()
        };

        const documents = investment.documents || [];
        documents.push(doc);

        return baseModel.findByIdAndUpdate.call(
            baseModel,
            investmentId,
            { $set: { documents } },
            { new: true }
        );
    },

    /**
     * Calculate total investment amount for an SPV
     * @param {string} spvId - SPV ID
     * @returns {number} Total investment amount
     */
    async getTotalInvestment(spvId) {
        const investments = await this.findActiveInvestments(spvId);
        return investments.reduce((total, inv) => total + (inv.investmentAmount || 0), 0);
    },

    /**
     * Calculate total equity allocated for an SPV
     * @param {string} spvId - SPV ID
     * @returns {number} Total equity percentage
     */
    async getTotalEquityAllocated(spvId) {
        const investments = await this.findActiveInvestments(spvId);
        return investments.reduce((total, inv) => total + (inv.equityPercentage || 0), 0);
    },

    /**
     * Get investor breakdown for an SPV
     * @param {string} spvId - SPV ID
     * @returns {Object} Breakdown by investor type
     */
    async getInvestorBreakdown(spvId) {
        const investments = await this.findActiveInvestments(spvId);
        const breakdown = {};

        for (const type of VALID_INVESTOR_TYPES) {
            const typeInvestments = investments.filter(inv => inv.investorType === type);
            breakdown[type] = {
                count: typeInvestments.length,
                totalAmount: typeInvestments.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0),
                totalEquity: typeInvestments.reduce((sum, inv) => sum + (inv.equityPercentage || 0), 0)
            };
        }

        return breakdown;
    },

    /**
     * Check if equity allocation exceeds 100%
     * @param {string} spvId - SPV ID
     * @param {number} newEquityPercentage - New equity to add
     * @returns {boolean} True if would exceed 100%
     */
    async wouldExceedEquityLimit(spvId, newEquityPercentage) {
        const currentTotal = await this.getTotalEquityAllocated(spvId);
        return (currentTotal + newEquityPercentage) > 100;
    },

    /**
     * Get valid investor types
     * @returns {Array} Valid investor types
     */
    getValidInvestorTypes() {
        return [...VALID_INVESTOR_TYPES];
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

module.exports = SPVInvestment;
