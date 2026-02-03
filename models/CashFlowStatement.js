/**
 * Cash Flow Statement Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * [Feature] OCDI-202: Create financial reporting database models
 *
 * Comprehensive cash flow statement model tracking operating, investing,
 * and financing activities with proper validation and calculation methods.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

/**
 * Schema definition for Cash Flow Statement
 */
const cashFlowStatementSchema = {
    // Primary identifiers
    _id: { type: 'string', required: true },
    companyId: { type: 'string', required: true, index: true },

    // Reporting period
    reportingPeriod: { type: 'string', required: true, trim: true },
    periodStartDate: { type: 'date', required: true },
    periodEndDate: { type: 'date', required: true, index: true },
    method: { type: 'string', enum: ['direct', 'indirect'], default: 'indirect' },

    // Operating Activities
    operatingActivities: {
        // Cash receipts from operations
        cashFromCustomers: { type: 'number', default: 0 },
        otherOperatingReceipts: { type: 'number', default: 0 },

        // Cash payments for operations
        cashToSuppliers: { type: 'number', default: 0 },
        cashToEmployees: { type: 'number', default: 0 },
        interestPaid: { type: 'number', default: 0, min: 0 },
        taxesPaid: { type: 'number', default: 0, min: 0 },
        otherOperatingPayments: { type: 'number', default: 0 },

        // Non-cash adjustments (indirect method)
        netIncome: { type: 'number', default: 0 },
        depreciation: { type: 'number', default: 0, min: 0 },
        stockBasedCompensation: { type: 'number', default: 0, min: 0 },

        // Working capital changes
        changeInAccountsReceivable: { type: 'number', default: 0 },
        changeInInventory: { type: 'number', default: 0 },
        changeInPrepaidExpenses: { type: 'number', default: 0 },
        changeInAccountsPayable: { type: 'number', default: 0 },
        changeInAccruedExpenses: { type: 'number', default: 0 },
        changeInDeferredRevenue: { type: 'number', default: 0 },
        otherWorkingCapitalChanges: { type: 'number', default: 0 }
    },

    // Investing Activities
    investingActivities: {
        purchaseOfPPE: { type: 'number', default: 0, max: 0 },
        saleOfPPE: { type: 'number', default: 0, min: 0 },
        purchaseOfInvestments: { type: 'number', default: 0, max: 0 },
        saleOfInvestments: { type: 'number', default: 0, min: 0 },
        acquisitions: { type: 'number', default: 0, max: 0 },
        disposals: { type: 'number', default: 0, min: 0 },
        loansToOthers: { type: 'number', default: 0, max: 0 },
        collectionOfLoans: { type: 'number', default: 0, min: 0 },
        otherInvestingActivities: { type: 'number', default: 0 }
    },

    // Financing Activities
    financingActivities: {
        proceedsFromEquityIssuance: { type: 'number', default: 0, min: 0 },
        shareRepurchases: { type: 'number', default: 0, max: 0 },
        dividendsPaid: { type: 'number', default: 0, max: 0 },
        proceedsFromDebt: { type: 'number', default: 0, min: 0 },
        debtRepayments: { type: 'number', default: 0, max: 0 },
        proceedsFromStockOptions: { type: 'number', default: 0, min: 0 },
        otherFinancingActivities: { type: 'number', default: 0 }
    },

    // Calculated totals
    netCashFromOperating: { type: 'number', default: 0 },
    netCashFromInvesting: { type: 'number', default: 0 },
    netCashFromFinancing: { type: 'number', default: 0 },
    netChangeInCash: { type: 'number', default: 0 },

    // Cash balances
    cashBeginningOfPeriod: { type: 'number', required: true, min: 0 },
    cashEndOfPeriod: { type: 'number', default: 0, min: 0 },
    effectOfExchangeRates: { type: 'number', default: 0 },

    // Supplemental information
    supplementalDisclosures: {
        interestReceived: { type: 'number', default: 0, min: 0 },
        dividendsReceived: { type: 'number', default: 0, min: 0 },
        nonCashInvestingActivities: { type: 'string' },
        nonCashFinancingActivities: { type: 'string' }
    },

    // Metadata
    currency: { type: 'string', default: 'USD', enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'] },
    preparedBy: { type: 'string', required: true },
    reviewedBy: { type: 'string' },
    approvedBy: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'under_review', 'approved', 'published'], default: 'draft' },
    notes: { type: 'string', trim: true },
    auditStatus: { type: 'string', enum: ['unaudited', 'reviewed', 'audited'], default: 'unaudited' },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('financial_reports', cashFlowStatementSchema);

/**
 * Calculate operating cash flow using indirect method
 * @param {Object} operating - Operating activities data
 * @returns {number} Operating cash flow
 */
function calculateOperatingCashFlowIndirect(operating) {
    // Start with net income and add back non-cash items
    let operatingCashFlow = (operating.netIncome || 0) +
        (operating.depreciation || 0) +
        (operating.stockBasedCompensation || 0);

    // Add working capital changes
    operatingCashFlow += (operating.changeInAccountsReceivable || 0) +
        (operating.changeInInventory || 0) +
        (operating.changeInPrepaidExpenses || 0) +
        (operating.changeInAccountsPayable || 0) +
        (operating.changeInAccruedExpenses || 0) +
        (operating.changeInDeferredRevenue || 0) +
        (operating.otherWorkingCapitalChanges || 0);

    return operatingCashFlow;
}

/**
 * Calculate operating cash flow using direct method
 * @param {Object} operating - Operating activities data
 * @returns {number} Operating cash flow
 */
function calculateOperatingCashFlowDirect(operating) {
    // Cash receipts
    const cashReceipts = (operating.cashFromCustomers || 0) +
        (operating.otherOperatingReceipts || 0);

    // Cash payments
    const cashPayments = (operating.cashToSuppliers || 0) +
        (operating.cashToEmployees || 0) +
        (operating.interestPaid || 0) +
        (operating.taxesPaid || 0) +
        (operating.otherOperatingPayments || 0);

    return cashReceipts - cashPayments;
}

/**
 * Calculate all cash flow totals
 * @param {Object} doc - Cash flow statement document
 * @returns {Object} Document with calculated totals
 */
function calculateTotals(doc) {
    // Initialize nested objects if missing
    doc.operatingActivities = doc.operatingActivities || {};
    doc.investingActivities = doc.investingActivities || {};
    doc.financingActivities = doc.financingActivities || {};

    // Calculate operating cash flow based on method
    if (doc.method === 'direct') {
        doc.netCashFromOperating = calculateOperatingCashFlowDirect(doc.operatingActivities);
    } else {
        doc.netCashFromOperating = calculateOperatingCashFlowIndirect(doc.operatingActivities);
    }

    // Calculate investing cash flow
    const investing = doc.investingActivities;
    doc.netCashFromInvesting = (investing.purchaseOfPPE || 0) +
        (investing.saleOfPPE || 0) +
        (investing.purchaseOfInvestments || 0) +
        (investing.saleOfInvestments || 0) +
        (investing.acquisitions || 0) +
        (investing.disposals || 0) +
        (investing.loansToOthers || 0) +
        (investing.collectionOfLoans || 0) +
        (investing.otherInvestingActivities || 0);

    // Calculate financing cash flow
    const financing = doc.financingActivities;
    doc.netCashFromFinancing = (financing.proceedsFromEquityIssuance || 0) +
        (financing.shareRepurchases || 0) +
        (financing.dividendsPaid || 0) +
        (financing.proceedsFromDebt || 0) +
        (financing.debtRepayments || 0) +
        (financing.proceedsFromStockOptions || 0) +
        (financing.otherFinancingActivities || 0);

    // Calculate net change in cash
    doc.netChangeInCash = doc.netCashFromOperating +
        doc.netCashFromInvesting +
        doc.netCashFromFinancing +
        (doc.effectOfExchangeRates || 0);

    // Calculate ending cash balance
    doc.cashEndOfPeriod = (doc.cashBeginningOfPeriod || 0) + doc.netChangeInCash;

    return doc;
}

/**
 * Validate cash flow statement consistency
 * @param {Object} doc - Cash flow statement document
 * @returns {boolean} True if consistent
 */
function validateCashFlow(doc) {
    const tolerance = 0.01;
    const calculatedEndingCash = (doc.cashBeginningOfPeriod || 0) + doc.netChangeInCash;
    const difference = Math.abs(doc.cashEndOfPeriod - calculatedEndingCash);

    return difference <= tolerance;
}

/**
 * Calculate cash flow ratios
 * @param {Object} doc - Cash flow statement document
 * @returns {Object} Calculated ratios
 */
function calculateRatios(doc) {
    const ratios = {};

    // Operating cash flow ratios
    if (doc.netCashFromOperating !== 0) {
        ratios.operatingCashFlowRatio = doc.netCashFromOperating;

        // Free cash flow (Operating CF - Capital Expenditures)
        const capex = Math.abs(doc.investingActivities?.purchaseOfPPE || 0);
        ratios.freeCashFlow = doc.netCashFromOperating - capex;

        if (capex > 0) {
            ratios.cashFlowToCapexRatio = doc.netCashFromOperating / capex;
        }
    }

    // Cash coverage ratios
    if (doc.operatingActivities?.interestPaid > 0) {
        ratios.cashCoverageRatio = doc.netCashFromOperating / doc.operatingActivities.interestPaid;
    }

    return ratios;
}

/**
 * Get free cash flow
 * @param {Object} doc - Cash flow statement document
 * @returns {number} Free cash flow
 */
function getFreeCashFlow(doc) {
    const capex = Math.abs(doc.investingActivities?.purchaseOfPPE || 0);
    return doc.netCashFromOperating - capex;
}

// Extended model with custom methods
const CashFlowStatement = {
    ...baseModel,

    /**
     * Create a new cash flow statement with validation
     * @param {Object} data - Cash flow statement data
     * @returns {Object} Created cash flow statement
     */
    async create(data) {
        // Set document type for identification in shared table
        data.documentType = 'cash_flow_statement';

        // Calculate totals before saving
        calculateTotals(data);

        // Validate cash flow consistency
        if (!validateCashFlow(data)) {
            throw new Error('Cash flow statement is inconsistent: ending cash does not match calculated value');
        }

        // Validate period dates
        if (data.periodStartDate && data.periodEndDate) {
            const startDate = new Date(data.periodStartDate);
            const endDate = new Date(data.periodEndDate);
            if (startDate >= endDate) {
                throw new Error('Period start date must be before period end date');
            }
        }

        return baseModel.create(data);
    },

    /**
     * Update a cash flow statement with validation
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Updated cash flow statement
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;

        // If updating financial data, recalculate totals
        if (updateData.operatingActivities || updateData.investingActivities ||
            updateData.financingActivities || updateData.cashBeginningOfPeriod ||
            updateData.effectOfExchangeRates || updateData.method) {

            // Fetch current document to merge with updates
            const existing = await baseModel.findOne(query);
            if (existing) {
                const merged = { ...existing, ...updateData };
                calculateTotals(merged);

                if (!validateCashFlow(merged)) {
                    throw new Error('Cash flow statement is inconsistent: ending cash does not match calculated value');
                }

                // Copy calculated fields to update
                updateData.netCashFromOperating = merged.netCashFromOperating;
                updateData.netCashFromInvesting = merged.netCashFromInvesting;
                updateData.netCashFromFinancing = merged.netCashFromFinancing;
                updateData.netChangeInCash = merged.netChangeInCash;
                updateData.cashEndOfPeriod = merged.cashEndOfPeriod;
            }
        }

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Get cash flow statement with calculated ratios
     * @param {string} id - Cash flow statement ID
     * @returns {Object} Cash flow statement with ratios
     */
    async findByIdWithRatios(id) {
        const doc = await baseModel.findById(id);
        if (!doc) return null;

        return {
            ...doc,
            ratios: calculateRatios(doc),
            freeCashFlow: getFreeCashFlow(doc)
        };
    },

    /**
     * Get comparative cash flow statements for a company
     * @param {string} companyId - Company ID
     * @param {Array} periods - Reporting periods
     * @returns {Array} Cash flow statements
     */
    async getComparative(companyId, periods) {
        return baseModel.find({
            companyId,
            documentType: 'cash_flow_statement',
            reportingPeriod: { $in: periods }
        }, { sort: { periodEndDate: 1 } });
    },

    /**
     * Get latest cash flow statement for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Latest cash flow statement
     */
    async getLatest(companyId) {
        const results = await baseModel.find(
            { companyId, documentType: 'cash_flow_statement' },
            { sort: { periodEndDate: -1 }, limit: 1 }
        );
        return results[0] || null;
    },

    /**
     * Find cash flow statements by company
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Cash flow statements
     */
    async find(query = {}, options = {}) {
        query.documentType = 'cash_flow_statement';
        return baseModel.find(query, options);
    },

    /**
     * Find one cash flow statement
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object} Cash flow statement
     */
    async findOne(query = {}, options = {}) {
        query.documentType = 'cash_flow_statement';
        return baseModel.findOne(query, options);
    },

    // Expose utility functions
    calculateTotals,
    validateCashFlow,
    calculateRatios,
    getFreeCashFlow,
    calculateOperatingCashFlowIndirect,
    calculateOperatingCashFlowDirect
};

module.exports = CashFlowStatement;
