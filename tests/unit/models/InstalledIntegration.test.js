/**
 * InstalledIntegration Model Unit Tests
 * Issue #202: Build Integration Marketplace Backend
 *
 * Tests for the InstalledIntegration ZeroDB model including schema structure,
 * field definitions, constants, and CRUD method existence.
 */

const InstalledIntegration = require('../../../models/InstalledIntegration');

describe('InstalledIntegration Model', () => {
  describe('Schema Structure', () => {
    it('should have a schema defined', () => {
      expect(InstalledIntegration.schema).toBeDefined();
      expect(typeof InstalledIntegration.schema).toBe('object');
    });

    it('should have installationId field as required and unique', () => {
      expect(InstalledIntegration.schema.installationId).toBeDefined();
      expect(InstalledIntegration.schema.installationId.required).toBe(true);
      expect(InstalledIntegration.schema.installationId.unique).toBe(true);
    });

    it('should have companyId field as required', () => {
      expect(InstalledIntegration.schema.companyId).toBeDefined();
      expect(InstalledIntegration.schema.companyId.required).toBe(true);
    });

    it('should have integrationId field as required', () => {
      expect(InstalledIntegration.schema.integrationId).toBeDefined();
      expect(InstalledIntegration.schema.integrationId.required).toBe(true);
    });

    it('should have installedBy field as required', () => {
      expect(InstalledIntegration.schema.installedBy).toBeDefined();
      expect(InstalledIntegration.schema.installedBy.required).toBe(true);
    });

    it('should have status field with enum and default pending', () => {
      expect(InstalledIntegration.schema.status).toBeDefined();
      expect(InstalledIntegration.schema.status.enum).toEqual(['active', 'inactive', 'error', 'pending', 'configuring']);
      expect(InstalledIntegration.schema.status.default).toBe('pending');
    });

    it('should have configuration field as object', () => {
      expect(InstalledIntegration.schema.configuration).toBeDefined();
      expect(InstalledIntegration.schema.configuration.type).toBe('object');
    });

    it('should have encryptedSecrets field as object', () => {
      expect(InstalledIntegration.schema.encryptedSecrets).toBeDefined();
      expect(InstalledIntegration.schema.encryptedSecrets.type).toBe('object');
    });

    it('should have permissions field as array', () => {
      expect(InstalledIntegration.schema.permissions).toBeDefined();
      expect(InstalledIntegration.schema.permissions.type).toBe('array');
    });

    it('should have lastConnectionTest field as object', () => {
      expect(InstalledIntegration.schema.lastConnectionTest).toBeDefined();
      expect(InstalledIntegration.schema.lastConnectionTest.type).toBe('object');
    });

    it('should have connectionLogs field as array', () => {
      expect(InstalledIntegration.schema.connectionLogs).toBeDefined();
      expect(InstalledIntegration.schema.connectionLogs.type).toBe('array');
    });

    it('should have syncSettings field as object', () => {
      expect(InstalledIntegration.schema.syncSettings).toBeDefined();
      expect(InstalledIntegration.schema.syncSettings.type).toBe('object');
    });

    it('should have usageMetrics field as object', () => {
      expect(InstalledIntegration.schema.usageMetrics).toBeDefined();
      expect(InstalledIntegration.schema.usageMetrics.type).toBe('object');
    });

    it('should have webhook fields', () => {
      expect(InstalledIntegration.schema.webhookUrl).toBeDefined();
      expect(InstalledIntegration.schema.webhookSecret).toBeDefined();
    });

    it('should have deactivation fields', () => {
      expect(InstalledIntegration.schema.deactivatedAt).toBeDefined();
      expect(InstalledIntegration.schema.deactivatedBy).toBeDefined();
      expect(InstalledIntegration.schema.deactivationReason).toBeDefined();
    });

    it('should have notes field', () => {
      expect(InstalledIntegration.schema.notes).toBeDefined();
      expect(InstalledIntegration.schema.notes.type).toBe('string');
    });

    it('should have metadata field', () => {
      expect(InstalledIntegration.schema.metadata).toBeDefined();
      expect(InstalledIntegration.schema.metadata.type).toBe('object');
    });

    it('should have timestamp fields', () => {
      expect(InstalledIntegration.schema.createdAt).toBeDefined();
      expect(InstalledIntegration.schema.updatedAt).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(InstalledIntegration.VALID_STATUSES).toBeDefined();
      expect(InstalledIntegration.VALID_STATUSES).toEqual(['active', 'inactive', 'error', 'pending', 'configuring']);
    });

    it('should export SYNC_FREQUENCIES', () => {
      expect(InstalledIntegration.SYNC_FREQUENCIES).toBeDefined();
      expect(InstalledIntegration.SYNC_FREQUENCIES).toEqual(['realtime', 'hourly', 'daily', 'weekly', 'manual']);
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => {
      expect(typeof InstalledIntegration.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof InstalledIntegration.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof InstalledIntegration.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof InstalledIntegration.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof InstalledIntegration.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof InstalledIntegration.deleteOne).toBe('function');
    });

    it('should have deleteMany method', () => {
      expect(typeof InstalledIntegration.deleteMany).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof InstalledIntegration.countDocuments).toBe('function');
    });
  });

  describe('Custom Methods', () => {
    it('should have findByInstallationId method', () => {
      expect(typeof InstalledIntegration.findByInstallationId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof InstalledIntegration.findByCompany).toBe('function');
    });

    it('should have findByIntegration method', () => {
      expect(typeof InstalledIntegration.findByIntegration).toBe('function');
    });

    it('should have findByCompanyAndIntegration method', () => {
      expect(typeof InstalledIntegration.findByCompanyAndIntegration).toBe('function');
    });

    it('should have logConnectionTest method', () => {
      expect(typeof InstalledIntegration.logConnectionTest).toBe('function');
    });

    it('should have activate method', () => {
      expect(typeof InstalledIntegration.activate).toBe('function');
    });

    it('should have deactivate method', () => {
      expect(typeof InstalledIntegration.deactivate).toBe('function');
    });
  });

  describe('Business Logic', () => {
    it('isOperational should return true for active status with successful connection', () => {
      const installation = {
        status: 'active',
        lastConnectionTest: { success: true }
      };
      expect(InstalledIntegration.isOperational(installation)).toBe(true);
    });

    it('isOperational should return false for non-active status', () => {
      const installation = {
        status: 'error',
        lastConnectionTest: { success: true }
      };
      expect(InstalledIntegration.isOperational(installation)).toBe(false);
    });

    it('isOperational should return false when last connection test failed', () => {
      const installation = {
        status: 'active',
        lastConnectionTest: { success: false }
      };
      expect(InstalledIntegration.isOperational(installation)).toBe(false);
    });

    it('isOperational should return true when no connection test exists', () => {
      const installation = {
        status: 'active',
        lastConnectionTest: null
      };
      expect(InstalledIntegration.isOperational(installation)).toBe(true);
    });

    it('getDaysSinceInstallation should return 0 when no installedAt', () => {
      expect(InstalledIntegration.getDaysSinceInstallation({ installedAt: null })).toBe(0);
    });

    it('getDaysSinceInstallation should calculate days correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const result = InstalledIntegration.getDaysSinceInstallation({ installedAt: threeDaysAgo });
      expect(result).toBe(3);
    });
  });
});
