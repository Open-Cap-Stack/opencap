/**
 * Email Template Routes
 *
 * CRUD routes for custom email templates used from the Communications page.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const emailTemplateController = require('../../controllers/emailTemplateController');

// All routes require authentication
router.use(authenticateToken);

router.get('/', emailTemplateController.listTemplates);
router.post('/', emailTemplateController.createTemplate);
router.get('/:id', emailTemplateController.getTemplate);
router.put('/:id', emailTemplateController.updateTemplate);
router.delete('/:id', emailTemplateController.deleteTemplate);

module.exports = router;
