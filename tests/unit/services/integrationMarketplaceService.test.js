/**
 * Integration Marketplace Service Unit Tests
 * Issue #202: Build Integration Marketplace Backend
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock dependencies before requiring the service
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

const integrationMarketplaceService = require('../../../services/integrationMarketplaceService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('IntegrationMarketplaceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('installIntegration', () => {
    const mockIntegration = {
      _id: 'int1',
      integrationId: 'INT-001',
      name: 'Stripe',
      configurationSchema: {
        apiKey: { type: 'string', required: true, label: 'API Key' }
      }
    };

    const installData = {
      companyId: 'company123',
      configuration: { apiKey: 'sk_test_123' },
      installedBy: 'user123'
    };

    it('should install an integration successfully', async () => {
      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue(null); // Not already installed
      databaseAdapter.create.mockResolvedValue({
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001',
        status: 'pending'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockIntegration);

      const result = await integrationMarketplaceService.installIntegration('int1', installData);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('IntegrationMarketplaceItem', 'int1');
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'InstalledIntegration',
        expect.objectContaining({
          companyId: 'company123',
          integrationId: 'INT-001'
        })
      );
      expect(result).toBeDefined();
    });

    it('should throw error if integration not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      await expect(integrationMarketplaceService.installIntegration('nonexistent', installData))
        .rejects.toThrow('Integration not found');
    });

    it('should throw error if already installed', async () => {
      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue({ _id: 'inst1' }); // Already installed

      try {
        await integrationMarketplaceService.installIntegration('int1', installData);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.code).toBe('ALREADY_INSTALLED');
      }
    });
  });

  describe('uninstallIntegration', () => {
    it('should uninstall an integration successfully', async () => {
      const mockInstallation = {
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001'
      };

      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001',
        installCount: 5
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation)
        .mockResolvedValueOnce(mockIntegration);
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockInstallation);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockIntegration, installCount: 4 });

      const result = await integrationMarketplaceService.uninstallIntegration('INT-001', 'company123');

      expect(result.success).toBe(true);
      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('InstalledIntegration', 'inst1');
    });

    it('should return null if not installed', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await integrationMarketplaceService.uninstallIntegration('INT-001', 'company123');

      expect(result).toBeNull();
    });
  });

  describe('testConnection', () => {
    it('should return successful test result', async () => {
      const mockInstallation = {
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001',
        configuration: new Map([['apiKey', 'sk_test_123']])
      };

      const mockIntegration = {
        integrationId: 'INT-001',
        version: '1.0.0',
        configurationSchema: {
          apiKey: { type: 'string', required: true }
        }
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation)
        .mockResolvedValueOnce(mockIntegration);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockInstallation);

      const result = await integrationMarketplaceService.testConnection('INT-001', 'company123');

      expect(result.success).toBe(true);
      expect(result.responseTime).toBeDefined();
    });

    it('should return null if installation not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await integrationMarketplaceService.testConnection('INT-001', 'company123');

      expect(result).toBeNull();
    });
  });

  describe('getCategories', () => {
    it('should return all categories with counts', async () => {
      databaseAdapter.count.mockResolvedValue(5);

      const categories = await integrationMarketplaceService.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty('id');
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('description');
      expect(categories[0]).toHaveProperty('count');
    });
  });

  describe('validateConfiguration', () => {
    it('should validate required fields', () => {
      const schema = {
        apiKey: { type: 'string', required: true },
        optional: { type: 'string', required: false }
      };

      const result = integrationMarketplaceService.validateConfiguration(
        { apiKey: 'test' },
        schema
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for missing required fields', () => {
      const schema = {
        apiKey: { type: 'string', required: true }
      };

      const result = integrationMarketplaceService.validateConfiguration({}, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('generateWebhookSecret', () => {
    it('should generate a webhook secret with correct prefix', () => {
      const secret = integrationMarketplaceService.generateWebhookSecret();

      expect(secret).toMatch(/^whsec_/);
      expect(secret.length).toBeGreaterThan(10);
    });
  });

  describe('INTEGRATION_CATEGORIES', () => {
    it('should export categories constant', () => {
      expect(integrationMarketplaceService.INTEGRATION_CATEGORIES).toBeDefined();
      expect(Array.isArray(integrationMarketplaceService.INTEGRATION_CATEGORIES)).toBe(true);
    });
  });
});
