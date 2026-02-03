/**
 * Webhook Routes
 * Issue #118: Build Webhook System
 *
 * API routes for webhook management
 */
const express = require('express');
const router = express.Router();
const webhookController = require('../../controllers/webhookController');

// CRUD operations
router.post('/webhooks', webhookController.createWebhook);
router.get('/webhooks', webhookController.getWebhooks);
router.get('/webhooks/:id', webhookController.getWebhookById);
router.put('/webhooks/:id', webhookController.updateWebhook);
router.delete('/webhooks/:id', webhookController.deleteWebhook);

// Webhook triggering and testing
router.post('/webhooks/:id/trigger', webhookController.triggerWebhook);
router.post('/webhooks/:id/test', webhookController.testWebhook);

// Delivery history
router.get('/webhooks/:id/deliveries', webhookController.getDeliveryHistory);

// Status management
router.post('/webhooks/:id/pause', webhookController.pauseWebhook);
router.post('/webhooks/:id/resume', webhookController.resumeWebhook);

// Secret management
router.post('/webhooks/:id/regenerate-secret', webhookController.regenerateSecret);

// Statistics
router.get('/webhooks/:id/statistics', webhookController.getWebhookStatistics);

// Utility endpoints
router.post('/webhooks/verify-signature', webhookController.verifySignature);
router.post('/webhooks/retry-failed', webhookController.retryFailedDeliveries);

module.exports = router;
