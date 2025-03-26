/**
 * SPV Management API UpdateById Tests
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
  SPVID: 'SPV-TEST-UPDATE',
  Name: 'Test SPV',
  Purpose: 'Testing SPV API updates',
  CreationDate: new Date('2023-01-01'),
  Status: 'Active',
  ParentCompanyID: 'PARENT-001',
  ComplianceStatus: 'Compliant'
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
    test('should update SPV with valid data', async () => {
      const updateData = {
        Name: 'Updated SPV Name',
        Purpose: 'Updated purpose'
      };

      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Name', updateData.Name);
      expect(res.body).toHaveProperty('Purpose', updateData.Purpose);
      expect(res.body).toHaveProperty('Status', testSPV.Status); // unchanged
      expect(res.body).toHaveProperty('SPVID', testSPV.SPVID); // unchanged
    });

    test('should update SPV status to valid value', async () => {
      const updateData = {
        Status: 'Pending'
      };

      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Status', 'Pending');
    });

    test('should update SPV compliance status to valid value', async () => {
      const updateData = {
        ComplianceStatus: 'NonCompliant'
      };

      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('ComplianceStatus', 'NonCompliant');
    });

    test('should return 404 when SPV with given ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const updateData = { Name: 'Updated Name' };

      const res = await request(app)
        .put(`/api/spvs/${nonExistentId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const updateData = { Name: 'Updated Name' };

      // Use an invalid MongoDB ID format - this should fail validation
      const res = await request(app)
        .put('/api/spvs/123456789012345678901234')
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid SPV ID format');
    });

    test('should prevent SPVID from being modified', async () => {
      const testSPV = {
        SPVID: 'TEST-PREVENTUPDATE-1',
        Name: 'Original SPV',
        Purpose: 'Original Purpose',
        CreationDate: new Date(),
        Status: 'Active',
        ParentCompanyID: 'PARENT-123',
        ComplianceStatus: 'Compliant'
      };
      
      const createdSPV = await new SPV(testSPV).save();
      const mongoId = createdSPV._id.toString();
      
      // Try to modify the SPVID
      const updateData = {
        SPVID: 'MODIFIED-SPVID-999', // This should be rejected
        Name: 'Updated Name'
      };
      
      const res = await request(app)
        .put(`/api/spvs/${mongoId}`)
        .send(updateData)
        .expect('Content-Type', /json/);
      
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'SPVID cannot be modified');
      
      // Verify the SPV was not modified
      const savedSPV = await SPV.findById(mongoId);
      expect(savedSPV.SPVID).toBe('TEST-PREVENTUPDATE-1');
      expect(savedSPV.Name).toBe('Original SPV');
    });

    test('should return 400 for invalid Status value', async () => {
      const updateData = {
        Status: 'InvalidStatus'
      };

      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid status');
    });

    test('should return 400 for invalid ComplianceStatus value', async () => {
      const updateData = {
        ComplianceStatus: 'InvalidStatus'
      };

      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('Invalid compliance status');
    });

    test('should update SPV when using SPVID instead of MongoDB ID', async () => {
      const updateData = {
        Name: 'Updated via SPVID',
        Purpose: 'Testing SPVID updates'
      };

      const res = await request(app)
        .put(`/api/spvs/${testSPV.SPVID}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Name', updateData.Name);
      expect(res.body).toHaveProperty('Purpose', updateData.Purpose);
    });

    test('should reject update with no valid fields', async () => {
      const updateData = {};

      const res = await request(app)
        .put(`/api/spvs/${spvId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('No valid fields provided');
    });
  });
});
