/**
 * Valuation409A Controller
 * Feature: Issue #59 - Create 409A Valuation Request System
 *
 * Handles API endpoints for 409A valuation requests.
 */
const Valuation409A = require('../models/Valuation409A');

// Create a new valuation request
exports.createValuationRequest = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.userId;

    // Accept both the model's native fields and the frontend's simplified fields.
    // Frontend sends: { name, valuationDate, fairMarketValue, provider }
    // Model requires: companyId, requestedBy, reason (enum), status
    const body = req.body;

    const companyId = body.companyId || req.user?.companyId || 'default';
    const reason = body.reason || 'other';
    const fairMarketValue = body.fairMarketValue !== undefined ? Number(body.fairMarketValue) : undefined;
    const effectiveDate = body.valuationDate || body.effectiveDate;

    const valuationData = {
      companyId,
      requestedBy: userId,
      reason,
      reasonDetails: body.reasonDetails || body.name || '',
      notes: body.notes || '',
      tags: body.tags,
      metadata: body.metadata,
      createdBy: userId,
    };

    if (fairMarketValue !== undefined && !isNaN(fairMarketValue)) {
      valuationData.fairMarketValue = fairMarketValue;
    }
    if (effectiveDate) {
      valuationData.effectiveDate = effectiveDate;
    }
    if (body.provider) {
      valuationData.valuationFirm = { name: body.provider };
    }

    const valuation = await Valuation409A.create(valuationData);

    res.status(201).json({
      success: true,
      data: valuation
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get all valuations for a company
exports.getCompanyValuations = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { companyId };
    if (status) query.status = status;

    // ZeroDB doesn't support populate - fetch data without it
    const valuations = await Valuation409A.find(query, {
      sort: { createdAt: -1 },
      skip: (page - 1) * parseInt(limit),
      limit: parseInt(limit)
    });

    const total = await Valuation409A.countDocuments(query);

    res.json({
      success: true,
      data: valuations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get a single valuation
exports.getValuation = async (req, res) => {
  try {
    const { valuationId } = req.params;

    // ZeroDB doesn't support populate - fetch data without it
    const valuation = await Valuation409A.findOne({ valuationId });

    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    res.json({
      success: true,
      data: valuation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update valuation request (only in early stages)
exports.updateValuation = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const updates = req.body;

    // Try to find by valuationId field first, then by row_id / _id
    let valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      valuation = await Valuation409A.findOne({ row_id: valuationId });
    }
    if (!valuation) {
      valuation = await Valuation409A.findOne({ _id: valuationId });
    }
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    // Use the actual stored valuationId for subsequent lookups
    const resolvedId = valuation.valuationId || valuationId;

    // Map frontend field aliases
    if (updates.name && !updates.reasonDetails) updates.reasonDetails = updates.name;
    if (updates.fairMarketValue !== undefined) updates.fairMarketValue = Number(updates.fairMarketValue);

    // Allow status updates from frontend
    const allowedStatuses = ['requested', 'in_progress', 'completed', 'approved', 'rejected'];
    if (updates.status && !allowedStatuses.includes(updates.status)) {
      delete updates.status;
    }
    delete updates.statusHistory;

    updates.updatedBy = req.user?._id || req.user?.userId;
    updates.updatedAt = new Date().toISOString();

    // Update by the filter that actually found the record
    const filterKey = valuation.valuationId ? { valuationId: resolvedId } : { row_id: valuation.row_id };
    await Valuation409A.updateOne(filterKey, { $set: updates });
    const updated = await Valuation409A.findOne(filterKey);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Delete a valuation (hard delete)
exports.deleteValuation = async (req, res) => {
  try {
    const { valuationId } = req.params;
    // Try by valuationId field first, then by _id / row_id
    let deleted = await Valuation409A.findOneAndDelete({ valuationId });
    if (!deleted) {
      deleted = await Valuation409A.findByIdAndDelete(valuationId);
    }
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Valuation not found' });
    }
    res.json({ success: true, message: 'Valuation deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Assign valuation firm
exports.assignValuationFirm = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { name, contactName, contactEmail, phone } = req.body;

    const valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    const updated = await Valuation409A.assignValuationFirm(
      valuationId,
      { name, contactName, contactEmail, phone },
      req.user._id
    );

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Receive draft report
exports.receiveDraft = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { fairMarketValue, valuationMethod, effectiveDate, notes } = req.body;

    const valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    const updated = await Valuation409A.receiveDraft(
      valuationId,
      { fairMarketValue, valuationMethod, effectiveDate, notes },
      req.user._id
    );

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Start review
exports.startReview = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { notes } = req.body;

    const valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    const updated = await Valuation409A.startReview(valuationId, req.user._id, notes);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Approve valuation
exports.approveValuation = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { resolution, notes } = req.body;

    const valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    const updated = await Valuation409A.approve(valuationId, req.user._id, resolution ? { resolution } : null);

    if (notes) {
      await Valuation409A.updateOne({ valuationId }, { $set: { notes } });
    }

    const result = notes ? await Valuation409A.findOne({ valuationId }) : updated;

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Cancel valuation request
exports.cancelValuation = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { reason } = req.body;

    const valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    if (!Valuation409A.canTransitionTo(valuation.status, 'cancelled')) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel valuation in ${valuation.status} status`
      });
    }

    const updated = await Valuation409A.transitionTo(valuationId, 'cancelled', req.user._id, reason || 'Cancelled by user');

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Add document to valuation
exports.addDocument = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { documentId, type, name } = req.body;

    const valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    const updated = await Valuation409A.addDocument(valuationId, { documentId, type, name }, req.user._id);

    res.json({
      success: true,
      data: updated
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Get current valuation for a company
exports.getCurrentValuation = async (req, res) => {
  try {
    const { companyId } = req.params;

    const valuation = await Valuation409A.findCurrentValuation(companyId);

    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'No current valuation found',
        data: null
      });
    }

    res.json({
      success: true,
      data: valuation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get expiring valuations (for reminders)
exports.getExpiringValuations = async (req, res) => {
  try {
    const { days = 60 } = req.query;

    const valuations = await Valuation409A.findExpiringValuations(parseInt(days));

    res.json({
      success: true,
      data: valuations,
      count: valuations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get valuation history for a company
exports.getValuationHistory = async (req, res) => {
  try {
    const { companyId } = req.params;

    const history = await Valuation409A.getCompanyValuationHistory(companyId);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get company valuation summary
exports.getCompanySummary = async (req, res) => {
  try {
    const { companyId } = req.params;

    const [valuations, currentValuation] = await Promise.all([
      Valuation409A.find({ companyId }),
      Valuation409A.findCurrentValuation(companyId)
    ]);

    const summary = {
      total: valuations.length,
      byStatus: {},
      currentValuation: currentValuation ? {
        valuationId: currentValuation.valuationId,
        fairMarketValue: currentValuation.fairMarketValue,
        effectiveDate: currentValuation.effectiveDate,
        expirationDate: currentValuation.expirationDate,
        daysUntilExpiration: currentValuation.daysUntilExpiration,
        needsRenewalReminder: currentValuation.needsRenewalReminder
      } : null,
      hasCurrentValuation: !!currentValuation,
      needsNewValuation: !currentValuation
    };

    for (const valuation of valuations) {
      summary.byStatus[valuation.status] = (summary.byStatus[valuation.status] || 0) + 1;
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Process expired valuations (cron job endpoint)
exports.processExpiredValuations = async (req, res) => {
  try {
    const expiredValuations = await Valuation409A.findExpiredValuations();

    res.json({
      success: true,
      message: `Processed ${expiredValuations.length} expired valuations`,
      data: expiredValuations.map(v => ({
        valuationId: v.valuationId,
        companyId: v.companyId,
        expirationDate: v.expirationDate
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// AI-POWERED 409A WORKFLOW ENDPOINTS
// ============================================================================

// Submit financial inputs + business context, transition to data_collection
exports.submitInputs = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { financialInputs, businessContext } = req.body;

    if (!financialInputs || !businessContext) {
      return res.status(400).json({ success: false, error: 'financialInputs and businessContext are required' });
    }

    let valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) valuation = await Valuation409A.findOne({ row_id: valuationId });
    if (!valuation) return res.status(404).json({ success: false, error: 'Valuation not found' });

    const fk = valuation.valuationId ? { valuationId: valuation.valuationId } : { row_id: valuation.row_id };
    const now = new Date().toISOString();

    await Valuation409A.updateOne(fk, {
      $set: {
        financialInputs,
        businessContext,
        status: 'data_collection',
        aiStatus: 'not_started',
        updatedAt: now
      }
    });

    const updated = await Valuation409A.findOne(fk);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create Stripe checkout session for 409A payment ($999 flat fee)
exports.createPaymentSession = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { successUrl, cancelUrl } = req.body;

    let valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) valuation = await Valuation409A.findOne({ row_id: valuationId });
    if (!valuation) return res.status(404).json({ success: false, error: 'Valuation not found' });

    if (!['data_collection', 'requested'].includes(valuation.status)) {
      return res.status(400).json({ success: false, error: 'Valuation is not in a payable state' });
    }
    if (valuation.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, error: 'This valuation has already been paid for' });
    }

    const stripeService = require('../services/stripeService');
    if (!stripeService.isConfigured()) {
      return res.status(503).json({ success: false, error: 'Payment processing not configured' });
    }

    const stripe = stripeService.getStripe();
    const resolvedId = valuation.valuationId || valuation.row_id;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '409A Valuation Report',
            description: 'AI-powered 409A fair market value analysis with accountant review and sign-off'
          },
          unit_amount: 99900 // $999.00
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: successUrl || `${process.env.FRONTEND_URL}/valuations/${resolvedId}?payment=success`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/valuations/${resolvedId}?payment=cancelled`,
      metadata: { valuationId: resolvedId, companyId: valuation.companyId }
    });

    // Store the session ID on the valuation for webhook reconciliation
    const fk = valuation.valuationId ? { valuationId: valuation.valuationId } : { row_id: valuation.row_id };
    await Valuation409A.updateOne(fk, {
      $set: { stripeSessionId: session.id, updatedAt: new Date().toISOString() }
    });

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Mark valuation as paid (called by Stripe webhook or manually by admin)
exports.markPaid = async (req, res) => {
  try {
    const { valuationId } = req.params;
    const { stripeSessionId } = req.body;

    let valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) valuation = await Valuation409A.findOne({ row_id: valuationId });
    if (!valuation) return res.status(404).json({ success: false, error: 'Valuation not found' });

    const fk = valuation.valuationId ? { valuationId: valuation.valuationId } : { row_id: valuation.row_id };
    await Valuation409A.updateOne(fk, {
      $set: {
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        stripeSessionId: stripeSessionId || valuation.stripeSessionId,
        updatedAt: new Date().toISOString()
      }
    });

    res.json({ success: true, message: 'Payment recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Trigger AI valuation run (requires payment)
exports.runAI = async (req, res) => {
  try {
    const { valuationId } = req.params;

    let valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) valuation = await Valuation409A.findOne({ row_id: valuationId });
    if (!valuation) return res.status(404).json({ success: false, error: 'Valuation not found' });

    if (valuation.paymentStatus !== 'paid' && req.user?.role !== 'admin') {
      return res.status(402).json({ success: false, error: 'Payment required before running AI valuation' });
    }
    if (!valuation.financialInputs || !valuation.businessContext?.industry) {
      return res.status(400).json({ success: false, error: 'Financial inputs and business context must be submitted first' });
    }
    if (['ai_processing', 'accountant_review', 'accountant_approved', 'released'].includes(valuation.aiStatus)) {
      return res.status(400).json({ success: false, error: `AI is already in ${valuation.aiStatus} state` });
    }

    const fk = valuation.valuationId ? { valuationId: valuation.valuationId } : { row_id: valuation.row_id };
    await Valuation409A.updateOne(fk, {
      $set: { aiStatus: 'researching', status: 'ai_processing', updatedAt: new Date().toISOString() }
    });

    // Run agent asynchronously — don't await
    const resolvedId = valuation.valuationId || valuation.row_id;
    const { runValuationAgent } = require('../services/valuation409AAgentService');
    runValuationAgent(resolvedId).catch(err => {
      console.error(`[409A] Background agent failed for ${resolvedId}:`, err.message);
    });

    res.json({ success: true, message: 'AI valuation started. Poll /ai-status for progress.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Poll AI status
exports.getAIStatus = async (req, res) => {
  try {
    const { valuationId } = req.params;

    let valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) valuation = await Valuation409A.findOne({ row_id: valuationId });
    if (!valuation) return res.status(404).json({ success: false, error: 'Valuation not found' });

    res.json({
      success: true,
      data: {
        aiStatus: valuation.aiStatus || 'not_started',
        status: valuation.status,
        aiStartedAt: valuation.aiStartedAt,
        aiCompletedAt: valuation.aiCompletedAt,
        aiErrorMessage: valuation.aiErrorMessage || null,
        fairMarketValue: valuation.fairMarketValue || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get full AI report content
exports.getAIReport = async (req, res) => {
  try {
    const { valuationId } = req.params;

    let valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) valuation = await Valuation409A.findOne({ row_id: valuationId });
    if (!valuation) return res.status(404).json({ success: false, error: 'Valuation not found' });

    if (!valuation.aiReport) {
      return res.status(404).json({ success: false, error: 'AI report not yet generated' });
    }

    res.json({
      success: true,
      data: {
        report: valuation.aiReport,
        comparables: valuation.aiSelectedComparables || [],
        reconciliation: valuation.aiReconciliation || null,
        fairMarketValue: valuation.fairMarketValue,
        accountantSignedAt: valuation.accountantSignedAt || null,
        accountantSignatureRecord: valuation.accountantSignatureRecord || null,
        status: valuation.status,
        releasedToCompanyAt: valuation.releasedToCompanyAt || null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================================
// AUDIT TRAIL ENDPOINTS (Issue #63)
// ============================================================================

const ValuationAuditService = require('../services/valuationAuditService');

// Get audit trail for a specific valuation
exports.getValuationAuditTrail = async (req, res) => {
  try {
    const { valuationId } = req.params;

    const auditTrail = await ValuationAuditService.getValuationAuditTrail(valuationId);

    res.json({
      success: true,
      data: auditTrail
    });
  } catch (error) {
    res.status(error.message === 'Valuation not found' ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
};

// Generate IRS compliance report
exports.generateIRSComplianceReport = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { fiscalYear } = req.query;

    const report = await ValuationAuditService.generateIRSComplianceReport(
      companyId,
      fiscalYear ? parseInt(fiscalYear) : null
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Generate GAAP compliance report (ASC 718)
exports.generateGAAPComplianceReport = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { fiscalYear } = req.query;

    const report = await ValuationAuditService.generateGAAPComplianceReport(
      companyId,
      fiscalYear ? parseInt(fiscalYear) : null
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Generate comprehensive audit report
exports.generateAuditReport = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { fiscalYear, startDate, endDate } = req.query;

    const report = await ValuationAuditService.generateAuditReport(companyId, {
      fiscalYear: fiscalYear ? parseInt(fiscalYear) : null,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Export audit data for external systems
exports.exportAuditData = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { format = 'json' } = req.query;

    const data = await ValuationAuditService.exportAuditData(companyId, format);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all valuations (for list view)
exports.getAllValuations = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    // Only filter by companyId when explicitly provided; do NOT auto-filter by
    // req.user.companyId because many rows were stored without a companyId.
    if (req.query.companyId) query.companyId = req.query.companyId;
    if (status) query.status = status;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let valuations = [];
    try {
      valuations = await Valuation409A.find(query, {
        sort: { createdAt: -1 },
        skip: (pageNum - 1) * limitNum,
        limit: limitNum
      });
    } catch (dbErr) {
      // Table may not exist yet — return empty gracefully
      console.warn('getAllValuations: DB error (table may not exist):', dbErr.message);
    }

    res.json({
      success: true,
      data: valuations || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: (valuations || []).length,
        pages: Math.ceil((valuations || []).length / limitNum) || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get valuation analytics
exports.getValuationAnalytics = async (req, res) => {
  try {
    let valuations = [];
    try {
      valuations = await Valuation409A.find({}, { sort: { createdAt: -1 } });
    } catch (dbErr) {
      console.warn('getValuationAnalytics: DB error:', dbErr.message);
    }

    const byStatus = {};
    for (const v of valuations) {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
    }

    const totalValuations = valuations.length;
    const pendingValuations = (byStatus.requested || 0) + (byStatus.in_progress || 0);
    const completedValuations = (byStatus.completed || 0) + (byStatus.approved || 0);

    const valuationsByStatus = Object.entries(byStatus).map(([status, count]) => ({ status, count }));

    // Group by month (last 12 months)
    const monthCounts = {};
    for (const v of valuations) {
      if (v.createdAt) {
        const d = new Date(v.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      }
    }
    const valuationsByMonth = Object.entries(monthCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    res.json({
      success: true,
      data: {
        totalValuations,
        pendingValuations,
        completedValuations,
        averageProcessingTime: 0,
        valuationsByStatus,
        valuationsByMonth,
        recentActivity: valuations.slice(0, 5).map(v => ({
          valuationId: v.valuationId || v.row_id,
          status: v.status,
          fairMarketValue: v.fairMarketValue,
          createdAt: v.createdAt
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get latest valuation for a company
exports.getLatestValuation = async (req, res) => {
  try {
    const { companyId } = req.query;

    // Try approved/current first
    let valuation = null;
    if (companyId && companyId !== 'default') {
      valuation = await Valuation409A.findCurrentValuation(companyId);
    }

    // Fall back: return the most recent valuation regardless of status
    if (!valuation) {
      const query = companyId && companyId !== 'default' ? { companyId } : {};
      const all = await Valuation409A.find(query, { sort: { createdAt: -1 }, limit: 1 });
      valuation = all[0] || null;
    }

    res.json({
      success: true,
      valuation: valuation || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
