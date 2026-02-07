/**
 * Income Statement Model
 *
 * Implements: Issue #265 - Create income statement model for historical financials
 *
 * Comprehensive income statement (P&L) model for tracking historical
 * financial performance with proper validation and calculation methods.
 * Required for 409A valuations and financial analysis.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Schema definition for Income Statement
 */
const incomeStatementSchema = {
    // Primary identifiers
    _id: { type: 'string', required: true },
    companyId: { type: 'string', required: true, index: true },

    // Reporting period
    periodStart: { type: 'date', required: true },
    periodEnd: { type: 'date', required: true, index: true },
    periodType: { type: 'string', required: true, enum: ['MONTH', 'QUARTER', 'YEAR'] },
    fiscalYear: { type: 'number' },

    // Audit/Data quality
    isAudited: { type: 'boolean', default: false },
    isActual: { type: 'boolean', default: true }, // True = actual, False = estimate/projection

    // Currency
    currency: { type: 'string', default: 'USD', enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'] },

    // Revenue Section
    revenueTotal: { type: 'number', default: 0 },
    revenueProduct: { type: 'number', default: 0 },
    revenueServices: { type: 'number', default: 0 },
    revenueRecurring: { type: 'number', default: 0 },
    revenueNonRecurring: { type: 'number', default: 0 },
    revenueOther: { type: 'number', default: 0 },

    // Cost of Goods Sold Section
    cogsTotal: { type: 'number', default: 0 },
    cogsMaterials: { type: 'number', default: 0 },
    cogsLabor: { type: 'number', default: 0 },
    cogsOther: { type: 'number', default: 0 },

    // Gross Profit (calculated: revenueTotal - cogsTotal)
    grossProfit: { type: 'number', default: 0 },

    // Operating Expenses
    opexTotal: { type: 'number', default: 0 },
    opexResearchDevelopment: { type: 'number', default: 0 },
    opexSalesMarketing: { type: 'number', default: 0 },
    opexGeneralAdmin: { type: 'number', default: 0 },
    opexDepreciation: { type: 'number', default: 0 },
    opexAmortization: { type: 'number', default: 0 },
    opexStockCompensation: { type: 'number', default: 0 },
    opexOther: { type: 'number', default: 0 },

    // Operating Income (calculated: grossProfit - opexTotal)
    operatingIncome: { type: 'number', default: 0 },

    // EBITDA (calculated: operatingIncome + depreciation + amortization)
    ebitda: { type: 'number', default: 0 },

    // Non-operating items
    interestIncome: { type: 'number', default: 0 },
    interestExpense: { type: 'number', default: 0 },
    otherIncomeExpense: { type: 'number', default: 0 },

    // Income Before Tax (calculated)
    incomeBeforeTax: { type: 'number', default: 0 },

    // Taxes
    incomeTaxExpense: { type: 'number', default: 0 },

    // Net Income (calculated: incomeBeforeTax - incomeTaxExpense)
    netIncome: { type: 'number', default: 0 },

    // Metadata
    headcountEnd: { type: 'number', default: 0, min: 0 },
    notes: { type: 'string', trim: true },

    // Workflow status
    status: { type: 'string', enum: ['draft', 'under_review', 'approved', 'published'], default: 'draft' },
    preparedBy: { type: 'string' },
    reviewedBy: { type: 'string' },
    approvedBy: { type: 'string' },
    auditStatus: { type: 'string', enum: ['unaudited', 'reviewed', 'audited'], default: 'unaudited' },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('financial_reports', incomeStatementSchema);

/**
 * Calculate all derived fields
 * @param {Object} doc - Income statement document
 * @returns {Object} Document with calculated fields
 */
function calculateTotals(doc) {
    // Calculate gross profit
    doc.grossProfit = (doc.revenueTotal || 0) - (doc.cogsTotal || 0);

    // Calculate operating income
    doc.operatingIncome = doc.grossProfit - (doc.opexTotal || 0);

    // Calculate EBITDA (add back depreciation and amortization to operating income)
    doc.ebitda = doc.operatingIncome +
        (doc.opexDepreciation || 0) +
        (doc.opexAmortization || 0);

    // Calculate income before tax
    doc.incomeBeforeTax = doc.operatingIncome +
        (doc.interestIncome || 0) -
        (doc.interestExpense || 0) +
        (doc.otherIncomeExpense || 0);

    // Calculate net income
    doc.netIncome = doc.incomeBeforeTax - (doc.incomeTaxExpense || 0);

    return doc;
}

/**
 * Calculate gross margin percentage
 * @param {Object} doc - Income statement document
 * @returns {number|null} Gross margin as decimal (e.g., 0.45 for 45%)
 */
function grossMargin(doc) {
    if (!doc.revenueTotal || doc.revenueTotal === 0) return null;
    return doc.grossProfit / doc.revenueTotal;
}

/**
 * Calculate operating margin percentage
 * @param {Object} doc - Income statement document
 * @returns {number|null} Operating margin as decimal
 */
function operatingMargin(doc) {
    if (!doc.revenueTotal || doc.revenueTotal === 0) return null;
    return doc.operatingIncome / doc.revenueTotal;
}

/**
 * Calculate net margin percentage
 * @param {Object} doc - Income statement document
 * @returns {number|null} Net margin as decimal
 */
function netMargin(doc) {
    if (!doc.revenueTotal || doc.revenueTotal === 0) return null;
    return doc.netIncome / doc.revenueTotal;
}

/**
 * Calculate EBITDA margin percentage
 * @param {Object} doc - Income statement document
 * @returns {number|null} EBITDA margin as decimal
 */
function ebitdaMargin(doc) {
    if (!doc.revenueTotal || doc.revenueTotal === 0) return null;
    return doc.ebitda / doc.revenueTotal;
}

/**
 * Calculate revenue per employee
 * @param {Object} doc - Income statement document
 * @returns {number|null} Revenue per employee
 */
function revenuePerEmployee(doc) {
    if (!doc.headcountEnd || doc.headcountEnd === 0) return null;
    return doc.revenueTotal / doc.headcountEnd;
}

/**
 * Calculate all margin ratios
 * @param {Object} doc - Income statement document
 * @returns {Object} All margin calculations
 */
function calculateMargins(doc) {
    return {
        grossMargin: grossMargin(doc),
        operatingMargin: operatingMargin(doc),
        netMargin: netMargin(doc),
        ebitdaMargin: ebitdaMargin(doc),
        revenuePerEmployee: revenuePerEmployee(doc)
    };
}

/**
 * Validate income statement consistency
 * @param {Object} doc - Income statement document
 * @returns {Object} Validation result with isValid and errors
 */
function validateIncomeStatement(doc) {
    const errors = [];

    // Validate period dates
    if (doc.periodStart && doc.periodEnd) {
        const startDate = new Date(doc.periodStart);
        const endDate = new Date(doc.periodEnd);
        if (startDate >= endDate) {
            errors.push('Period start date must be before period end date');
        }
    }

    // Validate gross profit calculation
    const expectedGrossProfit = (doc.revenueTotal || 0) - (doc.cogsTotal || 0);
    if (doc.grossProfit !== undefined && Math.abs(doc.grossProfit - expectedGrossProfit) > 0.01) {
        errors.push('Gross profit does not match revenue minus COGS');
    }

    // Validate operating income calculation
    const expectedOperatingIncome = (doc.grossProfit || 0) - (doc.opexTotal || 0);
    if (doc.operatingIncome !== undefined && Math.abs(doc.operatingIncome - expectedOperatingIncome) > 0.01) {
        errors.push('Operating income does not match gross profit minus opex');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

// Extended model with custom methods
const IncomeStatement = {
    ...baseModel,

    /**
     * Create a new income statement with validation
     * @param {Object} data - Income statement data
     * @returns {Object} Created income statement
     */
    async create(data) {
        // Set document type for identification in shared table
        data.documentType = 'income_statement';

        // Calculate totals before saving
        calculateTotals(data);

        // Validate income statement consistency
        const validation = validateIncomeStatement(data);
        if (!validation.isValid) {
            throw new Error(`Income statement validation failed: ${validation.errors.join(', ')}`);
        }

        // Validate period dates
        if (data.periodStart && data.periodEnd) {
            const startDate = new Date(data.periodStart);
            const endDate = new Date(data.periodEnd);
            if (startDate >= endDate) {
                throw new Error('Period start date must be before period end date');
            }
        }

        return baseModel.create(data);
    },

    /**
     * Update an income statement with validation
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Updated income statement
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;

        // If updating financial data, recalculate totals
        const financialFields = [
            'revenueTotal', 'revenueProduct', 'revenueServices', 'revenueRecurring',
            'revenueNonRecurring', 'revenueOther', 'cogsTotal', 'cogsMaterials',
            'cogsLabor', 'cogsOther', 'opexTotal', 'opexResearchDevelopment',
            'opexSalesMarketing', 'opexGeneralAdmin', 'opexDepreciation',
            'opexAmortization', 'opexStockCompensation', 'opexOther',
            'interestIncome', 'interestExpense', 'otherIncomeExpense', 'incomeTaxExpense'
        ];

        const hasFinancialUpdates = financialFields.some(field => updateData[field] !== undefined);

        if (hasFinancialUpdates) {
            // Fetch current document to merge with updates
            const existing = await baseModel.findOne(query);
            if (existing) {
                const merged = { ...existing, ...updateData };
                calculateTotals(merged);

                const validation = validateIncomeStatement(merged);
                if (!validation.isValid) {
                    throw new Error(`Income statement validation failed: ${validation.errors.join(', ')}`);
                }

                // Copy calculated fields to update
                updateData.grossProfit = merged.grossProfit;
                updateData.operatingIncome = merged.operatingIncome;
                updateData.ebitda = merged.ebitda;
                updateData.incomeBeforeTax = merged.incomeBeforeTax;
                updateData.netIncome = merged.netIncome;
            }
        }

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Get income statement with calculated margins
     * @param {string} id - Income statement ID
     * @returns {Object} Income statement with margins
     */
    async findByIdWithMargins(id) {
        const doc = await baseModel.findById(id);
        if (!doc) return null;

        return {
            ...doc,
            margins: calculateMargins(doc)
        };
    },

    /**
     * Get comparative income statements for a company
     * @param {string} companyId - Company ID
     * @param {Array} periods - Reporting periods
     * @returns {Array} Income statements
     */
    async getComparative(companyId, periods) {
        return baseModel.find({
            companyId,
            documentType: 'income_statement',
            periodType: { $in: periods }
        }, { sort: { periodEnd: 1 } });
    },

    /**
     * Get latest income statement for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Latest income statement
     */
    async getLatest(companyId) {
        const results = await baseModel.find(
            { companyId, documentType: 'income_statement' },
            { sort: { periodEnd: -1 }, limit: 1 }
        );
        return results[0] || null;
    },

    /**
     * Get income statements by fiscal year
     * @param {string} companyId - Company ID
     * @param {number} fiscalYear - Fiscal year
     * @returns {Array} Income statements for the fiscal year
     */
    async getByFiscalYear(companyId, fiscalYear) {
        return baseModel.find({
            companyId,
            documentType: 'income_statement',
            fiscalYear
        }, { sort: { periodEnd: 1 } });
    },

    /**
     * Get year-over-year comparison
     * @param {string} companyId - Company ID
     * @param {number} years - Number of years to compare
     * @returns {Array} Income statements for comparison
     */
    async getYearOverYear(companyId, years = 3) {
        return baseModel.find({
            companyId,
            documentType: 'income_statement',
            periodType: 'YEAR'
        }, { sort: { periodEnd: -1 }, limit: years });
    },

    /**
     * Find income statements by company
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Income statements
     */
    async find(query = {}, options = {}) {
        query.documentType = 'income_statement';
        return baseModel.find(query, options);
    },

    /**
     * Find one income statement
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object} Income statement
     */
    async findOne(query = {}, options = {}) {
        query.documentType = 'income_statement';
        return baseModel.findOne(query, options);
    },

    // Expose utility functions
    calculateTotals,
    validateIncomeStatement,
    calculateMargins,
    grossMargin,
    operatingMargin,
    netMargin,
    ebitdaMargin,
    revenuePerEmployee
};

module.exports = IncomeStatement;
