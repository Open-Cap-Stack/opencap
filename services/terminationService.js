/**
 * Termination Service
 * Issue #81: Implement Termination Equity Workflow
 *
 * Business logic for processing employee terminations,
 * calculating vested shares, managing exercise windows,
 * and handling forfeitures.
 */

const databaseAdapter = require('./databaseAdapter');

const VALID_TERMINATION_TYPES = [
  'voluntary',
  'involuntary',
  'for_cause',
  'layoff',
  'retirement',
  'death',
  'disability'
];

const DEFAULT_EXERCISE_WINDOW_DAYS = {
  voluntary: 90,
  involuntary: 90,
  for_cause: 0,
  layoff: 90,
  retirement: 90,
  death: 365,
  disability: 365
};

const WARNING_THRESHOLD_DAYS = 7;

class TerminationService {
  /**
   * Calculate vested shares based on vesting schedule and termination date
   * @param {Object} params - Vesting calculation parameters
   * @returns {Object} Vesting calculation result
   */
  calculateVestedShares(params) {
    const {
      grantDate,
      terminationDate,
      totalGrantedShares,
      vestingSchedule
    } = params;

    const grantDateObj = new Date(grantDate);
    const terminationDateObj = new Date(terminationDate);

    // Handle immediate vesting
    if (vestingSchedule.type === 'immediate') {
      return {
        vestedShares: totalGrantedShares,
        unvestedShares: 0,
        vestingPercentage: 100,
        cliffNotMet: false,
        monthsElapsed: 0
      };
    }

    // Calculate months elapsed since grant
    const monthsElapsed = this._calculateMonthsElapsed(grantDateObj, terminationDateObj);

    // Check cliff
    const cliffMonths = vestingSchedule.cliffMonths || 0;
    if (monthsElapsed < cliffMonths) {
      return {
        vestedShares: 0,
        unvestedShares: totalGrantedShares,
        vestingPercentage: 0,
        cliffNotMet: true,
        monthsElapsed
      };
    }

    const totalMonths = vestingSchedule.totalMonths || 48;

    // Calculate vested shares based on vesting type
    let vestedMonths;
    if (vestingSchedule.type === 'quarterly') {
      // Round down to nearest quarter
      vestedMonths = Math.floor(monthsElapsed / 3) * 3;
    } else if (vestingSchedule.type === 'annual') {
      // Round down to nearest year
      vestedMonths = Math.floor(monthsElapsed / 12) * 12;
    } else {
      // Monthly vesting (default)
      vestedMonths = monthsElapsed;
    }

    // Cap at total vesting period
    vestedMonths = Math.min(vestedMonths, totalMonths);

    const vestingPercentage = (vestedMonths / totalMonths) * 100;
    const vestedShares = Math.floor((vestedMonths / totalMonths) * totalGrantedShares);
    const unvestedShares = totalGrantedShares - vestedShares;

    return {
      vestedShares,
      unvestedShares,
      vestingPercentage: Math.round(vestingPercentage * 100) / 100,
      cliffNotMet: false,
      monthsElapsed,
      vestedMonths
    };
  }

  /**
   * Calculate exercise window based on termination type and plan rules
   * @param {Object} params - Exercise window parameters
   * @returns {Object} Exercise window details
   */
  calculateExerciseWindow(params) {
    const {
      terminationDate,
      terminationType,
      equityPlanRules
    } = params;

    const terminationDateObj = new Date(terminationDate);

    // Get exercise window days from plan rules or use defaults
    let exerciseWindowDays;
    if (equityPlanRules && equityPlanRules.exerciseWindowDays) {
      exerciseWindowDays = equityPlanRules.exerciseWindowDays[terminationType] ??
        DEFAULT_EXERCISE_WINDOW_DAYS[terminationType] ??
        90;
    } else {
      exerciseWindowDays = DEFAULT_EXERCISE_WINDOW_DAYS[terminationType] ?? 90;
    }

    // Calculate end date
    const exerciseWindowEndDate = new Date(terminationDateObj);
    exerciseWindowEndDate.setDate(exerciseWindowEndDate.getDate() + exerciseWindowDays);

    const immediateForfeiture = exerciseWindowDays === 0;

    return {
      exerciseWindowDays,
      exerciseWindowEndDate,
      immediateForfeiture
    };
  }

  /**
   * Process a termination and create the termination record
   * @param {Object} terminationData - Termination data
   * @returns {Object} Created termination record
   */
  async processTermination(terminationData) {
    const {
      employeeId,
      companyId,
      terminationDate,
      terminationType,
      terminationReason,
      grants,
      equityPlanRules
    } = terminationData;

    // Validate termination type
    if (!VALID_TERMINATION_TYPES.includes(terminationType)) {
      throw new Error('Invalid termination type');
    }

    // Calculate vesting for each grant
    let totalGrantedShares = 0;
    let totalVestedShares = 0;
    let totalUnvestedShares = 0;
    const processedGrants = [];
    let anyCliffNotMet = false;

    for (const grant of grants || []) {
      const vestingResult = this.calculateVestedShares({
        grantDate: grant.grantDate,
        terminationDate,
        totalGrantedShares: grant.totalShares,
        vestingSchedule: grant.vestingSchedule
      });

      totalGrantedShares += grant.totalShares;
      totalVestedShares += vestingResult.vestedShares;
      totalUnvestedShares += vestingResult.unvestedShares;

      if (vestingResult.cliffNotMet) {
        anyCliffNotMet = true;
      }

      processedGrants.push({
        grantId: grant.grantId,
        grantDate: grant.grantDate,
        totalShares: grant.totalShares,
        vestedShares: vestingResult.vestedShares,
        unvestedShares: vestingResult.unvestedShares,
        exercisePrice: grant.exercisePrice,
        vestingSchedule: grant.vestingSchedule
      });
    }

    // Calculate exercise window
    const exerciseWindowResult = this.calculateExerciseWindow({
      terminationDate,
      terminationType,
      equityPlanRules
    });

    // Determine initial status
    let status = 'processing';
    if (exerciseWindowResult.immediateForfeiture) {
      status = 'exercise_window_expired';
    } else if (totalVestedShares > 0) {
      status = 'exercise_window_open';
    } else {
      status = 'completed'; // No vested shares to exercise
    }

    const vestingPercentage = totalGrantedShares > 0
      ? Math.round((totalVestedShares / totalGrantedShares) * 10000) / 100
      : 0;

    // Create termination record
    const terminationRecord = {
      employeeId,
      companyId,
      terminationDate: new Date(terminationDate),
      terminationType,
      terminationReason,
      totalGrantedShares,
      vestedSharesAtTermination: totalVestedShares,
      unvestedSharesForfeited: totalUnvestedShares,
      vestingPercentage,
      grants: processedGrants,
      exerciseWindowDays: exerciseWindowResult.exerciseWindowDays,
      exerciseWindowEndDate: exerciseWindowResult.exerciseWindowEndDate,
      immediateForfeiture: exerciseWindowResult.immediateForfeiture,
      cliffNotMet: anyCliffNotMet,
      status,
      sharesExercised: 0,
      sharesForfeited: exerciseWindowResult.immediateForfeiture ? totalVestedShares : 0,
      processedAt: new Date()
    };

    const createdTermination = await databaseAdapter.create('Termination', terminationRecord);
    return createdTermination;
  }

  /**
   * Calculate repurchase rights for unvested/exercisable shares
   * @param {Object} params - Repurchase calculation parameters
   * @returns {Object} Repurchase rights details
   */
  calculateRepurchaseRights(params) {
    const {
      unvestedShares,
      originalExercisePrice,
      currentFMV,
      terminationType,
      companyPlanRules
    } = params;

    // For cause terminations typically forfeit all equity
    if (terminationType === 'for_cause') {
      return {
        repurchaseRightEnabled: false,
        immediateForfeiture: true,
        repurchasePrice: 0,
        totalRepurchaseValue: 0
      };
    }

    // Check if company has repurchase rights enabled
    if (!companyPlanRules || !companyPlanRules.repurchaseEnabled) {
      return {
        repurchaseRightEnabled: false,
        repurchasePrice: 0,
        totalRepurchaseValue: 0
      };
    }

    // Calculate repurchase price based on method
    let repurchasePrice;
    const method = companyPlanRules.repurchasePriceMethod || 'lower_of_exercise_or_fmv';

    switch (method) {
      case 'lower_of_exercise_or_fmv':
        repurchasePrice = Math.min(originalExercisePrice, currentFMV);
        break;
      case 'fmv_only':
        repurchasePrice = currentFMV;
        break;
      case 'exercise_price_only':
        repurchasePrice = originalExercisePrice;
        break;
      default:
        repurchasePrice = Math.min(originalExercisePrice, currentFMV);
    }

    return {
      repurchaseRightEnabled: true,
      repurchasePrice,
      totalRepurchaseValue: repurchasePrice * unvestedShares,
      repurchasePriceMethod: method
    };
  }

  /**
   * Get exercise window status for a termination
   * @param {string} terminationId - Termination ID
   * @returns {Object} Exercise window status
   */
  async getExerciseWindowStatus(terminationId) {
    const termination = await databaseAdapter.findById('Termination', terminationId);

    if (!termination) {
      throw new Error('Termination not found');
    }

    const now = new Date();
    const endDate = new Date(termination.exerciseWindowEndDate);
    const isExpired = endDate < now;

    let daysRemaining = 0;
    if (!isExpired) {
      daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    }

    const sharesAvailableToExercise = termination.vestedSharesAtTermination - termination.sharesExercised;

    let status;
    if (isExpired) {
      status = 'expired';
    } else if (daysRemaining <= WARNING_THRESHOLD_DAYS) {
      status = 'warning';
    } else {
      status = 'open';
    }

    const result = {
      status,
      daysRemaining,
      exerciseWindowEndDate: termination.exerciseWindowEndDate,
      vestedSharesAtTermination: termination.vestedSharesAtTermination,
      sharesExercised: termination.sharesExercised,
      sharesAvailableToExercise
    };

    if (isExpired) {
      result.sharesForfeited = sharesAvailableToExercise;
    }

    return result;
  }

  /**
   * Extend exercise window for a termination
   * @param {string} terminationId - Termination ID
   * @param {Object} extensionData - Extension parameters
   * @returns {Object} Updated termination record
   */
  async extendExerciseWindow(terminationId, extensionData) {
    const { additionalDays, reason, approvedBy } = extensionData;

    const termination = await databaseAdapter.findById('Termination', terminationId);

    if (!termination) {
      throw new Error('Termination not found');
    }

    const now = new Date();
    if (new Date(termination.exerciseWindowEndDate) < now) {
      throw new Error('Cannot extend expired exercise window');
    }

    const newEndDate = new Date(termination.exerciseWindowEndDate);
    newEndDate.setDate(newEndDate.getDate() + additionalDays);

    const updatedTermination = await databaseAdapter.findByIdAndUpdate(
      'Termination',
      terminationId,
      {
        exerciseWindowEndDate: newEndDate,
        exerciseWindowDays: termination.exerciseWindowDays + additionalDays,
        exerciseWindowExtended: true,
        extensionReason: reason,
        extensionApprovedBy: approvedBy,
        extensionApprovedDate: new Date()
      },
      { new: true }
    );

    return updatedTermination;
  }

  /**
   * Record share exercise for a terminated employee
   * @param {string} terminationId - Termination ID
   * @param {Object} exerciseData - Exercise details
   * @returns {Object} Updated termination record
   */
  async recordExercise(terminationId, exerciseData) {
    const { shares, exercisePrice, fmvAtExercise } = exerciseData;

    const termination = await databaseAdapter.findById('Termination', terminationId);

    if (!termination) {
      throw new Error('Termination not found');
    }

    const now = new Date();
    if (new Date(termination.exerciseWindowEndDate) < now) {
      throw new Error('Exercise window has expired');
    }

    const availableShares = termination.vestedSharesAtTermination - termination.sharesExercised;
    if (shares > availableShares) {
      throw new Error('Insufficient shares available');
    }

    const exerciseRecord = {
      date: new Date(),
      shares,
      exercisePrice,
      fmvAtExercise,
      totalCost: shares * exercisePrice
    };

    const newSharesExercised = termination.sharesExercised + shares;
    const exerciseHistory = [...(termination.exerciseHistory || []), exerciseRecord];

    // Determine new status
    let newStatus = termination.status;
    if (newSharesExercised >= termination.vestedSharesAtTermination) {
      newStatus = 'completed';
    }

    const updatedTermination = await databaseAdapter.findByIdAndUpdate(
      'Termination',
      terminationId,
      {
        sharesExercised: newSharesExercised,
        exerciseHistory,
        status: newStatus
      },
      { new: true }
    );

    return updatedTermination;
  }

  /**
   * Generate termination-related documents
   * @param {string} terminationId - Termination ID
   * @returns {Object} Generated documents
   */
  async generateTerminationDocuments(terminationId) {
    const termination = await databaseAdapter.findById('Termination', terminationId);

    if (!termination) {
      throw new Error('Termination not found');
    }

    const documents = [];
    const now = new Date();

    // Termination notice
    documents.push({
      type: 'termination_notice',
      generatedAt: now,
      url: `/docs/${terminationId}/termination-notice.pdf`,
      content: {
        employeeId: termination.employeeId,
        terminationDate: termination.terminationDate,
        terminationType: termination.terminationType
      }
    });

    // Exercise window notification
    if (termination.exerciseWindowDays > 0) {
      documents.push({
        type: 'exercise_window_notification',
        generatedAt: now,
        url: `/docs/${terminationId}/exercise-window.pdf`,
        content: {
          exerciseWindowDays: termination.exerciseWindowDays,
          exerciseWindowEndDate: termination.exerciseWindowEndDate,
          vestedShares: termination.vestedSharesAtTermination
        }
      });
    }

    // Equity summary
    documents.push({
      type: 'equity_summary',
      generatedAt: now,
      url: `/docs/${terminationId}/equity-summary.pdf`,
      content: {
        totalGrantedShares: termination.totalGrantedShares,
        vestedSharesAtTermination: termination.vestedSharesAtTermination,
        unvestedSharesForfeited: termination.unvestedSharesForfeited,
        vestingPercentage: termination.vestingPercentage
      }
    });

    // Forfeiture notice (if there are unvested shares)
    if (termination.unvestedSharesForfeited > 0) {
      documents.push({
        type: 'forfeiture_notice',
        generatedAt: now,
        url: `/docs/${terminationId}/forfeiture-notice.pdf`,
        content: {
          unvestedSharesForfeited: termination.unvestedSharesForfeited,
          forfeitureDate: termination.terminationDate
        }
      });
    }

    // Update termination with generated documents
    await databaseAdapter.findByIdAndUpdate(
      'Termination',
      terminationId,
      { documentsGenerated: documents },
      { new: true }
    );

    return { documents };
  }

  /**
   * Get terminations for a company with optional filters
   * @param {string} companyId - Company ID
   * @param {Object} filters - Optional filters
   * @returns {Array} Termination records
   */
  async getTerminationsByCompany(companyId, filters = {}) {
    const query = { companyId };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.terminationType) {
      query.terminationType = filters.terminationType;
    }

    if (filters.startDate || filters.endDate) {
      query.terminationDate = {};
      if (filters.startDate) {
        query.terminationDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.terminationDate.$lte = new Date(filters.endDate);
      }
    }

    const options = {
      sort: { terminationDate: -1 }
    };

    if (filters.limit) {
      options.limit = parseInt(filters.limit, 10);
    }

    return await databaseAdapter.find('Termination', query, options);
  }

  /**
   * Update termination status based on current state
   * @param {string} terminationId - Termination ID
   * @returns {Object} Updated termination record
   */
  async updateTerminationStatus(terminationId) {
    const termination = await databaseAdapter.findById('Termination', terminationId);

    if (!termination) {
      throw new Error('Termination not found');
    }

    const now = new Date();
    const isExpired = new Date(termination.exerciseWindowEndDate) < now;
    const availableShares = termination.vestedSharesAtTermination - termination.sharesExercised;

    let newStatus = termination.status;
    let sharesForfeited = termination.sharesForfeited;

    if (termination.sharesExercised >= termination.vestedSharesAtTermination) {
      newStatus = 'completed';
    } else if (isExpired && termination.status === 'exercise_window_open') {
      newStatus = 'exercise_window_expired';
      sharesForfeited = availableShares;
    }

    if (newStatus !== termination.status || sharesForfeited !== termination.sharesForfeited) {
      return await databaseAdapter.findByIdAndUpdate(
        'Termination',
        terminationId,
        { status: newStatus, sharesForfeited },
        { new: true }
      );
    }

    return termination;
  }

  /**
   * Calculate months elapsed between two dates
   * @private
   */
  _calculateMonthsElapsed(startDate, endDate) {
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

module.exports = new TerminationService();
