/**
 * SubscriptionPlan Model Unit Tests
 * Issue #115: Implement Subscription System
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

describe('SubscriptionPlan Model', () => {
  let SubscriptionPlan;
  let subscriptionPlanSchema;

  beforeAll(() => {
    jest.resetModules();
    const mongoose = require('mongoose');

    // Capture the schema when mongoose.model is called
    const originalModel = mongoose.model;
    mongoose.model = jest.fn((name, schema) => {
      if (name === 'SubscriptionPlan' && schema) {
        subscriptionPlanSchema = schema;
      }
      return { modelName: name, schema: schema };
    });

    SubscriptionPlan = require('../../../models/SubscriptionPlan');
    mongoose.model = originalModel;
  });

  describe('Schema Definition', () => {
    it('should have required identifier fields', () => {
      expect(subscriptionPlanSchema).toBeDefined();
      const paths = subscriptionPlanSchema.paths;

      expect(paths).toHaveProperty('planId');
      expect(paths).toHaveProperty('name');
      expect(paths).toHaveProperty('description');
    });

    it('should have pricing fields', () => {
      const paths = subscriptionPlanSchema.paths;

      expect(paths).toHaveProperty('price');
      expect(paths).toHaveProperty('currency');
      expect(paths).toHaveProperty('interval');
    });

    it('should have interval field with correct enum values', () => {
      const paths = subscriptionPlanSchema.paths;
      expect(paths).toHaveProperty('interval');

      const intervalPath = paths.interval;
      expect(intervalPath.enumValues).toContain('month');
      expect(intervalPath.enumValues).toContain('year');
    });

    it('should have trial period configuration', () => {
      const paths = subscriptionPlanSchema.paths;

      expect(paths).toHaveProperty('trialPeriodDays');
    });

    it('should have features array', () => {
      const paths = subscriptionPlanSchema.paths;

      expect(paths).toHaveProperty('features');
    });

    it('should have limits object', () => {
      const paths = subscriptionPlanSchema.paths;

      expect(paths).toHaveProperty('limits');
    });

    it('should have isActive flag', () => {
      const paths = subscriptionPlanSchema.paths;

      expect(paths).toHaveProperty('isActive');
    });

    it('should have sortOrder for display ordering', () => {
      const paths = subscriptionPlanSchema.paths;

      expect(paths).toHaveProperty('sortOrder');
    });
  });

  describe('Limits Configuration', () => {
    it('should have stakeholders limit in limits', () => {
      const paths = subscriptionPlanSchema.paths;
      expect(paths).toHaveProperty('limits.stakeholders');
    });

    it('should have documents limit in limits', () => {
      const paths = subscriptionPlanSchema.paths;
      expect(paths).toHaveProperty('limits.documents');
    });

    it('should have storage limit in limits', () => {
      const paths = subscriptionPlanSchema.paths;
      expect(paths).toHaveProperty('limits.storageGB');
    });

    it('should have users limit in limits', () => {
      const paths = subscriptionPlanSchema.paths;
      expect(paths).toHaveProperty('limits.users');
    });

    it('should have API calls limit in limits', () => {
      const paths = subscriptionPlanSchema.paths;
      expect(paths).toHaveProperty('limits.apiCallsPerMonth');
    });
  });

  describe('Validation', () => {
    it('should require planId to be unique', () => {
      const planIdPath = subscriptionPlanSchema.paths.planId;
      expect(planIdPath.options.unique).toBe(true);
      expect(planIdPath.options.required).toBe(true);
    });

    it('should require name', () => {
      const namePath = subscriptionPlanSchema.paths.name;
      expect(namePath.options.required).toBe(true);
    });

    it('should require price to be non-negative', () => {
      const pricePath = subscriptionPlanSchema.paths.price;
      expect(pricePath.options.min).toBe(0);
    });

    it('should default currency to USD', () => {
      const currencyPath = subscriptionPlanSchema.paths.currency;
      expect(currencyPath.options.default).toBe('USD');
    });

    it('should default interval to month', () => {
      const intervalPath = subscriptionPlanSchema.paths.interval;
      expect(intervalPath.options.default).toBe('month');
    });

    it('should default trialPeriodDays to 14', () => {
      const trialPath = subscriptionPlanSchema.paths.trialPeriodDays;
      expect(trialPath.options.default).toBe(14);
    });

    it('should default isActive to true', () => {
      const isActivePath = subscriptionPlanSchema.paths.isActive;
      expect(isActivePath.options.default).toBe(true);
    });

    it('should default sortOrder to 0', () => {
      const sortOrderPath = subscriptionPlanSchema.paths.sortOrder;
      expect(sortOrderPath.options.default).toBe(0);
    });
  });

  describe('Indexes', () => {
    it('should have index on planId', () => {
      const planIdPath = subscriptionPlanSchema.paths.planId;
      expect(planIdPath.options.index).toBe(true);
    });

    it('should have index on isActive', () => {
      const isActivePath = subscriptionPlanSchema.paths.isActive;
      expect(isActivePath.options.index).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      expect(subscriptionPlanSchema.options.timestamps).toBe(true);
    });
  });
});
