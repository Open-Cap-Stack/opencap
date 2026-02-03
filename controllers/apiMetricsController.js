/**
 * API Metrics Controller
 * Issue #48: Implement API Rate Limiting and Response Optimization
 *
 * Provides endpoints for accessing API metrics, performance reports,
 * and health status based on metrics data.
 */

const ApiMetricsService = require('../services/apiMetricsService');

// Default metrics service instance
const defaultMetricsService = new ApiMetricsService();

/**
 * API Metrics Controller
 * Handles requests for API metrics and performance data
 */
class ApiMetricsController {
  /**
   * Create a new API Metrics Controller
   * @param {ApiMetricsService} metricsService - Metrics service instance
   */
  constructor(metricsService = defaultMetricsService) {
    this.metricsService = metricsService;

    // Bind methods to preserve context
    this.getDashboard = this.getDashboard.bind(this);
    this.getEndpointMetrics = this.getEndpointMetrics.bind(this);
    this.getPerformanceReport = this.getPerformanceReport.bind(this);
    this.getPercentiles = this.getPercentiles.bind(this);
    this.getErrorRates = this.getErrorRates.bind(this);
    this.getHistogram = this.getHistogram.bind(this);
    this.getThroughput = this.getThroughput.bind(this);
    this.resetMetrics = this.resetMetrics.bind(this);
    this.getSlowestEndpoints = this.getSlowestEndpoints.bind(this);
    this.getHealthStatus = this.getHealthStatus.bind(this);
  }

  /**
   * Get metrics dashboard data
   * GET /api/v1/metrics/dashboard
   */
  async getDashboard(req, res) {
    try {
      const options = {};

      if (req.query.startTime) {
        options.startTime = parseInt(req.query.startTime, 10);
      }
      if (req.query.endTime) {
        options.endTime = parseInt(req.query.endTime, 10);
      }

      const report = this.metricsService.generateReport(options);

      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error getting metrics dashboard:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get metrics for a specific endpoint
   * GET /api/v1/metrics/endpoints/:endpoint
   */
  async getEndpointMetrics(req, res) {
    try {
      const { endpoint } = req.params;

      if (!endpoint) {
        return res.status(400).json({
          success: false,
          error: 'Endpoint parameter is required'
        });
      }

      const decodedEndpoint = decodeURIComponent(endpoint);
      const options = {};

      if (req.query.method) {
        options.method = req.query.method;
      }

      const metrics = this.metricsService.getEndpointMetrics(decodedEndpoint, options);

      return res.status(200).json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error getting endpoint metrics:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get comprehensive performance report
   * GET /api/v1/metrics/report
   */
  async getPerformanceReport(req, res) {
    try {
      const options = {};

      if (req.query.startTime) {
        options.startTime = parseInt(req.query.startTime, 10);
      }
      if (req.query.endTime) {
        options.endTime = parseInt(req.query.endTime, 10);
      }

      const report = this.metricsService.generateReport(options);

      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error generating performance report:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get percentile data for an endpoint
   * GET /api/v1/metrics/endpoints/:endpoint/percentiles
   */
  async getPercentiles(req, res) {
    try {
      const { endpoint } = req.params;

      if (!endpoint) {
        return res.status(400).json({
          success: false,
          error: 'Endpoint parameter is required'
        });
      }

      const decodedEndpoint = decodeURIComponent(endpoint);

      // Parse custom percentiles from query
      const percentiles = req.query.percentiles
        ? req.query.percentiles.split(',').map(p => parseInt(p.trim(), 10))
        : [50, 95, 99];

      const data = {};
      percentiles.forEach(p => {
        data[`p${p}`] = this.metricsService.getPercentile(decodedEndpoint, p);
      });

      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error getting percentiles:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get error rates for all endpoints
   * GET /api/v1/metrics/errors
   */
  async getErrorRates(req, res) {
    try {
      const minErrorRate = req.query.minErrorRate
        ? parseFloat(req.query.minErrorRate)
        : 0;

      const report = this.metricsService.generateReport();
      const errorRates = {};

      for (const [endpoint, metrics] of Object.entries(report.endpoints)) {
        if (metrics.errorRate >= minErrorRate) {
          errorRates[endpoint] = {
            errorRate: metrics.errorRate,
            totalRequests: metrics.totalRequests,
            errorCount: metrics.errorCount,
            errorsByStatus: metrics.errorsByStatus
          };
        }
      }

      return res.status(200).json({
        success: true,
        data: errorRates
      });
    } catch (error) {
      console.error('Error getting error rates:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get response time histogram for an endpoint
   * GET /api/v1/metrics/endpoints/:endpoint/histogram
   */
  async getHistogram(req, res) {
    try {
      const { endpoint } = req.params;

      if (!endpoint) {
        return res.status(400).json({
          success: false,
          error: 'Endpoint parameter is required'
        });
      }

      const decodedEndpoint = decodeURIComponent(endpoint);
      const options = {};

      if (req.query.buckets) {
        options.buckets = req.query.buckets.split(',').map(b => parseInt(b.trim(), 10));
      }

      const histogram = this.metricsService.getResponseTimeHistogram(decodedEndpoint, options);

      return res.status(200).json({
        success: true,
        data: histogram
      });
    } catch (error) {
      console.error('Error getting histogram:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get throughput data
   * GET /api/v1/metrics/throughput
   */
  async getThroughput(req, res) {
    try {
      const options = {};

      if (req.query.windowMs) {
        options.windowMs = parseInt(req.query.windowMs, 10);
      }

      const report = this.metricsService.generateReport();
      const throughputData = {};

      for (const [endpoint] of Object.entries(report.endpoints)) {
        throughputData[endpoint] = this.metricsService.getThroughput(endpoint, options);
      }

      return res.status(200).json({
        success: true,
        data: throughputData
      });
    } catch (error) {
      console.error('Error getting throughput:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset metrics (admin only)
   * POST /api/v1/metrics/reset
   */
  async resetMetrics(req, res) {
    try {
      // Check admin role
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { endpoint } = req.body;

      if (endpoint) {
        this.metricsService.clearEndpoint(endpoint);
      } else {
        this.metricsService.reset();
      }

      return res.status(200).json({
        success: true,
        message: endpoint ? `Metrics cleared for ${endpoint}` : 'All metrics reset'
      });
    } catch (error) {
      console.error('Error resetting metrics:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get slowest endpoints
   * GET /api/v1/metrics/slowest
   */
  async getSlowestEndpoints(req, res) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;

      const report = this.metricsService.generateReport();
      const slowestEndpoints = report.summary.slowestEndpoints.slice(0, limit);

      return res.status(200).json({
        success: true,
        data: slowestEndpoints
      });
    } catch (error) {
      console.error('Error getting slowest endpoints:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get health status based on metrics
   * GET /api/v1/metrics/health
   */
  async getHealthStatus(req, res) {
    try {
      const report = this.metricsService.generateReport();
      const { overallErrorRate, averageResponseTime } = report.summary;

      // Determine health status
      let status = 'healthy';

      if (overallErrorRate > 0.2) {
        status = 'unhealthy';
      } else if (overallErrorRate > 0.05 || averageResponseTime > 1000) {
        status = 'degraded';
      }

      return res.status(200).json({
        success: true,
        data: {
          status,
          errorRate: overallErrorRate,
          averageResponseTime,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting health status:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

// Export controller instance and class
module.exports = ApiMetricsController;
module.exports.defaultMetricsService = defaultMetricsService;
