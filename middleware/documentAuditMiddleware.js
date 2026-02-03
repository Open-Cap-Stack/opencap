/**
 * Document Audit Middleware
 *
 * Issue #102: Add Document Audit Trail
 *
 * Middleware for automatically logging document actions.
 * Captures request context and logs to the audit trail.
 */

const DocumentAuditService = require('../services/documentAuditService');

/**
 * Extract IP address from request
 * @param {Object} req - Express request object
 * @returns {string} IP address
 */
const getIpAddress = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    'unknown'
  );
};

/**
 * Extract user agent from request
 * @param {Object} req - Express request object
 * @returns {string} User agent
 */
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Extract actor information from request
 * @param {Object} req - Express request object
 * @returns {Object} Actor information
 */
const getActor = (req) => {
  const user = req.user || {};
  return {
    userId: user.id || user._id || user.userId || 'anonymous',
    email: user.email || 'unknown',
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
    role: user.role || 'user'
  };
};

/**
 * Build metadata from request context
 * @param {Object} req - Express request object
 * @param {Object} additionalMetadata - Additional metadata to include
 * @returns {Object} Metadata object
 */
const buildMetadata = (req, additionalMetadata = {}) => {
  return {
    sessionId: req.sessionID || req.headers['x-session-id'],
    companyId: req.body?.companyId || req.params?.companyId || req.user?.companyId,
    requestId: req.headers['x-request-id'] || req.id,
    documentVersion: additionalMetadata.documentVersion,
    details: additionalMetadata.details,
    reason: additionalMetadata.reason || req.body?.reason,
    relatedDocuments: additionalMetadata.relatedDocuments || [],
    tags: additionalMetadata.tags || [],
    location: additionalMetadata.location
  };
};

/**
 * Create audit logging middleware for a specific action type
 * @param {string} actionType - Type of action to log
 * @param {Object} options - Middleware options
 * @param {Function} options.getDocumentId - Function to extract document ID from request
 * @param {Function} options.getMetadata - Function to extract additional metadata
 * @param {Function} options.getChanges - Function to extract changes (for edits)
 * @param {Function} options.getPreviousValues - Function to get previous values
 * @param {Function} options.getNewValues - Function to get new values
 * @param {Function} options.getSharedWith - Function to get sharing details
 * @param {Function} options.getSignatureDetails - Function to get signature details
 * @param {boolean} options.logOnSuccess - Whether to log only on success (default: true)
 * @returns {Function} Express middleware
 */
const createAuditMiddleware = (actionType, options = {}) => {
  const {
    getDocumentId = (req) => req.params.id || req.params.documentId || req.body?.documentId,
    getMetadata = () => ({}),
    getChanges = () => [],
    getPreviousValues = () => undefined,
    getNewValues = () => undefined,
    getSharedWith = () => undefined,
    getSignatureDetails = () => undefined,
    logOnSuccess = true
  } = options;

  return async (req, res, next) => {
    // Store the original send function
    const originalSend = res.send;
    const originalJson = res.json;

    // Create the logging function
    const logAuditEntry = async () => {
      try {
        const documentId = getDocumentId(req);

        if (!documentId) {
          console.warn('Document audit middleware: No document ID found, skipping audit log');
          return;
        }

        const actor = getActor(req);

        if (!actor.userId || actor.userId === 'anonymous') {
          console.warn('Document audit middleware: No authenticated user, skipping audit log');
          return;
        }

        await DocumentAuditService.logAction({
          documentId,
          actionType,
          actor,
          ipAddress: getIpAddress(req),
          userAgent: getUserAgent(req),
          changes: getChanges(req, res),
          previousValues: getPreviousValues(req, res),
          newValues: getNewValues(req, res),
          metadata: {
            ...buildMetadata(req),
            ...getMetadata(req, res)
          },
          sharedWith: getSharedWith(req, res),
          signatureDetails: getSignatureDetails(req, res)
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Document audit middleware error:', error.message);
      }
    };

    if (logOnSuccess) {
      // Override send to log after successful response
      res.send = function(body) {
        const statusCode = res.statusCode;

        // Log only on successful responses (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          // Store response body for potential use in getNewValues
          res.locals.responseBody = body;
          logAuditEntry();
        }

        return originalSend.call(this, body);
      };

      res.json = function(body) {
        const statusCode = res.statusCode;

        // Log only on successful responses (2xx)
        if (statusCode >= 200 && statusCode < 300) {
          // Store response body for potential use in getNewValues
          res.locals.responseBody = body;
          logAuditEntry();
        }

        return originalJson.call(this, body);
      };
    } else {
      // Log immediately regardless of response status
      await logAuditEntry();
    }

    next();
  };
};

/**
 * Pre-built middleware for common document actions
 */
const documentAuditMiddleware = {
  /**
   * Log document creation
   */
  logCreated: createAuditMiddleware('created', {
    getNewValues: (req) => req.body,
    getMetadata: (req) => ({
      details: {
        method: 'POST',
        endpoint: req.originalUrl
      }
    })
  }),

  /**
   * Log document view
   */
  logViewed: createAuditMiddleware('viewed', {
    getMetadata: (req) => ({
      details: {
        method: 'GET',
        endpoint: req.originalUrl
      }
    })
  }),

  /**
   * Log document download
   */
  logDownloaded: createAuditMiddleware('downloaded', {
    getMetadata: (req) => ({
      details: {
        method: 'GET',
        endpoint: req.originalUrl,
        format: req.query?.format
      }
    })
  }),

  /**
   * Log document edit
   */
  logEdited: createAuditMiddleware('edited', {
    getNewValues: (req) => req.body,
    getMetadata: (req) => ({
      details: {
        method: req.method,
        endpoint: req.originalUrl,
        fieldsUpdated: Object.keys(req.body || {})
      }
    })
  }),

  /**
   * Log document signed
   */
  logSigned: createAuditMiddleware('signed', {
    getSignatureDetails: (req) => req.body?.signatureDetails || {
      signatureType: req.body?.signatureType,
      signedAt: new Date()
    },
    getMetadata: (req) => ({
      details: {
        method: 'POST',
        endpoint: req.originalUrl
      }
    })
  }),

  /**
   * Log document shared
   */
  logShared: createAuditMiddleware('shared', {
    getSharedWith: (req) => ({
      users: req.body?.users || [],
      emails: req.body?.emails || [],
      accessLevel: req.body?.accessLevel || 'view',
      expiresAt: req.body?.expiresAt
    }),
    getMetadata: (req) => ({
      details: {
        method: 'POST',
        endpoint: req.originalUrl,
        recipientCount: (req.body?.users?.length || 0) + (req.body?.emails?.length || 0)
      }
    })
  }),

  /**
   * Log document deletion
   */
  logDeleted: createAuditMiddleware('deleted', {
    getMetadata: (req) => ({
      reason: req.body?.reason || req.query?.reason,
      details: {
        method: 'DELETE',
        endpoint: req.originalUrl,
        softDelete: req.body?.softDelete !== false
      }
    })
  }),

  /**
   * Log document restoration
   */
  logRestored: createAuditMiddleware('restored', {
    getMetadata: (req) => ({
      details: {
        method: req.method,
        endpoint: req.originalUrl
      }
    })
  }),

  /**
   * Log access granted
   */
  logAccessGranted: createAuditMiddleware('access_granted', {
    getSharedWith: (req) => ({
      users: req.body?.users || [req.body?.userId],
      accessLevel: req.body?.accessLevel || 'view'
    }),
    getMetadata: (req) => ({
      details: {
        method: 'POST',
        endpoint: req.originalUrl,
        accessType: req.body?.accessType
      }
    })
  }),

  /**
   * Log access revoked
   */
  logAccessRevoked: createAuditMiddleware('access_revoked', {
    getMetadata: (req) => ({
      details: {
        method: req.method,
        endpoint: req.originalUrl,
        revokedUserId: req.body?.userId,
        revokedEmail: req.body?.email
      }
    })
  }),

  /**
   * Log version created
   */
  logVersionCreated: createAuditMiddleware('version_created', {
    getNewValues: (req) => req.body,
    getMetadata: (req) => ({
      documentVersion: req.body?.version,
      details: {
        method: 'POST',
        endpoint: req.originalUrl,
        versionNumber: req.body?.version
      }
    })
  }),

  /**
   * Log comment added
   */
  logCommented: createAuditMiddleware('commented', {
    getMetadata: (req) => ({
      details: {
        method: 'POST',
        endpoint: req.originalUrl,
        commentText: req.body?.comment?.substring(0, 100) // Truncate for privacy
      }
    })
  }),

  /**
   * Log document archived
   */
  logArchived: createAuditMiddleware('archived', {
    getMetadata: (req) => ({
      reason: req.body?.reason,
      details: {
        method: req.method,
        endpoint: req.originalUrl
      }
    })
  }),

  /**
   * Log document unarchived
   */
  logUnarchived: createAuditMiddleware('unarchived', {
    getMetadata: (req) => ({
      details: {
        method: req.method,
        endpoint: req.originalUrl
      }
    })
  }),

  /**
   * Create custom audit middleware
   */
  createCustom: createAuditMiddleware
};

// Export helper functions for testing
documentAuditMiddleware.getIpAddress = getIpAddress;
documentAuditMiddleware.getUserAgent = getUserAgent;
documentAuditMiddleware.getActor = getActor;
documentAuditMiddleware.buildMetadata = buildMetadata;

module.exports = documentAuditMiddleware;
