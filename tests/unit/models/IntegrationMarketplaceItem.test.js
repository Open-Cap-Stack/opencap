/**
 * IntegrationMarketplaceItem Model Unit Tests
 * Issue #202: Build Integration Marketplace Backend
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');
const IntegrationMarketplaceItem = require('../../../models/IntegrationMarketplaceItem');

describe('IntegrationMarketplaceItem Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid integration marketplace item', () => {
      const validData = {
        integrationId: 'INT-001',
        name: 'Stripe',
        description: 'Payment processing integration',
        category: 'payments',
        provider: 'Stripe Inc.',
        version: '1.0.0'
      };

      const item = new IntegrationMarketplaceItem(validData);
      const error = item.validateSync();

      expect(error).toBeUndefined();
      expect(item.name).toBe('Stripe');
      expect(item.category).toBe('payments');
    });

    it('should require name field', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        description: 'Test description',
        category: 'payments',
        provider: 'Test Provider'
      });

      const error = item.validateSync();
      expect(error.errors.name).toBeDefined();
    });

    it('should require description field', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        category: 'payments',
        provider: 'Test Provider'
      });

      const error = item.validateSync();
      expect(error.errors.description).toBeDefined();
    });

    it('should require category field', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        provider: 'Test Provider'
      });

      const error = item.validateSync();
      expect(error.errors.category).toBeDefined();
    });

    it('should require provider field', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'payments'
      });

      const error = item.validateSync();
      expect(error.errors.provider).toBeDefined();
    });

    it('should only allow valid categories', () => {
      const validCategories = [
        'payments', 'accounting', 'communication', 'crm', 'hr',
        'legal', 'analytics', 'storage', 'productivity', 'security', 'other'
      ];

      validCategories.forEach(category => {
        const item = new IntegrationMarketplaceItem({
          integrationId: `INT-${category}`,
          name: 'Test',
          description: 'Test description',
          category,
          provider: 'Test Provider'
        });
        const error = item.validateSync();
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid category', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'invalid-category',
        provider: 'Test Provider'
      });

      const error = item.validateSync();
      expect(error.errors.category).toBeDefined();
    });

    it('should default status to active', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'payments',
        provider: 'Test Provider'
      });

      expect(item.status).toBe('active');
    });

    it('should default version to 1.0.0', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'payments',
        provider: 'Test Provider'
      });

      expect(item.version).toBe('1.0.0');
    });
  });

  describe('Virtuals', () => {
    it('should compute isAvailable for active status', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'payments',
        provider: 'Test Provider',
        status: 'active'
      });

      expect(item.isAvailable).toBe(true);
    });

    it('should compute isAvailable for beta status', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'payments',
        provider: 'Test Provider',
        status: 'beta'
      });

      expect(item.isAvailable).toBe(true);
    });

    it('should compute isAvailable as false for inactive status', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'payments',
        provider: 'Test Provider',
        status: 'inactive'
      });

      expect(item.isAvailable).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should include virtuals in JSON output', () => {
      const item = new IntegrationMarketplaceItem({
        integrationId: 'INT-001',
        name: 'Test',
        description: 'Test description',
        category: 'payments',
        provider: 'Test Provider',
        status: 'active'
      });

      const json = item.toJSON();
      expect(json.isAvailable).toBe(true);
    });
  });
});
