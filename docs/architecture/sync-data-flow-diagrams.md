# Continuous Sync Data Flow Diagrams
# Visual Reference for MongoDB ↔ ZeroDB Synchronization

**Version:** 1.0
**Date:** 2026-02-02
**Related:** continuous-sync-design.md, sync-implementation-guide.md

---

## Overview

This document provides visual representations of data flows, state transitions, and component interactions for the continuous synchronization system.

---

## 1. System Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OPENCAP APPLICATION LAYER                            │
│                                                                               │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────────┐  │
│  │  REST API      │  │  Controllers   │  │  Business Logic Services    │  │
│  │  (Express.js)  │─▶│  (CRUD ops)    │─▶│  (User, Company, etc.)      │  │
│  └────────────────┘  └────────────────┘  └─────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATABASE ABSTRACTION LAYER                            │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Database Adapter                                │   │
│  │  • Route operations to MongoDB/ZeroDB                               │   │
│  │  • Add sync metadata (_syncMetadata.source)                         │   │
│  │  • Metrics collection                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────┬───────────────────────────────────────┬───────────────────────┘
              │                                       │
              ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────────────────┐
│      MONGODB            │           │         SYNC LAYER                   │
│  (Primary Database)     │           │                                      │
│                         │           │  ┌──────────────────────────────┐  │
│  • User Documents       │◀──────────┤  │  Sync Orchestrator           │  │
│  • Companies            │   Watch   │  │  • Lifecycle management      │  │
│  • Stakeholders         │           │  │  • Component coordination    │  │
│  • Transactions         │           │  └──────────────────────────────┘  │
│  • Documents            │           │                │                    │
│                         │           │                ▼                    │
│  ┌──────────────────┐  │           │  ┌──────────────────────────────┐  │
│  │ Change Streams   │  │           │  │  Change Stream Listener      │  │
│  │ (Replica Set)    │──┼──────────▶│  │  • Watch all collections     │  │
│  └──────────────────┘  │           │  │  • Transform to sync events  │  │
└─────────────────────────┘           │  │  • Resume token persistence  │  │
                                      │  └──────────────────────────────┘  │
                                      │                │                    │
                                      │                ▼                    │
                                      │  ┌──────────────────────────────┐  │
                                      │  │      Sync Event Queue        │  │
                                      │  │  • FIFO with priority        │  │
                                      │  │  • Retry queue               │  │
                                      │  │  • Dead Letter Queue (DLQ)   │  │
                                      │  │  • Deduplication             │  │
                                      │  └──────────────────────────────┘  │
                                      │                │                    │
                                      │                ▼                    │
                                      │  ┌──────────────────────────────┐  │
                                      │  │      Sync Worker Pool        │  │
                                      │  │  • Multiple workers          │  │
                                      │  │  • Concurrent processing     │  │
                                      │  │  • Error handling            │  │
                                      │  └──────────────────────────────┘  │
                                      │                │                    │
                                      │                ▼                    │
                                      │  ┌──────────────────────────────┐  │
                                      │  │    Conflict Resolver         │  │
                                      │  │  • Last-Write-Wins (LWW)     │  │
                                      │  │  • Custom resolvers          │  │
                                      │  │  • Conflict audit trail      │  │
                                      │  └──────────────────────────────┘  │
                                      │                │                    │
                                      └────────────────┼────────────────────┘
                                                       │
                                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ZERODB                                          │
│                         (Lakehouse Database)                                 │
│                                                                               │
│  • users table          • stakeholders table                                 │
│  • companies table      • transactions table                                 │
│  • documents table      • financial_metrics table                            │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    ZeroDB Poller                                    │    │
│  │  • Poll tables for changes (2-second interval)                     │    │
│  │  • Track lastSyncTimestamp per table                               │    │
│  │  • Detect new/updated/deleted records                              │    │
│  │  • Enqueue reverse sync events                                     │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      MONITORING & OBSERVABILITY                              │
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │ Database Monitor │  │ Metrics Collector│  │  Health Check Endpoints  │ │
│  │ • Query times    │  │ • Sync latency   │  │  • Component status      │ │
│  │ • Error rates    │  │ • Throughput     │  │  • Queue depths          │ │
│  │ • Connection     │  │ • Conflict rate  │  │  • Alert triggers        │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MongoDB → ZeroDB Sync Flow

```
┌──────────────┐
│ User Action  │
│ (Update User)│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Application Layer                                    │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ PUT /api/v1/users/:id                                   │  │
│ │ → userController.updateUser()                           │  │
│ │ → User.findByIdAndUpdate()                              │  │
│ │ → MongoDB UPDATE operation                              │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: MongoDB Change Detection                            │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ MongoDB Change Stream emits UPDATE event:              │  │
│ │ {                                                       │  │
│ │   operationType: 'update',                             │  │
│ │   fullDocument: { userId: 'user123', ... },            │  │
│ │   updateDescription: { updatedFields: {...} },         │  │
│ │   clusterTime: Timestamp,                              │  │
│ │   _id: resumeToken                                     │  │
│ │ }                                                       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Change Stream Listener Processing                   │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ changeStreamListener.handleChange()                     │  │
│ │ • Store resume token for fault recovery                │  │
│ │ • Transform to sync event format                       │  │
│ │ • Add eventId (UUID), timestamp, metadata              │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Event Queuing                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ syncQueue.enqueue(syncEvent, 'MEDIUM')                  │  │
│ │ • Check for duplicates (eventId)                       │  │
│ │ • Assign priority (DELETE=HIGH, UPDATE=MEDIUM)         │  │
│ │ • Insert into priority queue                           │  │
│ │ Emit: 'enqueued' event                                 │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Worker Processing                                    │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Worker dequeues event from queue                        │  │
│ │ syncWorker.processEvent(event)                          │  │
│ │ • Validate event structure                             │  │
│ │ • Mark as processing                                   │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 6: Conflict Detection                                   │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Query ZeroDB for existing document                      │  │
│ │ conflictResolver.detectConflict(event, existingDoc)     │  │
│ │                                                         │  │
│ │ IF conflict detected:                                   │  │
│ │   • Compare updatedAt timestamps                       │  │
│ │   • Apply Last-Write-Wins strategy                     │  │
│ │   • Log conflict to audit trail                        │  │
│ │   • Use winning version for sync                       │  │
│ │ ELSE:                                                   │  │
│ │   • Proceed with sync                                  │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 7: Data Transformation                                  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Transform MongoDB document to ZeroDB format             │  │
│ │ • Map _id to userId (or appropriate key)               │  │
│ │ • Convert Date objects to ISO strings                  │  │
│ │ • Flatten nested objects if needed                     │  │
│ │ • Add sync metadata:                                   │  │
│ │   {                                                     │  │
│ │     _syncedAt: new Date(),                             │  │
│ │     _syncSource: 'mongodb',                            │  │
│ │     _syncEventId: eventId                              │  │
│ │   }                                                     │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 8: Apply to ZeroDB                                      │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ zerodbService.updateRows(tableName, filter, update)     │  │
│ │                                                         │  │
│ │ HTTP PUT /api/v1/projects/{id}/database/tables/users   │  │
│ │ Body: {                                                 │  │
│ │   filter: { userId: 'user123' },                       │  │
│ │   update: { $set: { ...transformedData } }             │  │
│ │ }                                                       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 9: Success/Failure Handling                             │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ IF success:                                             │  │
│ │   • syncQueue.markComplete(eventId)                     │  │
│ │   • Record metrics (latency, success)                  │  │
│ │   • Emit 'completed' event                             │  │
│ │                                                         │  │
│ │ IF failure:                                             │  │
│ │   • syncQueue.markFailed(eventId, error)                │  │
│ │   • Retry with exponential backoff (max 5 times)       │  │
│ │   • Move to DLQ after max retries                      │  │
│ │   • Alert if DLQ threshold exceeded                    │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 10: Monitoring                                          │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ metricsCollector.recordSyncEvent()                      │  │
│ │ • Sync latency: 187ms (total time)                     │  │
│ │ • Queue time: 23ms                                      │  │
│ │ • Processing time: 164ms                                │  │
│ │ • Status: SUCCESS                                       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘

Result: User data synced to ZeroDB within 200ms
```

---

## 3. ZeroDB → MongoDB Sync Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Direct ZeroDB Update                                 │
│ (External system or analytics pipeline updates ZeroDB)       │
│                                                               │
│ UPDATE users SET role = 'manager'                            │
│ WHERE userId = 'user123'                                     │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Polling Cycle                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Every 2 seconds, ZeroDB Poller executes:                │  │
│ │                                                         │  │
│ │ FOR EACH table IN monitored_tables:                     │  │
│ │   lastSync = getLastSyncTimestamp(table)                │  │
│ │                                                         │  │
│ │   SELECT * FROM table                                   │  │
│ │   WHERE updatedAt > lastSync                            │  │
│ │   ORDER BY updatedAt ASC                                │  │
│ │   LIMIT 100                                             │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Change Detection                                     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ zerodbPoller.detectChanges()                            │  │
│ │                                                         │  │
│ │ Found 1 updated record:                                 │  │
│ │ {                                                       │  │
│ │   userId: 'user123',                                    │  │
│ │   role: 'manager',  // CHANGED                         │  │
│ │   updatedAt: '2026-02-02T12:05:00Z'                    │  │
│ │ }                                                       │  │
│ │                                                         │  │
│ │ Compare with previous snapshot → CHANGE DETECTED       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Create Reverse Sync Event                           │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Create sync event:                                      │  │
│ │ {                                                       │  │
│ │   eventId: 'uuid-v4',                                   │  │
│ │   eventType: 'UPDATE',                                  │  │
│ │   sourceDatabase: 'zerodb',  // REVERSED               │  │
│ │   targetDatabase: 'mongodb',                            │  │
│ │   collection: 'users',                                  │  │
│ │   tableName: 'users',                                   │  │
│ │   documentId: 'user123',                                │  │
│ │   fullDocument: { /* ZeroDB row */ },                  │  │
│ │   timestamp: new Date(),                                │  │
│ │   metadata: {                                           │  │
│ │     detectedBy: 'zerodb-poller',                       │  │
│ │     pollTimestamp: '2026-02-02T12:05:00.150Z'          │  │
│ │   }                                                     │  │
│ │ }                                                       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 5: Enqueue for Processing                              │
│ syncQueue.enqueue(reverseSyncEvent, 'HIGH')                  │
│ (Same queue as MongoDB → ZeroDB events)                     │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Steps 6-10: Same as MongoDB → ZeroDB Flow                   │
│ • Worker dequeues event                                      │
│ • Conflict detection (compare ZeroDB vs MongoDB timestamps) │
│ • Transform ZeroDB row to MongoDB document format           │
│ • Apply to MongoDB using Model.findByIdAndUpdate()          │
│ • Handle success/failure                                     │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Result: ZeroDB change synced to MongoDB                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Conflict Resolution Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Scenario: Concurrent Updates                                 │
│                                                               │
│ Time T0: MongoDB has user with updatedAt = 12:00:00         │
│ Time T0: ZeroDB has user with updatedAt = 12:00:00          │
│                                                               │
│ Time T1 (12:05:00): User updates via API → MongoDB          │
│ Time T2 (12:05:05): Analytics updates ZeroDB directly       │
│                                                               │
│ Both updates propagate, creating a conflict...               │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Conflict Detection                                   │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Worker processing MongoDB→ZeroDB sync:                  │  │
│ │                                                         │  │
│ │ Query ZeroDB: SELECT * FROM users WHERE userId='123'    │  │
│ │ Result: updatedAt = 12:05:05                            │  │
│ │                                                         │  │
│ │ Sync event: updatedAt = 12:05:00                        │  │
│ │                                                         │  │
│ │ conflictResolver.detectConflict():                      │  │
│ │   targetTimestamp (12:05:05) > sourceTimestamp (12:05:00) │
│ │   → CONFLICT DETECTED                                   │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 2: Apply Resolution Strategy                           │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Strategy: Last-Write-Wins (LWW)                         │  │
│ │                                                         │  │
│ │ Compare timestamps:                                     │  │
│ │   Source (MongoDB): 12:05:00                            │  │
│ │   Target (ZeroDB):  12:05:05  ← WINNER                 │  │
│ │                                                         │  │
│ │ Resolution: KEEP_TARGET                                 │  │
│ │ Action: Do NOT apply MongoDB change to ZeroDB          │  │
│ │         (ZeroDB has more recent data)                  │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 3: Log Conflict                                         │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Save to conflicts collection/table:                     │  │
│ │ {                                                       │  │
│ │   conflictId: 'uuid',                                   │  │
│ │   timestamp: '2026-02-02T12:05:10Z',                   │  │
│ │   collection: 'users',                                  │  │
│ │   documentId: 'user123',                                │  │
│ │   conflictType: 'CONCURRENT_MODIFICATION',              │  │
│ │   sourceDatabase: 'mongodb',                            │  │
│ │   targetDatabase: 'zerodb',                             │  │
│ │   sourceDocument: { /* MongoDB version */ },           │  │
│ │   targetDocument: { /* ZeroDB version */ },            │  │
│ │   resolution: 'KEEP_TARGET',                            │  │
│ │   winner: 'target',                                     │  │
│ │   timeDifference: 5000, // 5 seconds                   │  │
│ │   resolvedBy: 'last-write-wins'                         │  │
│ │ }                                                       │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Step 4: Reverse Sync Winner                                 │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Since ZeroDB won, create reverse sync event:            │  │
│ │ • Source: ZeroDB                                        │  │
│ │ • Target: MongoDB                                       │  │
│ │ • Update MongoDB with ZeroDB's version                  │  │
│ │                                                         │  │
│ │ This ensures both databases converge to same state     │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Result: Conflict Resolved                                    │
│ • Both databases have ZeroDB's version (winner)              │
│ • Conflict logged in audit trail                            │
│ • Metrics updated (conflict rate)                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Error Handling & Retry Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Normal Sync Event Processing                                 │
└──────────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ Worker attempts to apply change                              │
└──────────────────────────────────────────────────────────────┘
       │
       ├─────────────────┬──────────────────┐
       ▼                 ▼                  ▼
   SUCCESS          TRANSIENT ERROR    PERMANENT ERROR
       │                 │                  │
       │                 │                  │
┌──────▼─────┐    ┌──────▼──────────┐    ┌─▼──────────────┐
│ Mark       │    │ Retry Logic     │    │ Move to DLQ    │
│ Complete   │    │                 │    │                │
│            │    │ Errors:         │    │ Errors:        │
│ • Remove   │    │ • Network       │    │ • Validation   │
│   from     │    │   timeout       │    │   (400)        │
│   queue    │    │ • Rate limit    │    │ • Auth (401)   │
│            │    │   (429)         │    │ • Schema       │
│ • Update   │    │ • Server error  │    │   mismatch     │
│   metrics  │    │   (500-504)     │    │                │
│            │    │                 │    │ Action:        │
│ • Emit     │    │ Retry Strategy: │    │ • Log error    │
│   success  │    │ 1. Wait 1s      │    │ • Create DLQ   │
│   event    │    │ 2. Wait 2s      │    │   entry        │
│            │    │ 3. Wait 5s      │    │ • Alert if     │
└────────────┘    │ 4. Wait 10s     │    │   > threshold  │
                  │ 5. Wait 30s     │    │ • Mark as      │
                  │ (max 5 retries) │    │   requiring    │
                  │                 │    │   manual fix   │
                  │ • Add jitter    │    └────────────────┘
                  │ • Exponential   │
                  │   backoff       │
                  │                 │
                  │ IF all retries  │
                  │ fail:           │
                  │   → Move to DLQ │
                  └─────────────────┘
```

### Retry Delay Calculation

```javascript
// Exponential backoff with jitter
const baseDelay = 1000; // 1 second
const maxDelay = 30000; // 30 seconds

function calculateDelay(retryCount) {
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, retryCount),
    maxDelay
  );

  // Add 0-30% random jitter
  const jitter = Math.random() * 0.3 * exponentialDelay;

  return Math.floor(exponentialDelay + jitter);
}

// Results:
// Retry 1: ~1000ms + jitter
// Retry 2: ~2000ms + jitter
// Retry 3: ~4000ms + jitter  (clamped to 5000ms in config)
// Retry 4: ~8000ms + jitter  (clamped to 10000ms in config)
// Retry 5: ~16000ms + jitter (clamped to 30000ms in config)
```

---

## 6. State Machine Diagram

### Sync Event Lifecycle

```
┌─────────────┐
│   CREATED   │  Event created by Change Stream Listener or Poller
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   QUEUED    │  Event added to main queue
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PROCESSING  │  Worker dequeued and is processing
└──┬────┬─────┘
   │    │
   │    └─────────────┐
   │                  │
   ▼                  ▼
┌──────────┐    ┌────────────┐
│ SUCCESS  │    │  FAILED    │
└────┬─────┘    └─────┬──────┘
     │                │
     │                ├─── Retry < Max? ──┐
     │                │                   │
     │                ▼ Yes               ▼ No
     │         ┌──────────────┐    ┌─────────────┐
     │         │ RETRY_QUEUED │    │     DLQ     │
     │         └──────┬───────┘    │ (Terminal)  │
     │                │             └─────────────┘
     │                └─── Wait delay ───┐
     │                                   │
     │                                   ▼
     │                            ┌─────────────┐
     │                            │ PROCESSING  │
     │                            │ (retry)     │
     │                            └─────────────┘
     │                                   │
     │                                   │
     └───────────────────────────────────┘
             (Loop until success or DLQ)

┌─────────────┐
│ COMPLETED   │  Final state: event successfully processed
└─────────────┘
```

---

## 7. Queue Priority Visualization

```
┌────────────────────────────────────────────────────────────────┐
│                     SYNC EVENT QUEUE                            │
│                                                                 │
│  Priority Level: HIGH (3)                                      │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ DELETE events - Prevent data loss                      │   │
│  │ • users: delete user123                                │   │
│  │ • companies: delete company456                         │   │
│  └────────────────────────────────────────────────────────┘   │
│                         ▲                                       │
│                         │ Processed first                       │
│                                                                 │
│  Priority Level: MEDIUM (2)                                    │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ UPDATE events - Important for consistency              │   │
│  │ • users: update user789 (role change)                  │   │
│  │ • companies: update company123 (address change)        │   │
│  │ • stakeholders: update stake456 (shares update)        │   │
│  └────────────────────────────────────────────────────────┘   │
│                         ▲                                       │
│                         │ Processed second                      │
│                                                                 │
│  Priority Level: LOW (1)                                       │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ INSERT events - Can wait                               │   │
│  │ • users: insert new user999                            │   │
│  │ • documents: insert document234                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                         ▲                                       │
│                         │ Processed last                        │
└─────────────────────────────────────────────────────────────────┘

Worker Pool continuously dequeues from top (highest priority)
```

---

## 8. Component Interaction Sequence

### Startup Sequence

```
Time  │ Orchestrator  │ ChangeStream  │ Poller    │ Workers  │ Queue
──────┼───────────────┼───────────────┼───────────┼──────────┼──────
T0    │ initialize()  │               │           │          │
      │      │        │               │           │          │
T1    │      ├───────▶│ initialize()  │           │          │
      │      │        │ • Load tokens │           │          │
      │      │        │ • Watch collections       │          │
      │      │        │               │           │          │
T2    │      ├────────┼──────────────▶│ initialize() │       │
      │      │        │               │ • Load timestamps │  │
      │      │        │               │           │          │
T3    │      ├────────┼───────────────┼──────────▶│ start() │
      │      │        │               │           │ • Create workers
      │      │        │               │           │          │
T4    │ start()       │               │           │          │
      │      ├───────▶│ start watching│           │          │
      │      │        │ ✓ Ready       │           │          │
      │      │        │               │           │          │
T5    │      ├────────┼──────────────▶│ start()   │          │
      │      │        │               │ • Begin polling    │
      │      │        │               │ ✓ Ready   │          │
      │      │        │               │           │          │
T6    │      ├────────┼───────────────┼──────────▶│ ✓ Ready │
      │      │        │               │           │          │
T7    │ ✓ RUNNING     │ ✓ WATCHING    │ ✓ POLLING │ ✓ PROCESSING
```

### Processing Sequence (Normal Flow)

```
MongoDB    ChangeStream    Queue      Worker    Conflict    ZeroDB
UPDATE  ──▶  Detect    ──▶ Enqueue ──▶ Dequeue    Resolver
            Transform                   │
                                       ├──────▶  Check  ──┐
                                       │                  │
                                       │         No Conflict
                                       │                  │
                                       ◀──────────────────┘
                                       │
                                       ├─── Transform ───┐
                                       │                 │
                                       ◀─────────────────┘
                                       │
                                       ├──── Apply ─────▶ UPDATE
                                       │                     ✓
                                       ◀───── Success ──────┘
                                       │
                                    Complete
```

---

## 9. Monitoring Dashboard Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                    SYNC MONITORING DASHBOARD                            │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌───────────────┐ │
│  │  Sync Status        │  │  Latency            │  │  Throughput   │ │
│  │                     │  │                     │  │               │ │
│  │  ● RUNNING          │  │  p50:  187ms        │  │  965 ops/s    │ │
│  │                     │  │  p95:  421ms        │  │               │ │
│  │  Last Event:        │  │  p99:  892ms        │  │  Last 1min:   │ │
│  │  2s ago             │  │                     │  │  57,900 ops   │ │
│  └─────────────────────┘  └─────────────────────┘  └───────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Queue Depths                                                     │ │
│  │  ┌────────────────┬─────────────┬────────────┬─────────────────┐ │ │
│  │  │ Main Queue     │ Retry Queue │ Processing │ Dead Letter     │ │ │
│  │  │ [████░░] 42    │ [█░░░░] 3   │ [███░░] 4  │ [░░░░░] 0       │ │ │
│  │  └────────────────┴─────────────┴────────────┴─────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌────────────────────────────┐  ┌──────────────────────────────────┐ │
│  │  Error Rate                │  │  Conflict Rate                   │ │
│  │                            │  │                                  │ │
│  │  0.08% (8 of 10,000)      │  │  1.2% (120 of 10,000)           │ │
│  │  ✓ Within SLO (<0.1%)     │  │  ⚠ Above normal (usually 0.5%)  │ │
│  └────────────────────────────┘  └──────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Component Health                                                 │ │
│  │  ✓ Change Stream Listener  (7 streams active)                    │ │
│  │  ✓ ZeroDB Poller          (last poll 1.2s ago)                  │ │
│  │  ✓ Worker Pool             (4/4 workers healthy)                 │ │
│  │  ✓ Sync Queue              (healthy - no backlog)                │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  Recent Events (Last 10)                                          │ │
│  │  12:05:45  UPDATE  users       user123  ✓  145ms                 │ │
│  │  12:05:44  INSERT  companies   comp456  ✓  187ms                 │ │
│  │  12:05:43  UPDATE  stakeholders stake789 ✓  203ms                │ │
│  │  12:05:42  DELETE  documents   doc234   ✓  98ms                  │ │
│  │  12:05:41  UPDATE  users       user555  ⚠  CONFLICT RESOLVED     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Deployment Architecture

### Production Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER                                │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION SERVERS (3 instances)                 │
│                                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────┐│
│  │ App Server 1         │  │ App Server 2         │  │ App Server 3││
│  │ • REST API           │  │ • REST API           │  │ • REST API  ││
│  │ • Database Adapter   │  │ • Database Adapter   │  │ • DB Adapter││
│  └──────────────────────┘  └──────────────────────┘  └────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│              SYNC LAYER (Dedicated Instance - HA Setup)              │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Primary Sync Server                                            │ │
│  │ • Sync Orchestrator                                            │ │
│  │ • Change Stream Listener (active)                              │ │
│  │ • ZeroDB Poller (active)                                       │ │
│  │ • Worker Pool (4 workers)                                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Standby Sync Server                                            │ │
│  │ • Ready to take over on failure                                │ │
│  │ • Health check monitors primary                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
      ┌───────────────────────┐       ┌──────────────────────────┐
      │   MongoDB Replica Set │       │        ZeroDB API        │
      │   • Primary           │       │   • Lakehouse Storage    │
      │   • Secondary 1       │       │   • Vector Search        │
      │   • Secondary 2       │       │   • Real-time Analytics  │
      └───────────────────────┘       └──────────────────────────┘

      ┌────────────────────────────────────────────────────────────┐
      │                      Redis (Optional)                       │
      │   • Persistent queue storage                               │
      │   • DLQ persistence                                        │
      │   • Distributed locking for HA                             │
      └────────────────────────────────────────────────────────────┘
```

---

## Conclusion

These diagrams provide visual reference for understanding the continuous synchronization architecture. Use them alongside the detailed design document for implementation.

For code implementation, refer to `sync-implementation-guide.md`.

---

**Last Updated:** 2026-02-02
**Version:** 1.0
