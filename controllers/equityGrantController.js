/**
 * EquityGrant Controller
 * Issue #77: Create Equity Grant Model and Workflow
 *
 * Handles API requests for equity grant operations.
 */

const databaseAdapter = require('../services/databaseAdapter');
const equityGrantService = require('../services/equityGrantService');
const documentTemplateService = require('../services/documentTemplateService');
const { assertCompanyOwnership, assertUserOwnership } = require('../middleware/companyScope');
const { sendError } = require('../middleware/errorResponse');

// Valid status values
const VALID_STATUSES = ['pending', 'approved', 'active', 'exercised', 'cancelled', 'expired'];

// Grant type to document template mapping
const GRANT_TYPE_TEMPLATE_MAP = {
  NSO: { templateId: 'TMPL-MPZ0NKFV-41ABB149', docName: 'Stock Option Agreement (NSO)' },
  ISO: { templateId: 'TMPL-MPZ0NKFV-41ABB149', docName: 'Stock Option Agreement (ISO)' },
  RSU: { templateId: 'TMPL-MPZ0NKFV-41ABB149', docName: 'Restricted Stock Unit Agreement' }
};

/**
 * Auto-generate a stock option agreement document after equity grant creation.
 * Runs asynchronously so it does not block the grant creation response.
 */
async function autoGenerateGrantDocument(savedGrant) {
  const grantType = savedGrant.grantType || 'NSO';
  const templateMapping = GRANT_TYPE_TEMPLATE_MAP[grantType];
  if (!templateMapping) return;

  // Look up stakeholder to get name/email
  let stakeholderName = 'Unknown';
  try {
    const stakeholders = await databaseAdapter.find('Stakeholder', { stakeholderId: savedGrant.employeeId });
    const stakeholder = (stakeholders || []).find(s => s.stakeholderId === savedGrant.employeeId);
    if (stakeholder) {
      stakeholderName = stakeholder.name || stakeholder.legalName || stakeholderName;
    }
  } catch (_) {
    // Continue with default name if lookup fails
  }

  // Generate document content from template
  const variables = {
    companyName: savedGrant.companyId,
    optioneeName: stakeholderName,
    numberOfShares: savedGrant.numberOfShares,
    strikePrice: savedGrant.strikePrice,
    grantDate: savedGrant.grantDate,
    vestingSchedule: savedGrant.vestingSchedule
  };

  let generatedContent = {};
  try {
    generatedContent = await documentTemplateService.generateDocument(templateMapping.templateId, variables);
  } catch (_) {
    // Template may not exist in DB yet; proceed with empty content
  }

  // Create the document record
  await databaseAdapter.create('Document', {
    name: `Stock Option Agreement — ${stakeholderName}`,
    type: 'agreement',
    category: 'legal',
    status: 'pending_signature',
    stakeholderId: savedGrant.employeeId,
    companyId: savedGrant.companyId,
    generatedFrom: templateMapping.templateId,
    grantId: savedGrant.grantId,
    content: generatedContent.content || '',
    htmlContent: generatedContent.htmlContent || ''
  });
}

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
      return sendError(res, 400, 'numberOfShares must be a positive number');
    }

    const savedGrant = await databaseAdapter.create('EquityGrant', grantData);

    // Non-blocking: auto-generate stock option agreement document
    Promise.resolve().then(async () => {
      await autoGenerateGrantDocument(savedGrant);
    }).catch(console.error);

    res.status(201).json(savedGrant);
  } catch (error) {
    return sendError(res, 400, error.message);
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
    return sendError(res, 500, error.message);
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
      return sendError(res, 404, 'Equity grant not found');
    }
    if (!assertCompanyOwnership(req, res, grant)) return;

    // Employee self-service: employees may only view their own grant
    if (req.user?.role === 'employee') {
      const userIdField = grant.userId ? 'userId' : 'employeeId';
      if (!assertUserOwnership(req, res, grant, userIdField)) return;
    }

    res.status(200).json(grant);
  } catch (error) {
    return sendError(res, 500, error.message);
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
      return sendError(res, 404, 'Equity grant not found');
    }
    res.status(200).json(grant);
  } catch (error) {
    return sendError(res, 400, error.message);
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
      return sendError(res, 404, 'Equity grant not found');
    }
    res.status(200).json({ success: true, message: 'Equity grant deleted' });
  } catch (error) {
    return sendError(res, 500, error.message);
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
      return sendError(res, 400, `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
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
      return sendError(res, 404, 'Equity grant not found');
    }

    res.status(200).json(grant);
  } catch (error) {
    return sendError(res, 500, error.message);
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
      return sendError(res, 400, 'sharesToExercise must be a positive number');
    }

    // Get the grant
    const resolvedId = await resolveGrantId(req.params.id);
    const grant = await databaseAdapter.findById('EquityGrant', resolvedId);
    if (!grant) {
      return sendError(res, 404, 'Equity grant not found');
    }

    // T1-3: Enforce exercisedShares <= grantedShares invariant
    const currentExercised = grant.exercisedShares || 0;
    const grantedShares = grant.numberOfShares || 0;
    const newExercisedShares = currentExercised + sharesToExercise;

    if (newExercisedShares > grantedShares) {
      return sendError(res, 400, `Cannot exercise ${sharesToExercise} shares. Only ${grantedShares - currentExercised} shares available for exercise.`);
    }

    // Validate exercise
    const validation = equityGrantService.validateExercise(
      grant,
      sharesToExercise,
      new Date()
    );

    if (!validation.valid) {
      return sendError(res, 400, validation.errors.join('; '));
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
      resolvedId,
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
      return sendError(res, 409, 'Concurrent modification detected. Please retry the exercise.');
    }
    return sendError(res, 500, error.message);
  }
};

/**
 * Get all grants for a specific employee
 */
exports.getGrantsByEmployee = async (req, res) => {
  try {
    const query = { employeeId: req.params.employeeId };
    if (req.user?.companyId) {
      query.companyId = req.user.companyId;
    }
    const grants = await databaseAdapter.find('EquityGrant', query);
    res.status(200).json(grants);
  } catch (error) {
    return sendError(res, 500, error.message);
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
    return sendError(res, 500, error.message);
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
      return sendError(res, 400, 'Template not found');
    }

    // Apply template to grant data
    const fullGrantData = equityGrantService.applyTemplate(templateName, grantData);

    // Create the grant
    const savedGrant = await databaseAdapter.create('EquityGrant', fullGrantData);
    res.status(201).json(savedGrant);
  } catch (error) {
    return sendError(res, 400, error.message);
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
      return sendError(res, 404, 'Equity grant not found');
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
    return sendError(res, 500, error.message);
  }
};

/**
 * Get grant summary for an employee
 */
exports.getEmployeeGrantSummary = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const summary = await equityGrantService.getGrantSummary(req.params.employeeId, companyId);
    res.status(200).json(summary);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Calculate equity value for a grant
 */
exports.calculateEquityValue = async (req, res) => {
  try {
    const { currentPrice } = req.query;

    if (!currentPrice) {
      return sendError(res, 400, 'Current price is required');
    }

    const resolvedId = await resolveGrantId(req.params.id);
    const grant = await databaseAdapter.findById('EquityGrant', resolvedId);
    if (!grant) {
      return sendError(res, 404, 'Equity grant not found');
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
    return sendError(res, 500, error.message);
  }
};
