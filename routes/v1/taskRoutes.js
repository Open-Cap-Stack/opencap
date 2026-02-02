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
const taskController = require('../../controllers/taskController');

// Task CRUD routes
router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/analytics', taskController.getAnalytics);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Task comments
router.post('/:id/comments', taskController.addComment);

module.exports = router;
