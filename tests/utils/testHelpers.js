/**
 * Test Helper Utilities
 * 
 * Common utilities and fixtures for testing
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Company = require('../../models/Company');
const FinancialReport = require('../../models/financialReport');

/**
 * Generate JWT token for testing
 */
function generateTestToken(userId = 'test-user-id', role = 'user') {
  const secret = process.env.JWT_SECRET || 'test-secret-key';
  return jwt.sign(
    { 
      id: userId, 
      role,
      email: 'test@example.com'
    },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * Create test user
 */
async function createTestUser(userData = {}) {
  const defaultUser = {
    userId: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    password: await bcrypt.hash('password123', 10),
    role: 'user',
    status: 'active',
    companyId: new mongoose.Types.ObjectId(),
    emailVerified: true,
    profile: {
      bio: 'Test user bio',
      address: {
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country'
      }
    }
  };
  
  const user = new User({ ...defaultUser, ...userData });
  return await user.save();
}

/**
 * Create test admin user
 */
async function createTestAdmin(userData = {}) {
  return await createTestUser({
    role: 'admin',
    email: `admin-${Date.now()}@example.com`,
    ...userData
  });
}

/**
 * Create test company
 */
async function createTestCompany(companyData = {}) {
  const defaultCompany = {
    companyId: `company-${Date.now()}`,
    CompanyName: `Test Company ${Date.now()}`,
    CompanyType: 'startup',
    RegisteredAddress: '123 Test Street, Test City, TS 12345',
    TaxID: `${Math.random().toString().substr(2, 9)}`,
    corporationDate: new Date('2020-01-01')
  };
  
  const company = new Company({ ...defaultCompany, ...companyData });
  return await company.save();
}

/**
 * Create test financial report
 */
async function createTestFinancialReport(reportData = {}) {
  const company = reportData.companyId || await createTestCompany();
  
  const defaultReport = {
    companyId: company._id || company,
    reportingPeriod: 'Q1 2024',
    reportType: 'quarterly',
    reportDate: new Date(),
    revenue: {
      sales: 100000,
      services: 50000,
      other: 10000
    },
    expenses: {
      salaries: 80000,
      marketing: 20000,
      operations: 15000,
      other: 5000
    },
    totalRevenue: 160000,
    totalExpenses: 120000,
    netIncome: 40000,
    notes: 'Test financial report'
  };
  
  const report = new FinancialReport({ ...defaultReport, ...reportData });
  return await report.save();
}

/**
 * Authentication helper for API tests
 */
function createAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Wait for async operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data
 */
const testData = {
  email: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  name: () => `Test User ${Date.now()}`,
  company: () => `Test Company ${Date.now()}`,
  id: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}`
};

/**
 * Validate response format
 */
function validateApiResponse(response, expectedFields = []) {
  expect(response).toHaveProperty('status');
  expect(response).toHaveProperty('body');
  
  if (expectedFields.length > 0) {
    expectedFields.forEach(field => {
      expect(response.body).toHaveProperty(field);
    });
  }
}

/**
 * Test database constraints
 */
async function testDatabaseConstraints(Model, invalidData, expectedError) {
  try {
    await Model.create(invalidData);
    throw new Error('Expected validation error but none was thrown');
  } catch (error) {
    expect(error.name).toBe('ValidationError');
    if (expectedError) {
      expect(error.message).toContain(expectedError);
    }
  }
}

module.exports = {
  generateTestToken,
  createTestUser,
  createTestAdmin,
  createTestCompany,
  createTestFinancialReport,
  createAuthHeaders,
  sleep,
  testData,
  validateApiResponse,
  testDatabaseConstraints
};