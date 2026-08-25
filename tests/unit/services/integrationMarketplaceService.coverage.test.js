/**
 * Integration Marketplace Service - Coverage Gap Tests
 *
 * Covers uncovered lines:
 * - installIntegration: validation error when config missing required fields (55-58)
 * - updateConfiguration: full flow, validation error, null installation (79-92)
 * - getIntegrationDetails: with company, without company, not found (116-123)
 * - testConnection: failed connection (missing config) (100-103)
 * - uninstallIntegration: integration not found (71-76)
 * - validateConfiguration with Map schema
 */
process.env.SKIP_DB_SETUP = 'true';

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

describe('IntegrationMarketplaceService (Coverage Gaps)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── installIntegration validation error ──
  describe('installIntegration - validation error', () => {
    it('should throw VALIDATION_ERROR when required config fields are missing', async () => {
      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001',
        configurationSchema: {
          apiKey: { type: 'string', required: true, label: 'API Key' },
          secretKey: { type: 'string', required: true, label: 'Secret Key' }
        }
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue(null); // Not installed

      try {
        await integrationMarketplaceService.installIntegration('int1', {
          companyId: 'company123',
          configuration: { apiKey: 'test' }, // Missing secretKey
          installedBy: 'user1'
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toBeDefined();
        expect(error.details.length).toBeGreaterThan(0);
        expect(error.details[0].field).toBe('secretKey');
      }
    });

    it('should install successfully when no configurationSchema exists', async () => {
      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001'
        // No configurationSchema
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockIntegration);

      const result = await integrationMarketplaceService.installIntegration('int1', {
        companyId: 'company123',
        configuration: {},
        installedBy: 'user1'
      });

      expect(result).toBeDefined();
    });

    it('should use empty configuration when none provided', async () => {
      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001'
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({
        _id: 'inst1',
        integrationId: 'INT-001'
      });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await integrationMarketplaceService.installIntegration('int1', {
        companyId: 'company123',
        installedBy: 'user1'
        // No configuration or permissions
      });

      expect(result).toBeDefined();
      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'InstalledIntegration',
        expect.objectContaining({
          configuration: {},
          permissions: []
        })
      );
    });

    it('should use integration permissions when none provided in data', async () => {
      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001',
        permissions: ['read', 'write']
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue({ _id: 'inst1' });
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      await integrationMarketplaceService.installIntegration('int1', {
        companyId: 'company123',
        installedBy: 'user1'
      });

      expect(databaseAdapter.create).toHaveBeenCalledWith(
        'InstalledIntegration',
        expect.objectContaining({
          permissions: ['read', 'write']
        })
      );
    });
  });

  // ── updateConfiguration ──
  describe('updateConfiguration', () => {
    it('should update configuration successfully', async () => {
      const mockInstallation = {
        _id: 'inst1',
        integrationId: 'INT-001',
        companyId: 'company123'
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation) // find installation
        .mockResolvedValueOnce(null); // no integration found (skip validation)

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({
        ...mockInstallation,
        configuration: { apiKey: 'new-key' }
      });

      const result = await integrationMarketplaceService.updateConfiguration(
        'INT-001', 'company123', { apiKey: 'new-key' }, 'user1'
      );

      expect(result).toBeDefined();
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalledWith(
        'InstalledIntegration',
        'inst1',
        expect.objectContaining({
          configuration: { apiKey: 'new-key' },
          configuredBy: 'user1'
        }),
        { new: true }
      );
    });

    it('should return null when installation not found', async () => {
      databaseAdapter.findOne.mockResolvedValue(null);

      const result = await integrationMarketplaceService.updateConfiguration(
        'INT-001', 'company123', { apiKey: 'key' }, 'user1'
      );

      expect(result).toBeNull();
    });

    it('should throw VALIDATION_ERROR when config fails validation', async () => {
      const mockInstallation = {
        _id: 'inst1',
        integrationId: 'INT-001',
        companyId: 'company123'
      };

      const mockIntegration = {
        integrationId: 'INT-001',
        configurationSchema: {
          apiKey: { type: 'string', required: true }
        }
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation)
        .mockResolvedValueOnce(mockIntegration);

      try {
        await integrationMarketplaceService.updateConfiguration(
          'INT-001', 'company123', {}, 'user1' // Missing required apiKey
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toBeDefined();
      }
    });

    it('should skip validation when integration has no configurationSchema', async () => {
      const mockInstallation = {
        _id: 'inst1',
        integrationId: 'INT-001',
        companyId: 'company123'
      };

      const mockIntegration = {
        integrationId: 'INT-001'
        // No configurationSchema
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation)
        .mockResolvedValueOnce(mockIntegration);

      databaseAdapter.findByIdAndUpdate.mockResolvedValue({});

      const result = await integrationMarketplaceService.updateConfiguration(
        'INT-001', 'company123', { custom: 'value' }, 'user1'
      );

      expect(result).toBeDefined();
    });
  });

  // ── getIntegrationDetails ──
  describe('getIntegrationDetails', () => {
    it('should return null when integration not found', async () => {
      databaseAdapter.findById.mockResolvedValue(null);

      const result = await integrationMarketplaceService.getIntegrationDetails('nonexistent');

      expect(result).toBeNull();
    });

    it('should return details without company installation info when no companyId', async () => {
      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001',
        name: 'Stripe',
        version: '1.0.0'
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);

      const result = await integrationMarketplaceService.getIntegrationDetails('int1');

      expect(result.isInstalled).toBe(false);
      expect(result.installationStatus).toBeNull();
      expect(result.installedAt).toBeNull();
    });

    it('should include installation status when company has installed', async () => {
      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001',
        name: 'Stripe'
      };

      const mockInstallation = {
        _id: 'inst1',
        status: 'active',
        installedAt: new Date('2024-01-01')
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue(mockInstallation);

      const result = await integrationMarketplaceService.getIntegrationDetails('int1', 'company123');

      expect(result.isInstalled).toBe(true);
      expect(result.installationStatus).toBe('active');
      expect(result.installedAt).toEqual(new Date('2024-01-01'));
    });

    it('should show not installed when company has not installed', async () => {
      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001',
        name: 'Stripe'
      };

      databaseAdapter.findById.mockResolvedValue(mockIntegration);
      databaseAdapter.findOne.mockResolvedValue(null); // Not installed

      const result = await integrationMarketplaceService.getIntegrationDetails('int1', 'company123');

      expect(result.isInstalled).toBe(false);
    });
  });

  // ── testConnection - failed connection ──
  describe('testConnection - failed connection', () => {
    it('should return failed result when required config is missing', async () => {
      const mockInstallation = {
        _id: 'inst1',
        integrationId: 'INT-001',
        companyId: 'company123',
        configuration: {} // Empty - missing required fields
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

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required configuration');
    });

    it('should return success when no configurationSchema exists', async () => {
      const mockInstallation = {
        _id: 'inst1',
        integrationId: 'INT-001',
        companyId: 'company123',
        configuration: {},
        status: 'pending'
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation)
        .mockResolvedValueOnce(null); // No integration found

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockInstallation);

      const result = await integrationMarketplaceService.testConnection('INT-001', 'company123');

      expect(result.success).toBe(true);
    });

    it('should report unknown version when integration not found', async () => {
      const mockInstallation = {
        _id: 'inst1',
        integrationId: 'INT-001',
        companyId: 'company123',
        configuration: {}
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation)
        .mockResolvedValueOnce(null); // No integration

      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockInstallation);

      const result = await integrationMarketplaceService.testConnection('INT-001', 'company123');

      expect(result.details.version).toBe('unknown');
    });
  });

  // ── uninstallIntegration edge cases ──
  describe('uninstallIntegration edge cases', () => {
    it('should handle uninstall when marketplace item not found', async () => {
      const mockInstallation = {
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001'
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation) // installation found
        .mockResolvedValueOnce(null); // integration not found in marketplace

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockInstallation);

      const result = await integrationMarketplaceService.uninstallIntegration('INT-001', 'company123');

      expect(result.success).toBe(true);
      // Should not call findByIdAndUpdate since integration not found
      expect(databaseAdapter.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle uninstall when marketplace item has zero installCount', async () => {
      const mockInstallation = {
        _id: 'inst1',
        companyId: 'company123',
        integrationId: 'INT-001'
      };

      const mockIntegration = {
        _id: 'int1',
        integrationId: 'INT-001',
        installCount: 0
      };

      databaseAdapter.findOne
        .mockResolvedValueOnce(mockInstallation)
        .mockResolvedValueOnce(mockIntegration);

      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockInstallation);

      const result = await integrationMarketplaceService.uninstallIntegration('INT-001', 'company123');

      expect(result.success).toBe(true);
      // Should not decrement since installCount is 0
      expect(databaseAdapter.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  // ── validateConfiguration with Map ──
  describe('validateConfiguration with Map-like schema', () => {
    it('should handle Map schema by converting to entries', () => {
      const schema = new Map([
        ['apiKey', { type: 'string', required: true }],
        ['mode', { type: 'string', required: false }]
      ]);

      const result = integrationMarketplaceService.validateConfiguration(
        { apiKey: 'test123' },
        schema
      );

      expect(result.valid).toBe(true);
    });

    it('should validate required fields in Map schema', () => {
      const schema = new Map([
        ['apiKey', { type: 'string', required: true }]
      ]);

      const result = integrationMarketplaceService.validateConfiguration(
        {},
        schema
      );

      expect(result.valid).toBe(false);
    });
  });
});
