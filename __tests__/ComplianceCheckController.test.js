const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const ComplianceCheck = require('../models/ComplianceCheck');
const complianceCheckController = require('../controllers/ComplianceCheck'); // Updated to match the correct file name

describe('ComplianceCheck Controller', function () {
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
    await ComplianceCheck.deleteMany({});
  });

  it('should create a new compliance check', async function () {
    const req = {
      body: {
        CheckID: 'unique-check-id',
        SPVID: 'spv123',
        RegulationType: 'GDPR',
        Status: 'Compliant',
        Details: 'All checks passed',
        Timestamp: new Date(),
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await complianceCheckController.createComplianceCheck(req, res);

    expect(res.status.calledWith(201)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('CheckID', 'unique-check-id'))).toBe(true);
  });

  it('should get all compliance checks', async function () {
    const complianceData = {
      CheckID: 'unique-check-id',
      SPVID: 'spv123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Details: 'All checks passed',
      Timestamp: new Date(),
    };
    await new ComplianceCheck(complianceData).save();

    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await complianceCheckController.getComplianceChecks(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.args[0][0].complianceChecks).toBeInstanceOf(Array);
    expect(res.json.args[0][0].complianceChecks[0].CheckID).toBe(complianceData.CheckID);
  });

  it('should delete a compliance check by ID', async function () {
    const complianceCheck = new ComplianceCheck({
      CheckID: 'unique-check-id',
      SPVID: 'spv123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Details: 'All checks passed',
      Timestamp: new Date(),
    });
    await complianceCheck.save();

    const req = {
      params: {
        id: complianceCheck._id.toString(),
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await complianceCheckController.deleteComplianceCheck(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Compliance check deleted'))).toBe(true);
  });
});
