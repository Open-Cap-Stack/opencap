/**
 * EquityGrant Service
 * Issue #77: Create Equity Grant Model and Workflow
 *
 * Business logic for equity grant operations including vesting calculations,
 * exercise validation, and template management.
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

// Grant templates for common grant types
const GRANT_TEMPLATES = [
  {
    name: 'Standard ISO - 4 Year Vesting',
    description: 'Standard Incentive Stock Option with 4-year vesting and 1-year cliff',
    grantType: 'ISO',
    vestingSchedule: {
      vestingPeriodMonths: 48,
      cliffMonths: 12,
      vestingFrequency: 'monthly'
    },
    postTerminationExercisePeriodDays: 90
  },
  {
    name: 'Standard NSO - 4 Year Vesting',
    description: 'Standard Non-Qualified Stock Option with 4-year vesting and 1-year cliff',
    grantType: 'NSO',
    vestingSchedule: {
      vestingPeriodMonths: 48,
      cliffMonths: 12,
      vestingFrequency: 'monthly'
    },
    postTerminationExercisePeriodDays: 90
  },
  {
    name: 'Standard RSU - 4 Year Vesting',
    description: 'Standard Restricted Stock Unit with 4-year vesting and 1-year cliff',
    grantType: 'RSU',
    vestingSchedule: {
      vestingPeriodMonths: 48,
      cliffMonths: 12,
      vestingFrequency: 'quarterly'
    },
    postTerminationExercisePeriodDays: 0
  },
  {
    name: 'Accelerated ISO - 3 Year Vesting',
    description: 'Accelerated ISO with 3-year vesting and 6-month cliff',
    grantType: 'ISO',
    vestingSchedule: {
      vestingPeriodMonths: 36,
      cliffMonths: 6,
      vestingFrequency: 'monthly'
    },
    postTerminationExercisePeriodDays: 90
  },
  {
    name: 'Executive RSU - Quarterly Vesting',
    description: 'Executive RSU with quarterly vesting over 4 years, no cliff',
    grantType: 'RSU',
    vestingSchedule: {
      vestingPeriodMonths: 48,
      cliffMonths: 0,
      vestingFrequency: 'quarterly'
    },
    postTerminationExercisePeriodDays: 0
  },
  {
    name: 'Advisor NSO - 2 Year Vesting',
    description: 'Advisor NSO with 2-year monthly vesting and no cliff',
    grantType: 'NSO',
    vestingSchedule: {
      vestingPeriodMonths: 24,
      cliffMonths: 0,
      vestingFrequency: 'monthly'
    },
    postTerminationExercisePeriodDays: 90
  }
];

class EquityGrantService {
  /**
   * Calculate vested shares as of a specific date
   * @param {Object} grant - The equity grant object
   * @param {Date} asOfDate - Date to calculate vesting as of
   * @returns {Object} Vesting calculation result
   */
  calculateVestedShares(grant, asOfDate = new Date()) {
    const {
      numberOfShares,
      vestingSchedule
    } = grant;

    if (!vestingSchedule) {
      return {
        vestedShares: numberOfShares,
        vestedPercentage: 100,
        unvestedShares: 0
      };
    }

    const {
      vestingPeriodMonths,
      totalMonths,
      cliffMonths,
      vestingFrequency
    } = vestingSchedule;

    // vestingStartDate may be top-level on the grant or nested in vestingSchedule
    const startDate = new Date(grant.vestingStartDate || vestingSchedule.vestingStartDate || grant.grantDate);
    // Support both vestingPeriodMonths and totalMonths field names
    const effectiveVestingMonths = vestingPeriodMonths || totalMonths;
    const checkDate = new Date(asOfDate);

    // Calculate months elapsed
    const monthsElapsed = this._monthsBetween(startDate, checkDate);

    // Before cliff - no vesting
    if (monthsElapsed < cliffMonths) {
      return {
        vestedShares: 0,
        vestedPercentage: 0,
        unvestedShares: numberOfShares,
        monthsElapsed,
        monthsUntilNextVest: cliffMonths - monthsElapsed
      };
    }

    // After full vesting period
    if (monthsElapsed >= effectiveVestingMonths) {
      return {
        vestedShares: numberOfShares,
        vestedPercentage: 100,
        unvestedShares: 0,
        monthsElapsed,
        fullyVested: true
      };
    }

    // Calculate vested amount based on frequency
    let vestedMonths;
    switch (vestingFrequency) {
      case 'quarterly':
        vestedMonths = Math.floor(monthsElapsed / 3) * 3;
        break;
      case 'annually':
        vestedMonths = Math.floor(monthsElapsed / 12) * 12;
        break;
      case 'monthly':
      default:
        vestedMonths = monthsElapsed;
    }

    const vestedPercentage = (vestedMonths / effectiveVestingMonths) * 100;
    const vestedShares = Math.floor((vestedMonths / effectiveVestingMonths) * numberOfShares);

    return {
      vestedShares,
      vestedPercentage: Math.round(vestedPercentage * 100) / 100,
      unvestedShares: numberOfShares - vestedShares,
      monthsElapsed,
      monthsUntilFullVesting: effectiveVestingMonths - monthsElapsed
    };
  }

  /**
   * Calculate exercisable shares (vested minus already exercised)
   * @param {Object} grant - The equity grant object
   * @param {Date} asOfDate - Date to calculate as of
   * @returns {Object} Exercisable shares calculation
   */
  calculateExercisableShares(grant, asOfDate = new Date()) {
    if (grant.status !== 'active') {
      return {
        exercisableShares: 0,
        totalVested: 0,
        alreadyExercised: grant.exercisedShares || 0,
        reason: 'Grant is not active'
      };
    }

    const vestingResult = this.calculateVestedShares(grant, asOfDate);
    const exercisedShares = grant.exercisedShares || 0;
    const exercisableShares = Math.max(0, vestingResult.vestedShares - exercisedShares);

    return {
      exercisableShares,
      totalVested: vestingResult.vestedShares,
      alreadyExercised: exercisedShares,
      vestedPercentage: vestingResult.vestedPercentage
    };
  }

  /**
   * Generate a unique grant ID
   * @returns {string} Unique grant ID
   */
  generateGrantId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `GRANT-${timestamp}-${random}`;
  }

  /**
   * Validate an exercise request
   * @param {Object} grant - The grant to exercise
   * @param {number} sharesToExercise - Number of shares to exercise
   * @param {Date} exerciseDate - Date of exercise
   * @returns {Object} Validation result
   */
  validateExercise(grant, sharesToExercise, exerciseDate = new Date()) {
    const errors = [];

    // Check grant status
    if (grant.status !== 'active') {
      errors.push('Grant is not active');
    }

    // Check expiration
    if (grant.expirationDate && new Date(grant.expirationDate) < exerciseDate) {
      errors.push('Grant has expired');
    }

    // Check termination
    if (grant.terminationDate) {
      const terminationDate = new Date(grant.terminationDate);
      const exerciseDeadline = new Date(terminationDate);
      exerciseDeadline.setDate(
        exerciseDeadline.getDate() + (grant.postTerminationExercisePeriodDays || 90)
      );

      if (exerciseDate > exerciseDeadline) {
        errors.push('Post-termination exercise period has expired');
      }
    }

    // Check exercisable amount
    const exercisable = this.calculateExercisableShares(grant, exerciseDate);
    if (sharesToExercise > exercisable.exercisableShares) {
      errors.push('Requested shares exceed exercisable amount');
    }

    // Check positive amount
    if (sharesToExercise <= 0) {
      errors.push('Must exercise a positive number of shares');
    }

    return {
      valid: errors.length === 0,
      errors,
      exercisableShares: exercisable.exercisableShares,
      requestedShares: sharesToExercise
    };
  }

  /**
   * Get summary of all grants for an employee
   * @param {string} employeeId - Employee ID
   * @returns {Object} Grant summary
   */
  async getGrantSummary(employeeId) {
    const grants = await databaseAdapter.find('EquityGrant', { employeeId });

    if (!grants || grants.length === 0) {
      return {
        totalGrants: 0,
        totalShares: 0,
        totalExercised: 0,
        totalUnexercised: 0,
        grantsByType: {},
        grantsByStatus: {}
      };
    }

    const summary = {
      totalGrants: grants.length,
      totalShares: 0,
      totalExercised: 0,
      totalUnexercised: 0,
      grantsByType: {},
      grantsByStatus: {},
      grants: []
    };

    for (const grant of grants) {
      summary.totalShares += grant.numberOfShares;
      summary.totalExercised += grant.exercisedShares || 0;

      // Group by type
      if (!summary.grantsByType[grant.grantType]) {
        summary.grantsByType[grant.grantType] = {
          count: 0,
          totalShares: 0
        };
      }
      summary.grantsByType[grant.grantType].count++;
      summary.grantsByType[grant.grantType].totalShares += grant.numberOfShares;

      // Group by status
      if (!summary.grantsByStatus[grant.status]) {
        summary.grantsByStatus[grant.status] = {
          count: 0,
          totalShares: 0
        };
      }
      summary.grantsByStatus[grant.status].count++;
      summary.grantsByStatus[grant.status].totalShares += grant.numberOfShares;

      // Calculate vested for each grant
      const vesting = this.calculateVestedShares(grant);
      summary.grants.push({
        grantId: grant.grantId,
        grantType: grant.grantType,
        status: grant.status,
        numberOfShares: grant.numberOfShares,
        exercisedShares: grant.exercisedShares || 0,
        vestedShares: vesting.vestedShares,
        vestedPercentage: vesting.vestedPercentage
      });
    }

    summary.totalUnexercised = summary.totalShares - summary.totalExercised;

    return summary;
  }

  /**
   * Get all available grant templates
   * @returns {Array} List of grant templates
   */
  getGrantTemplates() {
    return GRANT_TEMPLATES;
  }

  /**
   * Apply a template to grant data
   * @param {string} templateName - Name of the template
   * @param {Object} grantData - Base grant data
   * @returns {Object} Grant data with template applied
   */
  applyTemplate(templateName, grantData) {
    const template = GRANT_TEMPLATES.find(t => t.name === templateName);

    if (!template) {
      throw new Error('Template not found');
    }

    const grantDate = grantData.grantDate ? new Date(grantData.grantDate) : new Date();

    return {
      ...grantData,
      grantId: grantData.grantId || this.generateGrantId(),
      grantType: template.grantType,
      vestingSchedule: {
        ...template.vestingSchedule,
        vestingStartDate: grantDate
      },
      postTerminationExercisePeriodDays: template.postTerminationExercisePeriodDays,
      status: 'pending'
    };
  }

  /**
   * Calculate total equity value
   * @param {Object} grant - The grant object
   * @param {number} currentPrice - Current share price
   * @returns {Object} Value calculation
   */
  calculateTotalEquityValue(grant, currentPrice) {
    const remainingShares = grant.numberOfShares - (grant.exercisedShares || 0);
    const totalValue = remainingShares * currentPrice;
    const exerciseCost = remainingShares * grant.strikePrice;
    const netValue = totalValue - exerciseCost;
    const spreadPerShare = currentPrice - grant.strikePrice;

    return {
      remainingShares,
      currentPrice,
      strikePrice: grant.strikePrice,
      totalValue,
      exerciseCost,
      netValue,
      spreadPerShare,
      inTheMoney: spreadPerShare > 0
    };
  }

  /**
   * Calculate months between two dates
   * @private
   */
  _monthsBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();

    // Adjust for partial months
    if (end.getDate() < start.getDate()) {
      months--;
    }

    return Math.max(0, months);
  }
}

module.exports = new EquityGrantService();
