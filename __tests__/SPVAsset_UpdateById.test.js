/**
 * SPV Asset API - PUT/Update Functionality Tests
 * Bug Fix: OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Updated to mock JWT authentication and use robust MongoDB connection utilities
 * Following Semantic Seed Venture Studio Coding Standards
 */
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const spvAssetRoutes = require('../routes/SPVasset');
const SPVAsset = require('../models/SPVasset');
const mongoDbConnection = require('../utils/mongoDbConnection');
const { withAuthentication } = require('./utils/authTestUtils');

// Mock JWT authentication middleware
jest.mock('../middleware/jwtAuth', () => ({
  authenticate: jest.fn((req, res, next) => {
    // Set mock user with admin role
    req.user = {
      id: 'test-user-id',
      email: 'admin@test.com',
      roles: ['Admin']
    };
    next();
  }),
  authenticateRole: jest.fn(() => (req, res, next) => {
    next();
  })
}));

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

  // Connect to test database before tests with retry logic
  beforeAll(async () => {
    // Use the improved MongoDB connection utility with retry logic
    await mongoDbConnection.connectWithRetry();
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoDbConnection.disconnect();
  });

  // Create a test SPV Asset before each test with retry logic
  beforeEach(async () => {
    // Use MongoDB connection utility with retry logic
    await mongoDbConnection.withRetry(async () => {
      await SPVAsset.deleteMany({});
      const asset = new SPVAsset(testSPVAsset);
      const savedAsset = await asset.save();
      assetId = savedAsset._id;
    });
  });

  describe('PUT /api/spvassets/:id', () => {
    test('should update an SPV Asset with valid data', async () => {
      const res = await withAuthentication(
        request(app)
          .put(`/api/spvassets/${assetId}`)
          .send(updateData)
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('Value', updateData.Value);
      expect(res.body).toHaveProperty('Description', updateData.Description);
      expect(res.body).toHaveProperty('Type', updateData.Type);
      
      // Verify data was actually saved to database
      const updated = await mongoDbConnection.withRetry(async () => {
        return await SPVAsset.findById(assetId);
      });
      
      expect(updated.Value).toBe(updateData.Value);
      expect(updated.Description).toBe(updateData.Description);
      expect(updated.Type).toBe(updateData.Type);
    });

    test('should not update immutable fields (AssetID, SPVID)', async () => {
      const immutableUpdateData = {
        AssetID: 'NEW-ASSET-ID',
        SPVID: 'NEW-SPV-ID',
        Description: 'Updated with immutable fields'
      };

      const res = await withAuthentication(
        request(app)
          .put(`/api/spvassets/${assetId}`)
          .send(immutableUpdateData)
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('AssetID', testSPVAsset.AssetID); // Should remain unchanged
      expect(res.body).toHaveProperty('SPVID', testSPVAsset.SPVID); // Should remain unchanged
      expect(res.body).toHaveProperty('Description', immutableUpdateData.Description); // Should be updated
    });

    test('should return 400 for invalid data types', async () => {
      const invalidData = {
        Value: 'not-a-number',
        Description: 'Invalid Value Type Test'
      };

      const res = await withAuthentication(
        request(app)
          .put(`/api/spvassets/${assetId}`)
          .send(invalidData)
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    test('should return 404 for non-existent SPV Asset', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const res = await withAuthentication(
        request(app)
          .put(`/api/spvassets/${nonExistentId}`)
          .send(updateData)
      );

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message');
    });

    test('should return 400 for invalid ID format', async () => {
      const res = await withAuthentication(
        request(app)
          .put('/api/spvassets/invalid-id-format')
          .send(updateData)
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
  });
});
