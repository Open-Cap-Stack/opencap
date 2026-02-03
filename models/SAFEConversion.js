/**
 * SAFEConversion Model
 * Feature: Issue #68 - SAFE Conversion Engine
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    conversionId: { type: 'string', unique: true, index: true },

    // References
    safeId: { type: 'string', required: true, index: true },
    companyId: { type: 'string', required: true, index: true },
    fundingRoundId: { type: 'string', required: true },

    // Investor info (denormalized for reporting)
    investorId: { type: 'string', required: true },
    investorName: { type: 'string', required: true },

    // SAFE terms at conversion (snapshot)
    safeTerms: {
        safeType: { type: 'string', enum: ['post-money', 'pre-money', 'mfn'], required: true },
        investmentAmount: { type: 'number', required: true },
        valuationCap: { type: 'number' },
        discountRate: { type: 'number' },
        proRataRights: { type: 'boolean', default: false }
    },

    // Funding round terms
    roundTerms: {
        roundName: { type: 'string', required: true },
        roundType: { type: 'string' },
        preMoneyValuation: { type: 'number', required: true },
        pricePerShare: { type: 'number', required: true },
        fullyDilutedShares: { type: 'number', required: true },
        totalRoundSize: { type: 'number' }
    },

    // Conversion calculation
    calculation: {
        investmentAmount: { type: 'number', required: true },
        valuationCap: { type: 'number' },
        discountRate: { type: 'number' },
        seriesPrice: { type: 'number', required: true },
        fullyDilutedShares: { type: 'number', required: true },
        capPrice: { type: 'number' },
        discountPrice: { type: 'number' },
        effectivePrice: { type: 'number', required: true },
        methodUsed: { type: 'string', enum: ['cap', 'discount', 'mfn', 'series_price'], required: true },
        sharesIssued: { type: 'number', required: true },
        ownershipPercentage: { type: 'number' },
        priceComparison: {
            capPrice: { type: 'number' },
            discountPrice: { type: 'number' },
            seriesPrice: { type: 'number' },
            savings: { type: 'number' }
        }
    },

    // Output
    shareClassId: { type: 'string', required: true },
    shareClassName: { type: 'string' },
    sharesIssued: { type: 'number', required: true, min: 0 },
    pricePerShare: { type: 'number', required: true, min: 0 },

    // Status
    status: {
        type: 'string',
        enum: ['pending', 'approved', 'executed', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Timestamps
    calculatedAt: { type: 'date' },
    approvedAt: { type: 'date' },
    approvedBy: { type: 'string' },
    executedAt: { type: 'date' },
    executedBy: { type: 'string' },
    cancelledAt: { type: 'date' },
    cancelledBy: { type: 'string' },
    cancellationReason: { type: 'string' },

    // Pro-rata tracking
    proRata: {
        eligible: { type: 'boolean', default: false },
        allocationAmount: { type: 'number' },
        participated: { type: 'boolean' },
        participationAmount: { type: 'number' }
    },

    // Equity grant reference (created on execution)
    equityGrantId: { type: 'string' },

    // Audit
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' },
    notes: { type: 'string' },
    metadata: { type: 'object', default: {} }
};

// Create base model
const baseModel = createModel('securities', schema);

// Extended SAFEConversion model with custom methods
const SAFEConversion = {
    ...baseModel,

    /**
     * Create a new SAFE conversion with generated conversionId
     * @param {Object} data - Conversion data
     * @returns {Object} Created conversion
     */
    async create(data) {
        const conversionData = {
            ...data,
            conversionId: data.conversionId || `conv_${uuidv4()}`,
            status: data.status || 'pending',
            calculatedAt: data.calculatedAt || new Date().toISOString(),
            metadata: data.metadata || {}
        };
        return baseModel.create(conversionData);
    },

    /**
     * Approve a conversion
     * @param {string} conversionId - Conversion ID
     * @param {string} userId - Approving user ID
     * @returns {Object} Updated conversion
     */
    async approve(conversionId, userId) {
        const conversion = await this.findOne({ conversionId });
        if (!conversion) {
            throw new Error('Conversion not found');
        }

        if (conversion.status !== 'pending') {
            throw new Error(`Cannot approve conversion in ${conversion.status} status`);
        }

        await this.updateOne({ conversionId }, {
            $set: {
                status: 'approved',
                approvedAt: new Date().toISOString(),
                approvedBy: userId,
                updatedBy: userId
            }
        });

        return this.findOne({ conversionId });
    },

    /**
     * Execute a conversion
     * @param {string} conversionId - Conversion ID
     * @param {string} userId - Executing user ID
     * @param {string} equityGrantId - Optional equity grant ID
     * @returns {Object} Updated conversion
     */
    async execute(conversionId, userId, equityGrantId = null) {
        const conversion = await this.findOne({ conversionId });
        if (!conversion) {
            throw new Error('Conversion not found');
        }

        if (conversion.status !== 'approved') {
            throw new Error('Conversion must be approved before execution');
        }

        const updateData = {
            status: 'executed',
            executedAt: new Date().toISOString(),
            executedBy: userId,
            updatedBy: userId
        };

        if (equityGrantId) {
            updateData.equityGrantId = equityGrantId;
        }

        await this.updateOne({ conversionId }, { $set: updateData });
        return this.findOne({ conversionId });
    },

    /**
     * Cancel a conversion
     * @param {string} conversionId - Conversion ID
     * @param {string} userId - Cancelling user ID
     * @param {string} reason - Cancellation reason
     * @returns {Object} Updated conversion
     */
    async cancel(conversionId, userId, reason) {
        const conversion = await this.findOne({ conversionId });
        if (!conversion) {
            throw new Error('Conversion not found');
        }

        if (conversion.status === 'executed') {
            throw new Error('Cannot cancel an executed conversion');
        }

        await this.updateOne({ conversionId }, {
            $set: {
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancelledBy: userId,
                cancellationReason: reason,
                updatedBy: userId
            }
        });

        return this.findOne({ conversionId });
    },

    /**
     * Find conversions by funding round
     * @param {string} fundingRoundId - Funding round ID
     * @returns {Array} Conversions
     */
    async findByFundingRound(fundingRoundId) {
        return this.find({ fundingRoundId }, { sort: { createdAt: -1 } });
    },

    /**
     * Find conversions by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} Conversions
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Get pending conversions for a round
     * @param {string} fundingRoundId - Funding round ID
     * @returns {Array} Pending conversions
     */
    async getPendingForRound(fundingRoundId) {
        return this.find({ fundingRoundId, status: 'pending' });
    },

    /**
     * Get total shares issued for a round
     * @param {string} fundingRoundId - Funding round ID
     * @returns {number} Total shares
     */
    async getTotalSharesForRound(fundingRoundId) {
        const conversions = await this.find({ fundingRoundId, status: 'executed' });
        return conversions.reduce((total, conv) => total + (conv.sharesIssued || 0), 0);
    },

    /**
     * Calculate conversion terms
     * @param {Object} safeTerms - SAFE terms
     * @param {Object} roundTerms - Round terms
     * @returns {Object} Calculation result
     */
    calculateConversion(safeTerms, roundTerms) {
        const { investmentAmount, valuationCap, discountRate, safeType } = safeTerms;
        const { pricePerShare: seriesPrice, fullyDilutedShares, preMoneyValuation } = roundTerms;

        let capPrice = null;
        let discountPrice = null;
        let effectivePrice;
        let methodUsed;

        // Calculate cap price if valuation cap exists
        if (valuationCap) {
            if (safeType === 'post-money') {
                capPrice = valuationCap / fullyDilutedShares;
            } else {
                // Pre-money SAFE
                capPrice = valuationCap / fullyDilutedShares;
            }
        }

        // Calculate discount price if discount rate exists
        if (discountRate) {
            discountPrice = seriesPrice * (1 - discountRate);
        }

        // Determine effective price (lowest of available options)
        if (safeType === 'mfn') {
            // MFN gets the best terms from any other SAFE
            effectivePrice = seriesPrice;
            methodUsed = 'mfn';
        } else if (capPrice && discountPrice) {
            if (capPrice <= discountPrice) {
                effectivePrice = capPrice;
                methodUsed = 'cap';
            } else {
                effectivePrice = discountPrice;
                methodUsed = 'discount';
            }
        } else if (capPrice) {
            effectivePrice = capPrice;
            methodUsed = 'cap';
        } else if (discountPrice) {
            effectivePrice = discountPrice;
            methodUsed = 'discount';
        } else {
            effectivePrice = seriesPrice;
            methodUsed = 'series_price';
        }

        // Calculate shares issued
        const sharesIssued = Math.floor(investmentAmount / effectivePrice);

        // Calculate ownership percentage (post-conversion)
        const postConversionShares = fullyDilutedShares + sharesIssued;
        const ownershipPercentage = (sharesIssued / postConversionShares) * 100;

        // Calculate savings compared to series price
        const savingsPerShare = seriesPrice - effectivePrice;
        const totalSavings = savingsPerShare * sharesIssued;

        return {
            investmentAmount,
            valuationCap,
            discountRate,
            seriesPrice,
            fullyDilutedShares,
            capPrice,
            discountPrice,
            effectivePrice,
            methodUsed,
            sharesIssued,
            ownershipPercentage,
            priceComparison: {
                capPrice,
                discountPrice,
                seriesPrice,
                savings: totalSavings
            }
        };
    }
};

module.exports = SAFEConversion;
