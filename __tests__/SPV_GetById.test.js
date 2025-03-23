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
    test('should get an SPV by ID', async () => {
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

    test('should return 404 when SPV does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/spvs/${nonExistentId}`)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/api/spvs/invalid-id')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid SPV ID format');
    });
  });
});
