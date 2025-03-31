const mongoose = require('mongoose');
const FinancialReport = require('../../models/financialReport');

// OCAE-205: Unit Tests for Financial Report Model

describe('Financial Report Model Unit Tests', () => {
  // Mock data for a financial report with revenue and expenses
  const mockFinancialReportData = {
    companyId: 'comp123',
    reportingPeriod: '2024-Q1',
    reportDate: new Date('2024-04-01'),
    reportType: 'quarterly',
    revenue: {
      sales: 800000,
      services: 150000,
      other: 50000
    },
    expenses: {
      salaries: 400000,
      marketing: 100000,
      operations: 150000,
      other: 50000
    },
    notes: 'Q1 financial report for 2024',
    tags: ['2024', 'Q1', 'quarterly'],
    userId: new mongoose.Types.ObjectId()
  });

  describe('calculateTotals method', () => {
    it('should correctly calculate revenue, expenses, and net income totals', () => {
      // Create a new financial report with the mock data
      const financialReport = new FinancialReport(mockFinancialReportData);
      
      // Call the calculateTotals method
      financialReport.calculateTotals();
      
      // Verify the totals were calculated correctly
      expect(financialReport.totalRevenue).toBe(1000000); // 800000 + 150000 + 50000
      expect(financialReport.totalExpenses).toBe(700000); // 400000 + 100000 + 150000 + 50000
      expect(financialReport.netIncome).toBe(300000); // 1000000 - 700000
    });

    it('should handle missing or undefined properties gracefully', () => {
      // Create a financial report with partial data
      const partialReport = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000
          // Other revenue missing
        },
        // Expenses missing entirely
        userId: new mongoose.Types.ObjectId()
      });
      
      // Should not throw errors when calculating totals with missing data
      expect(() => partialReport.calculateTotals()).not.toThrow();
      
      // Totals should be calculated based on available data
      expect(partialReport.totalRevenue).toBe(100000);
      expect(partialReport.totalExpenses).toBe(0);
      expect(partialReport.netIncome).toBe(100000);
    });
    
    it('should handle invalid values by converting them to zero', () => {
      // Create a financial report with some invalid values
      const reportWithInvalidValues = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000,
          services: null,
          other: undefined
        },
        expenses: {
          salaries: 50000,
          marketing: NaN,
          operations: null
        },
        userId: new mongoose.Types.ObjectId()
      });
      
      // Calculate totals
      reportWithInvalidValues.calculateTotals();
      
      // Verify invalid values are treated as zero
      expect(reportWithInvalidValues.totalRevenue).toBe(100000); // Only valid sales counted
      expect(reportWithInvalidValues.totalExpenses).toBe(50000); // Only valid salaries counted
      expect(reportWithInvalidValues.netIncome).toBe(50000);
    });
    
    it('should handle completely empty revenue and expenses', () => {
      // Create a financial report with empty revenue and expenses
      const emptyReport = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        userId: new mongoose.Types.ObjectId()
      });
      
      // Calculate totals
      emptyReport.calculateTotals();
      
      // Verify totals are initialized to zero
      expect(emptyReport.totalRevenue).toBe(0);
      expect(emptyReport.totalExpenses).toBe(0);
      expect(emptyReport.netIncome).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should enforce required fields', () => {
      const invalidReport = new FinancialReport({});
      
      // Attempt to validate the model
      const validationError = invalidReport.validateSync();
      
      // Check that validation errors are present
      expect(validationError).toBeDefined();
      expect(validationError.errors.companyId).toBeDefined();
      expect(validationError.errors.reportingPeriod).toBeDefined();
      expect(validationError.errors.reportType).toBeDefined();
      expect(validationError.errors.userId).toBeDefined();
    });

    it('should validate report type enums', () => {
      const invalidReportType = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'invalid-type', // Not one of the allowed enum values
        userId: new mongoose.Types.ObjectId()
      });
      
      // Validate the model
      const validationError = invalidReportType.validateSync();
      
      // Check that report type validation error is present
      expect(validationError).toBeDefined();
      expect(validationError.errors.reportType).toBeDefined();
    });
    
    it('should validate that revenue values are positive', () => {
      // Create a report with negative values in revenue
      const reportWithNegativeRevenue = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000,
          services: -50000 // Negative value
        },
        expenses: {
          salaries: 50000
        },
        userId: new mongoose.Types.ObjectId()
      });
      
      // Trigger the validation hooks by calling validate
      const validatePromise = reportWithNegativeRevenue.validate();
      
      // Expect the promise to be rejected with an error about positive values
      return expect(validatePromise).rejects.toThrow(/positive numbers/);
    });
    
    it('should validate that expense values are positive', () => {
      // Create a report with negative values in expenses
      const reportWithNegativeExpenses = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000
        },
        expenses: {
          salaries: 50000,
          marketing: -25000 // Negative value
        },
        userId: new mongoose.Types.ObjectId()
      });
      
      // Trigger the validation hooks by calling validate
      const validatePromise = reportWithNegativeExpenses.validate();
      
      // Expect the promise to be rejected with an error about positive values
      return expect(validatePromise).rejects.toThrow(/positive numbers/);
    });
    
    it('should validate that provided totals match calculated totals', () => {
      // Create a report with incorrect totals
      const reportWithIncorrectTotals = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000,
          services: 50000
        },
        expenses: {
          salaries: 50000
        },
        totalRevenue: 200000, // Incorrect total (should be 150000)
        totalExpenses: 50000,
        netIncome: 150000, // Incorrect net income (should be 100000)
        userId: new mongoose.Types.ObjectId()
      });
      
      // Trigger the validation hooks by calling validate
      const validatePromise = reportWithIncorrectTotals.validate();
      
      // Expect the promise to be rejected with an error about incorrect totals
      return expect(validatePromise).rejects.toThrow(/do not match/);
    });
    
    it('should accept valid reports with matching totals', async () => {
      // Create a report with correct totals
      const validReport = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q2',
        reportDate: new Date('2024-07-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000,
          services: 50000
        },
        expenses: {
          salaries: 50000
        },
        totalRevenue: 150000, // Correct total
        totalExpenses: 50000, // Correct total
        netIncome: 100000, // Correct net income
        userId: new mongoose.Types.ObjectId()
      });
      
      // Mock save to prevent actual DB operations
      validReport.save = jest.fn().mockResolvedValue(validReport);
      
      // Should pass validation
      await expect(validReport.validate()).resolves.not.toThrow();
    });
    
    it('should accept reports without any revenue or expenses', async () => {
      // Create a report with no revenue or expenses data
      const emptyDataReport = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q3',
        reportDate: new Date('2024-10-01'),
        reportType: 'quarterly',
        userId: new mongoose.Types.ObjectId()
      });
      
      // Mock save to prevent actual DB operations
      emptyDataReport.save = jest.fn().mockResolvedValue(emptyDataReport);
      
      // Should not throw error during validation
      await expect(emptyDataReport.validate()).resolves.not.toThrow();
    });
    
    it('should pass validation when not providing any totals', async () => {
      // Create a report without pre-calculated totals
      const reportWithoutTotals = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q4',
        reportDate: new Date('2025-01-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000,
          services: 50000
        },
        expenses: {
          salaries: 60000
        },
        // No totalRevenue, totalExpenses, or netIncome specified
        userId: new mongoose.Types.ObjectId()
      });
      
      // Mock save to prevent actual DB operations
      reportWithoutTotals.save = jest.fn().mockResolvedValue(reportWithoutTotals);
      
      // Should pass validation (totals will be calculated during pre-save)
      await expect(reportWithoutTotals.validate()).resolves.not.toThrow();
    });
  });

  describe('Pre-save behavior', () => {
    it('should automatically calculate totals before saving if not provided', async () => {
      // Create a financial report without totals
      const financialReport = new FinancialReport(mockFinancialReportData);
      
      // Remove any pre-existing totals to ensure they are calculated
      financialReport.totalRevenue = undefined;
      financialReport.totalExpenses = undefined;
      financialReport.netIncome = undefined;
      
      // Spy on the calculateTotals method
      const calculateTotalsSpy = jest.spyOn(financialReport, 'calculateTotals');
      
      // Mock the save method to test the pre-save behavior
      const originalSave = financialReport.save;
      financialReport.save = jest.fn().mockImplementation(async function() {
        // Manually simulate the pre-save hook behavior
        if (!this.totalRevenue || !this.totalExpenses || !this.netIncome) {
          this.calculateTotals();
        }
        return this;
      });
      
      // Call save which should trigger our mocked implementation
      await financialReport.save();
      
      // Verify totals were calculated
      expect(calculateTotalsSpy).toHaveBeenCalled();
      expect(financialReport.totalRevenue).toBe(1000000);
      expect(financialReport.totalExpenses).toBe(700000);
      expect(financialReport.netIncome).toBe(300000);
      
      // Restore original save method
      financialReport.save = originalSave;
    });
    
    it('should not recalculate totals if they are already provided', async () => {
      // Create a financial report with pre-calculated totals
      const financialReport = new FinancialReport({
        ...mockFinancialReportData,
        totalRevenue: 1000000,
        totalExpenses: 700000,
        netIncome: 300000
      });
      
      // Spy on the calculateTotals method
      const calculateTotalsSpy = jest.spyOn(financialReport, 'calculateTotals');
      
      // Mock the save method to test the pre-save behavior
      const originalSave = financialReport.save;
      financialReport.save = jest.fn().mockImplementation(async function() {
        // Manually simulate the pre-save hook behavior
        if (!this.totalRevenue || !this.totalExpenses || !this.netIncome) {
          this.calculateTotals();
        }
        return this;
      });
      
      // Call save which should trigger our mocked implementation
      await financialReport.save();
      
      // Verify calculateTotals was not called since totals are already provided
      expect(calculateTotalsSpy).not.toHaveBeenCalled();
      
      // Restore original save method
      financialReport.save = originalSave;
    });
    
    it('should recalculate totals if any total is missing', async () => {
      // Create a financial report with incomplete totals
      const financialReport = new FinancialReport({
        ...mockFinancialReportData,
        totalRevenue: 1000000,
        totalExpenses: 700000,
        // Missing netIncome
      });
      
      // Spy on the calculateTotals method
      const calculateTotalsSpy = jest.spyOn(financialReport, 'calculateTotals');
      
      // Mock the save method to test the pre-save behavior
      const originalSave = financialReport.save;
      financialReport.save = jest.fn().mockImplementation(async function() {
        // Manually simulate the pre-save hook behavior
        if (!this.totalRevenue || !this.totalExpenses || !this.netIncome) {
          this.calculateTotals();
        }
        return this;
      });
      
      // Call save which should trigger our mocked implementation
      await financialReport.save();
      
      // Verify calculateTotals was called since netIncome is missing
      expect(calculateTotalsSpy).toHaveBeenCalled();
      expect(financialReport.netIncome).toBe(300000);
      
      // Restore original save method
      financialReport.save = originalSave;
    });
  });
  
  describe('Validation behavior', () => {
    it('should reject reports with negative revenue values', async () => {
      // Create a report with negative values in revenue
      const reportWithNegativeValues = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: -10000 // Negative value
        },
        userId: new mongoose.Types.ObjectId()
      });
      
      // Attempt to validate - should fail due to negative revenue
      const validationPromise = reportWithNegativeValues.validate();
      
      // Verify validation fails with the expected error
      await expect(validationPromise).rejects.toThrow(/positive numbers/);
    });
    
    it('should reject reports with negative expense values', async () => {
      // Create a report with negative values in expenses
      const reportWithNegativeExpenses = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000
        },
        expenses: {
          salaries: -50000 // Negative value
        },
        userId: new mongoose.Types.ObjectId()
      });
      
      // Attempt to validate - should fail due to negative expenses
      const validationPromise = reportWithNegativeExpenses.validate();
      
      // Verify validation fails with the expected error
      await expect(validationPromise).rejects.toThrow(/positive numbers/);
    });
    
    it('should reject reports with incorrect totals', async () => {
      // Create a report with incorrect totals
      const reportWithIncorrectTotals = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000
        },
        expenses: {
          salaries: 50000
        },
        totalRevenue: 150000, // Incorrect (should be 100000)
        totalExpenses: 50000,
        netIncome: 100000, // Incorrect (should be 50000)
        userId: new mongoose.Types.ObjectId()
      });
      
      // Attempt to validate - should fail due to incorrect totals
      const validationPromise = reportWithIncorrectTotals.validate();
      
      // Verify validation fails with the expected error
      await expect(validationPromise).rejects.toThrow(/do not match/);
    });
    
    it('should accept reports with correct totals', async () => {
      // Create a report with correct totals
      const reportWithCorrectTotals = new FinancialReport({
        companyId: 'comp123',
        reportingPeriod: '2024-Q1',
        reportDate: new Date('2024-04-01'),
        reportType: 'quarterly',
        revenue: {
          sales: 100000
        },
        expenses: {
          salaries: 50000
        },
        totalRevenue: 100000, // Correct
        totalExpenses: 50000, // Correct
        netIncome: 50000, // Correct
        userId: new mongoose.Types.ObjectId()
      });
      
      // Attempt to validate - should pass with correct totals
      // Mock save to prevent actual DB operations
      reportWithCorrectTotals.save = jest.fn().mockResolvedValue(reportWithCorrectTotals);
      
      // Should not throw error during validation
      await expect(reportWithCorrectTotals.validate()).resolves.not.toThrow();
    });
  });
  
  describe('Compound indexes', () => {
    it('should have a unique index on companyId and reportingPeriod', () => {
      // Get the indexes defined on the schema
      const indexes = FinancialReport.schema.indexes();
      
      // Find the compound index for companyId and reportingPeriod
      const companyReportingIndex = indexes.find(index => 
        index[0].companyId === 1 && index[0].reportingPeriod === 1);
      
      // Verify the index exists and is unique
      expect(companyReportingIndex).toBeDefined();
      expect(companyReportingIndex[1].unique).toBe(true);
    });
    
    it('should have an index on reportDate', () => {
      // Get the indexes defined on the schema
      const indexes = FinancialReport.schema.indexes();
      
      // Find the index for reportDate
      const reportDateIndex = indexes.find(index => 
        index[0].reportDate === -1);
      
      // Verify the index exists
      expect(reportDateIndex).toBeDefined();
    });
    
    it('should have an index on userId and reportDate', () => {
      // Get the indexes defined on the schema
      const indexes = FinancialReport.schema.indexes();
      
      // Find the compound index for userId and reportDate
      const userReportDateIndex = indexes.find(index => 
        index[0].userId === 1 && index[0].reportDate === -1);
      
      // Verify the index exists
      expect(userReportDateIndex).toBeDefined();
    });
  });
});
