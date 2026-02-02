/**
 * MongoDB Change Stream Listener Service Tests
 *
 * [Feature] GitHub Issue #14: Continuous sync from MongoDB to ZeroDB
 *
 * Comprehensive test suite for the MongoDB Change Stream Listener service.
 * Tests cover initialization, event handling, batch processing, error recovery,
 * and metrics collection.
 */

const mongoose = require('mongoose');
const mongoChangeStreamListener = require('../../services/mongoChangeStreamListener');
const zerodbService = require('../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../services/zerodbService', () => ({
  projectId: 'test-project-id',
  initialize: jest.fn().mockResolvedValue({ projectId: 'test-project-id' }),
  insertRows: jest.fn().mockResolvedValue({ success: true }),
  updateRows: jest.fn().mockResolvedValue({ success: true }),
  deleteRows: jest.fn().mockResolvedValue({ success: true })
}));

// Mock database monitor
jest.mock('../../middleware/databaseMonitor', () => ({
  databaseMonitor: {
    initialize: jest.fn(),
    setupZeroDBMonitoring: jest.fn()
  }
}));

// Mock filesystem for persistence
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

describe('MongoChangeStreamListener', () => {
  let testCollection;
  let changeStream;

  beforeAll(async () => {
    // Connect to in-memory MongoDB
    const mongoUri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/opencap_test';
    await mongoose.connect(mongoUri);

    // Create test collection
    testCollection = mongoose.connection.collection('test_users');
    await testCollection.deleteMany({});
  });

  afterAll(async () => {
    // Cleanup and disconnect
    if (mongoChangeStreamListener.isRunning) {
      await mongoChangeStreamListener.stopAll();
    }
    await testCollection.drop().catch(() => {});
    await mongoose.connection.close();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Stop listener if running
    if (mongoChangeStreamListener.isRunning) {
      await mongoChangeStreamListener.stopAll();
    }
  });

  describe('Configuration', () => {
    it('should use default configuration when not provided', () => {
      expect(mongoChangeStreamListener.config.enabled).toBe(false);
      expect(mongoChangeStreamListener.config.batchSize).toBe(50);
      expect(mongoChangeStreamListener.config.retryAttempts).toBe(3);
    });

    it('should merge custom configuration with defaults', () => {
      const customConfig = {
        batchSize: 100,
        retryAttempts: 5
      };

      mongoChangeStreamListener.config = {
        ...mongoChangeStreamListener.config,
        ...customConfig
      };

      expect(mongoChangeStreamListener.config.batchSize).toBe(100);
      expect(mongoChangeStreamListener.config.retryAttempts).toBe(5);
    });
  });

  describe('Initialization', () => {
    it('should not initialize when disabled', async () => {
      mongoChangeStreamListener.config.enabled = false;

      await mongoChangeStreamListener.initialize({
        zerodbToken: 'test-token'
      });

      expect(mongoChangeStreamListener.isRunning).toBe(false);
    });

    it('should throw error if MongoDB is not connected', async () => {
      const originalReadyState = mongoose.connection.readyState;
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 0,
        writable: true
      });

      mongoChangeStreamListener.config.enabled = true;

      await expect(
        mongoChangeStreamListener.initialize({ zerodbToken: 'test-token' })
      ).rejects.toThrow('MongoDB connection not ready');

      Object.defineProperty(mongoose.connection, 'readyState', {
        value: originalReadyState,
        writable: true
      });
    });

    it('should initialize ZeroDB if not already initialized', async () => {
      zerodbService.projectId = null;
      mongoChangeStreamListener.config.enabled = true;
      mongoChangeStreamListener.config.collections = ['test_users'];

      await mongoChangeStreamListener.initialize({
        zerodbToken: 'test-token'
      });

      expect(zerodbService.initialize).toHaveBeenCalledWith('test-token');
      expect(mongoChangeStreamListener.isRunning).toBe(true);
    });

    it('should load resume tokens on initialization', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        JSON.stringify({
          test_users: { _data: 'resume-token-123' }
        })
      );

      mongoChangeStreamListener.config.enabled = true;
      mongoChangeStreamListener.config.collections = ['test_users'];
      mongoChangeStreamListener.config.resumeTokenPersistence = true;

      await mongoChangeStreamListener.initialize({
        zerodbToken: 'test-token'
      });

      expect(mongoChangeStreamListener.resumeTokens.has('test_users')).toBe(true);
    });
  });

  describe('Transform MongoDB to ZeroDB', () => {
    it('should transform MongoDB document correctly', () => {
      const mongoDoc = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
        __v: 0
      };

      const transformed = mongoChangeStreamListener.transformMongoToZeroDB(mongoDoc);

      expect(transformed._id).toBe('507f1f77bcf86cd799439011');
      expect(transformed.name).toBe('Test User');
      expect(transformed.email).toBe('test@example.com');
      expect(transformed.createdAt).toBe('2024-01-01T00:00:00.000Z');
      expect(transformed.__v).toBeUndefined();
    });

    it('should handle nested ObjectIds', () => {
      const mongoDoc = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        companyId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439012'),
        stakeholders: [
          new mongoose.Types.ObjectId('507f1f77bcf86cd799439013'),
          new mongoose.Types.ObjectId('507f1f77bcf86cd799439014')
        ]
      };

      const transformed = mongoChangeStreamListener.transformMongoToZeroDB(mongoDoc);

      expect(transformed._id).toBe('507f1f77bcf86cd799439011');
      expect(transformed.companyId).toBe('507f1f77bcf86cd799439012');
      expect(transformed.stakeholders).toEqual([
        '507f1f77bcf86cd799439013',
        '507f1f77bcf86cd799439014'
      ]);
    });

    it('should handle null document', () => {
      const transformed = mongoChangeStreamListener.transformMongoToZeroDB(null);
      expect(transformed).toBeNull();
    });
  });

  describe('Sync Operations', () => {
    it('should handle insert operation', async () => {
      const document = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Test User',
        email: 'test@example.com'
      };

      await mongoChangeStreamListener.handleInsert('users', document);

      expect(zerodbService.insertRows).toHaveBeenCalledWith(
        'users',
        [expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com'
        })]
      );
    });

    it('should throw error for insert without document', async () => {
      await expect(
        mongoChangeStreamListener.handleInsert('users', null)
      ).rejects.toThrow('Insert operation missing fullDocument');
    });

    it('should handle update operation', async () => {
      const document = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Updated User',
        email: 'updated@example.com'
      };

      const documentKey = { _id: document._id };

      await mongoChangeStreamListener.handleUpdate('users', document, documentKey);

      expect(zerodbService.updateRows).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          filter: { _id: '507f1f77bcf86cd799439011' },
          update: expect.objectContaining({
            $set: expect.objectContaining({
              name: 'Updated User',
              email: 'updated@example.com'
            })
          })
        })
      );
    });

    it('should handle delete operation', async () => {
      const documentKey = {
        _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')
      };

      await mongoChangeStreamListener.handleDelete('users', documentKey);

      expect(zerodbService.deleteRows).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({
          filter: { _id: '507f1f77bcf86cd799439011' }
        })
      );
    });
  });

  describe('Batch Processing', () => {
    it('should add events to batch', () => {
      const change = {
        _id: { _data: 'resume-token' },
        operationType: 'insert',
        fullDocument: { name: 'Test' }
      };

      mongoChangeStreamListener.handleChangeEvent('test_users', change);

      const batch = mongoChangeStreamListener.eventBatches.get('test_users');
      expect(batch).toBeDefined();
      expect(batch.length).toBe(1);
      expect(batch[0].change).toEqual(change);
    });

    it('should update metrics when handling events', () => {
      const initialCount = mongoChangeStreamListener.syncMetrics.totalEvents;

      const change = {
        _id: { _data: 'resume-token' },
        operationType: 'insert',
        fullDocument: { name: 'Test' }
      };

      mongoChangeStreamListener.handleChangeEvent('test_users', change);

      expect(mongoChangeStreamListener.syncMetrics.totalEvents).toBe(initialCount + 1);
    });

    it('should store resume token when handling event', () => {
      const change = {
        _id: { _data: 'resume-token-123' },
        operationType: 'insert',
        fullDocument: { name: 'Test' }
      };

      mongoChangeStreamListener.handleChangeEvent('test_users', change);

      expect(mongoChangeStreamListener.resumeTokens.get('test_users')).toEqual(
        change._id
      );
    });

    it('should not process events when paused', () => {
      mongoChangeStreamListener.isPaused = true;
      const initialBatchSize = mongoChangeStreamListener.eventBatches.size;

      const change = {
        _id: { _data: 'resume-token' },
        operationType: 'insert',
        fullDocument: { name: 'Test' }
      };

      mongoChangeStreamListener.handleChangeEvent('test_users', change);

      expect(mongoChangeStreamListener.eventBatches.size).toBe(initialBatchSize);
      mongoChangeStreamListener.isPaused = false;
    });
  });

  describe('Error Handling and Retry', () => {
    it('should retry failed sync operations', async () => {
      zerodbService.insertRows
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ success: true });

      const batchItem = {
        change: {
          operationType: 'insert',
          fullDocument: { name: 'Test' }
        },
        attempts: 0
      };

      await mongoChangeStreamListener.retrySync('test_users', 'users', batchItem);

      expect(batchItem.attempts).toBeGreaterThan(0);
      expect(mongoChangeStreamListener.syncMetrics.retriedEvents).toBeGreaterThan(0);
    });

    it('should add to dead letter queue after max retries', async () => {
      zerodbService.insertRows.mockRejectedValue(new Error('Permanent failure'));

      const batchItem = {
        change: {
          operationType: 'insert',
          fullDocument: { name: 'Test' }
        },
        attempts: mongoChangeStreamListener.config.retryAttempts
      };

      const initialDLQSize = mongoChangeStreamListener.deadLetterQueue.length;

      await mongoChangeStreamListener.retrySync('test_users', 'users', batchItem);

      expect(mongoChangeStreamListener.deadLetterQueue.length).toBeGreaterThan(initialDLQSize);
    });

    it('should enforce max dead letter queue size', () => {
      const maxSize = 5;
      mongoChangeStreamListener.config.maxDeadLetterQueueSize = maxSize;
      mongoChangeStreamListener.deadLetterQueue = [];

      // Add more than max items
      for (let i = 0; i < maxSize + 3; i++) {
        mongoChangeStreamListener.addToDeadLetterQueue(
          'test_collection',
          'test_table',
          { operationType: 'insert', fullDocument: { id: i } },
          new Error('Test error')
        );
      }

      expect(mongoChangeStreamListener.deadLetterQueue.length).toBe(maxSize);
    });
  });

  describe('Metrics and Health', () => {
    it('should return current metrics', () => {
      const metrics = mongoChangeStreamListener.getMetrics();

      expect(metrics).toHaveProperty('totalEvents');
      expect(metrics).toHaveProperty('successfulSyncs');
      expect(metrics).toHaveProperty('failedSyncs');
      expect(metrics).toHaveProperty('avgSyncLatency');
    });

    it('should perform health check', () => {
      const health = mongoChangeStreamListener.healthCheck();

      expect(health).toHaveProperty('isRunning');
      expect(health).toHaveProperty('isPaused');
      expect(health).toHaveProperty('activeStreams');
      expect(health).toHaveProperty('streamStatuses');
      expect(health).toHaveProperty('metrics');
    });

    it('should update sync latency metrics', () => {
      const initialAvg = mongoChangeStreamListener.syncMetrics.avgSyncLatency;

      mongoChangeStreamListener.updateSyncLatency(100);
      mongoChangeStreamListener.updateSyncLatency(200);

      expect(mongoChangeStreamListener.syncMetrics.avgSyncLatency).toBeGreaterThan(0);
      expect(mongoChangeStreamListener.syncMetrics.maxSyncLatency).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Dead Letter Queue', () => {
    beforeEach(() => {
      mongoChangeStreamListener.deadLetterQueue = [];
    });

    it('should return dead letter queue entries', () => {
      mongoChangeStreamListener.deadLetterQueue = [
        { collectionName: 'test1', error: { message: 'Error 1' } },
        { collectionName: 'test2', error: { message: 'Error 2' } }
      ];

      const dlq = mongoChangeStreamListener.getDeadLetterQueue(10);
      expect(dlq.length).toBe(2);
    });

    it('should limit dead letter queue entries returned', () => {
      for (let i = 0; i < 20; i++) {
        mongoChangeStreamListener.deadLetterQueue.push({
          collectionName: `test${i}`,
          error: { message: `Error ${i}` }
        });
      }

      const dlq = mongoChangeStreamListener.getDeadLetterQueue(5);
      expect(dlq.length).toBe(5);
    });

    it('should reprocess dead letter queue entries', async () => {
      zerodbService.insertRows.mockResolvedValue({ success: true });

      mongoChangeStreamListener.deadLetterQueue = [
        {
          collectionName: 'test_users',
          tableName: 'users',
          change: {
            operationType: 'insert',
            fullDocument: { name: 'Test' }
          }
        }
      ];

      const results = await mongoChangeStreamListener.reprocessDeadLetterQueue(1);

      expect(results.success).toBe(1);
      expect(results.failed).toBe(0);
      expect(mongoChangeStreamListener.deadLetterQueue.length).toBe(0);
    });

    it('should re-add failed entries back to DLQ', async () => {
      zerodbService.insertRows.mockRejectedValue(new Error('Still failing'));

      mongoChangeStreamListener.deadLetterQueue = [
        {
          collectionName: 'test_users',
          tableName: 'users',
          change: {
            operationType: 'insert',
            fullDocument: { name: 'Test' }
          }
        }
      ];

      const results = await mongoChangeStreamListener.reprocessDeadLetterQueue(1);

      expect(results.success).toBe(0);
      expect(results.failed).toBe(1);
      expect(mongoChangeStreamListener.deadLetterQueue.length).toBe(1);
    });
  });

  describe('Pause and Resume', () => {
    it('should pause event processing', () => {
      mongoChangeStreamListener.pause();
      expect(mongoChangeStreamListener.isPaused).toBe(true);
    });

    it('should resume event processing', () => {
      mongoChangeStreamListener.isPaused = true;
      mongoChangeStreamListener.resume();
      expect(mongoChangeStreamListener.isPaused).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should persist resume tokens', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      fs.mkdirSync.mockReturnValue(undefined);
      fs.writeFileSync.mockReturnValue(undefined);

      mongoChangeStreamListener.resumeTokens.set('test_users', {
        _data: 'test-token'
      });
      mongoChangeStreamListener.config.resumeTokenPersistence = true;

      await mongoChangeStreamListener.persistResumeTokens();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should persist dead letter queue', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      fs.mkdirSync.mockReturnValue(undefined);
      fs.writeFileSync.mockReturnValue(undefined);

      mongoChangeStreamListener.deadLetterQueue = [
        { collectionName: 'test', error: { message: 'Error' } }
      ];

      await mongoChangeStreamListener.persistDeadLetterQueue();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('Shutdown', () => {
    it('should stop all change streams gracefully', async () => {
      mongoChangeStreamListener.changeStreams.set('test_users', {
        close: jest.fn().mockResolvedValue(undefined)
      });
      mongoChangeStreamListener.isRunning = true;

      await mongoChangeStreamListener.stopAll();

      expect(mongoChangeStreamListener.isRunning).toBe(false);
      expect(mongoChangeStreamListener.changeStreams.size).toBe(0);
    });

    it('should clear batch timers on shutdown', async () => {
      const timer = setTimeout(() => {}, 10000);
      mongoChangeStreamListener.batchTimers.set('test_users', timer);

      await mongoChangeStreamListener.stopAll();

      expect(mongoChangeStreamListener.batchTimers.size).toBe(0);
    });
  });
});
