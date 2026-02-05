/**
 * TaxDocument Model
 * Issue #246: Tax Document Download Endpoint
 *
 * Manages tax documents (1099, W-2, K-1, etc.) for stakeholders
 * Integrated with ZeroDB for document metadata storage
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition (for documentation and validation)
const schema = {
    _id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    fileName: { type: 'string', required: true },
    type: {
        type: 'string',
        required: true,
        enum: ['1099', '1099-DIV', '1099-INT', '1099-MISC', 'W-2', 'W-9', 'K-1', '3921', 'Tax Summary', 'Quarterly Report', 'Other']
    },
    status: {
        type: 'string',
        required: true,
        enum: ['Pending', 'Processing', 'Ready', 'Failed'],
        default: 'Pending'
    },
    taxYear: { type: 'number', required: true },
    stakeholderId: { type: 'string', required: true },
    companyId: { type: 'string', required: true },
    fileId: { type: 'string', required: false }, // ZeroDB file storage ID
    contentType: { type: 'string', default: 'application/pdf' },
    size: { type: 'number' },
    dueDate: { type: 'date' },
    generatedDate: { type: 'date' },
    metadata: { type: 'object', default: {} },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Validation function
const validateTaxDocument = (data) => {
    const errors = [];

    if (!data.name || typeof data.name !== 'string') {
        errors.push('name is required and must be a string');
    }

    if (!data.fileName || typeof data.fileName !== 'string') {
        errors.push('fileName is required and must be a string');
    }

    const validTypes = ['1099', '1099-DIV', '1099-INT', '1099-MISC', 'W-2', 'W-9', 'K-1', '3921', 'Tax Summary', 'Quarterly Report', 'Other'];
    if (!data.type || !validTypes.includes(data.type)) {
        errors.push(`type must be one of: ${validTypes.join(', ')}`);
    }

    const validStatuses = ['Pending', 'Processing', 'Ready', 'Failed'];
    if (data.status && !validStatuses.includes(data.status)) {
        errors.push(`status must be one of: ${validStatuses.join(', ')}`);
    }

    if (!data.taxYear || typeof data.taxYear !== 'number' || data.taxYear < 1900 || data.taxYear > 2100) {
        errors.push('taxYear is required and must be a valid year');
    }

    if (!data.stakeholderId || typeof data.stakeholderId !== 'string') {
        errors.push('stakeholderId is required');
    }

    if (!data.companyId || typeof data.companyId !== 'string') {
        errors.push('companyId is required');
    }

    if (data.size && (typeof data.size !== 'number' || data.size < 0)) {
        errors.push('size must be a non-negative number');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// Create base model
const baseModel = createModel('tax_documents', schema);

// Extended model with custom methods
const TaxDocument = {
    ...baseModel,

    /**
     * Create a new tax document with validation
     * @param {Object} data - Tax document data
     * @returns {Object} Created tax document
     */
    async create(data) {
        // Generate ID if not provided
        const documentId = data._id || data.id || uuidv4();

        // Prepare data with defaults
        const docData = {
            ...data,
            _id: documentId,
            id: documentId,
            status: data.status || 'Pending',
            contentType: data.contentType || 'application/pdf',
            metadata: data.metadata || {}
        };

        // Validate data
        const validation = validateTaxDocument(docData);
        if (!validation.valid) {
            const error = new Error(validation.errors.join(', '));
            error.name = 'ValidationError';
            throw error;
        }

        // Normalize dates
        const normalizedData = {
            ...docData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (docData.dueDate) {
            normalizedData.dueDate = docData.dueDate instanceof Date
                ? docData.dueDate.toISOString()
                : new Date(docData.dueDate).toISOString();
        }

        if (docData.generatedDate) {
            normalizedData.generatedDate = docData.generatedDate instanceof Date
                ? docData.generatedDate.toISOString()
                : new Date(docData.generatedDate).toISOString();
        }

        return baseModel.create(normalizedData);
    },

    /**
     * Find tax documents by stakeholder ID
     * @param {string} stakeholderId - Stakeholder ID
     * @param {Object} filters - Additional filters (taxYear, type, status)
     * @returns {Array} Tax documents
     */
    async findByStakeholder(stakeholderId, filters = {}) {
        const query = { stakeholderId };

        if (filters.taxYear) {
            query.taxYear = parseInt(filters.taxYear, 10);
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        return baseModel.find(query);
    },

    /**
     * Find tax documents by company ID
     * @param {string} companyId - Company ID
     * @param {Object} filters - Additional filters
     * @returns {Array} Tax documents
     */
    async findByCompany(companyId, filters = {}) {
        const query = { companyId };

        if (filters.taxYear) {
            query.taxYear = parseInt(filters.taxYear, 10);
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        return baseModel.find(query);
    },

    /**
     * Find tax documents by tax year
     * @param {number} taxYear - Tax year
     * @param {string} companyId - Optional company ID filter
     * @returns {Array} Tax documents
     */
    async findByTaxYear(taxYear, companyId = null) {
        const query = { taxYear: parseInt(taxYear, 10) };

        if (companyId) {
            query.companyId = companyId;
        }

        return baseModel.find(query);
    },

    /**
     * Update tax document status
     * @param {string} documentId - Document ID
     * @param {string} status - New status
     * @param {Object} additionalData - Additional fields to update
     * @returns {Object} Updated document
     */
    async updateStatus(documentId, status, additionalData = {}) {
        const validStatuses = ['Pending', 'Processing', 'Ready', 'Failed'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        const updateFields = {
            status,
            ...additionalData,
            updatedAt: new Date().toISOString()
        };

        return baseModel.findByIdAndUpdate(
            documentId,
            { $set: updateFields },
            { new: true }
        );
    },

    /**
     * Mark document as ready for download
     * @param {string} documentId - Document ID
     * @param {string} fileId - File storage ID
     * @param {Object} fileMetadata - File metadata (size, contentType)
     * @returns {Object} Updated document
     */
    async markAsReady(documentId, fileId, fileMetadata = {}) {
        const updateFields = {
            status: 'Ready',
            fileId,
            generatedDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (fileMetadata.size) {
            updateFields.size = fileMetadata.size;
        }

        if (fileMetadata.contentType) {
            updateFields.contentType = fileMetadata.contentType;
        }

        return baseModel.findByIdAndUpdate(
            documentId,
            { $set: updateFields },
            { new: true }
        );
    },

    /**
     * Get documents ready for download
     * @param {string} stakeholderId - Optional stakeholder filter
     * @param {string} companyId - Optional company filter
     * @returns {Array} Ready documents
     */
    async getReadyDocuments(stakeholderId = null, companyId = null) {
        const query = { status: 'Ready' };

        if (stakeholderId) {
            query.stakeholderId = stakeholderId;
        }

        if (companyId) {
            query.companyId = companyId;
        }

        return baseModel.find(query);
    },

    /**
     * Get documents by type
     * @param {string} type - Document type
     * @param {number} taxYear - Optional tax year filter
     * @returns {Array} Documents of specified type
     */
    async findByType(type, taxYear = null) {
        const query = { type };

        if (taxYear) {
            query.taxYear = parseInt(taxYear, 10);
        }

        return baseModel.find(query);
    },

    /**
     * Delete document by ID
     * @param {string} documentId - Document ID
     * @returns {Object} Delete result
     */
    async deleteDocument(documentId) {
        return baseModel.deleteOne({ _id: documentId });
    },

    // Expose validation
    validateTaxDocument
};

module.exports = TaxDocument;
