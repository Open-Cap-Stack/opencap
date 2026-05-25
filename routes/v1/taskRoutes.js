/**
 * Task Routes
 *
 * Issue #121: Create Task Management API
 *
 * Routes for task management including CRUD operations,
 * comments, and analytics.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const taskController = require('../../controllers/taskController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Task CRUD routes
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), taskController.createTask);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), taskController.getTasks);
router.get('/analytics', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), taskController.getAnalytics);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), taskController.getTaskById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), taskController.updateTask);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), taskController.deleteTask);

// Task comments
router.post('/:id/comments', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), taskController.addComment);

module.exports = router;
