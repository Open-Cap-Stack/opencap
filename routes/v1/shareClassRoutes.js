/**
 * V1 ShareClass Routes
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * Enhanced routes with authentication, validation, filtering, and analytics
 */

const express = require('express');
const router = express.Router();
const shareClassController = require('../../controllers/v1/shareClassController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET routes
router.get('/', shareClassController.getAllShareClasses);
router.get('/search', shareClassController.searchShareClasses);
router.get('/analytics', shareClassController.getShareClassAnalytics);
router.get('/:id', shareClassController.getShareClassById);

// POST routes
router.post('/', shareClassController.createShareClass);
router.post('/bulk', shareClassController.bulkCreateShareClasses);

// PUT routes
router.put('/:id', shareClassController.updateShareClass);

// DELETE routes
router.delete('/:id', shareClassController.deleteShareClass);

module.exports = router;
