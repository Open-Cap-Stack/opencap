/**
 * Vesting Calculator Service
 * Issue #78: Implement Automated Vesting Schedules
 *
 * Provides vesting calculations including:
 * - Vested share calculations based on cliff and frequency
 * - Acceleration clause calculations
 * - Timeline generation for visualization
 */

class VestingCalculatorService {
  /**
   * Calculate the number of vested shares as of a given date
   * @param {Object} schedule - Vesting schedule object
   * @param {Date} calculationDate - Date to calculate vesting as of
   * @returns {Object} Vesting calculation result
   */
  static calculateVestedShares(schedule, calculationDate = new Date()) {
    const {
      totalShares,
      vestingStartDate,
      cliffPeriodMonths = 12,
      vestingPeriodMonths = 48,
      vestingFrequency = 'monthly'
    } = schedule;

    const startDate = new Date(vestingStartDate);
    const calcDate = new Date(calculationDate);

    // If calculation date is before vesting start, no vesting
    if (calcDate < startDate) {
      return {
        vestedShares: 0,
        unvestedShares: totalShares,
        vestingPercentage: 0,
        monthsElapsed: 0,
        cliffReached: false
      };
    }

    // Calculate months elapsed
    const monthsElapsed = this._calculateMonthsElapsed(startDate, calcDate);

    // Check if cliff has been reached
    const cliffReached = monthsElapsed >= cliffPeriodMonths;

    if (!cliffReached) {
      return {
        vestedShares: 0,
        unvestedShares: totalShares,
        vestingPercentage: 0,
        monthsElapsed,
        cliffReached: false
      };
    }

    // Calculate vesting based on frequency
    let vestedMonths;
    switch (vestingFrequency) {
      case 'daily':
        // For daily vesting, calculate exact days
        const daysElapsed = this._calculateDaysElapsed(startDate, calcDate);
        const totalDays = vestingPeriodMonths * 30; // Approximate
        vestedMonths = Math.min(daysElapsed / 30, vestingPeriodMonths);
        break;

      case 'monthly':
        vestedMonths = Math.min(monthsElapsed, vestingPeriodMonths);
        break;

      case 'quarterly':
        const quartersElapsed = Math.floor(monthsElapsed / 3);
        vestedMonths = Math.min(quartersElapsed * 3, vestingPeriodMonths);
        break;

      case 'annually':
        const yearsElapsed = Math.floor(monthsElapsed / 12);
        vestedMonths = Math.min(yearsElapsed * 12, vestingPeriodMonths);
        break;

      default:
        vestedMonths = Math.min(monthsElapsed, vestingPeriodMonths);
    }

    // Calculate vested percentage and shares
    const vestingPercentage = (vestedMonths / vestingPeriodMonths) * 100;
    const vestedShares = Math.floor((vestingPercentage / 100) * totalShares);
    const unvestedShares = totalShares - vestedShares;

    return {
      vestedShares,
      unvestedShares,
      vestingPercentage,
      monthsElapsed,
      cliffReached: true,
      vestedMonths
    };
  }

  /**
   * Calculate acceleration based on events
   * @param {Object} schedule - Vesting schedule object
   * @param {Date} calculationDate - Date to calculate as of
   * @param {Object} accelerationEvent - Acceleration event details
   * @returns {Object} Acceleration calculation result
   */
  static calculateAcceleration(schedule, calculationDate, accelerationEvent) {
    const { accelerationTerms, totalShares } = schedule;
    const { type, changeOfControlDate, terminationDate, terminationType } = accelerationEvent;

    // Calculate current vested shares
    const currentVesting = this.calculateVestedShares(schedule, calculationDate);
    const unvestedShares = totalShares - currentVesting.vestedShares;

    // Check single trigger
    if (accelerationTerms?.singleTrigger?.enabled) {
      const singleTriggerEvents = ['change_of_control', 'ipo', 'merger', 'acquisition'];
      if (singleTriggerEvents.includes(type)) {
        const accelerationPercentage = accelerationTerms.singleTrigger.accelerationPercentage || 100;
        const acceleratedShares = Math.floor((accelerationPercentage / 100) * unvestedShares);

        return {
          acceleratedShares: currentVesting.vestedShares + acceleratedShares,
          accelerationType: 'single_trigger',
          newVestedShares: currentVesting.vestedShares + acceleratedShares,
          previousVestedShares: currentVesting.vestedShares,
          accelerationPercentage
        };
      }
    }

    // Check double trigger
    if (accelerationTerms?.doubleTrigger?.enabled && type === 'double_trigger') {
      // Must have both change of control AND qualifying termination
      if (changeOfControlDate && terminationDate && terminationType) {
        const windowMonths = accelerationTerms.doubleTrigger.windowPeriodMonths || 12;
        const qualifyingTerminations = accelerationTerms.doubleTrigger.terminationTypes || [
          'involuntary_without_cause',
          'constructive_termination',
          'good_reason'
        ];

        // Check if termination is within window of change of control
        const cocDate = new Date(changeOfControlDate);
        const termDate = new Date(terminationDate);
        const monthsDiff = this._calculateMonthsElapsed(cocDate, termDate);

        if (qualifyingTerminations.includes(terminationType) && monthsDiff <= windowMonths) {
          const accelerationPercentage = accelerationTerms.doubleTrigger.accelerationPercentage || 100;
          const acceleratedShares = Math.floor((accelerationPercentage / 100) * unvestedShares);

          return {
            acceleratedShares: currentVesting.vestedShares + acceleratedShares,
            accelerationType: 'double_trigger',
            newVestedShares: currentVesting.vestedShares + acceleratedShares,
            previousVestedShares: currentVesting.vestedShares,
            accelerationPercentage
          };
        }
      }
    }

    // No acceleration applicable
    return {
      acceleratedShares: 0,
      accelerationType: null,
      newVestedShares: currentVesting.vestedShares,
      previousVestedShares: currentVesting.vestedShares,
      accelerationPercentage: 0
    };
  }

  /**
   * Get the next vesting event from a given date
   * @param {Object} schedule - Vesting schedule object
   * @param {Date} fromDate - Date to calculate next event from
   * @returns {Object|null} Next vesting event or null if fully vested
   */
  static getNextVestingEvent(schedule, fromDate = new Date()) {
    const {
      totalShares,
      vestingStartDate,
      cliffPeriodMonths = 12,
      vestingPeriodMonths = 48,
      vestingFrequency = 'monthly'
    } = schedule;

    const startDate = new Date(vestingStartDate);
    const calcFromDate = new Date(fromDate);

    // Calculate current vesting
    const currentVesting = this.calculateVestedShares(schedule, calcFromDate);

    // If fully vested, no next event
    if (currentVesting.vestedShares >= totalShares) {
      return null;
    }

    // If before cliff, next event is cliff
    if (!currentVesting.cliffReached) {
      const cliffDate = new Date(startDate);
      cliffDate.setMonth(cliffDate.getMonth() + cliffPeriodMonths);

      const cliffShares = Math.floor((cliffPeriodMonths / vestingPeriodMonths) * totalShares);

      return {
        eventDate: cliffDate,
        eventType: 'cliff',
        sharesToVest: cliffShares,
        cumulativeVested: cliffShares
      };
    }

    // Calculate next periodic vesting event
    let nextEventDate;
    let periodsCompleted;
    const monthsElapsed = currentVesting.monthsElapsed;

    switch (vestingFrequency) {
      case 'monthly':
        periodsCompleted = Math.floor(monthsElapsed);
        nextEventDate = new Date(startDate);
        nextEventDate.setMonth(nextEventDate.getMonth() + periodsCompleted + 1);
        break;

      case 'quarterly':
        periodsCompleted = Math.floor(monthsElapsed / 3);
        nextEventDate = new Date(startDate);
        nextEventDate.setMonth(nextEventDate.getMonth() + (periodsCompleted + 1) * 3);
        break;

      case 'annually':
        periodsCompleted = Math.floor(monthsElapsed / 12);
        nextEventDate = new Date(startDate);
        nextEventDate.setMonth(nextEventDate.getMonth() + (periodsCompleted + 1) * 12);
        break;

      case 'daily':
        nextEventDate = new Date(calcFromDate);
        nextEventDate.setDate(nextEventDate.getDate() + 1);
        break;

      default:
        periodsCompleted = Math.floor(monthsElapsed);
        nextEventDate = new Date(startDate);
        nextEventDate.setMonth(nextEventDate.getMonth() + periodsCompleted + 1);
    }

    // Calculate shares for next event
    const nextVesting = this.calculateVestedShares(schedule, nextEventDate);
    const sharesToVest = nextVesting.vestedShares - currentVesting.vestedShares;

    // If next event is past vesting end, return null
    const vestingEndDate = new Date(startDate);
    vestingEndDate.setMonth(vestingEndDate.getMonth() + vestingPeriodMonths);
    if (nextEventDate > vestingEndDate) {
      return null;
    }

    return {
      eventDate: nextEventDate,
      eventType: 'periodic',
      sharesToVest,
      cumulativeVested: nextVesting.vestedShares
    };
  }

  /**
   * Generate complete vesting timeline
   * @param {Object} schedule - Vesting schedule object
   * @returns {Array} Array of vesting events
   */
  static generateVestingTimeline(schedule) {
    const {
      totalShares,
      vestingStartDate,
      cliffPeriodMonths = 12,
      vestingPeriodMonths = 48,
      vestingFrequency = 'monthly'
    } = schedule;

    const startDate = new Date(vestingStartDate);
    const timeline = [];

    // Add cliff event
    if (cliffPeriodMonths > 0) {
      const cliffDate = new Date(startDate);
      cliffDate.setMonth(cliffDate.getMonth() + cliffPeriodMonths);
      const cliffShares = Math.floor((cliffPeriodMonths / vestingPeriodMonths) * totalShares);

      timeline.push({
        eventDate: cliffDate,
        eventType: 'cliff',
        sharesToVest: cliffShares,
        cumulativeVested: cliffShares,
        vestingPercentage: (cliffShares / totalShares) * 100
      });
    }

    // Calculate period details based on frequency
    let periodMonths;
    switch (vestingFrequency) {
      case 'quarterly':
        periodMonths = 3;
        break;
      case 'annually':
        periodMonths = 12;
        break;
      case 'daily':
        periodMonths = 1 / 30; // Approximate daily as fraction of month
        break;
      case 'monthly':
      default:
        periodMonths = 1;
    }

    // Generate periodic events after cliff
    const startMonth = cliffPeriodMonths > 0 ? cliffPeriodMonths + periodMonths : periodMonths;
    const sharesPerPeriod = Math.floor((periodMonths / vestingPeriodMonths) * totalShares);

    for (let month = startMonth; month <= vestingPeriodMonths; month += periodMonths) {
      const eventDate = new Date(startDate);
      eventDate.setMonth(eventDate.getMonth() + month);

      const vestingAtDate = this.calculateVestedShares(schedule, eventDate);

      timeline.push({
        eventDate,
        eventType: 'periodic',
        sharesToVest: sharesPerPeriod,
        cumulativeVested: vestingAtDate.vestedShares,
        vestingPercentage: vestingAtDate.vestingPercentage
      });
    }

    // Ensure final event shows 100% vested
    if (timeline.length > 0 && timeline[timeline.length - 1].cumulativeVested < totalShares) {
      timeline[timeline.length - 1].cumulativeVested = totalShares;
      timeline[timeline.length - 1].vestingPercentage = 100;
    }

    return timeline;
  }

  /**
   * Get visualization-friendly data for charts
   * @param {Object} schedule - Vesting schedule object
   * @returns {Object} Visualization data
   */
  static getVisualizationData(schedule) {
    const timeline = this.generateVestingTimeline(schedule);
    const { totalShares, vestingStartDate, cliffPeriodMonths = 12, vestingPeriodMonths = 48 } = schedule;

    const labels = [];
    const vestedData = [];
    const unvestedData = [];
    const milestones = [];

    // Add start point
    const startDate = new Date(vestingStartDate);
    labels.push(this._formatDateLabel(startDate));
    vestedData.push(0);
    unvestedData.push(totalShares);

    // Add milestone for cliff
    if (cliffPeriodMonths > 0) {
      const cliffDate = new Date(startDate);
      cliffDate.setMonth(cliffDate.getMonth() + cliffPeriodMonths);
      milestones.push({
        type: 'cliff',
        date: cliffDate.toISOString(),
        label: 'Cliff',
        shares: Math.floor((cliffPeriodMonths / vestingPeriodMonths) * totalShares)
      });
    }

    // Add timeline events
    for (const event of timeline) {
      labels.push(this._formatDateLabel(event.eventDate));
      vestedData.push(event.cumulativeVested);
      unvestedData.push(totalShares - event.cumulativeVested);
    }

    // Add milestone for full vest
    const vestingEndDate = new Date(startDate);
    vestingEndDate.setMonth(vestingEndDate.getMonth() + vestingPeriodMonths);
    milestones.push({
      type: 'full_vest',
      date: vestingEndDate.toISOString(),
      label: 'Fully Vested',
      shares: totalShares
    });

    return {
      labels,
      vestedData,
      unvestedData,
      milestones,
      summary: {
        totalShares,
        vestingStartDate: startDate.toISOString(),
        vestingEndDate: vestingEndDate.toISOString(),
        cliffPeriodMonths,
        vestingPeriodMonths
      }
    };
  }

  // Private helper methods

  /**
   * Calculate months elapsed between two dates
   * @private
   */
  static _calculateMonthsElapsed(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();

    // Adjust for partial months
    if (end.getDate() >= start.getDate()) {
      // Include partial month
    } else {
      months -= 1;
    }

    return Math.max(0, months);
  }

  /**
   * Calculate days elapsed between two dates
   * @private
   */
  static _calculateDaysElapsed(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format date for visualization label
   * @private
   */
  static _formatDateLabel(date) {
    const d = new Date(date);
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${month} ${year}`;
  }
}

module.exports = VestingCalculatorService;
