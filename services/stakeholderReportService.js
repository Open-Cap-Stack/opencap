/**
 * StakeholderReportService
 * Issue #198: Enhance Stakeholder Report Generation
 *
 * Service for stakeholder report generation including:
 * - Holdings reports
 * - Transaction history reports
 * - Valuation reports
 * - Tax documents
 * - Automated delivery scheduling
 */

const StakeholderReport = require('../models/StakeholderReport');
const Stakeholder = require('../models/Stakeholder');
const EquityGrant = require('../models/EquityGrant');
const Activity = require('../models/Activity');
const Valuation409A = require('../models/Valuation409A');
const zerodbService = require('./zerodbService');

let tablesEnsured = false;

/**
 * Ensure required ZeroDB tables exist (equity_grants, stakeholder_reports)
 * Creates them if they don't exist. Only runs once per process lifetime.
 */
const ensureTables = async () => {
  if (tablesEnsured) return;

  const tables = [
    { name: 'equity_grants', schema: { fields: {} } },
    { name: 'stakeholder_reports', schema: { fields: {} } }
  ];

  let allSucceeded = true;
  for (const table of tables) {
    try {
      await zerodbService.createTable(table.name, table.schema);
    } catch (err) {
      const isAlreadyExists = err.response?.status === 409 ||
        err.message?.includes('already exists');
      if (!isAlreadyExists) {
        console.error(`Warning: could not ensure table ${table.name}: ${err.message}`);
        allSucceeded = false;
      }
    }
  }

  tablesEnsured = allSucceeded;
};

/**
 * Generate a unique report ID
 * @returns {string} Report ID in format SR-XXXXXXXX
 */
const generateReportId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SR-';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

/**
 * Validate cron expression format
 * @param {string} expression - Cron expression to validate
 * @returns {boolean} True if valid
 */
const validateCronExpression = (expression) => {
  if (!expression || typeof expression !== 'string') return false;

  // Basic cron format: minute hour day month weekday
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  // Simple validation - each part should be a valid cron field
  const patterns = [
    /^(\*|[0-5]?\d)$/,           // minute (0-59)
    /^(\*|[01]?\d|2[0-3])$/,     // hour (0-23)
    /^(\*|[1-9]|[12]\d|3[01])$/, // day (1-31)
    /^(\*|[1-9]|1[0-2])$/,       // month (1-12)
    /^(\*|[0-6])$/               // weekday (0-6)
  ];

  for (let i = 0; i < 5; i++) {
    if (!patterns[i].test(parts[i])) return false;
  }

  return true;
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Aggregate holdings data for a stakeholder
 * @param {string} stakeholderId - Stakeholder ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Aggregated holdings data
 */
const aggregateHoldingsData = async (stakeholderId, companyId) => {
  let equities = [];
  try {
    equities = await EquityGrant.find({ employeeId: stakeholderId, companyId });
    if (equities.length === 0) {
      equities = await EquityGrant.find({ stakeholderId, companyId });
    }
  } catch (err) {
    console.warn(`Could not fetch equity grants for ${stakeholderId}: ${err.message}`);
    equities = [];
  }

  const holdings = equities.map(equity => ({
    shareClass: equity.shareClass || 'Common',
    shares: equity.shares || 0,
    vestingSchedule: equity.vestingSchedule || null,
    vestedShares: equity.vestedShares || equity.shares || 0,
    unvestedShares: equity.unvestedShares || 0,
    exercisableOptions: equity.exercisableOptions || 0,
    grantDate: equity.grantDate || null,
    exercisePrice: equity.exercisePrice || 0
  }));

  const totalShares = holdings.reduce((sum, h) => sum + h.shares, 0);
  const totalVested = holdings.reduce((sum, h) => sum + h.vestedShares, 0);

  return {
    holdings,
    summary: {
      totalShares,
      totalVested,
      totalUnvested: totalShares - totalVested,
      holdingsCount: holdings.length
    }
  };
};

/**
 * Aggregate transaction data for a stakeholder
 * @param {string} stakeholderId - Stakeholder ID
 * @param {string} companyId - Company ID
 * @param {Object} dateRange - Optional date range filter
 * @returns {Promise<Object>} Aggregated transaction data
 */
const aggregateTransactionData = async (stakeholderId, companyId, dateRange = {}) => {
  const query = { stakeholderId, companyId };

  let activities = [];
  try {
    activities = await Activity.find(query);
  } catch (err) {
    console.warn(`Could not fetch activities for ${stakeholderId}: ${err.message}`);
    activities = [];
  }

  let filteredActivities = activities;
  if (dateRange.startDate || dateRange.endDate) {
    filteredActivities = activities.filter(activity => {
      const activityDate = new Date(activity.date || activity.createdAt);
      if (dateRange.startDate && activityDate < new Date(dateRange.startDate)) return false;
      if (dateRange.endDate && activityDate > new Date(dateRange.endDate)) return false;
      return true;
    });
  }

  const transactions = filteredActivities.map(activity => ({
    date: activity.date || activity.createdAt,
    type: activity.type || 'unknown',
    description: activity.description || '',
    shares: activity.shares || 0,
    pricePerShare: activity.pricePerShare || 0,
    totalValue: (activity.shares || 0) * (activity.pricePerShare || 0)
  }));

  return {
    transactions,
    summary: {
      totalTransactions: transactions.length,
      dateRange: {
        start: dateRange.startDate || 'All time',
        end: dateRange.endDate || 'Present'
      }
    }
  };
};

/**
 * Calculate cost basis for tax reporting
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Cost basis data
 */
const calculateCostBasis = (transactions) => {
  let totalCost = 0;
  let totalShares = 0;

  transactions.forEach(tx => {
    if (tx.type === 'purchase' || tx.type === 'grant' || tx.type === 'exercise') {
      totalCost += tx.totalValue || 0;
      totalShares += tx.shares || 0;
    }
  });

  return {
    totalCost,
    totalShares,
    averageCostPerShare: totalShares > 0 ? totalCost / totalShares : 0
  };
};

/**
 * Render holdings report template
 * @param {Object} data - Holdings data
 * @param {Object} stakeholder - Stakeholder info
 * @returns {Object} Rendered template data
 */
const renderHoldingsTemplate = (data, stakeholder) => {
  return {
    title: 'Holdings Report',
    stakeholder: {
      name: stakeholder.name,
      email: stakeholder.email,
      type: stakeholder.type
    },
    generatedAt: new Date().toISOString(),
    holdings: data.holdings,
    summary: data.summary
  };
};

/**
 * Render transactions report template
 * @param {Object} data - Transaction data
 * @param {Object} stakeholder - Stakeholder info
 * @returns {Object} Rendered template data
 */
const renderTransactionsTemplate = (data, stakeholder) => {
  return {
    title: 'Transaction History Report',
    stakeholder: {
      name: stakeholder.name,
      email: stakeholder.email
    },
    generatedAt: new Date().toISOString(),
    transactions: data.transactions,
    summary: data.summary
  };
};

/**
 * Render valuations report template
 * @param {Object} data - Valuation data
 * @param {Object} stakeholder - Stakeholder info
 * @returns {Object} Rendered template data
 */
const renderValuationsTemplate = (data, stakeholder) => {
  return {
    title: 'Valuation Report',
    stakeholder: {
      name: stakeholder.name,
      email: stakeholder.email
    },
    generatedAt: new Date().toISOString(),
    valuations: data.valuations,
    currentEquityValue: data.currentEquityValue,
    summary: data.summary
  };
};

/**
 * Render tax report template
 * @param {Object} data - Tax data
 * @param {Object} stakeholder - Stakeholder info
 * @param {number} taxYear - Tax year
 * @returns {Object} Rendered template data
 */
const renderTaxTemplate = (data, stakeholder, taxYear) => {
  return {
    title: `Tax Report - ${taxYear}`,
    stakeholder: {
      name: stakeholder.name,
      email: stakeholder.email
    },
    taxYear,
    generatedAt: new Date().toISOString(),
    transactions: data.transactions,
    costBasis: data.costBasis,
    summary: data.summary
  };
};

/**
 * Safely look up a stakeholder, throwing 'Stakeholder not found' for any failure
 */
const findStakeholder = async (stakeholderId) => {
  try {
    const stakeholder = await Stakeholder.findOne({ stakeholderId });
    if (!stakeholder) {
      throw new Error('Stakeholder not found');
    }
    return stakeholder;
  } catch (err) {
    if (err.message === 'Stakeholder not found') throw err;
    console.error(`Database error looking up stakeholder ${stakeholderId}: ${err.message}`);
    throw new Error('Stakeholder not found');
  }
};

class StakeholderReportService {
  /**
   * Get all reports for a stakeholder with optional filters
   * @param {string} stakeholderId - Stakeholder ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of reports
   */
  async getStakeholderReports(stakeholderId, filters = {}) {
    await ensureTables();
    return StakeholderReport.getStakeholderReports(stakeholderId, filters);
  }

  /**
   * Get a report by ID
   * @param {string} reportId - Report ID
   * @returns {Promise<Object|null>} Report or null
   */
  async getReportById(reportId) {
    return StakeholderReport.findByReportId(reportId);
  }

  /**
   * Generate holdings report for a stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Generated report
   */
  async generateHoldingsReport(stakeholderId, companyId, options = {}) {
    await ensureTables();

    // Verify stakeholder exists
    const stakeholder = await findStakeholder(stakeholderId);

    // Aggregate holdings data
    const holdingsData = await aggregateHoldingsData(stakeholderId, companyId);

    // Render template
    const reportData = renderHoldingsTemplate(holdingsData, stakeholder);

    // Create report record - if save fails, return generated data anyway
    const reportId = generateReportId();
    const format = options.format || 'pdf';
    const reportRecord = {
      reportId,
      stakeholderId,
      companyId,
      reportType: 'holdings',
      name: 'Holdings Report',
      format,
      status: 'completed',
      data: reportData,
      parameters: options,
      generatedAt: new Date().toISOString(),
      fileName: `holdings_Report_${reportId}.${format}`,
      fileSize: JSON.stringify(reportData).length,
      downloadCount: 0,
      fileUrl: `/files/reports/${reportId}.${format}`
    };

    try {
      const report = await StakeholderReport.create(reportRecord);
      return report;
    } catch (err) {
      console.warn(`Could not persist holdings report: ${err.message}`);
      return reportRecord;
    }
  }

  /**
   * Generate transactions report for a stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options including date range
   * @returns {Promise<Object>} Generated report
   */
  async generateTransactionsReport(stakeholderId, companyId, options = {}) {
    await ensureTables();

    // Verify stakeholder exists
    const stakeholder = await findStakeholder(stakeholderId);

    // Aggregate transaction data
    const dateRange = {
      startDate: options.startDate,
      endDate: options.endDate
    };
    const transactionData = await aggregateTransactionData(stakeholderId, companyId, dateRange);

    // Render template
    const reportData = renderTransactionsTemplate(transactionData, stakeholder);

    // Create report record - if save fails, return generated data anyway
    const reportId = generateReportId();
    const format = options.format || 'pdf';
    const reportRecord = {
      reportId,
      stakeholderId,
      companyId,
      reportType: 'transactions',
      name: 'Transaction History Report',
      format,
      status: 'completed',
      data: reportData,
      parameters: options,
      generatedAt: new Date().toISOString(),
      fileName: `transactions_Report_${reportId}.${format}`,
      fileSize: JSON.stringify(reportData).length,
      downloadCount: 0
    };

    try {
      const report = await StakeholderReport.create(reportRecord);
      return report;
    } catch (err) {
      console.warn(`Could not persist transactions report: ${err.message}`);
      return reportRecord;
    }
  }

  /**
   * Generate valuations report for a stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Generated report
   */
  async generateValuationsReport(stakeholderId, companyId, options = {}) {
    await ensureTables();

    // Verify stakeholder exists
    const stakeholder = await findStakeholder(stakeholderId);

    // Get valuations for the company
    let valuations = [];
    try {
      valuations = await Valuation409A.find({ companyId });
    } catch (err) {
      console.warn(`Could not fetch valuations for company ${companyId}: ${err.message}`);
      valuations = [];
    }

    // Get stakeholder's equity holdings (EquityGrant uses employeeId field)
    let equities = [];
    try {
      equities = await EquityGrant.find({ employeeId: stakeholderId, companyId });
      if (equities.length === 0) {
        equities = await EquityGrant.find({ stakeholderId, companyId });
      }
    } catch (err) {
      console.warn(`Could not fetch equity grants for ${stakeholderId}: ${err.message}`);
      equities = [];
    }
    const totalShares = equities.reduce((sum, e) => sum + (e.shares || 0), 0);

    // Calculate current equity value using latest valuation
    const latestValuation = valuations.length > 0 ? valuations[0] : null;
    const currentEquityValue = latestValuation
      ? totalShares * (latestValuation.pricePerShare || 0)
      : 0;

    const valuationData = {
      valuations: valuations.map(v => ({
        date: v.valuationDate || v.createdAt,
        pricePerShare: v.pricePerShare || 0,
        totalValuation: v.totalValuation || 0,
        type: v.type || '409A'
      })),
      currentEquityValue,
      summary: {
        totalShares,
        latestPricePerShare: latestValuation ? latestValuation.pricePerShare : 0,
        valuationCount: valuations.length
      }
    };

    // Render template
    const reportData = renderValuationsTemplate(valuationData, stakeholder);

    // Create report record - if save fails, return generated data anyway
    const reportId = generateReportId();
    const format = options.format || 'pdf';
    const reportRecord = {
      reportId,
      stakeholderId,
      companyId,
      reportType: 'valuations',
      name: 'Valuation Report',
      format,
      status: 'completed',
      data: reportData,
      parameters: options,
      generatedAt: new Date().toISOString(),
      fileName: `valuations_Report_${reportId}.${format}`,
      fileSize: JSON.stringify(reportData).length,
      downloadCount: 0
    };

    try {
      const report = await StakeholderReport.create(reportRecord);
      return report;
    } catch (err) {
      console.warn(`Could not persist valuations report: ${err.message}`);
      return reportRecord;
    }
  }

  /**
   * Generate tax report for a stakeholder
   * @param {string} stakeholderId - Stakeholder ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Report options including taxYear
   * @returns {Promise<Object>} Generated report
   */
  async generateTaxReport(stakeholderId, companyId, options = {}) {
    const { taxYear } = options;

    // Validate tax year
    if (!taxYear || isNaN(taxYear) || taxYear < 1900 || taxYear > 2100) {
      throw new Error('Invalid tax year');
    }

    await ensureTables();

    // Verify stakeholder exists
    const stakeholder = await findStakeholder(stakeholderId);

    // Get transactions for the tax year
    const startDate = `${taxYear}-01-01`;
    const endDate = `${taxYear}-12-31`;
    const transactionData = await aggregateTransactionData(stakeholderId, companyId, {
      startDate,
      endDate
    });

    // Calculate cost basis
    const costBasis = calculateCostBasis(transactionData.transactions);

    const taxData = {
      transactions: transactionData.transactions,
      costBasis,
      summary: {
        taxYear,
        totalTransactions: transactionData.transactions.length,
        ...costBasis
      }
    };

    // Render template
    const reportData = renderTaxTemplate(taxData, stakeholder, taxYear);

    // Create report record - if save fails, return generated data anyway
    const reportId = generateReportId();
    const format = options.format || 'pdf';
    const reportRecord = {
      reportId,
      stakeholderId,
      companyId,
      reportType: 'tax',
      name: `Tax Report - ${taxYear}`,
      format,
      status: 'completed',
      data: reportData,
      parameters: options,
      generatedAt: new Date().toISOString(),
      fileName: `tax_Report_${reportId}.${format}`,
      fileSize: JSON.stringify(reportData).length,
      downloadCount: 0
    };

    try {
      const report = await StakeholderReport.create(reportRecord);
      return report;
    } catch (err) {
      console.warn(`Could not persist tax report: ${err.message}`);
      return reportRecord;
    }
  }

  /**
   * Download a report
   * @param {string} reportId - Report ID
   * @returns {Promise<Object>} Download info with URL
   */
  async downloadReport(reportId) {
    const report = await StakeholderReport.findByReportId(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'completed' && report.status !== 'delivered') {
      throw new Error('Report is not ready for download');
    }

    return {
      reportId: report.reportId,
      fileUrl: report.fileUrl || `/files/reports/${reportId}.${report.format}`,
      format: report.format,
      generatedAt: report.generatedAt
    };
  }

  /**
   * Schedule automated report delivery
   * @param {Object} scheduleData - Schedule configuration
   * @returns {Promise<Object>} Created schedule
   */
  async scheduleAutomatedDelivery(scheduleData) {
    const { stakeholderId, companyId, reportType, schedule, recipients, format } = scheduleData;

    // Validate cron expression
    if (!validateCronExpression(schedule)) {
      throw new Error('Invalid schedule format');
    }

    // Validate recipients
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      throw new Error('At least one recipient is required');
    }

    for (const email of recipients) {
      if (!validateEmail(email)) {
        throw new Error('Invalid email format');
      }
    }

    // Create a scheduled report entry
    const report = await StakeholderReport.create({
      reportId: generateReportId(),
      stakeholderId,
      companyId,
      reportType,
      name: `Scheduled ${reportType} Report`,
      format: format || 'pdf',
      status: 'scheduled',
      schedule,
      recipients,
      deliveryMethod: 'email',
      parameters: scheduleData
    });

    return {
      reportId: report.reportId,
      stakeholderId,
      schedule,
      status: 'scheduled',
      nextDeliveryAt: this._calculateNextDelivery(schedule)
    };
  }

  /**
   * Calculate next delivery time from cron expression
   * @param {string} cronExpression - Cron expression
   * @returns {string} ISO timestamp of next delivery
   * @private
   */
  _calculateNextDelivery(cronExpression) {
    // Simplified calculation - return next hour for demo
    const next = new Date();
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
    next.setSeconds(0);
    next.setMilliseconds(0);
    return next.toISOString();
  }
}

const instance = new StakeholderReportService();

// Expose for testing
instance._resetTablesEnsured = () => { tablesEnsured = false; };

module.exports = instance;
