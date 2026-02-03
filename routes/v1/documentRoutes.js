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

// Folder Management Routes (MUST BE FIRST - before :id routes)
// Issue #188: Add Document Folder Management Endpoints

// POST /api/v1/documents/folders - Create a new folder
router.post('/folders', documentController.createFolder);

// GET /api/v1/documents/folders - List folders (optionally filtered by parent)
router.get('/folders', documentController.getFolders);

// GET /api/v1/documents/folders/:id - Get folder by ID
router.get('/folders/:id', documentController.getFolderById);

// PUT /api/v1/documents/folders/:id - Update folder by ID
router.put('/folders/:id', documentController.updateFolderById);

// DELETE /api/v1/documents/folders/:id - Delete folder by ID
router.delete('/folders/:id', documentController.deleteFolderById);

// GET /api/v1/documents/folders/:id/contents - Get folder contents
router.get('/folders/:id/contents', documentController.getFolderContents);

// Search and Analytics (specific routes before :id)
// POST /api/v1/documents/search - Semantic search for documents
router.post('/search', documentController.searchDocuments);

// POST /api/v1/documents/bulk-index - Bulk index documents for vector search
router.post('/bulk-index', documentController.bulkIndexDocuments);

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

// GET /api/v1/documents/:id/similar - Find similar documents
router.get('/:id/similar', documentController.findSimilarDocuments);

// GET /api/v1/documents/:id/analytics - Get document analytics
router.get('/:id/analytics', documentController.getDocumentAnalytics);

// Issue #122: Download, Preview, and Access Endpoints
// GET /api/v1/documents/:id/download - Download document file
router.get('/:id/download', documentController.downloadDocument);

// GET /api/v1/documents/:id/preview - Get document preview metadata
router.get('/:id/preview', documentController.getDocumentPreview);

// GET /api/v1/documents/:id/access - Get document access permissions
router.get('/:id/access', documentController.getDocumentAccess);

module.exports = router;
