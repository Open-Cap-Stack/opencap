/**
 * Enhanced Test Financial Data Script
 * [Feature] OCAE-402: Create comprehensive test data for financial metrics
 * 
 * This script populates the database with comprehensive test data for testing
 * financial metrics and dashboard functionality.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FinancialReport = require('../models/financialReport');
const Company = require('../models/Company');
const { connectToMongoDB } = require('../db/mongoConnection');

// Load environment variables
dotenv.config();

// Test company and user IDs
const TEST_COMPANY_ID = '682a927938afe0dda2cc609a';
const TEST_USER_ID = '682a8d7b5ed376313af1529f';

/**
 * Generate quarterly financial data for a given year and quarter
 */
function generateQuarterlyData(year, quarter, baseRevenue, baseExpenses, variation = 0.1) {
  const quarterMultipliers = {
    Q1: 0.9, // Start of year is typically slower
    Q2: 1.0,
    Q3: 1.0,
    Q4: 1.1  // End of year boost
  };
  
  // Add some randomness
  const randomFactor = 1 + (Math.random() * 2 - 1) * variation;
  const quarterFactor = quarterMultipliers[quarter] || 1.0;
  
  // Calculate revenue components
  const sales = Math.round(baseRevenue.sales * quarterFactor * randomFactor);
  const services = Math.round(baseRevenue.services * quarterFactor * randomFactor);
  const otherRevenue = Math.round(baseRevenue.other * quarterFactor * randomFactor);
  const totalRevenue = sales + services + otherRevenue;
  
  // Calculate expenses (with some correlation to revenue but less variable)
  const salaries = Math.round(baseExpenses.salaries * (0.95 + Math.random() * 0.1));
  const marketing = Math.round(baseExpenses.marketing * (0.9 + Math.random() * 0.2));
  const operations = Math.round(baseExpenses.operations * (0.95 + Math.random() * 0.1));
  const otherExpenses = Math.round(baseExpenses.other * (0.9 + Math.random() * 0.2));
  const totalExpenses = salaries + marketing + operations + otherExpenses;
  
  // Calculate profit metrics
  const grossProfit = totalRevenue - salaries - operations; // Simplified COGS
  const operatingProfit = grossProfit - marketing - otherExpenses;
  const netIncome = operatingProfit * 0.8; // Simple tax rate of 20%
  
  return {
    companyId: TEST_COMPANY_ID,
    reportingPeriod: `${year}-${quarter}`,
    reportDate: new Date(
      year, 
      quarter === 'Q1' ? 2 : (quarter === 'Q2' ? 5 : (quarter === 'Q3' ? 8 : 11)),
      quarter === 'Q1' ? 31 : (quarter === 'Q2' ? 30 : (quarter === 'Q3' ? 30 : 31))
    ),
    reportType: 'quarterly',
    revenue: {
      sales,
      services,
      other: otherRevenue,
      total: totalRevenue
    },
    expenses: {
      salaries,
      marketing,
      operations,
      other: otherExpenses,
      total: totalExpenses
    },
    profit: {
      gross: grossProfit,
      operating: operatingProfit,
      net: netIncome
    },
    assets: {
      current: Math.round(totalRevenue * 0.7 * (0.9 + Math.random() * 0.2)),
      fixed: Math.round(totalRevenue * 1.2 * (0.9 + Math.random() * 0.2)),
      total: 0 // Will be calculated
    },
    liabilities: {
      current: Math.round(totalRevenue * 0.3 * (0.8 + Math.random() * 0.4)),
      longTerm: Math.round(totalRevenue * 0.6 * (0.8 + Math.random() * 0.4)),
      total: 0 // Will be calculated
    },
    equity: {
      common: 0, // Will be calculated
      retained: 0, // Will be calculated
      total: 0    // Will be calculated
    },
    metrics: {
      currentRatio: 0,
      quickRatio: 0,
      debtToEquity: 0,
      returnOnAssets: 0,
      returnOnEquity: 0
    },
    notes: `Test data for ${quarter} ${year}`,
    userId: TEST_USER_ID,
    isTestData: true
  };
}

/**
 * Generate annual financial data by aggregating quarterly data
 */
function generateAnnualData(year, quarterlyData) {
  const annualData = {
    companyId: TEST_COMPANY_ID,
    reportingPeriod: `${year}-annual`,
    reportDate: new Date(year, 11, 31),
    reportType: 'annual',
    revenue: { sales: 0, services: 0, other: 0, total: 0 },
    expenses: { salaries: 0, marketing: 0, operations: 0, other: 0, total: 0 },
    profit: { gross: 0, operating: 0, net: 0 },
    assets: { current: 0, fixed: 0, total: 0 },
    liabilities: { current: 0, longTerm: 0, total: 0 },
    equity: { common: 0, retained: 0, total: 0 },
    metrics: {},
    notes: `Annual report for ${year}`,
    userId: TEST_USER_ID,
    isTestData: true
  };

  // Sum up quarterly data
  quarterlyData.forEach(q => {
    annualData.revenue.sales += q.revenue.sales;
    annualData.revenue.services += q.revenue.services;
    annualData.revenue.other += q.revenue.other;
    annualData.revenue.total += q.revenue.total;
    
    annualData.expenses.salaries += q.expenses.salaries;
    annualData.expenses.marketing += q.expenses.marketing;
    annualData.expenses.operations += q.expenses.operations;
    annualData.expenses.other += q.expenses.other;
    annualData.expenses.total += q.expenses.total;
    
    annualData.profit.gross += q.profit.gross;
    annualData.profit.operating += q.profit.operating;
    annualData.profit.net += q.profit.net;
    
    // Use Q4 values for annual balance sheet items
    if (q.reportingPeriod.endsWith('Q4')) {
      annualData.assets = { ...q.assets };
      annualData.liabilities = { ...q.liabilities };
      annualData.equity = { ...q.equity };
    }
  });

  return annualData;
}

async function insertTestData() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    console.log('✅ Connected to MongoDB');
    
    // Ensure the test company exists
    let company = await Company.findById(TEST_COMPANY_ID);
    if (!company) {
      console.log('Creating test company...');
      company = new Company({
        _id: TEST_COMPANY_ID,
        companyId: 'TESTCOMPANY001',
        CompanyName: 'Test Company Inc.',
        CompanyType: 'corporation',
        RegisteredAddress: '123 Test St, San Francisco, CA 94105, USA',
        TaxID: '12-3456789',
        corporationDate: new Date('2020-01-01'),
        industry: 'Technology',
        isActive: true,
        financialYearEnd: 12, // December
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        settings: {
          fiscalYearStartMonth: 1, // January
          reportingCurrency: 'USD',
          taxRate: 0.2 // 20%
        },
        createdBy: TEST_USER_ID,
        updatedBy: TEST_USER_ID
      });
      await company.save();
      console.log('✅ Created test company');
    } else {
      console.log('ℹ️ Using existing test company');
    }

    // Base financials for generating test data
    const baseRevenue = {
      sales: 150000,
      services: 50000,
      other: 10000
    };
    
    const baseExpenses = {
      salaries: 80000,
      marketing: 20000,
      operations: 30000,
      other: 10000
    };

    // Generate test data for multiple years
    const years = [2022, 2023, 2024];
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    
    // Delete any existing test data for this company
    await FinancialReport.deleteMany({ 
      $or: [
        { companyId: TEST_COMPANY_ID },
        { isTestData: true }
      ]
    });
    console.log('🧹 Cleared existing test data for company', TEST_COMPANY_ID);
    
    // Generate and insert test data
    for (const year of years) {
      const yearlyData = [];
      
      // Generate quarterly data
      for (const quarter of quarters) {
        // Skip future quarters in the current year
        if (year === new Date().getFullYear()) {
          const currentQuarter = Math.floor((new Date().getMonth() + 3) / 3);
          const quarterNum = parseInt(quarter[1]);
          if (quarterNum > currentQuarter) continue;
        }
        
        const quarterlyData = generateQuarterlyData(year, quarter, baseRevenue, baseExpenses);
        yearlyData.push(quarterlyData);
      }
      
      // Generate and add annual data
      if (yearlyData.length > 0) {
        const annualData = generateAnnualData(year, yearlyData);
        yearlyData.push(annualData);
      }
      
      // Insert all data for the year
      if (yearlyData.length > 0) {
        await FinancialReport.insertMany(yearlyData);
        console.log(`✅ Inserted ${yearlyData.length} financial records for ${year}`);
      }
    }
    
    console.log('\n🎉 Test data generation complete!');
    console.log(`Total financial records: ${await FinancialReport.countDocuments({ isTestData: true })}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

// Run the script
insertTestData();
