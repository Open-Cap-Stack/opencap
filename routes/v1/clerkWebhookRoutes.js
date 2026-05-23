/**
 * Clerk Webhook Routes
 * Issue #613: Clerk integration — identity sync
 *
 * Mounted at /api/v1/webhooks/clerk (public, no auth middleware).
 * Raw body is preserved for Svix signature verification.
 */

const express = require('express');
const router = express.Router();
const clerkWebhookController = require('../../controllers/clerkWebhookController');

// Raw body parsing is applied at app.js mount point (before json middleware)
// so req.body here is already a Buffer. The controller handles JSON.parse.
router.post('/', clerkWebhookController.handleClerkWebhook);

module.exports = router;
