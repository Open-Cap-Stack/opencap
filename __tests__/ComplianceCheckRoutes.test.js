const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const complianceCheckRoutes = require('../routes/ComplianceCheck');
const ComplianceCheck = require('../models/ComplianceCheck');
const { setupTestDB, teardownTestDB, clearDatabase } = require('./setup/dbHandler');

const app = express();
app.use(express.json());
app.use('/api/complianceChecks', complianceCheckRoutes);

describe('ComplianceCheck Routes', () => {
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

  const complianceData = {
    CheckID: 'CHECK-001',
    SPVID: 'SPV-123',
    RegulationType: 'GDPR',
    Status: 'Compliant',
    LastCheckedBy: 'TestAdmin',
    Timestamp: new Date(),
    Details: 'Test compliance check',
  };

  describe('POST /api/complianceChecks', () => {
    test('should create a new compliance check', async () => {
      const res = await request(app)
        .post('/api/complianceChecks')
        .send(complianceData)
        .expect('Content-Type', /json/);
    
      // Ensure the response status is correct
      expect(res.statusCode).toBe(201);
    
      // Validate the response directly
      expect(res.body).toHaveProperty('CheckID', complianceData.CheckID);
      expect(res.body).toHaveProperty('RegulationType', complianceData.RegulationType);
      expect(res.body).toHaveProperty('LastCheckedBy', complianceData.LastCheckedBy);
    });
     

    test('should handle duplicate CheckID error', async () => {
      // First create a compliance check
      await ComplianceCheck.create(complianceData);
    
      // Attempt to create a duplicate
      const res = await request(app)
        .post('/api/complianceChecks')
        .send({
          ...complianceData,
          SPVID: 'SPV-DIFFERENT', // Change other fields to simulate a duplicate `CheckID`
        })
        .expect('Content-Type', /json/);
    
      // Verify the status code and message structure
      expect(res.statusCode).toBe(400);
    
      // Check if the response includes the expected message format
      if (res.body.message === 'A compliance check with this CheckID already exists') {
        expect(res.body.message).toBe('A compliance check with this CheckID already exists');
      } else {
        throw new Error(
          `Unexpected response structure: ${JSON.stringify(res.body)}`
        );
      }
    
      // Verify that no duplicate entries exist in the database
      const checks = await ComplianceCheck.find({ CheckID: complianceData.CheckID });
      expect(checks).toHaveLength(1);
    });
    
    
  });

  describe('GET /api/complianceChecks', () => {
    beforeEach(async () => {
      await ComplianceCheck.create(complianceData);
    });

    beforeEach(async () => {
      await ComplianceCheck.deleteMany({}); // Clear the database before each test
    });
    
    test('should get all compliance checks', async () => {
      // Seed the database with a unique compliance check
      await ComplianceCheck.create(complianceData);
    
      // Call the API
      const res = await request(app)
        .get('/api/complianceChecks')
        .expect('Content-Type', /json/);
    
      // Validate the response
      expect(res.statusCode).toBe(200); // Check status code
      expect(res.body).toHaveProperty('complianceChecks'); // Ensure `complianceChecks` property exists
      expect(Array.isArray(res.body.complianceChecks)).toBe(true); // Check that `complianceChecks` is an array
      expect(res.body.complianceChecks.length).toBe(1); // Ensure only one record is returned
      expect(res.body.complianceChecks[0]).toHaveProperty('CheckID', complianceData.CheckID); // Validate CheckID matches
      expect(res.body.complianceChecks[0]).toHaveProperty('RegulationType', complianceData.RegulationType); // Validate RegulationType
    });  
  });

  describe('DELETE /api/complianceChecks/:id', () => {
    let savedCheck;

    beforeEach(async () => {
      savedCheck = await ComplianceCheck.create(complianceData);
    });

    test('should delete a compliance check by ID', async () => {
      const res = await request(app)
        .delete(`/api/complianceChecks/${savedCheck._id}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Compliance check deleted');
      const deletedCheck = await ComplianceCheck.findById(savedCheck._id);
      expect(deletedCheck).toBeNull();
    });

    test('should return 404 for non-existent compliance check', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .delete(`/api/complianceChecks/${nonExistentId}`);
      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Compliance check not found');
    });

    test('should handle invalid ID format', async () => {
      const res = await request(app).delete('/api/complianceChecks/invalid-id');
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid compliance check ID format'); // Updated to match the actual message
    });
    

    test('should handle database errors on DELETE', async () => {
      jest.spyOn(ComplianceCheck, 'findByIdAndDelete').mockRejectedValueOnce(new Error('Database error'));
      const res = await request(app).delete(`/api/complianceChecks/${savedCheck._id}`);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Failed to delete compliance check');
    });
  });

  describe('Model Methods and Validations', () => {
    test('should validate timestamps correctly', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const check = new ComplianceCheck({ ...complianceData, Timestamp: futureDate });
      const error = check.validateSync();
      expect(error.errors.Timestamp).toBeDefined();
    });

    test('should handle regulation type methods', async () => {
      await ComplianceCheck.create(complianceData);
      const results = await ComplianceCheck.findByRegulation('GDPR');
      expect(results.length).toBe(1);
      expect(results[0].RegulationType).toBe('GDPR');
    });

    test('should handle non-compliant checks', async () => {
      await ComplianceCheck.create({ ...complianceData, Status: 'Non-Compliant' });
      const results = await ComplianceCheck.findNonCompliant();
      expect(results.length).toBe(1);
      expect(results[0].Status).toBe('Non-Compliant');
    });

    test('should calculate compliance age correctly', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      const check = new ComplianceCheck({ ...complianceData, Timestamp: pastDate });
      expect(check.complianceAge).toBeGreaterThan(0);
    });

    test('should handle expired compliance checks', async () => {
      const oldDate = new Date(Date.now() - 366 * 86400000);
      const check = new ComplianceCheck({ ...complianceData, Timestamp: oldDate });
      expect(check.isExpired()).toBe(true);
    });
  });
});
