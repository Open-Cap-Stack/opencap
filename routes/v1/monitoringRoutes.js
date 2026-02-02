/**
 * Monitoring Routes
 *
 * API endpoints for ZeroDB post-migration monitoring
 * Provides metrics, health checks, alerts, and performance optimization data
 */

const express = require('express');
const router = express.Router();

// Monitoring services will be injected by app.js
let monitoringDashboard;
let alertService;
let performanceOptimizer;

/**
 * Initialize monitoring routes with service instances
 */
function initializeMonitoring(services) {
  monitoringDashboard = services.monitoringDashboard;
  alertService = services.alertService;
  performanceOptimizer = services.performanceOptimizer;
}

/**
 * GET /api/v1/monitoring/health
 * Get overall system health status
 */
router.get('/health', (req, res) => {
  try {
    const health = monitoringDashboard.getHealthStatus();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/metrics/zerodb
 * Get current ZeroDB metrics
 */
router.get('/metrics/zerodb', (req, res) => {
  try {
    const metrics = monitoringDashboard.getZeroDBMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/metrics/sync
 * Get sync metrics (MongoDB <-> ZeroDB)
 */
router.get('/metrics/sync', (req, res) => {
  try {
    const metrics = monitoringDashboard.getSyncMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/metrics/system
 * Get system resource metrics
 */
router.get('/metrics/system', (req, res) => {
  try {
    const metrics = monitoringDashboard.getSystemMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/summary
 * Get comprehensive monitoring summary
 */
router.get('/summary', (req, res) => {
  try {
    const summary = monitoringDashboard.getSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/metrics/prometheus
 * Get Prometheus-compatible metrics
 */
router.get('/metrics/prometheus', (req, res) => {
  try {
    const prometheusText = monitoringDashboard.getPrometheusMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(prometheusText);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/metrics/timeseries/:metricPath
 * Get time series data for a specific metric
 */
router.get('/metrics/timeseries/:metricPath', (req, res) => {
  try {
    const { metricPath } = req.params;
    const timeRange = parseInt(req.query.timeRange) || 3600000; // Default 1 hour

    const timeSeries = monitoringDashboard.getTimeSeries(metricPath, timeRange);
    res.json({
      success: true,
      data: {
        metricPath,
        timeRange,
        dataPoints: timeSeries
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/alerts
 * Get active alerts
 */
router.get('/alerts', (req, res) => {
  try {
    const activeAlerts = alertService.getActiveAlerts();
    res.json({
      success: true,
      data: {
        count: activeAlerts.length,
        alerts: activeAlerts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/alerts/history
 * Get alert history
 */
router.get('/alerts/history', (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 86400000; // Default 24 hours
    const history = alertService.getAlertHistory(timeRange);
    res.json({
      success: true,
      data: {
        timeRange,
        count: history.length,
        alerts: history
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/monitoring/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({
        success: false,
        error: 'acknowledgedBy is required'
      });
    }

    alertService.acknowledgeAlert(alertId, acknowledgedBy);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/alerts/statistics
 * Get alert statistics
 */
router.get('/alerts/statistics', (req, res) => {
  try {
    const stats = alertService.getStatistics();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/performance/slow-queries
 * Analyze slow queries
 */
router.get('/performance/slow-queries', (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold) || 1000;
    const analysis = performanceOptimizer.analyzeSlowQueries(threshold);
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/performance/index-recommendations
 * Get index recommendations
 */
router.get('/performance/index-recommendations', (req, res) => {
  try {
    const recommendations = performanceOptimizer.recommendIndexes();
    res.json({
      success: true,
      data: {
        count: recommendations.length,
        recommendations
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/performance/batch-optimization
 * Get batch size optimization recommendations
 */
router.get('/performance/batch-optimization', (req, res) => {
  try {
    const optimization = performanceOptimizer.optimizeBatchSize();
    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/performance/connection-pool
 * Analyze connection pool usage
 */
router.get('/performance/connection-pool', (req, res) => {
  try {
    const analysis = performanceOptimizer.analyzeConnectionPool();
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/performance/caching-strategy
 * Get caching strategy recommendations
 */
router.get('/performance/caching-strategy', (req, res) => {
  try {
    const strategy = performanceOptimizer.suggestCachingStrategy();
    res.json({
      success: true,
      data: strategy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/performance/query-distribution
 * Get query distribution analysis
 */
router.get('/performance/query-distribution', (req, res) => {
  try {
    const distribution = performanceOptimizer.analyzeQueryDistribution();
    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/monitoring/performance/report
 * Generate comprehensive optimization report
 */
router.get('/performance/report', (req, res) => {
  try {
    const report = performanceOptimizer.generateOptimizationReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/monitoring/performance/export
 * Export performance data
 */
router.post('/performance/export', (req, res) => {
  try {
    const format = req.query.format || 'json';
    const data = performanceOptimizer.exportData(format);

    if (format === 'json') {
      res.set('Content-Type', 'application/json');
      res.set('Content-Disposition', `attachment; filename="performance-data-${Date.now()}.json"`);
      res.send(data);
    } else {
      res.json({
        success: true,
        data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = { router, initializeMonitoring };
