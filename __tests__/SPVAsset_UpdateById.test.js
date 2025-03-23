const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const spvAssetRoutes = require('../routes/SPVasset');
const SPVAsset = require('../models/spvasset');
const { setupDockerTestEnv } = require('./setup/docker-test-env');

// Setup Docker test environment variables
setupDockerTestEnv();

// Mock data
const testSPVAsset = {
  AssetID: 'ASSET-12345',
  SPVID: 'SPV-12345',
  Type: 'Real Estate', 
  Value: 500000,
  Description: 'Test Property',
  AcquisitionDate: new Date('2025-01-15')
};

const updateData = {
  Value: 750000,
  Description: 'Updated Property Description',
  Type: 'Financial Instrument' 
};

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/spvassets', spvAssetRoutes);

describe('SPV Asset API - PUT/Update Functionality', () => {
  let assetId;

  // Connect to test database before tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await SPVAsset.deleteMany({});
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Create a test SPV Asset before each test
  beforeEach(async () => {
    await SPVAsset.deleteMany({});
    const asset = new SPVAsset(testSPVAsset);
    const savedAsset = await asset.save();
    assetId = savedAsset._id;
  });

  describe('PUT /api/spvassets/:id', () => {
    test('should update an SPV Asset when provided valid data', async () => {
      const res = await request(app)
        .put(`/api/spvassets/${assetId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Value', updateData.Value);
      expect(res.body).toHaveProperty('Description', updateData.Description);
      expect(res.body).toHaveProperty('Type', updateData.Type);
      
      // Fields not included in the update should remain unchanged
      expect(res.body).toHaveProperty('AssetID', testSPVAsset.AssetID);
      expect(res.body).toHaveProperty('SPVID', testSPVAsset.SPVID);
    });

    test('should return 404 when SPV Asset with given ID does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/spvassets/${nonExistentId}`)
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV Asset not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .put('/api/spvassets/invalid-id')
        .send(updateData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid SPV Asset ID format');
    });

    test('should prevent AssetID and SPVID from being modified', async () => {
      const attemptedIDUpdate = {
        ...updateData,
        AssetID: 'CHANGED-ASSET-ID',
        SPVID: 'CHANGED-SPV-ID'
      };

      const res = await request(app)
        .put(`/api/spvassets/${assetId}`)
        .send(attemptedIDUpdate)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('AssetID', testSPVAsset.AssetID); // AssetID should not change
      expect(res.body).toHaveProperty('SPVID', testSPVAsset.SPVID); // SPVID should not change
    });

    test('should validate Value field is numeric', async () => {
      const invalidData = {
        ...updateData,
        Value: 'not-a-number'
      };

      const res = await request(app)
        .put(`/api/spvassets/${assetId}`)
        .send(invalidData)
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid SPV Asset data');
    });
  });
});
