'use strict';

/**
 * Mercury Webhook Routes
 * Issue #678: Mercury webhook handler
 *
 * Base path: /api/v1/webhooks/mercury
 * No auth required — Mercury sends webhooks directly.
 */

const express = require('express');
const router = express.Router();
const mercuryWebhookController = require('../../controllers/mercuryWebhookController');

// POST /api/v1/webhooks/mercury — receive Mercury webhook events
router.post('/', mercuryWebhookController.handleWebhook);

module.exports = router;
