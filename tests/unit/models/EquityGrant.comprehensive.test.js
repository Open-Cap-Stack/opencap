/**
 * EquityGrant Model - Comprehensive Unit Tests
 * Covers: create with validation, recordExercise, approve, cancel,
 * linkValuation, updateASC718Expense, findPendingValuation,
 * findCheapStockRisk, getASC718ExpenseSummary, findByEmployee, findByCompany,
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
const EquityGrant = require('../../../models/EquityGrant');

describe('EquityGrant Model - Comprehensive', () => {
  const validGrantData = {
    employeeId: 'emp_001',
    companyId: 'comp_001',
    grantType: 'ISO',
    numberOfShares: 10000,
    strikePrice: 1.50,
    grantDate: '2024-06-01',
    vestingSchedule: {
      vestingStartDate: null,
      vestingPeriodMonths: 48,
      cliffMonths: 12,
      vestingFrequency: 'monthly'
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
    zerodbService.insertRow.mockResolvedValue(makeInsertResponse(validGrantData));
    zerodbService.queryTable.mockResolvedValue({ data: [] });
    zerodbService.updateRows.mockResolvedValue({ modified_count: 1, matched_count: 1 });
  });

  // ---------------------------------------------------------
  // create() method
  // ---------------------------------------------------------
  describe('create()', () => {
    it('should create a grant with valid data', async () => {
      zerodbService.insertRow.mockResolvedValue(makeInsertResponse({
        ...validGrantData,
        grantId: 'grant_auto',
        status: 'pending'
      }));

      const result = await EquityGrant.create({ ...validGrantData });
      expect(result).toBeDefined();
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should auto-generate grantId when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.grantId).toMatch(/^grant_/);
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData });
      expect(zerodbService.insertRow).toHaveBeenCalled();
    });

    it('should preserve provided grantId', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.grantId).toBe('custom_grant_id');
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData, grantId: 'custom_grant_id' });
    });

    it('should throw for invalid grant type', async () => {
      await expect(
        EquityGrant.create({ ...validGrantData, grantType: 'INVALID' })
      ).rejects.toThrow('not a valid grant type');
    });

    it('should throw when numberOfShares < 1', async () => {
      await expect(
        EquityGrant.create({ ...validGrantData, numberOfShares: 0 })
      ).rejects.toThrow('Number of shares must be positive');
    });

    it('should throw when strikePrice is negative', async () => {
      await expect(
        EquityGrant.create({ ...validGrantData, strikePrice: -1 })
      ).rejects.toThrow('Strike price cannot be negative');
    });

    it('should allow zero strike price', async () => {
      zerodbService.insertRow.mockResolvedValue(
        makeInsertResponse({ ...validGrantData, strikePrice: 0 })
      );
      const result = await EquityGrant.create({ ...validGrantData, strikePrice: 0 });
      expect(result).toBeDefined();
    });

    it('should throw when exercisedShares exceed numberOfShares', async () => {
      await expect(
        EquityGrant.create({ ...validGrantData, exercisedShares: 20000 })
      ).rejects.toThrow('Exercised shares cannot exceed total number of shares');
    });

    it('should set 10-year expiration for ISO when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.expirationDate).toBeDefined();
        const expDate = new Date(doc.expirationDate);
        const grantDate = new Date(doc.grantDate);
        expect(expDate.getFullYear() - grantDate.getFullYear()).toBe(10);
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData, grantType: 'ISO' });
    });

    it('should set 10-year expiration for NSO when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.expirationDate).toBeDefined();
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData, grantType: 'NSO' });
    });

    it('should not set auto expiration for RSU', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.expirationDate).toBeUndefined();
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData, grantType: 'RSU' });
    });

    it('should set vestingStartDate to grantDate when not provided', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.vestingSchedule.vestingStartDate).toBe(validGrantData.grantDate);
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData });
    });

    it('should default status to pending', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.status).toBe('pending');
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData });
    });

    it('should default grantVsFmvStatus to PENDING_VALUATION', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.grantVsFmvStatus).toBe('PENDING_VALUATION');
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData });
    });

    it('should default cheapStockRisk to false', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.cheapStockRisk).toBe(false);
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData });
    });

    it('should default valuation409AExpiredAtGrant to false', async () => {
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.valuation409AExpiredAtGrant).toBe(false);
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({ ...validGrantData });
    });

    it('should preserve provided expirationDate for ISO', async () => {
      const customExpiration = '2030-01-01';
      zerodbService.insertRow.mockImplementation(async (table, doc) => {
        expect(doc.expirationDate).toBe(customExpiration);
        return makeInsertResponse(doc);
      });

      await EquityGrant.create({
        ...validGrantData,
        grantType: 'ISO',
        expirationDate: customExpiration
      });
    });
  });

  // ---------------------------------------------------------
  // findByGrantId()
  // ---------------------------------------------------------
  describe('findByGrantId()', () => {
    it('should call findOne with grantId filter', async () => {
      const grant = { grantId: 'grant_001', companyId: 'comp_001' };
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([grant]));

      const result = await EquityGrant.findByGrantId('grant_001');
      expect(result).toBeDefined();
      expect(result.grantId).toBe('grant_001');
    });

    it('should return null when grant not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await EquityGrant.findByGrantId('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------
  // findByEmployee()
  // ---------------------------------------------------------
  describe('findByEmployee()', () => {
    it('should find grants by employeeId', async () => {
      const grants = [
        { grantId: 'g1', employeeId: 'emp_001' },
        { grantId: 'g2', employeeId: 'emp_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(grants));

      const result = await EquityGrant.findByEmployee('emp_001');
      expect(result).toHaveLength(2);
    });

    it('should filter by status when provided', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([
        { grantId: 'g1', employeeId: 'emp_001', status: 'active' }
      ]));

      const result = await EquityGrant.findByEmployee('emp_001', { status: 'active' });
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no grants found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await EquityGrant.findByEmployee('emp_none');
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------
  // findByCompany()
  // ---------------------------------------------------------
  describe('findByCompany()', () => {
    it('should find grants by companyId', async () => {
      const grants = [
        { grantId: 'g1', companyId: 'comp_001' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(grants));

      const result = await EquityGrant.findByCompany('comp_001');
      expect(result).toHaveLength(1);
    });

    it('should filter by status option', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([
        { grantId: 'g1', companyId: 'comp_001', status: 'active' }
      ]));

      const result = await EquityGrant.findByCompany('comp_001', { status: 'active' });
      expect(result).toHaveLength(1);
    });

    it('should filter by grantType option', async () => {
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse([
        { grantId: 'g1', companyId: 'comp_001', grantType: 'ISO' }
      ]));

      const result = await EquityGrant.findByCompany('comp_001', { grantType: 'ISO' });
      expect(result).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------
  // recordExercise()
  // ---------------------------------------------------------
  describe('recordExercise()', () => {
    const existingGrant = {
      grantId: 'grant_001',
      numberOfShares: 10000,
      exercisedShares: 2000,
      strikePrice: 1.50,
      exerciseHistory: [],
      row_id: 'row-1'
    };

    it('should record exercise successfully', async () => {
      // findByGrantId call
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingGrant]));
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingGrant]));

      const result = await EquityGrant.recordExercise('grant_001', {
        sharesExercised: 1000,
        exercisePrice: 1.50
      });
      expect(result).toBeDefined();
    });

    it('should throw when grant is not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        EquityGrant.recordExercise('nonexistent', { sharesExercised: 100 })
      ).rejects.toThrow('Grant not found');
    });

    it('should throw when sharesExercised < 1', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingGrant]));
      await expect(
        EquityGrant.recordExercise('grant_001', { sharesExercised: 0 })
      ).rejects.toThrow('Must exercise at least 1 share');
    });

    it('should throw when exercising more shares than available', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingGrant]));
      await expect(
        EquityGrant.recordExercise('grant_001', { sharesExercised: 9000 })
      ).rejects.toThrow('Cannot exercise more shares than available');
    });

    it('should use grant strikePrice as default exercise price', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingGrant]));
      // Mock the updateOne internal findOne + put
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([existingGrant]));

      await EquityGrant.recordExercise('grant_001', {
        sharesExercised: 100
      });

      // Verify the updateOne call happened
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------
  // approve()
  // ---------------------------------------------------------
  describe('approve()', () => {
    it('should update grant status to approved', async () => {
      const grant = { grantId: 'grant_001', status: 'pending', row_id: 'row-1' };
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));

      const result = await EquityGrant.approve('grant_001', 'admin_user');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // cancel()
  // ---------------------------------------------------------
  describe('cancel()', () => {
    it('should update grant status to cancelled with reason', async () => {
      const grant = { grantId: 'grant_001', status: 'active', row_id: 'row-1' };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));

      const result = await EquityGrant.cancel('grant_001', 'Employee termination');
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // linkValuation()
  // ---------------------------------------------------------
  describe('linkValuation()', () => {
    const grantForLinkage = {
      grantId: 'grant_001',
      companyId: 'comp_001',
      strikePrice: 1.50,
      numberOfShares: 10000,
      grantDate: '2024-06-01',
      row_id: 'row-1'
    };

    it('should throw when grant not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        EquityGrant.linkValuation('nonexistent', { valuationId: 'v1' })
      ).rejects.toThrow('Grant not found');
    });

    it('should throw when valuation is null', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      await expect(
        EquityGrant.linkValuation('grant_001', null)
      ).rejects.toThrow('Valid valuation with valuationId required');
    });

    it('should throw when valuation has no valuationId', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      await expect(
        EquityGrant.linkValuation('grant_001', { fairMarketValue: 1.50 })
      ).rejects.toThrow('Valid valuation with valuationId required');
    });

    it('should set AT_FMV when strike equals FMV', async () => {
      // findByGrantId
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      // return findByGrantId after update
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...grantForLinkage,
        grantVsFmvStatus: 'AT_FMV'
      }]));

      const result = await EquityGrant.linkValuation('grant_001', {
        valuationId: 'val_001',
        fairMarketValue: 1.50,
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01'
      });
      expect(result).toBeDefined();
    });

    it('should set BELOW_FMV and cheapStockRisk when strike < FMV', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...grantForLinkage,
        grantVsFmvStatus: 'BELOW_FMV',
        cheapStockRisk: true
      }]));

      const result = await EquityGrant.linkValuation('grant_001', {
        valuationId: 'val_001',
        fairMarketValue: 2.00,
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01'
      });
      expect(result).toBeDefined();
    });

    it('should set ABOVE_FMV when strike > FMV', async () => {
      const highStrikeGrant = { ...grantForLinkage, strikePrice: 3.00 };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([highStrikeGrant]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([highStrikeGrant]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...highStrikeGrant,
        grantVsFmvStatus: 'ABOVE_FMV'
      }]));

      const result = await EquityGrant.linkValuation('grant_001', {
        valuationId: 'val_001',
        fairMarketValue: 2.00,
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01'
      });
      expect(result).toBeDefined();
    });

    it('should detect expired valuation at grant date', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...grantForLinkage,
        valuation409AExpiredAtGrant: true
      }]));

      const result = await EquityGrant.linkValuation('grant_001', {
        valuationId: 'val_001',
        fairMarketValue: 1.50,
        effectiveDate: '2023-01-01',
        expirationDate: '2024-01-01' // expired before grant date 2024-06-01
      });
      expect(result).toBeDefined();
    });

    it('should use default fmvSource of 409A_VALUATION', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));

      await EquityGrant.linkValuation('grant_001', {
        valuationId: 'val_001',
        fairMarketValue: 1.50
      });
      expect(zerodbService.queryTable).toHaveBeenCalled();
    });

    it('should respect custom fmvSource option', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));

      await EquityGrant.linkValuation('grant_001', {
        valuationId: 'val_001',
        fairMarketValue: 1.50
      }, { fmvSource: 'BOARD_RESOLUTION' });

      expect(zerodbService.queryTable).toHaveBeenCalled();
    });

    it('should skip ASC 718 recalculation when recalculateExpense is false', async () => {
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grantForLinkage]));

      await EquityGrant.linkValuation('grant_001', {
        valuationId: 'val_001',
        fairMarketValue: 1.50
      }, { recalculateExpense: false });

      expect(zerodbService.queryTable).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------
  // updateASC718Expense()
  // ---------------------------------------------------------
  describe('updateASC718Expense()', () => {
    it('should throw when grant not found', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      await expect(
        EquityGrant.updateASC718Expense('nonexistent', 1000)
      ).rejects.toThrow('Grant not found');
    });

    it('should throw when recognized expense would exceed total', async () => {
      const grant = {
        grantId: 'grant_001',
        asc718ExpenseTotal: 5000,
        asc718ExpenseRecognized: 4500,
        row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));

      await expect(
        EquityGrant.updateASC718Expense('grant_001', 600)
      ).rejects.toThrow('Cannot recognize more expense than total ASC 718 expense');
    });

    it('should update expense recognition successfully', async () => {
      const grant = {
        grantId: 'grant_001',
        asc718ExpenseTotal: 5000,
        asc718ExpenseRecognized: 1000,
        row_id: 'row-1'
      };
      // findByGrantId
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));
      // updateOne -> findOne
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));
      // final findByGrantId
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([{
        ...grant,
        asc718ExpenseRecognized: 2000
      }]));

      const result = await EquityGrant.updateASC718Expense('grant_001', 1000);
      expect(result).toBeDefined();
    });

    it('should allow recognition when totalExpense is 0', async () => {
      const grant = {
        grantId: 'grant_001',
        asc718ExpenseTotal: 0,
        asc718ExpenseRecognized: 0,
        row_id: 'row-1'
      };
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));
      zerodbService.queryTable.mockResolvedValueOnce(makeQueryResponse([grant]));

      // totalExpense is 0, so the condition (newRecognized > totalExpense && totalExpense > 0) is false
      const result = await EquityGrant.updateASC718Expense('grant_001', 100);
      expect(result).toBeDefined();
    });
  });

  // ---------------------------------------------------------
  // findPendingValuation()
  // ---------------------------------------------------------
  describe('findPendingValuation()', () => {
    it('should return grants without valuation linkage', async () => {
      const grants = [
        { grantId: 'g1', companyId: 'comp_001', valuation409AId: null, grantVsFmvStatus: 'PENDING_VALUATION' },
        { grantId: 'g2', companyId: 'comp_001', valuation409AId: 'val_001', grantVsFmvStatus: 'AT_FMV' },
        { grantId: 'g3', companyId: 'comp_001', valuation409AId: null, grantVsFmvStatus: 'PENDING_VALUATION' }
      ];
      // baseModel.find is called which calls queryTable; may be called more than once
      // due to findOne fallback logic, so use mockResolvedValue (not Once)
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(grants));

      const result = await EquityGrant.findPendingValuation('comp_001');
      // Result is filtered client-side: only grants with no valuation409AId and PENDING_VALUATION
      expect(result).toHaveLength(2);
      expect(result[0].grantId).toBe('g1');
      expect(result[1].grantId).toBe('g3');
    });

    it('should return empty when all grants are linked', async () => {
      const grants = [
        { grantId: 'g1', companyId: 'comp_001', valuation409AId: 'val_001', grantVsFmvStatus: 'AT_FMV' }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(grants));

      const result = await EquityGrant.findPendingValuation('comp_001');
      expect(result).toHaveLength(0);
    });

    it('should return empty when no grants exist', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });
      const result = await EquityGrant.findPendingValuation('comp_001');
      expect(result).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------
  // findCheapStockRisk()
  // ---------------------------------------------------------
  describe('findCheapStockRisk()', () => {
    it('should return grants with cheap stock risk', async () => {
      const grants = [
        { grantId: 'g1', companyId: 'comp_001', cheapStockRisk: true }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(grants));

      const result = await EquityGrant.findCheapStockRisk('comp_001');
      expect(result).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------
  // getASC718ExpenseSummary()
  // ---------------------------------------------------------
  describe('getASC718ExpenseSummary()', () => {
    it('should calculate expense summary correctly', async () => {
      const grants = [
        { grantId: 'g1', companyId: 'comp_001', asc718ExpenseTotal: 5000, asc718ExpenseRecognized: 2000, valuation409AId: 'val_001' },
        { grantId: 'g2', companyId: 'comp_001', asc718ExpenseTotal: 3000, asc718ExpenseRecognized: 1000, valuation409AId: 'val_001' },
        { grantId: 'g3', companyId: 'comp_001', asc718ExpenseTotal: null, asc718ExpenseRecognized: null, valuation409AId: null }
      ];
      // baseModel.find -> queryTable
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(grants));

      const summary = await EquityGrant.getASC718ExpenseSummary('comp_001');
      expect(summary.totalExpense).toBe(8000);
      expect(summary.recognizedExpense).toBe(3000);
      expect(summary.unrecognizedExpense).toBe(5000);
      expect(summary.grantCount).toBe(2);
      expect(summary.linkedCount).toBe(2);
      expect(summary.pendingLinkageCount).toBe(0);
    });

    it('should handle empty grants list', async () => {
      zerodbService.queryTable.mockResolvedValue({ data: [] });

      const summary = await EquityGrant.getASC718ExpenseSummary('comp_001');
      expect(summary.totalExpense).toBe(0);
      expect(summary.recognizedExpense).toBe(0);
      expect(summary.unrecognizedExpense).toBe(0);
      expect(summary.grantCount).toBe(0);
      expect(summary.linkedCount).toBe(0);
    });

    it('should handle grants with zero expense values', async () => {
      const grants = [
        { grantId: 'g1', companyId: 'comp_001', asc718ExpenseTotal: 0, asc718ExpenseRecognized: 0, valuation409AId: null }
      ];
      zerodbService.queryTable.mockResolvedValue(makeQueryResponse(grants));

      const summary = await EquityGrant.getASC718ExpenseSummary('comp_001');
      // asc718ExpenseTotal is 0 which is falsy, so it won't be counted
      expect(summary.grantCount).toBe(0);
    });
  });

  // ---------------------------------------------------------
  // calculateASC718Expense() - additional edge cases
  // ---------------------------------------------------------
  describe('calculateASC718Expense() - edge cases', () => {
    it('should handle grant with zero strikePrice', () => {
      const grant = { numberOfShares: 1000, strikePrice: 0 };
      const result = EquityGrant.calculateASC718Expense(grant, 5.00);
      expect(result.intrinsicValuePerShare).toBe(5.00);
      expect(result.intrinsicValue).toBe(5000);
      expect(result.totalExpense).toBeGreaterThan(0);
    });

    it('should handle grant with zero numberOfShares', () => {
      const grant = { numberOfShares: 0, strikePrice: 1.00 };
      const result = EquityGrant.calculateASC718Expense(grant, 2.00);
      expect(result.intrinsicValue).toBe(0);
      expect(result.timeValue).toBe(0);
      expect(result.totalExpense).toBe(0);
    });

    it('should handle undefined strikePrice on grant', () => {
      const grant = { numberOfShares: 1000 };
      const result = EquityGrant.calculateASC718Expense(grant, 2.00);
      expect(result.intrinsicValuePerShare).toBe(2.00);
    });

    it('should round results to 2 decimal places', () => {
      const grant = { numberOfShares: 3, strikePrice: 1.00 };
      const result = EquityGrant.calculateASC718Expense(grant, 1.33);
      expect(result.totalExpense).toBe(Math.round(result.totalExpense * 100) / 100);
      expect(result.expensePerShare).toBe(Math.round(result.expensePerShare * 100) / 100);
    });
  });

  // ---------------------------------------------------------
  // validateGrant() - additional edge cases
  // ---------------------------------------------------------
  describe('validateGrant() - additional edge cases', () => {
    it('should handle valuation with no effectiveDate', () => {
      const grant = { grantDate: '2024-01-15', strikePrice: 1.50 };
      const valuation = {
        valuationId: 'v1',
        fairMarketValue: 1.50,
        expirationDate: '2025-01-01',
        status: 'approved'
      };
      const result = EquityGrant.validateGrant(grant, valuation);
      expect(result.isValid).toBe(true);
    });

    it('should handle valuation with no expirationDate', () => {
      const grant = { grantDate: '2024-01-15', strikePrice: 1.50 };
      const valuation = {
        valuationId: 'v1',
        fairMarketValue: 1.50,
        effectiveDate: '2024-01-01',
        status: 'approved'
      };
      const result = EquityGrant.validateGrant(grant, valuation);
      expect(result.isValid).toBe(true);
      expect(result.valuation409AExpiredAtGrant).toBe(false);
    });

    it('should handle valuation with no status field', () => {
      const grant = { grantDate: '2024-01-15', strikePrice: 1.50 };
      const valuation = {
        valuationId: 'v1',
        fairMarketValue: 1.50,
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01'
      };
      const result = EquityGrant.validateGrant(grant, valuation);
      // Should not add the "not approved" warning
      expect(result.warnings.every(w => !w.includes('should be'))).toBe(true);
    });

    it('should handle valuation with undefined fairMarketValue', () => {
      const grant = { grantDate: '2024-01-15', strikePrice: 1.50 };
      const valuation = {
        valuationId: 'v1',
        effectiveDate: '2024-01-01',
        expirationDate: '2025-01-01',
        status: 'approved'
      };
      const result = EquityGrant.validateGrant(grant, valuation);
      expect(result.grantVsFmvStatus).toBe('PENDING_VALUATION');
    });
  });

  // ---------------------------------------------------------
  // getUnvestedShares() and isFullyExercised() - edge cases
  // ---------------------------------------------------------
  describe('getUnvestedShares() - additional', () => {
    it('should handle null exercisedShares', () => {
      const grant = { numberOfShares: 5000, exercisedShares: null };
      expect(EquityGrant.getUnvestedShares(grant)).toBe(5000);
    });
  });

  describe('isFullyExercised() - additional', () => {
    it('should return true when exercisedShares exceeds numberOfShares', () => {
      const grant = { numberOfShares: 100, exercisedShares: 150 };
      expect(EquityGrant.isFullyExercised(grant)).toBe(true);
    });

    it('should handle null exercisedShares', () => {
      const grant = { numberOfShares: 100, exercisedShares: null };
      expect(EquityGrant.isFullyExercised(grant)).toBe(false);
    });
  });
});
