/**
 * TaxWithholding Model
 * Feature: Issue #72 - Tax Withholding Calculator
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Constants
const EVENT_TYPES = ['iso_exercise', 'nso_exercise', 'rsu_vest', 'stock_sale', 'bonus_payment'];
const SOURCE_TYPES = ['OptionExercise', 'RSUVest', 'StockSale', 'BonusPayment'];
const FILING_STATUSES = ['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'];
const WITHHOLDING_TYPES = ['federal', 'state', 'local', 'social_security', 'medicare', 'amt'];
const WITHHOLDING_METHODS = ['flat_rate', 'supplemental', 'aggregate', 'percentage'];
const STATUSES = ['calculated', 'approved', 'processed', 'remitted', 'corrected'];

// Schema definition (for documentation)
const schema = {
    _id: { type: 'string', required: true },
    withholdingId: { type: 'string', unique: true },
    companyId: { type: 'string', required: true },
    employeeId: { type: 'string', required: true },
    eventType: { type: 'string', enum: EVENT_TYPES, required: true },
    sourceType: { type: 'string', enum: SOURCE_TYPES },
    sourceId: { type: 'string' },
    taxYear: { type: 'number', required: true },
    eventDate: { type: 'date', required: true },
    income: {
        grossAmount: { type: 'number', required: true },
        ordinaryIncome: { type: 'number', default: 0 },
        capitalGains: {
            shortTerm: { type: 'number', default: 0 },
            longTerm: { type: 'number', default: 0 }
        },
        amtIncome: { type: 'number', default: 0 }
    },
    employeeProfile: {
        filingStatus: { type: 'string', enum: FILING_STATUSES, required: true },
        federalAllowances: { type: 'number', default: 0 },
        stateCode: { type: 'string', required: true },
        stateAllowances: { type: 'number', default: 0 },
        additionalWithholding: { type: 'number', default: 0 },
        isSubjectToAMT: { type: 'boolean', default: false }
    },
    withholdings: { type: 'array', default: [] },
    summary: {
        totalWithholding: { type: 'number', required: true },
        federalWithholding: { type: 'number', default: 0 },
        stateWithholding: { type: 'number', default: 0 },
        localWithholding: { type: 'number', default: 0 },
        socialSecurityWithholding: { type: 'number', default: 0 },
        medicareWithholding: { type: 'number', default: 0 },
        additionalMedicare: { type: 'number', default: 0 },
        netAmount: { type: 'number' }
    },
    method: { type: 'string', enum: WITHHOLDING_METHODS, default: 'supplemental' },
    status: { type: 'string', enum: STATUSES, default: 'calculated' },
    payment: {
        processedDate: { type: 'date' },
        processedBy: { type: 'string' },
        remittedDate: { type: 'date' },
        remittanceConfirmation: { type: 'string' }
    },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' },
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },
    notes: { type: 'string' },
    metadata: { type: 'object', default: {} },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create base model
const baseModel = createModel('tax_withholdings', schema);

// Extended model with custom methods
const TaxWithholding = {
    ...baseModel,

    // Expose constants
    EVENT_TYPES,
    SOURCE_TYPES,
    FILING_STATUSES,
    WITHHOLDING_TYPES,
    WITHHOLDING_METHODS,
    STATUSES,

    /**
     * Create a new tax withholding record
     * @param {Object} data - Withholding data
     * @returns {Object} Created withholding
     */
    async create(data) {
        const withholdingId = data.withholdingId || `twh_${uuidv4()}`;

        // Calculate net amount
        const grossAmount = data.income?.grossAmount || 0;
        const totalWithholding = data.summary?.totalWithholding || 0;
        const netAmount = grossAmount - totalWithholding;

        // Prepare document
        const withholdingData = {
            ...data,
            withholdingId,
            income: {
                grossAmount: 0,
                ordinaryIncome: 0,
                capitalGains: {
                    shortTerm: 0,
                    longTerm: 0
                },
                amtIncome: 0,
                ...data.income
            },
            summary: {
                ...data.summary,
                netAmount
            },
            withholdings: data.withholdings || [],
            payment: data.payment || {},
            status: data.status || 'calculated',
            method: data.method || 'supplemental',
            metadata: data.metadata || {},
            eventDate: data.eventDate instanceof Date
                ? data.eventDate.toISOString()
                : data.eventDate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return baseModel.create(withholdingData);
    },

    /**
     * Update with recalculated net amount
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Update result
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;
        const existingDoc = await baseModel.findOne(query);

        if (existingDoc) {
            // Recalculate net amount if income or withholding changed
            const income = updateData.income
                ? { ...existingDoc.income, ...updateData.income }
                : existingDoc.income;

            const summary = updateData.summary
                ? { ...existingDoc.summary, ...updateData.summary }
                : existingDoc.summary;

            summary.netAmount = income.grossAmount - summary.totalWithholding;
            updateData.summary = summary;
        }

        updateData.updatedAt = new Date().toISOString();

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Approve a withholding
     * @param {string} withholdingId - Withholding ID or _id
     * @param {string} userId - Approving user ID
     * @returns {Object} Updated withholding
     */
    async approve(withholdingId, userId) {
        const doc = await baseModel.findOne({
            $or: [{ _id: withholdingId }, { withholdingId }]
        });

        if (!doc) {
            throw new Error('Withholding not found');
        }

        if (doc.status !== 'calculated') {
            throw new Error('Can only approve calculated withholdings');
        }

        const updateData = {
            status: 'approved',
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Mark withholding as processed
     * @param {string} withholdingId - Withholding ID or _id
     * @param {string} userId - Processing user ID
     * @returns {Object} Updated withholding
     */
    async markProcessed(withholdingId, userId) {
        const doc = await baseModel.findOne({
            $or: [{ _id: withholdingId }, { withholdingId }]
        });

        if (!doc) {
            throw new Error('Withholding not found');
        }

        if (doc.status !== 'approved') {
            throw new Error('Must be approved before processing');
        }

        const updateData = {
            status: 'processed',
            payment: {
                ...doc.payment,
                processedDate: new Date().toISOString(),
                processedBy: userId
            },
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Mark withholding as remitted
     * @param {string} withholdingId - Withholding ID or _id
     * @param {string} userId - User marking remittance
     * @param {string} confirmation - Remittance confirmation number
     * @returns {Object} Updated withholding
     */
    async markRemitted(withholdingId, userId, confirmation) {
        const doc = await baseModel.findOne({
            $or: [{ _id: withholdingId }, { withholdingId }]
        });

        if (!doc) {
            throw new Error('Withholding not found');
        }

        if (doc.status !== 'processed') {
            throw new Error('Must be processed before remittance');
        }

        const updateData = {
            status: 'remitted',
            payment: {
                ...doc.payment,
                remittedDate: new Date().toISOString(),
                remittanceConfirmation: confirmation
            },
            updatedBy: userId,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Find withholdings by employee
     * @param {string} employeeId - Employee ID
     * @param {number} taxYear - Optional tax year filter
     * @returns {Array} Withholdings for the employee
     */
    async findByEmployee(employeeId, taxYear = null) {
        const query = { employeeId };
        if (taxYear) query.taxYear = taxYear;

        const results = await baseModel.find(query);
        return results.sort((a, b) => {
            const dateA = new Date(a.eventDate || 0);
            const dateB = new Date(b.eventDate || 0);
            return dateB - dateA;
        });
    },

    /**
     * Find withholdings by company
     * @param {string} companyId - Company ID
     * @param {number} taxYear - Optional tax year filter
     * @returns {Array} Withholdings for the company
     */
    async findByCompany(companyId, taxYear = null) {
        const query = { companyId };
        if (taxYear) query.taxYear = taxYear;

        const results = await baseModel.find(query);
        return results.sort((a, b) => {
            const dateA = new Date(a.eventDate || 0);
            const dateB = new Date(b.eventDate || 0);
            return dateB - dateA;
        });
    },

    /**
     * Get employee year summary
     * @param {string} employeeId - Employee ID
     * @param {number} taxYear - Tax year
     * @returns {Object} Employee year summary
     */
    async getEmployeeYearSummary(employeeId, taxYear) {
        const results = await baseModel.find({ employeeId, taxYear });

        if (results.length === 0) {
            return {
                totalGrossIncome: 0,
                totalWithholding: 0,
                totalFederal: 0,
                totalState: 0,
                totalSocialSecurity: 0,
                totalMedicare: 0,
                transactionCount: 0
            };
        }

        return {
            totalGrossIncome: results.reduce((sum, r) => sum + (r.income?.grossAmount || 0), 0),
            totalWithholding: results.reduce((sum, r) => sum + (r.summary?.totalWithholding || 0), 0),
            totalFederal: results.reduce((sum, r) => sum + (r.summary?.federalWithholding || 0), 0),
            totalState: results.reduce((sum, r) => sum + (r.summary?.stateWithholding || 0), 0),
            totalSocialSecurity: results.reduce((sum, r) => sum + (r.summary?.socialSecurityWithholding || 0), 0),
            totalMedicare: results.reduce((sum, r) => sum + (r.summary?.medicareWithholding || 0), 0),
            transactionCount: results.length
        };
    },

    /**
     * Get company quarter summary
     * @param {string} companyId - Company ID
     * @param {number} taxYear - Tax year
     * @param {number} quarter - Quarter (1-4)
     * @returns {Array} Summary by event type
     */
    async getCompanyQuarterSummary(companyId, taxYear, quarter) {
        const quarterMonths = {
            1: [1, 2, 3],
            2: [4, 5, 6],
            3: [7, 8, 9],
            4: [10, 11, 12]
        };

        const months = quarterMonths[quarter];
        if (!months) {
            throw new Error('Invalid quarter. Must be 1-4.');
        }

        const startDate = new Date(taxYear, months[0] - 1, 1);
        const endDate = new Date(taxYear, months[2], 0, 23, 59, 59);

        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();

        const results = await baseModel.find({ companyId });

        // Filter by date range
        const filteredResults = results.filter(r => {
            const eventDate = r.eventDate;
            return eventDate >= startDateStr && eventDate <= endDateStr;
        });

        // Group by event type
        const byEventType = {};
        for (const r of filteredResults) {
            if (!byEventType[r.eventType]) {
                byEventType[r.eventType] = {
                    _id: r.eventType,
                    totalWithholding: 0,
                    count: 0
                };
            }
            byEventType[r.eventType].totalWithholding += r.summary?.totalWithholding || 0;
            byEventType[r.eventType].count++;
        }

        return Object.values(byEventType);
    },

    /**
     * Find by source
     * @param {string} sourceType - Source type
     * @param {string} sourceId - Source ID
     * @returns {Object|null} Withholding for the source
     */
    async findBySource(sourceType, sourceId) {
        return baseModel.findOne({ sourceType, sourceId });
    },

    /**
     * Get pending withholdings (calculated but not approved)
     * @param {string} companyId - Company ID
     * @returns {Array} Pending withholdings
     */
    async getPending(companyId) {
        return baseModel.find({ companyId, status: 'calculated' });
    },

    /**
     * Get withholdings awaiting remittance
     * @param {string} companyId - Company ID
     * @returns {Array} Processed withholdings awaiting remittance
     */
    async getAwaitingRemittance(companyId) {
        return baseModel.find({ companyId, status: 'processed' });
    }
};

module.exports = TaxWithholding;
