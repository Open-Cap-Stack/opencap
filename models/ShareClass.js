/**
 * ShareClass Model
 * Migrated: ZeroDB Migration - Issue #175
 * Enhanced: 409A Compliance - Issue #320
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Enum definitions for validation
const CLASS_TYPES = ['common', 'preferred', 'restricted_common', 'founders'];
const ANTIDILUTION_TYPES = ['none', 'full_ratchet', 'weighted_average', 'narrow_based'];

// Schema definition for documentation and validation
const shareClassSchema = {
    // Core identifiers
    shareClassId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string', required: true },

    // Classification
    classType: { type: 'string', enum: CLASS_TYPES, default: 'common' },
    subType: { type: 'string' }, // e.g., 'Series A Preferred', 'Class A Common'

    // Pricing
    parValue: { type: 'number', default: 0.001, min: 0 },
    pricePerShare: { type: 'number', min: 0 }, // Fair market value / issue price
    votesPerShare: { type: 'number', default: 1, min: 0 },

    // Share counts
    authorizedShares: { type: 'number', required: true, min: 0 },
    outstandingShares: { type: 'number', default: 0, min: 0 }, // Currently held by stockholders
    issuedShares: { type: 'number', default: 0, min: 0 }, // Total ever issued (includes repurchased)
    reservedShares: { type: 'number', default: 0, min: 0 }, // Reserved for options/warrants
    dilutedShares: { type: 'number', required: true, min: 0 },

    // Financial metrics (legacy fields)
    amountRaised: { type: 'number', required: true, min: 0 },
    ownershipPercentage: { type: 'number', required: true, min: 0, max: 100 },

    // Preferred terms (applicable when classType is 'preferred')
    liquidationPreference: { type: 'number', min: 0 }, // Multiple (e.g., 1x, 2x)
    participatingPreferred: { type: 'boolean', default: false },
    participationCap: { type: 'number', min: 0 }, // Cap multiple if participating
    conversionRatio: { type: 'number', default: 1, min: 0 }, // Conversion to common
    antidilutionProtection: { type: 'string', enum: ANTIDILUTION_TYPES, default: 'none' },
    dividendRate: { type: 'number', min: 0, max: 100 }, // Annual dividend rate (percentage)
    cumulativeDividends: { type: 'boolean', default: false },

    // Rights
    votingRights: { type: 'boolean', default: true },
    preemptiveRights: { type: 'boolean', default: false },
    redemptionRights: { type: 'boolean', default: false },
    conversionRights: { type: 'boolean', default: true }, // Convertible to common

    // Seniority (for waterfall analysis)
    seniorityRank: { type: 'number', default: 1, min: 1 }, // Lower = higher priority in liquidation
    pariPassuGroup: { type: 'string' }, // Groups classes that share equally

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('securities', shareClassSchema);

// Extended ShareClass model with business logic
const ShareClass = {
    ...baseModel,
    tableName: 'securities',
    schema: shareClassSchema,

    // Expose enums for validation
    CLASS_TYPES,
    ANTIDILUTION_TYPES,

    /**
     * Create a new share class with defaults
     * @param {Object} data - ShareClass data
     * @returns {Object} Created share class
     */
    async create(data) {
        // Validate required fields
        if (!data.companyId) {
            throw new Error('Company ID is required');
        }
        if (!data.name) {
            throw new Error('Share class name is required');
        }
        if (!data.description) {
            throw new Error('Description is required');
        }
        if (data.amountRaised === undefined || data.amountRaised < 0) {
            throw new Error('Amount raised is required and cannot be negative');
        }
        if (data.ownershipPercentage === undefined || data.ownershipPercentage < 0 || data.ownershipPercentage > 100) {
            throw new Error('Ownership percentage must be between 0 and 100');
        }
        if (data.dilutedShares === undefined || data.dilutedShares < 0) {
            throw new Error('Diluted shares is required and cannot be negative');
        }
        if (data.authorizedShares === undefined || data.authorizedShares < 0) {
            throw new Error('Authorized shares is required and cannot be negative');
        }

        // Validate enums
        if (data.classType && !CLASS_TYPES.includes(data.classType)) {
            throw new Error(`Invalid class type. Must be one of: ${CLASS_TYPES.join(', ')}`);
        }
        if (data.antidilutionProtection && !ANTIDILUTION_TYPES.includes(data.antidilutionProtection)) {
            throw new Error(`Invalid antidilution protection. Must be one of: ${ANTIDILUTION_TYPES.join(', ')}`);
        }

        // Generate shareClassId if not provided
        if (!data.shareClassId) {
            data.shareClassId = `sc_${uuidv4()}`;
        }

        // Set defaults for new fields
        const dataWithDefaults = {
            classType: 'common',
            parValue: 0.001,
            votesPerShare: 1,
            outstandingShares: 0,
            issuedShares: 0,
            reservedShares: 0,
            conversionRatio: 1,
            antidilutionProtection: 'none',
            participatingPreferred: false,
            cumulativeDividends: false,
            votingRights: true,
            preemptiveRights: false,
            redemptionRights: false,
            conversionRights: true,
            seniorityRank: 1,
            ...data
        };

        return baseModel.create.call(baseModel, dataWithDefaults);
    },

    /**
     * Find share class by shareClassId
     * @param {string} shareClassId - ShareClass ID
     * @returns {Object|null} ShareClass or null
     */
    async findByShareClassId(shareClassId) {
        return baseModel.findOne.call(baseModel, { shareClassId });
    },

    /**
     * Find all share classes for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Share classes for the company
     */
    async findByCompany(companyId) {
        return baseModel.find.call(baseModel, { companyId });
    },

    /**
     * Find share classes by type for a company
     * @param {string} companyId - Company ID
     * @param {string} classType - Class type (common, preferred, etc.)
     * @returns {Array} Share classes of the given type
     */
    async findByType(companyId, classType) {
        const allClasses = await baseModel.find.call(baseModel, { companyId });
        return allClasses.filter(sc => sc.classType === classType);
    },

    /**
     * Find share classes by name
     * @param {string} name - ShareClass name
     * @returns {Array} Share classes with given name
     */
    async findByName(name) {
        return baseModel.find.call(baseModel, { name });
    },

    /**
     * Find preferred share classes for a company sorted by seniority
     * @param {string} companyId - Company ID
     * @returns {Array} Preferred share classes sorted by seniority rank
     */
    async findPreferredByCompany(companyId) {
        const allClasses = await baseModel.find.call(baseModel, { companyId });
        return allClasses
            .filter(sc => sc.classType === 'preferred')
            .sort((a, b) => (a.seniorityRank || 1) - (b.seniorityRank || 1));
    },

    /**
     * Calculate conversion rate for a share class
     * @param {Object} shareClass - ShareClass object
     * @returns {number} Conversion rate
     */
    getConversionRate(shareClass) {
        if (shareClass.dilutedShares > 0) {
            return parseFloat((shareClass.authorizedShares / shareClass.dilutedShares).toFixed(2));
        }
        return 0;
    },

    /**
     * Calculate liquidation payout for a share class
     * @param {Object} shareClass - ShareClass object
     * @param {number} availableProceeds - Available liquidation proceeds
     * @param {number} totalShares - Total outstanding shares of this class
     * @returns {Object} Liquidation payout details
     */
    calculateLiquidationPayout(shareClass, availableProceeds, totalShares) {
        const pricePerShare = shareClass.pricePerShare || 0;
        const liquidationPreference = shareClass.liquidationPreference || 1;
        const participationCap = shareClass.participationCap;
        const participatingPreferred = shareClass.participatingPreferred || false;

        // Calculate preference amount
        const preferenceAmount = pricePerShare * liquidationPreference * totalShares;

        // If not enough proceeds for preference
        if (availableProceeds < preferenceAmount) {
            return {
                preferenceAmount: availableProceeds,
                participationAmount: 0,
                totalPayout: availableProceeds,
                payoutPerShare: totalShares > 0 ? availableProceeds / totalShares : 0,
                fullPreferencePaid: false
            };
        }

        // Calculate participation if applicable
        let participationAmount = 0;
        if (participatingPreferred) {
            const remainingProceeds = availableProceeds - preferenceAmount;
            const proRataShare = totalShares > 0 ? remainingProceeds : 0;

            if (participationCap) {
                const maxParticipation = pricePerShare * participationCap * totalShares;
                participationAmount = Math.min(proRataShare, maxParticipation);
            } else {
                participationAmount = proRataShare;
            }
        }

        const totalPayout = preferenceAmount + participationAmount;

        return {
            preferenceAmount,
            participationAmount,
            totalPayout,
            payoutPerShare: totalShares > 0 ? totalPayout / totalShares : 0,
            fullPreferencePaid: true
        };
    },

    /**
     * Calculate fully diluted share count for a company
     * @param {string} companyId - Company ID
     * @returns {number} Fully diluted share count
     */
    async calculateFullyDiluted(companyId) {
        const classes = await this.findByCompany(companyId);
        return classes.reduce((total, sc) => {
            const outstanding = sc.outstandingShares || 0;
            const reserved = sc.reservedShares || 0;
            return total + outstanding + reserved;
        }, 0);
    },

    /**
     * Get ownership breakdown by class type for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Ownership breakdown by class type
     */
    async getOwnershipBreakdown(companyId) {
        const classes = await this.findByCompany(companyId);
        const fullyDiluted = await this.calculateFullyDiluted(companyId);

        const breakdown = {};
        for (const classType of CLASS_TYPES) {
            const classShares = classes
                .filter(sc => sc.classType === classType)
                .reduce((sum, sc) => sum + (sc.outstandingShares || 0), 0);

            breakdown[classType] = {
                shares: classShares,
                percentage: fullyDiluted > 0 ? (classShares / fullyDiluted) * 100 : 0
            };
        }

        return {
            fullyDiluted,
            breakdown
        };
    },

    /**
     * Validate shares (diluted <= authorized)
     * @param {Object} shareClass - ShareClass object
     * @returns {boolean} True if valid
     */
    validateShares(shareClass) {
        return shareClass.dilutedShares <= shareClass.authorizedShares;
    },

    /**
     * Search share classes by text
     * @param {string} searchText - Text to search
     * @returns {Array} Matching share classes
     */
    async search(searchText) {
        const results = await baseModel.find.call(baseModel, {});
        const lowerSearch = searchText.toLowerCase();
        return results.filter(sc =>
            sc.name?.toLowerCase().includes(lowerSearch) ||
            sc.description?.toLowerCase().includes(lowerSearch) ||
            sc.shareClassId?.toLowerCase().includes(lowerSearch) ||
            sc.subType?.toLowerCase().includes(lowerSearch)
        );
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

module.exports = ShareClass;
