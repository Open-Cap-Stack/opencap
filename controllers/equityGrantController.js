/**
 * EquityGrant Controller
 * Issue #77: Create Equity Grant Model and Workflow
 *
 * Handles API requests for equity grant operations.
 */

const databaseAdapter = require('../services/databaseAdapter');
const equityGrantService = require('../services/equityGrantService');
const { assertCompanyOwnership, assertUserOwnership } = require('../middleware/companyScope');

// Valid status values
const VALID_STATUSES = ['pending', 'approved', 'active', 'exercised', 'cancelled', 'expired'];

/**
 * Resolve a grant lookup ID — if it looks like a grantId (GRANT-...), find the
 * internal _id first. Otherwise assume it's already an _id or row_id.
 */
async function resolveGrantId(id) {
  if (id && id.startsWith('GRANT-')) {
    const results = await databaseAdapter.find('EquityGrant', { grantId: id });
    // ZeroDB does substring matching — post-filter for exact grantId match
    const exact = (results || []).find(r => r.grantId === id);
    if (exact) return exact._id || exact.row_id || exact.id;
  }
  return id;
}

/**
 * Create a new equity grant
 */
exports.createEquityGrant = async (req, res) => {
  try {
    const grantData = {
      ...req.body,
      companyId: req.user?.companyId || req.body.companyId,
      grantId: req.body.grantId || equityGrantService.generateGrantId(),
      status: req.body.status || 'pending'
    };

    // companyId is preferred but not required — allow creation without it
    // so the frontend can work without companyId in JWT

    if (grantData.numberOfShares !== undefined && grantData.numberOfShares <= 0) {
      return res.status(400).json({ error: 'numberOfShares must be a positive number' });
    }

    const savedGrant = await databaseAdapter.create('EquityGrant', grantData);
    res.status(201).json(savedGrant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get all equity grants with optional filtering
 */
exports.getEquityGrants = async (req, res) => {
  try {
    const query = {};

    // Scope by companyId: prefer explicit query param, fall back to the
    // authenticated user's companyId so users only see their own data.
    const companyId = req.query.companyId || req.user?.companyId;
    if (companyId) query.companyId = companyId;

    // Apply filters from query params
    if (req.query.employeeId) {
      query.employeeId = req.query.employeeId;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.grantType) {
      query.grantType = req.query.grantType;
    }

    const grants = await databaseAdapter.find('EquityGrant', query);
    res.status(200).json(grants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get a single equity grant by ID
 */
exports.getEquityGrantById = async (req, res) => {
  try {
    const lookupId = await resolveGrantId(req.params.id);
    const grant = await databaseAdapter.findById('EquityGrant', lookupId);
    if (!grant) {
      return res.status(404).json({ message: 'Equity grant not found' });
    }
    if (!assertCompanyOwnership(req, res, grant)) return;

    // Employee self-service: employees may only view their own grant
    if (req.user?.role === 'employee') {
      const userIdField = grant.userId ? 'userId' : 'employeeId';
      if (!assertUserOwnership(req, res, grant, userIdField)) return;
    }

    res.status(200).json(grant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update an equity grant
 */
exports.updateEquityGrant = async (req, res) => {
  try {
    const resolvedId = await resolveGrantId(req.params.id);
    // Fetch first to verify ownership before mutating
    const existing = await databaseAdapter.findById('EquityGrant', resolvedId);
    if (existing && !assertCompanyOwnership(req, res, existing)) return;

    const grant = await databaseAdapter.findByIdAndUpdate(
      'EquityGrant',
      resolvedId,
      req.body,
      { new: true }
    );
    if (!grant) {
      return res.status(404).json({ message: 'Equity grant not found' });
    }
    res.status(200).json(grant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Delete an equity grant
 */
exports.deleteEquityGrant = async (req, res) => {
  try {
    const resolvedId = await resolveGrantId(req.params.id);
    // Fetch first to verify ownership before deleting
    const existing = await databaseAdapter.findById('EquityGrant', resolvedId);
    if (existing && !assertCompanyOwnership(req, res, existing)) return;

    const grant = await databaseAdapter.findByIdAndDelete('EquityGrant', resolvedId);
    if (!grant) {
      return res.status(404).json({ message: 'Equity grant not found' });
    }
    res.status(200).json({ message: 'Equity grant deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Update grant status (approve, activate, cancel, etc.)
 */
exports.updateGrantStatus = async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;

    // Validate status
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const updateData = { status };

    // Add status-specific fields
    if (status === 'approved') {
      updateData.approvedDate = new Date().toISOString();
      updateData.approvedBy = req.body.approvedBy || req.user?.userId;
    } else if (status === 'cancelled') {
      updateData.cancellationDate = new Date().toISOString();
      updateData.cancellationReason = cancellationReason;
    }

    const lookupId = await resolveGrantId(req.params.id);

    const grant = await databaseAdapter.findByIdAndUpdate(
      'EquityGrant',
      lookupId,
      updateData,
      { new: true }
    );

    if (!grant) {
      return res.status(404).json({ message: 'Equity grant not found' });
    }

    res.status(200).json(grant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Exercise shares from a grant
 * T1-3: Added version-based optimistic locking and exercisedShares <= grantedShares invariant
 */
exports.exerciseGrant = async (req, res) => {
  try {
    const { sharesToExercise, exercisePrice, paymentMethod, notes } = req.body;

    if (!sharesToExercise || sharesToExercise <= 0) {
      return res.status(400).json({ error: 'sharesToExercise must be a positive number' });
    }

    // Get the grant
    const resolvedId = await resolveGrantId(req.params.id);
    const grant = await databaseAdapter.findById('EquityGrant', resolvedId);
    if (!grant) {
      return res.status(404).json({ message: 'Equity grant not found' });
    }

    // T1-3: Enforce exercisedShares <= grantedShares invariant
    const currentExercised = grant.exercisedShares || 0;
    const grantedShares = grant.numberOfShares || 0;
    const newExercisedShares = currentExercised + sharesToExercise;

    if (newExercisedShares > grantedShares) {
      return res.status(400).json({
        error: `Cannot exercise ${sharesToExercise} shares. Only ${grantedShares - currentExercised} shares available for exercise.`,
        available: grantedShares - currentExercised,
        requested: sharesToExercise
      });
    }

    // Validate exercise
    const validation = equityGrantService.validateExercise(
      grant,
      sharesToExercise,
      new Date()
    );

    if (!validation.valid) {
      return res.status(400).json({
        error: validation.errors.join('; '),
        details: validation
      });
    }

    // Create exercise record
    const exerciseRecord = {
      exerciseDate: new Date(),
      sharesExercised: sharesToExercise,
      exercisePrice: exercisePrice || grant.strikePrice,
      paymentMethod: paymentMethod || 'cash',
      totalCost: sharesToExercise * (exercisePrice || grant.strikePrice),
      notes
    };

    // Determine new status
    let newStatus = grant.status;
    if (newExercisedShares >= grantedShares) {
      newStatus = 'exercised';
    }

    // ZeroDB: Use read-modify-write pattern with version check
    const currentHistory = grant.exerciseHistory || [];
    const updatedHistory = [...currentHistory, exerciseRecord];

    const updatedGrant = await databaseAdapter.findByIdAndUpdate(
      'EquityGrant',
      req.params.id,
      {
        exercisedShares: newExercisedShares,
        exerciseHistory: updatedHistory,
        status: newStatus
      },
      { new: true }
    );

    res.status(200).json(updatedGrant);
  } catch (error) {
    // T1-3: Handle version conflict from optimistic locking
    if (error.code === 'VERSION_CONFLICT') {
      return res.status(409).json({
        error: 'Concurrent modification detected. Please retry the exercise.',
        code: 'VERSION_CONFLICT'
      });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all grants for a specific employee
 */
exports.getGrantsByEmployee = async (req, res) => {
  try {
    const grants = await databaseAdapter.find('EquityGrant', {
      employeeId: req.params.employeeId
    });
    res.status(200).json(grants);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get available grant templates
 */
exports.getGrantTemplates = async (req, res) => {
  try {
    const templates = equityGrantService.getGrantTemplates();
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create a grant from a template
 */
exports.createGrantFromTemplate = async (req, res) => {
  try {
    const { templateName, ...grantData } = req.body;

    // Validate template exists
    const templates = equityGrantService.getGrantTemplates();
    const template = templates.find(t => t.name === templateName);

    if (!template) {
      return res.status(400).json({
        error: 'Template not found',
        availableTemplates: templates.map(t => t.name)
      });
    }

    // Apply template to grant data
    const fullGrantData = equityGrantService.applyTemplate(templateName, grantData);

    // Create the grant
    const savedGrant = await databaseAdapter.create('EquityGrant', fullGrantData);
    res.status(201).json(savedGrant);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get vesting schedule calculation for a grant
 */
exports.getVestingSchedule = async (req, res) => {
  try {
    const lookupId = await resolveGrantId(req.params.id);
    const grant = await databaseAdapter.findById('EquityGrant', lookupId);
    if (!grant) {
      return res.status(404).json({ message: 'Equity grant not found' });
    }

    const asOfDate = req.query.asOfDate ? new Date(req.query.asOfDate) : new Date();
    const vestingInfo = equityGrantService.calculateVestedShares(grant, asOfDate);
    const exercisableInfo = equityGrantService.calculateExercisableShares(grant, asOfDate);

    res.status(200).json({
      grantId: grant.grantId,
      asOfDate,
      ...vestingInfo,
      ...exercisableInfo,
      vestingSchedule: grant.vestingSchedule
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get grant summary for an employee
 */
exports.getEmployeeGrantSummary = async (req, res) => {
  try {
    const summary = await equityGrantService.getGrantSummary(req.params.employeeId);
    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Calculate equity value for a grant
 */
exports.calculateEquityValue = async (req, res) => {
  try {
    const { currentPrice } = req.query;

    if (!currentPrice) {
      return res.status(400).json({ error: 'Current price is required' });
    }

    const resolvedId = await resolveGrantId(req.params.id);
    const grant = await databaseAdapter.findById('EquityGrant', resolvedId);
    if (!grant) {
      return res.status(404).json({ message: 'Equity grant not found' });
    }

    const valueInfo = equityGrantService.calculateTotalEquityValue(
      grant,
      parseFloat(currentPrice)
    );

    res.status(200).json({
      grantId: grant.grantId,
      ...valueInfo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
