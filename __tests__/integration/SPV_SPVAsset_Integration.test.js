/**
 * SPV and SPV Asset API - Integration Tests
 * Feature: OCAE-211: Implement SPV Management API
 */
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const spvRoutes = require('../../routes/SPV');
const spvAssetRoutes = require('../../routes/SPVAsset'); // Fixed casing
const SPV = require('../../models/SPV');
const SPVAsset = require('../../models/SPVAsset'); // Fixed casing
const { setupDockerTestEnv } = require('../setup/docker-test-env');

// Setup Docker test environment variables
setupDockerTestEnv();

// Mock data for SPV
const testSPV = {
  SPVID: 'SPV-INTEGRATION-TEST',
  Name: 'Integration Test SPV',
  Purpose: 'Testing cross-service functionality',
  CreationDate: new Date('2025-03-20'),
  Status: 'Active',
  ParentCompanyID: 'PARENT-001',
  ComplianceStatus: 'Compliant'
};

// Mock data for SPV Assets
const testSPVAssets = [
  {
    AssetID: 'ASSET-INT-001',
    SPVID: 'SPV-INTEGRATION-TEST',
    Type: 'Real Estate',
    Value: 500000,
    Description: 'Property A for Integration Test',
    AcquisitionDate: new Date('2025-03-20')
  },
  {
    AssetID: 'ASSET-INT-002',
    SPVID: 'SPV-INTEGRATION-TEST',
    Type: 'Financial Instrument',
    Value: 300000,
    Description: 'Financial Instrument for Integration Test',
    AcquisitionDate: new Date('2025-03-21')
  }
];

// Setup express app for testing
const app = express();
app.use(express.json());
app.use('/api/spvs', spvRoutes);
app.use('/api/spvassets', spvAssetRoutes);

describe('SPV and SPV Asset API - Integration Tests', () => {
  let spvId;

  // Connect to test database before tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    await SPV.deleteMany({});
    await SPVAsset.deleteMany({});
  });

  // Disconnect after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Clean up database before each test
  beforeEach(async () => {
    await SPV.deleteMany({});
    await SPVAsset.deleteMany({});
  });

  test('Creating SPV and associated assets should maintain proper relationships', async () => {
    // 1. Create a new SPV
    const spvRes = await request(app)
      .post('/api/spvs')
      .send(testSPV)
      .expect('Content-Type', /json/);

    expect(spvRes.statusCode).toBe(201);
    expect(spvRes.body).toHaveProperty('SPVID', testSPV.SPVID);
    spvId = spvRes.body._id;

    // 2. Create assets associated with the SPV
    for (const asset of testSPVAssets) {
      const assetRes = await request(app)
        .post('/api/spvassets')
        .send(asset)
        .expect(201);

      expect(assetRes.body).toHaveProperty('SPVID', testSPV.SPVID);
    }

    // 3. Verify that assets are linked to the SPV
    const assetsRes = await request(app)
      .get(`/api/spvassets/spv/${testSPV.SPVID}`)
      .expect(200);

    expect(assetsRes.body).toHaveProperty('assets');
    expect(assetsRes.body.assets).toHaveLength(testSPVAssets.length);
    expect(assetsRes.body.assets[0]).toHaveProperty('SPVID', testSPV.SPVID);
    expect(assetsRes.body.assets[1]).toHaveProperty('SPVID', testSPV.SPVID);

    // 4. Calculate expected total valuation
    const expectedValuation = testSPVAssets.reduce((sum, asset) => sum + asset.Value, 0);

    // 5. Verify the SPV asset valuation endpoint
    const valuationRes = await request(app)
      .get(`/api/spvassets/valuation/spv/${testSPV.SPVID}`)
      .expect(200);

    expect(valuationRes.body).toHaveProperty('totalValuation', expectedValuation);
    expect(valuationRes.body).toHaveProperty('assetCount', testSPVAssets.length);
  });

  test('Updating SPV status should not affect associated assets', async () => {
    // 1. Create a new SPV
    const spvRes = await request(app)
      .post('/api/spvs')
      .send(testSPV)
      .expect('Content-Type', /json/);

    spvId = spvRes.body._id;

    // 2. Create assets associated with the SPV
    for (const asset of testSPVAssets) {
      await request(app)
        .post('/api/spvassets')
        .send(asset)
        .expect(201);
    }

    // 3. Update the SPV status to Closed (previously was Inactive)
    const updateData = {
      Status: 'Closed'
    };

    await request(app)
      .put(`/api/spvs/${spvId}`)
      .send(updateData)
      .expect(200);

    // 4. Verify the SPV status has been updated
    const updatedSPVRes = await request(app)
      .get(`/api/spvs/${spvId}`)
      .expect(200);

    expect(updatedSPVRes.body).toHaveProperty('Status', 'Closed');

    // 5. Verify that all assets are still accessible and unchanged
    const assetsRes = await request(app)
      .get(`/api/spvassets/spv/${testSPV.SPVID}`)
      .expect(200);

    expect(assetsRes.body.assets).toHaveLength(testSPVAssets.length);
    
    // Assets should retain their original values despite SPV status change
    expect(assetsRes.body.assets[0]).toHaveProperty('Value', testSPVAssets[0].Value);
    expect(assetsRes.body.assets[1]).toHaveProperty('Value', testSPVAssets[1].Value);
  });

  test('Retrieving SPVs by status should return the correct subset', async () => {
    // 1. Create active and closed SPVs (previously was inactive)
    const activeSPV = { ...testSPV };
    const closedSPV = { 
      ...testSPV, 
      SPVID: 'SPV-CLOSED-TEST', 
      Name: 'Closed SPV',
      Status: 'Closed' 
    };

    await request(app)
      .post('/api/spvs')
      .send(activeSPV)
      .expect(201);

    await request(app)
      .post('/api/spvs')
      .send(closedSPV)
      .expect(201);

    // 2. Retrieve SPVs by status
    const activeRes = await request(app)
      .get('/api/spvs/status/Active')
      .expect(200);

    const closedRes = await request(app)
      .get('/api/spvs/status/Closed')
      .expect(200);

    // 3. Verify correct SPVs are returned by status
    expect(activeRes.body.spvs).toHaveLength(1);
    expect(activeRes.body.spvs[0]).toHaveProperty('SPVID', activeSPV.SPVID);
    expect(activeRes.body.spvs[0]).toHaveProperty('Status', 'Active');

    expect(closedRes.body.spvs).toHaveLength(1);
    expect(closedRes.body.spvs[0]).toHaveProperty('SPVID', closedSPV.SPVID);
    expect(closedRes.body.spvs[0]).toHaveProperty('Status', 'Closed');
  });
});
