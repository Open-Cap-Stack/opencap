/**
 * SignatureRequest Model
 * Feature: Issue #66 - SAFE Digital Signature Workflow
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages digital signature requests for documents.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for signer
const signerSchema = {
    _id: { type: 'string' },
    signerId: { type: 'string' }, // Reference to User
    name: { type: 'string', required: true },
    email: { type: 'string', required: true },
    role: {
        type: 'string',
        enum: ['investor', 'company_representative', 'witness', 'legal_counsel'],
        required: true
    },
    order: { type: 'number', default: 1 },
    status: {
        type: 'string',
        enum: ['pending', 'sent', 'viewed', 'signed', 'declined', 'expired'],
        default: 'pending'
    },
    sentAt: { type: 'string' },
    viewedAt: { type: 'string' },
    signedAt: { type: 'string' },
    declinedAt: { type: 'string' },
    declineReason: { type: 'string' },
    signatureData: {
        signature: { type: 'string' },
        initials: { type: 'string' },
        ipAddress: { type: 'string' },
        userAgent: { type: 'string' },
        timestamp: { type: 'string' }
    },
    remindersSent: { type: 'number', default: 0 },
    lastReminderAt: { type: 'string' }
};

// Schema definition for audit events
const auditEventSchema = {
    event: {
        type: 'string',
        enum: [
            'created', 'sent', 'viewed', 'signed', 'declined',
            'reminder_sent', 'expired', 'cancelled', 'completed',
            'document_downloaded', 'voided'
        ],
        required: true
    },
    timestamp: { type: 'string' },
    userId: { type: 'string' }, // Reference to User
    signerEmail: { type: 'string' },
    ipAddress: { type: 'string' },
    userAgent: { type: 'string' },
    metadata: { type: 'object' }
};

// Main schema definition
const signatureRequestSchema = {
    _id: { type: 'string', required: true },
    requestId: { type: 'string', unique: true, required: true },
    documentType: {
        type: 'string',
        enum: ['safe', 'stock_option_agreement', 'board_consent', 'employment_agreement', 'nda', 'other'],
        required: true
    },
    documentId: { type: 'string' }, // Reference to Document/SAFE/EquityGrant
    documentModel: {
        type: 'string',
        enum: ['SAFE', 'Document', 'EquityGrant'],
        default: 'Document'
    },
    companyId: { type: 'string', required: true }, // Reference to Company
    title: { type: 'string', required: true },
    message: { type: 'string' },
    signers: { type: 'array', items: signerSchema },
    signingOrder: {
        type: 'string',
        enum: ['parallel', 'sequential'],
        default: 'parallel'
    },
    status: {
        type: 'string',
        enum: ['draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled', 'voided'],
        default: 'draft'
    },
    sentAt: { type: 'string' },
    completedAt: { type: 'string' },
    expiresAt: { type: 'string' },
    cancelledAt: { type: 'string' },
    voidedAt: { type: 'string' },
    originalDocument: {
        url: { type: 'string' },
        filename: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' }
    },
    signedDocument: {
        url: { type: 'string' },
        filename: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
        generatedAt: { type: 'string' }
    },
    provider: {
        type: 'string',
        enum: ['internal', 'docusign', 'hellosign', 'pandadoc'],
        default: 'internal'
    },
    externalId: { type: 'string' },
    externalData: { type: 'object' },
    auditTrail: { type: 'array', items: auditEventSchema },
    settings: {
        reminderEnabled: { type: 'boolean', default: true },
        reminderDays: { type: 'number', default: 3 },
        maxReminders: { type: 'number', default: 3 },
        expirationDays: { type: 'number', default: 30 },
        requireInitials: { type: 'boolean', default: false },
        allowDecline: { type: 'boolean', default: true }
    },
    createdBy: { type: 'string', required: true }, // Reference to User
    updatedBy: { type: 'string' }, // Reference to User
    metadata: { type: 'object', default: {} },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
};

// Valid enums for validation
const VALID_DOCUMENT_TYPES = ['safe', 'stock_option_agreement', 'board_consent', 'employment_agreement', 'nda', 'other'];
const VALID_DOCUMENT_MODELS = ['SAFE', 'Document', 'EquityGrant'];
const VALID_STATUSES = ['draft', 'sent', 'in_progress', 'completed', 'declined', 'expired', 'cancelled', 'voided'];
const VALID_SIGNING_ORDERS = ['parallel', 'sequential'];
const VALID_SIGNER_ROLES = ['investor', 'company_representative', 'witness', 'legal_counsel'];
const VALID_SIGNER_STATUSES = ['pending', 'sent', 'viewed', 'signed', 'declined', 'expired'];
const VALID_PROVIDERS = ['internal', 'docusign', 'hellosign', 'pandadoc'];
const VALID_AUDIT_EVENTS = [
    'created', 'sent', 'viewed', 'signed', 'declined',
    'reminder_sent', 'expired', 'cancelled', 'completed',
    'document_downloaded', 'voided'
];

// Create base model
const baseModel = createModel('signature_requests', signatureRequestSchema);

/**
 * SignatureRequest Model with custom methods
 */
const SignatureRequestModel = {
    // Base model reference
    _baseModel: baseModel,
    tableName: baseModel.tableName,
    schema: signatureRequestSchema,

    // Expose base model methods
    find: (query, options) => baseModel.find(query, options),
    findOne: (query, options) => baseModel.findOne(query, options),
    findById: (id, options) => baseModel.findById(id, options),
    findOneAndUpdate: (query, update, options) => baseModel.findOneAndUpdate(query, update, options),
    findByIdAndUpdate: (id, update, options) => baseModel.findByIdAndUpdate(id, update, options),
    updateOne: (query, update, options) => baseModel.updateOne(query, update, options),
    updateMany: (query, update, options) => baseModel.updateMany(query, update, options),
    deleteOne: (query) => baseModel.deleteOne(query),
    deleteMany: (query) => baseModel.deleteMany(query),
    findOneAndDelete: (query) => baseModel.findOneAndDelete(query),
    findByIdAndDelete: (id) => baseModel.findByIdAndDelete(id),
    countDocuments: (query) => baseModel.countDocuments(query),
    exists: (query) => baseModel.exists(query),
    distinct: (field, query) => baseModel.distinct(field, query),
    aggregate: (pipeline) => baseModel.aggregate(pipeline),
    insertMany: (dataArray) => baseModel.insertMany(dataArray),

    /**
     * Generate a unique request ID
     * @returns {string} Request ID
     */
    generateRequestId() {
        return `sig_${uuidv4()}`;
    },

    /**
     * Add default settings to a request
     * @param {Object} data - Request data
     * @returns {Object} Data with default settings
     */
    applyDefaults(data) {
        return {
            ...data,
            requestId: data.requestId || this.generateRequestId(),
            status: data.status || 'draft',
            signingOrder: data.signingOrder || 'parallel',
            documentModel: data.documentModel || 'Document',
            provider: data.provider || 'internal',
            settings: {
                reminderEnabled: true,
                reminderDays: 3,
                maxReminders: 3,
                expirationDays: 30,
                requireInitials: false,
                allowDecline: true,
                ...(data.settings || {})
            },
            signers: (data.signers || []).map(signer => ({
                _id: signer._id || uuidv4(),
                ...signer,
                status: signer.status || 'pending',
                order: signer.order || 1,
                remindersSent: signer.remindersSent || 0
            })),
            auditTrail: data.auditTrail || [],
            metadata: data.metadata || {}
        };
    },

    /**
     * Create a new signature request with validation
     * @param {Object} data - Request data
     * @returns {Object} Created request
     */
    async create(data) {
        // Apply defaults
        const requestData = this.applyDefaults(data);

        // Validate required fields
        if (!requestData.documentType) {
            throw new Error('documentType is required');
        }
        if (!VALID_DOCUMENT_TYPES.includes(requestData.documentType)) {
            throw new Error(`documentType must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`);
        }
        if (!requestData.companyId) {
            throw new Error('companyId is required');
        }
        if (!requestData.title) {
            throw new Error('title is required');
        }
        if (!requestData.createdBy) {
            throw new Error('createdBy is required');
        }

        // Validate signers
        for (const signer of requestData.signers) {
            if (!signer.name) {
                throw new Error('Signer name is required');
            }
            if (!signer.email) {
                throw new Error('Signer email is required');
            }
            if (!signer.role || !VALID_SIGNER_ROLES.includes(signer.role)) {
                throw new Error(`Signer role must be one of: ${VALID_SIGNER_ROLES.join(', ')}`);
            }
        }

        // Add created audit event
        requestData.auditTrail.push({
            event: 'created',
            timestamp: new Date().toISOString(),
            userId: requestData.createdBy
        });

        return baseModel.create(requestData);
    },

    /**
     * Add audit event to request
     * @param {Object} request - Request object
     * @param {string} event - Event type
     * @param {Object} data - Event data
     * @returns {Object} Updated request
     */
    addAuditEvent(request, event, data = {}) {
        if (!VALID_AUDIT_EVENTS.includes(event)) {
            throw new Error(`Invalid audit event: ${event}`);
        }

        const auditEvent = {
            event,
            timestamp: new Date().toISOString(),
            ...data
        };

        request.auditTrail = request.auditTrail || [];
        request.auditTrail.push(auditEvent);

        return request;
    },

    /**
     * Check if request is complete (all signers signed)
     * @param {Object} request - Request object
     * @returns {boolean} True if complete
     */
    isComplete(request) {
        return request.signers && request.signers.every(s => s.status === 'signed');
    },

    /**
     * Get pending signers
     * @param {Object} request - Request object
     * @returns {Array} Pending signers
     */
    getPendingSigners(request) {
        return (request.signers || []).filter(s => !['signed', 'declined'].includes(s.status));
    },

    /**
     * Get signed count
     * @param {Object} request - Request object
     * @returns {number} Number of signed signers
     */
    getSignedCount(request) {
        return (request.signers || []).filter(s => s.status === 'signed').length;
    },

    /**
     * Get signing progress percentage
     * @param {Object} request - Request object
     * @returns {number} Progress percentage
     */
    getProgress(request) {
        if (!request.signers || request.signers.length === 0) return 0;
        return Math.round((this.getSignedCount(request) / request.signers.length) * 100);
    },

    /**
     * Send signature request
     * @param {string} requestId - Request ID
     * @param {string} userId - User ID initiating send
     * @returns {Object} Updated request
     */
    async send(requestId, userId) {
        const request = await baseModel.findOne({ requestId });
        if (!request) {
            throw new Error('Signature request not found');
        }
        if (request.status !== 'draft') {
            throw new Error('Can only send requests in draft status');
        }

        const now = new Date().toISOString();
        const expirationDays = request.settings?.expirationDays || 30;
        const expiresAt = new Date(Date.now() + (expirationDays * 24 * 60 * 60 * 1000)).toISOString();

        // Update signers to sent status
        const updatedSigners = request.signers.map(signer => {
            if (signer.status === 'pending') {
                return { ...signer, status: 'sent', sentAt: now };
            }
            return signer;
        });

        this.addAuditEvent(request, 'sent', { userId });

        return baseModel.findOneAndUpdate(
            { requestId },
            {
                $set: {
                    status: 'sent',
                    sentAt: now,
                    expiresAt,
                    updatedBy: userId,
                    signers: updatedSigners,
                    auditTrail: request.auditTrail
                }
            },
            { new: true }
        );
    },

    /**
     * Record that a signer viewed the document
     * @param {string} requestId - Request ID
     * @param {string} signerEmail - Signer email
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent
     * @returns {Object} Updated request
     */
    async recordView(requestId, signerEmail, ipAddress, userAgent) {
        const request = await baseModel.findOne({ requestId });
        if (!request) {
            throw new Error('Signature request not found');
        }

        const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
        if (signerIndex === -1) {
            throw new Error('Signer not found');
        }

        const signer = request.signers[signerIndex];
        if (signer.viewedAt) {
            return request; // Already viewed
        }

        const now = new Date().toISOString();
        request.signers[signerIndex] = {
            ...signer,
            viewedAt: now,
            status: 'viewed'
        };

        this.addAuditEvent(request, 'viewed', { signerEmail, ipAddress, userAgent });

        return baseModel.findOneAndUpdate(
            { requestId },
            {
                $set: {
                    signers: request.signers,
                    auditTrail: request.auditTrail
                }
            },
            { new: true }
        );
    },

    /**
     * Record signature from a signer
     * @param {string} requestId - Request ID
     * @param {string} signerEmail - Signer email
     * @param {Object} signatureData - Signature data
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent
     * @returns {Object} Updated request
     */
    async recordSignature(requestId, signerEmail, signatureData, ipAddress, userAgent) {
        const request = await baseModel.findOne({ requestId });
        if (!request) {
            throw new Error('Signature request not found');
        }

        const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
        if (signerIndex === -1) {
            throw new Error('Signer not found');
        }

        const signer = request.signers[signerIndex];
        if (signer.status === 'signed') {
            throw new Error('Document already signed by this signer');
        }

        const now = new Date().toISOString();
        request.signers[signerIndex] = {
            ...signer,
            status: 'signed',
            signedAt: now,
            signatureData: {
                ...signatureData,
                ipAddress,
                userAgent,
                timestamp: now
            }
        };

        this.addAuditEvent(request, 'signed', { signerEmail, ipAddress, userAgent });

        // Check if all signers have signed
        let newStatus = request.status;
        let completedAt = request.completedAt;

        if (this.isComplete(request)) {
            newStatus = 'completed';
            completedAt = now;
            this.addAuditEvent(request, 'completed', {});
        } else {
            newStatus = 'in_progress';
        }

        return baseModel.findOneAndUpdate(
            { requestId },
            {
                $set: {
                    status: newStatus,
                    completedAt,
                    signers: request.signers,
                    auditTrail: request.auditTrail
                }
            },
            { new: true }
        );
    },

    /**
     * Record decline from a signer
     * @param {string} requestId - Request ID
     * @param {string} signerEmail - Signer email
     * @param {string} reason - Decline reason
     * @param {string} ipAddress - IP address
     * @param {string} userAgent - User agent
     * @returns {Object} Updated request
     */
    async recordDecline(requestId, signerEmail, reason, ipAddress, userAgent) {
        const request = await baseModel.findOne({ requestId });
        if (!request) {
            throw new Error('Signature request not found');
        }

        const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
        if (signerIndex === -1) {
            throw new Error('Signer not found');
        }

        const now = new Date().toISOString();
        request.signers[signerIndex] = {
            ...request.signers[signerIndex],
            status: 'declined',
            declinedAt: now,
            declineReason: reason
        };

        this.addAuditEvent(request, 'declined', { signerEmail, reason, ipAddress, userAgent });

        return baseModel.findOneAndUpdate(
            { requestId },
            {
                $set: {
                    status: 'declined',
                    signers: request.signers,
                    auditTrail: request.auditTrail
                }
            },
            { new: true }
        );
    },

    /**
     * Cancel a signature request
     * @param {string} requestId - Request ID
     * @param {string} userId - User ID
     * @param {string} reason - Cancel reason
     * @returns {Object} Updated request
     */
    async cancel(requestId, userId, reason) {
        const request = await baseModel.findOne({ requestId });
        if (!request) {
            throw new Error('Signature request not found');
        }

        if (['completed', 'cancelled', 'voided'].includes(request.status)) {
            throw new Error(`Cannot cancel request in ${request.status} status`);
        }

        const now = new Date().toISOString();
        this.addAuditEvent(request, 'cancelled', { userId, reason });

        return baseModel.findOneAndUpdate(
            { requestId },
            {
                $set: {
                    status: 'cancelled',
                    cancelledAt: now,
                    updatedBy: userId,
                    auditTrail: request.auditTrail
                }
            },
            { new: true }
        );
    },

    /**
     * Void a signature request
     * @param {string} requestId - Request ID
     * @param {string} userId - User ID
     * @param {string} reason - Void reason
     * @returns {Object} Updated request
     */
    async void(requestId, userId, reason) {
        const request = await baseModel.findOne({ requestId });
        if (!request) {
            throw new Error('Signature request not found');
        }

        const now = new Date().toISOString();
        this.addAuditEvent(request, 'voided', { userId, reason });

        return baseModel.findOneAndUpdate(
            { requestId },
            {
                $set: {
                    status: 'voided',
                    voidedAt: now,
                    updatedBy: userId,
                    auditTrail: request.auditTrail
                }
            },
            { new: true }
        );
    },

    /**
     * Send reminder to a signer
     * @param {string} requestId - Request ID
     * @param {string} signerEmail - Signer email
     * @param {string} userId - User ID
     * @returns {Object} Updated request
     */
    async sendReminder(requestId, signerEmail, userId) {
        const request = await baseModel.findOne({ requestId });
        if (!request) {
            throw new Error('Signature request not found');
        }

        const signerIndex = request.signers.findIndex(s => s.email === signerEmail);
        if (signerIndex === -1) {
            throw new Error('Signer not found');
        }

        const signer = request.signers[signerIndex];
        if (signer.status === 'signed') {
            throw new Error('Signer has already signed');
        }

        const maxReminders = request.settings?.maxReminders || 3;
        if (signer.remindersSent >= maxReminders) {
            throw new Error('Maximum reminders already sent');
        }

        const now = new Date().toISOString();
        request.signers[signerIndex] = {
            ...signer,
            remindersSent: (signer.remindersSent || 0) + 1,
            lastReminderAt: now
        };

        this.addAuditEvent(request, 'reminder_sent', {
            signerEmail,
            userId,
            reminderCount: request.signers[signerIndex].remindersSent
        });

        return baseModel.findOneAndUpdate(
            { requestId },
            {
                $set: {
                    signers: request.signers,
                    auditTrail: request.auditTrail
                }
            },
            { new: true }
        );
    },

    /**
     * Find requests by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} Signature requests
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;
        return baseModel.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Find requests by signer email
     * @param {string} email - Signer email
     * @returns {Array} Signature requests
     */
    async findBySigner(email) {
        const all = await baseModel.find({});
        return all
            .filter(req => req.signers && req.signers.some(s => s.email === email))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    /**
     * Find pending signatures for a signer
     * @param {string} email - Signer email
     * @returns {Array} Pending signature requests
     */
    async findPendingSignatures(email) {
        const all = await baseModel.find({
            status: { $in: ['sent', 'in_progress'] }
        });

        return all.filter(req =>
            req.signers && req.signers.some(s =>
                s.email === email && ['sent', 'viewed'].includes(s.status)
            )
        ).sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
    },

    /**
     * Find expired requests
     * @returns {Array} Expired signature requests
     */
    async findExpired() {
        const now = new Date().toISOString();
        const all = await baseModel.find({
            status: { $in: ['sent', 'in_progress'] }
        });

        return all.filter(req => req.expiresAt && req.expiresAt < now);
    },

    /**
     * Find requests needing reminder
     * @param {number} daysSinceLastAction - Days threshold
     * @returns {Array} Requests needing reminder
     */
    async findNeedingReminder(daysSinceLastAction = 3) {
        const cutoffDate = new Date(Date.now() - (daysSinceLastAction * 24 * 60 * 60 * 1000)).toISOString();

        const all = await baseModel.find({
            status: { $in: ['sent', 'in_progress'] }
        });

        return all.filter(req => {
            if (!req.settings?.reminderEnabled) return false;

            return req.signers && req.signers.some(signer => {
                if (['signed', 'declined'].includes(signer.status)) return false;

                // Check if sent but not viewed and past cutoff
                if (signer.status === 'sent' && !signer.viewedAt && signer.sentAt < cutoffDate) {
                    return true;
                }

                // Check if viewed but not signed and past cutoff
                if (signer.status === 'viewed' && signer.viewedAt < cutoffDate) {
                    return true;
                }

                return false;
            });
        });
    }
};

module.exports = SignatureRequestModel;
