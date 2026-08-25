/**
 * VestingSchedule Controller
 * Issue #78: Implement Automated Vesting Schedules
 *
 * API controller for managing vesting schedules including:
 * - CRUD operations
 * - Vesting calculations
 * - Acceleration handling
 * - Timeline and visualization data
 */
const databaseAdapter = require('../services/databaseAdapter');
const VestingCalculatorService = require('../services/vestingCalculatorService');
const { v4: uuidv4 } = require('uuid');
const { sendError } = require('../middleware/errorResponse');

/**
 * Create a new vesting schedule
 */
exports.createVestingSchedule = async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = {
      totalShares: 'totalShares is required',
      vestingPeriod: 'vestingPeriod is required',
      cliffPeriod: 'cliffPeriod is required',
      startDate: 'startDate is required'
    };

    const missingFields = [];
    for (const [field, message] of Object.entries(requiredFields)) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missingFields.push(message);
      }
    }

    if (missingFields.length > 0) {
      return sendError(res, 400, missingFields.join(', '));
    }

    // Validate totalShares is a positive number
    if (typeof req.body.totalShares !== 'number' || req.body.totalShares <= 0) {
      return sendError(res, 400, 'totalShares must be a positive number');
    }

    // Validate vestingPeriod is a positive number
    if (typeof req.body.vestingPeriod !== 'number' || req.body.vestingPeriod <= 0) {
      return sendError(res, 400, 'vestingPeriod must be a positive number');
    }

    // Validate cliffPeriod is a non-negative number
    if (typeof req.body.cliffPeriod !== 'number' || req.body.cliffPeriod < 0) {
      return sendError(res, 400, 'cliffPeriod must be a non-negative number');
    }

    // Validate cliffPeriod does not exceed vestingPeriod
    if (req.body.cliffPeriod > req.body.vestingPeriod) {
      return sendError(res, 400, 'cliffPeriod cannot exceed vestingPeriod');
    }

    // Validate startDate is a valid date
    const parsedStartDate = new Date(req.body.startDate);
    if (isNaN(parsedStartDate.getTime())) {
      return sendError(res, 400, 'startDate must be a valid date');
    }

    const scheduleData = {
      ...req.body,
      scheduleId: req.body.scheduleId || `VS-${uuidv4().slice(0, 8).toUpperCase()}`,
      vestedShares: 0,
      unvestedShares: req.body.totalShares,
      status: 'active'
    };

    // Calculate initial next vesting date
    const nextEvent = VestingCalculatorService.getNextVestingEvent(scheduleData, new Date());
    if (nextEvent) {
      scheduleData.nextVestingDate = nextEvent.eventDate;
    }

    const savedSchedule = await databaseAdapter.create('VestingSchedule', scheduleData);
    res.status(201).json(savedSchedule);
  } catch (error) {
    return sendError(res, 400, error.message);
  }
};

/**
 * Get all vesting schedules with optional filters
 */
exports.getVestingSchedules = async (req, res) => {
  try {
    const { stakeholderId, equityPlanId, companyId, status } = req.query;
    const query = {};

    const effectiveCompanyId = companyId || req.user?.companyId;
    if (effectiveCompanyId) query.companyId = effectiveCompanyId;
    if (stakeholderId) query.stakeholderId = stakeholderId;
    if (equityPlanId) query.equityPlanId = equityPlanId;
    if (status) query.status = status;

    const schedules = await databaseAdapter.find('VestingSchedule', query);
    res.status(200).json(schedules);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Get vesting schedule by ID
 */
exports.getVestingScheduleById = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }
    res.status(200).json(schedule);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Update vesting schedule
 */
exports.updateVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findByIdAndUpdate(
      'VestingSchedule',
      req.params.id,
      req.body,
      { new: true }
    );
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }
    res.status(200).json(schedule);
  } catch (error) {
    return sendError(res, 400, error.message);
  }
};

/**
 * Delete vesting schedule
 */
exports.deleteVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findByIdAndDelete('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }
    res.status(200).json({ success: true, message: 'Vesting schedule deleted' });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Calculate current vesting status for a schedule
 */
exports.calculateVesting = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    const calculationDate = req.query.date ? new Date(req.query.date) : new Date();
    const vestingResult = VestingCalculatorService.calculateVestedShares(schedule, calculationDate);

    // Get next vesting event
    const nextEvent = VestingCalculatorService.getNextVestingEvent(schedule, calculationDate);

    res.status(200).json({
      scheduleId: schedule.scheduleId,
      calculationDate: calculationDate.toISOString(),
      ...vestingResult,
      nextVestingEvent: nextEvent
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Apply acceleration to a vesting schedule
 */
exports.applyAcceleration = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    const accelerationEvent = {
      type: req.body.type,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      changeOfControlDate: req.body.changeOfControlDate ? new Date(req.body.changeOfControlDate) : null,
      terminationDate: req.body.terminationDate ? new Date(req.body.terminationDate) : null,
      terminationType: req.body.terminationType
    };

    const accelerationResult = VestingCalculatorService.calculateAcceleration(
      schedule,
      accelerationEvent.date,
      accelerationEvent
    );

    // Check if acceleration is applicable
    if (accelerationResult.acceleratedShares === 0 || !accelerationResult.accelerationType) {
      return sendError(res, 400, 'Acceleration not applicable');
    }

    // Update the schedule with acceleration
    const updateData = {
      vestedShares: accelerationResult.newVestedShares,
      unvestedShares: schedule.totalShares - accelerationResult.newVestedShares,
      status: accelerationResult.newVestedShares >= schedule.totalShares ? 'accelerated' : 'active',
      accelerationDate: accelerationEvent.date,
      accelerationType: accelerationResult.accelerationType,
      acceleratedShares: accelerationResult.acceleratedShares - accelerationResult.previousVestedShares
    };

    const updatedSchedule = await databaseAdapter.findByIdAndUpdate(
      'VestingSchedule',
      req.params.id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      schedule: updatedSchedule,
      accelerationDetails: accelerationResult
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Get vesting timeline for a schedule
 */
exports.getVestingTimeline = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    const timeline = VestingCalculatorService.generateVestingTimeline(schedule);

    res.status(200).json({
      scheduleId: schedule.scheduleId,
      timeline
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Get visualization data for charts
 */
exports.getVisualizationData = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    const visualData = VestingCalculatorService.getVisualizationData(schedule);

    res.status(200).json(visualData);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Pause a vesting schedule
 */
exports.pauseVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    if (schedule.status !== 'active') {
      return sendError(res, 400, 'Cannot pause a non-active schedule');
    }

    const updatedSchedule = await databaseAdapter.findByIdAndUpdate(
      'VestingSchedule',
      req.params.id,
      {
        status: 'paused',
        pausedAt: new Date()
      },
      { new: true }
    );

    res.status(200).json(updatedSchedule);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Resume a paused vesting schedule
 */
exports.resumeVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    if (schedule.status !== 'paused') {
      return sendError(res, 400, 'Cannot resume a non-paused schedule');
    }

    // Calculate paused duration
    const pausedDays = schedule.pausedAt
      ? Math.floor((new Date() - new Date(schedule.pausedAt)) / (1000 * 60 * 60 * 24))
      : 0;

    const updatedSchedule = await databaseAdapter.findByIdAndUpdate(
      'VestingSchedule',
      req.params.id,
      {
        status: 'active',
        pausedAt: null,
        pausedDays: (schedule.pausedDays || 0) + pausedDays
      },
      { new: true }
    );

    res.status(200).json(updatedSchedule);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Terminate a vesting schedule
 */
exports.terminateVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    if (schedule.status === 'terminated' || schedule.status === 'completed') {
      return sendError(res, 400, 'Schedule is already terminated or completed');
    }

    // Calculate final vesting as of termination date
    const terminationDate = req.body.terminationDate ? new Date(req.body.terminationDate) : new Date();
    const finalVesting = VestingCalculatorService.calculateVestedShares(schedule, terminationDate);

    const updatedSchedule = await databaseAdapter.findByIdAndUpdate(
      'VestingSchedule',
      req.params.id,
      {
        status: 'terminated',
        terminationDate,
        terminationType: req.body.terminationType || 'voluntary',
        vestedShares: finalVesting.vestedShares,
        unvestedShares: schedule.totalShares - finalVesting.vestedShares,
        nextVestingDate: null
      },
      { new: true }
    );

    res.status(200).json({
      schedule: updatedSchedule,
      finalVesting
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Get vesting schedules due for vesting today
 */
exports.getSchedulesDueForVesting = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await databaseAdapter.find('VestingSchedule', {
      status: 'active',
      nextVestingDate: { $gte: today, $lt: tomorrow }
    });

    res.status(200).json(schedules);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Get upcoming vesting events for a schedule
 */
exports.getUpcomingVestingEvents = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return sendError(res, 404, 'Vesting schedule not found');
    }

    const count = req.query.count ? parseInt(req.query.count, 10) : 10;
    const fromDate = req.query.from ? new Date(req.query.from) : new Date();

    const upcomingEvents = VestingCalculatorService.getUpcomingVestingEvents(
      schedule,
      fromDate,
      count
    );

    res.status(200).json({
      scheduleId: schedule.scheduleId,
      fromDate: fromDate.toISOString(),
      count,
      upcomingEvents
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
