/**
 * Vesting Calculator Service Unit Tests
 * Issue #78: Implement Automated Vesting Schedules
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const VestingCalculatorService = require('../../../services/vestingCalculatorService');

describe('VestingCalculatorService', () => {
  describe('calculateVestedShares', () => {
    const baseSchedule = {
      totalShares: 10000,
      grantDate: new Date('2023-01-01'),
      vestingStartDate: new Date('2023-01-01'),
      cliffPeriodMonths: 12,
      vestingPeriodMonths: 48,
      vestingFrequency: 'monthly'
    };

    it('should return 0 shares before cliff date', () => {
      const schedule = { ...baseSchedule };
      const calculationDate = new Date('2023-06-01'); // 6 months, before 12 month cliff

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      expect(result.vestedShares).toBe(0);
      expect(result.unvestedShares).toBe(10000);
      expect(result.vestingPercentage).toBe(0);
    });

    it('should vest cliff amount at cliff date', () => {
      const schedule = { ...baseSchedule };
      const calculationDate = new Date('2024-01-01'); // Exactly 12 months

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      // 12 months / 48 months = 25% at cliff
      expect(result.vestedShares).toBe(2500);
      expect(result.unvestedShares).toBe(7500);
      expect(result.vestingPercentage).toBe(25);
    });

    it('should calculate monthly vesting after cliff', () => {
      const schedule = { ...baseSchedule };
      const calculationDate = new Date('2024-07-01'); // 18 months

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      // 18 months / 48 months = 37.5%
      expect(result.vestedShares).toBe(3750);
      expect(result.unvestedShares).toBe(6250);
      expect(result.vestingPercentage).toBe(37.5);
    });

    it('should return 100% after full vesting period', () => {
      const schedule = { ...baseSchedule };
      const calculationDate = new Date('2027-02-01'); // 49 months, past 48 month vesting

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      expect(result.vestedShares).toBe(10000);
      expect(result.unvestedShares).toBe(0);
      expect(result.vestingPercentage).toBe(100);
    });

    it('should handle quarterly vesting frequency', () => {
      const schedule = {
        ...baseSchedule,
        vestingFrequency: 'quarterly'
      };
      const calculationDate = new Date('2024-02-15'); // 13.5 months - should only count 12 months (4 quarters)

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      // Only 4 full quarters = 12 months = 25%
      expect(result.vestedShares).toBe(2500);
      expect(result.vestingPercentage).toBe(25);
    });

    it('should handle annual vesting frequency', () => {
      const schedule = {
        ...baseSchedule,
        vestingFrequency: 'annually'
      };
      const calculationDate = new Date('2025-06-01'); // 29 months - should only count 24 months (2 years)

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      // Only 2 full years = 24 months = 50%
      expect(result.vestedShares).toBe(5000);
      expect(result.vestingPercentage).toBe(50);
    });

    it('should return 0 for future grant dates', () => {
      const schedule = {
        ...baseSchedule,
        grantDate: new Date('2025-01-01'),
        vestingStartDate: new Date('2025-01-01')
      };
      const calculationDate = new Date('2024-06-01');

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      expect(result.vestedShares).toBe(0);
      expect(result.unvestedShares).toBe(10000);
    });

    it('should handle no cliff period', () => {
      const schedule = {
        ...baseSchedule,
        cliffPeriodMonths: 0
      };
      const calculationDate = new Date('2023-02-01'); // 1 month

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      // 1 month / 48 months = 2.08333...% - rounds down to 208 shares (monthly)
      expect(result.vestedShares).toBeCloseTo(208, 0);
    });
  });

  describe('calculateAcceleration', () => {
    const baseSchedule = {
      totalShares: 10000,
      grantDate: new Date('2023-01-01'),
      vestingStartDate: new Date('2023-01-01'),
      cliffPeriodMonths: 12,
      vestingPeriodMonths: 48,
      vestingFrequency: 'monthly',
      accelerationTerms: {
        singleTrigger: {
          enabled: false,
          accelerationPercentage: 0
        },
        doubleTrigger: {
          enabled: true,
          accelerationPercentage: 100
        }
      }
    };

    it('should apply single trigger acceleration', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: {
            enabled: true,
            accelerationPercentage: 100
          },
          doubleTrigger: { enabled: false, accelerationPercentage: 0 }
        }
      };
      const calculationDate = new Date('2024-01-01');
      const accelerationEvent = {
        type: 'change_of_control',
        date: new Date('2024-01-01')
      };

      const result = VestingCalculatorService.calculateAcceleration(
        schedule,
        calculationDate,
        accelerationEvent
      );

      expect(result.acceleratedShares).toBe(10000);
      expect(result.accelerationType).toBe('single_trigger');
    });

    it('should apply double trigger acceleration only with both conditions', () => {
      const schedule = { ...baseSchedule };
      const calculationDate = new Date('2024-07-01');
      const accelerationEvent = {
        type: 'double_trigger',
        date: new Date('2024-07-01'),
        changeOfControlDate: new Date('2024-06-01'),
        terminationDate: new Date('2024-07-01'),
        terminationType: 'involuntary_without_cause'
      };

      const result = VestingCalculatorService.calculateAcceleration(
        schedule,
        calculationDate,
        accelerationEvent
      );

      expect(result.acceleratedShares).toBe(10000);
      expect(result.accelerationType).toBe('double_trigger');
    });

    it('should not apply double trigger without termination', () => {
      const schedule = { ...baseSchedule };
      const calculationDate = new Date('2024-07-01');
      const accelerationEvent = {
        type: 'change_of_control',
        date: new Date('2024-06-01')
      };

      const result = VestingCalculatorService.calculateAcceleration(
        schedule,
        calculationDate,
        accelerationEvent
      );

      expect(result.acceleratedShares).toBe(0);
      expect(result.accelerationType).toBe(null);
    });

    it('should apply partial acceleration percentage', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: {
            enabled: true,
            accelerationPercentage: 50
          },
          doubleTrigger: { enabled: false, accelerationPercentage: 0 }
        }
      };
      const calculationDate = new Date('2024-01-01');
      const accelerationEvent = {
        type: 'change_of_control',
        date: new Date('2024-01-01')
      };

      const result = VestingCalculatorService.calculateAcceleration(
        schedule,
        calculationDate,
        accelerationEvent
      );

      // At cliff date (2024-01-01), 2500 shares vested (25%)
      // 50% of unvested shares (7500) = 3750 accelerated
      // Total: 2500 + 3750 = 6250 (acceleratedShares is the new total)
      expect(result.acceleratedShares).toBe(6250);
      expect(result.accelerationPercentage).toBe(50);
    });
  });

  describe('getNextVestingEvent', () => {
    const baseSchedule = {
      totalShares: 10000,
      grantDate: new Date('2023-01-01'),
      vestingStartDate: new Date('2023-01-01'),
      cliffPeriodMonths: 12,
      vestingPeriodMonths: 48,
      vestingFrequency: 'monthly'
    };

    it('should return cliff date as next event before cliff', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2023-06-01');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result.eventDate.toISOString().slice(0, 10)).toBe('2024-01-01');
      expect(result.eventType).toBe('cliff');
      expect(result.sharesToVest).toBe(2500);
    });

    it('should return next monthly vest date after cliff', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2024-01-15');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result.eventDate.toISOString().slice(0, 10)).toBe('2024-02-01');
      expect(result.eventType).toBe('periodic');
    });

    it('should return null when fully vested', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2027-02-01');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result).toBeNull();
    });

    it('should handle quarterly vesting next event', () => {
      const schedule = {
        ...baseSchedule,
        vestingFrequency: 'quarterly'
      };
      const fromDate = new Date('2024-01-15');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result).not.toBeNull();
      expect(result.eventType).toBe('periodic');
    });

    it('should handle annual vesting next event', () => {
      const schedule = {
        ...baseSchedule,
        vestingFrequency: 'annually'
      };
      const fromDate = new Date('2024-01-15');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result).not.toBeNull();
      expect(result.eventType).toBe('periodic');
    });

    it('should handle daily vesting next event', () => {
      const schedule = {
        ...baseSchedule,
        cliffPeriodMonths: 0,
        vestingFrequency: 'daily'
      };
      const fromDate = new Date('2023-01-15');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result).not.toBeNull();
      expect(result.eventDate.getDate()).toBe(16);
    });
  });

  describe('generateVestingTimeline', () => {
    it('should generate complete vesting timeline', () => {
      const schedule = {
        totalShares: 10000,
        grantDate: new Date('2023-01-01'),
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'monthly'
      };

      const timeline = VestingCalculatorService.generateVestingTimeline(schedule);

      // 1 cliff event + 36 monthly events (months 13-48)
      expect(timeline.length).toBe(37);
      expect(timeline[0].eventType).toBe('cliff');
      expect(timeline[0].cumulativeVested).toBe(2500);
      expect(timeline[timeline.length - 1].cumulativeVested).toBe(10000);
    });

    it('should handle quarterly vesting in timeline', () => {
      const schedule = {
        totalShares: 10000,
        grantDate: new Date('2023-01-01'),
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'quarterly'
      };

      const timeline = VestingCalculatorService.generateVestingTimeline(schedule);

      // 1 cliff event (4 quarters) + 12 quarterly events (quarters 5-16)
      expect(timeline.length).toBe(13);
    });

    it('should handle annual vesting in timeline', () => {
      const schedule = {
        totalShares: 10000,
        grantDate: new Date('2023-01-01'),
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'annually'
      };

      const timeline = VestingCalculatorService.generateVestingTimeline(schedule);

      // 1 cliff event (1 year) + 3 annual events (years 2-4)
      expect(timeline.length).toBe(4);
    });

    it('should handle no cliff period in timeline', () => {
      const schedule = {
        totalShares: 10000,
        grantDate: new Date('2023-01-01'),
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 0,
        vestingPeriodMonths: 12,
        vestingFrequency: 'monthly'
      };

      const timeline = VestingCalculatorService.generateVestingTimeline(schedule);

      expect(timeline.length).toBe(12);
      expect(timeline[0].eventType).toBe('periodic');
    });

    it('should handle daily vesting in timeline', () => {
      const schedule = {
        totalShares: 10000,
        grantDate: new Date('2023-01-01'),
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 0,
        vestingPeriodMonths: 1,
        vestingFrequency: 'daily'
      };

      const timeline = VestingCalculatorService.generateVestingTimeline(schedule);

      expect(timeline.length).toBeGreaterThan(0);
    });
  });

  describe('getVisualizationData', () => {
    it('should return data formatted for visualization', () => {
      const schedule = {
        totalShares: 10000,
        grantDate: new Date('2023-01-01'),
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'monthly'
      };

      const visualData = VestingCalculatorService.getVisualizationData(schedule);

      expect(visualData).toHaveProperty('labels');
      expect(visualData).toHaveProperty('vestedData');
      expect(visualData).toHaveProperty('unvestedData');
      expect(visualData).toHaveProperty('milestones');
      expect(visualData.labels.length).toBeGreaterThan(0);
      expect(visualData.milestones).toContainEqual(
        expect.objectContaining({ type: 'cliff' })
      );
    });
  });

  describe('getUpcomingVestingEvents', () => {
    const baseSchedule = {
      totalShares: 10000,
      grantDate: new Date('2023-01-01'),
      vestingStartDate: new Date('2023-01-01'),
      cliffPeriodMonths: 12,
      vestingPeriodMonths: 48,
      vestingFrequency: 'monthly'
    };

    it('should return specified number of upcoming vesting events', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2024-01-15'); // After cliff

      const events = VestingCalculatorService.getUpcomingVestingEvents(schedule, fromDate, 5);

      expect(events).toHaveLength(5);
      events.forEach(event => {
        expect(event).toHaveProperty('eventDate');
        expect(event).toHaveProperty('eventType');
        expect(event).toHaveProperty('sharesToVest');
        expect(event).toHaveProperty('cumulativeVested');
      });
    });

    it('should return cliff as first event when before cliff', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2023-06-01'); // Before cliff

      const events = VestingCalculatorService.getUpcomingVestingEvents(schedule, fromDate, 3);

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].eventType).toBe('cliff');
      expect(events[0].eventDate.toISOString().slice(0, 10)).toBe('2024-01-01');
    });

    it('should return empty array when fully vested', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2027-02-01'); // After full vesting period

      const events = VestingCalculatorService.getUpcomingVestingEvents(schedule, fromDate, 5);

      expect(events).toHaveLength(0);
    });

    it('should return fewer events if near end of vesting period', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2026-10-01'); // Near end of 48 month period

      const events = VestingCalculatorService.getUpcomingVestingEvents(schedule, fromDate, 10);

      expect(events.length).toBeLessThan(10);
      expect(events.length).toBeGreaterThan(0);
    });

    it('should handle quarterly vesting frequency', () => {
      const schedule = {
        ...baseSchedule,
        vestingFrequency: 'quarterly'
      };
      const fromDate = new Date('2024-01-15');

      const events = VestingCalculatorService.getUpcomingVestingEvents(schedule, fromDate, 4);

      expect(events.length).toBeGreaterThan(0);
      expect(events.length).toBeLessThanOrEqual(4);
    });

    it('should default to 10 events when count not specified', () => {
      const schedule = { ...baseSchedule };
      const fromDate = new Date('2024-01-15');

      const events = VestingCalculatorService.getUpcomingVestingEvents(schedule, fromDate);

      expect(events.length).toBeLessThanOrEqual(10);
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('processVestingEvent', () => {
    const baseSchedule = {
      scheduleId: 'VS-001',
      totalShares: 10000,
      grantDate: new Date('2023-01-01'),
      vestingStartDate: new Date('2023-01-01'),
      cliffPeriodMonths: 12,
      vestingPeriodMonths: 48,
      vestingFrequency: 'monthly',
      vestedShares: 2500,
      unvestedShares: 7500
    };

    it('should process a vesting event and return updated shares', () => {
      const schedule = { ...baseSchedule };
      const eventDate = new Date('2024-02-01');

      const result = VestingCalculatorService.processVestingEvent(schedule, eventDate);

      expect(result).toHaveProperty('previousVestedShares', 2500);
      expect(result).toHaveProperty('newVestedShares');
      expect(result).toHaveProperty('sharesVestedInEvent');
      expect(result).toHaveProperty('unvestedShares');
      expect(result.newVestedShares).toBeGreaterThanOrEqual(result.previousVestedShares);
    });

    it('should include event metadata', () => {
      const schedule = { ...baseSchedule };
      const eventDate = new Date('2024-02-01');

      const result = VestingCalculatorService.processVestingEvent(schedule, eventDate);

      expect(result).toHaveProperty('eventDate');
      expect(result).toHaveProperty('eventType');
      expect(result).toHaveProperty('scheduleId', 'VS-001');
    });
  });

  describe('handleAcceleration', () => {
    const baseSchedule = {
      scheduleId: 'VS-001',
      totalShares: 10000,
      grantDate: new Date('2023-01-01'),
      vestingStartDate: new Date('2023-01-01'),
      cliffPeriodMonths: 12,
      vestingPeriodMonths: 48,
      vestingFrequency: 'monthly',
      vestedShares: 2500,
      unvestedShares: 7500,
      accelerationTerms: {
        singleTrigger: {
          enabled: true,
          accelerationPercentage: 100,
          events: ['change_of_control', 'ipo']
        },
        doubleTrigger: {
          enabled: true,
          accelerationPercentage: 100,
          terminationTypes: ['involuntary_without_cause', 'good_reason'],
          windowPeriodMonths: 12
        }
      }
    };

    it('should handle single trigger acceleration', () => {
      const schedule = { ...baseSchedule };
      const triggerData = {
        triggerType: 'single_trigger',
        event: 'change_of_control',
        effectiveDate: new Date('2024-06-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result).toHaveProperty('accelerated', true);
      expect(result).toHaveProperty('accelerationType', 'single_trigger');
      expect(result).toHaveProperty('acceleratedShares');
      expect(result).toHaveProperty('newTotalVested');
    });

    it('should handle double trigger acceleration', () => {
      const schedule = { ...baseSchedule };
      const triggerData = {
        triggerType: 'double_trigger',
        event: 'change_of_control',
        changeOfControlDate: new Date('2024-06-01'),
        terminationDate: new Date('2024-08-01'),
        terminationType: 'involuntary_without_cause',
        effectiveDate: new Date('2024-08-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result).toHaveProperty('accelerated', true);
      expect(result).toHaveProperty('accelerationType', 'double_trigger');
    });

    it('should return not accelerated when conditions not met', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: { enabled: false, accelerationPercentage: 0, events: [] },
          doubleTrigger: { enabled: false, accelerationPercentage: 0, terminationTypes: [], windowPeriodMonths: 12 }
        }
      };
      const triggerData = {
        triggerType: 'single_trigger',
        event: 'change_of_control',
        effectiveDate: new Date('2024-06-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result).toHaveProperty('accelerated', false);
      expect(result).toHaveProperty('reason');
    });
  });
});
