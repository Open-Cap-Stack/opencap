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
describe('ComplianceCheck API - PUT/Update Functionality', () => {
  // Test data
  const complianceData = {
    CheckID: 'CHECK-456',
    SPVID: 'SPV-789',
    RegulationType: 'GDPR',
    Status: 'Compliant',
    LastCheckedBy: 'OriginalUser',
    Timestamp: new Date(),
    Details: 'Original compliance check details'
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

  describe('PUT /api/compliance-checks/:id', () => {
    test('should update a compliance check when provided valid data', async () => {
      const updateData = {
        Status: 'Non-Compliant',
        LastCheckedBy: 'UpdatedUser',
        Details: 'Updated compliance check details'
      };

      const res = await request(app)
        .put(`/api/compliance-checks/${savedCheck._id}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Status', updateData.Status);
      expect(res.body).toHaveProperty('LastCheckedBy', updateData.LastCheckedBy);
      expect(res.body).toHaveProperty('Details', updateData.Details);
      
      // Fields not included in the update should remain unchanged
      expect(res.body).toHaveProperty('CheckID', complianceData.CheckID);
      expect(res.body).toHaveProperty('SPVID', complianceData.SPVID);
      expect(res.body).toHaveProperty('RegulationType', complianceData.RegulationType);
    });

    test('should return 404 when compliance check with given ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { Status: 'Non-Compliant' };
      
      const res = await request(app)
        .put(`/api/compliance-checks/${nonExistentId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Compliance check not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const updateData = { Status: 'Non-Compliant' };
      
      const res = await request(app)
        .put('/api/compliance-checks/invalid-id-format')
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid compliance check ID format');
    });

    test('should validate update data', async () => {
      const invalidData = {
        Status: 'InvalidStatus', // Not in the enum of allowed values
        RegulationType: 'INVALID_TYPE' // Not in the enum of allowed values
      };
      
      const res = await request(app)
        .put(`/api/compliance-checks/${savedCheck._id}`)
        .send(invalidData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body).toHaveProperty('error');
    });

    test('should handle database errors gracefully', async () => {
      // Mock a database error
      jest.spyOn(ComplianceCheck, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('Database error'));
      
      const updateData = { Status: 'Non-Compliant' };
      
      const res = await request(app)
        .put(`/api/compliance-checks/${savedCheck._id}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Failed to update compliance check');
    });
  });
});
