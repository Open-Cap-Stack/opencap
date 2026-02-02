/**
 * Monitoring Controller
 * GitHub Issue #37: Post-migration monitoring and optimization
 *
 * Provides API endpoints for monitoring ZeroDB operations.
 */

const monitoringService = require('../services/zerodbMonitoringService');

/**
 * Get ZeroDB health status
 * GET /api/v1/monitoring/health
 */
const getHealth = async (req, res) => {
    try {
        const health = monitoringService.getHealth();
        const statusCode = health.status === 'HEALTHY' ? 200 :
                          health.status === 'DEGRADED' ? 200 : 503;

        res.status(statusCode).json(health);
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            error: error.message
        });
    }
};

/**
 * Get comprehensive metrics
 * GET /api/v1/monitoring/metrics
 */
const getMetrics = async (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        res.json(metrics);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve metrics',
            message: error.message
        });
    }
};

/**
 * Get Prometheus-compatible metrics
 * GET /api/v1/monitoring/metrics/prometheus
 */
const getPrometheusMetrics = async (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        const lines = [];

        // Query metrics
        lines.push('# HELP zerodb_queries_total Total number of ZeroDB queries');
        lines.push('# TYPE zerodb_queries_total counter');
        lines.push(`zerodb_queries_total{status="success"} ${metrics.queries.successful}`);
        lines.push(`zerodb_queries_total{status="failed"} ${metrics.queries.failed}`);

        // Latency metrics
        lines.push('# HELP zerodb_query_latency_milliseconds Query latency in milliseconds');
        lines.push('# TYPE zerodb_query_latency_milliseconds gauge');
        lines.push(`zerodb_query_latency_milliseconds{quantile="0.5"} ${parseFloat(metrics.latency.p50)}`);
        lines.push(`zerodb_query_latency_milliseconds{quantile="0.95"} ${parseFloat(metrics.latency.p95)}`);
        lines.push(`zerodb_query_latency_milliseconds{quantile="0.99"} ${parseFloat(metrics.latency.p99)}`);

        // Operation metrics
        lines.push('# HELP zerodb_operations_total Total operations by type');
        lines.push('# TYPE zerodb_operations_total counter');
        Object.entries(metrics.operations).forEach(([op, data]) => {
            lines.push(`zerodb_operations_total{operation="${op}"} ${data.count}`);
        });

        // Error metrics
        lines.push('# HELP zerodb_errors_total Total number of errors');
        lines.push('# TYPE zerodb_errors_total counter');
        lines.push(`zerodb_errors_total ${metrics.errors.total}`);

        // Rate limit metrics
        lines.push('# HELP zerodb_rate_limit_utilization Rate limit utilization percentage');
        lines.push('# TYPE zerodb_rate_limit_utilization gauge');
        lines.push(`zerodb_rate_limit_utilization ${metrics.rateLimit.utilizationPercent}`);

        res.set('Content-Type', 'text/plain');
        res.send(lines.join('\n'));
    } catch (error) {
        res.status(500).json({
            error: 'Failed to generate Prometheus metrics',
            message: error.message
        });
    }
};

/**
 * Get recent errors
 * GET /api/v1/monitoring/errors
 */
const getErrors = async (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        res.json({
            total: metrics.errors.total,
            byType: metrics.errors.byType,
            recent: monitoringService.metrics.errors.recent
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve errors',
            message: error.message
        });
    }
};

/**
 * Reset metrics (admin only)
 * POST /api/v1/monitoring/reset
 */
const resetMetrics = async (req, res) => {
    try {
        monitoringService.reset();
        res.json({
            success: true,
            message: 'Metrics reset successfully'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to reset metrics',
            message: error.message
        });
    }
};

/**
 * Update alert thresholds (admin only)
 * PUT /api/v1/monitoring/thresholds
 */
const updateThresholds = async (req, res) => {
    try {
        const { queryLatencyP95Ms, errorRatePercent, rateLimitUtilizationPercent, consecutiveErrors } = req.body;

        const thresholds = {};
        if (queryLatencyP95Ms !== undefined) thresholds.queryLatencyP95Ms = queryLatencyP95Ms;
        if (errorRatePercent !== undefined) thresholds.errorRatePercent = errorRatePercent;
        if (rateLimitUtilizationPercent !== undefined) thresholds.rateLimitUtilizationPercent = rateLimitUtilizationPercent;
        if (consecutiveErrors !== undefined) thresholds.consecutiveErrors = consecutiveErrors;

        monitoringService.setAlertThresholds(thresholds);

        res.json({
            success: true,
            thresholds: monitoringService.alertThresholds
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to update thresholds',
            message: error.message
        });
    }
};

module.exports = {
    getHealth,
    getMetrics,
    getPrometheusMetrics,
    getErrors,
    resetMetrics,
    updateThresholds
};
