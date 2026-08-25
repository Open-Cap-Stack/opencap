/**
 * ModelScenario Model Tests
 * Issue #195: Interactive Fundraising Modeling Engine
 * Tests creation, queries, comparison metrics, approval/rejection/archive workflows.
 */

// Mock zerodbService before any require
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(),
  queryTable: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  deleteRowById: jest.fn(),
  initialize: jest.fn(),
  projectId: 'mock-project-id',
  useLocalFallback: false,
  client: { put: jest.fn().mockResolvedValue({}) }
}));

const zerodbService = require('../../../services/zerodbService');

describe('ModelScenario Model', () => {
  let ModelScenario;

  beforeAll(() => {
    ModelScenario = require('../../../models/ModelScenario');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    zerodbService.queryTable.mockReset();
    zerodbService.insertRow.mockReset();
    zerodbService.client.put.mockReset();
    zerodbService.client.put.mockResolvedValue({});
    zerodbService.queryTable.mockResolvedValue({ data: [] });
  });

  // Helpers
  const mockInsert = (returnData = {}) => {
    const data = { _id: 'mock-id', ...returnData };
    zerodbService.insertRow.mockResolvedValue({ data: [{ row_id: 'row_1', row_data: data }] });
    return data;
  };

  const mockFind = (docs = []) => {
    zerodbService.queryTable.mockResolvedValue({
      data: docs.map((d, i) => ({ row_id: `row_${i}`, row_data: d }))
    });
  };

  const mockFindOne = (doc) => {
    if (doc) {
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: doc }]
      });
    } else {
      // default already returns { data: [] }, so findOne returns null
      zerodbService.queryTable.mockResolvedValue({ data: [] });
    }
  };

  const buildScenarioData = (overrides = {}) => ({
    modelId: 'model_123',
    companyId: 'company_456',
    name: 'Optimistic Scenario',
    scenarioType: 'best_case',
    createdBy: 'user_789',
    financingOverrides: {
      amount: 5000000,
      preMoneyValuation: 20000000,
      postMoneyValuation: 25000000
    },
    ...overrides
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------
  describe('create', () => {
    it('should create a scenario with auto-generated scenarioId', async () => {
      const data = buildScenarioData();
      mockInsert({ ...data, scenarioId: 'scn_auto' });

      await ModelScenario.create(data);

      expect(zerodbService.insertRow).toHaveBeenCalledTimes(1);
      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.scenarioId).toMatch(/^scn_/);
    });

    it('should keep caller-provided scenarioId', async () => {
      const data = buildScenarioData({ scenarioId: 'scn_custom' });
      mockInsert({ ...data });

      await ModelScenario.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.scenarioId).toBe('scn_custom');
    });

    it('should default status to draft', async () => {
      const data = buildScenarioData();
      mockInsert({ ...data });

      await ModelScenario.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.status).toBe('draft');
    });

    it('should default metadata to empty object', async () => {
      const data = buildScenarioData();
      mockInsert({ ...data });

      await ModelScenario.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.metadata).toEqual({});
    });

    it('should preserve provided status', async () => {
      const data = buildScenarioData({ status: 'calculated' });
      mockInsert({ ...data });

      await ModelScenario.create(data);

      const insertArg = zerodbService.insertRow.mock.calls[0][1];
      expect(insertArg.status).toBe('calculated');
    });
  });

  // -------------------------------------------------------------------
  // findByModel
  // -------------------------------------------------------------------
  describe('findByModel', () => {
    it('should query by modelId', async () => {
      mockFind([{ modelId: 'model_1', name: 'Scenario A' }]);

      const result = await ModelScenario.findByModel('model_1');

      expect(zerodbService.queryTable).toHaveBeenCalled();
      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.modelId).toBe('model_1');
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      mockFind([]);

      await ModelScenario.findByModel('model_1', 'draft');

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.modelId).toBe('model_1');
      expect(callArg.filter.status).toBe('draft');
    });

    it('should not include status filter when null', async () => {
      mockFind([]);

      await ModelScenario.findByModel('model_1', null);

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.status).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // findByCompany
  // -------------------------------------------------------------------
  describe('findByCompany', () => {
    it('should query by companyId', async () => {
      mockFind([{ companyId: 'c1' }]);

      const result = await ModelScenario.findByCompany('c1');

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.companyId).toBe('c1');
      expect(result).toHaveLength(1);
    });

    it('should filter by status when provided', async () => {
      mockFind([]);

      await ModelScenario.findByCompany('c1', 'approved');

      const callArg = zerodbService.queryTable.mock.calls[0][1];
      expect(callArg.filter.status).toBe('approved');
    });
  });

  // -------------------------------------------------------------------
  // calculateComparison
  // -------------------------------------------------------------------
  describe('calculateComparison', () => {
    it('should calculate dilution difference', () => {
      const scenario = {
        results: {
          dilutionAnalysis: { averageDilution: 0.25 },
          valuationMetrics: { fullyDilutedValue: 30000000 }
        },
        financingOverrides: { amount: 5000000 }
      };
      const baseModelData = {
        dilutionAnalysis: { averageDilution: 0.20 },
        valuationMetrics: { fullyDilutedValue: 25000000 },
        financing: { amount: 4000000 },
        proFormaCapTable: { stakeholders: [] }
      };

      const result = ModelScenario.calculateComparison(scenario, baseModelData);

      expect(result.dilutionDifference).toBeCloseTo(0.05);
    });

    it('should calculate valuation difference', () => {
      const scenario = {
        results: {
          dilutionAnalysis: { averageDilution: 0 },
          valuationMetrics: { fullyDilutedValue: 30000000 }
        },
        financingOverrides: { amount: 5000000 }
      };
      const baseModelData = {
        dilutionAnalysis: { averageDilution: 0 },
        valuationMetrics: { fullyDilutedValue: 20000000 },
        financing: { amount: 4000000 },
        proFormaCapTable: { stakeholders: [] }
      };

      const result = ModelScenario.calculateComparison(scenario, baseModelData);

      expect(result.valuationDifference).toBe(10000000);
    });

    it('should calculate raise amount difference', () => {
      const scenario = {
        results: { dilutionAnalysis: {}, valuationMetrics: {} },
        financingOverrides: { amount: 7000000 }
      };
      const baseModelData = {
        financing: { amount: 5000000 },
        proFormaCapTable: { stakeholders: [] }
      };

      const result = ModelScenario.calculateComparison(scenario, baseModelData);

      expect(result.raiseAmountDifference).toBe(2000000);
    });

    it('should handle missing results gracefully', () => {
      const scenario = { results: {}, financingOverrides: {} };
      const baseModelData = { proFormaCapTable: { stakeholders: [] } };

      const result = ModelScenario.calculateComparison(scenario, baseModelData);

      expect(result.dilutionDifference).toBe(0);
      expect(result.valuationDifference).toBe(0);
      expect(result.raiseAmountDifference).toBe(0);
      expect(result.ownershipDifference).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // _calculateOwnershipDifference
  // -------------------------------------------------------------------
  describe('_calculateOwnershipDifference', () => {
    it('should calculate average absolute ownership difference', () => {
      const scenario = {
        results: {
          proFormaCapTable: {
            stakeholders: [
              { stakeholderId: 's1', ownershipPercentage: 40 },
              { stakeholderId: 's2', ownershipPercentage: 30 }
            ]
          }
        }
      };
      const baseModelData = {
        proFormaCapTable: {
          stakeholders: [
            { stakeholderId: 's1', ownershipPercentage: 50 },
            { stakeholderId: 's2', ownershipPercentage: 25 }
          ]
        }
      };

      const result = ModelScenario._calculateOwnershipDifference(scenario, baseModelData);

      // s1: |40-50|=10, s2: |30-25|=5 => (10+5)/2 = 7.5
      expect(result).toBeCloseTo(7.5);
    });

    it('should return 0 when no matching stakeholders', () => {
      const scenario = {
        results: { proFormaCapTable: { stakeholders: [{ stakeholderId: 'x', ownershipPercentage: 10 }] } }
      };
      const baseModelData = {
        proFormaCapTable: { stakeholders: [{ stakeholderId: 'y', ownershipPercentage: 20 }] }
      };

      const result = ModelScenario._calculateOwnershipDifference(scenario, baseModelData);

      expect(result).toBe(0);
    });

    it('should return 0 when base has no stakeholders', () => {
      const scenario = { results: { proFormaCapTable: { stakeholders: [] } } };
      const baseModelData = { proFormaCapTable: { stakeholders: [] } };

      const result = ModelScenario._calculateOwnershipDifference(scenario, baseModelData);

      expect(result).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // approve
  // -------------------------------------------------------------------
  describe('approve', () => {
    it('should approve a calculated scenario', async () => {
      const scenario = { _id: 's1', scenarioId: 'scn_1', status: 'calculated', row_id: 'row_1' };

      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: scenario }]
      });

      await ModelScenario.approve('scn_1', 'user_1');

      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when scenario not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(ModelScenario.approve('scn_missing', 'user_1'))
        .rejects.toThrow('Scenario not found');
    });

    it('should throw when scenario is not in calculated status', async () => {
      const scenario = { scenarioId: 'scn_1', status: 'draft', row_id: 'row_1' };
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: scenario }]
      });

      await expect(ModelScenario.approve('scn_1', 'user_1'))
        .rejects.toThrow('Scenario must be calculated before approval');
    });
  });

  // -------------------------------------------------------------------
  // reject
  // -------------------------------------------------------------------
  describe('reject', () => {
    it('should reject a scenario with reason', async () => {
      const scenario = { _id: 's1', scenarioId: 'scn_1', status: 'calculated', row_id: 'row_1' };

      // All findOne calls return the scenario; updateOne uses client.put
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: scenario }]
      });

      await ModelScenario.reject('scn_1', 'user_1', 'Too aggressive');

      // Verify updateOne was triggered via client.put
      expect(zerodbService.client.put).toHaveBeenCalled();
    });

    it('should throw when scenario not found', async () => {
      // queryTable returns empty for all calls
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await expect(ModelScenario.reject('scn_missing', 'user_1', 'reason'))
        .rejects.toThrow('Scenario not found');
    });
  });

  // -------------------------------------------------------------------
  // archive
  // -------------------------------------------------------------------
  describe('archive', () => {
    it('should archive a scenario', async () => {
      const scenario = { _id: 's1', scenarioId: 'scn_1', status: 'draft', row_id: 'row_1' };

      // All findOne calls return the scenario; updateOne uses client.put
      zerodbService.queryTable.mockResolvedValue({
        data: [{ row_id: 'row_1', row_data: scenario }]
      });

      await ModelScenario.archive('scn_1', 'user_1');

      // Verify updateOne was triggered
      expect(zerodbService.client.put).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // Schema fields
  // -------------------------------------------------------------------
  describe('Schema', () => {
    it('should have required modelId', () => {
      expect(ModelScenario.schema.modelId.required).toBe(true);
    });

    it('should have required companyId', () => {
      expect(ModelScenario.schema.companyId.required).toBe(true);
    });

    it('should have required name', () => {
      expect(ModelScenario.schema.name.required).toBe(true);
    });

    it('should have required createdBy', () => {
      expect(ModelScenario.schema.createdBy.required).toBe(true);
    });

    it('should have scenarioType enum with correct values', () => {
      expect(ModelScenario.schema.scenarioType.enum).toEqual(
        ['base_case', 'best_case', 'worst_case', 'optimistic', 'pessimistic', 'custom']
      );
    });

    it('should default scenarioType to custom', () => {
      expect(ModelScenario.schema.scenarioType.default).toBe('custom');
    });

    it('should have status enum with correct values', () => {
      expect(ModelScenario.schema.status.enum).toEqual(
        ['draft', 'calculated', 'approved', 'rejected', 'archived']
      );
    });

    it('should default status to draft', () => {
      expect(ModelScenario.schema.status.default).toBe('draft');
    });
  });
});
