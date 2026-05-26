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
const multer = require('multer');
const path = require('path');
const os = require('os');
const documentController = require('../../controllers/documentController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const { auditAction } = require('../../middleware/auditLog');

// Apply authentication to all document routes
router.use(authenticateToken);

// Determine upload directory based on environment
const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME;
const uploadDir = isRailway ? '/tmp/uploads' : path.join(__dirname, '../../uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Folder Management Routes (MUST BE FIRST - before :id routes)
// Issue #188: Add Document Folder Management Endpoints

// POST /api/v1/documents/folders - Create a new folder
router.post('/folders', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.createFolder);

// GET /api/v1/documents/folders - List folders (optionally filtered by parent)
router.get('/folders', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getFolders);

// GET /api/v1/documents/folders/:id - Get folder by ID
router.get('/folders/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getFolderById);

// PUT /api/v1/documents/folders/:id - Update folder by ID
router.put('/folders/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.updateFolderById);

// DELETE /api/v1/documents/folders/:id - Delete folder by ID
router.delete('/folders/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.deleteFolderById);

// GET /api/v1/documents/folders/:id/contents - Get folder contents
router.get('/folders/:id/contents', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getFolderContents);

// Search and Analytics (specific routes before :id)
// GET /api/v1/documents/analytics - Get general document analytics
router.get('/analytics', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getGeneralAnalytics);

// POST /api/v1/documents/search - Semantic search for documents
router.post('/search', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.searchDocuments);

// POST /api/v1/documents/bulk-index - Bulk index documents for vector search
router.post('/bulk-index', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.bulkIndexDocuments);

// CRUD Operations
// GET /api/v1/documents - Get all documents with search and filtering
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getDocuments);

// POST /api/v1/documents - Create a new document (with file upload)
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), upload.single('file'), auditAction('create_document', 'document'), documentController.createDocument);

// GET /api/v1/documents/:id - Get a document by ID
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getDocumentById);

// PUT /api/v1/documents/:id - Update a document by ID
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.updateDocumentById);

// DELETE /api/v1/documents/:id - Delete a document by ID
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), auditAction('delete_document', 'document'), documentController.deleteDocumentById);

// GET /api/v1/documents/:id/similar - Find similar documents
router.get('/:id/similar', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.findSimilarDocuments);

// GET /api/v1/documents/:id/analytics - Get document analytics
router.get('/:id/analytics', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getDocumentAnalytics);

// Issue #122: Download, Preview, and Access Endpoints
// GET /api/v1/documents/:id/download - Download document file
router.get('/:id/download', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.downloadDocument);

// GET /api/v1/documents/:id/preview - Get document preview metadata
router.get('/:id/preview', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getDocumentPreview);

// GET /api/v1/documents/:id/access - Get document access permissions
router.get('/:id/access', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.getDocumentAccess);

// POST /api/v1/documents/:id/access - Log document access
router.post('/:id/access', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), documentController.logDocumentAccess);

module.exports = router;
