/**
 * Event Streaming Routes
 * Issue #28: Implement event streaming for real-time updates
 */

const express = require('express');
const router = express.Router();
const eventStreamingController = require('../../controllers/eventStreamingController');
const { authenticateToken } = require('../../middleware/auth');

router.get('/topics', eventStreamingController.getTopics);

router.post('/', authenticateToken, eventStreamingController.publishEvent);
router.post('/user', authenticateToken, eventStreamingController.publishUserEvent);
router.post('/company', authenticateToken, eventStreamingController.publishCompanyEvent);
router.post('/transaction', authenticateToken, eventStreamingController.publishTransactionEvent);
router.post('/document', authenticateToken, eventStreamingController.publishDocumentEvent);

router.get('/', authenticateToken, eventStreamingController.getEvents);
router.get('/stats', authenticateToken, eventStreamingController.getEventStats);
router.get('/audit', authenticateToken, eventStreamingController.getAuditLog);

router.post('/subscriptions', authenticateToken, eventStreamingController.createSubscription);
router.get('/subscriptions', authenticateToken, eventStreamingController.getSubscriptions);
router.delete('/subscriptions/:id', authenticateToken, eventStreamingController.deleteSubscription);

router.post('/webhooks', authenticateToken, eventStreamingController.registerWebhook);
router.get('/webhooks', authenticateToken, eventStreamingController.getWebhooks);
router.delete('/webhooks/:id', authenticateToken, eventStreamingController.deleteWebhook);

module.exports = router;
