/**
 * EquityPlanReport Service
 * Issue #110: Implement Equity Plan Reports
 *
 * Business logic for generating equity plan reports including option pool
 * summaries, grant status reports, vesting schedules, and dilution analysis.
 */
const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

// Grant types that count as options (ISO, NSO)
const OPTION_TYPES = ['ISO', 'NSO'];
// Grant types that are RSUs
const RSU_TYPES = ['RSU', 'RSA'];

class EquityPlanReportService {
  /**
   * Generate a unique report ID
   * @returns {string} Unique report ID
   */
  generateReportId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `RPT-${timestamp}-${random}`;
  }

  /**
   * Generate option pool summary report
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options
   * @returns {Object} Option pool summary data
   */
  async generateOptionPoolSummary(companyId, options = {}) {
    // Fetch all equity grants for the company
    const grants = await databaseAdapter.find('EquityGrant', {
      companyId,
      ...(options.status && { status: options.status })
    });

    // Fetch share classes for the company
    const shareClasses = await databaseAdapter.find('ShareClass', { companyId });

    // Calculate totals
    let totalGrantedShares = 0;
    let totalExercisedShares = 0;
    const byGrantType = {};
    const byShareClass = {};

    for (const grant of grants) {
      totalGrantedShares += grant.numberOfShares || 0;
      totalExercisedShares += grant.exercisedShares || 0;

      // Group by grant type
      if (!byGrantType[grant.grantType]) {
        byGrantType[grant.grantType] = {
          totalShares: 0,
          exercisedShares: 0,
          grantCount: 0
        };
      }
      byGrantType[grant.grantType].totalShares += grant.numberOfShares || 0;
      byGrantType[grant.grantType].exercisedShares += grant.exercisedShares || 0;
      byGrantType[grant.grantType].grantCount += 1;

      // Group by share class if available
      if (grant.shareClassId) {
        if (!byShareClass[grant.shareClassId]) {
          byShareClass[grant.shareClassId] = {
            totalShares: 0,
            exercisedShares: 0,
            grantCount: 0
          };
        }
        byShareClass[grant.shareClassId].totalShares += grant.numberOfShares || 0;
        byShareClass[grant.shareClassId].exercisedShares += grant.exercisedShares || 0;
        byShareClass[grant.shareClassId].grantCount += 1;
      }
    }

    // Calculate total pool from share classes
    let totalPoolShares = 0;
    let totalAuthorizedShares = 0;
    for (const shareClass of shareClasses) {
      totalPoolShares += shareClass.dilutedShares || 0;
      totalAuthorizedShares += shareClass.authorizedShares || 0;
    }

    const availableShares = totalPoolShares - totalGrantedShares;

    return {
      companyId,
      reportDate: new Date(),
      totalPoolShares,
      totalAuthorizedShares,
      grantedShares: totalGrantedShares,
      exercisedShares: totalExercisedShares,
      unvestedShares: totalGrantedShares - totalExercisedShares,
      availableShares: Math.max(0, availableShares),
      utilizationRate: totalPoolShares > 0
        ? ((totalGrantedShares / totalPoolShares) * 100).toFixed(2)
        : 0,
      byGrantType,
      byShareClass,
      shareClasses: shareClasses.map(sc => ({
        name: sc.name,
        authorizedShares: sc.authorizedShares,
        dilutedShares: sc.dilutedShares,
        ownershipPercentage: sc.ownershipPercentage
      }))
    };
  }

  /**
   * Generate grant status report
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options (startDate, endDate, grantTypes)
   * @returns {Object} Grant status report data
   */
  async generateGrantStatusReport(companyId, options = {}) {
    const query = { companyId };

    // Apply date range filter
    if (options.startDate || options.endDate) {
      query.grantDate = {};
      if (options.startDate) {
        query.grantDate.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.grantDate.$lte = new Date(options.endDate);
      }
    }

    // Apply grant type filter
    if (options.grantTypes && options.grantTypes.length > 0) {
      query.grantType = { $in: options.grantTypes };
    }

    const grants = await databaseAdapter.find('EquityGrant', query);

    // Process grants with vesting progress
    const processedGrants = grants.map(grant => {
      const vestingProgress = this._calculateVestingProgress(grant);

      return {
        grantId: grant.grantId,
        employeeId: grant.employeeId,
        grantType: grant.grantType,
        numberOfShares: grant.numberOfShares,
        exercisedShares: grant.exercisedShares || 0,
        status: grant.status,
        grantDate: grant.grantDate,
        expirationDate: grant.expirationDate,
        strikePrice: grant.strikePrice,
        vestingProgress
      };
    });

    // Calculate summary statistics
    const summary = {
      totalGrants: grants.length,
      totalShares: 0,
      totalExercised: 0,
      byStatus: {},
      byGrantType: {}
    };

    for (const grant of grants) {
      summary.totalShares += grant.numberOfShares || 0;
      summary.totalExercised += grant.exercisedShares || 0;

      // Count by status
      if (!summary.byStatus[grant.status]) {
        summary.byStatus[grant.status] = 0;
      }
      summary.byStatus[grant.status] += 1;

      // Count by grant type
      if (!summary.byGrantType[grant.grantType]) {
        summary.byGrantType[grant.grantType] = 0;
      }
      summary.byGrantType[grant.grantType] += 1;
    }

    return {
      companyId,
      reportDate: new Date(),
      totalGrants: grants.length,
      grants: processedGrants,
      summary
    };
  }

  /**
   * Generate vesting schedule report
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options (forecastMonths)
   * @returns {Object} Vesting schedule report data
   */
  async generateVestingScheduleReport(companyId, options = {}) {
    const forecastMonths = options.forecastMonths || 12;

    // Fetch active vesting schedules
    const schedules = await databaseAdapter.find('VestingSchedule', {
      companyId,
      status: 'active'
    });

    // Calculate upcoming vesting events
    const upcomingVestingEvents = [];
    const now = new Date();
    const forecastEndDate = new Date();
    forecastEndDate.setMonth(forecastEndDate.getMonth() + forecastMonths);

    for (const schedule of schedules) {
      const events = this._calculateUpcomingVestingEvents(schedule, now, forecastEndDate);
      upcomingVestingEvents.push(...events);
    }

    // Sort events by date
    upcomingVestingEvents.sort((a, b) => new Date(a.vestingDate) - new Date(b.vestingDate));

    // Calculate summary
    let totalVested = 0;
    let totalUnvested = 0;
    let totalShares = 0;

    for (const schedule of schedules) {
      totalVested += schedule.vestedShares || 0;
      totalUnvested += schedule.unvestedShares || 0;
      totalShares += schedule.totalShares || 0;
    }

    return {
      companyId,
      reportDate: new Date(),
      forecastMonths,
      schedules: schedules.map(s => ({
        scheduleId: s.scheduleId,
        stakeholderId: s.stakeholderId,
        totalShares: s.totalShares,
        vestedShares: s.vestedShares,
        unvestedShares: s.unvestedShares,
        vestingStartDate: s.vestingStartDate,
        vestingEndDate: s.vestingEndDate,
        nextVestingDate: s.nextVestingDate,
        vestingFrequency: s.vestingFrequency,
        status: s.status
      })),
      upcomingVestingEvents,
      summary: {
        totalSchedules: schedules.length,
        totalShares,
        totalVested,
        totalUnvested,
        vestingPercentage: totalShares > 0
          ? ((totalVested / totalShares) * 100).toFixed(2)
          : 0
      }
    };
  }

  /**
   * Generate dilution analysis report
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options
   * @returns {Object} Dilution analysis data
   */
  async generateDilutionAnalysis(companyId, options = {}) {
    // Fetch share classes
    const shareClasses = await databaseAdapter.find('ShareClass', { companyId });

    // Fetch all grants
    const grants = await databaseAdapter.find('EquityGrant', {
      companyId,
      status: { $in: ['active', 'pending', 'approved'] }
    });

    // Calculate issued shares
    let issuedShares = 0;
    for (const shareClass of shareClasses) {
      issuedShares += shareClass.dilutedShares || 0;
    }

    // Calculate outstanding options and RSUs
    let outstandingOptions = 0;
    let outstandingRSUs = 0;
    let exercisedOptions = 0;

    for (const grant of grants) {
      const unvestedShares = (grant.numberOfShares || 0) - (grant.exercisedShares || 0);

      if (OPTION_TYPES.includes(grant.grantType)) {
        outstandingOptions += unvestedShares;
        exercisedOptions += grant.exercisedShares || 0;
      } else if (RSU_TYPES.includes(grant.grantType)) {
        outstandingRSUs += unvestedShares;
      }
    }

    // Calculate fully diluted shares
    const fullyDilutedShares = issuedShares + outstandingOptions + outstandingRSUs;

    // Calculate dilution impact
    const currentDilution = fullyDilutedShares > 0
      ? ((outstandingOptions + outstandingRSUs) / fullyDilutedShares * 100).toFixed(2)
      : 0;

    // Build ownership table
    const ownershipTable = shareClasses.map(sc => ({
      name: sc.name,
      shares: sc.dilutedShares,
      percentage: fullyDilutedShares > 0
        ? ((sc.dilutedShares / fullyDilutedShares) * 100).toFixed(2)
        : 0
    }));

    // Add options pool to ownership table
    if (outstandingOptions > 0) {
      ownershipTable.push({
        name: 'Outstanding Options',
        shares: outstandingOptions,
        percentage: ((outstandingOptions / fullyDilutedShares) * 100).toFixed(2)
      });
    }

    if (outstandingRSUs > 0) {
      ownershipTable.push({
        name: 'Outstanding RSUs',
        shares: outstandingRSUs,
        percentage: ((outstandingRSUs / fullyDilutedShares) * 100).toFixed(2)
      });
    }

    return {
      companyId,
      reportDate: new Date(),
      issuedShares,
      fullyDilutedShares,
      currentDilution: parseFloat(currentDilution),
      dilutionImpact: {
        options: outstandingOptions,
        rsus: outstandingRSUs,
        totalDilutive: outstandingOptions + outstandingRSUs
      },
      dilutionBreakdown: {
        options: {
          outstanding: outstandingOptions,
          exercised: exercisedOptions,
          percentage: fullyDilutedShares > 0
            ? ((outstandingOptions / fullyDilutedShares) * 100).toFixed(2)
            : 0
        },
        rsus: {
          outstanding: outstandingRSUs,
          percentage: fullyDilutedShares > 0
            ? ((outstandingRSUs / fullyDilutedShares) * 100).toFixed(2)
            : 0
        }
      },
      ownershipTable
    };
  }

  /**
   * Export report to specified format
   * @param {Object} reportData - Report data to export
   * @param {string} format - Export format (json, csv, excel, pdf)
   * @returns {Object} Export result with format and data
   */
  async exportReport(reportData, format) {
    const supportedFormats = ['json', 'csv', 'excel', 'pdf'];

    if (!supportedFormats.includes(format)) {
      throw new Error('Unsupported export format');
    }

    let exportData;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(reportData.generatedData || reportData, null, 2);
        break;

      case 'csv':
        exportData = this._convertToCSV(reportData.generatedData || reportData);
        break;

      case 'excel':
        // Excel export would use a library like exceljs
        // For now, return CSV-compatible data
        exportData = this._convertToCSV(reportData.generatedData || reportData);
        break;

      case 'pdf':
        // PDF export would use a library like pdfkit
        // For now, return JSON data as placeholder
        exportData = JSON.stringify(reportData.generatedData || reportData, null, 2);
        break;

      default:
        exportData = reportData.generatedData || reportData;
    }

    return {
      format,
      data: exportData,
      exportedAt: new Date()
    };
  }

  /**
   * Create a new report record
   * @param {Object} reportData - Report data
   * @returns {Object} Created report
   */
  async createReport(reportData) {
    const report = {
      reportId: this.generateReportId(),
      ...reportData,
      status: 'pending',
      createdAt: new Date()
    };

    return databaseAdapter.create('EquityPlanReport', report);
  }

  /**
   * Get report by ID
   * @param {string} reportId - Report ID
   * @returns {Object} Report document
   */
  async getReportById(reportId) {
    return databaseAdapter.findById('EquityPlanReport', reportId);
  }

  /**
   * Get reports by company
   * @param {string} companyId - Company ID
   * @param {Object} options - Filter options
   * @returns {Array} List of reports
   */
  async getReportsByCompany(companyId, options = {}) {
    const query = { companyId };

    if (options.reportType) {
      query.reportType = options.reportType;
    }

    if (options.status) {
      query.status = options.status;
    }

    return databaseAdapter.find('EquityPlanReport', query);
  }

  /**
   * Update report status
   * @param {string} reportId - Report ID
   * @param {string} status - New status
   * @param {string} errorMessage - Error message (for failed status)
   * @returns {Object} Updated report
   */
  async updateReportStatus(reportId, status, errorMessage = null) {
    const updateData = { status };

    if (status === 'completed') {
      updateData.generatedAt = new Date();
    }

    if (status === 'failed' && errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    return databaseAdapter.findByIdAndUpdate(
      'EquityPlanReport',
      reportId,
      updateData,
      { new: true }
    );
  }

  /**
   * Delete a report
   * @param {string} reportId - Report ID
   * @returns {Object} Deleted report
   */
  async deleteReport(reportId) {
    return databaseAdapter.findByIdAndDelete('EquityPlanReport', reportId);
  }

  // Private helper methods

  /**
   * Calculate vesting progress for a grant
   * @private
   */
  _calculateVestingProgress(grant) {
    if (!grant.vestingSchedule) {
      return {
        vestedShares: grant.numberOfShares,
        vestedPercentage: 100,
        isFullyVested: true
      };
    }

    const {
      vestingStartDate,
      vestingPeriodMonths,
      cliffMonths,
      vestingFrequency
    } = grant.vestingSchedule;

    const startDate = new Date(vestingStartDate);
    const now = new Date();

    // Calculate months elapsed
    const monthsElapsed = this._monthsBetween(startDate, now);

    // Before cliff
    if (monthsElapsed < cliffMonths) {
      return {
        vestedShares: 0,
        vestedPercentage: 0,
        monthsUntilCliff: cliffMonths - monthsElapsed,
        isFullyVested: false
      };
    }

    // After full vesting
    if (monthsElapsed >= vestingPeriodMonths) {
      return {
        vestedShares: grant.numberOfShares,
        vestedPercentage: 100,
        isFullyVested: true
      };
    }

    // Calculate vested based on frequency
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

    const vestedPercentage = (vestedMonths / vestingPeriodMonths) * 100;
    const vestedShares = Math.floor((vestedMonths / vestingPeriodMonths) * grant.numberOfShares);

    return {
      vestedShares,
      vestedPercentage: Math.round(vestedPercentage * 100) / 100,
      unvestedShares: grant.numberOfShares - vestedShares,
      isFullyVested: false
    };
  }

  /**
   * Calculate upcoming vesting events
   * @private
   */
  _calculateUpcomingVestingEvents(schedule, startDate, endDate) {
    const events = [];

    if (!schedule.vestingStartDate || schedule.status !== 'active') {
      return events;
    }

    const vestingStart = new Date(schedule.vestingStartDate);
    const vestingEnd = schedule.vestingEndDate ? new Date(schedule.vestingEndDate) : null;
    const cliffMonths = schedule.cliffPeriodMonths || 0;
    const vestingPeriodMonths = schedule.vestingPeriodMonths || 48;
    const frequency = schedule.vestingFrequency || 'monthly';

    // Get frequency in months
    const frequencyMonths = frequency === 'monthly' ? 1 :
                           frequency === 'quarterly' ? 3 :
                           frequency === 'annually' ? 12 : 1;

    // Calculate shares per vesting event
    const totalVestingEvents = Math.floor((vestingPeriodMonths - cliffMonths) / frequencyMonths);
    const sharesPerEvent = totalVestingEvents > 0
      ? Math.floor(schedule.totalShares / totalVestingEvents)
      : 0;

    // Generate events within the forecast period
    let currentDate = new Date(vestingStart);
    currentDate.setMonth(currentDate.getMonth() + cliffMonths);

    while (currentDate <= endDate && (!vestingEnd || currentDate <= vestingEnd)) {
      if (currentDate >= startDate) {
        events.push({
          scheduleId: schedule.scheduleId,
          stakeholderId: schedule.stakeholderId,
          vestingDate: new Date(currentDate),
          sharesVesting: sharesPerEvent,
          eventType: events.length === 0 ? 'cliff' : 'periodic'
        });
      }
      currentDate.setMonth(currentDate.getMonth() + frequencyMonths);
    }

    return events;
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

    if (end.getDate() < start.getDate()) {
      months--;
    }

    return Math.max(0, months);
  }

  /**
   * Convert data to CSV format
   * @private
   */
  _convertToCSV(data) {
    if (!data) return '';

    // Handle arrays of objects
    if (Array.isArray(data.grants)) {
      const grants = data.grants;
      if (grants.length === 0) return '';

      const headers = Object.keys(grants[0]);
      const rows = grants.map(grant =>
        headers.map(header => {
          const value = grant[header];
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return value;
        }).join(',')
      );

      return [headers.join(','), ...rows].join('\n');
    }

    // Handle simple objects
    return JSON.stringify(data);
  }
}

module.exports = new EquityPlanReportService();
