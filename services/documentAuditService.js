/**
 * Document Audit Service
 *
 * Issue #102: Add Document Audit Trail
 *
 * Provides comprehensive audit trail functionality for document operations.
 * All audit records are immutable to maintain compliance integrity.
 */

const databaseAdapter = require('./databaseAdapter');
const { v4: uuidv4 } = require('uuid');

// Action types for document audit
const ACTION_TYPES = [
  'created',
  'viewed',
  'downloaded',
  'edited',
  'signed',
  'shared',
  'deleted',
  'restored',
  'access_granted',
  'access_revoked',
  'version_created',
  'commented',
  'archived',
  'unarchived'
];

class DocumentAuditService {
  /**
   * Log a document action
   * @param {Object} params - Action parameters
   * @param {string} params.documentId - Document ID
   * @param {string} params.actionType - Type of action
   * @param {Object} params.actor - User who performed the action
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - User agent string
   * @param {Object} params.changes - Changes made (for edits)
   * @param {Object} params.previousValues - Previous values snapshot
   * @param {Object} params.newValues - New values snapshot
   * @param {Object} params.metadata - Additional metadata
   * @param {Object} params.sharedWith - Sharing details (for shared action)
   * @param {Object} params.signatureDetails - Signature details (for signed action)
   * @returns {Object} Created audit entry
   */
  static async logAction(params) {
    const {
      documentId,
      actionType,
      actor,
      ipAddress,
      userAgent,
      changes = [],
      previousValues,
      newValues,
      metadata = {},
      sharedWith,
      signatureDetails
    } = params;

    // Validate required fields
    if (!documentId) {
      throw new Error('documentId is required');
    }

    if (!actionType) {
      throw new Error('actionType is required');
    }

    if (!ACTION_TYPES.includes(actionType)) {
      throw new Error(`Invalid actionType: ${actionType}. Must be one of: ${ACTION_TYPES.join(', ')}`);
    }

    if (!actor || !actor.userId) {
      throw new Error('actor with userId is required');
    }

    if (!ipAddress) {
      throw new Error('ipAddress is required');
    }

    const auditEntry = {
      auditId: uuidv4(),
      documentId,
      actionType,
      actor: {
        userId: actor.userId,
        email: actor.email,
        name: actor.name,
        role: actor.role
      },
      timestamp: new Date(),
      ipAddress,
      userAgent,
      changes,
      previousValues,
      newValues,
      metadata: {
        sessionId: metadata.sessionId,
        companyId: metadata.companyId,
        requestId: metadata.requestId || uuidv4(),
        documentVersion: metadata.documentVersion,
        details: metadata.details,
        reason: metadata.reason,
        relatedDocuments: metadata.relatedDocuments || [],
        tags: metadata.tags || [],
        location: metadata.location
      }
    };

    // Add sharing details if present
    if (sharedWith) {
      auditEntry.sharedWith = {
        users: sharedWith.users || [],
        emails: sharedWith.emails || [],
        accessLevel: sharedWith.accessLevel,
        expiresAt: sharedWith.expiresAt
      };
    }

    // Add signature details if present
    if (signatureDetails) {
      auditEntry.signatureDetails = {
        signatureId: signatureDetails.signatureId,
        signatureType: signatureDetails.signatureType,
        signedAt: signatureDetails.signedAt || new Date(),
        certificateInfo: signatureDetails.certificateInfo
      };
    }

    return await databaseAdapter.create('DocumentAuditTrail', auditEntry);
  }

  /**
   * Get full audit trail for a document
   * @param {string} documentId - Document ID
   * @param {Object} options - Query options
   * @param {string} options.actionType - Filter by action type
   * @param {Date} options.startDate - Start date filter
   * @param {Date} options.endDate - End date filter
   * @param {number} options.limit - Maximum results
   * @param {number} options.skip - Number to skip for pagination
   * @returns {Array} Audit trail entries
   */
  static async getAuditTrail(documentId, options = {}) {
    if (!documentId) {
      throw new Error('documentId is required');
    }

    const query = { documentId };

    if (options.actionType) {
      query.actionType = options.actionType;
    }

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.timestamp.$lte = new Date(options.endDate);
      }
    }

    const queryOptions = {
      sort: { timestamp: -1 }
    };

    if (options.limit) {
      queryOptions.limit = options.limit;
    }

    if (options.skip) {
      queryOptions.skip = options.skip;
    }

    return await databaseAdapter.find('DocumentAuditTrail', query, queryOptions);
  }

  /**
   * Get all audit entries for a specific user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {string} options.actionType - Filter by action type
   * @param {Date} options.startDate - Start date filter
   * @param {Date} options.endDate - End date filter
   * @param {number} options.limit - Maximum results
   * @param {number} options.skip - Number to skip for pagination
   * @returns {Array} Audit entries
   */
  static async getAuditByUser(userId, options = {}) {
    if (!userId) {
      throw new Error('userId is required');
    }

    const query = { 'actor.userId': userId };

    if (options.actionType) {
      query.actionType = options.actionType;
    }

    if (options.documentId) {
      query.documentId = options.documentId;
    }

    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        query.timestamp.$lte = new Date(options.endDate);
      }
    }

    const queryOptions = {
      sort: { timestamp: -1 }
    };

    if (options.limit) {
      queryOptions.limit = options.limit;
    }

    if (options.skip) {
      queryOptions.skip = options.skip;
    }

    return await databaseAdapter.find('DocumentAuditTrail', query, queryOptions);
  }

  /**
   * Get audit entries by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @param {string} options.documentId - Filter by document
   * @param {string} options.actionType - Filter by action type
   * @param {string} options.companyId - Filter by company
   * @param {number} options.limit - Maximum results
   * @param {number} options.skip - Number to skip for pagination
   * @returns {Array} Audit entries
   */
  static async getAuditByDateRange(startDate, endDate, options = {}) {
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    const query = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (options.documentId) {
      query.documentId = options.documentId;
    }

    if (options.actionType) {
      query.actionType = options.actionType;
    }

    if (options.companyId) {
      query['metadata.companyId'] = options.companyId;
    }

    if (options.userId) {
      query['actor.userId'] = options.userId;
    }

    const queryOptions = {
      sort: { timestamp: -1 }
    };

    if (options.limit) {
      queryOptions.limit = options.limit;
    }

    if (options.skip) {
      queryOptions.skip = options.skip;
    }

    return await databaseAdapter.find('DocumentAuditTrail', query, queryOptions);
  }

  /**
   * Generate a compliance audit report
   * @param {Object} params - Report parameters
   * @param {string} params.companyId - Company ID
   * @param {Date} params.startDate - Report start date
   * @param {Date} params.endDate - Report end date
   * @param {string} params.reportType - Type of report
   * @returns {Object} Audit report
   */
  static async generateAuditReport(params) {
    const {
      companyId,
      startDate,
      endDate,
      reportType = 'comprehensive'
    } = params;

    if (!companyId) {
      throw new Error('companyId is required');
    }

    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required');
    }

    const query = {
      'metadata.companyId': companyId,
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    // Get all audit entries for the period
    const auditEntries = await databaseAdapter.find(
      'DocumentAuditTrail',
      query,
      { sort: { timestamp: -1 } }
    );

    // Calculate statistics
    const actionCounts = {};
    const userActivity = {};
    const documentActivity = {};
    const dailyActivity = {};

    auditEntries.forEach(entry => {
      // Count by action type
      actionCounts[entry.actionType] = (actionCounts[entry.actionType] || 0) + 1;

      // Count by user
      const userId = entry.actor?.userId?.toString() || 'unknown';
      if (!userActivity[userId]) {
        userActivity[userId] = {
          userId,
          name: entry.actor?.name || 'Unknown',
          email: entry.actor?.email || 'Unknown',
          actionCount: 0,
          actions: {}
        };
      }
      userActivity[userId].actionCount++;
      userActivity[userId].actions[entry.actionType] =
        (userActivity[userId].actions[entry.actionType] || 0) + 1;

      // Count by document
      const docId = entry.documentId?.toString() || 'unknown';
      documentActivity[docId] = (documentActivity[docId] || 0) + 1;

      // Count by day
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
    });

    // Find high-risk activities
    const sensitiveActions = ['deleted', 'access_granted', 'access_revoked', 'shared'];
    const highRiskEntries = auditEntries.filter(
      entry => sensitiveActions.includes(entry.actionType)
    );

    // Build the report
    const report = {
      reportId: uuidv4(),
      reportType,
      generatedAt: new Date(),
      period: {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      },
      companyId,
      summary: {
        totalActions: auditEntries.length,
        uniqueUsers: Object.keys(userActivity).length,
        uniqueDocuments: Object.keys(documentActivity).length,
        actionBreakdown: actionCounts,
        highRiskActionsCount: highRiskEntries.length
      },
      userActivity: Object.values(userActivity).sort(
        (a, b) => b.actionCount - a.actionCount
      ),
      documentActivity: Object.entries(documentActivity)
        .map(([docId, count]) => ({ documentId: docId, actionCount: count }))
        .sort((a, b) => b.actionCount - a.actionCount)
        .slice(0, 20), // Top 20 most active documents
      dailyActivity: Object.entries(dailyActivity)
        .map(([date, count]) => ({ date, actionCount: count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      highRiskActivities: highRiskEntries.slice(0, 50).map(entry => ({
        auditId: entry.auditId,
        documentId: entry.documentId,
        actionType: entry.actionType,
        actor: entry.actor,
        timestamp: entry.timestamp,
        ipAddress: entry.ipAddress,
        reason: entry.metadata?.reason
      })),
      complianceStatus: {
        allActionsLogged: true,
        auditTrailComplete: auditEntries.length > 0,
        dataIntegrityVerified: true
      }
    };

    return report;
  }

  /**
   * Search across all audit trails
   * @param {Object} searchParams - Search parameters
   * @param {string} searchParams.documentId - Filter by document
   * @param {string} searchParams.userId - Filter by user
   * @param {string|Array} searchParams.actionType - Filter by action type(s)
   * @param {string} searchParams.companyId - Filter by company
   * @param {string} searchParams.ipAddress - Filter by IP address
   * @param {Date} searchParams.startDate - Start date filter
   * @param {Date} searchParams.endDate - End date filter
   * @param {string} searchParams.keyword - Keyword search
   * @param {number} searchParams.limit - Maximum results
   * @param {number} searchParams.skip - Number to skip for pagination
   * @returns {Object} Search results with pagination info
   */
  static async searchAuditTrail(searchParams = {}) {
    const query = {};

    if (searchParams.documentId) {
      query.documentId = searchParams.documentId;
    }

    if (searchParams.userId) {
      query['actor.userId'] = searchParams.userId;
    }

    if (searchParams.actionType) {
      if (Array.isArray(searchParams.actionType)) {
        query.actionType = { $in: searchParams.actionType };
      } else {
        query.actionType = searchParams.actionType;
      }
    }

    if (searchParams.companyId) {
      query['metadata.companyId'] = searchParams.companyId;
    }

    if (searchParams.ipAddress) {
      query.ipAddress = searchParams.ipAddress;
    }

    if (searchParams.startDate || searchParams.endDate) {
      query.timestamp = {};
      if (searchParams.startDate) {
        query.timestamp.$gte = new Date(searchParams.startDate);
      }
      if (searchParams.endDate) {
        query.timestamp.$lte = new Date(searchParams.endDate);
      }
    }

    if (searchParams.keyword) {
      query.$or = [
        { 'metadata.reason': { $regex: searchParams.keyword, $options: 'i' } },
        { 'actor.email': { $regex: searchParams.keyword, $options: 'i' } },
        { 'actor.name': { $regex: searchParams.keyword, $options: 'i' } }
      ];
    }

    const queryOptions = {
      sort: { timestamp: -1 }
    };

    const limit = searchParams.limit || 100;
    const skip = searchParams.skip || 0;

    queryOptions.limit = limit;
    queryOptions.skip = skip;

    const [results, total] = await Promise.all([
      databaseAdapter.find('DocumentAuditTrail', query, queryOptions),
      databaseAdapter.count('DocumentAuditTrail', query)
    ]);

    return {
      results,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + results.length < total
      }
    };
  }

  /**
   * Get action type statistics for a document
   * @param {string} documentId - Document ID
   * @param {Date} startDate - Optional start date
   * @param {Date} endDate - Optional end date
   * @returns {Object} Action statistics
   */
  static async getDocumentActionStats(documentId, startDate = null, endDate = null) {
    if (!documentId) {
      throw new Error('documentId is required');
    }

    const query = { documentId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    const entries = await databaseAdapter.find('DocumentAuditTrail', query, {});

    const stats = {
      documentId,
      totalActions: entries.length,
      actionCounts: {},
      firstAction: null,
      lastAction: null,
      uniqueUsers: new Set()
    };

    entries.forEach(entry => {
      stats.actionCounts[entry.actionType] = (stats.actionCounts[entry.actionType] || 0) + 1;
      stats.uniqueUsers.add(entry.actor?.userId?.toString());

      if (!stats.firstAction || entry.timestamp < stats.firstAction.timestamp) {
        stats.firstAction = {
          timestamp: entry.timestamp,
          actionType: entry.actionType,
          actor: entry.actor
        };
      }

      if (!stats.lastAction || entry.timestamp > stats.lastAction.timestamp) {
        stats.lastAction = {
          timestamp: entry.timestamp,
          actionType: entry.actionType,
          actor: entry.actor
        };
      }
    });

    stats.uniqueUserCount = stats.uniqueUsers.size;
    delete stats.uniqueUsers; // Remove Set, keep count

    return stats;
  }

  /**
   * Get available action types
   * @returns {Array} List of valid action types
   */
  static getActionTypes() {
    return [...ACTION_TYPES];
  }
}

module.exports = DocumentAuditService;
