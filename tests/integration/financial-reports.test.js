/**
 * Integration Tests: Financial Reports Lifecycle
 * Issue #42: Implement Integration Test Suite
 *
 * Tests the complete financial report workflow:
 * - Create report
 * - Retrieve report
 * - Update report
 * - Delete report
 * - Search and filter reports
 */

const request = require('supertest');
const { createApp } = require('../setup/app');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

describe('Financial Reports Lifecycle Integration Tests', () => {
  let app;
  let authToken;
  let adminToken;
  let createdReportId;

  // Valid financial report data
  const validReport = {
    ReportID: 'FR-2024-001',
    Type: 'Quarterly',
    Data: {
      revenue: { q1: 100000 },
      expenses: { q1: 70000 }
    },
    TotalRevenue: 100000,
    TotalExpenses: 70000,
    NetIncome: 30000,
    Timestamp: new Date().toISOString()
  };

  const annualReport = {
    ReportID: 'FR-2024-ANNUAL',
    Type: 'Annual',
    Data: {
      revenue: { q1: 100000, q2: 120000, q3: 110000, q4: 130000 },
      expenses: { q1: 70000, q2: 75000, q3: 72000, q4: 78000 }
    },
    TotalRevenue: 460000,
    TotalExpenses: 295000,
    NetIncome: 165000,
    Timestamp: new Date().toISOString()
  };

  beforeAll(async () => {
    // Set environment variables
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';
    process.env.NODE_ENV = 'test';

    app = createApp();

    // Create auth token for regular user
    authToken = jwt.sign(
      {
        userId: 'test-user-123',
        role: 'user',
        permissions: ['read:reports', 'create:reports', 'update:reports', 'delete:reports']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create admin token
    adminToken = jwt.sign(
      {
        userId: 'admin-user-123',
        role: 'admin',
        permissions: ['admin:all']
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      const collections = await mongoose.connection.db.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  });

  describe('Financial Report CRUD Operations', () => {
    describe('POST /api/v1/financial-reports - Create Report', () => {
      it('should create a quarterly financial report with valid data', async () => {
        const response = await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validReport)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('ReportID', validReport.ReportID);
        expect(response.body).toHaveProperty('Type', 'Quarterly');
        expect(response.body).toHaveProperty('TotalRevenue', 100000);
        expect(response.body).toHaveProperty('NetIncome', 30000);

        createdReportId = response.body.ReportID;
      });

      it('should create an annual financial report with all quarters', async () => {
        const response = await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(annualReport)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('Type', 'Annual');
        expect(response.body.Data.revenue).toHaveProperty('q1');
        expect(response.body.Data.revenue).toHaveProperty('q4');
      });

      it('should reject report with missing required fields', async () => {
        const incompleteReport = {
          ReportID: 'FR-INCOMPLETE',
          Type: 'Quarterly'
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompleteReport)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject report with negative financial values', async () => {
        const negativeReport = {
          ...validReport,
          ReportID: 'FR-NEGATIVE',
          TotalRevenue: -50000
        };

        const response = await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(negativeReport)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('negative');
      });

      it('should reject report with invalid net income calculation', async () => {
        const invalidCalcReport = {
          ...validReport,
          ReportID: 'FR-INVALID-CALC',
          TotalRevenue: 100000,
          TotalExpenses: 70000,
          NetIncome: 50000 // Should be 30000
        };

        const response = await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidCalcReport)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      });

      it('should reject report creation without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/financial-reports')
          .send(validReport)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });

      it('should reject annual report missing quarters', async () => {
        const incompleteAnnual = {
          ...annualReport,
          ReportID: 'FR-INCOMPLETE-ANNUAL',
          Data: {
            revenue: { q1: 100000, q2: 120000 }, // Missing q3, q4
            expenses: { q1: 70000, q2: 75000 }
          }
        };

        const response = await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompleteAnnual)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('quarters');
      });
    });

    describe('GET /api/v1/financial-reports - List Reports', () => {
      beforeEach(async () => {
        // Create test reports
        await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validReport);

        await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ ...validReport, ReportID: 'FR-2024-002' });
      });

      it('should list all financial reports', async () => {
        const response = await request(app)
          .get('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('reports');
        expect(Array.isArray(response.body.reports)).toBe(true);
        expect(response.body.reports.length).toBeGreaterThanOrEqual(2);
      });

      it('should paginate reports correctly', async () => {
        const response = await request(app)
          .get('/api/v1/financial-reports?page=1&limit=1')
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.reports.length).toBe(1);
        expect(response.body).toHaveProperty('totalPages');
        expect(response.body).toHaveProperty('currentPage', 1);
      });

      it('should reject list request without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/financial-reports')
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/financial-reports/:id - Get Single Report', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validReport);

        createdReportId = validReport.ReportID;
      });

      it('should retrieve a specific financial report by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/financial-reports/${createdReportId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('ReportID', createdReportId);
        expect(response.body).toHaveProperty('TotalRevenue');
      });

      it('should return 404 for non-existent report', async () => {
        const response = await request(app)
          .get('/api/v1/financial-reports/NON-EXISTENT-ID')
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');
      });
    });

    describe('PUT /api/v1/financial-reports/:id - Update Report', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validReport);

        createdReportId = validReport.ReportID;
      });

      it('should update an existing financial report', async () => {
        const updatedData = {
          ...validReport,
          TotalRevenue: 120000,
          TotalExpenses: 80000,
          NetIncome: 40000,
          Data: {
            revenue: { q1: 120000 },
            expenses: { q1: 80000 }
          }
        };

        const response = await request(app)
          .put(`/api/v1/financial-reports/${createdReportId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updatedData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('TotalRevenue', 120000);
        expect(response.body).toHaveProperty('NetIncome', 40000);
      });

      it('should reject update with invalid data', async () => {
        const invalidUpdate = {
          ...validReport,
          TotalRevenue: -50000 // Negative value
        };

        const response = await request(app)
          .put(`/api/v1/financial-reports/${createdReportId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidUpdate)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      });

      it('should return 404 when updating non-existent report', async () => {
        const response = await request(app)
          .put('/api/v1/financial-reports/NON-EXISTENT-ID')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validReport)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });
    });

    describe('DELETE /api/v1/financial-reports/:id - Delete Report', () => {
      beforeEach(async () => {
        await request(app)
          .post('/api/v1/financial-reports')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validReport);

        createdReportId = validReport.ReportID;
      });

      it('should delete an existing financial report', async () => {
        const response = await request(app)
          .delete(`/api/v1/financial-reports/${createdReportId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');

        // Verify deletion
        const getResponse = await request(app)
          .get(`/api/v1/financial-reports/${createdReportId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(getResponse.status).toBe(404);
      });

      it('should return 404 when deleting non-existent report', async () => {
        const response = await request(app)
          .delete('/api/v1/financial-reports/NON-EXISTENT-ID')
          .set('Authorization', `Bearer ${authToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Financial Report Complete Lifecycle', () => {
    it('should complete full CRUD lifecycle for a financial report', async () => {
      // 1. CREATE
      const createResponse = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validReport);

      expect(createResponse.status).toBe(201);
      const reportId = createResponse.body.ReportID;

      // 2. READ
      const readResponse = await request(app)
        .get(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.ReportID).toBe(reportId);

      // 3. UPDATE
      const updateResponse = await request(app)
        .put(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...validReport,
          TotalRevenue: 150000,
          TotalExpenses: 100000,
          NetIncome: 50000,
          Data: {
            revenue: { q1: 150000 },
            expenses: { q1: 100000 }
          }
        });

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.TotalRevenue).toBe(150000);

      // 4. DELETE
      const deleteResponse = await request(app)
        .delete(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);

      // 5. VERIFY DELETION
      const verifyResponse = await request(app)
        .get(`/api/v1/financial-reports/${reportId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyResponse.status).toBe(404);
    });
  });

  describe('Report Validation Edge Cases', () => {
    it('should validate quarterly report with exactly one quarter', async () => {
      const quarterlyWithMultiple = {
        ...validReport,
        ReportID: 'FR-MULTI-Q',
        Data: {
          revenue: { q1: 100000, q2: 110000 }, // Multiple quarters for quarterly
          expenses: { q1: 70000, q2: 75000 }
        }
      };

      const response = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(quarterlyWithMultiple);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exactly one quarter');
    });

    it('should reject report with invalid type', async () => {
      const invalidType = {
        ...validReport,
        ReportID: 'FR-INVALID-TYPE',
        Type: 'Monthly' // Invalid type
      };

      const response = await request(app)
        .post('/api/v1/financial-reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidType);

      expect(response.status).toBe(400);
    });
  });
});
