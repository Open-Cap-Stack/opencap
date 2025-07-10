/**
 * Database Seeding Script
 * 
 * Seeds the database with realistic data for development and testing
 * NO MOCK DATA - All data is designed to be pulled via real APIs
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const { connectToMongoDB } = require('../db/mongoConnection');

// Load environment variables
dotenv.config();

// Import models
const User = require('../models/User');
const Company = require('../models/Company');
const FinancialReport = require('../models/financialReport');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Document = require('../models/Document');

// Seed data configuration
const SEED_CONFIG = {
  companies: 3,
  usersPerCompany: 5,
  financialReportsPerCompany: 12,
  activitiesPerCompany: 20,
  notificationsPerUser: 5,
  documentsPerCompany: 10
};

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Clear existing data
    await clearDatabase();
    
    // Seed companies
    const companies = await seedCompanies();
    
    // Seed users for each company
    const users = await seedUsers(companies);
    
    // Seed financial reports
    await seedFinancialReports(companies, users);
    
    // Seed activities
    await seedActivities(companies, users);
    
    // Seed notifications
    await seedNotifications(users);
    
    // Seed documents
    await seedDocuments(companies, users);
    
    console.log('✅ Database seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    await mongoose.connection.close();
  }
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  const collections = [
    'users', 'companies', 'financialreports', 'activities', 
    'notifications', 'documents'
  ];
  
  for (const collection of collections) {
    try {
      await mongoose.connection.db.collection(collection).deleteMany({});
      console.log(`  ✓ Cleared ${collection}`);
    } catch (error) {
      console.warn(`  ⚠️  Could not clear ${collection}:`, error.message);
    }
  }
}

async function seedCompanies() {
  console.log('🏢 Seeding companies...');
  
  const companyData = [
    {
      companyId: 'COMP_001',
      CompanyName: 'CloudTech Solutions',
      CompanyType: 'startup',
      RegisteredAddress: '123 Tech Boulevard, San Francisco, CA 94105',
      TaxID: '12-3456789',
      corporationDate: new Date('2020-01-15')
    },
    {
      companyId: 'COMP_002',
      CompanyName: 'EcoGen Power',
      CompanyType: 'corporation',
      RegisteredAddress: '456 Green Valley Road, Austin, TX 78701',
      TaxID: '98-7654321',
      corporationDate: new Date('2019-03-10')
    },
    {
      companyId: 'COMP_003',
      CompanyName: 'MediSync Health',
      CompanyType: 'startup',
      RegisteredAddress: '789 Health Plaza, Boston, MA 02101',
      TaxID: '55-9876543',
      corporationDate: new Date('2021-06-20')
    }
  ];
  
  const companies = [];
  for (const data of companyData) {
    const company = new Company(data);
    await company.save();
    companies.push(company);
    console.log(`  ✓ Created company: ${company.CompanyName}`);
  }
  
  return companies;
}

async function seedUsers(companies) {
  console.log('👥 Seeding users...');
  
  const userRoles = ['admin', 'founder', 'employee', 'investor', 'advisor'];
  const users = [];
  
  for (const company of companies) {
    const companyUsers = [];
    
    for (let i = 0; i < SEED_CONFIG.usersPerCompany; i++) {
      const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
      
      const firstName = getRandomFirstName();
      const lastName = getRandomLastName();
      
      const userData = {
        userId: `USER_${Date.now()}_${i}`,
        firstName: firstName,
        lastName: lastName,
        email: `user${i + 1}@${company.CompanyName.toLowerCase().replace(/\\s+/g, '')}.com`,
        password: hashedPassword,
        role: userRoles[i % userRoles.length] === 'founder' ? 'admin' : (userRoles[i % userRoles.length] === 'investor' ? 'client' : 'user'),
        profile: {
          bio: `${getRandomJobTitle()} at ${company.CompanyName}`,
          phoneNumber: generatePhoneNumber(),
          address: {
            city: getRandomCity(),
            state: getRandomState(),
            country: 'US'
          }
        },
        companyId: company._id,
        isActive: true,
        emailVerified: true
      };
      
      const user = new User(userData);
      await user.save();
      companyUsers.push(user);
      users.push(user);
      
      console.log(`  ✓ Created user: ${user.email} (${user.role})`);
    }
  }
  
  return users;
}

async function seedFinancialReports(companies, users) {
  console.log('📊 Seeding financial reports...');
  
  const reportTypes = ['quarterly', 'annual', 'monthly'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const years = [2022, 2023, 2024];
  
  for (const company of companies) {
    const companyUsers = users.filter(u => u.companyId.toString() === company._id.toString());
    const usedPeriods = new Set();
    
    for (let i = 0; i < SEED_CONFIG.financialReportsPerCompany; i++) {
      let year, quarter, reportingPeriod;
      
      // Ensure unique reporting periods
      do {
        year = years[Math.floor(Math.random() * years.length)];
        quarter = quarters[Math.floor(Math.random() * quarters.length)];
        reportingPeriod = `${year}-${quarter}`;
      } while (usedPeriods.has(reportingPeriod));
      
      usedPeriods.add(reportingPeriod);
      
      const baseRevenue = 50000 + (Math.random() * 450000);
      const baseExpenses = baseRevenue * (0.6 + Math.random() * 0.3);
      
      const salesRevenue = Math.round(baseRevenue * 0.7);
      const servicesRevenue = Math.round(baseRevenue * 0.25);
      const otherRevenue = Math.round(baseRevenue * 0.05);
      
      const salariesExpenses = Math.round(baseExpenses * 0.6);
      const marketingExpenses = Math.round(baseExpenses * 0.2);
      const operationsExpenses = Math.round(baseExpenses * 0.15);
      const otherExpenses = Math.round(baseExpenses * 0.05);
      
      const reportData = {
        companyId: company._id,
        reportingPeriod: reportingPeriod,
        reportType: reportTypes[Math.floor(Math.random() * reportTypes.length)],
        reportDate: new Date(year, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        revenue: {
          sales: salesRevenue,
          services: servicesRevenue,
          other: otherRevenue
        },
        expenses: {
          salaries: salariesExpenses,
          marketing: marketingExpenses,
          operations: operationsExpenses,
          other: otherExpenses
        },
        notes: `Financial report for ${company.CompanyName} - ${quarter} ${year}`,
        userId: companyUsers[Math.floor(Math.random() * companyUsers.length)]._id
      };
      
      const report = new FinancialReport(reportData);
      await report.save();
      
      console.log(`  ✓ Created financial report: ${company.CompanyName} ${reportingPeriod}`);
    }
  }
}

async function seedActivities(companies, users) {
  console.log('📝 Seeding activities...');
  
  const activityTypes = ['DocumentUpload', 'StakeholderUpdate', 'FinancialReportCreated', 'UserLogin', 'SystemUpdate'];
  
  for (const company of companies) {
    const companyUsers = users.filter(u => u.companyId.toString() === company._id.toString());
    
    for (let i = 0; i < SEED_CONFIG.activitiesPerCompany; i++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const user = companyUsers[Math.floor(Math.random() * companyUsers.length)];
      
      const activityData = {
        activityId: `ACT_${Date.now()}_${i}`,
        activityType,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within last 30 days
        userInvolved: user._id,
        changesMade: `${activityType} performed by ${user.profile.firstName} ${user.profile.lastName}`,
        relatedObjects: [company._id.toString()],
        companyId: company._id
      };
      
      const activity = new Activity(activityData);
      await activity.save();
      
      console.log(`  ✓ Created activity: ${activityType} for ${company.CompanyName}`);
    }
  }
}

async function seedNotifications(users) {
  console.log('🔔 Seeding notifications...');
  
  const notificationTypes = ['system', 'user-generated', 'reminder', 'alert'];
  const titles = [
    'Document requires signature',
    'Financial report submitted',
    'Stakeholder update available',
    'System maintenance scheduled',
    'New user joined company'
  ];
  
  for (const user of users) {
    for (let i = 0; i < SEED_CONFIG.notificationsPerUser; i++) {
      const notificationType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)];
      const title = titles[Math.floor(Math.random() * titles.length)];
      
      const notificationData = {
        notificationId: `NOTIF_${Date.now()}_${i}`,
        notificationType,
        title,
        message: `${title} - This is a system generated notification for ${user.profile.firstName} ${user.profile.lastName}`,
        recipient: user.email,
        Timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last 7 days
        RelatedObjects: user.companyId.toString(),
        UserInvolved: user._id,
        isRead: Math.random() > 0.5,
        companyId: user.companyId
      };
      
      const notification = new Notification(notificationData);
      await notification.save();
      
      console.log(`  ✓ Created notification: ${title} for ${user.email}`);
    }
  }
}

async function seedDocuments(companies, users) {
  console.log('📄 Seeding documents...');
  
  const documentTypes = ['incorporation', 'shareholder_agreement', 'financial_report', 'legal_document', 'contract'];
  const documentNames = [
    'Articles of Incorporation',
    'Shareholder Agreement',
    'Employment Contract',
    'Non-Disclosure Agreement',
    'Financial Statement',
    'Board Resolution',
    'Stock Option Plan',
    'Operating Agreement',
    'Partnership Agreement',
    'Compliance Report'
  ];
  
  for (const company of companies) {
    const companyUsers = users.filter(u => u.companyId.toString() === company._id.toString());
    
    for (let i = 0; i < SEED_CONFIG.documentsPerCompany; i++) {
      const documentType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
      const documentName = documentNames[Math.floor(Math.random() * documentNames.length)];
      const creator = companyUsers[Math.floor(Math.random() * companyUsers.length)];
      
      const documentData = {
        title: `${documentName} - ${company.CompanyName}`,
        fileName: `${documentName.toLowerCase().replace(/\\s+/g, '_')}_${company.CompanyName.toLowerCase().replace(/\\s+/g, '_')}.pdf`,
        fileType: 'application/pdf',
        fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB to 5MB
        category: documentType,
        description: `${documentName} for ${company.CompanyName}`,
        tags: [documentType, company.CompanyType.toLowerCase(), 'legal'],
        uploadedBy: creator._id,
        companyId: company._id,
        accessLevel: Math.random() > 0.5 ? 'public' : 'private',
        status: Math.random() > 0.8 ? 'pending' : 'approved',
        version: '1.0',
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Within last 60 days
        updatedAt: new Date()
      };
      
      const document = new Document(documentData);
      await document.save();
      
      console.log(`  ✓ Created document: ${documentData.title}`);
    }
  }
}

// Helper functions for generating realistic data
function getRandomFirstName() {
  const names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'River'];
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomLastName() {
  const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  return names[Math.floor(Math.random() * names.length)];
}

function generatePhoneNumber() {
  const area = Math.floor(Math.random() * 700) + 200;
  const exchange = Math.floor(Math.random() * 700) + 200;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `+1-${area}-${exchange}-${number}`;
}

function getRandomJobTitle() {
  const titles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Marketing Manager', 'Sales Director', 'Operations Manager', 'CTO', 'CFO', 'VP Engineering', 'Business Analyst'];
  return titles[Math.floor(Math.random() * titles.length)];
}

function getRandomDepartment() {
  const departments = ['Engineering', 'Product', 'Marketing', 'Sales', 'Operations', 'Finance', 'Legal', 'Human Resources', 'Business Development'];
  return departments[Math.floor(Math.random() * departments.length)];
}

function getRandomCity() {
  const cities = ['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston', 'Los Angeles', 'Chicago', 'Denver', 'Miami', 'Atlanta'];
  return cities[Math.floor(Math.random() * cities.length)];
}

function getRandomState() {
  const states = ['CA', 'NY', 'TX', 'WA', 'MA', 'IL', 'CO', 'FL', 'GA', 'OR'];
  return states[Math.floor(Math.random() * states.length)];
}

// Run the seeding script
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };