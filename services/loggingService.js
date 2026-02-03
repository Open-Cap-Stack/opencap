/**
 * LoggingService
 *
 * Structured logging service with JSON output, request ID tracking,
 * and log aggregation utilities for comprehensive observability.
 */

const crypto = require('crypto');

class LoggingService {
  constructor(config = {}) {
    this.config = {
      level: config.level || process.env.LOG_LEVEL || 'info',
      format: config.format || 'json',
      serviceName: config.serviceName || process.env.SERVICE_NAME || 'opencap-api',
      environment: config.environment || process.env.NODE_ENV || 'development',
      enableAggregation: config.enableAggregation || false,
      transports: config.transports || [{ type: 'console' }],
      sensitiveHeaders: config.sensitiveHeaders || [
        'authorization',
        'cookie',
        'x-api-key',
        'x-auth-token'
      ],
      ...config
    };

    // Log level priority (lower = more severe)
    this.levelPriority = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    // Aggregation stats
    this.stats = {
      byLevel: { error: 0, warn: 0, info: 0, debug: 0 },
      byErrorType: {},
      totalLogs: 0,
      startTime: Date.now()
    };

    // Child context for child loggers
    this.childContext = {};
  }

  /**
   * Check if a log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} Whether the level should be logged
   */
  shouldLog(level) {
    const configLevel = this.levelPriority[this.config.level] || 2;
    const checkLevel = this.levelPriority[level] || 2;
    return checkLevel <= configLevel;
  }

  /**
   * Format log entry as JSON
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   * @returns {string} JSON formatted log entry
   */
  formatLog(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.config.serviceName,
      environment: this.config.environment,
      ...this.childContext,
      ...meta
    };

    // Handle Error objects
    if (meta.error instanceof Error) {
      logEntry.error = {
        name: meta.error.name,
        message: meta.error.message,
        stack: meta.error.stack
      };
      delete logEntry.error.error; // Remove nested reference
    }

    // Handle circular references
    try {
      return JSON.stringify(logEntry, this.getCircularReplacer());
    } catch (e) {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        service: this.config.serviceName,
        parseError: 'Failed to stringify log entry'
      });
    }
  }

  /**
   * Get circular reference replacer for JSON.stringify
   * @returns {Function} Replacer function
   */
  getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    if (!this.shouldLog('error')) return;

    const logOutput = this.formatLog('error', message, meta);
    console.error(logOutput);

    this.aggregate('error', meta);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    if (!this.shouldLog('warn')) return;

    const logOutput = this.formatLog('warn', message, meta);
    console.warn(logOutput);

    this.aggregate('warn', meta);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    if (!this.shouldLog('info')) return;

    const logOutput = this.formatLog('info', message, meta);
    console.log(logOutput);

    this.aggregate('info', meta);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    if (!this.shouldLog('debug')) return;

    const logOutput = this.formatLog('debug', message, meta);
    console.debug(logOutput);

    this.aggregate('debug', meta);
  }

  /**
   * Generate unique request ID
   * @returns {string} Unique request ID
   */
  generateRequestId() {
    return `req-${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Create logging context with default values
   * @param {Object} values - Initial context values
   * @returns {Object} Context object
   */
  createContext(values = {}) {
    return {
      requestId: values.requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      ...values
    };
  }

  /**
   * Extend existing context with new values
   * @param {Object} baseContext - Base context
   * @param {Object} extensions - Values to add
   * @returns {Object} Extended context
   */
  extendContext(baseContext, extensions = {}) {
    return {
      ...baseContext,
      ...extensions
    };
  }

  /**
   * Aggregate log statistics
   * @param {string} level - Log level
   * @param {Object} meta - Log metadata
   */
  aggregate(level, meta = {}) {
    if (!this.config.enableAggregation) return;

    this.stats.totalLogs++;
    this.stats.byLevel[level] = (this.stats.byLevel[level] || 0) + 1;

    if (meta.errorType) {
      this.stats.byErrorType[meta.errorType] = (this.stats.byErrorType[meta.errorType] || 0) + 1;
    }
  }

  /**
   * Get log statistics
   * @returns {Object} Log statistics
   */
  getLogStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime
    };
  }

  /**
   * Clear aggregated statistics
   */
  clearStats() {
    this.stats = {
      byLevel: { error: 0, warn: 0, info: 0, debug: 0 },
      byErrorType: {},
      totalLogs: 0,
      startTime: Date.now()
    };
  }

  /**
   * Log HTTP request
   * @param {Object} req - Express request object
   */
  logRequest(req) {
    const maskedHeaders = this.maskSensitiveHeaders(req.headers || {});

    this.info('HTTP Request', {
      http: {
        method: req.method,
        url: req.url || req.originalUrl,
        ip: req.ip || req.connection?.remoteAddress,
        headers: maskedHeaders,
        userAgent: req.headers?.['user-agent']
      },
      requestId: req.requestId
    });
  }

  /**
   * Log HTTP response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in milliseconds
   */
  logResponse(req, res, responseTime) {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    this[level]('HTTP Response', {
      http: {
        method: req.method,
        url: req.url || req.originalUrl,
        statusCode: res.statusCode,
        responseTime
      },
      requestId: req.requestId
    });
  }

  /**
   * Mask sensitive headers
   * @param {Object} headers - Request headers
   * @returns {Object} Headers with sensitive values masked
   */
  maskSensitiveHeaders(headers) {
    const masked = { ...headers };
    for (const header of this.config.sensitiveHeaders) {
      if (masked[header]) {
        masked[header] = '[REDACTED]';
      }
    }
    return masked;
  }

  /**
   * Create Express middleware for request logging
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      // Assign request ID
      req.requestId = req.headers['x-request-id'] || this.generateRequestId();

      // Track start time
      const startTime = process.hrtime();

      // Log request
      this.logRequest(req);

      // Listen for response finish
      res.on('finish', () => {
        const diff = process.hrtime(startTime);
        const responseTime = Math.round((diff[0] * 1e3) + (diff[1] / 1e6));
        this.logResponse(req, res, responseTime);
      });

      next();
    };
  }

  /**
   * Create child logger with additional context
   * @param {Object} context - Context to include in all child logs
   * @returns {LoggingService} Child logger instance
   */
  child(context = {}) {
    const childLogger = new LoggingService({
      ...this.config,
      enableAggregation: false // Don't aggregate in child loggers
    });
    childLogger.childContext = {
      ...this.childContext,
      ...context
    };
    return childLogger;
  }
}

// Export singleton instance
const loggingService = new LoggingService();

module.exports = LoggingService;
module.exports.loggingService = loggingService;
