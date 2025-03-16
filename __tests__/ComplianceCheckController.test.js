const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const ComplianceCheck = require('../models/ComplianceCheck');
const complianceCheckController = require('../controllers/ComplianceCheck');

jest.setTimeout(30000); // Increase Jest timeout for MongoDB connections

describe('ComplianceCheck Controller', function () {
  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test', {autoIndex: false, // Disable indexing for test performance
    });
    await mongoose.connection.dropDatabase(); // Clear database before tests
  });

  afterAll(async () => {
    await mongoose.connection.close(); // Properly close MongoDB connection
  });

  beforeEach(async () => {
    await ComplianceCheck.deleteMany({}); // Clean up before each test
  });

  it('should create a new compliance check', async function () {
    const req = {
      body: {
        CheckID: 'UNIQUE-CHECK-ID',
        SPVID: 'SPV-123',
        RegulationType: 'GDPR',
        Status: 'Compliant',
        Details: 'All checks passed',
        Timestamp: new Date(),
        LastCheckedBy: 'Admin', // Required field
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await complianceCheckController.createComplianceCheck(req, res);

    expect(res.status.calledWith(201)).toBe(true); // Expect HTTP 201 status
    expect(res.json.calledWith(sinon.match.has('CheckID', 'UNIQUE-CHECK-ID'))).toBe(true); // Check response
  });

  it('should get all compliance checks', async function () {
    const complianceData = {
      CheckID: 'UNIQUE-CHECK-ID',
      SPVID: 'SPV-123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Details: 'All checks passed',
      Timestamp: new Date(),
      LastCheckedBy: 'Admin',
    };
    await new ComplianceCheck(complianceData).save(); // Seed the database

    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await complianceCheckController.getComplianceChecks(req, res);

    expect(res.status.calledWith(200)).toBe(true); // Expect HTTP 200 status
    expect(res.json.args[0][0].complianceChecks).toBeInstanceOf(Array); // Check response type
    expect(res.json.args[0][0].complianceChecks[0].CheckID).toBe(complianceData.CheckID); // Validate data
  });

  it('should delete a compliance check by ID', async function () {
    const complianceCheck = new ComplianceCheck({
      CheckID: 'UNIQUE-CHECK-ID',
      SPVID: 'SPV-123',
      RegulationType: 'GDPR',
      Status: 'Compliant',
      Details: 'All checks passed',
      Timestamp: new Date(),
      LastCheckedBy: 'Admin',
    });
    await complianceCheck.save(); // Save the document

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

    expect(res.status.calledWith(200)).toBe(true); // Expect HTTP 200 status
    expect(res.json.calledWith(sinon.match.has('message', 'Compliance check deleted'))).toBe(true); // Validate response
  });
});
