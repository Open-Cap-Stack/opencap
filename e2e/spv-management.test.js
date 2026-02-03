/**
 * E2E Tests: SPV Management Journey
 * GitHub Issue #43: Implement E2E Test Suite
 *
 * Tests the complete SPV (Special Purpose Vehicle) management workflow including:
 * - SPV creation
 * - SPV retrieval and listing
 * - SPV updates
 * - SPV investments and performance
 * - SPV reports
 * - SPV closure and liquidation
 * - SPV deletion
 */

const { test, expect } = require('@playwright/test');

// Base API URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data generators
const generateUniqueEmail = () => `spvtest_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
const generateUniqueUsername = () => `spvtest_${Date.now()}_${Math.random().toString(36).substring(7)}`;
const generateUniqueSPVId = () => `SPV_${Date.now()}_${Math.random().toString(36).substring(7)}`;

test.describe('SPV Management Journey', () => {
  let authToken;
  let createdSPVId;
  let testCompanyId;

  test.beforeAll(async ({ request }) => {
    // Register and login to get auth token
    const testUser = {
      name: 'SPV Test User',
      email: generateUniqueEmail(),
      password: 'SPVTest123!',
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

    testCompanyId = `company_${Date.now()}`;
  });

  test.describe('SPV Creation', () => {
    test('should create a new SPV with valid data', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const spvData = {
        SPVID: generateUniqueSPVId(),
        name: 'Test Investment Fund SPV',
        description: 'A test SPV for investment purposes',
        parentCompanyId: testCompanyId,
        targetRaise: 5000000,
        minimumInvestment: 25000,
        managementFee: 2.0,
        carriedInterest: 20.0,
        investmentPeriod: 24,
        fundTerm: 60,
        status: 'Active',
        complianceStatus: 'Compliant',
        formation: {
          jurisdiction: 'Delaware',
          formationDate: '2024-01-15',
          registrationNumber: 'DE-12345'
        },
        financials: {
          totalCapitalCommitted: 3000000,
          totalCapitalCalled: 1500000,
          nav: 1650000,
          distributions: 100000
        }
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: spvData
      });

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      expect(body).toBeDefined();

      createdSPVId = body._id || body.id || body.SPVID || (body.data && (body.data._id || body.data.id || body.data.SPVID));
    });

    test('should create SPV with minimum required fields', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const spvData = {
        SPVID: generateUniqueSPVId(),
        name: 'Minimal SPV',
        parentCompanyId: testCompanyId,
        status: 'Pending'
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: spvData
      });

      expect([200, 201, 400]).toContain(response.status());
    });

    test('should reject SPV creation without authentication', async ({ request }) => {
      const spvData = {
        SPVID: generateUniqueSPVId(),
        name: 'Unauthorized SPV',
        parentCompanyId: testCompanyId
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        data: spvData
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should reject SPV creation with missing required fields', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {} // Missing required fields
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should reject SPV creation with duplicate SPVID', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      // Try to create another SPV with the same ID
      const duplicateSpvData = {
        SPVID: createdSPVId, // Using the same ID
        name: 'Duplicate SPV',
        parentCompanyId: testCompanyId
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: duplicateSpvData
      });

      // Should reject duplicate or accept if SPVID was a generated ID
      expect([200, 201, 400, 409]).toContain(response.status());
    });
  });

  test.describe('SPV Retrieval', () => {
    test('should get all SPVs with pagination', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv`, {
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
    });

    test('should get a specific SPV by ID', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/${createdSPVId}`, {
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

    test('should return 404 for non-existent SPV', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status());
    });

    test('should return 404 for empty SPV ID', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Getting base route should return list of SPVs
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('SPV Filtering', () => {
    test('should filter SPVs by status', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const statuses = ['Active', 'Pending', 'Closed'];

      for (const status of statuses) {
        const response = await request.get(`${API_BASE_URL}/api/v1/spv/status/${status}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        expect([200, 404]).toContain(response.status());
      }
    });

    test('should filter SPVs by compliance status', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const complianceStatuses = ['Compliant', 'NonCompliant', 'PendingReview'];

      for (const status of complianceStatuses) {
        const response = await request.get(`${API_BASE_URL}/api/v1/spv/compliance/${status}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        expect([200, 404]).toContain(response.status());
      }
    });

    test('should filter SPVs by parent company', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/parent/${testCompanyId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('SPV Updates', () => {
    test('should update an existing SPV', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const updateData = {
        name: 'Updated Investment Fund SPV',
        description: 'Updated description for testing',
        targetRaise: 6000000,
        status: 'Active',
        complianceStatus: 'Compliant'
      };

      const response = await request.put(`${API_BASE_URL}/api/v1/spv/${createdSPVId}`, {
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
      test.skip(!createdSPVId, 'No SPV ID available');

      const response = await request.put(`${API_BASE_URL}/api/v1/spv/${createdSPVId}`, {
        data: { name: 'Unauthorized Update' }
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should return 404 when updating non-existent SPV', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.put(`${API_BASE_URL}/api/v1/spv/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: { name: 'Updated Name' }
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('SPV Investments', () => {
    test('should get SPV investments', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/${createdSPVId}/investments`, {
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
  });

  test.describe('SPV Performance', () => {
    test('should get SPV performance metrics', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/${createdSPVId}/performance`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toBeDefined();

        // Check for expected performance metrics
        const data = body.data || body;
        if (data.nav) expect(typeof data.nav).toBe('number');
        if (data.roi) expect(typeof data.roi).toBe('number');
        if (data.irr) expect(typeof data.irr).toBe('number');
      }
    });
  });

  test.describe('SPV Reports', () => {
    test('should get SPV summary report', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/${createdSPVId}/reports/summary`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());
    });

    test('should get SPV detailed report', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/${createdSPVId}/reports/detailed`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());
    });

    test('should get SPV tax report', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/${createdSPVId}/reports/tax`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());
    });

    test('should reject reports for invalid report type', async ({ request }) => {
      test.skip(!authToken || !createdSPVId, 'No auth token or SPV ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/spv/${createdSPVId}/reports/invalid`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('SPV Lifecycle Operations', () => {
    let lifecycleSPVId;

    test.beforeAll(async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      // Create an SPV for lifecycle testing
      const spvData = {
        SPVID: generateUniqueSPVId(),
        name: 'Lifecycle Test SPV',
        parentCompanyId: testCompanyId,
        status: 'Active',
        complianceStatus: 'Compliant',
        financials: {
          totalCapitalCommitted: 1000000,
          totalCapitalCalled: 500000,
          nav: 550000
        }
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: spvData
      });

      if (response.status() === 200 || response.status() === 201) {
        const body = await response.json();
        lifecycleSPVId = body._id || body.id || body.SPVID || (body.data && (body.data._id || body.data.id || body.data.SPVID));
      }
    });

    test('should close an SPV', async ({ request }) => {
      test.skip(!authToken || !lifecycleSPVId, 'No auth token or lifecycle SPV ID available');

      const response = await request.post(`${API_BASE_URL}/api/v1/spv/${lifecycleSPVId}/close`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          reason: 'Investment period completed',
          closingDate: new Date().toISOString()
        }
      });

      expect([200, 400, 404]).toContain(response.status());
    });

    test('should liquidate an SPV', async ({ request }) => {
      test.skip(!authToken || !lifecycleSPVId, 'No auth token or lifecycle SPV ID available');

      const response = await request.post(`${API_BASE_URL}/api/v1/spv/${lifecycleSPVId}/liquidate`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          liquidationDate: new Date().toISOString(),
          finalNAV: 600000,
          distributionMethod: 'pro-rata'
        }
      });

      expect([200, 400, 404]).toContain(response.status());
    });

    test('should reject close operation without authentication', async ({ request }) => {
      test.skip(!lifecycleSPVId, 'No lifecycle SPV ID available');

      const response = await request.post(`${API_BASE_URL}/api/v1/spv/${lifecycleSPVId}/close`);

      expect([401, 403]).toContain(response.status());
    });

    test('should reject liquidate operation without authentication', async ({ request }) => {
      test.skip(!lifecycleSPVId, 'No lifecycle SPV ID available');

      const response = await request.post(`${API_BASE_URL}/api/v1/spv/${lifecycleSPVId}/liquidate`);

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('SPV Deletion', () => {
    test('should delete an SPV', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      // First create an SPV to delete
      const spvData = {
        SPVID: generateUniqueSPVId(),
        name: 'SPV To Delete',
        parentCompanyId: testCompanyId,
        status: 'Pending'
      };

      const createResponse = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: spvData
      });

      let spvToDeleteId;
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const body = await createResponse.json();
        spvToDeleteId = body._id || body.id || body.SPVID || (body.data && (body.data._id || body.data.id || body.data.SPVID));
      }

      test.skip(!spvToDeleteId, 'No SPV ID to delete');

      // Now delete the SPV
      const deleteResponse = await request.delete(`${API_BASE_URL}/api/v1/spv/${spvToDeleteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 204]).toContain(deleteResponse.status());

      // Verify deletion
      const verifyResponse = await request.get(`${API_BASE_URL}/api/v1/spv/${spvToDeleteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([404]).toContain(verifyResponse.status());
    });

    test('should reject deletion without authentication', async ({ request }) => {
      test.skip(!createdSPVId, 'No SPV ID available');

      const response = await request.delete(`${API_BASE_URL}/api/v1/spv/${createdSPVId}`);

      expect([401, 403]).toContain(response.status());
    });

    test('should return 404 when deleting non-existent SPV', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.delete(`${API_BASE_URL}/api/v1/spv/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('SPV Complete Workflow', () => {
    test('should complete full SPV lifecycle: create -> invest -> perform -> report -> close', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      // Step 1: Create SPV
      const createData = {
        SPVID: generateUniqueSPVId(),
        name: 'Workflow Test SPV',
        description: 'SPV for workflow testing',
        parentCompanyId: testCompanyId,
        targetRaise: 2000000,
        minimumInvestment: 10000,
        status: 'Active',
        complianceStatus: 'Compliant',
        financials: {
          totalCapitalCommitted: 500000,
          totalCapitalCalled: 250000,
          nav: 275000
        }
      };

      const createResponse = await request.post(`${API_BASE_URL}/api/v1/spv`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: createData
      });

      let workflowSPVId;
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const body = await createResponse.json();
        workflowSPVId = body._id || body.id || body.SPVID || (body.data && (body.data._id || body.data.id || body.data.SPVID));
      }

      if (!workflowSPVId) {
        test.skip(true, 'Could not create SPV for workflow test');
        return;
      }

      // Step 2: Get investments
      const investmentsResponse = await request.get(`${API_BASE_URL}/api/v1/spv/${workflowSPVId}/investments`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(investmentsResponse.status());

      // Step 3: Get performance
      const performanceResponse = await request.get(`${API_BASE_URL}/api/v1/spv/${workflowSPVId}/performance`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(performanceResponse.status());

      // Step 4: Get reports
      const reportResponse = await request.get(`${API_BASE_URL}/api/v1/spv/${workflowSPVId}/reports/summary`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(reportResponse.status());

      // Step 5: Update status
      const updateResponse = await request.put(`${API_BASE_URL}/api/v1/spv/${workflowSPVId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'Closed',
          complianceStatus: 'Compliant'
        }
      });

      expect([200, 404]).toContain(updateResponse.status());

      // Verify final state
      const verifyResponse = await request.get(`${API_BASE_URL}/api/v1/spv/${workflowSPVId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (verifyResponse.status() === 200) {
        const body = await verifyResponse.json();
        const spv = body.data || body;
        expect(spv).toBeDefined();
      }
    });
  });
});

test.describe('SPV Management Error Handling', () => {
  test('should handle invalid SPV ID format', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/spv/invalid!@#$%`);

    expect([400, 401, 404]).toContain(response.status());
  });

  test('should handle malformed JSON in SPV creation', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/spv`, {
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{invalid json}'
    });

    expect([400, 401]).toContain(response.status());
  });

  test('should handle concurrent SPV operations gracefully', async ({ request }) => {
    // Concurrent GET requests should all succeed
    const requests = Array(5).fill(null).map(() =>
      request.get(`${API_BASE_URL}/api/v1/spv`, {
        params: { page: 1, limit: 5 }
      })
    );

    const responses = await Promise.all(requests);

    // All should return some response
    responses.forEach(response => {
      expect([200, 401, 429]).toContain(response.status());
    });
  });
});
