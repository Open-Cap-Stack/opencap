/**
 * ValuationAssumptions Model Unit Tests
 * Feature: Issue #263 - Create valuation_assumptions and valuation_methods tables
 * Tests the actual ZeroDB-based ValuationAssumptions model with mocked service layer
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

const ValuationAssumptions = require('../../../models/ValuationAssumptions');
const zerodbService = require('../../../services/zerodbService');

describe('ValuationAssumptions Model', () => {
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
      if (limit) {
        results = results.slice(0, limit);
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

    zerodbService.deleteRowById.mockImplementation(() => Promise.resolve({ deleted: true }));

    zerodbService.deleteRows.mockImplementation((tableName, { filter }) => {
      const before = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([k, v]) => doc[k] === v);
      });
      return Promise.resolve({ deleted_count: before - store.length });
    });
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose EXIT_SCENARIOS', () => {
      expect(ValuationAssumptions.EXIT_SCENARIOS).toEqual(['IPO', 'ACQUISITION', 'STAY_PRIVATE']);
    });

    it('should expose OPTION_POOL_TREATMENT', () => {
      expect(ValuationAssumptions.OPTION_POOL_TREATMENT).toEqual([
        'INCLUDE_ALLOCATED_ONLY', 'INCLUDE_FULL_POOL', 'TREASURY_METHOD', 'EXCLUDE'
      ]);
    });

    it('should expose CONVERTIBLE_TREATMENT', () => {
      expect(ValuationAssumptions.CONVERTIBLE_TREATMENT).toEqual([
        'EXCLUDE_UNTIL_CONVERT', 'INCLUDE_AS_CONVERTED', 'PROBABILITY_WEIGHTED', 'SHADOW_PREFERRED'
      ]);
    });
  });

  // ─── Schema ─────────────────────────────────────────────────

  describe('Schema', () => {
    it('should have the correct table name', () => {
      expect(ValuationAssumptions.tableName).toBe('valuation_assumptions');
    });

    it('should have required schema fields', () => {
      const s = ValuationAssumptions.schema;
      expect(s.id).toBeDefined();
      expect(s.valuationId).toBeDefined();
      expect(s.timeToLiquidityYears).toBeDefined();
      expect(s.exitScenario).toBeDefined();
      expect(s.riskFreeRate).toBeDefined();
      expect(s.equityVolatility).toBeDefined();
      expect(s.discountRate).toBeDefined();
      expect(s.dlom).toBeDefined();
      expect(s.dloc).toBeDefined();
    });

    it('should mark valuationId as required', () => {
      expect(ValuationAssumptions.schema.valuationId.required).toBe(true);
    });
  });

  // ─── validateRate() ─────────────────────────────────────────

  describe('validateRate()', () => {
    it('should pass for valid rate within default max', () => {
      expect(() => ValuationAssumptions.validateRate(0.5, 'Test rate')).not.toThrow();
    });

    it('should pass for 0', () => {
      expect(() => ValuationAssumptions.validateRate(0, 'Test rate')).not.toThrow();
    });

    it('should pass for max value', () => {
      expect(() => ValuationAssumptions.validateRate(1, 'Test rate')).not.toThrow();
    });

    it('should throw for negative rate', () => {
      expect(() => ValuationAssumptions.validateRate(-0.1, 'Risk-free rate'))
        .toThrow('Risk-free rate must be non-negative');
    });

    it('should throw for rate exceeding max', () => {
      expect(() => ValuationAssumptions.validateRate(1.5, 'Discount rate'))
        .toThrow('Discount rate must not exceed 100%');
    });

    it('should accept custom max', () => {
      expect(() => ValuationAssumptions.validateRate(2.5, 'Equity volatility', 3)).not.toThrow();
    });

    it('should throw for rate exceeding custom max', () => {
      expect(() => ValuationAssumptions.validateRate(3.5, 'Equity volatility', 3))
        .toThrow('Equity volatility must not exceed 300%');
    });

    it('should skip validation for undefined', () => {
      expect(() => ValuationAssumptions.validateRate(undefined, 'Test')).not.toThrow();
    });

    it('should skip validation for null', () => {
      expect(() => ValuationAssumptions.validateRate(null, 'Test')).not.toThrow();
    });
  });

  // ─── create() ───────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      valuationId: 'val_123',
      discountRate: 0.15,
      dlom: 0.25,
      exitScenario: 'IPO',
      riskFreeRate: 0.04,
      equityVolatility: 0.6
    };

    it('should create assumptions with valid data', async () => {
      const result = await ValuationAssumptions.create(validData);
      expect(result).toBeDefined();
      expect(result.valuationId).toBe('val_123');
      expect(result.discountRate).toBe(0.15);
    });

    it('should auto-generate id with va_ prefix', async () => {
      const result = await ValuationAssumptions.create(validData);
      expect(result.id).toMatch(/^va_/);
    });

    it('should use provided id if given', async () => {
      const result = await ValuationAssumptions.create({ ...validData, id: 'va_custom' });
      expect(result.id).toBe('va_custom');
    });

    it('should default assumptionsJson to empty object', async () => {
      const result = await ValuationAssumptions.create(validData);
      expect(result.assumptionsJson).toEqual({});
    });

    it('should throw for invalid exit scenario', async () => {
      await expect(ValuationAssumptions.create({ ...validData, exitScenario: 'MERGER' }))
        .rejects.toThrow('Invalid exit scenario: MERGER');
    });

    it('should throw for invalid option pool treatment', async () => {
      await expect(ValuationAssumptions.create({ ...validData, optionPoolTreatment: 'INVALID' }))
        .rejects.toThrow('Invalid option pool treatment: INVALID');
    });

    it('should throw for invalid SAFE/note treatment', async () => {
      await expect(ValuationAssumptions.create({ ...validData, safeNoteTreatment: 'INVALID' }))
        .rejects.toThrow('Invalid SAFE/note treatment: INVALID');
    });

    it('should throw for negative riskFreeRate', async () => {
      await expect(ValuationAssumptions.create({ ...validData, riskFreeRate: -0.01 }))
        .rejects.toThrow('Risk-free rate must be non-negative');
    });

    it('should throw for equityVolatility exceeding 300%', async () => {
      await expect(ValuationAssumptions.create({ ...validData, equityVolatility: 3.5 }))
        .rejects.toThrow('Equity volatility must not exceed 300%');
    });

    it('should throw for negative discountRate', async () => {
      await expect(ValuationAssumptions.create({ ...validData, discountRate: -0.1 }))
        .rejects.toThrow('Discount rate must be non-negative');
    });

    it('should throw for negative dlom', async () => {
      await expect(ValuationAssumptions.create({ ...validData, dlom: -0.1 }))
        .rejects.toThrow('DLOM must be non-negative');
    });

    it('should throw for negative dloc', async () => {
      await expect(ValuationAssumptions.create({ ...validData, dloc: -0.1 }))
        .rejects.toThrow('DLOC must be non-negative');
    });

    it('should throw for negative timeToLiquidityYears', async () => {
      await expect(ValuationAssumptions.create({ ...validData, timeToLiquidityYears: -1 }))
        .rejects.toThrow('Time to liquidity must be non-negative');
    });

    it('should accept valid optionPoolTreatment values', async () => {
      for (const treatment of ValuationAssumptions.OPTION_POOL_TREATMENT) {
        const result = await ValuationAssumptions.create({ ...validData, optionPoolTreatment: treatment });
        expect(result.optionPoolTreatment).toBe(treatment);
      }
    });

    it('should accept valid safeNoteTreatment values', async () => {
      for (const treatment of ValuationAssumptions.CONVERTIBLE_TREATMENT) {
        const result = await ValuationAssumptions.create({ ...validData, safeNoteTreatment: treatment });
        expect(result.safeNoteTreatment).toBe(treatment);
      }
    });
  });

  // ─── findByValuationId() ───────────────────────────────────

  describe('findByValuationId()', () => {
    it('should find assumptions by valuation ID', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_find',
        discountRate: 0.15,
        dlom: 0.25
      });

      const found = await ValuationAssumptions.findByValuationId('val_find');
      expect(found).toBeDefined();
      expect(found.valuationId).toBe('val_find');
    });

    it('should return null for non-existent valuation', async () => {
      const found = await ValuationAssumptions.findByValuationId('val_nonexistent');
      expect(found).toBeNull();
    });
  });

  // ─── upsert() ──────────────────────────────────────────────

  describe('upsert()', () => {
    it('should create new record when none exists', async () => {
      const result = await ValuationAssumptions.upsert('val_new', {
        discountRate: 0.15, dlom: 0.25
      }, 'user_1');

      expect(result).toBeDefined();
      expect(result.valuationId).toBe('val_new');
      expect(result.createdBy).toBe('user_1');
    });

    it('should update existing record', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_upsert',
        discountRate: 0.10,
        dlom: 0.20
      });

      const result = await ValuationAssumptions.upsert('val_upsert', {
        discountRate: 0.20
      }, 'user_2');

      expect(result).toBeDefined();
    });
  });

  // ─── updateAssumptions() ───────────────────────────────────

  describe('updateAssumptions()', () => {
    it('should update assumptions with valid data', async () => {
      const created = await ValuationAssumptions.create({
        id: 'va_update',
        valuationId: 'val_u',
        discountRate: 0.10,
        dlom: 0.20
      });

      const result = await ValuationAssumptions.updateAssumptions('va_update', {
        discountRate: 0.18
      }, 'user_1');
      expect(result).toBeDefined();
    });

    it('should throw for invalid exit scenario on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        exitScenario: 'INVALID'
      }, 'user_1')).rejects.toThrow('Invalid exit scenario');
    });

    it('should throw for invalid option pool treatment on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        optionPoolTreatment: 'BAD'
      }, 'user_1')).rejects.toThrow('Invalid option pool treatment');
    });

    it('should throw for invalid SAFE/note treatment on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        safeNoteTreatment: 'BAD'
      }, 'user_1')).rejects.toThrow('Invalid SAFE/note treatment');
    });

    it('should validate rates on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        riskFreeRate: -0.5
      }, 'user_1')).rejects.toThrow('Risk-free rate must be non-negative');
    });

    it('should validate equity volatility on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        equityVolatility: 4.0
      }, 'user_1')).rejects.toThrow('Equity volatility must not exceed 300%');
    });

    it('should validate discount rate on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        discountRate: -1
      }, 'user_1')).rejects.toThrow('Discount rate must be non-negative');
    });

    it('should validate dlom on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        dlom: 2.0
      }, 'user_1')).rejects.toThrow('DLOM must not exceed 100%');
    });

    it('should validate dloc on update', async () => {
      await expect(ValuationAssumptions.updateAssumptions('va_x', {
        dloc: -0.5
      }, 'user_1')).rejects.toThrow('DLOC must be non-negative');
    });
  });

  // ─── deleteAssumptions() ───────────────────────────────────

  describe('deleteAssumptions()', () => {
    it('should delete assumptions by ID', async () => {
      await ValuationAssumptions.create({
        id: 'va_delete',
        valuationId: 'val_del',
        discountRate: 0.15,
        dlom: 0.25
      });

      const result = await ValuationAssumptions.deleteAssumptions('va_delete');
      expect(result).toBeDefined();
    });
  });

  // ─── deleteByValuationId() ─────────────────────────────────

  describe('deleteByValuationId()', () => {
    it('should delete assumptions for a valuation and return deletedCount 1', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_delby',
        discountRate: 0.15,
        dlom: 0.25
      });

      const result = await ValuationAssumptions.deleteByValuationId('val_delby');
      expect(result.deletedCount).toBe(1);
    });

    it('should return deletedCount 0 when no assumptions found', async () => {
      const result = await ValuationAssumptions.deleteByValuationId('val_nonexistent');
      expect(result.deletedCount).toBe(0);
    });
  });

  // ─── validateForApproval() ─────────────────────────────────

  describe('validateForApproval()', () => {
    it('should return valid for complete assumptions', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_approve',
        discountRate: 0.15,
        dlom: 0.25,
        exitScenario: 'IPO',
        timeToLiquidityYears: 3,
        assumptionsNarrative: 'Based on comparable transactions'
      });

      const result = await ValuationAssumptions.validateForApproval('val_approve');
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.assumptions).toBeDefined();
    });

    it('should return invalid when no assumptions exist', async () => {
      const result = await ValuationAssumptions.validateForApproval('val_nonexistent');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No assumptions found for valuation');
    });

    it('should return error when discountRate is missing', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_nodr',
        dlom: 0.25,
        exitScenario: 'IPO',
        timeToLiquidityYears: 3,
        assumptionsNarrative: 'Narrative'
      });

      const result = await ValuationAssumptions.validateForApproval('val_nodr');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Discount rate is required');
    });

    it('should return error when dlom is missing', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_nodlom',
        discountRate: 0.15,
        exitScenario: 'IPO',
        timeToLiquidityYears: 3,
        assumptionsNarrative: 'Narrative'
      });

      const result = await ValuationAssumptions.validateForApproval('val_nodlom');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DLOM (Discount for Lack of Marketability) is required');
    });

    it('should return warning when exitScenario is missing', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_noexit',
        discountRate: 0.15,
        dlom: 0.25,
        timeToLiquidityYears: 3,
        assumptionsNarrative: 'Narrative'
      });

      const result = await ValuationAssumptions.validateForApproval('val_noexit');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Exit scenario not specified');
    });

    it('should return warning when timeToLiquidityYears is missing', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_notime',
        discountRate: 0.15,
        dlom: 0.25,
        exitScenario: 'ACQUISITION',
        assumptionsNarrative: 'Narrative'
      });

      const result = await ValuationAssumptions.validateForApproval('val_notime');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Time to liquidity not specified');
    });

    it('should return warning when assumptionsNarrative is missing', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_nonarr',
        discountRate: 0.15,
        dlom: 0.25,
        exitScenario: 'IPO',
        timeToLiquidityYears: 3
      });

      const result = await ValuationAssumptions.validateForApproval('val_nonarr');
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Assumptions narrative not provided');
    });
  });

  // ─── getAssumptionsSummary() ────────────────────────────────

  describe('getAssumptionsSummary()', () => {
    it('should return null when no assumptions exist', async () => {
      const result = await ValuationAssumptions.getAssumptionsSummary('val_nosummary');
      expect(result).toBeNull();
    });

    it('should return a full summary object', async () => {
      await ValuationAssumptions.create({
        valuationId: 'val_summary',
        discountRate: 0.15,
        riskFreeRate: 0.04,
        equityVolatility: 0.6,
        terminalGrowthRate: 0.03,
        dlom: 0.25,
        dloc: 0.10,
        exitScenario: 'IPO',
        timeToLiquidityYears: 5,
        optionPoolTreatment: 'INCLUDE_FULL_POOL',
        safeNoteTreatment: 'INCLUDE_AS_CONVERTED',
        revenueMultiple: 8.0,
        ebitdaMultiple: 15.0
      });

      const summary = await ValuationAssumptions.getAssumptionsSummary('val_summary');
      expect(summary).toBeDefined();
      expect(summary.valuationId).toBe('val_summary');
      expect(summary.hasAssumptions).toBe(true);
      expect(summary.keyRates.discountRate).toBe(0.15);
      expect(summary.keyRates.riskFreeRate).toBe(0.04);
      expect(summary.keyRates.equityVolatility).toBe(0.6);
      expect(summary.keyRates.terminalGrowthRate).toBe(0.03);
      expect(summary.discounts.dlom).toBe(0.25);
      expect(summary.discounts.dloc).toBe(0.10);
      expect(summary.exitAssumptions.scenario).toBe('IPO');
      expect(summary.exitAssumptions.timeToLiquidityYears).toBe(5);
      expect(summary.treatments.optionPool).toBe('INCLUDE_FULL_POOL');
      expect(summary.treatments.safeNote).toBe('INCLUDE_AS_CONVERTED');
      expect(summary.marketMultiples.revenue).toBe(8.0);
      expect(summary.marketMultiples.ebitda).toBe(15.0);
    });
  });

  // ─── Delegated base methods ─────────────────────────────────

  describe('Delegated base methods', () => {
    it('should expose find', () => {
      expect(typeof ValuationAssumptions.find).toBe('function');
    });

    it('should expose findOne', () => {
      expect(typeof ValuationAssumptions.findOne).toBe('function');
    });

    it('should expose findById', () => {
      expect(typeof ValuationAssumptions.findById).toBe('function');
    });

    it('should expose updateOne', () => {
      expect(typeof ValuationAssumptions.updateOne).toBe('function');
    });

    it('should expose deleteOne', () => {
      expect(typeof ValuationAssumptions.deleteOne).toBe('function');
    });

    it('should expose countDocuments', () => {
      expect(typeof ValuationAssumptions.countDocuments).toBe('function');
    });
  });
});
