/**
 * SPV Asset API - GET by ID Functionality Tests
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

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/spvassets', spvAssetRoutes);

describe('SPV Asset API - GET by ID Functionality', () => {
  let assetId;

  // Connect to test database before tests
  beforeAll(async () => {
    // Use the improved MongoDB connection utility with retry logic
    await mongoDbConnection.connectWithRetry();
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoDbConnection.disconnect();
  });

  // Create a test SPV Asset before each test
  beforeEach(async () => {
    // Use MongoDB connection utility with retry logic
    await mongoDbConnection.withRetry(async () => {
      await SPVAsset.deleteMany({});
      const asset = new SPVAsset(testSPVAsset);
      const savedAsset = await asset.save();
      assetId = savedAsset._id;
    });
  });

  describe('GET /api/spvassets/:id', () => {
    test('should get an SPV Asset by ID', async () => {
      const res = await withAuthentication(
        request(app).get(`/api/spvassets/${assetId}`)
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('AssetID', testSPVAsset.AssetID);
      expect(res.body).toHaveProperty('SPVID', testSPVAsset.SPVID);
      expect(res.body).toHaveProperty('Type', testSPVAsset.Type);
      expect(res.body).toHaveProperty('Value', testSPVAsset.Value);
      expect(res.body).toHaveProperty('Description', testSPVAsset.Description);
    });

    test('should return 404 when SPV Asset does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await withAuthentication(
        request(app).get(`/api/spvassets/${nonExistentId}`)
      );

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'SPV Asset not found');
    });

    test('should return 400 for invalid ID format', async () => {
      const res = await withAuthentication(
        request(app).get('/api/spvassets/invalid-id-format')
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid SPV Asset ID format');
    });
  });
});
