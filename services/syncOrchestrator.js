/**
 * Sync Orchestrator Service
 *
 * [Feature] GitHub Issue #14: Continuous data sync implementation
 *
 * Coordinates bidirectional synchronization between MongoDB and ZeroDB:
 * - MongoDB → ZeroDB via change streams
 * - ZeroDB → MongoDB via polling/webhook sync
 * - Unified health monitoring and metrics
 * - Lifecycle management (start, stop, pause, resume)
 * - Circuit breaker pattern for error recovery
 * - Graceful shutdown and cleanup
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const MetricsCollector = require('../utils/metricsCollector');

class SyncOrchestrator extends EventEmitter {
  constructor() {
    super();

    // Configuration from environment
    this.config = {
      enabled: process.env.ENABLE_SYNC === 'true',
      direction: process.env.SYNC_DIRECTION || 'bidirectional', // 'bidirectional', 'mongo-to-zerodb', 'zerodb-to-mongo'
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE) || 100,
      syncInterval: parseInt(process.env.SYNC_INTERVAL_MS) || 5000,
      maxRetries: parseInt(process.env.SYNC_MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.SYNC_RETRY_DELAY_MS) || 1000,
      circuitBreakerThreshold: parseInt(process.env.SYNC_CIRCUIT_BREAKER_THRESHOLD) || 5,
      circuitBreakerResetTime: parseInt(process.env.SYNC_CIRCUIT_BREAKER_RESET_MS) || 60000,
      healthCheckInterval: parseInt(process.env.SYNC_HEALTH_CHECK_INTERVAL_MS) || 30000,
    };

    // Sync state management
    this.state = {
      status: 'stopped', // 'stopped', 'starting', 'running', 'paused', 'stopping', 'error'
      mongoToZerodb: {
        enabled: false,
        healthy: false,
        lastSync: null,
        errorCount: 0,
        successCount: 0,
        lastError: null,
      },
      zerodbToMongo: {
        enabled: false,
        healthy: false,
        lastSync: null,
        errorCount: 0,
        successCount: 0,
        lastError: null,
      },
    };

    // Circuit breaker state
    this.circuitBreaker = {
      mongoToZerodb: {
        state: 'closed', // 'closed', 'open', 'half-open'
        failures: 0,
        lastFailure: null,
        nextRetry: null,
      },
      zerodbToMongo: {
        state: 'closed',
        failures: 0,
        lastFailure: null,
        nextRetry: null,
      },
    };

    // Service instances
    this.mongoChangeStreamListener = null;
    this.zerodbSyncService = null;

    // Metrics collector
    this.metricsCollector = new MetricsCollector({ maxMetricsPerDatabase: 10000 });

    // Health check interval
    this.healthCheckInterval = null;

    // Sync queues for throttling and batching
    this.syncQueues = {
      mongoToZerodb: [],
      zerodbToMongo: [],
    };

    // Queue processing flags
    this.queueProcessing = {
      mongoToZerodb: false,
      zerodbToMongo: false,
    };
  }

  /**
   * Initialize sync orchestrator
   * @param {Object} options - Initialization options
   * @param {Object} options.mongoChangeStreamListener - MongoDB change stream listener instance
   * @param {Object} options.zerodbSyncService - ZeroDB sync service instance
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(options = {}) {
    if (!this.config.enabled) {
      console.log('Sync orchestrator disabled (ENABLE_SYNC=false)');
      return { status: 'disabled' };
    }

    console.log('Initializing sync orchestrator...');

    try {
      // Store service instances
      this.mongoChangeStreamListener = options.mongoChangeStreamListener;
      this.zerodbSyncService = options.zerodbSyncService;

      // Validate services based on sync direction
      if (this.config.direction === 'bidirectional' || this.config.direction === 'mongo-to-zerodb') {
        if (!this.mongoChangeStreamListener) {
          throw new Error('MongoDB change stream listener required for MongoDB→ZeroDB sync');
        }
      }

      if (this.config.direction === 'bidirectional' || this.config.direction === 'zerodb-to-mongo') {
        if (!this.zerodbSyncService) {
          throw new Error('ZeroDB sync service required for ZeroDB→MongoDB sync');
        }
      }

      // Set up event listeners for sync services
      this._setupEventListeners();

      console.log('Sync orchestrator initialized successfully');
      return {
        status: 'initialized',
        config: this.config,
        direction: this.config.direction,
      };
    } catch (error) {
      console.error('Failed to initialize sync orchestrator:', error);
      this.state.status = 'error';
      throw error;
    }
  }

  /**
   * Start sync services
   * @returns {Promise<Object>} Start result
   */
  async start() {
    if (!this.config.enabled) {
      return { status: 'disabled', message: 'Sync orchestrator is disabled' };
    }

    if (this.state.status === 'running') {
      return { status: 'already_running', message: 'Sync orchestrator is already running' };
    }

    console.log('Starting sync orchestrator...');
    this.state.status = 'starting';

    try {
      // Start MongoDB → ZeroDB sync
      if (this.config.direction === 'bidirectional' || this.config.direction === 'mongo-to-zerodb') {
        await this._startMongoToZerodbSync();
      }

      // Start ZeroDB → MongoDB sync
      if (this.config.direction === 'bidirectional' || this.config.direction === 'zerodb-to-mongo') {
        await this._startZerodbToMongoSync();
      }

      // Start health check monitoring
      this._startHealthCheck();

      this.state.status = 'running';
      this.emit('sync:started');

      console.log('Sync orchestrator started successfully');
      return {
        status: 'running',
        mongoToZerodb: this.state.mongoToZerodb.enabled,
        zerodbToMongo: this.state.zerodbToMongo.enabled,
      };
    } catch (error) {
      console.error('Failed to start sync orchestrator:', error);
      this.state.status = 'error';
      this.emit('sync:error', error);
      throw error;
    }
  }

  /**
   * Stop sync services
   * @returns {Promise<Object>} Stop result
   */
  async stop() {
    if (this.state.status === 'stopped') {
      return { status: 'already_stopped', message: 'Sync orchestrator is already stopped' };
    }

    console.log('Stopping sync orchestrator...');
    this.state.status = 'stopping';

    try {
      // Stop MongoDB → ZeroDB sync
      if (this.state.mongoToZerodb.enabled) {
        await this._stopMongoToZerodbSync();
      }

      // Stop ZeroDB → MongoDB sync
      if (this.state.zerodbToMongo.enabled) {
        await this._stopZerodbToMongoSync();
      }

      // Stop health check
      this._stopHealthCheck();

      this.state.status = 'stopped';
      this.emit('sync:stopped');

      console.log('Sync orchestrator stopped successfully');
      return { status: 'stopped' };
    } catch (error) {
      console.error('Failed to stop sync orchestrator:', error);
      this.state.status = 'error';
      throw error;
    }
  }

  /**
   * Pause sync services temporarily
   * @returns {Promise<Object>} Pause result
   */
  async pause() {
    if (this.state.status !== 'running') {
      return { status: 'error', message: 'Cannot pause - sync orchestrator is not running' };
    }

    console.log('Pausing sync orchestrator...');

    try {
      // Pause MongoDB → ZeroDB sync
      if (this.state.mongoToZerodb.enabled && this.mongoChangeStreamListener.pause) {
        await this.mongoChangeStreamListener.pause();
      }

      // Pause ZeroDB → MongoDB sync
      if (this.state.zerodbToMongo.enabled && this.zerodbSyncService.pause) {
        await this.zerodbSyncService.pause();
      }

      this.state.status = 'paused';
      this.emit('sync:paused');

      console.log('Sync orchestrator paused');
      return { status: 'paused' };
    } catch (error) {
      console.error('Failed to pause sync orchestrator:', error);
      throw error;
    }
  }

  /**
   * Resume paused sync services
   * @returns {Promise<Object>} Resume result
   */
  async resume() {
    if (this.state.status !== 'paused') {
      return { status: 'error', message: 'Cannot resume - sync orchestrator is not paused' };
    }

    console.log('Resuming sync orchestrator...');

    try {
      // Resume MongoDB → ZeroDB sync
      if (this.state.mongoToZerodb.enabled && this.mongoChangeStreamListener.resume) {
        await this.mongoChangeStreamListener.resume();
      }

      // Resume ZeroDB → MongoDB sync
      if (this.state.zerodbToMongo.enabled && this.zerodbSyncService.resume) {
        await this.zerodbSyncService.resume();
      }

      this.state.status = 'running';
      this.emit('sync:resumed');

      console.log('Sync orchestrator resumed');
      return { status: 'running' };
    } catch (error) {
      console.error('Failed to resume sync orchestrator:', error);
      throw error;
    }
  }

  /**
   * Trigger full resync for a specific collection
   * @param {string} collection - Collection name to resync
   * @param {string} direction - Sync direction ('mongo-to-zerodb' or 'zerodb-to-mongo')
   * @returns {Promise<Object>} Resync result
   */
  async resyncCollection(collection, direction = 'mongo-to-zerodb') {
    console.log(`Starting full resync for collection: ${collection} (${direction})`);

    try {
      let result;

      if (direction === 'mongo-to-zerodb') {
        // Full sync from MongoDB to ZeroDB
        const Model = mongoose.model(collection);
        const documents = await Model.find({}).lean().exec();

        result = await this._batchSyncToZerodb(collection, documents);
      } else if (direction === 'zerodb-to-mongo') {
        // Full sync from ZeroDB to MongoDB
        const tableName = this._modelToTableName(collection);
        result = await this.zerodbSyncService.syncCollection(tableName, collection);
      } else {
        throw new Error(`Invalid sync direction: ${direction}`);
      }

      this.emit('sync:resync:complete', { collection, direction, result });

      console.log(`Full resync completed for collection: ${collection}`);
      return {
        status: 'completed',
        collection,
        direction,
        result,
      };
    } catch (error) {
      console.error(`Failed to resync collection ${collection}:`, error);
      this.emit('sync:resync:error', { collection, direction, error });
      throw error;
    }
  }

  /**
   * Get comprehensive sync status
   * @returns {Object} Sync status
   */
  getStatus() {
    return {
      orchestrator: {
        status: this.state.status,
        enabled: this.config.enabled,
        direction: this.config.direction,
        uptime: this.state.status === 'running' ? process.uptime() : 0,
      },
      mongoToZerodb: {
        ...this.state.mongoToZerodb,
        queueDepth: this.syncQueues.mongoToZerodb.length,
        circuitBreaker: this.circuitBreaker.mongoToZerodb,
        syncLag: this._calculateSyncLag('mongoToZerodb'),
      },
      zerodbToMongo: {
        ...this.state.zerodbToMongo,
        queueDepth: this.syncQueues.zerodbToMongo.length,
        circuitBreaker: this.circuitBreaker.zerodbToMongo,
        syncLag: this._calculateSyncLag('zerodbToMongo'),
      },
      connections: {
        mongodb: mongoose.connection.readyState === 1,
        zerodb: this.zerodbSyncService?.isConnected?.() || false,
      },
    };
  }

  /**
   * Get detailed sync metrics
   * @returns {Object} Sync metrics
   */
  getMetrics() {
    const metricsData = this.metricsCollector.getMetrics();

    return {
      mongoToZerodb: {
        successRate: this._calculateSuccessRate('mongoToZerodb'),
        errorRate: this._calculateErrorRate('mongoToZerodb'),
        averageSyncTime: this._calculateAverageSyncTime('mongoToZerodb'),
        totalSynced: this.state.mongoToZerodb.successCount,
        totalErrors: this.state.mongoToZerodb.errorCount,
        lastSync: this.state.mongoToZerodb.lastSync,
        lastError: this.state.mongoToZerodb.lastError,
      },
      zerodbToMongo: {
        successRate: this._calculateSuccessRate('zerodbToMongo'),
        errorRate: this._calculateErrorRate('zerodbToMongo'),
        averageSyncTime: this._calculateAverageSyncTime('zerodbToMongo'),
        totalSynced: this.state.zerodbToMongo.successCount,
        totalErrors: this.state.zerodbToMongo.errorCount,
        lastSync: this.state.zerodbToMongo.lastSync,
        lastError: this.state.zerodbToMongo.lastError,
      },
      database: {
        mongodb: metricsData.mongodb || {},
        zerodb: metricsData.zerodb || {},
      },
    };
  }

  /**
   * Get health status for both sync directions
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const mongoToZerodbHealth = this._assessHealth('mongoToZerodb');
    const zerodbToMongoHealth = this._assessHealth('zerodbToMongo');

    const overallHealth =
      mongoToZerodbHealth === 'healthy' && zerodbToMongoHealth === 'healthy'
        ? 'healthy'
        : mongoToZerodbHealth === 'unhealthy' || zerodbToMongoHealth === 'unhealthy'
        ? 'unhealthy'
        : 'degraded';

    return {
      overall: overallHealth,
      mongoToZerodb: {
        status: mongoToZerodbHealth,
        enabled: this.state.mongoToZerodb.enabled,
        healthy: this.state.mongoToZerodb.healthy,
        errorRate: this._calculateErrorRate('mongoToZerodb'),
        circuitBreakerState: this.circuitBreaker.mongoToZerodb.state,
      },
      zerodbToMongo: {
        status: zerodbToMongoHealth,
        enabled: this.state.zerodbToMongo.enabled,
        healthy: this.state.zerodbToMongo.healthy,
        errorRate: this._calculateErrorRate('zerodbToMongo'),
        circuitBreakerState: this.circuitBreaker.zerodbToMongo.state,
      },
      connections: {
        mongodb: {
          connected: mongoose.connection.readyState === 1,
          state: mongoose.connection.states[mongoose.connection.readyState],
        },
        zerodb: {
          connected: this.zerodbSyncService?.isConnected?.() || false,
        },
      },
    };
  }

  /**
   * Graceful shutdown
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('Initiating graceful shutdown of sync orchestrator...');

    try {
      // Stop sync services
      await this.stop();

      // Process remaining items in queues
      await this._processRemainingQueueItems();

      // Clear all intervals
      this._stopHealthCheck();

      console.log('Sync orchestrator shutdown complete');
      this.emit('sync:shutdown');
    } catch (error) {
      console.error('Error during sync orchestrator shutdown:', error);
      throw error;
    }
  }

  // Private methods

  /**
   * Set up event listeners for sync services
   * @private
   */
  _setupEventListeners() {
    // MongoDB → ZeroDB change stream events
    if (this.mongoChangeStreamListener) {
      this.mongoChangeStreamListener.on('change', (change) => {
        this._handleMongoChange(change);
      });

      this.mongoChangeStreamListener.on('error', (error) => {
        this._handleMongoToZerodbError(error);
      });
    }

    // ZeroDB → MongoDB sync events
    if (this.zerodbSyncService) {
      this.zerodbSyncService.on('sync', (data) => {
        this._handleZerodbSync(data);
      });

      this.zerodbSyncService.on('error', (error) => {
        this._handleZerodbToMongoError(error);
      });
    }
  }

  /**
   * Start MongoDB → ZeroDB sync
   * @private
   */
  async _startMongoToZerodbSync() {
    console.log('Starting MongoDB → ZeroDB sync...');

    try {
      await this.mongoChangeStreamListener.start();

      this.state.mongoToZerodb.enabled = true;
      this.state.mongoToZerodb.healthy = true;
      this.circuitBreaker.mongoToZerodb.state = 'closed';
      this.circuitBreaker.mongoToZerodb.failures = 0;

      console.log('MongoDB → ZeroDB sync started');
    } catch (error) {
      console.error('Failed to start MongoDB → ZeroDB sync:', error);
      this.state.mongoToZerodb.healthy = false;
      throw error;
    }
  }

  /**
   * Stop MongoDB → ZeroDB sync
   * @private
   */
  async _stopMongoToZerodbSync() {
    console.log('Stopping MongoDB → ZeroDB sync...');

    try {
      await this.mongoChangeStreamListener.stop();

      this.state.mongoToZerodb.enabled = false;
      this.state.mongoToZerodb.healthy = false;

      console.log('MongoDB → ZeroDB sync stopped');
    } catch (error) {
      console.error('Failed to stop MongoDB → ZeroDB sync:', error);
      throw error;
    }
  }

  /**
   * Start ZeroDB → MongoDB sync
   * @private
   */
  async _startZerodbToMongoSync() {
    console.log('Starting ZeroDB → MongoDB sync...');

    try {
      await this.zerodbSyncService.start();

      this.state.zerodbToMongo.enabled = true;
      this.state.zerodbToMongo.healthy = true;
      this.circuitBreaker.zerodbToMongo.state = 'closed';
      this.circuitBreaker.zerodbToMongo.failures = 0;

      console.log('ZeroDB → MongoDB sync started');
    } catch (error) {
      console.error('Failed to start ZeroDB → MongoDB sync:', error);
      this.state.zerodbToMongo.healthy = false;
      throw error;
    }
  }

  /**
   * Stop ZeroDB → MongoDB sync
   * @private
   */
  async _stopZerodbToMongoSync() {
    console.log('Stopping ZeroDB → MongoDB sync...');

    try {
      await this.zerodbSyncService.stop();

      this.state.zerodbToMongo.enabled = false;
      this.state.zerodbToMongo.healthy = false;

      console.log('ZeroDB → MongoDB sync stopped');
    } catch (error) {
      console.error('Failed to stop ZeroDB → MongoDB sync:', error);
      throw error;
    }
  }

  /**
   * Start health check monitoring
   * @private
   */
  _startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this._performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log(`Health check started (interval: ${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Stop health check monitoring
   * @private
   */
  _stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Health check stopped');
    }
  }

  /**
   * Perform health check on sync services
   * @private
   */
  _performHealthCheck() {
    // Check MongoDB → ZeroDB health
    if (this.state.mongoToZerodb.enabled) {
      const mongoToZerodbHealth = this._assessHealth('mongoToZerodb');
      this.state.mongoToZerodb.healthy = mongoToZerodbHealth === 'healthy';

      if (mongoToZerodbHealth === 'unhealthy') {
        this.emit('sync:health:warning', {
          direction: 'mongoToZerodb',
          status: mongoToZerodbHealth,
          errorRate: this._calculateErrorRate('mongoToZerodb'),
        });
      }
    }

    // Check ZeroDB → MongoDB health
    if (this.state.zerodbToMongo.enabled) {
      const zerodbToMongoHealth = this._assessHealth('zerodbToMongo');
      this.state.zerodbToMongo.healthy = zerodbToMongoHealth === 'healthy';

      if (zerodbToMongoHealth === 'unhealthy') {
        this.emit('sync:health:warning', {
          direction: 'zerodbToMongo',
          status: zerodbToMongoHealth,
          errorRate: this._calculateErrorRate('zerodbToMongo'),
        });
      }
    }

    // Check circuit breakers
    this._checkCircuitBreakers();
  }

  /**
   * Check and update circuit breaker states
   * @private
   */
  _checkCircuitBreakers() {
    // Check MongoDB → ZeroDB circuit breaker
    const mongoCircuit = this.circuitBreaker.mongoToZerodb;
    if (mongoCircuit.state === 'open' && mongoCircuit.nextRetry && Date.now() >= mongoCircuit.nextRetry) {
      console.log('MongoDB → ZeroDB circuit breaker transitioning to half-open');
      mongoCircuit.state = 'half-open';
      mongoCircuit.failures = 0;
    }

    // Check ZeroDB → MongoDB circuit breaker
    const zerodbCircuit = this.circuitBreaker.zerodbToMongo;
    if (zerodbCircuit.state === 'open' && zerodbCircuit.nextRetry && Date.now() >= zerodbCircuit.nextRetry) {
      console.log('ZeroDB → MongoDB circuit breaker transitioning to half-open');
      zerodbCircuit.state = 'half-open';
      zerodbCircuit.failures = 0;
    }
  }

  /**
   * Handle MongoDB change event
   * @private
   */
  _handleMongoChange(change) {
    // Add to sync queue
    this.syncQueues.mongoToZerodb.push({
      change,
      timestamp: Date.now(),
      retries: 0,
    });

    // Process queue if not already processing
    if (!this.queueProcessing.mongoToZerodb) {
      this._processMongoToZerodbQueue();
    }
  }

  /**
   * Process MongoDB → ZeroDB sync queue
   * @private
   */
  async _processMongoToZerodbQueue() {
    if (this.queueProcessing.mongoToZerodb || this.syncQueues.mongoToZerodb.length === 0) {
      return;
    }

    this.queueProcessing.mongoToZerodb = true;

    while (this.syncQueues.mongoToZerodb.length > 0) {
      // Check circuit breaker
      if (this.circuitBreaker.mongoToZerodb.state === 'open') {
        console.log('MongoDB → ZeroDB circuit breaker is open, pausing queue processing');
        break;
      }

      // Get batch of items
      const batch = this.syncQueues.mongoToZerodb.splice(0, this.config.batchSize);

      try {
        const startTime = Date.now();

        // Process batch
        for (const item of batch) {
          await this._syncChangeToZerodb(item.change);
        }

        const duration = Date.now() - startTime;

        // Record success metrics
        this.state.mongoToZerodb.successCount += batch.length;
        this.state.mongoToZerodb.lastSync = new Date().toISOString();
        this.metricsCollector.trackQuery('zerodb', 'sync_batch', duration, true);

        // Reset circuit breaker on success
        if (this.circuitBreaker.mongoToZerodb.state === 'half-open') {
          console.log('MongoDB → ZeroDB circuit breaker closing after successful sync');
          this.circuitBreaker.mongoToZerodb.state = 'closed';
          this.circuitBreaker.mongoToZerodb.failures = 0;
        }
      } catch (error) {
        console.error('Error processing MongoDB → ZeroDB batch:', error);

        // Re-queue items with retry logic
        for (const item of batch) {
          if (item.retries < this.config.maxRetries) {
            item.retries++;
            this.syncQueues.mongoToZerodb.push(item);
          } else {
            console.error(`Max retries exceeded for change: ${JSON.stringify(item.change)}`);
            this.emit('sync:item:failed', { direction: 'mongoToZerodb', item, error });
          }
        }

        this._handleMongoToZerodbError(error);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.queueProcessing.mongoToZerodb = false;
  }

  /**
   * Sync a single change to ZeroDB
   * @private
   */
  async _syncChangeToZerodb(change) {
    const { operationType, ns, documentKey, fullDocument, updateDescription } = change;
    const tableName = this._modelToTableName(ns.coll);

    try {
      switch (operationType) {
        case 'insert':
          await this.zerodbSyncService.insertDocument(tableName, fullDocument);
          break;

        case 'update':
          await this.zerodbSyncService.updateDocument(tableName, documentKey._id, updateDescription);
          break;

        case 'replace':
          await this.zerodbSyncService.replaceDocument(tableName, documentKey._id, fullDocument);
          break;

        case 'delete':
          await this.zerodbSyncService.deleteDocument(tableName, documentKey._id);
          break;

        default:
          console.log(`Unsupported operation type: ${operationType}`);
      }
    } catch (error) {
      console.error(`Failed to sync ${operationType} to ZeroDB:`, error);
      throw error;
    }
  }

  /**
   * Batch sync documents to ZeroDB
   * @private
   */
  async _batchSyncToZerodb(collection, documents) {
    const tableName = this._modelToTableName(collection);
    const batchSize = this.config.batchSize;
    let syncedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      try {
        await this.zerodbSyncService.insertDocuments(tableName, batch);
        syncedCount += batch.length;
      } catch (error) {
        console.error(`Error syncing batch ${i / batchSize + 1}:`, error);
        errorCount += batch.length;
      }
    }

    return { syncedCount, errorCount, total: documents.length };
  }

  /**
   * Handle ZeroDB sync event
   * @private
   */
  _handleZerodbSync(data) {
    this.state.zerodbToMongo.successCount++;
    this.state.zerodbToMongo.lastSync = new Date().toISOString();
  }

  /**
   * Handle MongoDB → ZeroDB error
   * @private
   */
  _handleMongoToZerodbError(error) {
    this.state.mongoToZerodb.errorCount++;
    this.state.mongoToZerodb.lastError = {
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    // Update circuit breaker
    const circuit = this.circuitBreaker.mongoToZerodb;
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.config.circuitBreakerThreshold) {
      console.error(`MongoDB → ZeroDB circuit breaker opened after ${circuit.failures} failures`);
      circuit.state = 'open';
      circuit.nextRetry = Date.now() + this.config.circuitBreakerResetTime;

      this.emit('sync:circuit:open', { direction: 'mongoToZerodb', failures: circuit.failures });
    }

    this.emit('sync:error', { direction: 'mongoToZerodb', error });
  }

  /**
   * Handle ZeroDB → MongoDB error
   * @private
   */
  _handleZerodbToMongoError(error) {
    this.state.zerodbToMongo.errorCount++;
    this.state.zerodbToMongo.lastError = {
      message: error.message,
      timestamp: new Date().toISOString(),
    };

    // Update circuit breaker
    const circuit = this.circuitBreaker.zerodbToMongo;
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.failures >= this.config.circuitBreakerThreshold) {
      console.error(`ZeroDB → MongoDB circuit breaker opened after ${circuit.failures} failures`);
      circuit.state = 'open';
      circuit.nextRetry = Date.now() + this.config.circuitBreakerResetTime;

      this.emit('sync:circuit:open', { direction: 'zerodbToMongo', failures: circuit.failures });
    }

    this.emit('sync:error', { direction: 'zerodbToMongo', error });
  }

  /**
   * Process remaining items in queues during shutdown
   * @private
   */
  async _processRemainingQueueItems() {
    console.log(`Processing remaining queue items (MongoDB→ZeroDB: ${this.syncQueues.mongoToZerodb.length}, ZeroDB→MongoDB: ${this.syncQueues.zerodbToMongo.length})`);

    // Process MongoDB → ZeroDB queue
    if (this.syncQueues.mongoToZerodb.length > 0) {
      await this._processMongoToZerodbQueue();
    }

    // Process ZeroDB → MongoDB queue would be handled similarly
  }

  /**
   * Calculate success rate for a sync direction
   * @private
   */
  _calculateSuccessRate(direction) {
    const state = this.state[direction];
    const total = state.successCount + state.errorCount;
    return total > 0 ? (state.successCount / total) * 100 : 0;
  }

  /**
   * Calculate error rate for a sync direction
   * @private
   */
  _calculateErrorRate(direction) {
    const state = this.state[direction];
    const total = state.successCount + state.errorCount;
    return total > 0 ? (state.errorCount / total) * 100 : 0;
  }

  /**
   * Calculate average sync time for a sync direction
   * @private
   */
  _calculateAverageSyncTime(direction) {
    // This would use metrics collector to calculate average
    const database = direction === 'mongoToZerodb' ? 'zerodb' : 'mongodb';
    const summary = this.metricsCollector.getSummaryStats(database);
    return summary ? summary.averageResponseTime : 0;
  }

  /**
   * Calculate sync lag (time between source change and sync completion)
   * @private
   */
  _calculateSyncLag(direction) {
    const state = this.state[direction];
    if (!state.lastSync) {
      return null;
    }

    const lastSyncTime = new Date(state.lastSync).getTime();
    const now = Date.now();
    return now - lastSyncTime;
  }

  /**
   * Assess health status for a sync direction
   * @private
   */
  _assessHealth(direction) {
    const errorRate = this._calculateErrorRate(direction);
    const circuitState = this.circuitBreaker[direction].state;

    if (circuitState === 'open') {
      return 'unhealthy';
    }

    if (errorRate < 5) {
      return 'healthy';
    } else if (errorRate < 10) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }

  /**
   * Convert model name to table name
   * @private
   */
  _modelToTableName(modelName) {
    return modelName.toLowerCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '');
  }
}

// Export singleton instance
module.exports = new SyncOrchestrator();
