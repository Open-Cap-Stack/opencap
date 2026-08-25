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

      // 17 complete months vested (discrete monthly) / 48 months = 35.41%
      expect(result.vestedShares).toBe(3541);
      expect(result.unvestedShares).toBe(6459);
      expect(result.vestingPercentage).toBeCloseTo(35.41, 1);
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

    it('should handle unknown vesting frequency using default case', () => {
      const schedule = {
        ...baseSchedule,
        cliffPeriodMonths: 0,
        vestingFrequency: 'biweekly' // not a recognized frequency
      };
      const calculationDate = new Date('2024-01-01'); // 12 months

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      // Default case: same as monthly
      expect(result.vestedShares).toBe(2500);
      expect(result.vestingPercentage).toBe(25);
    });

    it('should handle daily vesting frequency after cliff', () => {
      const schedule = {
        ...baseSchedule,
        cliffPeriodMonths: 1,
        vestingPeriodMonths: 12,
        vestingFrequency: 'daily'
      };
      const calculationDate = new Date('2023-03-01'); // ~59 days

      const result = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

      expect(result.cliffReached).toBe(true);
      expect(result.vestedShares).toBeGreaterThan(0);
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
      expect(result.eventDate.getUTCDate()).toBe(16);
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

    it('should return not accelerated when no accelerationTerms exist', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: undefined
      };
      const triggerData = {
        triggerType: 'single_trigger',
        event: 'change_of_control',
        effectiveDate: new Date('2024-06-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result.accelerated).toBe(false);
      expect(result.reason).toBe('No acceleration terms defined');
    });

    it('should reject single trigger for non-allowed event', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: {
            enabled: true,
            accelerationPercentage: 100,
            events: ['ipo'] // Only ipo allowed
          },
          doubleTrigger: { enabled: false }
        }
      };
      const triggerData = {
        triggerType: 'single_trigger',
        event: 'change_of_control', // Not allowed
        effectiveDate: new Date('2024-06-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result.accelerated).toBe(false);
      expect(result.reason).toContain('not eligible');
    });

    it('should reject double trigger when missing required fields', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: { enabled: false },
          doubleTrigger: {
            enabled: true,
            accelerationPercentage: 100,
            terminationTypes: ['involuntary_without_cause'],
            windowPeriodMonths: 12
          }
        }
      };
      const triggerData = {
        triggerType: 'double_trigger',
        event: 'change_of_control',
        changeOfControlDate: new Date('2024-06-01'),
        // Missing terminationDate and terminationType
        effectiveDate: new Date('2024-08-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result.accelerated).toBe(false);
      expect(result.reason).toContain('requires');
    });

    it('should reject double trigger with non-qualifying termination type', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: { enabled: false },
          doubleTrigger: {
            enabled: true,
            accelerationPercentage: 100,
            terminationTypes: ['involuntary_without_cause'],
            windowPeriodMonths: 12
          }
        }
      };
      const triggerData = {
        triggerType: 'double_trigger',
        event: 'change_of_control',
        changeOfControlDate: new Date('2024-06-01'),
        terminationDate: new Date('2024-08-01'),
        terminationType: 'voluntary_resignation', // Not qualifying
        effectiveDate: new Date('2024-08-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result.accelerated).toBe(false);
      expect(result.reason).toContain('does not qualify');
    });

    it('should reject double trigger when termination is outside window', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: { enabled: false },
          doubleTrigger: {
            enabled: true,
            accelerationPercentage: 100,
            terminationTypes: ['involuntary_without_cause'],
            windowPeriodMonths: 6  // 6 month window
          }
        }
      };
      const triggerData = {
        triggerType: 'double_trigger',
        event: 'change_of_control',
        changeOfControlDate: new Date('2024-01-01'),
        terminationDate: new Date('2024-12-01'), // 11 months later - outside window
        terminationType: 'involuntary_without_cause',
        effectiveDate: new Date('2024-12-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result.accelerated).toBe(false);
      expect(result.reason).toContain('outside');
    });

    it('should handle unknown trigger type', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: { enabled: true, accelerationPercentage: 100 },
          doubleTrigger: { enabled: true, accelerationPercentage: 100 }
        }
      };
      const triggerData = {
        triggerType: 'triple_trigger',
        event: 'change_of_control',
        effectiveDate: new Date('2024-06-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result.accelerated).toBe(false);
      expect(result.reason).toContain('Unknown trigger type');
    });

    it('should include full details in successful double trigger result', () => {
      const schedule = {
        ...baseSchedule,
        accelerationTerms: {
          singleTrigger: { enabled: false },
          doubleTrigger: {
            enabled: true,
            accelerationPercentage: 50,
            terminationTypes: ['involuntary_without_cause', 'good_reason'],
            windowPeriodMonths: 12
          }
        }
      };
      const triggerData = {
        triggerType: 'double_trigger',
        event: 'change_of_control',
        changeOfControlDate: new Date('2024-06-01'),
        terminationDate: new Date('2024-08-01'),
        terminationType: 'good_reason',
        effectiveDate: new Date('2024-08-01')
      };

      const result = VestingCalculatorService.handleAcceleration(schedule, triggerData);

      expect(result.accelerated).toBe(true);
      expect(result.accelerationType).toBe('double_trigger');
      expect(result.accelerationPercentage).toBe(50);
      expect(result).toHaveProperty('changeOfControlDate');
      expect(result).toHaveProperty('terminationDate');
      expect(result).toHaveProperty('terminationType', 'good_reason');
      expect(result.remainingUnvested).toBeLessThan(schedule.totalShares);
    });
  });

  describe('processVestingEvent edge cases', () => {
    it('should identify cliff event when first vesting occurs', () => {
      const schedule = {
        scheduleId: 'VS-002',
        totalShares: 10000,
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'monthly',
        vestedShares: 0 // No shares vested yet
      };
      const eventDate = new Date('2024-01-01'); // At cliff

      const result = VestingCalculatorService.processVestingEvent(schedule, eventDate);

      expect(result.eventType).toBe('cliff');
      expect(result.newVestedShares).toBe(2500);
      expect(result.sharesVestedInEvent).toBe(2500);
    });

    it('should return none event type before cliff', () => {
      const schedule = {
        scheduleId: 'VS-003',
        totalShares: 10000,
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'monthly',
        vestedShares: 0
      };
      const eventDate = new Date('2023-06-01'); // Before cliff

      const result = VestingCalculatorService.processVestingEvent(schedule, eventDate);

      expect(result.eventType).toBe('none');
      expect(result.sharesVestedInEvent).toBe(0);
    });

    it('should mark isComplete when fully vested', () => {
      const schedule = {
        scheduleId: 'VS-004',
        totalShares: 10000,
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'monthly',
        vestedShares: 9800
      };
      const eventDate = new Date('2027-02-01'); // After full vesting

      const result = VestingCalculatorService.processVestingEvent(schedule, eventDate);

      expect(result.isComplete).toBe(true);
      expect(result.newVestedShares).toBe(10000);
    });
  });

  describe('getNextVestingEvent edge cases', () => {
    it('should handle default frequency in next event calculation', () => {
      const schedule = {
        totalShares: 10000,
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 0,
        vestingPeriodMonths: 48,
        vestingFrequency: 'unknown_freq'
      };
      const fromDate = new Date('2023-06-01');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result).not.toBeNull();
      expect(result.eventType).toBe('periodic');
    });

    it('should return null when next event is past vesting end', () => {
      const schedule = {
        totalShares: 10000,
        vestingStartDate: new Date('2023-01-01'),
        cliffPeriodMonths: 12,
        vestingPeriodMonths: 48,
        vestingFrequency: 'annually'
      };
      // After 4 years, fully vested - no more events
      const fromDate = new Date('2027-01-15');

      const result = VestingCalculatorService.getNextVestingEvent(schedule, fromDate);

      expect(result).toBeNull();
    });
  });
});
