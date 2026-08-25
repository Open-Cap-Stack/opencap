/**
 * InvestmentTracker Model Unit Tests
 * Tests the actual ZeroDB-based investmentTrackerModel with mocked service layer
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock the zerodbService to prevent real API calls
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

jest.mock('../../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const InvestmentTracker = require('../../../models/investmentTrackerModel');
const zerodbService = require('../../../services/zerodbService');

describe('InvestmentTracker Model', () => {
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

    zerodbService.queryTable.mockImplementation((tableName, { filter = {}, limit } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      const totalCount = results.length;
      if (limit) {
        results = results.slice(0, limit);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc })),
        total: totalCount
      });
    });

    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    zerodbService.deleteRowById.mockImplementation(() => Promise.resolve({ deleted: true }));

    zerodbService.deleteRows.mockImplementation((tableName, { filter }) => {
      const before = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([k, v]) => doc[k] === v);
      });
      return Promise.resolve({ deleted_count: before - store.length });
    });
  });

  // ─── Schema ─────────────────────────────────────────────────

  describe('Schema and Structure', () => {
    it('should be an object with expected methods', () => {
      expect(InvestmentTracker).toBeDefined();
      expect(typeof InvestmentTracker.create).toBe('function');
      expect(typeof InvestmentTracker.findByTrackId).toBe('function');
      expect(typeof InvestmentTracker.findByCompany).toBe('function');
      expect(typeof InvestmentTracker.updateByTrackId).toBe('function');
      expect(typeof InvestmentTracker.deleteByTrackId).toBe('function');
      expect(typeof InvestmentTracker.getTotalPortfolioValue).toBe('function');
      expect(typeof InvestmentTracker.getTotalEquityPercentage).toBe('function');
    });

    it('should expose find method', () => {
      expect(typeof InvestmentTracker.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof InvestmentTracker.findOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof InvestmentTracker.countDocuments).toBe('function');
    });
  });

  // ─── create() ───────────────────────────────────────────────

  describe('create()', () => {
    it('should create an investment tracker with valid data', async () => {
      const result = await InvestmentTracker.create({
        TrackID: 'TRK_001',
        Company: 'Acme Corp',
        EquityPercentage: 15.5,
        CurrentValue: 500000
      });

      expect(result).toBeDefined();
      expect(result.TrackID).toBe('TRK_001');
      expect(result.Company).toBe('Acme Corp');
      expect(result.EquityPercentage).toBe(15.5);
      expect(result.CurrentValue).toBe(500000);
      expect(result._type).toBe('investment_tracker');
    });

    it('should throw validation error when TrackID is missing', async () => {
      await expect(InvestmentTracker.create({
        Company: 'Acme Corp',
        EquityPercentage: 10,
        CurrentValue: 100000
      })).rejects.toThrow('Validation failed: TrackID is required');
    });

    it('should throw duplicate key error when TrackID already exists', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_DUP',
        Company: 'First Corp',
        EquityPercentage: 10,
        CurrentValue: 100000
      });

      try {
        await InvestmentTracker.create({
          TrackID: 'TRK_DUP',
          Company: 'Second Corp',
          EquityPercentage: 5,
          CurrentValue: 50000
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Duplicate key error');
        expect(error.message).toContain('TRK_DUP');
        expect(error.code).toBe(11000);
      }
    });
  });

  // ─── findByTrackId() ───────────────────────────────────────

  describe('findByTrackId()', () => {
    it('should find a tracker by TrackID', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_FIND',
        Company: 'Find Corp',
        EquityPercentage: 10,
        CurrentValue: 200000
      });

      const found = await InvestmentTracker.findByTrackId('TRK_FIND');
      expect(found).toBeDefined();
      expect(found.TrackID).toBe('TRK_FIND');
      expect(found._type).toBe('investment_tracker');
    });

    it('should return null for non-existent TrackID', async () => {
      const found = await InvestmentTracker.findByTrackId('TRK_NONE');
      expect(found).toBeNull();
    });
  });

  // ─── findByCompany() ───────────────────────────────────────

  describe('findByCompany()', () => {
    beforeEach(async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_A1',
        Company: 'Alpha Inc',
        EquityPercentage: 10,
        CurrentValue: 100000
      });
      await InvestmentTracker.create({
        TrackID: 'TRK_A2',
        Company: 'Alpha Inc',
        EquityPercentage: 5,
        CurrentValue: 50000
      });
      await InvestmentTracker.create({
        TrackID: 'TRK_B1',
        Company: 'Beta Corp',
        EquityPercentage: 20,
        CurrentValue: 300000
      });
    });

    it('should find trackers by company', async () => {
      const results = await InvestmentTracker.findByCompany('Alpha Inc');
      expect(results.length).toBe(2);
      results.forEach(r => expect(r.Company).toBe('Alpha Inc'));
    });

    it('should return empty for unknown company', async () => {
      const results = await InvestmentTracker.findByCompany('Unknown Corp');
      expect(results).toEqual([]);
    });
  });

  // ─── updateByTrackId() ─────────────────────────────────────

  describe('updateByTrackId()', () => {
    it('should update tracker values by TrackID', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_UPD',
        Company: 'Update Corp',
        EquityPercentage: 10,
        CurrentValue: 100000
      });

      const result = await InvestmentTracker.updateByTrackId('TRK_UPD', {
        CurrentValue: 200000,
        EquityPercentage: 12
      });
      expect(result).toBeDefined();
    });

    it('should return null when TrackID not found', async () => {
      const result = await InvestmentTracker.updateByTrackId('TRK_NONE', {
        CurrentValue: 999
      });
      expect(result).toBeNull();
    });
  });

  // ─── deleteByTrackId() ─────────────────────────────────────

  describe('deleteByTrackId()', () => {
    it('should delete tracker by TrackID', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_DEL',
        Company: 'Delete Corp',
        EquityPercentage: 10,
        CurrentValue: 100000
      });

      const result = await InvestmentTracker.deleteByTrackId('TRK_DEL');
      expect(result).toBeDefined();
    });

    it('should handle deletion of non-existent TrackID gracefully', async () => {
      const result = await InvestmentTracker.deleteByTrackId('TRK_NOPE');
      expect(result).toBeDefined();
      expect(result.deletedCount).toBe(0);
    });
  });

  // ─── getTotalPortfolioValue() ──────────────────────────────

  describe('getTotalPortfolioValue()', () => {
    it('should sum all CurrentValue across trackers', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_PV1',
        Company: 'A',
        EquityPercentage: 10,
        CurrentValue: 100000
      });
      await InvestmentTracker.create({
        TrackID: 'TRK_PV2',
        Company: 'B',
        EquityPercentage: 5,
        CurrentValue: 200000
      });
      await InvestmentTracker.create({
        TrackID: 'TRK_PV3',
        Company: 'C',
        EquityPercentage: 15,
        CurrentValue: 300000
      });

      const total = await InvestmentTracker.getTotalPortfolioValue();
      expect(total).toBe(600000);
    });

    it('should return 0 when no trackers exist', async () => {
      const total = await InvestmentTracker.getTotalPortfolioValue();
      expect(total).toBe(0);
    });

    it('should handle trackers with null CurrentValue', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_NULL',
        Company: 'NullCo',
        EquityPercentage: 10
      });

      const total = await InvestmentTracker.getTotalPortfolioValue();
      expect(total).toBe(0);
    });
  });

  // ─── getTotalEquityPercentage() ────────────────────────────

  describe('getTotalEquityPercentage()', () => {
    it('should sum all EquityPercentage across trackers', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_EP1',
        Company: 'A',
        EquityPercentage: 10,
        CurrentValue: 100000
      });
      await InvestmentTracker.create({
        TrackID: 'TRK_EP2',
        Company: 'B',
        EquityPercentage: 5,
        CurrentValue: 200000
      });

      const total = await InvestmentTracker.getTotalEquityPercentage();
      expect(total).toBe(15);
    });

    it('should return 0 when no trackers exist', async () => {
      const total = await InvestmentTracker.getTotalEquityPercentage();
      expect(total).toBe(0);
    });

    it('should handle trackers with null EquityPercentage', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_NULLEQ',
        Company: 'NullEq',
        CurrentValue: 100000
      });

      const total = await InvestmentTracker.getTotalEquityPercentage();
      expect(total).toBe(0);
    });
  });

  // ─── find() with type filter ───────────────────────────────

  describe('find()', () => {
    it('should automatically filter by _type investment_tracker', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_F1',
        Company: 'FindAll',
        EquityPercentage: 10,
        CurrentValue: 100000
      });

      const results = await InvestmentTracker.find();
      expect(results.length).toBe(1);
      expect(results[0]._type).toBe('investment_tracker');
    });

    it('should apply additional query filters', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_FA',
        Company: 'FindCo',
        EquityPercentage: 10,
        CurrentValue: 100000
      });
      await InvestmentTracker.create({
        TrackID: 'TRK_FB',
        Company: 'OtherCo',
        EquityPercentage: 5,
        CurrentValue: 50000
      });

      const results = await InvestmentTracker.find({ Company: 'FindCo' });
      expect(results.length).toBe(1);
      expect(results[0].Company).toBe('FindCo');
    });
  });

  // ─── findOne() with type filter ────────────────────────────

  describe('findOne()', () => {
    it('should find a single tracker with type filter', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_FO',
        Company: 'FindOneCo',
        EquityPercentage: 10,
        CurrentValue: 100000
      });

      const result = await InvestmentTracker.findOne({ Company: 'FindOneCo' });
      expect(result).toBeDefined();
      expect(result._type).toBe('investment_tracker');
    });
  });

  // ─── countDocuments() with type filter ─────────────────────

  describe('countDocuments()', () => {
    it('should count trackers with type filter', async () => {
      await InvestmentTracker.create({
        TrackID: 'TRK_C1', Company: 'A', EquityPercentage: 10, CurrentValue: 100000
      });
      await InvestmentTracker.create({
        TrackID: 'TRK_C2', Company: 'B', EquityPercentage: 5, CurrentValue: 50000
      });

      const count = await InvestmentTracker.countDocuments();
      expect(count).toBe(2);
    });
  });
});
