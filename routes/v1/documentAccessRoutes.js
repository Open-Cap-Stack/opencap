/**
 * Document Access Routes
 *
 * API routes for document access management with validation middleware
 * Issue #249: Added comprehensive input validation and sanitization
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const documentAccessController = require('../../controllers/documentAccessController');

// Apply authentication middleware to all routes
router.use(authenticateToken);
const {
    validateDocumentAccessCreation,
    validateDocumentAccessUpdate
} = require('../../middleware/documentAccessValidation');
const { sanitizeBody } = require('../../middleware/inputValidation');

// Routes are mounted at /api/v1/document-accesses in app.js
// Create document access with validation
router.post(
    '/',
    sanitizeBody(),
    validateDocumentAccessCreation,
    documentAccessController.createDocumentAccess
);

// Get all document accesses
router.get('/', documentAccessController.getDocumentAccesses);

// Get document access by ID
router.get('/:id', documentAccessController.getDocumentAccessById);

// Update document access with validation
router.put(
    '/:id',
    sanitizeBody(),
    validateDocumentAccessUpdate,
    documentAccessController.updateDocumentAccess
);

// Delete document access
router.delete('/:id', documentAccessController.deleteDocumentAccess);

module.exports = router;
