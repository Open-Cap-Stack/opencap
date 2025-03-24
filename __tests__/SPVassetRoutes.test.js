/**
 * SPV Asset Management API Tests
 * Feature: OCAE-012: Create BDD test suite for SPV Asset Management API
 */
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const SPVAsset = require('../models/spvasset');
const spvAssetRoutes = require('../routes/SPVasset');

const app = express();
app.use(express.json());
app.use('/api/spvassets', spvAssetRoutes);

// Sample test data
const testAsset = {
  AssetID: 'asset-001',
  SPVID: 'spv-001',
  Type: 'Real Estate', // Using the correct enum value from the model
  Value: 1000000,
  Description: 'Office building in downtown',
  AcquisitionDate: new Date()
};

// Setup and teardown
beforeEach(async () => {
  await SPVAsset.deleteMany({});
});

// POST /api/spvassets - Create a new SPV Asset
describe('POST /api/spvassets', () => {
  it('should create a new SPV Asset with valid data', async () => {
    const res = await request(app)
      .post('/api/spvassets')
      .send(testAsset);

    expect(res.statusCode).toBe(201);
    expect(res.body.AssetID).toBe(testAsset.AssetID);
    expect(res.body.SPVID).toBe(testAsset.SPVID);
    expect(res.body.Value).toBe(testAsset.Value);
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/spvassets')
      .send({
        Description: 'Incomplete asset'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets - Get all SPV Assets
describe('GET /api/spvassets', () => {
  it('should get all SPV Assets', async () => {
    // Create test assets
    await new SPVAsset(testAsset).save();
    await new SPVAsset({
      ...testAsset,
      AssetID: 'asset-002',
      Description: 'Second asset'
    }).save();

    const res = await request(app).get('/api/spvassets');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('AssetID');
    expect(res.body[1]).toHaveProperty('AssetID');
  });

  it('should return empty array when no assets exist', async () => {
    const res = await request(app).get('/api/spvassets');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(0);
  });
});

// GET /api/spvassets/:id - Get asset by ID
describe('GET /api/spvassets/:id', () => {
  it('should get an asset by valid ID', async () => {
    const asset = await new SPVAsset(testAsset).save();
    const res = await request(app).get(`/api/spvassets/${asset.AssetID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.AssetID).toBe(testAsset.AssetID);
    expect(res.body.SPVID).toBe(testAsset.SPVID);
  });

  it('should return 404 for non-existent asset ID', async () => {
    const res = await request(app).get('/api/spvassets/non-existent-id');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 400 for invalid asset ID format', async () => {
    const res = await request(app).get('/api/spvassets/123'); // Assuming ID validation in place

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets/spv/:spvId - Get assets for a specific SPV
describe('GET /api/spvassets/spv/:spvId', () => {
  it('should get assets for a specific SPV', async () => {
    await new SPVAsset(testAsset).save(); // SPVID: spv-001
    await new SPVAsset({
      ...testAsset,
      AssetID: 'asset-002',
      SPVID: 'spv-002'
    }).save();

    const res = await request(app).get('/api/spvassets/spv/spv-001');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(1);
    expect(res.body[0].SPVID).toBe('spv-001');
  });

  it('should return 404 if no assets found for SPV', async () => {
    const res = await request(app).get('/api/spvassets/spv/non-existent-spv');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets/valuation/spv/:spvId - Get total valuation for a specific SPV
describe('GET /api/spvassets/valuation/spv/:spvId', () => {
  it('should calculate total valuation for a specific SPV', async () => {
    // Create assets for the same SPV with different values
    await new SPVAsset(testAsset).save(); // SPVID: spv-001, Value: 1000000
    await new SPVAsset({
      ...testAsset,
      AssetID: 'asset-002',
      Value: 500000
    }).save();

    const res = await request(app).get('/api/spvassets/valuation/spv/spv-001');

    expect(res.statusCode).toBe(200);
    expect(res.body.spvId).toBe('spv-001');
    expect(res.body.totalValuation).toBe(1500000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
  });

  it('should return 404 if no assets found for SPV valuation', async () => {
    const res = await request(app).get('/api/spvassets/valuation/spv/non-existent-spv');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// GET /api/spvassets/valuation/type/:type - Get Valuation by Asset Type
describe('GET /api/spvassets/valuation/type/:type', () => {
  it('should calculate total valuation for a specific asset type', async () => {
    // Create assets of different types
    await new SPVAsset(testAsset).save(); // Type: Real Estate, Value: 1000000
    await new SPVAsset({
      ...testAsset,
      AssetID: 'asset-002',
      Type: 'Financial Instrument', // Using the correct enum value from the model
      Value: 500000
    }).save();
    await new SPVAsset({
      ...testAsset,
      AssetID: 'asset-003',
      Type: 'Real Estate', // Using the correct enum value from the model
      Value: 750000
    }).save();

    const res = await request(app).get('/api/spvassets/valuation/type/Real Estate');

    expect(res.statusCode).toBe(200);
    expect(res.body.type).toBe('Real Estate');
    expect(res.body.totalValuation).toBe(1750000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
  });

  it('should return 404 if no assets found of that type', async () => {
    const res = await request(app).get('/api/spvassets/valuation/type/Intellectual');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// PUT /api/spvassets/:id - Update Asset
describe('PUT /api/spvassets/:id', () => {
  it('should update an asset by ID', async () => {
    const savedAsset = await new SPVAsset(testAsset).save();
    const updateData = {
      Type: 'Financial Instrument', // Using the correct enum value from the model
      Value: 1250000,
      Description: 'Updated asset description'
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset.AssetID}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.Type).toBe(updateData.Type);
    expect(res.body.Value).toBe(updateData.Value);
    expect(res.body.Description).toBe(updateData.Description);
    expect(res.body.AssetID).toBe(savedAsset.AssetID); // ID should remain unchanged
  });

  it('should prevent AssetID and SPVID from being updated', async () => {
    const savedAsset = await new SPVAsset(testAsset).save();
    const updateData = {
      AssetID: 'new-asset-id',
      SPVID: 'new-spv-id',
      Description: 'Updated description'
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset.AssetID}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.AssetID).toBe(savedAsset.AssetID); // Original ID should be preserved
    expect(res.body.SPVID).toBe(savedAsset.SPVID); // Original SPVID should be preserved
    expect(res.body.Description).toBe(updateData.Description);
  });

  it('should return 400 if Value is not numeric', async () => {
    const savedAsset = await new SPVAsset(testAsset).save();
    const updateData = {
      Value: 'not-a-number'
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset.AssetID}`)
      .send(updateData);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should return 404 for non-existent asset ID', async () => {
    const res = await request(app)
      .put('/api/spvassets/non-existent-id')
      .send({ Description: 'Updated description' });

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});

// DELETE /api/spvassets/:id - Delete Asset
describe('DELETE /api/spvassets/:id', () => {
  it('should delete an asset by ID', async () => {
    const asset = await new SPVAsset(testAsset).save();
    const res = await request(app).delete(`/api/spvassets/${asset.AssetID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('message');

    // Verify asset is deleted
    const findRes = await request(app).get(`/api/spvassets/${asset.AssetID}`);
    expect(findRes.statusCode).toBe(404);
  });

  it('should return 404 for non-existent asset ID', async () => {
    const res = await request(app).delete('/api/spvassets/non-existent-id');

    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('message');
  });
});
