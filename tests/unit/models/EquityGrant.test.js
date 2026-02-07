/**
 * EquityGrant Model Unit Tests
 * Issue #77: Create Equity Grant Model and Workflow
 * Issue #266: Link equity grants to 409A valuations for ASC 718 compliance
 *
 * Tests for ZeroDB-based EquityGrant model
 */

// Mock ZeroDB service before requiring the model
jest.mock('../../../services/zerodbService', () => ({
  initialize: jest.fn().mockResolvedValue(true),
  insertRow: jest.fn().mockResolvedValue({ data: [{ row_id: 'test-id', row_data: {} }] }),
  queryTable: jest.fn().mockResolvedValue({ data: [] }),
  updateRows: jest.fn().mockResolvedValue({ modified_count: 1 }),
  deleteRows: jest.fn().mockResolvedValue({ deleted_count: 1 }),
  createTable: jest.fn().mockResolvedValue({}),
  projectId: 'test-project'
}));

const EquityGrant = require('../../../models/EquityGrant');

describe('EquityGrant Model', () => {
  describe('Schema and Constants', () => {
    it('should export GRANT_TYPES enum', () => {
      expect(EquityGrant.GRANT_TYPES).toBeDefined();
      expect(EquityGrant.GRANT_TYPES).toContain('ISO');
      expect(EquityGrant.GRANT_TYPES).toContain('NSO');
      expect(EquityGrant.GRANT_TYPES).toContain('RSU');
      expect(EquityGrant.GRANT_TYPES).toContain('RSA');
    });

    it('should export GRANT_STATUSES enum', () => {
      expect(EquityGrant.GRANT_STATUSES).toBeDefined();
      expect(EquityGrant.GRANT_STATUSES).toContain('pending');
      expect(EquityGrant.GRANT_STATUSES).toContain('approved');
      expect(EquityGrant.GRANT_STATUSES).toContain('active');
      expect(EquityGrant.GRANT_STATUSES).toContain('exercised');
      expect(EquityGrant.GRANT_STATUSES).toContain('cancelled');
      expect(EquityGrant.GRANT_STATUSES).toContain('expired');
    });

    it('should export VESTING_FREQUENCIES enum', () => {
      expect(EquityGrant.VESTING_FREQUENCIES).toBeDefined();
      expect(EquityGrant.VESTING_FREQUENCIES).toContain('monthly');
      expect(EquityGrant.VESTING_FREQUENCIES).toContain('quarterly');
      expect(EquityGrant.VESTING_FREQUENCIES).toContain('annually');
    });

    it('should export PAYMENT_METHODS enum', () => {
      expect(EquityGrant.PAYMENT_METHODS).toBeDefined();
      expect(EquityGrant.PAYMENT_METHODS).toContain('cash');
      expect(EquityGrant.PAYMENT_METHODS).toContain('cashless');
      expect(EquityGrant.PAYMENT_METHODS).toContain('stock_swap');
    });

    it('should have schema with required fields', () => {
      expect(EquityGrant.schema).toBeDefined();
      expect(EquityGrant.schema.grantId).toBeDefined();
      expect(EquityGrant.schema.employeeId).toBeDefined();
      expect(EquityGrant.schema.companyId).toBeDefined();
      expect(EquityGrant.schema.grantType).toBeDefined();
      expect(EquityGrant.schema.numberOfShares).toBeDefined();
      expect(EquityGrant.schema.strikePrice).toBeDefined();
      expect(EquityGrant.schema.grantDate).toBeDefined();
    });

    it('should have tableName set to equity_grants', () => {
      expect(EquityGrant.tableName).toBe('equity_grants');
    });
  });

  describe('Business Logic Methods', () => {
    describe('getUnvestedShares', () => {
      it('should calculate unvested shares correctly', () => {
        const grant = { numberOfShares: 10000, exercisedShares: 2500 };
        expect(EquityGrant.getUnvestedShares(grant)).toBe(7500);
      });

      it('should handle zero exercised shares', () => {
        const grant = { numberOfShares: 10000, exercisedShares: 0 };
        expect(EquityGrant.getUnvestedShares(grant)).toBe(10000);
      });

      it('should handle undefined exercised shares', () => {
        const grant = { numberOfShares: 10000 };
        expect(EquityGrant.getUnvestedShares(grant)).toBe(10000);
      });
    });

    describe('isFullyExercised', () => {
      it('should return true when fully exercised', () => {
        const grant = { numberOfShares: 10000, exercisedShares: 10000 };
        expect(EquityGrant.isFullyExercised(grant)).toBe(true);
      });

      it('should return false when partially exercised', () => {
        const grant = { numberOfShares: 10000, exercisedShares: 5000 };
        expect(EquityGrant.isFullyExercised(grant)).toBe(false);
      });

      it('should return false when not exercised', () => {
        const grant = { numberOfShares: 10000, exercisedShares: 0 };
        expect(EquityGrant.isFullyExercised(grant)).toBe(false);
      });
    });
  });

  // ============================================================
  // Issue #266: 409A Valuation Linkage Tests
  // ============================================================

  describe('409A Valuation Linkage (Issue #266)', () => {
    describe('FMV_SOURCES enum', () => {
      it('should export FMV_SOURCES enum', () => {
        expect(EquityGrant.FMV_SOURCES).toBeDefined();
        expect(Array.isArray(EquityGrant.FMV_SOURCES)).toBe(true);
      });

      it('should include 409A_VALUATION source', () => {
        expect(EquityGrant.FMV_SOURCES).toContain('409A_VALUATION');
      });

      it('should include BOARD_RESOLUTION source', () => {
        expect(EquityGrant.FMV_SOURCES).toContain('BOARD_RESOLUTION');
      });

      it('should include EXTERNAL_APPRAISAL source', () => {
        expect(EquityGrant.FMV_SOURCES).toContain('EXTERNAL_APPRAISAL');
      });

      it('should include SAFE_HARBOR source', () => {
        expect(EquityGrant.FMV_SOURCES).toContain('SAFE_HARBOR');
      });

      it('should include OTHER source', () => {
        expect(EquityGrant.FMV_SOURCES).toContain('OTHER');
      });
    });

    describe('GRANT_FMV_STATUS enum', () => {
      it('should export GRANT_FMV_STATUS enum', () => {
        expect(EquityGrant.GRANT_FMV_STATUS).toBeDefined();
        expect(Array.isArray(EquityGrant.GRANT_FMV_STATUS)).toBe(true);
      });

      it('should include AT_FMV status', () => {
        expect(EquityGrant.GRANT_FMV_STATUS).toContain('AT_FMV');
      });

      it('should include ABOVE_FMV status', () => {
        expect(EquityGrant.GRANT_FMV_STATUS).toContain('ABOVE_FMV');
      });

      it('should include BELOW_FMV status', () => {
        expect(EquityGrant.GRANT_FMV_STATUS).toContain('BELOW_FMV');
      });

      it('should include PENDING_VALUATION status', () => {
        expect(EquityGrant.GRANT_FMV_STATUS).toContain('PENDING_VALUATION');
      });
    });

    describe('Schema 409A fields', () => {
      it('should have valuation409AId field', () => {
        expect(EquityGrant.schema.valuation409AId).toBeDefined();
        expect(EquityGrant.schema.valuation409AId.type).toBe('string');
      });

      it('should have fmvAtGrant field', () => {
        expect(EquityGrant.schema.fmvAtGrant).toBeDefined();
        expect(EquityGrant.schema.fmvAtGrant.type).toBe('number');
      });

      it('should have fmvSource field', () => {
        expect(EquityGrant.schema.fmvSource).toBeDefined();
        expect(EquityGrant.schema.fmvSource.type).toBe('string');
      });

      it('should have grantVsFmvStatus field', () => {
        expect(EquityGrant.schema.grantVsFmvStatus).toBeDefined();
        expect(EquityGrant.schema.grantVsFmvStatus.type).toBe('string');
        expect(EquityGrant.schema.grantVsFmvStatus.default).toBe('PENDING_VALUATION');
      });

      it('should have asc718ExpenseTotal field', () => {
        expect(EquityGrant.schema.asc718ExpenseTotal).toBeDefined();
        expect(EquityGrant.schema.asc718ExpenseTotal.type).toBe('number');
      });

      it('should have asc718ExpenseRecognized field', () => {
        expect(EquityGrant.schema.asc718ExpenseRecognized).toBeDefined();
        expect(EquityGrant.schema.asc718ExpenseRecognized.type).toBe('number');
        expect(EquityGrant.schema.asc718ExpenseRecognized.default).toBe(0);
      });

      it('should have asc718ExpensePerShare field', () => {
        expect(EquityGrant.schema.asc718ExpensePerShare).toBeDefined();
        expect(EquityGrant.schema.asc718ExpensePerShare.type).toBe('number');
      });

      it('should have cheapStockRisk field', () => {
        expect(EquityGrant.schema.cheapStockRisk).toBeDefined();
        expect(EquityGrant.schema.cheapStockRisk.type).toBe('boolean');
        expect(EquityGrant.schema.cheapStockRisk.default).toBe(false);
      });

      it('should have valuation409AExpiredAtGrant field', () => {
        expect(EquityGrant.schema.valuation409AExpiredAtGrant).toBeDefined();
        expect(EquityGrant.schema.valuation409AExpiredAtGrant.type).toBe('boolean');
        expect(EquityGrant.schema.valuation409AExpiredAtGrant.default).toBe(false);
      });
    });

    describe('validateGrant method', () => {
      it('should be a function', () => {
        expect(typeof EquityGrant.validateGrant).toBe('function');
      });

      it('should return invalid result when grant is null', () => {
        const result = EquityGrant.validateGrant(null, null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Grant is required');
      });

      it('should return warning when no valuation provided', () => {
        const grant = { grantId: 'G-001', grantDate: '2024-01-15', strikePrice: 1.50 };
        const result = EquityGrant.validateGrant(grant, null);
        expect(result.isValid).toBe(true);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('No valuation provided');
      });

      it('should detect AT_FMV when strike equals FMV', () => {
        const grant = { grantId: 'G-001', grantDate: '2024-01-15', strikePrice: 1.50 };
        const valuation = {
          valuationId: 'V-001',
          fairMarketValue: 1.50,
          effectiveDate: '2024-01-01',
          expirationDate: '2025-01-01',
          status: 'approved'
        };
        const result = EquityGrant.validateGrant(grant, valuation);
        expect(result.isValid).toBe(true);
        expect(result.grantVsFmvStatus).toBe('AT_FMV');
        expect(result.cheapStockRisk).toBe(false);
      });

      it('should detect ABOVE_FMV when strike exceeds FMV', () => {
        const grant = { grantId: 'G-001', grantDate: '2024-01-15', strikePrice: 2.00 };
        const valuation = {
          valuationId: 'V-001',
          fairMarketValue: 1.50,
          effectiveDate: '2024-01-01',
          expirationDate: '2025-01-01',
          status: 'approved'
        };
        const result = EquityGrant.validateGrant(grant, valuation);
        expect(result.isValid).toBe(true);
        expect(result.grantVsFmvStatus).toBe('ABOVE_FMV');
        expect(result.warnings.some(w => w.includes('above FMV'))).toBe(true);
      });

      it('should detect BELOW_FMV and cheap stock risk when strike is below FMV', () => {
        const grant = { grantId: 'G-001', grantDate: '2024-01-15', strikePrice: 1.00 };
        const valuation = {
          valuationId: 'V-001',
          fairMarketValue: 1.50,
          effectiveDate: '2024-01-01',
          expirationDate: '2025-01-01',
          status: 'approved'
        };
        const result = EquityGrant.validateGrant(grant, valuation);
        expect(result.isValid).toBe(false);
        expect(result.grantVsFmvStatus).toBe('BELOW_FMV');
        expect(result.cheapStockRisk).toBe(true);
        expect(result.errors.some(e => e.includes('cheap stock risk'))).toBe(true);
      });

      it('should detect expired valuation at grant date', () => {
        const grant = { grantId: 'G-001', grantDate: '2025-06-01', strikePrice: 1.50 };
        const valuation = {
          valuationId: 'V-001',
          fairMarketValue: 1.50,
          effectiveDate: '2024-01-01',
          expirationDate: '2025-01-01',
          status: 'approved'
        };
        const result = EquityGrant.validateGrant(grant, valuation);
        expect(result.isValid).toBe(false);
        expect(result.valuation409AExpiredAtGrant).toBe(true);
        expect(result.errors.some(e => e.includes('expired at grant date'))).toBe(true);
      });

      it('should warn when valuation status is not approved', () => {
        const grant = { grantId: 'G-001', grantDate: '2024-01-15', strikePrice: 1.50 };
        const valuation = {
          valuationId: 'V-001',
          fairMarketValue: 1.50,
          effectiveDate: '2024-01-01',
          expirationDate: '2025-01-01',
          status: 'draft_received'
        };
        const result = EquityGrant.validateGrant(grant, valuation);
        expect(result.warnings.some(w => w.includes('should be \'approved\''))).toBe(true);
      });

      it('should warn when grant date is before valuation effective date', () => {
        const grant = { grantId: 'G-001', grantDate: '2023-12-15', strikePrice: 1.50 };
        const valuation = {
          valuationId: 'V-001',
          fairMarketValue: 1.50,
          effectiveDate: '2024-01-01',
          expirationDate: '2025-01-01',
          status: 'approved'
        };
        const result = EquityGrant.validateGrant(grant, valuation);
        expect(result.warnings.some(w => w.includes('before valuation effective date'))).toBe(true);
      });
    });

    describe('calculateASC718Expense method', () => {
      it('should be a function', () => {
        expect(typeof EquityGrant.calculateASC718Expense).toBe('function');
      });

      it('should return zero values when grant is null', () => {
        const result = EquityGrant.calculateASC718Expense(null, 1.50);
        expect(result.totalExpense).toBe(0);
        expect(result.expensePerShare).toBe(0);
        expect(result.intrinsicValue).toBe(0);
        expect(result.timeValue).toBe(0);
      });

      it('should return zero values when FMV is null', () => {
        const grant = { numberOfShares: 10000, strikePrice: 1.00 };
        const result = EquityGrant.calculateASC718Expense(grant, null);
        expect(result.totalExpense).toBe(0);
        expect(result.expensePerShare).toBe(0);
      });

      it('should calculate intrinsic value when FMV exceeds strike', () => {
        const grant = { numberOfShares: 10000, strikePrice: 1.00 };
        const result = EquityGrant.calculateASC718Expense(grant, 2.00);
        expect(result.intrinsicValuePerShare).toBe(1.00);
        expect(result.intrinsicValue).toBe(10000);
      });

      it('should calculate zero intrinsic value when strike exceeds FMV', () => {
        const grant = { numberOfShares: 10000, strikePrice: 2.00 };
        const result = EquityGrant.calculateASC718Expense(grant, 1.00);
        expect(result.intrinsicValuePerShare).toBe(0);
        expect(result.intrinsicValue).toBe(0);
      });

      it('should include time value in calculation', () => {
        const grant = { numberOfShares: 10000, strikePrice: 1.00 };
        const result = EquityGrant.calculateASC718Expense(grant, 1.00);
        expect(result.timeValue).toBeGreaterThan(0);
        expect(result.timeValuePerShare).toBeGreaterThan(0);
      });

      it('should return total expense as sum of intrinsic and time value', () => {
        const grant = { numberOfShares: 10000, strikePrice: 1.00 };
        const result = EquityGrant.calculateASC718Expense(grant, 2.00);
        expect(result.totalExpense).toBe(result.intrinsicValue + result.timeValue);
      });

      it('should calculate expense per share correctly', () => {
        const grant = { numberOfShares: 10000, strikePrice: 1.00 };
        const result = EquityGrant.calculateASC718Expense(grant, 2.00);
        expect(result.expensePerShare).toBe(result.intrinsicValuePerShare + result.timeValuePerShare);
      });

      it('should accept custom volatility option', () => {
        const grant = { numberOfShares: 10000, strikePrice: 1.00 };
        const lowVol = EquityGrant.calculateASC718Expense(grant, 1.00, { volatility: 0.3 });
        const highVol = EquityGrant.calculateASC718Expense(grant, 1.00, { volatility: 0.7 });
        expect(highVol.timeValue).toBeGreaterThan(lowVol.timeValue);
      });

      it('should accept custom expected term option', () => {
        const grant = { numberOfShares: 10000, strikePrice: 1.00 };
        const shortTerm = EquityGrant.calculateASC718Expense(grant, 1.00, { expectedTerm: 3 });
        const longTerm = EquityGrant.calculateASC718Expense(grant, 1.00, { expectedTerm: 10 });
        expect(longTerm.timeValue).toBeGreaterThan(shortTerm.timeValue);
      });
    });

    describe('linkValuation method', () => {
      it('should be an async function', () => {
        expect(typeof EquityGrant.linkValuation).toBe('function');
      });
    });

    describe('updateASC718Expense method', () => {
      it('should be an async function', () => {
        expect(typeof EquityGrant.updateASC718Expense).toBe('function');
      });
    });

    describe('findPendingValuation method', () => {
      it('should be an async function', () => {
        expect(typeof EquityGrant.findPendingValuation).toBe('function');
      });
    });

    describe('findCheapStockRisk method', () => {
      it('should be an async function', () => {
        expect(typeof EquityGrant.findCheapStockRisk).toBe('function');
      });
    });

    describe('getASC718ExpenseSummary method', () => {
      it('should be an async function', () => {
        expect(typeof EquityGrant.getASC718ExpenseSummary).toBe('function');
      });
    });
  });

  describe('Base Model Methods', () => {
    it('should have find method', () => {
      expect(typeof EquityGrant.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof EquityGrant.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof EquityGrant.findById).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof EquityGrant.create).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof EquityGrant.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof EquityGrant.deleteOne).toBe('function');
    });

    it('should have findByGrantId method', () => {
      expect(typeof EquityGrant.findByGrantId).toBe('function');
    });

    it('should have findByEmployee method', () => {
      expect(typeof EquityGrant.findByEmployee).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof EquityGrant.findByCompany).toBe('function');
    });

    it('should have recordExercise method', () => {
      expect(typeof EquityGrant.recordExercise).toBe('function');
    });

    it('should have approve method', () => {
      expect(typeof EquityGrant.approve).toBe('function');
    });

    it('should have cancel method', () => {
      expect(typeof EquityGrant.cancel).toBe('function');
    });
  });
});
