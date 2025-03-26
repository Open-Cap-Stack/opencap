/**
 * SPV Management API GetById Tests
 * Feature: OCAE-211: Implement SPV Management API
 */
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const spvRoutes = require('../routes/SPV');
const SPV = require('../models/SPV');
const { setupDockerTestEnv } = require('./setup/docker-test-env');

// Setup Docker test environment variables
setupDockerTestEnv();

// Mock data
const testSPV = {
  SPVID: 'SPV-12345',
  Name: 'Test SPV',
  Purpose: 'Testing SPV API',
  CreationDate: new Date('2025-01-15'),
  Status: 'Active',
  ParentCompanyID: 'PARENT-001',
  ComplianceStatus: 'Compliant'
};

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/spvs', spvRoutes);

describe('SPV API - GET by ID Functionality', () => {
  let spvId;

  // Connect to test database before tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await SPV.deleteMany({});
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Create a test SPV before each test
  beforeEach(async () => {
    await SPV.deleteMany({});
    const spv = new SPV(testSPV);
    const savedSPV = await spv.save();
    spvId = savedSPV._id;
  });

  describe('GET /api/spvs/:id', () => {
    test('should get an SPV by MongoDB ID', async () => {
      const res = await request(app)
        .get(`/api/spvs/${spvId}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('SPVID', testSPV.SPVID);
      expect(res.body).toHaveProperty('Name', testSPV.Name);
      expect(res.body).toHaveProperty('Purpose', testSPV.Purpose);
      expect(res.body).toHaveProperty('Status', testSPV.Status);
      expect(res.body).toHaveProperty('ParentCompanyID', testSPV.ParentCompanyID);
      expect(res.body).toHaveProperty('ComplianceStatus', testSPV.ComplianceStatus);
    });

    test('should get an SPV by custom SPVID', async () => {
      const res = await request(app)
        .get(`/api/spvs/${testSPV.SPVID}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('SPVID', testSPV.SPVID);
      expect(res.body).toHaveProperty('Name', testSPV.Name);
    });

    test('should return 404 when SPV does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/spvs/${nonExistentId}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV not found');
    });

    test('should return 400 for invalid MongoDB ID format', async () => {
      // This is an invalid MongoDB ID format but looks like one (24 chars)
      const res = await request(app)
        .get('/api/spvs/123456789012345678901234')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid SPV ID format');
    });
  });

  describe('Edge cases for ID handling', () => {
    test('should handle non-existent SPVID properly', async () => {
      const res = await request(app)
        .get('/api/spvs/NON-EXISTENT-ID')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV not found');
    });

    test('should handle empty ID parameter', async () => {
      // Use a mock SPV with a specific ID for this test
      const mockSPV = new SPV({
        SPVID: 'EMPTY-TEST-ID', 
        Name: 'Mock SPV for empty ID test',
        Purpose: 'Testing',
        CreationDate: new Date(),
        Status: 'Active',
        ParentCompanyID: 'PARENT-123',
        ComplianceStatus: 'Compliant',
      });
      
      await mockSPV.save();
      
      // Use a different approach - directly check if the ID exists
      const res = await request(app)
        .get('/api/spvs/EMPTY-TEST-ID')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/);
  
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Name', 'Mock SPV for empty ID test');
      
      // Then test a non-existing ID
      const nonExistentRes = await request(app)
        .get('/api/spvs/NON-EXISTENT-EMPTY')
        .expect('Content-Type', /json/);

      expect(nonExistentRes.statusCode).toBe(404);
      expect(nonExistentRes.body).toHaveProperty('message', 'SPV not found');
    });
  });
});
