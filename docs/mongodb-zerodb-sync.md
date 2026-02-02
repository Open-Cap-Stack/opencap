# MongoDB to ZeroDB Real-Time Synchronization

**GitHub Issue #14: Continuous sync from MongoDB to ZeroDB**

This document explains the MongoDB Change Streams listener service that provides real-time data synchronization from MongoDB to ZeroDB.

## Overview

The MongoDB Change Streams listener service watches MongoDB collections for changes (inserts, updates, deletes) and automatically synchronizes those changes to ZeroDB in real-time. This enables:

- **Real-time data replication** from MongoDB to ZeroDB
- **Fault tolerance** with resume tokens and automatic reconnection
- **Backpressure handling** with configurable batch processing
- **Error recovery** with retry mechanisms and dead letter queue
- **Operational visibility** with comprehensive metrics and health monitoring

## Architecture

```
MongoDB Collections
       |
       | (Change Streams)
       v
Change Stream Listener
       |
       | (Batch Processing)
       v
   Transform Layer
       |
       | (ZeroDB API)
       v
  ZeroDB Tables
```

### Key Components

1. **Change Stream Watcher**: Monitors MongoDB collections using native change streams
2. **Event Batching**: Groups changes for efficient bulk processing
3. **Transform Layer**: Converts MongoDB documents to ZeroDB format
4. **Retry Manager**: Handles transient failures with exponential backoff
5. **Dead Letter Queue**: Captures permanently failed operations
6. **Metrics Collector**: Tracks performance and health metrics

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Enable/disable sync
SYNC_ENABLED=true

# Batch processing
SYNC_BATCH_SIZE=50                    # Number of events per batch
SYNC_BATCH_TIMEOUT_MS=5000            # Max time to wait for batch

# Retry configuration
SYNC_RETRY_ATTEMPTS=3                 # Max retry attempts per operation
SYNC_RETRY_DELAY_MS=1000              # Initial retry delay
SYNC_MAX_RETRY_DELAY_MS=30000         # Max retry delay (exponential backoff)

# Collections to sync (comma-separated, empty = all)
SYNC_COLLECTIONS=users,companies,stakeholders,transactions,documents

# Operation types to sync (comma-separated)
SYNC_OPERATION_TYPES=insert,update,delete,replace

# Resume token persistence
SYNC_RESUME_TOKEN_PERSISTENCE=true
SYNC_RESUME_TOKEN_PATH=./data/change-stream-tokens.json

# Dead letter queue
SYNC_DLQ_PATH=./data/sync-dlq.json
SYNC_MAX_DLQ_SIZE=1000

# Health monitoring
SYNC_HEALTH_CHECK_INTERVAL_MS=60000   # Health check interval
SYNC_RECONNECT_DELAY_MS=5000          # Initial reconnect delay
SYNC_MAX_RECONNECT_DELAY_MS=60000     # Max reconnect delay
```

### Collection Mapping

The service automatically maps MongoDB collections to ZeroDB tables:

| MongoDB Collection | ZeroDB Table |
|-------------------|--------------|
| users | users |
| companies | companies |
| stakeholders | stakeholders |
| investors | investors |
| shareclasses | share_classes |
| transactions | transactions |
| documents | documents |
| financialmetrics | financial_metrics |
| ... | ... |

## Usage

### Starting the Service

The service automatically starts when the application initializes (if `SYNC_ENABLED=true`):

```javascript
// In app.js - already configured
if (process.env.SYNC_ENABLED === 'true') {
  await mongoChangeStreamListener.initialize({
    zerodbToken: process.env.AINATIVE_API_TOKEN
  });
}
```

### Programmatic Control

```javascript
const mongoChangeStreamListener = require('./services/mongoChangeStreamListener');

// Pause sync (stops processing events, but keeps streams open)
mongoChangeStreamListener.pause();

// Resume sync
mongoChangeStreamListener.resume();

// Stop all change streams gracefully
await mongoChangeStreamListener.stopAll();
```

## API Endpoints

### Health Check

**GET** `/health/sync`

Check the sync service health status.

**Response:**
```json
{
  "status": "ok",
  "sync": {
    "isRunning": true,
    "isPaused": false,
    "activeStreams": 6,
    "streamStatuses": {
      "users": "active",
      "companies": "active",
      "transactions": "active"
    },
    "pendingBatches": {
      "users": 0,
      "companies": 0
    },
    "totalPendingEvents": 0,
    "metrics": {
      "totalEvents": 1523,
      "successfulSyncs": 1510,
      "failedSyncs": 13,
      "avgSyncLatency": 45.2,
      "maxSyncLatency": 230
    }
  }
}
```

### Get Sync Metrics

**GET** `/api/v1/admin/sync-metrics`

Retrieve detailed sync metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEvents": 1523,
    "successfulSyncs": 1510,
    "failedSyncs": 13,
    "retriedEvents": 25,
    "deadLetterQueueSize": 3,
    "currentBatchSizes": {
      "users": 0,
      "companies": 2
    },
    "avgSyncLatency": 45.2,
    "maxSyncLatency": 230,
    "lastSyncTimestamp": 1706789123456,
    "streamStatus": {
      "users": "active",
      "companies": "active"
    }
  }
}
```

### Get Dead Letter Queue

**GET** `/api/v1/admin/sync-dlq?limit=100`

Retrieve failed sync operations.

**Query Parameters:**
- `limit` (optional): Maximum number of entries to return (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "collectionName": "users",
      "tableName": "users",
      "change": {
        "operationType": "insert",
        "fullDocument": { "name": "Test User" }
      },
      "error": {
        "message": "Connection timeout",
        "stack": "..."
      },
      "timestamp": 1706789100000,
      "attempts": 3
    }
  ],
  "total": 3
}
```

### Reprocess Dead Letter Queue

**POST** `/api/v1/admin/sync-dlq/reprocess`

Retry failed sync operations from the dead letter queue.

**Request Body:**
```json
{
  "limit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": 7,
    "failed": 3,
    "errors": [
      {
        "collection": "users",
        "error": "Still failing"
      }
    ]
  }
}
```

### Pause Sync

**POST** `/api/v1/admin/sync/pause`

Pause event processing (keeps change streams open).

**Response:**
```json
{
  "success": true,
  "message": "Sync paused successfully"
}
```

### Resume Sync

**POST** `/api/v1/admin/sync/resume`

Resume event processing.

**Response:**
```json
{
  "success": true,
  "message": "Sync resumed successfully"
}
```

## Features

### 1. Automatic Resume on Failure

The service stores resume tokens for each collection, allowing it to resume from the exact point where it left off after:
- Application restart
- Network disconnection
- Database connection loss
- Service crash

Resume tokens are persisted to disk and loaded on initialization.

### 2. Batch Processing

Events are batched for efficiency:
- Reduces API calls to ZeroDB
- Improves throughput
- Configurable batch size and timeout
- Automatic flush on timeout

### 3. Exponential Backoff Retry

Failed operations are retried with exponential backoff:
```
Attempt 1: Wait 1s
Attempt 2: Wait 2s
Attempt 3: Wait 4s
...
Max: Wait 30s (configurable)
```

### 4. Dead Letter Queue

Operations that fail after maximum retries are stored in a dead letter queue:
- Prevents data loss
- Allows manual inspection
- Supports reprocessing via API
- Configurable size limit

### 5. Comprehensive Metrics

The service tracks:
- Total events processed
- Successful/failed syncs
- Retry counts
- Sync latency (average, max)
- Stream health status
- Batch sizes
- Dead letter queue size

### 6. Graceful Shutdown

On SIGTERM or SIGINT:
1. Stop accepting new events
2. Process pending batches
3. Persist resume tokens
4. Close change streams
5. Save dead letter queue

## Data Transformation

MongoDB documents are automatically transformed for ZeroDB:

### ObjectId Conversion
```javascript
// MongoDB
{ _id: ObjectId("507f1f77bcf86cd799439011") }

// ZeroDB
{ _id: "507f1f77bcf86cd799439011" }
```

### Date Conversion
```javascript
// MongoDB
{ createdAt: Date("2024-01-01T00:00:00.000Z") }

// ZeroDB
{ createdAt: "2024-01-01T00:00:00.000Z" }
```

### Nested ObjectIds
```javascript
// MongoDB
{
  companyId: ObjectId("507f1f77bcf86cd799439012"),
  stakeholders: [
    ObjectId("507f1f77bcf86cd799439013"),
    ObjectId("507f1f77bcf86cd799439014")
  ]
}

// ZeroDB
{
  companyId: "507f1f77bcf86cd799439012",
  stakeholders: [
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ]
}
```

## Monitoring and Troubleshooting

### Health Checks

Monitor service health:
```bash
curl http://localhost:3001/health/sync
```

Expected status codes:
- `200`: Service healthy
- `503`: Service degraded or unhealthy

### Metrics Dashboard

View metrics in development mode:
```bash
# Service logs metrics every 60 seconds
npm run dev
```

### Common Issues

#### 1. Change Stream Not Starting

**Symptom:** Stream status shows "failed" or "skipped"

**Causes:**
- Collection doesn't exist
- MongoDB not configured for replica set
- Insufficient permissions

**Solution:**
```bash
# Check if MongoDB is running as replica set
mongo --eval "rs.status()"

# If not, initialize replica set
mongo --eval "rs.initiate()"
```

#### 2. High Dead Letter Queue Size

**Symptom:** Many failed operations accumulating

**Causes:**
- ZeroDB connectivity issues
- Schema mismatches
- Rate limiting

**Solution:**
1. Check ZeroDB connectivity
2. Review DLQ entries: `GET /api/v1/admin/sync-dlq`
3. Fix underlying issues
4. Reprocess DLQ: `POST /api/v1/admin/sync-dlq/reprocess`

#### 3. High Sync Latency

**Symptom:** `avgSyncLatency` > 100ms

**Causes:**
- Network latency
- Large batch sizes
- ZeroDB performance

**Solution:**
1. Reduce `SYNC_BATCH_SIZE`
2. Increase `SYNC_BATCH_TIMEOUT_MS`
3. Check ZeroDB API performance

#### 4. Stream Keeps Reconnecting

**Symptom:** Frequent "reconnected" messages in logs

**Causes:**
- Network instability
- MongoDB connection timeouts
- Resource exhaustion

**Solution:**
1. Check network stability
2. Increase MongoDB connection timeout
3. Monitor system resources

## Performance Tuning

### Batch Size

Optimize based on your workload:

- **High volume, small documents**: Increase batch size (100-200)
- **Low volume, large documents**: Decrease batch size (10-25)
- **Mixed workload**: Use default (50)

### Retry Configuration

Adjust based on failure patterns:

- **Transient failures**: Increase retry attempts
- **Permanent failures**: Decrease retry attempts to fail fast
- **Network issues**: Increase max retry delay

### Collection Filtering

Only sync what you need:

```bash
# Sync only critical collections
SYNC_COLLECTIONS=users,companies,transactions
```

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test tests/services/mongoChangeStreamListener.test.js

# Run with coverage
npm run test:coverage tests/services/mongoChangeStreamListener.test.js
```

## Security Considerations

1. **Token Security**: Store `AINATIVE_API_TOKEN` securely
2. **Admin Endpoints**: Protect `/api/v1/admin/*` with authentication
3. **Resume Tokens**: Secure the resume token file (`./data/change-stream-tokens.json`)
4. **Dead Letter Queue**: May contain sensitive data, secure accordingly

## Migration from Existing Data

For initial data sync, use the migration scripts:

```bash
# One-time bulk migration
node scripts/migrateMongoToZeroDB.js

# Then enable real-time sync
SYNC_ENABLED=true npm start
```

## Related Documentation

- [ZeroDB Service Documentation](./zerodb-service.md)
- [Database Adapter Documentation](./database-adapter.md)
- [Migration Scripts](./migration-scripts.md)
- [GitHub Issue #14](https://github.com/yourusername/opencap/issues/14)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs: `./logs/database-operations.log`
3. Check health endpoints: `/health/sync`
4. Create an issue on GitHub
