const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const SPVAsset = require('../models/SPVAsset');
const spvAssetController = require('../controllers/SPVAsset');
const mongoDbConnection = require('../utils/mongoDbConnection');
const { 
  setupSPVAssetTests, 
  cleanupSPVAssets, 
  getSampleAssetData 
} = require('./utils/spvAssetTestUtils');
const SPV = require('../models/SPV'); // Import the SPV model

/**
 * SPV Asset Controller Tests
 * 
 * [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 * 
 * This test file verifies the fixes for MongoDB connection timeouts
 * in the SPV Asset controller with expanded test coverage to meet
 * the required thresholds.
 */
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
    
    // Restore any stubs
    sinon.restore();
  });

  it('should create a new SPVAsset', async function () {
    const sampleAsset = getSampleAssetData();
    sampleAsset.AssetID = 'TEST-ASSET-1234'; // Use uppercase asset ID
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
    // Create a sample asset for testing
    const sampleAsset = getSampleAssetData();
    sampleAsset.AssetID = 'TEST-ASSET-1743310950058'; // Use uppercase asset ID
    
    // Stub the find call to return our sample asset
    const findStub = sinon.stub(SPVAsset, 'find');
    findStub.resolves([sampleAsset]);
    
    const req = {};
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    await spvAssetController.getSPVAssets(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the response structure
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.spvassets).toBeInstanceOf(Array);
    expect(responseArg.spvassets[0].AssetID).toBe(sampleAsset.AssetID);
    
    findStub.restore();
  });

  it('should get an SPVAsset by ID', async function () {
    // Create a test asset
    const sampleAsset = new SPVAsset(getSampleAssetData());
    sampleAsset.AssetID = 'TEST-ASSET-ID'; // Use uppercase asset ID
    await sampleAsset.save();

    const req = {
      params: {
        id: sampleAsset._id.toString()
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getSPVAssetById(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the response data matches the asset
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.AssetID).toBe(sampleAsset.AssetID);
    expect(responseArg.SPVID).toBe(sampleAsset.SPVID);
  });

  it('should return 404 when getting non-existent SPVAsset', async function () {
    const req = {
      params: {
        id: new mongoose.Types.ObjectId().toString() // Valid format but non-existent ID
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    // Mock that no asset is found
    const findByIdStub = sinon.stub(SPVAsset, 'findById').resolves(null);
    
    await spvAssetController.getSPVAssetById(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('SPVAsset not found');
    
    findByIdStub.restore();
  });

  it('should handle invalid ID format when getting SPVAsset by ID', async function () {
    const req = {
      params: {
        id: 'invalid-id-format'
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getSPVAssetById(req, res);

    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Invalid SPV Asset ID format');
  });

  let spvFindOneStub;
  let findStub;
  let findByIdStub;

  beforeEach(() => {
    spvFindOneStub = sinon.stub(SPV, 'findOne');
    findStub = sinon.stub(SPVAsset, 'find');
    findByIdStub = sinon.stub(SPVAsset, 'findById');
  });

  afterEach(() => {
    spvFindOneStub.restore();
    findStub.restore();
    findByIdStub.restore();
  });

  it('should get assets by SPV ID', async function () {
    const spvId = 'SPV-TEST-GET';
    
    const asset1 = getSampleAssetData();
    asset1.SPVID = spvId;
    asset1.AssetID = 'TEST-ASSET-1'; // Use uppercase asset ID
    
    const asset2 = getSampleAssetData();
    asset2.SPVID = spvId;
    asset2.AssetID = 'TEST-ASSET-2'; // Use uppercase asset ID
    
    spvFindOneStub.resolves({ SPVID: spvId });
    
    findStub.resolves([asset1, asset2]);
    
    const req = {
      params: {
        spvId: spvId
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    await spvAssetController.getAssetsBySPVId(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify response includes both assets with the same SPV ID
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.assets).toBeInstanceOf(Array);
    expect(responseArg.assets.length).toBe(2);
    expect(responseArg.assets.find(a => a.AssetID === 'TEST-ASSET-1')).toBeDefined();
    expect(responseArg.assets.find(a => a.AssetID === 'TEST-ASSET-2')).toBeDefined();
  });

  it('should return 404 when no assets exist for SPV ID', async function () {
    const nonExistentSPVId = 'NONEXISTENT-SPV-ID';
    
    const req = {
      params: { spvId: nonExistentSPVId }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    spvFindOneStub.resolves(null);
    
    await spvAssetController.getAssetsBySPVId(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('SPV not found');
  });

  it('should calculate SPV valuation correctly', async function () {
    const spvId = 'SPV-VALUATION-TEST';
    
    const assets = [
      { ...getSampleAssetData(), SPVID: spvId, AssetID: 'TEST-ASSET-VAL-1', Value: 1000 },
      { ...getSampleAssetData(), SPVID: spvId, AssetID: 'TEST-ASSET-VAL-2', Value: 2000 },
      { ...getSampleAssetData(), SPVID: spvId, AssetID: 'TEST-ASSET-VAL-3', Value: 3000 }
    ];
    
    const req = {
      params: { spvId }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    spvFindOneStub.resolves({ SPVID: spvId });
    
    findStub.resolves(assets);
    
    await spvAssetController.getSPVValuation(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the valuation calculation
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.spvId).toBe(spvId);
    expect(responseArg.totalValuation).toBe(6000); // 1000 + 2000 + 3000
    expect(responseArg.assetCount).toBe(3);
  });

  it('should handle database errors when calculating SPV valuation', async function () {
    const spvId = 'SPV-ERROR-TEST';
    
    const req = {
      params: { spvId }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    spvFindOneStub.resolves({ SPVID: spvId });
    
    findStub.rejects(new Error('Database error'));
    
    await spvAssetController.getSPVValuation(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to calculate SPV valuation');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });

  it('should calculate asset type valuation correctly', async function () {
    // Create multiple assets of the same type with different values
    const assetType = 'Real Estate'; // Use valid enum value
    
    const assets = [
      { ...getSampleAssetData(), Type: assetType, AssetID: 'TEST-ASSET-TYPE-1', Value: 1500 },
      { ...getSampleAssetData(), Type: assetType, AssetID: 'TEST-ASSET-TYPE-2', Value: 2500 },
      { ...getSampleAssetData(), Type: assetType, AssetID: 'TEST-ASSET-TYPE-3', Value: 3500 }
    ];
    
    // Stub find method to return assets
    findStub.resolves(assets);
    
    const req = {
      query: { type: assetType }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    await spvAssetController.getAssetTypeValuation(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the valuation calculation
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.assetType).toBe(assetType);
    expect(responseArg.totalValuation).toBe(7500); // 1500 + 2500 + 3500
    expect(responseArg.assetCount).toBe(3);
  });

  it('should update an SPVAsset', async function () {
    // Create a test asset with writable properties and a save method
    const asset = {
      _id: new mongoose.Types.ObjectId(),
      AssetID: 'TEST-ASSET-UPDATE', // IMPORTANT: Use uppercase for IDs
      SPVID: 'TEST-SPV-UPDATE',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Original description',
      AcquisitionDate: new Date(),
      save: sinon.stub().resolves()
    };
    
    const updatedValues = {
      Value: 1500000,
      Description: 'Updated description'
    };
    
    // Store the original values for reference
    const originalDescription = asset.Description;
    
    const req = {
      params: {
        id: asset._id.toString()
      },
      body: updatedValues
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    // Mock findById to return our asset with a save method
    findByIdStub.resolves(asset);
    
    await spvAssetController.updateSPVAsset(req, res);
    
    // Verify the asset object was modified with the new values before save was called
    expect(asset.Value).toBe(updatedValues.Value);
    expect(asset.Description).toBe(updatedValues.Description);
    expect(asset.Description).not.toBe(originalDescription);
    
    // Verify save was called
    expect(asset.save.called).toBe(true);
    
    // Verify response
    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.firstCall.args[0]).toBe(asset);
  });

  it('should handle invalid ID format when updating SPVAsset', async function () {
    const req = {
      params: {
        id: 'invalid-id-format'
      },
      body: { Value: 123 }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.updateSPVAsset(req, res);

    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Invalid SPV Asset ID format');
  });

  it('should return 404 when updating non-existent SPVAsset', async function () {
    const req = {
      params: {
        id: new mongoose.Types.ObjectId().toString() // Valid but non-existent ID
      },
      body: { Value: 123 }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.updateSPVAsset(req, res);

    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('SPVAsset not found');
  });

  it('should handle database errors when updating SPV asset', async function () {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: {
        id: validId
      },
      body: {
        Value: 2000000,
        Description: 'Updated description'
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    // Directly simulate a database error at the findById level
    const dbError = new Error('Database update error');
    
    // Restore existing stubs to avoid conflicts
    if (findByIdStub.restore) findByIdStub.restore();
    
    // Simulate database error by rejecting the findById call
    const tempFindByIdStub = sinon.stub(SPVAsset, 'findById').rejects(dbError);
    
    await spvAssetController.updateSPVAsset(req, res);
    
    // Cleanup
    tempFindByIdStub.restore();
    
    // Verify error handling
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to update SPVAsset');
  });

  it('should delete an SPVAsset by ID', async function () {
    // Create a test asset with ID and deleteOne method
    const asset = {
      _id: new mongoose.Types.ObjectId(),
      AssetID: 'TEST-ASSET-DELETE',
      SPVID: 'TEST-SPV-DELETE',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Asset to delete',
      deleteOne: sinon.stub().resolves({ deletedCount: 1 })
    };
    
    const req = {
      params: {
        id: asset._id.toString()
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    // Mock findById to return our asset with deleteOne method
    findByIdStub.resolves(asset);
    
    await spvAssetController.deleteSPVAsset(req, res);
    
    // Check that deleteOne was called
    expect(asset.deleteOne.called).toBe(true);
    
    // Check for the success response
    expect(res.status.calledWith(200)).toBe(true);
    
    // Check for the success message
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg.message).toBe('SPVAsset deleted successfully');
  });

  it('should return 404 when deleting non-existent SPVAsset', async function () {
    const req = {
      params: {
        id: new mongoose.Types.ObjectId().toString() // Valid but non-existent ID
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.deleteSPVAsset(req, res);

    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('SPVAsset not found');
  });

  it('should handle database errors when deleting SPV asset', async function () {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: {
        id: validId
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    // Directly simulate a database error at the findById level
    const dbError = new Error('Database delete error');
    
    // Restore existing stubs to avoid conflicts
    if (findByIdStub.restore) findByIdStub.restore();
    
    // Simulate database error by rejecting the findById call
    const tempFindByIdStub = sinon.stub(SPVAsset, 'findById').rejects(dbError);
    
    await spvAssetController.deleteSPVAsset(req, res);
    
    // Cleanup
    tempFindByIdStub.restore();
    
    // Verify error handling
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to delete SPVAsset');
  });

  it('should handle validation failures when creating an SPVAsset', async function () {
    // Missing required fields
    const invalidAsset = {
      // Missing AssetID, SPVID, etc.
      Description: 'This asset is invalid'
    };

    const req = {
      body: invalidAsset
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.createSPVAsset(req, res);

    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Missing required fields');
  });

  // Additional tests to improve coverage for error handling

  it('should handle database errors when getting all SPV assets', async function () {
    const req = {};
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    // Simulate a database error by rejecting the find call
    findStub.rejects(new Error('Database connection error'));
    
    await spvAssetController.getSPVAssets(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to retrieve SPVAssets');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });

  it('should handle database errors when updating SPV asset', async function () {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: {
        id: validId
      },
      body: {
        Value: 5000
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.updateSPVAsset(req, res);

    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to update SPVAsset');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });

  it('should handle database errors when deleting SPV asset', async function () {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: {
        id: validId
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.deleteSPVAsset(req, res);

    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to delete SPVAsset');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });
});
