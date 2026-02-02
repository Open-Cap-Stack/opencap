/**
 * Document Routes - v1
 *
 * API routes for document management including CRUD operations,
 * vector search, download, preview, and access control.
 *
 * Issue #122: Added download, preview, and access endpoints
 */

const express = require('express');
const router = express.Router();
const documentController = require('../../controllers/documentController');

// CRUD Operations
// GET /api/v1/documents - Get all documents with search and filtering
router.get('/', documentController.getDocuments);

// POST /api/v1/documents - Create a new document
router.post('/', documentController.createDocument);

// GET /api/v1/documents/:id - Get a document by ID
router.get('/:id', documentController.getDocumentById);

// PUT /api/v1/documents/:id - Update a document by ID
router.put('/:id', documentController.updateDocumentById);

// DELETE /api/v1/documents/:id - Delete a document by ID
router.delete('/:id', documentController.deleteDocumentById);

// Search and Analytics
// POST /api/v1/documents/search - Semantic search for documents
router.post('/search', documentController.searchDocuments);

// GET /api/v1/documents/:id/similar - Find similar documents
router.get('/:id/similar', documentController.findSimilarDocuments);

// GET /api/v1/documents/:id/analytics - Get document analytics
router.get('/:id/analytics', documentController.getDocumentAnalytics);

// Bulk Operations (Admin only)
// POST /api/v1/documents/bulk-index - Bulk index documents for vector search
router.post('/bulk-index', documentController.bulkIndexDocuments);

// Issue #122: Download, Preview, and Access Endpoints
// GET /api/v1/documents/:id/download - Download document file
router.get('/:id/download', documentController.downloadDocument);

// GET /api/v1/documents/:id/preview - Get document preview metadata
router.get('/:id/preview', documentController.getDocumentPreview);

// GET /api/v1/documents/:id/access - Get document access permissions
router.get('/:id/access', documentController.getDocumentAccess);

module.exports = router;
