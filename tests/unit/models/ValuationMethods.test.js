/**
 * ValuationMethods Model Unit Tests
 * Feature: Issue #263 - Create valuation_assumptions and valuation_methods tables
 * Tests the actual ZeroDB-based ValuationMethods model with mocked service layer
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

const ValuationMethods = require('../../../models/ValuationMethods');
const zerodbService = require('../../../services/zerodbService');

describe('ValuationMethods Model', () => {
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

    zerodbService.deleteRowById.mockImplementation((tableName, rowId) => {
      return Promise.resolve({ deleted: true });
    });

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
    it('should expose VALUATION_METHODS', () => {
      expect(ValuationMethods.VALUATION_METHODS).toEqual([
        'BACKSOLVE_OPM', 'PWERM', 'DCF', 'MARKET_MULTIPLES',
        'TRANSACTION_MULTIPLES', 'ASSET_BASED', 'HYBRID', 'RULE_OF_THUMB'
      ]);
    });

    it('should have 8 valuation methods', () => {
      expect(ValuationMethods.VALUATION_METHODS.length).toBe(8);
    });
  });

  // ─── Schema ─────────────────────────────────────────────────

  describe('Schema', () => {
    it('should have the correct table name', () => {
      expect(ValuationMethods.tableName).toBe('valuation_methods');
    });

    it('should have required schema fields', () => {
      const s = ValuationMethods.schema;
      expect(s.id).toBeDefined();
      expect(s.valuationId).toBeDefined();
      expect(s.method).toBeDefined();
      expect(s.weight).toBeDefined();
      expect(s.methodValue).toBeDefined();
      expect(s.summary).toBeDefined();
      expect(s.comparableCompanies).toBeDefined();
    });

    it('should mark valuationId as required', () => {
      expect(ValuationMethods.schema.valuationId.required).toBe(true);
    });

    it('should mark method as required', () => {
      expect(ValuationMethods.schema.method.required).toBe(true);
    });

    it('should mark weight as required', () => {
      expect(ValuationMethods.schema.weight.required).toBe(true);
    });

    it('should mark methodValue as required', () => {
      expect(ValuationMethods.schema.methodValue.required).toBe(true);
    });
  });

  // ─── create() ───────────────────────────────────────────────

  describe('create()', () => {
    const validData = {
      valuationId: 'val_123',
      method: 'DCF',
      weight: 0.5,
      methodValue: 10000000
    };

    it('should create a method with valid data', async () => {
      const result = await ValuationMethods.create(validData);
      expect(result).toBeDefined();
      expect(result.valuationId).toBe('val_123');
      expect(result.method).toBe('DCF');
      expect(result.weight).toBe(0.5);
      expect(result.methodValue).toBe(10000000);
    });

    it('should auto-generate id with vm_ prefix', async () => {
      const result = await ValuationMethods.create(validData);
      expect(result.id).toMatch(/^vm_/);
    });

    it('should use provided id if given', async () => {
      const result = await ValuationMethods.create({ ...validData, id: 'vm_custom' });
      expect(result.id).toBe('vm_custom');
    });

    it('should default comparableCompanies to empty array', async () => {
      const result = await ValuationMethods.create(validData);
      expect(result.comparableCompanies).toEqual([]);
    });

    it('should throw for invalid method', async () => {
      await expect(ValuationMethods.create({ ...validData, method: 'INVALID' }))
        .rejects.toThrow('Invalid method: INVALID');
    });

    it('should throw for weight < 0', async () => {
      await expect(ValuationMethods.create({ ...validData, weight: -0.5 }))
        .rejects.toThrow('Weight must be between 0 and 1');
    });

    it('should throw for weight > 1', async () => {
      await expect(ValuationMethods.create({ ...validData, weight: 1.5 }))
        .rejects.toThrow('Weight must be between 0 and 1');
    });

    it('should throw for negative methodValue', async () => {
      await expect(ValuationMethods.create({ ...validData, methodValue: -1000 }))
        .rejects.toThrow('Method value must be positive');
    });

    it('should accept weight of 0', async () => {
      const result = await ValuationMethods.create({ ...validData, weight: 0 });
      expect(result.weight).toBe(0);
    });

    it('should accept weight of 1', async () => {
      const result = await ValuationMethods.create({ ...validData, weight: 1 });
      expect(result.weight).toBe(1);
    });

    it('should accept methodValue of 0', async () => {
      const result = await ValuationMethods.create({ ...validData, methodValue: 0 });
      expect(result.methodValue).toBe(0);
    });

    it('should accept all valid method types', async () => {
      for (const method of ValuationMethods.VALUATION_METHODS) {
        const result = await ValuationMethods.create({ ...validData, method });
        expect(result.method).toBe(method);
      }
    });
  });

  // ─── findByValuationId() ───────────────────────────────────

  describe('findByValuationId()', () => {
    it('should find methods by valuation ID', async () => {
      await ValuationMethods.create({
        valuationId: 'val_find', method: 'DCF', weight: 0.5, methodValue: 1000000
      });
      await ValuationMethods.create({
        valuationId: 'val_find', method: 'MARKET_MULTIPLES', weight: 0.5, methodValue: 1200000
      });

      const results = await ValuationMethods.findByValuationId('val_find');
      expect(results.length).toBe(2);
    });

    it('should return empty array for non-existent valuation', async () => {
      const results = await ValuationMethods.findByValuationId('val_nonexistent');
      expect(results).toEqual([]);
    });
  });

  // ─── validateWeights() ─────────────────────────────────────

  describe('validateWeights()', () => {
    it('should return valid when weights sum to 1.0', async () => {
      await ValuationMethods.create({
        valuationId: 'val_w1', method: 'DCF', weight: 0.6, methodValue: 1000000
      });
      await ValuationMethods.create({
        valuationId: 'val_w1', method: 'MARKET_MULTIPLES', weight: 0.4, methodValue: 1200000
      });

      const result = await ValuationMethods.validateWeights('val_w1');
      expect(result.valid).toBe(true);
      expect(result.total).toBe(1);
      expect(result.methods).toBe(2);
      expect(result.error).toBeNull();
    });

    it('should return invalid when weights do not sum to 1.0', async () => {
      await ValuationMethods.create({
        valuationId: 'val_w2', method: 'DCF', weight: 0.3, methodValue: 1000000
      });
      await ValuationMethods.create({
        valuationId: 'val_w2', method: 'MARKET_MULTIPLES', weight: 0.3, methodValue: 1200000
      });

      const result = await ValuationMethods.validateWeights('val_w2');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must equal 1.0');
    });

    it('should return invalid with error when no methods found', async () => {
      const result = await ValuationMethods.validateWeights('val_empty');
      expect(result.valid).toBe(false);
      expect(result.total).toBe(0);
      expect(result.error).toBe('No methods found for valuation');
    });

    it('should handle floating point precision', async () => {
      await ValuationMethods.create({
        valuationId: 'val_fp', method: 'DCF', weight: 0.3333, methodValue: 1000000
      });
      await ValuationMethods.create({
        valuationId: 'val_fp', method: 'MARKET_MULTIPLES', weight: 0.3333, methodValue: 1000000
      });
      await ValuationMethods.create({
        valuationId: 'val_fp', method: 'BACKSOLVE_OPM', weight: 0.3334, methodValue: 1000000
      });

      const result = await ValuationMethods.validateWeights('val_fp');
      expect(result.valid).toBe(true);
    });
  });

  // ─── calculateWeightedValue() ──────────────────────────────

  describe('calculateWeightedValue()', () => {
    it('should calculate weighted average correctly', async () => {
      await ValuationMethods.create({
        valuationId: 'val_calc', method: 'DCF', weight: 0.4, methodValue: 10000000
      });
      await ValuationMethods.create({
        valuationId: 'val_calc', method: 'MARKET_MULTIPLES', weight: 0.6, methodValue: 12000000
      });

      const result = await ValuationMethods.calculateWeightedValue('val_calc');
      // 10M * 0.4 + 12M * 0.6 = 4M + 7.2M = 11.2M
      expect(result).toBe(11200000);
    });

    it('should return null when no methods found', async () => {
      const result = await ValuationMethods.calculateWeightedValue('val_empty');
      expect(result).toBeNull();
    });

    it('should handle single method', async () => {
      await ValuationMethods.create({
        valuationId: 'val_single', method: 'DCF', weight: 1.0, methodValue: 5000000
      });

      const result = await ValuationMethods.calculateWeightedValue('val_single');
      expect(result).toBe(5000000);
    });
  });

  // ─── addMethod() ───────────────────────────────────────────

  describe('addMethod()', () => {
    it('should add a method to a valuation', async () => {
      const result = await ValuationMethods.addMethod('val_add', {
        method: 'PWERM',
        weight: 0.5,
        methodValue: 8000000
      }, 'user_1');

      expect(result).toBeDefined();
      expect(result.valuationId).toBe('val_add');
      expect(result.createdBy).toBe('user_1');
    });
  });

  // ─── updateMethod() ────────────────────────────────────────

  describe('updateMethod()', () => {
    it('should update a method with valid data', async () => {
      const created = await ValuationMethods.create({
        id: 'vm_upd',
        valuationId: 'val_u',
        method: 'DCF',
        weight: 0.5,
        methodValue: 1000000
      });

      const result = await ValuationMethods.updateMethod('vm_upd', {
        weight: 0.7,
        methodValue: 1500000
      }, 'user_1');
      expect(result).toBeDefined();
    });

    it('should throw for invalid method on update', async () => {
      await expect(ValuationMethods.updateMethod('vm_x', {
        method: 'INVALID'
      }, 'user_1')).rejects.toThrow('Invalid method: INVALID');
    });

    it('should throw for invalid weight on update (negative)', async () => {
      await expect(ValuationMethods.updateMethod('vm_x', {
        weight: -0.1
      }, 'user_1')).rejects.toThrow('Weight must be between 0 and 1');
    });

    it('should throw for invalid weight on update (> 1)', async () => {
      await expect(ValuationMethods.updateMethod('vm_x', {
        weight: 1.5
      }, 'user_1')).rejects.toThrow('Weight must be between 0 and 1');
    });

    it('should throw for negative methodValue on update', async () => {
      await expect(ValuationMethods.updateMethod('vm_x', {
        methodValue: -100
      }, 'user_1')).rejects.toThrow('Method value must be positive');
    });

    it('should allow update without method field', async () => {
      const created = await ValuationMethods.create({
        id: 'vm_nomethod',
        valuationId: 'val_nm',
        method: 'DCF',
        weight: 0.5,
        methodValue: 1000000
      });

      const result = await ValuationMethods.updateMethod('vm_nomethod', {
        summary: 'Updated summary'
      }, 'user_1');
      expect(result).toBeDefined();
    });
  });

  // ─── deleteMethod() ────────────────────────────────────────

  describe('deleteMethod()', () => {
    it('should delete a method by ID', async () => {
      await ValuationMethods.create({
        id: 'vm_del',
        valuationId: 'val_d',
        method: 'DCF',
        weight: 1.0,
        methodValue: 1000000
      });

      const result = await ValuationMethods.deleteMethod('vm_del');
      expect(result).toBeDefined();
    });
  });

  // ─── deleteByValuationId() ─────────────────────────────────

  describe('deleteByValuationId()', () => {
    it('should delete all methods for a valuation', async () => {
      await ValuationMethods.create({
        valuationId: 'val_delall', method: 'DCF', weight: 0.5, methodValue: 1000000
      });
      await ValuationMethods.create({
        valuationId: 'val_delall', method: 'PWERM', weight: 0.5, methodValue: 1200000
      });

      const result = await ValuationMethods.deleteByValuationId('val_delall');
      expect(result.deletedCount).toBe(2);
    });

    it('should return deletedCount 0 when no methods found', async () => {
      const result = await ValuationMethods.deleteByValuationId('val_nonexistent');
      expect(result.deletedCount).toBe(0);
    });
  });

  // ─── getMethodSummary() ────────────────────────────────────

  describe('getMethodSummary()', () => {
    it('should return full summary for a valuation', async () => {
      await ValuationMethods.create({
        valuationId: 'val_sum', method: 'DCF', weight: 0.6, methodValue: 10000000
      });
      await ValuationMethods.create({
        valuationId: 'val_sum', method: 'MARKET_MULTIPLES', weight: 0.4, methodValue: 12000000
      });

      const summary = await ValuationMethods.getMethodSummary('val_sum');
      expect(summary.valuationId).toBe('val_sum');
      expect(summary.methodCount).toBe(2);
      expect(summary.methods.length).toBe(2);
      expect(summary.weightsValid).toBe(true);
      expect(summary.totalWeight).toBe(1);
      // 10M * 0.6 + 12M * 0.4 = 6M + 4.8M = 10.8M
      expect(summary.calculatedValue).toBe(10800000);
    });

    it('should handle empty methods', async () => {
      const summary = await ValuationMethods.getMethodSummary('val_nosummary');
      expect(summary.methodCount).toBe(0);
      expect(summary.weightsValid).toBe(false);
      expect(summary.calculatedValue).toBeNull();
    });
  });

  // ─── Delegated base methods ─────────────────────────────────

  describe('Delegated base methods', () => {
    it('should expose find', () => {
      expect(typeof ValuationMethods.find).toBe('function');
    });

    it('should expose findOne', () => {
      expect(typeof ValuationMethods.findOne).toBe('function');
    });

    it('should expose findById', () => {
      expect(typeof ValuationMethods.findById).toBe('function');
    });

    it('should expose updateOne', () => {
      expect(typeof ValuationMethods.updateOne).toBe('function');
    });

    it('should expose deleteOne', () => {
      expect(typeof ValuationMethods.deleteOne).toBe('function');
    });

    it('should expose countDocuments', () => {
      expect(typeof ValuationMethods.countDocuments).toBe('function');
    });
  });
});
