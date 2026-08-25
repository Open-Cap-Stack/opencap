/**
 * SubscriptionTier Model Comprehensive Tests
 *
 * Tests for the SubscriptionTier ZeroDB model including creation with validation,
 * query methods (findByTierId, findByName, findPublic), utility methods
 * (getAnnualSavingsPercentage, getMonthlyEquivalent, hasFeature, isWithinLimit),
 * and getDefaultTiers.
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn(),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn(),
  client: { put: jest.fn() },
  projectId: 'test-project'
}));

const SubscriptionTier = require('../../../models/SubscriptionTier');
const zerodbService = require('../../../services/zerodbService');

describe('SubscriptionTier Model (Comprehensive)', () => {
  let store = [];
  let idCounter = 0;

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc })),
        total: results.length
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([key, value]) => doc[key] === value);
      });
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });

    zerodbService.deleteRowById.mockImplementation((tableName, rowId) => {
      store = store.filter((_, i) => i + 1 !== rowId);
      return Promise.resolve({ deleted_count: 1 });
    });
  });

  const validTierData = {
    name: 'starter',
    displayName: 'Starter',
    description: 'For growing startups',
    monthlyPrice: 49,
    annualPrice: 470,
    currency: 'USD',
    features: { basicCapTable: true, apiAccess: false },
    limits: { maxStakeholders: 50, maxDocuments: 500 },
    isPublic: true,
    sortOrder: 2
  };

  // --- Constants ---

  describe('Constants', () => {
    it('should export TIER_NAMES', () => {
      expect(SubscriptionTier.TIER_NAMES).toEqual([
        'free', 'starter', 'professional', 'enterprise', 'custom'
      ]);
    });

    it('should export CURRENCIES', () => {
      expect(SubscriptionTier.CURRENCIES).toEqual(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
    });

    it('should expose tableName', () => {
      expect(SubscriptionTier.tableName).toBe('subscription_tiers');
    });
  });

  // --- Create ---

  describe('create()', () => {
    it('should create a tier with valid data', async () => {
      const result = await SubscriptionTier.create(validTierData);
      expect(result).toBeDefined();
      expect(result.name).toBe('starter');
      expect(result.displayName).toBe('Starter');
      expect(result.monthlyPrice).toBe(49);
    });

    it('should auto-generate tierId if not provided', async () => {
      const result = await SubscriptionTier.create(validTierData);
      expect(result.tierId).toBeDefined();
      expect(result.tierId).toMatch(/^tier_/);
    });

    it('should preserve provided tierId', async () => {
      const result = await SubscriptionTier.create({
        ...validTierData,
        tierId: 'tier-custom-id'
      });
      expect(result.tierId).toBe('tier-custom-id');
    });

    it('should throw for invalid tier name', async () => {
      await expect(
        SubscriptionTier.create({ ...validTierData, name: 'invalid-name' })
      ).rejects.toThrow(/name must be one of/);
    });

    it('should accept all valid tier names', async () => {
      for (const name of SubscriptionTier.TIER_NAMES) {
        const result = await SubscriptionTier.create({
          ...validTierData,
          name,
          tierId: `tier-${name}`
        });
        expect(result.name).toBe(name);
      }
    });

    it('should cap annualPrice at monthlyPrice * 12', async () => {
      const result = await SubscriptionTier.create({
        ...validTierData,
        monthlyPrice: 10,
        annualPrice: 200 // 200 > 10 * 12 = 120
      });
      expect(result.annualPrice).toBe(120);
    });

    it('should not modify annualPrice when it is less than monthlyPrice * 12', async () => {
      const result = await SubscriptionTier.create({
        ...validTierData,
        monthlyPrice: 49,
        annualPrice: 470 // 470 < 49 * 12 = 588
      });
      expect(result.annualPrice).toBe(470);
    });

    it('should allow annualPrice equal to monthlyPrice * 12', async () => {
      const result = await SubscriptionTier.create({
        ...validTierData,
        monthlyPrice: 10,
        annualPrice: 120 // exactly equal
      });
      expect(result.annualPrice).toBe(120);
    });
  });

  // --- findByTierId ---

  describe('findByTierId()', () => {
    it('should find tier by tierId', async () => {
      await SubscriptionTier.create({ ...validTierData, tierId: 'tier-find-001' });
      const found = await SubscriptionTier.findByTierId('tier-find-001');
      expect(found).toBeDefined();
      expect(found.tierId).toBe('tier-find-001');
    });

    it('should return null for non-existent tierId', async () => {
      const found = await SubscriptionTier.findByTierId('non-existent');
      expect(found).toBeNull();
    });
  });

  // --- findByName ---

  describe('findByName()', () => {
    it('should find tier by name', async () => {
      await SubscriptionTier.create(validTierData);
      const found = await SubscriptionTier.findByName('starter');
      expect(found).toBeDefined();
      expect(found.name).toBe('starter');
    });

    it('should return null for non-existent name', async () => {
      const found = await SubscriptionTier.findByName('non-existent-tier');
      expect(found).toBeNull();
    });
  });

  // --- findPublic ---

  describe('findPublic()', () => {
    it('should return only public tiers', async () => {
      await SubscriptionTier.create({
        ...validTierData,
        tierId: 'tier-pub-1',
        isPublic: true,
        sortOrder: 1
      });
      await SubscriptionTier.create({
        ...validTierData,
        tierId: 'tier-priv-1',
        name: 'enterprise',
        isPublic: false,
        sortOrder: 2
      });

      const publicTiers = await SubscriptionTier.findPublic();
      expect(publicTiers.length).toBe(1);
      expect(publicTiers[0].isPublic).toBe(true);
    });

    it('should sort public tiers by sortOrder', async () => {
      await SubscriptionTier.create({
        ...validTierData,
        tierId: 'tier-sort-3',
        name: 'professional',
        isPublic: true,
        sortOrder: 3
      });
      await SubscriptionTier.create({
        ...validTierData,
        tierId: 'tier-sort-1',
        name: 'free',
        isPublic: true,
        sortOrder: 1
      });

      const publicTiers = await SubscriptionTier.findPublic();
      expect(publicTiers[0].sortOrder).toBe(1);
      expect(publicTiers[1].sortOrder).toBe(3);
    });

    it('should return empty array when no public tiers exist', async () => {
      await SubscriptionTier.create({
        ...validTierData,
        tierId: 'tier-hidden',
        isPublic: false
      });

      const publicTiers = await SubscriptionTier.findPublic();
      expect(publicTiers.length).toBe(0);
    });
  });

  // --- getAnnualSavingsPercentage ---

  describe('getAnnualSavingsPercentage()', () => {
    it('should calculate savings percentage correctly', () => {
      const tier = { monthlyPrice: 49, annualPrice: 470 };
      const savings = SubscriptionTier.getAnnualSavingsPercentage(tier);
      // (49*12 - 470) / (49*12) * 100 = 118/588 * 100 = 20.07 -> 20
      expect(savings).toBe(20);
    });

    it('should return 0 for free tier', () => {
      const tier = { monthlyPrice: 0, annualPrice: 0 };
      const savings = SubscriptionTier.getAnnualSavingsPercentage(tier);
      expect(savings).toBe(0);
    });

    it('should return 0 when annual equals monthly*12', () => {
      const tier = { monthlyPrice: 10, annualPrice: 120 };
      const savings = SubscriptionTier.getAnnualSavingsPercentage(tier);
      expect(savings).toBe(0);
    });

    it('should handle 100% savings', () => {
      const tier = { monthlyPrice: 50, annualPrice: 0 };
      const savings = SubscriptionTier.getAnnualSavingsPercentage(tier);
      expect(savings).toBe(100);
    });
  });

  // --- getMonthlyEquivalent ---

  describe('getMonthlyEquivalent()', () => {
    it('should calculate monthly equivalent of annual price', () => {
      const tier = { annualPrice: 470 };
      const equivalent = SubscriptionTier.getMonthlyEquivalent(tier);
      // 470 / 12 = 39.166... -> 39.17
      expect(equivalent).toBe(39.17);
    });

    it('should return 0 for free tier', () => {
      const tier = { annualPrice: 0 };
      const equivalent = SubscriptionTier.getMonthlyEquivalent(tier);
      expect(equivalent).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      const tier = { annualPrice: 100 };
      const equivalent = SubscriptionTier.getMonthlyEquivalent(tier);
      // 100 / 12 = 8.333... -> 8.33
      expect(equivalent).toBe(8.33);
    });
  });

  // --- hasFeature ---

  describe('hasFeature()', () => {
    it('should return true for enabled features', () => {
      const tier = { features: { apiAccess: true, ssoIntegration: false } };
      expect(SubscriptionTier.hasFeature(tier, 'apiAccess')).toBe(true);
    });

    it('should return false for disabled features', () => {
      const tier = { features: { apiAccess: true, ssoIntegration: false } };
      expect(SubscriptionTier.hasFeature(tier, 'ssoIntegration')).toBe(false);
    });

    it('should return false for undefined features', () => {
      const tier = { features: { apiAccess: true } };
      expect(SubscriptionTier.hasFeature(tier, 'nonExistentFeature')).toBe(false);
    });

    it('should return false when features object is missing', () => {
      const tier = {};
      expect(SubscriptionTier.hasFeature(tier, 'apiAccess')).toBeFalsy();
    });
  });

  // --- isWithinLimit ---

  describe('isWithinLimit()', () => {
    it('should return true when usage is within limit', () => {
      const tier = { limits: { maxStakeholders: 50 } };
      expect(SubscriptionTier.isWithinLimit(tier, 'maxStakeholders', 25)).toBe(true);
    });

    it('should return true when usage equals limit', () => {
      const tier = { limits: { maxStakeholders: 50 } };
      expect(SubscriptionTier.isWithinLimit(tier, 'maxStakeholders', 50)).toBe(true);
    });

    it('should return false when usage exceeds limit', () => {
      const tier = { limits: { maxStakeholders: 50 } };
      expect(SubscriptionTier.isWithinLimit(tier, 'maxStakeholders', 51)).toBe(false);
    });

    it('should return true for unlimited (-1) regardless of usage', () => {
      const tier = { limits: { maxStakeholders: -1 } };
      expect(SubscriptionTier.isWithinLimit(tier, 'maxStakeholders', 999999)).toBe(true);
    });

    it('should return false for undefined limit', () => {
      const tier = { limits: { maxStakeholders: 50 } };
      expect(SubscriptionTier.isWithinLimit(tier, 'nonExistentLimit', 1)).toBe(false);
    });

    it('should return false when limits object is missing', () => {
      const tier = {};
      expect(SubscriptionTier.isWithinLimit(tier, 'maxStakeholders', 1)).toBe(false);
    });

    it('should handle zero limit', () => {
      const tier = { limits: { apiCallsPerMonth: 0 } };
      expect(SubscriptionTier.isWithinLimit(tier, 'apiCallsPerMonth', 0)).toBe(true);
      expect(SubscriptionTier.isWithinLimit(tier, 'apiCallsPerMonth', 1)).toBe(false);
    });
  });

  // --- getDefaultTiers ---

  describe('getDefaultTiers()', () => {
    it('should return 4 default tiers', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      expect(tiers).toHaveLength(4);
    });

    it('should include free, starter, professional, enterprise', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      const names = tiers.map(t => t.name);
      expect(names).toEqual(['free', 'starter', 'professional', 'enterprise']);
    });

    it('should have free tier with zero prices', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      const free = tiers.find(t => t.name === 'free');
      expect(free.monthlyPrice).toBe(0);
      expect(free.annualPrice).toBe(0);
      expect(free.trialDays).toBe(0);
    });

    it('should have enterprise tier with unlimited limits (-1)', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      const enterprise = tiers.find(t => t.name === 'enterprise');
      expect(enterprise.limits.maxStakeholders).toBe(-1);
      expect(enterprise.limits.maxDocuments).toBe(-1);
      expect(enterprise.limits.maxUsers).toBe(-1);
    });

    it('should have all tiers marked as public', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      tiers.forEach(t => expect(t.isPublic).toBe(true));
    });

    it('should have sequential sort orders', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      expect(tiers[0].sortOrder).toBe(1);
      expect(tiers[1].sortOrder).toBe(2);
      expect(tiers[2].sortOrder).toBe(3);
      expect(tiers[3].sortOrder).toBe(4);
    });

    it('should have enterprise with all features enabled', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      const enterprise = tiers.find(t => t.name === 'enterprise');
      const featureValues = Object.values(enterprise.features);
      featureValues.forEach(v => expect(v).toBe(true));
    });

    it('should have free tier with basic features only', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      const free = tiers.find(t => t.name === 'free');
      expect(free.features.basicCapTable).toBe(true);
      expect(free.features.documentStorage).toBe(true);
      expect(free.features.stakeholderManagement).toBe(true);
      expect(free.features.apiAccess).toBe(false);
      expect(free.features.ssoIntegration).toBe(false);
    });

    it('should have tiers with valid tier IDs', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      tiers.forEach(t => {
        expect(t.tierId).toBeDefined();
        expect(t.tierId).toMatch(/^tier-/);
      });
    });

    it('should have starter and professional with 14-day trials', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      expect(tiers.find(t => t.name === 'starter').trialDays).toBe(14);
      expect(tiers.find(t => t.name === 'professional').trialDays).toBe(14);
    });

    it('should have enterprise with 30-day trial', () => {
      const tiers = SubscriptionTier.getDefaultTiers();
      expect(tiers.find(t => t.name === 'enterprise').trialDays).toBe(30);
    });
  });

  // --- Exposed base model methods ---

  describe('Base model methods', () => {
    it('should have find method', () => {
      expect(typeof SubscriptionTier.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof SubscriptionTier.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof SubscriptionTier.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof SubscriptionTier.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof SubscriptionTier.deleteOne).toBe('function');
    });

    it('should have deleteMany method', () => {
      expect(typeof SubscriptionTier.deleteMany).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof SubscriptionTier.countDocuments).toBe('function');
    });

    it('should have exists method', () => {
      expect(typeof SubscriptionTier.exists).toBe('function');
    });

    it('should have distinct method', () => {
      expect(typeof SubscriptionTier.distinct).toBe('function');
    });

    it('should have aggregate method', () => {
      expect(typeof SubscriptionTier.aggregate).toBe('function');
    });
  });
});
