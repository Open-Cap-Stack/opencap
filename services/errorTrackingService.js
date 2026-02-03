/**
 * ErrorTrackingService
 *
 * Comprehensive error tracking service with error capture, aggregation,
 * categorization, frequency tracking, and trend analysis.
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class ErrorTrackingService extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      maxErrors: config.maxErrors || 1000,
      retentionPeriod: config.retentionPeriod || 86400000, // 24 hours
      enableStackTrace: config.enableStackTrace !== false,
      errorThreshold: config.errorThreshold || 100,
      ...config
    };

    // Error storage
    this.errors = [];
    this.errorIndex = new Map(); // fingerprint -> error indices for deduplication
    this.occurrenceCount = new Map(); // fingerprint -> count

    // Categorization patterns - order matters (more specific first)
    this.categoryPatterns = {
      database: [
        /mongo/i, /mongodb/i, /econnrefused/i, /postgresql/i,
        /zerodb/i, /database/i, /db_/i, /connection.*fail/i
      ],
      authentication: [
        /\btoken\b/i, /\bjwt\b/i, /\bauth/i, /unauthorized/i,
        /forbidden/i, /credential/i, /permission/i, /access.*denied/i
      ],
      network: [
        /etimedout/i, /enotfound/i, /\bsocket\b/i, /\bnetwork\b/i,
        /connection.*reset/i, /econnreset/i
      ],
      rateLimit: [
        /rate.*limit/i, /too.*many.*request/i, /throttl/i
      ],
      validation: [
        /validation\s+failed/i, /invalid\s+input/i, /schema\s+validation/i,
        /field.*required/i, /format\s+error/i
      ]
    };

    // Event listeners registered
    this.eventListeners = [];
  }

  /**
   * Capture an error
   * @param {Error|string} error - Error to capture
   * @param {Object} context - Additional context
   * @returns {Object} Captured error record
   */
  captureError(error, context = {}) {
    const errorRecord = this.createErrorRecord(error, context);

    // Check if similar error exists (deduplication)
    const existingIndices = this.errorIndex.get(errorRecord.fingerprint);
    if (existingIndices) {
      this.occurrenceCount.set(
        errorRecord.fingerprint,
        (this.occurrenceCount.get(errorRecord.fingerprint) || 1) + 1
      );
    } else {
      this.errorIndex.set(errorRecord.fingerprint, this.errors.length);
      this.occurrenceCount.set(errorRecord.fingerprint, 1);
    }

    // Add to storage
    this.errors.push(errorRecord);

    // Enforce max errors limit
    if (this.errors.length > this.config.maxErrors) {
      this.errors.shift();
    }

    // Emit event (use 'errorCaptured' to avoid Node.js special 'error' event handling)
    this.emit('errorCaptured', errorRecord);

    // Check threshold
    if (this.errors.length >= this.config.errorThreshold) {
      this.emit('threshold', {
        count: this.errors.length,
        threshold: this.config.errorThreshold
      });
    }

    return errorRecord;
  }

  /**
   * Create error record from error object
   * @param {Error|string} error - Error to process
   * @param {Object} context - Additional context
   * @returns {Object} Error record
   */
  createErrorRecord(error, context = {}) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);
    const stack = isError ? error.stack : undefined;
    const name = isError ? error.name : 'Error';

    const record = {
      id: this.generateErrorId(),
      message,
      name,
      type: isError ? 'Error' : typeof error,
      stack: this.config.enableStackTrace ? stack : undefined,
      timestamp: Date.now(),
      category: this.categorizeError(message, stack),
      severity: context.severity || 'medium',
      fingerprint: this.generateFingerprint(message, stack),
      context: {
        ...context,
        endpoint: context.endpoint,
        requestId: context.requestId,
        userId: context.userId
      }
    };

    return record;
  }

  /**
   * Generate unique error ID
   * @returns {string} Error ID
   */
  generateErrorId() {
    return `err-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate fingerprint for error deduplication
   * @param {string} message - Error message
   * @param {string} stack - Error stack trace
   * @returns {string} Fingerprint hash
   */
  generateFingerprint(message, stack) {
    // Use message and first stack frame for fingerprinting
    const stackFirstLine = stack ? stack.split('\n')[1] || '' : '';
    const content = `${message}|${stackFirstLine}`;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Categorize error based on patterns
   * @param {string} message - Error message
   * @param {string} stack - Error stack trace
   * @returns {string} Error category
   */
  categorizeError(message, stack) {
    const combined = `${message} ${stack || ''}`;

    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(combined)) {
          return category;
        }
      }
    }

    return 'unknown';
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const uniqueErrors = this.errorIndex.size;
    const totalErrors = this.errors.length;
    const timestamps = this.errors.map(e => e.timestamp);

    const endpointCounts = {};
    const categoryCounts = {};

    this.errors.forEach(error => {
      if (error.context?.endpoint) {
        endpointCounts[error.context.endpoint] = (endpointCounts[error.context.endpoint] || 0) + 1;
      }
      categoryCounts[error.category] = (categoryCounts[error.category] || 0) + 1;
    });

    // Find most common error and most affected endpoint
    let mostCommonError = null;
    let maxOccurrences = 0;
    for (const [fingerprint, count] of this.occurrenceCount) {
      if (count > maxOccurrences) {
        maxOccurrences = count;
        const index = this.errorIndex.get(fingerprint);
        if (index !== undefined && this.errors[index]) {
          mostCommonError = this.errors[index].message;
        }
      }
    }

    let mostAffectedEndpoint = null;
    let maxEndpointErrors = 0;
    for (const [endpoint, count] of Object.entries(endpointCounts)) {
      if (count > maxEndpointErrors) {
        maxEndpointErrors = count;
        mostAffectedEndpoint = endpoint;
      }
    }

    return {
      totalErrors,
      uniqueErrors,
      errorRate: this.calculateErrorRate(),
      mostCommonError,
      mostAffectedEndpoint,
      firstErrorAt: timestamps.length > 0 ? Math.min(...timestamps) : null,
      lastErrorAt: timestamps.length > 0 ? Math.max(...timestamps) : null,
      byCategory: categoryCounts,
      byEndpoint: endpointCounts
    };
  }

  /**
   * Calculate error rate (errors per minute)
   * @returns {number} Error rate
   */
  calculateErrorRate() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentErrors = this.errors.filter(e => e.timestamp >= oneMinuteAgo);
    return recentErrors.length;
  }

  /**
   * Get error aggregation
   * @param {Object} options - Aggregation options
   * @returns {Object} Aggregation data
   */
  getAggregation(options = {}) {
    const { timeRange = this.config.retentionPeriod } = options;
    const cutoff = Date.now() - timeRange;

    const filteredErrors = this.errors.filter(e => e.timestamp >= cutoff);

    const byCategory = {};
    const bySeverity = {};
    const byEndpoint = {};

    filteredErrors.forEach(error => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      if (error.context?.endpoint) {
        byEndpoint[error.context.endpoint] = (byEndpoint[error.context.endpoint] || 0) + 1;
      }
    });

    return {
      total: filteredErrors.length,
      byCategory,
      bySeverity,
      byEndpoint,
      timeRange
    };
  }

  /**
   * Get error frequency metrics
   * @returns {Object} Frequency metrics
   */
  getFrequency() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;
    const fiveMinutesAgo = now - 300000;
    const tenMinutesAgo = now - 600000;

    const lastMinute = this.errors.filter(e => e.timestamp >= oneMinuteAgo);
    const lastHour = this.errors.filter(e => e.timestamp >= oneHourAgo);
    const lastFiveMinutes = this.errors.filter(e => e.timestamp >= fiveMinutesAgo);
    const previousFiveMinutes = this.errors.filter(
      e => e.timestamp >= tenMinutesAgo && e.timestamp < fiveMinutesAgo
    );

    // Calculate rate change
    const currentRate = lastFiveMinutes.length;
    const previousRate = previousFiveMinutes.length;
    const rateChange = previousRate > 0
      ? ((currentRate - previousRate) / previousRate) * 100
      : currentRate > 0 ? 100 : 0;

    return {
      errorsPerMinute: lastMinute.length,
      errorsPerHour: lastHour.length,
      rateChange
    };
  }

  /**
   * Get error trend analysis
   * @returns {Object} Trend analysis
   */
  getTrend() {
    const now = Date.now();
    const intervals = [];
    const intervalDuration = 60000; // 1 minute intervals

    // Get counts for last 5 intervals
    for (let i = 0; i < 5; i++) {
      const start = now - (intervalDuration * (i + 1));
      const end = now - (intervalDuration * i);
      const count = this.errors.filter(e => e.timestamp >= start && e.timestamp < end).length;
      intervals.unshift(count); // Add to beginning for chronological order
    }

    // Calculate trend direction
    const recentAvg = intervals.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const olderAvg = intervals.slice(0, 2).reduce((a, b) => a + b, 0) / 2;

    let direction = 'stable';
    let percentageChange = 0;

    if (olderAvg > 0) {
      percentageChange = ((recentAvg - olderAvg) / olderAvg) * 100;
      if (percentageChange > 20) {
        direction = 'increasing';
      } else if (percentageChange < -20) {
        direction = 'decreasing';
      }
    } else if (recentAvg > 0) {
      direction = 'increasing';
      percentageChange = 100;
    }

    return {
      direction,
      percentageChange,
      intervals
    };
  }

  /**
   * Get recent errors
   * @param {number} limit - Maximum number of errors to return
   * @param {Object} filter - Filter options
   * @returns {Array} Recent errors
   */
  getRecentErrors(limit = 10, filter = {}) {
    let filtered = [...this.errors];

    if (filter.category) {
      filtered = filtered.filter(e => e.category === filter.category);
    }
    if (filter.severity) {
      filtered = filtered.filter(e => e.severity === filter.severity);
    }

    return filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get error by ID
   * @param {string} id - Error ID
   * @returns {Object|null} Error record or null
   */
  getErrorById(id) {
    return this.errors.find(e => e.id === id) || null;
  }

  /**
   * Cleanup old errors
   */
  cleanup() {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.errors = this.errors.filter(e => e.timestamp >= cutoff);

    // Rebuild index after cleanup
    this.errorIndex.clear();
    this.errors.forEach((error, index) => {
      this.errorIndex.set(error.fingerprint, index);
    });
  }

  /**
   * Create Express error middleware
   * @returns {Function} Express error middleware
   */
  middleware() {
    return (err, req, res, next) => {
      this.captureError(err, {
        endpoint: req.url || req.originalUrl,
        requestId: req.requestId,
        method: req.method,
        ip: req.ip
      });

      next(err);
    };
  }

  /**
   * Register for unhandled exception capture
   */
  captureUnhandled() {
    process.on('uncaughtException', (error) => {
      this.captureError(error, { type: 'uncaughtException', severity: 'critical' });
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureError(error, { type: 'unhandledRejection', severity: 'critical' });
    });
  }

  /**
   * Serialize errors for export
   * @returns {string} JSON string of errors
   */
  serialize() {
    return JSON.stringify({
      errors: this.errors,
      stats: this.getErrorStats(),
      exportedAt: Date.now()
    });
  }

  /**
   * Import serialized errors
   * @param {string} data - JSON string to import
   */
  import(data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.errors && Array.isArray(parsed.errors)) {
        parsed.errors.forEach(error => {
          this.errors.push(error);
          this.errorIndex.set(error.fingerprint, this.errors.length - 1);
        });
      }
    } catch (e) {
      console.error('Failed to import error data:', e.message);
    }
  }
}

// Export singleton instance
const errorTrackingService = new ErrorTrackingService();

module.exports = ErrorTrackingService;
module.exports.errorTrackingService = errorTrackingService;
