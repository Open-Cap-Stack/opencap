/**
 * Database Monitoring Middleware
 *
 * [Feature] GitHub Issue #8: Setup database monitoring
 *
 * Monitors ZeroDB operations including:
 * - Query execution times
 * - Operation success/failure rates
 * - Error logging with context
 * - Performance metrics (avg, p95, p99)
 * - ZeroDB API rate limits
 */

const fs = require('fs');
const path = require('path');

class DatabaseMonitor {
  constructor() {
    this.enabled = false;
    this.logStream = null;
    this.metrics = {
      zerodb: {
        operations: [],
        errors: [],
        totalOps: 0,
        totalErrors: 0,
        rateLimitInfo: {
          limit: null,
          remaining: null,
          reset: null
        }
      }
    };

    // Keep only last 1000 operations in memory
    this.maxOperationsInMemory = 1000;

    // Performance metrics calculation interval
    this.metricsInterval = null;
    this.currentMetrics = {
      zerodb: { avg: 0, p95: 0, p99: 0, errorRate: 0 }
    };
  }

  /**
   * Initialize database monitoring
   * @param {Object} options - Configuration options
   */
  initialize(options = {}) {
    this.enabled = process.env.ENABLE_DB_MONITORING === 'true';

    if (!this.enabled) {
      console.log('Database monitoring disabled');
      return;
    }

    console.log('Initializing database monitoring...');

    // Setup log file in production
    if (process.env.NODE_ENV === 'production') {
      const logsDir = process.env.LOG_DIR || '/tmp/logs';
      try {
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        this.logStream = fs.createWriteStream(
          path.join(logsDir, 'database-operations.log'),
          { flags: 'a' }
        );
      } catch (err) {
        console.warn(`Could not create logs directory: ${err.message}. Using console-only logging.`);
      }
    }

    // Calculate metrics every 60 seconds
    this.metricsInterval = setInterval(() => {
      this.calculateMetrics();
    }, 60000);

    console.log('Database monitoring initialized');
  }

  /**
   * Setup ZeroDB monitoring by enhancing axios interceptors
   * Call this method after ZeroDB service is initialized
   * @param {Object} zerodbService - ZeroDB service instance
   */
  setupZeroDBMonitoring(zerodbService) {
    if (!this.enabled || !zerodbService || !zerodbService.client) {
      return;
    }

    const self = this;

    // Remove existing interceptors and add enhanced ones
    zerodbService.client.interceptors.request.handlers = [];
    zerodbService.client.interceptors.response.handlers = [];

    // Enhanced request interceptor
    zerodbService.client.interceptors.request.use(
      (config) => {
        config._startTime = process.hrtime.bigint();

        if (zerodbService.token) {
          config.headers.Authorization = `Bearer ${zerodbService.token}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Enhanced response interceptor with monitoring
    zerodbService.client.interceptors.response.use(
      (response) => {
        const config = response.config;
        if (config._startTime) {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - config._startTime) / 1000000;

          // Extract rate limit info from headers
          const rateLimitInfo = {
            limit: response.headers['x-ratelimit-limit'],
            remaining: response.headers['x-ratelimit-remaining'],
            reset: response.headers['x-ratelimit-reset']
          };

          self.metrics.zerodb.rateLimitInfo = rateLimitInfo;

          self.logOperation('zerodb', {
            operation: `${config.method.toUpperCase()} ${config.url}`,
            duration,
            success: true,
            statusCode: response.status,
            rateLimitInfo,
            timestamp: new Date().toISOString()
          });
        }

        return response;
      },
      (error) => {
        const config = error.config;
        if (config && config._startTime) {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - config._startTime) / 1000000;

          self.logOperation('zerodb', {
            operation: `${config.method.toUpperCase()} ${config.url}`,
            duration,
            success: false,
            statusCode: error.response?.status,
            error: {
              message: error.message,
              data: error.response?.data
            },
            timestamp: new Date().toISOString()
          });

          self.logError('zerodb', error, {
            operation: `${config.method.toUpperCase()} ${config.url}`,
            statusCode: error.response?.status
          });
        }

        console.error('ZeroDB API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log('ZeroDB monitoring configured');
  }

  /**
   * Log database operation
   * @param {string} database - 'zerodb'
   * @param {Object} operationData - Operation details
   */
  logOperation(database, operationData) {
    if (!this.enabled) return;

    const logEntry = {
      database,
      ...operationData
    };

    // Add to metrics
    this.metrics[database].operations.push(logEntry);
    this.metrics[database].totalOps++;

    // Keep only recent operations in memory
    if (this.metrics[database].operations.length > this.maxOperationsInMemory) {
      this.metrics[database].operations.shift();
    }

    // Write to log file
    if (this.logStream) {
      this.logStream.write(JSON.stringify(logEntry) + '\n');
    }

    // Console log in development
    if (process.env.NODE_ENV === 'development') {
      const status = logEntry.success ? '?' : '?';
      const duration = logEntry.duration ? `${logEntry.duration.toFixed(2)}ms` : 'N/A';
      console.log(`[DB Monitor] ${status} ${database.toUpperCase()}: ${logEntry.operation} (${duration})`);
    }
  }

  /**
   * Log database error with context
   * @param {string} database - 'zerodb'
   * @param {Error} error - Error object
   * @param {Object} context - Additional context
   */
  logError(database, error, context = {}) {
    if (!this.enabled) return;

    const errorEntry = {
      database,
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      context
    };

    this.metrics[database].errors.push(errorEntry);
    this.metrics[database].totalErrors++;

    // Keep only recent errors in memory
    if (this.metrics[database].errors.length > 100) {
      this.metrics[database].errors.shift();
    }

    // Write to log file
    if (this.logStream) {
      this.logStream.write(JSON.stringify(errorEntry) + '\n');
    }

    // Always log errors to console
    console.error(`[DB Monitor] ERROR ${database.toUpperCase()}:`, errorEntry);
  }

  /**
   * Calculate performance metrics (avg, p95, p99, error rate)
   */
  calculateMetrics() {
    const operations = this.metrics.zerodb.operations.filter(op => op.duration);

    if (operations.length === 0) {
      this.currentMetrics.zerodb = { avg: 0, p95: 0, p99: 0, errorRate: 0 };
      return;
    }

    // Extract durations and sort
    const durations = operations.map(op => op.duration).sort((a, b) => a - b);

    // Calculate average
    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

    // Calculate percentiles
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const p95 = durations[p95Index] || 0;
    const p99 = durations[p99Index] || 0;

    // Calculate error rate
    const failedOps = operations.filter(op => !op.success).length;
    const errorRate = operations.length > 0 ? (failedOps / operations.length) * 100 : 0;

    this.currentMetrics.zerodb = {
      avg: parseFloat(avg.toFixed(2)),
      p95: parseFloat(p95.toFixed(2)),
      p99: parseFloat(p99.toFixed(2)),
      errorRate: parseFloat(errorRate.toFixed(2))
    };
  }

  /**
   * Get current metrics for ZeroDB
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    this.calculateMetrics();

    return {
      zerodb: {
        ...this.currentMetrics.zerodb,
        totalOperations: this.metrics.zerodb.totalOps,
        totalErrors: this.metrics.zerodb.totalErrors,
        recentOperations: this.metrics.zerodb.operations.length,
        recentErrors: this.metrics.zerodb.errors.length,
        rateLimit: this.metrics.zerodb.rateLimitInfo
      }
    };
  }

  /**
   * Get recent operations
   * @param {string} database - 'zerodb'
   * @param {number} limit - Number of operations to return
   * @returns {Array} Recent operations
   */
  getRecentOperations(database, limit = 50) {
    return this.metrics[database]?.operations.slice(-limit) || [];
  }

  /**
   * Get recent errors
   * @param {string} database - 'zerodb'
   * @param {number} limit - Number of errors to return
   * @returns {Array} Recent errors
   */
  getRecentErrors(database, limit = 50) {
    return this.metrics[database]?.errors.slice(-limit) || [];
  }

  /**
   * Sanitize query to remove sensitive data
   * @param {Object} query - Query object
   * @returns {Object} Sanitized query
   */
  sanitizeQuery(query) {
    if (!query || typeof query !== 'object') return query;

    const sanitized = { ...query };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * Cleanup and shutdown monitoring
   */
  shutdown() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.logStream) {
      this.logStream.end();
    }

    console.log('Database monitoring shut down');
  }
}

// Export singleton instance
const databaseMonitor = new DatabaseMonitor();

/**
 * Express middleware to expose metrics endpoint
 */
const metricsMiddleware = (req, res, next) => {
  if (req.path === '/api/v1/admin/db-metrics' && req.method === 'GET') {
    if (!databaseMonitor.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Database monitoring is not enabled'
      });
    }

    return res.json({
      success: true,
      data: databaseMonitor.getMetrics()
    });
  }
  next();
};

module.exports = {
  databaseMonitor,
  metricsMiddleware
};
