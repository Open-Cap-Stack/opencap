/**
 * Activity Routes
 * Issue #124: Add Activity and Notification Filtering by Company
 *
 * Routes for activity management with filtering support.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const activityController = require('../../controllers/activityController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/v1/activities
 * Create a new activity
 */
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), activityController.createActivity);

/**
 * GET /api/v1/activities
 * Get all activities with optional filtering
 *
 * Query Parameters:
 * - companyId: Filter by company ID
 * - type: Filter by activity type (comma-separated for multiple)
 * - startDate: Filter activities from this date
 * - endDate: Filter activities until this date
 * - limit: Number of results (default: 100)
 * - offset: Number to skip (default: 0)
 */
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee', 'service_provider']), activityController.getActivities);

/**
 * GET /api/v1/activities/:id
 * Get activity by ID
 */
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), activityController.getActivityById);

/**
 * PUT /api/v1/activities/:id
 * Update activity by ID
 */
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), activityController.updateActivity);

/**
 * DELETE /api/v1/activities/:id
 * Delete activity by ID
 */
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), activityController.deleteActivity);

module.exports = router;
