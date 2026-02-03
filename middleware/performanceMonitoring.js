/**
 * PerformanceMonitoring Middleware
 *
 * Comprehensive performance monitoring middleware for tracking response times,
 * throughput metrics, error rates, and generating Prometheus-compatible metrics.
 */

const EventEmitter = require('events');

class PerformanceMonitoring extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      slowThreshold: config.slowThreshold || 1000, // 1 second
      enableHistogram: config.enableHistogram !== false,
      buckets: config.buckets || [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      maxDataPoints: config.maxDataPoints || 10000,
      ...config
    };

    // Endpoint metrics storage
    this.endpoints = new Map();

    // Global metrics
    this.globalMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      activeRequests: 0,
      startTime: Date.now()
    };

    // Slow requests log
    this.slowRequests = [];

    // Request tracking
    this.activeRequestMap = new Map();
  }

  /**
   * Create Express middleware function
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      const startTime = process.hrtime.bigint();
      req._startTime = Number(startTime) / 1e6; // Convert to milliseconds
      req._perfTrackingId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Track active requests
      this.globalMetrics.activeRequests++;
      this.activeRequestMap.set(req._perfTrackingId, {
        startTime: req._startTime,
        url: req.url || req.originalUrl,
        method: req.method
      });

      // Listen for response finish
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime) / 1e6 - req._startTime;

        this.recordMetrics(req, res, duration);

        // Decrement active requests
        this.globalMetrics.activeRequests--;
        this.activeRequestMap.delete(req._perfTrackingId);
      });

      next();
    };
  }

  /**
   * Record metrics for a completed request
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {number} duration - Request duration in ms
   */
  recordMetrics(req, res, duration) {
    const endpoint = this.getEndpointKey(req);
    const method = req.method;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;

    // Initialize endpoint if not exists
    if (!this.endpoints.has(endpoint)) {
      this.endpoints.set(endpoint, {});
    }
    const endpointData = this.endpoints.get(endpoint);

    if (!endpointData[method]) {
      endpointData[method] = this.createEndpointMetrics();
    }

    const metrics = endpointData[method];

    // Update metrics
    metrics.requestCount++;
    metrics.responseTimes.push(duration);
    metrics.lastRequestTime = Date.now();

    // Maintain max data points
    if (metrics.responseTimes.length > this.config.maxDataPoints) {
      metrics.responseTimes.shift();
    }

    // Update min/max
    if (duration < metrics.minResponseTime || metrics.minResponseTime === 0) {
      metrics.minResponseTime = duration;
    }
    if (duration > metrics.maxResponseTime) {
      metrics.maxResponseTime = duration;
    }

    // Track errors
    if (isError) {
      metrics.errorCount++;
      const statusCategory = statusCode >= 500 ? '5xx' : '4xx';
      metrics.errorsByStatus[statusCategory] = (metrics.errorsByStatus[statusCategory] || 0) + 1;

      this.emit('errorResponse', {
        endpoint,
        method,
        statusCode,
        duration
      });
    }

    // Update global metrics
    this.globalMetrics.totalRequests++;
    if (isError) {
      this.globalMetrics.totalErrors++;
    }

    // Track slow requests
    if (duration > this.config.slowThreshold) {
      this.slowRequests.push({
        endpoint,
        method,
        duration,
        statusCode,
        timestamp: Date.now()
      });

      // Limit slow requests storage
      if (this.slowRequests.length > 100) {
        this.slowRequests.shift();
      }

      this.emit('slowRequest', {
        endpoint,
        method,
        duration,
        threshold: this.config.slowThreshold
      });
    }

    // Update histogram if enabled
    if (this.config.enableHistogram) {
      this.updateHistogram(metrics, duration);
    }
  }

  /**
   * Create initial endpoint metrics object
   * @returns {Object} Initial metrics object
   */
  createEndpointMetrics() {
    return {
      requestCount: 0,
      errorCount: 0,
      responseTimes: [],
      minResponseTime: 0,
      maxResponseTime: 0,
      lastRequestTime: null,
      errorsByStatus: {},
      histogram: this.config.buckets.reduce((acc, bucket) => {
        acc[bucket] = 0;
        return acc;
      }, { '+Inf': 0 })
    };
  }

  /**
   * Update histogram buckets
   * @param {Object} metrics - Endpoint metrics
   * @param {number} duration - Request duration
   */
  updateHistogram(metrics, duration) {
    for (const bucket of this.config.buckets) {
      if (duration <= bucket) {
        metrics.histogram[bucket]++;
      }
    }
    metrics.histogram['+Inf']++;
  }

  /**
   * Get endpoint key from request
   * @param {Object} req - Express request
   * @returns {string} Endpoint key
   */
  getEndpointKey(req) {
    // Use route path if available (for parameterized routes)
    if (req.route && req.route.path) {
      const base = req.baseUrl || '';
      return `${base}${req.route.path}`;
    }
    return req.url || req.originalUrl || '/';
  }

  /**
   * Get metrics for specific endpoint
   * @param {string} endpoint - Endpoint path
   * @param {string} method - HTTP method
   * @returns {Object|null} Endpoint metrics
   */
  getEndpointMetrics(endpoint, method) {
    const endpointData = this.endpoints.get(endpoint);
    if (!endpointData || !endpointData[method]) {
      return null;
    }

    const metrics = endpointData[method];
    const responseTimes = metrics.responseTimes;

    return {
      requestCount: metrics.requestCount,
      errorCount: metrics.errorCount,
      avgResponseTime: this.calculateAverage(responseTimes),
      minResponseTime: metrics.minResponseTime,
      maxResponseTime: metrics.maxResponseTime,
      p50: this.calculatePercentile(responseTimes, 50),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99),
      errorRate: metrics.requestCount > 0
        ? (metrics.errorCount / metrics.requestCount) * 100
        : 0
    };
  }

  /**
   * Get all metrics
   * @param {Object} options - Options
   * @returns {Object} All metrics
   */
  getMetrics(options = {}) {
    const endpoints = {};

    for (const [endpoint, methods] of this.endpoints) {
      endpoints[endpoint] = {};
      for (const [method, metrics] of Object.entries(methods)) {
        endpoints[endpoint][method] = this.getEndpointMetrics(endpoint, method);
      }
    }

    return {
      endpoints,
      throughput: this.getThroughput(),
      errors: this.getErrorStats(),
      timestamp: Date.now()
    };
  }

  /**
   * Get throughput metrics
   * @returns {Object} Throughput metrics
   */
  getThroughput() {
    const now = Date.now();
    const uptimeSeconds = (now - this.globalMetrics.startTime) / 1000;
    const uptimeMinutes = uptimeSeconds / 60;

    return {
      requestsPerSecond: uptimeSeconds > 0
        ? this.globalMetrics.totalRequests / uptimeSeconds
        : 0,
      requestsPerMinute: uptimeMinutes > 0
        ? this.globalMetrics.totalRequests / uptimeMinutes
        : 0,
      totalRequests: this.globalMetrics.totalRequests
    };
  }

  /**
   * Get throughput by endpoint
   * @returns {Object} Throughput by endpoint
   */
  getThroughputByEndpoint() {
    const throughput = {};
    const now = Date.now();
    const uptimeSeconds = (now - this.globalMetrics.startTime) / 1000;

    for (const [endpoint, methods] of this.endpoints) {
      let totalRequests = 0;
      for (const method of Object.values(methods)) {
        totalRequests += method.requestCount;
      }
      throughput[endpoint] = uptimeSeconds > 0
        ? totalRequests / uptimeSeconds
        : 0;
    }

    return throughput;
  }

  /**
   * Get error rate
   * @returns {Object} Error rate metrics
   */
  getErrorRate() {
    return {
      total: this.globalMetrics.totalRequests > 0
        ? (this.globalMetrics.totalErrors / this.globalMetrics.totalRequests) * 100
        : 0,
      totalErrors: this.globalMetrics.totalErrors,
      totalRequests: this.globalMetrics.totalRequests
    };
  }

  /**
   * Get error rate by endpoint
   * @returns {Object} Error rate by endpoint
   */
  getErrorRateByEndpoint() {
    const errorRates = {};

    for (const [endpoint, methods] of this.endpoints) {
      let totalRequests = 0;
      let totalErrors = 0;

      for (const method of Object.values(methods)) {
        totalRequests += method.requestCount;
        totalErrors += method.errorCount;
      }

      errorRates[endpoint] = totalRequests > 0
        ? (totalErrors / totalRequests) * 100
        : 0;
    }

    return errorRates;
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const byStatusCode = { '4xx': 0, '5xx': 0 };

    for (const methods of this.endpoints.values()) {
      for (const method of Object.values(methods)) {
        byStatusCode['4xx'] += method.errorsByStatus['4xx'] || 0;
        byStatusCode['5xx'] += method.errorsByStatus['5xx'] || 0;
      }
    }

    return {
      total: this.globalMetrics.totalErrors,
      rate: this.getErrorRate().total,
      byStatusCode
    };
  }

  /**
   * Get slow requests
   * @returns {Array} Slow requests
   */
  getSlowRequests() {
    return [...this.slowRequests];
  }

  /**
   * Get histogram for endpoint
   * @param {string} endpoint - Endpoint path
   * @param {string} method - HTTP method
   * @returns {Object|null} Histogram data
   */
  getHistogram(endpoint, method) {
    const endpointData = this.endpoints.get(endpoint);
    if (!endpointData || !endpointData[method]) {
      return null;
    }

    return {
      buckets: { ...endpointData[method].histogram },
      config: this.config.buckets
    };
  }

  /**
   * Get active request count
   * @returns {number} Active request count
   */
  getActiveRequestCount() {
    return this.globalMetrics.activeRequests;
  }

  /**
   * Get metrics for monitoring dashboard
   * @returns {Object} Dashboard-compatible metrics
   */
  getDashboardMetrics() {
    let totalResponseTime = 0;
    let totalResponses = 0;

    for (const methods of this.endpoints.values()) {
      for (const method of Object.values(methods)) {
        totalResponseTime += method.responseTimes.reduce((a, b) => a + b, 0);
        totalResponses += method.responseTimes.length;
      }
    }

    return {
      http: {
        requestsTotal: this.globalMetrics.totalRequests,
        avgResponseTime: totalResponses > 0 ? totalResponseTime / totalResponses : 0,
        errorRate: this.getErrorRate().total,
        activeRequests: this.globalMetrics.activeRequests
      }
    };
  }

  /**
   * Get Prometheus-formatted metrics
   * @returns {string} Prometheus metrics
   */
  getPrometheusMetrics() {
    let output = '';

    // Request duration histogram
    output += '# HELP http_request_duration_seconds HTTP request duration in seconds\n';
    output += '# TYPE http_request_duration_seconds histogram\n';

    for (const [endpoint, methods] of this.endpoints) {
      for (const [method, metrics] of Object.entries(methods)) {
        const sanitizedEndpoint = endpoint.replace(/"/g, '\\"');

        // Histogram buckets
        for (const [bucket, count] of Object.entries(metrics.histogram)) {
          const bucketValue = bucket === '+Inf' ? '+Inf' : (Number(bucket) / 1000).toFixed(3);
          output += `http_request_duration_seconds_bucket{method="${method}",endpoint="${sanitizedEndpoint}",le="${bucketValue}"} ${count}\n`;
        }

        // Sum and count
        const sum = metrics.responseTimes.reduce((a, b) => a + b, 0) / 1000;
        output += `http_request_duration_seconds_sum{method="${method}",endpoint="${sanitizedEndpoint}"} ${sum.toFixed(3)}\n`;
        output += `http_request_duration_seconds_count{method="${method}",endpoint="${sanitizedEndpoint}"} ${metrics.requestCount}\n`;
      }
    }

    // Total requests counter
    output += '\n# HELP http_requests_total Total HTTP requests\n';
    output += '# TYPE http_requests_total counter\n';
    output += `http_requests_total ${this.globalMetrics.totalRequests}\n`;

    // Error counter
    output += '\n# HELP http_errors_total Total HTTP errors\n';
    output += '# TYPE http_errors_total counter\n';
    output += `http_errors_total ${this.globalMetrics.totalErrors}\n`;

    // Active requests gauge
    output += '\n# HELP http_requests_active Current active HTTP requests\n';
    output += '# TYPE http_requests_active gauge\n';
    output += `http_requests_active ${this.globalMetrics.activeRequests}\n`;

    return output;
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.endpoints.clear();
    this.slowRequests = [];
    this.globalMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      activeRequests: 0,
      startTime: Date.now()
    };
    this.activeRequestMap.clear();
  }

  /**
   * Calculate average of array
   * @param {Array} values - Array of numbers
   * @returns {number} Average
   */
  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile
   * @param {Array} values - Array of numbers
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sorted[lower];

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

// Export singleton instance
const performanceMonitoring = new PerformanceMonitoring();

module.exports = PerformanceMonitoring;
module.exports.performanceMonitoring = performanceMonitoring;
