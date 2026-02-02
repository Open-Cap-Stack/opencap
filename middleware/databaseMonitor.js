/**
 * Database Monitoring Middleware
 *
 * [Feature] GitHub Issue #8: Setup parallel database monitoring
 *
 * Monitors both MongoDB and ZeroDB operations including:
 * - Query execution times
 * - Operation success/failure rates
 * - Error logging with context
 * - Performance metrics (avg, p95, p99)
 * - Data sync status
 * - ZeroDB API rate limits
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

class DatabaseMonitor {
  constructor() {
    this.enabled = false;
    this.logStream = null;
    this.metrics = {
      mongodb: {
        operations: [],
        errors: [],
        totalOps: 0,
        totalErrors: 0
      },
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
      mongodb: { avg: 0, p95: 0, p99: 0, errorRate: 0 },
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
      const logsDir = path.join(__dirname, '../logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      this.logStream = fs.createWriteStream(
        path.join(logsDir, 'database-operations.log'),
        { flags: 'a' }
      );
    }

    // Setup MongoDB monitoring
    this.setupMongoDBMonitoring();

    // Calculate metrics every 60 seconds
    this.metricsInterval = setInterval(() => {
      this.calculateMetrics();
    }, 60000);

    console.log('✅ Database monitoring initialized');
  }

  /**
   * Setup MongoDB query monitoring using Mongoose plugins
   */
  setupMongoDBMonitoring() {
    const self = this;

    // Global plugin to monitor all queries
    mongoose.plugin(function(schema) {
      // Hook into all query operations
      const operations = [
        'count', 'countDocuments', 'deleteMany', 'deleteOne',
        'find', 'findOne', 'findOneAndDelete', 'findOneAndRemove',
        'findOneAndUpdate', 'remove', 'update', 'updateOne', 'updateMany'
      ];

      operations.forEach(operation => {
        schema.pre(operation, function() {
          this._startTime = process.hrtime.bigint();
          this._operation = operation;
        });

        schema.post(operation, function(result) {
          if (self.enabled && this._startTime) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - this._startTime) / 1000000; // Convert to milliseconds

            self.logOperation('mongodb', {
              operation: this._operation,
              model: this.model ? this.model.modelName : 'unknown',
              conditions: self.sanitizeQuery(this.getQuery ? this.getQuery() : {}),
              duration,
              success: true,
              timestamp: new Date().toISOString()
            });
          }
        });

        schema.post(operation, function(error) {
          if (error && self.enabled && this._startTime) {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - this._startTime) / 1000000;

            self.logOperation('mongodb', {
              operation: this._operation,
              model: this.model ? this.model.modelName : 'unknown',
              conditions: self.sanitizeQuery(this.getQuery ? this.getQuery() : {}),
              duration,
              success: false,
              error: {
                name: error.name,
                message: error.message,
                code: error.code
              },
              timestamp: new Date().toISOString()
            });

            self.logError('mongodb', error, {
              operation: this._operation,
              model: this.model ? this.model.modelName : 'unknown'
            });
          }
        });
      });

      // Hook into save operations
      schema.pre('save', function() {
        this._saveStartTime = process.hrtime.bigint();
      });

      schema.post('save', function(doc) {
        if (self.enabled && this._saveStartTime) {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - this._saveStartTime) / 1000000;

          self.logOperation('mongodb', {
            operation: 'save',
            model: this.constructor.modelName,
            duration,
            success: true,
            timestamp: new Date().toISOString()
          });
        }
      });

      schema.post('save', function(error, doc, next) {
        if (error && self.enabled && this._saveStartTime) {
          const endTime = process.hrtime.bigint();
          const duration = Number(endTime - this._saveStartTime) / 1000000;

          self.logOperation('mongodb', {
            operation: 'save',
            model: this.constructor.modelName,
            duration,
            success: false,
            error: {
              name: error.name,
              message: error.message,
              code: error.code
            },
            timestamp: new Date().toISOString()
          });

          self.logError('mongodb', error, {
            operation: 'save',
            model: this.constructor.modelName
          });
        }
        next();
      });
    });

    // Monitor connection events
    const db = mongoose.connection;

    db.on('error', (err) => {
      this.logError('mongodb', err, {
        operation: 'connection',
        context: 'MongoDB connection error'
      });
    });

    db.on('disconnected', () => {
      this.logOperation('mongodb', {
        operation: 'disconnected',
        success: false,
        timestamp: new Date().toISOString()
      });
    });

    db.on('reconnected', () => {
      this.logOperation('mongodb', {
        operation: 'reconnected',
        success: true,
        timestamp: new Date().toISOString()
      });
    });
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

    console.log('✅ ZeroDB monitoring configured');
  }

  /**
   * Log database operation
   * @param {string} database - 'mongodb' or 'zerodb'
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
      const status = logEntry.success ? '✓' : '✗';
      const duration = logEntry.duration ? `${logEntry.duration.toFixed(2)}ms` : 'N/A';
      console.log(`[DB Monitor] ${status} ${database.toUpperCase()}: ${logEntry.operation} (${duration})`);
    }
  }

  /**
   * Log database error with context
   * @param {string} database - 'mongodb' or 'zerodb'
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
    ['mongodb', 'zerodb'].forEach(db => {
      const operations = this.metrics[db].operations.filter(op => op.duration);

      if (operations.length === 0) {
        this.currentMetrics[db] = { avg: 0, p95: 0, p99: 0, errorRate: 0 };
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

      this.currentMetrics[db] = {
        avg: parseFloat(avg.toFixed(2)),
        p95: parseFloat(p95.toFixed(2)),
        p99: parseFloat(p99.toFixed(2)),
        errorRate: parseFloat(errorRate.toFixed(2))
      };
    });
  }

  /**
   * Get current metrics for both databases
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    this.calculateMetrics();

    return {
      mongodb: {
        ...this.currentMetrics.mongodb,
        totalOperations: this.metrics.mongodb.totalOps,
        totalErrors: this.metrics.mongodb.totalErrors,
        recentOperations: this.metrics.mongodb.operations.length,
        recentErrors: this.metrics.mongodb.errors.length
      },
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
   * Get recent operations for a database
   * @param {string} database - 'mongodb' or 'zerodb'
   * @param {number} limit - Number of operations to return
   * @returns {Array} Recent operations
   */
  getRecentOperations(database, limit = 50) {
    return this.metrics[database].operations.slice(-limit);
  }

  /**
   * Get recent errors for a database
   * @param {string} database - 'mongodb' or 'zerodb'
   * @param {number} limit - Number of errors to return
   * @returns {Array} Recent errors
   */
  getRecentErrors(database, limit = 50) {
    return this.metrics[database].errors.slice(-limit);
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
