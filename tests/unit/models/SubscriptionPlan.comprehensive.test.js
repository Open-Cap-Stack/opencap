/**
 * SubscriptionPlan Model - Comprehensive Unit Tests
 * Covers all exported methods, business logic, error paths, and edge cases.
 */

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn().mockResolvedValue({}),
  projectId: 'test-project',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const SubscriptionPlan = require('../../../models/SubscriptionPlan');

describe('SubscriptionPlan Model - Comprehensive', () => {
  const makeInsertResponse = (data) => ({
    data: [{
      row_id: 'row-1',
      row_data: { _id: 'test-id', ...data }
    }]
  });

  const makeQueryResponse = (items) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  const validPlanData = {
    name: 'Pro Plan',
    description: 'Professional subscription plan',
    price: 49.99,
    currency: 'USD',
    interval: 'month',
    trialPeriodDays: 14,
    features: ['cap_table', 'documents', 'reporting'],
    limits: {
      stakeholders: 100,
      documents: 500,
      storageGB: 10,
      users: 5,
      apiCallsPerMonth: 10000
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validPlanData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ------------------------------------------------------------------
  // Constants
  // ------------------------------------------------------------------
  describe('Constants', () => {
    it('should export BILLING_INTERVALS', () => {
      expect(SubscriptionPlan.BILLING_INTERVALS).toEqual(['month', 'year']);
    });

    it('should have tableName set to subscription_plans', () => {
      expect(SubscriptionPlan.tableName).toBe('subscription_plans');
    });
  });

  // ------------------------------------------------------------------
  // Schema
  // ------------------------------------------------------------------
  describe('Schema', () => {
    it('should have required planId field', () => {
      expect(SubscriptionPlan.schema.planId.required).toBe(true);
      expect(SubscriptionPlan.schema.planId.unique).toBe(true);
    });

    it('should have required name field', () => {
      expect(SubscriptionPlan.schema.name.required).toBe(true);
    });

    it('should have required price field', () => {
      expect(SubscriptionPlan.schema.price.required).toBe(true);
    });

    it('should have correct defaults', () => {
      expect(SubscriptionPlan.schema.currency.default).toBe('USD');
      expect(SubscriptionPlan.schema.interval.default).toBe('month');
      expect(SubscriptionPlan.schema.trialPeriodDays.default).toBe(14);
      expect(SubscriptionPlan.schema.isActive.default).toBe(true);
      expect(SubscriptionPlan.schema.sortOrder.default).toBe(0);
    });

    it('should have limits with unlimited defaults (-1)', () => {
      const defaultLimits = SubscriptionPlan.schema.limits.default;
      expect(defaultLimits.stakeholders).toBe(-1);
      expect(defaultLimits.documents).toBe(-1);
      expect(defaultLimits.storageGB).toBe(-1);
      expect(defaultLimits.users).toBe(-1);
      expect(defaultLimits.apiCallsPerMonth).toBe(-1);
    });

    it('should have stripe integration fields', () => {
      expect(SubscriptionPlan.schema.stripePriceId).toBeDefined();
      expect(SubscriptionPlan.schema.stripeProductId).toBeDefined();
      expect(SubscriptionPlan.schema.externalPlanId).toBeDefined();
    });

    it('should have timestamp fields', () => {
      expect(SubscriptionPlan.schema.createdAt).toBeDefined();
      expect(SubscriptionPlan.schema.updatedAt).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // create()
  // ------------------------------------------------------------------
  describe('create()', () => {
    it('should create a plan with valid data', async () => {
      const result = await SubscriptionPlan.create({ ...validPlanData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should auto-generate planId if not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.planId).toMatch(/^plan_/);
        return makeInsertResponse(doc);
      });
      await SubscriptionPlan.create({ ...validPlanData });
    });

    it('should use provided planId', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.planId).toBe('plan_custom');
        return makeInsertResponse(doc);
      });
      await SubscriptionPlan.create({ ...validPlanData, planId: 'plan_custom' });
    });

    it('should throw for negative price', async () => {
      await expect(
        SubscriptionPlan.create({ ...validPlanData, price: -10 })
      ).rejects.toThrow('price cannot be negative');
    });

    it('should accept zero price (free plan)', async () => {
      const result = await SubscriptionPlan.create({ ...validPlanData, price: 0 });
      expect(result).toBeDefined();
    });

    it('should throw for invalid billing interval', async () => {
      await expect(
        SubscriptionPlan.create({ ...validPlanData, interval: 'weekly' })
      ).rejects.toThrow('interval must be one of');
    });

    it('should accept valid billing intervals', async () => {
      for (const interval of ['month', 'year']) {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ ...validPlanData, interval }));
        const result = await SubscriptionPlan.create({ ...validPlanData, interval });
        expect(result).toBeDefined();
      }
    });

    it('should accept plan without interval (uses default)', async () => {
      const data = { ...validPlanData };
      delete data.interval;
      const result = await SubscriptionPlan.create(data);
      expect(result).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // findByPlanId()
  // ------------------------------------------------------------------
  describe('findByPlanId()', () => {
    it('should find plan by planId', async () => {
      const plan = { _id: 'id1', planId: 'plan_001', name: 'Pro Plan' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([plan]));
      const result = await SubscriptionPlan.findByPlanId('plan_001');
      expect(result).toBeDefined();
      expect(result.planId).toBe('plan_001');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await SubscriptionPlan.findByPlanId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // findByStripePriceId()
  // ------------------------------------------------------------------
  describe('findByStripePriceId()', () => {
    it('should find plan by stripePriceId', async () => {
      const plan = { _id: 'id1', planId: 'plan_001', stripePriceId: 'price_abc123' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([plan]));
      const result = await SubscriptionPlan.findByStripePriceId('price_abc123');
      expect(result).toBeDefined();
      expect(result.stripePriceId).toBe('price_abc123');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await SubscriptionPlan.findByStripePriceId('price_nonexistent');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // findActive()
  // ------------------------------------------------------------------
  describe('findActive()', () => {
    it('should find active plans sorted by sortOrder', async () => {
      const plans = [
        { _id: 'id2', planId: 'plan_002', isActive: true, sortOrder: 2 },
        { _id: 'id1', planId: 'plan_001', isActive: true, sortOrder: 1 },
        { _id: 'id3', planId: 'plan_003', isActive: true, sortOrder: 3 }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(plans));
      const result = await SubscriptionPlan.findActive();
      expect(result).toHaveLength(3);
      expect(result[0].sortOrder).toBe(1);
      expect(result[1].sortOrder).toBe(2);
      expect(result[2].sortOrder).toBe(3);
    });

    it('should handle plans without sortOrder', async () => {
      const plans = [
        { _id: 'id1', planId: 'plan_001', isActive: true },
        { _id: 'id2', planId: 'plan_002', isActive: true, sortOrder: 1 }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(plans));
      const result = await SubscriptionPlan.findActive();
      expect(result).toHaveLength(2);
      expect(result[0].sortOrder).toBe(undefined);
    });

    it('should return empty array when no active plans', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await SubscriptionPlan.findActive();
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // hasTrial()
  // ------------------------------------------------------------------
  describe('hasTrial()', () => {
    it('should return true when trialPeriodDays > 0', () => {
      expect(SubscriptionPlan.hasTrial({ trialPeriodDays: 14 })).toBe(true);
    });

    it('should return false when trialPeriodDays is 0', () => {
      expect(SubscriptionPlan.hasTrial({ trialPeriodDays: 0 })).toBe(false);
    });

    it('should return false when trialPeriodDays is negative', () => {
      expect(SubscriptionPlan.hasTrial({ trialPeriodDays: -1 })).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // getFormattedPrice()
  // ------------------------------------------------------------------
  describe('getFormattedPrice()', () => {
    it('should format USD price', () => {
      const formatted = SubscriptionPlan.getFormattedPrice({ price: 49.99, currency: 'USD' });
      expect(formatted).toContain('49.99');
      expect(formatted).toContain('$');
    });

    it('should format EUR price', () => {
      const formatted = SubscriptionPlan.getFormattedPrice({ price: 39.99, currency: 'EUR' });
      expect(formatted).toContain('39.99');
    });

    it('should default to USD when currency not set', () => {
      const formatted = SubscriptionPlan.getFormattedPrice({ price: 99.99 });
      expect(formatted).toContain('$');
    });

    it('should format zero price', () => {
      const formatted = SubscriptionPlan.getFormattedPrice({ price: 0, currency: 'USD' });
      expect(formatted).toContain('0.00');
    });

    it('should format large prices with commas', () => {
      const formatted = SubscriptionPlan.getFormattedPrice({ price: 1999.99, currency: 'USD' });
      expect(formatted).toContain('1,999.99');
    });
  });

  // ------------------------------------------------------------------
  // hasFeature()
  // ------------------------------------------------------------------
  describe('hasFeature()', () => {
    it('should return true when feature exists', () => {
      const plan = { features: ['cap_table', 'documents', 'reporting'] };
      expect(SubscriptionPlan.hasFeature(plan, 'cap_table')).toBe(true);
    });

    it('should return false when feature does not exist', () => {
      const plan = { features: ['cap_table', 'documents'] };
      expect(SubscriptionPlan.hasFeature(plan, 'advanced_analytics')).toBe(false);
    });

    it('should return falsy when features is null', () => {
      const plan = { features: null };
      expect(SubscriptionPlan.hasFeature(plan, 'cap_table')).toBeFalsy();
    });

    it('should return falsy when features is undefined', () => {
      const plan = {};
      expect(SubscriptionPlan.hasFeature(plan, 'cap_table')).toBeFalsy();
    });

    it('should return false for empty features array', () => {
      const plan = { features: [] };
      expect(SubscriptionPlan.hasFeature(plan, 'cap_table')).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // getLimit()
  // ------------------------------------------------------------------
  describe('getLimit()', () => {
    it('should return limit value', () => {
      const plan = { limits: { stakeholders: 100, users: 5 } };
      expect(SubscriptionPlan.getLimit(plan, 'stakeholders')).toBe(100);
      expect(SubscriptionPlan.getLimit(plan, 'users')).toBe(5);
    });

    it('should return -1 (unlimited) when limits is null', () => {
      const plan = { limits: null };
      expect(SubscriptionPlan.getLimit(plan, 'stakeholders')).toBe(-1);
    });

    it('should return -1 when limits is undefined', () => {
      const plan = {};
      expect(SubscriptionPlan.getLimit(plan, 'stakeholders')).toBe(-1);
    });

    it('should return -1 when limit type does not exist', () => {
      const plan = { limits: { stakeholders: 100 } };
      expect(SubscriptionPlan.getLimit(plan, 'nonexistent')).toBe(-1);
    });

    it('should return 0 when limit is explicitly 0', () => {
      const plan = { limits: { stakeholders: 0 } };
      expect(SubscriptionPlan.getLimit(plan, 'stakeholders')).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // isLimitUnlimited()
  // ------------------------------------------------------------------
  describe('isLimitUnlimited()', () => {
    it('should return true when limit is -1', () => {
      const plan = { limits: { stakeholders: -1 } };
      expect(SubscriptionPlan.isLimitUnlimited(plan, 'stakeholders')).toBe(true);
    });

    it('should return false when limit has a positive value', () => {
      const plan = { limits: { stakeholders: 100 } };
      expect(SubscriptionPlan.isLimitUnlimited(plan, 'stakeholders')).toBe(false);
    });

    it('should return true when limit type does not exist (defaults to -1)', () => {
      const plan = { limits: {} };
      expect(SubscriptionPlan.isLimitUnlimited(plan, 'nonexistent')).toBe(true);
    });

    it('should return true when limits is undefined (defaults to -1)', () => {
      const plan = {};
      expect(SubscriptionPlan.isLimitUnlimited(plan, 'stakeholders')).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // isWithinLimit()
  // ------------------------------------------------------------------
  describe('isWithinLimit()', () => {
    it('should return true when usage is within limit', () => {
      const plan = { limits: { stakeholders: 100 } };
      expect(SubscriptionPlan.isWithinLimit(plan, 'stakeholders', 50)).toBe(true);
    });

    it('should return true when usage equals limit', () => {
      const plan = { limits: { stakeholders: 100 } };
      expect(SubscriptionPlan.isWithinLimit(plan, 'stakeholders', 100)).toBe(true);
    });

    it('should return false when usage exceeds limit', () => {
      const plan = { limits: { stakeholders: 100 } };
      expect(SubscriptionPlan.isWithinLimit(plan, 'stakeholders', 101)).toBe(false);
    });

    it('should return true when limit is unlimited (-1)', () => {
      const plan = { limits: { stakeholders: -1 } };
      expect(SubscriptionPlan.isWithinLimit(plan, 'stakeholders', 999999)).toBe(true);
    });

    it('should return true for unlimited when limit type does not exist', () => {
      const plan = { limits: {} };
      expect(SubscriptionPlan.isWithinLimit(plan, 'nonexistent', 999)).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // activate()
  // ------------------------------------------------------------------
  describe('activate()', () => {
    it('should activate a plan', async () => {
      const plan = { _id: 'id1', planId: 'plan_001', isActive: false, row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([plan]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.isActive).toBe(true);
        return {};
      });

      const result = await SubscriptionPlan.activate('plan_001');
      expect(result).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // deactivate()
  // ------------------------------------------------------------------
  describe('deactivate()', () => {
    it('should deactivate a plan', async () => {
      const plan = { _id: 'id1', planId: 'plan_001', isActive: true, row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([plan]));

      zerodbService.client.put.mockImplementation(async (url, body) => {
        expect(body.row_data.isActive).toBe(false);
        return {};
      });

      const result = await SubscriptionPlan.deactivate('plan_001');
      expect(result).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // Base model methods
  // ------------------------------------------------------------------
  describe('Base model methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments',
      'exists', 'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should expose ${method} method`, () => {
        expect(typeof SubscriptionPlan[method]).toBe('function');
      });
    });
  });
});
