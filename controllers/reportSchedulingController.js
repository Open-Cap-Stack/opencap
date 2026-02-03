/**
 * Report Scheduling Controller
 * Issue #112: Create Report Scheduling System
 *
 * REST API controller for managing scheduled reports
 */

const ReportSchedulingService = require('../services/reportSchedulingService');

/**
 * Create a new scheduled report
 * POST /api/v1/reports/schedules
 */
const createSchedule = async (req, res) => {
  try {
    const schedule = await ReportSchedulingService.createSchedule(req.body);
    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Report schedule created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all schedules for a company
 * GET /api/v1/reports/schedules
 */
const getSchedules = async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId is required'
      });
    }

    const filters = {};
    if (req.query.status) {
      filters.status = req.query.status;
    }

    const schedules = await ReportSchedulingService.getSchedulesByCompany(companyId, filters);
    res.status(200).json({
      success: true,
      data: schedules,
      count: schedules.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get a single schedule by ID
 * GET /api/v1/reports/schedules/:scheduleId
 */
const getScheduleById = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await ReportSchedulingService.getScheduleById(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update a schedule
 * PUT /api/v1/reports/schedules/:scheduleId
 */
const updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await ReportSchedulingService.updateSchedule(scheduleId, req.body);

    res.status(200).json({
      success: true,
      data: schedule,
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    if (error.message === 'Schedule not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a schedule
 * DELETE /api/v1/reports/schedules/:scheduleId
 */
const deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    await ReportSchedulingService.deleteSchedule(scheduleId);

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    if (error.message === 'Schedule not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Pause a schedule
 * POST /api/v1/reports/schedules/:scheduleId/pause
 */
const pauseSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await ReportSchedulingService.pauseSchedule(scheduleId);

    res.status(200).json({
      success: true,
      data: schedule,
      message: 'Schedule paused successfully'
    });
  } catch (error) {
    if (error.message === 'Schedule not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Resume a paused schedule
 * POST /api/v1/reports/schedules/:scheduleId/resume
 */
const resumeSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = await ReportSchedulingService.resumeSchedule(scheduleId);

    res.status(200).json({
      success: true,
      data: schedule,
      message: 'Schedule resumed successfully'
    });
  } catch (error) {
    if (error.message === 'Schedule not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Run a scheduled report manually
 * POST /api/v1/reports/schedules/:scheduleId/run
 */
const runSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const execution = await ReportSchedulingService.runScheduledReport(scheduleId);

    res.status(200).json({
      success: true,
      data: execution,
      message: 'Report execution started'
    });
  } catch (error) {
    if (error.message === 'Schedule not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get execution history for a schedule
 * GET /api/v1/reports/schedules/:scheduleId/history
 */
const getExecutionHistory = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      status: req.query.status
    };

    const history = await ReportSchedulingService.getExecutionHistory(scheduleId, options);

    res.status(200).json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get upcoming reports
 * GET /api/v1/reports/upcoming
 */
const getUpcomingReports = async (req, res) => {
  try {
    const minutes = req.query.minutes ? parseInt(req.query.minutes, 10) : 60;
    const companyId = req.query.companyId || null;

    const reports = await ReportSchedulingService.getUpcomingReports(minutes, companyId);

    res.status(200).json({
      success: true,
      data: reports,
      count: reports.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Validate a cron expression
 * POST /api/v1/reports/validate-cron
 */
const validateCron = async (req, res) => {
  try {
    const { expression, timezone } = req.body;

    if (!expression) {
      return res.status(400).json({
        success: false,
        error: 'expression is required'
      });
    }

    const isValid = ReportSchedulingService.validateCronExpression(expression);

    if (!isValid) {
      return res.status(200).json({
        success: true,
        data: {
          valid: false,
          message: 'Invalid cron expression'
        }
      });
    }

    const nextRun = ReportSchedulingService.calculateNextRunTime(expression, timezone || 'UTC');

    res.status(200).json({
      success: true,
      data: {
        valid: true,
        expression,
        nextRun
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  pauseSchedule,
  resumeSchedule,
  runSchedule,
  getExecutionHistory,
  getUpcomingReports,
  validateCron
};
