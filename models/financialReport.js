/**
 * Financial Report Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * [Feature] OCAE-205: Implement financial reporting endpoints
 * [Feature] OCAE-206: Enhanced validation for financial reports
 * Schema for financial reports with revenue/expense tracking and calculations
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Schema definition for Financial Report
 */
const financialReportSchema = {
    // Primary identifiers
    _id: { type: 'string', required: true },
    companyId: { type: 'string', required: true, trim: true, index: true },

    // Reporting period
    reportingPeriod: { type: 'string', required: true, trim: true },
    reportDate: { type: 'date', required: true, default: () => new Date().toISOString() },
    reportType: { type: 'string', enum: ['annual', 'quarterly', 'monthly'], required: true },

    // Revenue breakdown
    revenue: {
        sales: { type: 'number', default: 0, min: 0 },
        services: { type: 'number', default: 0, min: 0 },
        other: { type: 'number', default: 0, min: 0 }
    },

    // Expenses breakdown
    expenses: {
        salaries: { type: 'number', default: 0, min: 0 },
        marketing: { type: 'number', default: 0, min: 0 },
        operations: { type: 'number', default: 0, min: 0 },
        other: { type: 'number', default: 0, min: 0 }
    },

    // Calculated totals
    totalRevenue: { type: 'number', min: 0 },
    totalExpenses: { type: 'number', min: 0 },
    netIncome: { type: 'number' },

    // Metadata
    notes: { type: 'string', trim: true },
    tags: { type: 'array', default: [] },
    userId: { type: 'string', required: true, index: true },
    lastModifiedBy: { type: 'string' },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('financial_reports', financialReportSchema);

/**
 * Validates that all values in an object are positive numbers
 * @param {Object} obj - Object containing financial data
 * @returns {boolean} Whether all values are positive numbers
 */
function validatePositiveValues(obj) {
    if (!obj || typeof obj !== 'object') return true;
    return Object.values(obj).every(val =>
        typeof val === 'number' ? val >= 0 : true
    );
}

/**
 * Validates that provided totals match calculated totals
 * @param {Object} doc - The document being validated
 * @returns {boolean} Whether totals match
 */
function validateTotalsMatch(doc) {
    if (!doc.revenue || !doc.expenses) return true;

    // If no totals are provided, they will be calculated during save
    if (doc.totalRevenue === undefined &&
        doc.totalExpenses === undefined &&
        doc.netIncome === undefined) {
        return true;
    }

    // Calculate expected totals
    const expectedRevenue = Object.values(doc.revenue)
        .filter(val => typeof val === 'number')
        .reduce((sum, val) => sum + val, 0);

    const expectedExpenses = Object.values(doc.expenses)
        .filter(val => typeof val === 'number')
        .reduce((sum, val) => sum + val, 0);

    const expectedNetIncome = expectedRevenue - expectedExpenses;

    // Check if provided totals match calculated totals (allow small floating point differences)
    const isRevenueMatch = !doc.totalRevenue || Math.abs(doc.totalRevenue - expectedRevenue) < 0.01;
    const isExpensesMatch = !doc.totalExpenses || Math.abs(doc.totalExpenses - expectedExpenses) < 0.01;
    const isNetIncomeMatch = !doc.netIncome || Math.abs(doc.netIncome - expectedNetIncome) < 0.01;

    return isRevenueMatch && isExpensesMatch && isNetIncomeMatch;
}

/**
 * Calculate totals for revenue, expenses, and net income
 * @param {Object} doc - Financial report document
 * @returns {Object} Document with calculated totals
 */
function calculateTotals(doc) {
    // Ensure revenue and expenses are properly initialized
    doc.revenue = doc.revenue || {};
    doc.expenses = doc.expenses || {};

    // Calculate total revenue by summing all values, handling null/undefined
    doc.totalRevenue = Object.values(doc.revenue).reduce((sum, val) => {
        // Handle undefined, null, NaN or other invalid values
        const numVal = (val === undefined || val === null || isNaN(val)) ? 0 : val;
        return sum + numVal;
    }, 0);

    // Calculate total expenses by summing all values, handling null/undefined
    doc.totalExpenses = Object.values(doc.expenses).reduce((sum, val) => {
        // Handle undefined, null, NaN or other invalid values
        const numVal = (val === undefined || val === null || isNaN(val)) ? 0 : val;
        return sum + numVal;
    }, 0);

    // Calculate net income
    doc.netIncome = doc.totalRevenue - doc.totalExpenses;

    return doc;
}

// Extended model with custom methods
const FinancialReport = {
    ...baseModel,

    /**
     * Create a new financial report with validation
     * @param {Object} data - Financial report data
     * @returns {Object} Created financial report
     */
    async create(data) {
        // Set document type for identification in shared table
        data.documentType = 'financial_report';

        // Validate positive values in revenue
        if (data.revenue && !validatePositiveValues(data.revenue)) {
            throw new Error('All revenue values must be positive numbers');
        }

        // Validate positive values in expenses
        if (data.expenses && !validatePositiveValues(data.expenses)) {
            throw new Error('All expense values must be positive numbers');
        }

        // Validate that provided totals match calculated totals
        if (!validateTotalsMatch(data)) {
            throw new Error('Provided totals do not match calculated totals');
        }

        // Always calculate totals before saving if they're not set
        if (!data.totalRevenue || !data.totalExpenses || !data.netIncome) {
            calculateTotals(data);
        }

        // Set default report date if not provided
        if (!data.reportDate) {
            data.reportDate = new Date().toISOString();
        }

        return baseModel.create(data);
    },

    /**
     * Update a financial report with validation
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Updated financial report
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;

        // Validate positive values if revenue/expenses are being updated
        if (updateData.revenue && !validatePositiveValues(updateData.revenue)) {
            throw new Error('All revenue values must be positive numbers');
        }

        if (updateData.expenses && !validatePositiveValues(updateData.expenses)) {
            throw new Error('All expense values must be positive numbers');
        }

        // If updating financial data, recalculate totals
        if (updateData.revenue || updateData.expenses) {
            // Fetch current document to merge with updates
            const existing = await baseModel.findOne(query);
            if (existing) {
                const merged = {
                    ...existing,
                    revenue: { ...existing.revenue, ...updateData.revenue },
                    expenses: { ...existing.expenses, ...updateData.expenses }
                };
                calculateTotals(merged);

                // Copy calculated fields to update
                updateData.totalRevenue = merged.totalRevenue;
                updateData.totalExpenses = merged.totalExpenses;
                updateData.netIncome = merged.netIncome;
            }
        }

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Get financial report with calculated metrics
     * @param {string} id - Financial report ID
     * @returns {Object} Financial report with metrics
     */
    async findByIdWithMetrics(id) {
        const doc = await baseModel.findById(id);
        if (!doc) return null;

        const metrics = {};

        // Calculate profit margin
        if (doc.totalRevenue > 0) {
            metrics.profitMargin = doc.netIncome / doc.totalRevenue;
            metrics.expenseRatio = doc.totalExpenses / doc.totalRevenue;
        }

        // Calculate expense breakdown percentages
        if (doc.totalExpenses > 0) {
            metrics.expenseBreakdown = {
                salaries: (doc.expenses?.salaries || 0) / doc.totalExpenses,
                marketing: (doc.expenses?.marketing || 0) / doc.totalExpenses,
                operations: (doc.expenses?.operations || 0) / doc.totalExpenses,
                other: (doc.expenses?.other || 0) / doc.totalExpenses
            };
        }

        // Calculate revenue breakdown percentages
        if (doc.totalRevenue > 0) {
            metrics.revenueBreakdown = {
                sales: (doc.revenue?.sales || 0) / doc.totalRevenue,
                services: (doc.revenue?.services || 0) / doc.totalRevenue,
                other: (doc.revenue?.other || 0) / doc.totalRevenue
            };
        }

        return {
            ...doc,
            metrics
        };
    },

    /**
     * Get comparative financial reports for a company
     * @param {string} companyId - Company ID
     * @param {Array} periods - Reporting periods
     * @returns {Array} Financial reports
     */
    async getComparative(companyId, periods) {
        return baseModel.find({
            companyId,
            documentType: 'financial_report',
            reportingPeriod: { $in: periods }
        }, { sort: { reportDate: 1 } });
    },

    /**
     * Get latest financial report for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Latest financial report
     */
    async getLatest(companyId) {
        const results = await baseModel.find(
            { companyId, documentType: 'financial_report' },
            { sort: { reportDate: -1 }, limit: 1 }
        );
        return results[0] || null;
    },

    /**
     * Get financial reports by user
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Array} Financial reports
     */
    async findByUser(userId, options = {}) {
        return baseModel.find(
            { userId, documentType: 'financial_report' },
            { sort: { reportDate: -1 }, ...options }
        );
    },

    /**
     * Find financial reports by company
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Financial reports
     */
    async find(query = {}, options = {}) {
        query.documentType = 'financial_report';
        return baseModel.find(query, options);
    },

    /**
     * Find one financial report
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object} Financial report
     */
    async findOne(query = {}, options = {}) {
        query.documentType = 'financial_report';
        return baseModel.findOne(query, options);
    },

    // Expose utility functions
    calculateTotals,
    validatePositiveValues,
    validateTotalsMatch
};

module.exports = FinancialReport;
