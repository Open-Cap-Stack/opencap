/**
 * DilutionScenario Model Tests
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Comprehensive test suite for DilutionScenario model
 */
const DilutionScenario = require('../../../models/DilutionScenario');
const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

describe('DilutionScenario Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test-project' });
    zerodbService.projectId = 'test-project';
    zerodbService.insertRow = jest.fn().mockResolvedValue({
      data: [{ _id: 'test-id', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
    });
    zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [] });
    zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1, matched_count: 1 });
    zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted_count: 1 });
  });

  describe('Schema and Structure', () => {
    it('should have correct table name', () => {
      expect(DilutionScenario.tableName).toBe('dilution_scenarios');
    });

    it('should have schema definition', () => {
      expect(DilutionScenario.schema).toBeDefined();
      expect(DilutionScenario.schema.scenarioId).toBeDefined();
      expect(DilutionScenario.schema.companyId).toBeDefined();
      expect(DilutionScenario.schema.name).toBeDefined();
    });
  });

  describe('create()', () => {
    it('should create a new dilution scenario with required fields', async () => {
      const scenarioData = {
        companyId: 'company-123',
        name: 'Series A Dilution',
        description: 'Series A funding round dilution analysis',
        type: 'funding_round',
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: 15000000
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [{ ...scenarioData, _id: 'scenario-1', scenarioId: 'DS-TEST-001' }]
      });

      const scenario = await DilutionScenario.create(scenarioData);

      expect(scenario).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          companyId: scenarioData.companyId,
          name: scenarioData.name,
          type: scenarioData.type,
          preMoney: scenarioData.preMoney,
          newInvestment: scenarioData.newInvestment,
          postMoney: scenarioData.postMoney
        })
      );
    });

    it('should auto-generate scenarioId if not provided', async () => {
      const scenarioData = {
        companyId: 'company-123',
        name: 'Test Scenario',
        type: 'funding_round',
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: 15000000
      };

      await DilutionScenario.create(scenarioData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          scenarioId: expect.stringMatching(/^DS-/)
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Scenario'
        // Missing companyId, type, preMoney, newInvestment, postMoney
      };

      await expect(DilutionScenario.create(invalidData)).rejects.toThrow();
    });

    it('should validate preMoney is non-negative', async () => {
      const invalidData = {
        companyId: 'company-123',
        name: 'Test Scenario',
        type: 'funding_round',
        preMoney: -1000000,
        newInvestment: 5000000,
        postMoney: 4000000
      };

      await expect(DilutionScenario.create(invalidData)).rejects.toThrow('Pre-money valuation cannot be negative');
    });

    it('should validate newInvestment is non-negative', async () => {
      const invalidData = {
        companyId: 'company-123',
        name: 'Test Scenario',
        type: 'funding_round',
        preMoney: 10000000,
        newInvestment: -5000000,
        postMoney: 5000000
      };

      await expect(DilutionScenario.create(invalidData)).rejects.toThrow('New investment cannot be negative');
    });

    it('should validate postMoney is non-negative', async () => {
      const invalidData = {
        companyId: 'company-123',
        name: 'Test Scenario',
        type: 'funding_round',
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: -15000000
      };

      await expect(DilutionScenario.create(invalidData)).rejects.toThrow('Post-money valuation cannot be negative');
    });

    it('should validate scenario type is valid enum', async () => {
      const invalidData = {
        companyId: 'company-123',
        name: 'Test Scenario',
        type: 'invalid_type',
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: 15000000
      };

      await expect(DilutionScenario.create(invalidData)).rejects.toThrow();
    });

    it('should accept valid scenario types', async () => {
      const validTypes = ['funding_round', 'safe_conversion', 'option_pool', 'multi_round', 'custom'];

      for (const type of validTypes) {
        const scenarioData = {
          companyId: 'company-123',
          name: `Test ${type}`,
          type,
          preMoney: 10000000,
          newInvestment: 5000000,
          postMoney: 15000000
        };

        zerodbService.insertRow.mockResolvedValue({
          data: [{ ...scenarioData, _id: `id-${type}` }]
        });

        await expect(DilutionScenario.create(scenarioData)).resolves.toBeDefined();
      }
    });

    it('should handle optional fields correctly', async () => {
      const scenarioData = {
        companyId: 'company-123',
        name: 'Full Scenario',
        description: 'Complete scenario with all fields',
        type: 'funding_round',
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: 15000000,
        sharePrice: 10.50,
        sharesOutstanding: 1000000,
        newShares: 476190,
        optionPoolSize: 150000,
        optionPoolPercentage: 10,
        safeAmount: 2000000,
        metadata: { notes: 'Test notes' },
        tags: ['series-a', 'dilution']
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [{ ...scenarioData, _id: 'full-scenario' }]
      });

      const scenario = await DilutionScenario.create(scenarioData);

      expect(scenario).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          sharePrice: scenarioData.sharePrice,
          sharesOutstanding: scenarioData.sharesOutstanding,
          newShares: scenarioData.newShares,
          optionPoolSize: scenarioData.optionPoolSize,
          optionPoolPercentage: scenarioData.optionPoolPercentage,
          safeAmount: scenarioData.safeAmount,
          metadata: scenarioData.metadata,
          tags: scenarioData.tags
        })
      );
    });

    it('should add timestamps on creation', async () => {
      const scenarioData = {
        companyId: 'company-123',
        name: 'Test Scenario',
        type: 'funding_round',
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: 15000000
      };

      await DilutionScenario.create(scenarioData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      );
    });
  });

  describe('findByScenarioId()', () => {
    it('should find scenario by scenarioId', async () => {
      const mockScenario = {
        _id: 'test-id',
        scenarioId: 'DS-TEST-001',
        companyId: 'company-123',
        name: 'Test Scenario',
        type: 'funding_round'
      };

      zerodbService.queryTable.mockResolvedValue({ data: [mockScenario] });

      const scenario = await DilutionScenario.findByScenarioId('DS-TEST-001');

      expect(scenario).toEqual(mockScenario);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          filter: { scenarioId: 'DS-TEST-001' },
          limit: 1
        })
      );
    });

    it('should return null if scenario not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const scenario = await DilutionScenario.findByScenarioId('NON-EXISTENT');

      expect(scenario).toBeNull();
    });
  });

  describe('findByCompany()', () => {
    it('should find all scenarios for a company', async () => {
      const mockScenarios = [
        { _id: '1', scenarioId: 'DS-001', companyId: 'company-123', name: 'Scenario 1' },
        { _id: '2', scenarioId: 'DS-002', companyId: 'company-123', name: 'Scenario 2' }
      ];

      zerodbService.queryTable.mockResolvedValue({ data: mockScenarios });

      const scenarios = await DilutionScenario.findByCompany('company-123');

      expect(scenarios).toHaveLength(2);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          filter: { companyId: 'company-123' }
        })
      );
    });

    it('should return empty array if no scenarios found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const scenarios = await DilutionScenario.findByCompany('company-999');

      expect(scenarios).toEqual([]);
    });
  });

  describe('findByType()', () => {
    it('should find scenarios by type', async () => {
      const mockScenarios = [
        { _id: '1', scenarioId: 'DS-001', type: 'funding_round', name: 'Scenario 1' },
        { _id: '2', scenarioId: 'DS-002', type: 'funding_round', name: 'Scenario 2' }
      ];

      zerodbService.queryTable.mockResolvedValue({ data: mockScenarios });

      const scenarios = await DilutionScenario.findByType('funding_round');

      expect(scenarios).toHaveLength(2);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          filter: { type: 'funding_round' }
        })
      );
    });
  });

  describe('calculateDilution()', () => {
    it('should calculate dilution percentage correctly', () => {
      const scenario = {
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: 15000000,
        sharesOutstanding: 1000000,
        newShares: 500000
      };

      const dilution = DilutionScenario.calculateDilution(scenario);

      expect(dilution).toBeCloseTo(33.33, 2); // (500000 / 1500000) * 100
    });

    it('should return 0 when newShares is 0', () => {
      const scenario = {
        preMoney: 10000000,
        newInvestment: 0,
        postMoney: 10000000,
        sharesOutstanding: 1000000,
        newShares: 0
      };

      const dilution = DilutionScenario.calculateDilution(scenario);

      expect(dilution).toBe(0);
    });

    it('should handle scenarios without share data', () => {
      const scenario = {
        preMoney: 10000000,
        newInvestment: 5000000,
        postMoney: 15000000
      };

      const dilution = DilutionScenario.calculateDilution(scenario);

      expect(dilution).toBeCloseTo(33.33, 2); // Calculated from valuations
    });
  });

  describe('calculateOwnershipPercentage()', () => {
    it('should calculate ownership percentage from shares', () => {
      const scenario = {
        sharesOutstanding: 1000000,
        newShares: 500000
      };

      const ownership = DilutionScenario.calculateOwnershipPercentage(scenario, 200000);

      expect(ownership).toBeCloseTo(13.33, 2); // (200000 / 1500000) * 100
    });

    it('should return 0 when shareholding is 0', () => {
      const scenario = {
        sharesOutstanding: 1000000,
        newShares: 500000
      };

      const ownership = DilutionScenario.calculateOwnershipPercentage(scenario, 0);

      expect(ownership).toBe(0);
    });

    it('should handle scenarios with no new shares', () => {
      const scenario = {
        sharesOutstanding: 1000000,
        newShares: 0
      };

      const ownership = DilutionScenario.calculateOwnershipPercentage(scenario, 200000);

      expect(ownership).toBeCloseTo(20, 2); // (200000 / 1000000) * 100
    });
  });

  describe('updateOne()', () => {
    it('should update scenario fields', async () => {
      const updateData = {
        name: 'Updated Scenario',
        description: 'Updated description'
      };

      // findOne internally calls queryTable - return a doc so updateOne proceeds
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'scenario-1', scenarioId: 'DS-001' }]
      });

      await DilutionScenario.updateOne(
        { scenarioId: 'DS-001' },
        { $set: updateData }
      );

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          filter: { scenarioId: 'DS-001' },
          update: { $set: expect.objectContaining(updateData) }
        })
      );
    });

    it('should update timestamp on update', async () => {
      // findOne internally calls queryTable - return a doc so updateOne proceeds
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'scenario-1', scenarioId: 'DS-001' }]
      });

      await DilutionScenario.updateOne(
        { scenarioId: 'DS-001' },
        { $set: { name: 'Updated' } }
      );

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          update: { $set: expect.objectContaining({ updatedAt: expect.any(String) }) }
        })
      );
    });
  });

  describe('deleteOne()', () => {
    it('should delete a scenario', async () => {
      // findOne internally calls queryTable - return a doc so deleteOne proceeds
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'scenario-1', scenarioId: 'DS-001' }]
      });

      await DilutionScenario.deleteOne({ scenarioId: 'DS-001' });

      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'dilution_scenarios',
        { filter: { scenarioId: 'DS-001' } }
      );
    });

    it('should return delete result', async () => {
      // findOne internally calls queryTable - return a doc so deleteOne proceeds
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'scenario-1', scenarioId: 'DS-001' }]
      });
      zerodbService.deleteRows.mockResolvedValueOnce({ deleted_count: 1 });

      const result = await DilutionScenario.deleteOne({ scenarioId: 'DS-001' });

      expect(result.deletedCount).toBe(1);
    });
  });

  describe('countDocuments()', () => {
    it('should count scenarios matching query', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 5 });

      const count = await DilutionScenario.countDocuments({ companyId: 'company-123' });

      expect(count).toBe(5);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_scenarios',
        expect.objectContaining({
          filter: { companyId: 'company-123' },
          limit: 0
        })
      );
    });
  });
});
