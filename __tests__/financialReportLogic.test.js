// __tests__/financialReportLogic.test.js
const { 
    calculateFinancialMetrics,
    validateReportingPeriod,
    validateFinancialReport
  } = require('../controllers/financialReportBusinessController');
  
  describe('Financial Report Business Logic', () => {
    describe('Financial Calculations', () => {
      it('should correctly calculate net income', () => {
        const reportData = {
          TotalRevenue: '1000000.00',
          TotalExpenses: '600000.00',
          NetIncome: '400000.00'
        };
  
        const result = calculateFinancialMetrics(reportData);
        expect(result.isValid).toBe(true);
        expect(result.calculatedNetIncome).toBe(400000);
      });
  
      it('should handle currency rounding properly', () => {
        const reportData = {
          TotalRevenue: '1000000.33',
          TotalExpenses: '600000.22',
          NetIncome: '400000.11'
        };
  
        const result = calculateFinancialMetrics(reportData);
        expect(result.isValid).toBe(true);
        expect(result.calculatedNetIncome).toBe(400000.11);
      });
  
      it('should detect incorrect calculations', () => {
        const reportData = {
          TotalRevenue: '1000000.00',
          TotalExpenses: '600000.00',
          NetIncome: '500000.00' // Incorrect
        };
  
        const result = calculateFinancialMetrics(reportData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Net income does not match revenue minus expenses');
      });
    });
  
    describe('Reporting Period Validation', () => {
      it('should validate annual report period', () => {
        const reportData = {
          Type: 'Annual',
          Data: {
            revenue: { q1: 250000, q2: 250000, q3: 250000, q4: 250000 },
            expenses: { q1: 150000, q2: 150000, q3: 150000, q4: 150000 }
          }
        };
  
        const result = validateReportingPeriod(reportData);
        expect(result.isValid).toBe(true);
      });
  
      it('should validate quarterly report period', () => {
        const reportData = {
          Type: 'Quarterly',
          Data: {
            revenue: { q1: 250000 },
            expenses: { q1: 150000 }
          }
        };
  
        const result = validateReportingPeriod(reportData);
        expect(result.isValid).toBe(true);
      });
  
      it('should reject invalid period data', () => {
        const reportData = {
          Type: 'Annual',
          Data: {
            revenue: { q1: 250000 }, // Missing quarters
            expenses: { q1: 150000 }
          }
        };
  
        const result = validateReportingPeriod(reportData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Annual report must include data for all quarters');
      });
    });
  
    describe('Data Validation', () => {
      it('should validate all required fields', () => {
        const reportData = {
          ReportID: 'test-id',
          Type: 'Annual',
          Data: {
            revenue: { q1: 250000, q2: 250000, q3: 250000, q4: 250000 },
            expenses: { q1: 150000, q2: 150000, q3: 150000, q4: 150000 }
          },
          TotalRevenue: '1000000.00',
          TotalExpenses: '600000.00',
          NetIncome: '400000.00',
          Timestamp: new Date().toISOString()
        };
  
        const result = validateFinancialReport(reportData);
        expect(result.isValid).toBe(true);
      });
  
      it('should reject negative financial values', () => {
        const reportData = {
          ReportID: 'test-id',
          Type: 'Annual',
          Data: {
            revenue: { q1: -250000, q2: 250000, q3: 250000, q4: 250000 },
            expenses: { q1: 150000, q2: 150000, q3: 150000, q4: 150000 }
          },
          TotalRevenue: '1000000.00',
          TotalExpenses: '600000.00',
          NetIncome: '400000.00',
          Timestamp: new Date().toISOString()
        };
  
        const result = validateFinancialReport(reportData);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Financial values cannot be negative');
      });
    });
  });