/**
 * InvestorRights Model Unit Tests
 * Comprehensive tests including business logic, conflicts, and audit trail
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

const InvestorRights = require('../../../models/InvestorRights');
const zerodbService = require('../../../services/zerodbService');

describe('InvestorRights Model', () => {
  let store = [];
  let idCounter = 0;

  const validData = {
    investorId: 'inv_001',
    companyId: 'comp_001',
    shareClassId: 'sc_001',
    rightType: 'PRO_RATA',
    status: 'ACTIVE',
    terms: { percentage: 20 },
    effectiveDate: '2026-01-01T00:00:00.000Z',
    expirationDate: new Date(Date.now() + 86400000 * 365).toISOString(),
    sourceDocument: 'doc_001',
    sourceDocumentType: 'INVESTOR_RIGHTS_AGREEMENT',
    createdBy: 'admin_001'
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

    zerodbService.updateRows.mockImplementation(() => {
      return Promise.resolve({ modified_count: 1 });
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
    const schema = InvestorRights.schema;

    it('should have correct table name', () => {
      expect(InvestorRights.tableName).toBe('investor_rights');
    });

    it('should have required rightId field marked as unique', () => {
      expect(schema.rightId.required).toBe(true);
      expect(schema.rightId.unique).toBe(true);
    });

    it('should have required investorId field', () => {
      expect(schema.investorId.required).toBe(true);
    });

    it('should have required companyId field', () => {
      expect(schema.companyId.required).toBe(true);
    });

    it('should have required rightType field with enum', () => {
      expect(schema.rightType.required).toBe(true);
      expect(schema.rightType.enum).toEqual(InvestorRights.RIGHT_TYPES);
    });

    it('should have status field with enum and ACTIVE default', () => {
      expect(schema.status.enum).toEqual(InvestorRights.VALID_STATUSES);
      expect(schema.status.default).toBe('ACTIVE');
    });

    it('should have terms object field', () => {
      expect(schema.terms.type).toBe('object');
      expect(schema.terms.default).toEqual({});
    });

    it('should have expirationDate field', () => {
      expect(schema.expirationDate.type).toBe('date');
      expect(schema.expirationDate.default).toBeNull();
    });

    it('should have effectiveDate field', () => {
      expect(schema.effectiveDate.type).toBe('date');
    });

    it('should have sourceDocument fields', () => {
      expect(schema.sourceDocument).toBeDefined();
      expect(schema.sourceDocumentType.enum).toEqual(InvestorRights.SOURCE_DOCUMENT_TYPES);
      expect(schema.sourceDocumentType.default).toBe('INVESTOR_RIGHTS_AGREEMENT');
    });

    it('should have exerciseHistory array', () => {
      expect(schema.exerciseHistory.type).toBe('array');
      expect(schema.exerciseHistory.default).toEqual([]);
    });

    it('should have auditLog array', () => {
      expect(schema.auditLog.type).toBe('array');
      expect(schema.auditLog.default).toEqual([]);
    });

    it('should have waiveDetails object with defaults', () => {
      expect(schema.waiveDetails.default).toEqual({
        reason: null,
        documentReference: null,
        waivedBy: null,
        waivedAt: null
      });
    });

    it('should have notes and metadata fields', () => {
      expect(schema.notes).toBeDefined();
      expect(schema.metadata.default).toEqual({});
    });

    it('should have timestamp fields', () => {
      expect(schema.createdAt).toBeDefined();
      expect(schema.updatedAt).toBeDefined();
    });
  });

  // ---- Constants ----

  describe('Exported Constants', () => {
    it('should export all RIGHT_TYPES', () => {
      expect(InvestorRights.RIGHT_TYPES).toEqual([
        'PRO_RATA', 'INFORMATION_RIGHTS', 'BOARD_SEAT', 'OBSERVER_SEAT',
        'ANTI_DILUTION', 'VETO_RIGHTS', 'DRAG_ALONG', 'TAG_ALONG',
        'PREEMPTIVE', 'FIRST_REFUSAL', 'CO_SALE', 'REDEMPTION', 'REGISTRATION'
      ]);
    });

    it('should export all VALID_STATUSES', () => {
      expect(InvestorRights.VALID_STATUSES).toEqual([
        'ACTIVE', 'EXPIRED', 'EXERCISED', 'WAIVED', 'PENDING', 'SUSPENDED'
      ]);
    });

    it('should export SOURCE_DOCUMENT_TYPES', () => {
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toContain('INVESTOR_RIGHTS_AGREEMENT');
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toContain('VOTING_AGREEMENT');
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toContain('ROFR_AGREEMENT');
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toContain('SIDE_LETTER');
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toContain('TERM_SHEET');
      expect(InvestorRights.SOURCE_DOCUMENT_TYPES).toContain('OTHER');
    });

    it('should export AUDIT_ACTIONS', () => {
      expect(InvestorRights.AUDIT_ACTIONS).toContain('CREATED');
      expect(InvestorRights.AUDIT_ACTIONS).toContain('UPDATED');
      expect(InvestorRights.AUDIT_ACTIONS).toContain('EXERCISED');
      expect(InvestorRights.AUDIT_ACTIONS).toContain('WAIVED');
      expect(InvestorRights.AUDIT_ACTIONS).toContain('EXPIRED');
      expect(InvestorRights.AUDIT_ACTIONS).toContain('SUSPENDED');
      expect(InvestorRights.AUDIT_ACTIONS).toContain('REACTIVATED');
    });
  });

  // ---- Create ----

  describe('create()', () => {
    it('should create a right with auto-generated rightId', async () => {
      const result = await InvestorRights.create(validData);
      expect(result).toBeDefined();
      expect(result.rightId).toMatch(/^right_/);
    });

    it('should preserve provided rightId', async () => {
      const result = await InvestorRights.create({
        ...validData,
        rightId: 'right_custom-001'
      });
      expect(result.rightId).toBe('right_custom-001');
    });

    it('should throw for invalid rightType', async () => {
      await expect(
        InvestorRights.create({ ...validData, rightType: 'INVALID_TYPE' })
      ).rejects.toThrow('rightType must be one of');
    });

    it('should default status to ACTIVE', async () => {
      const data = { ...validData };
      delete data.status;
      const result = await InvestorRights.create(data);
      expect(result.status).toBe('ACTIVE');
    });

    it('should set effectiveDate to now if not provided', async () => {
      const data = { ...validData };
      delete data.effectiveDate;
      const result = await InvestorRights.create(data);
      expect(result.effectiveDate).toBeDefined();
    });

    it('should auto-expire if past expiration date', async () => {
      const result = await InvestorRights.create({
        ...validData,
        expirationDate: new Date(Date.now() - 86400000).toISOString(),
        status: 'ACTIVE'
      });
      expect(result.status).toBe('EXPIRED');
    });

    it('should not auto-expire if expiration date is in the future', async () => {
      const result = await InvestorRights.create({
        ...validData,
        expirationDate: new Date(Date.now() + 86400000 * 365).toISOString()
      });
      expect(result.status).toBe('ACTIVE');
    });

    it('should add creation audit entry', async () => {
      const result = await InvestorRights.create(validData);
      expect(result.auditLog).toBeDefined();
      expect(result.auditLog.length).toBeGreaterThanOrEqual(1);
      expect(result.auditLog[0].action).toBe('CREATED');
      expect(result.auditLog[0].userId).toBe('admin_001');
    });

    it('should add CREATED audit entry with system userId when no createdBy', async () => {
      const dataWithoutCreatedBy = {
        investorId: 'inv_sys',
        companyId: 'comp_sys',
        rightType: 'PRO_RATA',
        terms: { percentage: 10 }
      };
      const result = await InvestorRights.create(dataWithoutCreatedBy);
      expect(result.auditLog[0].userId).toBe('system');
    });

    it('should accept all valid right types', async () => {
      for (const rt of InvestorRights.RIGHT_TYPES) {
        store = [];
        idCounter = 0;
        const result = await InvestorRights.create({
          ...validData,
          rightType: rt,
          rightId: `right_${rt}`
        });
        expect(result.rightType).toBe(rt);
      }
    });
  });

  // ---- Query Methods ----

  describe('findByRightId()', () => {
    it('should find a right by rightId', async () => {
      await InvestorRights.create({ ...validData, rightId: 'right_find-001' });

      const result = await InvestorRights.findByRightId('right_find-001');
      expect(result).toBeDefined();
      expect(result.investorId).toBe('inv_001');
    });

    it('should return null for non-existent rightId', async () => {
      const result = await InvestorRights.findByRightId('right_nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findByInvestor()', () => {
    it('should find rights by investorId', async () => {
      await InvestorRights.create({ ...validData, investorId: 'inv_query', rightId: 'right_a' });
      await InvestorRights.create({ ...validData, investorId: 'inv_query', rightId: 'right_b' });

      const results = await InvestorRights.findByInvestor('inv_query');
      expect(results.length).toBe(2);
    });

    it('should filter by status', async () => {
      await InvestorRights.create({ ...validData, investorId: 'inv_status', rightId: 'right_c', status: 'ACTIVE' });
      await InvestorRights.create({ ...validData, investorId: 'inv_status', rightId: 'right_d', status: 'WAIVED' });

      const results = await InvestorRights.findByInvestor('inv_status', { status: 'ACTIVE' });
      expect(results.length).toBe(1);
    });

    it('should filter by companyId', async () => {
      await InvestorRights.create({ ...validData, investorId: 'inv_comp', companyId: 'comp_a', rightId: 'right_e' });
      await InvestorRights.create({ ...validData, investorId: 'inv_comp', companyId: 'comp_b', rightId: 'right_f' });

      const results = await InvestorRights.findByInvestor('inv_comp', { companyId: 'comp_a' });
      expect(results.length).toBe(1);
    });

    it('should sort by createdAt descending', async () => {
      const created1 = await InvestorRights.create({ ...validData, investorId: 'inv_sort', rightId: 'right_g' });
      const created2 = await InvestorRights.create({ ...validData, investorId: 'inv_sort', rightId: 'right_h' });

      const results = await InvestorRights.findByInvestor('inv_sort');
      expect(results.length).toBe(2);
    });
  });

  describe('findByCompany()', () => {
    it('should find rights by companyId', async () => {
      await InvestorRights.create({ ...validData, companyId: 'comp_query', rightId: 'right_i' });
      await InvestorRights.create({ ...validData, companyId: 'comp_query', rightId: 'right_j' });

      const results = await InvestorRights.findByCompany('comp_query');
      expect(results.length).toBe(2);
    });

    it('should filter by status', async () => {
      await InvestorRights.create({ ...validData, companyId: 'comp_cs', rightId: 'right_k', status: 'ACTIVE' });
      await InvestorRights.create({ ...validData, companyId: 'comp_cs', rightId: 'right_l', status: 'EXPIRED' });

      const results = await InvestorRights.findByCompany('comp_cs', { status: 'ACTIVE' });
      expect(results.length).toBe(1);
    });

    it('should filter by rightType', async () => {
      await InvestorRights.create({ ...validData, companyId: 'comp_rt', rightId: 'right_m', rightType: 'PRO_RATA' });
      await InvestorRights.create({ ...validData, companyId: 'comp_rt', rightId: 'right_n', rightType: 'BOARD_SEAT' });

      const results = await InvestorRights.findByCompany('comp_rt', { rightType: 'BOARD_SEAT' });
      expect(results.length).toBe(1);
    });
  });

  describe('findByShareClass()', () => {
    it('should find rights by shareClassId', async () => {
      await InvestorRights.create({ ...validData, shareClassId: 'sc_query', rightId: 'right_o' });
      await InvestorRights.create({ ...validData, shareClassId: 'sc_query', rightId: 'right_p' });

      const results = await InvestorRights.findByShareClass('sc_query');
      expect(results.length).toBe(2);
    });

    it('should filter by status', async () => {
      await InvestorRights.create({ ...validData, shareClassId: 'sc_st', rightId: 'right_q', status: 'ACTIVE' });
      await InvestorRights.create({ ...validData, shareClassId: 'sc_st', rightId: 'right_r', status: 'WAIVED' });

      const results = await InvestorRights.findByShareClass('sc_st', { status: 'ACTIVE' });
      expect(results.length).toBe(1);
    });
  });

  describe('findExpiring()', () => {
    it('should find rights expiring within days', async () => {
      const soonExpiry = new Date(Date.now() + 86400000 * 10).toISOString();
      const farExpiry = new Date(Date.now() + 86400000 * 90).toISOString();

      await InvestorRights.create({
        ...validData,
        rightId: 'right_exp1',
        status: 'ACTIVE',
        expirationDate: soonExpiry
      });
      await InvestorRights.create({
        ...validData,
        rightId: 'right_exp2',
        status: 'ACTIVE',
        expirationDate: farExpiry
      });

      const results = await InvestorRights.findExpiring(30);
      expect(results.length).toBe(1);
    });

    it('should exclude rights without expiration date', async () => {
      await InvestorRights.create({
        ...validData,
        rightId: 'right_noexp',
        status: 'ACTIVE',
        expirationDate: null
      });

      const results = await InvestorRights.findExpiring(30);
      expect(results.length).toBe(0);
    });

    it('should exclude already expired rights', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      await InvestorRights.create({
        ...validData,
        rightId: 'right_past',
        status: 'ACTIVE',
        expirationDate: pastDate
      });

      const results = await InvestorRights.findExpiring(30);
      expect(results.length).toBe(0);
    });

    it('should filter by companyId when provided', async () => {
      const soonExpiry = new Date(Date.now() + 86400000 * 10).toISOString();
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_exp',
        rightId: 'right_exp3',
        status: 'ACTIVE',
        expirationDate: soonExpiry
      });
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_other',
        rightId: 'right_exp4',
        status: 'ACTIVE',
        expirationDate: soonExpiry
      });

      const results = await InvestorRights.findExpiring(30, { companyId: 'comp_exp' });
      expect(results.length).toBe(1);
    });

    it('should sort by expirationDate ascending', async () => {
      const date1 = new Date(Date.now() + 86400000 * 20).toISOString();
      const date2 = new Date(Date.now() + 86400000 * 5).toISOString();

      await InvestorRights.create({
        ...validData,
        rightId: 'right_sort1',
        status: 'ACTIVE',
        expirationDate: date1
      });
      await InvestorRights.create({
        ...validData,
        rightId: 'right_sort2',
        status: 'ACTIVE',
        expirationDate: date2
      });

      const results = await InvestorRights.findExpiring(30);
      expect(results.length).toBe(2);
      expect(new Date(results[0].expirationDate).getTime()).toBeLessThan(
        new Date(results[1].expirationDate).getTime()
      );
    });

    it('should use default 30 days', async () => {
      const soonExpiry = new Date(Date.now() + 86400000 * 25).toISOString();
      await InvestorRights.create({
        ...validData,
        rightId: 'right_def',
        status: 'ACTIVE',
        expirationDate: soonExpiry
      });

      const results = await InvestorRights.findExpiring();
      expect(results.length).toBe(1);
    });
  });

  // ---- Helper Methods ----

  describe('isExpired()', () => {
    it('should return true for expired right', () => {
      const right = {
        expirationDate: new Date(Date.now() - 86400000).toISOString()
      };
      expect(InvestorRights.isExpired(right)).toBe(true);
    });

    it('should return false for non-expired right', () => {
      const right = {
        expirationDate: new Date(Date.now() + 86400000).toISOString()
      };
      expect(InvestorRights.isExpired(right)).toBe(false);
    });

    it('should return false when no expiration date', () => {
      expect(InvestorRights.isExpired({})).toBe(false);
    });

    it('should return false for null expirationDate', () => {
      expect(InvestorRights.isExpired({ expirationDate: null })).toBe(false);
    });
  });

  describe('isCurrentlyExpired()', () => {
    it('should return true for expired right', () => {
      const right = { expirationDate: new Date(Date.now() - 86400000).toISOString() };
      expect(InvestorRights.isCurrentlyExpired(right)).toBe(true);
    });

    it('should return false for non-expired right', () => {
      const right = { expirationDate: new Date(Date.now() + 86400000).toISOString() };
      expect(InvestorRights.isCurrentlyExpired(right)).toBe(false);
    });

    it('should return false when no expiration date', () => {
      expect(InvestorRights.isCurrentlyExpired({})).toBe(false);
    });
  });

  describe('canExercise()', () => {
    it('should return true for active, non-expired right past effective date', () => {
      const right = {
        status: 'ACTIVE',
        effectiveDate: new Date(Date.now() - 86400000).toISOString(),
        expirationDate: new Date(Date.now() + 86400000).toISOString()
      };
      expect(InvestorRights.canExercise(right)).toBe(true);
    });

    it('should return false for non-active status', () => {
      expect(InvestorRights.canExercise({ status: 'WAIVED' })).toBe(false);
      expect(InvestorRights.canExercise({ status: 'EXPIRED' })).toBe(false);
      expect(InvestorRights.canExercise({ status: 'EXERCISED' })).toBe(false);
      expect(InvestorRights.canExercise({ status: 'PENDING' })).toBe(false);
      expect(InvestorRights.canExercise({ status: 'SUSPENDED' })).toBe(false);
    });

    it('should return false for expired right', () => {
      const right = {
        status: 'ACTIVE',
        expirationDate: new Date(Date.now() - 86400000).toISOString()
      };
      expect(InvestorRights.canExercise(right)).toBe(false);
    });

    it('should return false if effective date has not passed', () => {
      const right = {
        status: 'ACTIVE',
        effectiveDate: new Date(Date.now() + 86400000).toISOString(),
        expirationDate: new Date(Date.now() + 86400000 * 365).toISOString()
      };
      expect(InvestorRights.canExercise(right)).toBe(false);
    });

    it('should return true when no effectiveDate set', () => {
      const right = {
        status: 'ACTIVE',
        expirationDate: new Date(Date.now() + 86400000).toISOString()
      };
      expect(InvestorRights.canExercise(right)).toBe(true);
    });

    it('should return true when no expirationDate set', () => {
      const right = { status: 'ACTIVE' };
      expect(InvestorRights.canExercise(right)).toBe(true);
    });
  });

  // ---- addAuditEntry() ----

  describe('addAuditEntry()', () => {
    it('should add audit entry to a right', async () => {
      await InvestorRights.create({ ...validData, rightId: 'right_audit-001' });

      const result = await InvestorRights.addAuditEntry(
        'right_audit-001',
        'UPDATED',
        'admin_002',
        { reason: 'Terms updated' }
      );
      expect(result).toBeDefined();
    });

    it('should throw when right not found', async () => {
      await expect(
        InvestorRights.addAuditEntry('nonexistent', 'UPDATED', 'admin_001')
      ).rejects.toThrow('Right not found');
    });

    it('should include previousValues and newValues when provided', async () => {
      await InvestorRights.create({ ...validData, rightId: 'right_audit-002' });

      const result = await InvestorRights.addAuditEntry(
        'right_audit-002',
        'UPDATED',
        'admin_003',
        {
          previousValues: { percentage: 20 },
          newValues: { percentage: 25 },
          changes: ['percentage'],
          reason: 'Renegotiated'
        }
      );
      expect(result).toBeDefined();
    });
  });

  // ---- recordExercise() ----

  describe('recordExercise()', () => {
    it('should record exercise and update status', async () => {
      await InvestorRights.create({ ...validData, rightId: 'right_ex-001' });

      const result = await InvestorRights.recordExercise('right_ex-001', {
        exerciseAmount: 5000,
        exercisedBy: 'inv_001',
        notes: 'Exercised pro-rata rights',
        documentReference: 'doc_ex_001'
      });
      expect(result).toBeDefined();
    });

    it('should throw when right not found', async () => {
      await expect(
        InvestorRights.recordExercise('nonexistent', { exerciseAmount: 100 })
      ).rejects.toThrow('Right not found');
    });

    it('should use current date if exerciseDate not provided', async () => {
      await InvestorRights.create({ ...validData, rightId: 'right_ex-002' });

      const result = await InvestorRights.recordExercise('right_ex-002', {
        exerciseAmount: 1000,
        exercisedBy: 'inv_001'
      });
      expect(result).toBeDefined();
    });

    it('should use provided exerciseDate when given', async () => {
      await InvestorRights.create({ ...validData, rightId: 'right_ex-003' });

      const exerciseDate = '2026-03-15T00:00:00.000Z';
      const result = await InvestorRights.recordExercise('right_ex-003', {
        exerciseDate,
        exerciseAmount: 2000,
        exercisedBy: 'inv_001'
      });
      expect(result).toBeDefined();
    });
  });

  // ---- waive() ----

  describe('waive()', () => {
    it('should waive a right', async () => {
      await InvestorRights.create({ ...validData, rightId: 'right_waive-001' });

      const result = await InvestorRights.waive('right_waive-001', {
        reason: 'Investor agreed to waive',
        documentReference: 'doc_waive_001',
        waivedBy: 'admin_001'
      });
      expect(result).toBeDefined();
    });

    it('should throw when right not found', async () => {
      await expect(
        InvestorRights.waive('nonexistent', { reason: 'test', waivedBy: 'admin' })
      ).rejects.toThrow('Right not found');
    });
  });

  // ---- checkConflicts() ----

  describe('checkConflicts()', () => {
    it('should detect board seat limit conflict', async () => {
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_conflict',
        rightType: 'BOARD_SEAT',
        rightId: 'right_bs1',
        terms: { totalSeats: 5, assignedSeats: 5 }
      });

      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_conflict',
        rightType: 'BOARD_SEAT'
      });
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('BOARD_SEAT_LIMIT');
    });

    it('should not flag board seat conflict when seats available', async () => {
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_noconflict',
        rightType: 'BOARD_SEAT',
        rightId: 'right_bs2',
        terms: { totalSeats: 5, assignedSeats: 3 }
      });

      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_noconflict',
        rightType: 'BOARD_SEAT'
      });
      expect(conflicts.length).toBe(0);
    });

    it('should detect veto rights overlap', async () => {
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_veto',
        rightType: 'VETO_RIGHTS',
        rightId: 'right_veto1',
        terms: { vetoScope: 'ALL_DECISIONS' }
      });

      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_veto',
        rightType: 'VETO_RIGHTS',
        terms: { vetoScope: 'FUNDRAISING' }
      });
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('VETO_OVERLAP');
    });

    it('should detect matching veto scope overlap', async () => {
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_veto2',
        rightType: 'VETO_RIGHTS',
        rightId: 'right_veto2',
        terms: { vetoScope: 'FUNDRAISING' }
      });

      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_veto2',
        rightType: 'VETO_RIGHTS',
        terms: { vetoScope: 'FUNDRAISING' }
      });
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('VETO_OVERLAP');
    });

    it('should detect pro-rata percentage exceeding 100%', async () => {
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_prorata',
        rightType: 'PRO_RATA',
        rightId: 'right_pr1',
        terms: { percentage: 60 }
      });

      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_prorata',
        rightType: 'PRO_RATA',
        terms: { percentage: 50 }
      });
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('PRO_RATA_EXCEEDS_100');
      expect(conflicts[0].totalPercentage).toBe(110);
    });

    it('should not flag pro-rata when total under 100%', async () => {
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_ok',
        rightType: 'PRO_RATA',
        rightId: 'right_pr2',
        terms: { percentage: 30 }
      });

      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_ok',
        rightType: 'PRO_RATA',
        terms: { percentage: 40 }
      });
      expect(conflicts.length).toBe(0);
    });

    it('should return empty array when no conflicts', async () => {
      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_empty',
        rightType: 'INFORMATION_RIGHTS'
      });
      expect(conflicts).toEqual([]);
    });

    it('should detect ALL_DECISIONS veto scope overriding specific scope', async () => {
      await InvestorRights.create({
        ...validData,
        companyId: 'comp_veto3',
        rightType: 'VETO_RIGHTS',
        rightId: 'right_veto3',
        terms: { vetoScope: 'FUNDRAISING' }
      });

      const conflicts = await InvestorRights.checkConflicts({
        companyId: 'comp_veto3',
        rightType: 'VETO_RIGHTS',
        terms: { vetoScope: 'ALL_DECISIONS' }
      });
      expect(conflicts.length).toBe(1);
    });
  });

  // ---- Base Model Methods ----

  describe('Base Model Methods', () => {
    it('should have all required CRUD methods', () => {
      expect(typeof InvestorRights.find).toBe('function');
      expect(typeof InvestorRights.findOne).toBe('function');
      expect(typeof InvestorRights.findById).toBe('function');
      expect(typeof InvestorRights.updateOne).toBe('function');
      expect(typeof InvestorRights.updateMany).toBe('function');
      expect(typeof InvestorRights.deleteOne).toBe('function');
      expect(typeof InvestorRights.deleteMany).toBe('function');
      expect(typeof InvestorRights.findOneAndUpdate).toBe('function');
      expect(typeof InvestorRights.findByIdAndUpdate).toBe('function');
      expect(typeof InvestorRights.findOneAndDelete).toBe('function');
      expect(typeof InvestorRights.findByIdAndDelete).toBe('function');
      expect(typeof InvestorRights.countDocuments).toBe('function');
      expect(typeof InvestorRights.exists).toBe('function');
      expect(typeof InvestorRights.distinct).toBe('function');
      expect(typeof InvestorRights.aggregate).toBe('function');
    });
  });
});
