const mongoose = require('mongoose');
const sinon = require('sinon');
const { expect } = require('@jest/globals');
const SPV = require('../models/SPV');
const spvController = require('../controllers/SPV'); // Make sure to create this controller file

describe('SPV Controller', function () {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  beforeAll(async () => {
    await mongoose.connect('mongodb://localhost:27017/test');
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
      SPVID: 'test-spv-id',
      Name: 'Test SPV',
      Status: 'Active'
    };

    sandbox.stub(SPV, 'find').resolves([spvData]);

    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvController.getSPVs(req, res);

    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.args[0][0].spvs[0].SPVID).toBe(spvData.SPVID);
  });

  it('should return empty array when no SPVs exist', async () => {
    sandbox.stub(SPV, 'find').resolves([]);
    
    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVs(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'No SPVs found'))).toBe(true);
    expect(res.json.calledWith(sinon.match.has('spvs'))).toBe(true);
  });
  
  it('should handle server errors during SPV retrieval', async () => {
    sandbox.stub(SPV, 'find').throws(new Error('Database connection failed'));
    
    const req = {};
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVs(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to retrieve SPVs'))).toBe(true);
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
    expect(res.json.calledWith(sinon.match.has('message', 'SPV deleted successfully'))).toBe(true);
  });

  it('should delete an SPV by ID and return the deleted SPV data', async () => {
    // First, create a SPV to delete
    const testSPV = {
      SPVID: 'DELETE-SPV-TEST-1',
      Name: 'Delete Test SPV',
      Purpose: 'Testing deletion response',
      CreationDate: new Date(),
      Status: 'Active',
      ParentCompanyID: 'PARENT-123',
      ComplianceStatus: 'Compliant'
    };
    
    const createdSPV = await new SPV(testSPV).save();
    const mongoId = createdSPV._id.toString();
    
    // Delete the SPV
    const req = {
      params: {
        id: mongoId,
      },
    };
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };

    await spvController.deleteSPV(req, res);

    // Verify the response contains the deleted SPV data
    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'SPV deleted successfully'))).toBe(true);
    expect(res.json.calledWith(sinon.match.has('deletedSPV'))).toBe(true);
    expect(res.json.args[0][0].deletedSPV).toHaveProperty('SPVID', 'DELETE-SPV-TEST-1');
    expect(res.json.args[0][0].deletedSPV).toHaveProperty('Name', 'Delete Test SPV');
    
    // Verify the SPV no longer exists in database
    const spvAfterDelete = await SPV.findById(mongoId);
    expect(spvAfterDelete).toBeNull();
  });

  it('should validate enum values when creating an SPV', async () => {
    const req = {
      body: {
        SPVID: 'SPVID-INVALID-STATUS',
        Name: 'Test SPV',
        Purpose: 'Testing',
        CreationDate: new Date(),
        Status: 'InvalidStatus', // Invalid status
        ParentCompanyID: 'PARENT-123',
        ComplianceStatus: 'Compliant'
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.createSPV(req, res);
    
    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Invalid status. Status must be Active, Pending, or Closed'))).toBe(true);
  });
  
  it('should validate compliance status when creating an SPV', async () => {
    const req = {
      body: {
        SPVID: 'SPVID-INVALID-COMPLIANCE',
        Name: 'Test SPV',
        Purpose: 'Testing',
        CreationDate: new Date(),
        Status: 'Active',
        ParentCompanyID: 'PARENT-123',
        ComplianceStatus: 'Invalid' // Invalid compliance status
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.createSPV(req, res);
    
    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Invalid compliance status. Status must be Compliant, NonCompliant, or PendingReview'))).toBe(true);
  });

  it('should check for duplicate SPVID when creating an SPV', async () => {
    // Mock SPV.findOne to simulate existing SPV with same ID
    const existingSPV = {
      SPVID: 'EXISTING-SPV-ID',
      Name: 'Existing SPV'
    };
    sandbox.stub(SPV, 'findOne').resolves(existingSPV);
    
    const req = {
      body: {
        SPVID: 'EXISTING-SPV-ID',
        Name: 'New SPV with Existing ID',
        Purpose: 'Testing',
        CreationDate: new Date(),
        Status: 'Active',
        ParentCompanyID: 'PARENT-123',
        ComplianceStatus: 'Compliant'
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.createSPV(req, res);
    
    expect(res.status.calledWith(409)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'An SPV with this ID already exists'))).toBe(true);
  });
  
  it('should handle required fields validation when creating an SPV', async () => {
    const req = {
      body: {
        // Missing required fields
        SPVID: 'TEST-SPV-MISSING-FIELDS',
        Name: 'Incomplete SPV'
        // No Purpose, CreationDate, Status, ParentCompanyID, ComplianceStatus
      }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.createSPV(req, res);
    
    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Missing required fields'))).toBe(true);
  });
  
  it('should handle server errors during SPV creation', async () => {
    const req = {
      body: {
        SPVID: 'ERROR-TEST-SPV',
        Name: 'Error Test SPV',
        Purpose: 'Testing errors',
        CreationDate: new Date(),
        Status: 'Active',
        ParentCompanyID: 'PARENT-123',
        ComplianceStatus: 'Compliant'
      }
    };
    
    sandbox.stub(SPV, 'findOne').resolves(null);
    
    const testError = new Error('Database error');
    
    const originalSave = SPV.prototype.save;
    SPV.prototype.save = async function() {
      throw testError;
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.createSPV(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to create SPV'))).toBe(true);
    
    SPV.prototype.save = originalSave;
  });
  
  it('should validate that update includes fields to update', async () => {
    const req = {
      params: { id: 'valid-id' },
      body: {
        // Empty update - no fields to update
      }
    };
    
    sandbox.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.updateSPV(req, res);
    
    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'No valid fields provided for update'))).toBe(true);
  });

  it('should handle error during SPV update', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: { id: validId },
      body: {
        Name: 'Updated SPV Name',
        Status: 'Active'
      }
    };
    
    sandbox.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
    
    sandbox.stub(SPV, 'findByIdAndUpdate').throws(new Error('Database error'));
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.updateSPV(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to update SPV'))).toBe(true);
  });
  
  it('should handle error during SPV deletion', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: { id: validId }
    };
    
    sandbox.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
    
    sandbox.stub(SPV, 'findByIdAndDelete').throws(new Error('Database error'));
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.deleteSPV(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to delete SPV'))).toBe(true);
  });
  
  it('should handle error during getSPVById', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: { id: validId }
    };
    
    sandbox.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
    
    sandbox.stub(SPV, 'findById').throws(new Error('Database error'));
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVById(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to retrieve SPV'))).toBe(true);
  });
  
  it('should handle SPV not found during update', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    
    const req = {
      params: { id: validId },
      body: {
        Name: 'Updated SPV Name',
        Status: 'Active'
      }
    };
    
    sandbox.stub(mongoose.Types.ObjectId, 'isValid').returns(true);
    
    sandbox.stub(SPV, 'findByIdAndUpdate').resolves(null);
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.updateSPV(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'SPV not found'))).toBe(true);
  });

  it('should get SPVs by parent company ID', async () => {
    const parentCompanyId = 'PARENT-123';
    const spvs = [
      { SPVID: 'SPV-1', ParentCompanyID: parentCompanyId },
      { SPVID: 'SPV-2', ParentCompanyID: parentCompanyId }
    ];
    
    sandbox.stub(SPV, 'find').resolves(spvs);
    
    const req = {
      params: { id: parentCompanyId }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByParentCompany(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('spvs'))).toBe(true);
  });
  
  it('should handle when no SPVs found for parent company', async () => {
    const parentCompanyId = 'EMPTY-PARENT';
    
    sandbox.stub(SPV, 'find').resolves([]);
    
    const req = {
      params: { id: parentCompanyId }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByParentCompany(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', `No SPVs found for parent company: ${parentCompanyId}`))).toBe(true);
  });
  
  it('should handle error during get SPVs by parent company', async () => {
    const parentCompanyId = 'ERROR-PARENT';
    
    sandbox.stub(SPV, 'find').throws(new Error('Database error'));
    
    const req = {
      params: { id: parentCompanyId }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByParentCompany(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to retrieve SPVs by parent company'))).toBe(true);
  });
  
  it('should get SPVs by status', async () => {
    const status = 'Active';
    const spvs = [
      { SPVID: 'SPV-1', Status: status },
      { SPVID: 'SPV-2', Status: status }
    ];
    
    sandbox.stub(SPV, 'find').resolves(spvs);
    
    const req = {
      params: { status }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByStatus(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('spvs'))).toBe(true);
  });
  
  it('should handle no SPVs found with given status', async () => {
    const status = 'Pending';
    
    sandbox.stub(SPV, 'find').resolves([]);
    
    const req = {
      params: { status }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByStatus(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', `No SPVs found with status: ${status}`))).toBe(true);
  });
  
  it('should handle invalid status parameter', async () => {
    const invalidStatus = 'Invalid';
    
    const req = {
      params: { status: invalidStatus }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByStatus(req, res);
    
    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Invalid status parameter. Must be Active, Pending, or Closed'))).toBe(true);
  });
  
  it('should get SPVs by compliance status', async () => {
    const complianceStatus = 'Compliant';
    const spvs = [
      { SPVID: 'SPV-1', ComplianceStatus: complianceStatus },
      { SPVID: 'SPV-2', ComplianceStatus: complianceStatus }
    ];
    
    sandbox.stub(SPV, 'find').resolves(spvs);
    
    const req = {
      params: { status: complianceStatus }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByComplianceStatus(req, res);
    
    expect(res.status.calledWith(200)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('spvs'))).toBe(true);
  });
  
  it('should handle invalid compliance status parameter', async () => {
    const invalidStatus = 'Invalid';
    
    const req = {
      params: { status: invalidStatus }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByComplianceStatus(req, res);
    
    expect(res.status.calledWith(400)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Invalid compliance status parameter. Must be Compliant, NonCompliant, or PendingReview'))).toBe(true);
  });

  it('should handle errors in getSPVsByComplianceStatus', async () => {
    const complianceStatus = 'Compliant';
    
    sandbox.stub(SPV, 'find').throws(new Error('Database error'));
    
    const req = {
      params: { status: complianceStatus }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByComplianceStatus(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to retrieve SPVs by compliance status'))).toBe(true);
  });
  
  it('should handle errors in getSPVsByStatus', async () => {
    const status = 'Active';
    
    sandbox.stub(SPV, 'find').throws(new Error('Database error'));
    
    const req = {
      params: { status }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVsByStatus(req, res);
    
    expect(res.status.calledWith(500)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'Failed to retrieve SPVs by status'))).toBe(true);
  });
  
  it('should handle invalid ID format for getSPVById', async () => {
    const invalidId = 'not-a-mongo-id';
    
    const req = {
      params: { id: invalidId }
    };
    
    // Need to stub both isValid and the findById or findOne methods
    sandbox.stub(mongoose.Types.ObjectId, 'isValid').returns(false);
    sandbox.stub(SPV, 'findOne').resolves(null);
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVById(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'SPV not found'))).toBe(true);
  });
  
  it('should handle empty ID for getSPVById', async () => {
    const req = {
      params: { id: '' }
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVById(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'SPV ID is required'))).toBe(true);
  });
  
  it('should handle whitespace ID for getSPVById', async () => {
    const req = {
      params: { id: '   ' },
      originalUrl: '/api/spvs/   '
    };
    
    const res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
    };
    
    await spvController.getSPVById(req, res);
    
    expect(res.status.calledWith(404)).toBe(true);
    expect(res.json.calledWith(sinon.match.has('message', 'SPV ID is required'))).toBe(true);
  });
});
