/**
 * EquityPlanModel Tests
 * Feature: Issue #40 - Model Test Coverage
 * Tests for equity plan model validation and custom methods
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

const EquityPlan = require('../../../models/EquityPlanModel');
const zerodbService = require('../../../services/zerodbService');

describe('EquityPlanModel', () => {
  let store = [];
  let idCounter = 0;

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
  });

  // ─── Constants ───────────────────────────────────────────────

  describe('Constants', () => {
    it('should expose PLAN_TYPES', () => {
      expect(EquityPlan.PLAN_TYPES).toEqual(['Stock Option Plan', 'Restricted Stock Plan']);
    });

    it('should expose ALLOCATION_TYPES', () => {
      expect(EquityPlan.ALLOCATION_TYPES).toEqual(['Fixed', 'Performance-Based']);
    });
  });

  // ─── Schema Validation ───────────────────────────────────────

  describe('Schema Validation', () => {
    it('should have the correct schema fields', () => {
      expect(EquityPlan.schema).toBeDefined();
      expect(EquityPlan.schema.planId).toBeDefined();
      expect(EquityPlan.schema.planName).toBeDefined();
      expect(EquityPlan.schema.startDate).toBeDefined();
      expect(EquityPlan.schema.endDate).toBeDefined();
      expect(EquityPlan.schema.allocation).toBeDefined();
      expect(EquityPlan.schema.participants).toBeDefined();
      expect(EquityPlan.schema.PlanType).toBeDefined();
      expect(EquityPlan.schema.AllocationType).toBeDefined();
    });

    it('should require planId', () => {
      expect(EquityPlan.schema.planId.required).toBe(true);
      expect(EquityPlan.schema.planId.unique).toBe(true);
    });

    it('should require planName', () => {
      expect(EquityPlan.schema.planName.required).toBe(true);
    });

    it('should require startDate', () => {
      expect(EquityPlan.schema.startDate.required).toBe(true);
    });

    it('should require allocation', () => {
      expect(EquityPlan.schema.allocation.required).toBe(true);
    });

    it('should require PlanType with enum', () => {
      expect(EquityPlan.schema.PlanType.required).toBe(true);
      expect(EquityPlan.schema.PlanType.enum).toEqual(['Stock Option Plan', 'Restricted Stock Plan']);
    });

    it('should have AllocationType with enum', () => {
      expect(EquityPlan.schema.AllocationType.enum).toEqual(['Fixed', 'Performance-Based']);
    });

    it('should define participants as array type', () => {
      expect(EquityPlan.schema.participants.type).toBe('array');
    });

    it('should define VestingTerms as object type', () => {
      expect(EquityPlan.schema.VestingTerms.type).toBe('object');
    });
  });

  // ─── Create ──────────────────────────────────────────────────

  describe('create()', () => {
    const validPlan = {
      planId: 'plan-001',
      planName: '2026 Stock Option Plan',
      startDate: '2026-01-01',
      allocation: 1000000,
      PlanType: 'Stock Option Plan'
    };

    it('should create a valid equity plan', async () => {
      const result = await EquityPlan.create(validPlan);

      expect(result).toBeDefined();
      expect(result.planId).toBe('plan-001');
      expect(result.planName).toBe('2026 Stock Option Plan');
      expect(result._type).toBe('equity_plan');
    });

    it('should default participants to empty array', async () => {
      const result = await EquityPlan.create(validPlan);
      expect(result.participants).toEqual([]);
    });

    it('should preserve provided participants', async () => {
      const result = await EquityPlan.create({
        ...validPlan,
        participants: ['emp-001', 'emp-002']
      });
      expect(result.participants).toEqual(['emp-001', 'emp-002']);
    });

    it('should throw validation error if planId is missing', async () => {
      const data = { ...validPlan, planId: undefined };
      await expect(EquityPlan.create(data)).rejects.toThrow(/planId is required/);
    });

    it('should throw validation error if planName is missing', async () => {
      const data = { ...validPlan, planName: undefined };
      await expect(EquityPlan.create(data)).rejects.toThrow(/planName is required/);
    });

    it('should throw validation error if startDate is missing', async () => {
      const data = { ...validPlan, startDate: undefined };
      await expect(EquityPlan.create(data)).rejects.toThrow(/startDate is required/);
    });

    it('should throw validation error if allocation is missing', async () => {
      const data = { ...validPlan, allocation: undefined };
      await expect(EquityPlan.create(data)).rejects.toThrow(/allocation is required/);
    });

    it('should throw validation error if PlanType is missing', async () => {
      const data = { ...validPlan, PlanType: undefined };
      await expect(EquityPlan.create(data)).rejects.toThrow(/PlanType is required/);
    });

    it('should throw validation error for invalid PlanType', async () => {
      const data = { ...validPlan, PlanType: 'Invalid Plan' };
      await expect(EquityPlan.create(data)).rejects.toThrow(/PlanType must be one of/);
    });

    it('should throw validation error for invalid AllocationType', async () => {
      const data = { ...validPlan, AllocationType: 'Invalid' };
      await expect(EquityPlan.create(data)).rejects.toThrow(/AllocationType must be one of/);
    });

    it('should accept valid AllocationType', async () => {
      const result = await EquityPlan.create({
        ...validPlan,
        AllocationType: 'Fixed'
      });
      expect(result.AllocationType).toBe('Fixed');
    });

    it('should accept Restricted Stock Plan type', async () => {
      const result = await EquityPlan.create({
        ...validPlan,
        PlanType: 'Restricted Stock Plan'
      });
      expect(result.PlanType).toBe('Restricted Stock Plan');
    });
  });

  // ─── findByPlanId ────────────────────────────────────────────

  describe('findByPlanId()', () => {
    it('should find a plan by its planId', async () => {
      await EquityPlan.create({
        planId: 'plan-find-001',
        planName: 'Test Plan',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });

      const found = await EquityPlan.findByPlanId('plan-find-001');
      expect(found).toBeDefined();
      expect(found.planName).toBe('Test Plan');
    });

    it('should return null for non-existent planId', async () => {
      const found = await EquityPlan.findByPlanId('plan-nonexistent');
      expect(found).toBeNull();
    });
  });

  // ─── findByType ──────────────────────────────────────────────

  describe('findByType()', () => {
    it('should find plans by type', async () => {
      await EquityPlan.create({
        planId: 'plan-type-001',
        planName: 'Option Plan 1',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });
      await EquityPlan.create({
        planId: 'plan-type-002',
        planName: 'RSU Plan 1',
        startDate: '2026-01-01',
        allocation: 300000,
        PlanType: 'Restricted Stock Plan'
      });

      const options = await EquityPlan.findByType('Stock Option Plan');
      expect(options.length).toBe(1);
      expect(options[0].planName).toBe('Option Plan 1');
    });

    it('should throw for invalid plan type', async () => {
      await expect(
        EquityPlan.findByType('Invalid Type')
      ).rejects.toThrow(/Invalid PlanType/);
    });
  });

  // ─── findActive ──────────────────────────────────────────────

  describe('findActive()', () => {
    it('should return plans with no endDate', async () => {
      await EquityPlan.create({
        planId: 'plan-active-001',
        planName: 'Active Plan',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });

      const active = await EquityPlan.findActive();
      expect(active.length).toBe(1);
    });

    it('should return plans with future endDate', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await EquityPlan.create({
        planId: 'plan-active-002',
        planName: 'Future Plan',
        startDate: '2026-01-01',
        endDate: futureDate.toISOString(),
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });

      const active = await EquityPlan.findActive();
      expect(active.length).toBe(1);
    });

    it('should exclude plans with past endDate', async () => {
      await EquityPlan.create({
        planId: 'plan-expired-001',
        planName: 'Expired Plan',
        startDate: '2020-01-01',
        endDate: '2023-12-31',
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });

      const active = await EquityPlan.findActive();
      expect(active.length).toBe(0);
    });
  });

  // ─── Participant Management ──────────────────────────────────

  describe('addParticipant()', () => {
    it('should add a participant to a plan', async () => {
      await EquityPlan.create({
        planId: 'plan-part-001',
        planName: 'Participant Plan',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });

      const updated = await EquityPlan.addParticipant('plan-part-001', 'emp-001');
      expect(updated.participants).toContain('emp-001');
    });

    it('should not duplicate participants', async () => {
      await EquityPlan.create({
        planId: 'plan-part-002',
        planName: 'No Dup Plan',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan',
        participants: ['emp-001']
      });

      const updated = await EquityPlan.addParticipant('plan-part-002', 'emp-001');
      const empCount = updated.participants.filter(p => p === 'emp-001').length;
      expect(empCount).toBe(1);
    });

    it('should throw if plan not found', async () => {
      await expect(
        EquityPlan.addParticipant('plan-nonexistent', 'emp-001')
      ).rejects.toThrow(/Equity plan not found/);
    });
  });

  describe('removeParticipant()', () => {
    it('should remove a participant from a plan', async () => {
      await EquityPlan.create({
        planId: 'plan-rem-001',
        planName: 'Remove Plan',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan',
        participants: ['emp-001', 'emp-002']
      });

      const updated = await EquityPlan.removeParticipant('plan-rem-001', 'emp-001');
      expect(updated.participants).not.toContain('emp-001');
      expect(updated.participants).toContain('emp-002');
    });

    it('should throw if plan not found', async () => {
      await expect(
        EquityPlan.removeParticipant('plan-nonexistent', 'emp-001')
      ).rejects.toThrow(/Equity plan not found/);
    });
  });

  describe('findByParticipant()', () => {
    it('should find plans containing a participant', async () => {
      await EquityPlan.create({
        planId: 'plan-fp-001',
        planName: 'Plan with emp-001',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan',
        participants: ['emp-001', 'emp-002']
      });
      await EquityPlan.create({
        planId: 'plan-fp-002',
        planName: 'Plan without emp-001',
        startDate: '2026-01-01',
        allocation: 300000,
        PlanType: 'Restricted Stock Plan',
        participants: ['emp-003']
      });

      const results = await EquityPlan.findByParticipant('emp-001');
      expect(results.length).toBe(1);
      expect(results[0].planId).toBe('plan-fp-001');
    });

    it('should return empty array when participant not in any plan', async () => {
      const results = await EquityPlan.findByParticipant('emp-nonexistent');
      expect(results).toEqual([]);
    });
  });

  // ─── find and findOne ────────────────────────────────────────

  describe('find() and findOne()', () => {
    it('should filter by _type equity_plan in find', async () => {
      await EquityPlan.create({
        planId: 'plan-ff-001',
        planName: 'Find Plan',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });

      const results = await EquityPlan.find({});
      expect(results.length).toBe(1);
      expect(results[0]._type).toBe('equity_plan');
    });

    it('should filter by _type equity_plan in findOne', async () => {
      await EquityPlan.create({
        planId: 'plan-fo-001',
        planName: 'FindOne Plan',
        startDate: '2026-01-01',
        allocation: 500000,
        PlanType: 'Stock Option Plan'
      });

      const result = await EquityPlan.findOne({ planId: 'plan-fo-001' });
      expect(result).toBeDefined();
      expect(result._type).toBe('equity_plan');
    });
  });

  // ─── countDocuments ──────────────────────────────────────────

  describe('countDocuments()', () => {
    it('should count matching documents', async () => {
      // countDocuments uses queryTable with a filter - we need to mock the total
      zerodbService.queryTable.mockImplementationOnce(() =>
        Promise.resolve({ total: 3 })
      );

      const count = await EquityPlan.countDocuments({});
      expect(count).toBe(3);
    });
  });
});
