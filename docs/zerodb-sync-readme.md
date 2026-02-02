# ZeroDB Bidirectional Sync Service

## Overview

The ZeroDB Bidirectional Sync Service enables real-time, bidirectional data synchronization between MongoDB and ZeroDB. This service is part of Issue #14 implementation for the OpenCap platform.

## Features

- **Event-Driven Synchronization**: Automatically syncs data changes from ZeroDB to MongoDB using event streams
- **Multiple Conflict Resolution Strategies**: Choose from last-write-wins, MongoDB-priority, ZeroDB-priority, or custom strategies
- **Idempotent Operations**: Safely handles duplicate events and retries
- **Exponential Backoff Retry**: Automatically retries failed operations with intelligent backoff
- **Comprehensive Audit Logging**: Tracks all sync operations for debugging and compliance
- **Health Monitoring**: Real-time health checks and metrics
- **Production-Ready**: Battle-tested with error handling, connection pooling, and graceful shutdown

## Quick Start

### 1. Installation

The service is already integrated into the OpenCap backend. No additional installation required.

### 2. Configuration

Update your `.env` file:

```bash
# Enable ZeroDB sync
ZERODB_SYNC_ENABLED=true

# Choose conflict resolution strategy
SYNC_CONFLICT_STRATEGY=last-write-wins

# Adjust polling interval (milliseconds)
SYNC_POLL_INTERVAL_MS=5000

# Retry configuration
SYNC_MAX_RETRIES=3
SYNC_BASE_BACKOFF_MS=1000
SYNC_MAX_BACKOFF_MS=30000
```

### 3. Initialize and Start Sync

```javascript
const zerodbSyncService = require('./services/zerodbSyncService');

// Initialize service
await zerodbSyncService.initialize();

// Start syncing a table
await zerodbSyncService.startSync('users', 'User');

// Service is now running and will automatically:
// - Poll ZeroDB for new events
// - Apply changes to MongoDB
// - Handle conflicts
// - Retry on failures
// - Log all operations
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Bidirectional Sync Flow                       │
└─────────────────────────────────────────────────────────────────┘

MongoDB                                               ZeroDB
   │                                                     │
   │  1. Change Streams                                 │
   │     (Insert/Update/Delete)                         │
   │                                                     │
   ▼                                                     │
┌──────────────────┐                                    │
│  Change Stream   │                                    │
│     Service      │ ─────────2. Transform────────────► │
│ (MongoDB→ZeroDB) │                                    │
└──────────────────┘                                    ▼
                                                  ┌─────────────┐
                                                  │  ZeroDB API │
                                                  └─────────────┘
                                                        │
                                                        │ 3. Event Stream
                                                        │    Published
   ┌────────────────────────────────────────────────── │
   │                                                    │
   ▼                                                    ▼
┌──────────────────┐                            ┌──────────────┐
│   Sync Service   │ ◄────4. Poll Events────────│ Event Stream │
│ (ZeroDB→MongoDB) │                            │     API      │
└──────────────────┘                            └──────────────┘
   │
   │ 5. Apply Changes
   │    (with conflict resolution)
   │
   ▼
MongoDB (Updated)
   │
   │ 6. Audit Log
   │
   ▼
sync_audit_logs
sync_metadata
```

## Conflict Resolution

### Available Strategies

#### 1. Last-Write-Wins (Default)
The most recently updated version wins based on `updatedAt` timestamp.

**Use Case**: General purpose synchronization where latest data is most important

```javascript
await zerodbSyncService.startSync('users', 'User', {
  conflictStrategy: 'last-write-wins'
});
```

#### 2. MongoDB Priority
MongoDB data always wins. ZeroDB changes are only applied if there's no conflict.

**Use Case**: MongoDB is the primary source of truth

```javascript
await zerodbSyncService.startSync('companies', 'Company', {
  conflictStrategy: 'mongodb-priority'
});
```

#### 3. ZeroDB Priority
ZeroDB data always wins. MongoDB changes are overwritten.

**Use Case**: ZeroDB is the primary source of truth (e.g., analytics, logs)

```javascript
await zerodbSyncService.startSync('analytics', 'Analytics', {
  conflictStrategy: 'zerodb-priority'
});
```

#### 4. Custom Strategy
Define your own merge logic for complex scenarios.

**Use Case**: Field-level conflict resolution, array merging, versioning

```javascript
zerodbSyncService.registerCustomMergeStrategy('User', async (mongoData, zerodbData) => {
  return {
    // Keep MongoDB internal fields
    _id: mongoData._id,
    createdAt: mongoData.createdAt,

    // Merge arrays
    roles: [...new Set([...mongoData.roles, ...zerodbData.roles])],

    // Field-level resolution
    email: zerodbData.emailUpdatedAt > mongoData.emailUpdatedAt
      ? zerodbData.email
      : mongoData.email,

    // Use newer timestamp
    updatedAt: Math.max(mongoData.updatedAt, zerodbData.updatedAt)
  };
});

await zerodbSyncService.startSync('users', 'User', {
  conflictStrategy: 'custom'
});
```

## API Endpoints

### Health Check
```bash
GET /api/sync/health
```

**Response:**
```json
{
  "success": true,
  "healthy": true,
  "data": {
    "overall": {
      "enabled": true,
      "initialized": true,
      "activeSyncs": 3,
      "metrics": { ... }
    },
    "tables": [ ... ]
  }
}
```

### Get Metrics
```bash
GET /api/sync/metrics
```

### Get Audit Logs
```bash
GET /api/sync/audit/:tableName?status=failed&limit=100
```

### Start Sync
```bash
POST /api/sync/start
Body: { "tableName": "users", "modelName": "User" }
```

### Stop Sync
```bash
POST /api/sync/stop
Body: { "tableName": "users" }
```

See [API Documentation](./zerodb-sync-api.md) for complete endpoint details.

## Monitoring

### Health Checks

The service exposes health metrics for each synced table:

```javascript
const health = await zerodbSyncService.getHealthStatus();

// Check if all syncs are healthy
const allHealthy = health.tables.every(t => t.isHealthy);

// Get unhealthy tables
const unhealthy = health.tables.filter(t => !t.isHealthy);
```

### Key Metrics

- **Events Processed**: Total number of events handled
- **Success Rate**: Percentage of successful operations
- **Error Rate**: Percentage of failed operations
- **Conflict Rate**: Percentage of events with conflicts
- **Average Processing Time**: Mean time to process an event
- **Consecutive Failures**: Number of sequential failures (triggers health alert)

### Alerting

Recommended alerts:

```yaml
Critical:
  - isHealthy == false
  - consecutiveFailures > 5
  - Success rate < 90%

Warning:
  - avgProcessingTimeMs > 1000
  - Error rate > 5%
  - Conflict rate > 10%

Info:
  - New table sync started
  - Sync stopped
```

## Error Handling

### Retry Logic

The service implements exponential backoff with jitter:

```
Attempt 1: ~1000ms delay
Attempt 2: ~2000ms delay
Attempt 3: ~4000ms delay
Attempt 4: ~8000ms delay (capped at MAX_BACKOFF)
```

### Retryable Errors

- Network timeouts
- Connection resets
- Rate limits (429)
- Server errors (502, 503)

### Non-Retryable Errors

- Authentication failures (401)
- Authorization failures (403)
- Not found (404)
- Validation errors (400)
- Duplicate key errors

### Error Recovery

1. **Automatic Retry**: Failed operations are automatically retried up to `SYNC_MAX_RETRIES` times
2. **Audit Logging**: All failures are logged with full context
3. **Health Monitoring**: Persistent failures trigger health alerts
4. **Manual Intervention**: Review audit logs and manually reprocess if needed

## Performance Tuning

### High-Throughput Configuration

For high-volume environments:

```bash
# Faster polling
SYNC_POLL_INTERVAL_MS=1000

# More aggressive retries
SYNC_MAX_RETRIES=5
SYNC_BASE_BACKOFF_MS=500
SYNC_MAX_BACKOFF_MS=10000

# Increase MongoDB connection pool
MONGODB_POOL_SIZE=50
```

### Low-Latency Configuration

For latency-sensitive applications:

```bash
# Less frequent polling (reduces load)
SYNC_POLL_INTERVAL_MS=10000

# Fewer retries
SYNC_MAX_RETRIES=2
SYNC_BASE_BACKOFF_MS=2000
```

### Batch Processing

The service processes events in batches of 100 by default. Adjust in code:

```javascript
// In zerodbService.listEvents()
const events = await zerodbService.listEvents(topic, 0, 250); // Larger batch
```

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm test tests/unit/services/zerodbSyncService.test.js
```

Tests cover:
- Initialization
- Event processing (insert/update/delete)
- Conflict resolution strategies
- Retry mechanism
- Metrics and health checks
- Audit logging

### Integration Testing

Test with real MongoDB and ZeroDB:

```bash
# Start test databases
docker-compose up -d mongo zerodb

# Run integration tests
npm run test:integration
```

### Manual Testing

Use the examples file:

```bash
node examples/zerodb-sync-usage.js
```

## Security

### Best Practices

1. **Authentication**: Secure ZeroDB API key in environment variables
2. **Authorization**: Protect sync management endpoints (start/stop) with admin auth
3. **Data Validation**: All ZeroDB data is validated before applying to MongoDB
4. **Audit Trail**: Complete audit log for compliance and security reviews
5. **Rate Limiting**: Implement rate limiting on sync management endpoints

### Environment Variables

Never commit these to version control:

```bash
ZERODB_API_KEY=your_secret_key_here
MONGODB_URI=mongodb://user:pass@host/db
```

## Troubleshooting

### Sync Not Processing Events

**Symptoms**: No events being processed, stale data

**Diagnosis:**
```javascript
const health = await zerodbSyncService.getHealthStatus();
console.log(health);

// Check:
// 1. Is ZERODB_SYNC_ENABLED=true?
// 2. Are syncs started? (activeSyncs > 0)
// 3. Any errors in lastError?
```

**Solutions:**
- Verify ZeroDB API connectivity
- Check ZeroDB API key validity
- Review error logs in sync_metadata collection

### High Failure Rate

**Symptoms**: Many failed operations in audit logs

**Diagnosis:**
```javascript
const failed = await zerodbSyncService.getAuditLogs('users', {
  status: 'failed',
  limit: 100
});

// Group errors by type
const errorGroups = failed.logs.reduce((acc, log) => {
  const msg = log.errorMessage || 'Unknown';
  acc[msg] = (acc[msg] || 0) + 1;
  return acc;
}, {});

console.log(errorGroups);
```

**Common Causes:**
- Network connectivity issues
- ZeroDB API rate limits
- Invalid data format
- MongoDB schema validation errors

**Solutions:**
- Increase `SYNC_MAX_RETRIES`
- Adjust `SYNC_BASE_BACKOFF_MS`
- Fix data format issues
- Relax MongoDB schema validation

### Data Inconsistencies

**Symptoms**: Data differs between MongoDB and ZeroDB

**Diagnosis:**
```javascript
const databaseAdapter = require('./services/databaseAdapter');

const report = await databaseAdapter.validateConsistency('User', {
  createdAt: { $gte: new Date('2024-01-01') }
});

console.log('Discrepancies:', report.discrepancies);
```

**Solutions:**
- Review conflict resolution strategy
- Check for manual database modifications
- Verify both sync directions are working
- Manually reconcile using audit logs

## Production Checklist

Before deploying to production:

- [ ] Configure environment variables
- [ ] Set up health monitoring and alerting
- [ ] Test conflict resolution strategies
- [ ] Verify retry and backoff settings
- [ ] Set up log aggregation for audit logs
- [ ] Implement graceful shutdown handlers
- [ ] Configure MongoDB connection pooling
- [ ] Test failover scenarios
- [ ] Document custom merge strategies
- [ ] Set up performance monitoring dashboards

## Advanced Usage

### Custom Event Processing

Process events with custom logic:

```javascript
const event = { /* ZeroDB event */ };

await zerodbSyncService._processEvent(
  event,
  'users',
  'User',
  'last-write-wins'
);
```

### Manual Checkpoint Update

Update sync checkpoint manually:

```javascript
await zerodbSyncService.SyncMetadata.updateOne(
  { tableName: 'users' },
  {
    lastProcessedEventId: 'event_xyz',
    lastProcessedTimestamp: Date.now()
  }
);
```

### Conditional Sync

Start sync based on runtime conditions:

```javascript
const shouldSyncUsers = await determineIfSyncNeeded();

if (shouldSyncUsers) {
  await zerodbSyncService.startSync('users', 'User');
}
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/opencap/issues)
- **Docs**: [Full Documentation](./zerodb-sync-api.md)
- **Email**: support@example.com
