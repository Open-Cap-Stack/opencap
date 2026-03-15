/**
 * Termination Controller
 * Issue #81: Implement Termination Equity Workflow
 *
 * API endpoints for managing employee terminations,
 * exercise windows, and equity forfeitures.
 */

const databaseAdapter = require('../services/databaseAdapter');
const terminationService = require('../services/terminationService');

/**
 * Create a new termination record
 * POST /api/v1/terminations
 */
exports.createTermination = async (req, res) => {
  try {
    const {
      employeeId,
      companyId,
      terminationDate,
      terminationType,
      grants
    } = req.body;

    // Validate required fields
    if (!employeeId || !companyId || !terminationDate || !terminationType) {
      return res.status(400).json({
        error: 'Missing required fields: employeeId, companyId, terminationDate, terminationType'
      });
    }

    req.body.companyId = req.body.companyId || req.user?.companyId;

    const termination = await terminationService.processTermination(req.body);
    res.status(201).json(termination);
  } catch (error) {
    if (error.message === 'Invalid termination type') {
      return res.status(400).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all terminations for a company
 * GET /api/v1/terminations
 */
exports.getTerminations = async (req, res) => {
  try {
    const { companyId, status, terminationType, startDate, endDate, limit } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const filters = {};
    if (status) filters.status = status;
    if (terminationType) filters.terminationType = terminationType;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = limit;

    const terminations = await terminationService.getTerminationsByCompany(companyId, filters);
    res.status(200).json(terminations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a termination by ID
 * GET /api/v1/terminations/:id
 */
exports.getTerminationById = async (req, res) => {
  try {
    const termination = await databaseAdapter.findById('Termination', req.params.id);

    if (!termination) {
      return res.status(404).json({ message: 'Termination not found' });
    }

    res.status(200).json(termination);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update a termination record
 * PUT /api/v1/terminations/:id
 */
exports.updateTermination = async (req, res) => {
  try {
    const termination = await databaseAdapter.findByIdAndUpdate(
      'Termination',
      req.params.id,
      req.body,
      { new: true }
    );

    if (!termination) {
      return res.status(404).json({ message: 'Termination not found' });
    }

    res.status(200).json(termination);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete a termination record
 * DELETE /api/v1/terminations/:id
 */
exports.deleteTermination = async (req, res) => {
  try {
    const termination = await databaseAdapter.findByIdAndDelete('Termination', req.params.id);

    if (!termination) {
      return res.status(404).json({ message: 'Termination not found' });
    }

    res.status(200).json({ message: 'Termination deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get exercise window status for a termination
 * GET /api/v1/terminations/:id/exercise-window
 */
exports.getExerciseWindowStatus = async (req, res) => {
  try {
    const status = await terminationService.getExerciseWindowStatus(req.params.id);
    res.status(200).json(status);
  } catch (error) {
    if (error.message === 'Termination not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Extend exercise window for a termination
 * POST /api/v1/terminations/:id/extend-window
 */
exports.extendExerciseWindow = async (req, res) => {
  try {
    const { additionalDays, reason, approvedBy } = req.body;

    if (!additionalDays) {
      return res.status(400).json({ error: 'additionalDays is required' });
    }

    const termination = await terminationService.extendExerciseWindow(req.params.id, {
      additionalDays,
      reason,
      approvedBy
    });

    res.status(200).json(termination);
  } catch (error) {
    if (error.message === 'Cannot extend expired exercise window') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Termination not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Record share exercise for a terminated employee
 * POST /api/v1/terminations/:id/exercise
 */
exports.recordExercise = async (req, res) => {
  try {
    const { shares, exercisePrice, fmvAtExercise } = req.body;

    if (!shares || !exercisePrice) {
      return res.status(400).json({ error: 'shares and exercisePrice are required' });
    }

    const termination = await terminationService.recordExercise(req.params.id, {
      shares,
      exercisePrice,
      fmvAtExercise
    });

    res.status(200).json(termination);
  } catch (error) {
    if (error.message === 'Exercise window has expired' ||
        error.message === 'Insufficient shares available') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Termination not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate termination documents
 * POST /api/v1/terminations/:id/documents
 */
exports.generateDocuments = async (req, res) => {
  try {
    const result = await terminationService.generateTerminationDocuments(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Termination not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Calculate vesting for given parameters (preview)
 * POST /api/v1/terminations/calculate-vesting
 */
exports.calculateVesting = async (req, res) => {
  try {
    const { grantDate, terminationDate, totalGrantedShares, vestingSchedule } = req.body;

    if (!grantDate || !terminationDate || !totalGrantedShares || !vestingSchedule) {
      return res.status(400).json({
        error: 'Missing required fields: grantDate, terminationDate, totalGrantedShares, vestingSchedule'
      });
    }

    const result = terminationService.calculateVestedShares({
      grantDate,
      terminationDate,
      totalGrantedShares,
      vestingSchedule
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get terminations with exercise windows expiring soon
 * GET /api/v1/terminations/expiring-windows
 */
exports.getExpiringExerciseWindows = async (req, res) => {
  try {
    const { companyId, daysUntilExpiry = '7' } = req.query;

    if (!companyId) {
      return res.status(400).json({ error: 'companyId is required' });
    }

    const days = parseInt(daysUntilExpiry, 10);
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    const nowTime = now.getTime();
    const expiryTime = expiryDate.getTime();

    // ZeroDB: Fetch all terminations with matching status, then filter dates in-memory
    // (ZeroDB doesn't support $gte/$lte operators)
    let terminations = await databaseAdapter.find('Termination', {
      companyId,
      status: 'exercise_window_open'
    });

    // Apply date range filtering in-memory
    terminations = terminations.filter(term => {
      if (!term.exerciseWindowEndDate) return false;
      const windowEndTime = new Date(term.exerciseWindowEndDate).getTime();
      return windowEndTime >= nowTime && windowEndTime <= expiryTime;
    });

    res.status(200).json(terminations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update termination status (check for expired windows)
 * POST /api/v1/terminations/:id/update-status
 */
exports.updateStatus = async (req, res) => {
  try {
    const termination = await terminationService.updateTerminationStatus(req.params.id);
    res.status(200).json(termination);
  } catch (error) {
    if (error.message === 'Termination not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};
