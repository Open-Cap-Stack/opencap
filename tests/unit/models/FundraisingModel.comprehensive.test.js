/**
 * FundraisingModel - Comprehensive Unit Tests
 * Covers: create, find, findOne, findById, updateOne, deleteOne,
 * findByCompany, calculateDilution, finalize, archive, clone,
 * and all edge cases.
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
const FundraisingModel = require('../../../models/FundraisingModel');

describe('FundraisingModel - Comprehensive', () => {
  const validModelData = {
    companyId: 'comp_001',
    name: 'Series A Scenario',
    modelType: 'series_a',
    createdBy: 'user_001',
    baseCapTable: {
      totalShares: 1000000,
      fullyDilutedShares: 1200000,
      shareClasses: [],
      stakeholders: [],
      optionPool: { allocated: 50000, unallocated: 150000, total: 200000 }
    },
    financing: {
      amount: 5000000,
      pricePerShare: 5.00,
      investors: [{ name: 'Lead VC', investmentAmount: 5000000, leadInvestor: true }]
    }
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
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validModelData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ---------------------------------------------------------
  // Schema and Constants
  // ---------------------------------------------------------
  describe('Schema and Constants', () => {
    it('should have tableName set to fundraising_models', () => {
      expect(FundraisingModel.tableName).toBe('fundraising_models');
    });

    it('should have schema defined', () => {
      expect(FundraisingModel.schema).toBeDefined();
      expect(FundraisingModel.schema.modelId).toBeDefined();
      expect(FundraisingModel.schema.companyId).toBeDefined();
      expect(FundraisingModel.schema.name).toBeDefined();
      expect(FundraisingModel.schema.modelType).toBeDefined();
      expect(FundraisingModel.schema.createdBy).toBeDefined();
    });

    it('should define status enum values', () => {
      expect(FundraisingModel.schema.status.enum).toEqual(
        expect.arrayContaining(['draft', 'calculated', 'finalized', 'archived'])
      );
    });

    it('should define modelType enum values', () => {
      expect(FundraisingModel.schema.modelType.enum).toEqual(
        expect.arrayContaining(['series_a', 'series_b', 'seed', 'bridge', 'convertible', 'safe_conversion'])
      );
    });
  });

  // ---------------------------------------------------------
  // create()
  // ---------------------------------------------------------
  describe('create()', () => {
    it('should create model with valid data', async () => {
      zerodbService.insertRow.mockResolvedValue(makeInsertResponse({
        ...validModelData,
        modelId: 'fm_auto',
        status: 'draft'
      }));

      const result = await FundraisingModel.create({ ...validModelData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should auto-generate modelId when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.modelId).toMatch(/^fm_/);
        return makeInsertResponse(doc);
      });

      await FundraisingModel.create({ ...validModelData });
    });

    it('should preserve provided modelId', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.modelId).toBe('custom_model_id');
        return makeInsertResponse(doc);
      });

      await FundraisingModel.create({ ...validModelData, modelId: 'custom_model_id' });
    });

    it('should default status to draft', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('draft');
        return makeInsertResponse(doc);
      });

      await FundraisingModel.create({ ...validModelData });
    });

    it('should default scenarios to empty array', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.scenarios).toEqual([]);
        return makeInsertResponse(doc);
      });

      await FundraisingModel.create({ ...validModelData });
    });

    it('should default metadata to empty object', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.metadata).toEqual({});
        return makeInsertResponse(doc);
      });

      await FundraisingModel.create({ ...validModelData });
    });

    it('should preserve provided status', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('calculated');
        return makeInsertResponse(doc);
      });

      await FundraisingModel.create({ ...validModelData, status: 'calculated' });
    });
  });

  // ---------------------------------------------------------
  // Delegated base model methods
  // ---------------------------------------------------------
  describe('find()', () => {
    it('should call base model find', async () => {
      const models = [
        { modelId: 'fm_1', companyId: 'comp_001' },
        { modelId: 'fm_2', companyId: 'comp_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(models));

      const result = await FundraisingModel.find({ companyId: 'comp_001' });
      expect(result).toHaveLength(2);
    });
  });

  describe('findOne()', () => {
    it('should find a single model', async () => {
      const model = { modelId: 'fm_1', companyId: 'comp_001' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([model]));

      const result = await FundraisingModel.findOne({ modelId: 'fm_1' });
      expect(result).toBeDefined();
      expect(result.modelId).toBe('fm_1');
    });

    it('should return null when not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await FundraisingModel.findOne({ modelId: 'nonexistent' });
      expect(result).toBeNull();
    });
  });

  describe('findById()', () => {
    it('should find model by _id', async () => {
      const model = { _id: 'id-1', modelId: 'fm_1' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([model]));

      const result = await FundraisingModel.findById('id-1');
      expect(result).toBeDefined();
    });
  });

  describe('updateOne()', () => {
    it('should update model', async () => {
      const model = { modelId: 'fm_1', row_id: 'row-1', status: 'draft' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([model]));

      const result = await FundraisingModel.updateOne(
        { modelId: 'fm_1' },
        { $set: { status: 'calculated' } }
      );
      expect(result.matchedCount).toBe(1);
    });
  });

  describe('deleteOne()', () => {
    it('should delete model', async () => {
      const model = { modelId: 'fm_1', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([model]));
      zerodbService.deleteRowById.mockResolvedValue({});

      const result = await FundraisingModel.deleteOne({ modelId: 'fm_1' });
      expect(result.deletedCount).toBe(1);
    });
  });

  // ---------------------------------------------------------
  // findByCompany()
  // ---------------------------------------------------------
  describe('findByCompany()', () => {
    it('should find models by companyId', async () => {
      const models = [
        { modelId: 'fm_1', companyId: 'comp_001', status: 'draft' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(models));

      const result = await FundraisingModel.findByCompany('comp_001');
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      const models = [
        { modelId: 'fm_1', companyId: 'comp_001', status: 'finalized' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(models));

      const result = await FundraisingModel.findByCompany('comp_001', 'finalized');
      expect(result).toHaveLength(1);
    });

    it('should pass null status without filtering', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await FundraisingModel.findByCompany('comp_001', null);
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------
  // calculateDilution()
  // ---------------------------------------------------------
  describe('calculateDilution()', () => {
    it('should throw when baseCapTable is missing', () => {
      expect(() => FundraisingModel.calculateDilution({
        proFormaCapTable: { stakeholders: [] }
      })).toThrow('Both base and pro-forma cap tables are required');
    });

    it('should throw when proFormaCapTable is missing', () => {
      expect(() => FundraisingModel.calculateDilution({
        baseCapTable: { stakeholders: [] }
      })).toThrow('Both base and pro-forma cap tables are required');
    });

    it('should calculate dilution per stakeholder', () => {
      const model = {
        baseCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Founder CEO', ownershipPercentage: 60 },
            { stakeholderId: 's2', name: 'Investor VC Fund', ownershipPercentage: 30 },
            { stakeholderId: 's3', name: 'Employee Pool', ownershipPercentage: 10 }
          ]
        },
        proFormaCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Founder CEO', ownershipPercentage: 48 },
            { stakeholderId: 's2', name: 'Investor VC Fund', ownershipPercentage: 24 },
            { stakeholderId: 's3', name: 'Employee Pool', ownershipPercentage: 8 }
          ]
        }
      };

      const result = FundraisingModel.calculateDilution(model);
      expect(result.byStakeholder).toHaveLength(3);
      expect(result.foundersDilution).toBeGreaterThan(0);
      expect(result.existingInvestorsDilution).toBeGreaterThan(0);
      expect(result.employeesDilution).toBeGreaterThan(0);
    });

    it('should calculate average dilution', () => {
      const model = {
        baseCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Founder', ownershipPercentage: 50 },
            { stakeholderId: 's2', name: 'Other', ownershipPercentage: 50 }
          ]
        },
        proFormaCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Founder', ownershipPercentage: 40 },
            { stakeholderId: 's2', name: 'Other', ownershipPercentage: 40 }
          ]
        }
      };

      const result = FundraisingModel.calculateDilution(model);
      expect(result.averageDilution).toBe(20); // 20% dilution for both
    });

    it('should handle stakeholder not found in proForma', () => {
      const model = {
        baseCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Founder', ownershipPercentage: 60 },
            { stakeholderId: 's_removed', name: 'Removed', ownershipPercentage: 10 }
          ]
        },
        proFormaCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Founder', ownershipPercentage: 48 }
          ]
        }
      };

      const result = FundraisingModel.calculateDilution(model);
      expect(result.byStakeholder).toHaveLength(1); // only s1 found in both
    });

    it('should handle zero ownership percentage without NaN', () => {
      const model = {
        baseCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'ZeroHolder', ownershipPercentage: 0 }
          ]
        },
        proFormaCapTable: {
          stakeholders: [
            { stakeholderId: 's1', name: 'ZeroHolder', ownershipPercentage: 0 }
          ]
        }
      };

      const result = FundraisingModel.calculateDilution(model);
      expect(result.byStakeholder[0].dilutionPercentage).toBe(0);
      expect(isFinite(result.byStakeholder[0].dilutionPercentage)).toBe(true);
    });

    it('should handle empty stakeholders arrays', () => {
      const model = {
        baseCapTable: { stakeholders: [] },
        proFormaCapTable: { stakeholders: [] }
      };

      const result = FundraisingModel.calculateDilution(model);
      expect(result.byStakeholder).toHaveLength(0);
      expect(result.averageDilution).toBe(0);
      expect(result.foundersDilution).toBe(0);
    });

    it('should handle undefined stakeholders', () => {
      const model = {
        baseCapTable: {},
        proFormaCapTable: {}
      };

      const result = FundraisingModel.calculateDilution(model);
      expect(result.byStakeholder).toHaveLength(0);
      expect(result.averageDilution).toBe(0);
    });
  });

  // ---------------------------------------------------------
  // finalize()
  // ---------------------------------------------------------
  describe('finalize()', () => {
    it('should throw when model not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        FundraisingModel.finalize('nonexistent', 'user_001')
      ).rejects.toThrow('Fundraising model not found');
    });

    it('should throw when model status is not calculated', async () => {
      const model = { modelId: 'fm_1', status: 'draft' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([model]));

      await expect(
        FundraisingModel.finalize('fm_1', 'user_001')
      ).rejects.toThrow('Model must be calculated before finalizing');
    });

    it('should finalize a calculated model', async () => {
      const model = { modelId: 'fm_1', status: 'calculated', row_id: 'row-1' };
      // Use mockResolvedValue to handle multiple queryTable calls (findOne, updateOne, findOne)
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([model]));

      const result = await FundraisingModel.finalize('fm_1', 'user_001');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // archive()
  // ---------------------------------------------------------
  describe('archive()', () => {
    it('should archive a model', async () => {
      const model = { modelId: 'fm_1', status: 'finalized', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([model]));

      const result = await FundraisingModel.archive('fm_1', 'user_001');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // clone()
  // ---------------------------------------------------------
  describe('clone()', () => {
    it('should throw when source model not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        FundraisingModel.clone('nonexistent', {}, 'user_001')
      ).rejects.toThrow('Source model not found');
    });

    it('should clone model with default name', async () => {
      const source = {
        modelId: 'fm_1',
        companyId: 'comp_001',
        name: 'Series A',
        description: 'Original',
        modelType: 'series_a',
        baseCapTable: { totalShares: 1000000 },
        financing: { amount: 5000000 },
        metadata: {}
      };
      // findOne for source (may call queryTable multiple times due to fallback)
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([source]));
      // create -> insertRow
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        // Verify the cloned data has the expected name
        expect(doc.name).toBe('Copy of Series A');
        expect(doc.status).toBe('draft');
        expect(doc.metadata.clonedFrom).toBe('fm_1');
        expect(doc.createdBy).toBe('user_001');
        return makeInsertResponse(doc);
      });

      const result = await FundraisingModel.clone('fm_1', {}, 'user_001');
      expect(result).toBeDefined();
    });

    it('should clone with overrides', async () => {
      const source = {
        modelId: 'fm_1',
        companyId: 'comp_001',
        name: 'Series A',
        description: 'Original',
        modelType: 'series_a',
        baseCapTable: { totalShares: 1000000 },
        financing: { amount: 5000000, pricePerShare: 5.00 },
        metadata: {}
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([source]));
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.name).toBe('Modified Clone');
        expect(doc.modelType).toBe('series_b');
        // financing is merged: { ...source.financing, ...overrides.financing }
        expect(doc.financing.amount).toBe(10000000);
        return makeInsertResponse(doc);
      });

      await FundraisingModel.clone('fm_1', {
        name: 'Modified Clone',
        modelType: 'series_b',
        financing: { amount: 10000000 }
      }, 'user_001');
    });

    it('should use source description when override not provided', async () => {
      const source = {
        modelId: 'fm_1',
        companyId: 'comp_001',
        name: 'Series A',
        description: 'Original description',
        modelType: 'series_a',
        baseCapTable: {},
        financing: {},
        metadata: {}
      };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([source]));
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.description).toBe('Original description');
        return makeInsertResponse(doc);
      });

      await FundraisingModel.clone('fm_1', {}, 'user_001');
    });
  });
});
