/**
 * Document Audit Controller
 *
 * Issue #102: Add Document Audit Trail
 *
 * REST endpoints for document audit trail operations.
 * Provides read-only access to audit data for compliance and monitoring.
 */

const DocumentAuditService = require('../services/documentAuditService');

/**
 * Get audit trail for a specific document
 * GET /api/v1/documents/:documentId/audit
 *
 * Query Parameters:
 * - actionType: Filter by action type
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
exports.getDocumentAuditTrail = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { actionType, startDate, endDate, limit, skip } = req.query;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    const options = {};
    if (actionType) options.actionType = actionType;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (limit) options.limit = parseInt(limit, 10);
    if (skip) options.skip = parseInt(skip, 10);

    const auditTrail = await DocumentAuditService.getAuditTrail(documentId, options);

    res.status(200).json({
      success: true,
      data: auditTrail,
      count: auditTrail.length
    });
  } catch (error) {
    console.error('Error fetching document audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document audit trail',
      message: error.message
    });
  }
};

/**
 * Get audit entries by user
 * GET /api/v1/audit/user/:userId
 *
 * Query Parameters:
 * - actionType: Filter by action type
 * - documentId: Filter by document
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
exports.getAuditByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { actionType, documentId, startDate, endDate, limit, skip } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const options = {};
    if (actionType) options.actionType = actionType;
    if (documentId) options.documentId = documentId;
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (limit) options.limit = parseInt(limit, 10);
    if (skip) options.skip = parseInt(skip, 10);

    const auditEntries = await DocumentAuditService.getAuditByUser(userId, options);

    res.status(200).json({
      success: true,
      data: auditEntries,
      count: auditEntries.length
    });
  } catch (error) {
    console.error('Error fetching user audit entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user audit entries',
      message: error.message
    });
  }
};

/**
 * Get audit entries by date range
 * GET /api/v1/audit/date-range
 *
 * Query Parameters:
 * - startDate: Start date (required, ISO string)
 * - endDate: End date (required, ISO string)
 * - documentId: Filter by document
 * - actionType: Filter by action type
 * - companyId: Filter by company
 * - userId: Filter by user
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
exports.getAuditByDateRange = async (req, res) => {
  try {
    const { startDate, endDate, documentId, actionType, companyId, userId, limit, skip } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const options = {};
    if (documentId) options.documentId = documentId;
    if (actionType) options.actionType = actionType;
    if (companyId) options.companyId = companyId;
    if (userId) options.userId = userId;
    if (limit) options.limit = parseInt(limit, 10);
    if (skip) options.skip = parseInt(skip, 10);

    const auditEntries = await DocumentAuditService.getAuditByDateRange(
      startDate,
      endDate,
      options
    );

    res.status(200).json({
      success: true,
      data: auditEntries,
      count: auditEntries.length
    });
  } catch (error) {
    console.error('Error fetching audit entries by date range:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit entries by date range',
      message: error.message
    });
  }
};

/**
 * Generate compliance audit report
 * POST /api/v1/audit/report
 *
 * Body Parameters:
 * - companyId: Company ID (required)
 * - startDate: Report start date (required, ISO string)
 * - endDate: Report end date (required, ISO string)
 * - reportType: Type of report (optional, default: 'comprehensive')
 */
exports.generateAuditReport = async (req, res) => {
  try {
    const { companyId, startDate, endDate, reportType } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId is required'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const report = await DocumentAuditService.generateAuditReport({
      companyId,
      startDate,
      endDate,
      reportType
    });

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating audit report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate audit report',
      message: error.message
    });
  }
};

/**
 * Search audit trail
 * GET /api/v1/audit/search
 *
 * Query Parameters:
 * - documentId: Filter by document
 * - userId: Filter by user
 * - actionType: Filter by action type (can be comma-separated for multiple)
 * - companyId: Filter by company
 * - ipAddress: Filter by IP address
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 * - keyword: Keyword search
 * - limit: Maximum results (default: 100)
 * - skip: Number to skip for pagination
 */
exports.searchAuditTrail = async (req, res) => {
  try {
    const {
      documentId,
      userId,
      actionType,
      companyId,
      ipAddress,
      startDate,
      endDate,
      keyword,
      limit,
      skip
    } = req.query;

    const searchParams = {};

    if (documentId) searchParams.documentId = documentId;
    if (userId) searchParams.userId = userId;
    if (actionType) {
      // Support comma-separated action types
      searchParams.actionType = actionType.includes(',')
        ? actionType.split(',').map(t => t.trim())
        : actionType;
    }
    if (companyId) searchParams.companyId = companyId;
    if (ipAddress) searchParams.ipAddress = ipAddress;
    if (startDate) searchParams.startDate = startDate;
    if (endDate) searchParams.endDate = endDate;
    if (keyword) searchParams.keyword = keyword;
    if (limit) searchParams.limit = parseInt(limit, 10);
    if (skip) searchParams.skip = parseInt(skip, 10);

    const result = await DocumentAuditService.searchAuditTrail(searchParams);

    res.status(200).json({
      success: true,
      data: result.results,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error searching audit trail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search audit trail',
      message: error.message
    });
  }
};

/**
 * Get document action statistics
 * GET /api/v1/documents/:documentId/audit/stats
 *
 * Query Parameters:
 * - startDate: Start date filter (ISO string)
 * - endDate: End date filter (ISO string)
 */
exports.getDocumentAuditStats = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    const stats = await DocumentAuditService.getDocumentActionStats(
      documentId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching document audit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document audit statistics',
      message: error.message
    });
  }
};

/**
 * Get available action types
 * GET /api/v1/audit/action-types
 */
exports.getActionTypes = async (req, res) => {
  try {
    const actionTypes = DocumentAuditService.getActionTypes();

    res.status(200).json({
      success: true,
      data: actionTypes
    });
  } catch (error) {
    console.error('Error fetching action types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch action types',
      message: error.message
    });
  }
};

/**
 * Log a manual audit entry
 * POST /api/v1/audit/log
 *
 * Body Parameters:
 * - documentId: Document ID (required)
 * - actionType: Action type (required)
 * - metadata: Additional metadata (optional)
 * - reason: Reason for action (optional)
 */
exports.logAuditEntry = async (req, res) => {
  try {
    const { documentId, actionType, metadata, reason, changes, previousValues, newValues } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'documentId is required'
      });
    }

    if (!actionType) {
      return res.status(400).json({
        success: false,
        error: 'actionType is required'
      });
    }

    // Validate action type
    const validActionTypes = DocumentAuditService.getActionTypes();
    if (!validActionTypes.includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid actionType. Must be one of: ${validActionTypes.join(', ')}`
      });
    }

    // Get actor from authenticated user
    const user = req.user || {};
    const actor = {
      userId: user.id || user._id || user.userId,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      role: user.role
    };

    if (!actor.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get IP address and user agent
    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.ip ||
      'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    const auditEntry = await DocumentAuditService.logAction({
      documentId,
      actionType,
      actor,
      ipAddress,
      userAgent,
      changes: changes || [],
      previousValues,
      newValues,
      metadata: {
        ...metadata,
        reason,
        companyId: metadata?.companyId || req.user?.companyId,
        details: {
          method: 'POST',
          endpoint: req.originalUrl,
          manualEntry: true
        }
      }
    });

    res.status(201).json({
      success: true,
      data: auditEntry
    });
  } catch (error) {
    console.error('Error logging audit entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log audit entry',
      message: error.message
    });
  }
};
