/**
 * VestingSchedule Model Unit Tests
 * Issue #78: Implement Automated Vesting Schedules
 *
 * Tests for the VestingSchedule ZeroDB model including schema structure,
 * field definitions, constants, and CRUD method existence.
 */

const VestingSchedule = require('../../../models/VestingSchedule');

describe('VestingSchedule Model', () => {
  describe('Schema Definition', () => {
    it('should have a schema defined', () => {
      expect(VestingSchedule.schema).toBeDefined();
      expect(typeof VestingSchedule.schema).toBe('object');
    });

    it('should have required fields', () => {
      expect(VestingSchedule.schema.scheduleId).toBeDefined();
      expect(VestingSchedule.schema.scheduleId.required).toBe(true);
      expect(VestingSchedule.schema.scheduleId.unique).toBe(true);

      expect(VestingSchedule.schema.equityPlanId).toBeDefined();
      expect(VestingSchedule.schema.equityPlanId.required).toBe(true);

      expect(VestingSchedule.schema.stakeholderId).toBeDefined();
      expect(VestingSchedule.schema.stakeholderId.required).toBe(true);

      expect(VestingSchedule.schema.totalShares).toBeDefined();
      expect(VestingSchedule.schema.totalShares.required).toBe(true);

      expect(VestingSchedule.schema.grantDate).toBeDefined();
      expect(VestingSchedule.schema.grantDate.required).toBe(true);

      expect(VestingSchedule.schema.vestingStartDate).toBeDefined();
      expect(VestingSchedule.schema.vestingStartDate.required).toBe(true);
    });

    it('should have vesting configuration fields', () => {
      expect(VestingSchedule.schema.cliffPeriodMonths).toBeDefined();
      expect(VestingSchedule.schema.vestingPeriodMonths).toBeDefined();
      expect(VestingSchedule.schema.vestingFrequency).toBeDefined();
    });

    it('should have acceleration terms field', () => {
      expect(VestingSchedule.schema.accelerationTerms).toBeDefined();
      expect(VestingSchedule.schema.accelerationTerms.type).toBe('object');
    });

    it('should have vesting status tracking fields', () => {
      expect(VestingSchedule.schema.vestedShares).toBeDefined();
      expect(VestingSchedule.schema.unvestedShares).toBeDefined();
      expect(VestingSchedule.schema.lastVestingDate).toBeDefined();
      expect(VestingSchedule.schema.nextVestingDate).toBeDefined();
    });

    it('should have status field with correct enum values', () => {
      expect(VestingSchedule.schema.status).toBeDefined();
      expect(VestingSchedule.schema.status.enum).toContain('active');
      expect(VestingSchedule.schema.status.enum).toContain('paused');
      expect(VestingSchedule.schema.status.enum).toContain('completed');
      expect(VestingSchedule.schema.status.enum).toContain('terminated');
      expect(VestingSchedule.schema.status.enum).toContain('accelerated');
    });

    it('should have vestingFrequency field with correct enum values', () => {
      expect(VestingSchedule.schema.vestingFrequency.enum).toContain('daily');
      expect(VestingSchedule.schema.vestingFrequency.enum).toContain('monthly');
      expect(VestingSchedule.schema.vestingFrequency.enum).toContain('quarterly');
      expect(VestingSchedule.schema.vestingFrequency.enum).toContain('annually');
    });

    it('should have grantType field with correct enum values', () => {
      expect(VestingSchedule.schema.grantType).toBeDefined();
      expect(VestingSchedule.schema.grantType.enum).toContain('ISO');
      expect(VestingSchedule.schema.grantType.enum).toContain('NSO');
      expect(VestingSchedule.schema.grantType.enum).toContain('RSA');
      expect(VestingSchedule.schema.grantType.enum).toContain('RSU');
    });

    it('should have termination fields', () => {
      expect(VestingSchedule.schema.terminationDate).toBeDefined();
      expect(VestingSchedule.schema.terminationType).toBeDefined();
      expect(VestingSchedule.schema.terminationType.enum).toBeDefined();
    });

    it('should have acceleration fields', () => {
      expect(VestingSchedule.schema.accelerationDate).toBeDefined();
      expect(VestingSchedule.schema.accelerationType).toBeDefined();
      expect(VestingSchedule.schema.acceleratedShares).toBeDefined();
    });

    it('should have vestingHistory as array', () => {
      expect(VestingSchedule.schema.vestingHistory).toBeDefined();
      expect(VestingSchedule.schema.vestingHistory.type).toBe('array');
    });

    it('should have timestamp fields', () => {
      expect(VestingSchedule.schema.createdAt).toBeDefined();
      expect(VestingSchedule.schema.updatedAt).toBeDefined();
    });
  });

  describe('Default Values', () => {
    it('should default cliffPeriodMonths to 12', () => {
      expect(VestingSchedule.schema.cliffPeriodMonths.default).toBe(12);
    });

    it('should default vestingPeriodMonths to 48', () => {
      expect(VestingSchedule.schema.vestingPeriodMonths.default).toBe(48);
    });

    it('should default vestingFrequency to monthly', () => {
      expect(VestingSchedule.schema.vestingFrequency.default).toBe('monthly');
    });

    it('should default status to active', () => {
      expect(VestingSchedule.schema.status.default).toBe('active');
    });

    it('should default grantType to ISO', () => {
      expect(VestingSchedule.schema.grantType.default).toBe('ISO');
    });

    it('should default vestedShares to 0', () => {
      expect(VestingSchedule.schema.vestedShares.default).toBe(0);
    });

    it('should default unvestedShares to 0', () => {
      expect(VestingSchedule.schema.unvestedShares.default).toBe(0);
    });

    it('should default exercisePrice to 0', () => {
      expect(VestingSchedule.schema.exercisePrice.default).toBe(0);
    });

    it('should default pausedDays to 0', () => {
      expect(VestingSchedule.schema.pausedDays.default).toBe(0);
    });
  });

  describe('Constants', () => {
    it('should export GRANT_TYPES', () => {
      expect(VestingSchedule.GRANT_TYPES).toBeDefined();
      expect(VestingSchedule.GRANT_TYPES).toEqual(['ISO', 'NSO', 'RSA', 'RSU', 'SAR', 'phantom']);
    });

    it('should export VESTING_FREQUENCIES', () => {
      expect(VestingSchedule.VESTING_FREQUENCIES).toBeDefined();
      expect(VestingSchedule.VESTING_FREQUENCIES).toEqual(['daily', 'monthly', 'quarterly', 'annually']);
    });

    it('should export VALID_STATUSES', () => {
      expect(VestingSchedule.VALID_STATUSES).toBeDefined();
      expect(VestingSchedule.VALID_STATUSES).toEqual(['active', 'paused', 'completed', 'terminated', 'accelerated']);
    });

    it('should export TERMINATION_TYPES', () => {
      expect(VestingSchedule.TERMINATION_TYPES).toBeDefined();
      expect(VestingSchedule.TERMINATION_TYPES).toContain('voluntary');
      expect(VestingSchedule.TERMINATION_TYPES).toContain('involuntary_without_cause');
    });

    it('should export ACCELERATION_TYPES', () => {
      expect(VestingSchedule.ACCELERATION_TYPES).toBeDefined();
      expect(VestingSchedule.ACCELERATION_TYPES).toEqual(['single_trigger', 'double_trigger', 'board_discretion']);
    });

    it('should export TRIGGER_EVENTS', () => {
      expect(VestingSchedule.TRIGGER_EVENTS).toBeDefined();
      expect(VestingSchedule.TRIGGER_EVENTS).toEqual(['change_of_control', 'ipo', 'merger', 'acquisition']);
    });

    it('should export VESTING_EVENT_TYPES', () => {
      expect(VestingSchedule.VESTING_EVENT_TYPES).toBeDefined();
      expect(VestingSchedule.VESTING_EVENT_TYPES).toEqual(['cliff', 'periodic', 'acceleration', 'manual']);
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => {
      expect(typeof VestingSchedule.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof VestingSchedule.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof VestingSchedule.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof VestingSchedule.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof VestingSchedule.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof VestingSchedule.deleteOne).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof VestingSchedule.countDocuments).toBe('function');
    });
  });

  describe('Custom Methods', () => {
    it('should have findByScheduleId method', () => {
      expect(typeof VestingSchedule.findByScheduleId).toBe('function');
    });

    it('should have findByStakeholder method', () => {
      expect(typeof VestingSchedule.findByStakeholder).toBe('function');
    });

    it('should have findByEquityPlan method', () => {
      expect(typeof VestingSchedule.findByEquityPlan).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof VestingSchedule.findByCompany).toBe('function');
    });

    it('should have pause method', () => {
      expect(typeof VestingSchedule.pause).toBe('function');
    });

    it('should have resume method', () => {
      expect(typeof VestingSchedule.resume).toBe('function');
    });

    it('should have terminate method', () => {
      expect(typeof VestingSchedule.terminate).toBe('function');
    });

    it('should have accelerate method', () => {
      expect(typeof VestingSchedule.accelerate).toBe('function');
    });

    it('should have addVestingEvent method', () => {
      expect(typeof VestingSchedule.addVestingEvent).toBe('function');
    });
  });

  describe('Business Logic', () => {
    it('getVestingPercentage should calculate correctly', () => {
      const schedule = { vestedShares: 250, totalShares: 1000 };
      expect(VestingSchedule.getVestingPercentage(schedule)).toBe(25);
    });

    it('getVestingPercentage should return 0 when totalShares is 0', () => {
      const schedule = { vestedShares: 0, totalShares: 0 };
      expect(VestingSchedule.getVestingPercentage(schedule)).toBe(0);
    });

    it('cliffPassed should return true when no cliff date', () => {
      expect(VestingSchedule.cliffPassed({ cliffDate: null })).toBe(true);
    });

    it('cliffPassed should return true for past cliff date', () => {
      const pastDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(VestingSchedule.cliffPassed({ cliffDate: pastDate })).toBe(true);
    });

    it('cliffPassed should return false for future cliff date', () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      expect(VestingSchedule.cliffPassed({ cliffDate: futureDate })).toBe(false);
    });

    it('isFullyVested should return true when all shares vested', () => {
      expect(VestingSchedule.isFullyVested({ vestedShares: 1000, totalShares: 1000 })).toBe(true);
    });

    it('isFullyVested should return false when shares remain', () => {
      expect(VestingSchedule.isFullyVested({ vestedShares: 500, totalShares: 1000 })).toBe(false);
    });
  });
});
