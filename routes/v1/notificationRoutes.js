/**
 * Notification Routes
 * Issue #124: Add Activity and Notification Filtering by Company
 *
 * Routes for notification management with filtering support.
 */
const express = require('express');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const notificationController = require('../../controllers/Notification');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/v1/notifications
 * Create a new notification
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), notificationController.createNotification);

/**
 * GET /api/v1/notifications
 * Get all notifications with optional filtering
 *
 * Query Parameters:
 * - companyId: Filter by company ID
 * - type: Filter by notification type (comma-separated for multiple)
 * - unread: Filter by read status (true = unread only, false = read only)
 * - limit: Number of results (default: 100)
 * - offset: Number to skip (default: 0)
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), notificationController.getNotifications);

/**
 * POST /api/v1/notifications/mark-read
 * Mark notifications as read
 *
 * Body:
 * - notificationIds: Array of notification IDs to mark as read
 * - markAll: Boolean to mark all unread notifications as read
 * - companyId: Optional company ID filter when markAll is true
 */
router.post('/mark-read', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), notificationController.markNotificationsRead);

/**
 * GET /api/v1/notifications/:id
 * Get a notification by ID
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), notificationController.getNotificationById);

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification by ID
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), notificationController.deleteNotification);

module.exports = router;
