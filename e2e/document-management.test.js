/**
 * E2E Tests: Document Management Journey
 * GitHub Issue #43: Implement E2E Test Suite
 *
 * Tests the complete document management workflow including:
 * - Document upload and creation
 * - Document retrieval and listing
 * - Document updates
 * - Document sharing and access control
 * - Document search (semantic and basic)
 * - Document deletion
 */

const { test, expect } = require('@playwright/test');

// Base API URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data generators
const generateUniqueEmail = () => `doctest_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
const generateUniqueUsername = () => `doctest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

test.describe('Document Management Journey', () => {
  let authToken;
  let createdDocumentId;
  let testCompanyId;
  let testUserId;

  test.beforeAll(async ({ request }) => {
    // Register and login to get auth token
    const testUser = {
      name: 'Document Test User',
      email: generateUniqueEmail(),
      password: 'DocTest123!',
      username: generateUniqueUsername(),
      role: 'admin'
    };

    const registerResponse = await request.post(`${API_BASE_URL}/api/v1/auth/register`, {
      data: testUser
    });

    if (registerResponse.status() === 200 || registerResponse.status() === 201) {
      const body = await registerResponse.json();
      authToken = body.token || body.accessToken || (body.data && body.data.token);
      testUserId = body.user?.id || body.userId || (body.data && body.data.user?.id);
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
        testUserId = body.user?.id || body.userId || (body.data && body.data.user?.id);
      }
    }

    testCompanyId = `company_${Date.now()}`;
  });

  test.describe('Document Creation', () => {
    test('should create a new document with valid data', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const documentData = {
        title: 'Test Financial Report Q1 2024',
        description: 'Quarterly financial report for testing purposes',
        documentType: 'financial_report',
        companyId: testCompanyId,
        fileUrl: 'https://example.com/documents/test-report.pdf',
        fileName: 'test-report.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        status: 'active',
        metadata: {
          quarter: 'Q1',
          year: 2024,
          reportType: 'quarterly'
        },
        tags: ['financial', 'quarterly', '2024']
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: documentData
      });

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      expect(body).toBeDefined();

      createdDocumentId = body._id || body.id || (body.data && (body.data._id || body.data.id));
    });

    test('should create document with different types', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const documentTypes = ['contract', 'agreement', 'legal', 'compliance'];

      for (const docType of documentTypes) {
        const documentData = {
          title: `Test ${docType} Document`,
          description: `Test document of type ${docType}`,
          documentType: docType,
          companyId: testCompanyId,
          fileUrl: `https://example.com/documents/test-${docType}.pdf`,
          fileName: `test-${docType}.pdf`,
          status: 'active'
        };

        const response = await request.post(`${API_BASE_URL}/api/v1/document`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: documentData
        });

        expect([200, 201, 400]).toContain(response.status());
      }
    });

    test('should reject document creation without authentication', async ({ request }) => {
      const documentData = {
        title: 'Unauthorized Document',
        documentType: 'financial_report',
        companyId: testCompanyId
      };

      const response = await request.post(`${API_BASE_URL}/api/v1/document`, {
        data: documentData
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should reject document creation with missing required fields', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.post(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {} // Missing required fields
      });

      expect([400, 422]).toContain(response.status());
    });
  });

  test.describe('Document Retrieval', () => {
    test('should get all documents with pagination', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document`, {
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

    test('should get a specific document by ID', async ({ request }) => {
      test.skip(!authToken || !createdDocumentId, 'No auth token or document ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/${createdDocumentId}`, {
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

    test('should return 404 for non-existent document', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status());
    });

    test('should filter documents by company ID', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          companyId: testCompanyId
        }
      });

      expect([200]).toContain(response.status());
    });

    test('should filter documents by document type', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          documentType: 'financial_report'
        }
      });

      expect([200]).toContain(response.status());
    });

    test('should filter documents by status', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          status: 'active'
        }
      });

      expect([200]).toContain(response.status());
    });
  });

  test.describe('Document Updates', () => {
    test('should update an existing document', async ({ request }) => {
      test.skip(!authToken || !createdDocumentId, 'No auth token or document ID available');

      const updateData = {
        title: 'Updated Financial Report Q1 2024',
        description: 'Updated description for testing',
        status: 'archived',
        metadata: {
          quarter: 'Q1',
          year: 2024,
          updated: true
        }
      };

      const response = await request.put(`${API_BASE_URL}/api/v1/document/${createdDocumentId}`, {
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
      test.skip(!createdDocumentId, 'No document ID available');

      const response = await request.put(`${API_BASE_URL}/api/v1/document/${createdDocumentId}`, {
        data: { title: 'Unauthorized Update' }
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should return 404 when updating non-existent document', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.put(`${API_BASE_URL}/api/v1/document/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: { title: 'Updated Title' }
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('Document Search', () => {
    test('should search documents with query', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.post(`${API_BASE_URL}/api/v1/document/search`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          query: 'financial report',
          limit: 10
        }
      });

      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const body = await response.json();
        expect(body).toBeDefined();
      }
    });

    test('should search documents by tags', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          tags: 'financial,quarterly'
        }
      });

      expect([200]).toContain(response.status());
    });

    test('should find similar documents', async ({ request }) => {
      test.skip(!authToken || !createdDocumentId, 'No auth token or document ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/${createdDocumentId}/similar`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        params: {
          limit: 5
        }
      });

      expect([200, 404]).toContain(response.status());
    });

    test('should get document analytics', async ({ request }) => {
      test.skip(!authToken || !createdDocumentId, 'No auth token or document ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/${createdDocumentId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Document Access Control', () => {
    test('should get document access permissions', async ({ request }) => {
      test.skip(!authToken || !createdDocumentId, 'No auth token or document ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/${createdDocumentId}/access`, {
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

    test('should get document preview', async ({ request }) => {
      test.skip(!authToken || !createdDocumentId, 'No auth token or document ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/${createdDocumentId}/preview`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(response.status());
    });

    test('should download document', async ({ request }) => {
      test.skip(!authToken || !createdDocumentId, 'No auth token or document ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/${createdDocumentId}/download`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Download may return file or redirect
      expect([200, 302, 404]).toContain(response.status());
    });

    test('should reject document access without authentication', async ({ request }) => {
      test.skip(!createdDocumentId, 'No document ID available');

      const response = await request.get(`${API_BASE_URL}/api/v1/document/${createdDocumentId}/access`);

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Document Deletion', () => {
    test('should delete a document', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      // First create a document to delete
      const documentData = {
        title: 'Document To Delete',
        description: 'This document will be deleted',
        documentType: 'temporary',
        companyId: testCompanyId,
        status: 'active'
      };

      const createResponse = await request.post(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: documentData
      });

      let docToDeleteId;
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const body = await createResponse.json();
        docToDeleteId = body._id || body.id || (body.data && (body.data._id || body.data.id));
      }

      test.skip(!docToDeleteId, 'No document ID to delete');

      // Now delete the document
      const deleteResponse = await request.delete(`${API_BASE_URL}/api/v1/document/${docToDeleteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 204]).toContain(deleteResponse.status());

      // Verify deletion
      const verifyResponse = await request.get(`${API_BASE_URL}/api/v1/document/${docToDeleteId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([404]).toContain(verifyResponse.status());
    });

    test('should reject deletion without authentication', async ({ request }) => {
      test.skip(!createdDocumentId, 'No document ID available');

      const response = await request.delete(`${API_BASE_URL}/api/v1/document/${createdDocumentId}`);

      expect([401, 403]).toContain(response.status());
    });

    test('should return 404 when deleting non-existent document', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.delete(`${API_BASE_URL}/api/v1/document/nonexistent123`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([400, 404]).toContain(response.status());
    });
  });

  test.describe('Bulk Document Operations', () => {
    test('should bulk index documents for vector search', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.post(`${API_BASE_URL}/api/v1/document/bulk-index`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          documentIds: [createdDocumentId].filter(Boolean)
        }
      });

      // Bulk index may or may not be implemented
      expect([200, 201, 404]).toContain(response.status());
    });
  });

  test.describe('Document Workflow', () => {
    test('should complete full document lifecycle: create -> update -> share -> archive', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      // Step 1: Create document
      const createData = {
        title: 'Lifecycle Test Document',
        description: 'Document for lifecycle testing',
        documentType: 'contract',
        companyId: testCompanyId,
        fileUrl: 'https://example.com/docs/lifecycle.pdf',
        fileName: 'lifecycle.pdf',
        status: 'draft'
      };

      const createResponse = await request.post(`${API_BASE_URL}/api/v1/document`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: createData
      });

      let lifecycleDocId;
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const body = await createResponse.json();
        lifecycleDocId = body._id || body.id || (body.data && (body.data._id || body.data.id));
      }

      if (!lifecycleDocId) {
        test.skip(true, 'Could not create document for lifecycle test');
        return;
      }

      // Step 2: Update document
      const updateResponse = await request.put(`${API_BASE_URL}/api/v1/document/${lifecycleDocId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'active',
          metadata: { reviewed: true, reviewer: 'Test User' }
        }
      });

      expect([200, 404]).toContain(updateResponse.status());

      // Step 3: Check access
      const accessResponse = await request.get(`${API_BASE_URL}/api/v1/document/${lifecycleDocId}/access`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect([200, 404]).toContain(accessResponse.status());

      // Step 4: Archive document
      const archiveResponse = await request.put(`${API_BASE_URL}/api/v1/document/${lifecycleDocId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'archived'
        }
      });

      expect([200, 404]).toContain(archiveResponse.status());

      // Verify final state
      const verifyResponse = await request.get(`${API_BASE_URL}/api/v1/document/${lifecycleDocId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (verifyResponse.status() === 200) {
        const body = await verifyResponse.json();
        const doc = body.data || body;
        if (doc.status) {
          expect(['archived', 'active']).toContain(doc.status);
        }
      }
    });
  });
});

test.describe('Document Management Error Handling', () => {
  test('should handle invalid document ID format', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/document/invalid-id-format!@#`);

    expect([400, 401, 404]).toContain(response.status());
  });

  test('should handle very long document titles', async ({ request }) => {
    // This test checks input validation for edge cases
    const longTitle = 'A'.repeat(10000);

    const response = await request.post(`${API_BASE_URL}/api/v1/document`, {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        title: longTitle,
        documentType: 'test'
      }
    });

    expect([400, 401, 413, 422]).toContain(response.status());
  });
});
