/**
 * Investor Model - Comprehensive Unit Tests
 * Covers: create with validation, findByInvestorId, findByCompany,
 * findAccredited, findBoardMembers, findByType, findByFundraisingRound,
 * findMajorInvestors, addInvestment, getInvestmentSummary,
 * getTotalInvestmentByType, getTotalEquityByType, updateByInvestorId,
 * deleteByInvestorId, search, find, findOne, countDocuments, and edge cases.
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
const Investor = require('../../../models/Investor');

describe('Investor Model - Comprehensive', () => {
  const validInvestorData = {
    investorId: 'inv_001',
    companyId: 'comp_001',
    name: 'Jane Doe',
    email: 'jane@example.com',
    investorType: 'angel'
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
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validInvestorData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ---------------------------------------------------------
  // Constants and Schema
  // ---------------------------------------------------------
  describe('Constants and Schema', () => {
    it('should export INVESTOR_TYPES', () => {
      expect(Investor.INVESTOR_TYPES).toBeDefined();
      expect(Investor.INVESTOR_TYPES).toContain('angel');
      expect(Investor.INVESTOR_TYPES).toContain('venture_capital');
      expect(Investor.INVESTOR_TYPES).toContain('founder');
    });

    it('should export LEGACY_INVESTOR_TYPES', () => {
      expect(Investor.LEGACY_INVESTOR_TYPES).toBeDefined();
      expect(Investor.LEGACY_INVESTOR_TYPES).toContain('Angel');
      expect(Investor.LEGACY_INVESTOR_TYPES).toContain('Venture Capital');
    });

    it('should export ENTITY_TYPES', () => {
      expect(Investor.ENTITY_TYPES).toBeDefined();
      expect(Investor.ENTITY_TYPES).toContain('individual');
      expect(Investor.ENTITY_TYPES).toContain('corporation');
      expect(Investor.ENTITY_TYPES).toContain('trust');
    });

    it('should export ACCREDITATION_METHODS', () => {
      expect(Investor.ACCREDITATION_METHODS).toBeDefined();
      expect(Investor.ACCREDITATION_METHODS).toContain('income');
      expect(Investor.ACCREDITATION_METHODS).toContain('net_worth');
    });

    it('should have tableName set to stakeholders', () => {
      expect(Investor.tableName).toBe('stakeholders');
    });

    it('should have schema with required fields', () => {
      expect(Investor.schema.investorId.required).toBe(true);
      expect(Investor.schema.companyId.required).toBe(true);
      expect(Investor.schema.name.required).toBe(true);
      expect(Investor.schema.investorType.required).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // create()
  // ---------------------------------------------------------
  describe('create()', () => {
    it('should create an investor with valid data', async () => {
      // findByInvestorId returns null (no duplicate)
      zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
      zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
      zerodbService.insertRow.mockResolvedValue(makeInsertResponse({
        ...validInvestorData,
        _type: 'investor'
      }));

      const result = await Investor.create({ ...validInvestorData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should auto-generate investorId when not provided', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.investorId).toMatch(/^inv_/);
        return makeInsertResponse(doc);
      });

      const dataWithoutId = { ...validInvestorData };
      delete dataWithoutId.investorId;
      await Investor.create(dataWithoutId);
    });

    it('should throw validation error when companyId missing', async () => {
      const data = { ...validInvestorData };
      delete data.companyId;
      await expect(Investor.create(data)).rejects.toThrow('Validation failed');
    });

    it('should throw validation error when name missing', async () => {
      const data = { ...validInvestorData };
      delete data.name;
      await expect(Investor.create(data)).rejects.toThrow('Validation failed');
    });

    it('should throw validation error when investorType missing', async () => {
      const data = { ...validInvestorData };
      delete data.investorType;
      await expect(Investor.create(data)).rejects.toThrow('Validation failed');
    });

    it('should throw validation error for invalid investorType', async () => {
      await expect(
        Investor.create({ ...validInvestorData, investorType: 'INVALID' })
      ).rejects.toThrow('Validation failed');
    });

    it('should accept legacy investor type Angel', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockResolvedValue(makeInsertResponse({
        ...validInvestorData,
        investorType: 'Angel'
      }));

      const result = await Investor.create({ ...validInvestorData, investorType: 'Angel' });
      expect(result).toBeDefined();
    });

    it('should throw duplicate error when investorId already exists', async () => {
      // findByInvestorId returns existing
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([
        { investorId: 'inv_001', _type: 'investor' }
      ]));

      await expect(
        Investor.create({ ...validInvestorData })
      ).rejects.toThrow('Duplicate key error');

      try {
        zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([
          { investorId: 'inv_001', _type: 'investor' }
        ]));
        await Investor.create({ ...validInvestorData });
      } catch (err) {
        expect(err.code).toBe(11000);
      }
    });

    it('should set default values correctly', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.entityType).toBe('individual');
        expect(doc.accreditedInvestor).toBe(false);
        expect(doc.qibStatus).toBe(false);
        expect(doc.boardSeat).toBe(false);
        expect(doc.votingRights).toBe(true);
        expect(doc.investmentAmount).toBe(0);
        expect(doc.totalInvested).toBe(0);
        expect(doc.totalShares).toBe(0);
        expect(doc.proRataRights).toBe(false);
        expect(doc.informationRights).toBe(false);
        expect(doc.coSaleRights).toBe(false);
        expect(doc.dragAlongObligations).toBe(false);
        expect(doc.tags).toEqual([]);
        expect(doc._type).toBe('investor');
        return makeInsertResponse(doc);
      });

      await Investor.create({ ...validInvestorData });
    });

    it('should calculate totals from investments array', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.totalInvested).toBe(150000);
        expect(doc.totalShares).toBe(15000);
        return makeInsertResponse(doc);
      });

      await Investor.create({
        ...validInvestorData,
        investments: [
          { amount: 100000, sharesAcquired: 10000 },
          { amount: 50000, sharesAcquired: 5000 }
        ]
      });
    });

    it('should throw validation error for invalid entityType', async () => {
      await expect(
        Investor.create({ ...validInvestorData, entityType: 'alien' })
      ).rejects.toThrow('Validation failed');
    });

    it('should throw validation error for invalid accreditationMethod', async () => {
      await expect(
        Investor.create({ ...validInvestorData, accreditationMethod: 'magic' })
      ).rejects.toThrow('Validation failed');
    });
  });

  // ---------------------------------------------------------
  // findByInvestorId()
  // ---------------------------------------------------------
  describe('findByInvestorId()', () => {
    it('should find investor by investorId', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([
        { investorId: 'inv_001', name: 'Jane', _type: 'investor' }
      ]));

      const result = await Investor.findByInvestorId('inv_001');
      expect(result).toBeDefined();
      expect(result.investorId).toBe('inv_001');
    });

    it('should return null when investor not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await Investor.findByInvestorId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------
  // findByCompany()
  // ---------------------------------------------------------
  describe('findByCompany()', () => {
    it('should find investors by companyId', async () => {
      const investors = [
        { investorId: 'inv_1', companyId: 'comp_001', _type: 'investor' },
        { investorId: 'inv_2', companyId: 'comp_001', _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findByCompany('comp_001');
      expect(result).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------
  // findAccredited()
  // ---------------------------------------------------------
  describe('findAccredited()', () => {
    it('should return only accredited investors', async () => {
      const investors = [
        { investorId: 'inv_1', accreditedInvestor: true, _type: 'investor' },
        { investorId: 'inv_2', accreditedInvestor: false, _type: 'investor' },
        { investorId: 'inv_3', accreditedInvestor: true, _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findAccredited('comp_001');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no accredited investors', async () => {
      const investors = [
        { investorId: 'inv_1', accreditedInvestor: false, _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findAccredited('comp_001');
      expect(result).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------
  // findBoardMembers()
  // ---------------------------------------------------------
  describe('findBoardMembers()', () => {
    it('should return investors with board seats', async () => {
      const investors = [
        { investorId: 'inv_1', boardSeat: true, _type: 'investor' },
        { investorId: 'inv_2', boardSeat: false, _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findBoardMembers('comp_001');
      expect(result).toHaveLength(1);
      expect(result[0].investorId).toBe('inv_1');
    });
  });

  // ---------------------------------------------------------
  // findByType()
  // ---------------------------------------------------------
  describe('findByType()', () => {
    it('should find investors by type', async () => {
      const investors = [
        { investorId: 'inv_1', investorType: 'angel', _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findByType('angel');
      expect(result).toHaveLength(1);
    });

    it('should accept legacy type', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([
        { investorId: 'inv_1', investorType: 'Venture Capital', _type: 'investor' }
      ]));

      const result = await Investor.findByType('Venture Capital');
      expect(result).toHaveLength(1);
    });

    it('should throw for invalid type', async () => {
      await expect(Investor.findByType('INVALID')).rejects.toThrow('Invalid investorType');
    });
  });

  // ---------------------------------------------------------
  // findByFundraisingRound()
  // ---------------------------------------------------------
  describe('findByFundraisingRound()', () => {
    it('should find investors by legacy relatedFundraisingRound field', async () => {
      const investors = [
        { investorId: 'inv_1', relatedFundraisingRound: 'round_001', _type: 'investor' },
        { investorId: 'inv_2', relatedFundraisingRound: 'round_002', _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findByFundraisingRound('round_001');
      expect(result).toHaveLength(1);
      expect(result[0].investorId).toBe('inv_1');
    });

    it('should find investors via investments array roundId', async () => {
      const investors = [
        {
          investorId: 'inv_1',
          investments: [{ roundId: 'round_001', amount: 50000 }],
          _type: 'investor'
        },
        {
          investorId: 'inv_2',
          investments: [{ roundId: 'round_002', amount: 25000 }],
          _type: 'investor'
        }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findByFundraisingRound('round_001');
      expect(result).toHaveLength(1);
    });

    it('should return empty when no match', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await Investor.findByFundraisingRound('round_none');
      expect(result).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------
  // findMajorInvestors()
  // ---------------------------------------------------------
  describe('findMajorInvestors()', () => {
    it('should find investors above investment threshold', async () => {
      const investors = [
        { investorId: 'inv_1', totalInvested: 200000, _type: 'investor', companyId: 'comp_001' },
        { investorId: 'inv_2', totalInvested: 50000, _type: 'investor', companyId: 'comp_001' },
        { investorId: 'inv_3', investmentAmount: 150000, _type: 'investor', companyId: 'comp_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findMajorInvestors('comp_001', 100000);
      expect(result).toHaveLength(2);
    });

    it('should use investmentAmount as fallback for totalInvested', async () => {
      const investors = [
        { investorId: 'inv_1', investmentAmount: 500000, _type: 'investor', companyId: 'comp_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.findMajorInvestors('comp_001', 100000);
      expect(result).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------
  // addInvestment()
  // ---------------------------------------------------------
  describe('addInvestment()', () => {
    it('should throw when investor not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        Investor.addInvestment('nonexistent', { amount: 50000 })
      ).rejects.toThrow('Investor not found');
    });

    it('should add investment and recalculate totals', async () => {
      const existingInvestor = {
        investorId: 'inv_001',
        investments: [{ amount: 100000, sharesAcquired: 10000 }],
        totalInvested: 100000,
        totalShares: 10000,
        _type: 'investor',
        row_id: 'row-1'
      };
      // findByInvestorId
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingInvestor]));
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingInvestor]));
      // final findByInvestorId
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...existingInvestor,
        totalInvested: 150000,
        totalShares: 15000
      }]));

      const result = await Investor.addInvestment('inv_001', {
        amount: 50000,
        sharesAcquired: 5000,
        roundId: 'round_001'
      });
      expect(result).toBeDefined();
    });

    it('should handle investor with no existing investments', async () => {
      const existingInvestor = {
        investorId: 'inv_001',
        investments: undefined,
        _type: 'investor',
        row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingInvestor]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingInvestor]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingInvestor]));

      const result = await Investor.addInvestment('inv_001', {
        amount: 25000,
        sharesAcquired: 2500
      });
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // getInvestmentSummary()
  // ---------------------------------------------------------
  describe('getInvestmentSummary()', () => {
    it('should compute investment summary correctly', async () => {
      const investors = [
        {
          investorId: 'inv_1', investorType: 'angel', totalInvested: 100000,
          totalShares: 10000, accreditedInvestor: true, boardSeat: true,
          _type: 'investor', companyId: 'comp_001'
        },
        {
          investorId: 'inv_2', investorType: 'venture_capital', totalInvested: 500000,
          totalShares: 50000, accreditedInvestor: true, boardSeat: false,
          _type: 'investor', companyId: 'comp_001'
        },
        {
          investorId: 'inv_3', investorType: 'angel', investmentAmount: 25000,
          totalShares: 0, accreditedInvestor: false, boardSeat: false,
          _type: 'investor', companyId: 'comp_001'
        }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const summary = await Investor.getInvestmentSummary('comp_001');
      expect(summary.totalInvestors).toBe(3);
      expect(summary.totalInvested).toBe(625000);
      expect(summary.totalShares).toBe(60000);
      expect(summary.accreditedCount).toBe(2);
      expect(summary.boardMembers).toBe(1);
      expect(summary.byType.angel.count).toBe(2);
      expect(summary.byType.venture_capital.count).toBe(1);
    });

    it('should handle empty investors list', async () => {
      // Reset all mocks to ensure clean state
      jest.clearAllMocks();
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const summary = await Investor.getInvestmentSummary('comp_empty');
      expect(summary.totalInvestors).toBe(0);
      expect(summary.totalInvested).toBe(0);
      expect(summary.totalShares).toBe(0);
    });
  });

  // ---------------------------------------------------------
  // getTotalInvestmentByType()
  // ---------------------------------------------------------
  describe('getTotalInvestmentByType()', () => {
    it('should sum investments for a given type', async () => {
      const investors = [
        { investorId: 'inv_1', investorType: 'angel', totalInvested: 100000, _type: 'investor' },
        { investorId: 'inv_2', investorType: 'angel', investmentAmount: 50000, _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const total = await Investor.getTotalInvestmentByType('angel');
      expect(total).toBe(150000);
    });
  });

  // ---------------------------------------------------------
  // getTotalEquityByType()
  // ---------------------------------------------------------
  describe('getTotalEquityByType()', () => {
    it('should sum equity percentages for a given type', async () => {
      const investors = [
        { investorId: 'inv_1', investorType: 'angel', equityPercentage: 5, _type: 'investor' },
        { investorId: 'inv_2', investorType: 'angel', equityPercentage: 3, _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const total = await Investor.getTotalEquityByType('angel');
      expect(total).toBe(8);
    });
  });

  // ---------------------------------------------------------
  // updateByInvestorId()
  // ---------------------------------------------------------
  describe('updateByInvestorId()', () => {
    it('should update investor data', async () => {
      const existing = { investorId: 'inv_001', name: 'Jane', _type: 'investor', row_id: 'row-1' };
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existing]));
      // return findByInvestorId
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...existing, name: 'Jane Doe Updated'
      }]));

      const result = await Investor.updateByInvestorId('inv_001', { name: 'Jane Doe Updated' });
      expect(result).toBeDefined();
    });

    it('should throw for invalid investorType in update', async () => {
      await expect(
        Investor.updateByInvestorId('inv_001', { investorType: 'INVALID' })
      ).rejects.toThrow('Invalid investorType');
    });

    it('should throw for invalid entityType in update', async () => {
      await expect(
        Investor.updateByInvestorId('inv_001', { entityType: 'alien' })
      ).rejects.toThrow('Invalid entityType');
    });

    it('should throw for invalid accreditationMethod in update', async () => {
      await expect(
        Investor.updateByInvestorId('inv_001', { accreditationMethod: 'magic' })
      ).rejects.toThrow('Invalid accreditationMethod');
    });
  });

  // ---------------------------------------------------------
  // deleteByInvestorId()
  // ---------------------------------------------------------
  describe('deleteByInvestorId()', () => {
    it('should delete investor by investorId', async () => {
      const existing = { investorId: 'inv_001', _type: 'investor', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([existing]));
      zerodbService.deleteRowById.mockResolvedValue({});

      const result = await Investor.deleteByInvestorId('inv_001');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // search()
  // ---------------------------------------------------------
  describe('search()', () => {
    it('should search by name', async () => {
      const investors = [
        { investorId: 'inv_1', name: 'Jane Doe', email: 'jane@ex.com', _type: 'investor' },
        { investorId: 'inv_2', name: 'John Smith', email: 'john@ex.com', _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.search('jane');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Jane Doe');
    });

    it('should search by email', async () => {
      const investors = [
        { investorId: 'inv_1', name: 'Jane', email: 'jane@test.com', _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.search('jane@test');
      expect(result).toHaveLength(1);
    });

    it('should search by investorId', async () => {
      const investors = [
        { investorId: 'inv_special_42', name: 'Bob', _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.search('special_42');
      expect(result).toHaveLength(1);
    });

    it('should be case insensitive', async () => {
      const investors = [
        { investorId: 'inv_1', name: 'UPPERCASE NAME', _type: 'investor' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investors));

      const result = await Investor.search('uppercase');
      expect(result).toHaveLength(1);
    });

    it('should return empty for no matches', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await Investor.search('nonexistent');
      expect(result).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------
  // find() and findOne() with _type filter
  // ---------------------------------------------------------
  describe('find() and findOne()', () => {
    it('find should add _type investor filter', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await Investor.find({ companyId: 'comp_001' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'stakeholders',
        expect.objectContaining({
          filter: expect.objectContaining({ _type: 'investor' })
        })
      );
    });

    it('findOne should add _type investor filter', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await Investor.findOne({ investorId: 'inv_001' });
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'stakeholders',
        expect.objectContaining({
          filter: expect.objectContaining({ _type: 'investor' })
        })
      );
    });
  });

  // ---------------------------------------------------------
  // countDocuments()
  // ---------------------------------------------------------
  describe('countDocuments()', () => {
    it('should add _type investor filter', async () => {
      zerodbService.queryTable.mockResolvedValue({ total: 5 });
      const count = await Investor.countDocuments({ companyId: 'comp_001' });
      expect(count).toBe(5);
      expect(zerodbService.queryTable).toHaveBeenCalledWith(
        'stakeholders',
        expect.objectContaining({
          filter: expect.objectContaining({ _type: 'investor' })
        })
      );
    });
  });
});
