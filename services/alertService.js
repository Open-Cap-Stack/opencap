/**
 * AlertService
 *
 * Monitoring alert system with threshold-based alerting
 * Supports alert deduplication, severity levels, notification delivery,
 * alert routing, escalation policies, and webhook notifications.
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class AlertService extends EventEmitter {
  constructor(monitoringDashboard, config = {}) {
    super();

    this.monitoringDashboard = monitoringDashboard;

    this.thresholds = {
      syncLag: config.thresholds?.syncLag || 5000, // 5 seconds
      errorRate: config.thresholds?.errorRate || 1, // 1%
      dlqSize: config.thresholds?.dlqSize || 100,
      queryLatencyP99: config.thresholds?.queryLatencyP99 || 1000, // 1 second
      apiRateLimitWarning: config.thresholds?.apiRateLimitWarning || 80, // 80%
      httpErrorRate: config.thresholds?.httpErrorRate || 5, // 5%
      responseTime: config.thresholds?.responseTime || 2000, // 2 seconds
      memoryUsage: config.thresholds?.memoryUsage || 90, // 90%
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

    // Alert routing configuration
    this.routingRules = config.routingRules || [];

    // Escalation configuration
    this.escalationPolicies = config.escalationPolicies || {
      default: {
        levels: [
          { delay: 0, targets: ['oncall'] },
          { delay: 900000, targets: ['oncall', 'team-lead'] }, // 15 min
          { delay: 1800000, targets: ['oncall', 'team-lead', 'manager'] } // 30 min
        ]
      }
    };

    // Webhook configurations
    this.webhooks = config.webhooks || [];

    // Escalation timers
    this.escalationTimers = new Map();
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

  /**
   * Route alert to appropriate handlers based on rules
   * @param {Object} alert - Alert object
   * @returns {Array} List of targets to notify
   */
  routeAlert(alert) {
    const targets = [];

    for (const rule of this.routingRules) {
      let matches = true;

      // Check severity match
      if (rule.severity && rule.severity !== alert.severity) {
        matches = false;
      }

      // Check type match
      if (rule.type && rule.type !== alert.type) {
        matches = false;
      }

      // Check category match (using regex)
      if (rule.categoryPattern) {
        const pattern = new RegExp(rule.categoryPattern);
        if (!pattern.test(alert.type)) {
          matches = false;
        }
      }

      if (matches && rule.targets) {
        targets.push(...rule.targets);
      }
    }

    // Return unique targets or default
    return targets.length > 0 ? [...new Set(targets)] : ['default'];
  }

  /**
   * Add a routing rule
   * @param {Object} rule - Routing rule configuration
   */
  addRoutingRule(rule) {
    this.routingRules.push(rule);
  }

  /**
   * Remove a routing rule by index
   * @param {number} index - Index of rule to remove
   */
  removeRoutingRule(index) {
    this.routingRules.splice(index, 1);
  }

  /**
   * Start escalation for an alert
   * @param {Object} alert - Alert object
   * @param {string} policyName - Name of escalation policy to use
   */
  startEscalation(alert, policyName = 'default') {
    const policy = this.escalationPolicies[policyName];
    if (!policy) {
      console.warn(`Escalation policy not found: ${policyName}`);
      return;
    }

    // Clear existing escalation for this alert
    this.clearEscalation(alert.id);

    // Set up escalation timers
    const timers = [];
    policy.levels.forEach((level, index) => {
      const timer = setTimeout(() => {
        this.escalateAlert(alert, level, index);
      }, level.delay);
      timers.push(timer);
    });

    this.escalationTimers.set(alert.id, timers);

    // Update alert with escalation info
    alert.escalationPolicy = policyName;
    alert.escalationLevel = 0;
    alert.escalationTargets = policy.levels[0].targets;
  }

  /**
   * Escalate an alert to the next level
   * @param {Object} alert - Alert object
   * @param {Object} level - Escalation level configuration
   * @param {number} levelIndex - Current escalation level index
   */
  escalateAlert(alert, level, levelIndex) {
    const currentAlert = this.alerts.get(alert.id);
    if (!currentAlert || currentAlert.resolved || currentAlert.acknowledged) {
      return;
    }

    currentAlert.escalationLevel = levelIndex;
    currentAlert.escalationTargets = level.targets;
    currentAlert.lastEscalatedAt = Date.now();

    // Emit escalation event
    this.emit('escalation', {
      alert: currentAlert,
      level: levelIndex,
      targets: level.targets
    });

    // Notify escalation targets
    level.targets.forEach(target => {
      this.notifyTarget(target, currentAlert, 'escalation');
    });
  }

  /**
   * Clear escalation timers for an alert
   * @param {string} alertId - Alert ID
   */
  clearEscalation(alertId) {
    const timers = this.escalationTimers.get(alertId);
    if (timers) {
      timers.forEach(timer => clearTimeout(timer));
      this.escalationTimers.delete(alertId);
    }
  }

  /**
   * Notify a specific target
   * @param {string} target - Target identifier
   * @param {Object} alert - Alert object
   * @param {string} eventType - Type of notification event
   */
  notifyTarget(target, alert, eventType = 'alert') {
    this.emit('notify', {
      target,
      alert,
      eventType,
      timestamp: Date.now()
    });
  }

  /**
   * Add an escalation policy
   * @param {string} name - Policy name
   * @param {Object} policy - Policy configuration
   */
  addEscalationPolicy(name, policy) {
    this.escalationPolicies[name] = policy;
  }

  /**
   * Configure a webhook for alert notifications
   * @param {Object} webhookConfig - Webhook configuration
   */
  addWebhook(webhookConfig) {
    const webhook = {
      id: crypto.randomBytes(4).toString('hex'),
      url: webhookConfig.url,
      events: webhookConfig.events || ['alert', 'resolved'],
      severities: webhookConfig.severities || ['CRITICAL', 'WARNING', 'INFO'],
      headers: webhookConfig.headers || {},
      enabled: webhookConfig.enabled !== false,
      retries: webhookConfig.retries || 3,
      timeout: webhookConfig.timeout || 5000
    };

    this.webhooks.push(webhook);
    return webhook.id;
  }

  /**
   * Remove a webhook
   * @param {string} webhookId - Webhook ID to remove
   */
  removeWebhook(webhookId) {
    const index = this.webhooks.findIndex(w => w.id === webhookId);
    if (index !== -1) {
      this.webhooks.splice(index, 1);
    }
  }

  /**
   * Send alert to all configured webhooks
   * @param {Object} alert - Alert object
   * @param {string} eventType - Event type (alert, resolved, escalation)
   */
  async sendToWebhooks(alert, eventType = 'alert') {
    const applicableWebhooks = this.webhooks.filter(webhook =>
      webhook.enabled &&
      webhook.events.includes(eventType) &&
      webhook.severities.includes(alert.severity)
    );

    const results = await Promise.allSettled(
      applicableWebhooks.map(webhook => this.sendWebhookRequest(webhook, alert, eventType))
    );

    return results.map((result, index) => ({
      webhookId: applicableWebhooks[index].id,
      success: result.status === 'fulfilled',
      error: result.reason?.message
    }));
  }

  /**
   * Send request to a webhook
   * @param {Object} webhook - Webhook configuration
   * @param {Object} alert - Alert object
   * @param {string} eventType - Event type
   */
  async sendWebhookRequest(webhook, alert, eventType) {
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        action: alert.action,
        timestamp: alert.timestamp,
        resolved: alert.resolved
      }
    };

    // Use dynamic import for fetch if available, or fallback
    try {
      const response = await this.makeHttpRequest(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers
        },
        body: JSON.stringify(payload),
        timeout: webhook.timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      // Emit webhook failure event
      this.emit('webhookFailure', {
        webhookId: webhook.id,
        error: error.message,
        alert
      });

      throw error;
    }
  }

  /**
   * Make HTTP request (abstracted for testing)
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   */
  async makeHttpRequest(url, options) {
    // Use native fetch if available (Node 18+) or require http/https
    if (typeof fetch === 'function') {
      return fetch(url, options);
    }

    // Fallback to https module
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const req = protocol.request(url, {
        method: options.method,
        headers: options.headers,
        timeout: options.timeout
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  }

  /**
   * Get all configured webhooks
   * @returns {Array} List of webhooks
   */
  getWebhooks() {
    return this.webhooks.map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      severities: w.severities,
      enabled: w.enabled
    }));
  }

  /**
   * Check HTTP performance metrics
   * @param {Object} performanceMonitor - Performance monitoring middleware instance
   */
  checkHttpPerformance(performanceMonitor) {
    if (!performanceMonitor) return;

    const metrics = performanceMonitor.getDashboardMetrics();
    if (!metrics || !metrics.http) return;

    // Check HTTP error rate
    if (metrics.http.errorRate > this.thresholds.httpErrorRate) {
      this.triggerAlert({
        type: 'HTTP_ERROR_RATE_HIGH',
        severity: metrics.http.errorRate > 10 ? 'CRITICAL' : 'WARNING',
        metric: 'httpErrorRate',
        value: metrics.http.errorRate,
        threshold: this.thresholds.httpErrorRate,
        message: `HTTP error rate is ${metrics.http.errorRate.toFixed(2)}% (threshold: ${this.thresholds.httpErrorRate}%)`,
        action: 'Review error logs and investigate failing endpoints'
      });
    } else {
      this.resolveAlert('HTTP_ERROR_RATE_HIGH');
    }

    // Check response time
    if (metrics.http.avgResponseTime > this.thresholds.responseTime) {
      this.triggerAlert({
        type: 'RESPONSE_TIME_HIGH',
        severity: 'WARNING',
        metric: 'avgResponseTime',
        value: metrics.http.avgResponseTime,
        threshold: this.thresholds.responseTime,
        message: `Average response time is ${metrics.http.avgResponseTime.toFixed(0)}ms (threshold: ${this.thresholds.responseTime}ms)`,
        action: 'Investigate slow endpoints and database queries'
      });
    } else {
      this.resolveAlert('RESPONSE_TIME_HIGH');
    }
  }

  /**
   * Check memory usage
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (heapUsedPercent > this.thresholds.memoryUsage) {
      this.triggerAlert({
        type: 'MEMORY_USAGE_HIGH',
        severity: heapUsedPercent > 95 ? 'CRITICAL' : 'WARNING',
        metric: 'memoryUsage',
        value: heapUsedPercent,
        threshold: this.thresholds.memoryUsage,
        message: `Memory usage is ${heapUsedPercent.toFixed(1)}% (threshold: ${this.thresholds.memoryUsage}%)`,
        action: 'Consider scaling up or investigating memory leaks'
      });
    } else {
      this.resolveAlert('MEMORY_USAGE_HIGH');
    }
  }

  /**
   * Get alert summary for dashboard
   * @returns {Object} Alert summary
   */
  getAlertSummary() {
    const activeAlerts = this.getActiveAlerts();
    const stats = this.getStatistics();

    const bySeverity = {
      CRITICAL: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
      WARNING: activeAlerts.filter(a => a.severity === 'WARNING').length,
      INFO: activeAlerts.filter(a => a.severity === 'INFO').length
    };

    return {
      activeCount: activeAlerts.length,
      bySeverity,
      stats,
      recentAlerts: activeAlerts.slice(0, 10),
      escalatedCount: activeAlerts.filter(a => a.escalationLevel > 0).length
    };
  }
}

module.exports = AlertService;
