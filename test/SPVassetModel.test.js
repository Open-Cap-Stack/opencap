const mongoose = require('mongoose');
const { expect } = require('@jest/globals');
const SPVAsset = require('../models/SPVAsset');

describe('SPVAsset Model', () => {
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

  it('should create an SPVAsset with valid fields', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    const asset = new SPVAsset(assetData);
    const savedAsset = await asset.save();

    expect(savedAsset.AssetID).toBe(assetData.AssetID);
    expect(savedAsset.SPVID).toBe(assetData.SPVID);
    expect(savedAsset.Type).toBe(assetData.Type);
    expect(savedAsset.Value).toBe(assetData.Value);
    expect(savedAsset.Description).toBe(assetData.Description);
    expect(new Date(savedAsset.AcquisitionDate).toISOString()).toBe(assetData.AcquisitionDate.toISOString());
  });

  it('should not create an SPVAsset without required fields', async () => {
    const assetData = {
      SPVID: 'spv123',
      Value: 1000000,
    };

    try {
      const asset = new SPVAsset(assetData);
      await asset.save();
    } catch (error) {
      expect(error.errors.AssetID).toBeTruthy();
      expect(error.errors.Type).toBeTruthy();
      expect(error.errors.Description).toBeTruthy();
      expect(error.errors.AcquisitionDate).toBeTruthy();
    }
  });

  it('should not create an SPVAsset with invalid enum values', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'InvalidType', // Invalid enum value
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    try {
      const asset = new SPVAsset(assetData);
      await asset.save();
    } catch (error) {
      expect(error.errors.Type).toBeTruthy();
    }
  });
});
