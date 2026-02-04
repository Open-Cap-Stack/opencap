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
const documentTemplateController = require('../../controllers/documentTemplateController');

// Create a new template
router.post(
  '/',
  documentTemplateController.createTemplate
);

// Get template categories (must be before /:id route)
router.get(
  '/categories',
  documentTemplateController.getCategories
);

// Search templates (must be before /:id route)
router.get(
  '/search',
  documentTemplateController.searchTemplates
);

// List templates with filtering
router.get(
  '/',
  documentTemplateController.getTemplates
);

// Get a template by ID
router.get(
  '/:id',
  documentTemplateController.getTemplateById
);

// Update a template
router.put(
  '/:id',
  documentTemplateController.updateTemplate
);

// Delete a template (soft delete by default, hard delete with ?hard=true)
router.delete(
  '/:id',
  documentTemplateController.deleteTemplate
);

// Generate document from template with variable substitution
router.post(
  '/:id/generate',
  documentTemplateController.generateDocument
);

// Preview template with sample values
router.get(
  '/:id/preview',
  documentTemplateController.previewTemplate
);

// Clone a template
router.post(
  '/:id/clone',
  documentTemplateController.cloneTemplate
);

module.exports = router;
