/**
 * Integration Marketplace Controller Unit Tests
 * Issue #202: Build Integration Marketplace Backend
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock dependencies before requiring the controller
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  count: jest.fn()
}));

jest.mock('../../../services/integrationMarketplaceService', () => ({
  installIntegration: jest.fn(),
  uninstallIntegration: jest.fn(),
  updateConfiguration: jest.fn(),
  testConnection: jest.fn(),
  getCategories: jest.fn(),
  getIntegrationDetails: jest.fn(),
  validateConfiguration: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const integrationMarketplaceController = require('../../../controllers/integrationMarketplaceController');
const databaseAdapter = require('../../../services/databaseAdapter');
const integrationMarketplaceService = require('../../../services/integrationMarketplaceService');

describe('IntegrationMarketplaceController', () => {
  let req, res, next;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getMarketplaceListings', () => {
    const mockIntegrations = [
      {
        _id: 'int1',
        integrationId: 'INT-001',
        name: 'Stripe',
        description: 'Payment processing integration',
        category: 'payments',
        status: 'active',
        icon: 'stripe-icon.png',
        version: '1.0.0'
      },
      {
        _id: 'int2',
        integrationId: 'INT-002',
        name: 'Slack',
        description: 'Team communication integration',
        category: 'communication',
        status: 'active',
        icon: 'slack-icon.png',
        version: '2.1.0'
      }
    ];

    it('should return all marketplace listings', async () => {
      databaseAdapter.find.mockResolvedValue(mockIntegrations);
      databaseAdapter.count.mockResolvedValue(2);

      await integrationMarketplaceController.getMarketplaceListings(req, res, next);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'IntegrationMarketplaceItem',
        { status: 'active' },
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(2);
    });

    it('should filter by category', async () => {
      req.query = { category: 'payments' };
      databaseAdapter.find.mockResolvedValue([mockIntegrations[0]]);
      databaseAdapter.count.mockResolvedValue(1);

      await integrationMarketplaceController.getMarketplaceListings(req, res, next);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'IntegrationMarketplaceItem',
        expect.objectContaining({ category: 'payments' }),
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).data).toHaveLength(1);
    });

    it('should support search by name', async () => {
      req.query = { search: 'Stripe' };
      databaseAdapter.find.mockResolvedValue([mockIntegrations[0]]);
      databaseAdapter.count.mockResolvedValue(1);

      await integrationMarketplaceController.getMarketplaceListings(req, res, next);

      expect(res.statusCode).toBe(200);
    });

    it('should support pagination', async () => {
      req.query = { page: '1', limit: '10' };
      databaseAdapter.find.mockResolvedValue(mockIntegrations);
      databaseAdapter.count.mockResolvedValue(50);

      await integrationMarketplaceController.getMarketplaceListings(req, res, next);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'IntegrationMarketplaceItem',
        expect.any(Object),
        expect.objectContaining({ limit: 10, skip: 0 })
      );
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await integrationMarketplaceController.getMarketplaceListings(req, res, next);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData()).success).toBe(false);
    });
  });

  describe('getInstalledIntegrations', () => {
    const mockInstalledIntegrations = [
      {
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001',
        status: 'active',
        configuration: { apiKey: '***' },
        installedAt: new Date(),
        installedBy: 'user123'
      }
    ];

    it('should return installed integrations for a company', async () => {
      req.query = { companyId: 'company123' };
      databaseAdapter.find.mockResolvedValue(mockInstalledIntegrations);

      await integrationMarketplaceController.getInstalledIntegrations(req, res, next);

      expect(databaseAdapter.find).toHaveBeenCalledWith(
        'InstalledIntegration',
        { companyId: 'company123' }
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).data).toHaveLength(1);
    });

    it('should return 400 when companyId is missing', async () => {
      req.query = {};

      await integrationMarketplaceController.getInstalledIntegrations(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('companyId');
    });

    it('should return empty array when no integrations installed', async () => {
      req.query = { companyId: 'company123' };
      databaseAdapter.find.mockResolvedValue([]);

      await integrationMarketplaceController.getInstalledIntegrations(req, res, next);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).data).toEqual([]);
    });
  });

  describe('installIntegration', () => {
    const mockIntegration = {
      _id: 'int1',
      integrationId: 'INT-001',
      name: 'Stripe',
      configurationSchema: {
        apiKey: { type: 'string', required: true }
      }
    };

    it('should install an integration successfully', async () => {
      req.params = { id: 'int1' };
      req.body = {
        companyId: 'company123',
        configuration: { apiKey: 'sk_test_123' },
        installedBy: 'user123'
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      integrationMarketplaceService.installIntegration.mockResolvedValue({
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001',
        status: 'active',
        installedAt: new Date()
      });

      await integrationMarketplaceController.installIntegration(req, res, next);

      expect(integrationMarketplaceService.installIntegration).toHaveBeenCalledWith(
        'int1',
        expect.objectContaining({
          companyId: 'company123',
          configuration: { apiKey: 'sk_test_123' }
        })
      );
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData()).success).toBe(true);
    });

    it('should return 404 when integration not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { companyId: 'company123', configuration: {} };
      databaseAdapter.findById.mockResolvedValue(null);

      await integrationMarketplaceController.installIntegration(req, res, next);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData()).message).toContain('not found');
    });

    it('should return 400 when required configuration is missing', async () => {
      req.params = { id: 'int1' };
      req.body = {
        companyId: 'company123',
        configuration: {} // Missing required apiKey
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      integrationMarketplaceService.installIntegration.mockRejectedValue(
        new Error('Required configuration field "apiKey" is missing')
      );

      await integrationMarketplaceController.installIntegration(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should return 409 when integration already installed', async () => {
      req.params = { id: 'int1' };
      req.body = { companyId: 'company123', configuration: { apiKey: 'sk_test_123' } };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      integrationMarketplaceService.installIntegration.mockRejectedValue({
        code: 'ALREADY_INSTALLED',
        message: 'Integration already installed'
      });

      await integrationMarketplaceController.installIntegration(req, res, next);

      expect(res.statusCode).toBe(409);
    });
  });

  describe('uninstallIntegration', () => {
    it('should uninstall an integration successfully', async () => {
      req.params = { id: 'int1' };
      req.query = { companyId: 'company123' };

      integrationMarketplaceService.uninstallIntegration.mockResolvedValue({
        success: true,
        message: 'Integration uninstalled successfully'
      });

      await integrationMarketplaceController.uninstallIntegration(req, res, next);

      expect(integrationMarketplaceService.uninstallIntegration).toHaveBeenCalledWith(
        'int1',
        'company123'
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toContain('uninstalled');
    });

    it('should return 404 when integration not installed', async () => {
      req.params = { id: 'int1' };
      req.query = { companyId: 'company123' };

      integrationMarketplaceService.uninstallIntegration.mockResolvedValue(null);

      await integrationMarketplaceController.uninstallIntegration(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when companyId is missing', async () => {
      req.params = { id: 'int1' };
      req.query = {};

      await integrationMarketplaceController.uninstallIntegration(req, res, next);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getConfiguration', () => {
    const mockInstalledIntegration = {
      _id: 'inst1',
      companyId: 'company123',
      integrationId: 'INT-001',
      configuration: {
        apiKey: 'sk_test_123',
        webhookSecret: 'whsec_123'
      },
      status: 'active'
    };

    it('should return configuration for installed integration', async () => {
      req.params = { id: 'int1' };
      req.query = { companyId: 'company123' };

      databaseAdapter.findOne.mockResolvedValue(mockInstalledIntegration);

      await integrationMarketplaceController.getConfiguration(req, res, next);

      expect(databaseAdapter.findOne).toHaveBeenCalledWith(
        'InstalledIntegration',
        { integrationId: 'int1', companyId: 'company123' }
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).data.configuration).toBeDefined();
    });

    it('should mask sensitive configuration values', async () => {
      req.params = { id: 'int1' };
      req.query = { companyId: 'company123' };

      databaseAdapter.findOne.mockResolvedValue(mockInstalledIntegration);

      await integrationMarketplaceController.getConfiguration(req, res, next);

      const responseData = JSON.parse(res._getData());
      // API keys should be masked
      expect(responseData.data.configuration.apiKey).not.toBe('sk_test_123');
    });

    it('should return 404 when integration not installed', async () => {
      req.params = { id: 'int1' };
      req.query = { companyId: 'company123' };

      databaseAdapter.findOne.mockResolvedValue(null);

      await integrationMarketplaceController.getConfiguration(req, res, next);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration successfully', async () => {
      req.params = { id: 'int1' };
      req.body = {
        companyId: 'company123',
        configuration: {
          apiKey: 'sk_test_new',
          webhookSecret: 'whsec_new'
        },
        updatedBy: 'user123'
      };

      integrationMarketplaceService.updateConfiguration.mockResolvedValue({
        _id: 'inst1',
        configuration: req.body.configuration,
        updatedAt: new Date()
      });

      await integrationMarketplaceController.updateConfiguration(req, res, next);

      expect(integrationMarketplaceService.updateConfiguration).toHaveBeenCalledWith(
        'int1',
        'company123',
        req.body.configuration,
        'user123'
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 for invalid configuration', async () => {
      req.params = { id: 'int1' };
      req.body = {
        companyId: 'company123',
        configuration: { invalidField: 'value' }
      };

      integrationMarketplaceService.updateConfiguration.mockRejectedValue(
        new Error('Invalid configuration field: invalidField')
      );

      await integrationMarketplaceController.updateConfiguration(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when integration not installed', async () => {
      req.params = { id: 'int1' };
      req.body = { companyId: 'company123', configuration: {} };

      integrationMarketplaceService.updateConfiguration.mockResolvedValue(null);

      await integrationMarketplaceController.updateConfiguration(req, res, next);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      req.params = { id: 'int1' };
      req.body = { companyId: 'company123' };

      integrationMarketplaceService.testConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        responseTime: 150,
        details: { version: '2023.1' }
      });

      await integrationMarketplaceController.testConnection(req, res, next);

      expect(integrationMarketplaceService.testConnection).toHaveBeenCalledWith(
        'int1',
        'company123'
      );
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data.responseTime).toBeDefined();
    });

    it('should return test failure with details', async () => {
      req.params = { id: 'int1' };
      req.body = { companyId: 'company123' };

      integrationMarketplaceService.testConnection.mockResolvedValue({
        success: false,
        message: 'Connection failed',
        error: 'Invalid API key'
      });

      await integrationMarketplaceController.testConnection(req, res, next);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.success).toBe(false);
      expect(responseData.data.error).toBeDefined();
    });

    it('should return 404 when integration not installed', async () => {
      req.params = { id: 'int1' };
      req.body = { companyId: 'company123' };

      integrationMarketplaceService.testConnection.mockResolvedValue(null);

      await integrationMarketplaceController.testConnection(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on service error', async () => {
      req.params = { id: 'int1' };
      req.body = { companyId: 'company123' };

      integrationMarketplaceService.testConnection.mockRejectedValue(
        new Error('Service unavailable')
      );

      await integrationMarketplaceController.testConnection(req, res, next);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getCategories', () => {
    const mockCategories = [
      { id: 'payments', name: 'Payments', description: 'Payment processing integrations', count: 5 },
      { id: 'communication', name: 'Communication', description: 'Team communication tools', count: 3 },
      { id: 'accounting', name: 'Accounting', description: 'Financial and accounting software', count: 4 },
      { id: 'crm', name: 'CRM', description: 'Customer relationship management', count: 2 }
    ];

    it('should return all categories', async () => {
      integrationMarketplaceService.getCategories.mockResolvedValue(mockCategories);

      await integrationMarketplaceController.getCategories(req, res, next);

      expect(integrationMarketplaceService.getCategories).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.success).toBe(true);
      expect(responseData.data).toHaveLength(4);
    });

    it('should include integration count per category', async () => {
      integrationMarketplaceService.getCategories.mockResolvedValue(mockCategories);

      await integrationMarketplaceController.getCategories(req, res, next);

      const responseData = JSON.parse(res._getData());
      expect(responseData.data[0].count).toBeDefined();
    });

    it('should return 500 on error', async () => {
      integrationMarketplaceService.getCategories.mockRejectedValue(new Error('Error'));

      await integrationMarketplaceController.getCategories(req, res, next);

      expect(res.statusCode).toBe(500);
    });
  });

  describe('getIntegrationDetails', () => {
    const mockIntegrationDetails = {
      _id: 'int1',
      integrationId: 'INT-001',
      name: 'Stripe',
      description: 'Payment processing integration',
      category: 'payments',
      version: '1.0.0',
      documentation: 'https://docs.example.com/stripe',
      configurationSchema: {
        apiKey: { type: 'string', required: true, label: 'API Key' },
        webhookSecret: { type: 'string', required: false, label: 'Webhook Secret' }
      },
      features: ['subscriptions', 'invoices', 'payments'],
      pricing: { type: 'free' }
    };

    it('should return integration details', async () => {
      req.params = { id: 'int1' };
      databaseAdapter.findById.mockResolvedValue(mockIntegrationDetails);

      await integrationMarketplaceController.getIntegrationDetails(req, res, next);

      expect(databaseAdapter.findById).toHaveBeenCalledWith(
        'IntegrationMarketplaceItem',
        'int1'
      );
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.name).toBe('Stripe');
      expect(responseData.data.configurationSchema).toBeDefined();
    });

    it('should return 404 when integration not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await integrationMarketplaceController.getIntegrationDetails(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should include installation status if companyId provided', async () => {
      req.params = { id: 'int1' };
      req.query = { companyId: 'company123' };

      databaseAdapter.findById.mockResolvedValue(mockIntegrationDetails);
      databaseAdapter.findOne.mockResolvedValue({
        _id: 'inst1',
        status: 'active',
        installedAt: new Date()
      });

      await integrationMarketplaceController.getIntegrationDetails(req, res, next);

      const responseData = JSON.parse(res._getData());
      expect(responseData.data.isInstalled).toBe(true);
      expect(responseData.data.installationStatus).toBe('active');
    });
  });

  describe('createMarketplaceItem', () => {
    const validIntegrationData = {
      name: 'New Integration',
      description: 'A new integration',
      category: 'payments',
      configurationSchema: {
        apiKey: { type: 'string', required: true }
      },
      provider: 'test-provider',
      icon: 'icon.png'
    };

    it('should create a new marketplace item', async () => {
      req.body = validIntegrationData;

      databaseAdapter.create.mockResolvedValue({
        _id: 'int-new',
        integrationId: 'INT-NEW-001',
        ...validIntegrationData,
        status: 'active',
        createdAt: new Date()
      });

      await integrationMarketplaceController.createMarketplaceItem(req, res, next);

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'IntegrationMarketplaceItem',
        expect.objectContaining({
          name: 'New Integration',
          category: 'payments'
        })
      );
      expect(res.statusCode).toBe(201);
    });

    it('should return 400 for missing required fields', async () => {
      req.body = { name: 'Incomplete' };

      await integrationMarketplaceController.createMarketplaceItem(req, res, next);

      expect(res.statusCode).toBe(400);
    });

    it('should return 409 for duplicate integration name', async () => {
      req.body = validIntegrationData;

      databaseAdapter.create.mockRejectedValue({
        code: 11000,
        message: 'Duplicate key error'
      });

      await integrationMarketplaceController.createMarketplaceItem(req, res, next);

      expect(res.statusCode).toBe(409);
    });
  });

  describe('updateMarketplaceItem', () => {
    it('should update a marketplace item', async () => {
      req.params = { id: 'int1' };
      req.body = { description: 'Updated description', version: '1.1.0' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        _id: 'int1',
        name: 'Stripe',
        description: 'Updated description',
        version: '1.1.0'
      });

      await integrationMarketplaceController.updateMarketplaceItem(req, res, next);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'IntegrationMarketplaceItem',
        'int1',
        expect.objectContaining({ description: 'Updated description' }),
        expect.any(Object)
      );
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when item not found', async () => {
      req.params = { id: 'nonexistent' };
      req.body = { description: 'Updated' };

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await integrationMarketplaceController.updateMarketplaceItem(req, res, next);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('deleteMarketplaceItem', () => {
    it('should delete a marketplace item', async () => {
      req.params = { id: 'int1' };

      databaseAdapter.findById.mockResolvedValue({ _id: 'int1', integrationId: 'INT-001' });
      databaseAdapter.findOne.mockResolvedValue(null); // No active installations
      databaseAdapter.findByIdAndDelete.mockResolvedValue({ _id: 'int1' });

      await integrationMarketplaceController.deleteMarketplaceItem(req, res, next);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith(
        'IntegrationMarketplaceItem',
        'int1'
      );
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toContain('deleted');
    });

    it('should return 404 when item not found', async () => {
      req.params = { id: 'nonexistent' };

      databaseAdapter.findById.mockResolvedValue(null);

      await integrationMarketplaceController.deleteMarketplaceItem(req, res, next);

      expect(res.statusCode).toBe(404);
    });

    it('should prevent deletion when integrations are installed', async () => {
      req.params = { id: 'int1' };

      databaseAdapter.findById.mockResolvedValue({ _id: 'int1', integrationId: 'INT-001' });
      databaseAdapter.findOne.mockResolvedValue({ _id: 'inst1' }); // Has installations

      await integrationMarketplaceController.deleteMarketplaceItem(req, res, next);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('installed');
    });
  });

  describe('getIntegrationStats', () => {
    it('should return statistics for an integration', async () => {
      req.params = { id: 'int1' };

      databaseAdapter.findById.mockResolvedValue({ _id: 'int1', name: 'Stripe' });
      databaseAdapter.count.mockResolvedValue(15); // 15 installations

      await integrationMarketplaceController.getIntegrationStats(req, res, next);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.data.totalInstallations).toBe(15);
    });

    it('should return 404 when integration not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findById.mockResolvedValue(null);

      await integrationMarketplaceController.getIntegrationStats(req, res, next);

      expect(res.statusCode).toBe(404);
    });
  });
});
