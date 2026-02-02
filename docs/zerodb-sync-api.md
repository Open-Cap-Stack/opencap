# ZeroDB Bidirectional Sync API Documentation

## Overview

The ZeroDB Sync Service provides bidirectional data synchronization between ZeroDB and MongoDB, enabling real-time data consistency across both databases. This document describes the API endpoints, configuration options, and usage patterns.

## Architecture

```
┌─────────────┐         Event Stream        ┌─────────────┐
│             │ ◄──────────────────────────► │             │
│   MongoDB   │                              │   ZeroDB    │
│             │         Sync Service         │             │
└─────────────┘                              └─────────────┘
       │                                             │
       │                                             │
       ▼                                             ▼
   Change Streams                            Event Stream API
   (MongoDB → ZeroDB)                        (ZeroDB → MongoDB)
```

## Configuration

### Environment Variables

```bash
# Enable/disable ZeroDB to MongoDB synchronization
ZERODB_SYNC_ENABLED=true

# Conflict resolution strategy
# Options: last-write-wins | mongodb-priority | zerodb-priority | custom
SYNC_CONFLICT_STRATEGY=last-write-wins

# Polling interval for ZeroDB event stream (milliseconds)
SYNC_POLL_INTERVAL_MS=5000

# Sync state collection name
SYNC_STATE_COLLECTION=sync_metadata

# Retry configuration
SYNC_MAX_RETRIES=3
SYNC_BASE_BACKOFF_MS=1000
SYNC_MAX_BACKOFF_MS=30000
```

## Service Initialization

### Initialize Sync Service

```javascript
const zerodbSyncService = require('./services/zerodbSyncService');

// Initialize the service
await zerodbSyncService.initialize();
```

### Start Syncing a Table

```javascript
// Start syncing a specific ZeroDB table to MongoDB model
await zerodbSyncService.startSync('users', 'User', {
  conflictStrategy: 'last-write-wins', // Optional, overrides default
  customMergeStrategy: async (mongoData, zerodbData) => {
    // Optional custom merge function
    return {
      ...mongoData,
      ...zerodbData,
      // Custom conflict resolution logic
    };
  }
});
```

### Stop Syncing

```javascript
// Stop syncing a specific table
await zerodbSyncService.stopSync('users');

// Stop all active syncs
await zerodbSyncService.stopAllSyncs();
```

## API Endpoints

### 1. Health Check Endpoint

**GET** `/api/sync/health`

Returns the current health status of all active syncs.

#### Response Example

```json
{
  "overall": {
    "enabled": true,
    "initialized": true,
    "activeSyncs": 3,
    "metrics": {
      "eventsProcessed": 1523,
      "eventsSucceeded": 1498,
      "eventsFailed": 25,
      "conflictsDetected": 15,
      "conflictsResolved": 15,
      "lastProcessedTime": "2024-02-02T10:30:45.123Z",
      "avgProcessingTimeMs": 45
    }
  },
  "tables": [
    {
      "tableName": "users",
      "syncEnabled": true,
      "lastSyncAttempt": "2024-02-02T10:30:45.000Z",
      "lastSuccessfulSync": "2024-02-02T10:30:45.000Z",
      "consecutiveFailures": 0,
      "totalEventsSynced": 523,
      "totalErrors": 5,
      "recentErrors": 0,
      "isHealthy": true,
      "lastError": null
    },
    {
      "tableName": "companies",
      "syncEnabled": true,
      "lastSyncAttempt": "2024-02-02T10:30:40.000Z",
      "lastSuccessfulSync": "2024-02-02T10:30:40.000Z",
      "consecutiveFailures": 0,
      "totalEventsSynced": 1000,
      "totalErrors": 20,
      "recentErrors": 2,
      "isHealthy": true,
      "lastError": {
        "message": "Network timeout",
        "timestamp": "2024-02-02T10:15:30.000Z"
      }
    }
  ]
}
```

#### Health Status Indicators

- `isHealthy: true` - Sync is operating normally
- `isHealthy: false` - Sync has high failure rate (>5 consecutive failures or >10 errors in last hour)

---

### 2. Get Sync Metrics

**GET** `/api/sync/metrics`

Returns current sync metrics.

#### Response Example

```json
{
  "eventsProcessed": 1523,
  "eventsSucceeded": 1498,
  "eventsFailed": 25,
  "conflictsDetected": 15,
  "conflictsResolved": 15,
  "lastProcessedTime": "2024-02-02T10:30:45.123Z",
  "avgProcessingTimeMs": 45,
  "processingTimes": [42, 45, 38, 52, 41]
}
```

---

### 3. Get Audit Logs

**GET** `/api/sync/audit/:tableName`

Retrieves detailed audit logs for a specific table.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by sync status: `success`, `failed`, `skipped`, `conflict` |
| `startDate` | ISO date | No | Filter logs after this date |
| `endDate` | ISO date | No | Filter logs before this date |
| `limit` | number | No | Maximum number of logs to return (default: 100) |
| `skip` | number | No | Number of logs to skip for pagination (default: 0) |

#### Example Request

```bash
GET /api/sync/audit/users?status=failed&limit=50&skip=0
```

#### Response Example

```json
{
  "logs": [
    {
      "_id": "65bb7f8e5f8e2a001f8d4e23",
      "tableName": "users",
      "eventId": "event_12345",
      "eventType": "update",
      "documentId": "user_67890",
      "syncStatus": "failed",
      "conflictResolution": null,
      "zerodbData": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "mongodbData": null,
      "appliedData": null,
      "attemptCount": 3,
      "processingTimeMs": 245,
      "errorMessage": "Network timeout after 3 retries",
      "errorStack": "Error: Network timeout...",
      "timestamp": "2024-02-02T10:25:30.123Z",
      "createdAt": "2024-02-02T10:25:30.123Z",
      "updatedAt": "2024-02-02T10:25:30.123Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "skip": 0
}
```

---

### 4. Start Table Sync

**POST** `/api/sync/start`

Starts syncing a ZeroDB table to MongoDB.

#### Request Body

```json
{
  "tableName": "users",
  "modelName": "User",
  "options": {
    "conflictStrategy": "last-write-wins"
  }
}
```

#### Response Example

```json
{
  "success": true,
  "message": "Started sync for table: users -> model: User",
  "tableName": "users",
  "modelName": "User"
}
```

---

### 5. Stop Table Sync

**POST** `/api/sync/stop`

Stops syncing a specific table.

#### Request Body

```json
{
  "tableName": "users"
}
```

#### Response Example

```json
{
  "success": true,
  "message": "Stopped sync for table: users"
}
```

---

### 6. Reset Metrics

**POST** `/api/sync/metrics/reset`

Resets all sync metrics to zero.

#### Response Example

```json
{
  "success": true,
  "message": "Metrics reset successfully"
}
```

## Conflict Resolution Strategies

### 1. Last-Write-Wins (Default)

Uses timestamps to determine which version is newer. The most recently updated data wins.

```javascript
{
  conflictStrategy: 'last-write-wins'
}
```

### 2. MongoDB Priority

MongoDB data always takes precedence. ZeroDB changes are only applied if there's no conflict.

```javascript
{
  conflictStrategy: 'mongodb-priority'
}
```

### 3. ZeroDB Priority

ZeroDB data always takes precedence. Useful for scenarios where ZeroDB is the source of truth.

```javascript
{
  conflictStrategy: 'zerodb-priority'
}
```

### 4. Custom Merge Strategy

Define custom logic for merging conflicts.

```javascript
await zerodbSyncService.startSync('users', 'User', {
  conflictStrategy: 'custom',
  customMergeStrategy: async (mongoData, zerodbData) => {
    return {
      ...mongoData,
      // Keep MongoDB's internal fields
      _id: mongoData._id,
      createdAt: mongoData.createdAt,

      // Use ZeroDB's business data
      name: zerodbData.name,
      email: zerodbData.email,

      // Custom field-level resolution
      status: zerodbData.updatedAt > mongoData.updatedAt
        ? zerodbData.status
        : mongoData.status
    };
  }
});
```

## Event Processing Flow

### 1. Insert Event

```javascript
{
  event_id: "event_12345",
  timestamp: 1706876400000,
  topic: "table:users",
  event_payload: {
    operation: "insert",
    document_id: "user_67890",
    data: {
      name: "John Doe",
      email: "john@example.com",
      status: "active"
    }
  }
}
```

**Processing:**
- Check if document exists in MongoDB
- If exists: Skip (idempotency)
- If not exists: Insert new document

### 2. Update Event

```javascript
{
  event_id: "event_12346",
  timestamp: 1706876460000,
  topic: "table:users",
  event_payload: {
    operation: "update",
    document_id: "user_67890",
    data: {
      name: "John Doe Updated",
      email: "john.new@example.com",
      status: "active",
      updatedAt: 1706876460000
    }
  }
}
```

**Processing:**
- Fetch current MongoDB document
- If not exists: Create document (treat as insert)
- If exists: Compare timestamps and apply conflict resolution
- Update document if appropriate

### 3. Delete Event

```javascript
{
  event_id: "event_12347",
  timestamp: 1706876500000,
  topic: "table:users",
  event_payload: {
    operation: "delete",
    document_id: "user_67890",
    data: null
  }
}
```

**Processing:**
- Check if document exists in MongoDB
- If exists: Delete document
- If not exists: Skip (idempotency)

## Retry Mechanism

The sync service implements exponential backoff with jitter for retry logic.

### Retryable Errors

- Network timeouts
- Connection resets
- Rate limits (429)
- Service unavailable (502, 503)

### Non-Retryable Errors

- Authentication failures (401)
- Authorization failures (403)
- Not found (404)
- Validation errors (400)
- Duplicate key errors

### Backoff Calculation

```javascript
delay = min(BASE_BACKOFF * 2^retryCount, MAX_BACKOFF) + random_jitter
```

**Example:**
- Attempt 1: ~1000ms
- Attempt 2: ~2000ms
- Attempt 3: ~4000ms
- Attempt 4: ~8000ms (capped at MAX_BACKOFF)

## Monitoring and Alerting

### Health Check Integration

Integrate the health check endpoint with your monitoring system:

```bash
# Curl example
curl http://localhost:3001/api/sync/health

# Using with monitoring tools (e.g., Prometheus, Datadog)
# Configure to alert on:
# - isHealthy: false
# - consecutiveFailures > 5
# - recentErrors > 10
```

### Key Metrics to Monitor

1. **Event Processing Rate**: `eventsProcessed / time`
2. **Success Rate**: `eventsSucceeded / eventsProcessed`
3. **Average Processing Time**: `avgProcessingTimeMs`
4. **Conflict Rate**: `conflictsDetected / eventsProcessed`
5. **Error Rate**: `eventsFailed / eventsProcessed`

### Recommended Alerts

```yaml
alerts:
  - name: "High Sync Failure Rate"
    condition: "eventsFailed / eventsProcessed > 0.05"
    severity: "warning"

  - name: "Sync Service Unhealthy"
    condition: "tables[*].isHealthy == false"
    severity: "critical"

  - name: "High Processing Latency"
    condition: "avgProcessingTimeMs > 1000"
    severity: "warning"

  - name: "High Conflict Rate"
    condition: "conflictsDetected / eventsProcessed > 0.1"
    severity: "info"
```

## Best Practices

### 1. Gradual Rollout

Start with a single, low-traffic table before enabling sync for all tables:

```javascript
// Phase 1: Test with one table
await zerodbSyncService.startSync('test_table', 'TestModel');

// Monitor for 24-48 hours

// Phase 2: Add critical tables
await zerodbSyncService.startSync('users', 'User');
await zerodbSyncService.startSync('companies', 'Company');

// Phase 3: Add remaining tables
```

### 2. Custom Merge Strategies

Use custom merge strategies for complex business logic:

```javascript
zerodbSyncService.registerCustomMergeStrategy('User', async (mongoData, zerodbData) => {
  // Implement business-specific conflict resolution
  return {
    ...mongoData,
    ...zerodbData,
    // Example: Preserve certain MongoDB-managed fields
    internalId: mongoData.internalId,
    createdBy: mongoData.createdBy,
    // Example: Merge arrays instead of replacing
    tags: [...new Set([...mongoData.tags, ...zerodbData.tags])]
  };
});
```

### 3. Monitor Audit Logs

Regularly review failed operations:

```javascript
// Get failed operations from last 24 hours
const failed = await zerodbSyncService.getAuditLogs('users', {
  status: 'failed',
  startDate: new Date(Date.now() - 86400000),
  limit: 1000
});

// Analyze patterns and fix underlying issues
```

### 4. Testing Conflict Resolution

Test your conflict resolution strategy in staging:

```javascript
// 1. Create document in MongoDB
const mongoDoc = await User.create({ name: 'Test', value: 100 });

// 2. Simulate ZeroDB update with different timestamp
const zerodbUpdate = {
  name: 'Test Updated',
  value: 200,
  updatedAt: Date.now() + 5000 // 5 seconds in future
};

// 3. Process event and verify resolution
await zerodbSyncService._handleUpdate('User', mongoDoc._id, zerodbUpdate, 'last-write-wins');

// 4. Verify expected result
const result = await User.findById(mongoDoc._id);
assert(result.name === 'Test Updated'); // ZeroDB won (newer timestamp)
```

## Troubleshooting

### Sync Not Processing Events

**Check:**
1. Is `ZERODB_SYNC_ENABLED=true`?
2. Is sync started for the table?
3. Are there any errors in logs?
4. Is ZeroDB event stream accessible?

```javascript
const health = await zerodbSyncService.getHealthStatus();
console.log(health);
```

### High Failure Rate

**Common causes:**
1. Network connectivity issues
2. ZeroDB API rate limits
3. Invalid data format
4. MongoDB schema validation errors

**Solution:**
Review audit logs for error patterns:

```javascript
const errors = await zerodbSyncService.getAuditLogs('users', {
  status: 'failed',
  limit: 100
});

// Group errors by message
const errorGroups = errors.logs.reduce((acc, log) => {
  const msg = log.errorMessage || 'Unknown';
  acc[msg] = (acc[msg] || 0) + 1;
  return acc;
}, {});

console.log(errorGroups);
```

### Data Inconsistencies

**Verification:**

```javascript
// Use DatabaseAdapter's consistency check
const databaseAdapter = require('./services/databaseAdapter');

const report = await databaseAdapter.validateConsistency('User', {
  createdAt: { $gte: new Date('2024-01-01') }
});

console.log('Discrepancies:', report.discrepancies);
```

## Performance Tuning

### Adjust Polling Interval

```bash
# More frequent polling (higher load)
SYNC_POLL_INTERVAL_MS=1000

# Less frequent polling (lower load)
SYNC_POLL_INTERVAL_MS=30000
```

### Batch Size Optimization

The service processes events in batches. Adjust based on your workload:

```javascript
// In zerodbService.listEvents()
const events = await zerodbService.listEvents(topic, 0, 100); // Batch size: 100
```

### Connection Pooling

Ensure MongoDB connection pool is sized appropriately:

```javascript
mongoose.connect(mongoUri, {
  maxPoolSize: 50, // Adjust based on concurrent sync operations
  minPoolSize: 10
});
```

## Security Considerations

1. **Authentication**: Ensure ZeroDB API key has appropriate permissions
2. **Data Validation**: Validate all incoming ZeroDB data before applying to MongoDB
3. **Audit Trail**: All sync operations are logged for security auditing
4. **Access Control**: Restrict access to sync management endpoints

## Support

For issues or questions:
- GitHub Issues: [Link to repository issues]
- Documentation: [Link to full documentation]
- Email: support@example.com
