/**
 * SecurityIssuance Controller
 * Issue #76: Implement Security Issuances Register
 *
 * Controller for managing security issuances with:
 * - CRUD operations
 * - Compliance checking
 * - State filing management
 * - Deadline tracking
 */

const zerodbService = require('../services/zerodbService');
const ComplianceTrackingService = require('../services/complianceTrackingService');
const {
  SECURITY_TYPES,
  EXEMPTION_TYPES,
  US_STATE_CODES
} = require('../models/SecurityIssuance');

const TABLE_NAME = 'security_issuances';

// Required fields for creating a security issuance
const REQUIRED_FIELDS = [
  'issuanceId',
  'companyId',
  'securityType',
  'stakeholderId',
  'numberOfShares',
  'pricePerShare',
  'issuanceDate'
];

/**
 * Validate required fields
 */
const validateRequiredFields = (data) => {
  const missingFields = REQUIRED_FIELDS.filter(field => !data[field] && data[field] !== 0);
  if (missingFields.length > 0) {
    return `Missing required fields: ${REQUIRED_FIELDS.join(', ')}`;
  }
  return null;
};

/**
 * Validate security type
 */
const validateSecurityType = (securityType) => {
  if (!SECURITY_TYPES.includes(securityType)) {
    return `Invalid security type. Must be one of: ${SECURITY_TYPES.join(', ')}`;
  }
  return null;
};

/**
 * Validate exemption type
 */
const validateExemptionType = (exemptionType) => {
  if (exemptionType && !EXEMPTION_TYPES.includes(exemptionType)) {
    return `Invalid exemption type. Must be one of: ${EXEMPTION_TYPES.join(', ')}`;
  }
  return null;
};

/**
 * Create a new security issuance
 */
const createSecurityIssuance = async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    const requiredError = validateRequiredFields(data);
    if (requiredError) {
      return res.status(400).json({ success: false, error: requiredError });
    }

    // Validate security type
    const securityTypeError = validateSecurityType(data.securityType);
    if (securityTypeError) {
      return res.status(400).json({ success: false, error: securityTypeError });
    }

    // Validate exemption type if provided
    if (data.exemptionType) {
      const exemptionError = validateExemptionType(data.exemptionType);
      if (exemptionError) {
        return res.status(400).json({ success: false, error: exemptionError });
      }
    }

    // Validate numeric fields
    if (data.numberOfShares < 0) {
      return res.status(400).json({
        success: false,
        error: 'Number of shares must be positive'
      });
    }

    if (data.pricePerShare < 0) {
      return res.status(400).json({
        success: false,
        error: 'Price per share must be non-negative'
      });
    }

    // Calculate total consideration
    const totalConsideration = data.numberOfShares * data.pricePerShare;

    // Prepare issuance data
    const issuanceData = {
      ...data,
      totalConsideration,
      status: data.status || 'pending',
      complianceStatus: data.complianceStatus || 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculate federal filing deadline if applicable
    if (['regulation_d_506b', 'regulation_d_506c'].includes(data.exemptionType)) {
      issuanceData.federalFilingRequired = true;
      issuanceData.federalFilingStatus = 'pending';
      issuanceData.federalFilingDeadline = ComplianceTrackingService.calculateFilingDeadline(
        'form_d',
        data.issuanceDate
      );
    }

    let result;
    try {
      result = await zerodbService.insertRow(TABLE_NAME, issuanceData);
    } catch (insertErr) {
      // Auto-create table if it doesn't exist, then retry
      if (insertErr.message && (insertErr.message.includes('404') || insertErr.message.includes('not found') || insertErr.message.includes('500'))) {
        try { await zerodbService.createTable(TABLE_NAME, {}); } catch { /* table may already exist */ }
        result = await zerodbService.insertRow(TABLE_NAME, issuanceData);
      } else {
        throw insertErr;
      }
    }
    // Unwrap ZeroDB response: { data: [{ row_id, row_data }] } or { data: [flat_obj] }
    const rows = result?.data || result?.rows || [];
    let createdIssuance = result;
    if (Array.isArray(rows) && rows.length > 0) {
      const item = rows[0];
      createdIssuance = item.row_data ? { ...item.row_data, row_id: item.row_id } : item;
    }

    return res.status(201).json({
      success: true,
      data: createdIssuance
    });
  } catch (error) {
    console.error('Error creating security issuance:', error);
    return res.status(500).json({
      success: false,
      error: 'Error creating security issuance'
    });
  }
};

/**
 * Get all security issuances
 */
const getAllSecurityIssuances = async (req, res) => {
  try {
    const { companyId, securityType, exemptionType, status } = req.query;

    const filter = {};
    if (companyId) filter.companyId = companyId;
    if (securityType) filter.securityType = securityType;
    if (exemptionType) filter.exemptionType = exemptionType;
    if (status) filter.status = status;

    const queryOptions = Object.keys(filter).length > 0 ? { filter } : {};
    const issuances = await zerodbService.queryTable(TABLE_NAME, queryOptions);

    return res.status(200).json({
      success: true,
      data: issuances,
      count: issuances.length
    });
  } catch (error) {
    console.error('Error fetching security issuances:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching security issuances'
    });
  }
};

/**
 * Get security issuance by ID
 */
const getSecurityIssuanceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'id parameter is required'
      });
    }

    const results = await zerodbService.queryTable(TABLE_NAME, {
      filter: { id }
    });

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Security issuance not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    console.error('Error fetching security issuance:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching security issuance'
    });
  }
};

/**
 * Update security issuance by ID
 */
const updateSecurityIssuanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent updating issuanceId
    if (updateData.issuanceId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update issuanceId'
      });
    }

    // Validate security type if provided
    if (updateData.securityType) {
      const securityTypeError = validateSecurityType(updateData.securityType);
      if (securityTypeError) {
        return res.status(400).json({ success: false, error: securityTypeError });
      }
    }

    // Update timestamp
    updateData.updatedAt = new Date().toISOString();

    // ZeroDB: Use direct update without MongoDB $set operator
    const result = await zerodbService.updateRows(
      TABLE_NAME,
      { id },
      updateData
    );

    if (!result || result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Security issuance not found'
      });
    }

    const updatedIssuance = result.rows ? result.rows[0] : result;

    return res.status(200).json({
      success: true,
      data: updatedIssuance
    });
  } catch (error) {
    console.error('Error updating security issuance:', error);
    return res.status(500).json({
      success: false,
      error: 'Error updating security issuance'
    });
  }
};

/**
 * Delete security issuance by ID
 */
const deleteSecurityIssuanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await zerodbService.deleteRows(TABLE_NAME, { id });

    if (!result || result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Security issuance not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Security issuance deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting security issuance:', error);
    return res.status(500).json({
      success: false,
      error: 'Error deleting security issuance'
    });
  }
};

/**
 * Get compliance status for a company's issuances
 */
const getComplianceStatus = async (req, res) => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId is required'
      });
    }

    const issuances = await zerodbService.queryTable(TABLE_NAME, {
      filter: { companyId }
    });

    // Aggregate compliance statistics
    const stats = {
      totalIssuances: issuances.length,
      compliant: 0,
      pendingReview: 0,
      nonCompliant: 0,
      federalFilingStatus: {
        filed: 0,
        pending: 0,
        overdue: 0
      },
      issuances
    };

    issuances.forEach(issuance => {
      switch (issuance.complianceStatus) {
        case 'compliant':
          stats.compliant++;
          break;
        case 'pending_review':
          stats.pendingReview++;
          break;
        case 'non_compliant':
        case 'remediation_required':
          stats.nonCompliant++;
          break;
      }

      switch (issuance.federalFilingStatus) {
        case 'filed':
          stats.federalFilingStatus.filed++;
          break;
        case 'pending':
          stats.federalFilingStatus.pending++;
          break;
        case 'overdue':
          stats.federalFilingStatus.overdue++;
          break;
      }
    });

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching compliance status:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching compliance status'
    });
  }
};

/**
 * Get overdue filings
 */
const getOverdueFilings = async (req, res) => {
  try {
    const { companyId } = req.query;

    const filter = {
      $or: [
        { federalFilingStatus: 'overdue' },
        { 'stateFilings.filingStatus': 'overdue' }
      ]
    };

    if (companyId) {
      filter.companyId = companyId;
    }

    const issuances = await zerodbService.queryTable(TABLE_NAME, { filter });

    return res.status(200).json({
      success: true,
      data: issuances,
      count: issuances.length
    });
  } catch (error) {
    console.error('Error fetching overdue filings:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching overdue filings'
    });
  }
};

/**
 * Add state filing to an issuance
 */
const addStateFiling = async (req, res) => {
  try {
    const { id } = req.params;
    const stateFilingData = req.body;

    // Validate state code
    if (!stateFilingData.stateCode) {
      return res.status(400).json({
        success: false,
        error: 'stateCode is required'
      });
    }

    if (!US_STATE_CODES.includes(stateFilingData.stateCode.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid state code'
      });
    }

    // Normalize state code
    stateFilingData.stateCode = stateFilingData.stateCode.toUpperCase();

    // ZeroDB: Use read-modify-write pattern instead of MongoDB $push operator
    const currentResults = await zerodbService.queryTable(TABLE_NAME, {
      filter: { id }
    });

    if (!currentResults || currentResults.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Security issuance not found'
      });
    }

    const currentIssuance = currentResults[0];
    const currentFilings = currentIssuance.stateFilings || [];
    const updatedFilings = [...currentFilings, stateFilingData];

    const result = await zerodbService.updateRows(
      TABLE_NAME,
      { id },
      { stateFilings: updatedFilings, updatedAt: new Date().toISOString() }
    );

    const updatedIssuance = result.rows ? result.rows[0] : result;

    return res.status(200).json({
      success: true,
      data: updatedIssuance
    });
  } catch (error) {
    console.error('Error adding state filing:', error);
    return res.status(500).json({
      success: false,
      error: 'Error adding state filing'
    });
  }
};

/**
 * Update state filing
 */
const updateStateFiling = async (req, res) => {
  try {
    const { id, stateCode } = req.params;
    const updateData = req.body;

    // Get current issuance
    const results = await zerodbService.queryTable(TABLE_NAME, {
      filter: { id }
    });

    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Security issuance not found'
      });
    }

    const issuance = results[0];

    // Find and update the state filing
    const stateFilings = issuance.stateFilings || [];
    const filingIndex = stateFilings.findIndex(
      f => f.stateCode === stateCode.toUpperCase()
    );

    if (filingIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'State filing not found'
      });
    }

    // Update filing
    stateFilings[filingIndex] = {
      ...stateFilings[filingIndex],
      ...updateData,
      stateCode: stateCode.toUpperCase()
    };

    // ZeroDB: Use direct update without MongoDB $set operator
    const result = await zerodbService.updateRows(
      TABLE_NAME,
      { id },
      { stateFilings, updatedAt: new Date().toISOString() }
    );

    const updatedIssuance = result.rows ? result.rows[0] : result;

    return res.status(200).json({
      success: true,
      data: updatedIssuance
    });
  } catch (error) {
    console.error('Error updating state filing:', error);
    return res.status(500).json({
      success: false,
      error: 'Error updating state filing'
    });
  }
};

/**
 * Get state filing requirements
 */
const getStateFilingRequirements = async (req, res) => {
  try {
    const { exemptionType, states } = req.query;

    if (!exemptionType) {
      return res.status(400).json({
        success: false,
        error: 'exemptionType is required'
      });
    }

    const stateList = states ? states.split(',').map(s => s.trim().toUpperCase()) : [];
    const requirements = ComplianceTrackingService.getStateFilingRequirements(
      exemptionType,
      stateList
    );

    return res.status(200).json({
      success: true,
      data: {
        exemptionType,
        states: requirements
      }
    });
  } catch (error) {
    console.error('Error fetching state filing requirements:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error fetching state filing requirements'
    });
  }
};

/**
 * Get upcoming deadlines
 */
const getUpcomingDeadlines = async (req, res) => {
  try {
    const { companyId, daysAhead = '30' } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId is required'
      });
    }

    const days = parseInt(daysAhead, 10);
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const issuances = await zerodbService.queryTable(TABLE_NAME, {
      filter: { companyId }
    });

    const deadlines = [];

    issuances.forEach(issuance => {
      // Check federal deadline
      if (issuance.federalFilingStatus === 'pending' && issuance.federalFilingDeadline) {
        const deadline = new Date(issuance.federalFilingDeadline);
        if (deadline <= futureDate) {
          deadlines.push({
            issuanceId: issuance.issuanceId,
            type: 'federal',
            filingType: 'Form D',
            deadline: issuance.federalFilingDeadline,
            daysRemaining: Math.ceil((deadline - now) / (24 * 60 * 60 * 1000))
          });
        }
      }

      // Check state deadlines
      (issuance.stateFilings || []).forEach(filing => {
        if (filing.filingStatus === 'pending' && filing.filingDeadline) {
          const deadline = new Date(filing.filingDeadline);
          if (deadline <= futureDate) {
            deadlines.push({
              issuanceId: issuance.issuanceId,
              type: 'state',
              stateCode: filing.stateCode,
              filingType: 'State Notice',
              deadline: filing.filingDeadline,
              daysRemaining: Math.ceil((deadline - now) / (24 * 60 * 60 * 1000))
            });
          }
        }
      });
    });

    // Sort by deadline
    deadlines.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    return res.status(200).json({
      success: true,
      data: {
        companyId,
        daysAhead: days,
        deadlines
      }
    });
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching upcoming deadlines'
    });
  }
};

/**
 * Get issuances by exemption type
 */
const getByExemptionType = async (req, res) => {
  try {
    const { exemptionType, companyId } = req.query;

    if (!exemptionType) {
      return res.status(400).json({
        success: false,
        error: 'exemptionType is required'
      });
    }

    // Validate exemption type
    const exemptionError = validateExemptionType(exemptionType);
    if (exemptionError) {
      return res.status(400).json({ success: false, error: exemptionError });
    }

    const filter = { exemptionType };
    if (companyId) {
      filter.companyId = companyId;
    }

    const issuances = await zerodbService.queryTable(TABLE_NAME, { filter });

    return res.status(200).json({
      success: true,
      data: issuances,
      count: issuances.length
    });
  } catch (error) {
    console.error('Error fetching issuances by exemption type:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching issuances by exemption type'
    });
  }
};

module.exports = {
  createSecurityIssuance,
  getAllSecurityIssuances,
  getSecurityIssuanceById,
  updateSecurityIssuanceById,
  deleteSecurityIssuanceById,
  getComplianceStatus,
  getOverdueFilings,
  addStateFiling,
  updateStateFiling,
  getStateFilingRequirements,
  getUpcomingDeadlines,
  getByExemptionType
};
