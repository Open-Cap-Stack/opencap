/**
 * BulkMessage Routes
 * Issue #86: Create Bulk Messaging System
 *
 * Routes for bulk messaging operations including CRUD,
 * sending, scheduling, and delivery tracking.
 */
const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const bulkMessageController = require('../../controllers/bulkMessageController');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/v1/bulk-messages
 * Create a new bulk message
 *
 * Body:
 * - bulkMessageId: Unique identifier for the message
 * - companyId: Company the message belongs to
 * - senderId: User ID of the sender
 * - subject: Message subject
 * - content: Message content (supports {{variable}} templates)
 * - messageType: Type of message (email, sms, notification, in-app)
 * - recipientFilter: Filter configuration for selecting recipients
 * - templateVariables: Array of variable names used in templates
 * - rateLimiting: Batch size and delay configuration
 * - metadata: Additional custom data
 * - tags: Array of tags for categorization
 */
router.post('/', bulkMessageController.createBulkMessage);

/**
 * GET /api/v1/bulk-messages
 * Get all bulk messages with optional filtering
 *
 * Query Parameters:
 * - companyId: Filter by company ID
 * - status: Filter by status (comma-separated for multiple)
 * - messageType: Filter by message type
 * - senderId: Filter by sender
 * - limit: Number of results (default: 50)
 * - offset: Number to skip (default: 0)
 */
router.get('/', bulkMessageController.getBulkMessages);

/**
 * GET /api/v1/bulk-messages/history
 * Get message history for a company with audit trail
 *
 * Query Parameters:
 * - companyId: Company ID (required)
 * - limit: Number of results (default: 50)
 * - offset: Number to skip (default: 0)
 */
router.get('/history', bulkMessageController.getMessageHistory);

/**
 * GET /api/v1/bulk-messages/:id
 * Get a bulk message by ID
 */
router.get('/:id', bulkMessageController.getBulkMessageById);

/**
 * PUT /api/v1/bulk-messages/:id
 * Update a bulk message (only draft/scheduled messages)
 *
 * Body: Same as POST, but only specified fields are updated
 */
router.put('/:id', bulkMessageController.updateBulkMessage);

/**
 * DELETE /api/v1/bulk-messages/:id
 * Delete a bulk message
 */
router.delete('/:id', bulkMessageController.deleteBulkMessage);

/**
 * POST /api/v1/bulk-messages/:id/send
 * Send a bulk message immediately
 */
router.post('/:id/send', bulkMessageController.sendBulkMessage);

/**
 * POST /api/v1/bulk-messages/:id/schedule
 * Schedule a bulk message for future delivery
 *
 * Body:
 * - scheduledAt: ISO 8601 datetime for when to send
 */
router.post('/:id/schedule', bulkMessageController.scheduleBulkMessage);

/**
 * POST /api/v1/bulk-messages/:id/cancel
 * Cancel a scheduled message
 */
router.post('/:id/cancel', bulkMessageController.cancelScheduledMessage);

/**
 * GET /api/v1/bulk-messages/:id/recipients
 * Preview recipients for a bulk message based on filter
 */
router.get('/:id/recipients', bulkMessageController.previewRecipients);

/**
 * GET /api/v1/bulk-messages/:id/status
 * Get delivery status for a bulk message
 */
router.get('/:id/status', bulkMessageController.getDeliveryStatus);

/**
 * POST /api/v1/bulk-messages/:id/retry
 * Retry sending to failed recipients
 */
router.post('/:id/retry', bulkMessageController.retryFailedRecipients);

module.exports = router;
