# ZeroDB Post-Migration Monitoring Guide

## Overview

This guide provides comprehensive information about the ZeroDB post-migration monitoring system, including metrics collection, alerting, performance optimization, and troubleshooting.

## Table of Contents

1. [Architecture](#architecture)
2. [Metrics Collection](#metrics-collection)
3. [Health Checks](#health-checks)
4. [Alerting System](#alerting-system)
5. [Performance Optimization](#performance-optimization)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)
8. [Runbooks](#runbooks)

## Architecture

The monitoring system consists of three main components:

### 1. MonitoringDashboard
- Collects and aggregates metrics from MongoDB, ZeroDB, and system resources
- Provides real-time metrics and time-series data
- Exposes Prometheus-compatible metrics endpoint
- Tracks sync lag, query latency, throughput, and error rates

### 2. AlertService
- Monitors thresholds and triggers alerts
- Supports alert deduplication and cooldown periods
- Tracks alert history and statistics
- Provides MTTA (Mean Time To Acknowledge) and MTTR (Mean Time To Resolution) metrics

### 3. PerformanceOptimizer
- Analyzes query patterns and identifies slow queries
- Recommends indexes based on query frequency and latency
- Optimizes batch sizes for bulk operations
- Suggests caching strategies for frequently accessed data

## Metrics Collection

### ZeroDB Metrics

#### Query Latency
- **p50**: 50th percentile (median) query latency
- **p95**: 95th percentile query latency
- **p99**: 99th percentile query latency
- **avg**: Average query latency
- **max**: Maximum query latency

```bash
curl http://localhost:3000/api/v1/monitoring/metrics/zerodb
```

#### Throughput
- **operationsPerSecond**: Current operations per second
- **totalOperations**: Total operations since startup

#### Error Rate
- **errorRate**: Percentage of failed operations
- **totalErrors**: Total error count

#### API Token Usage
- **limit**: API rate limit
- **remaining**: Remaining tokens
- **usagePercentage**: Current usage percentage
- **resetAt**: Token reset timestamp

### Sync Metrics

Monitor the health of MongoDB to ZeroDB synchronization:

```bash
curl http://localhost:3000/api/v1/monitoring/metrics/sync
```

- **syncLag**: Current, average, and max sync lag in milliseconds
- **eventsProcessed**: Total events successfully synced
- **eventsFailed**: Total failed sync events
- **failureRate**: Percentage of failed sync events
- **deadLetterQueueSize**: Number of events in DLQ
- **circuitBreakerStatus**: CLOSED, OPEN, or HALF_OPEN
- **resumeTokenHealth**: HEALTHY or DEGRADED

### System Metrics

```bash
curl http://localhost:3000/api/v1/monitoring/metrics/system
```

- **memory**: Used, total, free, and percentage
- **cpu**: Load average and core count
- **uptime**: Process uptime in seconds
- **nodeVersion**: Node.js version

## Health Checks

### Overall Health Status

```bash
curl http://localhost:3000/api/v1/monitoring/health
```

Health status is determined by checking:

| Check | Threshold | Status |
|-------|-----------|--------|
| Sync Lag | < 5 seconds | PASS |
| Error Rate | < 1% | PASS |
| Dead Letter Queue | < 100 items | PASS |
| Circuit Breaker | CLOSED | PASS |
| Resume Token | HEALTHY | PASS |

**Health Levels:**
- **healthy**: All checks pass
- **degraded**: One or more WARN checks
- **unhealthy**: One or more FAIL checks

## Alerting System

### Alert Types and Thresholds

| Alert Type | Threshold | Severity | Action |
|------------|-----------|----------|--------|
| SYNC_LAG_HIGH | > 5 seconds | WARNING | Check MongoDB Change Stream and ZeroDB sync service |
| ERROR_RATE_HIGH | > 1% | CRITICAL | Review ZeroDB logs and failed operations |
| DLQ_SIZE_HIGH | > 100 items | CRITICAL | Review failed events in DLQ |
| CIRCUIT_BREAKER_OPEN | Status = OPEN | CRITICAL | Investigate underlying service failures |
| API_RATE_LIMIT_HIGH | > 80% usage | WARNING | Implement request throttling |
| QUERY_LATENCY_HIGH | p99 > 1 second | WARNING | Review slow queries and optimize |

### Managing Alerts

#### Get Active Alerts
```bash
curl http://localhost:3000/api/v1/monitoring/alerts
```

#### Acknowledge Alert
```bash
curl -X POST http://localhost:3000/api/v1/monitoring/alerts/{alertId}/acknowledge \
  -H "Content-Type: application/json" \
  -d '{"acknowledgedBy": "admin@example.com"}'
```

#### Get Alert History
```bash
curl http://localhost:3000/api/v1/monitoring/alerts/history?timeRange=86400000
```

#### Get Alert Statistics
```bash
curl http://localhost:3000/api/v1/monitoring/alerts/statistics
```

### Alert Deduplication

Alerts are automatically deduplicated with a 5-minute cooldown period. This prevents alert spam while keeping you informed of ongoing issues.

## Performance Optimization

### Running Performance Analysis

#### Manual Analysis
```bash
node scripts/optimize-zerodb-performance.js
```

#### Scheduled Analysis (Cron)
```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/opencapstack && node scripts/optimize-zerodb-performance.js >> /var/log/zerodb-optimization.log 2>&1
```

### Optimization Endpoints

#### Slow Query Analysis
```bash
curl "http://localhost:3000/api/v1/monitoring/performance/slow-queries?threshold=1000"
```

#### Index Recommendations
```bash
curl http://localhost:3000/api/v1/monitoring/performance/index-recommendations
```

#### Batch Size Optimization
```bash
curl http://localhost:3000/api/v1/monitoring/performance/batch-optimization
```

#### Caching Strategy
```bash
curl http://localhost:3000/api/v1/monitoring/performance/caching-strategy
```

#### Connection Pool Analysis
```bash
curl http://localhost:3000/api/v1/monitoring/performance/connection-pool
```

#### Comprehensive Report
```bash
curl http://localhost:3000/api/v1/monitoring/performance/report
```

### Implementing Recommendations

#### 1. Adding Indexes

Based on recommendations, add indexes to ZeroDB tables:

```javascript
// Example: Add index on users table for email field
await zerodbService.createTable('users', {
  indexes: [
    { field: 'email', type: 'btree' }
  ]
});
```

#### 2. Optimizing Batch Size

Update batch operations to use recommended size:

```javascript
// Before
const batchSize = 100;

// After (based on recommendation)
const batchSize = 50; // Recommended optimal size
```

#### 3. Implementing Caching

Add caching for frequently accessed queries:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function getCachedData(tableName, filter) {
  const cacheKey = JSON.stringify({ tableName, filter });

  let data = cache.get(cacheKey);
  if (data) return data;

  data = await zerodbService.queryTable(tableName, { filter });
  cache.set(cacheKey, data);

  return data;
}
```

## API Reference

### Monitoring Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/monitoring/health` | Overall health status |
| GET | `/api/v1/monitoring/summary` | Comprehensive summary |
| GET | `/api/v1/monitoring/metrics/zerodb` | ZeroDB metrics |
| GET | `/api/v1/monitoring/metrics/sync` | Sync metrics |
| GET | `/api/v1/monitoring/metrics/system` | System metrics |
| GET | `/api/v1/monitoring/metrics/prometheus` | Prometheus format |
| GET | `/api/v1/monitoring/metrics/timeseries/:metric` | Time series data |

### Alert Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/monitoring/alerts` | Active alerts |
| GET | `/api/v1/monitoring/alerts/history` | Alert history |
| GET | `/api/v1/monitoring/alerts/statistics` | Alert statistics |
| POST | `/api/v1/monitoring/alerts/:id/acknowledge` | Acknowledge alert |

### Performance Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/monitoring/performance/slow-queries` | Slow query analysis |
| GET | `/api/v1/monitoring/performance/index-recommendations` | Index recommendations |
| GET | `/api/v1/monitoring/performance/batch-optimization` | Batch size optimization |
| GET | `/api/v1/monitoring/performance/caching-strategy` | Caching recommendations |
| GET | `/api/v1/monitoring/performance/connection-pool` | Connection pool analysis |
| GET | `/api/v1/monitoring/performance/query-distribution` | Query distribution |
| GET | `/api/v1/monitoring/performance/report` | Comprehensive report |
| POST | `/api/v1/monitoring/performance/export` | Export performance data |

## Troubleshooting

### High Sync Lag

**Symptoms:**
- SYNC_LAG_HIGH alert triggered
- Sync lag > 5 seconds

**Diagnosis:**
1. Check MongoDB Change Stream health
2. Verify ZeroDB sync service is running
3. Check network connectivity
4. Review sync service logs

**Resolution:**
```bash
# Check sync service logs
tail -f logs/sync-service.log

# Restart sync service if needed
pm2 restart zerodb-sync-service

# Check resume token health
curl http://localhost:3000/api/v1/monitoring/metrics/sync | jq '.data.resumeTokenHealth'
```

### High Error Rate

**Symptoms:**
- ERROR_RATE_HIGH alert triggered
- Error rate > 1%

**Diagnosis:**
1. Review recent errors
2. Check ZeroDB API status
3. Verify API token validity
4. Review rate limit usage

**Resolution:**
```bash
# Get recent errors
curl http://localhost:3000/api/v1/admin/db-metrics | jq '.data.zerodb.recentErrors'

# Check API token usage
curl http://localhost:3000/api/v1/monitoring/metrics/zerodb | jq '.data.apiTokenUsage'

# Review slow queries
curl http://localhost:3000/api/v1/monitoring/performance/slow-queries
```

### Circuit Breaker Open

**Symptoms:**
- CIRCUIT_BREAKER_OPEN alert triggered
- Sync operations blocked

**Diagnosis:**
1. Check underlying service failures
2. Review error patterns
3. Verify ZeroDB API health

**Resolution:**
```bash
# Check service health
curl http://localhost:3000/api/v1/monitoring/health

# Wait for circuit breaker to attempt recovery (moves to HALF_OPEN)
# Monitor sync metrics
watch -n 5 'curl -s http://localhost:3000/api/v1/monitoring/metrics/sync | jq ".data.circuitBreakerStatus"'
```

### Large Dead Letter Queue

**Symptoms:**
- DLQ_SIZE_HIGH alert triggered
- DLQ size > 100

**Diagnosis:**
1. Review failed events in DLQ
2. Identify common failure patterns
3. Check for data validation issues

**Resolution:**
```bash
# Get DLQ size
curl http://localhost:3000/api/v1/monitoring/metrics/sync | jq '.data.deadLetterQueueSize'

# Review failed sync events
# Manually inspect and reprocess failed events
# Fix data validation issues if identified
```

### Slow Queries

**Symptoms:**
- QUERY_LATENCY_HIGH alert triggered
- p99 latency > 1 second

**Diagnosis:**
1. Analyze slow queries
2. Check for missing indexes
3. Review query patterns

**Resolution:**
```bash
# Analyze slow queries
curl "http://localhost:3000/api/v1/monitoring/performance/slow-queries?threshold=1000" | jq '.data'

# Get index recommendations
curl http://localhost:3000/api/v1/monitoring/performance/index-recommendations | jq '.data.recommendations'

# Implement recommended indexes
# Run optimization report
node scripts/optimize-zerodb-performance.js
```

## Runbooks

### Daily Monitoring Checklist

1. **Check Health Status**
   ```bash
   curl http://localhost:3000/api/v1/monitoring/health | jq '.data.status'
   ```
   - Expected: "healthy"
   - If degraded/unhealthy: Review active alerts

2. **Review Sync Metrics**
   ```bash
   curl http://localhost:3000/api/v1/monitoring/metrics/sync | jq '.data.syncLag'
   ```
   - Expected: < 5 seconds
   - If high: Follow "High Sync Lag" troubleshooting

3. **Check Error Rates**
   ```bash
   curl http://localhost:3000/api/v1/monitoring/metrics/zerodb | jq '.data.errorRate'
   ```
   - Expected: < 1%
   - If high: Review error logs

4. **Review Active Alerts**
   ```bash
   curl http://localhost:3000/api/v1/monitoring/alerts | jq '.data.count'
   ```
   - Acknowledge and resolve alerts as needed

### Weekly Performance Review

1. **Generate Optimization Report**
   ```bash
   node scripts/optimize-zerodb-performance.js
   ```

2. **Review Top Recommendations**
   - Prioritize by impact and complexity
   - Plan implementation of critical recommendations

3. **Implement Index Recommendations**
   - Add recommended indexes
   - Monitor query performance improvement

4. **Review Alert Statistics**
   ```bash
   curl http://localhost:3000/api/v1/monitoring/alerts/statistics
   ```
   - Track MTTA and MTTR trends
   - Identify recurring alert patterns

### Monthly Capacity Planning

1. **Review Query Distribution**
   ```bash
   curl http://localhost:3000/api/v1/monitoring/performance/query-distribution
   ```

2. **Analyze Trends**
   - Query volume growth
   - Resource utilization trends
   - Peak usage patterns

3. **Plan Scaling**
   - Connection pool adjustments
   - API rate limit increases
   - Infrastructure scaling

## Integration with External Tools

### Prometheus

Export metrics to Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'zerodb-monitoring'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/v1/monitoring/metrics/prometheus'
```

### Grafana

Create dashboards using the Prometheus metrics:
- ZeroDB Query Latency (p50, p95, p99)
- Sync Lag over time
- Error Rate percentage
- Dead Letter Queue size
- System resource usage

### Alert Manager

Configure AlertManager to send notifications:

```yaml
# alertmanager.yml
receivers:
  - name: 'team-slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK'
        channel: '#zerodb-alerts'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## Best Practices

1. **Regular Monitoring**
   - Check health status daily
   - Review performance reports weekly
   - Conduct capacity planning monthly

2. **Proactive Optimization**
   - Implement index recommendations promptly
   - Optimize batch sizes based on data
   - Enable caching for hot queries

3. **Alert Management**
   - Acknowledge alerts promptly
   - Document resolution steps
   - Track MTTA and MTTR trends

4. **Performance Testing**
   - Load test before optimization changes
   - Validate index effectiveness
   - Monitor impact of batch size changes

5. **Documentation**
   - Keep runbooks up to date
   - Document incident resolutions
   - Share optimization results with team

## Support

For issues or questions:
- Review this guide and troubleshooting section
- Check GitHub issues: [opencapstack/issues](https://github.com/Open-Cap-Stack/opencapstack/issues)
- Run optimization analysis for performance issues
- Consult alert runbook for alert-specific guidance
