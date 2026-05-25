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
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Root list endpoint — investor portal calls GET /reports
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.getCategories);

// Library endpoint - must be before parameterized routes
router.get('/library', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.getLibrary);

// Category routes
router.get('/categories', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.getCategories);
router.post('/categories', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.createCategory);
router.put('/categories/:categoryId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.updateCategory);
router.delete('/categories/:categoryId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.deleteCategory);

// Template routes
router.get('/templates', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.getTemplates);
router.post('/templates', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.createTemplate);
router.get('/templates/:templateId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.getTemplateById);
router.put('/templates/:templateId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.updateTemplate);
router.delete('/templates/:templateId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.deleteTemplate);

// Share routes - must come before :reportId routes
router.delete('/shares/:shareId', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.revokeShare);
router.get('/shares/:shareId/validate', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.validateShareAccess);

// Report-specific share routes
router.post('/:reportId/share', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.shareReport);
router.get('/:reportId/shares', hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), reportLibraryController.getShares);

module.exports = router;
