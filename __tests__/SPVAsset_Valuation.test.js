const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const spvAssetRoutes = require('../routes/SPVasset');
const SPVAsset = require('../models/spvasset');
const { setupDockerTestEnv } = require('./setup/docker-test-env');

// Setup Docker test environment variables
setupDockerTestEnv();

// Mock data
const testSPVAssets = [
  {
    AssetID: 'ASSET-12345',
    SPVID: 'SPV-12345',
    Type: 'Real Estate',
    Value: 500000,
    Description: 'Property A',
    AcquisitionDate: new Date('2025-01-15')
  },
  {
    AssetID: 'ASSET-12346',
    SPVID: 'SPV-12345',
    Type: 'Financial Instrument',
    Value: 300000,
    Description: 'Financial Instrument A',
    AcquisitionDate: new Date('2025-01-20')
  },
  {
    AssetID: 'ASSET-12347',
    SPVID: 'SPV-67890',
    Type: 'Real Estate',
    Value: 750000,
    Description: 'Property B',
    AcquisitionDate: new Date('2025-02-10')
  }
];

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/spvassets', spvAssetRoutes);

describe('SPV Asset API - Valuation and Allocation Functionality', () => {
  // Connect to test database before tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await SPVAsset.deleteMany({});
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Create test SPV Assets before each test
  beforeEach(async () => {
    await SPVAsset.deleteMany({});
    for (const assetData of testSPVAssets) {
      const asset = new SPVAsset(assetData);
      await asset.save();
    }
  });

  describe('GET /api/spvassets/spv/:spvId', () => {
    test('should get all assets for a specific SPV', async () => {
      const res = await request(app)
        .get('/api/spvassets/spv/SPV-12345')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body.assets).toHaveLength(2);
      expect(res.body.assets[0]).toHaveProperty('SPVID', 'SPV-12345');
      expect(res.body.assets[1]).toHaveProperty('SPVID', 'SPV-12345');
    });

    test('should return 404 when no assets found for a given SPV', async () => {
      const res = await request(app)
        .get('/api/spvassets/spv/SPV-NONEXISTENT')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'No assets found for SPV: SPV-NONEXISTENT');
    });
  });

  describe('GET /api/spvassets/valuation/spv/:spvId', () => {
    test('should calculate total valuation for a specific SPV', async () => {
      const res = await request(app)
        .get('/api/spvassets/valuation/spv/SPV-12345')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('spvId', 'SPV-12345');
      expect(res.body).toHaveProperty('totalValuation', 800000); // 500000 + 300000
      expect(res.body).toHaveProperty('assetCount', 2);
    });

    test('should return 404 when no assets found for valuation calculation', async () => {
      const res = await request(app)
        .get('/api/spvassets/valuation/spv/SPV-NONEXISTENT')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'No assets found for SPV: SPV-NONEXISTENT');
    });
  });

  describe('GET /api/spvassets/valuation/type/:type', () => {
    test('should calculate total valuation by asset type', async () => {
      const res = await request(app)
        .get('/api/spvassets/valuation/type/Real Estate')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('type', 'Real Estate');
      expect(res.body).toHaveProperty('totalValuation', 1250000); // 500000 + 750000
      expect(res.body).toHaveProperty('assetCount', 2);
    });

    test('should return 404 when no assets found for a given type', async () => {
      const res = await request(app)
        .get('/api/spvassets/valuation/type/NonExistentType')
        .expect('Content-Type', /json/);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'No assets found of type: NonExistentType');
    });
  });
});
