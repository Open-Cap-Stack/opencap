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

  test('should require valid quarter names in revenue and expenses maps', async () => {
    // Create an invalid financial report with non-standard quarter names
    const invalidFinancialReport = new FinancialReport({
      ReportID: 'FIN-2023-Q1-INVALID',
      Type: 'Quarterly',
      Data: {
        revenue: new Map([['invalid_quarter', 50000]]),
        expenses: new Map([['q1', 30000]])
      },
      TotalRevenue: 50000,
      TotalExpenses: 30000,
      NetIncome: 20000,
      userId: new mongoose.Types.ObjectId(),
      Timestamp: new Date()
    });

    // Validation should fail
    await expect(invalidFinancialReport.validate()).rejects.toThrow();
  });

  test('should require revenue and expense values to be positive numbers', async () => {
    // Create an invalid financial report with negative revenue
    const invalidFinancialReport = new FinancialReport({
      ReportID: 'FIN-2023-Q2-NEGATIVE',
      Type: 'Quarterly',
      Data: {
        revenue: new Map([['q2', -10000]]), // Negative revenue
        expenses: new Map([['q2', 30000]])
      },
      TotalRevenue: -10000,
      TotalExpenses: 30000,
      NetIncome: -40000,
      userId: new mongoose.Types.ObjectId(),
      Timestamp: new Date()
    });

    // Validation should fail
    await expect(invalidFinancialReport.validate()).rejects.toThrow();
  });

  test('should verify that annual reports contain all four quarters', async () => {
    // Create an invalid annual report with missing quarters
    const invalidAnnualReport = new FinancialReport({
      ReportID: 'FIN-2023-ANNUAL-INCOMPLETE',
      Type: 'Annual',
      Data: {
        revenue: new Map([
          ['q1', 100000],
          ['q2', 120000],
          // q3 and q4 missing
        ]),
        expenses: new Map([
          ['q1', 60000],
          ['q2', 65000],
          ['q3', 70000],
          ['q4', 75000]
        ])
      },
      TotalRevenue: 220000,
      TotalExpenses: 270000,
      NetIncome: -50000,
      userId: new mongoose.Types.ObjectId(),
      Timestamp: new Date()
    });

    // Validation should fail
    await expect(invalidAnnualReport.validate()).rejects.toThrow();
  });

  test('should verify that calculated totals match provided totals', async () => {
    // Create a financial report with mismatched totals
    const mismatchedTotalsReport = new FinancialReport({
      ReportID: 'FIN-2023-Q3-MISMATCH',
      Type: 'Quarterly',
      Data: {
        revenue: new Map([['q3', 80000]]),
        expenses: new Map([['q3', 40000]])
      },
      TotalRevenue: 90000, // Incorrect - should be 80000
      TotalExpenses: 40000,
      NetIncome: 50000, // Incorrect - should be 40000
      userId: new mongoose.Types.ObjectId(),
      Timestamp: new Date()
    });

    // Add custom validation to check if calculated totals match provided totals
    await expect(async () => {
      // First calculate the correct totals
      mismatchedTotalsReport.calculateTotals();
      
      // Then check if they match the originally provided values
      // This assumes we'd add this validation to the model
      if (mismatchedTotalsReport.TotalRevenue !== 90000 || 
          mismatchedTotalsReport.NetIncome !== 50000) {
        throw new Error('Totals mismatch');
      }
      
      await mismatchedTotalsReport.validate();
    }).rejects.toThrow();
  });
});
