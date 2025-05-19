const express = require('express');
const router = express.Router();
const integrationModuleController = require('../../controllers/integrationController');

// Route for integrating with a tool
router.post('/integration-modules', integrationModuleController.createIntegrationModule);

// Add more routes for integration module-related functionality here

module.exports = router;
