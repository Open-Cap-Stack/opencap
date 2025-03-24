/**
 * SPV Asset Management API Tests
 * Feature: OCAE-212: Implement SPV Asset Management API
 * Previously tracked as OCAE-003
 */
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const SPVAsset = require('../models/SPVasset');
const spvAssetRoutes = require('../routes/SPVasset'); 

const app = express();
app.use(express.json());
app.use('/api/spvassets', spvAssetRoutes);

describe('SPVAsset Routes', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test');
    await mongoose.connection.dropDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await SPVAsset.deleteMany({});
  });

  it('should create a new SPVAsset', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    const res = await request(app)
      .post('/api/spvassets')
      .send(assetData);

    expect(res.statusCode).toBe(201);
    expect(res.body.AssetID).toBe(assetData.AssetID);
  });

  it('should get all SPVAssets', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    await new SPVAsset(assetData).save();

    const res = await request(app).get('/api/spvassets');

    expect(res.statusCode).toBe(200);
    expect(res.body.spvassets).toBeInstanceOf(Array);
    expect(res.body.spvassets[0].AssetID).toBe(assetData.AssetID);
  });

  it('should get a specific SPVAsset by ID', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await new SPVAsset(assetData).save();

    const res = await request(app).get(`/api/spvassets/${savedAsset._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.AssetID).toBe(assetData.AssetID);
  });

  it('should return 400 for invalid asset ID format', async () => {
    const res = await request(app).get('/api/spvassets/invalid-id');
    
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid SPV Asset ID format');
  });

  it('should get all assets for a specific SPV', async () => {
    const assets = [
      {
        AssetID: 'asset-1',
        SPVID: 'test-spv',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-2',
        SPVID: 'test-spv',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Stocks',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-3',
        SPVID: 'other-spv',
        Type: 'Real Estate',
        Value: 750000,
        Description: 'Warehouse',
        AcquisitionDate: new Date(),
      }
    ];

    await SPVAsset.insertMany(assets);

    const res = await request(app).get('/api/spvassets/spv/test-spv');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
    expect(res.body.assets[0].SPVID).toBe('test-spv');
    expect(res.body.assets[1].SPVID).toBe('test-spv');
  });

  it('should return 404 if no assets found for SPV', async () => {
    const res = await request(app).get('/api/spvassets/spv/nonexistent-spv');
    
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('No assets found for SPV');
  });

  it('should calculate total valuation for a specific SPV', async () => {
    const assets = [
      {
        AssetID: 'asset-1',
        SPVID: 'test-spv',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-2',
        SPVID: 'test-spv',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Stocks',
        AcquisitionDate: new Date(),
      }
    ];

    await SPVAsset.insertMany(assets);

    const res = await request(app).get('/api/spvassets/valuation/spv/test-spv');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.spvId).toBe('test-spv');
    expect(res.body.totalValuation).toBe(1500000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assetBreakdown).toBeInstanceOf(Array);
    expect(res.body.assetBreakdown.length).toBe(2);
  });

  it('should calculate total valuation for a specific asset type', async () => {
    const assets = [
      {
        AssetID: 'asset-1',
        SPVID: 'spv-1',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-2',
        SPVID: 'spv-2',
        Type: 'Real Estate',
        Value: 1500000,
        Description: 'Warehouse',
        AcquisitionDate: new Date(),
      },
      {
        AssetID: 'asset-3',
        SPVID: 'spv-3',
        Type: 'Financial Instrument',
        Value: 500000,
        Description: 'Stocks',
        AcquisitionDate: new Date(),
      }
    ];

    await SPVAsset.insertMany(assets);

    const res = await request(app).get('/api/spvassets/valuation/type/Real Estate');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.type).toBe('Real Estate');
    expect(res.body.totalValuation).toBe(2500000);
    expect(res.body.assetCount).toBe(2);
    expect(res.body.assets).toBeInstanceOf(Array);
    expect(res.body.assets.length).toBe(2);
  });

  it('should update an SPV asset', async () => {
    const assetData = {
      AssetID: 'update-test-asset',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building downtown',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await new SPVAsset(assetData).save();
    
    const updateData = {
      Value: 1200000,
      Description: 'Updated office building downtown',
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.Value).toBe(1200000);
    expect(res.body.Description).toBe('Updated office building downtown');
    expect(res.body.AssetID).toBe(assetData.AssetID); // Should not change
    expect(res.body.SPVID).toBe(assetData.SPVID); // Should not change
  });

  it('should prevent updating AssetID and SPVID', async () => {
    const assetData = {
      AssetID: 'immutable-id-test',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await new SPVAsset(assetData).save();
    
    const updateData = {
      AssetID: 'try-to-change',
      SPVID: 'try-to-change',
      Value: 1200000,
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.Value).toBe(1200000);
    expect(res.body.AssetID).toBe(assetData.AssetID); // Should not change
    expect(res.body.SPVID).toBe(assetData.SPVID); // Should not change
  });

  it('should delete an SPVAsset by ID', async () => {
    const asset = new SPVAsset({
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    });
    await asset.save();

    const res = await request(app).delete(`/api/spvassets/${asset._id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('SPVAsset deleted');
  });

  it('should return 404 when calculating valuation for nonexistent asset type', async () => {
    const res = await request(app).get('/api/spvassets/valuation/type/NonexistentType');
    
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toContain('No assets found of type');
  });

  it('should handle invalid value in update request', async () => {
    const assetData = {
      AssetID: 'validation-test',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building',
      AcquisitionDate: new Date(),
    };

    const savedAsset = await new SPVAsset(assetData).save();
    
    const updateData = {
      Value: "not-a-number"
    };

    const res = await request(app)
      .put(`/api/spvassets/${savedAsset._id}`)
      .send(updateData);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid SPV Asset data');
  });

  it('should return 404 when updating nonexistent asset', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const updateData = {
      Value: 1200000,
    };

    const res = await request(app)
      .put(`/api/spvassets/${fakeId}`)
      .send(updateData);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('SPV Asset not found');
  });

  it('should return 404 when deleting nonexistent asset', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .delete(`/api/spvassets/${fakeId}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('SPVAsset not found');
  });

  it('should handle missing required fields when creating asset', async () => {
    const incompleteAssetData = {
      AssetID: 'incomplete-asset',
      // Missing required fields
    };

    const res = await request(app)
      .post('/api/spvassets')
      .send(incompleteAssetData);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Missing required fields');
  });
});
