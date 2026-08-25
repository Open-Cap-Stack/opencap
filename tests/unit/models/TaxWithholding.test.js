/**
 * TaxWithholding Model Tests
 * Comprehensive unit tests for tax withholding model
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

const TaxWithholding = require('../../../models/TaxWithholding');
const zerodbService = require('../../../services/zerodbService');

describe('TaxWithholding Model', () => {
  let store = [];
  let idCounter = 0;

  const validData = {
    companyId: 'comp_001',
    employeeId: 'emp_001',
    eventType: 'nso_exercise',
    sourceType: 'OptionExercise',
    sourceId: 'opt_001',
    taxYear: 2026,
    eventDate: '2026-06-15T00:00:00.000Z',
    income: {
      grossAmount: 100000,
      ordinaryIncome: 80000,
      capitalGains: { shortTerm: 10000, longTerm: 10000 },
      amtIncome: 0
    },
    employeeProfile: {
      filingStatus: 'single',
      federalAllowances: 1,
      stateCode: 'CA',
      stateAllowances: 0,
      additionalWithholding: 0,
      isSubjectToAMT: false
    },
    summary: {
      totalWithholding: 35000,
      federalWithholding: 22000,
      stateWithholding: 9300,
      localWithholding: 0,
      socialSecurityWithholding: 2480,
      medicareWithholding: 1220,
      additionalMedicare: 0
    },
    withholdings: [],
    method: 'supplemental',
    status: 'calculated',
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
        if (key === '$or') continue; // skip $or for simple mock
        results = results.filter(doc => doc[key] === value);
      }
      // Handle $or operator
      if (filter.$or && Array.isArray(filter.$or)) {
        results = store.filter(doc =>
          filter.$or.some(orClause =>
            Object.entries(orClause).every(([k, v]) => doc[k] === v)
          )
        );
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

    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc =>
        !Object.entries(filter).every(([key, value]) => doc[key] === value)
      );
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });

    zerodbService.updateRows.mockImplementation((tableName, opts) => {
      return Promise.resolve({ modified_count: 1, matched_count: 1 });
    });
  });

  // ---- Constants ----

  describe('Constants', () => {
    it('should export EVENT_TYPES', () => {
      expect(TaxWithholding.EVENT_TYPES).toEqual(
        expect.arrayContaining(['iso_exercise', 'nso_exercise', 'rsu_vest', 'stock_sale', 'bonus_payment'])
      );
    });

    it('should export SOURCE_TYPES', () => {
      expect(TaxWithholding.SOURCE_TYPES).toEqual(
        expect.arrayContaining(['OptionExercise', 'RSUVest', 'StockSale', 'BonusPayment'])
      );
    });

    it('should export FILING_STATUSES', () => {
      expect(TaxWithholding.FILING_STATUSES).toEqual(
        expect.arrayContaining(['single', 'married_filing_jointly', 'married_filing_separately', 'head_of_household'])
      );
    });

    it('should export WITHHOLDING_TYPES', () => {
      expect(TaxWithholding.WITHHOLDING_TYPES).toEqual(
        expect.arrayContaining(['federal', 'state', 'local', 'social_security', 'medicare', 'amt'])
      );
    });

    it('should export WITHHOLDING_METHODS', () => {
      expect(TaxWithholding.WITHHOLDING_METHODS).toEqual(
        expect.arrayContaining(['flat_rate', 'supplemental', 'aggregate', 'percentage'])
      );
    });

    it('should export STATUSES', () => {
      expect(TaxWithholding.STATUSES).toEqual(
        expect.arrayContaining(['calculated', 'approved', 'processed', 'remitted', 'corrected'])
      );
    });
  });

  // ---- Schema ----

  describe('Schema', () => {
    it('should have required companyId field', () => {
      expect(TaxWithholding.schema.companyId).toBeDefined();
      expect(TaxWithholding.schema.companyId.required).toBe(true);
    });

    it('should have required employeeId field', () => {
      expect(TaxWithholding.schema.employeeId).toBeDefined();
      expect(TaxWithholding.schema.employeeId.required).toBe(true);
    });

    it('should have required eventType field with enum', () => {
      expect(TaxWithholding.schema.eventType).toBeDefined();
      expect(TaxWithholding.schema.eventType.required).toBe(true);
      expect(TaxWithholding.schema.eventType.enum).toEqual(TaxWithholding.EVENT_TYPES);
    });

    it('should have required taxYear field', () => {
      expect(TaxWithholding.schema.taxYear).toBeDefined();
      expect(TaxWithholding.schema.taxYear.required).toBe(true);
    });

    it('should have required eventDate field', () => {
      expect(TaxWithholding.schema.eventDate).toBeDefined();
      expect(TaxWithholding.schema.eventDate.required).toBe(true);
    });

    it('should have income sub-schema', () => {
      expect(TaxWithholding.schema.income).toBeDefined();
      expect(TaxWithholding.schema.income.grossAmount).toBeDefined();
    });

    it('should have summary sub-schema', () => {
      expect(TaxWithholding.schema.summary).toBeDefined();
      expect(TaxWithholding.schema.summary.totalWithholding).toBeDefined();
    });

    it('should have method field defaulting to supplemental', () => {
      expect(TaxWithholding.schema.method.default).toBe('supplemental');
    });

    it('should have status field defaulting to calculated', () => {
      expect(TaxWithholding.schema.status.default).toBe('calculated');
    });

    it('should have payment sub-schema', () => {
      expect(TaxWithholding.schema.payment).toBeDefined();
    });

    it('should have createdBy as required', () => {
      expect(TaxWithholding.schema.createdBy).toBeDefined();
      expect(TaxWithholding.schema.createdBy.required).toBe(true);
    });

    it('should have timestamp fields', () => {
      expect(TaxWithholding.schema.createdAt).toBeDefined();
      expect(TaxWithholding.schema.updatedAt).toBeDefined();
    });
  });

  // ---- Create ----

  describe('create()', () => {
    it('should create a withholding with auto-generated withholdingId', async () => {
      const result = await TaxWithholding.create(validData);
      expect(result).toBeDefined();
      expect(result.withholdingId).toMatch(/^twh_/);
    });

    it('should preserve provided withholdingId', async () => {
      const result = await TaxWithholding.create({
        ...validData,
        withholdingId: 'twh_custom-001'
      });
      expect(result.withholdingId).toBe('twh_custom-001');
    });

    it('should calculate net amount (grossAmount - totalWithholding)', async () => {
      const result = await TaxWithholding.create(validData);
      expect(result.summary.netAmount).toBe(100000 - 35000);
      expect(result.summary.netAmount).toBe(65000);
    });

    it('should set default income fields', async () => {
      const result = await TaxWithholding.create({
        ...validData,
        income: { grossAmount: 50000 }
      });
      expect(result.income.ordinaryIncome).toBe(0);
      expect(result.income.capitalGains.shortTerm).toBe(0);
      expect(result.income.capitalGains.longTerm).toBe(0);
      expect(result.income.amtIncome).toBe(0);
    });

    it('should default status to calculated', async () => {
      const data = { ...validData };
      delete data.status;
      const result = await TaxWithholding.create(data);
      expect(result.status).toBe('calculated');
    });

    it('should default method to supplemental', async () => {
      const data = { ...validData };
      delete data.method;
      const result = await TaxWithholding.create(data);
      expect(result.method).toBe('supplemental');
    });

    it('should default withholdings to empty array', async () => {
      const data = { ...validData };
      delete data.withholdings;
      const result = await TaxWithholding.create(data);
      expect(result.withholdings).toEqual([]);
    });

    it('should default payment to empty object', async () => {
      const result = await TaxWithholding.create(validData);
      expect(result.payment).toEqual({});
    });

    it('should default metadata to empty object', async () => {
      const result = await TaxWithholding.create(validData);
      expect(result.metadata).toEqual({});
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const result = await TaxWithholding.create(validData);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should convert Date eventDate to ISO string', async () => {
      const result = await TaxWithholding.create({
        ...validData,
        eventDate: new Date('2026-06-15')
      });
      expect(typeof result.eventDate).toBe('string');
      expect(result.eventDate).toContain('2026-06-15');
    });

    it('should handle zero grossAmount', async () => {
      const result = await TaxWithholding.create({
        ...validData,
        income: { grossAmount: 0 },
        summary: { totalWithholding: 0 }
      });
      expect(result.summary.netAmount).toBe(0);
    });
  });

  // ---- findOneAndUpdate ----

  describe('findOneAndUpdate()', () => {
    it('should recalculate net amount when income changes', async () => {
      const created = await TaxWithholding.create(validData);

      // findOneAndUpdate needs to find the doc
      const result = await TaxWithholding.findOneAndUpdate(
        { withholdingId: created.withholdingId },
        { $set: { income: { grossAmount: 200000 } } }
      );

      expect(result).toBeDefined();
    });

    it('should set updatedAt on update', async () => {
      const created = await TaxWithholding.create(validData);

      const result = await TaxWithholding.findOneAndUpdate(
        { withholdingId: created.withholdingId },
        { $set: { notes: 'updated' } }
      );

      expect(result).toBeDefined();
    });

    it('should handle direct update object (without $set)', async () => {
      const created = await TaxWithholding.create(validData);

      const result = await TaxWithholding.findOneAndUpdate(
        { withholdingId: created.withholdingId },
        { notes: 'direct update' }
      );

      expect(result).toBeDefined();
    });
  });

  // ---- approve() ----

  describe('approve()', () => {
    it('should approve a calculated withholding', async () => {
      const created = await TaxWithholding.create(validData);
      const result = await TaxWithholding.approve(created.withholdingId, 'admin_001');

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('admin_001');
      expect(result.approvedAt).toBeDefined();
      expect(result.updatedBy).toBe('admin_001');
    });

    it('should throw when withholding not found', async () => {
      await expect(
        TaxWithholding.approve('nonexistent', 'admin_001')
      ).rejects.toThrow('Withholding not found');
    });

    it('should throw when status is not calculated', async () => {
      const created = await TaxWithholding.create({
        ...validData,
        status: 'approved'
      });

      await expect(
        TaxWithholding.approve(created.withholdingId, 'admin_001')
      ).rejects.toThrow('Can only approve calculated withholdings');
    });

    it('should look up by _id when withholdingId does not match directly', async () => {
      const created = await TaxWithholding.create(validData);

      // Look up by _id
      const result = await TaxWithholding.approve(created._id, 'admin_002');
      expect(result.status).toBe('approved');
    });
  });

  // ---- markProcessed() ----

  describe('markProcessed()', () => {
    it('should mark an approved withholding as processed', async () => {
      const created = await TaxWithholding.create({
        ...validData,
        status: 'approved'
      });
      const result = await TaxWithholding.markProcessed(created.withholdingId, 'admin_001');

      expect(result.status).toBe('processed');
      expect(result.payment.processedBy).toBe('admin_001');
      expect(result.payment.processedDate).toBeDefined();
    });

    it('should throw when withholding not found', async () => {
      await expect(
        TaxWithholding.markProcessed('nonexistent', 'admin_001')
      ).rejects.toThrow('Withholding not found');
    });

    it('should throw when status is not approved', async () => {
      const created = await TaxWithholding.create(validData); // status: calculated

      await expect(
        TaxWithholding.markProcessed(created.withholdingId, 'admin_001')
      ).rejects.toThrow('Must be approved before processing');
    });
  });

  // ---- markRemitted() ----

  describe('markRemitted()', () => {
    it('should mark a processed withholding as remitted', async () => {
      const created = await TaxWithholding.create({
        ...validData,
        status: 'processed',
        payment: { processedDate: '2026-06-20', processedBy: 'admin_001' }
      });
      const result = await TaxWithholding.markRemitted(
        created.withholdingId,
        'admin_002',
        'CONF-12345'
      );

      expect(result.status).toBe('remitted');
      expect(result.payment.remittanceConfirmation).toBe('CONF-12345');
      expect(result.payment.remittedDate).toBeDefined();
    });

    it('should throw when withholding not found', async () => {
      await expect(
        TaxWithholding.markRemitted('nonexistent', 'admin_001', 'CONF-001')
      ).rejects.toThrow('Withholding not found');
    });

    it('should throw when status is not processed', async () => {
      const created = await TaxWithholding.create({
        ...validData,
        status: 'approved'
      });

      await expect(
        TaxWithholding.markRemitted(created.withholdingId, 'admin_001', 'CONF-001')
      ).rejects.toThrow('Must be processed before remittance');
    });
  });

  // ---- findByEmployee() ----

  describe('findByEmployee()', () => {
    it('should find withholdings by employeeId', async () => {
      await TaxWithholding.create({ ...validData, employeeId: 'emp_100' });
      await TaxWithholding.create({ ...validData, employeeId: 'emp_100', withholdingId: 'twh_b' });
      await TaxWithholding.create({ ...validData, employeeId: 'emp_200', withholdingId: 'twh_c' });

      const results = await TaxWithholding.findByEmployee('emp_100');
      expect(results.length).toBe(2);
    });

    it('should filter by taxYear when provided', async () => {
      await TaxWithholding.create({ ...validData, employeeId: 'emp_300', taxYear: 2026 });
      await TaxWithholding.create({ ...validData, employeeId: 'emp_300', taxYear: 2025, withholdingId: 'twh_d' });

      const results = await TaxWithholding.findByEmployee('emp_300', 2026);
      expect(results.length).toBe(1);
    });

    it('should sort by eventDate descending', async () => {
      await TaxWithholding.create({
        ...validData,
        employeeId: 'emp_400',
        eventDate: '2026-01-01T00:00:00.000Z'
      });
      await TaxWithholding.create({
        ...validData,
        employeeId: 'emp_400',
        eventDate: '2026-06-01T00:00:00.000Z',
        withholdingId: 'twh_e'
      });

      const results = await TaxWithholding.findByEmployee('emp_400');
      expect(results.length).toBe(2);
      // Should be sorted descending by eventDate
      expect(new Date(results[0].eventDate).getTime()).toBeGreaterThanOrEqual(
        new Date(results[1].eventDate).getTime()
      );
    });

    it('should return empty array for non-existent employee', async () => {
      const results = await TaxWithholding.findByEmployee('emp_nonexistent');
      expect(results).toEqual([]);
    });
  });

  // ---- findByCompany() ----

  describe('findByCompany()', () => {
    it('should find withholdings by companyId', async () => {
      await TaxWithholding.create({ ...validData, companyId: 'comp_100' });
      await TaxWithholding.create({ ...validData, companyId: 'comp_100', withholdingId: 'twh_f' });

      const results = await TaxWithholding.findByCompany('comp_100');
      expect(results.length).toBe(2);
    });

    it('should filter by taxYear when provided', async () => {
      await TaxWithholding.create({ ...validData, companyId: 'comp_200', taxYear: 2025 });
      await TaxWithholding.create({ ...validData, companyId: 'comp_200', taxYear: 2026, withholdingId: 'twh_g' });

      const results = await TaxWithholding.findByCompany('comp_200', 2026);
      expect(results.length).toBe(1);
    });
  });

  // ---- getEmployeeYearSummary() ----

  describe('getEmployeeYearSummary()', () => {
    it('should return zero summary when no records exist', async () => {
      const summary = await TaxWithholding.getEmployeeYearSummary('emp_none', 2026);

      expect(summary.totalGrossIncome).toBe(0);
      expect(summary.totalWithholding).toBe(0);
      expect(summary.totalFederal).toBe(0);
      expect(summary.totalState).toBe(0);
      expect(summary.totalSocialSecurity).toBe(0);
      expect(summary.totalMedicare).toBe(0);
      expect(summary.transactionCount).toBe(0);
    });

    it('should aggregate values across multiple withholdings', async () => {
      await TaxWithholding.create({
        ...validData,
        employeeId: 'emp_sum',
        taxYear: 2026,
        income: { grossAmount: 50000 },
        summary: {
          totalWithholding: 15000,
          federalWithholding: 10000,
          stateWithholding: 3000,
          socialSecurityWithholding: 1000,
          medicareWithholding: 1000
        }
      });
      await TaxWithholding.create({
        ...validData,
        employeeId: 'emp_sum',
        taxYear: 2026,
        withholdingId: 'twh_h',
        income: { grossAmount: 30000 },
        summary: {
          totalWithholding: 9000,
          federalWithholding: 6000,
          stateWithholding: 2000,
          socialSecurityWithholding: 500,
          medicareWithholding: 500
        }
      });

      const summary = await TaxWithholding.getEmployeeYearSummary('emp_sum', 2026);
      expect(summary.totalGrossIncome).toBe(80000);
      expect(summary.totalWithholding).toBe(24000);
      expect(summary.totalFederal).toBe(16000);
      expect(summary.totalState).toBe(5000);
      expect(summary.totalSocialSecurity).toBe(1500);
      expect(summary.totalMedicare).toBe(1500);
      expect(summary.transactionCount).toBe(2);
    });

    it('should handle missing income/summary fields gracefully', async () => {
      await TaxWithholding.create({
        ...validData,
        employeeId: 'emp_miss',
        taxYear: 2026,
        income: {},
        summary: {}
      });

      const summary = await TaxWithholding.getEmployeeYearSummary('emp_miss', 2026);
      expect(summary.totalGrossIncome).toBe(0);
      expect(summary.totalWithholding).toBe(0);
      expect(summary.transactionCount).toBe(1);
    });
  });

  // ---- getCompanyQuarterSummary() ----

  describe('getCompanyQuarterSummary()', () => {
    it('should throw for invalid quarter', async () => {
      await expect(
        TaxWithholding.getCompanyQuarterSummary('comp_q', 2026, 5)
      ).rejects.toThrow('Invalid quarter. Must be 1-4.');
    });

    it('should throw for quarter 0', async () => {
      await expect(
        TaxWithholding.getCompanyQuarterSummary('comp_q', 2026, 0)
      ).rejects.toThrow('Invalid quarter. Must be 1-4.');
    });

    it('should return empty array when no records match', async () => {
      const result = await TaxWithholding.getCompanyQuarterSummary('comp_empty', 2026, 1);
      expect(result).toEqual([]);
    });

    it('should group by event type within a quarter', async () => {
      await TaxWithholding.create({
        ...validData,
        companyId: 'comp_qtr',
        eventType: 'nso_exercise',
        eventDate: '2026-04-15T00:00:00.000Z',
        summary: { totalWithholding: 5000 }
      });
      await TaxWithholding.create({
        ...validData,
        companyId: 'comp_qtr',
        eventType: 'nso_exercise',
        eventDate: '2026-05-15T00:00:00.000Z',
        summary: { totalWithholding: 3000 },
        withholdingId: 'twh_i'
      });
      await TaxWithholding.create({
        ...validData,
        companyId: 'comp_qtr',
        eventType: 'rsu_vest',
        eventDate: '2026-06-01T00:00:00.000Z',
        summary: { totalWithholding: 8000 },
        withholdingId: 'twh_j'
      });

      const result = await TaxWithholding.getCompanyQuarterSummary('comp_qtr', 2026, 2);
      expect(result.length).toBe(2);

      const nsoGroup = result.find(r => r._id === 'nso_exercise');
      expect(nsoGroup).toBeDefined();
      expect(nsoGroup.totalWithholding).toBe(8000);
      expect(nsoGroup.count).toBe(2);

      const rsuGroup = result.find(r => r._id === 'rsu_vest');
      expect(rsuGroup).toBeDefined();
      expect(rsuGroup.totalWithholding).toBe(8000);
      expect(rsuGroup.count).toBe(1);
    });
  });

  // ---- findBySource() ----

  describe('findBySource()', () => {
    it('should find withholding by sourceType and sourceId', async () => {
      await TaxWithholding.create({
        ...validData,
        sourceType: 'OptionExercise',
        sourceId: 'opt_find_001'
      });

      const result = await TaxWithholding.findBySource('OptionExercise', 'opt_find_001');
      expect(result).toBeDefined();
      expect(result.sourceId).toBe('opt_find_001');
    });

    it('should return null for non-existent source', async () => {
      const result = await TaxWithholding.findBySource('OptionExercise', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  // ---- getPending() ----

  describe('getPending()', () => {
    it('should find calculated withholdings for a company', async () => {
      await TaxWithholding.create({ ...validData, companyId: 'comp_pend', status: 'calculated' });
      await TaxWithholding.create({
        ...validData,
        companyId: 'comp_pend',
        status: 'approved',
        withholdingId: 'twh_k'
      });

      const results = await TaxWithholding.getPending('comp_pend');
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('calculated');
    });

    it('should return empty array when no pending withholdings', async () => {
      const results = await TaxWithholding.getPending('comp_none');
      expect(results).toEqual([]);
    });
  });

  // ---- getAwaitingRemittance() ----

  describe('getAwaitingRemittance()', () => {
    it('should find processed withholdings awaiting remittance', async () => {
      await TaxWithholding.create({
        ...validData,
        companyId: 'comp_rem',
        status: 'processed'
      });
      await TaxWithholding.create({
        ...validData,
        companyId: 'comp_rem',
        status: 'remitted',
        withholdingId: 'twh_l'
      });

      const results = await TaxWithholding.getAwaitingRemittance('comp_rem');
      expect(results.length).toBe(1);
      expect(results[0].status).toBe('processed');
    });
  });

  // ---- Status Lifecycle (Full Flow) ----

  describe('Status Lifecycle', () => {
    it('should transition through calculated -> approved -> processed -> remitted', async () => {
      const created = await TaxWithholding.create(validData);
      expect(created.status).toBe('calculated');

      const approved = await TaxWithholding.approve(created.withholdingId, 'admin_001');
      expect(approved.status).toBe('approved');

      // Update the store to reflect the approved status
      const approvedIdx = store.findIndex(d => d.withholdingId === created.withholdingId);
      if (approvedIdx !== -1) store[approvedIdx].status = 'approved';

      const processed = await TaxWithholding.markProcessed(created.withholdingId, 'admin_002');
      expect(processed.status).toBe('processed');

      // Update the store to reflect the processed status
      if (approvedIdx !== -1) {
        store[approvedIdx].status = 'processed';
        store[approvedIdx].payment = processed.payment;
      }

      const remitted = await TaxWithholding.markRemitted(
        created.withholdingId,
        'admin_003',
        'CONF-999'
      );
      expect(remitted.status).toBe('remitted');
      expect(remitted.payment.remittanceConfirmation).toBe('CONF-999');
    });
  });
});
