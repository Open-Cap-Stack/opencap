const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const spvRoutes = require('../routes/SPV');
const SPV = require('../models/SPV');
const { setupDockerTestEnv } = require('./setup/docker-test-env');

// Setup Docker test environment variables
setupDockerTestEnv();

// Mock data
const testSPVs = [
  {
    SPVID: 'SPV-ACTIVE-1',
    Name: 'Active SPV 1',
    Purpose: 'Testing SPV API',
    CreationDate: new Date('2025-01-15'),
    Status: 'Active',
    ParentCompanyID: 'PARENT-001',
    ComplianceStatus: 'Compliant'
  },
  {
    SPVID: 'SPV-INACTIVE-1',
    Name: 'Inactive SPV 1',
    Purpose: 'Testing SPV API',
    CreationDate: new Date('2025-01-15'),
    Status: 'Inactive',
    ParentCompanyID: 'PARENT-001',
    ComplianceStatus: 'Compliant'
  },
  {
    SPVID: 'SPV-ACTIVE-2',
    Name: 'Active SPV 2',
    Purpose: 'Testing SPV API',
    CreationDate: new Date('2025-01-10'),
    Status: 'Active',
    ParentCompanyID: 'PARENT-002',
    ComplianceStatus: 'Non-Compliant'
  }
];

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/spvs', spvRoutes);

describe('SPV API - Status Tracking Functionality', () => {
  // Connect to test database before tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await SPV.deleteMany({});
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Create test SPVs before each test
  beforeEach(async () => {
    await SPV.deleteMany({});
    for (const spvData of testSPVs) {
      const spv = new SPV(spvData);
      await spv.save();
    }
  });

  describe('GET /api/spvs/status/:status', () => {
    test('should get all active SPVs', async () => {
      const res = await request(app)
        .get('/api/spvs/status/Active')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(2);
      expect(res.body.spvs[0]).toHaveProperty('Status', 'Active');
      expect(res.body.spvs[1]).toHaveProperty('Status', 'Active');
    });

    test('should get all inactive SPVs', async () => {
      const res = await request(app)
        .get('/api/spvs/status/Inactive')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(1);
      expect(res.body.spvs[0]).toHaveProperty('Status', 'Inactive');
    });

    test('should return 404 when no SPVs with given status exist', async () => {
      const res = await request(app)
        .get('/api/spvs/status/Pending')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'No SPVs found with status: Pending');
    });
  });

  describe('GET /api/spvs/compliance/:status', () => {
    test('should get all compliant SPVs', async () => {
      const res = await request(app)
        .get('/api/spvs/compliance/Compliant')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(2);
      expect(res.body.spvs[0]).toHaveProperty('ComplianceStatus', 'Compliant');
      expect(res.body.spvs[1]).toHaveProperty('ComplianceStatus', 'Compliant');
    });

    test('should get all non-compliant SPVs', async () => {
      const res = await request(app)
        .get('/api/spvs/compliance/Non-Compliant')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(1);
      expect(res.body.spvs[0]).toHaveProperty('ComplianceStatus', 'Non-Compliant');
    });

    test('should return 404 when no SPVs with given compliance status exist', async () => {
      const res = await request(app)
        .get('/api/spvs/compliance/Unknown')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'No SPVs found with compliance status: Unknown');
    });
  });
});
