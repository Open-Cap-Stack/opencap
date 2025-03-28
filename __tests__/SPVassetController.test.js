const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const SPVAsset = require('../models/SPVAsset');
const spvAssetController = require('../controllers/SPVAsset');
const { 
  setupSPVAssetTests, 
  cleanupSPVAssets, 
  getSampleAssetData 
} = require('./utils/spvAssetTestUtils');

describe('SPVAsset Controller', function () {
  beforeAll(async () => {
    // Use the new setup utility with improved connection handling
    await setupSPVAssetTests({ dropCollection: true });
  });

  afterAll(async () => {
    // Don't disconnect here - managed by jest.setup.js
  });

  beforeEach(async () => {
    // Use the new cleanup utility with retry logic
    await cleanupSPVAssets();
  });

  it('should create a new SPVAsset', async function () {
    const sampleAsset = getSampleAssetData();
    const req = {
      body: sampleAsset
    };
    
    // Create a more complete res mock with res.locals
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.createSPVAsset(req, res);

    expect(res.status.calledWith(201)).toBe(true);
    expect(res.json.calledOnce).toBe(true);
    
    // Check that the response data includes the asset ID
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.AssetID).toBe(sampleAsset.AssetID);
  });

  it('should get all SPVAssets', async function () {
    // Create a test asset using the utility with retry logic
    const sampleAsset = getSampleAssetData();
    await new SPVAsset(sampleAsset).save();

    const req = {};
    
    // Create a more complete res mock with res.locals
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getSPVAssets(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the response structure
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.spvassets).toBeInstanceOf(Array);
    expect(responseArg.spvassets[0].AssetID).toBe(sampleAsset.AssetID);
  });

  it('should delete an SPVAsset by ID', async function () {
    // Create a test asset using the utility with retry logic
    const asset = new SPVAsset(getSampleAssetData());
    await asset.save();

    const req = {
      params: {
        id: asset._id.toString(),
      },
    };
    
    // Create a more complete res mock with res.locals
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.deleteSPVAsset(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    
    // Check for the success message
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.message).toBe('SPVAsset deleted');
    
    // Verify the asset was actually deleted from the database
    const deletedAsset = await SPVAsset.findById(asset._id);
    expect(deletedAsset).toBeNull();
  });
});
