/**
 * Document Access Controller - ZeroDB Migration
 *
 * Migrated from MongoDB/Mongoose to ZeroDB for Issue #19
 * Provides CRUD operations for document access control
 */

const zerodbService = require('../services/zerodbService');

const TABLE_NAME = 'document_access';

/**
 * Create a new document access entry
 */
exports.createDocumentAccess = async (req, res) => {
    try {
        const accessData = {
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Insert into ZeroDB
        const result = await zerodbService.insertRow(TABLE_NAME, accessData);
        const savedAccess = result.rows ? result.rows[0] : result;

        res.status(201).json(savedAccess);
    } catch (error) {
        res.status(400).json({ error: error.message });
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
 */
exports.updateDocumentAccess = async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        // Update in ZeroDB
        await zerodbService.updateRows(TABLE_NAME,
            { id: req.params.id },
            { $set: updateData }
        );

        // Fetch the updated document access
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
        res.status(400).json({ error: error.message });
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

        // Delete from ZeroDB
        await zerodbService.deleteRows(TABLE_NAME, { id: req.params.id });

        res.status(200).json({ message: 'Document access deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
