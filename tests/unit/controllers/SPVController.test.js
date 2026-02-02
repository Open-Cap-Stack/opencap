/**
 * SPV Controller Unit Tests
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 1)
 * TDD Red Phase: Tests written before migration
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  aggregate: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const spvController = require('../../../controllers/SPV');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('SPV Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();

    // Initialize adapter mock
    databaseAdapter.initialized = true;
  });

  describe('createSPV', () => {
    const validSPVData = {
      SPVID: 'SPV001',
      Name: 'Test SPV',
      Purpose: 'Investment vehicle',
      CreationDate: '2024-01-15',
      Status: 'Active',
      ParentCompanyID: 'COMPANY001',
      ComplianceStatus: 'Compliant'
    };

    it('should create an SPV successfully', async () => {
      req.body = validSPVData;
      const mockSavedSPV = { _id: 'spv123', ...validSPVData };
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockResolvedValue(mockSavedSPV);

      await spvController.createSPV(req, res);

      expect(databaseAdapter.findOne).toHaveBeenCalledWith('SPV', { SPVID: 'SPV001' });
      expect(databaseAdapter.create).toHaveBeenCalledWith('SPV', expect.objectContaining(validSPVData));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSavedSPV);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { SPVID: 'SPV001', Name: 'Test SPV' };

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Missing required fields');
    });

    it('should return 400 for invalid status', async () => {
      req.body = { ...validSPVData, Status: 'Invalid' };

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Invalid status');
    });

    it('should return 400 for invalid compliance status', async () => {
      req.body = { ...validSPVData, ComplianceStatus: 'Invalid' };

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Invalid compliance status');
    });

    it('should return 409 when SPV with same SPVID exists', async () => {
      req.body = validSPVData;
      databaseAdapter.findOne.mockResolvedValue({ _id: 'existing', ...validSPVData });

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(409);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'An SPV with this ID already exists');
    });

    it('should return 500 on database error', async () => {
      req.body = validSPVData;
      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await spvController.createSPV(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to create SPV');
    });
  });

  describe('getSPVs', () => {
    it('should return all SPVs', async () => {
      const mockSPVs = [
        { _id: 'spv1', SPVID: 'SPV001', Name: 'SPV 1' },
        { _id: 'spv2', SPVID: 'SPV002', Name: 'SPV 2' }
      ];
      databaseAdapter.find.mockResolvedValue(mockSPVs);

      await spvController.getSPVs(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('SPV', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ spvs: mockSPVs });
    });

    it('should return message when no SPVs found', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      await spvController.getSPVs(req, res);

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ message: 'No SPVs found', spvs: [] });
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await spvController.getSPVs(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to retrieve SPVs');
    });
  });

  describe('getSPVById', () => {
    it('should return SPV by MongoDB ID', async () => {
      const mockSPV = { _id: '507f1f77bcf86cd799439011', SPVID: 'SPV001', Name: 'Test SPV' };
      req.params = { id: '507f1f77bcf86cd799439011' };
      databaseAdapter.findById.mockResolvedValue(mockSPV);

      await spvController.getSPVById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('SPV', '507f1f77bcf86cd799439011');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockSPV);
    });

    it('should return SPV by SPVID', async () => {
      const mockSPV = { _id: 'spv123', SPVID: 'SPV001', Name: 'Test SPV' };
      req.params = { id: 'SPV001' };
      databaseAdapter.findOne.mockResolvedValue(mockSPV);

      await spvController.getSPVById(req, res);

      expect(databaseAdapter.findOne).toHaveBeenCalledWith('SPV', { SPVID: 'SPV001' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockSPV);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findOne.mockResolvedValue(null);

      await spvController.getSPVById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV not found');
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: '123456789012345678901234' };

      await spvController.getSPVById(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Invalid SPV ID format');
    });
  });

  describe('updateSPV', () => {
    it('should update SPV successfully', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { Name: 'Updated SPV Name', Status: 'Pending' };
      const mockUpdatedSPV = { _id: '507f1f77bcf86cd799439011', SPVID: 'SPV001', Name: 'Updated SPV Name', Status: 'Pending' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedSPV);

      await spvController.updateSPV(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdatedSPV);
    });

    it('should return 400 when trying to modify SPVID', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { SPVID: 'NEW_SPV_ID' };

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPVID cannot be modified');
    });

    it('should return 400 for invalid status', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { Status: 'InvalidStatus' };

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Invalid status');
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { Name: 'Updated Name' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await spvController.updateSPV(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV not found');
    });
  });

  describe('deleteSPV', () => {
    it('should delete SPV by MongoDB ID', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      const mockDeletedSPV = { _id: '507f1f77bcf86cd799439011', SPVID: 'SPV001' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedSPV);

      await spvController.deleteSPV(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('SPV', '507f1f77bcf86cd799439011');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV deleted successfully');
    });

    it('should delete SPV by SPVID', async () => {
      req.params = { id: 'SPV001' };
      const mockDeletedSPV = { _id: 'spv123', SPVID: 'SPV001' };
      databaseAdapter.findOneAndDelete.mockResolvedValue(mockDeletedSPV);

      await spvController.deleteSPV(req, res);

      expect(databaseAdapter.findOneAndDelete).toHaveBeenCalledWith('SPV', { SPVID: 'SPV001' });
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { id: 'nonexistent' };
      databaseAdapter.findOneAndDelete.mockResolvedValue(null);

      await spvController.deleteSPV(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV not found');
    });
  });

  describe('getSPVsByStatus', () => {
    it('should return SPVs by status', async () => {
      req.params = { status: 'Active' };
      const mockSPVs = [
        { _id: 'spv1', SPVID: 'SPV001', Status: 'Active' },
        { _id: 'spv2', SPVID: 'SPV002', Status: 'Active' }
      ];
      databaseAdapter.find.mockResolvedValue(mockSPVs);

      await spvController.getSPVsByStatus(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('SPV', { Status: 'Active' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ spvs: mockSPVs });
    });

    it('should return 400 for invalid status', async () => {
      req.params = { status: 'InvalidStatus' };

      await spvController.getSPVsByStatus(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Invalid status parameter');
    });

    it('should return 404 when no SPVs found with status', async () => {
      req.params = { status: 'Closed' };
      databaseAdapter.find.mockResolvedValue([]);

      await spvController.getSPVsByStatus(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getSPVsByComplianceStatus', () => {
    it('should return SPVs by compliance status', async () => {
      req.params = { status: 'Compliant' };
      const mockSPVs = [
        { _id: 'spv1', SPVID: 'SPV001', ComplianceStatus: 'Compliant' }
      ];
      databaseAdapter.find.mockResolvedValue(mockSPVs);

      await spvController.getSPVsByComplianceStatus(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('SPV', { ComplianceStatus: 'Compliant' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ spvs: mockSPVs });
    });

    it('should return 400 for invalid compliance status', async () => {
      req.params = { status: 'Invalid' };

      await spvController.getSPVsByComplianceStatus(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when no SPVs found', async () => {
      req.params = { status: 'NonCompliant' };
      databaseAdapter.find.mockResolvedValue([]);

      await spvController.getSPVsByComplianceStatus(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('getSPVsByParentCompany', () => {
    it('should return SPVs by parent company', async () => {
      req.params = { id: 'COMPANY001' };
      const mockSPVs = [
        { _id: 'spv1', SPVID: 'SPV001', ParentCompanyID: 'COMPANY001' }
      ];
      databaseAdapter.find.mockResolvedValue(mockSPVs);

      await spvController.getSPVsByParentCompany(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('SPV', { ParentCompanyID: 'COMPANY001' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ spvs: mockSPVs });
    });

    it('should return 400 when parent company ID is missing', async () => {
      req.params = { id: '' };

      await spvController.getSPVsByParentCompany(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Missing parent company ID');
    });

    it('should return 404 when no SPVs found', async () => {
      req.params = { id: 'COMPANY999' };
      databaseAdapter.find.mockResolvedValue([]);

      await spvController.getSPVsByParentCompany(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
