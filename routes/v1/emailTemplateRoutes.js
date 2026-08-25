/**
 * Email Template Routes
 *
 * CRUD routes for custom email templates used from the Communications page.
 * Issue #177: Added role-based access control to restrict write/delete operations.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const emailTemplateController = require('../../controllers/emailTemplateController');

// All routes require authentication
router.use(authenticateToken);

// Read-only endpoints — any authenticated user
router.get('/', emailTemplateController.listTemplates);
router.get('/:id', emailTemplateController.getTemplate);

// Write endpoints — restricted to admin, super_admin, founder
router.post('/', hasRole(['admin', 'super_admin', 'founder']), emailTemplateController.createTemplate);
router.put('/:id', hasRole(['admin', 'super_admin', 'founder']), emailTemplateController.updateTemplate);

// Delete endpoint — restricted to admin, super_admin
router.delete('/:id', hasRole(['admin', 'super_admin']), emailTemplateController.deleteTemplate);

module.exports = router;
