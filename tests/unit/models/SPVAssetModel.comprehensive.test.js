/**
 * SPVAssetModel - Comprehensive Unit Tests
 * Covers: create with validation, findBySPVId, findByType, findByStatus,
 * findActiveAssets, addDocument, addNote, updateValue, updateStatus,
 * getFormattedValue, getTotalValue, getValidTypes, getValidCurrencies,
 * getValidStatuses, validators, and edge cases.
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
const SPVAssetModel = require('../../../models/SPVAssetModel');

describe('SPVAssetModel - Comprehensive', () => {
  const validAssetData = {
    spvId: 'spv_001',
    name: 'Tech Portfolio Alpha',
    type: 'venture_capital',
    acquisitionDate: '2024-01-15',
    acquisitionCost: 500000,
    currentValue: 750000,
    currency: 'USD',
    status: 'active',
    createdBy: 'user_001'
  };

  const makeInsertResponse = (data) => ({
    data: [{
      row_id: 'row-1',
      row_data: {
        _id: 'test-id',
        ...data
      }
    }]
  });

  const makeQueryResponse = (items) => ({
    data: items.map((item, i) => ({
      row_id: `row-${i}`,
      row_data: item
    }))
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validAssetData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ---------------------------------------------------------
  // Constants and Schema
  // ---------------------------------------------------------
  describe('Constants and Schema', () => {
    it('should have tableName set to spv_asset_models', () => {
      expect(SPVAssetModel.tableName).toBe('spv_asset_models');
    });

    it('should export VALID_ASSET_TYPES', () => {
      expect(SPVAssetModel.VALID_ASSET_TYPES).toEqual(
        expect.arrayContaining(['real_estate', 'private_equity', 'venture_capital', 'debt', 'other'])
      );
    });

    it('should export VALID_CURRENCIES', () => {
      expect(SPVAssetModel.VALID_CURRENCIES).toEqual(
        expect.arrayContaining(['USD', 'EUR', 'GBP', 'JPY', 'CNY'])
      );
    });

    it('should export VALID_STATUSES', () => {
      expect(SPVAssetModel.VALID_STATUSES).toEqual(
        expect.arrayContaining(['active', 'sold', 'written_off', 'in_litigation'])
      );
    });

    it('should export validators object', () => {
      expect(SPVAssetModel.validators).toBeDefined();
      expect(typeof SPVAssetModel.validators.isValidAssetType).toBe('function');
      expect(typeof SPVAssetModel.validators.isValidCurrency).toBe('function');
      expect(typeof SPVAssetModel.validators.isValidStatus).toBe('function');
      expect(typeof SPVAssetModel.validators.isValidPositiveNumber).toBe('function');
      expect(typeof SPVAssetModel.validators.isValidName).toBe('function');
      expect(typeof SPVAssetModel.validators.isValidDescription).toBe('function');
    });
  });

  // ---------------------------------------------------------
  // Validators
  // ---------------------------------------------------------
  describe('validators', () => {
    it('isValidAssetType should validate correct types', () => {
      expect(SPVAssetModel.validators.isValidAssetType('real_estate')).toBe(true);
      expect(SPVAssetModel.validators.isValidAssetType('invalid')).toBe(false);
    });

    it('isValidCurrency should validate correct currencies', () => {
      expect(SPVAssetModel.validators.isValidCurrency('USD')).toBe(true);
      expect(SPVAssetModel.validators.isValidCurrency('usd')).toBe(true);
      expect(SPVAssetModel.validators.isValidCurrency('XYZ')).toBe(false);
    });

    it('isValidCurrency should handle null/undefined', () => {
      expect(SPVAssetModel.validators.isValidCurrency(null)).toBe(false);
      expect(SPVAssetModel.validators.isValidCurrency(undefined)).toBe(false);
    });

    it('isValidStatus should validate correct statuses', () => {
      expect(SPVAssetModel.validators.isValidStatus('active')).toBe(true);
      expect(SPVAssetModel.validators.isValidStatus('invalid')).toBe(false);
    });

    it('isValidPositiveNumber should validate positive numbers', () => {
      expect(SPVAssetModel.validators.isValidPositiveNumber(100)).toBe(true);
      expect(SPVAssetModel.validators.isValidPositiveNumber(0)).toBe(true);
      expect(SPVAssetModel.validators.isValidPositiveNumber(-1)).toBe(false);
      expect(SPVAssetModel.validators.isValidPositiveNumber(NaN)).toBe(false);
      expect(SPVAssetModel.validators.isValidPositiveNumber(Infinity)).toBe(false);
      expect(SPVAssetModel.validators.isValidPositiveNumber('100')).toBe(false);
    });

    it('isValidName should validate name length', () => {
      expect(SPVAssetModel.validators.isValidName('Short name')).toBe(true);
      expect(SPVAssetModel.validators.isValidName('a'.repeat(100))).toBe(true);
      expect(SPVAssetModel.validators.isValidName('a'.repeat(101))).toBe(false);
      expect(!!SPVAssetModel.validators.isValidName('')).toBe(false);
      expect(!!SPVAssetModel.validators.isValidName(null)).toBe(false);
    });

    it('isValidDescription should validate description length', () => {
      expect(SPVAssetModel.validators.isValidDescription('Short desc')).toBe(true);
      expect(SPVAssetModel.validators.isValidDescription('a'.repeat(1000))).toBe(true);
      expect(SPVAssetModel.validators.isValidDescription('a'.repeat(1001))).toBe(false);
      expect(SPVAssetModel.validators.isValidDescription(undefined)).toBe(true);
      expect(SPVAssetModel.validators.isValidDescription(null)).toBe(true);
      expect(SPVAssetModel.validators.isValidDescription('')).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // create()
  // ---------------------------------------------------------
  describe('create()', () => {
    it('should create asset with valid data', async () => {
      const result = await SPVAssetModel.create({ ...validAssetData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should throw when spvId is missing', async () => {
      const data = { ...validAssetData };
      delete data.spvId;
      await expect(SPVAssetModel.create(data)).rejects.toThrow('SPV ID is required');
    });

    it('should throw when name is missing', async () => {
      const data = { ...validAssetData };
      delete data.name;
      await expect(SPVAssetModel.create(data)).rejects.toThrow('Asset name is required');
    });

    it('should throw when name exceeds 100 chars', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, name: 'a'.repeat(101) })
      ).rejects.toThrow('Asset name cannot exceed 100 characters');
    });

    it('should throw when description exceeds 1000 chars', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, description: 'a'.repeat(1001) })
      ).rejects.toThrow('Description cannot exceed 1000 characters');
    });

    it('should throw for invalid asset type', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, type: 'invalid_type' })
      ).rejects.toThrow('Invalid asset type');
    });

    it('should throw when type is missing', async () => {
      const data = { ...validAssetData };
      delete data.type;
      await expect(SPVAssetModel.create(data)).rejects.toThrow('Invalid asset type');
    });

    it('should throw when acquisitionDate is missing', async () => {
      const data = { ...validAssetData };
      delete data.acquisitionDate;
      await expect(SPVAssetModel.create(data)).rejects.toThrow('Acquisition date is required');
    });

    it('should throw when acquisitionCost is missing', async () => {
      const data = { ...validAssetData };
      delete data.acquisitionCost;
      await expect(SPVAssetModel.create(data)).rejects.toThrow('Acquisition cost is required');
    });

    it('should throw when acquisitionCost is negative', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, acquisitionCost: -100 })
      ).rejects.toThrow('Acquisition cost cannot be negative');
    });

    it('should throw when currentValue is missing', async () => {
      const data = { ...validAssetData };
      delete data.currentValue;
      await expect(SPVAssetModel.create(data)).rejects.toThrow('Current value is required');
    });

    it('should throw when currentValue is negative', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, currentValue: -1 })
      ).rejects.toThrow('Current value cannot be negative');
    });

    it('should throw when createdBy is missing', async () => {
      const data = { ...validAssetData };
      delete data.createdBy;
      await expect(SPVAssetModel.create(data)).rejects.toThrow('createdBy is required');
    });

    it('should default currency to USD', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.currency).toBe('USD');
        return makeInsertResponse(doc);
      });

      const data = { ...validAssetData };
      delete data.currency;
      await SPVAssetModel.create(data);
    });

    it('should uppercase provided currency', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.currency).toBe('EUR');
        return makeInsertResponse(doc);
      });

      await SPVAssetModel.create({ ...validAssetData, currency: 'eur' });
    });

    it('should throw for invalid currency', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, currency: 'XYZ' })
      ).rejects.toThrow('Unsupported currency');
    });

    it('should default status to active', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('active');
        return makeInsertResponse(doc);
      });

      const data = { ...validAssetData };
      delete data.status;
      await SPVAssetModel.create(data);
    });

    it('should throw for invalid status', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, status: 'invalid' })
      ).rejects.toThrow('Invalid status');
    });

    it('should initialize documents array', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.documents).toEqual([]);
        return makeInsertResponse(doc);
      });

      const data = { ...validAssetData };
      delete data.documents;
      await SPVAssetModel.create(data);
    });

    it('should initialize notes array', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.notes).toEqual([]);
        return makeInsertResponse(doc);
      });

      const data = { ...validAssetData };
      delete data.notes;
      await SPVAssetModel.create(data);
    });

    it('should allow zero acquisitionCost', async () => {
      const result = await SPVAssetModel.create({ ...validAssetData, acquisitionCost: 0 });
      expect(result).toBeDefined();
    });

    it('should allow zero currentValue', async () => {
      const result = await SPVAssetModel.create({ ...validAssetData, currentValue: 0 });
      expect(result).toBeDefined();
    });

    it('should handle null acquisitionCost explicitly', async () => {
      await expect(
        SPVAssetModel.create({ ...validAssetData, acquisitionCost: null })
      ).rejects.toThrow('Acquisition cost is required');
    });
  });

  // ---------------------------------------------------------
  // findBySPVId()
  // ---------------------------------------------------------
  describe('findBySPVId()', () => {
    it('should find assets by spvId', async () => {
      const assets = [
        { _id: 'a1', spvId: 'spv_001', name: 'Asset 1' },
        { _id: 'a2', spvId: 'spv_001', name: 'Asset 2' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));

      const result = await SPVAssetModel.findBySPVId('spv_001');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for null spvId', async () => {
      const result = await SPVAssetModel.findBySPVId(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined spvId', async () => {
      const result = await SPVAssetModel.findBySPVId(undefined);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findByType()
  // ---------------------------------------------------------
  describe('findByType()', () => {
    it('should find assets by type', async () => {
      const assets = [
        { _id: 'a1', type: 'real_estate' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));

      const result = await SPVAssetModel.findByType('real_estate');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid type', async () => {
      const result = await SPVAssetModel.findByType('invalid');
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findByStatus()
  // ---------------------------------------------------------
  describe('findByStatus()', () => {
    it('should find assets by status', async () => {
      const assets = [{ _id: 'a1', status: 'active' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));

      const result = await SPVAssetModel.findByStatus('active');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid status', async () => {
      const result = await SPVAssetModel.findByStatus('invalid');
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findActiveAssets()
  // ---------------------------------------------------------
  describe('findActiveAssets()', () => {
    it('should find active assets for an SPV', async () => {
      const assets = [
        { _id: 'a1', spvId: 'spv_001', status: 'active' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));

      const result = await SPVAssetModel.findActiveAssets('spv_001');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for null spvId', async () => {
      const result = await SPVAssetModel.findActiveAssets(null);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // addDocument()
  // ---------------------------------------------------------
  describe('addDocument()', () => {
    it('should throw when asset not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        SPVAssetModel.addDocument('nonexistent', { name: 'doc.pdf', url: '/docs/doc.pdf' })
      ).rejects.toThrow('Asset not found');
    });

    it('should add document to asset', async () => {
      const asset = { _id: 'a1', documents: [], row_id: 'row-1' };
      // findById -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([asset]));
      // findOneAndUpdate -> findOne (existing)
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([asset]));
      // findOneAndUpdate -> findOne (return new)
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...asset,
        documents: [{ name: 'doc.pdf', url: '/docs/doc.pdf' }]
      }]));

      const result = await SPVAssetModel.addDocument('a1', {
        name: 'doc.pdf',
        url: '/docs/doc.pdf'
      });
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // addNote()
  // ---------------------------------------------------------
  describe('addNote()', () => {
    it('should throw when asset not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        SPVAssetModel.addNote('nonexistent', { content: 'Note', createdBy: 'user_001' })
      ).rejects.toThrow('Asset not found');
    });

    it('should add note to asset', async () => {
      const asset = { _id: 'a1', notes: [], row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([asset]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([asset]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...asset,
        notes: [{ content: 'Note text', createdBy: 'user_001' }]
      }]));

      const result = await SPVAssetModel.addNote('a1', {
        content: 'Note text',
        createdBy: 'user_001'
      });
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // updateValue()
  // ---------------------------------------------------------
  describe('updateValue()', () => {
    it('should throw for negative value', async () => {
      await expect(
        SPVAssetModel.updateValue('a1', -100, 'user_001')
      ).rejects.toThrow('Current value cannot be negative');
    });

    it('should throw for NaN value', async () => {
      await expect(
        SPVAssetModel.updateValue('a1', NaN, 'user_001')
      ).rejects.toThrow('Current value cannot be negative');
    });

    it('should update value successfully', async () => {
      const asset = { _id: 'a1', currentValue: 500000, row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([asset]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...asset,
        currentValue: 600000
      }]));

      const result = await SPVAssetModel.updateValue('a1', 600000, 'user_001');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // updateStatus()
  // ---------------------------------------------------------
  describe('updateStatus()', () => {
    it('should throw for invalid status', async () => {
      await expect(
        SPVAssetModel.updateStatus('a1', 'invalid', 'user_001')
      ).rejects.toThrow('Invalid status');
    });

    it('should update status successfully', async () => {
      const asset = { _id: 'a1', status: 'active', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([asset]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...asset,
        status: 'sold'
      }]));

      const result = await SPVAssetModel.updateStatus('a1', 'sold', 'user_001');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // getFormattedValue()
  // ---------------------------------------------------------
  describe('getFormattedValue()', () => {
    it('should format USD value', () => {
      const asset = { currentValue: 1000000, currency: 'USD' };
      const formatted = SPVAssetModel.getFormattedValue(asset);
      expect(formatted).toContain('$');
      expect(formatted).toContain('1,000,000');
    });

    it('should format EUR value', () => {
      const asset = { currentValue: 500000, currency: 'EUR' };
      const formatted = SPVAssetModel.getFormattedValue(asset);
      expect(formatted).toContain('500,000');
    });

    it('should default to USD when currency not set', () => {
      const asset = { currentValue: 250000 };
      const formatted = SPVAssetModel.getFormattedValue(asset);
      expect(formatted).toContain('$');
    });
  });

  // ---------------------------------------------------------
  // getTotalValue()
  // ---------------------------------------------------------
  describe('getTotalValue()', () => {
    it('should calculate total value of active assets', async () => {
      const assets = [
        { _id: 'a1', currentValue: 500000, status: 'active', spvId: 'spv_001' },
        { _id: 'a2', currentValue: 300000, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));

      const total = await SPVAssetModel.getTotalValue('spv_001');
      expect(total).toBe(800000);
    });

    it('should return 0 when no active assets', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const total = await SPVAssetModel.getTotalValue('spv_001');
      expect(total).toBe(0);
    });

    it('should handle assets with missing currentValue', async () => {
      const assets = [
        { _id: 'a1', currentValue: undefined, status: 'active', spvId: 'spv_001' },
        { _id: 'a2', currentValue: 100000, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(assets));

      const total = await SPVAssetModel.getTotalValue('spv_001');
      expect(total).toBe(100000);
    });
  });

  // ---------------------------------------------------------
  // getValidTypes(), getValidCurrencies(), getValidStatuses()
  // ---------------------------------------------------------
  describe('getter methods', () => {
    it('getValidTypes returns copy of VALID_ASSET_TYPES', () => {
      const types = SPVAssetModel.getValidTypes();
      expect(types).toEqual(SPVAssetModel.VALID_ASSET_TYPES);
      // Verify it's a copy
      types.push('new_type');
      expect(SPVAssetModel.VALID_ASSET_TYPES).not.toContain('new_type');
    });

    it('getValidCurrencies returns copy of VALID_CURRENCIES', () => {
      const currencies = SPVAssetModel.getValidCurrencies();
      expect(currencies).toEqual(SPVAssetModel.VALID_CURRENCIES);
      currencies.push('BTC');
      expect(SPVAssetModel.VALID_CURRENCIES).not.toContain('BTC');
    });

    it('getValidStatuses returns copy of VALID_STATUSES', () => {
      const statuses = SPVAssetModel.getValidStatuses();
      expect(statuses).toEqual(SPVAssetModel.VALID_STATUSES);
      statuses.push('destroyed');
      expect(SPVAssetModel.VALID_STATUSES).not.toContain('destroyed');
    });
  });

  // ---------------------------------------------------------
  // Base model method exposure
  // ---------------------------------------------------------
  describe('Base model methods', () => {
    it('should expose find method', () => {
      expect(typeof SPVAssetModel.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof SPVAssetModel.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof SPVAssetModel.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof SPVAssetModel.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof SPVAssetModel.deleteOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof SPVAssetModel.countDocuments).toBe('function');
    });
  });
});
