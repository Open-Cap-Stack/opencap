/**
 * Valuation409A Model
 * Feature: Issue #59 - Create 409A Valuation Request System
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Implements workflow for requesting, tracking, and storing 409A valuations.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    valuationId: { type: 'string', unique: true, index: true },

    // Company reference
    companyId: { type: 'string', required: true, index: true },

    // Request details
    requestedBy: { type: 'string', required: true },
    requestedAt: { type: 'date' },
    reason: {
        type: 'string',
        enum: [
            'annual_valuation',
            'fundraising_round',
            'material_event',
            'option_grant',
            'board_request',
            'audit_requirement',
            'other'
        ],
        required: true
    },
    reasonDetails: { type: 'string' },

    // Status workflow
    status: {
        type: 'string',
        enum: [
            'requested',
            'in_progress',
            'draft_received',
            'under_review',
            'approved',
            'expired',
            'cancelled'
        ],
        default: 'requested',
        required: true,
        index: true
    },

    // Valuation details
    fairMarketValue: { type: 'number', min: 0 },
    valuationMethod: { type: 'string', enum: ['income', 'market', 'asset', 'hybrid', 'other'] },
    effectiveDate: { type: 'date' },
    expirationDate: { type: 'date' },

    // Valuation firm
    valuationFirm: {
        name: { type: 'string' },
        contactName: { type: 'string' },
        contactEmail: { type: 'string' },
        phone: { type: 'string' },
        assignedAt: { type: 'date' }
    },

    // Timeline dates
    draftReceivedAt: { type: 'date' },
    reviewStartedAt: { type: 'date' },
    approvedAt: { type: 'date' },
    cancelledAt: { type: 'date' },

    // Document references
    documents: { type: 'array', items: {
        documentId: { type: 'string' },
        type: { type: 'string', enum: ['valuation_report', 'draft_report', 'supporting_data', 'board_approval', 'other'], required: true },
        name: { type: 'string' },
        uploadedAt: { type: 'date' },
        uploadedBy: { type: 'string' }
    }},

    // Board approval
    boardApproval: {
        approved: { type: 'boolean', default: false },
        approvedBy: { type: 'string' },
        approvedAt: { type: 'date' },
        resolution: { type: 'string' }
    },

    // Audit trail
    statusHistory: { type: 'array', items: {
        status: { type: 'string', required: true },
        changedAt: { type: 'date' },
        changedBy: { type: 'string' },
        reason: { type: 'string' },
        metadata: { type: 'object' }
    }},

    // Metadata
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object', default: {} },

    // Tracking
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' }
};

// Valid status transitions
const validTransitions = {
    requested: ['in_progress', 'cancelled'],
    in_progress: ['draft_received', 'cancelled'],
    draft_received: ['under_review', 'cancelled'],
    under_review: ['approved', 'draft_received', 'cancelled'],
    approved: ['expired'],
    expired: [],
    cancelled: []
};

// Create base model
const baseModel = createModel('valuations', schema);

// Extended Valuation409A model with custom methods
const Valuation409A = {
    ...baseModel,
    tableName: 'valuations',
    schema,

    // Delegate core methods to baseModel (class methods aren't copied by spread)
    async find(query, options) {
        return baseModel.find.call(baseModel, query, options);
    },

    async findOne(query, options) {
        return baseModel.findOne.call(baseModel, query, options);
    },

    async findById(id, options) {
        return baseModel.findById.call(baseModel, id, options);
    },

    async updateOne(query, update, options) {
        return baseModel.updateOne.call(baseModel, query, update, options);
    },

    async deleteOne(query) {
        return baseModel.deleteOne.call(baseModel, query);
    },

    async countDocuments(query) {
        return baseModel.countDocuments.call(baseModel, query);
    },

    /**
     * Create a new 409A valuation with generated valuationId
     * @param {Object} data - Valuation data
     * @returns {Object} Created valuation
     */
    async create(data) {
        const valuationData = {
            ...data,
            valuationId: data.valuationId || `val_${uuidv4()}`,
            status: data.status || 'requested',
            requestedAt: data.requestedAt || new Date().toISOString(),
            statusHistory: data.statusHistory || [{
                status: 'requested',
                changedAt: new Date().toISOString(),
                changedBy: data.createdBy,
                reason: 'Valuation request created'
            }],
            documents: data.documents || [],
            metadata: data.metadata || {}
        };
        return baseModel.create(valuationData);
    },

    /**
     * Check if valuation is expired
     * @param {Object} valuation - Valuation document
     * @returns {boolean}
     */
    isExpired(valuation) {
        if (!valuation.expirationDate) return false;
        return new Date() > new Date(valuation.expirationDate) && valuation.status === 'approved';
    },

    /**
     * Get days until expiration
     * @param {Object} valuation - Valuation document
     * @returns {number|null}
     */
    getDaysUntilExpiration(valuation) {
        if (!valuation.expirationDate) return null;
        const now = new Date();
        const diff = new Date(valuation.expirationDate) - now;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    /**
     * Check if valuation needs renewal reminder
     * @param {Object} valuation - Valuation document
     * @returns {boolean}
     */
    needsRenewalReminder(valuation) {
        if (!valuation.expirationDate || valuation.status !== 'approved') return false;
        const daysUntil = this.getDaysUntilExpiration(valuation);
        return daysUntil !== null && daysUntil <= 60 && daysUntil > 0;
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
     * Transition valuation to new status
     * @param {string} valuationId - Valuation ID
     * @param {string} newStatus - New status
     * @param {string} userId - User making the change
     * @param {string} reason - Reason for change
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Updated valuation
     */
    async transitionTo(valuationId, newStatus, userId, reason = null, metadata = {}) {
        const valuation = await this.findOne({ valuationId });
        if (!valuation) {
            throw new Error('Valuation not found');
        }

        if (!this.canTransitionTo(valuation.status, newStatus)) {
            throw new Error(`Cannot transition from ${valuation.status} to ${newStatus}`);
        }

        const statusHistory = valuation.statusHistory || [];
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
            in_progress: null,
            draft_received: 'draftReceivedAt',
            under_review: 'reviewStartedAt',
            approved: 'approvedAt',
            cancelled: 'cancelledAt'
        };

        if (timestampMap[newStatus]) {
            updateData[timestampMap[newStatus]] = new Date().toISOString();
        }

        // Calculate expiration date when approved (12 months from effective date)
        if (newStatus === 'approved' && valuation.effectiveDate) {
            const expiration = new Date(valuation.effectiveDate);
            expiration.setFullYear(expiration.getFullYear() + 1);
            updateData.expirationDate = expiration.toISOString();
        }

        await this.updateOne({ valuationId }, { $set: updateData });
        return this.findOne({ valuationId });
    },

    /**
     * Assign valuation firm
     * @param {string} valuationId - Valuation ID
     * @param {Object} firmData - Firm data
     * @param {string} userId - User ID
     * @returns {Object} Updated valuation
     */
    async assignValuationFirm(valuationId, firmData, userId) {
        const valuation = await this.findOne({ valuationId });
        if (!valuation) {
            throw new Error('Valuation not found');
        }

        await this.updateOne({ valuationId }, {
            $set: {
                valuationFirm: {
                    ...firmData,
                    assignedAt: new Date().toISOString()
                },
                updatedBy: userId
            }
        });

        if (valuation.status === 'requested') {
            return this.transitionTo(valuationId, 'in_progress', userId, 'Valuation firm assigned');
        }

        return this.findOne({ valuationId });
    },

    /**
     * Receive draft valuation
     * @param {string} valuationId - Valuation ID
     * @param {Object} draftData - Draft data
     * @param {string} userId - User ID
     * @returns {Object} Updated valuation
     */
    async receiveDraft(valuationId, draftData, userId) {
        const valuation = await this.findOne({ valuationId });
        if (!valuation) {
            throw new Error('Valuation not found');
        }

        if (valuation.status !== 'in_progress') {
            throw new Error('Can only receive draft when valuation is in progress');
        }

        const updateData = { updatedBy: userId };
        if (draftData.fairMarketValue) {
            updateData.fairMarketValue = draftData.fairMarketValue;
        }
        if (draftData.valuationMethod) {
            updateData.valuationMethod = draftData.valuationMethod;
        }
        if (draftData.effectiveDate) {
            updateData.effectiveDate = draftData.effectiveDate;
        }

        await this.updateOne({ valuationId }, { $set: updateData });
        return this.transitionTo(valuationId, 'draft_received', userId, 'Draft report received', draftData);
    },

    /**
     * Start review
     * @param {string} valuationId - Valuation ID
     * @param {string} userId - User ID
     * @param {string} reviewNotes - Optional review notes
     * @returns {Object} Updated valuation
     */
    async startReview(valuationId, userId, reviewNotes = null) {
        const valuation = await this.findOne({ valuationId });
        if (!valuation) {
            throw new Error('Valuation not found');
        }

        if (valuation.status !== 'draft_received') {
            throw new Error('Can only start review after draft is received');
        }

        return this.transitionTo(valuationId, 'under_review', userId, reviewNotes || 'Review started');
    },

    /**
     * Approve valuation
     * @param {string} valuationId - Valuation ID
     * @param {string} userId - User ID
     * @param {Object} boardApprovalData - Optional board approval data
     * @returns {Object} Updated valuation
     */
    async approve(valuationId, userId, boardApprovalData = null) {
        const valuation = await this.findOne({ valuationId });
        if (!valuation) {
            throw new Error('Valuation not found');
        }

        if (valuation.status !== 'under_review') {
            throw new Error('Can only approve after review');
        }

        if (!valuation.fairMarketValue) {
            throw new Error('Fair market value must be set before approval');
        }

        if (!valuation.effectiveDate) {
            throw new Error('Effective date must be set before approval');
        }

        if (boardApprovalData) {
            await this.updateOne({ valuationId }, {
                $set: {
                    boardApproval: {
                        approved: true,
                        approvedBy: userId,
                        approvedAt: new Date().toISOString(),
                        resolution: boardApprovalData.resolution
                    }
                }
            });
        }

        return this.transitionTo(valuationId, 'approved', userId, 'Valuation approved');
    },

    /**
     * Add document to valuation
     * @param {string} valuationId - Valuation ID
     * @param {Object} documentData - Document data
     * @param {string} userId - User ID
     * @returns {Object} Updated valuation
     */
    async addDocument(valuationId, documentData, userId) {
        const valuation = await this.findOne({ valuationId });
        if (!valuation) {
            throw new Error('Valuation not found');
        }

        const documents = valuation.documents || [];
        documents.push({
            ...documentData,
            uploadedAt: new Date().toISOString(),
            uploadedBy: userId
        });

        await this.updateOne({ valuationId }, {
            $set: {
                documents,
                updatedBy: userId
            }
        });

        return this.findOne({ valuationId });
    },

    /**
     * Mark valuation as expired
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Updated valuation
     */
    async markExpired(valuationId) {
        const valuation = await this.findOne({ valuationId });
        if (!valuation) {
            throw new Error('Valuation not found');
        }

        if (valuation.status !== 'approved') {
            throw new Error('Only approved valuations can expire');
        }

        const statusHistory = valuation.statusHistory || [];
        statusHistory.push({
            status: 'expired',
            changedAt: new Date().toISOString(),
            reason: 'Valuation expired after 12 months'
        });

        await this.updateOne({ valuationId }, {
            $set: {
                status: 'expired',
                statusHistory
            }
        });

        return this.findOne({ valuationId });
    },

    /**
     * Find valuations by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} Valuations
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Find current valuation for company
     * @param {string} companyId - Company ID
     * @returns {Object|null} Current valuation
     */
    async findCurrentValuation(companyId) {
        const valuations = await this.find({
            companyId,
            status: 'approved'
        }, { sort: { effectiveDate: -1 } });

        const now = new Date();
        return valuations.find(v => v.expirationDate && new Date(v.expirationDate) > now) || null;
    },

    /**
     * Find expiring valuations
     * @param {number} daysThreshold - Days threshold (default 60)
     * @returns {Array} Expiring valuations
     */
    async findExpiringValuations(daysThreshold = 60) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

        const valuations = await this.find({ status: 'approved' });
        const now = new Date();

        return valuations.filter(v =>
            v.expirationDate &&
            new Date(v.expirationDate) > now &&
            new Date(v.expirationDate) <= thresholdDate
        );
    },

    /**
     * Find and update expired valuations
     * @returns {Array} Expired valuations
     */
    async findExpiredValuations() {
        const valuations = await this.find({ status: 'approved' });
        const now = new Date();
        const expiredValuations = [];

        for (const valuation of valuations) {
            if (valuation.expirationDate && new Date(valuation.expirationDate) < now) {
                await this.markExpired(valuation.valuationId);
                expiredValuations.push(valuation);
            }
        }

        return expiredValuations;
    },

    /**
     * Get company valuation history
     * @param {string} companyId - Company ID
     * @returns {Array} Valuation history
     */
    async getCompanyValuationHistory(companyId) {
        const valuations = await this.find({ companyId }, { sort: { effectiveDate: -1 } });
        return valuations.map(v => ({
            valuationId: v.valuationId,
            status: v.status,
            fairMarketValue: v.fairMarketValue,
            effectiveDate: v.effectiveDate,
            expirationDate: v.expirationDate,
            reason: v.reason,
            createdAt: v.createdAt
        }));
    }
};

module.exports = Valuation409A;
