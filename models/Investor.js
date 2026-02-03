/**
 * Investor Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages investor information including investment amount, equity, and type.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const INVESTOR_TYPES = ['Angel', 'Venture Capital'];

const investorSchema = {
    investorId: { type: 'string', required: true, unique: true },
    investmentAmount: { type: 'number', required: true },
    equityPercentage: { type: 'number', required: true },
    investorType: { type: 'string', required: true, enum: INVESTOR_TYPES },
    relatedFundraisingRound: { type: 'string', required: true }
};

const baseModel = createModel('stakeholders', investorSchema);

/**
 * Validate investor data
 * @param {Object} data - Investor data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateInvestor(data) {
    const errors = [];

    if (!data.investorId) {
        errors.push('investorId is required');
    }

    if (data.investmentAmount === undefined || data.investmentAmount === null) {
        errors.push('investmentAmount is required');
    }

    if (data.equityPercentage === undefined || data.equityPercentage === null) {
        errors.push('equityPercentage is required');
    }

    if (!data.investorType) {
        errors.push('investorType is required');
    } else if (!INVESTOR_TYPES.includes(data.investorType)) {
        errors.push(`investorType must be one of: ${INVESTOR_TYPES.join(', ')}`);
    }

    if (!data.relatedFundraisingRound) {
        errors.push('relatedFundraisingRound is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const Investor = {
    ...baseModel,
    INVESTOR_TYPES,

    /**
     * Create a new investor with validation
     * @param {Object} data - Investor data
     * @returns {Object} Created investor
     */
    async create(data) {
        const validation = validateInvestor(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Check for duplicate investorId
        const existing = await this.findByInvestorId(data.investorId);
        if (existing) {
            const error = new Error(`Duplicate key error: investorId ${data.investorId} already exists`);
            error.code = 11000;
            throw error;
        }

        const doc = {
            ...data,
            _type: 'investor'
        };

        return baseModel.create(doc);
    },

    /**
     * Find investor by investorId
     * @param {string} investorId - Investor ID
     * @returns {Object|null} Investor or null
     */
    async findByInvestorId(investorId) {
        return baseModel.findOne({ investorId, _type: 'investor' });
    },

    /**
     * Find investors by type
     * @param {string} investorType - Investor type
     * @param {Object} options - Query options
     * @returns {Array} Investors of type
     */
    async findByType(investorType, options = {}) {
        if (!INVESTOR_TYPES.includes(investorType)) {
            throw new Error(`Invalid investorType: ${investorType}`);
        }
        return baseModel.find(
            { investorType, _type: 'investor' },
            options
        );
    },

    /**
     * Find investors by fundraising round
     * @param {string} roundId - Fundraising round ID
     * @param {Object} options - Query options
     * @returns {Array} Investors in round
     */
    async findByFundraisingRound(roundId, options = {}) {
        return baseModel.find(
            { relatedFundraisingRound: roundId, _type: 'investor' },
            options
        );
    },

    /**
     * Get total investment amount by type
     * @param {string} investorType - Investor type
     * @returns {number} Total investment amount
     */
    async getTotalInvestmentByType(investorType) {
        const investors = await this.findByType(investorType);
        return investors.reduce((total, inv) => total + (inv.investmentAmount || 0), 0);
    },

    /**
     * Get total equity by type
     * @param {string} investorType - Investor type
     * @returns {number} Total equity percentage
     */
    async getTotalEquityByType(investorType) {
        const investors = await this.findByType(investorType);
        return investors.reduce((total, inv) => total + (inv.equityPercentage || 0), 0);
    },

    /**
     * Update investor
     * @param {string} investorId - Investor ID
     * @param {Object} updateData - Data to update
     * @returns {Object|null} Updated investor
     */
    async updateByInvestorId(investorId, updateData) {
        // Validate update data if type is being changed
        if (updateData.investorType && !INVESTOR_TYPES.includes(updateData.investorType)) {
            throw new Error(`Invalid investorType: ${updateData.investorType}`);
        }

        await baseModel.updateOne(
            { investorId, _type: 'investor' },
            { $set: updateData }
        );
        return this.findByInvestorId(investorId);
    },

    /**
     * Delete investor
     * @param {string} investorId - Investor ID
     * @returns {Object} Delete result
     */
    async deleteByInvestorId(investorId) {
        return baseModel.deleteOne({ investorId, _type: 'investor' });
    },

    /**
     * Find all investors (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Investors
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'investor' }, options);
    },

    /**
     * Find a single investor
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Investor or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'investor' }, options);
    },

    /**
     * Count investors matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'investor' });
    }
};

module.exports = Investor;
