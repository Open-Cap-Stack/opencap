const mongoose = require('mongoose');
const FinancialReport = require('../models/financialReport');
const { connectDB, closeDatabase, clearDatabase } = require('./setup/testDB');

describe('Financial Report Enhanced Validation', () => {
  // Connect to the database before all tests
  beforeAll(async () => {
    await connectDB();
  });

  // Clear database after each test
  afterEach(async () => {
    await clearDatabase();
  });

  // Close database connection after all tests
  afterAll(async () => {
    await closeDatabase();
  });

  test('should require positive values in revenue and expenses', async () => {
    // Create an invalid financial report with negative revenue
    const invalidFinancialReport = new FinancialReport({
      companyId: 'company-123',
      reportingPeriod: 'Q2 2023',
      reportType: 'quarterly',
      reportDate: new Date('2023-06-30'),
      revenue: {
        sales: -10000, // Negative revenue - should fail validation
        services: 15000,
        other: 5000
      },
      expenses: {
        salaries: 20000,
        marketing: 5000,
        operations: 3000,
        other: 2000
      },
      userId: new mongoose.Types.ObjectId()
    });

    // Validation should fail
    await expect(invalidFinancialReport.validate()).rejects.toThrow();
  });

  test('should require negative expenses values to fail validation', async () => {
    // Create an invalid financial report with negative expenses
    const invalidFinancialReport = new FinancialReport({
      companyId: 'company-123',
      reportingPeriod: 'Q2 2023',
      reportType: 'quarterly',
      reportDate: new Date('2023-06-30'),
      revenue: {
        sales: 10000,
        services: 15000,
        other: 5000
      },
      expenses: {
        salaries: 20000,
        marketing: -5000, // Negative expense - should fail validation
        operations: 3000,
        other: 2000
      },
      userId: new mongoose.Types.ObjectId()
    });

    // Validation should fail
    await expect(invalidFinancialReport.validate()).rejects.toThrow();
  });

  test('should verify that calculated totals match provided totals', async () => {
    // Create a financial report with mismatched totals
    const mismatchedTotalsReport = new FinancialReport({
      companyId: 'company-123',
      reportingPeriod: 'Q3 2023',
      reportType: 'quarterly',
      reportDate: new Date('2023-09-30'),
      revenue: {
        sales: 50000,
        services: 20000,
        other: 10000
      },
      expenses: {
        salaries: 30000,
        marketing: 5000,
        operations: 3000,
        other: 2000
      },
      totalRevenue: 90000, // Incorrect - should be 80000
      totalExpenses: 40000,
      netIncome: 50000, // Incorrect - should be 40000
      userId: new mongoose.Types.ObjectId()
    });

    // Test saving to trigger full validation
    try {
      await mismatchedTotalsReport.save();
      fail('Saving should have failed due to mismatched totals');
    } catch (error) {
      expect(error.message).toContain('Provided totals do not match calculated totals');
    }
  });
  
  test('should auto-calculate totals when saving', async () => {
    // Create a valid financial report without pre-calculated totals
    const report = new FinancialReport({
      companyId: 'company-123',
      reportingPeriod: 'Q4 2023',
      reportType: 'quarterly',
      reportDate: new Date('2023-12-31'),
      revenue: {
        sales: 60000,
        services: 25000,
        other: 15000
      },
      expenses: {
        salaries: 35000,
        marketing: 8000,
        operations: 4000,
        other: 3000
      },
      userId: new mongoose.Types.ObjectId()
    });

    // Call the pre-validate hook manually
    report.calculateTotals();
    
    // Check if totals were calculated correctly
    expect(report.totalRevenue).toBe(100000);
    expect(report.totalExpenses).toBe(50000);
    expect(report.netIncome).toBe(50000);
  });

  test('should handle missing revenue or expenses gracefully', async () => {
    // Create a partial financial report with missing revenue
    const partialReport = new FinancialReport({
      companyId: 'company-123',
      reportingPeriod: 'Q1 2023',
      reportType: 'quarterly',
      reportDate: new Date('2023-03-31'),
      // revenue is intentionally missing
      expenses: {
        salaries: 30000,
        marketing: 5000,
        operations: 3000,
        other: 2000
      },
      userId: new mongoose.Types.ObjectId()
    });

    // Should not throw an error during validation
    await expect(partialReport.validate()).resolves.not.toThrow();
    
    // Should not throw an error when calculating totals on a partial document
    expect(() => partialReport.calculateTotals()).not.toThrow();
  });

  test('should auto-calculate totals on save for partially filled reports', async () => {
    // Create a report with only the minimum required fields
    const minimalReport = new FinancialReport({
      companyId: 'company-123',
      reportingPeriod: 'Q1 2023',
      reportType: 'quarterly',
      reportDate: new Date('2023-03-31'),
      userId: new mongoose.Types.ObjectId()
    });

    // Pre-save hook should not throw errors even without revenue/expenses
    await expect(minimalReport.validate()).resolves.not.toThrow();
    
    // Check that we can calculate totals with empty data
    minimalReport.calculateTotals();
    expect(minimalReport.totalRevenue).toBe(0);
    expect(minimalReport.totalExpenses).toBe(0);
    expect(minimalReport.netIncome).toBe(0);
  });
});
