/**
 * SPVasset Model (models/SPVasset.js) - Comprehensive Unit Tests
 * Covers all exported methods, validators, error paths, and edge cases.
 * Note: This tests SPVasset.js (the OCTA-aligned model), not SPVAssetModel.js.
 */

jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  createTable: jest.fn().mockResolvedValue({}),
  projectId: 'test-project',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');
const SPVAsset = require('../../../models/SPVasset');

describe('SPVAsset Model (SPVasset.js) - Comprehensive', () => {
  const makeInsertResponse = (data) => ({
    data: [{
      row_id: 'row-1',
      row_data: { _id: 'test-id', ...data }
    }]
  });

  const makeQueryResponse = (items) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  const validAssetData = {
    SPVID: 'spv_001',
    Type: 'Real Estate',
    Value: 500000,
    Description: 'Commercial property in downtown area',
    AcquisitionDate: '2024-01-15T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validAssetData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ------------------------------------------------------------------
  // Constants and Schema
  // ------------------------------------------------------------------
  describe('Constants and Schema', () => {
    it('should have tableName set to spv_assets', () => {
      expect(SPVAsset.tableName).toBe('spv_assets');
    });

    it('should export VALID_ASSET_TYPES', () => {
      expect(SPVAsset.VALID_ASSET_TYPES).toEqual(['Real Estate', 'Financial Instrument']);
    });

    it('should have schema with required fields', () => {
      expect(SPVAsset.schema.AssetID.required).toBe(true);
      expect(SPVAsset.schema.SPVID.required).toBe(true);
      expect(SPVAsset.schema.Type.required).toBe(true);
      expect(SPVAsset.schema.Value.required).toBe(true);
      expect(SPVAsset.schema.Description.required).toBe(true);
      expect(SPVAsset.schema.AcquisitionDate.required).toBe(true);
    });
  });

  // ------------------------------------------------------------------
  // Validators
  // ------------------------------------------------------------------
  describe('validators', () => {
    describe('isValidAssetID()', () => {
      it('should return true for alphanumeric IDs', () => {
        expect(SPVAsset.validators.isValidAssetID('ASSET001')).toBe(true);
      });

      it('should return true for IDs with hyphens', () => {
        expect(SPVAsset.validators.isValidAssetID('ASSET-001')).toBe(true);
      });

      it('should return true for IDs with underscores', () => {
        expect(SPVAsset.validators.isValidAssetID('asset_123')).toBe(true);
      });

      it('should return false for empty string', () => {
        expect(SPVAsset.validators.isValidAssetID('')).toBe(false);
      });

      it('should return false for null', () => {
        expect(SPVAsset.validators.isValidAssetID(null)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(SPVAsset.validators.isValidAssetID(undefined)).toBe(false);
      });

      it('should return false for IDs with special characters', () => {
        expect(SPVAsset.validators.isValidAssetID('ASSET@001')).toBe(false);
        expect(SPVAsset.validators.isValidAssetID('ASSET 001')).toBe(false);
      });
    });

    describe('isValidNumber()', () => {
      it('should return true for valid numbers', () => {
        expect(SPVAsset.validators.isValidNumber(100)).toBe(true);
        expect(SPVAsset.validators.isValidNumber(0)).toBe(true);
        expect(SPVAsset.validators.isValidNumber(-50)).toBe(true);
        expect(SPVAsset.validators.isValidNumber(3.14)).toBe(true);
      });

      it('should return false for non-numbers', () => {
        expect(SPVAsset.validators.isValidNumber('100')).toBe(false);
        expect(SPVAsset.validators.isValidNumber(NaN)).toBe(false);
        expect(SPVAsset.validators.isValidNumber(Infinity)).toBe(false);
        expect(SPVAsset.validators.isValidNumber(-Infinity)).toBe(false);
        expect(SPVAsset.validators.isValidNumber(null)).toBe(false);
      });
    });

    describe('isValidPositiveNumber()', () => {
      it('should return true for positive numbers', () => {
        expect(SPVAsset.validators.isValidPositiveNumber(100)).toBe(true);
        expect(SPVAsset.validators.isValidPositiveNumber(0)).toBe(true);
      });

      it('should return false for negative numbers', () => {
        expect(SPVAsset.validators.isValidPositiveNumber(-1)).toBe(false);
      });

      it('should return false for NaN/Infinity', () => {
        expect(SPVAsset.validators.isValidPositiveNumber(NaN)).toBe(false);
        expect(SPVAsset.validators.isValidPositiveNumber(Infinity)).toBe(false);
      });
    });

    describe('isValidDate()', () => {
      it('should return true for valid Date objects', () => {
        expect(SPVAsset.validators.isValidDate(new Date())).toBe(true);
        expect(SPVAsset.validators.isValidDate(new Date('2024-01-01'))).toBe(true);
      });

      it('should return false for invalid Date objects', () => {
        expect(SPVAsset.validators.isValidDate(new Date('invalid'))).toBe(false);
      });

      it('should return false for non-Date values', () => {
        expect(SPVAsset.validators.isValidDate('2024-01-01')).toBe(false);
        expect(SPVAsset.validators.isValidDate(null)).toBe(false);
      });
    });

    describe('isValidType()', () => {
      it('should return true for valid asset types', () => {
        expect(SPVAsset.validators.isValidType('Real Estate')).toBe(true);
        expect(SPVAsset.validators.isValidType('Financial Instrument')).toBe(true);
      });

      it('should return false for invalid types', () => {
        expect(SPVAsset.validators.isValidType('Invalid Type')).toBe(false);
        expect(SPVAsset.validators.isValidType('')).toBe(false);
      });
    });
  });

  // ------------------------------------------------------------------
  // create()
  // ------------------------------------------------------------------
  describe('create()', () => {
    it('should create an asset with valid data', async () => {
      const result = await SPVAsset.create({ ...validAssetData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should auto-generate AssetID if not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.AssetID).toMatch(/^ASSET_/);
        return makeInsertResponse(doc);
      });
      await SPVAsset.create({ ...validAssetData });
    });

    it('should use provided AssetID', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.AssetID).toBe('CUSTOM-ID');
        return makeInsertResponse(doc);
      });
      await SPVAsset.create({ ...validAssetData, AssetID: 'Custom-ID' });
    });

    it('should throw for invalid AssetID format', async () => {
      await expect(
        SPVAsset.create({ ...validAssetData, AssetID: 'ASSET @INVALID' })
      ).rejects.toThrow('Asset ID must contain only alphanumeric characters and hyphens');
    });

    it('should throw when SPVID is missing', async () => {
      const data = { ...validAssetData };
      delete data.SPVID;
      await expect(SPVAsset.create(data)).rejects.toThrow('SPV ID is required');
    });

    it('should throw for invalid Type', async () => {
      await expect(
        SPVAsset.create({ ...validAssetData, Type: 'Invalid Type' })
      ).rejects.toThrow('Asset type is required and must be one of');
    });

    it('should throw when Type is missing', async () => {
      const data = { ...validAssetData };
      delete data.Type;
      await expect(SPVAsset.create(data)).rejects.toThrow('Asset type is required');
    });

    it('should throw when Value is missing', async () => {
      const data = { ...validAssetData };
      delete data.Value;
      await expect(SPVAsset.create(data)).rejects.toThrow('Asset value is required');
    });

    it('should throw when Value is null', async () => {
      await expect(
        SPVAsset.create({ ...validAssetData, Value: null })
      ).rejects.toThrow('Asset value is required');
    });

    it('should throw for negative Value', async () => {
      await expect(
        SPVAsset.create({ ...validAssetData, Value: -100 })
      ).rejects.toThrow('Asset value must be a valid positive number');
    });

    it('should throw for NaN Value', async () => {
      await expect(
        SPVAsset.create({ ...validAssetData, Value: NaN })
      ).rejects.toThrow('Asset value must be a valid positive number');
    });

    it('should accept zero Value', async () => {
      const result = await SPVAsset.create({ ...validAssetData, Value: 0 });
      expect(result).toBeDefined();
    });

    it('should throw when Description is missing', async () => {
      const data = { ...validAssetData };
      delete data.Description;
      await expect(SPVAsset.create(data)).rejects.toThrow('Asset description is required');
    });

    it('should throw when Description exceeds 500 characters', async () => {
      await expect(
        SPVAsset.create({ ...validAssetData, Description: 'a'.repeat(501) })
      ).rejects.toThrow('Description cannot exceed 500 characters');
    });

    it('should accept Description at exactly 500 characters', async () => {
      const result = await SPVAsset.create({ ...validAssetData, Description: 'a'.repeat(500) });
      expect(result).toBeDefined();
    });

    it('should throw when AcquisitionDate is missing', async () => {
      const data = { ...validAssetData };
      delete data.AcquisitionDate;
      await expect(SPVAsset.create(data)).rejects.toThrow('Acquisition date is required');
    });

    it('should normalize AssetID and SPVID to uppercase', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.AssetID).toBe('ASSET-LOWER');
        expect(doc.SPVID).toBe('SPV-LOWER');
        return makeInsertResponse(doc);
      });
      await SPVAsset.create({ ...validAssetData, AssetID: 'asset-lower', SPVID: 'spv-lower' });
    });
  });

  // ------------------------------------------------------------------
  // findByAssetID()
  // ------------------------------------------------------------------
  describe('findByAssetID()', () => {
    it('should find asset by AssetID', async () => {
      const asset = { _id: 'id1', AssetID: 'ASSET-001', Type: 'Real Estate' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([asset]));
      const result = await SPVAsset.findByAssetID('asset-001');
      expect(result).toBeDefined();
    });

    it('should normalize assetId to uppercase', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByAssetID('  lower-case  ');
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.AssetID).toBe('LOWER-CASE');
    });

    it('should return null for null assetId', async () => {
      const result = await SPVAsset.findByAssetID(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined assetId', async () => {
      const result = await SPVAsset.findByAssetID(undefined);
      expect(result).toBeNull();
    });
  });

  // ------------------------------------------------------------------
  // findBySPVID()
  // ------------------------------------------------------------------
  describe('findBySPVID()', () => {
    it('should find assets by SPVID', async () => {
      const assets = [
        { _id: 'id1', SPVID: 'SPV-001', Type: 'Real Estate' },
        { _id: 'id2', SPVID: 'SPV-001', Type: 'Financial Instrument' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));
      const result = await SPVAsset.findBySPVID('spv-001');
      expect(result).toHaveLength(2);
    });

    it('should normalize spvId to uppercase', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findBySPVID(' spv-lower ');
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.SPVID).toBe('SPV-LOWER');
    });

    it('should return empty array for null spvId', async () => {
      const result = await SPVAsset.findBySPVID(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined spvId', async () => {
      const result = await SPVAsset.findBySPVID(undefined);
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // findByType()
  // ------------------------------------------------------------------
  describe('findByType()', () => {
    it('should find assets by type', async () => {
      const assets = [{ _id: 'id1', Type: 'Real Estate' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));
      const result = await SPVAsset.findByType('Real Estate');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid type', async () => {
      const result = await SPVAsset.findByType('Invalid Type');
      expect(result).toEqual([]);
    });
  });

  // ------------------------------------------------------------------
  // findByFilters()
  // ------------------------------------------------------------------
  describe('findByFilters()', () => {
    it('should find assets with spvId filter', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters({ spvId: 'spv-001' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.SPVID).toBe('SPV-001');
    });

    it('should return empty array for invalid type filter', async () => {
      const result = await SPVAsset.findByFilters({ type: 'Invalid' });
      expect(result).toEqual([]);
      expect(zerodbService.queryTable).not.toHaveBeenCalled();
    });

    it('should include valid type filter', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters({ type: 'Real Estate' });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.Type).toBe('Real Estate');
    });

    it('should include minValue filter', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters({ minValue: 100000 });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.Value.$gte).toBe(100000);
    });

    it('should include maxValue filter', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters({ maxValue: 500000 });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.Value.$lte).toBe(500000);
    });

    it('should combine minValue and maxValue filters', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters({ minValue: 100000, maxValue: 500000 });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.Value.$gte).toBe(100000);
      expect(callArgs.filter.Value.$lte).toBe(500000);
    });

    it('should handle empty filters', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters({});
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });

    it('should handle no filters argument', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters();
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });

    it('should ignore invalid minValue', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([]));
      await SPVAsset.findByFilters({ minValue: -100 });
      const callArgs = zerodbService.queryTable.mock.calls[0][1];
      expect(callArgs.filter.Value).toBeUndefined();
    });
  });

  // ------------------------------------------------------------------
  // getTotalValueBySPVID()
  // ------------------------------------------------------------------
  describe('getTotalValueBySPVID()', () => {
    it('should calculate total value of assets', async () => {
      const assets = [
        { _id: 'id1', SPVID: 'SPV-001', Value: 500000 },
        { _id: 'id2', SPVID: 'SPV-001', Value: 300000 }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));
      const total = await SPVAsset.getTotalValueBySPVID('spv-001');
      expect(total).toBe(800000);
    });

    it('should return 0 for null spvId', async () => {
      const total = await SPVAsset.getTotalValueBySPVID(null);
      expect(total).toBe(0);
    });

    it('should return 0 when no assets found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const total = await SPVAsset.getTotalValueBySPVID('spv-999');
      expect(total).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // getValidTypes()
  // ------------------------------------------------------------------
  describe('getValidTypes()', () => {
    it('should return a copy of valid asset types', () => {
      const types = SPVAsset.getValidTypes();
      expect(types).toEqual(['Real Estate', 'Financial Instrument']);
    });

    it('should return a new array each time (not a reference)', () => {
      const types1 = SPVAsset.getValidTypes();
      const types2 = SPVAsset.getValidTypes();
      types1.push('New Type');
      expect(types2).not.toContain('New Type');
      expect(SPVAsset.VALID_ASSET_TYPES).not.toContain('New Type');
    });
  });

  // ------------------------------------------------------------------
  // toApiResponse()
  // ------------------------------------------------------------------
  describe('toApiResponse()', () => {
    it('should format asset for API response', () => {
      const asset = {
        _id: 'mongo-id',
        AssetID: 'ASSET-001',
        SPVID: 'SPV-001',
        Type: 'Real Estate',
        Value: 500000,
        Description: 'Commercial property',
        AcquisitionDate: '2024-01-15'
      };
      const response = SPVAsset.toApiResponse(asset);
      expect(response).toEqual({
        id: 'mongo-id',
        assetId: 'ASSET-001',
        spvId: 'SPV-001',
        type: 'Real Estate',
        value: 500000,
        description: 'Commercial property',
        acquisitionDate: '2024-01-15'
      });
    });
  });

  // ------------------------------------------------------------------
  // calculateCurrentValue()
  // ------------------------------------------------------------------
  describe('calculateCurrentValue()', () => {
    it('should return the stored Value', () => {
      const asset = { Value: 750000 };
      expect(SPVAsset.calculateCurrentValue(asset)).toBe(750000);
    });

    it('should return 0 for zero value asset', () => {
      expect(SPVAsset.calculateCurrentValue({ Value: 0 })).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // Base model methods
  // ------------------------------------------------------------------
  describe('Base model methods', () => {
    const methods = [
      'find', 'findOne', 'findById', 'updateOne', 'updateMany',
      'findOneAndUpdate', 'findByIdAndUpdate', 'deleteOne', 'deleteMany',
      'findOneAndDelete', 'findByIdAndDelete', 'countDocuments',
      'exists', 'distinct', 'aggregate'
    ];

    methods.forEach(method => {
      it(`should expose ${method} method`, () => {
        expect(typeof SPVAsset[method]).toBe('function');
      });
    });
  });
});
