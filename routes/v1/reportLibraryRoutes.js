/**
 * Report Library Routes (v1)
 * Issue #199: Add Report Library Categorization
 *
 * Routes for report library management with JWT authentication.
 */

const express = require('express');
const router = express.Router();
const reportLibraryController = require('../../controllers/reportLibraryController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Library endpoint - must be before parameterized routes
router.get('/library', reportLibraryController.getLibrary);

// Category routes
router.get('/categories', reportLibraryController.getCategories);
router.post('/categories', reportLibraryController.createCategory);
router.put('/categories/:categoryId', reportLibraryController.updateCategory);
router.delete('/categories/:categoryId', reportLibraryController.deleteCategory);

// Template routes
router.get('/templates', reportLibraryController.getTemplates);
router.post('/templates', reportLibraryController.createTemplate);
router.get('/templates/:templateId', reportLibraryController.getTemplateById);
router.put('/templates/:templateId', reportLibraryController.updateTemplate);
router.delete('/templates/:templateId', reportLibraryController.deleteTemplate);

// Share routes - must come before :reportId routes
router.delete('/shares/:shareId', reportLibraryController.revokeShare);
router.get('/shares/:shareId/validate', reportLibraryController.validateShareAccess);

// Report-specific share routes
router.post('/:reportId/share', reportLibraryController.shareReport);
router.get('/:reportId/shares', reportLibraryController.getShares);

module.exports = router;
