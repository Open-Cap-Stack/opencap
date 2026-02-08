/**
 * Warrant Model
 * Issue #321: Add Warrant terms data model for 409A compliance
 *
 * Tracks warrant agreements that give holders the right to purchase
 * shares at a predetermined price within a specified time period.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Enum definitions for validation
const WARRANT_TYPES = ['penny', 'standard', 'participating', 'coverage'];
const WARRANT_STATUS = ['outstanding', 'exercised', 'expired', 'cancelled', 'partially_exercised'];
const ANTIDILUTION_TYPES = ['none', 'full_ratchet', 'weighted_average', 'narrow_based'];

// Schema definition for documentation and validation
const warrantSchema = {
    // Core identifiers
    warrantId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },
    name: { type: 'string', required: true },
    description: { type: 'string' },

    // Warrant classification
    warrantType: { type: 'string', enum: WARRANT_TYPES, default: 'standard' },
    status: { type: 'string', enum: WARRANT_STATUS, default: 'outstanding' },

    // Linked entities
    shareClassId: { type: 'string' }, // Share class warrant converts to
    investorId: { type: 'string' }, // Warrant holder
    financingRoundId: { type: 'string' }, // Associated financing round

    // Share terms
    numberOfShares: { type: 'number', required: true, min: 0 },
    exercisedShares: { type: 'number', default: 0, min: 0 },
    remainingShares: { type: 'number', default: 0, min: 0 },

    // Pricing
    exercisePrice: { type: 'number', required: true, min: 0 }, // Strike price per share
    purchasePrice: { type: 'number', default: 0, min: 0 }, // Price paid for the warrant itself

    // Dates
    issueDate: { type: 'date', required: true },
    expirationDate: { type: 'date', required: true },
    vestingStartDate: { type: 'date' },
    vestingEndDate: { type: 'date' },

    // Vesting (if applicable)
    vestingSchedule: { type: 'string' }, // e.g., '4-year monthly' or 'immediate'
    cliffMonths: { type: 'number', default: 0, min: 0 },
    totalVestingMonths: { type: 'number', default: 0, min: 0 },
    vestedPercentage: { type: 'number', default: 100, min: 0, max: 100 },

    // Exercise mechanics
    cashlessExercise: { type: 'boolean', default: false }, // Net exercise allowed
    partialExercise: { type: 'boolean', default: true }, // Can exercise portion
    transferable: { type: 'boolean', default: false }, // Can transfer to another party
    automaticExercise: { type: 'boolean', default: false }, // Auto-exercise on expiration if ITM

    // Antidilution protection
    antidilutionProtection: { type: 'string', enum: ANTIDILUTION_TYPES, default: 'none' },
    adjustedExercisePrice: { type: 'number', min: 0 }, // After antidilution adjustments

    // 409A valuation impact
    currentFMV: { type: 'number', min: 0 }, // Current fair market value per share
    intrinsicValue: { type: 'number', min: 0 }, // (FMV - Exercise Price) * Shares
    blackScholesValue: { type: 'number', min: 0 }, // Calculated warrant value
    dilutiveImpact: { type: 'number', min: 0 }, // Fully diluted share impact

    // Exercise history
    exerciseHistory: { type: 'array', default: [] }, // [{date, shares, pricePerShare, method}]

    // Documentation
    warrantAgreementUrl: { type: 'string' },
    boardApprovalDate: { type: 'date' },
    boardApprovalId: { type: 'string' },

    // Metadata
    notes: { type: 'string' },
    tags: { type: 'array', default: [] },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('warrants', warrantSchema);

// Extended Warrant model with business logic
const Warrant = {
    ...baseModel,
    tableName: 'warrants',
    schema: warrantSchema,

    // Expose enums for validation
    WARRANT_TYPES,
    WARRANT_STATUS,
    ANTIDILUTION_TYPES,

    /**
     * Create a new warrant with defaults and validation
     * @param {Object} data - Warrant data
     * @returns {Object} Created warrant
     */
    async create(data) {
        // Validate required fields
        if (!data.companyId) {
            throw new Error('Company ID is required');
        }
        if (!data.name) {
            throw new Error('Warrant name is required');
        }
        if (data.numberOfShares === undefined || data.numberOfShares < 0) {
            throw new Error('Number of shares is required and cannot be negative');
        }
        if (data.exercisePrice === undefined || data.exercisePrice < 0) {
            throw new Error('Exercise price is required and cannot be negative');
        }
        if (!data.issueDate) {
            throw new Error('Issue date is required');
        }
        if (!data.expirationDate) {
            throw new Error('Expiration date is required');
        }

        // Validate dates
        const issueDate = new Date(data.issueDate);
        const expirationDate = new Date(data.expirationDate);
        if (expirationDate <= issueDate) {
            throw new Error('Expiration date must be after issue date');
        }

        // Validate enums
        if (data.warrantType && !WARRANT_TYPES.includes(data.warrantType)) {
            throw new Error(`Invalid warrant type. Must be one of: ${WARRANT_TYPES.join(', ')}`);
        }
        if (data.status && !WARRANT_STATUS.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${WARRANT_STATUS.join(', ')}`);
        }
        if (data.antidilutionProtection && !ANTIDILUTION_TYPES.includes(data.antidilutionProtection)) {
            throw new Error(`Invalid antidilution protection. Must be one of: ${ANTIDILUTION_TYPES.join(', ')}`);
        }

        // Generate warrantId if not provided
        if (!data.warrantId) {
            data.warrantId = `wrt_${uuidv4()}`;
        }

        // Set defaults
        const dataWithDefaults = {
            warrantType: 'standard',
            status: 'outstanding',
            exercisedShares: 0,
            remainingShares: data.numberOfShares,
            purchasePrice: 0,
            cliffMonths: 0,
            totalVestingMonths: 0,
            vestedPercentage: 100,
            cashlessExercise: false,
            partialExercise: true,
            transferable: false,
            automaticExercise: false,
            antidilutionProtection: 'none',
            exerciseHistory: [],
            tags: [],
            ...data
        };

        return baseModel.create.call(baseModel, dataWithDefaults);
    },

    /**
     * Find warrant by warrantId
     * @param {string} warrantId - Warrant ID
     * @returns {Object|null} Warrant or null
     */
    async findByWarrantId(warrantId) {
        return baseModel.findOne.call(baseModel, { warrantId });
    },

    /**
     * Find all warrants for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Warrants for the company
     */
    async findByCompany(companyId) {
        return baseModel.find.call(baseModel, { companyId });
    },

    /**
     * Find outstanding warrants for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Outstanding warrants
     */
    async findOutstanding(companyId) {
        const warrants = await baseModel.find.call(baseModel, { companyId });
        return warrants.filter(w => w.status === 'outstanding' || w.status === 'partially_exercised');
    },

    /**
     * Find warrants by investor
     * @param {string} investorId - Investor ID
     * @returns {Array} Warrants for the investor
     */
    async findByInvestor(investorId) {
        return baseModel.find.call(baseModel, { investorId });
    },

    /**
     * Find warrants by financing round
     * @param {string} financingRoundId - Financing round ID
     * @returns {Array} Warrants for the round
     */
    async findByFinancingRound(financingRoundId) {
        return baseModel.find.call(baseModel, { financingRoundId });
    },

    /**
     * Find warrants expiring within a date range
     * @param {string} companyId - Company ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Array} Warrants expiring in range
     */
    async findExpiringBetween(companyId, startDate, endDate) {
        const warrants = await baseModel.find.call(baseModel, { companyId });
        return warrants.filter(w => {
            const expDate = new Date(w.expirationDate);
            return expDate >= startDate && expDate <= endDate &&
                   (w.status === 'outstanding' || w.status === 'partially_exercised');
        });
    },

    /**
     * Check if warrant is in the money
     * @param {Object} warrant - Warrant object
     * @param {number} currentFMV - Current fair market value per share
     * @returns {boolean} True if in the money
     */
    isInTheMoney(warrant, currentFMV) {
        const exercisePrice = warrant.adjustedExercisePrice || warrant.exercisePrice;
        return currentFMV > exercisePrice;
    },

    /**
     * Calculate intrinsic value of warrant
     * @param {Object} warrant - Warrant object
     * @param {number} currentFMV - Current fair market value per share
     * @returns {number} Intrinsic value
     */
    calculateIntrinsicValue(warrant, currentFMV) {
        const exercisePrice = warrant.adjustedExercisePrice || warrant.exercisePrice;
        const remainingShares = warrant.remainingShares || warrant.numberOfShares;

        if (currentFMV <= exercisePrice) {
            return 0;
        }

        return (currentFMV - exercisePrice) * remainingShares;
    },

    /**
     * Calculate dilutive impact of all warrants for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Dilution summary
     */
    async calculateDilutiveImpact(companyId) {
        const warrants = await this.findOutstanding(companyId);

        const totalShares = warrants.reduce((sum, w) => sum + (w.remainingShares || w.numberOfShares), 0);
        const weightedExercisePrice = warrants.length > 0
            ? warrants.reduce((sum, w) => {
                const shares = w.remainingShares || w.numberOfShares;
                return sum + (w.exercisePrice * shares);
            }, 0) / totalShares
            : 0;

        return {
            totalWarrants: warrants.length,
            totalShares,
            weightedAverageExercisePrice: weightedExercisePrice,
            warrants: warrants.map(w => ({
                warrantId: w.warrantId,
                name: w.name,
                shares: w.remainingShares || w.numberOfShares,
                exercisePrice: w.exercisePrice,
                expirationDate: w.expirationDate
            }))
        };
    },

    /**
     * Exercise shares from a warrant
     * @param {string} warrantId - Warrant ID
     * @param {number} sharesToExercise - Number of shares to exercise
     * @param {Object} exerciseDetails - { pricePerShare, method: 'cash'|'cashless', date }
     * @returns {Object} Updated warrant
     */
    async exerciseShares(warrantId, sharesToExercise, exerciseDetails = {}) {
        const warrant = await this.findByWarrantId(warrantId);

        if (!warrant) {
            throw new Error('Warrant not found');
        }

        if (warrant.status === 'exercised' || warrant.status === 'expired' || warrant.status === 'cancelled') {
            throw new Error(`Cannot exercise warrant with status: ${warrant.status}`);
        }

        const remainingShares = warrant.remainingShares || warrant.numberOfShares;

        if (sharesToExercise > remainingShares) {
            throw new Error(`Cannot exercise ${sharesToExercise} shares. Only ${remainingShares} remaining.`);
        }

        if (!warrant.partialExercise && sharesToExercise < remainingShares) {
            throw new Error('Partial exercise not allowed for this warrant');
        }

        // Check expiration
        if (new Date(warrant.expirationDate) < new Date()) {
            throw new Error('Warrant has expired');
        }

        const newExercisedShares = (warrant.exercisedShares || 0) + sharesToExercise;
        const newRemainingShares = remainingShares - sharesToExercise;
        const newStatus = newRemainingShares === 0 ? 'exercised' : 'partially_exercised';

        const exerciseRecord = {
            date: exerciseDetails.date || new Date(),
            shares: sharesToExercise,
            pricePerShare: exerciseDetails.pricePerShare || warrant.exercisePrice,
            method: exerciseDetails.method || 'cash'
        };

        const exerciseHistory = [...(warrant.exerciseHistory || []), exerciseRecord];

        return baseModel.findOneAndUpdate.call(baseModel,
            { warrantId },
            {
                exercisedShares: newExercisedShares,
                remainingShares: newRemainingShares,
                status: newStatus,
                exerciseHistory,
                updatedAt: new Date()
            }
        );
    },

    /**
     * Check if warrant is expired
     * @param {Object} warrant - Warrant object
     * @returns {boolean} True if expired
     */
    isExpired(warrant) {
        return new Date(warrant.expirationDate) < new Date();
    },

    /**
     * Get time to expiration in days
     * @param {Object} warrant - Warrant object
     * @returns {number} Days until expiration (negative if expired)
     */
    getDaysToExpiration(warrant) {
        const now = new Date();
        const expiration = new Date(warrant.expirationDate);
        const diffTime = expiration - now;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },

    /**
     * Search warrants by text
     * @param {string} searchText - Text to search
     * @returns {Array} Matching warrants
     */
    async search(searchText) {
        const results = await baseModel.find.call(baseModel, {});
        const lowerSearch = searchText.toLowerCase();
        return results.filter(w =>
            w.name?.toLowerCase().includes(lowerSearch) ||
            w.description?.toLowerCase().includes(lowerSearch) ||
            w.warrantId?.toLowerCase().includes(lowerSearch)
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

module.exports = Warrant;
