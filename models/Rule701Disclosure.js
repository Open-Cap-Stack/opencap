/**
 * Rule 701 Disclosure Model
 * Feature: Issue #74 - Rule 701 Compliance Tracking
 * SEC Rule 701: Exemption for securities issued under compensatory benefit plans
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Constants
const PERIOD_TYPES = ['annual', 'quarterly', 'rolling_12_month'];
const DISCLOSURE_LEVELS = ['none', 'basic', 'enhanced'];
const STATUSES = ['draft', 'pending_review', 'approved', 'filed', 'archived'];
const RECIPIENT_TYPES = ['employee', 'director', 'consultant'];
const GRANT_TYPE_MAP = {
    iso: 'stockOptions',
    nso: 'stockOptions',
    rsu: 'rsus',
    rsa: 'restrictedStock'
};

// Schema definition (for documentation)
const schema = {
    _id: { type: 'string', required: true },
    disclosureId: { type: 'string', unique: true },
    companyId: { type: 'string', required: true },
    periodType: { type: 'string', enum: PERIOD_TYPES, default: 'rolling_12_month' },
    periodStart: { type: 'date', required: true },
    periodEnd: { type: 'date', required: true },
    companyFinancials: {
        totalAssets: { type: 'number', required: true },
        annualRevenue: { type: 'number' },
        outstandingSecurities: {
            commonShares: { type: 'number' },
            preferredShares: { type: 'number' },
            optionsOutstanding: { type: 'number' },
            warrantsOutstanding: { type: 'number' }
        },
        fifteenPercentOfAssets: { type: 'number' },
        fifteenPercentOfSecurities: { type: 'number' }
    },
    thresholds: {
        basic: { type: 'number', default: 1000000 },
        assetBased: { type: 'number' },
        securityBased: { type: 'number' },
        applicable: { type: 'number' }
    },
    aggregateSales: {
        totalSales: { type: 'number', required: true },
        stockOptions: { type: 'number', default: 0 },
        restrictedStock: { type: 'number', default: 0 },
        rsus: { type: 'number', default: 0 },
        espp: { type: 'number', default: 0 },
        other: { type: 'number', default: 0 }
    },
    compliance: {
        isCompliant: { type: 'boolean', required: true },
        thresholdUtilization: { type: 'number' },
        remainingCapacity: { type: 'number' },
        disclosureRequired: { type: 'boolean', default: false },
        disclosureLevel: { type: 'string', enum: DISCLOSURE_LEVELS, default: 'none' }
    },
    disclosureRequirements: {
        riskFactorsRequired: { type: 'boolean', default: false },
        financialStatementsRequired: { type: 'boolean', default: false },
        summaryOfPlanRequired: { type: 'boolean', default: false },
        additionalDisclosures: { type: 'array', default: [] }
    },
    grantsInPeriod: { type: 'array', default: [] },
    grantsSummary: {
        totalGrants: { type: 'number', default: 0 },
        totalRecipients: { type: 'number', default: 0 },
        byRecipientType: {
            employees: { type: 'number', default: 0 },
            directors: { type: 'number', default: 0 },
            consultants: { type: 'number', default: 0 }
        }
    },
    status: { type: 'string', enum: STATUSES, default: 'draft' },
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' },
    reviewedBy: { type: 'string' },
    reviewedAt: { type: 'date' },
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },
    notes: { type: 'string' },
    metadata: { type: 'object', default: {} },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

/**
 * Calculate thresholds based on company financials
 * @param {Object} companyFinancials - Company financial data
 * @param {number} basicThreshold - Basic threshold (default $1M)
 * @returns {Object} Calculated thresholds
 */
const calculateThresholds = (companyFinancials, basicThreshold = 1000000) => {
    const assetBased = companyFinancials.totalAssets * 0.15;

    let securityBased = 0;
    if (companyFinancials.outstandingSecurities) {
        const totalSecurities =
            (companyFinancials.outstandingSecurities.commonShares || 0) +
            (companyFinancials.outstandingSecurities.preferredShares || 0);
        securityBased = totalSecurities * 0.15;
    }

    const applicable = Math.max(basicThreshold, assetBased, securityBased);

    return {
        basic: basicThreshold,
        assetBased,
        securityBased,
        applicable
    };
};

/**
 * Calculate compliance status based on thresholds and sales
 * @param {number} totalSales - Total aggregate sales
 * @param {number} applicableThreshold - Applicable threshold
 * @returns {Object} Compliance status
 */
const calculateCompliance = (totalSales, applicableThreshold) => {
    const isCompliant = totalSales <= applicableThreshold;
    const thresholdUtilization = (totalSales / applicableThreshold) * 100;
    const remainingCapacity = applicableThreshold - totalSales;

    return {
        isCompliant,
        thresholdUtilization,
        remainingCapacity,
        ...determineDisclosureRequirements(totalSales)
    };
};

/**
 * Determine disclosure requirements based on sales amount
 * @param {number} totalSales - Total aggregate sales
 * @returns {Object} Disclosure requirements
 */
const determineDisclosureRequirements = (totalSales) => {
    if (totalSales > 10000000) {
        return {
            disclosureRequired: true,
            disclosureLevel: 'enhanced'
        };
    } else if (totalSales > 5000000) {
        return {
            disclosureRequired: true,
            disclosureLevel: 'basic'
        };
    }
    return {
        disclosureRequired: false,
        disclosureLevel: 'none'
    };
};

/**
 * Get detailed disclosure requirements based on level
 * @param {string} level - Disclosure level
 * @returns {Object} Detailed disclosure requirements
 */
const getDetailedDisclosureRequirements = (level) => {
    if (level === 'enhanced') {
        return {
            riskFactorsRequired: true,
            financialStatementsRequired: true,
            summaryOfPlanRequired: true,
            additionalDisclosures: [
                'Risk factors relating to the company and its business',
                'Financial statements (audited if available)',
                'Summary of material terms of the plan',
                'Any additional information required to make disclosures not misleading'
            ]
        };
    } else if (level === 'basic') {
        return {
            riskFactorsRequired: true,
            financialStatementsRequired: false,
            summaryOfPlanRequired: true,
            additionalDisclosures: [
                'Summary of material plan terms',
                'Risk factors disclosure'
            ]
        };
    }
    return {
        riskFactorsRequired: false,
        financialStatementsRequired: false,
        summaryOfPlanRequired: false,
        additionalDisclosures: []
    };
};

/**
 * Check if over threshold (virtual)
 * @param {Object} doc - Document
 * @returns {boolean} True if over threshold
 */
const isOverThreshold = (doc) => {
    return doc.aggregateSales?.totalSales > doc.thresholds?.applicable;
};

/**
 * Get utilization status (virtual)
 * @param {Object} doc - Document
 * @returns {string} Utilization status
 */
const getUtilizationStatus = (doc) => {
    const util = doc.compliance?.thresholdUtilization || 0;
    if (util >= 100) return 'exceeded';
    if (util >= 90) return 'critical';
    if (util >= 75) return 'warning';
    return 'normal';
};

// Create base model
const baseModel = createModel('rule701_disclosures', schema);

// Extended model with custom methods
const Rule701Disclosure = {
    ...baseModel,

    // Expose constants
    PERIOD_TYPES,
    DISCLOSURE_LEVELS,
    STATUSES,
    RECIPIENT_TYPES,

    /**
     * Create a new Rule 701 disclosure with calculations
     * @param {Object} data - Disclosure data
     * @returns {Object} Created disclosure
     */
    async create(data) {
        const disclosureId = data.disclosureId || `r701_${uuidv4()}`;

        // Calculate thresholds
        const thresholds = calculateThresholds(
            data.companyFinancials,
            data.thresholds?.basic || 1000000
        );

        // Calculate compliance
        const totalSales = data.aggregateSales?.totalSales || 0;
        const compliance = calculateCompliance(totalSales, thresholds.applicable);

        // Get disclosure requirements
        const disclosureRequirements = getDetailedDisclosureRequirements(
            compliance.disclosureLevel
        );

        // Prepare document
        const disclosureData = {
            ...data,
            disclosureId,
            thresholds,
            compliance,
            disclosureRequirements,
            aggregateSales: {
                totalSales: 0,
                stockOptions: 0,
                restrictedStock: 0,
                rsus: 0,
                espp: 0,
                other: 0,
                ...data.aggregateSales
            },
            grantsInPeriod: data.grantsInPeriod || [],
            grantsSummary: data.grantsSummary || {
                totalGrants: 0,
                totalRecipients: 0,
                byRecipientType: {
                    employees: 0,
                    directors: 0,
                    consultants: 0
                }
            },
            status: data.status || 'draft',
            metadata: data.metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return baseModel.create(disclosureData);
    },

    /**
     * Update and recalculate compliance
     * @param {Object} query - Query filter
     * @param {Object} update - Update data
     * @param {Object} options - Update options
     * @returns {Object} Update result
     */
    async findOneAndUpdate(query, update, options = {}) {
        const updateData = update.$set || update;
        const existingDoc = await baseModel.findOne(query);

        if (existingDoc) {
            // Merge financials if updated
            const companyFinancials = updateData.companyFinancials
                ? { ...existingDoc.companyFinancials, ...updateData.companyFinancials }
                : existingDoc.companyFinancials;

            // Merge aggregate sales if updated
            const aggregateSales = updateData.aggregateSales
                ? { ...existingDoc.aggregateSales, ...updateData.aggregateSales }
                : existingDoc.aggregateSales;

            // Recalculate thresholds and compliance
            const thresholds = calculateThresholds(companyFinancials);
            const compliance = calculateCompliance(
                aggregateSales.totalSales,
                thresholds.applicable
            );
            const disclosureRequirements = getDetailedDisclosureRequirements(
                compliance.disclosureLevel
            );

            updateData.thresholds = thresholds;
            updateData.compliance = compliance;
            updateData.disclosureRequirements = disclosureRequirements;
        }

        updateData.updatedAt = new Date().toISOString();

        return baseModel.findOneAndUpdate(query, { $set: updateData }, options);
    },

    /**
     * Approve a disclosure
     * @param {string} disclosureId - Disclosure ID or _id
     * @param {string} userId - Approving user ID
     * @returns {Object} Updated disclosure
     */
    async approve(disclosureId, userId) {
        const doc = await baseModel.findOne({
            $or: [{ _id: disclosureId }, { disclosureId }]
        });

        if (!doc) {
            throw new Error('Disclosure not found');
        }

        if (doc.status !== 'pending_review') {
            throw new Error('Disclosure must be in pending_review status');
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
     * Add a grant to the disclosure
     * @param {string} disclosureId - Disclosure ID or _id
     * @param {Object} grantData - Grant data to add
     * @returns {Object} Updated disclosure
     */
    async addGrant(disclosureId, grantData) {
        const doc = await baseModel.findOne({
            $or: [{ _id: disclosureId }, { disclosureId }]
        });

        if (!doc) {
            throw new Error('Disclosure not found');
        }

        // Add grant to array
        const grantsInPeriod = [...(doc.grantsInPeriod || []), grantData];

        // Update aggregates
        const aggregateSales = { ...doc.aggregateSales };
        aggregateSales.totalSales = (aggregateSales.totalSales || 0) + grantData.aggregateValue;

        // Update by grant type
        const category = GRANT_TYPE_MAP[grantData.grantType] || 'other';
        aggregateSales[category] = (aggregateSales[category] || 0) + grantData.aggregateValue;

        // Update grants summary
        const grantsSummary = { ...doc.grantsSummary };
        grantsSummary.totalGrants = (grantsSummary.totalGrants || 0) + 1;

        // Update by recipient type
        if (grantData.recipientType) {
            const recipientKey = `${grantData.recipientType}s`;
            if (!grantsSummary.byRecipientType) {
                grantsSummary.byRecipientType = { employees: 0, directors: 0, consultants: 0 };
            }
            grantsSummary.byRecipientType[recipientKey] =
                (grantsSummary.byRecipientType[recipientKey] || 0) + 1;
        }

        // Recalculate compliance
        const thresholds = calculateThresholds(doc.companyFinancials);
        const compliance = calculateCompliance(aggregateSales.totalSales, thresholds.applicable);
        const disclosureRequirements = getDetailedDisclosureRequirements(compliance.disclosureLevel);

        const updateData = {
            grantsInPeriod,
            aggregateSales,
            grantsSummary,
            thresholds,
            compliance,
            disclosureRequirements,
            updatedAt: new Date().toISOString()
        };

        await baseModel.updateOne({ _id: doc._id }, { $set: updateData });

        return { ...doc, ...updateData };
    },

    /**
     * Find disclosures by company
     * @param {string} companyId - Company ID
     * @returns {Array} Disclosures for company
     */
    async findByCompany(companyId) {
        const results = await baseModel.find({ companyId });
        return results.sort((a, b) => {
            const dateA = new Date(a.periodEnd || 0);
            const dateB = new Date(b.periodEnd || 0);
            return dateB - dateA;
        });
    },

    /**
     * Get current period disclosure for a company
     * @param {string} companyId - Company ID
     * @returns {Object|null} Current period disclosure
     */
    async getCurrentPeriod(companyId) {
        const now = new Date().toISOString();
        const results = await baseModel.find({ companyId });

        // Filter for current period
        return results.find(doc => {
            return doc.periodStart <= now && doc.periodEnd >= now;
        }) || null;
    },

    /**
     * Get compliance history for a company
     * @param {string} companyId - Company ID
     * @param {number} years - Number of years to look back
     * @returns {Array} Compliance history
     */
    async getComplianceHistory(companyId, years = 3) {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - years);
        const startDateStr = startDate.toISOString();

        const results = await baseModel.find({ companyId });

        // Filter by date and sort
        return results
            .filter(doc => doc.periodStart >= startDateStr)
            .sort((a, b) => {
                const dateA = new Date(a.periodStart || 0);
                const dateB = new Date(b.periodStart || 0);
                return dateA - dateB;
            });
    },

    /**
     * Create a rolling 12-month disclosure
     * @param {string} companyId - Company ID
     * @param {Object} companyFinancials - Company financial data
     * @param {string} userId - Creating user ID
     * @returns {Object} Created disclosure
     */
    async createRolling12MonthDisclosure(companyId, companyFinancials, userId) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        return this.create({
            companyId,
            periodType: 'rolling_12_month',
            periodStart: startDate.toISOString(),
            periodEnd: endDate.toISOString(),
            companyFinancials,
            aggregateSales: {
                totalSales: 0,
                stockOptions: 0,
                restrictedStock: 0,
                rsus: 0,
                espp: 0,
                other: 0
            },
            createdBy: userId
        });
    },

    /**
     * Check if over threshold (virtual)
     * @param {Object} doc - Document
     * @returns {boolean} True if over threshold
     */
    isOverThreshold(doc) {
        return isOverThreshold(doc);
    },

    /**
     * Get utilization status (virtual)
     * @param {Object} doc - Document
     * @returns {string} Utilization status
     */
    getUtilizationStatus(doc) {
        return getUtilizationStatus(doc);
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
            isOverThreshold: isOverThreshold(doc),
            utilizationStatus: getUtilizationStatus(doc)
        };
    }
};

module.exports = Rule701Disclosure;
