/**
 * Financial Report Business Controller Tests
 *
 * Tests for business logic functions: calculateFinancialMetrics,
 * validateReportingPeriod, and validateFinancialReport.
 */

const {
  calculateFinancialMetrics,
  validateReportingPeriod,
  validateFinancialReport
} = require('../../../controllers/financialReportBusinessController');

describe('financialReportBusinessController', () => {

  // ─── calculateFinancialMetrics ─────────────────────────────────────

  describe('calculateFinancialMetrics', () => {
    it('should return valid when net income matches revenue minus expenses', () => {
      const result = calculateFinancialMetrics({
        TotalRevenue: 100000,
        TotalExpenses: 60000,
        NetIncome: 40000
      });

      expect(result.isValid).toBe(true);
      expect(result.calculatedNetIncome).toBe(40000);
      expect(result.error).toBeNull();
    });

    it('should return invalid when net income does not match', () => {
      const result = calculateFinancialMetrics({
        TotalRevenue: 100000,
        TotalExpenses: 60000,
        NetIncome: 50000
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Net income does not match revenue minus expenses');
    });

    it('should handle string number values', () => {
      const result = calculateFinancialMetrics({
        TotalRevenue: '100000',
        TotalExpenses: '60000',
        NetIncome: '40000'
      });

      expect(result.isValid).toBe(true);
    });

    it('should handle zero values', () => {
      const result = calculateFinancialMetrics({
        TotalRevenue: 0,
        TotalExpenses: 0,
        NetIncome: 0
      });

      expect(result.isValid).toBe(true);
      expect(result.calculatedNetIncome).toBe(0);
    });

    it('should handle very large numbers with floating point tolerance', () => {
      const result = calculateFinancialMetrics({
        TotalRevenue: 999999999999.99,
        TotalExpenses: 500000000000.50,
        NetIncome: 499999999999.49
      });

      expect(result.isValid).toBe(true);
    });

    it('should return error when given invalid non-numeric data', () => {
      // When null/undefined causes exception in the try block
      const result = calculateFinancialMetrics(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Error calculating financial metrics');
    });
  });

  // ─── validateReportingPeriod ───────────────────────────────────────

  describe('validateReportingPeriod', () => {
    it('should validate annual report with all quarters', () => {
      const result = validateReportingPeriod({
        Type: 'Annual',
        Data: {
          revenue: { q1: 1000, q2: 2000, q3: 3000, q4: 4000 },
          expenses: { q1: 500, q2: 600, q3: 700, q4: 800 }
        }
      });

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject annual report missing quarters', () => {
      const result = validateReportingPeriod({
        Type: 'Annual',
        Data: {
          revenue: { q1: 1000, q2: 2000 },
          expenses: { q1: 500, q2: 600 }
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Annual report must include data for all quarters');
    });

    it('should validate quarterly report with exactly one quarter', () => {
      const result = validateReportingPeriod({
        Type: 'Quarterly',
        Data: {
          revenue: { q1: 1000 },
          expenses: { q1: 500 }
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should reject quarterly report with more than one quarter', () => {
      const result = validateReportingPeriod({
        Type: 'Quarterly',
        Data: {
          revenue: { q1: 1000, q2: 2000 },
          expenses: { q1: 500, q2: 600 }
        }
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Quarterly report must include data for exactly one quarter');
    });

    it('should pass for non-Annual and non-Quarterly types', () => {
      const result = validateReportingPeriod({
        Type: 'Monthly',
        Data: {
          revenue: { jan: 1000 },
          expenses: { jan: 500 }
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should handle Map-based data for annual reports', () => {
      const result = validateReportingPeriod({
        Type: 'Annual',
        Data: {
          revenue: new Map([['q1', 1000], ['q2', 2000], ['q3', 3000], ['q4', 4000]]),
          expenses: new Map([['q1', 500], ['q2', 600], ['q3', 700], ['q4', 800]])
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should handle Map-based data for quarterly reports', () => {
      const result = validateReportingPeriod({
        Type: 'Quarterly',
        Data: {
          revenue: new Map([['q1', 1000]]),
          expenses: new Map([['q1', 500]])
        }
      });

      expect(result.isValid).toBe(true);
    });

    it('should return error on internal exception', () => {
      const result = validateReportingPeriod(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Error validating reporting period');
    });
  });

  // ─── validateFinancialReport ───────────────────────────────────────

  describe('validateFinancialReport', () => {
    const validReport = {
      ReportID: 'RPT-001',
      Type: 'Quarterly',
      Data: {
        revenue: { q1: 25000 },
        expenses: { q1: 15000 }
      },
      TotalRevenue: 25000,
      TotalExpenses: 15000,
      NetIncome: 10000,
      Timestamp: '2026-01-01T00:00:00Z'
    };

    it('should validate a correct report', () => {
      const result = validateFinancialReport(validReport);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject report with missing required fields', () => {
      const result = validateFinancialReport({
        ReportID: 'RPT-001',
        Type: 'Quarterly'
        // missing Data, TotalRevenue, TotalExpenses, NetIncome, Timestamp
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should reject report with negative TotalRevenue', () => {
      const report = { ...validReport, TotalRevenue: -1000 };
      const result = validateFinancialReport(report);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Financial values cannot be negative or non-numeric');
    });

    it('should reject report with negative TotalExpenses', () => {
      const report = { ...validReport, TotalExpenses: -500 };
      const result = validateFinancialReport(report);

      expect(result.isValid).toBe(false);
    });

    it('should reject report with NaN financial values', () => {
      const report = { ...validReport, TotalRevenue: 'not-a-number' };
      const result = validateFinancialReport(report);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Financial values cannot be negative or non-numeric');
    });

    it('should reject report with negative quarterly data', () => {
      const report = {
        ...validReport,
        Data: {
          revenue: { q1: -5000 },
          expenses: { q1: 1000 }
        }
      };
      const result = validateFinancialReport(report);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Financial values cannot be negative');
    });

    it('should reject report where net income does not match', () => {
      const report = {
        ...validReport,
        TotalRevenue: 100000,
        TotalExpenses: 60000,
        NetIncome: 99999
      };
      const result = validateFinancialReport(report);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Net income does not match revenue minus expenses');
    });

    it('should reject annual report missing quarters', () => {
      const report = {
        ...validReport,
        Type: 'Annual',
        Data: {
          revenue: { q1: 1000 },
          expenses: { q1: 500 }
        }
      };
      const result = validateFinancialReport(report);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Annual report must include data for all quarters');
    });

    it('should return error when null is passed', () => {
      const result = validateFinancialReport(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Error validating financial report');
    });
  });
});
