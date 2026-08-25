/**
 * EquityGrant Service - Extended Coverage Tests
 *
 * Covers branches and methods not tested in the base equityGrantService.test.js:
 * - calculateVestedShares: annually frequency, no vestingSchedule, totalMonths field
 * - calculateExercisableShares: fully vested with some exercised
 * - validateExercise: expired grant, post-termination expired, zero/negative shares
 * - getGrantSummary: null grants response, grants with missing exercisedShares
 * - applyTemplate: auto-generate grantId, no grantDate
 * - calculateTotalEquityValue: out-of-the-money, zero exercisedShares
 * - _monthsBetween: edge cases
 */

process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn(),
  count: jest.fn(),
}));

const equityGrantService = require('../../../services/equityGrantService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('EquityGrant Service - Extended Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── calculateVestedShares ────────────────────────────────────────────────

  describe('calculateVestedShares - extended', () => {
    it('should return all shares when no vestingSchedule', () => {
      const grant = {
        numberOfShares: 5000,
        grantDate: new Date('2024-01-15'),
      };

      const result = equityGrantService.calculateVestedShares(grant);

      expect(result.vestedShares).toBe(5000);
      expect(result.vestedPercentage).toBe(100);
      expect(result.unvestedShares).toBe(0);
    });

    it('should handle annually vesting frequency', () => {
      const grant = {
        numberOfShares: 12000,
        grantDate: new Date('2022-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2022-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 0,
          vestingFrequency: 'annually',
        },
      };

      // 18 months later (only 12 months vest due to annual frequency)
      const asOfDate = new Date('2023-07-15');
      const result = equityGrantService.calculateVestedShares(grant, asOfDate);

      expect(result.vestedShares).toBe(3000); // 12/48 * 12000
    });

    it('should use totalMonths when vestingPeriodMonths is missing', () => {
      const grant = {
        numberOfShares: 10000,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          totalMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const asOfDate = new Date('2026-01-15');
      const result = equityGrantService.calculateVestedShares(grant, asOfDate);

      expect(result.vestedShares).toBe(5000);
    });

    it('should use grantDate when vestingStartDate is missing', () => {
      const grant = {
        numberOfShares: 4800,
        grantDate: new Date('2024-06-01'),
        vestingSchedule: {
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const asOfDate = new Date('2025-06-01');
      const result = equityGrantService.calculateVestedShares(grant, asOfDate);

      expect(result.vestedShares).toBe(1200); // 12/48 * 4800
    });

    it('should return monthsUntilNextVest before cliff', () => {
      const grant = {
        numberOfShares: 10000,
        grantDate: new Date(2024, 0, 15), // Jan 15 2024 local
        vestingSchedule: {
          vestingStartDate: new Date(2024, 0, 15),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const asOfDate = new Date(2024, 5, 15); // Jun 15 2024 local = 5 months elapsed
      const result = equityGrantService.calculateVestedShares(grant, asOfDate);

      // 5 months elapsed, 12 month cliff -> 7 months until cliff vest
      expect(result.monthsUntilNextVest).toBe(7);
    });

    it('should mark fullyVested flag when past vesting period', () => {
      const grant = {
        numberOfShares: 1000,
        grantDate: new Date('2020-01-01'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-01'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const asOfDate = new Date('2025-01-01');
      const result = equityGrantService.calculateVestedShares(grant, asOfDate);

      expect(result.fullyVested).toBe(true);
      expect(result.vestedShares).toBe(1000);
    });

    it('should return monthsUntilFullVesting during vesting', () => {
      const grant = {
        numberOfShares: 4800,
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const asOfDate = new Date('2025-01-15');
      const result = equityGrantService.calculateVestedShares(grant, asOfDate);

      expect(result.monthsUntilFullVesting).toBe(36);
    });

    it('should use top-level vestingStartDate', () => {
      const grant = {
        numberOfShares: 10000,
        vestingStartDate: new Date('2024-01-15'),
        grantDate: new Date('2023-12-01'),
        vestingSchedule: {
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const asOfDate = new Date('2025-01-15');
      const result = equityGrantService.calculateVestedShares(grant, asOfDate);

      // Should use vestingStartDate (2024-01-15), not grantDate
      expect(result.vestedShares).toBe(2500);
    });
  });

  // ─── calculateExercisableShares ───────────────────────────────────────────

  describe('calculateExercisableShares - extended', () => {
    it('should return 0 for cancelled grant', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 5000,
        status: 'cancelled',
        grantDate: new Date('2024-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2024-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const result = equityGrantService.calculateExercisableShares(grant);

      expect(result.exercisableShares).toBe(0);
      expect(result.reason).toBe('Grant is not active');
    });

    it('should handle grants with no exercisedShares field', () => {
      const grant = {
        numberOfShares: 10000,
        status: 'active',
        grantDate: new Date('2020-01-01'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-01'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const asOfDate = new Date('2025-01-01');
      const result = equityGrantService.calculateExercisableShares(grant, asOfDate);

      expect(result.exercisableShares).toBe(10000);
      expect(result.alreadyExercised).toBe(0);
    });
  });

  // ─── validateExercise ─────────────────────────────────────────────────────

  describe('validateExercise - extended', () => {
    it('should reject exercise on expired grant', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        expirationDate: '2025-01-01',
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const exerciseDate = new Date('2025-06-01');
      const result = equityGrantService.validateExercise(grant, 1000, exerciseDate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Grant has expired');
    });

    it('should reject when post-termination exercise period has expired', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        terminationDate: '2025-01-01',
        postTerminationExercisePeriodDays: 90,
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      // 91+ days after termination
      const exerciseDate = new Date('2025-05-01');
      const result = equityGrantService.validateExercise(grant, 1000, exerciseDate);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Post-termination exercise period has expired');
    });

    it('should allow exercise within post-termination period', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        terminationDate: '2025-01-01',
        postTerminationExercisePeriodDays: 90,
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      // Within 90 days of termination
      const exerciseDate = new Date('2025-02-15');
      const result = equityGrantService.validateExercise(grant, 1000, exerciseDate);

      expect(result.errors).not.toContain('Post-termination exercise period has expired');
    });

    it('should default to 90 days post-termination period', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        terminationDate: '2025-01-01',
        // no postTerminationExercisePeriodDays
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      // 100 days after termination (past default 90)
      const exerciseDate = new Date('2025-04-11');
      const result = equityGrantService.validateExercise(grant, 1000, exerciseDate);

      expect(result.errors).toContain('Post-termination exercise period has expired');
    });

    it('should reject zero shares', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const result = equityGrantService.validateExercise(grant, 0, new Date('2025-01-15'));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must exercise a positive number of shares');
    });

    it('should reject negative shares', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const result = equityGrantService.validateExercise(grant, -100, new Date('2025-01-15'));

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must exercise a positive number of shares');
    });

    it('should collect multiple errors simultaneously', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'cancelled',
        expirationDate: '2024-01-01',
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const exerciseDate = new Date('2025-06-01');
      const result = equityGrantService.validateExercise(grant, -1, exerciseDate);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should use default exerciseDate when not provided', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        status: 'active',
        grantDate: new Date('2020-01-15'),
        vestingSchedule: {
          vestingStartDate: new Date('2020-01-15'),
          vestingPeriodMonths: 48,
          cliffMonths: 12,
          vestingFrequency: 'monthly',
        },
      };

      const result = equityGrantService.validateExercise(grant, 1000);

      // Should not throw, uses new Date() internally
      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });

  // ─── getGrantSummary ──────────────────────────────────────────────────────

  describe('getGrantSummary - extended', () => {
    it('should handle null response from database', async () => {
      databaseAdapter.find.mockResolvedValue(null);

      const result = await equityGrantService.getGrantSummary('EMP-NULL');

      expect(result.totalGrants).toBe(0);
      expect(result.totalShares).toBe(0);
    });

    it('should handle grants missing exercisedShares field', async () => {
      databaseAdapter.find.mockResolvedValue([
        {
          grantId: 'G1',
          numberOfShares: 10000,
          status: 'active',
          grantType: 'ISO',
          // no exercisedShares
        },
      ]);

      const result = await equityGrantService.getGrantSummary('EMP-1');

      expect(result.totalExercised).toBe(0);
      expect(result.totalUnexercised).toBe(10000);
    });

    it('should group by multiple statuses', async () => {
      databaseAdapter.find.mockResolvedValue([
        {
          grantId: 'G1',
          numberOfShares: 10000,
          exercisedShares: 0,
          status: 'active',
          grantType: 'ISO',
        },
        {
          grantId: 'G2',
          numberOfShares: 5000,
          exercisedShares: 0,
          status: 'pending',
          grantType: 'NSO',
        },
        {
          grantId: 'G3',
          numberOfShares: 3000,
          exercisedShares: 3000,
          status: 'exercised',
          grantType: 'ISO',
        },
      ]);

      const result = await equityGrantService.getGrantSummary('EMP-MULTI');

      expect(result.totalGrants).toBe(3);
      expect(result.grantsByStatus.active.count).toBe(1);
      expect(result.grantsByStatus.pending.count).toBe(1);
      expect(result.grantsByStatus.exercised.count).toBe(1);
      expect(result.grantsByType.ISO.count).toBe(2);
      expect(result.grantsByType.ISO.totalShares).toBe(13000);
      expect(result.grants).toHaveLength(3);
    });
  });

  // ─── applyTemplate ───────────────────────────────────────────────────────

  describe('applyTemplate - extended', () => {
    it('should auto-generate grantId when not provided', () => {
      const result = equityGrantService.applyTemplate(
        'Standard ISO - 4 Year Vesting',
        {
          employeeId: 'EMP-1',
          numberOfShares: 10000,
          grantDate: new Date('2026-01-15'),
        }
      );

      expect(result.grantId).toMatch(/^GRANT-/);
    });

    it('should preserve provided grantId', () => {
      const result = equityGrantService.applyTemplate(
        'Standard ISO - 4 Year Vesting',
        {
          grantId: 'CUSTOM-ID',
          employeeId: 'EMP-1',
          numberOfShares: 10000,
          grantDate: new Date('2026-01-15'),
        }
      );

      expect(result.grantId).toBe('CUSTOM-ID');
    });

    it('should default grantDate to now when not provided', () => {
      const before = Date.now();
      const result = equityGrantService.applyTemplate(
        'Standard NSO - 4 Year Vesting',
        {
          employeeId: 'EMP-1',
          numberOfShares: 5000,
        }
      );
      const after = Date.now();

      const vsDate = result.vestingSchedule.vestingStartDate.getTime();
      expect(vsDate).toBeGreaterThanOrEqual(before);
      expect(vsDate).toBeLessThanOrEqual(after);
    });

    it('should set status to pending', () => {
      const result = equityGrantService.applyTemplate(
        'Advisor NSO - 2 Year Vesting',
        {
          employeeId: 'ADV-1',
          numberOfShares: 2000,
        }
      );

      expect(result.status).toBe('pending');
    });

    it('should apply RSU template with correct properties', () => {
      const result = equityGrantService.applyTemplate(
        'Standard RSU - 4 Year Vesting',
        {
          employeeId: 'EMP-1',
          numberOfShares: 10000,
          grantDate: new Date('2026-01-15'),
        }
      );

      expect(result.grantType).toBe('RSU');
      expect(result.vestingSchedule.vestingFrequency).toBe('quarterly');
      expect(result.postTerminationExercisePeriodDays).toBe(0);
    });

    it('should apply Executive RSU template with no cliff', () => {
      const result = equityGrantService.applyTemplate(
        'Executive RSU - Quarterly Vesting',
        {
          employeeId: 'EXEC-1',
          numberOfShares: 50000,
          grantDate: new Date('2026-01-15'),
        }
      );

      expect(result.vestingSchedule.cliffMonths).toBe(0);
      expect(result.vestingSchedule.vestingFrequency).toBe('quarterly');
    });

    it('should apply Accelerated ISO template', () => {
      const result = equityGrantService.applyTemplate(
        'Accelerated ISO - 3 Year Vesting',
        {
          employeeId: 'EMP-1',
          numberOfShares: 10000,
          grantDate: new Date('2026-01-15'),
        }
      );

      expect(result.grantType).toBe('ISO');
      expect(result.vestingSchedule.vestingPeriodMonths).toBe(36);
      expect(result.vestingSchedule.cliffMonths).toBe(6);
    });
  });

  // ─── calculateTotalEquityValue ────────────────────────────────────────────

  describe('calculateTotalEquityValue - extended', () => {
    it('should handle out-of-the-money (strike > current)', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        strikePrice: 15.0,
      };

      const result = equityGrantService.calculateTotalEquityValue(grant, 10.0);

      expect(result.netValue).toBe(-50000); // (100k - 150k)
      expect(result.spreadPerShare).toBe(-5);
      expect(result.inTheMoney).toBe(false);
    });

    it('should handle zero exercisedShares', () => {
      const grant = {
        numberOfShares: 10000,
        exercisedShares: 0,
        strikePrice: 1.0,
      };

      const result = equityGrantService.calculateTotalEquityValue(grant, 5.0);

      expect(result.remainingShares).toBe(10000);
      expect(result.totalValue).toBe(50000);
      expect(result.exerciseCost).toBe(10000);
      expect(result.netValue).toBe(40000);
      expect(result.inTheMoney).toBe(true);
    });

    it('should handle at-the-money (strike === current)', () => {
      const grant = {
        numberOfShares: 5000,
        exercisedShares: 0,
        strikePrice: 10.0,
      };

      const result = equityGrantService.calculateTotalEquityValue(grant, 10.0);

      expect(result.spreadPerShare).toBe(0);
      expect(result.netValue).toBe(0);
      expect(result.inTheMoney).toBe(false);
    });
  });

  // ─── _monthsBetween ───────────────────────────────────────────────────────

  describe('_monthsBetween - edge cases', () => {
    it('should return 0 when same date', () => {
      const d = new Date(2024, 5, 15); // Jun 15 2024 local
      const result = equityGrantService._monthsBetween(d, d);
      expect(result).toBe(0);
    });

    it('should return 0 when end is before start', () => {
      const result = equityGrantService._monthsBetween(
        new Date(2024, 5, 15), // Jun 15
        new Date(2024, 0, 15)  // Jan 15
      );
      expect(result).toBe(0);
    });

    it('should adjust for partial months (end day < start day)', () => {
      const result = equityGrantService._monthsBetween(
        new Date(2024, 0, 31), // Jan 31
        new Date(2024, 1, 28)  // Feb 28
      );
      // Feb 28 < Jan 31, so months-- = 0
      expect(result).toBe(0);
    });

    it('should handle exact month boundaries', () => {
      const result = equityGrantService._monthsBetween(
        new Date(2024, 0, 15), // Jan 15
        new Date(2024, 6, 15)  // Jul 15
      );
      expect(result).toBe(6);
    });

    it('should handle year boundaries', () => {
      const result = equityGrantService._monthsBetween(
        new Date(2023, 5, 15), // Jun 15 2023
        new Date(2025, 5, 15)  // Jun 15 2025
      );
      expect(result).toBe(24);
    });
  });

  // ─── getGrantTemplates ────────────────────────────────────────────────────

  describe('getGrantTemplates - template count', () => {
    it('should include all 6 defined templates', () => {
      const templates = equityGrantService.getGrantTemplates();
      expect(templates).toHaveLength(6);
    });

    it('should include Advisor NSO template', () => {
      const templates = equityGrantService.getGrantTemplates();
      const advisor = templates.find((t) => t.name.includes('Advisor'));
      expect(advisor).toBeDefined();
      expect(advisor.grantType).toBe('NSO');
      expect(advisor.vestingSchedule.vestingPeriodMonths).toBe(24);
    });
  });
});
