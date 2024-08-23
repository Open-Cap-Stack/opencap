const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const SPVAsset = require('../models/SPVAsset');
const spvAssetController = require('../controllers/SPVAsset'); // Make sure to create this controller file

describe('SPVAsset Controller', function () {
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

  it('should create a new SPVAsset', async function () {
    const req = {
      body: {
        AssetID: 'unique-asset-id',
        SPVID: 'spv123',
        Type: 'Real Estate',
        Value: 1000000,
        Description: 'Office building in downtown',
        AcquisitionDate: new Date().toISOString(),
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.createSPVAsset(req, res);

    expect(res.status.calledWith(201)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('AssetID', 'unique-asset-id'))).toBe(true);
  });

  it('should get all SPVAssets', async function () {
    const assetData = {
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date().toISOString(),
    };
    await new SPVAsset(assetData).save();

    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.getSPVAssets(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.args[0][0].spvassets).toBeInstanceOf(Array);
    expect(res.json.args[0][0].spvassets[0].AssetID).toBe(assetData.AssetID);
  });

  it('should delete an SPVAsset by ID', async function () {
    const asset = new SPVAsset({
      AssetID: 'unique-asset-id',
      SPVID: 'spv123',
      Type: 'Real Estate',
      Value: 1000000,
      Description: 'Office building in downtown',
      AcquisitionDate: new Date().toISOString(),
    });
    await asset.save();

    const req = {
      params: {
        id: asset._id.toString(),
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvAssetController.deleteSPVAsset(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'SPVAsset deleted'))).toBe(true);
  });
});
