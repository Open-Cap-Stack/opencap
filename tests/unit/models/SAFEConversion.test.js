/**
 * SAFEConversion Model Tests
 * Feature: Issue #40 - Model Test Coverage
 * Tests for SAFE conversion engine (Issue #68)
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

const SAFEConversion = require('../../../models/SAFEConversion');
const zerodbService = require('../../../services/zerodbService');

describe('SAFEConversion Model', () => {
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

    // Mock deleteRows
    zerodbService.deleteRows.mockImplementation((tableName, { filter = {} } = {}) => {
      const initialLength = store.length;
      store = store.filter(doc => {
        return !Object.entries(filter).every(([key, value]) => doc[key] === value);
      });
      return Promise.resolve({ deleted_count: initialLength - store.length });
    });
  });

  // ─── Schema Validation ───────────────────────────────────────

  describe('Schema Validation', () => {
    it('should have the correct schema fields defined', () => {
      expect(SAFEConversion.schema).toBeDefined();
      expect(SAFEConversion.schema.conversionId).toBeDefined();
      expect(SAFEConversion.schema.safeId).toBeDefined();
      expect(SAFEConversion.schema.companyId).toBeDefined();
      expect(SAFEConversion.schema.fundingRoundId).toBeDefined();
      expect(SAFEConversion.schema.investorId).toBeDefined();
      expect(SAFEConversion.schema.investorName).toBeDefined();
    });

    it('should require safeId, companyId, fundingRoundId, investorId, investorName', () => {
      expect(SAFEConversion.schema.safeId.required).toBe(true);
      expect(SAFEConversion.schema.companyId.required).toBe(true);
      expect(SAFEConversion.schema.fundingRoundId.required).toBe(true);
      expect(SAFEConversion.schema.investorId.required).toBe(true);
      expect(SAFEConversion.schema.investorName.required).toBe(true);
    });

    it('should have status with valid enum values', () => {
      const validStatuses = SAFEConversion.schema.status.enum;
      expect(validStatuses).toEqual(['pending', 'approved', 'executed', 'cancelled']);
    });

    it('should default status to pending', () => {
      expect(SAFEConversion.schema.status.default).toBe('pending');
    });

    it('should define safeTerms sub-schema with safeType enum', () => {
      const safeTerms = SAFEConversion.schema.safeTerms;
      expect(safeTerms).toBeDefined();
      expect(safeTerms.safeType.enum).toEqual(['post-money', 'pre-money', 'mfn']);
      expect(safeTerms.safeType.required).toBe(true);
    });

    it('should define calculation sub-schema with methodUsed enum', () => {
      const calc = SAFEConversion.schema.calculation;
      expect(calc).toBeDefined();
      expect(calc.methodUsed.enum).toEqual(['cap', 'discount', 'mfn', 'series_price']);
      expect(calc.methodUsed.required).toBe(true);
    });

    it('should define sharesIssued with min 0', () => {
      expect(SAFEConversion.schema.sharesIssued.min).toBe(0);
      expect(SAFEConversion.schema.sharesIssued.required).toBe(true);
    });

    it('should define pricePerShare with min 0', () => {
      expect(SAFEConversion.schema.pricePerShare.min).toBe(0);
      expect(SAFEConversion.schema.pricePerShare.required).toBe(true);
    });

    it('should define proRata sub-schema with eligible defaulting to false', () => {
      const proRata = SAFEConversion.schema.proRata;
      expect(proRata).toBeDefined();
      expect(proRata.eligible.default).toBe(false);
    });

    it('should define metadata with default empty object', () => {
      expect(SAFEConversion.schema.metadata.default).toEqual({});
    });
  });

  // ─── Create ──────────────────────────────────────────────────

  describe('create()', () => {
    const validConversionData = {
      safeId: 'safe-001',
      companyId: 'company-001',
      fundingRoundId: 'round-001',
      investorId: 'investor-001',
      investorName: 'Jane Doe',
      shareClassId: 'sc-001',
      sharesIssued: 10000,
      pricePerShare: 1.50,
      createdBy: 'user-001'
    };

    it('should create a conversion with generated conversionId', async () => {
      const result = await SAFEConversion.create(validConversionData);

      expect(result).toBeDefined();
      expect(result.conversionId).toMatch(/^conv_/);
      expect(result.safeId).toBe('safe-001');
      expect(result.companyId).toBe('company-001');
    });

    it('should default status to pending', async () => {
      const result = await SAFEConversion.create(validConversionData);
      expect(result.status).toBe('pending');
    });

    it('should set calculatedAt timestamp', async () => {
      const result = await SAFEConversion.create(validConversionData);
      expect(result.calculatedAt).toBeDefined();
    });

    it('should default metadata to empty object', async () => {
      const result = await SAFEConversion.create(validConversionData);
      expect(result.metadata).toEqual({});
    });

    it('should preserve a provided conversionId', async () => {
      const result = await SAFEConversion.create({
        ...validConversionData,
        conversionId: 'conv_custom-id'
      });
      expect(result.conversionId).toBe('conv_custom-id');
    });

    it('should preserve a provided status', async () => {
      const result = await SAFEConversion.create({
        ...validConversionData,
        status: 'approved'
      });
      expect(result.status).toBe('approved');
    });
  });

  // ─── Approve ─────────────────────────────────────────────────

  describe('approve()', () => {
    it('should approve a pending conversion', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-001',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001'
      });

      const approved = await SAFEConversion.approve(created.conversionId, 'approver-001');

      expect(approved).toBeDefined();
      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('approver-001');
      expect(approved.approvedAt).toBeDefined();
    });

    it('should throw if conversion is not found', async () => {
      await expect(
        SAFEConversion.approve('non-existent', 'user-001')
      ).rejects.toThrow('Conversion not found');
    });

    it('should throw if conversion is not in pending status', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-002',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001',
        status: 'approved'
      });

      await expect(
        SAFEConversion.approve(created.conversionId, 'user-001')
      ).rejects.toThrow(/Cannot approve conversion/);
    });
  });

  // ─── Execute ─────────────────────────────────────────────────

  describe('execute()', () => {
    it('should execute an approved conversion', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-003',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001'
      });

      await SAFEConversion.approve(created.conversionId, 'approver-001');
      const executed = await SAFEConversion.execute(created.conversionId, 'executor-001', 'grant-001');

      expect(executed).toBeDefined();
      expect(executed.status).toBe('executed');
      expect(executed.executedBy).toBe('executor-001');
      expect(executed.executedAt).toBeDefined();
      expect(executed.equityGrantId).toBe('grant-001');
    });

    it('should execute without equityGrantId', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-004',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001'
      });

      await SAFEConversion.approve(created.conversionId, 'approver-001');
      const executed = await SAFEConversion.execute(created.conversionId, 'executor-001');

      expect(executed.status).toBe('executed');
      expect(executed.equityGrantId).toBeUndefined();
    });

    it('should throw if conversion not found', async () => {
      await expect(
        SAFEConversion.execute('non-existent', 'user-001')
      ).rejects.toThrow('Conversion not found');
    });

    it('should throw if conversion is not approved', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-005',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001'
      });

      await expect(
        SAFEConversion.execute(created.conversionId, 'user-001')
      ).rejects.toThrow('Conversion must be approved before execution');
    });
  });

  // ─── Cancel ──────────────────────────────────────────────────

  describe('cancel()', () => {
    it('should cancel a pending conversion', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-006',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001'
      });

      const cancelled = await SAFEConversion.cancel(created.conversionId, 'user-001', 'Changed terms');

      expect(cancelled).toBeDefined();
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancelledBy).toBe('user-001');
      expect(cancelled.cancellationReason).toBe('Changed terms');
      expect(cancelled.cancelledAt).toBeDefined();
    });

    it('should cancel an approved conversion', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-007',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001'
      });

      await SAFEConversion.approve(created.conversionId, 'approver-001');
      const cancelled = await SAFEConversion.cancel(created.conversionId, 'user-001', 'Investor withdrew');

      expect(cancelled.status).toBe('cancelled');
    });

    it('should throw if conversion not found', async () => {
      await expect(
        SAFEConversion.cancel('non-existent', 'user-001', 'reason')
      ).rejects.toThrow('Conversion not found');
    });

    it('should throw if conversion is already executed', async () => {
      const created = await SAFEConversion.create({
        safeId: 'safe-008',
        companyId: 'company-001',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Jane Doe',
        shareClassId: 'sc-001',
        sharesIssued: 10000,
        pricePerShare: 1.50,
        createdBy: 'user-001'
      });

      await SAFEConversion.approve(created.conversionId, 'approver-001');
      await SAFEConversion.execute(created.conversionId, 'executor-001');

      await expect(
        SAFEConversion.cancel(created.conversionId, 'user-001', 'Too late')
      ).rejects.toThrow('Cannot cancel an executed conversion');
    });
  });

  // ─── Query Methods ───────────────────────────────────────────

  describe('findByFundingRound()', () => {
    it('should find conversions by funding round', async () => {
      await SAFEConversion.create({
        safeId: 'safe-010',
        companyId: 'company-001',
        fundingRoundId: 'round-A',
        investorId: 'investor-001',
        investorName: 'Alice',
        shareClassId: 'sc-001',
        sharesIssued: 5000,
        pricePerShare: 2.00,
        createdBy: 'user-001'
      });
      await SAFEConversion.create({
        safeId: 'safe-011',
        companyId: 'company-001',
        fundingRoundId: 'round-A',
        investorId: 'investor-002',
        investorName: 'Bob',
        shareClassId: 'sc-001',
        sharesIssued: 3000,
        pricePerShare: 2.00,
        createdBy: 'user-001'
      });
      await SAFEConversion.create({
        safeId: 'safe-012',
        companyId: 'company-001',
        fundingRoundId: 'round-B',
        investorId: 'investor-003',
        investorName: 'Carol',
        shareClassId: 'sc-002',
        sharesIssued: 8000,
        pricePerShare: 3.00,
        createdBy: 'user-001'
      });

      const results = await SAFEConversion.findByFundingRound('round-A');
      expect(results.length).toBe(2);
    });
  });

  describe('findByCompany()', () => {
    it('should find conversions by company', async () => {
      await SAFEConversion.create({
        safeId: 'safe-020',
        companyId: 'company-A',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Alice',
        shareClassId: 'sc-001',
        sharesIssued: 5000,
        pricePerShare: 2.00,
        createdBy: 'user-001'
      });

      const results = await SAFEConversion.findByCompany('company-A');
      expect(results.length).toBe(1);
      expect(results[0].companyId).toBe('company-A');
    });

    it('should filter by status when provided', async () => {
      await SAFEConversion.create({
        safeId: 'safe-021',
        companyId: 'company-B',
        fundingRoundId: 'round-001',
        investorId: 'investor-001',
        investorName: 'Alice',
        shareClassId: 'sc-001',
        sharesIssued: 5000,
        pricePerShare: 2.00,
        createdBy: 'user-001',
        status: 'approved'
      });

      const pending = await SAFEConversion.findByCompany('company-B', 'pending');
      expect(pending.length).toBe(0);

      const approved = await SAFEConversion.findByCompany('company-B', 'approved');
      expect(approved.length).toBe(1);
    });
  });

  describe('getPendingForRound()', () => {
    it('should return only pending conversions for a round', async () => {
      await SAFEConversion.create({
        safeId: 'safe-030',
        companyId: 'company-001',
        fundingRoundId: 'round-X',
        investorId: 'investor-001',
        investorName: 'Alice',
        shareClassId: 'sc-001',
        sharesIssued: 5000,
        pricePerShare: 2.00,
        createdBy: 'user-001'
      });
      await SAFEConversion.create({
        safeId: 'safe-031',
        companyId: 'company-001',
        fundingRoundId: 'round-X',
        investorId: 'investor-002',
        investorName: 'Bob',
        shareClassId: 'sc-001',
        sharesIssued: 3000,
        pricePerShare: 2.00,
        createdBy: 'user-001',
        status: 'approved'
      });

      const pending = await SAFEConversion.getPendingForRound('round-X');
      expect(pending.length).toBe(1);
      expect(pending[0].safeId).toBe('safe-030');
    });
  });

  describe('getTotalSharesForRound()', () => {
    it('should sum shares from executed conversions only', async () => {
      // Create two executed conversions
      const c1 = await SAFEConversion.create({
        safeId: 'safe-040',
        companyId: 'company-001',
        fundingRoundId: 'round-Y',
        investorId: 'investor-001',
        investorName: 'Alice',
        shareClassId: 'sc-001',
        sharesIssued: 5000,
        pricePerShare: 2.00,
        createdBy: 'user-001'
      });
      await SAFEConversion.approve(c1.conversionId, 'approver-001');
      await SAFEConversion.execute(c1.conversionId, 'executor-001');

      const c2 = await SAFEConversion.create({
        safeId: 'safe-041',
        companyId: 'company-001',
        fundingRoundId: 'round-Y',
        investorId: 'investor-002',
        investorName: 'Bob',
        shareClassId: 'sc-001',
        sharesIssued: 3000,
        pricePerShare: 2.00,
        createdBy: 'user-001'
      });
      await SAFEConversion.approve(c2.conversionId, 'approver-001');
      await SAFEConversion.execute(c2.conversionId, 'executor-001');

      // Create one pending conversion - should NOT count
      await SAFEConversion.create({
        safeId: 'safe-042',
        companyId: 'company-001',
        fundingRoundId: 'round-Y',
        investorId: 'investor-003',
        investorName: 'Carol',
        shareClassId: 'sc-001',
        sharesIssued: 7000,
        pricePerShare: 2.00,
        createdBy: 'user-001'
      });

      const totalShares = await SAFEConversion.getTotalSharesForRound('round-Y');
      expect(totalShares).toBe(8000);
    });

    it('should return 0 for a round with no executed conversions', async () => {
      const totalShares = await SAFEConversion.getTotalSharesForRound('round-nonexistent');
      expect(totalShares).toBe(0);
    });
  });

  // ─── calculateConversion() ───────────────────────────────────

  describe('calculateConversion()', () => {
    const baseRoundTerms = {
      roundName: 'Series A',
      pricePerShare: 10.00,
      fullyDilutedShares: 1000000,
      preMoneyValuation: 10000000
    };

    it('should calculate using cap price when cap is lower than discount', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        discountRate: 0.20,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      expect(result.capPrice).toBe(5);        // 5000000 / 1000000
      expect(result.discountPrice).toBe(8);    // 10 * (1 - 0.20)
      expect(result.effectivePrice).toBe(5);   // cap is lower
      expect(result.methodUsed).toBe('cap');
      expect(result.sharesIssued).toBe(20000); // 100000 / 5
    });

    it('should calculate using discount price when discount is lower than cap', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 9000000,
        discountRate: 0.20,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      expect(result.capPrice).toBe(9);         // 9000000 / 1000000
      expect(result.discountPrice).toBe(8);    // 10 * (1 - 0.20)
      expect(result.effectivePrice).toBe(8);   // discount is lower
      expect(result.methodUsed).toBe('discount');
      expect(result.sharesIssued).toBe(12500); // 100000 / 8
    });

    it('should use cap only when no discount rate', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      expect(result.capPrice).toBe(5);
      expect(result.discountPrice).toBeNull();
      expect(result.effectivePrice).toBe(5);
      expect(result.methodUsed).toBe('cap');
    });

    it('should use discount only when no valuation cap', () => {
      const safeTerms = {
        investmentAmount: 100000,
        discountRate: 0.20,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      expect(result.capPrice).toBeNull();
      expect(result.discountPrice).toBe(8);
      expect(result.effectivePrice).toBe(8);
      expect(result.methodUsed).toBe('discount');
    });

    it('should fall back to series price when no cap or discount', () => {
      const safeTerms = {
        investmentAmount: 100000,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      expect(result.capPrice).toBeNull();
      expect(result.discountPrice).toBeNull();
      expect(result.effectivePrice).toBe(10);
      expect(result.methodUsed).toBe('series_price');
      expect(result.sharesIssued).toBe(10000);
    });

    it('should handle MFN SAFE type by using series price', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        discountRate: 0.20,
        safeType: 'mfn'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      expect(result.effectivePrice).toBe(10);
      expect(result.methodUsed).toBe('mfn');
    });

    it('should calculate ownership percentage correctly', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      // sharesIssued = 20000, postConversion = 1020000
      const expectedPct = (20000 / 1020000) * 100;
      expect(result.ownershipPercentage).toBeCloseTo(expectedPct, 2);
    });

    it('should calculate savings in priceComparison', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      // savings = (10 - 5) * 20000 = 100000
      expect(result.priceComparison.savings).toBe(100000);
      expect(result.priceComparison.seriesPrice).toBe(10);
      expect(result.priceComparison.capPrice).toBe(5);
    });

    it('should handle pre-money SAFE type', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 5000000,
        safeType: 'pre-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      expect(result.capPrice).toBe(5);
      expect(result.methodUsed).toBe('cap');
    });

    it('should floor sharesIssued to integer', () => {
      const safeTerms = {
        investmentAmount: 100000,
        valuationCap: 3000000,
        safeType: 'post-money'
      };

      const result = SAFEConversion.calculateConversion(safeTerms, baseRoundTerms);

      // capPrice = 3, sharesIssued = floor(100000/3) = 33333
      expect(result.sharesIssued).toBe(33333);
      expect(Number.isInteger(result.sharesIssued)).toBe(true);
    });
  });
});
