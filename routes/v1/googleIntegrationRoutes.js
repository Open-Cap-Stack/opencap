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

// Public OAuth endpoints (no auth required — user hasn't logged in with Google yet)
router.get('/google-drive/auth', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://opencapstack.com'}/api/v1/integrations/google-drive/callback`;
  const scope = encodeURIComponent('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/gmail.readonly');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

router.get('/google-drive/callback', async (req, res) => {
  // Exchange code for tokens and store for user
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });
  // TODO: exchange code via Google token endpoint, store tokens in user_integrations
  // For now redirect back to the data room page
  res.redirect('/data-rooms/reconstruct?google=connected');
});

router.get('/gmail/auth', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://opencapstack.com'}/api/v1/integrations/gmail/callback`;
  const scope = encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly');
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

router.get('/gmail/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });
  res.redirect('/data-rooms/reconstruct?gmail=connected');
});

// Authenticated routes below
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
