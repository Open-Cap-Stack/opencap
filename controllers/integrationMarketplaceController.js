/**
 * Integration Marketplace Controller
 * Issue #202: Build Integration Marketplace Backend
 */
const databaseAdapter = require('../services/databaseAdapter');
const integrationMarketplaceService = require('../services/integrationMarketplaceService');

/**
 * Get all marketplace listings
 * GET /marketplace
 */
async function getMarketplaceListings(req, res, next) {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const query = { status: 'active' };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const options = { limit: parseInt(limit), skip, sort: { installCount: -1 } };

    let integrations = [];
    let total = 0;

    try {
      integrations = await databaseAdapter.find('IntegrationMarketplaceItem', query, options);
      total = await databaseAdapter.count('IntegrationMarketplaceItem', query);
    } catch (dbError) {
      // Table may not exist yet - return empty data
      console.warn('IntegrationMarketplaceItem table not found, returning empty data');
    }

    return res.status(200).json({
      success: true,
      data: integrations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get installed integrations for a company
 * GET /installed
 */
async function getInstalledIntegrations(req, res, next) {
  try {
    const { companyId } = req.query;

    // Return empty array if no companyId (instead of error)
    if (!companyId) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    let installedIntegrations = [];
    try {
      installedIntegrations = await databaseAdapter.find('InstalledIntegration', { companyId });
    } catch (dbError) {
      // Table may not exist yet - return empty data
      console.warn('InstalledIntegration table not found, returning empty data');
    }

    return res.status(200).json({
      success: true,
      data: installedIntegrations
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Install an integration
 * POST /:id/install
 */
async function installIntegration(req, res, next) {
  try {
    const { id } = req.params;
    const { companyId, configuration, installedBy, permissions } = req.body;
    
    const integration = await databaseAdapter.findById('IntegrationMarketplaceItem', id);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    
    const installedIntegration = await integrationMarketplaceService.installIntegration(id, {
      companyId,
      configuration,
      installedBy,
      permissions
    });
    
    return res.status(201).json({
      success: true,
      data: installedIntegration,
      message: 'Integration installed successfully'
    });
  } catch (error) {
    if (error.code === 'ALREADY_INSTALLED') {
      return res.status(409).json({ success: false, message: error.message });
    }
    if (error.code === 'VALIDATION_ERROR' || error.message.includes('Required configuration')) {
      return res.status(400).json({ success: false, message: error.message, details: error.details });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Uninstall an integration
 * DELETE /:id/uninstall
 */
async function uninstallIntegration(req, res, next) {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' });
    }
    
    const result = await integrationMarketplaceService.uninstallIntegration(id, companyId);
    
    if (!result) {
      return res.status(404).json({ success: false, message: 'Integration not installed' });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Integration uninstalled successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get configuration for an installed integration
 * GET /:id/config
 */
async function getConfiguration(req, res, next) {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' });
    }
    
    const installation = await databaseAdapter.findOne('InstalledIntegration', { integrationId: id, companyId });
    
    if (!installation) {
      return res.status(404).json({ success: false, message: 'Integration not installed' });
    }
    
    // Mask sensitive configuration values
    const maskedConfig = {};
    const config = installation.configuration instanceof Map 
      ? Object.fromEntries(installation.configuration) 
      : installation.configuration;
    
    for (const [key, value] of Object.entries(config || {})) {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password')) {
        maskedConfig[key] = value ? '***' + value.toString().slice(-4) : '';
      } else {
        maskedConfig[key] = value;
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        configuration: maskedConfig,
        status: installation.status,
        installedAt: installation.installedAt,
        configuredAt: installation.configuredAt
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update configuration for an installed integration
 * PUT /:id/config
 */
async function updateConfiguration(req, res, next) {
  try {
    const { id } = req.params;
    const { companyId, configuration, updatedBy } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' });
    }
    
    const updated = await integrationMarketplaceService.updateConfiguration(id, companyId, configuration, updatedBy);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Integration not installed' });
    }
    
    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR' || error.message.includes('Invalid configuration')) {
      return res.status(400).json({ success: false, message: error.message, details: error.details });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Test connection for an installed integration
 * POST /:id/test
 */
async function testConnection(req, res, next) {
  try {
    const { id } = req.params;
    const { companyId } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'companyId is required' });
    }
    
    const testResult = await integrationMarketplaceService.testConnection(id, companyId);
    
    if (!testResult) {
      return res.status(404).json({ success: false, message: 'Integration not installed' });
    }
    
    return res.status(200).json({
      success: true,
      data: testResult
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get integration categories
 * GET /categories
 */
async function getCategories(req, res, next) {
  try {
    const categories = await integrationMarketplaceService.getCategories();
    
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get integration details
 * GET /:id
 */
async function getIntegrationDetails(req, res, next) {
  try {
    const { id } = req.params;
    const { companyId } = req.query;
    
    const integration = await databaseAdapter.findById('IntegrationMarketplaceItem', id);
    
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    
    const result = { ...integration, isInstalled: false, installationStatus: null };
    
    if (companyId) {
      const installation = await databaseAdapter.findOne('InstalledIntegration', { 
        integrationId: integration.integrationId || id, 
        companyId 
      });
      if (installation) {
        result.isInstalled = true;
        result.installationStatus = installation.status;
        result.installedAt = installation.installedAt;
      }
    }
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Create a new marketplace item
 * POST /
 */
async function createMarketplaceItem(req, res, next) {
  try {
    const { name, description, category, configurationSchema, provider, icon, version, features, pricing, documentation } = req.body;
    
    if (!name || !description || !category || !provider) {
      return res.status(400).json({ 
        success: false, 
        message: 'Required fields missing: name, description, category, and provider are required' 
      });
    }
    
    const integrationData = {
      name,
      description,
      category,
      provider,
      configurationSchema: configurationSchema || {},
      icon: icon || '',
      version: version || '1.0.0',
      features: features || [],
      pricing: pricing || { type: 'free' },
      documentation: documentation || '',
      status: 'active',
      installCount: 0
    };
    
    const integration = await databaseAdapter.create('IntegrationMarketplaceItem', integrationData);
    
    return res.status(201).json({
      success: true,
      data: integration,
      message: 'Integration created successfully'
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Integration with this name already exists' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Update a marketplace item
 * PUT /:id
 */
async function updateMarketplaceItem(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updated = await databaseAdapter.findByIdAndUpdate(
      'IntegrationMarketplaceItem',
      id,
      updates,
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    
    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Integration updated successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Delete a marketplace item
 * DELETE /:id
 */
async function deleteMarketplaceItem(req, res, next) {
  try {
    const { id } = req.params;
    
    const integration = await databaseAdapter.findById('IntegrationMarketplaceItem', id);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    
    // Check if there are any active installations
    const activeInstallation = await databaseAdapter.findOne('InstalledIntegration', { 
      integrationId: integration.integrationId || id 
    });
    
    if (activeInstallation) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete integration that is currently installed by companies' 
      });
    }
    
    await databaseAdapter.findByIdAndDelete('IntegrationMarketplaceItem', id);
    
    return res.status(200).json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Get integration statistics
 * GET /:id/stats
 */
async function getIntegrationStats(req, res, next) {
  try {
    const { id } = req.params;
    
    const integration = await databaseAdapter.findById('IntegrationMarketplaceItem', id);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integration not found' });
    }
    
    const totalInstallations = await databaseAdapter.count('InstalledIntegration', { 
      integrationId: integration.integrationId || id 
    });
    
    return res.status(200).json({
      success: true,
      data: {
        integrationId: integration.integrationId || id,
        name: integration.name,
        totalInstallations,
        rating: integration.rating || { average: 0, count: 0 }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getMarketplaceListings,
  getInstalledIntegrations,
  installIntegration,
  uninstallIntegration,
  getConfiguration,
  updateConfiguration,
  testConnection,
  getCategories,
  getIntegrationDetails,
  createMarketplaceItem,
  updateMarketplaceItem,
  deleteMarketplaceItem,
  getIntegrationStats
};
