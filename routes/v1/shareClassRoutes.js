/**
 * Share Class Routes (v1)
 * 
 * [Feature] OCAE-208: Implement share class management endpoints
 * Versioned routes for share class management with JWT auth
 */

const express = require('express');
const router = express.Router();
const shareClassController = require('../../controllers/v1/shareClassController');
const authMiddleware = require('../../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// CRUD Routes
router.post('/', shareClassController.createShareClass);
router.get('/', shareClassController.getAllShareClasses);
router.get('/:id', shareClassController.getShareClassById);
router.put('/:id', shareClassController.updateShareClass);
router.delete('/:id', shareClassController.deleteShareClass);

// Special endpoints
router.get('/search', shareClassController.searchShareClasses);
router.get('/analytics', shareClassController.getShareClassAnalytics);
router.post('/bulk', shareClassController.bulkCreateShareClasses);

module.exports = router;
