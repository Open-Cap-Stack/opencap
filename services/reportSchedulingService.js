/**
 * Report Scheduling Service
 * Issue #112: Create Report Scheduling System
 *
 * Service for managing automated report scheduling including:
 * - CRUD operations for schedules
 * - Report execution
 * - Cron-based scheduling
 * - Delivery tracking
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

class ReportSchedulingService {
  /**
   * Validate a cron expression
   * @param {string} expression - Cron expression to validate
   * @returns {boolean} Whether the expression is valid
   */
  static validateCronExpression(expression) {
    if (!expression || typeof expression !== 'string') {
      return false;
    }

    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      return false;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Validate minute (0-59)
    if (!this._validateCronField(minute, 0, 59)) {
      return false;
    }

    // Validate hour (0-23)
    if (!this._validateCronField(hour, 0, 23)) {
      return false;
    }

    // Validate day of month (1-31)
    if (!this._validateCronField(dayOfMonth, 1, 31)) {
      return false;
    }

    // Validate month (1-12)
    if (!this._validateCronField(month, 1, 12)) {
      return false;
    }

    // Validate day of week (0-6)
    if (!this._validateCronField(dayOfWeek, 0, 6)) {
      return false;
    }

    return true;
  }

  /**
   * Validate a single cron field
   * @private
   */
  static _validateCronField(field, min, max) {
    // Handle wildcard
    if (field === '*') {
      return true;
    }

    // Handle step values (*/n)
    if (field.startsWith('*/')) {
      const step = parseInt(field.substring(2), 10);
      return !isNaN(step) && step > 0 && step <= max;
    }

    // Handle ranges (n-m)
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(n => parseInt(n, 10));
      return !isNaN(start) && !isNaN(end) && start >= min && end <= max && start <= end;
    }

    // Handle lists (n,m,...)
    if (field.includes(',')) {
      const values = field.split(',').map(n => parseInt(n, 10));
      return values.every(v => !isNaN(v) && v >= min && v <= max);
    }

    // Handle single value
    const value = parseInt(field, 10);
    return !isNaN(value) && value >= min && value <= max;
  }

  /**
   * Calculate the next run time from a cron expression
   * @param {string} cronExpression - Cron expression
   * @param {string} timezone - Timezone string (default: 'UTC')
   * @param {Date} fromDate - Date to calculate from (default: now)
   * @returns {Date} Next run date
   */
  static calculateNextRunTime(cronExpression, timezone = 'UTC', fromDate = new Date()) {
    const parts = cronExpression.trim().split(/\s+/);
    const [minuteExpr, hourExpr, dayOfMonthExpr, monthExpr, dayOfWeekExpr] = parts;

    // Start from the next minute
    const next = new Date(fromDate);
    next.setSeconds(0);
    next.setMilliseconds(0);
    next.setMinutes(next.getMinutes() + 1);

    // Simple implementation: iterate until we find a matching time
    const maxIterations = 366 * 24 * 60; // Max 1 year of minutes

    for (let i = 0; i < maxIterations; i++) {
      const minute = next.getMinutes();
      const hour = next.getHours();
      const dayOfMonth = next.getDate();
      const month = next.getMonth() + 1; // JS months are 0-indexed
      const dayOfWeek = next.getDay();

      if (
        this._matchesCronField(minute, minuteExpr) &&
        this._matchesCronField(hour, hourExpr) &&
        this._matchesCronField(dayOfMonth, dayOfMonthExpr) &&
        this._matchesCronField(month, monthExpr) &&
        this._matchesCronField(dayOfWeek, dayOfWeekExpr)
      ) {
        // Apply timezone offset if not UTC
        if (timezone !== 'UTC') {
          // Simple timezone handling - in production, use a library like moment-timezone
          const tzOffsets = {
            'America/New_York': -5,
            'America/Los_Angeles': -8,
            'Europe/London': 0,
            'Europe/Paris': 1,
            'Asia/Tokyo': 9
          };
          const offset = tzOffsets[timezone] || 0;
          next.setHours(next.getHours() - offset);
        }
        return next;
      }

      // Move to next minute
      next.setMinutes(next.getMinutes() + 1);
    }

    // Fallback: return 1 day from now if no match found
    const fallback = new Date(fromDate);
    fallback.setDate(fallback.getDate() + 1);
    return fallback;
  }

  /**
   * Check if a value matches a cron field expression
   * @private
   */
  static _matchesCronField(value, expression) {
    if (expression === '*') {
      return true;
    }

    if (expression.startsWith('*/')) {
      const step = parseInt(expression.substring(2), 10);
      return value % step === 0;
    }

    if (expression.includes('-')) {
      const [start, end] = expression.split('-').map(n => parseInt(n, 10));
      return value >= start && value <= end;
    }

    if (expression.includes(',')) {
      const values = expression.split(',').map(n => parseInt(n, 10));
      return values.includes(value);
    }

    return parseInt(expression, 10) === value;
  }

  /**
   * Validate email format
   * @private
   */
  static _validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a new scheduled report
   * @param {Object} data - Schedule data
   * @returns {Object} Created schedule
   */
  static async createSchedule(data) {
    // Validate required fields
    if (!data.companyId || !data.reportType || !data.name || !data.schedule) {
      throw new Error('Missing required fields: companyId, reportType, name, and schedule are required');
    }

    // Validate cron expression
    if (!this.validateCronExpression(data.schedule)) {
      throw new Error('Invalid cron expression');
    }

    // Validate email recipients if provided
    if (data.recipients && data.recipients.length > 0) {
      for (const email of data.recipients) {
        if (!this._validateEmail(email)) {
          throw new Error(`Invalid email format: ${email}`);
        }
      }
    }

    const scheduleData = {
      ...data,
      scheduleId: `RS-${uuidv4().slice(0, 8).toUpperCase()}`,
      status: 'active',
      nextRunAt: this.calculateNextRunTime(data.schedule, data.timezone || 'UTC')
    };

    return await databaseAdapter.create('ScheduledReport', scheduleData);
  }

  /**
   * Update an existing schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated schedule
   */
  static async updateSchedule(scheduleId, updateData) {
    const existing = await databaseAdapter.findOne('ScheduledReport', { scheduleId });
    if (!existing) {
      throw new Error('Schedule not found');
    }

    // Don't allow updating scheduleId
    delete updateData.scheduleId;

    // Validate cron expression if being updated
    if (updateData.schedule) {
      if (!this.validateCronExpression(updateData.schedule)) {
        throw new Error('Invalid cron expression');
      }
      // Recalculate next run time
      updateData.nextRunAt = this.calculateNextRunTime(
        updateData.schedule,
        updateData.timezone || existing.timezone || 'UTC'
      );
    }

    // Validate email recipients if being updated
    if (updateData.recipients && updateData.recipients.length > 0) {
      for (const email of updateData.recipients) {
        if (!this._validateEmail(email)) {
          throw new Error(`Invalid email format: ${email}`);
        }
      }
    }

    return await databaseAdapter.findByIdAndUpdate(
      'ScheduledReport',
      scheduleId,
      updateData,
      { new: true }
    );
  }

  /**
   * Pause an active schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Paused schedule
   */
  static async pauseSchedule(scheduleId) {
    const existing = await databaseAdapter.findOne('ScheduledReport', { scheduleId });
    if (!existing) {
      throw new Error('Schedule not found');
    }

    if (existing.status !== 'active') {
      throw new Error('Cannot pause a non-active schedule');
    }

    return await databaseAdapter.findByIdAndUpdate(
      'ScheduledReport',
      scheduleId,
      {
        status: 'paused',
        pausedAt: new Date()
      },
      { new: true }
    );
  }

  /**
   * Resume a paused schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Resumed schedule
   */
  static async resumeSchedule(scheduleId) {
    const existing = await databaseAdapter.findOne('ScheduledReport', { scheduleId });
    if (!existing) {
      throw new Error('Schedule not found');
    }

    if (existing.status !== 'paused') {
      throw new Error('Cannot resume a non-paused schedule');
    }

    // Recalculate next run time
    const nextRunAt = this.calculateNextRunTime(
      existing.schedule,
      existing.timezone || 'UTC'
    );

    return await databaseAdapter.findByIdAndUpdate(
      'ScheduledReport',
      scheduleId,
      {
        status: 'active',
        pausedAt: null,
        nextRunAt
      },
      { new: true }
    );
  }

  /**
   * Delete a schedule
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Deleted schedule
   */
  static async deleteSchedule(scheduleId) {
    const existing = await databaseAdapter.findOne('ScheduledReport', { scheduleId });
    if (!existing) {
      throw new Error('Schedule not found');
    }

    return await databaseAdapter.findByIdAndDelete('ScheduledReport', scheduleId);
  }

  /**
   * Get schedule by ID
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Schedule or null
   */
  static async getScheduleById(scheduleId) {
    return await databaseAdapter.findOne('ScheduledReport', { scheduleId });
  }

  /**
   * Get schedules by company
   * @param {string} companyId - Company ID
   * @param {Object} filters - Optional filters (status, etc.)
   * @returns {Array} Schedules
   */
  static async getSchedulesByCompany(companyId, filters = {}) {
    const query = { companyId };
    if (filters.status) {
      query.status = filters.status;
    }
    return await databaseAdapter.find('ScheduledReport', query);
  }

  /**
   * Run a scheduled report manually or from cron
   * @param {string} scheduleId - Schedule ID
   * @returns {Object} Execution record
   */
  static async runScheduledReport(scheduleId) {
    const schedule = await databaseAdapter.findOne('ScheduledReport', { scheduleId });
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (schedule.status !== 'active') {
      throw new Error('Cannot run a non-active schedule');
    }

    // Create execution record
    const execution = await databaseAdapter.create('ReportExecution', {
      executionId: `RE-${uuidv4().slice(0, 8).toUpperCase()}`,
      scheduleId,
      startedAt: new Date(),
      status: 'running',
      reportParameters: schedule.parameters,
      deliveryStatus: (schedule.recipients || []).map(recipient => ({
        recipient,
        status: 'pending'
      }))
    });

    // Update schedule with last run time and calculate next run
    const nextRunAt = this.calculateNextRunTime(
      schedule.schedule,
      schedule.timezone || 'UTC'
    );

    await databaseAdapter.findByIdAndUpdate(
      'ScheduledReport',
      scheduleId,
      {
        lastRunAt: new Date(),
        nextRunAt
      },
      { new: true }
    );

    // In a real implementation, we would:
    // 1. Generate the report based on reportType
    // 2. Store the file
    // 3. Send emails to recipients
    // 4. Update execution status

    return execution;
  }

  /**
   * Get reports due to run within a time window
   * @param {number} minutes - Time window in minutes (default: 60)
   * @param {string} companyId - Optional company filter
   * @returns {Array} Due schedules
   */
  static async getUpcomingReports(minutes = 60, companyId = null) {
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutes * 60 * 1000);

    const query = {
      status: 'active',
      nextRunAt: { $gte: now, $lte: futureTime }
    };

    if (companyId) {
      query.companyId = companyId;
    }

    return await databaseAdapter.find('ScheduledReport', query);
  }

  /**
   * Get execution history for a schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} options - Query options (limit, status)
   * @returns {Array} Execution history
   */
  static async getExecutionHistory(scheduleId, options = {}) {
    const query = { scheduleId };
    if (options.status) {
      query.status = options.status;
    }

    return await databaseAdapter.find('ReportExecution', query, {
      sort: { startedAt: -1 },
      limit: options.limit || 50
    });
  }

  /**
   * Process all due schedules (called by cron job)
   * @returns {Object} Processing results
   */
  static async processSchedules() {
    const now = new Date();
    const dueSchedules = await databaseAdapter.find('ScheduledReport', {
      status: 'active',
      nextRunAt: { $lte: now }
    });

    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const schedule of dueSchedules) {
      try {
        await this.runScheduledReport(schedule.scheduleId);
        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          scheduleId: schedule.scheduleId,
          error: error.message
        });

        // Update schedule failure count
        await databaseAdapter.findByIdAndUpdate(
          'ScheduledReport',
          schedule.scheduleId,
          {
            failureCount: (schedule.failureCount || 0) + 1,
            lastError: error.message
          },
          { new: true }
        );
      }
    }

    return results;
  }

  /**
   * Update execution status
   * @param {string} executionId - Execution ID
   * @param {Object} statusData - Status update data
   * @returns {Object} Updated execution
   */
  static async updateExecutionStatus(executionId, statusData) {
    const updateData = { ...statusData };

    if (statusData.status === 'completed' || statusData.status === 'failed') {
      updateData.completedAt = new Date();
    }

    return await databaseAdapter.findByIdAndUpdate(
      'ReportExecution',
      executionId,
      updateData,
      { new: true }
    );
  }

  /**
   * Update delivery status for a recipient
   * @param {string} executionId - Execution ID
   * @param {string} recipient - Recipient email
   * @param {Object} deliveryData - Delivery status data
   * @returns {Object} Updated execution
   */
  static async updateDeliveryStatus(executionId, recipient, deliveryData) {
    // In a real implementation, we would use $set with array filters
    // For now, we'll fetch, modify, and save
    return await databaseAdapter.findByIdAndUpdate(
      'ReportExecution',
      executionId,
      {
        $set: {
          'deliveryStatus.$[elem]': {
            recipient,
            ...deliveryData
          }
        }
      },
      {
        new: true,
        arrayFilters: [{ 'elem.recipient': recipient }]
      }
    );
  }
}

module.exports = ReportSchedulingService;
