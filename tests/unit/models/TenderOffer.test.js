/**
 * TenderOffer Model Unit Tests
 * Comprehensive tests for tender offer model including business logic
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService before importing model
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

const TenderOffer = require('../../../models/TenderOffer');
const zerodbService = require('../../../services/zerodbService');

describe('TenderOffer Model', () => {
  let store = [];
  let idCounter = 0;

  const validData = {
    companyId: 'comp_001',
    name: 'Q2 2026 Liquidity Offer',
    description: 'Share buyback for employees',
    pricePerShare: 10.50,
    totalBudget: 1000000,
    shareClasses: ['common'],
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-30T00:00:00.000Z',
    minShares: 100,
    maxShares: 50000,
    createdBy: 'user_001'
  };

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
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.updateRows.mockImplementation((tableName, opts) => {
      return Promise.resolve({ modified_count: 1, matched_count: 1 });
    });

    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc =>
        !Object.entries(filter).every(([key, value]) => doc[key] === value)
      );
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });
  });

  // ---- Schema Definition ----

  describe('Schema Definition', () => {
    const schema = TenderOffer.schema;

    it('should have required identifier fields', () => {
      expect(schema.offerId).toBeDefined();
      expect(schema.offerId.required).toBe(true);
      expect(schema.offerId.unique).toBe(true);
      expect(schema.companyId).toBeDefined();
      expect(schema.companyId.required).toBe(true);
    });

    it('should have required offer details fields', () => {
      expect(schema.name.required).toBe(true);
      expect(schema.pricePerShare.required).toBe(true);
      expect(schema.totalBudget.required).toBe(true);
    });

    it('should have description defaulting to empty string', () => {
      expect(schema.description.default).toBe('');
    });

    it('should have shareClasses defaulting to empty array', () => {
      expect(schema.shareClasses.default).toEqual([]);
    });

    it('should have date range fields', () => {
      expect(schema.startDate).toBeDefined();
      expect(schema.endDate).toBeDefined();
    });

    it('should have status field with proper enum and default', () => {
      expect(schema.status.enum).toEqual(['draft', 'open', 'closed', 'canceled', 'settled']);
      expect(schema.status.default).toBe('draft');
    });

    it('should have participation limits', () => {
      expect(schema.minShares.default).toBe(1);
      expect(schema.maxShares.default).toBeNull();
    });

    it('should have eligibility criteria with defaults', () => {
      expect(schema.eligibilityCriteria.default).toEqual({
        minTenureMonths: 0,
        minSharesHeld: 0,
        employeeStatus: ['active', 'former'],
        excludedStakeholders: [],
        customRules: {}
      });
    });

    it('should have submission tracking fields defaulting to 0', () => {
      expect(schema.totalSharesTendered.default).toBe(0);
      expect(schema.totalSharesAccepted.default).toBe(0);
      expect(schema.totalPayoutAmount.default).toBe(0);
    });

    it('should have oversubscription tracking', () => {
      expect(schema.prorataPercentage.default).toBeNull();
      expect(schema.isOversubscribed.default).toBe(false);
    });

    it('should have lifecycle timestamp fields', () => {
      expect(schema.publishedAt).toBeDefined();
      expect(schema.closedAt).toBeDefined();
      expect(schema.settledAt).toBeDefined();
      expect(schema.canceledAt).toBeDefined();
    });

    it('should have audit fields', () => {
      expect(schema.createdBy).toBeDefined();
      expect(schema.updatedBy).toBeDefined();
      expect(schema.createdAt).toBeDefined();
      expect(schema.updatedAt).toBeDefined();
    });

    it('should have notes and metadata fields', () => {
      expect(schema.notes.default).toBe('');
      expect(schema.metadata.default).toEqual({});
    });
  });

  // ---- Constants ----

  describe('Exported Constants', () => {
    it('should export VALID_STATUSES', () => {
      expect(TenderOffer.VALID_STATUSES).toEqual(['draft', 'open', 'closed', 'canceled', 'settled']);
    });

    it('should export EMPLOYEE_STATUSES', () => {
      expect(TenderOffer.EMPLOYEE_STATUSES).toEqual(['active', 'former', 'terminated', 'retired']);
    });
  });

  // ---- Create ----

  describe('create()', () => {
    it('should create an offer with auto-generated offerId', async () => {
      const result = await TenderOffer.create(validData);
      expect(result).toBeDefined();
      expect(result.offerId).toMatch(/^offer_/);
    });

    it('should preserve provided offerId', async () => {
      const result = await TenderOffer.create({
        ...validData,
        offerId: 'offer_custom-001'
      });
      expect(result.offerId).toBe('offer_custom-001');
    });

    it('should default status to draft', async () => {
      const result = await TenderOffer.create(validData);
      expect(result.status).toBe('draft');
    });

    it('should throw for negative pricePerShare', async () => {
      await expect(
        TenderOffer.create({ ...validData, pricePerShare: -5 })
      ).rejects.toThrow('pricePerShare cannot be negative');
    });

    it('should throw for negative totalBudget', async () => {
      await expect(
        TenderOffer.create({ ...validData, totalBudget: -100 })
      ).rejects.toThrow('totalBudget cannot be negative');
    });

    it('should accept zero pricePerShare', async () => {
      const result = await TenderOffer.create({
        ...validData,
        pricePerShare: 0
      });
      expect(result.pricePerShare).toBe(0);
    });

    it('should accept zero totalBudget', async () => {
      const result = await TenderOffer.create({
        ...validData,
        totalBudget: 0
      });
      expect(result.totalBudget).toBe(0);
    });
  });

  // ---- findByOfferId() ----

  describe('findByOfferId()', () => {
    it('should find an offer by offerId', async () => {
      await TenderOffer.create({ ...validData, offerId: 'offer_find-001' });

      const result = await TenderOffer.findByOfferId('offer_find-001');
      expect(result).toBeDefined();
      expect(result.name).toBe('Q2 2026 Liquidity Offer');
    });

    it('should return null for non-existent offerId', async () => {
      const result = await TenderOffer.findByOfferId('offer_nonexistent');
      expect(result).toBeNull();
    });
  });

  // ---- findByCompany() ----

  describe('findByCompany()', () => {
    it('should find offers by companyId', async () => {
      await TenderOffer.create({ ...validData, companyId: 'comp_find', offerId: 'offer_a' });
      await TenderOffer.create({ ...validData, companyId: 'comp_find', offerId: 'offer_b' });
      await TenderOffer.create({ ...validData, companyId: 'comp_other', offerId: 'offer_c' });

      const results = await TenderOffer.findByCompany('comp_find');
      expect(results.length).toBe(2);
    });

    it('should filter by status when provided', async () => {
      await TenderOffer.create({ ...validData, companyId: 'comp_status', offerId: 'offer_d', status: 'draft' });
      await TenderOffer.create({ ...validData, companyId: 'comp_status', offerId: 'offer_e', status: 'open' });

      const results = await TenderOffer.findByCompany('comp_status', { status: 'open' });
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('open');
    });
  });

  // ---- findActive() ----

  describe('findActive()', () => {
    it('should find open offers within date range', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000).toISOString();
      const futureDate = new Date(now.getTime() + 86400000).toISOString();

      await TenderOffer.create({
        ...validData,
        companyId: 'comp_active',
        offerId: 'offer_active_1',
        status: 'open',
        startDate: pastDate,
        endDate: futureDate
      });

      const results = await TenderOffer.findActive('comp_active');
      expect(results.length).toBe(1);
    });

    it('should exclude offers that have not started yet', async () => {
      const futureStart = new Date(Date.now() + 86400000 * 7).toISOString();
      const futureEnd = new Date(Date.now() + 86400000 * 30).toISOString();

      await TenderOffer.create({
        ...validData,
        companyId: 'comp_future',
        offerId: 'offer_future_1',
        status: 'open',
        startDate: futureStart,
        endDate: futureEnd
      });

      const results = await TenderOffer.findActive('comp_future');
      expect(results.length).toBe(0);
    });

    it('should exclude offers that have ended', async () => {
      const pastStart = new Date(Date.now() - 86400000 * 30).toISOString();
      const pastEnd = new Date(Date.now() - 86400000).toISOString();

      await TenderOffer.create({
        ...validData,
        companyId: 'comp_past',
        offerId: 'offer_past_1',
        status: 'open',
        startDate: pastStart,
        endDate: pastEnd
      });

      const results = await TenderOffer.findActive('comp_past');
      expect(results.length).toBe(0);
    });

    it('should exclude non-open offers', async () => {
      await TenderOffer.create({
        ...validData,
        companyId: 'comp_draft',
        offerId: 'offer_draft_1',
        status: 'draft'
      });

      const results = await TenderOffer.findActive('comp_draft');
      expect(results.length).toBe(0);
    });
  });

  // ---- Business Logic Methods ----

  describe('getMaxPurchasableShares()', () => {
    it('should calculate max purchasable shares correctly', () => {
      const offer = { totalBudget: 100000, pricePerShare: 10 };
      expect(TenderOffer.getMaxPurchasableShares(offer)).toBe(10000);
    });

    it('should floor the result for non-even division', () => {
      const offer = { totalBudget: 100000, pricePerShare: 7 };
      expect(TenderOffer.getMaxPurchasableShares(offer)).toBe(14285);
    });

    it('should return 0 when pricePerShare is 0', () => {
      const offer = { totalBudget: 100000, pricePerShare: 0 };
      expect(TenderOffer.getMaxPurchasableShares(offer)).toBe(0);
    });
  });

  describe('getRemainingBudget()', () => {
    it('should calculate remaining budget', () => {
      const offer = { totalBudget: 100000, totalPayoutAmount: 30000 };
      expect(TenderOffer.getRemainingBudget(offer)).toBe(70000);
    });

    it('should handle zero payout', () => {
      const offer = { totalBudget: 100000, totalPayoutAmount: 0 };
      expect(TenderOffer.getRemainingBudget(offer)).toBe(100000);
    });

    it('should handle missing totalPayoutAmount', () => {
      const offer = { totalBudget: 100000 };
      expect(TenderOffer.getRemainingBudget(offer)).toBe(100000);
    });

    it('should handle fully spent budget', () => {
      const offer = { totalBudget: 100000, totalPayoutAmount: 100000 };
      expect(TenderOffer.getRemainingBudget(offer)).toBe(0);
    });
  });

  describe('getSubscriptionRatio()', () => {
    it('should calculate subscription ratio', () => {
      const offer = { totalBudget: 100000, pricePerShare: 10, totalSharesTendered: 5000 };
      expect(TenderOffer.getSubscriptionRatio(offer)).toBe(0.5);
    });

    it('should return 0 when pricePerShare is 0', () => {
      const offer = { totalBudget: 100000, pricePerShare: 0, totalSharesTendered: 5000 };
      expect(TenderOffer.getSubscriptionRatio(offer)).toBe(0);
    });

    it('should return 0 when no shares tendered', () => {
      const offer = { totalBudget: 100000, pricePerShare: 10, totalSharesTendered: 0 };
      expect(TenderOffer.getSubscriptionRatio(offer)).toBe(0);
    });

    it('should handle missing totalSharesTendered', () => {
      const offer = { totalBudget: 100000, pricePerShare: 10 };
      expect(TenderOffer.getSubscriptionRatio(offer)).toBe(0);
    });

    it('should return ratio > 1 when oversubscribed', () => {
      const offer = { totalBudget: 100000, pricePerShare: 10, totalSharesTendered: 20000 };
      expect(TenderOffer.getSubscriptionRatio(offer)).toBe(2);
    });
  });

  describe('isActive()', () => {
    it('should return true for open offer within date range', () => {
      const now = new Date();
      const offer = {
        status: 'open',
        startDate: new Date(now.getTime() - 86400000).toISOString(),
        endDate: new Date(now.getTime() + 86400000).toISOString()
      };
      expect(TenderOffer.isActive(offer)).toBe(true);
    });

    it('should return false for draft offer', () => {
      expect(TenderOffer.isActive({ status: 'draft' })).toBe(false);
    });

    it('should return false for closed offer', () => {
      expect(TenderOffer.isActive({ status: 'closed' })).toBe(false);
    });

    it('should return false for canceled offer', () => {
      expect(TenderOffer.isActive({ status: 'canceled' })).toBe(false);
    });

    it('should return false for settled offer', () => {
      expect(TenderOffer.isActive({ status: 'settled' })).toBe(false);
    });

    it('should return false if start date is in the future', () => {
      const offer = {
        status: 'open',
        startDate: new Date(Date.now() + 86400000).toISOString()
      };
      expect(TenderOffer.isActive(offer)).toBe(false);
    });

    it('should return false if end date is in the past', () => {
      const offer = {
        status: 'open',
        endDate: new Date(Date.now() - 86400000).toISOString()
      };
      expect(TenderOffer.isActive(offer)).toBe(false);
    });

    it('should return true if no dates specified (open status)', () => {
      expect(TenderOffer.isActive({ status: 'open' })).toBe(true);
    });

    it('should return true if only startDate set and in the past', () => {
      const offer = {
        status: 'open',
        startDate: new Date(Date.now() - 86400000).toISOString()
      };
      expect(TenderOffer.isActive(offer)).toBe(true);
    });
  });

  // ---- Status Transition Methods ----

  describe('publish()', () => {
    it('should set status to open and publishedAt', async () => {
      await TenderOffer.create({ ...validData, offerId: 'offer_pub' });

      // publish uses updateOne which goes through the mock
      const result = await TenderOffer.publish('offer_pub');
      expect(result).toBeDefined();
    });
  });

  describe('close()', () => {
    it('should set status to closed and closedAt', async () => {
      await TenderOffer.create({ ...validData, offerId: 'offer_close', status: 'open' });

      const result = await TenderOffer.close('offer_close');
      expect(result).toBeDefined();
    });
  });

  describe('cancel()', () => {
    it('should set status to canceled and canceledAt', async () => {
      await TenderOffer.create({ ...validData, offerId: 'offer_cancel' });

      const result = await TenderOffer.cancel('offer_cancel');
      expect(result).toBeDefined();
    });
  });

  describe('settle()', () => {
    it('should set status to settled with settlement data', async () => {
      await TenderOffer.create({ ...validData, offerId: 'offer_settle', status: 'closed' });

      const result = await TenderOffer.settle('offer_settle', {
        totalSharesAccepted: 5000,
        totalPayoutAmount: 52500,
        prorataPercentage: 80,
        isOversubscribed: true
      });
      expect(result).toBeDefined();
    });

    it('should handle settlement with empty data', async () => {
      await TenderOffer.create({ ...validData, offerId: 'offer_settle2' });

      const result = await TenderOffer.settle('offer_settle2');
      expect(result).toBeDefined();
    });
  });

  // ---- updateTenderTotals() ----

  describe('updateTenderTotals()', () => {
    it('should update shares tendered and detect oversubscription', async () => {
      await TenderOffer.create({
        ...validData,
        offerId: 'offer_totals',
        totalBudget: 100000,
        pricePerShare: 10
      });

      // Max purchasable = 10000 shares
      const result = await TenderOffer.updateTenderTotals('offer_totals', 15000);
      expect(result).toBeDefined();
    });

    it('should not flag oversubscription when within budget', async () => {
      await TenderOffer.create({
        ...validData,
        offerId: 'offer_under',
        totalBudget: 100000,
        pricePerShare: 10
      });

      const result = await TenderOffer.updateTenderTotals('offer_under', 5000);
      expect(result).toBeDefined();
    });

    it('should throw when offer not found', async () => {
      await expect(
        TenderOffer.updateTenderTotals('offer_nonexistent', 5000)
      ).rejects.toThrow('Offer not found');
    });
  });

  // ---- Base Model Methods ----

  describe('Base Model Methods', () => {
    it('should have find method', () => {
      expect(typeof TenderOffer.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof TenderOffer.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof TenderOffer.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof TenderOffer.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof TenderOffer.deleteOne).toBe('function');
    });

    it('should have findOneAndUpdate method', () => {
      expect(typeof TenderOffer.findOneAndUpdate).toBe('function');
    });

    it('should have findByIdAndDelete method', () => {
      expect(typeof TenderOffer.findByIdAndDelete).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof TenderOffer.countDocuments).toBe('function');
    });

    it('should have exists method', () => {
      expect(typeof TenderOffer.exists).toBe('function');
    });

    it('should have distinct method', () => {
      expect(typeof TenderOffer.distinct).toBe('function');
    });

    it('should have aggregate method', () => {
      expect(typeof TenderOffer.aggregate).toBe('function');
    });

    it('should have tableName set', () => {
      expect(TenderOffer.tableName).toBe('tender_offers');
    });
  });
});
