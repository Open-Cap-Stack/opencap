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

  it('should get an SPVAsset by ID', async function () {
    // Create a test asset
    const sampleAsset = new SPVAsset(getSampleAssetData());
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

  it('should return 404 when getting non-existent SPVAsset by ID', async function () {
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

    await spvAssetController.getSPVAssetById(req, res);

    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('SPV Asset not found');
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

  it('should get assets by SPV ID', async function () {
    // Create two assets with the same SPV ID
    const spvId = 'test-spv-123';
    
    const asset1 = getSampleAssetData();
    asset1.SPVID = spvId;
    asset1.AssetID = 'asset-1';
    
    const asset2 = getSampleAssetData();
    asset2.SPVID = spvId;
    asset2.AssetID = 'asset-2';
    
    await new SPVAsset(asset1).save();
    await new SPVAsset(asset2).save();

    const req = {
      params: {
        spvId: spvId
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getAssetsBySPVId(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify response includes both assets with the same SPV ID
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.assets).toBeInstanceOf(Array);
    expect(responseArg.assets.length).toBe(2);
    expect(responseArg.assets.find(a => a.AssetID === 'asset-1')).toBeDefined();
    expect(responseArg.assets.find(a => a.AssetID === 'asset-2')).toBeDefined();
  });

  it('should return 404 when no assets exist for SPV ID', async function () {
    const req = {
      params: {
        spvId: 'non-existent-spv'
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getAssetsBySPVId(req, res);

    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.firstCall.args[0].message).toContain('No assets found for SPV');
  });

  it('should calculate SPV valuation correctly', async function () {
    // Create multiple assets for the same SPV with different values
    const spvId = 'spv-valuation-test';
    
    const assets = [
      { ...getSampleAssetData(), SPVID: spvId, AssetID: 'val-asset-1', Value: 1000 },
      { ...getSampleAssetData(), SPVID: spvId, AssetID: 'val-asset-2', Value: 2000 },
      { ...getSampleAssetData(), SPVID: spvId, AssetID: 'val-asset-3', Value: 3000 }
    ];
    
    for (const asset of assets) {
      await new SPVAsset(asset).save();
    }

    const req = {
      params: {
        spvId: spvId
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getSPVValuation(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the valuation calculation
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.spvId).toBe(spvId);
    expect(responseArg.totalValuation).toBe(6000); // 1000 + 2000 + 3000
    expect(responseArg.assetCount).toBe(3);
    // Verify asset breakdown array exists and has correct entries
    expect(responseArg.assetBreakdown).toBeInstanceOf(Array);
    expect(responseArg.assetBreakdown.length).toBe(3);
  });

  it('should calculate asset type valuation correctly', async function () {
    // Create multiple assets of the same type with different values
    const assetType = 'Real Estate'; // Use valid enum value
    
    const assets = [
      { ...getSampleAssetData(), Type: assetType, AssetID: 'type-asset-1', Value: 1500 },
      { ...getSampleAssetData(), Type: assetType, AssetID: 'type-asset-2', Value: 2500 },
      { ...getSampleAssetData(), Type: assetType, AssetID: 'type-asset-3', Value: 3500 }
    ];
    
    for (const asset of assets) {
      await new SPVAsset(asset).save();
    }

    const req = {
      params: {
        type: assetType
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getAssetTypeValuation(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the valuation calculation
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.type).toBe(assetType);
    expect(responseArg.totalValuation).toBe(7500); // 1500 + 2500 + 3500
    expect(responseArg.assetCount).toBe(3);
    expect(responseArg.assets).toBeInstanceOf(Array);
    expect(responseArg.assets.length).toBe(3);
  });

  it('should update an SPVAsset', async function () {
    // Create a test asset
    const sampleAsset = new SPVAsset(getSampleAssetData());
    await sampleAsset.save();

    const updates = {
      Value: 9999,
      Description: 'Updated description for testing'
    };

    const req = {
      params: {
        id: sampleAsset._id.toString()
      },
      body: updates
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.updateSPVAsset(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    
    // Verify the asset was updated
    const responseArg = res.json.firstCall.args[0];
    expect(responseArg).toBeDefined();
    expect(responseArg.Value).toBe(updates.Value);
    expect(responseArg.Description).toBe(updates.Description);
    
    // Verify persistence to database
    const updatedAsset = await SPVAsset.findById(sampleAsset._id);
    expect(updatedAsset.Value).toBe(updates.Value);
    expect(updatedAsset.Description).toBe(updates.Description);
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
    // Mock the mongoDbConnection to simulate a database error
    const withRetryStub = sinon.stub(mongoDbConnection, 'withRetry').rejects(new Error('Database connection error'));

    const req = {};
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getSPVAssets(req, res);

    // Restore the stub immediately after the test
    withRetryStub.restore();

    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to retrieve SPVAssets');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });

  it('should handle database errors when updating SPV asset', async function () {
    // Create a valid ID to avoid validation error
    const validId = new mongoose.Types.ObjectId().toString();
    
    // Mock the mongoDbConnection to simulate a database error during update
    const withRetryStub = sinon.stub(mongoDbConnection, 'withRetry').rejects(new Error('Database update error'));

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

    // Restore the stub immediately after the test
    withRetryStub.restore();

    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to update SPVAsset');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });

  it('should handle database errors when deleting SPV asset', async function () {
    // Create a valid ID to avoid validation error
    const validId = new mongoose.Types.ObjectId().toString();
    
    // Mock the mongoDbConnection to simulate a database error during delete
    const withRetryStub = sinon.stub(mongoDbConnection, 'withRetry').rejects(new Error('Database delete error'));

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

    // Restore the stub immediately after the test
    withRetryStub.restore();

    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to delete SPVAsset');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });

  it('should handle database errors when calculating SPV valuation', async function () {
    // Create a valid SPV ID
    const spvId = 'error-test-spv';
    
    // Mock the mongoDbConnection to simulate a database error
    const withRetryStub = sinon.stub(mongoDbConnection, 'withRetry').rejects(new Error('Valuation calculation error'));

    const req = {
      params: {
        spvId: spvId
      }
    };
    
    const res = {
      locals: {},
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getSPVValuation(req, res);

    // Restore the stub immediately after the test
    withRetryStub.restore();

    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.firstCall.args[0].message).toBe('Failed to calculate SPV valuation');
    expect(res.json.firstCall.args[0].error).toBeDefined();
  });
});
