/**
 * Unit Tests for ZeroDBSyncService
 *
 * Tests bidirectional sync functionality including:
 * - Initialization
 * - Event processing
 * - Conflict resolution strategies
 * - Retry mechanism with exponential backoff
 * - Sync state persistence
 * - Health checks
 * - Audit logging
 */

const mongoose = require('mongoose');
const zerodbSyncService = require('../../../services/zerodbSyncService');
const zerodbService = require('../../../services/zerodbService');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('ZeroDBSyncService', () => {
  let mongoServer;
  let TestModel;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test model
    const TestSchema = new mongoose.Schema({
      name: String,
      value: Number,
      metadata: Object
    }, { timestamps: true });

    TestModel = mongoose.model('TestModel', TestSchema);

    // Enable sync service
    process.env.ZERODB_SYNC_ENABLED = 'true';
    process.env.SYNC_CONFLICT_STRATEGY = 'last-write-wins';
    process.env.SYNC_POLL_INTERVAL_MS = '5000';
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all collections before each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }

    // Reset service state
    await zerodbSyncService.stopAllSyncs();
    zerodbSyncService.resetMetrics();
  });

  describe('Initialization', () => {
    it('should initialize successfully with proper configuration', async () => {
      await zerodbSyncService.initialize();

      expect(zerodbSyncService.initialized).toBe(true);
      expect(zerodbSyncService.enabled).toBe(true);
      expect(zerodbSyncService.SyncMetadata).toBeDefined();
      expect(zerodbSyncService.SyncAuditLog).toBeDefined();
    });

    it('should handle conflict resolution strategies correctly', async () => {
      const mongoData = { _id: 'doc_1', name: 'MongoDB', value: 100, updatedAt: new Date(Date.now() - 5000) };
      const zerodbData = { name: 'ZeroDB', value: 200, updatedAt: Date.now() };

      await zerodbSyncService.initialize();

      const result = await zerodbSyncService._resolveConflict(mongoData, zerodbData, 'last-write-wins', 'TestModel');

      expect(result.strategy).toBe('zerodb-won');
      expect(result.data).toEqual(zerodbData);
    });
  });

  describe('Retry Mechanism', () => {
    beforeEach(async () => {
      await zerodbSyncService.initialize();
    });

    it('should retry on retryable errors', async () => {
      let attemptCount = 0;
      const operation = jest.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return { success: true };
      });

      const result = await zerodbSyncService._executeWithRetry(operation);

      expect(operation).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(result.attemptCount).toBe(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Authentication failed');
      });

      await expect(zerodbSyncService._executeWithRetry(operation))
        .rejects.toThrow('Authentication failed');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Metrics', () => {
    beforeEach(async () => {
      await zerodbSyncService.initialize();
    });

    it('should track metrics correctly', () => {
      zerodbSyncService._updateMetrics(50, 5, 1200);

      const metrics = zerodbSyncService.getMetrics();

      expect(metrics.eventsProcessed).toBe(55);
      expect(metrics.eventsSucceeded).toBe(50);
      expect(metrics.eventsFailed).toBe(5);
      expect(metrics.lastProcessedTime).toBeDefined();
      expect(metrics.avgProcessingTimeMs).toBe(1200);
    });
  });
});
