/**
 * SubscriptionPlan Model Unit Tests
 * Issue #115: Implement Subscription System
 * Adapted for ZeroDB model interface
 */
process.env.SKIP_DB_SETUP = 'true';

describe('SubscriptionPlan Model', () => {
  let SubscriptionPlan;

  beforeAll(() => {
    jest.resetModules();
    SubscriptionPlan = require('../../../models/SubscriptionPlan');
  });

  describe('Schema Definition', () => {
    it('should have required identifier fields', () => {
      expect(SubscriptionPlan.schema).toBeDefined();
      expect(SubscriptionPlan.schema).toHaveProperty('planId');
      expect(SubscriptionPlan.schema).toHaveProperty('name');
      expect(SubscriptionPlan.schema).toHaveProperty('description');
    });

    it('should have pricing fields', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('price');
      expect(SubscriptionPlan.schema).toHaveProperty('currency');
      expect(SubscriptionPlan.schema).toHaveProperty('interval');
    });

    it('should have interval field with correct enum values', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('interval');
      expect(SubscriptionPlan.schema.interval.enum).toContain('month');
      expect(SubscriptionPlan.schema.interval.enum).toContain('year');
    });

    it('should have trial period configuration', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('trialPeriodDays');
    });

    it('should have features array', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('features');
    });

    it('should have limits object', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('limits');
    });

    it('should have isActive flag', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('isActive');
    });

    it('should have sortOrder for display ordering', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('sortOrder');
    });
  });

  describe('Limits Configuration', () => {
    it('should have stakeholders limit in default limits', () => {
      const defaultLimits = SubscriptionPlan.schema.limits.default;
      expect(defaultLimits).toHaveProperty('stakeholders');
    });

    it('should have documents limit in default limits', () => {
      const defaultLimits = SubscriptionPlan.schema.limits.default;
      expect(defaultLimits).toHaveProperty('documents');
    });

    it('should have storage limit in default limits', () => {
      const defaultLimits = SubscriptionPlan.schema.limits.default;
      expect(defaultLimits).toHaveProperty('storageGB');
    });

    it('should have users limit in default limits', () => {
      const defaultLimits = SubscriptionPlan.schema.limits.default;
      expect(defaultLimits).toHaveProperty('users');
    });

    it('should have API calls limit in default limits', () => {
      const defaultLimits = SubscriptionPlan.schema.limits.default;
      expect(defaultLimits).toHaveProperty('apiCallsPerMonth');
    });
  });

  describe('Validation', () => {
    it('should require planId to be unique', () => {
      const planIdField = SubscriptionPlan.schema.planId;
      expect(planIdField.unique).toBe(true);
      expect(planIdField.required).toBe(true);
    });

    it('should require name', () => {
      const nameField = SubscriptionPlan.schema.name;
      expect(nameField.required).toBe(true);
    });

    it('should require price', () => {
      const priceField = SubscriptionPlan.schema.price;
      expect(priceField.required).toBe(true);
    });

    it('should default currency to USD', () => {
      const currencyField = SubscriptionPlan.schema.currency;
      expect(currencyField.default).toBe('USD');
    });

    it('should default interval to month', () => {
      const intervalField = SubscriptionPlan.schema.interval;
      expect(intervalField.default).toBe('month');
    });

    it('should default trialPeriodDays to 14', () => {
      const trialField = SubscriptionPlan.schema.trialPeriodDays;
      expect(trialField.default).toBe(14);
    });

    it('should default isActive to true', () => {
      const isActiveField = SubscriptionPlan.schema.isActive;
      expect(isActiveField.default).toBe(true);
    });

    it('should default sortOrder to 0', () => {
      const sortOrderField = SubscriptionPlan.schema.sortOrder;
      expect(sortOrderField.default).toBe(0);
    });
  });

  describe('Schema Types', () => {
    it('should have planId as string type', () => {
      expect(SubscriptionPlan.schema.planId.type).toBe('string');
    });

    it('should have isActive as boolean type', () => {
      expect(SubscriptionPlan.schema.isActive.type).toBe('boolean');
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields in schema', () => {
      expect(SubscriptionPlan.schema).toHaveProperty('createdAt');
      expect(SubscriptionPlan.schema).toHaveProperty('updatedAt');
    });
  });
});
