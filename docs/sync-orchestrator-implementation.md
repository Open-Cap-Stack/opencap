# Sync Orchestrator Implementation

## Overview

This document describes the implementation of the **Sync Orchestrator Service**, which provides bidirectional synchronization between MongoDB and ZeroDB for the OpenCAP Stack platform.

**GitHub Issue:** #14 - Continuous data sync implementation

## Architecture

### Components

The sync system consists of three main components:

1. **Sync Orchestrator** (`services/syncOrchestrator.js`)
   - Central coordinator for bidirectional sync
   - Manages lifecycle (start, stop, pause, resume)
   - Monitors health and collects metrics
   - Implements circuit breaker pattern
   - Handles graceful shutdown

2. **MongoDB Change Stream Listener** (`services/mongoChangeStreamListener.js`)
   - Monitors MongoDB change streams (MongoDB → ZeroDB)
   - Real-time change detection
   - Batch processing with backpressure handling
   - Dead letter queue for failed syncs
   - Resume token persistence for fault tolerance

3. **ZeroDB Sync Service** (`services/zerodbSyncService.js`)
   - Polls ZeroDB for changes (ZeroDB → MongoDB)
   - Conflict resolution strategies
   - Sync state checkpointing
   - Audit logging
   - Idempotent operations

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Sync Orchestrator                         │
│  - Lifecycle Management                                      │
│  - Health Monitoring                                         │
│  - Circuit Breaker                                           │
│  - Metrics Collection                                        │
└─────────────────────────────────────────────────────────────┘
                    │                      │
        ┌───────────┘                      └───────────┐
        │                                              │
        ▼                                              ▼
┌─────────────────────┐                    ┌─────────────────────┐
│  MongoDB Change      │                    │  ZeroDB Sync        │
│  Stream Listener     │                    │  Service            │
│                      │                    │                      │
│  MongoDB → ZeroDB    │                    │  ZeroDB → MongoDB    │
└─────────────────────┘                    └─────────────────────┘
        │                                              │
        ▼                                              ▼
   ┌─────────┐                                   ┌─────────┐
   │ MongoDB │◄──────────────────────────────────│ ZeroDB  │
   └─────────┘                                   └─────────┘
```

## Features

### 1. Lifecycle Management

- **Start:** Initialize both sync directions
- **Stop:** Gracefully stop sync services and process remaining queue items
- **Pause:** Temporarily pause sync without losing state
- **Resume:** Resume paused sync services
- **Shutdown:** Clean shutdown with queue processing

### 2. Health Monitoring

- Overall sync health status (healthy/degraded/unhealthy)
- Per-direction health assessment
- Connection status for both databases
- Error rate tracking
- Sync lag calculation
- Last successful sync timestamp

### 3. Circuit Breaker Pattern

- Automatic circuit opening after threshold failures
- Configurable failure threshold (default: 5 failures)
- Automatic transition to half-open state after reset time
- Circuit closure after successful sync in half-open state
- Prevents cascading failures

### 4. Error Recovery

- Automatic retry with exponential backoff
- Configurable max retry attempts (default: 3)
- Dead letter queue for permanently failed items
- Resume token persistence for MongoDB change streams
- Sync state checkpointing for ZeroDB sync

### 5. Metrics & Monitoring

- Success/failure rates per direction
- Average sync time
- Queue depths
- Circuit breaker states
- Sync lag (time between change and sync completion)
- Total operations count
- Database performance metrics

### 6. Admin API Endpoints

All endpoints are under `/api/v1/sync`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Overall sync health and status |
| `/health` | GET | Comprehensive health status |
| `/metrics` | GET | Detailed sync metrics |
| `/start` | POST | Start sync services |
| `/stop` | POST | Stop sync services |
| `/pause` | POST | Pause sync temporarily |
| `/resume` | POST | Resume paused sync |
| `/resync/:collection` | POST | Trigger full resync for collection |
| `/queues` | GET | Sync queue depths and pending items |
| `/circuit-breakers` | GET | Circuit breaker status |
| `/change-stream/stats` | GET | Change stream statistics |
| `/change-stream/dead-letter-queue` | GET | Dead letter queue entries |
| `/change-stream/dead-letter-queue/reprocess` | POST | Reprocess DLQ entries |
| `/change-stream/restart/:collection` | POST | Restart change stream |
| `/config` | GET | Current sync configuration |

## Configuration

### Environment Variables

All sync configuration is managed through environment variables in `.env`:

#### Sync Orchestrator Settings

```bash
# Enable/disable sync
ENABLE_SYNC=false

# Sync direction: 'bidirectional', 'mongo-to-zerodb', 'zerodb-to-mongo'
SYNC_DIRECTION=bidirectional

# Performance settings
SYNC_BATCH_SIZE=100
SYNC_INTERVAL_MS=5000
SYNC_MAX_RETRIES=3
SYNC_RETRY_DELAY_MS=1000

# Circuit breaker
SYNC_CIRCUIT_BREAKER_THRESHOLD=5
SYNC_CIRCUIT_BREAKER_RESET_MS=60000

# Health monitoring
SYNC_HEALTH_CHECK_INTERVAL_MS=30000
```

#### MongoDB Change Stream Settings

```bash
# Enable MongoDB change streams
ENABLE_MONGO_CHANGESTREAM=false

# Collections to sync (comma-separated)
SYNC_COLLECTIONS=users,companies,stakeholders,transactions,documents,financialmetrics

# Change stream batch settings
CHANGESTREAM_BATCH_SIZE=100
CHANGESTREAM_MAX_AWAIT_TIME_MS=1000
CHANGESTREAM_FULL_DOCUMENT=updateLookup

# Resume token persistence
SYNC_RESUME_TOKEN_PERSISTENCE=true
SYNC_RESUME_TOKEN_PATH=./data/change-stream-tokens.json

# Dead letter queue
SYNC_DLQ_PATH=./data/sync-dlq.json
SYNC_MAX_DLQ_SIZE=1000

# Reconnection
SYNC_RECONNECT_DELAY_MS=5000
SYNC_MAX_RECONNECT_DELAY_MS=60000
```

#### ZeroDB Sync Settings

```bash
# Enable ZeroDB to MongoDB sync
ZERODB_SYNC_ENABLED=false

# Conflict resolution: 'last-write-wins', 'mongodb-priority', 'zerodb-priority', 'custom'
SYNC_CONFLICT_STRATEGY=last-write-wins

# Polling interval
SYNC_POLL_INTERVAL_MS=5000

# State persistence
SYNC_STATE_COLLECTION=sync_metadata

# Retry and backoff
SYNC_BASE_BACKOFF_MS=1000
SYNC_MAX_BACKOFF_MS=30000
```

#### Database Monitoring

```bash
# Enable database monitoring
ENABLE_DB_MONITORING=false
```

## Usage

### Initialization

The sync orchestrator is automatically initialized in `app.js` when ZeroDB is enabled:

```javascript
const syncOrchestrator = require('./services/syncOrchestrator');
const mongoChangeStreamListener = require('./services/mongoChangeStreamListener');
const zerodbSyncService = require('./services/zerodbSyncService');

// Initialize sync orchestrator
if (process.env.ENABLE_SYNC === 'true') {
  await syncOrchestrator.initialize({
    mongoChangeStreamListener,
    zerodbSyncService,
  });

  // Start sync services
  await syncOrchestrator.start();
}
```

### Starting Sync

```bash
# Via API
curl -X POST http://localhost:3001/api/v1/sync/start

# Response
{
  "success": true,
  "data": {
    "status": "running",
    "mongoToZerodb": true,
    "zerodbToMongo": true
  },
  "message": "Sync services started successfully"
}
```

### Checking Status

```bash
# Via API
curl http://localhost:3001/api/v1/sync/status

# Response
{
  "success": true,
  "data": {
    "orchestrator": {
      "status": "running",
      "enabled": true,
      "direction": "bidirectional",
      "uptime": 3600
    },
    "mongoToZerodb": {
      "enabled": true,
      "healthy": true,
      "lastSync": "2026-02-02T00:30:00.000Z",
      "errorCount": 2,
      "successCount": 1500,
      "queueDepth": 5,
      "syncLag": 250,
      "circuitBreaker": {
        "state": "closed",
        "failures": 0
      }
    },
    "zerodbToMongo": {
      "enabled": true,
      "healthy": true,
      "lastSync": "2026-02-02T00:30:05.000Z",
      "errorCount": 1,
      "successCount": 800,
      "queueDepth": 2,
      "syncLag": 180,
      "circuitBreaker": {
        "state": "closed",
        "failures": 0
      }
    },
    "connections": {
      "mongodb": true,
      "zerodb": true
    }
  }
}
```

### Triggering Full Resync

```bash
# Via API
curl -X POST http://localhost:3001/api/v1/sync/resync/users \
  -H "Content-Type: application/json" \
  -d '{"direction": "mongo-to-zerodb"}'

# Response
{
  "success": true,
  "data": {
    "status": "completed",
    "collection": "users",
    "direction": "mongo-to-zerodb",
    "result": {
      "syncedCount": 1500,
      "errorCount": 0,
      "total": 1500
    }
  },
  "message": "Resync completed for collection: users"
}
```

### Monitoring Metrics

```bash
# Via API
curl http://localhost:3001/api/v1/sync/metrics

# Response
{
  "success": true,
  "data": {
    "mongoToZerodb": {
      "successRate": 99.87,
      "errorRate": 0.13,
      "averageSyncTime": 45.2,
      "totalSynced": 1500,
      "totalErrors": 2,
      "lastSync": "2026-02-02T00:30:00.000Z"
    },
    "zerodbToMongo": {
      "successRate": 99.88,
      "errorRate": 0.12,
      "averageSyncTime": 38.5,
      "totalSynced": 800,
      "totalErrors": 1,
      "lastSync": "2026-02-02T00:30:05.000Z"
    },
    "database": {
      "mongodb": {
        "averageResponseTime": 12.5,
        "errorRate": 0.05
      },
      "zerodb": {
        "averageResponseTime": 18.3,
        "errorRate": 0.08
      }
    }
  }
}
```

## Testing

Comprehensive test suite is provided in `/tests/services/syncOrchestrator.test.js`:

```bash
# Run sync orchestrator tests
npm test tests/services/syncOrchestrator.test.js

# Run with coverage
npm test -- --coverage tests/services/syncOrchestrator.test.js
```

### Test Coverage

- Initialization and configuration
- Lifecycle management (start, stop, pause, resume)
- Health monitoring and metrics
- Circuit breaker functionality
- Error recovery and retry logic
- Full collection resync
- Graceful shutdown
- Metrics calculation

## Production Considerations

### Performance

1. **Batch Size:** Adjust `SYNC_BATCH_SIZE` based on your data volume
   - Larger batches = better throughput, higher latency
   - Smaller batches = lower latency, more overhead
   - Recommended: 50-200 for most use cases

2. **Sync Interval:** Configure `SYNC_INTERVAL_MS` based on real-time requirements
   - Lower values = more real-time, higher load
   - Higher values = less real-time, lower load
   - Recommended: 3000-10000ms

3. **Collections:** Sync only necessary collections via `SYNC_COLLECTIONS`
   - Reduces overhead
   - Improves performance
   - Easier monitoring

### Reliability

1. **Circuit Breaker:** Tune threshold and reset time
   - Lower threshold = more sensitive, may trigger falsely
   - Higher threshold = less sensitive, may allow cascading failures
   - Recommended: 5-10 failures, 60000ms reset

2. **Retries:** Configure max retries and backoff
   - More retries = better recovery, longer delays
   - Fewer retries = faster failure detection
   - Recommended: 3 retries with exponential backoff

3. **Dead Letter Queue:** Monitor and reprocess regularly
   - Set up alerts for DLQ growth
   - Regular manual review
   - Automated reprocessing during off-peak hours

### Monitoring

1. **Health Checks:** Monitor `/api/v1/sync/health` endpoint
   - Set up alerts for degraded/unhealthy status
   - Track error rates
   - Monitor sync lag

2. **Metrics:** Collect metrics via `/api/v1/sync/metrics`
   - Send to monitoring system (Prometheus, Datadog, etc.)
   - Set up dashboards
   - Define SLOs (e.g., 99.9% success rate)

3. **Circuit Breakers:** Monitor breaker states
   - Alert on open circuit breakers
   - Track failure counts
   - Analyze patterns

### Scaling

1. **Horizontal Scaling:**
   - Run multiple instances with different collection sets
   - Use collection-based sharding
   - Coordinate via distributed locks

2. **Vertical Scaling:**
   - Increase batch sizes
   - Reduce sync intervals
   - Allocate more resources to sync services

## Troubleshooting

### Sync Not Starting

1. Check configuration: `ENABLE_SYNC=true`
2. Verify database connections
3. Check logs for initialization errors
4. Ensure required services are available

### High Error Rate

1. Check circuit breaker state
2. Review dead letter queue
3. Verify network connectivity
4. Check database performance
5. Review error logs

### High Sync Lag

1. Increase batch size
2. Reduce sync interval
3. Check database performance
4. Scale horizontally
5. Optimize queries

### Circuit Breaker Keeps Opening

1. Investigate root cause of failures
2. Increase threshold if false positives
3. Check database health
4. Review network stability
5. Analyze error patterns

## Future Enhancements

1. **Webhook Support:** Add webhook-based sync for ZeroDB → MongoDB
2. **Conflict Resolution UI:** Admin interface for manual conflict resolution
3. **Sync Analytics:** Advanced analytics and reporting
4. **Multi-Region Sync:** Cross-region replication
5. **Schema Validation:** Automatic schema validation and migration
6. **Performance Optimization:** Query optimization and caching
7. **Observability:** Enhanced tracing and debugging tools

## Related Files

- `/services/syncOrchestrator.js` - Main orchestrator service
- `/services/mongoChangeStreamListener.js` - MongoDB change stream listener
- `/services/zerodbSyncService.js` - ZeroDB sync service
- `/routes/v1/syncAdminRoutes.js` - Admin API routes
- `/tests/services/syncOrchestrator.test.js` - Test suite
- `/middleware/databaseMonitor.js` - Database monitoring
- `/utils/metricsCollector.js` - Metrics collection
- `.env.example` - Configuration template

## References

- GitHub Issue #14: Continuous data sync implementation
- MongoDB Change Streams Documentation
- ZeroDB API Documentation
- Circuit Breaker Pattern
- Event-Driven Architecture Best Practices
