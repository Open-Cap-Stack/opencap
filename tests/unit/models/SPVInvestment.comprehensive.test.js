/**
 * SPVInvestment Model - Comprehensive Unit Tests
 * Covers: create with validation, findBySPVId, findByInvestorId,
 * findByStatus, findActiveInvestments, findByInvestorType, findByDateRange,
 * updateStatus, addDocument, getTotalInvestment, getTotalEquityAllocated,
 * getInvestorBreakdown, wouldExceedEquityLimit, getValidInvestorTypes,
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
const SPVInvestment = require('../../../models/SPVInvestment');

describe('SPVInvestment Model - Comprehensive', () => {
  const validInvestmentData = {
    spvId: 'spv_001',
    investorId: 'inv_001',
    investorName: 'Jane Doe',
    investorType: 'individual',
    investmentAmount: 100000,
    equityPercentage: 10,
    investmentDate: '2024-06-01',
    currency: 'USD',
    status: 'pending'
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
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validInvestmentData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1 });
  });

  // ---------------------------------------------------------
  // Constants and Schema
  // ---------------------------------------------------------
  describe('Constants and Schema', () => {
    it('should have tableName set to spv_investments', () => {
      expect(SPVInvestment.tableName).toBe('spv_investments');
    });

    it('should export VALID_INVESTOR_TYPES', () => {
      expect(SPVInvestment.VALID_INVESTOR_TYPES).toEqual(
        expect.arrayContaining(['individual', 'institutional', 'accredited', 'qualified'])
      );
    });

    it('should export VALID_STATUSES', () => {
      expect(SPVInvestment.VALID_STATUSES).toEqual(
        expect.arrayContaining(['pending', 'active', 'redeemed', 'cancelled'])
      );
    });

    it('should export validators', () => {
      expect(SPVInvestment.validators).toBeDefined();
    });

    it('should have schema defined', () => {
      expect(SPVInvestment.schema).toBeDefined();
      expect(SPVInvestment.schema.spvId.required).toBe(true);
      expect(SPVInvestment.schema.investorId.required).toBe(true);
      expect(SPVInvestment.schema.investorName.required).toBe(true);
      expect(SPVInvestment.schema.investmentAmount.required).toBe(true);
      expect(SPVInvestment.schema.equityPercentage.required).toBe(true);
      expect(SPVInvestment.schema.investmentDate.required).toBe(true);
    });
  });

  // ---------------------------------------------------------
  // Validators
  // ---------------------------------------------------------
  describe('validators', () => {
    it('isValidInvestorType should validate correct types', () => {
      expect(SPVInvestment.validators.isValidInvestorType('individual')).toBe(true);
      expect(SPVInvestment.validators.isValidInvestorType('institutional')).toBe(true);
      expect(SPVInvestment.validators.isValidInvestorType('invalid')).toBe(false);
    });

    it('isValidStatus should validate correct statuses', () => {
      expect(SPVInvestment.validators.isValidStatus('pending')).toBe(true);
      expect(SPVInvestment.validators.isValidStatus('active')).toBe(true);
      expect(SPVInvestment.validators.isValidStatus('invalid')).toBe(false);
    });

    it('isValidPositiveNumber should validate', () => {
      expect(SPVInvestment.validators.isValidPositiveNumber(100)).toBe(true);
      expect(SPVInvestment.validators.isValidPositiveNumber(0)).toBe(true);
      expect(SPVInvestment.validators.isValidPositiveNumber(-1)).toBe(false);
      expect(SPVInvestment.validators.isValidPositiveNumber(NaN)).toBe(false);
      expect(SPVInvestment.validators.isValidPositiveNumber(Infinity)).toBe(false);
    });

    it('isValidPercentage should validate 0-100 range', () => {
      expect(SPVInvestment.validators.isValidPercentage(0)).toBe(true);
      expect(SPVInvestment.validators.isValidPercentage(50)).toBe(true);
      expect(SPVInvestment.validators.isValidPercentage(100)).toBe(true);
      expect(SPVInvestment.validators.isValidPercentage(101)).toBe(false);
      expect(SPVInvestment.validators.isValidPercentage(-1)).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // create()
  // ---------------------------------------------------------
  describe('create()', () => {
    it('should create investment with valid data', async () => {
      const result = await SPVInvestment.create({ ...validInvestmentData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should throw when spvId is missing', async () => {
      const data = { ...validInvestmentData };
      delete data.spvId;
      await expect(SPVInvestment.create(data)).rejects.toThrow('SPV ID is required');
    });

    it('should throw when investorId is missing', async () => {
      const data = { ...validInvestmentData };
      delete data.investorId;
      await expect(SPVInvestment.create(data)).rejects.toThrow('Investor ID is required');
    });

    it('should throw when investorName is missing', async () => {
      const data = { ...validInvestmentData };
      delete data.investorName;
      await expect(SPVInvestment.create(data)).rejects.toThrow('Investor name is required');
    });

    it('should throw for invalid investor type', async () => {
      await expect(
        SPVInvestment.create({ ...validInvestmentData, investorType: 'invalid' })
      ).rejects.toThrow('Invalid investor type');
    });

    it('should not throw when investorType is not provided', async () => {
      const data = { ...validInvestmentData };
      delete data.investorType;
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.investorType).toBe('individual');
        return makeInsertResponse(doc);
      });
      const result = await SPVInvestment.create(data);
      expect(result).toBeDefined();
    });

    it('should throw when investmentAmount is missing', async () => {
      const data = { ...validInvestmentData };
      delete data.investmentAmount;
      await expect(SPVInvestment.create(data)).rejects.toThrow('Investment amount is required');
    });

    it('should throw when investmentAmount is null', async () => {
      await expect(
        SPVInvestment.create({ ...validInvestmentData, investmentAmount: null })
      ).rejects.toThrow('Investment amount is required');
    });

    it('should throw when investmentAmount is negative', async () => {
      await expect(
        SPVInvestment.create({ ...validInvestmentData, investmentAmount: -100 })
      ).rejects.toThrow('Investment amount must be a positive number');
    });

    it('should throw when equityPercentage is missing', async () => {
      const data = { ...validInvestmentData };
      delete data.equityPercentage;
      await expect(SPVInvestment.create(data)).rejects.toThrow('Equity percentage is required');
    });

    it('should throw when equityPercentage is null', async () => {
      await expect(
        SPVInvestment.create({ ...validInvestmentData, equityPercentage: null })
      ).rejects.toThrow('Equity percentage is required');
    });

    it('should throw when equityPercentage > 100', async () => {
      await expect(
        SPVInvestment.create({ ...validInvestmentData, equityPercentage: 101 })
      ).rejects.toThrow('Equity percentage must be between 0 and 100');
    });

    it('should throw when equityPercentage is negative', async () => {
      await expect(
        SPVInvestment.create({ ...validInvestmentData, equityPercentage: -5 })
      ).rejects.toThrow('Equity percentage must be between 0 and 100');
    });

    it('should throw when investmentDate is missing', async () => {
      const data = { ...validInvestmentData };
      delete data.investmentDate;
      await expect(SPVInvestment.create(data)).rejects.toThrow('Investment date is required');
    });

    it('should throw for invalid status', async () => {
      await expect(
        SPVInvestment.create({ ...validInvestmentData, status: 'invalid' })
      ).rejects.toThrow('Invalid status');
    });

    it('should default investorType to individual', async () => {
      const data = { ...validInvestmentData };
      delete data.investorType;
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.investorType).toBe('individual');
        return makeInsertResponse(doc);
      });
      await SPVInvestment.create(data);
    });

    it('should default currency to USD', async () => {
      const data = { ...validInvestmentData };
      delete data.currency;
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.currency).toBe('USD');
        return makeInsertResponse(doc);
      });
      await SPVInvestment.create(data);
    });

    it('should default status to pending', async () => {
      const data = { ...validInvestmentData };
      delete data.status;
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('pending');
        return makeInsertResponse(doc);
      });
      await SPVInvestment.create(data);
    });

    it('should initialize documents array', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.documents).toEqual([]);
        return makeInsertResponse(doc);
      });
      await SPVInvestment.create({ ...validInvestmentData });
    });

    it('should allow zero investmentAmount', async () => {
      const result = await SPVInvestment.create({ ...validInvestmentData, investmentAmount: 0 });
      expect(result).toBeDefined();
    });

    it('should allow zero equityPercentage', async () => {
      const result = await SPVInvestment.create({ ...validInvestmentData, equityPercentage: 0 });
      expect(result).toBeDefined();
    });

    it('should allow 100 equityPercentage', async () => {
      const result = await SPVInvestment.create({ ...validInvestmentData, equityPercentage: 100 });
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // findBySPVId()
  // ---------------------------------------------------------
  describe('findBySPVId()', () => {
    it('should find investments by SPV ID', async () => {
      const investments = [
        { _id: 'i1', spvId: 'spv_001' },
        { _id: 'i2', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findBySPVId('spv_001');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for null spvId', async () => {
      const result = await SPVInvestment.findBySPVId(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined spvId', async () => {
      const result = await SPVInvestment.findBySPVId(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string spvId', async () => {
      const result = await SPVInvestment.findBySPVId('');
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findByInvestorId()
  // ---------------------------------------------------------
  describe('findByInvestorId()', () => {
    it('should find investments by investor ID', async () => {
      const investments = [{ _id: 'i1', investorId: 'inv_001' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findByInvestorId('inv_001');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for null investorId', async () => {
      const result = await SPVInvestment.findByInvestorId(null);
      expect(result).toEqual([]);
    });

    it('should return empty array for undefined investorId', async () => {
      const result = await SPVInvestment.findByInvestorId(undefined);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findByStatus()
  // ---------------------------------------------------------
  describe('findByStatus()', () => {
    it('should find investments by status', async () => {
      const investments = [{ _id: 'i1', status: 'active' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findByStatus('active');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid status', async () => {
      const result = await SPVInvestment.findByStatus('invalid');
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findActiveInvestments()
  // ---------------------------------------------------------
  describe('findActiveInvestments()', () => {
    it('should find active investments for an SPV', async () => {
      const investments = [
        { _id: 'i1', spvId: 'spv_001', status: 'active' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findActiveInvestments('spv_001');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for null spvId', async () => {
      const result = await SPVInvestment.findActiveInvestments(null);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findByInvestorType()
  // ---------------------------------------------------------
  describe('findByInvestorType()', () => {
    it('should find investments by investor type', async () => {
      const investments = [{ _id: 'i1', investorType: 'institutional' }];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findByInvestorType('institutional');
      expect(result).toHaveLength(1);
    });

    it('should return empty array for invalid investor type', async () => {
      const result = await SPVInvestment.findByInvestorType('invalid');
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findByDateRange()
  // ---------------------------------------------------------
  describe('findByDateRange()', () => {
    it('should find investments within date range', async () => {
      const investments = [
        { _id: 'i1', spvId: 'spv_001', investmentDate: '2024-03-15' },
        { _id: 'i2', spvId: 'spv_001', investmentDate: '2024-06-01' },
        { _id: 'i3', spvId: 'spv_001', investmentDate: '2024-12-01' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findByDateRange(
        'spv_001',
        new Date('2024-01-01'),
        new Date('2024-06-30')
      );
      expect(result).toHaveLength(2);
    });

    it('should return empty for no matches in range', async () => {
      const investments = [
        { _id: 'i1', spvId: 'spv_001', investmentDate: '2024-12-01' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findByDateRange(
        'spv_001',
        new Date('2024-01-01'),
        new Date('2024-06-30')
      );
      expect(result).toHaveLength(0);
    });

    it('should include investments on boundary dates', async () => {
      const investments = [
        { _id: 'i1', spvId: 'spv_001', investmentDate: '2024-01-01' },
        { _id: 'i2', spvId: 'spv_001', investmentDate: '2024-06-30' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.findByDateRange(
        'spv_001',
        new Date('2024-01-01'),
        new Date('2024-06-30')
      );
      expect(result).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------
  // updateStatus()
  // ---------------------------------------------------------
  describe('updateStatus()', () => {
    it('should throw for invalid status', async () => {
      await expect(
        SPVInvestment.updateStatus('i1', 'invalid')
      ).rejects.toThrow('Invalid status');
    });

    it('should update status successfully', async () => {
      const investment = { _id: 'i1', status: 'pending', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([investment]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...investment,
        status: 'active'
      }]));

      const result = await SPVInvestment.updateStatus('i1', 'active');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // addDocument()
  // ---------------------------------------------------------
  describe('addDocument()', () => {
    it('should throw when investment not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        SPVInvestment.addDocument('nonexistent', { name: 'doc.pdf', url: '/docs/doc.pdf' })
      ).rejects.toThrow('Investment not found');
    });

    it('should add document to investment', async () => {
      const investment = { _id: 'i1', documents: [], row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([investment]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([investment]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...investment,
        documents: [{ name: 'doc.pdf', url: '/docs/doc.pdf' }]
      }]));

      const result = await SPVInvestment.addDocument('i1', {
        name: 'doc.pdf',
        url: '/docs/doc.pdf'
      });
      expect(result).toBeDefined();
    });

    it('should handle investment with null documents array', async () => {
      const investment = { _id: 'i1', documents: null, row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([investment]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([investment]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([investment]));

      const result = await SPVInvestment.addDocument('i1', {
        name: 'doc.pdf',
        url: '/docs/doc.pdf'
      });
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // getTotalInvestment()
  // ---------------------------------------------------------
  describe('getTotalInvestment()', () => {
    it('should sum active investments', async () => {
      const investments = [
        { _id: 'i1', investmentAmount: 100000, status: 'active', spvId: 'spv_001' },
        { _id: 'i2', investmentAmount: 200000, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const total = await SPVInvestment.getTotalInvestment('spv_001');
      expect(total).toBe(300000);
    });

    it('should return 0 for no active investments', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const total = await SPVInvestment.getTotalInvestment('spv_001');
      expect(total).toBe(0);
    });

    it('should handle missing investmentAmount', async () => {
      const investments = [
        { _id: 'i1', investmentAmount: undefined, status: 'active', spvId: 'spv_001' },
        { _id: 'i2', investmentAmount: 50000, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const total = await SPVInvestment.getTotalInvestment('spv_001');
      expect(total).toBe(50000);
    });
  });

  // ---------------------------------------------------------
  // getTotalEquityAllocated()
  // ---------------------------------------------------------
  describe('getTotalEquityAllocated()', () => {
    it('should sum equity percentages of active investments', async () => {
      const investments = [
        { _id: 'i1', equityPercentage: 10, status: 'active', spvId: 'spv_001' },
        { _id: 'i2', equityPercentage: 15, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const total = await SPVInvestment.getTotalEquityAllocated('spv_001');
      expect(total).toBe(25);
    });

    it('should return 0 for no active investments', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const total = await SPVInvestment.getTotalEquityAllocated('spv_001');
      expect(total).toBe(0);
    });
  });

  // ---------------------------------------------------------
  // getInvestorBreakdown()
  // ---------------------------------------------------------
  describe('getInvestorBreakdown()', () => {
    it('should return breakdown by investor type', async () => {
      const investments = [
        { _id: 'i1', investorType: 'individual', investmentAmount: 100000, equityPercentage: 10, status: 'active', spvId: 'spv_001' },
        { _id: 'i2', investorType: 'institutional', investmentAmount: 500000, equityPercentage: 40, status: 'active', spvId: 'spv_001' },
        { _id: 'i3', investorType: 'individual', investmentAmount: 50000, equityPercentage: 5, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const breakdown = await SPVInvestment.getInvestorBreakdown('spv_001');
      expect(breakdown.individual.count).toBe(2);
      expect(breakdown.individual.totalAmount).toBe(150000);
      expect(breakdown.individual.totalEquity).toBe(15);
      expect(breakdown.institutional.count).toBe(1);
      expect(breakdown.institutional.totalAmount).toBe(500000);
      expect(breakdown.accredited.count).toBe(0);
      expect(breakdown.qualified.count).toBe(0);
    });

    it('should handle empty investments', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const breakdown = await SPVInvestment.getInvestorBreakdown('spv_001');
      for (const type of SPVInvestment.VALID_INVESTOR_TYPES) {
        expect(breakdown[type].count).toBe(0);
        expect(breakdown[type].totalAmount).toBe(0);
        expect(breakdown[type].totalEquity).toBe(0);
      }
    });
  });

  // ---------------------------------------------------------
  // wouldExceedEquityLimit()
  // ---------------------------------------------------------
  describe('wouldExceedEquityLimit()', () => {
    it('should return true when total would exceed 100%', async () => {
      const investments = [
        { _id: 'i1', equityPercentage: 80, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.wouldExceedEquityLimit('spv_001', 25);
      expect(result).toBe(true);
    });

    it('should return false when total stays at or below 100%', async () => {
      const investments = [
        { _id: 'i1', equityPercentage: 30, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.wouldExceedEquityLimit('spv_001', 20);
      expect(result).toBe(false);
    });

    it('should return false when exactly 100%', async () => {
      const investments = [
        { _id: 'i1', equityPercentage: 50, status: 'active', spvId: 'spv_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(investments));

      const result = await SPVInvestment.wouldExceedEquityLimit('spv_001', 50);
      expect(result).toBe(false);
    });

    it('should work with no existing investments', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const result = await SPVInvestment.wouldExceedEquityLimit('spv_001', 50);
      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------
  // getValidInvestorTypes() and getValidStatuses()
  // ---------------------------------------------------------
  describe('getter methods', () => {
    it('getValidInvestorTypes returns copy of VALID_INVESTOR_TYPES', () => {
      const types = SPVInvestment.getValidInvestorTypes();
      expect(types).toEqual(SPVInvestment.VALID_INVESTOR_TYPES);
      types.push('new_type');
      expect(SPVInvestment.VALID_INVESTOR_TYPES).not.toContain('new_type');
    });

    it('getValidStatuses returns copy of VALID_STATUSES', () => {
      const statuses = SPVInvestment.getValidStatuses();
      expect(statuses).toEqual(SPVInvestment.VALID_STATUSES);
      statuses.push('destroyed');
      expect(SPVInvestment.VALID_STATUSES).not.toContain('destroyed');
    });
  });

  // ---------------------------------------------------------
  // Base model method exposure
  // ---------------------------------------------------------
  describe('Base model methods', () => {
    it('should expose find method', () => {
      expect(typeof SPVInvestment.find).toBe('function');
    });

    it('should expose findOne method', () => {
      expect(typeof SPVInvestment.findOne).toBe('function');
    });

    it('should expose findById method', () => {
      expect(typeof SPVInvestment.findById).toBe('function');
    });

    it('should expose updateOne method', () => {
      expect(typeof SPVInvestment.updateOne).toBe('function');
    });

    it('should expose deleteOne method', () => {
      expect(typeof SPVInvestment.deleteOne).toBe('function');
    });

    it('should expose countDocuments method', () => {
      expect(typeof SPVInvestment.countDocuments).toBe('function');
    });

    it('should expose findByIdAndUpdate method', () => {
      expect(typeof SPVInvestment.findByIdAndUpdate).toBe('function');
    });
  });
});
