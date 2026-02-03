/**
 * EquityGrant Service Unit Tests
 * Issue #77: Create Equity Grant Model and Workflow
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock must be before any requires
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn()
}));

const equityGrantService = require('../../../services/equityGrantService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('EquityGrant Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateVestedShares', () => {
    it('should return 0 vested shares before cliff', () => {
      const grant = {
        numberOfShares: 10000,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      // Test 6 months after grant (before cliff)
      const vestedDate = new Date('2024-07-15');
      const result = equityGrantService.calculateVestedShares(grant, vestedDate);

      expect(result.vestedShares).toBe(0);
      expect(result.vestedPercentage).toBe(0);
    });

    it('should return cliff amount at cliff date', () => {
      const grant = {
        numberOfShares: 10000,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      // Test exactly at cliff (12 months)
      const vestedDate = new Date('2025-01-15');
      const result = equityGrantService.calculateVestedShares(grant, vestedDate);

      expect(result.vestedShares).toBe(2500); // 25% at cliff
      expect(result.vestedPercentage).toBe(25);
    });

    it('should calculate monthly vesting after cliff', () => {
      const grant = {
        numberOfShares: 10000,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      // Test 24 months after grant (50% vested)
      const vestedDate = new Date('2026-01-15');
      const result = equityGrantService.calculateVestedShares(grant, vestedDate);

      expect(result.vestedShares).toBe(5000);
      expect(result.vestedPercentage).toBe(50);
    });

    it('should return 100% vested after full vesting period', () => {
      const grant = {
        numberOfShares: 10000,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      // Test 60 months after grant (past full vesting)
      const vestedDate = new Date('2029-01-15');
      const result = equityGrantService.calculateVestedShares(grant, vestedDate);

      expect(result.vestedShares).toBe(10000);
      expect(result.vestedPercentage).toBe(100);
    });

    it('should handle quarterly vesting frequency', () => {
      const grant = {
        numberOfShares: 10000,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'quarterly'
        }
      };

      // Test 15 months (should only vest up to last quarter)
      const vestedDate = new Date('2025-04-15');
      const result = equityGrantService.calculateVestedShares(grant, vestedDate);

      // At 15 months with quarterly vesting, vests at 12 months (cliff)
      expect(result.vestedShares).toBeGreaterThanOrEqual(2500);
    });
  });

  describe('calculateExercisableShares', () => {
    it('should calculate exercisable shares correctly', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 2500,
        grantDate: new Date('2024-01-15'),
        status: 'active',
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      // At 24 months, 5000 shares vested, 2500 already exercised
      const asOfDate = new Date('2026-01-15');
      const result = equityGrantService.calculateExercisableShares(grant, asOfDate);

      expect(result.exercisableShares).toBe(2500); // 5000 vested - 2500 exercised
      expect(result.totalVested).toBe(5000);
      expect(result.alreadyExercised).toBe(2500);
    });

    it('should return 0 for non-active grants', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'pending',
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      const result = equityGrantService.calculateExercisableShares(grant, new Date());

      expect(result.exercisableShares).toBe(0);
    });
  });

  describe('generateGrantId', () => {
    it('should generate unique grant IDs', () => {
      const id1 = equityGrantService.generateGrantId();
      const id2 = equityGrantService.generateGrantId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should start with GRANT prefix', () => {
      const id = equityGrantService.generateGrantId();

      expect(id).toMatch(/^GRANT-/);
    });
  });

  describe('validateExercise', () => {
    it('should validate exercise is within limits', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      // At 24 months, 5000 vested
      const exerciseDate = new Date('2026-01-15');
      const result = equityGrantService.validateExercise(grant, 2500, exerciseDate);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject exercise exceeding vested shares', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly'
        }
      };

      // At 24 months, only 5000 vested, trying to exercise 6000
      const exerciseDate = new Date('2026-01-15');
      const result = equityGrantService.validateExercise(grant, 6000, exerciseDate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Requested shares exceed exercisable amount');
    });

    it('should reject exercise on non-active grant', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'cancelled'
      };

      const result = equityGrantService.validateExercise(grant, 1000, new Date());

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Grant is not active');
    });
  });

  describe('getGrantSummary', () => {
    it('should return comprehensive grant summary', async () => {
      const mockGrants = [
        {
          _id: 'grant1',
          numberOfShares: 10000,
          exercisedShares: 2500,
          status: 'active',
          grantType: 'ISO'
        },
        {
          _id: 'grant2',
          numberOfShares: 5000,
          exercisedShares: 0,
          status: 'active',
          grantType: 'RSU'
        }
      ];

      databaseAdapter.find.mockResolvedValue(mockGrants);

      const result = await equityGrantService.getGrantSummary('EMP-001');

      expect(result.totalGrants).toBe(2);
      expect(result.totalShares).toBe(15000);
      expect(result.totalExercised).toBe(2500);
      expect(result.grantsByType).toHaveProperty('ISO');
      expect(result.grantsByType).toHaveProperty('RSU');
    });

    it('should handle employee with no grants', async () => {
      databaseAdapter.find.mockResolvedValue([]);

      const result = await equityGrantService.getGrantSummary('EMP-NO-GRANTS');

      expect(result.totalGrants).toBe(0);
      expect(result.totalShares).toBe(0);
    });
  });

  describe('getGrantTemplates', () => {
    it('should return all available templates', () => {
      const templates = equityGrantService.getGrantTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThanOrEqual(3);
    });

    it('should include ISO template', () => {
      const templates = equityGrantService.getGrantTemplates();
      const isoTemplate = templates.find(t => t.grantType === 'ISO');

      expect(isoTemplate).toBeDefined();
      expect(isoTemplate.vestingSchedule).toBeDefined();
      expect(isoTemplate.vestingSchedule.vestingPeriodMonths).toBe(48);
    });

    it('should include NSO template', () => {
      const templates = equityGrantService.getGrantTemplates();
      const nsoTemplate = templates.find(t => t.grantType === 'NSO');

      expect(nsoTemplate).toBeDefined();
    });

    it('should include RSU template', () => {
      const templates = equityGrantService.getGrantTemplates();
      const rsuTemplate = templates.find(t => t.grantType === 'RSU');

      expect(rsuTemplate).toBeDefined();
    });
  });

  describe('applyTemplate', () => {
    it('should apply template to grant data', () => {
      const templateName = 'Standard ISO - 4 Year Vesting';
      const grantData = {
        employeeId: 'EMP-001',
        companyId: 'COMP-001',
        numberOfShares: 10000,
        strikePrice: 1.50,
        grantDate: new Date('2024-01-15')
      };

      const result = equityGrantService.applyTemplate(templateName, grantData);

      expect(result.grantType).toBe('ISO');
      expect(result.vestingSchedule.vestingPeriodMonths).toBe(48);
      expect(result.vestingSchedule.cliffMonths).toBe(12);
      expect(result.employeeId).toBe('EMP-001');
      expect(result.numberOfShares).toBe(10000);
    });

    it('should throw error for invalid template', () => {
      const grantData = {
        employeeId: 'EMP-001',
        numberOfShares: 10000
      };

      expect(() => {
        equityGrantService.applyTemplate('Invalid Template', grantData);
      }).toThrow('Template not found');
    });
  });

  describe('calculateTotalEquityValue', () => {
    it('should calculate total equity value', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 2500,
        strikePrice: 1.50
      };
      const currentPrice = 10.00;

      const result = equityGrantService.calculateTotalEquityValue(grant, currentPrice);

      expect(result.totalValue).toBe(75000); // (10000 - 2500) * 10.00
      expect(result.exerciseCost).toBe(11250); // (10000 - 2500) * 1.50
      expect(result.netValue).toBe(63750); // 75000 - 11250
    });
  });
});
