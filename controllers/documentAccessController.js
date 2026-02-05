/**
 * Document Access Controller - ZeroDB Migration
 *
 * Migrated from MongoDB/Mongoose to ZeroDB for Issue #19
 * Enhanced with comprehensive validation for Issue #249
 *
 * Provides CRUD operations for document access control with:
 * - Input validation and sanitization
 * - Security against injection attacks
 * - Clear error messages
 * - Proper error handling
 */

const zerodbService = require('../services/zerodbService');
const { v4: uuidv4 } = require('uuid');

const TABLE_NAME = 'document_access';

/**
 * Create a new document access entry
 *
 * Validation is handled by middleware: validateDocumentAccessCreation
 * This ensures User, RelatedDocument, and AccessLevel are valid before reaching this controller
 */
exports.createDocumentAccess = async (req, res) => {
    try {
        // Generate unique accessId if not provided
        const accessId = req.body.accessId || `access_${uuidv4()}`;

        const accessData = {
            ...req.body,
            accessId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Insert into ZeroDB
        const result = await zerodbService.insertRow(TABLE_NAME, accessData);
        const savedAccess = result.rows ? result.rows[0] : result;

        res.status(201).json({
            success: true,
            data: savedAccess,
            message: 'Document access created successfully'
        });
    } catch (error) {
        console.error('Error creating document access:', error);

        // Handle specific database errors
        if (error.message && error.message.includes('unique')) {
            return res.status(409).json({
                success: false,
                error: 'Document access already exists for this user and document'
            });
        }

        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create document access'
        });
    }
};

/**
 * Get all document access entries
 */
exports.getDocumentAccesses = async (req, res) => {
    try {
        const result = await zerodbService.queryTable(TABLE_NAME, {});
        const accesses = result.rows || result;

        res.status(200).json(accesses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get document access by ID
 */
exports.getDocumentAccessById = async (req, res) => {
    try {
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id: req.params.id },
            limit: 1
        });

        const accesses = result.rows || result;
        const access = accesses[0];

        if (!access) {
            return res.status(404).json({ message: 'Document access not found' });
        }

        res.status(200).json(access);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update document access by ID
 *
 * Validation is handled by middleware: validateDocumentAccessUpdate
 * This ensures only valid fields are updated and immutable fields are protected
 */
exports.updateDocumentAccess = async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        // Update in ZeroDB with correct API signature
        await zerodbService.updateRows(TABLE_NAME, {
            filter: { id: req.params.id },
            update: { $set: updateData }
        });

        // Fetch the updated document access
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id: req.params.id },
            limit: 1
        });

        const accesses = result.rows || result;
        const access = accesses[0];

        if (!access) {
            return res.status(404).json({
                success: false,
                error: 'Document access not found'
            });
        }

        res.status(200).json({
            success: true,
            data: access,
            message: 'Document access updated successfully'
        });
    } catch (error) {
        console.error('Error updating document access:', error);

        res.status(400).json({
            success: false,
            error: error.message || 'Failed to update document access'
        });
    }
};

/**
 * Delete document access by ID
 */
exports.deleteDocumentAccess = async (req, res) => {
    try {
        // First check if the document access exists
        const result = await zerodbService.queryTable(TABLE_NAME, {
            filter: { id: req.params.id },
            limit: 1
        });

        const accesses = result.rows || result;
        const access = accesses[0];

        if (!access) {
            return res.status(404).json({ message: 'Document access not found' });
        }

        // Delete from ZeroDB with correct API signature
        await zerodbService.deleteRows(TABLE_NAME, {
            filter: { id: req.params.id }
        });

        res.status(200).json({ message: 'Document access deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
