/**
 * SPV Asset Model Tests
 * Bug Fix: OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * Updated to use robust MongoDB connection utilities with retry logic
 * Following Semantic Seed Venture Studio Coding Standards
 */
const mongoose = require('mongoose');
const { expect } = require('@jest/globals');
const SPVAsset = require('../models/SPVasset');
const mongoDbConnection = require('../utils/mongoDbConnection');

describe('SPVAsset Model', () => {
  beforeAll(async () => {
    // Use the improved MongoDB connection utility with retry logic
    await mongoDbConnection.connectWithRetry();
  });

  afterAll(async () => {
    await mongoDbConnection.disconnect();
  });

  beforeEach(async () => {
    // Use MongoDB connection utility with retry logic
    await mongoDbConnection.withRetry(async () => {
      await SPVAsset.deleteMany({});
    });
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

    // Use MongoDB connection utility with retry logic
    const savedAsset = await mongoDbConnection.withRetry(async () => {
      const asset = new SPVAsset(assetData);
      return await asset.save();
    });

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

    let error;
    try {
      await mongoDbConnection.withRetry(async () => {
        const asset = new SPVAsset(assetData);
        return await asset.save();
      });
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.AssetID).toBeTruthy();
    expect(error.errors.Type).toBeTruthy();
    expect(error.errors.Description).toBeTruthy();
    expect(error.errors.AcquisitionDate).toBeTruthy();
  });

  it('should enforce Type enum validation', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Invalid Type', // Not in enum
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    let error;
    try {
      await mongoDbConnection.withRetry(async () => {
        const asset = new SPVAsset(assetData);
        return await asset.save();
      });
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.Type).toBeTruthy();
  });

  it('should enforce Value as a number', async () => {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 'not-a-number', // Should be a number
      Description: 'Office building in downtown',
      AcquisitionDate: new Date(),
    };

    let error;
    try {
      await mongoDbConnection.withRetry(async () => {
        const asset = new SPVAsset(assetData);
        return await asset.save();
      });
    } catch (err) {
      error = err;
    }
    
    expect(error).toBeDefined();
    expect(error.errors.Value).toBeTruthy();
  });
});
