const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const integrationModuleController = require('../../controllers/integrationController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Route for integrating with a tool
router.post('/integration-modules', hasRole(['super_admin', 'admin']), integrationModuleController.createIntegrationModule);

// Add more routes for integration module-related functionality here

module.exports = router;
