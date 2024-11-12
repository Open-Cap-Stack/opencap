// __tests__/financialReportEdgeCases.test.js

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./test-app');
const FinancialReport = require('../models/financialReport');
const auth = require('../utils/auth');

describe('Financial Report API Edge Cases', () => {
  let mongoServer;
  let adminToken;
  let testUserId;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = await mongoServer.getUri();

    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        serverSelectionTimeoutMS: 20000 // Increase timeout to avoid test interruptions
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

  describe('Edge Cases for Financial Report API', () => {
    beforeEach(async () => {
      await FinancialReport.deleteMany({});
    });

    it('should handle large numeric values without overflow', async () => {
      const largeReport = {
        ReportID: 'TEST-LARGE-VALUES',
        Type: 'Quarterly',
        TotalRevenue: 1e12,
        TotalExpenses: 5e11,
        NetIncome: 5e11,
        Data: { revenue: { q1: 1e12 }, expenses: { q1: 5e11 } },
        Timestamp: new Date(),
        userId: testUserId,
        lastModifiedBy: testUserId
      };

      const response = await request(app)
        .post('/api/financial-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largeReport)
        .expect(201);

      expect(response.body).toMatchObject({
        ReportID: largeReport.ReportID,
        TotalRevenue: 1e12,
        TotalExpenses: 5e11,
        NetIncome: 5e11
      });
    });

    it('should return a custom error for simulated database connection issues', async () => {
      // Disconnect to simulate database failure
      await mongoose.disconnect();

      const report = {
        ReportID: 'TEST-DB-ERROR',
        Type: 'Quarterly',
        TotalRevenue: 100000,
        TotalExpenses: 75000,
        NetIncome: 25000,
        Data: { revenue: { q1: 100000 }, expenses: { q1: 75000 } },
        Timestamp: new Date(),
        userId: testUserId,
        lastModifiedBy: testUserId
      };

      const response = await request(app)
        .post('/api/financial-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(report);

      // Reconnect for subsequent tests
      await mongoose.connect(mongoServer.getUri(), {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      expect(response.status).toBe(500);
      expect(response.body.error).toMatch(/connection|buffering|timed out/);
    });

    it('should reject an expired API key', async () => {
      const expiredToken = auth.generateToken({
        id: testUserId.toString(),
        role: 'user',
        permissions: ['read:reports']
      }, { expiresIn: '-1s' }); // Expire immediately

      const response = await request(app)
        .get('/api/financial-reports')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toContain('Token expired');
    });
  });
});
