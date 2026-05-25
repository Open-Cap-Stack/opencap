/**
 * DocumentVersion Routes
 * Issue #98: Implement Document Version Control
 *
 * API routes for document version management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const multer = require('multer');
const documentVersionController = require('../../controllers/documentVersionController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Create a new version (with file upload)
router.post(
  '/document-versions',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  upload.single('file'),
  documentVersionController.createVersion
);

// Get version history for a document
router.get(
  '/documents/:documentId/versions',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.getVersionHistory
);

// Get latest version for a document
router.get(
  '/documents/:documentId/versions/latest',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.getLatestVersion
);

// Get specific version by document ID and version number
router.get(
  '/documents/:documentId/versions/number/:versionNumber',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.getVersionByNumber
);

// Archive old versions for a document
router.post(
  '/documents/:documentId/versions/archive-old',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.archiveOldVersions
);

// Get a specific version by ID
router.get(
  '/document-versions/:versionId',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.getVersionById
);

// Compare two versions
router.get(
  '/document-versions/:versionId1/compare/:versionId2',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.compareVersions
);

// Restore a previous version
router.post(
  '/document-versions/:versionId/restore',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.restoreVersion
);

// Archive a specific version
router.post(
  '/document-versions/:versionId/archive',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.archiveVersion
);

// Publish a version
router.post(
  '/document-versions/:versionId/publish',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.publishVersion
);

// Update version metadata
router.patch(
  '/document-versions/:versionId/metadata',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.updateVersionMetadata
);

// Download version content
router.get(
  '/document-versions/:versionId/download',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.downloadVersion
);

// Delete a version
router.delete(
  '/document-versions/:versionId',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentVersionController.deleteVersion
);

module.exports = router;
