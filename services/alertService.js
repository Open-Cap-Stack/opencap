/**
 * AlertService
 *
 * Monitoring alert system with threshold-based alerting
 * Supports alert deduplication, severity levels, and notification delivery
 */

const crypto = require('crypto');

class AlertService {
  constructor(monitoringDashboard, config = {}) {
    this.monitoringDashboard = monitoringDashboard;

    this.thresholds = {
      syncLag: config.thresholds?.syncLag || 5000, // 5 seconds
      errorRate: config.thresholds?.errorRate || 1, // 1%
      dlqSize: config.thresholds?.dlqSize || 100,
      queryLatencyP99: config.thresholds?.queryLatencyP99 || 1000, // 1 second
      apiRateLimitWarning: config.thresholds?.apiRateLimitWarning || 80, // 80%
      ...config.thresholds
    };

    this.notificationHandler = config.notificationHandler || this.defaultNotificationHandler;
    this.cooldownPeriod = config.cooldownPeriod || 300000; // 5 minutes
    this.checkInterval = config.checkInterval || 30000; // 30 seconds

    this.alerts = new Map(); // alertId -> alert object
    this.alertHistory = [];
    this.lastAlertTime = new Map(); // alertType -> timestamp

    this.isRunning = false;
    this.checkTimer = null;
  }

  /**
   * Start alert monitoring
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    this.checkTimer = setInterval(() => {
      this.checkAll();
    }, this.checkInterval);

    console.log('AlertService started');
  }

  /**
   * Stop alert monitoring
   */
  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this.isRunning = false;
    console.log('AlertService stopped');
  }

  /**
   * Run all monitoring checks
   */
  checkAll() {
    this.checkSyncLag();
    this.checkErrorRate();
    this.checkDeadLetterQueue();
    this.checkCircuitBreaker();
    this.checkAPIRateLimit();
    this.checkQueryLatency();
    this.resolveAlertsIfNecessary();
  }

  /**
   * Check sync lag threshold
   */
  checkSyncLag() {
    const syncMetrics = this.monitoringDashboard.getSyncMetrics();
    const currentLag = syncMetrics.syncLag.current;

    if (currentLag > this.thresholds.syncLag) {
      const trend = this.calculateTrend(
        this.monitoringDashboard.syncMetrics.syncLag.slice(-10).map(s => s.lag)
      );

      this.triggerAlert({
        type: 'SYNC_LAG_HIGH',
        severity: 'WARNING',
        metric: 'syncLag',
        value: currentLag,
        threshold: this.thresholds.syncLag,
        trend,
        message: `Sync lag is ${currentLag}ms (threshold: ${this.thresholds.syncLag}ms)`,
        action: 'Check MongoDB Change Stream and ZeroDB sync service health'
      });
    } else {
      this.resolveAlert('SYNC_LAG_HIGH');
    }
  }

  /**
   * Check error rate threshold
   */
  checkErrorRate() {
    const zerodbMetrics = this.monitoringDashboard.getZeroDBMetrics();
    const errorRate = zerodbMetrics.errorRate;

    if (errorRate > this.thresholds.errorRate) {
      const severity = errorRate > 5 ? 'CRITICAL' : 'WARNING';

      this.triggerAlert({
        type: 'ERROR_RATE_HIGH',
        severity,
        metric: 'errorRate',
        value: errorRate,
        threshold: this.thresholds.errorRate,
        message: `ZeroDB error rate is ${errorRate.toFixed(2)}% (threshold: ${this.thresholds.errorRate}%)`,
        action: 'Review ZeroDB logs and recent failed operations'
      });
    } else {
      this.resolveAlert('ERROR_RATE_HIGH');
    }
  }

  /**
   * Check dead letter queue size
   */
  checkDeadLetterQueue() {
    const syncMetrics = this.monitoringDashboard.getSyncMetrics();
    const dlqSize = syncMetrics.deadLetterQueueSize;

    if (dlqSize > this.thresholds.dlqSize) {
      this.triggerAlert({
        type: 'DLQ_SIZE_HIGH',
        severity: 'CRITICAL',
        metric: 'deadLetterQueueSize',
        value: dlqSize,
        threshold: this.thresholds.dlqSize,
        message: `Dead letter queue size is ${dlqSize} (threshold: ${this.thresholds.dlqSize})`,
        action: 'Review failed events in DLQ and investigate root cause of failures'
      });
    } else {
      this.resolveAlert('DLQ_SIZE_HIGH');
    }
  }

  /**
   * Check circuit breaker status
   */
  checkCircuitBreaker() {
    const syncMetrics = this.monitoringDashboard.getSyncMetrics();
    const status = syncMetrics.circuitBreakerStatus;

    if (status === 'OPEN') {
      this.triggerAlert({
        type: 'CIRCUIT_BREAKER_OPEN',
        severity: 'CRITICAL',
        metric: 'circuitBreakerStatus',
        value: status,
        message: 'Circuit breaker is OPEN - sync operations are blocked',
        action: 'Investigate underlying service failures causing circuit breaker to trip'
      });
    } else if (status === 'HALF_OPEN') {
      this.triggerAlert({
        type: 'CIRCUIT_BREAKER_HALF_OPEN',
        severity: 'INFO',
        metric: 'circuitBreakerStatus',
        value: status,
        message: 'Circuit breaker is HALF_OPEN - testing service recovery',
        action: 'Monitor for successful recovery or re-trip'
      });
    } else {
      this.resolveAlert('CIRCUIT_BREAKER_OPEN');
      this.resolveAlert('CIRCUIT_BREAKER_HALF_OPEN');
    }
  }

  /**
   * Check API rate limit usage
   */
  checkAPIRateLimit() {
    const zerodbMetrics = this.monitoringDashboard.getZeroDBMetrics();
    const apiUsage = zerodbMetrics.apiTokenUsage;

    if (apiUsage.usagePercentage > this.thresholds.apiRateLimitWarning) {
      this.triggerAlert({
        type: 'API_RATE_LIMIT_HIGH',
        severity: 'WARNING',
        metric: 'apiRateLimitUsage',
        value: apiUsage.usagePercentage,
        threshold: this.thresholds.apiRateLimitWarning,
        message: `API rate limit usage is ${apiUsage.usagePercentage.toFixed(1)}% (${apiUsage.remaining}/${apiUsage.limit} remaining)`,
        action: 'Consider implementing request throttling or increasing rate limits'
      });
    } else {
      this.resolveAlert('API_RATE_LIMIT_HIGH');
    }
  }

  /**
   * Check query latency
   */
  checkQueryLatency() {
    const zerodbMetrics = this.monitoringDashboard.getZeroDBMetrics();
    const p99Latency = zerodbMetrics.queryLatency.p99;

    if (p99Latency > this.thresholds.queryLatencyP99) {
      this.triggerAlert({
        type: 'QUERY_LATENCY_HIGH',
        severity: 'WARNING',
        metric: 'queryLatency.p99',
        value: p99Latency,
        threshold: this.thresholds.queryLatencyP99,
        message: `P99 query latency is ${p99Latency.toFixed(0)}ms (threshold: ${this.thresholds.queryLatencyP99}ms)`,
        action: 'Review slow queries and consider performance optimization'
      });
    } else {
      this.resolveAlert('QUERY_LATENCY_HIGH');
    }
  }

  /**
   * Trigger an alert with deduplication
   */
  triggerAlert(alertData) {
    const alertType = alertData.type;

    // Check cooldown period to prevent alert spam
    const lastAlertTime = this.lastAlertTime.get(alertType);
    const now = Date.now();

    if (lastAlertTime && (now - lastAlertTime) < this.cooldownPeriod) {
      // Still in cooldown period, skip
      return;
    }

    // Check if alert already exists and is active
    const existingAlert = Array.from(this.alerts.values()).find(
      a => a.type === alertType && !a.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.value = alertData.value;
      existingAlert.lastUpdated = now;
      existingAlert.occurrences++;
      return;
    }

    // Create new alert
    const alert = {
      id: this.generateAlertId(),
      ...alertData,
      timestamp: now,
      lastUpdated: now,
      resolved: false,
      acknowledged: false,
      acknowledgedBy: null,
      acknowledgedAt: null,
      occurrences: 1
    };

    this.alerts.set(alert.id, alert);
    this.alertHistory.push({ ...alert });
    this.lastAlertTime.set(alertType, now);

    // Send notification
    this.notificationHandler(alert);
  }

  /**
   * Resolve an alert if it exists
   */
  resolveAlert(alertType) {
    const activeAlert = Array.from(this.alerts.values()).find(
      a => a.type === alertType && !a.resolved
    );

    if (activeAlert) {
      activeAlert.resolved = true;
      activeAlert.resolvedAt = Date.now();
      activeAlert.duration = activeAlert.resolvedAt - activeAlert.timestamp;

      // Add to history
      this.alertHistory.push({ ...activeAlert });

      // Remove from active alerts
      this.alerts.delete(activeAlert.id);
    }
  }

  /**
   * Resolve alerts based on current metrics
   */
  resolveAlertsIfNecessary() {
    // This is called by individual check methods
    // Keep for future use if needed
  }

  /**
   * Get all currently active alerts
   */
  getActiveAlerts() {
    const now = Date.now();
    return Array.from(this.alerts.values()).map(alert => ({
      ...alert,
      duration: now - alert.timestamp
    }));
  }

  /**
   * Get specific alert by ID
   */
  getAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.getAlert(alertId);

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = Date.now();
  }

  /**
   * Get alert history
   */
  getAlertHistory(timeRange = 86400000) {
    const cutoff = Date.now() - timeRange;
    return this.alertHistory.filter(a => a.timestamp >= cutoff);
  }

  /**
   * Get alert statistics
   */
  getStatistics() {
    const history = this.getAlertHistory();

    const totalAlerts = history.length;
    const acknowledgedAlerts = history.filter(a => a.acknowledged);
    const resolvedAlerts = history.filter(a => a.resolved);

    // Group by type
    const alertsByType = {};
    history.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    });

    // Group by severity
    const alertsBySeverity = {};
    history.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    });

    // Calculate MTTA (Mean Time To Acknowledge)
    const acknowledgedTimes = acknowledgedAlerts
      .filter(a => a.acknowledgedAt && a.timestamp)
      .map(a => a.acknowledgedAt - a.timestamp);
    const meanTimeToAcknowledge = acknowledgedTimes.length > 0
      ? acknowledgedTimes.reduce((sum, t) => sum + t, 0) / acknowledgedTimes.length
      : 0;

    // Calculate MTTR (Mean Time To Resolution)
    const resolutionTimes = resolvedAlerts
      .filter(a => a.duration)
      .map(a => a.duration);
    const meanTimeToResolution = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
      : 0;

    return {
      totalAlerts,
      activeAlerts: this.alerts.size,
      acknowledgedCount: acknowledgedAlerts.length,
      resolvedCount: resolvedAlerts.length,
      alertsByType,
      alertsBySeverity,
      meanTimeToAcknowledge,
      meanTimeToResolution
    };
  }

  /**
   * Calculate trend from values
   */
  calculateTrend(values) {
    if (!values || values.length < 2) return 'STABLE';

    const recent = values.slice(-5);
    const older = values.slice(-10, -5);

    if (older.length === 0) return 'STABLE';

    const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const olderAvg = older.reduce((sum, v) => sum + v, 0) / older.length;

    const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (changePercent > 10) return 'INCREASING';
    if (changePercent < -10) return 'DECREASING';
    return 'STABLE';
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Default notification handler (logs to console)
   */
  defaultNotificationHandler(alert) {
    const emoji = {
      CRITICAL: '🔴',
      WARNING: '🟡',
      INFO: '🔵'
    }[alert.severity] || '⚪';

    console.log(`${emoji} [ALERT] ${alert.severity}: ${alert.message}`);
    if (alert.action) {
      console.log(`   Action: ${alert.action}`);
    }
  }
}

module.exports = AlertService;
