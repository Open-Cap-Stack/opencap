/**
 * SPVAsset Controller Unit Tests
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
const spvAssetController = require('../../../controllers/SPVasset');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('SPVAsset Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createSPVAsset', () => {
    const validAssetData = {
      AssetID: 'ASSET001',
      SPVID: 'SPV001',
      Type: 'Equity',
      Value: 100000,
      Description: 'Test equity asset',
      AcquisitionDate: '2024-01-15'
    };

    it('should create an SPV asset successfully', async () => {
      req.body = validAssetData;
      const mockSavedAsset = { _id: 'asset123', ...validAssetData };
      databaseAdapter.create.mockResolvedValue(mockSavedAsset);

      await spvAssetController.createSPVAsset(req, res);

      expect(databaseAdapter.create).toHaveBeenCalledWith('SPVAsset', expect.objectContaining(validAssetData));
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSavedAsset);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { AssetID: 'ASSET001' };

      await spvAssetController.createSPVAsset(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Missing required fields');
    });

    it('should return 500 on database error', async () => {
      req.body = validAssetData;
      databaseAdapter.create.mockRejectedValue(new Error('Database error'));

      await spvAssetController.createSPVAsset(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to create SPVAsset');
    });
  });

  describe('getSPVAssets', () => {
    it('should return all SPV assets', async () => {
      const mockAssets = [
        { _id: 'asset1', AssetID: 'ASSET001', Value: 100000 },
        { _id: 'asset2', AssetID: 'ASSET002', Value: 200000 }
      ];
      databaseAdapter.find.mockResolvedValue(mockAssets);

      await spvAssetController.getSPVAssets(req, res);

      expect(databaseAdapter.find).toHaveBeenCalledWith('SPVAsset', {});
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ spvassets: mockAssets });
    });

    it('should return 500 on database error', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database error'));

      await spvAssetController.getSPVAssets(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to retrieve SPVAssets');
    });
  });

  describe('getSPVAssetById', () => {
    it('should return SPV asset by ID', async () => {
      const mockAsset = { _id: '507f1f77bcf86cd799439011', AssetID: 'ASSET001', Value: 100000 };
      req.params = { id: '507f1f77bcf86cd799439011' };
      databaseAdapter.findById.mockResolvedValue(mockAsset);

      await spvAssetController.getSPVAssetById(req, res);

      expect(databaseAdapter.findById).toHaveBeenCalledWith('SPVAsset', '507f1f77bcf86cd799439011');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockAsset);
    });

    it('should return 404 when asset not found', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      databaseAdapter.findById.mockResolvedValue(null);

      await spvAssetController.getSPVAssetById(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPVAsset not found');
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      await spvAssetController.getSPVAssetById(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Invalid SPV Asset ID format');
    });
  });

  describe('updateSPVAsset', () => {
    it('should update SPV asset successfully', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { Value: 150000, Description: 'Updated description' };
      const mockUpdatedAsset = { _id: '507f1f77bcf86cd799439011', Value: 150000, Description: 'Updated description' };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(mockUpdatedAsset);

      await spvAssetController.updateSPVAsset(req, res);

      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdatedAsset);
    });

    it('should return 404 when asset not found', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      req.body = { Value: 150000 };
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(null);

      await spvAssetController.updateSPVAsset(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV Asset not found');
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: 'invalid-id' };
      req.body = { Value: 150000 };

      await spvAssetController.updateSPVAsset(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Invalid SPV Asset ID format');
    });
  });

  describe('deleteSPVAsset', () => {
    it('should delete SPV asset successfully', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      const mockDeletedAsset = { _id: '507f1f77bcf86cd799439011', AssetID: 'ASSET001' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(mockDeletedAsset);

      await spvAssetController.deleteSPVAsset(req, res);

      expect(databaseAdapter.findByIdAndDelete).toHaveBeenCalledWith('SPVAsset', '507f1f77bcf86cd799439011');
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPVAsset deleted successfully');
    });

    it('should return 500 when asset not found', async () => {
      req.params = { id: '507f1f77bcf86cd799439011' };
      databaseAdapter.findByIdAndDelete.mockResolvedValue(null);

      await spvAssetController.deleteSPVAsset(req, res);

      expect(res.statusCode).toBe(500);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Failed to delete SPVAsset');
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: 'invalid-id' };

      await spvAssetController.deleteSPVAsset(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Invalid SPV Asset ID format');
    });
  });

  describe('getAssetsBySPVId', () => {
    it('should return assets by SPV ID', async () => {
      req.params = { spvId: 'SPV001' };
      const mockSPV = { _id: 'spv123', SPVID: 'SPV001' };
      const mockAssets = [
        { _id: 'asset1', SPVID: 'SPV001', Value: 100000 },
        { _id: 'asset2', SPVID: 'SPV001', Value: 200000 }
      ];
      databaseAdapter.findOne.mockResolvedValue(mockSPV);
      databaseAdapter.find.mockResolvedValue(mockAssets);

      await spvAssetController.getAssetsBySPVId(req, res);

      expect(databaseAdapter.findOne).toHaveBeenCalledWith('SPV', { SPVID: 'SPV001' });
      expect(databaseAdapter.find).toHaveBeenCalledWith('SPVAsset', { SPVID: 'SPV001' });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('assets');
    });

    it('should return 400 when SPV ID is missing', async () => {
      req.params = { spvId: '' };

      await spvAssetController.getAssetsBySPVId(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV ID is required');
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { spvId: 'SPV999' };
      databaseAdapter.findOne.mockResolvedValue(null);

      await spvAssetController.getAssetsBySPVId(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV not found');
    });

    it('should return 404 when no assets found for SPV', async () => {
      req.params = { spvId: 'SPV001' };
      const mockSPV = { _id: 'spv123', SPVID: 'SPV001' };
      databaseAdapter.findOne.mockResolvedValue(mockSPV);
      databaseAdapter.find.mockResolvedValue([]);

      await spvAssetController.getAssetsBySPVId(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'No assets found for this SPV');
    });
  });

  describe('getSPVValuation', () => {
    it('should return total valuation for SPV', async () => {
      req.params = { spvId: 'SPV001' };
      const mockSPV = { _id: 'spv123', SPVID: 'SPV001' };
      const mockAssets = [
        { _id: 'asset1', SPVID: 'SPV001', Value: 100000 },
        { _id: 'asset2', SPVID: 'SPV001', Value: 200000 }
      ];
      databaseAdapter.findOne.mockResolvedValue(mockSPV);
      databaseAdapter.find.mockResolvedValue(mockAssets);

      await spvAssetController.getSPVValuation(req, res);

      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('totalValuation', 300000);
      expect(responseData).toHaveProperty('assetCount', 2);
    });

    it('should return 400 when SPV ID is missing', async () => {
      req.params = { spvId: '' };

      await spvAssetController.getSPVValuation(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV ID is required');
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { spvId: 'SPV999' };
      databaseAdapter.findOne.mockResolvedValue(null);

      await spvAssetController.getSPVValuation(req, res);

      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPV not found');
    });
  });

  describe('getAssetTypeValuation', () => {
    it('should return valuation by asset type', async () => {
      req.query = { type: 'Equity' };
      const mockAggregateResult = [
        { _id: 'SPV001', totalValue: 100000 },
        { _id: 'SPV002', totalValue: 200000 }
      ];
      databaseAdapter.aggregate.mockResolvedValue(mockAggregateResult);

      await spvAssetController.getAssetTypeValuation(req, res);

      expect(databaseAdapter.aggregate).toHaveBeenCalledWith('SPVAsset', expect.any(Array));
      expect(res.statusCode).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toHaveProperty('assetType', 'Equity');
      expect(responseData).toHaveProperty('totalValuation', 300000);
    });

    it('should return 400 when type is missing', async () => {
      req.query = {};

      await spvAssetController.getAssetTypeValuation(req, res);

      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Asset type is required');
    });

    it('should return 404 when no assets found for type', async () => {
      req.query = { type: 'UnknownType' };
      databaseAdapter.aggregate.mockResolvedValue([]);

      await spvAssetController.getAssetTypeValuation(req, res);

      expect(res.statusCode).toBe(404);
    });
  });
});
