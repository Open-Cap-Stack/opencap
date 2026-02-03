/**
 * API Metrics Service
 * Issue #48: Implement API Rate Limiting and Response Optimization
 *
 * Provides comprehensive API metrics tracking including response times,
 * percentile calculations, error rates, and performance report generation.
 */

/**
 * API Metrics Service
 * Tracks and analyzes API performance metrics
 */
class ApiMetricsService {
  /**
   * Create a new API Metrics Service
   * @param {Object} options - Configuration options
   * @param {number} options.maxSamplesPerEndpoint - Max response times to store (default: 1000)
   * @param {number} options.retentionPeriodMs - Data retention period in ms (default: 1 hour)
   */
  constructor(options = {}) {
    this.config = {
      maxSamplesPerEndpoint: options.maxSamplesPerEndpoint || 1000,
      retentionPeriodMs: options.retentionPeriodMs || 60 * 60 * 1000 // 1 hour
    };

    this.endpoints = new Map();
  }

  /**
   * Get or create endpoint metrics
   * @param {string} endpoint - Endpoint path
   * @param {string} method - HTTP method (optional)
   * @returns {Object} Endpoint metrics object
   */
  getOrCreateEndpoint(endpoint, method = null) {
    const key = method ? `${method}:${endpoint}` : endpoint;

    if (!this.endpoints.has(key)) {
      this.endpoints.set(key, {
        endpoint,
        method,
        responseTimes: [],
        requests: [],
        successCount: 0,
        errorCount: 0,
        clientErrors: 0,
        serverErrors: 0,
        errorsByStatus: {},
        createdAt: Date.now()
      });
    }

    return this.endpoints.get(key);
  }

  /**
   * Record response time for an endpoint
   * @param {string} endpoint - Endpoint path
   * @param {number} responseTime - Response time in milliseconds
   * @param {Object} options - Additional options { method }
   */
  recordResponseTime(endpoint, responseTime, options = {}) {
    const metrics = this.getOrCreateEndpoint(endpoint, options.method);

    // Add response time, keeping within max samples
    metrics.responseTimes.push({
      time: responseTime,
      timestamp: Date.now()
    });

    // Trim if over max samples
    if (metrics.responseTimes.length > this.config.maxSamplesPerEndpoint) {
      metrics.responseTimes.shift();
    }
  }

  /**
   * Record a request for an endpoint
   * @param {string} endpoint - Endpoint path
   * @param {Object} options - Request options { statusCode, method, timestamp }
   */
  recordRequest(endpoint, options = {}) {
    const { statusCode = 200, method = null, timestamp = Date.now() } = options;
    const metrics = this.getOrCreateEndpoint(endpoint, method);

    // Record request
    metrics.requests.push({ statusCode, timestamp });

    // Trim if over max samples
    if (metrics.requests.length > this.config.maxSamplesPerEndpoint) {
      metrics.requests.shift();
    }

    // Update success/error counts
    if (statusCode >= 200 && statusCode < 400) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;

      // Track by status code
      metrics.errorsByStatus[statusCode] = (metrics.errorsByStatus[statusCode] || 0) + 1;

      // Categorize error type
      if (statusCode >= 400 && statusCode < 500) {
        metrics.clientErrors++;
      } else if (statusCode >= 500) {
        metrics.serverErrors++;
      }
    }
  }

  /**
   * Get metrics for an endpoint
   * @param {string} endpoint - Endpoint path
   * @param {Object} options - Options { method }
   * @returns {Object} Endpoint metrics
   */
  getEndpointMetrics(endpoint, options = {}) {
    const metrics = this.getOrCreateEndpoint(endpoint, options.method);

    const times = metrics.responseTimes.map(r => r.time);
    const totalRequests = metrics.successCount + metrics.errorCount;

    // Calculate statistics
    const average = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;

    const min = times.length > 0 ? Math.min(...times) : 0;
    const max = times.length > 0 ? Math.max(...times) : 0;

    return {
      endpoint,
      method: options.method || null,
      responseTimes: times,
      average: Math.round(average * 100) / 100,
      min,
      max,
      count: times.length,
      totalRequests,
      successCount: metrics.successCount,
      errorCount: metrics.errorCount,
      clientErrors: metrics.clientErrors,
      serverErrors: metrics.serverErrors,
      errorsByStatus: { ...metrics.errorsByStatus },
      errorRate: totalRequests > 0 ? metrics.errorCount / totalRequests : 0,
      percentiles: {
        p50: this.calculatePercentile(times, 50),
        p95: this.calculatePercentile(times, 95),
        p99: this.calculatePercentile(times, 99)
      }
    };
  }

  /**
   * Calculate percentile from an array of values
   * @param {number[]} values - Array of values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Math.floor(index) === index) {
      return sorted[index];
    }

    // Interpolate between two values
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  /**
   * Get percentile for an endpoint
   * @param {string} endpoint - Endpoint path
   * @param {number} percentile - Percentile to calculate
   * @returns {number} Percentile value
   */
  getPercentile(endpoint, percentile) {
    const metrics = this.getOrCreateEndpoint(endpoint);
    const times = metrics.responseTimes.map(r => r.time);
    return this.calculatePercentile(times, percentile);
  }

  /**
   * Get requests per minute for an endpoint
   * @param {string} endpoint - Endpoint path
   * @returns {number} Requests per minute
   */
  getRequestsPerMinute(endpoint) {
    const metrics = this.getOrCreateEndpoint(endpoint);
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const recentRequests = metrics.requests.filter(r => r.timestamp > oneMinuteAgo);
    return recentRequests.length;
  }

  /**
   * Get throughput for an endpoint
   * @param {string} endpoint - Endpoint path
   * @param {Object} options - Options { windowMs }
   * @returns {number} Requests per second
   */
  getThroughput(endpoint, options = {}) {
    const { windowMs = 60000 } = options;
    const metrics = this.getOrCreateEndpoint(endpoint);
    const now = Date.now();
    const windowStart = now - windowMs;

    const recentRequests = metrics.requests.filter(r => r.timestamp > windowStart);
    return (recentRequests.length / windowMs) * 1000; // Convert to per-second
  }

  /**
   * Get response time histogram for an endpoint
   * @param {string} endpoint - Endpoint path
   * @param {Object} options - Options { buckets }
   * @returns {Object} Histogram data
   */
  getResponseTimeHistogram(endpoint, options = {}) {
    const metrics = this.getOrCreateEndpoint(endpoint);
    const times = metrics.responseTimes.map(r => r.time);
    const bucketBoundaries = options.buckets || [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

    const buckets = bucketBoundaries.map((boundary, index) => {
      const lowerBound = index === 0 ? 0 : bucketBoundaries[index - 1];
      const count = times.filter(t => t > lowerBound && t <= boundary).length;

      return {
        le: boundary,
        count,
        percentage: times.length > 0 ? (count / times.length) * 100 : 0
      };
    });

    // Add +Inf bucket
    const lastBoundary = bucketBoundaries[bucketBoundaries.length - 1];
    const infCount = times.filter(t => t > lastBoundary).length;
    buckets.push({
      le: '+Inf',
      count: infCount,
      percentage: times.length > 0 ? (infCount / times.length) * 100 : 0
    });

    return {
      buckets,
      totalSamples: times.length
    };
  }

  /**
   * Generate comprehensive performance report
   * @param {Object} options - Report options { startTime, endTime }
   * @returns {Object} Performance report
   */
  generateReport(options = {}) {
    const now = Date.now();
    const { startTime, endTime } = options;

    const endpoints = {};
    let totalRequests = 0;
    let totalErrors = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    const slowestEndpoints = [];
    const highestErrorRateEndpoints = [];

    for (const [key, metrics] of this.endpoints.entries()) {
      const endpointMetrics = this.getEndpointMetrics(metrics.endpoint, {
        method: metrics.method
      });

      endpoints[metrics.endpoint] = endpointMetrics;

      totalRequests += endpointMetrics.totalRequests;
      totalErrors += endpointMetrics.errorCount;

      if (endpointMetrics.count > 0) {
        totalResponseTime += endpointMetrics.average * endpointMetrics.count;
        responseTimeCount += endpointMetrics.count;
      }

      slowestEndpoints.push({
        endpoint: metrics.endpoint,
        average: endpointMetrics.average
      });

      highestErrorRateEndpoints.push({
        endpoint: metrics.endpoint,
        errorRate: endpointMetrics.errorRate
      });
    }

    // Sort and limit to top 10
    slowestEndpoints.sort((a, b) => b.average - a.average);
    highestErrorRateEndpoints.sort((a, b) => b.errorRate - a.errorRate);

    const report = {
      generatedAt: new Date(now).toISOString(),
      endpoints,
      summary: {
        totalEndpoints: this.endpoints.size,
        totalRequests,
        overallErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
        averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
        slowestEndpoints: slowestEndpoints.slice(0, 10),
        highestErrorRateEndpoints: highestErrorRateEndpoints.slice(0, 10)
      }
    };

    if (startTime || endTime) {
      report.timeRange = {
        start: startTime,
        end: endTime
      };
    }

    return report;
  }

  /**
   * Create Express middleware for automatic metrics tracking
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const endpoint = req.originalUrl || req.path;
      const method = req.method;

      // Hook into response finish event
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;

        this.recordResponseTime(endpoint, responseTime, { method });
        this.recordRequest(endpoint, {
          statusCode: res.statusCode,
          method,
          timestamp: Date.now()
        });
      });

      next();
    };
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.endpoints.clear();
  }

  /**
   * Clear metrics for a specific endpoint
   * @param {string} endpoint - Endpoint path
   */
  clearEndpoint(endpoint) {
    for (const [key, metrics] of this.endpoints.entries()) {
      if (metrics.endpoint === endpoint) {
        this.endpoints.delete(key);
      }
    }
  }
}

module.exports = ApiMetricsService;
