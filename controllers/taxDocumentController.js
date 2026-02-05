/**
 * Tax Document Controller
 * Issue #246: Implement Tax Document Download Endpoint
 *
 * Handles tax document operations including downloads, listings, and metadata retrieval
 * Integrated with ZeroDB and file storage service
 */

const fileStorageService = require('../services/fileStorageService');
const databaseAdapter = require('../services/databaseAdapter');
const path = require('path');

const MODEL_NAME = 'TaxDocument';

/**
 * Sanitize filename to prevent path traversal attacks
 * Removes any directory separators and keeps only the base filename
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename) => {
    if (!filename) return 'document.pdf';

    // Remove any path components and keep only the filename
    const basename = path.basename(filename);

    // Remove any remaining dangerous characters
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Check if user has permission to access a tax document
 * @param {Object} user - Authenticated user
 * @param {Object} document - Tax document
 * @returns {boolean} True if user has access
 */
const hasDocumentAccess = (user, document) => {
    if (!user || !document) return false;

    // Admin users have access to all documents
    if (user.role === 'admin') {
        return true;
    }

    // User owns the document
    if (document.stakeholderId === user.userId) {
        return true;
    }

    // User is in the same company and has appropriate role (accountant, finance, etc.)
    if (document.companyId === user.companyId &&
        ['accountant', 'finance', 'cfo', 'ceo'].includes(user.role)) {
        return true;
    }

    return false;
};

/**
 * Download a tax document by ID
 * GET /api/v1/tax-documents/:id/download
 */
exports.downloadTaxDocument = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate document ID
        if (!id || id.trim() === '') {
            return res.status(400).json({ message: 'Invalid document ID' });
        }

        // Fetch document metadata from database
        const document = await databaseAdapter.findById(MODEL_NAME, id);

        if (!document) {
            return res.status(404).json({ message: 'Tax document not found' });
        }

        // Check authorization
        if (!hasDocumentAccess(req.user, document)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if document has a file ID
        if (!document.fileId) {
            return res.status(404).json({
                message: 'Document file not available',
                status: document.status
            });
        }

        // Download file from storage
        const fileData = await fileStorageService.downloadFile(document.fileId);

        // Sanitize filename for download
        const safeFilename = sanitizeFilename(document.fileName || document.name);

        // Set response headers for file download
        const contentType = document.contentType || fileData.contentType || 'application/pdf';
        const contentLength = document.size || fileData.size || fileData.data.length;

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('Content-Length', contentLength);

        // Send file data
        return res.status(200).send(fileData.data);

    } catch (error) {
        console.error('Tax document download error:', error);

        // Handle specific error types
        if (error.message && error.message.includes('not found')) {
            return res.status(404).json({
                message: error.message.includes('storage')
                    ? 'File not found in storage'
                    : 'Tax document not found'
            });
        }

        if (error.statusCode === 404) {
            return res.status(404).json({ message: 'File not found in storage' });
        }

        return res.status(500).json({
            message: 'Failed to download tax document'
        });
    }
};

/**
 * Get tax document metadata by ID
 * GET /api/v1/tax-documents/:id
 */
exports.getTaxDocument = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate document ID
        if (!id || id.trim() === '') {
            return res.status(400).json({ message: 'Invalid document ID' });
        }

        // Fetch document from database
        const document = await databaseAdapter.findById(MODEL_NAME, id);

        if (!document) {
            return res.status(404).json({ message: 'Tax document not found' });
        }

        // Check authorization
        if (!hasDocumentAccess(req.user, document)) {
            return res.status(403).json({ message: 'Access denied' });
        }

        return res.status(200).json({ taxDocument: document });

    } catch (error) {
        console.error('Get tax document error:', error);
        return res.status(500).json({
            message: 'Failed to retrieve tax document'
        });
    }
};

/**
 * List tax documents for authenticated user
 * GET /api/v1/tax-documents
 * Query params: taxYear, type, status
 */
exports.listTaxDocuments = async (req, res) => {
    try {
        const { taxYear, type, status } = req.query;
        const userId = req.user.userId;

        // Build query based on user role
        const query = {};

        // Non-admin users can only see their own documents
        if (req.user.role !== 'admin') {
            query.stakeholderId = userId;
        }

        // Apply filters
        if (taxYear) {
            query.taxYear = parseInt(taxYear, 10);
        }

        if (type) {
            query.type = type;
        }

        if (status) {
            query.status = status;
        }

        // Fetch documents
        const documents = await databaseAdapter.find(MODEL_NAME, query);

        return res.status(200).json({
            taxDocuments: documents,
            count: documents.length
        });

    } catch (error) {
        console.error('List tax documents error:', error);
        return res.status(500).json({
            message: 'Failed to retrieve tax documents'
        });
    }
};

/**
 * Create a new tax document (admin/system only)
 * POST /api/v1/tax-documents
 */
exports.createTaxDocument = async (req, res) => {
    try {
        const {
            name,
            fileName,
            type,
            taxYear,
            stakeholderId,
            companyId,
            fileId,
            contentType,
            size,
            dueDate,
            metadata
        } = req.body;

        // Validate required fields
        if (!name || !fileName || !type || !taxYear || !stakeholderId || !companyId) {
            return res.status(400).json({
                message: 'Missing required fields: name, fileName, type, taxYear, stakeholderId, companyId'
            });
        }

        // Create document data
        const documentData = {
            name,
            fileName,
            type,
            taxYear: parseInt(taxYear, 10),
            stakeholderId,
            companyId,
            status: fileId ? 'Ready' : 'Pending',
            fileId,
            contentType: contentType || 'application/pdf',
            size,
            dueDate,
            metadata: metadata || {}
        };

        // Create document
        const document = await databaseAdapter.create(MODEL_NAME, documentData);

        return res.status(201).json({
            taxDocument: document,
            message: 'Tax document created successfully'
        });

    } catch (error) {
        console.error('Create tax document error:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.message
            });
        }

        return res.status(500).json({
            message: 'Failed to create tax document'
        });
    }
};

/**
 * Update tax document metadata (admin/system only)
 * PUT /api/v1/tax-documents/:id
 */
exports.updateTaxDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Validate document ID
        if (!id || id.trim() === '') {
            return res.status(400).json({ message: 'Invalid document ID' });
        }

        // Check if document exists
        const existingDocument = await databaseAdapter.findById(MODEL_NAME, id);
        if (!existingDocument) {
            return res.status(404).json({ message: 'Tax document not found' });
        }

        // Remove fields that shouldn't be updated directly
        delete updateData._id;
        delete updateData.id;
        delete updateData.createdAt;

        // Add updated timestamp
        updateData.updatedAt = new Date().toISOString();

        // Update document
        const updatedDocument = await databaseAdapter.findByIdAndUpdate(
            MODEL_NAME,
            id,
            updateData,
            { new: true }
        );

        return res.status(200).json({
            taxDocument: updatedDocument,
            message: 'Tax document updated successfully'
        });

    } catch (error) {
        console.error('Update tax document error:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation error',
                errors: error.message
            });
        }

        return res.status(500).json({
            message: 'Failed to update tax document'
        });
    }
};

/**
 * Delete tax document (admin only)
 * DELETE /api/v1/tax-documents/:id
 */
exports.deleteTaxDocument = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate document ID
        if (!id || id.trim() === '') {
            return res.status(400).json({ message: 'Invalid document ID' });
        }

        // Check if document exists
        const document = await databaseAdapter.findById(MODEL_NAME, id);
        if (!document) {
            return res.status(404).json({ message: 'Tax document not found' });
        }

        // Delete associated file from storage if exists
        if (document.fileId) {
            try {
                await fileStorageService.deleteFile(document.fileId);
            } catch (fileError) {
                console.warn('Failed to delete file from storage:', fileError.message);
                // Continue with document deletion even if file deletion fails
            }
        }

        // Delete document from database
        await databaseAdapter.findByIdAndDelete(MODEL_NAME, id);

        return res.status(200).json({
            message: 'Tax document deleted successfully'
        });

    } catch (error) {
        console.error('Delete tax document error:', error);
        return res.status(500).json({
            message: 'Failed to delete tax document'
        });
    }
};

// Export helper functions for testing
exports.sanitizeFilename = sanitizeFilename;
exports.hasDocumentAccess = hasDocumentAccess;
