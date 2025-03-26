/**
 * Database Seed Script
 * 
 * [Feature] OCDI-106: Database seed script
 * 
 * This script provides functionality to seed the database with initial data
 * for development and testing purposes. It includes:
 * - Admin user creation
 * - Sample companies
 * - Sample share classes
 * - Sample financial reports
 * 
 * Usage:
 * - Development: `node scripts/seedDatabase.js`
 * - Programmatic: `const { seedDatabase } = require('./scripts/seedDatabase'); await seedDatabase();`
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const ShareClass = require('../models/ShareClass');
const FinancialReport = require('../models/financialReport');
require('dotenv').config();

// Sample data for seeding
const SAMPLE_DATA = {
  admin: {
    email: 'admin@opencap.com',
    password: process.env.SEED_ADMIN_PASSWORD || 'AdminPassword123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin'
  },
  companies: [
    {
      companyId: 'COMP001',
      CompanyName: 'TechVentures Inc.',
      CompanyType: 'startup',
      RegisteredAddress: '123 Innovation Drive, San Francisco, CA 94107',
      TaxID: '12-3456789',
      corporationDate: new Date('2022-01-15')
    },
    {
      companyId: 'COMP002',
      CompanyName: 'BlueOcean Solutions',
      CompanyType: 'corporation',
      RegisteredAddress: '456 Enterprise Avenue, Boston, MA 02108',
      TaxID: '98-7654321',
      corporationDate: new Date('2021-05-10')
    },
    {
      companyId: 'COMP003',
      CompanyName: 'GreenField Innovations',
      CompanyType: 'startup',
      RegisteredAddress: '789 Startup Lane, Austin, TX 78701',
      TaxID: '45-6789123',
      corporationDate: new Date('2023-03-22')
    }
  ],
  shareClasses: [
    {
      name: 'Common Stock',
      description: 'Standard common stock with voting rights',
      companyId: 'COMP001',
      shareClassId: 'SC001-COMP001',
      votingRights: true,
      liquidationPreference: 1.0,
      conversionRights: false,
      antiDilutionProtection: false
    },
    {
      name: 'Series A Preferred',
      description: 'Preferred shares with liquidation preference',
      companyId: 'COMP001',
      shareClassId: 'SC002-COMP001',
      votingRights: true,
      liquidationPreference: 1.5,
      conversionRights: true,
      antiDilutionProtection: true
    },
    {
      name: 'Common Stock',
      description: 'Standard common stock with voting rights',
      companyId: 'COMP002',
      shareClassId: 'SC001-COMP002',
      votingRights: true,
      liquidationPreference: 1.0,
      conversionRights: false,
      antiDilutionProtection: false
    }
  ],
  financialReports: [
    {
      companyId: 'COMP001',
      reportingPeriod: '2023-Q1',
      reportDate: new Date('2023-03-31'),
      reportType: 'quarterly',
      revenue: {
        sales: 250000,
        services: 100000,
        other: 25000
      },
      expenses: {
        salaries: 150000,
        marketing: 50000,
        operations: 75000,
        other: 25000
      },
      notes: 'Q1 performance exceeded expectations with new product launch',
      userId: 'ADMIN-USER-ID' // Default placeholder, will be replaced if possible
    },
    {
      companyId: 'COMP001',
      reportingPeriod: '2023-Q2',
      reportDate: new Date('2023-06-30'),
      reportType: 'quarterly',
      revenue: {
        sales: 300000,
        services: 120000,
        other: 30000
      },
      expenses: {
        salaries: 160000,
        marketing: 60000,
        operations: 80000,
        other: 30000
      },
      notes: 'Q2 showed continued growth in core product lines',
      userId: 'ADMIN-USER-ID' // Default placeholder, will be replaced if possible
    }
  ]
};

/**
 * Seed database with initial data
 * @returns {Promise<void>}
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Create admin user if it doesn't exist
    const adminExists = await User.exists({ email: SAMPLE_DATA.admin.email });
    if (!adminExists) {
      console.log('Creating admin user...');
      const admin = await User.create(SAMPLE_DATA.admin);
      console.log(`✅ Admin user created with ID: ${admin && admin._id ? admin._id : 'ADMIN-USER-ID'}`);
      
      // Set admin user ID for financial reports if available
      if (admin && admin._id) {
        SAMPLE_DATA.financialReports.forEach(report => {
          report.userId = admin._id;
        });
      }
    } else {
      console.log('Admin user already exists, skipping...');
      
      try {
        // Get admin user ID for financial reports
        const admin = await User.findOne({ email: SAMPLE_DATA.admin.email });
        if (admin && admin._id) {
          SAMPLE_DATA.financialReports.forEach(report => {
            report.userId = admin._id;
          });
        }
      } catch (err) {
        console.log('Unable to retrieve admin ID, using default placeholder');
      }
    }
    
    // Seed companies
    for (const company of SAMPLE_DATA.companies) {
      const companyExists = await Company.exists({ companyId: company.companyId });
      if (!companyExists) {
        await Company.create(company);
        console.log(`✅ Created company: ${company.CompanyName}`);
      } else {
        console.log(`Company ${company.CompanyName} already exists, skipping...`);
      }
    }
    
    // Seed share classes
    for (const shareClass of SAMPLE_DATA.shareClasses) {
      const shareClassExists = await ShareClass.exists({ shareClassId: shareClass.shareClassId });
      if (!shareClassExists) {
        await ShareClass.create(shareClass);
        console.log(`✅ Created share class: ${shareClass.name} for company ${shareClass.companyId}`);
      } else {
        console.log(`Share class ${shareClass.shareClassId} already exists, skipping...`);
      }
    }
    
    // Seed financial reports
    for (const report of SAMPLE_DATA.financialReports) {
      const reportExists = await FinancialReport.exists({ 
        companyId: report.companyId,
        reportingPeriod: report.reportingPeriod
      });
      
      if (!reportExists) {
        try {
          // Support both direct create and constructor pattern for tests
          if (typeof FinancialReport.create === 'function') {
            await FinancialReport.create(report);
          } else {
            // Calculate totals before saving
            const financialReport = new FinancialReport(report);
            // Only call calculateTotals if it exists (in case of mocking)
            if (typeof financialReport.calculateTotals === 'function') {
              financialReport.calculateTotals();
            }
            await financialReport.save();
          }
          console.log(`✅ Created financial report: ${report.reportingPeriod} for company ${report.companyId}`);
        } catch (err) {
          console.log(`Error creating financial report: ${err.message}`);
        }
      } else {
        console.log(`Financial report ${report.reportingPeriod} for company ${report.companyId} already exists, skipping...`);
      }
    }
    
    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

/**
 * Clear all collections in the database
 * DANGER: Only for development/testing environments
 * @returns {Promise<void>}
 */
async function clearDatabase() {
  try {
    // Safety check to prevent accidental clearing of production data
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Refusing to clear database in production environment');
    }
    
    console.log('🧹 Clearing database collections...');
    
    // Get all collections and clear them
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      const result = await collection.deleteMany({});
      console.log(`Cleared ${result.deletedCount} documents from ${key}`);
    }
    
    console.log('✅ Database cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

// Direct script execution
if (require.main === module) {
  // Connect to database
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      return seedDatabase();
    })
    .then(() => {
      console.log('Seed operation completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error during seed operation:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, clearDatabase, SAMPLE_DATA };
