/**
 * Integration Marketplace Routes
 * Issue #202: Build Integration Marketplace Backend
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const integrationMarketplaceController = require('../../controllers/integrationMarketplaceController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all marketplace listings
// GET /api/v1/integrations/marketplace
router.get('/marketplace', integrationMarketplaceController.getMarketplaceListings);

// Get integration categories
// GET /api/v1/integrations/categories
router.get('/categories', integrationMarketplaceController.getCategories);

// Get installed integrations for a company
// GET /api/v1/integrations/installed
router.get('/installed', integrationMarketplaceController.getInstalledIntegrations);

// Get integration details
// GET /api/v1/integrations/:id
router.get('/:id', integrationMarketplaceController.getIntegrationDetails);

// Get integration statistics
// GET /api/v1/integrations/:id/stats
router.get('/:id/stats', integrationMarketplaceController.getIntegrationStats);

// Get configuration for an installed integration
// GET /api/v1/integrations/:id/config
router.get('/:id/config', integrationMarketplaceController.getConfiguration);

// Create a new marketplace item
// POST /api/v1/integrations
router.post('/', integrationMarketplaceController.createMarketplaceItem);

// Install an integration
// POST /api/v1/integrations/:id/install
router.post('/:id/install', integrationMarketplaceController.installIntegration);

// Test connection for an installed integration
// POST /api/v1/integrations/:id/test
router.post('/:id/test', integrationMarketplaceController.testConnection);

// Update a marketplace item
// PUT /api/v1/integrations/:id
router.put('/:id', integrationMarketplaceController.updateMarketplaceItem);

// Update configuration for an installed integration
// PUT /api/v1/integrations/:id/config
router.put('/:id/config', integrationMarketplaceController.updateConfiguration);

// Delete a marketplace item
// DELETE /api/v1/integrations/:id
router.delete('/:id', integrationMarketplaceController.deleteMarketplaceItem);

// Uninstall an integration
// DELETE /api/v1/integrations/:id/uninstall
router.delete('/:id/uninstall', integrationMarketplaceController.uninstallIntegration);

module.exports = router;
