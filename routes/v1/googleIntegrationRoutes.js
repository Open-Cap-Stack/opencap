/**
 * Google Integration Routes - v1
 * Issue #234: Google Drive and Gmail integration for data room reconstruction
 *
 * Mounted at /api/v1/integrations/google
 *
 * Endpoints:
 *   GET  /status                  — Integration connection status
 *   GET  /google-drive/files      — Search Google Drive files
 *   POST /google-drive/import     — Import a Drive file into a data room
 *   GET  /gmail/attachments       — Search Gmail attachments
 *   POST /gmail/import            — Import a Gmail attachment into a data room
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const googleIntegrationController = require('../../controllers/googleIntegrationController');

// All routes require authentication
router.use(authenticateToken);

// Roles that can use integration features
const ALLOWED_ROLES = ['super_admin', 'admin', 'founder', 'manager', 'service_provider'];

// Integration status
router.get('/status', hasRole(ALLOWED_ROLES), googleIntegrationController.getStatus);

// Google Drive
router.get('/google-drive/files', hasRole(ALLOWED_ROLES), googleIntegrationController.searchDriveFiles);
router.post('/google-drive/import', hasRole(ALLOWED_ROLES), googleIntegrationController.importDriveFile);

// Gmail
router.get('/gmail/attachments', hasRole(ALLOWED_ROLES), googleIntegrationController.searchGmailAttachments);
router.post('/gmail/import', hasRole(ALLOWED_ROLES), googleIntegrationController.importGmailAttachment);

module.exports = router;
