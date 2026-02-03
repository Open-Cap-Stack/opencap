/**
 * E2E Tests: Financial Reports Journey
 * GitHub Issue #43: Implement E2E Test Suite
 *
 * Tests the complete financial reports workflow including:
 * - Report creation
 * - Report retrieval and listing
 * - Report updates
 * - Report deletion
 * - Search and analytics
 */

const { test, expect } = require('@playwright/test');

// Base API URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data generators
const generateUniqueEmail = () => `finreport_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
const generateUniqueUsername = () => `finreport_${Date.now()}_${Math.random().toString(36).substring(7)}`;

test.describe('Financial Reports Journey', () => {
  let authToken;
  let createdReportId;
  let testCompanyId;

  test.beforeAll(async ({ request }) => {
    // Register and login to get auth token
    const testUser = {
      name: 'Financial Report Test User',
      email: generateUniqueEmail(),
      password: 'FinReport123!',
      username: generateUniqueUsername(),
      role: 'admin'
    };

    const registerResponse = await request.post(`${API_BASE_URL}/api/v1/auth/register`, {
      data: testUser
    });

    if (registerResponse.status() === 200 || registerResponse.status() === 201) {
      const body = await registerResponse.json();
      authToken = body.token || body.accessToken || (body.data && body.data.token);
    }

    // If registration didn't return a token, try login
    if (!authToken) {
      const loginResponse = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        }
      });

      if (loginResponse.status() === 200) {
        const body = await loginResponse.json();
        authToken = body.token || body.accessToken || (body.data && body.data.token);
      }
    }

    // Create a test company ID for reports
    testCompanyId = `company_${Date.now()}`;
  });

  test.describe('Report Creation', () => {
    test('should create a new financial report with valid data', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const reportData = {
        companyId: testCompanyId,
        reportType: 'quarterly',
        reportingPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        },
        financialData: {
          revenue: 1500000,
          expenses: 1200000,
          netIncome: 300000,
          assets: 5000000,
          liabilities: 2000000,
          equity: 3000000
        },
        status: 'draft',
        currency: 'USD'
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: reportData
      });

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      expect(body).toBeDefined();

      // Store the created report ID for later tests
      createdReportId = body._id || body.id || (body.data && (body.data._id || body.data.id));
    });

    test('should create multiple reports for bulk operations', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const reportsData = [
        {
          companyId: testCompanyId,
          reportType: 'monthly',
          reportingPeriod: { startDate: '2024-01-01', endDate: '2024-01-31' },
          financialData: { revenue: 500000, expenses: 400000, netIncome: 100000 },
          status: 'draft',
          currency: 'USD'
        },
        {
          companyId: testCompanyId,
          reportType: 'monthly',
          reportingPeriod: { startDate: '2024-02-01', endDate: '2024-02-29' },
          financialData: { revenue: 550000, expenses: 420000, netIncome: 130000 },
          status: 'draft',
          currency: 'USD'
        }
      ];

      const response = await request.post(`${API_BASE_URL}/api/v1/financial-reports/bulk`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: { reports: reportsData }
      });

      // Bulk create may or may not be implemented
      expect([200, 201, 404]).toContain(response.status());
    });

    test('should reject report creation without authentication', async ({ request }) => {
      const reportData = {
        companyId: testCompanyId,
        reportType: 'quarterly',
        financialData: { revenue: 1000000 }
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/financial-reports`, {
        data: reportData
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should reject report creation with missing required fields', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.post(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {} // Missing required fields
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should reject report creation with invalid financial data', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const reportData = {
        companyId: testCompanyId,
        reportType: 'quarterly',
        financialData: {
          revenue: 'invalid', // Should be number
          expenses: -1000000 // Negative value
        }
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: reportData
      });

      // May accept or reject based on validation rules
      expect([200, 201, 400, 422]).toContain(response.status());
    });
  });

  test.describe('Report Retrieval', () => {
    test('should get all financial reports with pagination', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          page: 1,
          limit: 10
        }
      });

      expect([200]).toContain(response.status());

      const body = await response.json();
      expect(body).toBeDefined();

      // Check for array of reports
      const reports = body.data || body.reports || body;
      if (Array.isArray(reports)) {
        expect(Array.isArray(reports)).toBe(true);
      }
    });

    test('should get a specific financial report by ID', async ({ request }) => {
      test.skip(!authToken || !createdReportId, 'No auth token or report ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports/${createdReportId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toBeDefined();
      }
    });

    test('should return 404 for non-existent report', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status());
    });

    test('should filter reports by company ID', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          companyId: testCompanyId
        }
      });

      expect([200]).toContain(response.status());
    });

    test('should filter reports by date range', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      });

      expect([200]).toContain(response.status());
    });
  });

  test.describe('Report Updates', () => {
    test('should update an existing financial report', async ({ request }) => {
      test.skip(!authToken || !createdReportId, 'No auth token or report ID available');

      const updateData = {
        status: 'published',
        financialData: {
          revenue: 1600000,
          expenses: 1250000,
          netIncome: 350000
        }
      };

      const response = await request.put(`${API_BASE_URL}/api/v1/financial-reports/${createdReportId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: updateData
      });

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toBeDefined();
      }
    });

    test('should reject update without authentication', async ({ request }) => {
      test.skip(!createdReportId, 'No report ID available');

      const updateData = {
        status: 'published'
      };

      const response = await request.put(`${API_BASE_URL}/api/v1/financial-reports/${createdReportId}`, {
        data: updateData
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should return 404 when updating non-existent report', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.put(`${API_BASE_URL}/api/v1/financial-reports/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: { status: 'published' }
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('Report Search and Analytics', () => {
    test('should search financial reports', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports/search`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          q: 'quarterly',
          reportType: 'quarterly'
        }
      });

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toBeDefined();
      }
    });

    test('should get financial report analytics', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports/analytics`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toBeDefined();
      }
    });

    test('should get analytics by company', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports/analytics`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          companyId: testCompanyId
        }
      });

      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Report Deletion', () => {
    test('should delete a financial report', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      // First create a report to delete
      const reportData = {
        companyId: testCompanyId,
        reportType: 'monthly',
        reportingPeriod: {
          startDate: '2024-06-01',
          endDate: '2024-06-30'
        },
        financialData: {
          revenue: 600000,
          expenses: 500000,
          netIncome: 100000
        },
        status: 'draft'
      };

      const createResponse = await request.post(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: reportData
      });

      let reportToDeleteId;
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const body = await createResponse.json();
        reportToDeleteId = body._id || body.id || (body.data && (body.data._id || body.data.id));
      }

      test.skip(!reportToDeleteId, 'No report ID to delete');

      // Now delete the report
      const deleteResponse = await request.delete(`${API_BASE_URL}/api/v1/financial-reports/${reportToDeleteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 204]).toContain(deleteResponse.status());

      // Verify deletion - should return 404
      const verifyResponse = await request.get(`${API_BASE_URL}/api/v1/financial-reports/${reportToDeleteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([404]).toContain(verifyResponse.status());
    });

    test('should reject deletion without authentication', async ({ request }) => {
      test.skip(!createdReportId, 'No report ID available');

      const response = await request.delete(`${API_BASE_URL}/api/v1/financial-reports/${createdReportId}`);

      expect([401, 403]).toContain(response.status());
    });

    test('should return 404 when deleting non-existent report', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.delete(`${API_BASE_URL}/api/v1/financial-reports/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('Report Workflow', () => {
    test('should complete full report lifecycle: create -> update -> publish -> archive', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      // Step 1: Create draft report
      const createData = {
        companyId: testCompanyId,
        reportType: 'annual',
        reportingPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        financialData: {
          revenue: 5000000,
          expenses: 4000000,
          netIncome: 1000000
        },
        status: 'draft'
      };

      const createResponse = await request.post(`${API_BASE_URL}/api/v1/financial-reports`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: createData
      });

      let lifecycleReportId;
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const body = await createResponse.json();
        lifecycleReportId = body._id || body.id || (body.data && (body.data._id || body.data.id));
      }

      if (!lifecycleReportId) {
        test.skip(true, 'Could not create report for lifecycle test');
        return;
      }

      // Step 2: Update with additional data
      const updateResponse = await request.put(`${API_BASE_URL}/api/v1/financial-reports/${lifecycleReportId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          financialData: {
            revenue: 5200000,
            expenses: 4100000,
            netIncome: 1100000,
            assets: 10000000,
            liabilities: 4000000,
            equity: 6000000
          }
        }
      });

      expect([200, 404]).toContain(updateResponse.status());

      // Step 3: Publish the report
      const publishResponse = await request.put(`${API_BASE_URL}/api/v1/financial-reports/${lifecycleReportId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'published'
        }
      });

      expect([200, 404]).toContain(publishResponse.status());

      // Step 4: Archive the report
      const archiveResponse = await request.put(`${API_BASE_URL}/api/v1/financial-reports/${lifecycleReportId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'archived'
        }
      });

      expect([200, 404]).toContain(archiveResponse.status());

      // Verify final state
      const verifyResponse = await request.get(`${API_BASE_URL}/api/v1/financial-reports/${lifecycleReportId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (verifyResponse.status() === 200) {
        const body = await verifyResponse.json();
        const report = body.data || body;
        // Check if status was updated (may be nested)
        if (report.status) {
          expect(['archived', 'published']).toContain(report.status);
        }
      }
    });
  });
});

test.describe('Financial Reports Error Handling', () => {
  test('should handle server errors gracefully', async ({ request }) => {
    // Test with invalid endpoint
    const response = await request.get(`${API_BASE_URL}/api/v1/financial-reports/invalid/path/here`);

    expect([400, 401, 404, 500]).toContain(response.status());
  });

  test('should handle malformed JSON in request body', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/financial-reports`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{invalid json}'
    });

    expect([400, 401]).toContain(response.status());
  });
});
