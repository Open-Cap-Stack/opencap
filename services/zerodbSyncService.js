/**
 * ZeroDB to MongoDB Bidirectional Sync Service
 *
 * Handles real-time synchronization from ZeroDB to MongoDB
 * Features:
 * - Event stream polling from ZeroDB
 * - Multiple conflict resolution strategies
 * - Sync state persistence and checkpointing
 * - Retry mechanism with exponential backoff
 * - Idempotent operations
 * - Transaction support where available
 * - Comprehensive audit logging
 */

const mongoose = require('mongoose');
const zerodbService = require('./zerodbService');
const databaseAdapter = require('./databaseAdapter');

/**
 * Sync metadata schema for tracking sync state
 */
const SyncMetadataSchema = new mongoose.Schema({
  // Sync checkpoint tracking
  lastProcessedEventId: {
    type: String,
    required: true,
    index: true
  },
  lastProcessedTimestamp: {
    type: Number,
    required: true,
    index: true
  },

  // Sync configuration
  tableName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  syncEnabled: {
    type: Boolean,
    default: true
  },
  conflictStrategy: {
    type: String,
    enum: ['last-write-wins', 'mongodb-priority', 'zerodb-priority', 'custom'],
    default: 'last-write-wins'
  },

  // Health and metrics
  lastSyncAttempt: {
    type: Date,
    default: Date.now
  },
  lastSuccessfulSync: {
    type: Date,
    default: Date.now
  },
  consecutiveFailures: {
    type: Number,
    default: 0
  },
  totalEventsSynced: {
    type: Number,
    default: 0
  },
  totalErrors: {
    type: Number,
    default: 0
  },

  // Error tracking
  lastError: {
    message: String,
    timestamp: Date,
    stack: String
  }
}, {
  timestamps: true
});

/**
 * Sync audit log schema for detailed tracking
 */
const SyncAuditLogSchema = new mongoose.Schema({
  tableName: {
    type: String,
    required: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: ['insert', 'update', 'delete'],
    required: true
  },
  documentId: {
    type: String,
    required: true,
    index: true
  },

  // Sync details
  syncStatus: {
    type: String,
    enum: ['pending', 'success', 'failed', 'skipped', 'conflict'],
    required: true,
    index: true
  },
  conflictResolution: {
    type: String,
    enum: ['zerodb-won', 'mongodb-won', 'merged', 'manual-required']
  },

  // Data snapshots
  zerodbData: mongoose.Schema.Types.Mixed,
  mongodbData: mongoose.Schema.Types.Mixed,
  appliedData: mongoose.Schema.Types.Mixed,

  // Timing and retries
  attemptCount: {
    type: Number,
    default: 1
  },
  processingTimeMs: Number,

  // Error information
  errorMessage: String,
  errorStack: String,

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Create indexes for performance
SyncAuditLogSchema.index({ tableName: 1, timestamp: -1 });
SyncAuditLogSchema.index({ syncStatus: 1, timestamp: -1 });
SyncAuditLogSchema.index({ documentId: 1, eventType: 1 });

class ZeroDBSyncService {
  constructor() {
    this.enabled = process.env.ZERODB_SYNC_ENABLED === 'true';
    this.conflictStrategy = process.env.SYNC_CONFLICT_STRATEGY || 'last-write-wins';
    this.pollInterval = parseInt(process.env.SYNC_POLL_INTERVAL_MS) || 5000;
    this.stateCollection = process.env.SYNC_STATE_COLLECTION || 'sync_metadata';
    this.auditCollection = 'sync_audit_logs';
    this.maxRetries = parseInt(process.env.SYNC_MAX_RETRIES) || 3;
    this.baseBackoffMs = parseInt(process.env.SYNC_BASE_BACKOFF_MS) || 1000;
    this.maxBackoffMs = parseInt(process.env.SYNC_MAX_BACKOFF_MS) || 30000;

    // Runtime state
    this.initialized = false;
    this.syncIntervals = new Map(); // tableName -> intervalId
    this.syncLocks = new Map(); // tableName -> boolean
    this.customMergeStrategies = new Map(); // tableName -> function

    // Models
    this.SyncMetadata = null;
    this.SyncAuditLog = null;

    // Metrics
    this.metrics = {
      eventsProcessed: 0,
      eventsSucceeded: 0,
      eventsFailed: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      lastProcessedTime: null,
      avgProcessingTimeMs: 0,
      processingTimes: []
    };
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    if (this.initialized) {
      console.log('ZeroDBSyncService already initialized');
      return;
    }

    if (!this.enabled) {
      console.log('ZeroDBSyncService is disabled via configuration');
      return;
    }

    try {
      // Initialize models
      this.SyncMetadata = mongoose.model('SyncMetadata', SyncMetadataSchema);
      this.SyncAuditLog = mongoose.model('SyncAuditLog', SyncAuditLogSchema);

      // Ensure indexes are created
      await this.SyncMetadata.createIndexes();
      await this.SyncAuditLog.createIndexes();

      this.initialized = true;
      console.log('ZeroDBSyncService initialized successfully', {
        conflictStrategy: this.conflictStrategy,
        pollInterval: this.pollInterval
      });
    } catch (error) {
      console.error('Failed to initialize ZeroDBSyncService:', error);
      throw error;
    }
  }

  /**
   * Start syncing a specific table
   * @param {string} tableName - ZeroDB table name
   * @param {string} modelName - Mongoose model name
   * @param {Object} options - Sync options
   */
  async startSync(tableName, modelName, options = {}) {
    this._checkInitialized();

    if (this.syncIntervals.has(tableName)) {
      console.warn(`Sync already running for table: ${tableName}`);
      return;
    }

    try {
      // Initialize sync metadata if not exists
      let metadata = await this.SyncMetadata.findOne({ tableName });

      if (!metadata) {
        metadata = await this.SyncMetadata.create({
          tableName,
          lastProcessedEventId: '0',
          lastProcessedTimestamp: 0,
          syncEnabled: true,
          conflictStrategy: options.conflictStrategy || this.conflictStrategy
        });
        console.log(`Created sync metadata for table: ${tableName}`);
      }

      // Register custom merge strategy if provided
      if (options.customMergeStrategy && typeof options.customMergeStrategy === 'function') {
        this.customMergeStrategies.set(tableName, options.customMergeStrategy);
      }

      // Start polling interval
      const intervalId = setInterval(
        async () => await this._pollAndSync(tableName, modelName),
        this.pollInterval
      );

      this.syncIntervals.set(tableName, intervalId);

      // Do initial sync immediately
      await this._pollAndSync(tableName, modelName);

      console.log(`Started sync for table: ${tableName} -> model: ${modelName}`);
    } catch (error) {
      console.error(`Failed to start sync for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Stop syncing a specific table
   * @param {string} tableName - ZeroDB table name
   */
  async stopSync(tableName) {
    const intervalId = this.syncIntervals.get(tableName);

    if (intervalId) {
      clearInterval(intervalId);
      this.syncIntervals.delete(tableName);
      console.log(`Stopped sync for table: ${tableName}`);
    }
  }

  /**
   * Stop all active syncs
   */
  async stopAllSyncs() {
    for (const [tableName, intervalId] of this.syncIntervals.entries()) {
      clearInterval(intervalId);
      console.log(`Stopped sync for table: ${tableName}`);
    }
    this.syncIntervals.clear();
  }

  /**
   * Poll ZeroDB for new events and sync to MongoDB
   * @private
   */
  async _pollAndSync(tableName, modelName) {
    // Check if sync is already running for this table (prevent overlapping)
    if (this.syncLocks.get(tableName)) {
      console.log(`Sync already in progress for ${tableName}, skipping this interval`);
      return;
    }

    this.syncLocks.set(tableName, true);
    const startTime = Date.now();

    try {
      // Get current sync metadata
      const metadata = await this.SyncMetadata.findOne({ tableName });

      if (!metadata || !metadata.syncEnabled) {
        console.log(`Sync disabled for table: ${tableName}`);
        return;
      }

      // Update last attempt time
      metadata.lastSyncAttempt = new Date();
      await metadata.save();

      // Poll ZeroDB event stream
      const events = await this._fetchZeroDBEvents(
        tableName,
        metadata.lastProcessedTimestamp
      );

      if (events.length === 0) {
        // No new events
        this.syncLocks.set(tableName, false);
        return;
      }

      console.log(`Processing ${events.length} events for ${tableName}`);

      // Process events in order
      let successCount = 0;
      let errorCount = 0;
      let lastProcessedEventId = metadata.lastProcessedEventId;
      let lastProcessedTimestamp = metadata.lastProcessedTimestamp;

      for (const event of events) {
        try {
          await this._processEvent(event, tableName, modelName, metadata.conflictStrategy);
          successCount++;
          lastProcessedEventId = event.event_id;
          lastProcessedTimestamp = event.timestamp;
        } catch (error) {
          console.error(`Error processing event ${event.event_id}:`, error);
          errorCount++;

          // Log error to audit
          await this._logAudit({
            tableName,
            eventId: event.event_id,
            eventType: event.event_type,
            documentId: event.document_id || 'unknown',
            syncStatus: 'failed',
            errorMessage: error.message,
            errorStack: error.stack
          });

          // Decide whether to continue or stop based on error type
          if (this._isCriticalError(error)) {
            console.error(`Critical error encountered, stopping sync for ${tableName}`);
            break;
          }
        }
      }

      // Update metadata with checkpoint
      metadata.lastProcessedEventId = lastProcessedEventId;
      metadata.lastProcessedTimestamp = lastProcessedTimestamp;
      metadata.totalEventsSynced += successCount;
      metadata.totalErrors += errorCount;
      metadata.consecutiveFailures = errorCount > 0 ? metadata.consecutiveFailures + 1 : 0;
      metadata.lastSuccessfulSync = new Date();

      await metadata.save();

      // Update metrics
      const processingTime = Date.now() - startTime;
      this._updateMetrics(successCount, errorCount, processingTime);

      console.log(`Sync completed for ${tableName}: ${successCount} succeeded, ${errorCount} failed`);

    } catch (error) {
      console.error(`Error in sync loop for ${tableName}:`, error);

      // Update error in metadata
      try {
        await this.SyncMetadata.updateOne(
          { tableName },
          {
            $inc: { consecutiveFailures: 1, totalErrors: 1 },
            $set: {
              lastError: {
                message: error.message,
                timestamp: new Date(),
                stack: error.stack
              }
            }
          }
        );
      } catch (updateError) {
        console.error('Failed to update error metadata:', updateError);
      }
    } finally {
      this.syncLocks.set(tableName, false);
    }
  }

  /**
   * Fetch events from ZeroDB
   * @private
   */
  async _fetchZeroDBEvents(tableName, afterTimestamp) {
    try {
      // Use ZeroDB event stream API to list events
      // Filter by topic/table and timestamp
      const topic = `table:${tableName}`;
      const events = await zerodbService.listEvents(topic, 0, 100);

      // Filter events after last processed timestamp
      const filteredEvents = events.filter(event => {
        return event.timestamp > afterTimestamp;
      });

      // Sort by timestamp ascending (oldest first)
      filteredEvents.sort((a, b) => a.timestamp - b.timestamp);

      return filteredEvents;
    } catch (error) {
      console.error(`Error fetching ZeroDB events for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Process a single event from ZeroDB with retry logic
   * @private
   */
  async _processEvent(event, tableName, modelName, conflictStrategy) {
    const startTime = Date.now();

    try {
      const { event_payload } = event;
      const eventType = event_payload.operation; // 'insert', 'update', 'delete'
      const documentId = event_payload.document_id;
      const zerodbData = event_payload.data;

      console.log(`Processing ${eventType} event for document ${documentId} in ${tableName}`);

      let result;
      let auditStatus = 'success';
      let conflictResolution = null;

      // Execute with retry
      const operationResult = await this._executeWithRetry(async () => {
        switch (eventType) {
          case 'insert':
            return await this._handleInsert(modelName, documentId, zerodbData);

          case 'update':
            return await this._handleUpdate(
              modelName,
              documentId,
              zerodbData,
              conflictStrategy
            );

          case 'delete':
            return await this._handleDelete(modelName, documentId);

          default:
            throw new Error(`Unknown event type: ${eventType}`);
        }
      });

      result = operationResult;
      auditStatus = result.status;
      conflictResolution = result.conflictResolution;

      // Log successful sync to audit
      await this._logAudit({
        tableName,
        eventId: event.event_id,
        eventType,
        documentId,
        syncStatus: auditStatus,
        conflictResolution,
        zerodbData,
        appliedData: result.appliedData,
        processingTimeMs: Date.now() - startTime,
        attemptCount: operationResult.attemptCount || 1
      });

      return result;
    } catch (error) {
      console.error(`Error processing event:`, error);
      throw error;
    }
  }

  /**
   * Execute operation with exponential backoff retry
   * @private
   */
  async _executeWithRetry(operation, retryCount = 0) {
    try {
      const result = await operation();

      // Add attempt count to result
      if (typeof result === 'object') {
        result.attemptCount = retryCount + 1;
      }

      return result;
    } catch (error) {
      // Check if error is retryable
      if (!this._isRetryableError(error)) {
        console.error('Non-retryable error encountered:', error.message);
        throw error;
      }

      // Check if max retries reached
      if (retryCount >= this.maxRetries) {
        console.error(`Max retries (${this.maxRetries}) reached for operation`);
        throw new Error(`Operation failed after ${this.maxRetries} retries: ${error.message}`);
      }

      // Calculate backoff delay with jitter
      const backoffDelay = this._calculateBackoff(retryCount);

      console.warn(
        `Operation failed (attempt ${retryCount + 1}/${this.maxRetries + 1}), ` +
        `retrying in ${backoffDelay}ms:`,
        error.message
      );

      // Wait before retry
      await this._sleep(backoffDelay);

      // Retry
      return await this._executeWithRetry(operation, retryCount + 1);
    }
  }

  /**
   * Calculate exponential backoff with jitter
   * @private
   */
  _calculateBackoff(retryCount) {
    // Exponential backoff: baseBackoff * 2^retryCount
    const exponentialDelay = this.baseBackoffMs * Math.pow(2, retryCount);

    // Apply max backoff cap
    const cappedDelay = Math.min(exponentialDelay, this.maxBackoffMs);

    // Add jitter (random 0-25% of delay)
    const jitter = Math.random() * 0.25 * cappedDelay;

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Check if error is retryable
   * @private
   */
  _isRetryableError(error) {
    // Retryable error patterns
    const retryablePatterns = [
      /timeout/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /ENOTFOUND/i,
      /network/i,
      /temporary/i,
      /too many requests/i,
      /rate limit/i,
      /503/,
      /502/,
      /429/
    ];

    // Non-retryable patterns (take precedence)
    const nonRetryablePatterns = [
      /authentication/i,
      /unauthorized/i,
      /forbidden/i,
      /not found/i,
      /validation/i,
      /duplicate key/i,
      /400/,
      /401/,
      /403/,
      /404/
    ];

    const message = error.message || '';

    // Check non-retryable first
    if (nonRetryablePatterns.some(pattern => pattern.test(message))) {
      return false;
    }

    // Check retryable
    return retryablePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Sleep utility
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle insert operation
   * @private
   */
  async _handleInsert(modelName, documentId, data) {
    try {
      const Model = mongoose.model(modelName);

      // Check if document already exists (idempotency)
      const existing = await Model.findOne({ _id: documentId });

      if (existing) {
        console.log(`Document ${documentId} already exists in MongoDB, skipping insert`);
        return {
          status: 'skipped',
          reason: 'already-exists',
          appliedData: null
        };
      }

      // Insert new document
      const doc = new Model({
        _id: documentId,
        ...data
      });

      await doc.save();

      return {
        status: 'success',
        appliedData: doc.toObject()
      };
    } catch (error) {
      console.error(`Error handling insert:`, error);
      throw error;
    }
  }

  /**
   * Handle update operation with conflict resolution
   * @private
   */
  async _handleUpdate(modelName, documentId, zerodbData, conflictStrategy) {
    try {
      const Model = mongoose.model(modelName);

      // Fetch current MongoDB document
      const mongoDoc = await Model.findById(documentId);

      if (!mongoDoc) {
        // Document doesn't exist in MongoDB, treat as insert
        console.log(`Document ${documentId} not found in MongoDB, creating it`);
        return await this._handleInsert(modelName, documentId, zerodbData);
      }

      // Check for conflicts by comparing timestamps
      const mongoUpdatedAt = mongoDoc.updatedAt ? new Date(mongoDoc.updatedAt).getTime() : 0;
      const zerodbUpdatedAt = zerodbData.updated_at || zerodbData.updatedAt || Date.now();

      // Detect conflict
      const hasConflict = Math.abs(mongoUpdatedAt - zerodbUpdatedAt) < 100; // Within 100ms = potential conflict

      let appliedData;
      let conflictResolution = null;

      if (hasConflict) {
        // Apply conflict resolution strategy
        this.metrics.conflictsDetected++;

        const resolution = await this._resolveConflict(
          mongoDoc.toObject(),
          zerodbData,
          conflictStrategy,
          modelName
        );

        appliedData = resolution.data;
        conflictResolution = resolution.strategy;

        this.metrics.conflictsResolved++;
      } else if (zerodbUpdatedAt > mongoUpdatedAt) {
        // ZeroDB data is newer, apply it
        appliedData = zerodbData;
        conflictResolution = 'zerodb-newer';
      } else {
        // MongoDB data is newer, skip update
        console.log(`MongoDB data is newer for ${documentId}, skipping update`);
        return {
          status: 'skipped',
          reason: 'mongodb-newer',
          conflictResolution: 'mongodb-newer'
        };
      }

      // Apply update
      Object.assign(mongoDoc, appliedData);
      await mongoDoc.save();

      return {
        status: 'success',
        appliedData: mongoDoc.toObject(),
        conflictResolution
      };
    } catch (error) {
      console.error(`Error handling update:`, error);
      throw error;
    }
  }

  /**
   * Handle delete operation
   * @private
   */
  async _handleDelete(modelName, documentId) {
    try {
      const Model = mongoose.model(modelName);

      // Check if document exists
      const existing = await Model.findById(documentId);

      if (!existing) {
        console.log(`Document ${documentId} not found in MongoDB, already deleted`);
        return {
          status: 'skipped',
          reason: 'already-deleted'
        };
      }

      // Delete document
      await Model.findByIdAndDelete(documentId);

      return {
        status: 'success',
        appliedData: null
      };
    } catch (error) {
      console.error(`Error handling delete:`, error);
      throw error;
    }
  }

  /**
   * Resolve conflict between MongoDB and ZeroDB data
   * @private
   */
  async _resolveConflict(mongoData, zerodbData, strategy, modelName) {
    console.log(`Resolving conflict for document ${mongoData._id} using strategy: ${strategy}`);

    switch (strategy) {
      case 'last-write-wins':
        // Use timestamp to determine winner
        const mongoTime = mongoData.updatedAt ? new Date(mongoData.updatedAt).getTime() : 0;
        const zerodbTime = zerodbData.updated_at || zerodbData.updatedAt || Date.now();

        if (zerodbTime >= mongoTime) {
          return {
            data: zerodbData,
            strategy: 'zerodb-won'
          };
        } else {
          return {
            data: mongoData,
            strategy: 'mongodb-won'
          };
        }

      case 'mongodb-priority':
        // MongoDB always wins
        return {
          data: mongoData,
          strategy: 'mongodb-won'
        };

      case 'zerodb-priority':
        // ZeroDB always wins
        return {
          data: zerodbData,
          strategy: 'zerodb-won'
        };

      case 'custom':
        // Use custom merge strategy if available
        const customStrategy = this.customMergeStrategies.get(modelName);

        if (customStrategy) {
          const mergedData = await customStrategy(mongoData, zerodbData);
          return {
            data: mergedData,
            strategy: 'merged'
          };
        } else {
          console.warn(`Custom strategy specified but no function provided for ${modelName}, falling back to last-write-wins`);
          return await this._resolveConflict(mongoData, zerodbData, 'last-write-wins', modelName);
        }

      default:
        console.warn(`Unknown conflict strategy: ${strategy}, using last-write-wins`);
        return await this._resolveConflict(mongoData, zerodbData, 'last-write-wins', modelName);
    }
  }

  /**
   * Log sync operation to audit trail
   * @private
   */
  async _logAudit(auditData) {
    try {
      await this.SyncAuditLog.create(auditData);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
      // Don't throw - audit logging shouldn't break sync
    }
  }

  /**
   * Update internal metrics
   * @private
   */
  _updateMetrics(successCount, errorCount, processingTime) {
    this.metrics.eventsProcessed += (successCount + errorCount);
    this.metrics.eventsSucceeded += successCount;
    this.metrics.eventsFailed += errorCount;
    this.metrics.lastProcessedTime = new Date();

    // Update average processing time
    this.metrics.processingTimes.push(processingTime);
    if (this.metrics.processingTimes.length > 100) {
      this.metrics.processingTimes.shift();
    }

    const sum = this.metrics.processingTimes.reduce((a, b) => a + b, 0);
    this.metrics.avgProcessingTimeMs = Math.round(sum / this.metrics.processingTimes.length);
  }

  /**
   * Check if error is critical and should stop sync
   * @private
   */
  _isCriticalError(error) {
    // Define critical errors that should halt sync
    const criticalPatterns = [
      /authentication/i,
      /authorization/i,
      /network timeout/i,
      /connection refused/i
    ];

    return criticalPatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Check if service is initialized
   * @private
   */
  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('ZeroDBSyncService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get sync health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    this._checkInitialized();

    try {
      const allMetadata = await this.SyncMetadata.find({});

      const tableSyncStatus = await Promise.all(
        allMetadata.map(async (metadata) => {
          const recentErrors = await this.SyncAuditLog.countDocuments({
            tableName: metadata.tableName,
            syncStatus: 'failed',
            timestamp: { $gte: new Date(Date.now() - 3600000) } // Last hour
          });

          const isHealthy = metadata.consecutiveFailures < 5 && recentErrors < 10;

          return {
            tableName: metadata.tableName,
            syncEnabled: metadata.syncEnabled,
            lastSyncAttempt: metadata.lastSyncAttempt,
            lastSuccessfulSync: metadata.lastSuccessfulSync,
            consecutiveFailures: metadata.consecutiveFailures,
            totalEventsSynced: metadata.totalEventsSynced,
            totalErrors: metadata.totalErrors,
            recentErrors,
            isHealthy,
            lastError: metadata.lastError
          };
        })
      );

      return {
        overall: {
          enabled: this.enabled,
          initialized: this.initialized,
          activeSyncs: this.syncIntervals.size,
          metrics: this.metrics
        },
        tables: tableSyncStatus
      };
    } catch (error) {
      console.error('Error getting health status:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific table
   * @param {string} tableName - Table name
   * @param {Object} options - Query options
   * @returns {Array} Audit logs
   */
  async getAuditLogs(tableName, options = {}) {
    this._checkInitialized();

    const {
      limit = 100,
      skip = 0,
      status = null,
      startDate = null,
      endDate = null
    } = options;

    try {
      const query = { tableName };

      if (status) {
        query.syncStatus = status;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const logs = await this.SyncAuditLog
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await this.SyncAuditLog.countDocuments(query);

      return {
        logs,
        total,
        limit,
        skip
      };
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  /**
   * Register a custom merge strategy for a specific model
   * @param {string} modelName - Model name
   * @param {Function} mergeFunction - Custom merge function (mongoData, zerodbData) => mergedData
   */
  registerCustomMergeStrategy(modelName, mergeFunction) {
    if (typeof mergeFunction !== 'function') {
      throw new Error('Merge function must be a function');
    }

    this.customMergeStrategies.set(modelName, mergeFunction);
    console.log(`Registered custom merge strategy for model: ${modelName}`);
  }

  /**
   * Get current metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      eventsProcessed: 0,
      eventsSucceeded: 0,
      eventsFailed: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      lastProcessedTime: null,
      avgProcessingTimeMs: 0,
      processingTimes: []
    };
    console.log('Metrics reset');
  }
}

// Export singleton instance
module.exports = new ZeroDBSyncService();
