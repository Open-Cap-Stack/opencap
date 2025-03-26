/**
 * SPV Management API Status Tracking Tests
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
    SPVID: 'SPV-PENDING-1',
    Name: 'Pending SPV 1',
    Purpose: 'Testing SPV API',
    CreationDate: new Date('2025-01-15'),
    Status: 'Pending',
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
    ComplianceStatus: 'NonCompliant'
  },
  {
    SPVID: 'SPV-CLOSED-1',
    Name: 'Closed SPV 1',
    Purpose: 'Testing SPV API',
    CreationDate: new Date('2024-12-10'),
    Status: 'Closed',
    ParentCompanyID: 'PARENT-002',
    ComplianceStatus: 'PendingReview'
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

    test('should get all pending SPVs', async () => {
      const res = await request(app)
        .get('/api/spvs/status/Pending')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(1);
      expect(res.body.spvs[0]).toHaveProperty('Status', 'Pending');
    });

    test('should get all closed SPVs', async () => {
      const res = await request(app)
        .get('/api/spvs/status/Closed')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(1);
      expect(res.body.spvs[0]).toHaveProperty('Status', 'Closed');
    });

    test('should return 400 for invalid status parameter', async () => {
      const res = await request(app)
        .get('/api/spvs/status/Invalid')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid status parameter');
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
        .get('/api/spvs/compliance/NonCompliant')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(1);
      expect(res.body.spvs[0]).toHaveProperty('ComplianceStatus', 'NonCompliant');
    });

    test('should get all pending review SPVs', async () => {
      const res = await request(app)
        .get('/api/spvs/compliance/PendingReview')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(1);
      expect(res.body.spvs[0]).toHaveProperty('ComplianceStatus', 'PendingReview');
    });

    test('should return 400 for invalid compliance status parameter', async () => {
      const res = await request(app)
        .get('/api/spvs/compliance/Invalid')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid compliance status parameter');
    });
  });

  describe('GET /api/spvs/parent/:id', () => {
    test('should get all SPVs for a specific parent company', async () => {
      const res = await request(app)
        .get('/api/spvs/parent/PARENT-001')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.spvs).toHaveLength(2);
      expect(res.body.spvs[0]).toHaveProperty('ParentCompanyID', 'PARENT-001');
      expect(res.body.spvs[1]).toHaveProperty('ParentCompanyID', 'PARENT-001');
    });

    test('should return 404 when no SPVs found for parent company', async () => {
      const res = await request(app)
        .get('/api/spvs/parent/NONEXISTENT')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('No SPVs found for parent company');
    });

    test('should return 404 for empty parent company ID parameter', async () => {
      const res = await request(app)
        .get('/api/spvs/parent/')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV not found');
    });
  });
});
