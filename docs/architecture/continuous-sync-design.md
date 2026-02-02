# Continuous Bidirectional Data Synchronization Architecture
# MongoDB ↔ ZeroDB for OpenCap Stack Platform

**Version:** 1.0
**Date:** 2026-02-02
**Status:** Design Document
**Issue:** GitHub Issue #14 - Phase 3 Implementation

---

## Executive Summary

This document defines the architecture for continuous bidirectional data synchronization between MongoDB and ZeroDB for the OpenCap Stack platform. The system ensures real-time data consistency across both databases while maintaining high availability, fault tolerance, and minimal latency.

### Key Architectural Decisions

1. **Change Detection:** MongoDB Change Streams for real-time MongoDB updates; Event polling for ZeroDB updates
2. **Conflict Resolution:** Last-Write-Wins (LWW) with timestamp-based versioning and optional custom resolvers
3. **Sync Pattern:** Event-driven architecture with queue-based processing
4. **Error Handling:** Exponential backoff retry with dead letter queue for failed operations
5. **Performance:** Batch processing with adaptive throttling based on system load

### Success Metrics

- Sync latency: < 500ms (p95)
- Data consistency: 99.99% within 1 second
- System availability: 99.9%
- Error rate: < 0.1%

---

## Table of Contents

1. [Requirements Analysis](#1-requirements-analysis)
2. [System Architecture](#2-system-architecture)
3. [Component Design](#3-component-design)
4. [Data Flow](#4-data-flow)
5. [Conflict Resolution](#5-conflict-resolution)
6. [Error Handling](#6-error-handling)
7. [Monitoring & Observability](#7-monitoring--observability)
8. [Technology Stack](#8-technology-stack)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Requirements Analysis

### 1.1 Functional Requirements

#### FR-1: Real-Time Change Detection
- Detect all INSERT, UPDATE, DELETE operations in MongoDB within 100ms
- Detect ZeroDB updates through periodic polling (configurable interval: 1-5 seconds)
- Support for all data models: Users, Companies, Stakeholders, Transactions, Documents, etc.

#### FR-2: Bidirectional Synchronization
- MongoDB → ZeroDB: All CRUD operations must sync to ZeroDB
- ZeroDB → MongoDB: All ZeroDB updates must sync back to MongoDB
- Support for partial updates (field-level granularity)

#### FR-3: Conflict Resolution
- Detect conflicts when same record is modified in both databases
- Apply Last-Write-Wins (LWW) strategy based on `updatedAt` timestamp
- Maintain audit trail of all conflicts and resolutions
- Support for custom conflict resolution policies per model

#### FR-4: Idempotency
- All sync operations must be idempotent
- Handle duplicate events gracefully
- Prevent infinite sync loops between databases

#### FR-5: Data Consistency Validation
- Periodic consistency checks (configurable: hourly/daily)
- Detect and report data drift
- Automatic reconciliation for detected inconsistencies

### 1.2 Non-Functional Requirements

#### NFR-1: Performance
- Sync latency p50: < 200ms
- Sync latency p95: < 500ms
- Sync latency p99: < 1000ms
- Throughput: Handle 1000+ operations/second

#### NFR-2: Scalability
- Horizontal scaling for sync workers
- Queue-based architecture for load distribution
- Support for 10M+ documents per collection

#### NFR-3: Reliability
- Zero data loss during sync failures
- Automatic retry with exponential backoff
- Dead letter queue for unrecoverable errors
- System uptime: 99.9%

#### NFR-4: Security
- Encrypted data in transit (TLS 1.3)
- Audit logging for all sync operations
- Access control for sync management endpoints
- PII handling compliance

#### NFR-5: Maintainability
- Modular service architecture
- Comprehensive logging and tracing
- Health check endpoints
- Circuit breaker patterns for fault isolation

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         OpenCap Application Layer                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │             Express.js REST API + Controllers                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────┬─────────────────────────┘
                        │                       │
                        ▼                       ▼
        ┌──────────────────────────┐  ┌──────────────────────────┐
        │   Database Adapter       │  │   Sync Orchestrator      │
        │   (Existing Service)     │  │   (New Service)          │
        └────────┬─────────────────┘  └──────────┬───────────────┘
                 │                               │
                 │                               │
        ┌────────▼─────────┐          ┌─────────▼─────────────┐
        │                  │          │                        │
        │    MongoDB       │◄─────────┤   Change Stream       │
        │    (Source 1)    │  Watch   │   Listener            │
        │                  │          │   (New Component)     │
        └────────┬─────────┘          └─────────┬─────────────┘
                 │                              │
                 │                              │
                 │                    ┌─────────▼─────────────┐
                 │                    │                        │
                 │                    │   Sync Event Queue    │
                 │                    │   (In-Memory/Redis)   │
                 │                    │                        │
                 │                    └─────────┬─────────────┘
                 │                              │
                 │                    ┌─────────▼─────────────┐
                 │                    │                        │
                 │                    │   Sync Worker Pool    │
                 │                    │   (New Component)     │
                 │                    │                        │
                 │                    └─────────┬─────────────┘
                 │                              │
                 │                    ┌─────────▼─────────────┐
                 │                    │                        │
                 │                    │   Conflict Resolver   │
                 │                    │   (New Component)     │
                 │                    │                        │
                 │                    └─────────┬─────────────┘
                 │                              │
        ┌────────▼─────────┐          ┌─────────▼─────────────┐
        │                  │          │                        │
        │    ZeroDB        │◄─────────┤   ZeroDB Poller       │
        │    (Source 2)    │  Poll    │   (New Component)     │
        │                  │          │                        │
        └──────────────────┘          └───────────────────────┘

                        ┌─────────────────────────┐
                        │                         │
                        │  Database Monitor       │
                        │  (Existing + Enhanced)  │
                        │                         │
                        └─────────────────────────┘
```

### 2.2 Core Components

#### 2.2.1 Change Stream Listener
- **Purpose:** Capture real-time MongoDB changes
- **Technology:** MongoDB Change Streams API
- **Responsibilities:**
  - Watch all collections for INSERT, UPDATE, DELETE, REPLACE operations
  - Transform MongoDB change events into sync events
  - Enqueue sync events for processing
  - Handle resume tokens for fault recovery

#### 2.2.2 ZeroDB Poller
- **Purpose:** Detect changes made directly to ZeroDB
- **Technology:** Polling + ZeroDB Event Streams (if available)
- **Responsibilities:**
  - Poll ZeroDB tables for updates at configurable intervals
  - Track last sync timestamp per table
  - Detect new/updated/deleted records
  - Enqueue sync events for reverse synchronization

#### 2.2.3 Sync Event Queue
- **Purpose:** Decouple event producers from processors
- **Technology:** In-memory queue (Node.js) with Redis fallback for production
- **Responsibilities:**
  - Queue sync events with priority levels
  - Support FIFO ordering per entity
  - Provide retry queue for failed operations
  - Dead letter queue for unrecoverable errors

#### 2.2.4 Sync Worker Pool
- **Purpose:** Process sync events and apply changes
- **Technology:** Node.js worker threads or cluster
- **Responsibilities:**
  - Process events from sync queue
  - Apply changes to target database
  - Handle retries with exponential backoff
  - Report metrics and errors

#### 2.2.5 Conflict Resolver
- **Purpose:** Detect and resolve data conflicts
- **Technology:** Custom conflict resolution engine
- **Responsibilities:**
  - Detect concurrent modifications
  - Apply conflict resolution strategy (LWW)
  - Log conflicts for audit trail
  - Support pluggable resolution policies

#### 2.2.6 Sync Orchestrator
- **Purpose:** Coordinate all sync components
- **Technology:** Node.js service
- **Responsibilities:**
  - Start/stop sync components
  - Health checks and monitoring
  - Configuration management
  - Graceful shutdown handling

---

## 3. Component Design

### 3.1 Change Stream Listener Service

#### File: `/services/syncChangeStreamListener.js`

```javascript
/**
 * MongoDB Change Stream Listener
 * Captures real-time changes from MongoDB and enqueues sync events
 */

class ChangeStreamListener {
  constructor(syncQueue, databaseMonitor) {
    this.syncQueue = syncQueue;
    this.monitor = databaseMonitor;
    this.changeStreams = new Map();
    this.resumeTokens = new Map();
    this.enabled = false;
  }

  // Core methods:
  // - initialize(): Setup change streams for all collections
  // - watchCollection(collectionName): Create change stream for collection
  // - handleChange(changeEvent): Process change event
  // - enqueueSync(syncEvent): Add to sync queue
  // - handleError(error): Error recovery
  // - shutdown(): Graceful shutdown with resume token persistence
}
```

**Key Features:**
- Resume token persistence for fault recovery
- Full document lookups for UPDATE operations
- Event filtering to ignore sync-generated changes
- Backpressure handling when queue is full

#### Data Flow:
```
MongoDB Change → Transform to Sync Event → Enqueue → Worker Processing
```

#### Sync Event Schema:
```javascript
{
  eventId: 'uuid-v4',
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'REPLACE',
  sourceDatabase: 'mongodb',
  targetDatabase: 'zerodb',
  collection: 'users',
  tableName: 'users',
  documentId: '_id or userId',
  fullDocument: { /* complete document */ },
  updateDescription: { /* for updates only */ },
  timestamp: new Date(),
  metadata: {
    operationType: 'mongo-changestream',
    resumeToken: 'token',
    clusterTime: Timestamp
  }
}
```

---

### 3.2 ZeroDB Poller Service

#### File: `/services/syncZeroDBPoller.js`

```javascript
/**
 * ZeroDB Poller
 * Detects changes in ZeroDB and enqueues reverse sync events
 */

class ZeroDBPoller {
  constructor(syncQueue, zerodbService, databaseMonitor) {
    this.syncQueue = syncQueue;
    this.zerodb = zerodbService;
    this.monitor = databaseMonitor;
    this.pollInterval = 2000; // 2 seconds
    this.lastSyncTimestamps = new Map();
    this.running = false;
  }

  // Core methods:
  // - start(): Begin polling loop
  // - stop(): Stop polling
  // - pollTable(tableName): Check for updates in table
  // - detectChanges(oldSnapshot, newSnapshot): Diff algorithm
  // - enqueueReverseSync(syncEvent): Queue MongoDB update
  // - updateLastSyncTimestamp(tableName, timestamp)
}
```

**Key Features:**
- Incremental polling using `updatedAt` timestamps
- Batch detection for efficient API usage
- Change detection using timestamp comparison
- Configurable polling intervals per table

#### Polling Strategy:
```sql
-- Query pattern for detecting changes
SELECT * FROM table_name
WHERE updatedAt > :lastSyncTimestamp
ORDER BY updatedAt ASC
LIMIT 100
```

---

### 3.3 Sync Queue Manager

#### File: `/services/syncQueue.js`

```javascript
/**
 * Sync Event Queue Manager
 * Manages event queuing, prioritization, and retry logic
 */

class SyncQueue {
  constructor(options = {}) {
    this.mainQueue = [];        // Primary event queue
    this.retryQueue = [];       // Failed events with retry
    this.dlq = [];              // Dead letter queue
    this.processing = new Set(); // Currently processing events
    this.maxRetries = 5;
    this.retryDelays = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
  }

  // Core methods:
  // - enqueue(event, priority): Add event to queue
  // - dequeue(): Get next event to process
  // - markProcessing(eventId): Track in-flight events
  // - markComplete(eventId): Remove from processing
  // - markFailed(eventId, error): Move to retry queue
  // - processRetryQueue(): Retry failed events
  // - moveToDLQ(event): Move to dead letter queue
  // - getQueueStats(): Return queue metrics
}
```

**Queue Priorities:**
1. **HIGH:** DELETE operations (prevent data loss)
2. **MEDIUM:** UPDATE operations
3. **LOW:** INSERT operations

**Event Deduplication:**
- Track processed events by `eventId` (last 10,000)
- Use bloom filter for efficient duplicate detection

---

### 3.4 Sync Worker Pool

#### File: `/services/syncWorkerPool.js`

```javascript
/**
 * Sync Worker Pool
 * Processes sync events and applies changes to target database
 */

class SyncWorkerPool {
  constructor(workerCount, syncQueue, conflictResolver, options) {
    this.workerCount = workerCount;
    this.syncQueue = syncQueue;
    this.conflictResolver = conflictResolver;
    this.workers = [];
    this.running = false;
  }

  // Core methods:
  // - start(): Initialize workers
  // - stop(): Gracefully stop all workers
  // - createWorker(workerId): Create individual worker
  // - processEvent(event): Main event processing logic
  // - applyChange(event): Apply change to target database
  // - handleSuccess(event): Success callback
  // - handleFailure(event, error): Failure callback with retry
}

class SyncWorker {
  async processEvent(event) {
    // 1. Validate event
    // 2. Check for conflicts
    // 3. Transform data for target database
    // 4. Apply change using appropriate service
    // 5. Update sync metadata
    // 6. Report metrics
  }
}
```

**Processing Flow:**
```
Dequeue Event → Validate → Check Conflicts → Transform Data →
Apply to Target → Update Metadata → Mark Complete
```

---

### 3.5 Conflict Resolver

#### File: `/services/syncConflictResolver.js`

```javascript
/**
 * Conflict Resolution Engine
 * Detects and resolves data conflicts using configurable strategies
 */

class ConflictResolver {
  constructor(conflictRepository, options = {}) {
    this.repository = conflictRepository;
    this.strategy = options.strategy || 'last-write-wins';
    this.customResolvers = new Map(); // Per-model resolvers
  }

  // Core methods:
  // - detectConflict(event, currentData): Check for conflicts
  // - resolveConflict(conflict): Apply resolution strategy
  // - lastWriteWins(sourceDoc, targetDoc): LWW implementation
  // - mergeFields(sourceDoc, targetDoc): Field-level merge
  // - logConflict(conflict): Audit trail
  // - registerCustomResolver(modelName, resolverFn)
}
```

**Conflict Detection:**
```javascript
// Conflict occurs when:
1. Target document has updatedAt > source updatedAt
2. Target document version > source version
3. Custom conflict detector returns true
```

**Resolution Strategies:**

1. **Last-Write-Wins (Default):**
   - Compare `updatedAt` timestamps
   - Apply change from most recent update
   - Log conflict in audit trail

2. **Source-Wins:**
   - Always prefer source database
   - Used for specific models (e.g., User authentication data)

3. **Target-Wins:**
   - Always prefer target database
   - Used for ZeroDB analytics-generated data

4. **Custom Merge:**
   - Field-level merge logic
   - Used for complex objects (e.g., nested documents)

---

### 3.6 Sync Orchestrator

#### File: `/services/syncOrchestrator.js`

```javascript
/**
 * Sync Orchestrator
 * Coordinates all sync components and manages lifecycle
 */

class SyncOrchestrator {
  constructor(dependencies) {
    this.changeStreamListener = dependencies.changeStreamListener;
    this.zerodbPoller = dependencies.zerodbPoller;
    this.syncQueue = dependencies.syncQueue;
    this.workerPool = dependencies.workerPool;
    this.monitor = dependencies.databaseMonitor;
    this.status = 'stopped';
  }

  // Core methods:
  // - initialize(): Setup all components
  // - start(): Start synchronization
  // - stop(): Graceful shutdown
  // - pause(): Temporarily pause sync
  // - resume(): Resume paused sync
  // - getStatus(): Return system status
  // - healthCheck(): Verify all components are healthy
}
```

---

## 4. Data Flow

### 4.1 MongoDB → ZeroDB Synchronization

```
┌────────────────────────────────────────────────────────────────────┐
│ Step 1: Change Detection                                           │
│ User Action → MongoDB UPDATE → Change Stream Event                 │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 2: Event Transformation                                       │
│ Change Stream Listener transforms MongoDB event to Sync Event     │
│ - Extract collection name, documentId, fullDocument               │
│ - Add metadata (timestamp, operation type)                         │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 3: Event Queuing                                              │
│ Sync Event → Sync Queue (with priority and deduplication)         │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 4: Worker Processing                                          │
│ Worker dequeues event → Validates → Checks for conflicts          │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 5: Conflict Resolution (if needed)                           │
│ Conflict Resolver applies LWW strategy                            │
│ - Compare timestamps: MongoDB vs ZeroDB                           │
│ - Log conflict                                                     │
│ - Proceed with winning version                                    │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 6: Data Transformation                                        │
│ Transform MongoDB document to ZeroDB row format                   │
│ - Map _id to primary key                                          │
│ - Convert dates to ISO strings                                    │
│ - Flatten nested objects if needed                                │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 7: Apply to ZeroDB                                            │
│ Worker calls zerodbService.updateRows() or insertRows()           │
│ - Add sync metadata (_syncedAt, _syncSource: 'mongodb')          │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 8: Success/Failure Handling                                   │
│ Success: Mark event complete, update metrics                      │
│ Failure: Retry with exponential backoff or move to DLQ           │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 ZeroDB → MongoDB Synchronization

```
┌────────────────────────────────────────────────────────────────────┐
│ Step 1: Polling                                                    │
│ ZeroDB Poller queries tables for records with                     │
│ updatedAt > lastSyncTimestamp                                      │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 2: Change Detection                                           │
│ Compare fetched records with last known state                     │
│ - Detect NEW records (not in MongoDB)                             │
│ - Detect UPDATED records (updatedAt changed)                      │
│ - Detect DELETED records (missing from ZeroDB)                    │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 3: Event Creation                                             │
│ Create Sync Events for detected changes                           │
│ - sourceDatabase: 'zerodb'                                         │
│ - targetDatabase: 'mongodb'                                        │
└────────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────────┐
│ Step 4: Queue and Process                                          │
│ Same as MongoDB → ZeroDB flow (steps 3-8)                         │
│ - Enqueue → Worker Processing → Conflict Resolution →            │
│   Transform → Apply to MongoDB → Handle Result                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. Conflict Resolution

### 5.1 Conflict Detection Algorithm

```javascript
/**
 * Detect if a conflict exists
 */
function detectConflict(syncEvent, currentTargetDocument) {
  // No conflict if target document doesn't exist
  if (!currentTargetDocument) {
    return { hasConflict: false };
  }

  const sourceTimestamp = new Date(syncEvent.fullDocument.updatedAt);
  const targetTimestamp = new Date(currentTargetDocument.updatedAt);

  // Conflict if target was modified after source
  if (targetTimestamp > sourceTimestamp) {
    return {
      hasConflict: true,
      conflictType: 'CONCURRENT_MODIFICATION',
      sourceTimestamp,
      targetTimestamp,
      timeDifference: targetTimestamp - sourceTimestamp
    };
  }

  // No conflict - source is newer
  return { hasConflict: false };
}
```

### 5.2 Last-Write-Wins Resolution

```javascript
/**
 * Resolve conflict using Last-Write-Wins strategy
 */
function resolveLastWriteWins(conflict, syncEvent, targetDocument) {
  // Apply the change with the most recent timestamp
  if (syncEvent.fullDocument.updatedAt >= targetDocument.updatedAt) {
    return {
      resolution: 'APPLY_SOURCE',
      winner: 'source',
      dataToApply: syncEvent.fullDocument
    };
  } else {
    return {
      resolution: 'KEEP_TARGET',
      winner: 'target',
      dataToApply: null  // Don't apply source change
    };
  }
}
```

### 5.3 Conflict Audit Trail

All conflicts are logged to a dedicated collection/table:

```javascript
// MongoDB: conflicts collection
{
  conflictId: 'uuid',
  timestamp: new Date(),
  collection: 'users',
  documentId: 'user123',
  conflictType: 'CONCURRENT_MODIFICATION',
  sourceDatabase: 'mongodb',
  targetDatabase: 'zerodb',
  sourceDocument: { /* snapshot */ },
  targetDocument: { /* snapshot */ },
  resolution: 'APPLY_SOURCE',
  winner: 'source',
  timeDifference: 1500, // ms
  resolvedBy: 'last-write-wins'
}
```

### 5.4 Custom Conflict Resolvers

Per-model custom resolution logic:

```javascript
// Example: User model - prefer MongoDB for auth fields
syncOrchestrator.conflictResolver.registerCustomResolver('User', (conflict) => {
  const merged = {
    ...conflict.targetDocument,
    // Always use MongoDB values for auth fields
    password: conflict.sourceDocument.password,
    passwordResetToken: conflict.sourceDocument.passwordResetToken,
    passwordResetExpires: conflict.sourceDocument.passwordResetExpires,
    // Use target (ZeroDB) for analytics fields
    lastLogin: conflict.targetDocument.lastLogin || conflict.sourceDocument.lastLogin
  };

  return {
    resolution: 'CUSTOM_MERGE',
    dataToApply: merged
  };
});
```

---

## 6. Error Handling

### 6.1 Error Classification

| Error Type | Severity | Retry Strategy | Action |
|------------|----------|----------------|--------|
| Network timeout | Transient | Exponential backoff (5 retries) | Retry |
| Rate limit (429) | Transient | Adaptive backoff | Wait and retry |
| Validation error (400) | Permanent | No retry | Move to DLQ |
| Auth error (401/403) | Permanent | No retry | Alert + DLQ |
| Not found (404) | Contextual | No retry for DELETE, retry for UPDATE | Handle gracefully |
| Server error (500) | Transient | Exponential backoff (3 retries) | Retry |
| Conflict (409) | Contextual | Apply conflict resolution | Resolve |

### 6.2 Retry Mechanism

```javascript
class RetryHandler {
  constructor() {
    this.maxRetries = 5;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 30000;  // 30 seconds
  }

  async executeWithRetry(operation, eventId, retryCount = 0) {
    try {
      return await operation();
    } catch (error) {
      if (!this.shouldRetry(error) || retryCount >= this.maxRetries) {
        throw error; // Move to DLQ
      }

      const delay = this.calculateDelay(retryCount);
      console.log(`Retry ${retryCount + 1}/${this.maxRetries} for event ${eventId} after ${delay}ms`);

      await this.sleep(delay);
      return this.executeWithRetry(operation, eventId, retryCount + 1);
    }
  }

  calculateDelay(retryCount) {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, retryCount),
      this.maxDelay
    );
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.floor(exponentialDelay + jitter);
  }

  shouldRetry(error) {
    const retryableErrors = [
      'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND',
      'NetworkError', 'TimeoutError'
    ];

    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];

    return (
      retryableErrors.includes(error.code) ||
      retryableStatusCodes.includes(error.response?.status)
    );
  }
}
```

### 6.3 Dead Letter Queue (DLQ)

Events that fail after all retries are moved to DLQ:

```javascript
// DLQ entry structure
{
  dlqId: 'uuid',
  originalEvent: { /* full sync event */ },
  failureReason: 'Validation error: email format invalid',
  errorStack: '...',
  retryCount: 5,
  firstFailedAt: new Date('2026-02-02T10:00:00Z'),
  movedToDLQAt: new Date('2026-02-02T10:05:30Z'),
  requiresManualIntervention: true
}
```

**DLQ Processing:**
- Manual review via admin dashboard
- Replay capability after fixing data/code issues
- Bulk reprocess with filtering
- Automatic alerts for DLQ threshold breach

### 6.4 Circuit Breaker Pattern

Prevent cascading failures:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.lastFailureTime = null;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
}
```

---

## 7. Monitoring & Observability

### 7.1 Metrics Collection

**Real-time Metrics:**
- Sync latency (p50, p95, p99)
- Throughput (events/second)
- Queue depth (main queue, retry queue, DLQ)
- Error rate by error type
- Conflict rate by collection
- Worker utilization
- Database response times

**Implementation:**
```javascript
// Enhanced metricsCollector.js
class SyncMetricsCollector {
  recordSyncEvent(event, duration, success, error = null) {
    this.metrics.sync.totalEvents++;
    this.metrics.sync.latencies.push(duration);

    if (success) {
      this.metrics.sync.successCount++;
    } else {
      this.metrics.sync.errorCount++;
      this.recordError(event, error);
    }

    // Update per-collection metrics
    const collection = event.collection;
    if (!this.metrics.byCollection[collection]) {
      this.metrics.byCollection[collection] = {
        events: 0, errors: 0, avgLatency: 0
      };
    }
    this.metrics.byCollection[collection].events++;
  }

  getMetricsSummary() {
    return {
      sync: {
        totalEvents: this.metrics.sync.totalEvents,
        successRate: this.calculateSuccessRate(),
        avgLatency: this.calculateAverage(this.metrics.sync.latencies),
        p95Latency: this.calculatePercentile(this.metrics.sync.latencies, 0.95),
        p99Latency: this.calculatePercentile(this.metrics.sync.latencies, 0.99),
        queueDepth: this.syncQueue.getQueueStats().mainQueue.length,
        dlqDepth: this.syncQueue.getQueueStats().dlq.length
      },
      byCollection: this.metrics.byCollection
    };
  }
}
```

### 7.2 Health Check Endpoint

```javascript
// GET /api/v1/admin/sync-health
{
  "status": "healthy",
  "timestamp": "2026-02-02T12:00:00Z",
  "components": {
    "changeStreamListener": {
      "status": "running",
      "activeStreams": 7,
      "lastEvent": "2026-02-02T11:59:58Z"
    },
    "zerodbPoller": {
      "status": "running",
      "pollInterval": 2000,
      "lastPoll": "2026-02-02T11:59:59Z"
    },
    "syncQueue": {
      "status": "healthy",
      "mainQueue": 12,
      "retryQueue": 3,
      "dlq": 0
    },
    "workerPool": {
      "status": "running",
      "activeWorkers": 4,
      "processingEvents": 4
    }
  },
  "metrics": {
    "last1min": {
      "eventsProcessed": 145,
      "avgLatency": 187,
      "errorRate": 0.02
    }
  }
}
```

### 7.3 Logging Strategy

**Structured Logging with Correlation IDs:**
```javascript
// All sync operations use consistent logging format
logger.info('Sync event processing started', {
  correlationId: event.eventId,
  eventType: event.eventType,
  collection: event.collection,
  documentId: event.documentId,
  sourceDatabase: event.sourceDatabase,
  targetDatabase: event.targetDatabase
});

logger.error('Sync event failed', {
  correlationId: event.eventId,
  error: error.message,
  errorCode: error.code,
  retryCount: event.retryCount,
  willRetry: shouldRetry
});
```

### 7.4 Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High sync latency | p95 > 1000ms for 5min | Warning | Investigate performance |
| Sync errors spike | Error rate > 5% for 5min | Critical | Check logs, databases |
| DLQ threshold | DLQ > 100 events | Warning | Manual review needed |
| Queue backlog | Main queue > 1000 for 10min | Warning | Scale workers |
| Component down | Health check fails | Critical | Restart service |
| Conflict rate high | Conflicts > 10% for 10min | Warning | Review conflict patterns |

---

## 8. Technology Stack

### 8.1 Core Technologies

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Change Detection | MongoDB Change Streams | Native, real-time, resume token support |
| Queue | In-memory (Bull for Redis) | Low latency, reliable, persistent option available |
| Worker Pool | Node.js (cluster/worker_threads) | Leverages existing stack, good concurrency |
| Conflict Resolution | Custom JavaScript engine | Flexible, extensible, business-logic aware |
| Monitoring | Existing databaseMonitor.js | Integrated with current monitoring |
| Logging | Winston | Structured logging, multiple transports |

### 8.2 Dependencies

**New NPM Packages:**
```json
{
  "bull": "^4.10.4",          // Redis-based queue (optional)
  "uuid": "^9.0.0",           // Event ID generation
  "lodash": "^4.17.21",       // Utility functions
  "async-retry": "^1.3.3"     // Retry logic helper
}
```

**Configuration:**
```javascript
// config/sync.js
module.exports = {
  sync: {
    enabled: process.env.ENABLE_SYNC === 'true',
    mode: process.env.SYNC_MODE || 'bidirectional', // 'mongo-to-zerodb', 'zerodb-to-mongo', 'bidirectional'

    changeStream: {
      enabled: true,
      collections: ['users', 'companies', 'stakeholders', 'transactions', 'documents'],
      batchSize: 100
    },

    poller: {
      enabled: true,
      interval: 2000,  // 2 seconds
      batchSize: 100,
      tables: ['users', 'companies', 'stakeholders', 'transactions', 'documents']
    },

    queue: {
      type: 'memory',  // 'memory' or 'redis'
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      },
      maxRetries: 5,
      retryDelays: [1000, 2000, 5000, 10000, 30000]
    },

    workers: {
      count: parseInt(process.env.SYNC_WORKERS) || 4,
      concurrency: 10  // Events per worker
    },

    conflictResolution: {
      strategy: 'last-write-wins',  // 'last-write-wins', 'source-wins', 'target-wins', 'custom'
      logAllConflicts: true
    },

    monitoring: {
      metricsInterval: 60000,  // 1 minute
      healthCheckInterval: 30000  // 30 seconds
    }
  }
};
```

---

## 9. Implementation Roadmap

### Phase 3.1: Foundation (Week 1-2)

**Sprint 1: Core Infrastructure**
- [ ] Create sync service file structure
- [ ] Implement Sync Event Queue (in-memory)
- [ ] Implement basic Sync Worker Pool
- [ ] Add configuration management
- [ ] Write unit tests for queue and workers

**Deliverables:**
- `/services/syncQueue.js`
- `/services/syncWorkerPool.js`
- `/config/sync.js`
- Unit tests with 80%+ coverage

### Phase 3.2: Change Detection (Week 3-4)

**Sprint 2: MongoDB Change Streams**
- [ ] Implement Change Stream Listener
- [ ] Add resume token persistence
- [ ] Integrate with Sync Queue
- [ ] Add backpressure handling
- [ ] Write integration tests

**Sprint 3: ZeroDB Polling**
- [ ] Implement ZeroDB Poller
- [ ] Add timestamp tracking per table
- [ ] Implement change detection algorithm
- [ ] Add polling configuration
- [ ] Write integration tests

**Deliverables:**
- `/services/syncChangeStreamListener.js`
- `/services/syncZeroDBPoller.js`
- Integration tests

### Phase 3.3: Conflict Resolution (Week 5)

**Sprint 4: Conflict Management**
- [ ] Implement Conflict Resolver
- [ ] Add Last-Write-Wins strategy
- [ ] Create conflict audit collection/table
- [ ] Add custom resolver registration
- [ ] Write conflict resolution tests

**Deliverables:**
- `/services/syncConflictResolver.js`
- Conflict resolution tests

### Phase 3.4: Error Handling (Week 6)

**Sprint 5: Resilience**
- [ ] Implement retry mechanism with exponential backoff
- [ ] Create Dead Letter Queue
- [ ] Add circuit breaker pattern
- [ ] Implement DLQ management endpoints
- [ ] Write error handling tests

**Deliverables:**
- Enhanced error handling in all services
- DLQ management APIs
- Error handling tests

### Phase 3.5: Orchestration (Week 7)

**Sprint 6: Integration**
- [ ] Implement Sync Orchestrator
- [ ] Add lifecycle management (start/stop/pause/resume)
- [ ] Integrate all components
- [ ] Add graceful shutdown handling
- [ ] End-to-end integration tests

**Deliverables:**
- `/services/syncOrchestrator.js`
- End-to-end tests

### Phase 3.6: Monitoring (Week 8)

**Sprint 7: Observability**
- [ ] Enhance metrics collector for sync operations
- [ ] Add sync-specific health check endpoints
- [ ] Implement alerting rules
- [ ] Create admin dashboard for sync monitoring
- [ ] Write monitoring tests

**Deliverables:**
- Enhanced `/utils/metricsCollector.js`
- Health check endpoints
- Monitoring documentation

### Phase 3.7: Production Readiness (Week 9-10)

**Sprint 8: Testing & Documentation**
- [ ] Performance testing (load tests)
- [ ] Failover testing
- [ ] Data consistency validation
- [ ] Complete API documentation
- [ ] Operations runbook

**Sprint 9: Deployment**
- [ ] Production configuration
- [ ] Deploy to staging
- [ ] Monitor and tune
- [ ] Deploy to production with feature flag
- [ ] Gradual rollout

**Deliverables:**
- Performance test results
- Operations documentation
- Production deployment

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Infinite sync loops** | High | Medium | Event metadata tracking, source tagging, loop detection |
| **MongoDB Change Stream crashes** | High | Low | Resume token persistence, automatic recovery, health checks |
| **ZeroDB API rate limits** | Medium | High | Adaptive polling, request throttling, batch operations |
| **Data consistency drift** | High | Medium | Periodic validation, reconciliation jobs, conflict audit trail |
| **Queue memory overflow** | Medium | Medium | Queue depth limits, Redis fallback, backpressure handling |
| **Worker thread crashes** | Medium | Low | Worker health checks, automatic restart, error isolation |
| **Network partitions** | High | Low | Retry logic, exponential backoff, eventual consistency model |

### 10.2 Operational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **High sync latency under load** | Medium | Medium | Horizontal scaling, worker pool tuning, queue optimization |
| **DLQ accumulation** | Medium | Medium | Automated alerts, DLQ dashboard, replay tooling |
| **Monitoring gaps** | Medium | Low | Comprehensive metrics, alerting rules, health checks |
| **Configuration errors** | High | Low | Validation on startup, sensible defaults, documentation |

### 10.3 Data Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Data loss during sync** | Critical | Very Low | Idempotent operations, retry logic, audit trail |
| **Incorrect conflict resolution** | High | Low | Conflict logging, rollback capability, manual review |
| **Schema mismatches** | Medium | Medium | Schema validation, transformation layer, version tracking |
| **PII exposure in logs** | High | Low | Log sanitization, secure log storage, access controls |

---

## Appendix A: API Specifications

### Sync Management Endpoints

```
POST /api/v1/admin/sync/start
POST /api/v1/admin/sync/stop
POST /api/v1/admin/sync/pause
POST /api/v1/admin/sync/resume
GET  /api/v1/admin/sync/status
GET  /api/v1/admin/sync/health
GET  /api/v1/admin/sync/metrics
GET  /api/v1/admin/sync/conflicts?limit=50&offset=0
GET  /api/v1/admin/sync/dlq?limit=50&offset=0
POST /api/v1/admin/sync/dlq/:eventId/replay
POST /api/v1/admin/sync/dlq/replay-all
DELETE /api/v1/admin/sync/dlq/:eventId
POST /api/v1/admin/sync/validate-consistency
```

---

## Appendix B: File Structure

```
opencapstack/
├── services/
│   ├── syncOrchestrator.js           # Main orchestration service
│   ├── syncChangeStreamListener.js   # MongoDB change detection
│   ├── syncZeroDBPoller.js           # ZeroDB change detection
│   ├── syncQueue.js                  # Event queue management
│   ├── syncWorkerPool.js             # Worker pool management
│   ├── syncConflictResolver.js       # Conflict resolution engine
│   ├── databaseAdapter.js            # (Existing) Database abstraction
│   └── zerodbService.js              # (Existing) ZeroDB operations
│
├── middleware/
│   └── databaseMonitor.js            # (Enhanced) Monitoring
│
├── utils/
│   ├── metricsCollector.js           # (Enhanced) Metrics collection
│   └── syncEventSchema.js            # Event schema definitions
│
├── config/
│   └── sync.js                       # Sync configuration
│
├── controllers/
│   └── syncController.js             # Sync management endpoints
│
├── routes/
│   └── syncRoutes.js                 # Sync API routes
│
├── tests/
│   ├── unit/
│   │   ├── syncQueue.test.js
│   │   ├── syncWorkerPool.test.js
│   │   └── syncConflictResolver.test.js
│   ├── integration/
│   │   ├── changeStreamListener.test.js
│   │   ├── zerodbPoller.test.js
│   │   └── syncOrchestrator.test.js
│   └── e2e/
│       └── bidirectionalSync.test.js
│
└── docs/
    └── architecture/
        └── continuous-sync-design.md  # This document
```

---

## Appendix C: Sync Event Examples

### MongoDB → ZeroDB INSERT Event
```javascript
{
  eventId: '550e8400-e29b-41d4-a716-446655440000',
  eventType: 'INSERT',
  sourceDatabase: 'mongodb',
  targetDatabase: 'zerodb',
  collection: 'users',
  tableName: 'users',
  documentId: 'user_abc123',
  fullDocument: {
    userId: 'user_abc123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-02T12:00:00.000Z',
    updatedAt: '2026-02-02T12:00:00.000Z'
  },
  timestamp: new Date('2026-02-02T12:00:00.100Z'),
  metadata: {
    operationType: 'insert',
    resumeToken: { /* token */ },
    clusterTime: { /* timestamp */ }
  }
}
```

### ZeroDB → MongoDB UPDATE Event
```javascript
{
  eventId: '550e8400-e29b-41d4-a716-446655440001',
  eventType: 'UPDATE',
  sourceDatabase: 'zerodb',
  targetDatabase: 'mongodb',
  collection: 'users',
  tableName: 'users',
  documentId: 'user_abc123',
  fullDocument: {
    userId: 'user_abc123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    role: 'manager',  // Changed
    status: 'active',
    createdAt: '2026-02-02T12:00:00.000Z',
    updatedAt: '2026-02-02T12:05:00.000Z'  // Updated
  },
  updateDescription: {
    updatedFields: { role: 'manager', updatedAt: '2026-02-02T12:05:00.000Z' },
    removedFields: []
  },
  timestamp: new Date('2026-02-02T12:05:00.200Z'),
  metadata: {
    detectedBy: 'zerodb-poller',
    pollTimestamp: '2026-02-02T12:05:00.150Z'
  }
}
```

---

## Appendix D: Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Sync Latency (p50) | < 200ms | < 500ms | > 1000ms |
| Sync Latency (p95) | < 500ms | < 1000ms | > 2000ms |
| Sync Latency (p99) | < 1000ms | < 2000ms | > 5000ms |
| Throughput | > 1000 ops/sec | > 500 ops/sec | < 100 ops/sec |
| Error Rate | < 0.1% | < 1% | > 5% |
| Queue Depth | < 100 | < 500 | > 1000 |
| DLQ Size | 0 | < 10 | > 100 |
| Worker Utilization | 60-80% | 40-90% | > 95% |

---

## Conclusion

This architecture provides a robust, scalable, and maintainable solution for continuous bidirectional synchronization between MongoDB and ZeroDB. Key strengths include:

1. **Reliability:** Retry logic, circuit breakers, and DLQ ensure no data loss
2. **Performance:** Event-driven architecture with worker pools enables high throughput
3. **Conflict Management:** Flexible conflict resolution with audit trail
4. **Observability:** Comprehensive metrics and health checks
5. **Maintainability:** Modular design with clear separation of concerns

The phased implementation roadmap allows for incremental development and testing, reducing risk and enabling early value delivery.

---

**Document Version:** 1.0
**Last Updated:** 2026-02-02
**Next Review:** Upon completion of Phase 3.1
