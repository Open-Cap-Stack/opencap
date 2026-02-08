/**
 * Investor Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 * Enhanced: 409A Compliance - Issue #323
 *
 * Manages investor information including identity, investments, rights, and governance.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Expanded investor types for 409A compliance
const INVESTOR_TYPES = [
    'angel',
    'venture_capital',
    'private_equity',
    'family_office',
    'strategic',
    'institutional',
    'corporate',
    'crowdfunding',
    'employee',
    'founder'
];

// Legacy investor types for backward compatibility
const LEGACY_INVESTOR_TYPES = ['Angel', 'Venture Capital'];

// Entity types
const ENTITY_TYPES = ['individual', 'corporation', 'llc', 'partnership', 'trust', 'fund'];

// Accreditation methods
const ACCREDITATION_METHODS = ['income', 'net_worth', 'professional', 'entity'];

const investorSchema = {
    // Core identifiers
    investorId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },

    // Identity & Contact
    name: { type: 'string', required: true },
    email: { type: 'string' },
    phone: { type: 'string' },
    address: { type: 'string' },
    entityType: { type: 'string', enum: ENTITY_TYPES, default: 'individual' },

    // Classification
    investorType: { type: 'string', required: true, enum: [...INVESTOR_TYPES, ...LEGACY_INVESTOR_TYPES] },

    // Regulatory / Accreditation
    accreditedInvestor: { type: 'boolean', default: false },
    accreditationMethod: { type: 'string', enum: ACCREDITATION_METHODS },
    accreditationVerifiedDate: { type: 'date' },
    accreditationExpiryDate: { type: 'date' },
    qibStatus: { type: 'boolean', default: false }, // Qualified Institutional Buyer

    // Board & Governance
    boardSeat: { type: 'boolean', default: false },
    boardObserverRights: { type: 'boolean', default: false },
    votingRights: { type: 'boolean', default: true },

    // Rights Linkage
    investorRightsId: { type: 'string' }, // Link to InvestorRights model
    preferredTermsIds: { type: 'array', default: [] }, // Links to PreferredTerms for each round

    // Legacy fields (for backward compatibility)
    investmentAmount: { type: 'number', default: 0 },
    equityPercentage: { type: 'number', default: 0 },
    relatedFundraisingRound: { type: 'string' },

    // Multi-Round Tracking
    investments: { type: 'array', default: [] }, // [{roundId, amount, sharesAcquired, pricePerShare, date, shareClassId}]
    totalInvested: { type: 'number', default: 0 },
    totalShares: { type: 'number', default: 0 },

    // Pro-rata and participation rights
    proRataRights: { type: 'boolean', default: false },
    majorInvestorThreshold: { type: 'number', min: 0 }, // Amount for major investor status
    informationRights: { type: 'boolean', default: false },
    coSaleRights: { type: 'boolean', default: false },
    dragAlongObligations: { type: 'boolean', default: false },

    // Documentation
    investorAgreementUrl: { type: 'string' },
    sideLetterUrl: { type: 'string' },

    // Metadata
    notes: { type: 'string' },
    tags: { type: 'array', default: [] },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
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

    if (!data.companyId) {
        errors.push('companyId is required');
    }

    if (!data.name) {
        errors.push('name is required');
    }

    if (!data.investorType) {
        errors.push('investorType is required');
    } else if (![...INVESTOR_TYPES, ...LEGACY_INVESTOR_TYPES].includes(data.investorType)) {
        errors.push(`investorType must be one of: ${INVESTOR_TYPES.join(', ')}`);
    }

    if (data.entityType && !ENTITY_TYPES.includes(data.entityType)) {
        errors.push(`entityType must be one of: ${ENTITY_TYPES.join(', ')}`);
    }

    if (data.accreditationMethod && !ACCREDITATION_METHODS.includes(data.accreditationMethod)) {
        errors.push(`accreditationMethod must be one of: ${ACCREDITATION_METHODS.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const Investor = {
    ...baseModel,
    tableName: 'stakeholders',
    schema: investorSchema,

    // Expose enums
    INVESTOR_TYPES,
    LEGACY_INVESTOR_TYPES,
    ENTITY_TYPES,
    ACCREDITATION_METHODS,

    /**
     * Create a new investor with validation
     * @param {Object} data - Investor data
     * @returns {Object} Created investor
     */
    async create(data) {
        // Generate investorId if not provided
        if (!data.investorId) {
            data.investorId = `inv_${uuidv4()}`;
        }

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

        // Set defaults
        const dataWithDefaults = {
            entityType: 'individual',
            accreditedInvestor: false,
            qibStatus: false,
            boardSeat: false,
            boardObserverRights: false,
            votingRights: true,
            preferredTermsIds: [],
            investmentAmount: 0,
            equityPercentage: 0,
            investments: [],
            totalInvested: 0,
            totalShares: 0,
            proRataRights: false,
            informationRights: false,
            coSaleRights: false,
            dragAlongObligations: false,
            tags: [],
            ...data,
            _type: 'investor'
        };

        // Calculate totals from investments if provided
        if (dataWithDefaults.investments && dataWithDefaults.investments.length > 0) {
            dataWithDefaults.totalInvested = dataWithDefaults.investments.reduce(
                (sum, inv) => sum + (inv.amount || 0), 0
            );
            dataWithDefaults.totalShares = dataWithDefaults.investments.reduce(
                (sum, inv) => sum + (inv.sharesAcquired || 0), 0
            );
        }

        return baseModel.create(dataWithDefaults);
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
     * Find all investors for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Investors for the company
     */
    async findByCompany(companyId) {
        return baseModel.find({ companyId, _type: 'investor' });
    },

    /**
     * Find accredited investors for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Accredited investors
     */
    async findAccredited(companyId) {
        const investors = await baseModel.find({ companyId, _type: 'investor' });
        return investors.filter(inv => inv.accreditedInvestor === true);
    },

    /**
     * Find investors with board seats
     * @param {string} companyId - Company ID
     * @returns {Array} Investors with board seats
     */
    async findBoardMembers(companyId) {
        const investors = await baseModel.find({ companyId, _type: 'investor' });
        return investors.filter(inv => inv.boardSeat === true);
    },

    /**
     * Find investors by type
     * @param {string} investorType - Investor type
     * @param {Object} options - Query options
     * @returns {Array} Investors of type
     */
    async findByType(investorType, options = {}) {
        const allTypes = [...INVESTOR_TYPES, ...LEGACY_INVESTOR_TYPES];
        if (!allTypes.includes(investorType)) {
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
        // Check both legacy field and investments array
        const allInvestors = await baseModel.find({ _type: 'investor' }, options);
        return allInvestors.filter(inv =>
            inv.relatedFundraisingRound === roundId ||
            (inv.investments && inv.investments.some(i => i.roundId === roundId))
        );
    },

    /**
     * Find major investors (above threshold)
     * @param {string} companyId - Company ID
     * @param {number} threshold - Investment threshold
     * @returns {Array} Major investors
     */
    async findMajorInvestors(companyId, threshold) {
        const investors = await this.findByCompany(companyId);
        return investors.filter(inv => (inv.totalInvested || inv.investmentAmount || 0) >= threshold);
    },

    /**
     * Add investment to investor
     * @param {string} investorId - Investor ID
     * @param {Object} investment - Investment details {roundId, amount, sharesAcquired, pricePerShare, date, shareClassId}
     * @returns {Object} Updated investor
     */
    async addInvestment(investorId, investment) {
        const investor = await this.findByInvestorId(investorId);
        if (!investor) {
            throw new Error('Investor not found');
        }

        const investments = [...(investor.investments || []), {
            ...investment,
            date: investment.date || new Date()
        }];

        const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const totalShares = investments.reduce((sum, inv) => sum + (inv.sharesAcquired || 0), 0);

        await baseModel.updateOne(
            { investorId, _type: 'investor' },
            {
                $set: {
                    investments,
                    totalInvested,
                    totalShares,
                    updatedAt: new Date()
                }
            }
        );

        return this.findByInvestorId(investorId);
    },

    /**
     * Get investment summary by company
     * @param {string} companyId - Company ID
     * @returns {Object} Investment summary
     */
    async getInvestmentSummary(companyId) {
        const investors = await this.findByCompany(companyId);

        const summary = {
            totalInvestors: investors.length,
            totalInvested: 0,
            totalShares: 0,
            byType: {},
            accreditedCount: 0,
            boardMembers: 0
        };

        for (const inv of investors) {
            summary.totalInvested += inv.totalInvested || inv.investmentAmount || 0;
            summary.totalShares += inv.totalShares || 0;

            const type = inv.investorType || 'unknown';
            if (!summary.byType[type]) {
                summary.byType[type] = { count: 0, invested: 0 };
            }
            summary.byType[type].count++;
            summary.byType[type].invested += inv.totalInvested || inv.investmentAmount || 0;

            if (inv.accreditedInvestor) summary.accreditedCount++;
            if (inv.boardSeat) summary.boardMembers++;
        }

        return summary;
    },

    /**
     * Get total investment amount by type
     * @param {string} investorType - Investor type
     * @returns {number} Total investment amount
     */
    async getTotalInvestmentByType(investorType) {
        const investors = await this.findByType(investorType);
        return investors.reduce((total, inv) =>
            total + (inv.totalInvested || inv.investmentAmount || 0), 0
        );
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
        // Validate update data
        const allTypes = [...INVESTOR_TYPES, ...LEGACY_INVESTOR_TYPES];
        if (updateData.investorType && !allTypes.includes(updateData.investorType)) {
            throw new Error(`Invalid investorType: ${updateData.investorType}`);
        }
        if (updateData.entityType && !ENTITY_TYPES.includes(updateData.entityType)) {
            throw new Error(`Invalid entityType: ${updateData.entityType}`);
        }
        if (updateData.accreditationMethod && !ACCREDITATION_METHODS.includes(updateData.accreditationMethod)) {
            throw new Error(`Invalid accreditationMethod: ${updateData.accreditationMethod}`);
        }

        await baseModel.updateOne(
            { investorId, _type: 'investor' },
            { $set: { ...updateData, updatedAt: new Date() } }
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
    },

    /**
     * Search investors by text
     * @param {string} searchText - Text to search
     * @returns {Array} Matching investors
     */
    async search(searchText) {
        const results = await baseModel.find({ _type: 'investor' });
        const lowerSearch = searchText.toLowerCase();
        return results.filter(inv =>
            inv.name?.toLowerCase().includes(lowerSearch) ||
            inv.email?.toLowerCase().includes(lowerSearch) ||
            inv.investorId?.toLowerCase().includes(lowerSearch)
        );
    }
};

module.exports = Investor;
