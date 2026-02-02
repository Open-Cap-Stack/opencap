# ZeroDB Monitoring Guide

**GitHub Issue #37: Post-migration monitoring and optimization**

This guide covers the monitoring, alerting, and optimization features for ZeroDB operations in OpenCap Stack.

## Overview

The ZeroDB monitoring system provides:
- Real-time query performance tracking
- Error rate monitoring with alerting
- Rate limit utilization tracking
- Prometheus-compatible metrics export
- Performance optimization recommendations

## Monitoring Endpoints

### Health Check

```bash
GET /api/v1/monitoring/health
```

Returns the overall health status of ZeroDB operations.

**Response:**
```json
{
  "status": "HEALTHY",
  "issues": [],
  "timestamp": "2026-02-02T22:30:00.000Z"
}
```

Status values:
- `HEALTHY` - All systems operational
- `DEGRADED` - Performance issues detected
- `UNHEALTHY` - Critical issues requiring attention

### Metrics

```bash
GET /api/v1/monitoring/metrics
```

Returns comprehensive metrics including:
- Query counts (total, successful, failed)
- Latency percentiles (p50, p95, p99)
- Operation-specific metrics
- Error breakdown by type
- Rate limit utilization

### Prometheus Metrics

```bash
GET /api/v1/monitoring/metrics/prometheus
```

Returns Prometheus-compatible metrics for integration with monitoring stacks.

## Alert Thresholds

Default alert thresholds can be configured:

| Threshold | Default | Description |
|-----------|---------|-------------|
| `queryLatencyP95Ms` | 500ms | Alert if p95 latency exceeds this |
| `errorRatePercent` | 1% | Alert if error rate exceeds this |
| `rateLimitUtilizationPercent` | 80% | Alert if rate limit usage exceeds this |
| `consecutiveErrors` | 5 | Alert after this many consecutive errors |

### Update Thresholds

```bash
PUT /api/v1/monitoring/thresholds
Content-Type: application/json

{
  "queryLatencyP95Ms": 300,
  "errorRatePercent": 2,
  "rateLimitUtilizationPercent": 70,
  "consecutiveErrors": 3
}
```

## Alert Types

### HIGH_LATENCY (WARNING)
Triggered when p95 query latency exceeds the threshold.

**Response Actions:**
1. Check ZeroDB API status
2. Review recent query patterns
3. Consider implementing caching
4. Check network latency to API endpoint

### HIGH_ERROR_RATE (ERROR)
Triggered when error rate exceeds the threshold.

**Response Actions:**
1. Check ZeroDB API status
2. Review error types in `/api/v1/monitoring/errors`
3. Check API credentials validity
4. Review rate limit status

### RATE_LIMIT_WARNING (WARNING)
Triggered when rate limit utilization exceeds the threshold.

**Response Actions:**
1. Implement request batching
2. Add caching layer
3. Review query efficiency
4. Contact AINative for rate limit increase

### CONSECUTIVE_ERRORS (CRITICAL)
Triggered after multiple consecutive operation failures.

**Response Actions:**
1. Check network connectivity
2. Verify API credentials
3. Check ZeroDB service status
4. Implement circuit breaker

## Prometheus Integration

Add the following to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'opencap-zerodb'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/v1/monitoring/metrics/prometheus'
```

## Grafana Dashboard

Import the OpenCap ZeroDB dashboard with the following key panels:

### Query Performance
- Query rate (queries/second)
- Success rate percentage
- Latency percentiles (p50, p95, p99)

### Error Tracking
- Error rate over time
- Error breakdown by type
- Recent error log

### Rate Limits
- Rate limit utilization
- Requests per minute
- Remaining quota

### Operations
- Operations by type (insert, query, update, delete)
- Vector search performance
- Memory operations

## Environment Variables

Configure monitoring behavior with these environment variables:

```bash
# Enable detailed monitoring (default: true in production)
ZERODB_MONITORING_ENABLED=true

# Log level for monitoring (debug, info, warn, error)
ZERODB_MONITORING_LOG_LEVEL=info

# Metrics retention period in milliseconds (default: 1 hour)
ZERODB_METRICS_RETENTION_MS=3600000

# Alert webhook URL (optional)
ZERODB_ALERT_WEBHOOK_URL=https://your-alerting-system.com/webhook
```

## Best Practices

### 1. Monitor Key Metrics
Focus on these critical metrics:
- **Error Rate**: Should stay below 1%
- **p95 Latency**: Should stay below 500ms
- **Rate Limit Utilization**: Keep below 70% for headroom

### 2. Set Up Alerts
Configure alerts for:
- Error rate > 1% for 5 minutes
- p95 latency > 500ms for 5 minutes
- Rate limit > 80% utilization
- Any CRITICAL severity alert

### 3. Regular Reviews
- Weekly: Review performance trends
- Monthly: Analyze cost vs. usage
- Quarterly: Optimize queries and caching

### 4. Incident Response
Create runbooks for common scenarios:
1. ZeroDB API outage
2. Rate limit exceeded
3. High latency
4. Authentication failures

## Troubleshooting

### High Latency Issues

1. Check ZeroDB API status:
   ```bash
   curl https://api.ainative.studio/health
   ```

2. Review slow queries:
   ```bash
   GET /api/v1/monitoring/performance/slow-queries
   ```

3. Check network latency:
   ```bash
   ping api.ainative.studio
   ```

### High Error Rate

1. Get error breakdown:
   ```bash
   GET /api/v1/monitoring/errors
   ```

2. Common error codes:
   - `ETIMEDOUT`: Network timeout
   - `RATE_LIMIT`: Too many requests
   - `UNAUTHORIZED`: Invalid credentials
   - `NOT_FOUND`: Resource doesn't exist

### Rate Limit Issues

1. Check current utilization:
   ```bash
   GET /api/v1/monitoring/metrics
   ```

2. Implement batching for bulk operations
3. Add caching for frequently accessed data
4. Contact AINative support for limit increases

## Cost Monitoring

Track ZeroDB usage costs:

1. Monitor request volume in metrics
2. Track vector storage usage
3. Review event streaming volume
4. Check file storage consumption

## Integration with External Tools

### Slack Alerts
Configure webhook for Slack notifications:

```javascript
monitoringService.on('alert', async (alert) => {
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `[${alert.severity}] ${alert.type}: ${alert.message}`
    })
  });
});
```

### PagerDuty Integration
For critical alerts, integrate with PagerDuty:

```javascript
monitoringService.on('alert', async (alert) => {
  if (alert.severity === 'CRITICAL') {
    await pagerduty.trigger(alert);
  }
});
```

---

*Last Updated: 2026-02-02*
*Related Issues: #37*
