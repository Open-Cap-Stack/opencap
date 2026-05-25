/**
 * DocumentTemplate Routes
 * Issue #193: Implement Document Template System
 *
 * API routes for document template management
 *
 * Routes:
 * - POST /api/v1/templates - Create new template
 * - GET /api/v1/templates - List document templates
 * - GET /api/v1/templates/categories - Get template categories
 * - GET /api/v1/templates/search - Search templates
 * - GET /api/v1/templates/:id - Get template details
 * - PUT /api/v1/templates/:id - Update template
 * - DELETE /api/v1/templates/:id - Delete template
 * - POST /api/v1/templates/:id/generate - Generate document from template
 * - GET /api/v1/templates/:id/preview - Preview template with sample values
 * - POST /api/v1/templates/:id/clone - Clone a template
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const documentTemplateController = require('../../controllers/documentTemplateController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create a new template
router.post(
  '/',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.createTemplate
);

// Get template categories (must be before /:id route)
router.get(
  '/categories',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.getCategories
);

// Search templates (must be before /:id route)
router.get(
  '/search',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.searchTemplates
);

// List templates with filtering
router.get(
  '/',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.getTemplates
);

// Get a template by ID
router.get(
  '/:id',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.getTemplateById
);

// Update a template
router.put(
  '/:id',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.updateTemplate
);

// Delete a template (soft delete by default, hard delete with ?hard=true)
router.delete(
  '/:id',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.deleteTemplate
);

// Generate document from template with variable substitution
router.post(
  '/:id/generate',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.generateDocument
);

// Preview template with sample values
router.get(
  '/:id/preview',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.previewTemplate
);

// Clone a template
router.post(
  '/:id/clone',
  hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']),
  documentTemplateController.cloneTemplate
);

module.exports = router;
