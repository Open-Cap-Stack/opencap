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

/**
 * Create a new vesting schedule
 */
exports.createVestingSchedule = async (req, res) => {
  try {
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
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all vesting schedules with optional filters
 */
exports.getVestingSchedules = async (req, res) => {
  try {
    const { stakeholderId, equityPlanId, companyId, status } = req.query;
    const query = {};

    if (stakeholderId) query.stakeholderId = stakeholderId;
    if (equityPlanId) query.equityPlanId = equityPlanId;
    if (companyId) query.companyId = companyId;
    if (status) query.status = status;

    const schedules = await databaseAdapter.find('VestingSchedule', query);
    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get vesting schedule by ID
 */
exports.getVestingScheduleById = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }
    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }
    res.status(200).json(schedule);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete vesting schedule
 */
exports.deleteVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findByIdAndDelete('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }
    res.status(200).json({ message: 'Vesting schedule deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Calculate current vesting status for a schedule
 */
exports.calculateVesting = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
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
    res.status(500).json({ error: error.message });
  }
};

/**
 * Apply acceleration to a vesting schedule
 */
exports.applyAcceleration = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
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
      return res.status(400).json({ message: 'Acceleration not applicable' });
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
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get vesting timeline for a schedule
 */
exports.getVestingTimeline = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }

    const timeline = VestingCalculatorService.generateVestingTimeline(schedule);

    res.status(200).json({
      scheduleId: schedule.scheduleId,
      timeline
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get visualization data for charts
 */
exports.getVisualizationData = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }

    const visualData = VestingCalculatorService.getVisualizationData(schedule);

    res.status(200).json(visualData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Pause a vesting schedule
 */
exports.pauseVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }

    if (schedule.status !== 'active') {
      return res.status(400).json({ message: 'Cannot pause a non-active schedule' });
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
    res.status(500).json({ error: error.message });
  }
};

/**
 * Resume a paused vesting schedule
 */
exports.resumeVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }

    if (schedule.status !== 'paused') {
      return res.status(400).json({ message: 'Cannot resume a non-paused schedule' });
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
    res.status(500).json({ error: error.message });
  }
};

/**
 * Terminate a vesting schedule
 */
exports.terminateVestingSchedule = async (req, res) => {
  try {
    const schedule = await databaseAdapter.findById('VestingSchedule', req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Vesting schedule not found' });
    }

    if (schedule.status === 'terminated' || schedule.status === 'completed') {
      return res.status(400).json({ message: 'Schedule is already terminated or completed' });
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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
  }
};
