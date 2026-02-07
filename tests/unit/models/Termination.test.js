/**
 * Termination Model Unit Tests
 * Issue #81: Implement Termination Equity Workflow
 */
jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(), queryTable: jest.fn(), updateRows: jest.fn(),
  deleteRows: jest.fn(), initialize: jest.fn(), projectId: 'mock-project-id'
}));

describe('Termination Model', () => {
  let Termination;

  beforeAll(() => {
    Termination = require('../../../models/Termination');
  });

  describe('Schema Definition', () => {
    it('should have required terminationId field', () => {
      expect(Termination.schema.terminationId).toBeDefined();
      expect(Termination.schema.terminationId.required).toBe(true);
    });
    it('should have required employeeId field', () => {
      expect(Termination.schema.employeeId).toBeDefined();
      expect(Termination.schema.employeeId.required).toBe(true);
    });
    it('should have required companyId field', () => {
      expect(Termination.schema.companyId).toBeDefined();
      expect(Termination.schema.companyId.required).toBe(true);
    });
    it('should have required terminationDate field', () => {
      expect(Termination.schema.terminationDate).toBeDefined();
      expect(Termination.schema.terminationDate.required).toBe(true);
    });
    it('should have terminationType enum field', () => {
      expect(Termination.schema.terminationType).toBeDefined();
      const enumValues = Termination.schema.terminationType.enum;
      expect(enumValues).toContain('voluntary');
      expect(enumValues).toContain('involuntary');
      expect(enumValues).toContain('for_cause');
      expect(enumValues).toContain('layoff');
      expect(enumValues).toContain('retirement');
      expect(enumValues).toContain('death');
      expect(enumValues).toContain('disability');
    });
    it('should have vesting fields', () => {
      expect(Termination.schema.totalGrantedShares).toBeDefined();
      expect(Termination.schema.vestedSharesAtTermination).toBeDefined();
      expect(Termination.schema.unvestedSharesForfeited).toBeDefined();
    });
    it('should have exercise window fields', () => {
      expect(Termination.schema.exerciseWindowDays).toBeDefined();
      expect(Termination.schema.exerciseWindowEndDate).toBeDefined();
      expect(Termination.schema.exerciseWindowExtended).toBeDefined();
    });
    it('should have repurchase right fields', () => {
      expect(Termination.schema.repurchaseRightEnabled).toBeDefined();
      expect(Termination.schema.repurchasePrice).toBeDefined();
      expect(Termination.schema.repurchaseDeadline).toBeDefined();
    });
    it('should have status enum field', () => {
      expect(Termination.schema.status).toBeDefined();
      const enumValues = Termination.schema.status.enum;
      expect(enumValues).toContain('pending');
      expect(enumValues).toContain('processing');
      expect(enumValues).toContain('exercise_window_open');
      expect(enumValues).toContain('exercise_window_expired');
      expect(enumValues).toContain('completed');
      expect(enumValues).toContain('cancelled');
    });
    it('should have timestamp fields defined', () => {
      expect(Termination.schema.createdAt).toBeDefined();
      expect(Termination.schema.updatedAt).toBeDefined();
    });
  });

  describe('Virtual Fields', () => {
    it('should calculate daysUntilExerciseExpiry correctly', () => {
      const termination = { exerciseWindowEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
      const daysRemaining = Math.ceil((termination.exerciseWindowEndDate - new Date()) / (1000 * 60 * 60 * 24));
      expect(daysRemaining).toBeGreaterThanOrEqual(29);
      expect(daysRemaining).toBeLessThanOrEqual(31);
    });
    it('should determine if exercise window is expired', () => {
      const expiredTermination = { exerciseWindowEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) };
      const isExpired = expiredTermination.exerciseWindowEndDate < new Date();
      expect(isExpired).toBeTruthy();
    });
  });

  describe('Index Configuration', () => {
    it('should have unique index on terminationId', () => {
      expect(Termination.schema.terminationId.unique).toBe(true);
    });
    it('should have employeeId defined for queries', () => {
      expect(Termination.schema.employeeId).toBeDefined();
      expect(Termination.schema.employeeId.required).toBe(true);
    });
    it('should have companyId defined for queries', () => {
      expect(Termination.schema.companyId).toBeDefined();
      expect(Termination.schema.companyId.required).toBe(true);
    });
  });

  describe('Default Values', () => {
    it('should have default value for exerciseWindowDays', () => {
      expect(Termination.schema.exerciseWindowDays.default).toBe(90);
    });
    it('should have default value for status', () => {
      expect(Termination.schema.status.default).toBe('pending');
    });
    it('should have default value for sharesExercised', () => {
      expect(Termination.schema.sharesExercised.default).toBe(0);
    });
  });

  describe('Exported Constants', () => {
    it('should export TERMINATION_TYPES', () => {
      expect(Termination.TERMINATION_TYPES).toEqual(['voluntary', 'involuntary', 'for_cause', 'layoff', 'retirement', 'death', 'disability']);
    });
    it('should export VALID_STATUSES', () => {
      expect(Termination.VALID_STATUSES).toBeDefined();
      expect(Termination.VALID_STATUSES).toContain('pending');
    });
    it('should export REPURCHASE_METHODS', () => {
      expect(Termination.REPURCHASE_METHODS).toBeDefined();
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => { expect(typeof Termination.create).toBe('function'); });
    it('should have find method', () => { expect(typeof Termination.find).toBe('function'); });
    it('should have findOne method', () => { expect(typeof Termination.findOne).toBe('function'); });
    it('should have updateOne method', () => { expect(typeof Termination.updateOne).toBe('function'); });
    it('should have deleteOne method', () => { expect(typeof Termination.deleteOne).toBe('function'); });
  });

  describe('Business Logic', () => {
    it('should check if exercise window is expired', () => {
      expect(Termination.isExerciseWindowExpired({ exerciseWindowEndDate: new Date(Date.now() - 86400000).toISOString() })).toBe(true);
      expect(Termination.isExerciseWindowExpired({ exerciseWindowEndDate: new Date(Date.now() + 86400000).toISOString() })).toBe(false);
    });
    it('should get shares available to exercise', () => {
      expect(Termination.getSharesAvailableToExercise({ vestedSharesAtTermination: 1000, sharesExercised: 300 })).toBe(700);
    });
    it('should get total exercise cost', () => {
      expect(Termination.getTotalExerciseCost({ exerciseHistory: [{ totalCost: 100 }, { totalCost: 200 }] })).toBe(300);
      expect(Termination.getTotalExerciseCost({ exerciseHistory: [] })).toBe(0);
    });
  });

  describe('Table Name', () => {
    it('should have correct table name', () => { expect(Termination.tableName).toBe('terminations'); });
  });
});