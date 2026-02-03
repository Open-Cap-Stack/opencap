/**
 * Document Model
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Core document storage model for managing files and their metadata.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const documentSchema = {
    _id: { type: 'string', required: true },
    documentId: { type: 'string', unique: true, required: true },
    name: { type: 'string', required: true },
    metadata: { type: 'object' },
    uploadedBy: { type: 'string', required: true }, // Reference to User
    path: { type: 'string', required: true },
    title: { type: 'string', required: true },
    content: { type: 'string', required: true },
    DocumentType: {
        type: 'string',
        enum: ['Legal', 'Financial', 'Other'],
        required: true
    },
    FileType: {
        type: 'string',
        enum: ['PDF', 'DOCX', 'TXT'],
        required: true
    },
    Versioning: { type: 'string' },
    AccessControl: { type: 'object' },
    LegalSignificance: { type: 'string' },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' }
};

// Valid enums for validation
const VALID_DOCUMENT_TYPES = ['Legal', 'Financial', 'Other'];
const VALID_FILE_TYPES = ['PDF', 'DOCX', 'TXT'];

// Create base model
const baseModel = createModel('documents', documentSchema);

/**
 * Document Model with custom methods
 */
const DocumentModel = {
    // Base model reference
    _baseModel: baseModel,
    tableName: baseModel.tableName,
    schema: documentSchema,

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
     * Validate document type
     * @param {string} type - Document type to validate
     * @returns {boolean} True if valid
     */
    isValidDocumentType(type) {
        return VALID_DOCUMENT_TYPES.includes(type);
    },

    /**
     * Validate file type
     * @param {string} type - File type to validate
     * @returns {boolean} True if valid
     */
    isValidFileType(type) {
        return VALID_FILE_TYPES.includes(type);
    },

    /**
     * Create a new document with validation
     * @param {Object} data - Document data
     * @returns {Object} Created document
     */
    async create(data) {
        // Validate required fields
        if (!data.documentId) {
            throw new Error('documentId is required');
        }
        if (!data.name) {
            throw new Error('name is required');
        }
        if (!data.uploadedBy) {
            throw new Error('uploadedBy is required');
        }
        if (!data.path) {
            throw new Error('path is required');
        }
        if (!data.title) {
            throw new Error('title is required');
        }
        if (!data.content) {
            throw new Error('content is required');
        }
        if (!data.DocumentType) {
            throw new Error('DocumentType is required');
        }
        if (!this.isValidDocumentType(data.DocumentType)) {
            throw new Error(`DocumentType must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`);
        }
        if (!data.FileType) {
            throw new Error('FileType is required');
        }
        if (!this.isValidFileType(data.FileType)) {
            throw new Error(`FileType must be one of: ${VALID_FILE_TYPES.join(', ')}`);
        }

        // Check for duplicate documentId
        const existing = await baseModel.findOne({ documentId: data.documentId });
        if (existing) {
            throw new Error('documentId must be unique');
        }

        return baseModel.create(data);
    },

    /**
     * Find documents by uploader
     * @param {string} userId - User ID
     * @returns {Array} Documents
     */
    async findByUploader(userId) {
        return baseModel.find({ uploadedBy: userId });
    },

    /**
     * Find documents by type
     * @param {string} documentType - Document type
     * @returns {Array} Documents
     */
    async findByType(documentType) {
        return baseModel.find({ DocumentType: documentType });
    },

    /**
     * Find documents by file type
     * @param {string} fileType - File type
     * @returns {Array} Documents
     */
    async findByFileType(fileType) {
        return baseModel.find({ FileType: fileType });
    },

    /**
     * Search documents by title
     * @param {string} searchTerm - Search term
     * @returns {Array} Matching documents
     */
    async searchByTitle(searchTerm) {
        const allDocs = await baseModel.find({});
        return allDocs.filter(doc =>
            doc.title && doc.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    },

    /**
     * Search documents by content
     * @param {string} searchTerm - Search term
     * @returns {Array} Matching documents
     */
    async searchByContent(searchTerm) {
        const allDocs = await baseModel.find({});
        return allDocs.filter(doc =>
            doc.content && doc.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
    },

    /**
     * Update document metadata
     * @param {string} documentId - Document ID
     * @param {Object} metadata - Metadata to update
     * @returns {Object} Updated document
     */
    async updateMetadata(documentId, metadata) {
        return baseModel.findOneAndUpdate(
            { documentId },
            { $set: { metadata } },
            { new: true }
        );
    },

    /**
     * Update document content
     * @param {string} documentId - Document ID
     * @param {string} content - New content
     * @param {string} version - Version string
     * @returns {Object} Updated document
     */
    async updateContent(documentId, content, version = null) {
        const updateData = { content };
        if (version) {
            updateData.Versioning = version;
        }
        return baseModel.findOneAndUpdate(
            { documentId },
            { $set: updateData },
            { new: true }
        );
    },

    /**
     * Update access control settings
     * @param {string} documentId - Document ID
     * @param {Object} accessControl - Access control settings
     * @returns {Object} Updated document
     */
    async updateAccessControl(documentId, accessControl) {
        return baseModel.findOneAndUpdate(
            { documentId },
            { $set: { AccessControl: accessControl } },
            { new: true }
        );
    },

    /**
     * Get documents with pagination
     * @param {number} page - Page number (1-based)
     * @param {number} limit - Items per page
     * @param {Object} filter - Optional filter
     * @returns {Object} Paginated results
     */
    async paginate(page = 1, limit = 10, filter = {}) {
        const skip = (page - 1) * limit;
        const documents = await baseModel.find(filter, { skip, limit });
        const total = await baseModel.countDocuments(filter);

        return {
            documents,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Get recent documents
     * @param {number} limit - Maximum number of documents
     * @returns {Array} Recent documents
     */
    async getRecent(limit = 10) {
        return baseModel.find({}, { limit, sort: { createdAt: -1 } });
    },

    /**
     * Get documents by legal significance
     * @param {string} significance - Legal significance value
     * @returns {Array} Documents
     */
    async findByLegalSignificance(significance) {
        return baseModel.find({ LegalSignificance: significance });
    },

    /**
     * Delete document and return deleted record
     * @param {string} documentId - Document ID
     * @returns {Object|null} Deleted document
     */
    async deleteByDocumentId(documentId) {
        return baseModel.findOneAndDelete({ documentId });
    }
};

module.exports = DocumentModel;
