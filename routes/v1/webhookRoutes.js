/**
 * Webhook Routes
 * Issue #118: Build Webhook System
 *
 * API routes for webhook management
 */
const express = require('express');
const router = express.Router();
const webhookController = require('../../controllers/webhookController');
const { createRouteRateLimit } = require('../../middleware/security/rateLimit');

// Rate limiting: general webhook limit (100 requests per 15 minutes)
const webhookRateLimit = createRouteRateLimit('webhooks', 100, 15 * 60 * 1000);
// Stricter limit for endpoints that fire outbound requests (30 requests per 15 minutes)
const webhookTriggerRateLimit = createRouteRateLimit('webhooks-trigger', 30, 15 * 60 * 1000);

// Apply general rate limit to all webhook routes
router.use(webhookRateLimit);

// CRUD operations
router.post('/webhooks', webhookController.createWebhook);
router.get('/webhooks', webhookController.getWebhooks);
router.get('/webhooks/:id', webhookController.getWebhookById);
router.put('/webhooks/:id', webhookController.updateWebhook);
router.delete('/webhooks/:id', webhookController.deleteWebhook);

// Webhook triggering and testing (stricter rate limit for outbound requests)
router.post('/webhooks/:id/trigger', webhookTriggerRateLimit, webhookController.triggerWebhook);
router.post('/webhooks/:id/test', webhookTriggerRateLimit, webhookController.testWebhook);

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
router.post('/webhooks/retry-failed', webhookTriggerRateLimit, webhookController.retryFailedDeliveries);

module.exports = router;
