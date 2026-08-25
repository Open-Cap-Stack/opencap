/**
 * Financial Report Model - Comprehensive Unit Tests
 * Covers all exported methods, validation functions, error paths, and edge cases.
 */

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn().mockResolvedValue({}),
  projectId: 'test-project',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const FinancialReport = require('../../../models/financialReport');

describe('FinancialReport Model - Comprehensive', () => {
  const makeInsertResponse = (data) => ({
    data: [{
      row_id: 'row-1',
      row_data: { _id: 'test-id', ...data }
    }]
  });

  const makeQueryResponse = (items) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  const validReportData = {
    companyId: 'comp_001',
    reportingPeriod: 'Q1-2024',
    reportType: 'quarterly',
    revenue: { sales: 100000, services: 50000, other: 10000 },
    expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 },
    userId: 'user_001'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validReportData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ------------------------------------------------------------------
  // validatePositiveValues()
  // ------------------------------------------------------------------
  describe('validatePositiveValues()', () => {
    it('should return true for object with all positive numbers', () => {
      expect(FinancialReport.validatePositiveValues({ a: 100, b: 200, c: 0 })).toBe(true);
    });

    it('should return false for object with negative numbers', () => {
      expect(FinancialReport.validatePositiveValues({ a: 100, b: -5 })).toBe(false);
    });

    it('should return true for null input', () => {
      expect(FinancialReport.validatePositiveValues(null)).toBe(true);
    });

    it('should return true for undefined input', () => {
      expect(FinancialReport.validatePositiveValues(undefined)).toBe(true);
    });

    it('should return true for non-object input', () => {
      expect(FinancialReport.validatePositiveValues('string')).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(FinancialReport.validatePositiveValues({})).toBe(true);
    });

    it('should ignore non-number values in object', () => {
      expect(FinancialReport.validatePositiveValues({ a: 100, b: 'text', c: true })).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // validateTotalsMatch()
  // ------------------------------------------------------------------
  describe('validateTotalsMatch()', () => {
    it('should return true when no totals are provided', () => {
      const doc = {
        revenue: { sales: 100, services: 50 },
        expenses: { salaries: 80 }
      };
      expect(FinancialReport.validateTotalsMatch(doc)).toBe(true);
    });

    it('should return true when totals match calculated values', () => {
      const doc = {
        revenue: { sales: 100, services: 50 },
        expenses: { salaries: 80, operations: 20 },
        totalRevenue: 150,
        totalExpenses: 100,
        netIncome: 50
      };
      expect(FinancialReport.validateTotalsMatch(doc)).toBe(true);
    });

    it('should return false when totalRevenue does not match', () => {
      const doc = {
        revenue: { sales: 100, services: 50 },
        expenses: { salaries: 80 },
        totalRevenue: 999
      };
      expect(FinancialReport.validateTotalsMatch(doc)).toBe(false);
    });

    it('should return false when totalExpenses does not match', () => {
      const doc = {
        revenue: { sales: 100 },
        expenses: { salaries: 80, operations: 20 },
        totalExpenses: 999
      };
      expect(FinancialReport.validateTotalsMatch(doc)).toBe(false);
    });

    it('should return false when netIncome does not match', () => {
      const doc = {
        revenue: { sales: 100 },
        expenses: { salaries: 80 },
        netIncome: 999
      };
      expect(FinancialReport.validateTotalsMatch(doc)).toBe(false);
    });

    it('should return true when revenue/expenses are missing', () => {
      expect(FinancialReport.validateTotalsMatch({})).toBe(true);
    });

    it('should handle floating point precision', () => {
      const doc = {
        revenue: { sales: 100.001, services: 50.002 },
        expenses: { salaries: 80.001 },
        totalRevenue: 150.003,
        totalExpenses: 80.001,
        netIncome: 70.002
      };
      expect(FinancialReport.validateTotalsMatch(doc)).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // calculateTotals()
  // ------------------------------------------------------------------
  describe('calculateTotals()', () => {
    it('should calculate totalRevenue correctly', () => {
      const doc = {
        revenue: { sales: 100, services: 50, other: 25 },
        expenses: { salaries: 80 }
      };
      const result = FinancialReport.calculateTotals(doc);
      expect(result.totalRevenue).toBe(175);
    });

    it('should calculate totalExpenses correctly', () => {
      const doc = {
        revenue: { sales: 100 },
        expenses: { salaries: 60, marketing: 20, operations: 15, other: 5 }
      };
      const result = FinancialReport.calculateTotals(doc);
      expect(result.totalExpenses).toBe(100);
    });

    it('should calculate netIncome as totalRevenue minus totalExpenses', () => {
      const doc = {
        revenue: { sales: 200 },
        expenses: { salaries: 80 }
      };
      const result = FinancialReport.calculateTotals(doc);
      expect(result.netIncome).toBe(120);
    });

    it('should handle negative netIncome (loss)', () => {
      const doc = {
        revenue: { sales: 50 },
        expenses: { salaries: 100 }
      };
      const result = FinancialReport.calculateTotals(doc);
      expect(result.netIncome).toBe(-50);
    });

    it('should handle null/undefined values in revenue', () => {
      const doc = {
        revenue: { sales: null, services: undefined, other: 100 },
        expenses: { salaries: 50 }
      };
      const result = FinancialReport.calculateTotals(doc);
      expect(result.totalRevenue).toBe(100);
    });

    it('should handle NaN values', () => {
      const doc = {
        revenue: { sales: NaN, services: 100 },
        expenses: { salaries: NaN }
      };
      const result = FinancialReport.calculateTotals(doc);
      expect(result.totalRevenue).toBe(100);
      expect(result.totalExpenses).toBe(0);
    });

    it('should initialize revenue and expenses if not present', () => {
      const doc = {};
      const result = FinancialReport.calculateTotals(doc);
      expect(result.revenue).toEqual({});
      expect(result.expenses).toEqual({});
      expect(result.totalRevenue).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netIncome).toBe(0);
    });

    it('should handle empty revenue and expenses', () => {
      const doc = { revenue: {}, expenses: {} };
      const result = FinancialReport.calculateTotals(doc);
      expect(result.totalRevenue).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netIncome).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // create()
  // ------------------------------------------------------------------
  describe('create()', () => {
    it('should create a financial report with valid data', async () => {
      const result = await FinancialReport.create({ ...validReportData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should set documentType to financial_report', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.documentType).toBe('financial_report');
        return makeInsertResponse(doc);
      });
      await FinancialReport.create({ ...validReportData });
    });

    it('should throw when revenue has negative values', async () => {
      await expect(
        FinancialReport.create({ ...validReportData, revenue: { sales: -100 } })
      ).rejects.toThrow('All revenue values must be positive numbers');
    });

    it('should throw when expenses has negative values', async () => {
      await expect(
        FinancialReport.create({ ...validReportData, expenses: { salaries: -50 } })
      ).rejects.toThrow('All expense values must be positive numbers');
    });

    it('should throw when provided totals do not match calculated values', async () => {
      await expect(
        FinancialReport.create({
          ...validReportData,
          totalRevenue: 999999
        })
      ).rejects.toThrow('Provided totals do not match calculated totals');
    });

    it('should auto-calculate totals when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.totalRevenue).toBe(160000);
        expect(doc.totalExpenses).toBe(100000);
        expect(doc.netIncome).toBe(60000);
        return makeInsertResponse(doc);
      });
      await FinancialReport.create({ ...validReportData });
    });

    it('should set reportDate to now when not provided', async () => {
      const data = { ...validReportData };
      delete data.reportDate;
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.reportDate).toBeDefined();
        return makeInsertResponse(doc);
      });
      await FinancialReport.create(data);
    });

    it('should keep provided reportDate', async () => {
      const specificDate = '2024-03-15T00:00:00.000Z';
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.reportDate).toBe(specificDate);
        return makeInsertResponse(doc);
      });
      await FinancialReport.create({ ...validReportData, reportDate: specificDate });
    });

    it('should accept report with no revenue', async () => {
      const data = { ...validReportData };
      delete data.revenue;
      const result = await FinancialReport.create(data);
      expect(result).toBeDefined();
    });

    it('should accept report with no expenses', async () => {
      const data = { ...validReportData };
      delete data.expenses;
      const result = await FinancialReport.create(data);
      expect(result).toBeDefined();
    });
  });

  // ------------------------------------------------------------------
  // findOneAndUpdate()
  // ------------------------------------------------------------------
  describe('findOneAndUpdate()', () => {
    it('should throw when updated revenue has negative values', async () => {
      await expect(
        FinancialReport.findOneAndUpdate(
          { companyId: 'comp_001' },
          { $set: { revenue: { sales: -100 } } }
        )
      ).rejects.toThrow('All revenue values must be positive numbers');
    });

    it('should throw when updated expenses has negative values', async () => {
      await expect(
        FinancialReport.findOneAndUpdate(
          { companyId: 'comp_001' },
          { $set: { expenses: { salaries: -50 } } }
        )
      ).rejects.toThrow('All expense values must be positive numbers');
    });

    it('should recalculate totals when revenue is updated', async () => {
      const existing = {
        _id: 'id1', companyId: 'comp_001',
        revenue: { sales: 100, services: 50 },
        expenses: { salaries: 80 },
        totalRevenue: 150, totalExpenses: 80, netIncome: 70,
        documentType: 'financial_report', row_id: 'row-1'
      };
      // findOne for existing
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      // findOne in base findOneAndUpdate
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));

      await FinancialReport.findOneAndUpdate(
        { companyId: 'comp_001' },
        { $set: { revenue: { sales: 200 } } }
      );
    });

    it('should recalculate totals when expenses are updated', async () => {
      const existing = {
        _id: 'id1', companyId: 'comp_001',
        revenue: { sales: 100 },
        expenses: { salaries: 80, marketing: 20 },
        totalRevenue: 100, totalExpenses: 100, netIncome: 0,
        documentType: 'financial_report', row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));

      await FinancialReport.findOneAndUpdate(
        { companyId: 'comp_001' },
        { $set: { expenses: { salaries: 50 } } }
      );
    });

    it('should handle update without $set wrapper', async () => {
      const existing = {
        _id: 'id1', companyId: 'comp_001',
        revenue: { sales: 100 }, expenses: { salaries: 80 },
        documentType: 'financial_report', row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));

      await FinancialReport.findOneAndUpdate(
        { companyId: 'comp_001' },
        { notes: 'Updated notes' }
      );
    });

    it('should skip recalculation when no financial data is updated', async () => {
      const existing = {
        _id: 'id1', companyId: 'comp_001',
        revenue: { sales: 100 }, expenses: { salaries: 80 },
        documentType: 'financial_report', row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));

      await FinancialReport.findOneAndUpdate(
        { companyId: 'comp_001' },
        { $set: { notes: 'Just updating notes' } }
      );
    });
  });

  // ------------------------------------------------------------------
  // findByIdWithMetrics()
  // ------------------------------------------------------------------
  describe('findByIdWithMetrics()', () => {
    it('should return null when report not found', async () => {
      // Reset all mocks to ensure no leftover responses from prior tests
      zerodbService.queryTable.mockReset();
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await FinancialReport.findByIdWithMetrics('nonexistent');
      expect(result).toBeNull();
    });

    it('should calculate profitMargin and expenseRatio', async () => {
      const report = {
        _id: 'id1', totalRevenue: 200000, totalExpenses: 100000, netIncome: 100000,
        revenue: { sales: 150000, services: 40000, other: 10000 },
        expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([report]));
      const result = await FinancialReport.findByIdWithMetrics('id1');
      expect(result.metrics.profitMargin).toBe(0.5);
      expect(result.metrics.expenseRatio).toBe(0.5);
    });

    it('should calculate expenseBreakdown percentages', async () => {
      const report = {
        _id: 'id1', totalRevenue: 100000, totalExpenses: 100000, netIncome: 0,
        revenue: { sales: 100000, services: 0, other: 0 },
        expenses: { salaries: 60000, marketing: 20000, operations: 15000, other: 5000 }
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([report]));
      const result = await FinancialReport.findByIdWithMetrics('id1');
      expect(result.metrics.expenseBreakdown.salaries).toBe(0.6);
      expect(result.metrics.expenseBreakdown.marketing).toBe(0.2);
      expect(result.metrics.expenseBreakdown.operations).toBe(0.15);
      expect(result.metrics.expenseBreakdown.other).toBe(0.05);
    });

    it('should calculate revenueBreakdown percentages', async () => {
      const report = {
        _id: 'id1', totalRevenue: 200000, totalExpenses: 50000, netIncome: 150000,
        revenue: { sales: 100000, services: 80000, other: 20000 },
        expenses: { salaries: 50000 }
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([report]));
      const result = await FinancialReport.findByIdWithMetrics('id1');
      expect(result.metrics.revenueBreakdown.sales).toBe(0.5);
      expect(result.metrics.revenueBreakdown.services).toBe(0.4);
      expect(result.metrics.revenueBreakdown.other).toBe(0.1);
    });

    it('should not calculate metrics when totalRevenue is 0', async () => {
      const report = {
        _id: 'id1', totalRevenue: 0, totalExpenses: 100, netIncome: -100,
        revenue: {}, expenses: { salaries: 100 }
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([report]));
      const result = await FinancialReport.findByIdWithMetrics('id1');
      expect(result.metrics.profitMargin).toBeUndefined();
      expect(result.metrics.revenueBreakdown).toBeUndefined();
    });

    it('should not calculate expenseBreakdown when totalExpenses is 0', async () => {
      const report = {
        _id: 'id1', totalRevenue: 100, totalExpenses: 0, netIncome: 100,
        revenue: { sales: 100 }, expenses: {}
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([report]));
      const result = await FinancialReport.findByIdWithMetrics('id1');
      expect(result.metrics.expenseBreakdown).toBeUndefined();
    });

    it('should handle missing revenue/expense sub-fields', async () => {
      const report = {
        _id: 'id1', totalRevenue: 100, totalExpenses: 50, netIncome: 50,
        revenue: null, expenses: null
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([report]));
      const result = await FinancialReport.findByIdWithMetrics('id1');
      expect(result.metrics.expenseBreakdown.salaries).toBe(0);
      expect(result.metrics.revenueBreakdown.sales).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // getComparative()
  // ------------------------------------------------------------------
  describe('getComparative()', () => {
    it('should fetch reports for multiple periods', async () => {
      const reports = [
        { _id: 'r1', reportingPeriod: 'Q1-2024', companyId: 'comp_001' },
        { _id: 'r2', reportingPeriod: 'Q2-2024', companyId: 'comp_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(reports));
      const result = await FinancialReport.getComparative('comp_001', ['Q1-2024', 'Q2-2024']);
      expect(result).toHaveLength(2);
    });
  });

  // ------------------------------------------------------------------
  // getLatest()
  // ------------------------------------------------------------------
  describe('getLatest()', () => {
    it('should return the latest report for a company', async () => {
      const report = { _id: 'r1', companyId: 'comp_001', reportDate: '2024-03-01' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([report]));
      const result = await FinancialReport.getLatest('comp_001');
      expect(result).toBeDefined();
      expect(result._id).toBe('r1');
    });

    it('should return null when no reports exist', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await FinancialReport.getLatest('comp_001');
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // findByUser()
  // ------------------------------------------------------------------
  describe('findByUser()', () => {
    it('should find reports by userId', async () => {
      const reports = [{ _id: 'r1', userId: 'user_001' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(reports));
      const result = await FinancialReport.findByUser('user_001');
      expect(result).toHaveLength(1);
    });

    it('should pass options through', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await FinancialReport.findByUser('user_001', { limit: 5 });
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------
  // find()
  // ------------------------------------------------------------------
  describe('find()', () => {
    it('should always include documentType filter', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await FinancialReport.find({ companyId: 'comp_001' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.documentType).toBe('financial_report');
    });

    it('should accept empty query', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await FinancialReport.find();
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // findOne()
  // ------------------------------------------------------------------
  describe('findOne()', () => {
    it('should always include documentType filter', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await FinancialReport.findOne({ companyId: 'comp_001' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.documentType).toBe('financial_report');
    });

    it('should accept empty query', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await FinancialReport.findOne();
      expect(result).toBeNull();
    });
  });
});
