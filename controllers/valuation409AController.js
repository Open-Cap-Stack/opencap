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
    const {
      companyId,
      reason,
      reasonDetails,
      notes,
      tags,
      metadata
    } = req.body;

    const valuation = new Valuation409A({
      companyId,
      requestedBy: req.user._id,
      reason,
      reasonDetails,
      notes,
      tags,
      metadata,
      createdBy: req.user._id,
      statusHistory: [{
        status: 'requested',
        changedAt: new Date(),
        changedBy: req.user._id,
        reason: 'Valuation request created'
      }]
    });

    await valuation.save();

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

    const valuations = await Valuation409A.find(query)
      .populate('companyId', 'name')
      .populate('requestedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

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

    const valuation = await Valuation409A.findOne({ valuationId })
      .populate('companyId', 'name')
      .populate('requestedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('documents.documentId')
      .populate('documents.uploadedBy', 'firstName lastName email')
      .populate('boardApproval.approvedBy', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName email');

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

    const valuation = await Valuation409A.findOne({ valuationId });
    if (!valuation) {
      return res.status(404).json({
        success: false,
        error: 'Valuation not found'
      });
    }

    // Only allow updates in early statuses
    if (!['requested', 'in_progress'].includes(valuation.status)) {
      return res.status(400).json({
        success: false,
        error: 'Can only update valuations in requested or in_progress status'
      });
    }

    // Prevent status changes through this endpoint
    delete updates.status;
    delete updates.statusHistory;

    Object.assign(valuation, updates);
    valuation.updatedBy = req.user._id;
    await valuation.save();

    res.json({
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

    await valuation.assignValuationFirm(
      { name, contactName, contactEmail, phone },
      req.user._id
    );

    res.json({
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

    await valuation.receiveDraft(
      { fairMarketValue, valuationMethod, effectiveDate, notes },
      req.user._id
    );

    res.json({
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

    await valuation.startReview(req.user._id, notes);

    res.json({
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

    await valuation.approve(req.user._id, resolution ? { resolution } : null);

    if (notes) {
      valuation.notes = notes;
      await valuation.save();
    }

    res.json({
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

    if (!valuation.canTransitionTo('cancelled')) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel valuation in ${valuation.status} status`
      });
    }

    await valuation.transitionTo('cancelled', req.user._id, reason || 'Cancelled by user');

    res.json({
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

    await valuation.addDocument({ documentId, type, name }, req.user._id);

    res.json({
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
