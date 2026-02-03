/**
 * Termination Service Unit Tests
 * Issue #81: Implement Termination Equity Workflow
 * TDD Red Phase: Tests written before implementation
 */

process.env.SKIP_DB_SETUP = 'true';

// Mock the database adapter
jest.mock('../../../services/databaseAdapter', () => ({
  initialized: true,
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn()
}));

const TerminationService = require('../../../services/terminationService');
const databaseAdapter = require('../../../services/databaseAdapter');

describe('TerminationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateVestedShares', () => {
    it('should calculate vested shares for 4-year monthly vesting with 1-year cliff', () => {
      const params = {
        grantDate: new Date('2022-01-01'),
        terminationDate: new Date('2024-07-01'), // 2.5 years
        totalGrantedShares: 10000,
        vestingSchedule: {
          type: 'monthly',
          cliffMonths: 12,
          totalMonths: 48
        }
      };

      const result = TerminationService.calculateVestedShares(params);

      // 30 months elapsed, 12 month cliff passed
      // 30/48 * 10000 = 6250 shares vested
      expect(result.vestedShares).toBe(6250);
      expect(result.unvestedShares).toBe(3750);
      expect(result.vestingPercentage).toBeCloseTo(62.5, 1);
    });

    it('should return 0 vested shares if before cliff', () => {
      const params = {
        grantDate: new Date('2024-01-01'),
        terminationDate: new Date('2024-06-01'), // 5 months, before 12-month cliff
        totalGrantedShares: 10000,
        vestingSchedule: {
          type: 'monthly',
          cliffMonths: 12,
          totalMonths: 48
        }
      };

      const result = TerminationService.calculateVestedShares(params);

      expect(result.vestedShares).toBe(0);
      expect(result.unvestedShares).toBe(10000);
      expect(result.cliffNotMet).toBeTruthy();
    });

    it('should return 100% vested if past vesting period', () => {
      const params = {
        grantDate: new Date('2019-01-01'),
        terminationDate: new Date('2024-01-01'), // 5 years, past 4-year vesting
        totalGrantedShares: 10000,
        vestingSchedule: {
          type: 'monthly',
          cliffMonths: 12,
          totalMonths: 48
        }
      };

      const result = TerminationService.calculateVestedShares(params);

      expect(result.vestedShares).toBe(10000);
      expect(result.unvestedShares).toBe(0);
      expect(result.vestingPercentage).toBe(100);
    });

    it('should handle quarterly vesting correctly', () => {
      const params = {
        grantDate: new Date('2023-01-01'),
        terminationDate: new Date('2024-04-01'), // 15 months = 5 quarters
        totalGrantedShares: 16000,
        vestingSchedule: {
          type: 'quarterly',
          cliffMonths: 12,
          totalMonths: 48 // 16 quarters total
        }
      };

      const result = TerminationService.calculateVestedShares(params);

      // 5 quarters * (16000/16) = 5 * 1000 = 5000 shares
      expect(result.vestedShares).toBe(5000);
    });

    it('should handle immediate vesting correctly', () => {
      const params = {
        grantDate: new Date('2024-01-01'),
        terminationDate: new Date('2024-06-01'),
        totalGrantedShares: 5000,
        vestingSchedule: {
          type: 'immediate',
          cliffMonths: 0,
          totalMonths: 0
        }
      };

      const result = TerminationService.calculateVestedShares(params);

      expect(result.vestedShares).toBe(5000);
      expect(result.unvestedShares).toBe(0);
    });
  });

  describe('calculateExerciseWindow', () => {
    it('should return 90-day exercise window for voluntary termination', () => {
      const params = {
        terminationDate: new Date('2024-06-01'),
        terminationType: 'voluntary',
        equityPlanRules: {
          exerciseWindowDays: {
            voluntary: 90,
            involuntary: 90,
            for_cause: 0,
            death: 365,
            disability: 365
          }
        }
      };

      const result = TerminationService.calculateExerciseWindow(params);

      expect(result.exerciseWindowDays).toBe(90);
      expect(result.exerciseWindowEndDate).toEqual(new Date('2024-08-30'));
    });

    it('should return 0-day exercise window for for_cause termination', () => {
      const params = {
        terminationDate: new Date('2024-06-01'),
        terminationType: 'for_cause',
        equityPlanRules: {
          exerciseWindowDays: {
            voluntary: 90,
            involuntary: 90,
            for_cause: 0,
            death: 365,
            disability: 365
          }
        }
      };

      const result = TerminationService.calculateExerciseWindow(params);

      expect(result.exerciseWindowDays).toBe(0);
      expect(result.immediateForfeiture).toBeTruthy();
    });

    it('should return extended window for death or disability', () => {
      const params = {
        terminationDate: new Date('2024-06-01'),
        terminationType: 'death',
        equityPlanRules: {
          exerciseWindowDays: {
            voluntary: 90,
            involuntary: 90,
            for_cause: 0,
            death: 365,
            disability: 365
          }
        }
      };

      const result = TerminationService.calculateExerciseWindow(params);

      expect(result.exerciseWindowDays).toBe(365);
      expect(result.exerciseWindowEndDate).toEqual(new Date('2025-06-01'));
    });

    it('should use default 90-day window if plan rules not specified', () => {
      const params = {
        terminationDate: new Date('2024-06-01'),
        terminationType: 'voluntary'
      };

      const result = TerminationService.calculateExerciseWindow(params);

      expect(result.exerciseWindowDays).toBe(90);
    });
  });

  describe('processTermination', () => {
    it('should create termination record with calculated values', async () => {
      const terminationData = {
        employeeId: 'emp123',
        companyId: 'comp456',
        terminationDate: new Date('2024-06-01'),
        terminationType: 'voluntary',
        grants: [
          {
            grantId: 'grant1',
            grantDate: new Date('2022-01-01'),
            totalShares: 10000,
            vestingSchedule: {
              type: 'monthly',
              cliffMonths: 12,
              totalMonths: 48
            }
          }
        ]
      };

      const mockCreatedTermination = {
        _id: 'term789',
        terminationId: 'TERM-2024-001',
        ...terminationData,
        vestedSharesAtTermination: 6250,
        unvestedSharesForfeited: 3750,
        exerciseWindowDays: 90,
        exerciseWindowEndDate: new Date('2024-08-30'),
        status: 'exercise_window_open'
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedTermination);

      const result = await TerminationService.processTermination(terminationData);

      expect(databaseAdapter.create).toHaveBeenCalledWith('Termination', expect.objectContaining({
        employeeId: 'emp123',
        companyId: 'comp456',
        terminationType: 'voluntary'
      }));
      expect(result.vestedSharesAtTermination).toBe(6250);
      expect(result.status).toBe('exercise_window_open');
    });

    it('should handle multiple grants', async () => {
      const terminationData = {
        employeeId: 'emp123',
        companyId: 'comp456',
        terminationDate: new Date('2024-06-01'),
        terminationType: 'voluntary',
        grants: [
          {
            grantId: 'grant1',
            grantDate: new Date('2022-01-01'),
            totalShares: 10000,
            vestingSchedule: { type: 'monthly', cliffMonths: 12, totalMonths: 48 }
          },
          {
            grantId: 'grant2',
            grantDate: new Date('2023-01-01'),
            totalShares: 5000,
            vestingSchedule: { type: 'monthly', cliffMonths: 12, totalMonths: 48 }
          }
        ]
      };

      const mockCreatedTermination = {
        _id: 'term789',
        terminationId: 'TERM-2024-001',
        ...terminationData,
        totalGrantedShares: 15000,
        vestedSharesAtTermination: 8125, // 6250 + 1875
        unvestedSharesForfeited: 6875
      };

      databaseAdapter.create.mockResolvedValue(mockCreatedTermination);

      const result = await TerminationService.processTermination(terminationData);

      expect(result.totalGrantedShares).toBe(15000);
    });

    it('should throw error for invalid termination type', async () => {
      const terminationData = {
        employeeId: 'emp123',
        companyId: 'comp456',
        terminationDate: new Date('2024-06-01'),
        terminationType: 'invalid_type',
        grants: []
      };

      await expect(TerminationService.processTermination(terminationData))
        .rejects.toThrow('Invalid termination type');
    });
  });

  describe('calculateRepurchaseRights', () => {
    it('should calculate repurchase rights for unvested shares', () => {
      const params = {
        unvestedShares: 5000,
        originalExercisePrice: 1.00,
        currentFMV: 10.00,
        terminationType: 'voluntary',
        companyPlanRules: {
          repurchaseEnabled: true,
          repurchasePriceMethod: 'lower_of_exercise_or_fmv'
        }
      };

      const result = TerminationService.calculateRepurchaseRights(params);

      expect(result.repurchaseRightEnabled).toBeTruthy();
      expect(result.repurchasePrice).toBe(1.00); // Lower of exercise or FMV
      expect(result.totalRepurchaseValue).toBe(5000);
    });

    it('should disable repurchase for for_cause termination', () => {
      const params = {
        unvestedShares: 5000,
        originalExercisePrice: 1.00,
        currentFMV: 10.00,
        terminationType: 'for_cause',
        companyPlanRules: {
          repurchaseEnabled: true,
          repurchasePriceMethod: 'lower_of_exercise_or_fmv'
        }
      };

      const result = TerminationService.calculateRepurchaseRights(params);

      // For cause terminations typically forfeit all equity
      expect(result.repurchaseRightEnabled).toBeFalsy();
      expect(result.immediateForfeiture).toBeTruthy();
    });

    it('should use FMV when higher than exercise price and method is fmv_only', () => {
      const params = {
        unvestedShares: 5000,
        originalExercisePrice: 1.00,
        currentFMV: 10.00,
        terminationType: 'voluntary',
        companyPlanRules: {
          repurchaseEnabled: true,
          repurchasePriceMethod: 'fmv_only'
        }
      };

      const result = TerminationService.calculateRepurchaseRights(params);

      expect(result.repurchasePrice).toBe(10.00);
      expect(result.totalRepurchaseValue).toBe(50000);
    });
  });

  describe('getExerciseWindowStatus', () => {
    it('should return open status when within exercise window', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'exercise_window_open',
        vestedSharesAtTermination: 5000,
        sharesExercised: 0
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      const result = await TerminationService.getExerciseWindowStatus('term123');

      expect(result.status).toBe('open');
      expect(result.daysRemaining).toBeGreaterThan(25);
      expect(result.sharesAvailableToExercise).toBe(5000);
    });

    it('should return expired status when exercise window has passed', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'exercise_window_expired',
        vestedSharesAtTermination: 5000,
        sharesExercised: 2000
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      const result = await TerminationService.getExerciseWindowStatus('term123');

      expect(result.status).toBe('expired');
      expect(result.daysRemaining).toBe(0);
      expect(result.sharesForfeited).toBe(3000);
    });

    it('should return warning when close to expiry', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: 'exercise_window_open',
        vestedSharesAtTermination: 5000,
        sharesExercised: 1000
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      const result = await TerminationService.getExerciseWindowStatus('term123');

      expect(result.status).toBe('warning');
      expect(result.daysRemaining).toBeLessThanOrEqual(7);
      expect(result.sharesAvailableToExercise).toBe(4000);
    });
  });

  describe('extendExerciseWindow', () => {
    it('should extend exercise window by specified days', async () => {
      // Use future dates to ensure test works correctly
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const extendedDate = new Date(futureDate);
      extendedDate.setDate(extendedDate.getDate() + 30); // Additional 30 days

      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: futureDate,
        exerciseWindowDays: 90,
        exerciseWindowExtended: false
      };

      const updatedTermination = {
        ...mockTermination,
        exerciseWindowEndDate: extendedDate,
        exerciseWindowDays: 120,
        exerciseWindowExtended: true,
        extensionReason: 'Medical leave',
        extensionApprovedBy: 'admin123'
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedTermination);

      const result = await TerminationService.extendExerciseWindow('term123', {
        additionalDays: 30,
        reason: 'Medical leave',
        approvedBy: 'admin123'
      });

      expect(result.exerciseWindowDays).toBe(120);
      expect(result.exerciseWindowExtended).toBeTruthy();
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error if window already expired', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'exercise_window_expired'
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      await expect(TerminationService.extendExerciseWindow('term123', {
        additionalDays: 30,
        reason: 'Late request'
      })).rejects.toThrow('Cannot extend expired exercise window');
    });
  });

  describe('recordExercise', () => {
    it('should record share exercise within window', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        vestedSharesAtTermination: 5000,
        sharesExercised: 0,
        status: 'exercise_window_open'
      };

      const updatedTermination = {
        ...mockTermination,
        sharesExercised: 2000,
        exerciseHistory: [{
          date: new Date(),
          shares: 2000,
          exercisePrice: 1.00,
          fmvAtExercise: 10.00
        }]
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedTermination);

      const result = await TerminationService.recordExercise('term123', {
        shares: 2000,
        exercisePrice: 1.00,
        fmvAtExercise: 10.00
      });

      expect(result.sharesExercised).toBe(2000);
      expect(databaseAdapter.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should throw error if exercise window expired', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'exercise_window_expired'
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      await expect(TerminationService.recordExercise('term123', {
        shares: 2000,
        exercisePrice: 1.00
      })).rejects.toThrow('Exercise window has expired');
    });

    it('should throw error if exceeding available shares', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        vestedSharesAtTermination: 5000,
        sharesExercised: 4000,
        status: 'exercise_window_open'
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      await expect(TerminationService.recordExercise('term123', {
        shares: 2000,
        exercisePrice: 1.00
      })).rejects.toThrow('Insufficient shares available');
    });
  });

  describe('generateTerminationDocuments', () => {
    it('should generate required termination documents', async () => {
      const mockTermination = {
        _id: 'term123',
        terminationId: 'TERM-2024-001',
        employeeId: 'emp123',
        companyId: 'comp456',
        terminationDate: new Date('2024-06-01'),
        terminationType: 'voluntary',
        vestedSharesAtTermination: 5000,
        unvestedSharesForfeited: 2500,
        exerciseWindowDays: 90,
        exerciseWindowEndDate: new Date('2024-08-30')
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      const result = await TerminationService.generateTerminationDocuments('term123');

      expect(result.documents).toBeDefined();
      expect(result.documents).toContainEqual(expect.objectContaining({
        type: 'termination_notice'
      }));
      expect(result.documents).toContainEqual(expect.objectContaining({
        type: 'exercise_window_notification'
      }));
      expect(result.documents).toContainEqual(expect.objectContaining({
        type: 'equity_summary'
      }));
    });

    it('should include forfeiture notice for unvested shares', async () => {
      const mockTermination = {
        _id: 'term123',
        unvestedSharesForfeited: 2500,
        terminationType: 'voluntary'
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);

      const result = await TerminationService.generateTerminationDocuments('term123');

      expect(result.documents).toContainEqual(expect.objectContaining({
        type: 'forfeiture_notice'
      }));
    });
  });

  describe('getTerminationsByCompany', () => {
    it('should retrieve all terminations for a company', async () => {
      const mockTerminations = [
        { _id: 'term1', employeeId: 'emp1', status: 'completed' },
        { _id: 'term2', employeeId: 'emp2', status: 'exercise_window_open' }
      ];

      databaseAdapter.find.mockResolvedValue(mockTerminations);

      const result = await TerminationService.getTerminationsByCompany('comp456');

      expect(databaseAdapter.find).toHaveBeenCalledWith('Termination', { companyId: 'comp456' }, expect.any(Object));
      expect(result).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const mockTerminations = [
        { _id: 'term2', employeeId: 'emp2', status: 'exercise_window_open' }
      ];

      databaseAdapter.find.mockResolvedValue(mockTerminations);

      const result = await TerminationService.getTerminationsByCompany('comp456', {
        status: 'exercise_window_open'
      });

      expect(databaseAdapter.find).toHaveBeenCalledWith('Termination',
        { companyId: 'comp456', status: 'exercise_window_open' },
        expect.any(Object)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('updateTerminationStatus', () => {
    it('should update status when exercise window expires', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'exercise_window_open',
        vestedSharesAtTermination: 5000,
        sharesExercised: 2000
      };

      const updatedTermination = {
        ...mockTermination,
        status: 'exercise_window_expired',
        sharesForfeited: 3000
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedTermination);

      const result = await TerminationService.updateTerminationStatus('term123');

      expect(result.status).toBe('exercise_window_expired');
      expect(result.sharesForfeited).toBe(3000);
    });

    it('should mark as completed when all shares exercised', async () => {
      const mockTermination = {
        _id: 'term123',
        exerciseWindowEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'exercise_window_open',
        vestedSharesAtTermination: 5000,
        sharesExercised: 5000
      };

      const updatedTermination = {
        ...mockTermination,
        status: 'completed'
      };

      databaseAdapter.findById.mockResolvedValue(mockTermination);
      databaseAdapter.findByIdAndUpdate.mockResolvedValue(updatedTermination);

      const result = await TerminationService.updateTerminationStatus('term123');

      expect(result.status).toBe('completed');
    });
  });
});
