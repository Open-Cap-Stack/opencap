/**
 * Financial Metrics API Integration Tests
 * 
 * [Feature] OCAE-402: Create financial metrics calculation endpoints
 * Testing API integration with Express routes and MongoDB
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const FinancialReport = require('../../models/financialReport');
const Company = require('../../models/Company');
const { generateAuthToken } = require('../utils/authTestUtils');

// Mock data
const testCompany = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test Financial Metrics Company',
  ticker: 'TFMC',
  sector: 'Technology',
  industry: 'Software',
  isPublic: true,
  marketCap: 10000000,
  sharesOutstanding: 1000000,
  currentStockPrice: 10.0
};

const testUser = {
  _id: new mongoose.Types.ObjectId(),
  email: 'metrics-tester@example.com',
  role: 'admin',
  permissions: ['financialReports.view', 'financialReports.manage']
};

// Financial report test data
const testFinancialReports = [
  // Income statements
  {
    companyId: testCompany._id,
    reportType: 'income',
    reportingPeriod: { year: 2024, quarter: 'Q1' },
    data: {
      revenue: 1000000,
      costOfGoodsSold: 600000,
      grossProfit: 400000,
      operatingExpenses: 200000,
      operatingIncome: 200000,
      interestExpense: 50000,
      taxExpense: 40000,
      netIncome: 110000,
      ebitda: 250000
    }
  },
  {
    companyId: testCompany._id,
    reportType: 'income',
    reportingPeriod: { year: 2024, quarter: 'Q2' },
    data: {
      revenue: 1200000,
      costOfGoodsSold: 700000,
      grossProfit: 500000,
      operatingExpenses: 220000,
      operatingIncome: 280000,
      interestExpense: 50000,
      taxExpense: 60000,
      netIncome: 170000,
      ebitda: 330000
    }
  },
  {
    companyId: testCompany._id,
    reportType: 'income',
    reportingPeriod: { year: 2023, quarter: 'Q4' },
    data: {
      revenue: 950000,
      costOfGoodsSold: 570000,
      grossProfit: 380000,
      operatingExpenses: 190000,
      operatingIncome: 190000,
      interestExpense: 45000,
      taxExpense: 38000,
      netIncome: 107000,
      ebitda: 235000
    }
  },
  {
    companyId: testCompany._id,
    reportType: 'income',
    reportingPeriod: { year: 2023, quarter: 'full' },
    data: {
      revenue: 3800000,
      costOfGoodsSold: 2280000,
      grossProfit: 1520000,
      operatingExpenses: 760000,
      operatingIncome: 760000,
      interestExpense: 180000,
      taxExpense: 152000,
      netIncome: 428000,
      ebitda: 940000
    }
  },
  
  // Balance sheets
  {
    companyId: testCompany._id,
    reportType: 'balance',
    reportingPeriod: { year: 2024, quarter: 'Q1' },
    data: {
      totalAssets: 5000000,
      currentAssets: 2000000,
      inventory: 500000,
      cashAndCashEquivalents: 800000,
      accountsReceivable: 700000,
      totalLiabilities: 3000000,
      currentLiabilities: 1000000,
      longTermDebt: 2000000,
      equity: 2000000
    }
  },
  {
    companyId: testCompany._id,
    reportType: 'balance',
    reportingPeriod: { year: 2024, quarter: 'Q2' },
    data: {
      totalAssets: 5200000,
      currentAssets: 2100000,
      inventory: 520000,
      cashAndCashEquivalents: 850000,
      accountsReceivable: 730000,
      totalLiabilities: 2900000,
      currentLiabilities: 900000,
      longTermDebt: 2000000,
      equity: 2300000
    }
  },
  {
    companyId: testCompany._id,
    reportType: 'balance',
    reportingPeriod: { year: 2023, quarter: 'Q4' },
    data: {
      totalAssets: 4800000,
      currentAssets: 1900000,
      inventory: 480000,
      cashAndCashEquivalents: 750000,
      accountsReceivable: 670000,
      totalLiabilities: 3100000,
      currentLiabilities: 1100000,
      longTermDebt: 2000000,
      equity: 1700000
    }
  }
];

describe('Financial Metrics API Integration Tests', () => {
  let authToken;
  
  // Setup test data before running the tests
  beforeAll(async () => {
    // Connect to the test database if needed
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/opencap_test');
    }
    
    // Clear existing test data
    await Company.deleteMany({ name: testCompany.name });
    await FinancialReport.deleteMany({ companyId: testCompany._id });
    
    // Insert test company
    await Company.create(testCompany);
    
    // Insert test financial reports
    await FinancialReport.insertMany(testFinancialReports);
    
    // Generate auth token for the test user
    authToken = generateAuthToken(testUser);
  });
  
  // Clean up after tests
  afterAll(async () => {
    // Remove test data
    await Company.deleteMany({ name: testCompany.name });
    await FinancialReport.deleteMany({ companyId: testCompany._id });
    
    // Disconnect from the database if we connected in the before hook
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });
  
  describe('Profitability Metrics Endpoint', () => {
    it('should calculate and return profitability metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/profitability?period=2024-Q2`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('grossProfitMargin');
      expect(response.body).toHaveProperty('operatingProfitMargin');
      expect(response.body).toHaveProperty('netProfitMargin');
      
      // Verify specific calculations
      expect(response.body.grossProfitMargin).toBeCloseTo(0.417, 3); // 500K/1.2M
      expect(response.body.operatingProfitMargin).toBeCloseTo(0.233, 3); // 280K/1.2M
      expect(response.body.netProfitMargin).toBeCloseTo(0.142, 3); // 170K/1.2M
    });
    
    it('should return 404 for non-existent financial data', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/profitability?period=2020-Q1`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 400 for invalid period format', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/profitability?period=invalid-format`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/profitability?period=2024-Q2`);
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('Liquidity Metrics Endpoint', () => {
    it('should calculate and return liquidity metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/liquidity?period=2024-Q2`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('currentRatio');
      expect(response.body).toHaveProperty('quickRatio');
      expect(response.body).toHaveProperty('cashRatio');
      
      // Verify specific calculations
      expect(response.body.currentRatio).toBeCloseTo(2.33, 2); // 2.1M/900K
      expect(response.body.quickRatio).toBeCloseTo(1.76, 2); // (2.1M-520K)/900K
      expect(response.body.cashRatio).toBeCloseTo(0.94, 2); // 850K/900K
    });
  });
  
  describe('Solvency Metrics Endpoint', () => {
    it('should calculate and return solvency metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/solvency?period=2024-Q2`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('debtToEquityRatio');
      expect(response.body).toHaveProperty('debtToAssetRatio');
      expect(response.body).toHaveProperty('interestCoverageRatio');
      
      // Verify specific calculations
      expect(response.body.debtToEquityRatio).toBeCloseTo(1.26, 2); // 2.9M/2.3M
      expect(response.body.debtToAssetRatio).toBeCloseTo(0.56, 2); // 2.9M/5.2M
      expect(response.body.interestCoverageRatio).toBeCloseTo(5.6, 2); // 280K/50K
    });
  });
  
  describe('Efficiency Metrics Endpoint', () => {
    it('should calculate and return efficiency metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/efficiency?period=2024-Q2`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('assetTurnoverRatio');
      expect(response.body).toHaveProperty('inventoryTurnoverRatio');
      expect(response.body).toHaveProperty('receivablesTurnoverRatio');
      
      // We can't verify the exact calculations here because efficiency metrics
      // use averages that depend on multiple balance sheets
    });
  });
  
  describe('Growth Metrics Endpoint', () => {
    it('should calculate and return growth metrics comparing with previous year', async () => {
      // Create additional test data for previous year if needed
      
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/growth?period=2024-Q1&compareWith=previous-year`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('revenueGrowth');
      expect(response.body).toHaveProperty('netIncomeGrowth');
      
      // Specific calculations would depend on test data
    });
  });
  
  describe('Comprehensive Dashboard Endpoint', () => {
    it('should return a comprehensive metrics dashboard', async () => {
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/dashboard?period=2024-Q2`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profitability');
      expect(response.body).toHaveProperty('liquidity');
      expect(response.body).toHaveProperty('solvency');
      expect(response.body).toHaveProperty('efficiency');
      expect(response.body).toHaveProperty('growth');
      
      // For public companies, should also have valuation metrics
      expect(response.body).toHaveProperty('valuation');
    });
    
    it('should handle missing data gracefully in the dashboard', async () => {
      // Test with a period that has incomplete data
      const response = await request(app)
        .get(`/api/v1/companies/${testCompany._id}/metrics/dashboard?period=2023-Q1`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      // Even with missing data, the dashboard should return with available metrics
      // and error messages for the missing ones
    });
  });
});
