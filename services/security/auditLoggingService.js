/**
 * AuditLoggingService
 *
 * Comprehensive audit trail logging service for tracking
 * data modifications, user actions, and API calls
 */

const crypto = require('crypto');
const EventEmitter = require('events');

// Sensitive fields that should be redacted in logs
const SENSITIVE_FIELDS = [
  'password',
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'creditCardNumber',
  'cvv',
  'pin',
  'secret',
  'token',
  'apiKey',
  'privateKey',
  'bankAccount',
  'routingNumber'
];

class AuditLoggingService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxLogSize: config.maxLogSize || 10000,
      retentionDays: config.retentionDays || 365,
      ...config
    };

    this.logs = new Map();
    this.logsByDocument = new Map();
    this.logsByUser = new Map();
    this.logsByCategory = new Map();
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate hash for log integrity verification
   */
  generateLogHash(logEntry) {
    const dataToHash = JSON.stringify({
      id: logEntry.id,
      timestamp: logEntry.timestamp,
      category: logEntry.category,
      operation: logEntry.operation,
      userId: logEntry.userId,
      documentId: logEntry.documentId
    });
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  /**
   * Sanitize sensitive data from object
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    for (const key of Object.keys(sanitized)) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Add log entry to storage
   */
  addLogEntry(entry) {
    // Add hash for integrity
    entry.hash = this.generateLogHash(entry);
    entry.immutable = true;

    // Store in main map
    this.logs.set(entry.id, entry);

    // Index by document ID
    if (entry.documentId) {
      if (!this.logsByDocument.has(entry.documentId)) {
        this.logsByDocument.set(entry.documentId, []);
      }
      this.logsByDocument.get(entry.documentId).push(entry.id);
    }

    // Index by user ID
    if (entry.userId) {
      if (!this.logsByUser.has(entry.userId)) {
        this.logsByUser.set(entry.userId, []);
      }
      this.logsByUser.get(entry.userId).push(entry.id);
    }

    // Index by category
    if (!this.logsByCategory.has(entry.category)) {
      this.logsByCategory.set(entry.category, []);
    }
    this.logsByCategory.get(entry.category).push(entry.id);

    // Emit events
    this.emit('log', entry);

    // Emit security event for failed actions
    if (entry.category === 'USER_ACTION' && entry.success === false) {
      this.emit('security', entry);
    }

    // Enforce max size
    if (this.logs.size > this.config.maxLogSize) {
      const oldestId = this.logs.keys().next().value;
      this.logs.delete(oldestId);
    }

    return entry;
  }

  /**
   * Log data modifications (CREATE, UPDATE, DELETE)
   */
  logDataModification({
    operation,
    collection,
    documentId,
    userId,
    oldData,
    newData,
    ipAddress,
    userAgent
  }) {
    const entry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      category: 'DATA_MODIFICATION',
      operation,
      collection,
      documentId,
      userId,
      oldData: oldData ? this.sanitizeData(oldData) : undefined,
      newData: newData ? this.sanitizeData(newData) : undefined,
      ipAddress,
      userAgent
    };

    return this.addLogEntry(entry);
  }

  /**
   * Log user actions (LOGIN, LOGOUT, PERMISSION_CHANGE, etc.)
   */
  logUserAction({
    action,
    userId,
    success,
    reason,
    targetUserId,
    oldPermissions,
    newPermissions,
    initiatedBy,
    ipAddress,
    userAgent
  }) {
    const entry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      category: 'USER_ACTION',
      action,
      userId,
      success,
      reason,
      targetUserId,
      oldPermissions,
      newPermissions,
      initiatedBy,
      ipAddress,
      userAgent
    };

    return this.addLogEntry(entry);
  }

  /**
   * Log API calls
   */
  logAPICall({
    method,
    endpoint,
    userId,
    statusCode,
    responseTime,
    errorMessage,
    requestBody,
    queryParams,
    rateLimited,
    ipAddress,
    userAgent
  }) {
    const entry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      category: 'API_CALL',
      method,
      endpoint,
      userId,
      statusCode,
      responseTime,
      errorMessage,
      requestBody: requestBody ? this.sanitizeData(requestBody) : undefined,
      queryParams,
      rateLimited,
      ipAddress,
      userAgent
    };

    return this.addLogEntry(entry);
  }

  /**
   * Get log entry by ID
   */
  getLogById(id) {
    return this.logs.get(id) || null;
  }

  /**
   * Get all logs for a specific document
   */
  getLogsByDocumentId(documentId) {
    const logIds = this.logsByDocument.get(documentId) || [];
    return logIds.map(id => this.logs.get(id)).filter(Boolean);
  }

  /**
   * Search logs with filters
   */
  searchLogs({
    userId,
    category,
    collection,
    operation,
    ipAddress,
    startDate,
    endDate,
    limit = 100,
    offset = 0
  } = {}) {
    let results = Array.from(this.logs.values());

    // Apply filters
    if (userId) {
      results = results.filter(log => log.userId === userId);
    }
    if (category) {
      results = results.filter(log => log.category === category);
    }
    if (collection) {
      results = results.filter(log => log.collection === collection);
    }
    if (operation) {
      results = results.filter(log => log.operation === operation);
    }
    if (ipAddress) {
      results = results.filter(log => log.ipAddress === ipAddress);
    }
    if (startDate) {
      results = results.filter(log => new Date(log.timestamp) >= startDate);
    }
    if (endDate) {
      results = results.filter(log => new Date(log.timestamp) <= endDate);
    }

    // Sort by timestamp (newest first)
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  /**
   * Get audit statistics
   */
  getStatistics() {
    const logs = Array.from(this.logs.values());

    const byCategory = {};
    const byOperation = {};
    let successfulUserActions = 0;
    let failedUserActions = 0;
    const uniqueUsers = new Set();

    logs.forEach(log => {
      // Count by category
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;

      // Count by operation
      if (log.operation) {
        byOperation[log.operation] = (byOperation[log.operation] || 0) + 1;
      }

      // Count user action success/failure
      if (log.category === 'USER_ACTION') {
        if (log.success === true) {
          successfulUserActions++;
        } else if (log.success === false) {
          failedUserActions++;
        }
      }

      // Track unique users
      if (log.userId) {
        uniqueUsers.add(log.userId);
      }
    });

    return {
      totalLogs: logs.length,
      byCategory,
      byOperation,
      userActions: {
        successful: successfulUserActions,
        failed: failedUserActions
      },
      uniqueUsers: uniqueUsers.size
    };
  }

  /**
   * Export logs in various formats
   */
  exportLogs({ format = 'json', filter = {} } = {}) {
    let logs = this.searchLogs(filter);

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    if (format === 'csv') {
      if (logs.length === 0) {
        return '';
      }

      const headers = Object.keys(logs[0]);
      const csvRows = [headers.join(',')];

      logs.forEach(log => {
        const values = headers.map(header => {
          const value = log[header];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'object') {
            return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          }
          return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      });

      return csvRows.join('\n');
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  /**
   * Clean up old logs based on retention period
   */
  cleanup() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const logsToDelete = [];

    this.logs.forEach((log, id) => {
      if (new Date(log.timestamp) < cutoffDate) {
        logsToDelete.push(id);
      }
    });

    logsToDelete.forEach(id => {
      this.logs.delete(id);
    });

    return logsToDelete.length;
  }

  /**
   * Verify log integrity
   */
  verifyLogIntegrity(logId) {
    const log = this.logs.get(logId);
    if (!log) {
      throw new Error(`Log not found: ${logId}`);
    }

    const expectedHash = this.generateLogHash(log);
    return log.hash === expectedHash;
  }

  /**
   * Clear all logs (for testing)
   */
  clear() {
    this.logs.clear();
    this.logsByDocument.clear();
    this.logsByUser.clear();
    this.logsByCategory.clear();
  }
}

module.exports = AuditLoggingService;
