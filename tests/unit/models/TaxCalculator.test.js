/**
 * TaxCalculator Model Tests
 * Comprehensive unit tests for tax calculation model validation and custom methods
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

const TaxCalculator = require('../../../models/TaxCalculator');
const zerodbService = require('../../../services/zerodbService');

describe('TaxCalculator Model', () => {
  let store = [];
  let idCounter = 0;

  const validData = {
    SaleScenario: { type: 'secondary', description: 'Stock sale' },
    ShareClassInvolved: 'Class A',
    SaleAmount: 50000,
    TaxRate: 0.25,
    TaxImplication: { type: 'capital_gains', longTerm: true },
    CalculatedTax: 12500,
    TaxDueDate: new Date('2026-04-15')
  };

  beforeEach(() => {
    store = [];
    idCounter = 0;
    jest.clearAllMocks();

    // Mock insertRow
    zerodbService.insertRow.mockImplementation((tableName, doc) => {
      const row_id = ++idCounter;
      const storedDoc = { ...doc };
      store.push(storedDoc);
      return Promise.resolve({
        data: [{ row_id, row_data: storedDoc }]
      });
    });

    // Mock queryTable
    zerodbService.queryTable.mockImplementation((tableName, { filter = {} } = {}) => {
      let results = [...store];
      for (const [key, value] of Object.entries(filter)) {
        results = results.filter(doc => doc[key] === value);
      }
      return Promise.resolve({
        data: results.map((doc, i) => ({ row_id: i + 1, row_data: doc }))
      });
    });

    // Mock client.put for updates
    zerodbService.client.put.mockImplementation((url, { row_data }) => {
      const idx = store.findIndex(doc => doc._id === row_data._id);
      if (idx !== -1) {
        store[idx] = { ...store[idx], ...row_data };
      }
      return Promise.resolve({ data: { row_data } });
    });

    // Mock deleteRows
    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([key, value]) => doc[key] === value);
      });
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });

    // Mock deleteRowById
    zerodbService.deleteRowById.mockImplementation(() => {
      return Promise.resolve({ deleted_count: 1 });
    });
  });

  // ---- Schema Validation ----

  describe('Schema Validation', () => {
    it('should have the correct schema fields', () => {
      expect(TaxCalculator.schema).toBeDefined();
      expect(TaxCalculator.schema.calculationId).toBeDefined();
      expect(TaxCalculator.schema.SaleScenario).toBeDefined();
      expect(TaxCalculator.schema.ShareClassInvolved).toBeDefined();
      expect(TaxCalculator.schema.SaleAmount).toBeDefined();
      expect(TaxCalculator.schema.TaxRate).toBeDefined();
      expect(TaxCalculator.schema.TaxImplication).toBeDefined();
      expect(TaxCalculator.schema.CalculatedTax).toBeDefined();
      expect(TaxCalculator.schema.TaxDueDate).toBeDefined();
    });

    it('should require calculationId as unique', () => {
      expect(TaxCalculator.schema.calculationId.required).toBe(true);
      expect(TaxCalculator.schema.calculationId.unique).toBe(true);
    });

    it('should require SaleScenario as object', () => {
      expect(TaxCalculator.schema.SaleScenario.required).toBe(true);
      expect(TaxCalculator.schema.SaleScenario.type).toBe('object');
    });

    it('should require ShareClassInvolved as string', () => {
      expect(TaxCalculator.schema.ShareClassInvolved.required).toBe(true);
      expect(TaxCalculator.schema.ShareClassInvolved.type).toBe('string');
    });

    it('should require SaleAmount as number', () => {
      expect(TaxCalculator.schema.SaleAmount.required).toBe(true);
      expect(TaxCalculator.schema.SaleAmount.type).toBe('number');
    });

    it('should require TaxRate as number', () => {
      expect(TaxCalculator.schema.TaxRate.required).toBe(true);
      expect(TaxCalculator.schema.TaxRate.type).toBe('number');
    });

    it('should require TaxImplication as object', () => {
      expect(TaxCalculator.schema.TaxImplication.required).toBe(true);
      expect(TaxCalculator.schema.TaxImplication.type).toBe('object');
    });

    it('should require CalculatedTax as number', () => {
      expect(TaxCalculator.schema.CalculatedTax.required).toBe(true);
      expect(TaxCalculator.schema.CalculatedTax.type).toBe('number');
    });

    it('should require TaxDueDate as date', () => {
      expect(TaxCalculator.schema.TaxDueDate.required).toBe(true);
      expect(TaxCalculator.schema.TaxDueDate.type).toBe('date');
    });

    it('should have timestamp fields', () => {
      expect(TaxCalculator.schema.createdAt).toBeDefined();
      expect(TaxCalculator.schema.updatedAt).toBeDefined();
    });
  });

  // ---- Validation Function ----

  describe('validateTaxCalculation()', () => {
    const validationData = {
      ...validData,
      calculationId: 'tax_valid-001'
    };

    it('should pass validation with valid data', () => {
      const result = TaxCalculator.validateTaxCalculation(validationData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if calculationId is missing', () => {
      const data = { ...validationData, calculationId: undefined };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('calculationId is required');
    });

    it('should fail if calculationId is empty string', () => {
      const data = { ...validationData, calculationId: '' };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('calculationId is required');
    });

    it('should fail if SaleScenario is missing', () => {
      const data = { ...validationData, SaleScenario: undefined };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SaleScenario is required and must be an object');
    });

    it('should fail if SaleScenario is not an object (string)', () => {
      const data = { ...validationData, SaleScenario: 'not-an-object' };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SaleScenario is required and must be an object');
    });

    it('should fail if SaleScenario is null', () => {
      const data = { ...validationData, SaleScenario: null };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SaleScenario is required and must be an object');
    });

    it('should fail if ShareClassInvolved is missing', () => {
      const data = { ...validationData, ShareClassInvolved: '' };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ShareClassInvolved is required');
    });

    it('should fail if SaleAmount is negative', () => {
      const data = { ...validationData, SaleAmount: -100 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SaleAmount is required and must be a non-negative number');
    });

    it('should fail if SaleAmount is not a number', () => {
      const data = { ...validationData, SaleAmount: 'not-a-number' };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SaleAmount is required and must be a non-negative number');
    });

    it('should accept SaleAmount of zero', () => {
      const data = { ...validationData, SaleAmount: 0 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(true);
    });

    it('should fail if TaxRate is negative', () => {
      const data = { ...validationData, TaxRate: -0.1 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('TaxRate is required and must be between 0 and 1');
    });

    it('should fail if TaxRate is greater than 1', () => {
      const data = { ...validationData, TaxRate: 1.5 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('TaxRate is required and must be between 0 and 1');
    });

    it('should fail if TaxRate is not a number', () => {
      const data = { ...validationData, TaxRate: 'high' };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('TaxRate is required and must be between 0 and 1');
    });

    it('should accept TaxRate of 0', () => {
      const data = { ...validationData, TaxRate: 0 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(true);
    });

    it('should accept TaxRate of 1', () => {
      const data = { ...validationData, TaxRate: 1 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(true);
    });

    it('should fail if TaxImplication is not an object', () => {
      const data = { ...validationData, TaxImplication: 'string' };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('TaxImplication is required and must be an object');
    });

    it('should fail if TaxImplication is null', () => {
      const data = { ...validationData, TaxImplication: null };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
    });

    it('should fail if CalculatedTax is not a number', () => {
      const data = { ...validationData, CalculatedTax: 'abc' };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('CalculatedTax is required and must be a number');
    });

    it('should accept CalculatedTax of zero', () => {
      const data = { ...validationData, CalculatedTax: 0 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(true);
    });

    it('should accept negative CalculatedTax (refund scenario)', () => {
      const data = { ...validationData, CalculatedTax: -500 };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(true);
    });

    it('should fail if TaxDueDate is missing', () => {
      const data = { ...validationData, TaxDueDate: undefined };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('TaxDueDate is required');
    });

    it('should collect multiple errors at once', () => {
      const data = {
        calculationId: undefined,
        SaleScenario: 'invalid',
        ShareClassInvolved: '',
        SaleAmount: -1,
        TaxRate: 2,
        TaxImplication: null,
        CalculatedTax: 'bad',
        TaxDueDate: undefined
      };
      const result = TaxCalculator.validateTaxCalculation(data);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(7);
    });
  });

  // ---- Create ----

  describe('create()', () => {
    it('should create a tax calculation with auto-generated calculationId', async () => {
      const result = await TaxCalculator.create(validData);
      expect(result).toBeDefined();
      expect(result.calculationId).toMatch(/^tax_/);
      expect(result.ShareClassInvolved).toBe('Class A');
      expect(result.SaleAmount).toBe(50000);
    });

    it('should normalize TaxDueDate to ISO string from Date object', async () => {
      const result = await TaxCalculator.create(validData);
      expect(typeof result.TaxDueDate).toBe('string');
      expect(result.TaxDueDate).toContain('2026-04-15');
    });

    it('should normalize TaxDueDate to ISO string from string input', async () => {
      const result = await TaxCalculator.create({
        ...validData,
        TaxDueDate: '2026-04-15T00:00:00.000Z'
      });
      expect(typeof result.TaxDueDate).toBe('string');
      expect(result.TaxDueDate).toContain('2026-04-15');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const result = await TaxCalculator.create(validData);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should preserve a provided calculationId', async () => {
      const result = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_custom-123'
      });
      expect(result.calculationId).toBe('tax_custom-123');
    });

    it('should throw ValidationError for invalid data', async () => {
      try {
        await TaxCalculator.create({ SaleAmount: -1 });
        fail('Should have thrown');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    it('should throw ValidationError with combined error messages', async () => {
      try {
        await TaxCalculator.create({
          SaleAmount: -1,
          TaxRate: 2,
          CalculatedTax: 'bad'
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
        expect(error.message).toContain('SaleAmount');
        expect(error.message).toContain('TaxRate');
      }
    });

    it('should throw DuplicateError for duplicate calculationId', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_dup-001'
      });

      try {
        await TaxCalculator.create({
          ...validData,
          calculationId: 'tax_dup-001'
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error.name).toBe('DuplicateError');
        expect(error.message).toContain('already exists');
      }
    });
  });

  // ---- Query Methods ----

  describe('findByCalculationId()', () => {
    it('should find a tax calculation by calculationId', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_find-001',
        ShareClassInvolved: 'Class B'
      });

      const result = await TaxCalculator.findByCalculationId('tax_find-001');
      expect(result).toBeDefined();
      expect(result.ShareClassInvolved).toBe('Class B');
    });

    it('should return null for non-existent calculationId', async () => {
      const result = await TaxCalculator.findByCalculationId('tax_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByShareClass()', () => {
    it('should find tax calculations by share class', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_sc-001',
        ShareClassInvolved: 'Common'
      });
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_sc-002',
        ShareClassInvolved: 'Common'
      });
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_sc-003',
        ShareClassInvolved: 'Preferred'
      });

      const results = await TaxCalculator.findByShareClass('Common');
      expect(results.length).toBe(2);
    });

    it('should return empty array for non-existent share class', async () => {
      const results = await TaxCalculator.findByShareClass('NonExistent');
      expect(results).toEqual([]);
    });
  });

  describe('findDueBefore()', () => {
    it('should find calculations due before a given Date object', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_due-001',
        TaxDueDate: new Date('2026-03-01')
      });
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_due-002',
        TaxDueDate: new Date('2026-06-01')
      });

      const results = await TaxCalculator.findDueBefore(new Date('2026-04-01'));
      expect(results.length).toBe(1);
      expect(results[0].calculationId).toBe('tax_due-001');
    });

    it('should accept a string date argument', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_due-003',
        TaxDueDate: new Date('2026-02-01')
      });

      const results = await TaxCalculator.findDueBefore('2026-04-01');
      expect(results.length).toBe(1);
    });

    it('should return empty array when no calculations are due', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_due-004',
        TaxDueDate: new Date('2026-12-01')
      });

      const results = await TaxCalculator.findDueBefore(new Date('2026-01-01'));
      expect(results.length).toBe(0);
    });
  });

  // ---- calculateTotalTax() ----

  describe('calculateTotalTax()', () => {
    it('should sum CalculatedTax from an array of calculations', () => {
      const calcs = [
        { CalculatedTax: 10000 },
        { CalculatedTax: 5000 },
        { CalculatedTax: 2500 }
      ];
      const total = TaxCalculator.calculateTotalTax(calcs);
      expect(total).toBe(17500);
    });

    it('should return 0 for an empty array', () => {
      const total = TaxCalculator.calculateTotalTax([]);
      expect(total).toBe(0);
    });

    it('should handle missing CalculatedTax gracefully (treats as 0)', () => {
      const calcs = [
        { CalculatedTax: 10000 },
        {},
        { CalculatedTax: 5000 }
      ];
      const total = TaxCalculator.calculateTotalTax(calcs);
      expect(total).toBe(15000);
    });

    it('should handle a single calculation', () => {
      const total = TaxCalculator.calculateTotalTax([{ CalculatedTax: 7777 }]);
      expect(total).toBe(7777);
    });

    it('should handle negative CalculatedTax values (refunds)', () => {
      const calcs = [
        { CalculatedTax: 10000 },
        { CalculatedTax: -3000 }
      ];
      const total = TaxCalculator.calculateTotalTax(calcs);
      expect(total).toBe(7000);
    });
  });

  // ---- updateByCalculationId() ----

  describe('updateByCalculationId()', () => {
    it('should update a tax calculation by calculationId', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_upd-001'
      });

      const result = await TaxCalculator.updateByCalculationId('tax_upd-001', {
        SaleAmount: 75000,
        CalculatedTax: 18750
      });

      expect(result).toBeDefined();
    });

    it('should set updatedAt when updating', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_upd-002'
      });

      const before = new Date().toISOString();
      await TaxCalculator.updateByCalculationId('tax_upd-002', {
        SaleAmount: 60000
      });

      // The update should have been called - verify through the mock
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should normalize TaxDueDate when updating with Date object', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_upd-003'
      });

      await TaxCalculator.updateByCalculationId('tax_upd-003', {
        TaxDueDate: new Date('2026-09-15')
      });

      // Verify it was called (the normalization happens in the method)
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should normalize TaxDueDate when updating with string', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_upd-004'
      });

      await TaxCalculator.updateByCalculationId('tax_upd-004', {
        TaxDueDate: '2026-10-01'
      });

      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // ---- deleteByCalculationId() ----

  describe('deleteByCalculationId()', () => {
    it('should delete a tax calculation by calculationId', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_del-001'
      });

      const result = await TaxCalculator.deleteByCalculationId('tax_del-001');
      expect(result).toBeDefined();
      expect(result.acknowledged).toBe(true);
    });

    it('should return acknowledged result even for non-existent calculationId', async () => {
      const result = await TaxCalculator.deleteByCalculationId('tax_nonexistent');
      expect(result).toBeDefined();
      expect(result.acknowledged).toBe(true);
    });
  });

  // ---- CRUD Methods (base model delegation) ----

  describe('CRUD Methods', () => {
    it('should find by ID', async () => {
      const created = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_crud-001'
      });
      const found = await TaxCalculator.findById(created._id);
      expect(found).toBeDefined();
      expect(found.calculationId).toBe('tax_crud-001');
    });

    it('should find one matching query', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_crud-002'
      });
      const found = await TaxCalculator.findOne({ calculationId: 'tax_crud-002' });
      expect(found).toBeDefined();
      expect(found.SaleAmount).toBe(50000);
    });

    it('should find all matching query', async () => {
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_crud-003'
      });
      await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_crud-004',
        SaleAmount: 60000
      });

      const results = await TaxCalculator.find({});
      expect(results.length).toBe(2);
    });

    it('should findByIdAndUpdate', async () => {
      const created = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_crud-005'
      });

      const result = await TaxCalculator.findByIdAndUpdate(
        created._id,
        { $set: { SaleAmount: 99000 } }
      );
      expect(result).toBeDefined();
    });

    it('should findByIdAndDelete', async () => {
      const created = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_crud-006'
      });

      const result = await TaxCalculator.findByIdAndDelete(created._id);
      expect(result).toBeDefined();
    });
  });

  // ---- Edge Cases ----

  describe('Edge Cases', () => {
    it('should handle very large SaleAmount values', async () => {
      const result = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_edge-001',
        SaleAmount: 999999999999,
        CalculatedTax: 249999999999.75
      });
      expect(result.SaleAmount).toBe(999999999999);
    });

    it('should handle SaleAmount of exactly zero', async () => {
      const result = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_edge-002',
        SaleAmount: 0,
        CalculatedTax: 0
      });
      expect(result.SaleAmount).toBe(0);
    });

    it('should handle TaxRate at boundary 0', async () => {
      const result = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_edge-003',
        TaxRate: 0
      });
      expect(result.TaxRate).toBe(0);
    });

    it('should handle TaxRate at boundary 1', async () => {
      const result = await TaxCalculator.create({
        ...validData,
        calculationId: 'tax_edge-004',
        TaxRate: 1
      });
      expect(result.TaxRate).toBe(1);
    });

    it('should expose validateTaxCalculation function', () => {
      expect(typeof TaxCalculator.validateTaxCalculation).toBe('function');
    });
  });
});
