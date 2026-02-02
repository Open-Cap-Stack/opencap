# Continuous Sync Implementation Guide
# Code Templates and Integration Patterns

**Version:** 1.0
**Date:** 2026-02-02
**Related:** continuous-sync-design.md

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Component Templates](#component-templates)
3. [Integration with Existing Systems](#integration-with-existing-systems)
4. [Testing Strategy](#testing-strategy)
5. [Deployment Checklist](#deployment-checklist)

---

## Quick Start

### Minimal Setup for Development

```javascript
// app.js - Add sync initialization
const syncOrchestrator = require('./services/syncOrchestrator');
const syncConfig = require('./config/sync');

// Initialize sync after database connections
if (syncConfig.sync.enabled) {
  await syncOrchestrator.initialize();
  await syncOrchestrator.start();

  console.log('✅ Continuous sync started');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await syncOrchestrator.stop();
  // ... other cleanup
});
```

### Environment Variables

```bash
# .env additions for Phase 3
ENABLE_SYNC=true
SYNC_MODE=bidirectional
SYNC_WORKERS=4
ZERODB_POLL_INTERVAL=2000
SYNC_BATCH_SIZE=100
```

---

## Component Templates

### 1. Sync Event Queue (syncQueue.js)

```javascript
/**
 * Sync Event Queue Manager
 * Manages FIFO queue with priority, retry, and DLQ support
 */

const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');

class SyncQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.mainQueue = [];
    this.retryQueue = [];
    this.dlq = [];
    this.processing = new Map(); // eventId -> event
    this.processedEvents = new Set(); // For deduplication

    this.maxRetries = options.maxRetries || 5;
    this.retryDelays = options.retryDelays || [1000, 2000, 5000, 10000, 30000];
    this.maxQueueSize = options.maxQueueSize || 10000;
    this.deduplicationWindowSize = options.deduplicationWindowSize || 10000;
  }

  /**
   * Enqueue a sync event
   * @param {Object} event - Sync event object
   * @param {string} priority - 'HIGH', 'MEDIUM', 'LOW'
   * @returns {boolean} Success status
   */
  enqueue(event, priority = 'MEDIUM') {
    // Check for duplicates
    if (this.isDuplicate(event.eventId)) {
      console.log(`Duplicate event detected: ${event.eventId}`);
      return false;
    }

    // Check queue capacity
    if (this.mainQueue.length >= this.maxQueueSize) {
      console.error('Queue capacity exceeded');
      this.emit('queue-full', { queueSize: this.mainQueue.length });
      return false;
    }

    // Add priority to event
    event.priority = this.getPriorityValue(priority);
    event.enqueuedAt = new Date();
    event.retryCount = event.retryCount || 0;

    // Insert based on priority
    this.insertByPriority(event);

    // Track for deduplication
    this.processedEvents.add(event.eventId);
    if (this.processedEvents.size > this.deduplicationWindowSize) {
      // Remove oldest
      const first = this.processedEvents.values().next().value;
      this.processedEvents.delete(first);
    }

    this.emit('enqueued', event);
    return true;
  }

  /**
   * Dequeue next event for processing
   * @returns {Object|null} Next event or null if queue is empty
   */
  dequeue() {
    if (this.mainQueue.length === 0) {
      return null;
    }

    const event = this.mainQueue.shift();
    this.processing.set(event.eventId, {
      event,
      startedAt: new Date()
    });

    this.emit('dequeued', event);
    return event;
  }

  /**
   * Mark event as successfully processed
   * @param {string} eventId
   */
  markComplete(eventId) {
    const processingInfo = this.processing.get(eventId);
    if (processingInfo) {
      const duration = Date.now() - processingInfo.startedAt;
      this.processing.delete(eventId);
      this.emit('completed', { eventId, duration });
    }
  }

  /**
   * Mark event as failed and enqueue for retry or move to DLQ
   * @param {string} eventId
   * @param {Error} error
   */
  markFailed(eventId, error) {
    const processingInfo = this.processing.get(eventId);
    if (!processingInfo) {
      return;
    }

    const event = processingInfo.event;
    event.retryCount = (event.retryCount || 0) + 1;
    event.lastError = {
      message: error.message,
      code: error.code,
      timestamp: new Date()
    };

    this.processing.delete(eventId);

    if (event.retryCount < this.maxRetries) {
      // Add to retry queue
      event.nextRetryAt = new Date(Date.now() + this.retryDelays[event.retryCount - 1]);
      this.retryQueue.push(event);
      this.emit('retry-scheduled', event);
    } else {
      // Move to DLQ
      this.moveToDLQ(event, 'Max retries exceeded');
    }
  }

  /**
   * Move event to Dead Letter Queue
   * @param {Object} event
   * @param {string} reason
   */
  moveToDLQ(event, reason) {
    const dlqEntry = {
      dlqId: uuidv4(),
      originalEvent: event,
      failureReason: reason,
      errorStack: event.lastError,
      retryCount: event.retryCount,
      firstFailedAt: event.enqueuedAt,
      movedToDLQAt: new Date(),
      requiresManualIntervention: true
    };

    this.dlq.push(dlqEntry);
    this.emit('moved-to-dlq', dlqEntry);

    // Alert if DLQ threshold exceeded
    if (this.dlq.length > 100) {
      this.emit('dlq-threshold-exceeded', { count: this.dlq.length });
    }
  }

  /**
   * Process retry queue - check for events ready to retry
   */
  processRetryQueue() {
    const now = Date.now();
    const readyToRetry = [];

    // Find events ready to retry
    this.retryQueue = this.retryQueue.filter(event => {
      if (event.nextRetryAt && event.nextRetryAt.getTime() <= now) {
        readyToRetry.push(event);
        return false;
      }
      return true;
    });

    // Re-enqueue
    readyToRetry.forEach(event => {
      delete event.nextRetryAt;
      this.insertByPriority(event);
      this.emit('retry-executed', event);
    });
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      mainQueue: {
        length: this.mainQueue.length,
        byPriority: this.countByPriority(this.mainQueue)
      },
      retryQueue: {
        length: this.retryQueue.length
      },
      dlq: {
        length: this.dlq.length
      },
      processing: {
        count: this.processing.size,
        events: Array.from(this.processing.keys())
      }
    };
  }

  // Helper methods

  isDuplicate(eventId) {
    return this.processedEvents.has(eventId) || this.processing.has(eventId);
  }

  getPriorityValue(priority) {
    const priorities = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorities[priority] || 2;
  }

  insertByPriority(event) {
    // Insert based on priority (higher priority first)
    let inserted = false;
    for (let i = 0; i < this.mainQueue.length; i++) {
      if (event.priority > this.mainQueue[i].priority) {
        this.mainQueue.splice(i, 0, event);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.mainQueue.push(event);
    }
  }

  countByPriority(queue) {
    return queue.reduce((acc, event) => {
      const p = event.priority === 3 ? 'HIGH' : event.priority === 2 ? 'MEDIUM' : 'LOW';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Replay DLQ event
   * @param {string} dlqId
   */
  replayFromDLQ(dlqId) {
    const index = this.dlq.findIndex(entry => entry.dlqId === dlqId);
    if (index === -1) {
      throw new Error(`DLQ entry not found: ${dlqId}`);
    }

    const dlqEntry = this.dlq.splice(index, 1)[0];
    const event = dlqEntry.originalEvent;
    event.retryCount = 0;
    delete event.lastError;

    this.enqueue(event, 'HIGH');
    this.emit('dlq-replayed', { dlqId, eventId: event.eventId });
  }

  /**
   * Clear DLQ
   */
  clearDLQ() {
    const count = this.dlq.length;
    this.dlq = [];
    this.emit('dlq-cleared', { count });
  }
}

module.exports = SyncQueue;
```

---

### 2. Change Stream Listener (syncChangeStreamListener.js)

```javascript
/**
 * MongoDB Change Stream Listener
 * Captures real-time MongoDB changes and enqueues sync events
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class ChangeStreamListener {
  constructor(syncQueue, databaseMonitor, config) {
    this.syncQueue = syncQueue;
    this.monitor = databaseMonitor;
    this.config = config;
    this.changeStreams = new Map();
    this.resumeTokens = new Map();
    this.enabled = false;
    this.resumeTokenFile = path.join(__dirname, '../data/resume-tokens.json');
  }

  /**
   * Initialize change streams for all configured collections
   */
  async initialize() {
    if (!this.config.sync.changeStream.enabled) {
      console.log('Change stream listener disabled');
      return;
    }

    console.log('Initializing MongoDB Change Stream Listener...');

    // Load persisted resume tokens
    await this.loadResumeTokens();

    // Setup change streams for each collection
    const collections = this.config.sync.changeStream.collections;
    for (const collectionName of collections) {
      await this.watchCollection(collectionName);
    }

    this.enabled = true;
    console.log(`✅ Change streams active for ${collections.length} collections`);
  }

  /**
   * Watch a specific collection for changes
   * @param {string} collectionName
   */
  async watchCollection(collectionName) {
    try {
      const collection = mongoose.connection.collection(collectionName);

      // Pipeline to filter out sync-generated changes
      const pipeline = [
        {
          $match: {
            // Ignore changes from sync operations
            'fullDocument._syncMetadata.source': { $ne: 'sync' }
          }
        }
      ];

      const options = {
        fullDocument: 'updateLookup', // Include full document for updates
        batchSize: this.config.sync.changeStream.batchSize || 100
      };

      // Use resume token if available
      const resumeToken = this.resumeTokens.get(collectionName);
      if (resumeToken) {
        options.resumeAfter = resumeToken;
        console.log(`Resuming change stream for ${collectionName} from token`);
      }

      const changeStream = collection.watch(pipeline, options);

      // Handle change events
      changeStream.on('change', (changeEvent) => {
        this.handleChange(collectionName, changeEvent);
      });

      // Handle errors
      changeStream.on('error', (error) => {
        this.handleError(collectionName, error);
      });

      // Handle stream close
      changeStream.on('close', () => {
        console.log(`Change stream closed for ${collectionName}`);
        // Attempt to reconnect after delay
        setTimeout(() => this.watchCollection(collectionName), 5000);
      });

      this.changeStreams.set(collectionName, changeStream);
      console.log(`Watching collection: ${collectionName}`);

    } catch (error) {
      console.error(`Failed to watch collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Handle a change event
   * @param {string} collectionName
   * @param {Object} changeEvent
   */
  handleChange(collectionName, changeEvent) {
    try {
      // Store resume token
      this.resumeTokens.set(collectionName, changeEvent._id);
      this.persistResumeTokens(); // Async, fire and forget

      // Transform to sync event
      const syncEvent = this.transformToSyncEvent(collectionName, changeEvent);

      // Determine priority based on operation
      const priority = changeEvent.operationType === 'delete' ? 'HIGH' : 'MEDIUM';

      // Enqueue
      const success = this.syncQueue.enqueue(syncEvent, priority);

      if (success) {
        console.log(`Enqueued ${changeEvent.operationType} for ${collectionName}:${syncEvent.documentId}`);

        // Record metric
        if (this.monitor) {
          this.monitor.logOperation('mongodb', {
            operation: `changestream-${changeEvent.operationType}`,
            collection: collectionName,
            success: true,
            timestamp: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      console.error(`Error handling change event for ${collectionName}:`, error);
      if (this.monitor) {
        this.monitor.logError('mongodb', error, {
          operation: 'changestream-handler',
          collection: collectionName
        });
      }
    }
  }

  /**
   * Transform MongoDB change event to sync event format
   * @param {string} collectionName
   * @param {Object} changeEvent
   * @returns {Object} Sync event
   */
  transformToSyncEvent(collectionName, changeEvent) {
    const baseEvent = {
      eventId: uuidv4(),
      sourceDatabase: 'mongodb',
      targetDatabase: 'zerodb',
      collection: collectionName,
      tableName: this.modelToTableName(collectionName),
      timestamp: new Date(),
      metadata: {
        operationType: changeEvent.operationType,
        resumeToken: changeEvent._id,
        clusterTime: changeEvent.clusterTime
      }
    };

    switch (changeEvent.operationType) {
      case 'insert':
        return {
          ...baseEvent,
          eventType: 'INSERT',
          documentId: this.extractDocumentId(changeEvent.fullDocument),
          fullDocument: changeEvent.fullDocument
        };

      case 'update':
      case 'replace':
        return {
          ...baseEvent,
          eventType: 'UPDATE',
          documentId: this.extractDocumentId(changeEvent.fullDocument),
          fullDocument: changeEvent.fullDocument,
          updateDescription: changeEvent.updateDescription
        };

      case 'delete':
        return {
          ...baseEvent,
          eventType: 'DELETE',
          documentId: this.extractDocumentId(changeEvent.documentKey),
          documentKey: changeEvent.documentKey
        };

      default:
        console.warn(`Unsupported operation type: ${changeEvent.operationType}`);
        return null;
    }
  }

  /**
   * Handle change stream errors
   * @param {string} collectionName
   * @param {Error} error
   */
  handleError(collectionName, error) {
    console.error(`Change stream error for ${collectionName}:`, error);

    if (this.monitor) {
      this.monitor.logError('mongodb', error, {
        operation: 'changestream',
        collection: collectionName
      });
    }

    // Attempt to recover by recreating the stream
    const changeStream = this.changeStreams.get(collectionName);
    if (changeStream) {
      changeStream.close();
      this.changeStreams.delete(collectionName);
    }

    // Reconnect after delay
    setTimeout(() => this.watchCollection(collectionName), 5000);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('Shutting down Change Stream Listener...');

    // Close all change streams
    for (const [collectionName, changeStream] of this.changeStreams) {
      console.log(`Closing change stream for ${collectionName}`);
      await changeStream.close();
    }

    // Persist resume tokens
    await this.persistResumeTokens();

    this.changeStreams.clear();
    this.enabled = false;
    console.log('Change Stream Listener shut down');
  }

  // Helper methods

  extractDocumentId(doc) {
    return doc._id?.toString() || doc.userId || doc.companyId || doc.id;
  }

  modelToTableName(collectionName) {
    // Convert collection name to table name (e.g., 'users' -> 'users')
    return collectionName.toLowerCase();
  }

  async loadResumeTokens() {
    try {
      const data = await fs.readFile(this.resumeTokenFile, 'utf8');
      const tokens = JSON.parse(data);
      this.resumeTokens = new Map(Object.entries(tokens));
      console.log(`Loaded ${this.resumeTokens.size} resume tokens`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('No resume tokens found, starting fresh');
      } else {
        console.error('Error loading resume tokens:', error);
      }
    }
  }

  async persistResumeTokens() {
    try {
      const tokens = Object.fromEntries(this.resumeTokens);
      await fs.writeFile(this.resumeTokenFile, JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error('Error persisting resume tokens:', error);
    }
  }
}

module.exports = ChangeStreamListener;
```

---

### 3. Sync Orchestrator (syncOrchestrator.js)

```javascript
/**
 * Sync Orchestrator
 * Coordinates all sync components and manages lifecycle
 */

const ChangeStreamListener = require('./syncChangeStreamListener');
const ZeroDBPoller = require('./syncZeroDBPoller');
const SyncQueue = require('./syncQueue');
const SyncWorkerPool = require('./syncWorkerPool');
const ConflictResolver = require('./syncConflictResolver');
const { databaseMonitor } = require('../middleware/databaseMonitor');
const zerodbService = require('./zerodbService');
const syncConfig = require('../config/sync');

class SyncOrchestrator {
  constructor() {
    this.status = 'stopped';
    this.components = {};
    this.healthCheckInterval = null;
  }

  /**
   * Initialize all sync components
   */
  async initialize() {
    console.log('Initializing Sync Orchestrator...');

    try {
      // Initialize sync queue
      this.components.syncQueue = new SyncQueue({
        maxRetries: syncConfig.sync.queue.maxRetries,
        retryDelays: syncConfig.sync.queue.retryDelays,
        maxQueueSize: 10000
      });

      // Setup queue event handlers
      this.setupQueueEventHandlers(this.components.syncQueue);

      // Initialize conflict resolver
      this.components.conflictResolver = new ConflictResolver({
        strategy: syncConfig.sync.conflictResolution.strategy,
        logAllConflicts: syncConfig.sync.conflictResolution.logAllConflicts
      });

      // Initialize worker pool
      this.components.workerPool = new SyncWorkerPool(
        syncConfig.sync.workers.count,
        this.components.syncQueue,
        this.components.conflictResolver,
        {
          concurrency: syncConfig.sync.workers.concurrency,
          monitor: databaseMonitor
        }
      );

      // Initialize change stream listener
      this.components.changeStreamListener = new ChangeStreamListener(
        this.components.syncQueue,
        databaseMonitor,
        syncConfig
      );

      // Initialize ZeroDB poller
      this.components.zerodbPoller = new ZeroDBPoller(
        this.components.syncQueue,
        zerodbService,
        databaseMonitor,
        syncConfig
      );

      console.log('✅ All sync components initialized');

    } catch (error) {
      console.error('Failed to initialize Sync Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Start synchronization
   */
  async start() {
    if (this.status === 'running') {
      console.log('Sync already running');
      return;
    }

    console.log('Starting synchronization...');

    try {
      // Start change stream listener
      if (syncConfig.sync.mode === 'bidirectional' || syncConfig.sync.mode === 'mongo-to-zerodb') {
        await this.components.changeStreamListener.initialize();
      }

      // Start worker pool
      await this.components.workerPool.start();

      // Start ZeroDB poller
      if (syncConfig.sync.mode === 'bidirectional' || syncConfig.sync.mode === 'zerodb-to-mongo') {
        await this.components.zerodbPoller.start();
      }

      // Start health checks
      this.startHealthChecks();

      this.status = 'running';
      console.log('✅ Synchronization started successfully');

    } catch (error) {
      console.error('Failed to start synchronization:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop synchronization
   */
  async stop() {
    if (this.status === 'stopped') {
      console.log('Sync already stopped');
      return;
    }

    console.log('Stopping synchronization...');
    this.status = 'stopping';

    try {
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Stop components in reverse order
      if (this.components.zerodbPoller) {
        await this.components.zerodbPoller.stop();
      }

      if (this.components.workerPool) {
        await this.components.workerPool.stop();
      }

      if (this.components.changeStreamListener) {
        await this.components.changeStreamListener.shutdown();
      }

      this.status = 'stopped';
      console.log('✅ Synchronization stopped');

    } catch (error) {
      console.error('Error stopping synchronization:', error);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Pause synchronization
   */
  async pause() {
    if (this.status !== 'running') {
      throw new Error('Cannot pause: sync is not running');
    }

    console.log('Pausing synchronization...');

    // Stop polling and processing, but keep queues intact
    if (this.components.zerodbPoller) {
      await this.components.zerodbPoller.pause();
    }

    if (this.components.workerPool) {
      await this.components.workerPool.pause();
    }

    this.status = 'paused';
    console.log('✅ Synchronization paused');
  }

  /**
   * Resume synchronization
   */
  async resume() {
    if (this.status !== 'paused') {
      throw new Error('Cannot resume: sync is not paused');
    }

    console.log('Resuming synchronization...');

    if (this.components.workerPool) {
      await this.components.workerPool.resume();
    }

    if (this.components.zerodbPoller) {
      await this.components.zerodbPoller.resume();
    }

    this.status = 'running';
    console.log('✅ Synchronization resumed');
  }

  /**
   * Get system status
   */
  getStatus() {
    const queueStats = this.components.syncQueue?.getStats() || {};

    return {
      status: this.status,
      timestamp: new Date().toISOString(),
      components: {
        changeStreamListener: {
          status: this.components.changeStreamListener?.enabled ? 'running' : 'stopped',
          activeStreams: this.components.changeStreamListener?.changeStreams.size || 0
        },
        zerodbPoller: {
          status: this.components.zerodbPoller?.running ? 'running' : 'stopped',
          pollInterval: syncConfig.sync.poller.interval
        },
        syncQueue: {
          status: 'active',
          ...queueStats
        },
        workerPool: {
          status: this.components.workerPool?.running ? 'running' : 'stopped',
          activeWorkers: this.components.workerPool?.workers.length || 0
        }
      }
    };
  }

  /**
   * Health check for all components
   */
  async healthCheck() {
    const health = {
      overall: 'healthy',
      timestamp: new Date().toISOString(),
      components: {}
    };

    try {
      // Check change stream listener
      if (this.components.changeStreamListener) {
        const streamsActive = this.components.changeStreamListener.changeStreams.size > 0;
        health.components.changeStreamListener = {
          status: streamsActive ? 'healthy' : 'degraded',
          activeStreams: this.components.changeStreamListener.changeStreams.size
        };
      }

      // Check ZeroDB poller
      if (this.components.zerodbPoller) {
        health.components.zerodbPoller = {
          status: this.components.zerodbPoller.running ? 'healthy' : 'stopped'
        };
      }

      // Check sync queue
      const queueStats = this.components.syncQueue.getStats();
      health.components.syncQueue = {
        status: queueStats.dlq.length > 100 ? 'degraded' : 'healthy',
        mainQueueDepth: queueStats.mainQueue.length,
        dlqDepth: queueStats.dlq.length
      };

      // Check worker pool
      if (this.components.workerPool) {
        health.components.workerPool = {
          status: this.components.workerPool.running ? 'healthy' : 'stopped',
          activeWorkers: this.components.workerPool.workers.length
        };
      }

      // Determine overall health
      const allHealthy = Object.values(health.components).every(
        c => c.status === 'healthy' || c.status === 'stopped'
      );
      health.overall = allHealthy ? 'healthy' : 'degraded';

    } catch (error) {
      health.overall = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  // Private methods

  setupQueueEventHandlers(syncQueue) {
    syncQueue.on('queue-full', () => {
      console.error('ALERT: Sync queue is full!');
      // TODO: Send alert notification
    });

    syncQueue.on('dlq-threshold-exceeded', ({ count }) => {
      console.error(`ALERT: DLQ threshold exceeded: ${count} events`);
      // TODO: Send alert notification
    });

    syncQueue.on('moved-to-dlq', (dlqEntry) => {
      console.warn(`Event moved to DLQ: ${dlqEntry.originalEvent.eventId}`);
    });
  }

  startHealthChecks() {
    const interval = syncConfig.sync.monitoring.healthCheckInterval || 30000;

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        if (health.overall !== 'healthy') {
          console.warn('Health check warning:', health);
        }
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, interval);
  }
}

// Export singleton instance
const syncOrchestrator = new SyncOrchestrator();
module.exports = syncOrchestrator;
```

---

## Integration with Existing Systems

### Database Adapter Integration

The existing `databaseAdapter.js` should be enhanced to mark sync-generated operations:

```javascript
// services/databaseAdapter.js - Add to create/update methods

async create(modelName, data) {
  // ... existing code ...

  // Add sync metadata to prevent infinite loops
  if (this._isFromSync()) {
    data._syncMetadata = {
      source: 'sync',
      timestamp: new Date()
    };
  }

  // ... rest of create logic ...
}

_isFromSync() {
  // Check if operation originated from sync (use AsyncLocalStorage or context)
  return false; // Implement based on your needs
}
```

### Express.js Route Integration

```javascript
// routes/syncRoutes.js

const express = require('express');
const router = express.Router();
const syncOrchestrator = require('../services/syncOrchestrator');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require admin role
router.use(authenticate);
router.use(authorize(['admin']));

// Start sync
router.post('/start', async (req, res) => {
  try {
    await syncOrchestrator.start();
    res.json({ success: true, message: 'Synchronization started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stop sync
router.post('/stop', async (req, res) => {
  try {
    await syncOrchestrator.stop();
    res.json({ success: true, message: 'Synchronization stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get status
router.get('/status', (req, res) => {
  try {
    const status = syncOrchestrator.getStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = await syncOrchestrator.healthCheck();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

## Testing Strategy

### Unit Tests Example

```javascript
// tests/unit/syncQueue.test.js

const SyncQueue = require('../../services/syncQueue');
const { v4: uuidv4 } = require('uuid');

describe('SyncQueue', () => {
  let syncQueue;

  beforeEach(() => {
    syncQueue = new SyncQueue();
  });

  describe('enqueue', () => {
    it('should enqueue an event successfully', () => {
      const event = createMockEvent();
      const success = syncQueue.enqueue(event, 'MEDIUM');

      expect(success).toBe(true);
      expect(syncQueue.mainQueue.length).toBe(1);
    });

    it('should prevent duplicate events', () => {
      const event = createMockEvent();
      syncQueue.enqueue(event, 'MEDIUM');
      const success = syncQueue.enqueue(event, 'MEDIUM');

      expect(success).toBe(false);
      expect(syncQueue.mainQueue.length).toBe(1);
    });

    it('should respect priority ordering', () => {
      const lowEvent = createMockEvent('low');
      const highEvent = createMockEvent('high');

      syncQueue.enqueue(lowEvent, 'LOW');
      syncQueue.enqueue(highEvent, 'HIGH');

      const dequeued = syncQueue.dequeue();
      expect(dequeued.eventId).toBe(highEvent.eventId);
    });
  });

  describe('retry mechanism', () => {
    it('should move to retry queue on failure', () => {
      const event = createMockEvent();
      syncQueue.enqueue(event, 'MEDIUM');

      const dequeued = syncQueue.dequeue();
      syncQueue.markFailed(dequeued.eventId, new Error('Test error'));

      expect(syncQueue.retryQueue.length).toBe(1);
      expect(syncQueue.mainQueue.length).toBe(0);
    });

    it('should move to DLQ after max retries', () => {
      const event = createMockEvent();
      event.retryCount = 5;
      syncQueue.enqueue(event, 'MEDIUM');

      const dequeued = syncQueue.dequeue();
      syncQueue.markFailed(dequeued.eventId, new Error('Test error'));

      expect(syncQueue.dlq.length).toBe(1);
      expect(syncQueue.retryQueue.length).toBe(0);
    });
  });
});

function createMockEvent(id = uuidv4()) {
  return {
    eventId: id,
    eventType: 'INSERT',
    sourceDatabase: 'mongodb',
    targetDatabase: 'zerodb',
    collection: 'users',
    documentId: 'user123',
    fullDocument: { userId: 'user123', email: 'test@example.com' },
    timestamp: new Date()
  };
}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing (coverage > 80%)
- [ ] Integration tests passing
- [ ] Configuration reviewed and validated
- [ ] Database indexes created
- [ ] Resume token persistence directory exists
- [ ] Monitoring dashboards configured
- [ ] Alert rules configured
- [ ] Documentation updated

### Deployment Steps

1. **Enable feature flag** (keep sync disabled initially)
   ```bash
   ENABLE_SYNC=false
   ```

2. **Deploy code** to staging environment

3. **Run validation** against staging data
   ```bash
   node scripts/validateSyncSetup.js
   ```

4. **Enable sync** on staging
   ```bash
   ENABLE_SYNC=true
   ```

5. **Monitor** for 24-48 hours:
   - Sync latency
   - Error rates
   - Queue depths
   - Database performance

6. **Deploy to production** with feature flag off

7. **Gradual rollout**:
   - Enable for single collection first
   - Monitor for 24 hours
   - Enable for all collections
   - Monitor continuously

### Post-Deployment

- [ ] Verify sync latency metrics
- [ ] Check DLQ is empty
- [ ] Validate data consistency
- [ ] Review error logs
- [ ] Update runbook with learnings

---

## Conclusion

This implementation guide provides the code templates and integration patterns needed to implement Phase 3 continuous synchronization. Each component is designed to be modular, testable, and production-ready.

For detailed architecture and design decisions, refer to `continuous-sync-design.md`.

---

**Next Steps:**
1. Review and approve architecture documents
2. Begin Phase 3.1 implementation (Foundation)
3. Setup development environment with sync disabled
4. Implement and test SyncQueue first
