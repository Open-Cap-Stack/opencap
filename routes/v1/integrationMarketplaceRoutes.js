/**
 * Integration Marketplace Routes
 * Issue #202: Build Integration Marketplace Backend
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const integrationMarketplaceController = require('../../controllers/integrationMarketplaceController');
const integrationConnectController = require('../../controllers/integrationConnectController');
const clerkIntegrationController = require('../../controllers/clerkIntegrationController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// --- User integration connections (#582) ---
// GET /api/v1/integrations/connected
router.get('/connected', hasRole(['super_admin', 'admin']), integrationConnectController.getConnectedIntegrations);
// POST /api/v1/integrations/connect
router.post('/connect', hasRole(['super_admin', 'admin']), integrationConnectController.connectIntegration);
// POST /api/v1/integrations/disconnect
router.post('/disconnect', hasRole(['super_admin', 'admin']), integrationConnectController.disconnectIntegration);

// Get all marketplace listings
// GET /api/v1/integrations/marketplace
router.get('/marketplace', hasRole(['super_admin', 'admin']), integrationMarketplaceController.getMarketplaceListings);

// Get integration categories
// GET /api/v1/integrations/categories
router.get('/categories', hasRole(['super_admin', 'admin']), integrationMarketplaceController.getCategories);

// Get installed integrations for a company
// GET /api/v1/integrations/installed
router.get('/installed', hasRole(['super_admin', 'admin']), integrationMarketplaceController.getInstalledIntegrations);

// --- Clerk integration (Issues #618, #619) ---
// GET  /api/v1/integrations/clerk/status
router.get('/clerk/status', hasRole(['super_admin', 'admin']), clerkIntegrationController.getStatus);
// POST /api/v1/integrations/clerk/connect  — customer pastes their sk_live_xxx key
router.post('/clerk/connect', hasRole(['super_admin', 'admin']), clerkIntegrationController.connect);
// DELETE /api/v1/integrations/clerk/disconnect
router.delete('/clerk/disconnect', hasRole(['super_admin', 'admin']), clerkIntegrationController.disconnect);
// POST /api/v1/integrations/clerk/import  — bulk import with rate-limit safeguards
router.post('/clerk/import', hasRole(['super_admin', 'admin']), clerkIntegrationController.importUsers);

// Get integration details
// GET /api/v1/integrations/:id
router.get('/:id', hasRole(['super_admin', 'admin']), integrationMarketplaceController.getIntegrationDetails);

// Get integration statistics
// GET /api/v1/integrations/:id/stats
router.get('/:id/stats', hasRole(['super_admin', 'admin']), integrationMarketplaceController.getIntegrationStats);

// Get configuration for an installed integration
// GET /api/v1/integrations/:id/config
router.get('/:id/config', hasRole(['super_admin', 'admin']), integrationMarketplaceController.getConfiguration);

// Create a new marketplace item
// POST /api/v1/integrations
router.post('/', hasRole(['super_admin', 'admin']), integrationMarketplaceController.createMarketplaceItem);

// Install an integration
// POST /api/v1/integrations/:id/install
router.post('/:id/install', hasRole(['super_admin', 'admin']), integrationMarketplaceController.installIntegration);

// Test connection for an installed integration
// POST /api/v1/integrations/:id/test
router.post('/:id/test', hasRole(['super_admin', 'admin']), integrationMarketplaceController.testConnection);

// Update a marketplace item
// PUT /api/v1/integrations/:id
router.put('/:id', hasRole(['super_admin', 'admin']), integrationMarketplaceController.updateMarketplaceItem);

// Update configuration for an installed integration
// PUT /api/v1/integrations/:id/config
router.put('/:id/config', hasRole(['super_admin', 'admin']), integrationMarketplaceController.updateConfiguration);

// Delete a marketplace item
// DELETE /api/v1/integrations/:id
router.delete('/:id', hasRole(['super_admin', 'admin']), integrationMarketplaceController.deleteMarketplaceItem);

// Uninstall an integration
// DELETE /api/v1/integrations/:id/uninstall
router.delete('/:id/uninstall', hasRole(['super_admin', 'admin']), integrationMarketplaceController.uninstallIntegration);

module.exports = router;
