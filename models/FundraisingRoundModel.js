/**
 * Fundraising Round Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 * Enhanced: Issue #262 - Add valuation fields to financing_rounds model
 *
 * Manages fundraising rounds including seed, series A/B/C, etc.
 * Includes comprehensive valuation tracking for 409A compliance.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Enhanced round types for financing classification
 */
const ROUND_TYPES = [
    'PRICED_EQUITY',
    'SAFE',
    'CONVERTIBLE_NOTE',
    'SECONDARY',
    'BRIDGE',
    'EXTENSION',
    'SEED',
    'SERIES_A',
    'SERIES_B',
    'SERIES_C',
    'SERIES_D_PLUS',
    // Legacy types for backwards compatibility
    'Seed',
    'Series A',
    'Series B',
    'Series C',
    'Series D+'
];

/**
 * Valuation methods for financing rounds
 */
const VALUATION_METHODS = [
    'PRICED',
    'SAFE',
    'CONVERTIBLE_NOTE',
    'WARRANT'
];

/**
 * Priced round types that require preMoneyValuation
 */
const PRICED_ROUND_TYPES = [
    'PRICED_EQUITY',
    'SERIES_A',
    'SERIES_B',
    'SERIES_C',
    'SERIES_D_PLUS',
    'Series A',
    'Series B',
    'Series C',
    'Series D+'
];

/**
 * Allowed fields for valuation updates
 */
const VALUATION_UPDATE_FIELDS = [
    'preMoneyValuation',
    'postMoneyValuation',
    'pricePerShare',
    'previousPricePerShare',
    'valuationCap',
    'discount',
    'valuationMethod',
    'fullyDilutedSharesPre',
    'fullyDilutedSharesPost',
    'optionPoolPercentage',
    'optionPoolIncrease',
    'isArmsLength',
    'isInsiderRound',
    'isBridgeRound',
    'isDownRound',
    'leadInvestorId',
    'valuation409aId',
    'boardApprovalDate',
    'closingDate'
];

const fundraisingRoundSchema = {
    // Core fields
    roundId: { type: 'string', required: true, unique: true },
    roundName: { type: 'string', required: true },
    amountRaised: { type: 'number', required: true },
    date: { type: 'date', required: true },
    investors: { type: 'array', required: true },
    equityGiven: { type: 'number', required: true },
    RoundType: { type: 'string', required: true },
    TermsOfInvestment: { type: 'string' },
    ShareClassesInvolved: { type: 'array' },
    LegalDocuments: { type: 'array' },
    companyId: { type: 'string' },

    // Valuation fields (Issue #262)
    preMoneyValuation: { type: 'number' },
    postMoneyValuation: { type: 'number' },
    pricePerShare: { type: 'number' },
    previousPricePerShare: { type: 'number' },
    valuationCap: { type: 'number' },
    discount: { type: 'number', min: 0, max: 100 },
    valuationMethod: { type: 'string', enum: VALUATION_METHODS },

    // Share tracking
    fullyDilutedShares: { type: 'number' },
    fullyDilutedSharesPre: { type: 'number' },
    fullyDilutedSharesPost: { type: 'number' },
    optionPoolIncrease: { type: 'number' },
    optionPoolPercentage: { type: 'number', min: 0, max: 100 },

    // Round classification flags
    isArmsLength: { type: 'boolean', default: true },
    isInsiderRound: { type: 'boolean', default: false },
    isBridgeRound: { type: 'boolean', default: false },
    isDownRound: { type: 'boolean', default: false },

    // References
    leadInvestorId: { type: 'string' },
    valuation409aId: { type: 'string' },

    // Important dates
    boardApprovalDate: { type: 'date' },
    closingDate: { type: 'date' }
};

const baseModel = createModel('fundraising_rounds', fundraisingRoundSchema);

/**
 * Check if a round type is a priced round requiring valuation
 * @param {string} roundType - Round type to check
 * @returns {boolean} True if priced round
 */
function isPricedRoundType(roundType) {
    return PRICED_ROUND_TYPES.includes(roundType);
}

/**
 * Validate fundraising round data
 * @param {Object} data - Fundraising round data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateFundraisingRound(data) {
    const errors = [];

    // Core required fields
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

    // Validate RoundType is in allowed values
    if (data.RoundType && !ROUND_TYPES.includes(data.RoundType)) {
        errors.push(`RoundType must be one of: ${ROUND_TYPES.join(', ')}`);
    }

    // Validate valuationMethod if provided
    if (data.valuationMethod && !VALUATION_METHODS.includes(data.valuationMethod)) {
        errors.push(`valuationMethod must be one of: ${VALUATION_METHODS.join(', ')}`);
    }

    // Validate discount range
    if (data.discount !== undefined && data.discount !== null) {
        if (data.discount < 0 || data.discount > 100) {
            errors.push('discount must be between 0 and 100');
        }
    }

    // Validate optionPoolPercentage range
    if (data.optionPoolPercentage !== undefined && data.optionPoolPercentage !== null) {
        if (data.optionPoolPercentage < 0 || data.optionPoolPercentage > 100) {
            errors.push('optionPoolPercentage must be between 0 and 100');
        }
    }

    // Priced rounds require preMoneyValuation
    if (isPricedRoundType(data.RoundType) &&
        (data.preMoneyValuation === undefined ||
         data.preMoneyValuation === null)) {
        errors.push('preMoneyValuation is required for priced rounds');
    }

    // Validate pre/post money relationship if both provided
    if (data.preMoneyValuation !== undefined &&
        data.postMoneyValuation !== undefined &&
        data.amountRaised !== undefined) {
        const expectedPost = data.preMoneyValuation + data.amountRaised;
        // Allow small floating point tolerance
        if (Math.abs(data.postMoneyValuation - expectedPost) > 0.01) {
            errors.push('postMoneyValuation should equal preMoneyValuation + amountRaised');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const FundraisingRound = {
    ...baseModel,

    // Export constants
    ROUND_TYPES,
    VALUATION_METHODS,

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

        // Auto-calculate postMoneyValuation if not provided
        let postMoneyValuation = data.postMoneyValuation;
        if (data.preMoneyValuation !== undefined && postMoneyValuation === undefined) {
            postMoneyValuation = data.preMoneyValuation + data.amountRaised;
        }

        // Auto-calculate pricePerShare if not provided but we have valuation and shares
        let pricePerShare = data.pricePerShare;
        if (pricePerShare === undefined &&
            data.preMoneyValuation !== undefined &&
            data.fullyDilutedSharesPre !== undefined &&
            data.fullyDilutedSharesPre > 0) {
            pricePerShare = data.preMoneyValuation / data.fullyDilutedSharesPre;
        }

        // Auto-detect down round
        let isDownRound = data.isDownRound;
        if (isDownRound === undefined &&
            data.previousPricePerShare !== undefined &&
            (pricePerShare !== undefined || data.pricePerShare !== undefined)) {
            const currentPrice = pricePerShare || data.pricePerShare;
            isDownRound = currentPrice < data.previousPricePerShare;
        }

        // Default isArmsLength to true for new rounds
        const isArmsLength = data.isArmsLength !== undefined ? data.isArmsLength : true;

        const doc = {
            ...data,
            investors: data.investors || [],
            ShareClassesInvolved: data.ShareClassesInvolved || [],
            LegalDocuments: data.LegalDocuments || [],
            postMoneyValuation,
            pricePerShare,
            isDownRound,
            isArmsLength,
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
    },

    // ============================================
    // Valuation Methods (Issue #262)
    // ============================================

    /**
     * Calculate price per share from valuation data
     * @param {Object} round - Round data
     * @returns {number|null} Price per share or null if cannot calculate
     */
    calculatePricePerShare(round) {
        // Return existing if available
        if (round.pricePerShare !== undefined && round.pricePerShare !== null) {
            return round.pricePerShare;
        }

        // Calculate from valuation and shares
        if (round.preMoneyValuation &&
            round.fullyDilutedSharesPre &&
            round.fullyDilutedSharesPre > 0) {
            return round.preMoneyValuation / round.fullyDilutedSharesPre;
        }

        return null;
    },

    /**
     * Determine if a round is a down round
     * @param {Object} round - Round data
     * @returns {boolean} True if down round
     */
    isDownRound(round) {
        // Use stored value if explicitly set
        if (round.isDownRound !== undefined && round.isDownRound !== null) {
            return round.isDownRound;
        }

        // Calculate from prices
        if (round.pricePerShare && round.previousPricePerShare) {
            return round.pricePerShare < round.previousPricePerShare;
        }

        return false;
    },

    /**
     * Calculate dilution percentage for a round
     * @param {Object} round - Round data
     * @returns {number} Dilution percentage
     */
    calculateDilution(round) {
        // Calculate from share counts if available
        if (round.fullyDilutedSharesPre && round.fullyDilutedSharesPost) {
            const newShares = round.fullyDilutedSharesPost - round.fullyDilutedSharesPre;
            return (newShares / round.fullyDilutedSharesPost) * 100;
        }

        // Fallback to amount/valuation
        if (round.amountRaised && round.postMoneyValuation && round.postMoneyValuation > 0) {
            return (round.amountRaised / round.postMoneyValuation) * 100;
        }

        // Fallback to stored equityGiven
        if (round.equityGiven !== undefined && round.equityGiven !== null) {
            return round.equityGiven;
        }

        return 0;
    },

    /**
     * Calculate implied ownership sold in a round
     * @param {Object} round - Round data
     * @returns {number} Ownership percentage sold
     */
    calculateImpliedOwnershipSold(round) {
        if (round.amountRaised && round.postMoneyValuation && round.postMoneyValuation > 0) {
            return (round.amountRaised / round.postMoneyValuation) * 100;
        }
        return 0;
    },

    /**
     * Find fundraising rounds by company
     * @param {string} companyId - Company ID
     * @param {Object} options - Query options
     * @returns {Array} Fundraising rounds for company
     */
    async findByCompany(companyId, options = {}) {
        return baseModel.find(
            { companyId, _type: 'fundraising_round' },
            options
        );
    },

    /**
     * Get the latest priced round for a company
     * @param {string} companyId - Company ID
     * @returns {Object|null} Latest priced round or null
     */
    async getLatestPricedRound(companyId) {
        const rounds = await this.findByCompany(companyId);

        // Filter to priced rounds with valuation data
        const pricedRounds = rounds.filter(round =>
            PRICED_ROUND_TYPES.includes(round.RoundType) &&
            round.preMoneyValuation !== undefined
        );

        if (pricedRounds.length === 0) {
            return null;
        }

        // Sort by date descending and return latest
        pricedRounds.sort((a, b) => {
            const dateA = new Date(a.closingDate || a.date);
            const dateB = new Date(b.closingDate || b.date);
            return dateB - dateA;
        });

        return pricedRounds[0];
    },

    /**
     * Get valuation history for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Valuation history sorted by date
     */
    async getValuationHistory(companyId) {
        const rounds = await this.findByCompany(companyId);

        // Filter to rounds with valuation data
        const valuationRounds = rounds.filter(round =>
            round.preMoneyValuation !== undefined ||
            round.postMoneyValuation !== undefined ||
            round.valuationCap !== undefined
        );

        // Sort by date ascending
        valuationRounds.sort((a, b) => {
            const dateA = new Date(a.closingDate || a.date);
            const dateB = new Date(b.closingDate || b.date);
            return dateA - dateB;
        });

        // Add computed dilution to each round
        return valuationRounds.map(round => ({
            ...round,
            dilution: this.calculateDilution(round)
        }));
    },

    /**
     * Get all down rounds for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Down rounds
     */
    async getDownRounds(companyId) {
        const rounds = await this.findByCompany(companyId);
        return rounds.filter(round => this.isDownRound(round));
    },

    /**
     * Get all arm's length rounds for a company (for 409A)
     * @param {string} companyId - Company ID
     * @returns {Array} Arm's length rounds
     */
    async getArmsLengthRounds(companyId) {
        const rounds = await this.findByCompany(companyId);
        return rounds.filter(round =>
            round.isArmsLength === true &&
            round.isInsiderRound !== true &&
            round.preMoneyValuation !== undefined
        );
    },

    /**
     * Update valuation fields for a round
     * @param {string} roundId - Round ID
     * @param {Object} valuationData - Valuation data to update
     * @returns {Object} Update result
     */
    async updateValuation(roundId, valuationData) {
        // Filter to only allowed valuation fields
        const updateData = {};
        for (const field of VALUATION_UPDATE_FIELDS) {
            if (valuationData[field] !== undefined) {
                updateData[field] = valuationData[field];
            }
        }

        // Auto-detect down round if price changes
        if (updateData.pricePerShare !== undefined &&
            updateData.previousPricePerShare !== undefined) {
            updateData.isDownRound = updateData.pricePerShare < updateData.previousPricePerShare;
        }

        return baseModel.updateOne(
            { roundId, _type: 'fundraising_round' },
            { $set: updateData }
        );
    },

    /**
     * Link a round to a 409A valuation
     * @param {string} roundId - Round ID
     * @param {string} valuation409aId - 409A valuation ID
     * @returns {Object} Update result
     */
    async link409AValuation(roundId, valuation409aId) {
        return baseModel.updateOne(
            { roundId, _type: 'fundraising_round' },
            { $set: { valuation409aId } }
        );
    },

    /**
     * Get comprehensive round summary with computed fields
     * @param {string} roundId - Round ID
     * @returns {Object|null} Round summary or null
     */
    async getRoundSummary(roundId) {
        const round = await this.findByRoundId(roundId);
        if (!round) {
            return null;
        }

        return {
            roundId: round.roundId,
            roundName: round.roundName,
            RoundType: round.RoundType,
            date: round.closingDate || round.date,
            closingDate: round.closingDate,
            amountRaised: round.amountRaised,
            preMoneyValuation: round.preMoneyValuation,
            postMoneyValuation: round.postMoneyValuation,
            pricePerShare: this.calculatePricePerShare(round),
            valuationMethod: round.valuationMethod,
            isArmsLength: round.isArmsLength,
            isInsiderRound: round.isInsiderRound,
            isDownRound: this.isDownRound(round),
            dilution: this.calculateDilution(round),
            impliedOwnershipSold: this.calculateImpliedOwnershipSold(round),
            leadInvestorId: round.leadInvestorId,
            valuation409aId: round.valuation409aId,
            investors: round.investors || []
        };
    }
};

module.exports = FundraisingRound;
