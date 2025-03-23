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

const updateData = {
  Name: 'Updated SPV',
  Purpose: 'Updated Purpose',
  Status: 'Inactive',
  ComplianceStatus: 'Non-Compliant'
};

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/spvs', spvRoutes);

describe('SPV API - PUT/Update Functionality', () => {
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

  describe('PUT /api/spvs/:id', () => {
    test('should update an SPV when provided valid data', async () => {
      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Name', updateData.Name);
      expect(res.body).toHaveProperty('Purpose', updateData.Purpose);
      expect(res.body).toHaveProperty('Status', updateData.Status);
      expect(res.body).toHaveProperty('ComplianceStatus', updateData.ComplianceStatus);
      
      // Fields not included in the update should remain unchanged
      expect(res.body).toHaveProperty('SPVID', testSPV.SPVID);
      expect(res.body).toHaveProperty('ParentCompanyID', testSPV.ParentCompanyID);
    });

    test('should return 404 when SPV with given ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/spvs/${nonExistentId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .put('/api/spvs/invalid-id')
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid SPV ID format');
    });

    test('should prevent SPVID from being modified', async () => {
      const attemptedSPVIDUpdate = {
        ...updateData,
        SPVID: 'CHANGED-ID'
      };

      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(attemptedSPVIDUpdate)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('SPVID', testSPV.SPVID); // SPVID should not change
    });
  });
});
