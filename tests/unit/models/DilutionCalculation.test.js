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

  describe('create() - validation branches', () => {
    it('should throw when scenarioId is missing', async () => {
      await expect(DilutionCalculation.create({
        companyId: 'c1',
        calculationType: 'funding_round',
        inputs: {},
        results: {}
      })).rejects.toThrow('Scenario ID is required');
    });

    it('should throw when companyId is missing', async () => {
      await expect(DilutionCalculation.create({
        scenarioId: 'DS-001',
        calculationType: 'funding_round',
        inputs: {},
        results: {}
      })).rejects.toThrow('Company ID is required');
    });

    it('should throw when calculationType is missing', async () => {
      await expect(DilutionCalculation.create({
        scenarioId: 'DS-001',
        companyId: 'c1',
        inputs: {},
        results: {}
      })).rejects.toThrow('Calculation type is required');
    });

    it('should throw when calculationType is invalid', async () => {
      await expect(DilutionCalculation.create({
        scenarioId: 'DS-001',
        companyId: 'c1',
        calculationType: 'invalid_type',
        inputs: {},
        results: {}
      })).rejects.toThrow('Invalid calculation type');
    });

    it('should default inputs to empty object if not provided', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ _id: 'calc-id' }]
      });
      await DilutionCalculation.create({
        scenarioId: 'DS-001',
        companyId: 'c1',
        calculationType: 'funding_round'
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({ inputs: {} })
      );
    });

    it('should default results to empty object if not provided', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ _id: 'calc-id' }]
      });
      await DilutionCalculation.create({
        scenarioId: 'DS-001',
        companyId: 'c1',
        calculationType: 'funding_round'
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({ results: {} })
      );
    });

    it('should default status to completed if not provided', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ _id: 'calc-id' }]
      });
      await DilutionCalculation.create({
        scenarioId: 'DS-001',
        companyId: 'c1',
        calculationType: 'funding_round',
        inputs: {},
        results: {}
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('should use provided calculationId if given', async () => {
      zerodbService.insertRow.mockResolvedValue({
        data: [{ _id: 'calc-id' }]
      });
      await DilutionCalculation.create({
        calculationId: 'DC-CUSTOM',
        scenarioId: 'DS-001',
        companyId: 'c1',
        calculationType: 'funding_round',
        inputs: {},
        results: {}
      });
      expect(zerodbService.insertRow).toHaveBeenCalledWith(
        'dilution_calculations',
        expect.objectContaining({ calculationId: 'DC-CUSTOM' })
      );
    });
  });

  describe('getStakeholderDilution() - missing results.stakeholders', () => {
    it('should return null when results is missing', () => {
      const result = DilutionCalculation.getStakeholderDilution({}, 's1');
      expect(result).toBeNull();
    });

    it('should return null when results.stakeholders is missing', () => {
      const result = DilutionCalculation.getStakeholderDilution({ results: {} }, 's1');
      expect(result).toBeNull();
    });
  });

  describe('calculateTotalDilution() - non-array stakeholders', () => {
    it('should return 0 when stakeholders is not an array', () => {
      const result = DilutionCalculation.calculateTotalDilution({ results: { stakeholders: 'not-array' } });
      expect(result).toBe(0);
    });

    it('should return 0 when results.stakeholders is missing', () => {
      const result = DilutionCalculation.calculateTotalDilution({ results: {} });
      expect(result).toBe(0);
    });
  });

  describe('getShareClassBreakdown()', () => {
    it('should return share classes from calculation', () => {
      const shareClasses = [
        { shareClassId: 'common', name: 'Common', preRoundShares: 1000 },
        { shareClassId: 'pref-a', name: 'Preferred A', preRoundShares: 500 }
      ];
      const result = DilutionCalculation.getShareClassBreakdown({ results: { shareClasses } });
      expect(result).toEqual(shareClasses);
    });

    it('should return empty array when results is missing', () => {
      const result = DilutionCalculation.getShareClassBreakdown({});
      expect(result).toEqual([]);
    });

    it('should return empty array when shareClasses is missing', () => {
      const result = DilutionCalculation.getShareClassBreakdown({ results: {} });
      expect(result).toEqual([]);
    });
  });

  describe('getOwnershipChanges()', () => {
    it('should calculate ownership changes for all stakeholders', () => {
      const calculation = {
        results: {
          stakeholders: [
            { stakeholderId: 's1', name: 'Founder', preRoundOwnership: 50, postRoundOwnership: 33.3, dilutionPercentage: 16.7 },
            { stakeholderId: 's2', name: 'Investor', preRoundOwnership: 0, postRoundOwnership: 33.3, dilutionPercentage: 0 }
          ]
        }
      };
      const changes = DilutionCalculation.getOwnershipChanges(calculation);
      expect(changes).toHaveLength(2);
      expect(changes[0].stakeholderId).toBe('s1');
      expect(changes[0].change).toBeCloseTo(-16.7, 1);
      expect(changes[1].stakeholderId).toBe('s2');
      expect(changes[1].change).toBeCloseTo(33.3, 1);
    });

    it('should handle missing ownership values', () => {
      const calculation = {
        results: {
          stakeholders: [{ stakeholderId: 's1', name: 'Founder' }]
        }
      };
      const changes = DilutionCalculation.getOwnershipChanges(calculation);
      expect(changes[0].preRoundOwnership).toBe(0);
      expect(changes[0].postRoundOwnership).toBe(0);
      expect(changes[0].change).toBe(0);
      expect(changes[0].dilutionPercentage).toBe(0);
    });

    it('should return empty array when results is missing', () => {
      expect(DilutionCalculation.getOwnershipChanges({})).toEqual([]);
    });

    it('should return empty array when stakeholders is missing', () => {
      expect(DilutionCalculation.getOwnershipChanges({ results: {} })).toEqual([]);
    });
  });

  describe('getSummary()', () => {
    it('should return summary with results', () => {
      const calculation = {
        calculationType: 'funding_round',
        createdAt: '2024-01-01T00:00:00.000Z',
        results: {
          stakeholders: [
            { stakeholderId: 's1', dilutionPercentage: 10 },
            { stakeholderId: 's2', dilutionPercentage: 15 }
          ],
          shareClasses: [{ shareClassId: 'common' }],
          postMoney: 15000000,
          totalShares: 1500000
        }
      };
      const summary = DilutionCalculation.getSummary(calculation);
      expect(summary.totalDilution).toBe(25);
      expect(summary.stakeholderCount).toBe(2);
      expect(summary.shareClassCount).toBe(1);
      expect(summary.calculationType).toBe('funding_round');
      expect(summary.postMoney).toBe(15000000);
      expect(summary.totalShares).toBe(1500000);
      expect(summary.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should return default summary when results is missing', () => {
      const calculation = { calculationType: 'option_pool' };
      const summary = DilutionCalculation.getSummary(calculation);
      expect(summary.totalDilution).toBe(0);
      expect(summary.stakeholderCount).toBe(0);
      expect(summary.shareClassCount).toBe(0);
      expect(summary.calculationType).toBe('option_pool');
    });

    it('should handle results without stakeholders or shareClasses', () => {
      const calculation = { calculationType: 'comparison', results: {} };
      const summary = DilutionCalculation.getSummary(calculation);
      expect(summary.stakeholderCount).toBe(0);
      expect(summary.shareClassCount).toBe(0);
    });
  });

  describe('validate()', () => {
    it('should return valid for complete calculation', () => {
      const calculation = {
        scenarioId: 'DS-001',
        companyId: 'c1',
        calculationType: 'funding_round',
        inputs: {},
        results: {}
      };
      const result = DilutionCalculation.validate(calculation);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for missing scenarioId', () => {
      const result = DilutionCalculation.validate({ companyId: 'c1', calculationType: 'x', inputs: {}, results: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Scenario ID is required');
    });

    it('should return errors for missing companyId', () => {
      const result = DilutionCalculation.validate({ scenarioId: 's1', calculationType: 'x', inputs: {}, results: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Company ID is required');
    });

    it('should return errors for missing calculationType', () => {
      const result = DilutionCalculation.validate({ scenarioId: 's1', companyId: 'c1', inputs: {}, results: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Calculation type is required');
    });

    it('should return errors for missing inputs', () => {
      const result = DilutionCalculation.validate({ scenarioId: 's1', companyId: 'c1', calculationType: 'x', results: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Inputs are required');
    });

    it('should return errors for missing results', () => {
      const result = DilutionCalculation.validate({ scenarioId: 's1', companyId: 'c1', calculationType: 'x', inputs: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Results are required');
    });

    it('should return all errors for completely empty calculation', () => {
      const result = DilutionCalculation.validate({});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(5);
    });
  });
});
