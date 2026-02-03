/**
 * DocumentVersion Routes
 * Issue #98: Implement Document Version Control
 *
 * API routes for document version management
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const documentVersionController = require('../../controllers/documentVersionController');

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
  upload.single('file'),
  documentVersionController.createVersion
);

// Get version history for a document
router.get(
  '/documents/:documentId/versions',
  documentVersionController.getVersionHistory
);

// Get latest version for a document
router.get(
  '/documents/:documentId/versions/latest',
  documentVersionController.getLatestVersion
);

// Get specific version by document ID and version number
router.get(
  '/documents/:documentId/versions/number/:versionNumber',
  documentVersionController.getVersionByNumber
);

// Archive old versions for a document
router.post(
  '/documents/:documentId/versions/archive-old',
  documentVersionController.archiveOldVersions
);

// Get a specific version by ID
router.get(
  '/document-versions/:versionId',
  documentVersionController.getVersionById
);

// Compare two versions
router.get(
  '/document-versions/:versionId1/compare/:versionId2',
  documentVersionController.compareVersions
);

// Restore a previous version
router.post(
  '/document-versions/:versionId/restore',
  documentVersionController.restoreVersion
);

// Archive a specific version
router.post(
  '/document-versions/:versionId/archive',
  documentVersionController.archiveVersion
);

// Publish a version
router.post(
  '/document-versions/:versionId/publish',
  documentVersionController.publishVersion
);

// Update version metadata
router.patch(
  '/document-versions/:versionId/metadata',
  documentVersionController.updateVersionMetadata
);

// Download version content
router.get(
  '/document-versions/:versionId/download',
  documentVersionController.downloadVersion
);

// Delete a version
router.delete(
  '/document-versions/:versionId',
  documentVersionController.deleteVersion
);

module.exports = router;
