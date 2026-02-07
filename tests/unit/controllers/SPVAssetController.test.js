/**
 * SPVAsset Controller Unit Tests
 * Rewritten to mock SPVAsset and SPV models directly
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../models/SPVasset', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findByAssetID: jest.fn(),
  findBySPVID: jest.fn(),
  findByType: jest.fn(),
  getTotalValueBySPVID: jest.fn()
}));

jest.mock('../../../models/SPV', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  VALID_STATUSES: ['active', 'draft', 'pending', 'closed', 'liquidated'],
  VALID_COMPLIANCE_STATUSES: ['Compliant', 'NonCompliant', 'PendingReview']
}));

const httpMocks = require('node-mocks-http');
const spvAssetController = require('../../../controllers/SPVasset');
const SPVAsset = require('../../../models/SPVasset');
const SPV = require('../../../models/SPV');

describe('SPVAsset Controller', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  describe('createSPVAsset', () => {
    const validAssetData = { AssetID: 'ASSET001', SPVID: 'SPV001', Type: 'Equity', Value: 100000, Description: 'Test equity asset', AcquisitionDate: '2024-01-15' };

    it('should create an SPV asset successfully', async () => {
      req.body = validAssetData;
      const mockSaved = { _id: 'asset123', ...validAssetData };
      SPVAsset.create.mockResolvedValue(mockSaved);
      await spvAssetController.createSPVAsset(req, res);
      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockSaved);
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = { AssetID: 'ASSET001' };
      await spvAssetController.createSPVAsset(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'Missing required fields');
    });

    it('should return 500 on database error', async () => {
      req.body = validAssetData;
      SPVAsset.create.mockRejectedValue(new Error('Database error'));
      await spvAssetController.createSPVAsset(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getSPVAssets', () => {
    it('should return all SPV assets', async () => {
      const mockAssets = [{ _id: 'a1', AssetID: 'ASSET001', Value: 100000 }, { _id: 'a2', AssetID: 'ASSET002', Value: 200000 }];
      SPVAsset.find.mockResolvedValue(mockAssets);
      await spvAssetController.getSPVAssets(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ spvassets: mockAssets });
    });

    it('should return 500 on database error', async () => {
      SPVAsset.find.mockRejectedValue(new Error('Database error'));
      await spvAssetController.getSPVAssets(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  describe('getSPVAssetById', () => {
    it('should return SPV asset by ID', async () => {
      const mockAsset = { _id: 'a123', AssetID: 'ASSET001', Value: 100000 };
      req.params = { id: 'ASSET001' };
      SPVAsset.findByAssetID.mockResolvedValue(mockAsset);
      await spvAssetController.getSPVAssetById(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockAsset);
    });

    it('should return 404 when asset not found', async () => {
      req.params = { id: 'NOTFOUND' };
      SPVAsset.findByAssetID.mockResolvedValue(null);
      SPVAsset.findById.mockResolvedValue(null);
      await spvAssetController.getSPVAssetById(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: '' };
      await spvAssetController.getSPVAssetById(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('updateSPVAsset', () => {
    it('should update SPV asset successfully', async () => {
      req.params = { id: 'ASSET001' };
      req.body = { Value: 150000, Description: 'Updated description' };
      const mockUpdated = { _id: 'a123', Value: 150000, Description: 'Updated description' };
      SPVAsset.findOneAndUpdate.mockResolvedValue(mockUpdated);
      await spvAssetController.updateSPVAsset(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toEqual(mockUpdated);
    });

    it('should return 404 when asset not found', async () => {
      req.params = { id: 'ASSET001' };
      req.body = { Value: 150000 };
      SPVAsset.findOneAndUpdate.mockResolvedValue(null);
      SPVAsset.findByIdAndUpdate.mockResolvedValue(null);
      await spvAssetController.updateSPVAsset(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: '' };
      req.body = { Value: 150000 };
      await spvAssetController.updateSPVAsset(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('deleteSPVAsset', () => {
    it('should delete SPV asset successfully', async () => {
      req.params = { id: 'ASSET001' };
      SPVAsset.findOneAndDelete.mockResolvedValue({ _id: 'a123', AssetID: 'ASSET001' });
      await spvAssetController.deleteSPVAsset(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('message', 'SPVAsset deleted successfully');
    });

    it('should return 404 when asset not found', async () => {
      req.params = { id: 'ASSET001' };
      SPVAsset.findOneAndDelete.mockResolvedValue(null);
      SPVAsset.findByIdAndDelete.mockResolvedValue(null);
      await spvAssetController.deleteSPVAsset(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid ID format', async () => {
      req.params = { id: '' };
      await spvAssetController.deleteSPVAsset(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('getAssetsBySPVId', () => {
    it('should return assets by SPV ID', async () => {
      req.params = { spvId: 'SPV001' };
      SPV.findOne.mockResolvedValue({ _id: 'spv123', SPVID: 'SPV001' });
      SPVAsset.findBySPVID.mockResolvedValue([{ _id: 'a1', SPVID: 'SPV001', Value: 100000 }, { _id: 'a2', SPVID: 'SPV001', Value: 200000 }]);
      await spvAssetController.getAssetsBySPVId(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData())).toHaveProperty('assets');
    });

    it('should return 400 when SPV ID is missing', async () => {
      req.params = { spvId: '' };
      await spvAssetController.getAssetsBySPVId(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { spvId: 'SPV999' };
      SPV.findOne.mockResolvedValue(null);
      await spvAssetController.getAssetsBySPVId(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when no assets found for SPV', async () => {
      req.params = { spvId: 'SPV001' };
      SPV.findOne.mockResolvedValue({ _id: 'spv123', SPVID: 'SPV001' });
      SPVAsset.findBySPVID.mockResolvedValue([]);
      await spvAssetController.getAssetsBySPVId(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('getSPVValuation', () => {
    it('should return total valuation for SPV', async () => {
      req.params = { spvId: 'SPV001' };
      SPV.findOne.mockResolvedValue({ _id: 'spv123', SPVID: 'SPV001' });
      SPVAsset.getTotalValueBySPVID.mockResolvedValue(300000);
      SPVAsset.findBySPVID.mockResolvedValue([{ Value: 100000 }, { Value: 200000 }]);
      await spvAssetController.getSPVValuation(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('totalValuation', 300000);
      expect(data).toHaveProperty('assetCount', 2);
    });

    it('should return 400 when SPV ID is missing', async () => {
      req.params = { spvId: '' };
      await spvAssetController.getSPVValuation(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when SPV not found', async () => {
      req.params = { spvId: 'SPV999' };
      SPV.findOne.mockResolvedValue(null);
      await spvAssetController.getSPVValuation(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('getAssetTypeValuation', () => {
    it('should return valuation by asset type', async () => {
      req.params = { type: 'Equity' };
      req.query = {};
      const mockAssets = [{ _id: 'a1', SPVID: 'SPV001', Value: 100000, Type: 'Equity' }, { _id: 'a2', SPVID: 'SPV002', Value: 200000, Type: 'Equity' }];
      SPVAsset.findByType.mockResolvedValue(mockAssets);
      await spvAssetController.getAssetTypeValuation(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('assetType', 'Equity');
      expect(data).toHaveProperty('totalValuation', 300000);
    });

    it('should return 400 when type is missing', async () => {
      req.params = {};
      req.query = {};
      await spvAssetController.getAssetTypeValuation(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when no assets found for type', async () => {
      req.params = { type: 'UnknownType' };
      req.query = {};
      SPVAsset.findByType.mockResolvedValue([]);
      await spvAssetController.getAssetTypeValuation(req, res);
      expect(res.statusCode).toBe(404);
    });
  });
});
