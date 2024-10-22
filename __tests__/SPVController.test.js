const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const SPV = require('../models/SPV');
const spvController = require('../controllers/SPV'); // Make sure to create this controller file

describe('SPV Controller', function () {
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
    await SPV.deleteMany({});
  });

  it('should create a new SPV', async function () {
    const req = {
      body: {
        SPVID: 'unique-spv-id',
        Name: 'Test SPV',
        Purpose: 'Investment',
        CreationDate: new Date().toISOString(),
        Status: 'Active',
        ParentCompanyID: 'company123',
        ComplianceStatus: 'Compliant',
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvController.createSPV(req, res);

    expect(res.status.calledWith(201)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('SPVID', 'unique-spv-id'))).toBe(true);
  });

  it('should get all SPVs', async function () {
    const spvData = {
      SPVID: 'unique-spv-id',
      Name: 'Test SPV',
      Purpose: 'Investment',
      CreationDate: new Date().toISOString(),
      Status: 'Active',
      ParentCompanyID: 'company123',
      ComplianceStatus: 'Compliant',
    };
    await new SPV(spvData).save();

    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvController.getSPVs(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.args[0][0].spvs).toBeInstanceOf(Array);
    expect(res.json.args[0][0].spvs[0].SPVID).toBe(spvData.SPVID);
  });

  it('should delete an SPV by ID', async function () {
    const spv = new SPV({
      SPVID: 'unique-spv-id',
      Name: 'Test SPV',
      Purpose: 'Investment',
      CreationDate: new Date().toISOString(),
      Status: 'Active',
      ParentCompanyID: 'company123',
      ComplianceStatus: 'Compliant',
    });
    await spv.save();

    const req = {
      params: {
        id: spv._id.toString(),
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvController.deleteSPV(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'SPV deleted'))).toBe(true);
  });
});
