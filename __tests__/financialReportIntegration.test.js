const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./test-app');
const FinancialReport = require('../models/financialReport');
const auth = require('../utils/auth');

describe('Financial Report API Integration', () => {
  let mongoServer;
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = await mongoServer.getUri();

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true  // Suppresses the ensureIndex deprecation warning
    });

    testUserId = new mongoose.Types.ObjectId();
    adminToken = auth.generateToken({
      id: testUserId.toString(),
      role: 'admin',
      permissions: ['create:reports', 'read:reports', 'update:reports', 'delete:reports']
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /api/financial-reports', () => {
    beforeEach(async () => {
      await FinancialReport.deleteMany({});
    });

    it('should have the correct response structure when empty', async () => {
      const response = await request(app)
        .get('/api/financial-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        reports: expect.any(Array),
        totalCount: 0,
        currentPage: 1,
        totalPages: 0,
        limit: 10
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/financial-reports')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/financial-reports')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should create and return a quarterly report', async () => {
      try {
        const report = new FinancialReport({
          ReportID: 'TEST-2024-Q1',
          Type: 'Quarterly',
          TotalRevenue: 100000,
          TotalExpenses: 75000,
          NetIncome: 25000,
          EquitySummary: ['Initial equity test'],
          Timestamp: new Date(),
          userId: testUserId,
          lastModifiedBy: testUserId
        });

        report.Data = {
          revenue: new Map().set('q1', 100000),
          expenses: new Map().set('q1', 75000)
        };

        console.log('Pre-save state:', {
          type: report.Type,
          data: {
            revenue: report.Data.revenue instanceof Map ? 
              Array.from(report.Data.revenue.entries()) : report.Data.revenue,
            expenses: report.Data.expenses instanceof Map ? 
              Array.from(report.Data.expenses.entries()) : report.Data.expenses
          }
        });

        await report.save();

        const response = await request(app)
          .get('/api/financial-reports')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.reports).toHaveLength(1);
        expect(response.body.reports[0]).toMatchObject({
          ReportID: report.ReportID,
          Type: report.Type,
          TotalRevenue: 100000,
          TotalExpenses: 75000,
          NetIncome: 25000
        });

      } catch (error) {
        console.log('Error details:', error);
        throw error;
      }
    });

    it('should create and return an annual report with full quarterly data', async () => {
      try {
        const report = new FinancialReport({
          ReportID: 'TEST-2024-ANNUAL',
          Type: 'Annual',
          TotalRevenue: 400000,
          TotalExpenses: 300000,
          NetIncome: 100000,
          EquitySummary: ['Year-end equity summary'],
          Timestamp: new Date(),
          userId: testUserId,
          lastModifiedBy: testUserId
        });

        report.Data = {
          revenue: new Map([['q1', 100000], ['q2', 100000], ['q3', 100000], ['q4', 100000]]),
          expenses: new Map([['q1', 75000], ['q2', 75000], ['q3', 75000], ['q4', 75000]])
        };

        await report.save();

        const response = await request(app)
          .get('/api/financial-reports')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.reports).toHaveLength(1);
        expect(response.body.reports[0]).toMatchObject({
          ReportID: report.ReportID,
          Type: report.Type,
          TotalRevenue: 400000,
          TotalExpenses: 300000,
          NetIncome: 100000
        });

      } catch (error) {
        console.log('Error details:', error);
        throw error;
      }
    });

    // New test: Verify validation for missing fields in financial report creation
    it('should not create a report with missing required fields', async () => {
      const invalidReportData = {
        Type: 'Quarterly',
        TotalRevenue: 50000,
        // Missing TotalExpenses and NetIncome
        EquitySummary: ['Partial equity summary'],
        Timestamp: new Date(),
        userId: testUserId,
        lastModifiedBy: testUserId
      };

      const response = await request(app)
        .post('/api/financial-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidReportData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required fields');
    });
  });
});
