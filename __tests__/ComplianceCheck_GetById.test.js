const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const complianceCheckRoutes = require('../routes/ComplianceCheck');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const app = express();
app.use(express.json());
app.use('/api/compliance-checks', complianceCheckRoutes);

// BDD-style test suite following Semantic Seed Venture Studio Coding Standards V2.0
describe('ComplianceCheck API - GET by ID Functionality', () => {
  // Test data
  const complianceData = {
    CheckID: 'CHECK-123',
    SPVID: 'SPV-456',
    RegulationType: 'GDPR',
    Status: 'Compliant',
    LastCheckedBy: 'TestUser',
    Timestamp: new Date(),
    Details: 'Test compliance check details'
  };
  
  let savedCheck;

  // Setup database connection
  beforeAll(async () => {
    await setupTestDB();
  });

  // Clean up after all tests
  afterAll(async () => {
    await teardownTestDB();
  });

  // Reset data before each test
  beforeEach(async () => {
    await clearDatabase();
    savedCheck = await ComplianceCheck.create(complianceData);
  });

  describe('GET /api/compliance-checks/:id', () => {
    test('should return a compliance check when given a valid ID', async () => {
      const res = await request(app)
        .get(`/api/compliance-checks/${savedCheck._id}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('CheckID', complianceData.CheckID);
      expect(res.body).toHaveProperty('SPVID', complianceData.SPVID);
      expect(res.body).toHaveProperty('RegulationType', complianceData.RegulationType);
      expect(res.body).toHaveProperty('Status', complianceData.Status);
    });

    test('should return 404 when compliance check with given ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/compliance-checks/${nonExistentId}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Compliance check not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/api/compliance-checks/invalid-id-format')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid compliance check ID format');
    });

    test('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(ComplianceCheck, 'findById').mockRejectedValueOnce(new Error('Database error'));
      
      const res = await request(app)
        .get(`/api/compliance-checks/${savedCheck._id}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Failed to retrieve compliance check');
    });
  });
});
