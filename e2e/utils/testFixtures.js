/**
 * OpenCap E2E Test Fixtures
 * 
 * [Feature] OCAE-504: Create end-to-end test suite
 * 
 * This module provides test fixtures and utilities for comprehensive E2E testing
 * of the OpenCap platform, including authentication, data setup, and cleanup.
 */

const { test as base, expect } = require('@playwright/test');

// Test data fixtures
const testUsers = {
  admin: {
    email: 'admin@opencap.test',
    password: 'AdminPass123!',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  },
  regularUser: {
    email: 'user@opencap.test',
    password: 'UserPass123!',
    role: 'user',
    firstName: 'Regular',
    lastName: 'User'
  },
  analyst: {
    email: 'analyst@opencap.test',
    password: 'AnalystPass123!',
    role: 'security_analyst',
    firstName: 'Security',
    lastName: 'Analyst'
  }
};

const testCompanies = {
  techStartup: {
    name: 'Tech Startup Inc',
    description: 'A technology startup company',
    industry: 'Technology',
    foundedDate: '2020-01-01',
    ein: '12-3456789'
  },
  consultingFirm: {
    name: 'Consulting Solutions LLC',
    description: 'Professional consulting services',
    industry: 'Consulting',
    foundedDate: '2018-05-15',
    ein: '98-7654321'
  }
};

const testSPVs = {
  fundA: {
    name: 'Investment Fund A',
    description: 'High-growth technology investments',
    totalCapital: 5000000,
    status: 'active'
  },
  fundB: {
    name: 'Real Estate Fund B',
    description: 'Commercial real estate investments',
    totalCapital: 10000000,
    status: 'active'
  }
};

// Enhanced test fixture with authentication and API utilities
const test = base.extend({
  // Authenticated context for admin user
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Perform admin login
    await page.goto('/api/v1/auth/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    
    // Wait for authentication
    await page.waitForResponse(response => 
      response.url().includes('/auth/login') && response.status() === 200
    );
    
    await use(context);
    await context.close();
  },

  // Authenticated context for regular user
  userContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Perform user login
    await page.goto('/api/v1/auth/login');
    await page.fill('input[name="email"]', testUsers.regularUser.email);
    await page.fill('input[name="password"]', testUsers.regularUser.password);
    await page.click('button[type="submit"]');
    
    await page.waitForResponse(response => 
      response.url().includes('/auth/login') && response.status() === 200
    );
    
    await use(context);
    await context.close();
  },

  // API client for direct API testing
  apiClient: async ({ request }, use) => {
    let authToken = null;
    
    const client = {
      // Authentication
      async login(email, password) {
        const response = await request.post('/api/v1/auth/login', {
          data: { email, password }
        });
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        authToken = data.token;
        return data;
      },

      // Generic authenticated request
      async authenticatedRequest(method, url, options = {}) {
        if (!authToken) {
          throw new Error('Must login first before making authenticated requests');
        }
        
        return request[method.toLowerCase()](url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
      },

      // User management
      async createUser(userData) {
        return this.authenticatedRequest('POST', '/api/v1/users', {
          data: userData
        });
      },

      async getUsers() {
        return this.authenticatedRequest('GET', '/api/v1/users');
      },

      // Company management
      async createCompany(companyData) {
        return this.authenticatedRequest('POST', '/api/v1/companies', {
          data: companyData
        });
      },

      async getCompanies() {
        return this.authenticatedRequest('GET', '/api/v1/companies');
      },

      // SPV management
      async createSPV(spvData) {
        return this.authenticatedRequest('POST', '/api/v1/spvs', {
          data: spvData
        });
      },

      async getSPVs() {
        return this.authenticatedRequest('GET', '/api/v1/spvs');
      },

      // Financial reporting
      async createFinancialReport(reportData) {
        return this.authenticatedRequest('POST', '/api/v1/financial-reports', {
          data: reportData
        });
      },

      async getFinancialReports() {
        return this.authenticatedRequest('GET', '/api/v1/financial-reports');
      },

      // Security audit logs
      async getSecurityAudits(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/v1/security-audits${queryString ? '?' + queryString : ''}`;
        return this.authenticatedRequest('GET', url);
      },

      // Document management
      async uploadDocument(filePath, metadata = {}) {
        return this.authenticatedRequest('POST', '/api/v1/documents', {
          multipart: {
            file: filePath,
            ...metadata
          }
        });
      },

      // Admin operations
      async getSystemHealth() {
        return request.get('/health');
      },

      async getApiDocs() {
        return request.get('/api-docs');
      }
    };

    await use(client);
  },

  // Database utilities for test data management
  dbUtils: async ({}, use) => {
    const utils = {
      // Setup test data
      async setupTestData() {
        // This would typically use MongoDB connection to create test data
        console.log('Setting up test data...');
      },

      // Cleanup test data
      async cleanupTestData() {
        // This would typically clean up test data from MongoDB
        console.log('Cleaning up test data...');
      },

      // Create test users
      async createTestUsers() {
        // Implementation would create test users in database
        console.log('Creating test users...');
      }
    };

    await utils.setupTestData();
    await use(utils);
    await utils.cleanupTestData();
  }
});

// Export test fixtures and data
module.exports = {
  test,
  expect,
  testUsers,
  testCompanies,
  testSPVs
};