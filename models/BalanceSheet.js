/**
 * Balance Sheet Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * [Feature] OCDI-202: Create financial reporting database models
 *
 * Comprehensive balance sheet model for tracking assets, liabilities, and equity
 * with proper validation and calculation methods for financial reporting.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Schema definition for Balance Sheet
 */
const balanceSheetSchema = {
    // Primary identifiers
    _id: { type: 'string', required: true },
    companyId: { type: 'string', required: true, index: true },

    // Reporting period
    reportingDate: { type: 'date', required: true, index: true },
    reportingPeriod: { type: 'string', required: true, trim: true },

    // Current Assets
    currentAssets: {
        cash: { type: 'number', default: 0, min: 0 },
        accountsReceivable: { type: 'number', default: 0, min: 0 },
        inventory: { type: 'number', default: 0, min: 0 },
        prepaidExpenses: { type: 'number', default: 0, min: 0 },
        shortTermInvestments: { type: 'number', default: 0, min: 0 },
        other: { type: 'number', default: 0, min: 0 }
    },

    // Non-Current Assets
    nonCurrentAssets: {
        propertyPlantEquipment: {
            gross: { type: 'number', default: 0, min: 0 },
            accumulatedDepreciation: { type: 'number', default: 0, min: 0 },
            net: { type: 'number', default: 0 }
        },
        intangibleAssets: { type: 'number', default: 0, min: 0 },
        longTermInvestments: { type: 'number', default: 0, min: 0 },
        deferredTaxAssets: { type: 'number', default: 0, min: 0 },
        other: { type: 'number', default: 0, min: 0 }
    },

    // Asset totals
    totalCurrentAssets: { type: 'number', default: 0, min: 0 },
    totalNonCurrentAssets: { type: 'number', default: 0, min: 0 },
    totalAssets: { type: 'number', default: 0, min: 0 },

    // Current Liabilities
    currentLiabilities: {
        accountsPayable: { type: 'number', default: 0, min: 0 },
        shortTermDebt: { type: 'number', default: 0, min: 0 },
        accruedExpenses: { type: 'number', default: 0, min: 0 },
        deferredRevenue: { type: 'number', default: 0, min: 0 },
        currentTaxLiabilities: { type: 'number', default: 0, min: 0 },
        other: { type: 'number', default: 0, min: 0 }
    },

    // Non-Current Liabilities
    nonCurrentLiabilities: {
        longTermDebt: { type: 'number', default: 0, min: 0 },
        deferredTaxLiabilities: { type: 'number', default: 0, min: 0 },
        pensionObligations: { type: 'number', default: 0, min: 0 },
        other: { type: 'number', default: 0, min: 0 }
    },

    // Liability totals
    totalCurrentLiabilities: { type: 'number', default: 0, min: 0 },
    totalNonCurrentLiabilities: { type: 'number', default: 0, min: 0 },
    totalLiabilities: { type: 'number', default: 0, min: 0 },

    // Equity
    equity: {
        shareCapital: { type: 'number', default: 0, min: 0 },
        retainedEarnings: { type: 'number', default: 0 },
        additionalPaidInCapital: { type: 'number', default: 0, min: 0 },
        treasuryStock: { type: 'number', default: 0, min: 0 },
        accumulatedOtherComprehensiveIncome: { type: 'number', default: 0 },
        nonControllingInterest: { type: 'number', default: 0, min: 0 }
    },

    // Equity totals
    totalEquity: { type: 'number', default: 0 },
    totalLiabilitiesAndEquity: { type: 'number', default: 0 },

    // Metadata
    currency: { type: 'string', default: 'USD', enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] },
    preparedBy: { type: 'string', required: true },
    reviewedBy: { type: 'string' },
    approvedBy: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'under_review', 'approved', 'published'], default: 'draft' },
    notes: { type: 'string', trim: true },
    isConsolidated: { type: 'boolean', default: false },
    auditStatus: { type: 'string', enum: ['unaudited', 'reviewed', 'audited'], default: 'unaudited' },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('financial_reports', balanceSheetSchema);

/**
 * Calculate all totals and validate balance sheet equation
 * @param {Object} doc - Balance sheet document
 * @returns {Object} Document with calculated totals
 */
function calculateTotals(doc) {
    // Initialize nested objects if missing
    doc.currentAssets = doc.currentAssets || {};
    doc.nonCurrentAssets = doc.nonCurrentAssets || {};
    doc.nonCurrentAssets.propertyPlantEquipment = doc.nonCurrentAssets.propertyPlantEquipment || {};
    doc.currentLiabilities = doc.currentLiabilities || {};
    doc.nonCurrentLiabilities = doc.nonCurrentLiabilities || {};
    doc.equity = doc.equity || {};

    // Calculate current assets total
    doc.totalCurrentAssets = (doc.currentAssets.cash || 0) +
        (doc.currentAssets.accountsReceivable || 0) +
        (doc.currentAssets.inventory || 0) +
        (doc.currentAssets.prepaidExpenses || 0) +
        (doc.currentAssets.shortTermInvestments || 0) +
        (doc.currentAssets.other || 0);

    // Calculate non-current assets total (handle PP&E net calculation)
    const ppNet = (doc.nonCurrentAssets.propertyPlantEquipment.gross || 0) -
                  (doc.nonCurrentAssets.propertyPlantEquipment.accumulatedDepreciation || 0);
    doc.nonCurrentAssets.propertyPlantEquipment.net = ppNet;

    doc.totalNonCurrentAssets = ppNet +
        (doc.nonCurrentAssets.intangibleAssets || 0) +
        (doc.nonCurrentAssets.longTermInvestments || 0) +
        (doc.nonCurrentAssets.deferredTaxAssets || 0) +
        (doc.nonCurrentAssets.other || 0);

    // Total assets
    doc.totalAssets = doc.totalCurrentAssets + doc.totalNonCurrentAssets;

    // Calculate current liabilities total
    doc.totalCurrentLiabilities = (doc.currentLiabilities.accountsPayable || 0) +
        (doc.currentLiabilities.shortTermDebt || 0) +
        (doc.currentLiabilities.accruedExpenses || 0) +
        (doc.currentLiabilities.deferredRevenue || 0) +
        (doc.currentLiabilities.currentTaxLiabilities || 0) +
        (doc.currentLiabilities.other || 0);

    // Calculate non-current liabilities total
    doc.totalNonCurrentLiabilities = (doc.nonCurrentLiabilities.longTermDebt || 0) +
        (doc.nonCurrentLiabilities.deferredTaxLiabilities || 0) +
        (doc.nonCurrentLiabilities.pensionObligations || 0) +
        (doc.nonCurrentLiabilities.other || 0);

    // Total liabilities
    doc.totalLiabilities = doc.totalCurrentLiabilities + doc.totalNonCurrentLiabilities;

    // Calculate total equity (subtract treasury stock as it reduces equity)
    doc.totalEquity = (doc.equity.shareCapital || 0) +
        (doc.equity.retainedEarnings || 0) +
        (doc.equity.additionalPaidInCapital || 0) +
        (doc.equity.accumulatedOtherComprehensiveIncome || 0) +
        (doc.equity.nonControllingInterest || 0) -
        (doc.equity.treasuryStock || 0);

    // Total liabilities and equity
    doc.totalLiabilitiesAndEquity = doc.totalLiabilities + doc.totalEquity;

    return doc;
}

/**
 * Validate balance sheet equation: Assets = Liabilities + Equity
 * @param {Object} doc - Balance sheet document
 * @returns {boolean} True if balance sheet is balanced
 */
function validateBalance(doc) {
    const tolerance = 0.01; // Allow for small rounding differences
    const difference = Math.abs(doc.totalAssets - doc.totalLiabilitiesAndEquity);
    return difference <= tolerance;
}

/**
 * Calculate key financial ratios
 * @param {Object} doc - Balance sheet document
 * @returns {Object} Calculated ratios
 */
function calculateRatios(doc) {
    const ratios = {};

    // Liquidity ratios
    if (doc.totalCurrentLiabilities > 0) {
        ratios.currentRatio = doc.totalCurrentAssets / doc.totalCurrentLiabilities;

        // Quick ratio (excluding inventory)
        const quickAssets = doc.totalCurrentAssets - (doc.currentAssets?.inventory || 0);
        ratios.quickRatio = quickAssets / doc.totalCurrentLiabilities;
    }

    // Leverage ratios
    if (doc.totalAssets > 0) {
        ratios.debtToAssetsRatio = doc.totalLiabilities / doc.totalAssets;

        if (doc.totalEquity > 0) {
            ratios.debtToEquityRatio = doc.totalLiabilities / doc.totalEquity;
        }
    }

    if (doc.totalEquity > 0) {
        ratios.equityMultiplier = doc.totalAssets / doc.totalEquity;
    }

    return ratios;
}

/**
 * Get working capital
 * @param {Object} doc - Balance sheet document
 * @returns {number} Working capital
 */
function getWorkingCapital(doc) {
    return doc.totalCurrentAssets - doc.totalCurrentLiabilities;
}

// Extended model with custom methods
const BalanceSheet = {
    ...baseModel,

    /**
     * Create a new balance sheet with validation
     * @param {Object} data - Balance sheet data
     * @returns {Object} Created balance sheet
     */
    async create(data) {
        // Set document type for identification in shared table
        data.documentType = 'balance_sheet';

        // Calculate totals before saving
        calculateTotals(data);

        // Validate balance sheet equation
        if (!validateBalance(data)) {
            throw new Error('Balance sheet does not balance: Assets must equal Liabilities + Equity');
        }

        return baseModel.create(data);
    },

    /**
     * Update a balance sheet with validation
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Updated balance sheet
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;

        // If updating financial data, recalculate totals
        if (updateData.currentAssets || updateData.nonCurrentAssets ||
            updateData.currentLiabilities || updateData.nonCurrentLiabilities ||
            updateData.equity) {

            // Fetch current document to merge with updates
            const existing = await baseModel.findOne(query);
            if (existing) {
                const merged = { ...existing, ...updateData };
                calculateTotals(merged);

                if (!validateBalance(merged)) {
                    throw new Error('Balance sheet does not balance: Assets must equal Liabilities + Equity');
                }

                // Copy calculated fields to update
                updateData.totalCurrentAssets = merged.totalCurrentAssets;
                updateData.totalNonCurrentAssets = merged.totalNonCurrentAssets;
                updateData.totalAssets = merged.totalAssets;
                updateData.totalCurrentLiabilities = merged.totalCurrentLiabilities;
                updateData.totalNonCurrentLiabilities = merged.totalNonCurrentLiabilities;
                updateData.totalLiabilities = merged.totalLiabilities;
                updateData.totalEquity = merged.totalEquity;
                updateData.totalLiabilitiesAndEquity = merged.totalLiabilitiesAndEquity;
            }
        }

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Get balance sheet with calculated ratios
     * @param {string} id - Balance sheet ID
     * @returns {Object} Balance sheet with ratios
     */
    async findByIdWithRatios(id) {
        const doc = await baseModel.findById(id);
        if (!doc) return null;

        return {
            ...doc,
            ratios: calculateRatios(doc),
            workingCapital: getWorkingCapital(doc)
        };
    },

    /**
     * Get comparative balance sheets for a company
     * @param {string} companyId - Company ID
     * @param {Array} periods - Reporting periods
     * @returns {Array} Balance sheets
     */
    async getComparative(companyId, periods) {
        return baseModel.find({
            companyId,
            documentType: 'balance_sheet',
            reportingPeriod: { $in: periods }
        }, { sort: { reportingDate: 1 } });
    },

    /**
     * Get latest balance sheet for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Latest balance sheet
     */
    async getLatest(companyId) {
        const results = await baseModel.find(
            { companyId, documentType: 'balance_sheet' },
            { sort: { reportingDate: -1 }, limit: 1 }
        );
        return results[0] || null;
    },

    /**
     * Find balance sheets by company
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Balance sheets
     */
    async find(query = {}, options = {}) {
        query.documentType = 'balance_sheet';
        return baseModel.find(query, options);
    },

    /**
     * Find one balance sheet
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object} Balance sheet
     */
    async findOne(query = {}, options = {}) {
        query.documentType = 'balance_sheet';
        return baseModel.findOne(query, options);
    },

    // Expose utility functions
    calculateTotals,
    validateBalance,
    calculateRatios,
    getWorkingCapital
};

module.exports = BalanceSheet;
