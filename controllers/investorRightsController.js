/**
 * InvestorRights Controller
 *
 * Issue #92: Implement Investor Rights Tracking
 *
 * Handles CRUD operations and business logic for investor rights
 * using DatabaseAdapter for ZeroDB migration support
 */

const databaseAdapter = require('../services/databaseAdapter');
const investorRightsService = require('../services/investorRightsService');

/**
 * Create a new investor right
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createInvestorRight = async (req, res) => {
  const {
    rightId,
    investorId,
    companyId,
    shareClassId,
    rightType,
    status,
    terms,
    expirationDate,
    effectiveDate,
    sourceDocument,
    sourceDocumentType,
    notes
  } = req.body;

  // Validate required fields
  if (!rightId || !investorId || !companyId || !rightType) {
    return res.status(400).json({
      error: 'Required fields missing: rightId, investorId, companyId, and rightType are required'
    });
  }

  try {
    const userId = req.user?.id || 'system';

    const rightData = {
      rightId,
      investorId,
      companyId,
      shareClassId,
      rightType,
      status,
      terms,
      expirationDate,
      effectiveDate,
      sourceDocument,
      sourceDocumentType,
      notes
    };

    const investorRight = await investorRightsService.createRight(rightData, userId);
    res.status(201).json({ investorRight });
  } catch (error) {
    if (error.message.includes('conflict')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('Validation')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating investor right:', error);
    res.status(500).json({ error: 'Error creating investor right' });
  }
};

/**
 * Get investor right by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getInvestorRightById = async (req, res) => {
  try {
    const investorRight = await databaseAdapter.findById('InvestorRights', req.params.id);
    if (!investorRight) {
      return res.status(404).json({ error: 'Investor right not found' });
    }
    res.status(200).json({ investorRight });
  } catch (error) {
    console.error('Error fetching investor right:', error);
    res.status(500).json({ error: 'Error fetching investor right' });
  }
};

/**
 * Get all investor rights with optional filtering
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllInvestorRights = async (req, res) => {
  try {
    const { investorId, companyId, shareClassId, rightType, status } = req.query;

    // Build query from filters
    const query = {};
    if (investorId) query.investorId = investorId;
    if (companyId) query.companyId = companyId;
    if (shareClassId) query.shareClassId = shareClassId;
    if (rightType) query.rightType = rightType;
    if (status) query.status = status;

    const investorRights = await databaseAdapter.find('InvestorRights', query, {
      sort: { createdAt: -1 }
    });

    res.status(200).json({ investorRights });
  } catch (error) {
    console.error('Error fetching investor rights:', error);
    res.status(500).json({ error: 'Error fetching investor rights' });
  }
};

/**
 * Update investor right by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateInvestorRight = async (req, res) => {
  try {
    const userId = req.user?.id || 'system';

    const investorRight = await investorRightsService.updateRight(
      req.params.id,
      req.body,
      userId
    );

    if (!investorRight) {
      return res.status(404).json({ error: 'Investor right not found' });
    }

    res.status(200).json({ investorRight });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error updating investor right:', error);
    res.status(500).json({ error: 'Error updating investor right' });
  }
};

/**
 * Delete investor right by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteInvestorRight = async (req, res) => {
  try {
    const investorRight = await databaseAdapter.findByIdAndDelete('InvestorRights', req.params.id);

    if (!investorRight) {
      return res.status(404).json({ error: 'Investor right not found' });
    }

    res.status(200).json({ message: 'Investor right deleted successfully' });
  } catch (error) {
    console.error('Error deleting investor right:', error);
    res.status(500).json({ error: 'Error deleting investor right' });
  }
};

/**
 * Exercise a right
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.exerciseRight = async (req, res) => {
  try {
    const userId = req.user?.id || 'system';

    // First check if the right exists
    const existingRight = await databaseAdapter.findById('InvestorRights', req.params.id);
    if (!existingRight) {
      return res.status(404).json({ error: 'Investor right not found' });
    }

    // Check if already exercised
    if (existingRight.status === 'EXERCISED') {
      return res.status(400).json({ error: 'Right has already been exercised' });
    }

    // Check if expired
    if (existingRight.expirationDate && new Date() > new Date(existingRight.expirationDate)) {
      return res.status(400).json({ error: 'Right has expired and cannot be exercised' });
    }

    const investorRight = await investorRightsService.exerciseRight(
      req.params.id,
      req.body,
      userId
    );

    res.status(200).json({
      message: 'Right exercised successfully',
      investorRight
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('expired') || error.message.includes('cannot be exercised')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error exercising right:', error);
    res.status(500).json({ error: 'Error exercising right' });
  }
};

/**
 * Get rights expiring within specified days
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getExpiringRights = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const companyId = req.query.companyId || null;

    const expiringRights = await investorRightsService.findExpiringRights(days, companyId);

    res.status(200).json({
      expiringRights,
      count: expiringRights.length,
      daysAhead: days
    });
  } catch (error) {
    console.error('Error fetching expiring rights:', error);
    res.status(500).json({ error: 'Error fetching expiring rights' });
  }
};

/**
 * Check for conflicts with a proposed new right
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.checkConflicts = async (req, res) => {
  try {
    const { companyId, investorId, rightType, terms } = req.body;

    if (!companyId || !rightType) {
      return res.status(400).json({
        error: 'companyId and rightType are required'
      });
    }

    const conflicts = await investorRightsService.checkConflicts({
      companyId,
      investorId,
      rightType,
      terms
    });

    res.status(200).json({
      conflicts,
      hasConflicts: conflicts.length > 0
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Error checking conflicts' });
  }
};

/**
 * Get rights by share class
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRightsByShareClass = async (req, res) => {
  try {
    const { shareClassId } = req.params;

    const investorRights = await databaseAdapter.find('InvestorRights', {
      shareClassId
    }, {
      sort: { createdAt: -1 }
    });

    res.status(200).json({ investorRights });
  } catch (error) {
    console.error('Error fetching rights by share class:', error);
    res.status(500).json({ error: 'Error fetching rights by share class' });
  }
};

/**
 * Get audit history for a right
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAuditHistory = async (req, res) => {
  try {
    const investorRight = await databaseAdapter.findById('InvestorRights', req.params.id);

    if (!investorRight) {
      return res.status(404).json({ error: 'Investor right not found' });
    }

    res.status(200).json({
      rightId: investorRight.rightId,
      auditLog: investorRight.auditLog || []
    });
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ error: 'Error fetching audit history' });
  }
};

/**
 * Generate rights report for a company
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.generateReport = async (req, res) => {
  try {
    const { companyId } = req.params;

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const report = await investorRightsService.generateRightsReport(companyId);

    res.status(200).json({ report });
  } catch (error) {
    console.error('Error generating rights report:', error);
    res.status(500).json({ error: 'Error generating rights report' });
  }
};

/**
 * Waive a right
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.waiveRight = async (req, res) => {
  try {
    const userId = req.user?.id || 'system';
    const { reason, documentReference } = req.body;

    const investorRight = await investorRightsService.waiveRight(
      req.params.id,
      { reason, documentReference },
      userId
    );

    res.status(200).json({
      message: 'Right waived successfully',
      investorRight
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error waiving right:', error);
    res.status(500).json({ error: 'Error waiving right' });
  }
};
