/**
 * Enhanced Document Data Model
 *
 * [Feature] OCDI-108: Create Document data model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * A comprehensive document model supporting:
 * - Document versioning and history
 * - Advanced metadata and tagging
 * - Fine-grained access controls
 * - Document relationships
 * - Rich search capabilities
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valid relationship types
const relationTypes = [
    'parent-of', 'child-of',
    'has-appendix', 'appendix-of',
    'amends', 'amended-by',
    'references', 'referenced-by',
    'supersedes', 'superseded-by',
    'previous-version', 'next-version',
    'related-to'
];

// Valid entity types for access control
const entityTypes = ['user', 'team', 'role', 'company'];

// Valid document statuses
const documentStatuses = ['draft', 'active', 'archived', 'deleted'];

// Schema definition for documentation and validation
const documentSchema = {
    documentId: { type: 'string', unique: true },
    name: { type: 'string', required: true },
    originalFilename: { type: 'string', required: true },
    mimeType: { type: 'string', required: true },
    size: { type: 'number', required: true, min: 0 },
    storageLocation: { type: 'string', default: 'local' },
    storagePath: { type: 'string' },
    category: { type: 'string', required: true },
    tags: { type: 'array', default: [] },
    uploadedBy: { type: 'string', required: true },
    ownerCompany: { type: 'string', required: true },
    status: { type: 'string', enum: documentStatuses, default: 'draft' },
    content: { type: 'string', default: '' },
    version: { type: 'number', default: 1, min: 1 },
    versionHistory: { type: 'array', default: [] },
    changedBy: { type: 'string' },
    accessControl: {
        type: 'object',
        default: {
            viewAccess: [],
            editAccess: [],
            deleteAccess: [],
            adminAccess: []
        }
    },
    relationships: { type: 'array', default: [] },
    metadata: { type: 'object', default: {} },
    isTemplate: { type: 'boolean', default: false },
    isLocked: { type: 'boolean', default: false },
    lockedBy: { type: 'string' },
    lockedUntil: { type: 'date' },
    folderId: { type: 'string', default: null },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('documents', documentSchema);

// Extended Document model with business logic
const Document = {
    ...baseModel,
    tableName: 'documents',
    schema: documentSchema,
    relationTypes,
    entityTypes,
    documentStatuses,

    /**
     * Create a new document with defaults
     * @param {Object} data - Document data
     * @returns {Object} Created document
     */
    async create(data) {
        // Generate documentId if not provided
        if (!data.documentId) {
            data.documentId = uuidv4();
        }

        // Set defaults
        if (!data.status) {
            data.status = 'draft';
        }
        if (!data.version) {
            data.version = 1;
        }
        if (!data.versionHistory) {
            data.versionHistory = [];
        }
        if (!data.accessControl) {
            data.accessControl = {
                viewAccess: [],
                editAccess: [],
                deleteAccess: [],
                adminAccess: []
            };
        }
        if (!data.relationships) {
            data.relationships = [];
        }
        if (!data.metadata) {
            data.metadata = {};
        }
        if (!data.tags) {
            data.tags = [];
        }

        return baseModel.create.call(baseModel, data);
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
     * Find documents by tags
     * @param {Array} tags - Array of tags to search for
     * @returns {Array} Matching documents
     */
    async findByTags(tags) {
        const results = await baseModel.find.call(baseModel, {});
        return results.filter(doc =>
            doc.tags && doc.tags.some(tag => tags.includes(tag))
        );
    },

    /**
     * Find documents by category
     * @param {string} category - Category to search for
     * @returns {Array} Matching documents
     */
    async findByCategory(category) {
        return baseModel.find.call(baseModel, { category });
    },

    /**
     * Find documents by metadata
     * @param {Object} metadata - Metadata key-value pairs to search for
     * @returns {Array} Matching documents
     */
    async findByMetadata(metadata) {
        const results = await baseModel.find.call(baseModel, {});
        return results.filter(doc => {
            if (!doc.metadata) return false;
            return Object.keys(metadata).every(key =>
                doc.metadata[key] === metadata[key]
            );
        });
    },

    /**
     * Perform a text search on documents
     * @param {string} searchText - Text to search for
     * @returns {Array} Matching documents
     */
    async search(searchText) {
        const results = await baseModel.find.call(baseModel, {});
        const lowerSearch = searchText.toLowerCase();
        return results.filter(doc =>
            doc.name?.toLowerCase().includes(lowerSearch) ||
            doc.category?.toLowerCase().includes(lowerSearch) ||
            doc.content?.toLowerCase().includes(lowerSearch)
        );
    },

    /**
     * Find all documents related to a specific document
     * @param {string} documentId - ID of the document to find relationships for
     * @returns {Array} Related documents
     */
    async findRelatedDocuments(documentId) {
        const document = await this.findByDocumentId(documentId);
        if (!document || !document.relationships || document.relationships.length === 0) {
            return [];
        }

        const relatedIds = document.relationships.map(r => r.relatedDocument);
        const results = await baseModel.find.call(baseModel, {});
        return results.filter(doc => relatedIds.includes(doc._id) || relatedIds.includes(doc.documentId));
    },

    /**
     * Find documents related with a specific relationship type
     * @param {string} documentId - ID of the document
     * @param {string} relationType - Type of relationship
     * @returns {Array} Related documents
     */
    async findRelatedDocumentsByType(documentId, relationType) {
        const document = await this.findByDocumentId(documentId);
        if (!document || !document.relationships || document.relationships.length === 0) {
            return [];
        }

        const relatedIds = document.relationships
            .filter(r => r.relationType === relationType)
            .map(r => r.relatedDocument);

        const results = await baseModel.find.call(baseModel, {});
        return results.filter(doc => relatedIds.includes(doc._id) || relatedIds.includes(doc.documentId));
    },

    /**
     * Check if a user has specific access to the document
     * @param {Object} document - Document object
     * @param {string} userId - The user ID to check
     * @param {string} accessType - The type of access (view, edit, delete, admin)
     * @param {Array} teams - Optional array of team IDs the user belongs to
     * @param {Array} roles - Optional array of roles the user has
     * @returns {boolean} Whether the user has the requested access
     */
    hasAccess(document, userId, accessType, teams = [], roles = []) {
        // Document owners always have full access
        if (document.uploadedBy === userId) {
            return true;
        }

        // Handle hierarchical access (admin can do anything)
        if (accessType !== 'admin') {
            const hasAdminAccess = this.hasAccess(document, userId, 'admin', teams, roles);
            if (hasAdminAccess) return true;
        }

        // For view access, check if document is public or user is authenticated
        if (accessType === 'view' &&
            document.accessControl?.viewAccess &&
            (document.accessControl.viewAccess.includes('public') ||
             document.accessControl.viewAccess.includes('authenticated'))) {
            return true;
        }

        const accessList = document.accessControl?.[`${accessType}Access`];

        // No access list defined
        if (!accessList || accessList.length === 0) {
            return false;
        }

        // Check if user is directly in access list
        const hasDirectAccess = accessList.some(access =>
            access.entityType === 'user' && access.entityId === userId
        );

        if (hasDirectAccess) return true;

        // Check team access
        if (teams && teams.length > 0) {
            const hasTeamAccess = accessList.some(access => {
                if (access.entityType !== 'team') return false;
                return teams.some(team => team === access.entityId);
            });

            if (hasTeamAccess) return true;
        }

        // Check role access
        if (roles && roles.length > 0) {
            const hasRoleAccess = accessList.some(access =>
                access.entityType === 'role' && roles.includes(access.entityId)
            );

            if (hasRoleAccess) return true;
        }

        return false;
    },

    /**
     * Add version to history and increment version
     * @param {Object} document - Document object
     * @param {string} userId - User making the change
     * @param {string} changeDescription - Description of change
     * @returns {Object} Updated document data
     */
    addVersionHistory(document, userId, changeDescription = 'Document updated') {
        const historyEntry = {
            version: document.version,
            changedAt: new Date().toISOString(),
            changedBy: userId,
            changeDescription
        };

        const versionHistory = [...(document.versionHistory || []), historyEntry];
        const newVersion = document.version + 1;

        return {
            versionHistory,
            version: newVersion,
            changedBy: userId
        };
    },

    /**
     * Add relationship to document
     * @param {string} documentId - Document ID
     * @param {string} relatedDocumentId - Related document ID
     * @param {string} relationType - Type of relationship
     * @param {string} description - Optional description
     * @returns {Object} Update result
     */
    async addRelationship(documentId, relatedDocumentId, relationType, description = '') {
        const document = await this.findByDocumentId(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        const relationship = {
            relatedDocument: relatedDocumentId,
            relationType,
            description,
            createdAt: new Date().toISOString()
        };

        const relationships = [...(document.relationships || []), relationship];

        return baseModel.updateOne.call(baseModel,
            { documentId },
            { $set: { relationships } }
        );
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

module.exports = Document;
