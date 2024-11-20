const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const complianceCheckRoutes = require('../routes/ComplianceCheck');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const app = express();
app.use(express.json());
app.use('/api/complianceChecks', complianceCheckRoutes);

describe('ComplianceCheck Basic Routes', () => {
  const testData = {
    basic: {
      CheckID: 'CHECK-001',
      SPVID: 'SPV-123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      LastCheckedBy: 'TestAdmin',
      Timestamp: new Date(),
      Details: 'Test compliance check'
    }
  };

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.restoreAllMocks();
  });

  describe('POST /api/complianceChecks', () => {
    test('should create a new compliance check', async () => {
      const res = await request(app)
        .post('/api/complianceChecks')
        .send(testData.basic);

      expect(res.statusCode).toBe(201);
      expect(res.body.CheckID).toBe(testData.basic.CheckID);
      expect(res.body.RegulationType).toBe(testData.basic.RegulationType);
    });

    test('should fail to create a compliance check with missing required fields', async () => {
      const invalidData = {
        CheckID: 'CHECK-002'
      };

      const res = await request(app)
        .post('/api/complianceChecks')
        .send(invalidData);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Failed to create compliance check');
    });

    test('should handle duplicate CheckID error', async () => {
      await ComplianceCheck.create(testData.basic);
      
      const res = await request(app)
        .post('/api/complianceChecks')
        .send({
          ...testData.basic,
          SPVID: 'SPV-DIFFERENT'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Failed to create compliance check');
      expect(res.body.error).toBe('A compliance check with this CheckID already exists');
    });
  });

  describe('GET /api/complianceChecks', () => {
    beforeEach(async () => {
      await ComplianceCheck.create(testData.basic);
    });

    test('should get all compliance checks', async () => {
      const res = await request(app)
        .get('/api/complianceChecks');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].CheckID).toBe(testData.basic.CheckID);
    });

    test('should handle database errors on GET', async () => {
      jest.spyOn(ComplianceCheck, 'find').mockRejectedValueOnce(new Error('Database error'));
      const res = await request(app).get('/api/complianceChecks');
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Failed to fetch compliance checks');
    });
  });

  describe('DELETE /api/complianceChecks/:id', () => {
    let savedCheck;

    beforeEach(async () => {
      savedCheck = await ComplianceCheck.create(testData.basic);
    });

    test('should delete a compliance check by ID', async () => {
      const res = await request(app)
        .delete(`/api/complianceChecks/${savedCheck._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Compliance check deleted');

      const deletedCheck = await ComplianceCheck.findById(savedCheck._id);
      expect(deletedCheck).toBeNull();
    });

    test('should return 404 when deleting a non-existent compliance check', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/complianceChecks/${nonExistentId}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Compliance check not found');
    });

    test('should handle invalid ID format', async () => {
      const res = await request(app)
        .delete('/api/complianceChecks/invalid-id');

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid compliance check ID');
    });

    test('should handle database errors on DELETE', async () => {
      jest.spyOn(ComplianceCheck, 'findByIdAndDelete').mockRejectedValueOnce(new Error('Database error'));
      const res = await request(app).delete(`/api/complianceChecks/${savedCheck._id}`);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Failed to delete compliance check');
    });
  });
});