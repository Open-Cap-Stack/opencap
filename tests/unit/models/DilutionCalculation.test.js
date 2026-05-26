/**
 * DilutionCalculation Model Tests
 * Issue #200: Implement Dilution Calculator Backend
 *
 * Comprehensive test suite for DilutionCalculation model
 */
const DilutionCalculation = require('../../../models/DilutionCalculation');
const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

describe('DilutionCalculation Model', () => {
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
      expect(DilutionCalculation.tableName).toBe('dilution_calculations');
    });

    it('should have schema definition', () => {
      expect(DilutionCalculation.schema).toBeDefined();
      expect(DilutionCalculation.schema.calculationId).toBeDefined();
      expect(DilutionCalculation.schema.scenarioId).toBeDefined();
      expect(DilutionCalculation.schema.companyId).toBeDefined();
    });
  });

  describe('create()', () => {
    it('should create a new calculation with required fields', async () => {
      const calculationData = {
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'funding_round',
        inputs: {
          preMoney: 10000000,
          newInvestment: 5000000,
          existingShares: 1000000
        },
        results: {
          postMoney: 15000000,
          newShares: 500000,
          dilutionPercentage: 33.33
        }
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [{ ...calculationData, _id: 'calc-1', calculationId: 'DC-TEST-001' }]
      });

      const calculation = await DilutionCalculation.create(calculationData);

      expect(calculation).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          scenarioId: calculationData.scenarioId,
          companyId: calculationData.companyId,
          calculationType: calculationData.calculationType
        })
      );
    });

    it('should auto-generate calculationId if not provided', async () => {
      const calculationData = {
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'funding_round',
        inputs: {},
        results: {}
      };

      await DilutionCalculation.create(calculationData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          calculationId: expect.stringMatching(/^DC-/)
        })
      );
    });

    it('should validate required fields', async () => {
      const invalidData = {
        scenarioId: 'DS-001'
        // Missing companyId, calculationType
      };

      await expect(DilutionCalculation.create(invalidData)).rejects.toThrow();
    });

    it('should validate calculationType is valid enum', async () => {
      const invalidData = {
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'invalid_type',
        inputs: {},
        results: {}
      };

      await expect(DilutionCalculation.create(invalidData)).rejects.toThrow();
    });

    it('should accept valid calculation types', async () => {
      const validTypes = ['funding_round', 'safe_conversion', 'option_pool', 'multi_round', 'comparison'];

      for (const type of validTypes) {
        const calculationData = {
          scenarioId: 'DS-001',
          companyId: 'company-123',
          calculationType: type,
          inputs: {},
          results: {}
        };

        zerodbService.insertRow.mockResolvedValue({
          data: [{ ...calculationData, _id: `id-${type}` }]
        });

        await expect(DilutionCalculation.create(calculationData)).resolves.toBeDefined();
      }
    });

    it('should store complex stakeholder dilution results', async () => {
      const calculationData = {
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'funding_round',
        inputs: {
          preMoney: 10000000,
          newInvestment: 5000000
        },
        results: {
          postMoney: 15000000,
          totalDilution: 33.33,
          stakeholders: [
            {
              stakeholderId: 'stakeholder-1',
              name: 'Founder 1',
              preRoundShares: 500000,
              preRoundOwnership: 50.0,
              postRoundShares: 500000,
              postRoundOwnership: 33.33,
              dilutionPercentage: 16.67
            },
            {
              stakeholderId: 'stakeholder-2',
              name: 'Founder 2',
              preRoundShares: 500000,
              preRoundOwnership: 50.0,
              postRoundShares: 500000,
              postRoundOwnership: 33.33,
              dilutionPercentage: 16.67
            },
            {
              stakeholderId: 'investor-1',
              name: 'New Investor',
              preRoundShares: 0,
              preRoundOwnership: 0,
              postRoundShares: 500000,
              postRoundOwnership: 33.33,
              dilutionPercentage: 0
            }
          ]
        }
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [{ ...calculationData, _id: 'calc-complex' }]
      });

      const calculation = await DilutionCalculation.create(calculationData);

      expect(calculation).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          results: expect.objectContaining({
            stakeholders: expect.arrayContaining([
              expect.objectContaining({
                stakeholderId: 'stakeholder-1',
                dilutionPercentage: 16.67
              })
            ])
          })
        })
      );
    });

    it('should store share class breakdown', async () => {
      const calculationData = {
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'funding_round',
        inputs: {},
        results: {
          shareClasses: [
            {
              shareClassId: 'common-1',
              name: 'Common Stock',
              preRoundShares: 1000000,
              postRoundShares: 1000000,
              dilutionPercentage: 33.33
            },
            {
              shareClassId: 'preferred-a',
              name: 'Preferred Series A',
              preRoundShares: 0,
              postRoundShares: 500000,
              dilutionPercentage: 0
            }
          ]
        }
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [{ ...calculationData, _id: 'calc-shareclass' }]
      });

      const calculation = await DilutionCalculation.create(calculationData);

      expect(calculation).toBeDefined();
    });

    it('should add timestamps on creation', async () => {
      const calculationData = {
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'funding_round',
        inputs: {},
        results: {}
      };

      await DilutionCalculation.create(calculationData);

      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        })
      );
    });

    it('should store calculation metadata', async () => {
      const calculationData = {
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'funding_round',
        inputs: {},
        results: {},
        metadata: {
          calculationVersion: '1.0',
          executionTime: 150,
          dataSource: 'user_input'
        }
      };

      zerodbService.insertRow.mockResolvedValue({
        data: [{ ...calculationData, _id: 'calc-meta' }]
      });

      const calculation = await DilutionCalculation.create(calculationData);

      expect(calculation).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          metadata: calculationData.metadata
        })
      );
    });
  });

  describe('findByCalculationId()', () => {
    it('should find calculation by calculationId', async () => {
      const mockCalculation = {
        _id: 'test-id',
        calculationId: 'DC-TEST-001',
        scenarioId: 'DS-001',
        companyId: 'company-123',
        calculationType: 'funding_round'
      };

      zerodbService.queryTable.mockResolvedValue({ data: [mockCalculation] });

      const calculation = await DilutionCalculation.findByCalculationId('DC-TEST-001');

      expect(calculation).toEqual(mockCalculation);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { calculationId: 'DC-TEST-001' },
          limit: 1
        })
      );
    });

    it('should return null if calculation not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const calculation = await DilutionCalculation.findByCalculationId('NON-EXISTENT');

      expect(calculation).toBeNull();
    });
  });

  describe('findByScenario()', () => {
    it('should find all calculations for a scenario', async () => {
      const mockCalculations = [
        { _id: '1', calculationId: 'DC-001', scenarioId: 'DS-001', calculationType: 'funding_round' },
        { _id: '2', calculationId: 'DC-002', scenarioId: 'DS-001', calculationType: 'option_pool' }
      ];

      zerodbService.queryTable.mockResolvedValue({ data: mockCalculations });

      const calculations = await DilutionCalculation.findByScenario('DS-001');

      expect(calculations).toHaveLength(2);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { scenarioId: 'DS-001' }
        })
      );
    });

    it('should return empty array if no calculations found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const calculations = await DilutionCalculation.findByScenario('DS-999');

      expect(calculations).toEqual([]);
    });
  });

  describe('findByCompany()', () => {
    it('should find all calculations for a company', async () => {
      const mockCalculations = [
        { _id: '1', calculationId: 'DC-001', companyId: 'company-123' },
        { _id: '2', calculationId: 'DC-002', companyId: 'company-123' }
      ];

      zerodbService.queryTable.mockResolvedValue({ data: mockCalculations });

      const calculations = await DilutionCalculation.findByCompany('company-123');

      expect(calculations).toHaveLength(2);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { companyId: 'company-123' }
        })
      );
    });

    it('should support options for sorting and pagination', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      await DilutionCalculation.findByCompany('company-123', {
        sort: { createdAt: -1 },
        skip: 10,
        limit: 20
      });

      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { companyId: 'company-123' },
          sort: { createdAt: -1 },
          skip: 10,
          limit: 20
        })
      );
    });
  });

  describe('findByType()', () => {
    it('should find calculations by type', async () => {
      const mockCalculations = [
        { _id: '1', calculationId: 'DC-001', calculationType: 'safe_conversion' },
        { _id: '2', calculationId: 'DC-002', calculationType: 'safe_conversion' }
      ];

      zerodbService.queryTable.mockResolvedValue({ data: mockCalculations });

      const calculations = await DilutionCalculation.findByType('safe_conversion');

      expect(calculations).toHaveLength(2);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { calculationType: 'safe_conversion' }
        })
      );
    });
  });

  describe('getLatestForScenario()', () => {
    it('should get the most recent calculation for a scenario', async () => {
      const mockCalculation = {
        _id: 'latest-id',
        calculationId: 'DC-LATEST',
        scenarioId: 'DS-001',
        createdAt: '2024-01-15T10:00:00.000Z'
      };

      zerodbService.queryTable.mockResolvedValue({ data: [mockCalculation] });

      const calculation = await DilutionCalculation.getLatestForScenario('DS-001');

      expect(calculation).toEqual(mockCalculation);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { scenarioId: 'DS-001' },
          sort: { createdAt: -1 },
          limit: 1
        })
      );
    });

    it('should return null if no calculations exist', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const calculation = await DilutionCalculation.getLatestForScenario('DS-999');

      expect(calculation).toBeNull();
    });
  });

  describe('calculateTotalDilution()', () => {
    it('should calculate total dilution from results', () => {
      const calculation = {
        results: {
          stakeholders: [
            { stakeholderId: 's1', dilutionPercentage: 10.0 },
            { stakeholderId: 's2', dilutionPercentage: 15.0 },
            { stakeholderId: 's3', dilutionPercentage: 0 }
          ]
        }
      };

      const totalDilution = DilutionCalculation.calculateTotalDilution(calculation);

      expect(totalDilution).toBeCloseTo(25.0, 2);
    });

    it('should return 0 when no stakeholders exist', () => {
      const calculation = {
        results: {
          stakeholders: []
        }
      };

      const totalDilution = DilutionCalculation.calculateTotalDilution(calculation);

      expect(totalDilution).toBe(0);
    });

    it('should handle missing results gracefully', () => {
      const calculation = {};

      const totalDilution = DilutionCalculation.calculateTotalDilution(calculation);

      expect(totalDilution).toBe(0);
    });
  });

  describe('getStakeholderDilution()', () => {
    it('should get dilution for a specific stakeholder', () => {
      const calculation = {
        results: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Stakeholder 1', dilutionPercentage: 10.0 },
            { stakeholderId: 's2', name: 'Stakeholder 2', dilutionPercentage: 15.0 }
          ]
        }
      };

      const stakeholder = DilutionCalculation.getStakeholderDilution(calculation, 's2');

      expect(stakeholder).toBeDefined();
      expect(stakeholder.stakeholderId).toBe('s2');
      expect(stakeholder.dilutionPercentage).toBe(15.0);
    });

    it('should return null if stakeholder not found', () => {
      const calculation = {
        results: {
          stakeholders: [
            { stakeholderId: 's1', dilutionPercentage: 10.0 }
          ]
        }
      };

      const stakeholder = DilutionCalculation.getStakeholderDilution(calculation, 's999');

      expect(stakeholder).toBeNull();
    });
  });

  describe('updateOne()', () => {
    it('should update calculation fields', async () => {
      const updateData = {
        results: {
          postMoney: 20000000,
          dilutionPercentage: 40.0
        }
      };

      // updateOne internally calls findOne (queryTable) to locate the doc.
      // Return a doc without row_id so it falls through to updateRows.
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'calc-1', calculationId: 'DC-001' }]
      });

      await DilutionCalculation.updateOne(
        { calculationId: 'DC-001' },
        { $set: updateData }
      );

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { calculationId: 'DC-001' },
          update: { $set: expect.objectContaining(updateData) }
        })
      );
    });

    it('should update timestamp on update', async () => {
      // updateOne internally calls findOne (queryTable) to locate the doc.
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'calc-1', calculationId: 'DC-001' }]
      });

      await DilutionCalculation.updateOne(
        { calculationId: 'DC-001' },
        { $set: { status: 'completed' } }
      );

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          update: { $set: expect.objectContaining({ updatedAt: expect.any(String) }) }
        })
      );
    });
  });

  describe('deleteOne()', () => {
    it('should delete a calculation', async () => {
      // deleteOne internally calls findOne (queryTable) to locate the doc.
      // Return a doc without row_id so it falls through to deleteRows.
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'calc-1', calculationId: 'DC-001' }]
      });

      await DilutionCalculation.deleteOne({ calculationId: 'DC-001' });

      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'dilution_calculations',
        { filter: { calculationId: 'DC-001' } }
      );
    });

    it('should return delete result', async () => {
      // deleteOne internally calls findOne (queryTable) to locate the doc.
      zerodbService.queryTable.mockResolvedValueOnce({
        data: [{ _id: 'calc-1', calculationId: 'DC-001' }]
      });
      zerodbService.deleteRows.mockResolvedValueOnce({ deleted_count: 1 });

      const result = await DilutionCalculation.deleteOne({ calculationId: 'DC-001' });

      expect(result.deletedCount).toBe(1);
    });
  });

  describe('countDocuments()', () => {
    it('should count calculations matching query', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 15 });

      const count = await DilutionCalculation.countDocuments({ companyId: 'company-123' });

      expect(count).toBe(15);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({
          filter: { companyId: 'company-123' },
          limit: 1
        })
      );
    });
  });
});
