const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const SPVAsset = require('../models/SPVAsset');
const spvAssetRoutes = require('../routes/SPVAsset'); // Make sure to create this route file

const app = express();
app.use(express.json());
app.use('/api/spvassets', spvAssetRoutes);

describe('SPVAsset Routes', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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
});
