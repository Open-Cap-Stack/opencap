/**
 * MongoDB Change Streams Listener Service
 *
 * [Feature] GitHub Issue #14: Continuous sync from MongoDB to ZeroDB
 *
 * Watches MongoDB collections for real-time changes and synchronizes them to ZeroDB.
 * Implements fault tolerance, backpressure handling, and comprehensive error recovery.
 *
 * Key Features:
 * - Real-time change stream monitoring for all collections
 * - Automatic resume on connection loss with resume tokens
 * - Batch processing for high-volume changes
 * - Dead letter queue for failed sync operations
 * - Exponential backoff for retries
 * - Granular metrics and health monitoring
 * - Collection and operation type filtering
 *
 * @module services/mongoChangeStreamListener
 */

const mongoose = require('mongoose');
const zerodbService = require('./zerodbService');
const databaseAdapter = require('./databaseAdapter');
const { databaseMonitor } = require('../middleware/databaseMonitor');
const MetricsCollector = require('../utils/metricsCollector');
const fs = require('fs');
const path = require('path');

/**
 * MongoDB to ZeroDB table name mapping
 */
const COLLECTION_TABLE_MAP = {
  users: 'users',
  companies: 'companies',
  stakeholders: 'stakeholders',
  investors: 'investors',
  shareclasses: 'share_classes',
  transactions: 'transactions',
  documents: 'documents',
  financialmetrics: 'financial_metrics',
  employees: 'employees',
  fundraisingrounds: 'fundraising_rounds',
  equityplans: 'equity_plans',
  spvs: 'spvs',
  spvassets: 'spv_assets',
  balancesheets: 'balance_sheets',
  cashflowstatements: 'cash_flow_statements',
  financialreports: 'financial_reports',
  compliancechecks: 'compliance_checks',
  securityaudits: 'security_audits',
  communications: 'communications',
  notifications: 'notifications',
  activities: 'activities',
  documentembeddings: 'document_embeddings',
  documentaccess: 'document_access',
  invitemanagement: 'invite_management',
  integrations: 'integrations',
  taxcalculators: 'tax_calculators',
  investmenttrackers: 'investment_trackers'
};

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  enabled: false,
  batchSize: 50,
  batchTimeoutMs: 5000,
  retryAttempts: 3,
  retryDelayMs: 1000,
  maxRetryDelayMs: 30000,
  collections: Object.keys(COLLECTION_TABLE_MAP),
  operationTypes: ['insert', 'update', 'delete', 'replace'],
  resumeTokenPersistence: true,
  resumeTokenPath: './data/change-stream-tokens.json',
  deadLetterQueuePath: './data/sync-dlq.json',
  maxDeadLetterQueueSize: 1000,
  healthCheckIntervalMs: 60000,
  reconnectDelayMs: 5000,
  maxReconnectDelayMs: 60000
};

class MongoChangeStreamListener {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.changeStreams = new Map();
    this.resumeTokens = new Map();
    this.isRunning = false;
    this.isPaused = false;
    this.eventBatches = new Map();
    this.batchTimers = new Map();
    this.deadLetterQueue = [];
    this.metrics = new MetricsCollector({ maxMetricsPerDatabase: 10000 });
    this.reconnectAttempts = new Map();
    this.healthCheckInterval = null;

    // Sync metrics
    this.syncMetrics = {
      totalEvents: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      retriedEvents: 0,
      deadLetterQueueSize: 0,
      currentBatchSizes: {},
      avgSyncLatency: 0,
      maxSyncLatency: 0,
      lastSyncTimestamp: null,
      streamStatus: {}
    };

    // Bind methods to preserve context
    this.handleChangeEvent = this.handleChangeEvent.bind(this);
    this.processBatch = this.processBatch.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
  }

  /**
   * Initialize the change stream listener
   * @param {Object} options - Initialization options
   * @param {string} options.zerodbToken - ZeroDB authentication token
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (!this.config.enabled) {
      console.log('MongoDB Change Stream Listener is disabled');
      return;
    }

    try {
      console.log('Initializing MongoDB Change Stream Listener...');

      // Verify MongoDB connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection not ready. Ensure MongoDB is connected before initializing change streams.');
      }

      // Initialize ZeroDB if not already initialized
      if (!zerodbService.projectId && options.zerodbToken) {
        await zerodbService.initialize(options.zerodbToken);
      }

      // Verify ZeroDB connection
      if (!zerodbService.projectId) {
        throw new Error('ZeroDB not initialized. Provide zerodbToken or initialize ZeroDB before starting change streams.');
      }

      // Load resume tokens from persistence
      await this.loadResumeTokens();

      // Load dead letter queue from persistence
      await this.loadDeadLetterQueue();

      // Start change streams for configured collections
      await this.startChangeStreams();

      // Start health check monitoring
      this.startHealthCheck();

      this.isRunning = true;
      console.log(`MongoDB Change Stream Listener initialized successfully`);
      console.log(`Monitoring ${this.changeStreams.size} collections`);
      console.log(`Batch size: ${this.config.batchSize}, Batch timeout: ${this.config.batchTimeoutMs}ms`);
    } catch (error) {
      console.error('Failed to initialize MongoDB Change Stream Listener:', error);
      throw error;
    }
  }

  /**
   * Start change streams for all configured collections
   * @returns {Promise<void>}
   */
  async startChangeStreams() {
    const startPromises = this.config.collections.map(async (collectionName) => {
      try {
        await this.startChangeStream(collectionName);
      } catch (error) {
        console.error(`Failed to start change stream for ${collectionName}:`, error);
        this.syncMetrics.streamStatus[collectionName] = 'failed';
      }
    });

    await Promise.allSettled(startPromises);
  }

  /**
   * Start a change stream for a specific collection
   * @param {string} collectionName - MongoDB collection name
   * @returns {Promise<void>}
   */
  async startChangeStream(collectionName) {
    // Check if collection exists in database
    const collections = await mongoose.connection.db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.warn(`Collection ${collectionName} does not exist, skipping change stream`);
      this.syncMetrics.streamStatus[collectionName] = 'skipped';
      return;
    }

    // Close existing stream if any
    if (this.changeStreams.has(collectionName)) {
      await this.stopChangeStream(collectionName);
    }

    try {
      const collection = mongoose.connection.collection(collectionName);

      // Configure change stream options
      const changeStreamOptions = {
        fullDocument: 'updateLookup',
        fullDocumentBeforeChange: 'whenAvailable'
      };

      // Add resume token if available
      const resumeToken = this.resumeTokens.get(collectionName);
      if (resumeToken) {
        changeStreamOptions.resumeAfter = resumeToken;
        console.log(`Resuming change stream for ${collectionName} from previous token`);
      }

      // Create change stream with operation type filter
      const pipeline = [
        {
          $match: {
            operationType: { $in: this.config.operationTypes }
          }
        }
      ];

      const changeStream = collection.watch(pipeline, changeStreamOptions);

      // Set up event handlers
      changeStream.on('change', (change) => this.handleChangeEvent(collectionName, change));

      changeStream.on('error', (error) => {
        console.error(`Change stream error for ${collectionName}:`, error);
        this.syncMetrics.streamStatus[collectionName] = 'error';
        this.metrics.trackQuery('mongodb_changestream', collectionName, 0, false, error);

        // Attempt to reconnect with exponential backoff
        this.scheduleReconnect(collectionName);
      });

      changeStream.on('close', () => {
        console.warn(`Change stream closed for ${collectionName}`);
        this.syncMetrics.streamStatus[collectionName] = 'closed';
        this.scheduleReconnect(collectionName);
      });

      changeStream.on('end', () => {
        console.log(`Change stream ended for ${collectionName}`);
        this.syncMetrics.streamStatus[collectionName] = 'ended';
      });

      // Store the change stream
      this.changeStreams.set(collectionName, changeStream);
      this.syncMetrics.streamStatus[collectionName] = 'active';

      console.log(`Change stream started for ${collectionName}`);
    } catch (error) {
      console.error(`Error starting change stream for ${collectionName}:`, error);
      this.syncMetrics.streamStatus[collectionName] = 'failed';
      throw error;
    }
  }

  /**
   * Handle a change event from MongoDB
   * @param {string} collectionName - Collection name
   * @param {Object} change - Change event object
   */
  handleChangeEvent(collectionName, change) {
    if (this.isPaused) {
      console.log(`Change stream paused, skipping event for ${collectionName}`);
      return;
    }

    try {
      // Update resume token
      if (change._id) {
        this.resumeTokens.set(collectionName, change._id);
        this.persistResumeTokens();
      }

      // Update metrics
      this.syncMetrics.totalEvents++;

      // Add to batch
      if (!this.eventBatches.has(collectionName)) {
        this.eventBatches.set(collectionName, []);
      }

      const batch = this.eventBatches.get(collectionName);
      batch.push({
        change,
        receivedAt: Date.now(),
        attempts: 0
      });

      this.syncMetrics.currentBatchSizes[collectionName] = batch.length;

      // Process batch if it reaches the configured size
      if (batch.length >= this.config.batchSize) {
        this.processBatch(collectionName);
      } else {
        // Set/reset batch timer
        this.resetBatchTimer(collectionName);
      }
    } catch (error) {
      console.error(`Error handling change event for ${collectionName}:`, error);
      this.metrics.trackQuery('mongodb_changestream', `${collectionName}_handle_event`, 0, false, error);
    }
  }

  /**
   * Reset batch timer for a collection
   * @param {string} collectionName - Collection name
   */
  resetBatchTimer(collectionName) {
    // Clear existing timer
    if (this.batchTimers.has(collectionName)) {
      clearTimeout(this.batchTimers.get(collectionName));
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(collectionName);
    }, this.config.batchTimeoutMs);

    this.batchTimers.set(collectionName, timer);
  }

  /**
   * Process a batch of change events
   * @param {string} collectionName - Collection name
   * @returns {Promise<void>}
   */
  async processBatch(collectionName) {
    const batch = this.eventBatches.get(collectionName);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear batch and timer
    this.eventBatches.set(collectionName, []);
    if (this.batchTimers.has(collectionName)) {
      clearTimeout(this.batchTimers.get(collectionName));
      this.batchTimers.delete(collectionName);
    }

    const startTime = Date.now();
    const tableName = COLLECTION_TABLE_MAP[collectionName];

    if (!tableName) {
      console.warn(`No table mapping found for collection ${collectionName}, skipping batch`);
      return;
    }

    console.log(`Processing batch of ${batch.length} events for ${collectionName} -> ${tableName}`);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each change in the batch
    for (const batchItem of batch) {
      try {
        await this.syncChangeToZeroDB(tableName, batchItem.change);
        results.success++;
        this.syncMetrics.successfulSyncs++;

        // Track sync latency
        const syncLatency = Date.now() - batchItem.receivedAt;
        this.updateSyncLatency(syncLatency);
      } catch (error) {
        results.failed++;
        results.errors.push({
          change: batchItem.change,
          error: error.message
        });

        // Retry logic
        if (batchItem.attempts < this.config.retryAttempts) {
          await this.retrySync(collectionName, tableName, batchItem);
        } else {
          // Add to dead letter queue
          this.addToDeadLetterQueue(collectionName, tableName, batchItem.change, error);
        }
      }
    }

    const duration = Date.now() - startTime;
    this.metrics.trackQuery('zerodb', `batch_sync_${collectionName}`, duration, results.failed === 0);

    console.log(`Batch processing complete for ${collectionName}: ${results.success} success, ${results.failed} failed in ${duration}ms`);

    if (results.failed > 0) {
      console.error(`Batch errors for ${collectionName}:`, results.errors);
    }

    this.syncMetrics.lastSyncTimestamp = Date.now();
    this.syncMetrics.currentBatchSizes[collectionName] = 0;
  }

  /**
   * Sync a single change event to ZeroDB
   * @param {string} tableName - ZeroDB table name
   * @param {Object} change - MongoDB change event
   * @returns {Promise<void>}
   */
  async syncChangeToZeroDB(tableName, change) {
    const { operationType, fullDocument, documentKey } = change;

    switch (operationType) {
      case 'insert':
        await this.handleInsert(tableName, fullDocument);
        break;

      case 'update':
      case 'replace':
        await this.handleUpdate(tableName, fullDocument, documentKey);
        break;

      case 'delete':
        await this.handleDelete(tableName, documentKey);
        break;

      default:
        console.warn(`Unsupported operation type: ${operationType}`);
    }
  }

  /**
   * Handle insert operation
   * @param {string} tableName - ZeroDB table name
   * @param {Object} document - Document to insert
   * @returns {Promise<void>}
   */
  async handleInsert(tableName, document) {
    if (!document) {
      throw new Error('Insert operation missing fullDocument');
    }

    const transformedData = this.transformMongoToZeroDB(document);
    await zerodbService.insertRows(tableName, [transformedData]);
  }

  /**
   * Handle update operation
   * @param {string} tableName - ZeroDB table name
   * @param {Object} document - Updated document
   * @param {Object} documentKey - Document key
   * @returns {Promise<void>}
   */
  async handleUpdate(tableName, document, documentKey) {
    if (!document) {
      // If fullDocument is not available, we need to fetch it
      console.warn(`Update operation missing fullDocument for ${tableName}, fetching from MongoDB`);
      return;
    }

    const transformedData = this.transformMongoToZeroDB(document);
    const filter = { _id: documentKey._id.toString() };

    await zerodbService.updateRows(tableName, {
      filter,
      update: { $set: transformedData }
    });
  }

  /**
   * Handle delete operation
   * @param {string} tableName - ZeroDB table name
   * @param {Object} documentKey - Document key
   * @returns {Promise<void>}
   */
  async handleDelete(tableName, documentKey) {
    const filter = { _id: documentKey._id.toString() };
    await zerodbService.deleteRows(tableName, { filter });
  }

  /**
   * Transform MongoDB document to ZeroDB format
   * @param {Object} document - MongoDB document
   * @returns {Object} Transformed document
   */
  transformMongoToZeroDB(document) {
    if (!document) {
      return null;
    }

    // Create a copy to avoid mutating the original
    const transformed = { ...document };

    // Convert MongoDB ObjectId to string
    if (transformed._id) {
      transformed._id = transformed._id.toString();
    }

    // Convert nested ObjectIds
    Object.keys(transformed).forEach(key => {
      const value = transformed[key];

      // Handle ObjectId fields
      if (value && typeof value === 'object' && value.constructor.name === 'ObjectId') {
        transformed[key] = value.toString();
      }

      // Handle arrays of ObjectIds
      if (Array.isArray(value)) {
        transformed[key] = value.map(item => {
          if (item && typeof item === 'object' && item.constructor.name === 'ObjectId') {
            return item.toString();
          }
          return item;
        });
      }

      // Handle Date objects
      if (value instanceof Date) {
        transformed[key] = value.toISOString();
      }
    });

    // Remove Mongoose-specific fields
    delete transformed.__v;

    return transformed;
  }

  /**
   * Retry a failed sync operation
   * @param {string} collectionName - Collection name
   * @param {string} tableName - ZeroDB table name
   * @param {Object} batchItem - Batch item to retry
   * @returns {Promise<void>}
   */
  async retrySync(collectionName, tableName, batchItem) {
    batchItem.attempts++;
    this.syncMetrics.retriedEvents++;

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.config.retryDelayMs * Math.pow(2, batchItem.attempts - 1),
      this.config.maxRetryDelayMs
    );

    console.log(`Retrying sync for ${collectionName} (attempt ${batchItem.attempts}/${this.config.retryAttempts}) after ${delay}ms`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.syncChangeToZeroDB(tableName, batchItem.change);
      this.syncMetrics.successfulSyncs++;
      console.log(`Retry successful for ${collectionName} after ${batchItem.attempts} attempts`);
    } catch (error) {
      console.error(`Retry failed for ${collectionName} (attempt ${batchItem.attempts}):`, error);

      if (batchItem.attempts < this.config.retryAttempts) {
        await this.retrySync(collectionName, tableName, batchItem);
      } else {
        this.addToDeadLetterQueue(collectionName, tableName, batchItem.change, error);
      }
    }
  }

  /**
   * Add failed sync to dead letter queue
   * @param {string} collectionName - Collection name
   * @param {string} tableName - ZeroDB table name
   * @param {Object} change - Change event
   * @param {Error} error - Error that caused failure
   */
  addToDeadLetterQueue(collectionName, tableName, change, error) {
    const dlqEntry = {
      collectionName,
      tableName,
      change,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: Date.now(),
      attempts: this.config.retryAttempts
    };

    this.deadLetterQueue.push(dlqEntry);
    this.syncMetrics.failedSyncs++;
    this.syncMetrics.deadLetterQueueSize = this.deadLetterQueue.length;

    // Enforce max DLQ size
    if (this.deadLetterQueue.length > this.config.maxDeadLetterQueueSize) {
      const removed = this.deadLetterQueue.shift();
      console.warn(`Dead letter queue overflow, removed oldest entry: ${removed.collectionName}`);
    }

    this.persistDeadLetterQueue();
    console.error(`Added to dead letter queue: ${collectionName} -> ${tableName}`, error.message);
  }

  /**
   * Schedule reconnection for a change stream
   * @param {string} collectionName - Collection name
   */
  scheduleReconnect(collectionName) {
    const attempts = this.reconnectAttempts.get(collectionName) || 0;
    const delay = Math.min(
      this.config.reconnectDelayMs * Math.pow(2, attempts),
      this.config.maxReconnectDelayMs
    );

    console.log(`Scheduling reconnect for ${collectionName} in ${delay}ms (attempt ${attempts + 1})`);

    setTimeout(async () => {
      try {
        await this.startChangeStream(collectionName);
        this.reconnectAttempts.delete(collectionName);
        console.log(`Successfully reconnected change stream for ${collectionName}`);
      } catch (error) {
        console.error(`Failed to reconnect change stream for ${collectionName}:`, error);
        this.reconnectAttempts.set(collectionName, attempts + 1);
        this.scheduleReconnect(collectionName);
      }
    }, delay);
  }

  /**
   * Update sync latency metrics
   * @param {number} latency - Sync latency in milliseconds
   */
  updateSyncLatency(latency) {
    // Update average latency (exponential moving average)
    const alpha = 0.1;
    this.syncMetrics.avgSyncLatency =
      this.syncMetrics.avgSyncLatency * (1 - alpha) + latency * alpha;

    // Update max latency
    if (latency > this.syncMetrics.maxSyncLatency) {
      this.syncMetrics.maxSyncLatency = latency;
    }
  }

  /**
   * Start health check monitoring
   */
  startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.healthCheck();
    }, this.config.healthCheckIntervalMs);

    console.log(`Health check started (interval: ${this.config.healthCheckIntervalMs}ms)`);
  }

  /**
   * Perform health check
   */
  healthCheck() {
    const health = {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      activeStreams: this.changeStreams.size,
      streamStatuses: { ...this.syncMetrics.streamStatus },
      pendingBatches: {},
      totalPendingEvents: 0,
      metrics: { ...this.syncMetrics }
    };

    // Count pending events
    for (const [collection, batch] of this.eventBatches.entries()) {
      health.pendingBatches[collection] = batch.length;
      health.totalPendingEvents += batch.length;
    }

    // Check for unhealthy streams
    const unhealthyStreams = Object.entries(health.streamStatuses)
      .filter(([_, status]) => status === 'error' || status === 'closed')
      .map(([collection]) => collection);

    if (unhealthyStreams.length > 0) {
      console.warn(`Unhealthy change streams detected: ${unhealthyStreams.join(', ')}`);
    }

    // Log health summary
    if (process.env.NODE_ENV === 'development') {
      console.log('Change Stream Health Check:', {
        activeStreams: health.activeStreams,
        totalEvents: health.metrics.totalEvents,
        successfulSyncs: health.metrics.successfulSyncs,
        failedSyncs: health.metrics.failedSyncs,
        avgLatency: Math.round(health.metrics.avgSyncLatency),
        dlqSize: health.metrics.deadLetterQueueSize
      });
    }

    return health;
  }

  /**
   * Get current metrics
   * @returns {Object} Sync metrics
   */
  getMetrics() {
    return {
      ...this.syncMetrics,
      pendingBatches: Object.fromEntries(
        Array.from(this.eventBatches.entries()).map(([k, v]) => [k, v.length])
      ),
      performanceMetrics: this.metrics.getSummaryStats('zerodb')
    };
  }

  /**
   * Get dead letter queue entries
   * @param {number} limit - Maximum number of entries to return
   * @returns {Array} Dead letter queue entries
   */
  getDeadLetterQueue(limit = 100) {
    return this.deadLetterQueue.slice(-limit);
  }

  /**
   * Reprocess dead letter queue entries
   * @param {number} limit - Maximum number of entries to reprocess
   * @returns {Promise<Object>} Reprocess results
   */
  async reprocessDeadLetterQueue(limit = 10) {
    const entriesToProcess = this.deadLetterQueue.splice(0, limit);
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const entry of entriesToProcess) {
      try {
        await this.syncChangeToZeroDB(entry.tableName, entry.change);
        results.success++;
        this.syncMetrics.successfulSyncs++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          collection: entry.collectionName,
          error: error.message
        });
        // Add back to DLQ
        this.deadLetterQueue.push(entry);
      }
    }

    this.syncMetrics.deadLetterQueueSize = this.deadLetterQueue.length;
    this.persistDeadLetterQueue();

    return results;
  }

  /**
   * Pause change stream processing
   */
  pause() {
    this.isPaused = true;
    console.log('Change stream processing paused');
  }

  /**
   * Resume change stream processing
   */
  resume() {
    this.isPaused = false;
    console.log('Change stream processing resumed');
  }

  /**
   * Stop a specific change stream
   * @param {string} collectionName - Collection name
   * @returns {Promise<void>}
   */
  async stopChangeStream(collectionName) {
    const changeStream = this.changeStreams.get(collectionName);
    if (changeStream) {
      await changeStream.close();
      this.changeStreams.delete(collectionName);
      this.syncMetrics.streamStatus[collectionName] = 'stopped';
      console.log(`Change stream stopped for ${collectionName}`);
    }
  }

  /**
   * Stop all change streams
   * @returns {Promise<void>}
   */
  async stopAll() {
    console.log('Stopping all change streams...');

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Process remaining batches
    for (const collectionName of this.eventBatches.keys()) {
      await this.processBatch(collectionName);
    }

    // Close all change streams
    const closePromises = Array.from(this.changeStreams.keys()).map(
      collectionName => this.stopChangeStream(collectionName)
    );
    await Promise.allSettled(closePromises);

    // Persist final state
    await this.persistResumeTokens();
    await this.persistDeadLetterQueue();

    this.isRunning = false;
    console.log('All change streams stopped');
  }

  /**
   * Load resume tokens from persistence
   * @returns {Promise<void>}
   */
  async loadResumeTokens() {
    if (!this.config.resumeTokenPersistence) {
      return;
    }

    try {
      const tokenPath = path.resolve(this.config.resumeTokenPath);
      if (fs.existsSync(tokenPath)) {
        const data = fs.readFileSync(tokenPath, 'utf8');
        const tokens = JSON.parse(data);

        for (const [collection, token] of Object.entries(tokens)) {
          this.resumeTokens.set(collection, token);
        }

        console.log(`Loaded ${this.resumeTokens.size} resume tokens`);
      }
    } catch (error) {
      console.error('Error loading resume tokens:', error);
    }
  }

  /**
   * Persist resume tokens
   * @returns {Promise<void>}
   */
  async persistResumeTokens() {
    if (!this.config.resumeTokenPersistence) {
      return;
    }

    try {
      const tokenPath = path.resolve(this.config.resumeTokenPath);
      const dir = path.dirname(tokenPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const tokens = Object.fromEntries(this.resumeTokens);
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    } catch (error) {
      console.error('Error persisting resume tokens:', error);
    }
  }

  /**
   * Load dead letter queue from persistence
   * @returns {Promise<void>}
   */
  async loadDeadLetterQueue() {
    try {
      const dlqPath = path.resolve(this.config.deadLetterQueuePath);
      if (fs.existsSync(dlqPath)) {
        const data = fs.readFileSync(dlqPath, 'utf8');
        this.deadLetterQueue = JSON.parse(data);
        this.syncMetrics.deadLetterQueueSize = this.deadLetterQueue.length;
        console.log(`Loaded ${this.deadLetterQueue.length} dead letter queue entries`);
      }
    } catch (error) {
      console.error('Error loading dead letter queue:', error);
    }
  }

  /**
   * Persist dead letter queue
   * @returns {Promise<void>}
   */
  async persistDeadLetterQueue() {
    try {
      const dlqPath = path.resolve(this.config.deadLetterQueuePath);
      const dir = path.dirname(dlqPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(dlqPath, JSON.stringify(this.deadLetterQueue, null, 2));
    } catch (error) {
      console.error('Error persisting dead letter queue:', error);
    }
  }
}

// Export singleton instance
module.exports = new MongoChangeStreamListener();
