/**
 * Script to insert test financial data for API testing
 * [Feature] OCAE-402: Create financial metrics calculation endpoints
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FinancialReport = require('../models/financialReport');
const { connectToMongoDB } = require('../db/mongoConnection');

// Load environment variables
dotenv.config();

// Use MongoDB container connection
process.env.MONGODB_URI = 'mongodb://opencapapp:password123@mongodb:27017/opencap?authSource=opencap';

// Enable debug mode
process.env.DEBUG = 'mongoose:*';

// Set mongoose debug
mongoose.set('debug', true);

// Test company ID (created earlier)
const TEST_COMPANY_ID = '682a927938afe0dda2cc609a';
const TEST_USER_ID = '682a8d7b5ed376313af1529f'; // From the test user we've been using

// Test financial data for Q2 2024
const testFinancialData = [
  // Q2 2024 (current quarter)
  {
    companyId: TEST_COMPANY_ID,
    reportingPeriod: '2024-Q2',
    reportDate: new Date('2024-06-30'),
    reportType: 'quarterly',
    revenue: {
      sales: 150000,
      services: 50000,
      other: 10000
    },
    expenses: {
      salaries: 80000,
      marketing: 20000,
      operations: 30000,
      other: 10000
    },
    notes: 'Q2 2024 financial report',
    userId: TEST_USER_ID
  },
  // Q1 2024 (previous quarter for comparison)
  {
    companyId: TEST_COMPANY_ID,
    reportingPeriod: '2024-Q1',
    reportDate: new Date('2024-03-31'),
    reportType: 'quarterly',
    revenue: {
      sales: 120000,
      services: 45000,
      other: 8000
    },
    expenses: {
      salaries: 75000,
      marketing: 18000,
      operations: 28000,
      other: 9000
    },
    notes: 'Q1 2024 financial report',
    userId: TEST_USER_ID
  },
  // Full year 2023 (for annual comparison)
  {
    companyId: TEST_COMPANY_ID,
    reportingPeriod: '2023-annual',
    reportDate: new Date('2023-12-31'),
    reportType: 'annual',
    revenue: {
      sales: 400000,
      services: 160000,
      other: 30000
    },
    expenses: {
      salaries: 280000,
      marketing: 60000,
      operations: 100000,
      other: 30000
    },
    notes: 'Full year 2023 financial report',
    userId: TEST_USER_ID
  }
];

async function insertTestData() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    console.log('Connected to MongoDB');
    
    // Get the model to ensure it's registered with the correct collection name
    const collectionName = FinancialReport.collection.name;
    console.log(`Using collection: ${collectionName}`);
    
    // Delete any existing test data
    const deleteResult = await FinancialReport.deleteMany({ companyId: TEST_COMPANY_ID });
    console.log(`Cleaned up ${deleteResult.deletedCount} existing test records`);
    
    console.log('Inserting test data...');
    // Insert test data one by one for better error reporting
    const reports = [];
    for (const data of testFinancialData) {
      try {
        const report = new FinancialReport(data);
        await report.save();
        reports.push(report);
        console.log(`Inserted report for ${data.reportingPeriod}`);
      } catch (insertError) {
        console.error(`Error inserting report for ${data.reportingPeriod}:`, insertError.message);
        throw insertError; // Re-throw to be caught by the outer try-catch
      }
    }
    console.log(`Successfully inserted ${reports.length} financial reports`);
    
    // Calculate and display some basic metrics
    const companyReports = await FinancialReport.find({ companyId: TEST_COMPANY_ID }).lean();
    console.log('\nTest data summary:');
    companyReports.forEach(report => {
      console.log(`\n${report.reportingPeriod}:`);
      console.log(`- Total Revenue: $${(report.totalRevenue || 0).toLocaleString()}`);
      console.log(`- Total Expenses: $${(report.totalExpenses || 0).toLocaleString()}`);
      console.log(`- Net Income: $${(report.netIncome || 0).toLocaleString()}`);
    });
    
    console.log('\nTest data insertion completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting test data:', error);
    process.exit(1);
  }
}

// Run the script
insertTestData();
