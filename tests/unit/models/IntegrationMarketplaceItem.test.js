/**
 * IntegrationMarketplaceItem Model Unit Tests
 * Issue #202: Build Integration Marketplace Backend
 *
 * Tests for ZeroDB-based IntegrationMarketplaceItem model
 */
process.env.SKIP_DB_SETUP = 'true';

const IntegrationMarketplaceItem = require('../../../models/IntegrationMarketplaceItem');

describe('IntegrationMarketplaceItem Model', () => {
  describe('Schema Definition', () => {
    it('should have correct table name', () => {
      expect(IntegrationMarketplaceItem.tableName).toBe('integration_marketplace_items');
    });

    it('should have schema defined', () => {
      expect(IntegrationMarketplaceItem.schema).toBeDefined();
    });

    it('should have required fields', () => {
      const schema = IntegrationMarketplaceItem.schema;
      expect(schema.name.required).toBe(true);
      expect(schema.description.required).toBe(true);
      expect(schema.category.required).toBe(true);
      expect(schema.provider.required).toBe(true);
      expect(schema.integrationId.required).toBe(true);
    });

    it('should have category field with valid enum values', () => {
      const validCategories = [
        'payments', 'accounting', 'communication', 'crm', 'hr',
        'legal', 'analytics', 'storage', 'productivity', 'security', 'other'
      ];

      expect(IntegrationMarketplaceItem.schema.category.enum).toBeDefined();
      validCategories.forEach(category => {
        expect(IntegrationMarketplaceItem.schema.category.enum).toContain(category);
      });
    });

    it('should have status field with valid enum values', () => {
      expect(IntegrationMarketplaceItem.schema.status.enum).toContain('active');
      expect(IntegrationMarketplaceItem.schema.status.enum).toContain('inactive');
      expect(IntegrationMarketplaceItem.schema.status.enum).toContain('deprecated');
      expect(IntegrationMarketplaceItem.schema.status.enum).toContain('beta');
    });

    it('should default status to active', () => {
      expect(IntegrationMarketplaceItem.schema.status.default).toBe('active');
    });

    it('should default version to 1.0.0', () => {
      expect(IntegrationMarketplaceItem.schema.version.default).toBe('1.0.0');
    });
  });

  describe('Constants', () => {
    it('should export CATEGORIES constant', () => {
      expect(IntegrationMarketplaceItem.CATEGORIES).toBeDefined();
      expect(IntegrationMarketplaceItem.CATEGORIES).toContain('payments');
      expect(IntegrationMarketplaceItem.CATEGORIES).toContain('accounting');
      expect(IntegrationMarketplaceItem.CATEGORIES).toContain('other');
    });

    it('should export VALID_STATUSES constant', () => {
      expect(IntegrationMarketplaceItem.VALID_STATUSES).toBeDefined();
      expect(IntegrationMarketplaceItem.VALID_STATUSES).toContain('active');
      expect(IntegrationMarketplaceItem.VALID_STATUSES).toContain('inactive');
    });

    it('should export CONFIG_FIELD_TYPES constant', () => {
      expect(IntegrationMarketplaceItem.CONFIG_FIELD_TYPES).toBeDefined();
      expect(IntegrationMarketplaceItem.CONFIG_FIELD_TYPES).toContain('string');
    });

    it('should export PRICING_TYPES constant', () => {
      expect(IntegrationMarketplaceItem.PRICING_TYPES).toBeDefined();
      expect(IntegrationMarketplaceItem.PRICING_TYPES).toContain('free');
    });

    it('should export BILLING_CYCLES constant', () => {
      expect(IntegrationMarketplaceItem.BILLING_CYCLES).toBeDefined();
      expect(IntegrationMarketplaceItem.BILLING_CYCLES).toContain('monthly');
    });
  });

  describe('isAvailable', () => {
    it('should return true for active status', () => {
      const item = { status: 'active' };
      expect(IntegrationMarketplaceItem.isAvailable(item)).toBe(true);
    });

    it('should return true for beta status', () => {
      const item = { status: 'beta' };
      expect(IntegrationMarketplaceItem.isAvailable(item)).toBe(true);
    });

    it('should return false for inactive status', () => {
      const item = { status: 'inactive' };
      expect(IntegrationMarketplaceItem.isAvailable(item)).toBe(false);
    });

    it('should return false for deprecated status', () => {
      const item = { status: 'deprecated' };
      expect(IntegrationMarketplaceItem.isAvailable(item)).toBe(false);
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof IntegrationMarketplaceItem.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof IntegrationMarketplaceItem.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof IntegrationMarketplaceItem.findOne).toBe('function');
    });

    it('should have findByIntegrationId method', () => {
      expect(typeof IntegrationMarketplaceItem.findByIntegrationId).toBe('function');
    });

    it('should have findByCategory method', () => {
      expect(typeof IntegrationMarketplaceItem.findByCategory).toBe('function');
    });

    it('should have findActive method', () => {
      expect(typeof IntegrationMarketplaceItem.findActive).toBe('function');
    });

    it('should have incrementInstallCount method', () => {
      expect(typeof IntegrationMarketplaceItem.incrementInstallCount).toBe('function');
    });

    it('should have updateRating method', () => {
      expect(typeof IntegrationMarketplaceItem.updateRating).toBe('function');
    });
  });

  describe('Schema Field Types', () => {
    it('should have installCount as number type', () => {
      expect(IntegrationMarketplaceItem.schema.installCount.type).toBe('number');
    });

    it('should have tags as array type', () => {
      expect(IntegrationMarketplaceItem.schema.tags.type).toBe('array');
    });

    it('should have features as array type', () => {
      expect(IntegrationMarketplaceItem.schema.features.type).toBe('array');
    });

    it('should have configurationSchema as object type', () => {
      expect(IntegrationMarketplaceItem.schema.configurationSchema.type).toBe('object');
    });

    it('should have rating as object type', () => {
      expect(IntegrationMarketplaceItem.schema.rating.type).toBe('object');
    });

    it('should have pricing as object type', () => {
      expect(IntegrationMarketplaceItem.schema.pricing.type).toBe('object');
    });
  });
});
