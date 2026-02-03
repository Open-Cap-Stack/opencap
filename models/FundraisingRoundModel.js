/**
 * Fundraising Round Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages fundraising rounds including seed, series A/B/C, etc.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const fundraisingRoundSchema = {
    roundId: { type: 'string', required: true, unique: true },
    roundName: { type: 'string', required: true },
    amountRaised: { type: 'number', required: true },
    date: { type: 'date', required: true },
    investors: { type: 'array', required: true },
    equityGiven: { type: 'number', required: true },
    RoundType: { type: 'string', required: true },
    TermsOfInvestment: { type: 'string' },
    ShareClassesInvolved: { type: 'array' },
    LegalDocuments: { type: 'array' }
};

const baseModel = createModel('securities', fundraisingRoundSchema);

/**
 * Validate fundraising round data
 * @param {Object} data - Fundraising round data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateFundraisingRound(data) {
    const errors = [];

    if (!data.roundId) {
        errors.push('roundId is required');
    }

    if (!data.roundName) {
        errors.push('roundName is required');
    }

    if (data.amountRaised === undefined || data.amountRaised === null) {
        errors.push('amountRaised is required');
    }

    if (!data.date) {
        errors.push('date is required');
    }

    if (!data.investors || !Array.isArray(data.investors) || data.investors.length === 0) {
        errors.push('investors is required and must be a non-empty array');
    }

    if (data.equityGiven === undefined || data.equityGiven === null) {
        errors.push('equityGiven is required');
    }

    if (!data.RoundType) {
        errors.push('RoundType is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const FundraisingRound = {
    ...baseModel,

    /**
     * Create a new fundraising round with validation
     * @param {Object} data - Fundraising round data
     * @returns {Object} Created fundraising round
     */
    async create(data) {
        const validation = validateFundraisingRound(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const doc = {
            ...data,
            investors: data.investors || [],
            ShareClassesInvolved: data.ShareClassesInvolved || [],
            LegalDocuments: data.LegalDocuments || [],
            _type: 'fundraising_round'
        };

        return baseModel.create(doc);
    },

    /**
     * Find fundraising round by roundId
     * @param {string} roundId - Round ID
     * @returns {Object|null} Fundraising round or null
     */
    async findByRoundId(roundId) {
        return baseModel.findOne({ roundId, _type: 'fundraising_round' });
    },

    /**
     * Find fundraising rounds by type
     * @param {string} roundType - Round type (Seed, Series A, etc.)
     * @param {Object} options - Query options
     * @returns {Array} Fundraising rounds of type
     */
    async findByType(roundType, options = {}) {
        return baseModel.find(
            { RoundType: roundType, _type: 'fundraising_round' },
            options
        );
    },

    /**
     * Find fundraising rounds by investor
     * @param {string} investorId - Investor ID
     * @param {Object} options - Query options
     * @returns {Array} Fundraising rounds with investor
     */
    async findByInvestor(investorId, options = {}) {
        const allRounds = await baseModel.find({ _type: 'fundraising_round' }, options);
        return allRounds.filter(round =>
            round.investors && round.investors.includes(investorId)
        );
    },

    /**
     * Get total amount raised across all rounds
     * @returns {number} Total amount raised
     */
    async getTotalRaised() {
        const rounds = await baseModel.find({ _type: 'fundraising_round' });
        return rounds.reduce((total, round) => total + (round.amountRaised || 0), 0);
    },

    /**
     * Get total equity given across all rounds
     * @returns {number} Total equity given
     */
    async getTotalEquityGiven() {
        const rounds = await baseModel.find({ _type: 'fundraising_round' });
        return rounds.reduce((total, round) => total + (round.equityGiven || 0), 0);
    },

    /**
     * Add investor to fundraising round
     * @param {string} roundId - Round ID
     * @param {string} investorId - Investor ID to add
     * @returns {Object} Updated fundraising round
     */
    async addInvestor(roundId, investorId) {
        const round = await this.findByRoundId(roundId);
        if (!round) {
            throw new Error(`Fundraising round not found: ${roundId}`);
        }

        const investors = round.investors || [];
        if (!investors.includes(investorId)) {
            investors.push(investorId);
            await baseModel.updateOne(
                { roundId, _type: 'fundraising_round' },
                { $set: { investors } }
            );
        }

        return this.findByRoundId(roundId);
    },

    /**
     * Add legal document to fundraising round
     * @param {string} roundId - Round ID
     * @param {string} documentId - Document ID to add
     * @returns {Object} Updated fundraising round
     */
    async addLegalDocument(roundId, documentId) {
        const round = await this.findByRoundId(roundId);
        if (!round) {
            throw new Error(`Fundraising round not found: ${roundId}`);
        }

        const documents = round.LegalDocuments || [];
        if (!documents.includes(documentId)) {
            documents.push(documentId);
            await baseModel.updateOne(
                { roundId, _type: 'fundraising_round' },
                { $set: { LegalDocuments: documents } }
            );
        }

        return this.findByRoundId(roundId);
    },

    /**
     * Find all fundraising rounds (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Fundraising rounds
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'fundraising_round' }, options);
    },

    /**
     * Find a single fundraising round
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Fundraising round or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'fundraising_round' }, options);
    },

    /**
     * Count fundraising rounds matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'fundraising_round' });
    }
};

module.exports = FundraisingRound;
