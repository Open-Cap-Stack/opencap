'use strict';

/**
 * Clerky Webhook Routes
 * Issue #664: Real-time webhook receiver for Clerky document signing events
 *
 * Mounted at /api/v1/webhooks/clerky (public, no auth middleware).
 * Raw body is preserved for HMAC signature verification.
 */

const express = require('express');
const router = express.Router();
const clerkyWebhookController = require('../../controllers/clerkyWebhookController');

// Raw body parsing is applied at app.js mount point (before json middleware)
// so req.body here is already a Buffer. The controller handles JSON.parse.
router.post('/', clerkyWebhookController.handleWebhook);

module.exports = router;
