/**
 * VestingSchedule Model Unit Tests
 * Issue #78: Implement Automated Vesting Schedules
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

describe('VestingSchedule Model', () => {
  let VestingSchedule;
  let vestingScheduleSchema;

  beforeAll(() => {
    // Require the actual model to test schema definition
    // We need to access the schema through the model
    jest.resetModules();
    const mongoose = require('mongoose');

    // Capture the schema when mongoose.model is called
    const originalModel = mongoose.model;
    mongoose.model = jest.fn((name, schema) => {
      if (name === 'VestingSchedule' && schema) {
        vestingScheduleSchema = schema;
      }
      // Return a mock model
      return { modelName: name, schema: schema };
    });

    // Now require the model which will call mongoose.model
    VestingSchedule = require('../../../models/VestingSchedule');

    // Restore original
    mongoose.model = originalModel;
  });

  describe('Schema Definition', () => {
    it('should have required fields', () => {
      expect(vestingScheduleSchema).toBeDefined();
      const paths = vestingScheduleSchema.paths;

      expect(paths).toHaveProperty('scheduleId');
      expect(paths).toHaveProperty('equityPlanId');
      expect(paths).toHaveProperty('stakeholderId');
      expect(paths).toHaveProperty('totalShares');
      expect(paths).toHaveProperty('grantDate');
      expect(paths).toHaveProperty('vestingStartDate');
    });

    it('should have vesting configuration fields', () => {
      const paths = vestingScheduleSchema.paths;

      expect(paths).toHaveProperty('cliffPeriodMonths');
      expect(paths).toHaveProperty('vestingPeriodMonths');
      expect(paths).toHaveProperty('vestingFrequency');
    });

    it('should have acceleration terms', () => {
      const paths = vestingScheduleSchema.paths;

      expect(paths).toHaveProperty('accelerationTerms');
    });

    it('should have vesting status tracking', () => {
      const paths = vestingScheduleSchema.paths;

      expect(paths).toHaveProperty('vestedShares');
      expect(paths).toHaveProperty('unvestedShares');
      expect(paths).toHaveProperty('lastVestingDate');
      expect(paths).toHaveProperty('nextVestingDate');
    });

    it('should have status enum', () => {
      const statusPath = vestingScheduleSchema.paths.status;
      expect(statusPath.enumValues).toContain('active');
      expect(statusPath.enumValues).toContain('paused');
      expect(statusPath.enumValues).toContain('completed');
      expect(statusPath.enumValues).toContain('terminated');
      expect(statusPath.enumValues).toContain('accelerated');
    });

    it('should have vestingFrequency enum', () => {
      const frequencyPath = vestingScheduleSchema.paths.vestingFrequency;
      expect(frequencyPath.enumValues).toContain('daily');
      expect(frequencyPath.enumValues).toContain('monthly');
      expect(frequencyPath.enumValues).toContain('quarterly');
      expect(frequencyPath.enumValues).toContain('annually');
    });
  });

  describe('Validation', () => {
    it('should require scheduleId to be unique', () => {
      const scheduleIdPath = vestingScheduleSchema.paths.scheduleId;
      expect(scheduleIdPath.options.unique).toBe(true);
      expect(scheduleIdPath.options.required).toBe(true);
    });

    it('should require totalShares to be positive', () => {
      const totalSharesPath = vestingScheduleSchema.paths.totalShares;
      expect(totalSharesPath.options.min).toBe(1);
    });

    it('should have default values for cliff and vesting period', () => {
      const cliffPath = vestingScheduleSchema.paths.cliffPeriodMonths;
      const vestingPath = vestingScheduleSchema.paths.vestingPeriodMonths;

      expect(cliffPath.options.default).toBe(12);
      expect(vestingPath.options.default).toBe(48);
    });

    it('should default vestingFrequency to monthly', () => {
      const frequencyPath = vestingScheduleSchema.paths.vestingFrequency;
      expect(frequencyPath.options.default).toBe('monthly');
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled', () => {
      expect(vestingScheduleSchema.options.timestamps).toBe(true);
    });
  });

  describe('Indexes', () => {
    it('should have index on stakeholderId', () => {
      const stakeholderPath = vestingScheduleSchema.paths.stakeholderId;
      expect(stakeholderPath.options.index).toBe(true);
    });

    it('should have index on equityPlanId', () => {
      const planPath = vestingScheduleSchema.paths.equityPlanId;
      expect(planPath.options.index).toBe(true);
    });

    it('should have index on status', () => {
      const statusPath = vestingScheduleSchema.paths.status;
      expect(statusPath.options.index).toBe(true);
    });
  });
});
