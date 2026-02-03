/**
 * SAFE Model (Simple Agreement for Future Equity)
 * Feature: Issue #64 - Create SAFE Data Model and Core Workflow
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    safeId: { type: 'string', unique: true, index: true },

    // Company reference
    companyId: { type: 'string', required: true, index: true },

    // Investor information
    investorId: { type: 'string', required: true, index: true },
    investorName: { type: 'string', required: true },
    investorEmail: { type: 'string' },
    investorType: { type: 'string', enum: ['individual', 'entity', 'fund'], default: 'individual' },

    // Investment terms
    investmentAmount: { type: 'number', required: true, min: 0 },
    currency: { type: 'string', default: 'USD', enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] },
    safeType: { type: 'string', enum: ['post-money', 'pre-money', 'mfn'], default: 'post-money', required: true },
    valuationCap: { type: 'number', min: 0 },
    discountRate: { type: 'number', min: 0, max: 1 },
    proRataRights: { type: 'boolean', default: false },

    // Status workflow
    status: {
        type: 'string',
        enum: ['draft', 'sent', 'fully_signed', 'funded', 'converted', 'cancelled', 'expired'],
        default: 'draft',
        required: true,
        index: true
    },

    // Timeline dates
    sentAt: { type: 'date' },
    signedAt: { type: 'date' },
    fundedAt: { type: 'date' },
    conversionAt: { type: 'date' },
    cancelledAt: { type: 'date' },
    expiresAt: { type: 'date' },

    // Conversion details
    convertedToRound: { type: 'string' },
    convertedToShareClass: { type: 'string' },
    conversionShares: { type: 'number', min: 0 },
    conversionPrice: { type: 'number', min: 0 },
    conversionDetails: {
        methodUsed: { type: 'string', enum: ['cap', 'discount', 'mfn'] },
        effectivePrice: { type: 'number' },
        calculationDetails: { type: 'object' }
    },

    // Signatures
    investorSignature: {
        signerId: { type: 'string' },
        signerName: { type: 'string' },
        signerEmail: { type: 'string' },
        signerTitle: { type: 'string' },
        signedAt: { type: 'date' },
        signatureData: { type: 'string' },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' }
    },
    companySignature: {
        signerId: { type: 'string' },
        signerName: { type: 'string' },
        signerEmail: { type: 'string' },
        signerTitle: { type: 'string' },
        signedAt: { type: 'date' },
        signatureData: { type: 'string' },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' }
    },

    // Document references
    documentId: { type: 'string' },
    signedDocumentId: { type: 'string' },

    // Audit trail
    statusHistory: { type: 'array', items: {
        status: { type: 'string', required: true },
        changedAt: { type: 'date' },
        changedBy: { type: 'string' },
        reason: { type: 'string' },
        metadata: { type: 'object' }
    }},
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' },

    // Additional data
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object', default: {} }
};

// Valid status transitions
const validTransitions = {
    draft: ['sent', 'cancelled'],
    sent: ['fully_signed', 'cancelled', 'expired'],
    fully_signed: ['funded', 'cancelled'],
    funded: ['converted', 'cancelled'],
    converted: [],
    cancelled: [],
    expired: []
};

// Create base model
const baseModel = createModel('securities', schema);

// Extended SAFE model with custom methods
const SAFE = {
    ...baseModel,

    /**
     * Create a new SAFE with generated safeId
     * @param {Object} data - SAFE data
     * @returns {Object} Created SAFE
     */
    async create(data) {
        const safeData = {
            ...data,
            safeId: data.safeId || `safe_${uuidv4()}`,
            status: data.status || 'draft',
            statusHistory: data.statusHistory || [{
                status: 'draft',
                changedAt: new Date().toISOString(),
                changedBy: data.createdBy,
                reason: 'SAFE created'
            }],
            metadata: data.metadata || {}
        };
        return baseModel.create(safeData);
    },

    /**
     * Check if SAFE is fully signed
     * @param {Object} safe - SAFE document
     * @returns {boolean}
     */
    isFullySigned(safe) {
        return !!(safe.investorSignature?.signedAt && safe.companySignature?.signedAt);
    },

    /**
     * Check if SAFE is expired
     * @param {Object} safe - SAFE document
     * @returns {boolean}
     */
    isExpired(safe) {
        return safe.expiresAt && new Date() > new Date(safe.expiresAt) && safe.status !== 'converted';
    },

    /**
     * Check if status transition is valid
     * @param {string} currentStatus - Current status
     * @param {string} newStatus - New status
     * @returns {boolean}
     */
    canTransitionTo(currentStatus, newStatus) {
        return validTransitions[currentStatus]?.includes(newStatus) || false;
    },

    /**
     * Transition SAFE to new status
     * @param {string} safeId - SAFE ID
     * @param {string} newStatus - New status
     * @param {string} userId - User making the change
     * @param {string} reason - Reason for change
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Updated SAFE
     */
    async transitionTo(safeId, newStatus, userId, reason = null, metadata = {}) {
        const safe = await this.findOne({ safeId });
        if (!safe) {
            throw new Error('SAFE not found');
        }

        if (!this.canTransitionTo(safe.status, newStatus)) {
            throw new Error(`Cannot transition from ${safe.status} to ${newStatus}`);
        }

        const statusHistory = safe.statusHistory || [];
        statusHistory.push({
            status: newStatus,
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason,
            metadata
        });

        const updateData = {
            status: newStatus,
            statusHistory,
            updatedBy: userId
        };

        // Set appropriate timestamp
        const timestampMap = {
            sent: 'sentAt',
            fully_signed: 'signedAt',
            funded: 'fundedAt',
            converted: 'conversionAt',
            cancelled: 'cancelledAt'
        };

        if (timestampMap[newStatus]) {
            updateData[timestampMap[newStatus]] = new Date().toISOString();
        }

        await this.updateOne({ safeId }, { $set: updateData });
        return this.findOne({ safeId });
    },

    /**
     * Add investor signature
     * @param {string} safeId - SAFE ID
     * @param {Object} signatureData - Signature data
     * @param {string} userId - User ID
     * @returns {Object} Updated SAFE
     */
    async addInvestorSignature(safeId, signatureData, userId) {
        const safe = await this.findOne({ safeId });
        if (!safe) {
            throw new Error('SAFE not found');
        }

        const updateData = {
            investorSignature: {
                ...signatureData,
                signedAt: new Date().toISOString()
            },
            updatedBy: userId
        };

        await this.updateOne({ safeId }, { $set: updateData });

        // Check if both signatures are now present
        const updatedSafe = await this.findOne({ safeId });
        if (updatedSafe.companySignature?.signedAt) {
            return this.transitionTo(safeId, 'fully_signed', userId, 'Both parties signed');
        }

        return updatedSafe;
    },

    /**
     * Add company signature
     * @param {string} safeId - SAFE ID
     * @param {Object} signatureData - Signature data
     * @param {string} userId - User ID
     * @returns {Object} Updated SAFE
     */
    async addCompanySignature(safeId, signatureData, userId) {
        const safe = await this.findOne({ safeId });
        if (!safe) {
            throw new Error('SAFE not found');
        }

        const updateData = {
            companySignature: {
                ...signatureData,
                signedAt: new Date().toISOString()
            },
            updatedBy: userId
        };

        await this.updateOne({ safeId }, { $set: updateData });

        // Check if both signatures are now present
        const updatedSafe = await this.findOne({ safeId });
        if (updatedSafe.investorSignature?.signedAt) {
            return this.transitionTo(safeId, 'fully_signed', userId, 'Both parties signed');
        }

        return updatedSafe;
    },

    /**
     * Record SAFE conversion
     * @param {string} safeId - SAFE ID
     * @param {Object} conversionData - Conversion details
     * @param {string} userId - User ID
     * @returns {Object} Updated SAFE
     */
    async recordConversion(safeId, conversionData, userId) {
        const safe = await this.findOne({ safeId });
        if (!safe) {
            throw new Error('SAFE not found');
        }

        if (safe.status !== 'funded') {
            throw new Error('SAFE must be funded before conversion');
        }

        const updateData = {
            convertedToRound: conversionData.fundingRoundId,
            convertedToShareClass: conversionData.shareClassId,
            conversionShares: conversionData.shares,
            conversionPrice: conversionData.pricePerShare,
            conversionDetails: {
                methodUsed: conversionData.methodUsed,
                effectivePrice: conversionData.effectivePrice,
                calculationDetails: conversionData.calculationDetails
            }
        };

        await this.updateOne({ safeId }, { $set: updateData });
        return this.transitionTo(safeId, 'converted', userId, 'Converted to equity');
    },

    /**
     * Find SAFEs by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} SAFEs
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Find SAFEs by investor
     * @param {string} investorId - Investor ID
     * @param {string} status - Optional status filter
     * @returns {Array} SAFEs
     */
    async findByInvestor(investorId, status = null) {
        const query = { investorId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Get total funded amount for a company
     * @param {string} companyId - Company ID
     * @returns {number} Total funded amount
     */
    async getTotalFundedAmount(companyId) {
        const safes = await this.find({ companyId, status: 'funded' });
        return safes.reduce((total, safe) => total + (safe.investmentAmount || 0), 0);
    },

    /**
     * Get SAFEs pending conversion
     * @param {string} companyId - Company ID
     * @returns {Array} SAFEs pending conversion
     */
    async getPendingConversion(companyId) {
        return this.find({ companyId, status: 'funded' }, { sort: { fundedAt: 1 } });
    }
};

module.exports = SAFE;
