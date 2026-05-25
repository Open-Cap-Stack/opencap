/**
 * Webhook Routes
 * Issue #118: Build Webhook System
 *
 * API routes for webhook management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const webhookController = require('../../controllers/webhookController');

// Apply authentication middleware to all routes
router.use(authenticateToken);
const { createRouteRateLimit } = require('../../middleware/security/rateLimit');

// Rate limiting: general webhook limit (100 requests per 15 minutes)
const webhookRateLimit = createRouteRateLimit('webhooks', 100, 15 * 60 * 1000);
// Stricter limit for endpoints that fire outbound requests (30 requests per 15 minutes)
const webhookTriggerRateLimit = createRouteRateLimit('webhooks-trigger', 30, 15 * 60 * 1000);

// Apply general rate limit to all webhook routes
router.use(webhookRateLimit);

// CRUD operations
router.post('/webhooks', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.createWebhook);
router.get('/webhooks', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.getWebhooks);
router.get('/webhooks/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.getWebhookById);
router.put('/webhooks/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.updateWebhook);
router.delete('/webhooks/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.deleteWebhook);

// Webhook triggering and testing (stricter rate limit for outbound requests)
router.post('/webhooks/:id/trigger', webhookTriggerRateLimit, webhookController.triggerWebhook);
router.post('/webhooks/:id/test', webhookTriggerRateLimit, webhookController.testWebhook);

// Delivery history
router.get('/webhooks/:id/deliveries', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.getDeliveryHistory);

// Status management
router.post('/webhooks/:id/pause', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.pauseWebhook);
router.post('/webhooks/:id/resume', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.resumeWebhook);

// Secret management
router.post('/webhooks/:id/regenerate-secret', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.regenerateSecret);

// Statistics
router.get('/webhooks/:id/statistics', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.getWebhookStatistics);

// Utility endpoints
router.post('/webhooks/verify-signature', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), webhookController.verifySignature);
router.post('/webhooks/retry-failed', webhookTriggerRateLimit, webhookController.retryFailedDeliveries);

module.exports = router;
