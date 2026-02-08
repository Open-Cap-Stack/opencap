/**
 * ValuationDocument Model
 * Issue #326: Add ValuationDocument model for 409A report artifact tracking
 *
 * Tracks document artifacts associated with 409A valuations.
 * Critical for IRS audit defense - companies must produce the complete
 * document package and retain it for at least 6 years.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Enum definitions
const DOCUMENT_TYPES = [
    'engagement_letter',
    'draft_report',
    'final_report',
    'management_representation',
    'board_presentation',
    'supporting_analysis',
    'comparable_company_data',
    'financial_projection',
    'option_pricing_model',
    'amendment',
    'other'
];

const DOCUMENT_STATUS = [
    'draft',
    'under_review',
    'approved',
    'superseded',
    'archived'
];

const ACCESS_ACTIONS = ['view', 'download'];
const PERMISSIONS = ['view', 'download'];

// Schema definition
const valuationDocumentSchema = {
    // Core identifiers
    _id: { type: 'string', required: true, unique: true },
    documentId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },
    valuationId: { type: 'string', required: true },

    // Document classification
    documentType: { type: 'string', required: true, enum: DOCUMENT_TYPES },
    title: { type: 'string', required: true },
    description: { type: 'string' },

    // File details
    fileName: { type: 'string', required: true },
    fileSize: { type: 'number', min: 0 },
    mimeType: { type: 'string' },
    storageUrl: { type: 'string' },
    checksum: { type: 'string' },

    // Versioning
    version: { type: 'number', default: 1, min: 1 },
    previousVersionId: { type: 'string' },
    isLatestVersion: { type: 'boolean', default: true },

    // Access control
    confidential: { type: 'boolean', default: true },
    accessHistory: { type: 'array', default: [] },
    // Each access: { userId, accessDate, action }
    sharedWith: { type: 'array', default: [] },
    // Each share: { userId, permission, sharedDate, sharedBy }

    // Lifecycle
    status: { type: 'string', enum: DOCUMENT_STATUS, default: 'draft' },
    uploadedBy: { type: 'string' },
    uploadedAt: { type: 'date' },
    reviewedBy: { type: 'string' },
    reviewedAt: { type: 'date' },
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },

    // Retention
    retentionPeriodYears: { type: 'number', default: 6, min: 0 },
    retentionExpiresAt: { type: 'date' },

    // Metadata
    tags: { type: 'array', default: [] },
    notes: { type: 'string' },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('valuation_documents', valuationDocumentSchema);

// Extended ValuationDocument model with business logic
const ValuationDocument = {
    ...baseModel,
    tableName: 'valuation_documents',
    schema: valuationDocumentSchema,

    // Expose enums
    DOCUMENT_TYPES,
    DOCUMENT_STATUS,
    ACCESS_ACTIONS,
    PERMISSIONS,

    /**
     * Create a new valuation document with validation
     * @param {Object} data - Document data
     * @returns {Object} Created document
     */
    async create(data) {
        // Validate required fields
        if (!data.companyId) {
            throw new Error('Company ID is required');
        }
        if (!data.valuationId) {
            throw new Error('Valuation ID is required');
        }
        if (!data.documentType) {
            throw new Error('Document type is required');
        }
        if (!data.title) {
            throw new Error('Title is required');
        }
        if (!data.fileName) {
            throw new Error('File name is required');
        }

        // Validate enums
        if (!DOCUMENT_TYPES.includes(data.documentType)) {
            throw new Error(`Invalid document type. Must be one of: ${DOCUMENT_TYPES.join(', ')}`);
        }
        if (data.status && !DOCUMENT_STATUS.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${DOCUMENT_STATUS.join(', ')}`);
        }

        // Generate documentId if not provided
        if (!data.documentId) {
            data.documentId = `valdoc_${uuidv4()}`;
        }

        // Calculate retention expiration
        const retentionYears = data.retentionPeriodYears || 6;
        const uploadDate = data.uploadedAt ? new Date(data.uploadedAt) : new Date();
        const retentionExpiresAt = new Date(uploadDate);
        retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + retentionYears);

        // Set defaults
        const dataWithDefaults = {
            version: 1,
            isLatestVersion: true,
            confidential: true,
            accessHistory: [],
            sharedWith: [],
            status: 'draft',
            retentionPeriodYears: 6,
            retentionExpiresAt,
            tags: [],
            uploadedAt: new Date(),
            ...data
        };

        return baseModel.create.call(baseModel, dataWithDefaults);
    },

    /**
     * Find document by documentId
     * @param {string} documentId - Document ID
     * @returns {Object|null} Document or null
     */
    async findByDocumentId(documentId) {
        return baseModel.findOne.call(baseModel, { documentId });
    },

    /**
     * Find all documents for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Array} Documents for the valuation
     */
    async findByValuation(valuationId) {
        return baseModel.find.call(baseModel, { valuationId });
    },

    /**
     * Find latest version documents for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Array} Latest version documents
     */
    async findLatestByValuation(valuationId) {
        const docs = await baseModel.find.call(baseModel, { valuationId });
        return docs.filter(d => d.isLatestVersion);
    },

    /**
     * Find all documents for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Documents for the company
     */
    async findByCompany(companyId) {
        return baseModel.find.call(baseModel, { companyId });
    },

    /**
     * Find documents by type
     * @param {string} valuationId - Valuation ID
     * @param {string} documentType - Document type
     * @returns {Array} Documents of the type
     */
    async findByType(valuationId, documentType) {
        const docs = await baseModel.find.call(baseModel, { valuationId });
        return docs.filter(d => d.documentType === documentType);
    },

    /**
     * Find documents by status
     * @param {string} companyId - Company ID
     * @param {string} status - Status
     * @returns {Array} Documents with status
     */
    async findByStatus(companyId, status) {
        const docs = await baseModel.find.call(baseModel, { companyId });
        return docs.filter(d => d.status === status);
    },

    /**
     * Get document package for a valuation
     * Returns all latest version documents organized by type
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Document package summary
     */
    async getDocumentPackage(valuationId) {
        const docs = await this.findLatestByValuation(valuationId);

        const byType = {};
        for (const type of DOCUMENT_TYPES) {
            byType[type] = docs.filter(d => d.documentType === type);
        }

        const requiredTypes = ['engagement_letter', 'final_report'];
        const missingRequired = requiredTypes.filter(type => byType[type].length === 0);

        return {
            valuationId,
            totalDocuments: docs.length,
            byType,
            requiredDocuments: requiredTypes,
            missingRequired,
            isComplete: missingRequired.length === 0,
            documents: docs.map(d => ({
                documentId: d.documentId,
                title: d.title,
                documentType: d.documentType,
                status: d.status,
                version: d.version,
                fileName: d.fileName
            }))
        };
    },

    /**
     * Create a new version of a document
     * @param {string} documentId - Document ID to version
     * @param {Object} newVersionData - New version data
     * @returns {Object} New version document
     */
    async createVersion(documentId, newVersionData) {
        const existing = await this.findByDocumentId(documentId);

        if (!existing) {
            throw new Error('Document not found');
        }

        // Mark existing as not latest
        await baseModel.findOneAndUpdate.call(baseModel,
            { documentId },
            { isLatestVersion: false, updatedAt: new Date() }
        );

        // Create new version
        const newVersion = {
            ...newVersionData,
            companyId: existing.companyId,
            valuationId: existing.valuationId,
            documentType: existing.documentType,
            version: existing.version + 1,
            previousVersionId: existing.documentId,
            isLatestVersion: true,
            status: 'draft',
            uploadedAt: new Date()
        };

        // Remove documentId so a new one is generated
        delete newVersion.documentId;

        return this.create(newVersion);
    },

    /**
     * Get version history for a document
     * @param {string} documentId - Document ID
     * @returns {Array} Version history
     */
    async getVersionHistory(documentId) {
        const doc = await this.findByDocumentId(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        // Build version chain
        const history = [doc];
        let currentId = doc.previousVersionId;

        while (currentId) {
            const prevDoc = await this.findByDocumentId(currentId);
            if (prevDoc) {
                history.push(prevDoc);
                currentId = prevDoc.previousVersionId;
            } else {
                break;
            }
        }

        return history.sort((a, b) => b.version - a.version);
    },

    /**
     * Log document access
     * @param {string} documentId - Document ID
     * @param {string} userId - User ID
     * @param {string} action - Access action (view/download)
     * @returns {Object} Updated document
     */
    async logAccess(documentId, userId, action = 'view') {
        const doc = await this.findByDocumentId(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        if (!ACCESS_ACTIONS.includes(action)) {
            throw new Error(`Invalid action. Must be one of: ${ACCESS_ACTIONS.join(', ')}`);
        }

        const accessHistory = [...(doc.accessHistory || [])];
        accessHistory.push({
            userId,
            accessDate: new Date(),
            action
        });

        return baseModel.findOneAndUpdate.call(baseModel,
            { documentId },
            { accessHistory, updatedAt: new Date() }
        );
    },

    /**
     * Share document with user
     * @param {string} documentId - Document ID
     * @param {string} userId - User to share with
     * @param {string} permission - Permission level (view/download)
     * @param {string} sharedBy - User sharing the document
     * @returns {Object} Updated document
     */
    async shareWithUser(documentId, userId, permission = 'view', sharedBy = null) {
        const doc = await this.findByDocumentId(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        if (!PERMISSIONS.includes(permission)) {
            throw new Error(`Invalid permission. Must be one of: ${PERMISSIONS.join(', ')}`);
        }

        const sharedWith = [...(doc.sharedWith || [])];
        const existingShare = sharedWith.find(s => s.userId === userId);

        if (existingShare) {
            existingShare.permission = permission;
            existingShare.sharedDate = new Date();
            if (sharedBy) existingShare.sharedBy = sharedBy;
        } else {
            sharedWith.push({
                userId,
                permission,
                sharedDate: new Date(),
                sharedBy
            });
        }

        return baseModel.findOneAndUpdate.call(baseModel,
            { documentId },
            { sharedWith, updatedAt: new Date() }
        );
    },

    /**
     * Revoke user access
     * @param {string} documentId - Document ID
     * @param {string} userId - User to revoke
     * @returns {Object} Updated document
     */
    async revokeAccess(documentId, userId) {
        const doc = await this.findByDocumentId(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        const sharedWith = (doc.sharedWith || []).filter(s => s.userId !== userId);

        return baseModel.findOneAndUpdate.call(baseModel,
            { documentId },
            { sharedWith, updatedAt: new Date() }
        );
    },

    /**
     * Check if user has access to document
     * @param {string} documentId - Document ID
     * @param {string} userId - User ID
     * @param {string} requiredPermission - Required permission
     * @returns {boolean} Whether user has access
     */
    async checkAccess(documentId, userId, requiredPermission = 'view') {
        const doc = await this.findByDocumentId(documentId);

        if (!doc) {
            return false;
        }

        // Check if user uploaded the document
        if (doc.uploadedBy === userId) {
            return true;
        }

        // Check shared access
        const share = (doc.sharedWith || []).find(s => s.userId === userId);
        if (!share) {
            return false;
        }

        // Download permission includes view
        if (requiredPermission === 'view') {
            return true;
        }

        return share.permission === requiredPermission;
    },

    /**
     * Update document status
     * @param {string} documentId - Document ID
     * @param {string} status - New status
     * @param {Object} details - { reviewedBy, approvedBy }
     * @returns {Object} Updated document
     */
    async updateStatus(documentId, status, details = {}) {
        const doc = await this.findByDocumentId(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        if (!DOCUMENT_STATUS.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${DOCUMENT_STATUS.join(', ')}`);
        }

        const updateData = { status, updatedAt: new Date() };

        if (status === 'under_review' && details.reviewedBy) {
            updateData.reviewedBy = details.reviewedBy;
            updateData.reviewedAt = new Date();
        }

        if (status === 'approved' && details.approvedBy) {
            updateData.approvedBy = details.approvedBy;
            updateData.approvedAt = new Date();
        }

        return baseModel.findOneAndUpdate.call(baseModel,
            { documentId },
            updateData
        );
    },

    /**
     * Archive a document
     * @param {string} documentId - Document ID
     * @returns {Object} Updated document
     */
    async archive(documentId) {
        return this.updateStatus(documentId, 'archived');
    },

    /**
     * Get access history for a document
     * @param {string} documentId - Document ID
     * @returns {Array} Access history
     */
    async getAccessHistory(documentId) {
        const doc = await this.findByDocumentId(documentId);

        if (!doc) {
            throw new Error('Document not found');
        }

        return (doc.accessHistory || []).sort((a, b) =>
            new Date(b.accessDate) - new Date(a.accessDate)
        );
    },

    /**
     * Find documents expiring soon
     * @param {string} companyId - Company ID
     * @param {number} withinDays - Days until expiration
     * @returns {Array} Documents expiring soon
     */
    async findExpiringSoon(companyId, withinDays = 365) {
        const docs = await this.findByCompany(companyId);
        const expirationThreshold = new Date();
        expirationThreshold.setDate(expirationThreshold.getDate() + withinDays);

        return docs.filter(d =>
            d.retentionExpiresAt &&
            new Date(d.retentionExpiresAt) <= expirationThreshold &&
            d.status !== 'archived'
        );
    },

    /**
     * Search documents
     * @param {string} companyId - Company ID
     * @param {string} searchText - Text to search
     * @returns {Array} Matching documents
     */
    async search(companyId, searchText) {
        const docs = await this.findByCompany(companyId);
        const lowerSearch = searchText.toLowerCase();

        return docs.filter(d =>
            d.title?.toLowerCase().includes(lowerSearch) ||
            d.description?.toLowerCase().includes(lowerSearch) ||
            d.fileName?.toLowerCase().includes(lowerSearch)
        );
    },

    /**
     * Get document statistics for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Document statistics
     */
    async getStatistics(valuationId) {
        const docs = await this.findByValuation(valuationId);
        const latestDocs = docs.filter(d => d.isLatestVersion);

        const byType = {};
        for (const type of DOCUMENT_TYPES) {
            byType[type] = latestDocs.filter(d => d.documentType === type).length;
        }

        const byStatus = {};
        for (const status of DOCUMENT_STATUS) {
            byStatus[status] = latestDocs.filter(d => d.status === status).length;
        }

        const totalSize = docs.reduce((sum, d) => sum + (d.fileSize || 0), 0);
        const totalAccesses = docs.reduce((sum, d) => sum + (d.accessHistory?.length || 0), 0);

        return {
            valuationId,
            totalDocuments: latestDocs.length,
            totalVersions: docs.length,
            byType,
            byStatus,
            totalSizeBytes: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            totalAccesses
        };
    },

    // Expose base model methods
    find: baseModel.find.bind(baseModel),
    findOne: baseModel.findOne.bind(baseModel),
    findById: baseModel.findById.bind(baseModel),
    updateOne: baseModel.updateOne.bind(baseModel),
    updateMany: baseModel.updateMany.bind(baseModel),
    findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
    findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
    deleteOne: baseModel.deleteOne.bind(baseModel),
    deleteMany: baseModel.deleteMany.bind(baseModel),
    findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
    findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
    countDocuments: baseModel.countDocuments.bind(baseModel),
    exists: baseModel.exists.bind(baseModel),
    distinct: baseModel.distinct.bind(baseModel),
    aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = ValuationDocument;
