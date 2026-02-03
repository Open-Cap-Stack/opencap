/**
 * ASC 718 Expense Model
 * Feature: Issue #73 - ASC 718 Reporting
 * ASC 718: Stock-based compensation expense recognition
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Constants
const GRANT_TYPES = ['iso', 'nso', 'rsu', 'rsa', 'sar', 'phantom'];
const VALUATION_METHODS = ['black_scholes', 'binomial', 'monte_carlo', 'intrinsic'];
const RECOGNITION_METHODS = ['straight_line', 'graded', 'accelerated'];
const STATUSES = ['active', 'fully_recognized', 'forfeited', 'modified', 'cancelled'];

// Schema definition (for documentation)
const schema = {
    _id: { type: 'string', required: true },
    expenseId: { type: 'string', unique: true },
    companyId: { type: 'string', required: true },
    grantId: { type: 'string', required: true, unique: true },
    grantType: { type: 'string', enum: GRANT_TYPES, required: true },
    employeeId: { type: 'string', required: true },
    employeeName: { type: 'string' },
    grantDetails: {
        grantDate: { type: 'date', required: true },
        vestingStartDate: { type: 'date', required: true },
        vestingEndDate: { type: 'date', required: true },
        vestingPeriodMonths: { type: 'number', required: true },
        cliffMonths: { type: 'number', default: 0 },
        totalShares: { type: 'number', required: true },
        exercisePrice: { type: 'number' },
        vestingSchedule: { type: 'string' }
    },
    fairValueInputs: {
        stockPrice: { type: 'number', required: true },
        exercisePrice: { type: 'number' },
        expectedTerm: { type: 'number' },
        volatility: { type: 'number' },
        riskFreeRate: { type: 'number' },
        dividendYield: { type: 'number', default: 0 },
        valuationMethod: { type: 'string', enum: VALUATION_METHODS, default: 'black_scholes' }
    },
    fairValue: {
        perShare: { type: 'number', required: true },
        total: { type: 'number', required: true },
        calculatedAt: { type: 'date' }
    },
    recognition: {
        method: { type: 'string', enum: RECOGNITION_METHODS, default: 'straight_line' },
        startDate: { type: 'date', required: true },
        endDate: { type: 'date', required: true },
        totalExpense: { type: 'number', required: true },
        recognizedToDate: { type: 'number', default: 0 },
        remainingExpense: { type: 'number' }
    },
    expenseSchedule: { type: 'array', default: [] },
    modifications: { type: 'array', default: [] },
    forfeitures: {
        estimatedRate: { type: 'number', default: 0 },
        actualForfeitures: { type: 'number', default: 0 },
        forfeitureAdjustment: { type: 'number', default: 0 }
    },
    status: { type: 'string', enum: STATUSES, default: 'active' },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' },
    lastCalculatedAt: { type: 'date' },
    notes: { type: 'string' },
    metadata: { type: 'object', default: {} },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

/**
 * Calculate period expense based on vesting schedule
 * @param {Object} doc - Expense document
 * @param {Date} periodStart - Period start date
 * @param {Date} periodEnd - Period end date
 * @returns {number} Expense for the period
 */
const calculatePeriodExpense = (doc, periodStart, periodEnd) => {
    if (doc.status === 'forfeited' || doc.status === 'cancelled') {
        return 0;
    }

    const vestStart = new Date(doc.recognition.startDate);
    const vestEnd = new Date(doc.recognition.endDate);
    const pStart = new Date(periodStart);
    const pEnd = new Date(periodEnd);

    // If period is outside vesting window
    if (pEnd < vestStart || pStart > vestEnd) {
        return 0;
    }

    // Calculate overlap
    const effectiveStart = pStart > vestStart ? pStart : vestStart;
    const effectiveEnd = pEnd < vestEnd ? pEnd : vestEnd;

    // Total vesting duration in days
    const totalDays = (vestEnd - vestStart) / (1000 * 60 * 60 * 24);
    const periodDays = (effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24);

    // Using straight-line method by default
    // For graded vesting, would need more complex calculation
    return (doc.recognition.totalExpense / totalDays) * periodDays;
};

/**
 * Get percent recognized (virtual)
 * @param {Object} doc - Document
 * @returns {number} Percent recognized
 */
const getPercentRecognized = (doc) => {
    if (!doc.recognition || doc.recognition.totalExpense === 0) return 100;
    return Math.round((doc.recognition.recognizedToDate / doc.recognition.totalExpense) * 100);
};

/**
 * Get months remaining (virtual)
 * @param {Object} doc - Document
 * @returns {number} Months remaining
 */
const getMonthsRemaining = (doc) => {
    if (!doc.recognition) return 0;
    const now = new Date();
    const endDate = new Date(doc.recognition.endDate);
    if (now >= endDate) return 0;

    const diffTime = endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
};

// Create base model
const baseModel = createModel('asc718_expenses', schema);

// Extended model with custom methods
const ASC718Expense = {
    ...baseModel,

    // Expose constants
    GRANT_TYPES,
    VALUATION_METHODS,
    RECOGNITION_METHODS,
    STATUSES,

    /**
     * Create a new ASC 718 expense record
     * @param {Object} data - Expense data
     * @returns {Object} Created expense
     */
    async create(data) {
        const expenseId = data.expenseId || `asc718_${uuidv4()}`;

        // Calculate remaining expense
        const recognizedToDate = data.recognition?.recognizedToDate || 0;
        const totalExpense = data.recognition?.totalExpense || 0;
        const remainingExpense = totalExpense - recognizedToDate;

        // Determine status
        let status = data.status || 'active';
        if (recognizedToDate >= totalExpense && totalExpense > 0) {
            status = 'fully_recognized';
        }

        // Prepare document
        const expenseData = {
            ...data,
            expenseId,
            recognition: {
                ...data.recognition,
                remainingExpense
            },
            fairValue: {
                ...data.fairValue,
                calculatedAt: data.fairValue?.calculatedAt || new Date().toISOString()
            },
            status,
            expenseSchedule: data.expenseSchedule || [],
            modifications: data.modifications || [],
            forfeitures: {
                estimatedRate: 0,
                actualForfeitures: 0,
                forfeitureAdjustment: 0,
                ...data.forfeitures
            },
            metadata: data.metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return baseModel.create(expenseData);
    },

    /**
     * Update with recalculated remaining expense
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Update result
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;
        const existingDoc = await baseModel.findOne(query);

        if (existingDoc && updateData.recognition) {
            const recognition = { ...existingDoc.recognition, ...updateData.recognition };
            recognition.remainingExpense = recognition.totalExpense - recognition.recognizedToDate;

            // Update status if fully recognized
            if (recognition.recognizedToDate >= recognition.totalExpense) {
                updateData.status = 'fully_recognized';
            }

            updateData.recognition = recognition;
        }

        updateData.updatedAt = new Date().toISOString();

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Calculate expense for a period
     * @param {string} expenseId - Expense ID or _id
     * @param {Date} periodStart - Period start date
     * @param {Date} periodEnd - Period end date
     * @returns {number} Expense for the period
     */
    async calculatePeriodExpense(expenseId, periodStart, periodEnd) {
        const doc = await baseModel.findOne({
            $or: [{ _id: expenseId }, { expenseId }]
        });

        if (!doc) return 0;

        return calculatePeriodExpense(doc, periodStart, periodEnd);
    },

    /**
     * Record a forfeiture
     * @param {string} expenseId - Expense ID or _id
     * @param {number} forfeitedShares - Number of shares forfeited
     * @param {string} userId - User recording the forfeiture
     * @returns {Object} Updated expense
     */
    async recordForfeiture(expenseId, forfeitedShares, userId) {
        const doc = await baseModel.findOne({
            $or: [{ _id: expenseId }, { expenseId }]
        });

        if (!doc) {
            throw new Error('Expense record not found');
        }

        const forfeitedPercentage = forfeitedShares / doc.grantDetails.totalShares;
        const forfeitedExpense = doc.recognition.totalExpense * forfeitedPercentage;

        const forfeitures = {
            ...doc.forfeitures,
            actualForfeitures: (doc.forfeitures?.actualForfeitures || 0) + forfeitedShares,
            forfeitureAdjustment: (doc.forfeitures?.forfeitureAdjustment || 0) + forfeitedExpense
        };

        const recognition = {
            ...doc.recognition,
            totalExpense: doc.recognition.totalExpense - forfeitedExpense
        };
        recognition.remainingExpense = recognition.totalExpense - recognition.recognizedToDate;

        let status = doc.status;
        if (forfeitedShares >= doc.grantDetails.totalShares) {
            status = 'forfeited';
        }

        const updateData = {
            forfeitures,
            recognition,
            status,
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Record a modification
     * @param {string} expenseId - Expense ID or _id
     * @param {number} newFairValuePerShare - New fair value per share
     * @param {string} reason - Reason for modification
     * @param {string} userId - User recording the modification
     * @returns {Object} Updated expense
     */
    async recordModification(expenseId, newFairValuePerShare, reason, userId) {
        const doc = await baseModel.findOne({
            $or: [{ _id: expenseId }, { expenseId }]
        });

        if (!doc) {
            throw new Error('Expense record not found');
        }

        const currentFairValue = doc.fairValue.total;
        const newFairValue = newFairValuePerShare * doc.grantDetails.totalShares;
        const incrementalExpense = Math.max(0, newFairValue - currentFairValue);

        const modification = {
            modificationDate: new Date().toISOString(),
            originalFairValue: currentFairValue,
            newFairValue,
            incrementalExpense,
            reason
        };

        const modifications = [...(doc.modifications || []), modification];

        const recognition = { ...doc.recognition };
        if (incrementalExpense > 0) {
            recognition.totalExpense += incrementalExpense;
            recognition.remainingExpense = recognition.totalExpense - recognition.recognizedToDate;
        }

        const fairValue = {
            perShare: newFairValuePerShare,
            total: newFairValue,
            calculatedAt: new Date().toISOString()
        };

        const updateData = {
            modifications,
            recognition,
            fairValue,
            status: 'modified',
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Update recognized expense
     * @param {string} expenseId - Expense ID or _id
     * @param {number} amount - Amount to add to recognized expense
     * @param {string} userId - User updating
     * @returns {Object} Updated expense
     */
    async updateRecognizedExpense(expenseId, amount, userId) {
        const doc = await baseModel.findOne({
            $or: [{ _id: expenseId }, { expenseId }]
        });

        if (!doc) {
            throw new Error('Expense record not found');
        }

        const recognition = {
            ...doc.recognition,
            recognizedToDate: (doc.recognition.recognizedToDate || 0) + amount
        };
        recognition.remainingExpense = recognition.totalExpense - recognition.recognizedToDate;

        let status = doc.status;
        if (recognition.recognizedToDate >= recognition.totalExpense) {
            status = 'fully_recognized';
        }

        const updateData = {
            recognition,
            status,
            updatedBy: userId,
            lastCalculatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Find expenses by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} Expenses for company
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;

        const results = await baseModel.find(query);
        return results.sort((a, b) => {
            const dateA = new Date(a.grantDetails?.grantDate || 0);
            const dateB = new Date(b.grantDetails?.grantDate || 0);
            return dateB - dateA;
        });
    },

    /**
     * Get company period expense
     * @param {string} companyId - Company ID
     * @param {Date} periodStart - Period start date
     * @param {Date} periodEnd - Period end date
     * @returns {Object} Period expense summary
     */
    async getCompanyPeriodExpense(companyId, periodStart, periodEnd) {
        const activeExpenses = await baseModel.find({
            companyId,
            status: { $in: ['active', 'modified'] }
        });

        let totalExpense = 0;
        const details = [];

        for (const expense of activeExpenses) {
            const periodExpense = calculatePeriodExpense(expense, periodStart, periodEnd);
            totalExpense += periodExpense;

            details.push({
                grantId: expense.grantId,
                employeeName: expense.employeeName,
                grantType: expense.grantType,
                periodExpense
            });
        }

        return {
            periodStart,
            periodEnd,
            totalExpense,
            details
        };
    },

    /**
     * Get company expense summary
     * @param {string} companyId - Company ID
     * @returns {Object} Company expense summary
     */
    async getCompanyExpenseSummary(companyId) {
        const expenses = await baseModel.find({ companyId });

        const summary = {
            totalGrants: expenses.length,
            activeGrants: 0,
            totalFairValue: 0,
            totalRecognized: 0,
            totalRemaining: 0,
            byType: {},
            byStatus: {}
        };

        for (const expense of expenses) {
            // By status
            summary.byStatus[expense.status] = (summary.byStatus[expense.status] || 0) + 1;

            if (expense.status === 'active' || expense.status === 'modified') {
                summary.activeGrants++;
            }

            // By type
            if (!summary.byType[expense.grantType]) {
                summary.byType[expense.grantType] = { count: 0, totalExpense: 0, recognized: 0 };
            }
            summary.byType[expense.grantType].count++;
            summary.byType[expense.grantType].totalExpense += expense.recognition?.totalExpense || 0;
            summary.byType[expense.grantType].recognized += expense.recognition?.recognizedToDate || 0;

            // Totals
            summary.totalFairValue += expense.fairValue?.total || 0;
            summary.totalRecognized += expense.recognition?.recognizedToDate || 0;
            summary.totalRemaining += expense.recognition?.remainingExpense || 0;
        }

        return summary;
    },

    /**
     * Get percent recognized (virtual)
     * @param {Object} doc - Document
     * @returns {number} Percent recognized
     */
    getPercentRecognized(doc) {
        return getPercentRecognized(doc);
    },

    /**
     * Get months remaining (virtual)
     * @param {Object} doc - Document
     * @returns {number} Months remaining
     */
    getMonthsRemaining(doc) {
        return getMonthsRemaining(doc);
    },

    /**
     * Transform document for JSON response with virtuals
     * @param {Object} doc - Document to transform
     * @returns {Object} Transformed document
     */
    toJSON(doc) {
        if (!doc) return null;
        return {
            ...doc,
            percentRecognized: getPercentRecognized(doc),
            monthsRemaining: getMonthsRemaining(doc)
        };
    }
};

module.exports = ASC718Expense;
