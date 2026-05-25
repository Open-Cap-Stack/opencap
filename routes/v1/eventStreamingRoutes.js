/**
 * Event Streaming Routes
 * Issue #28: Implement event streaming for real-time updates
 */

const express = require('express');
const router = express.Router();
const eventStreamingController = require('../../controllers/eventStreamingController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

router.get('/topics', eventStreamingController.getTopics);

router.post('/', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.publishEvent);
router.post('/user', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.publishUserEvent);
router.post('/company', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.publishCompanyEvent);
router.post('/transaction', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.publishTransactionEvent);
router.post('/document', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.publishDocumentEvent);

router.get('/', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.getEvents);
router.get('/stats', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.getEventStats);
router.get('/audit', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.getAuditLog);

router.post('/subscriptions', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.createSubscription);
router.get('/subscriptions', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.getSubscriptions);
router.delete('/subscriptions/:id', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.deleteSubscription);

router.post('/webhooks', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.registerWebhook);
router.get('/webhooks', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.getWebhooks);
router.delete('/webhooks/:id', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), eventStreamingController.deleteWebhook);

module.exports = router;
