/**
 * Integration Marketplace Routes
 * Issue #202: Build Integration Marketplace Backend
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const integrationMarketplaceController = require('../../controllers/integrationMarketplaceController');
const integrationConnectController = require('../../controllers/integrationConnectController');
const clerkIntegrationController = require('../../controllers/clerkIntegrationController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// --- User integration connections (#582) ---
// GET /api/v1/integrations/connected
router.get('/connected', integrationConnectController.getConnectedIntegrations);
// POST /api/v1/integrations/connect
router.post('/connect', integrationConnectController.connectIntegration);
// POST /api/v1/integrations/disconnect
router.post('/disconnect', integrationConnectController.disconnectIntegration);

// Get all marketplace listings
// GET /api/v1/integrations/marketplace
router.get('/marketplace', integrationMarketplaceController.getMarketplaceListings);

// Get integration categories
// GET /api/v1/integrations/categories
router.get('/categories', integrationMarketplaceController.getCategories);

// Get installed integrations for a company
// GET /api/v1/integrations/installed
router.get('/installed', integrationMarketplaceController.getInstalledIntegrations);

// --- Clerk integration (Issues #618, #619) ---
// GET  /api/v1/integrations/clerk/status
router.get('/clerk/status', clerkIntegrationController.getStatus);
// POST /api/v1/integrations/clerk/connect  — customer pastes their sk_live_xxx key
router.post('/clerk/connect', clerkIntegrationController.connect);
// DELETE /api/v1/integrations/clerk/disconnect
router.delete('/clerk/disconnect', clerkIntegrationController.disconnect);
// POST /api/v1/integrations/clerk/import  — bulk import with rate-limit safeguards
router.post('/clerk/import', clerkIntegrationController.importUsers);

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
