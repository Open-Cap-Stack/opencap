/**
 * Unit Tests for MongoDB Change Stream Listener
 * Tests connection handling, event processing, and reconnection logic
 */

const EventEmitter = require('events');
const mongoChangeStreamListener = require('../../../services/mongoChangeStreamListener');

// Mock MongoDB connection and change stream
const mockChangeStream = new EventEmitter();
const mockCollection = {
  watch: jest.fn()
};
const mockDb = {
  collection: jest.fn()
};
const mockMongoClient = {
  db: jest.fn(() => mockDb),
  isConnected: jest.fn(),
  close: jest.fn()
};

// Mock mongoose
jest.mock('mongoose', () => ({
  connection: {
    getClient: jest.fn(() => mockMongoClient),
    readyState: 1, // Connected
    on: jest.fn(),
    once: jest.fn()
  }
}));

describe('MongoDB Change Stream Listener', () => {
  let listener;
  let eventCallback;
  let errorCallback;
  let reconnectCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockChangeStream.removeAllListeners();

    mockCollection.watch.mockReturnValue(mockChangeStream);
    mockDb.collection.mockReturnValue(mockCollection);
    mockMongoClient.isConnected.mockReturnValue(true);

    // Reset listener state
    if (listener) {
      listener.stop();
    }

    eventCallback = jest.fn();
    errorCallback = jest.fn();
    reconnectCallback = jest.fn();
  });

  afterEach(async () => {
    if (listener) {
      await listener.stop();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users', 'companies']
      });

      expect(listener).toBeDefined();
      expect(listener.isRunning).toBe(false);
      expect(listener.collections).toEqual(['users', 'companies']);
    });

    it('should validate required collections parameter', () => {
      expect(() => {
        mongoChangeStreamListener.initialize({});
      }).toThrow('Collections array is required');
    });

    it('should accept optional resume token', () => {
      const resumeToken = { _data: 'test-resume-token' };
      listener = mongoChangeStreamListener.initialize({
        collections: ['users'],
        resumeToken
      });

      expect(listener.resumeToken).toEqual(resumeToken);
    });

    it('should configure batch processing options', () => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users'],
        batchSize: 50,
        batchTimeoutMs: 2000
      });

      expect(listener.batchSize).toBe(50);
      expect(listener.batchTimeoutMs).toBe(2000);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users', 'companies']
      });
    });

    it('should start change stream successfully', async () => {
      await listener.start();

      expect(listener.isRunning).toBe(true);
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockDb.collection).toHaveBeenCalledWith('companies');
      expect(mockCollection.watch).toHaveBeenCalled();
    });

    it('should start with resume token if provided', async () => {
      const resumeToken = { _data: 'test-token' };
      listener.resumeToken = resumeToken;

      await listener.start();

      expect(mockCollection.watch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ resumeAfter: resumeToken })
      );
    });

    it('should not start if already running', async () => {
      await listener.start();
      const firstCallCount = mockCollection.watch.mock.calls.length;

      await listener.start();

      expect(mockCollection.watch).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should stop change stream gracefully', async () => {
      await listener.start();
      await listener.stop();

      expect(listener.isRunning).toBe(false);
    });

    it('should handle MongoDB connection errors during start', async () => {
      mockMongoClient.isConnected.mockReturnValue(false);

      await expect(listener.start()).rejects.toThrow('MongoDB not connected');
    });

    it('should configure change stream with full document lookup', async () => {
      await listener.start();

      expect(mockCollection.watch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          fullDocument: 'updateLookup'
        })
      );
    });
  });

  describe('Event Processing', () => {
    beforeEach(async () => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users']
      });
      listener.on('change', eventCallback);
      await listener.start();
    });

    it('should emit change events for insert operations', (done) => {
      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123', name: 'John Doe', email: 'john@example.com' }
      };

      listener.once('change', (event) => {
        expect(event.operationType).toBe('insert');
        expect(event.documentKey._id).toBe('user-123');
        expect(event.fullDocument.name).toBe('John Doe');
        done();
      });

      mockChangeStream.emit('change', changeEvent);
    });

    it('should emit change events for update operations', (done) => {
      const changeEvent = {
        operationType: 'update',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-456' },
        fullDocument: { _id: 'user-456', name: 'Jane Smith', email: 'jane@example.com' },
        updateDescription: {
          updatedFields: { name: 'Jane Smith' },
          removedFields: []
        }
      };

      listener.once('change', (event) => {
        expect(event.operationType).toBe('update');
        expect(event.documentKey._id).toBe('user-456');
        expect(event.updateDescription.updatedFields.name).toBe('Jane Smith');
        done();
      });

      mockChangeStream.emit('change', changeEvent);
    });

    it('should emit change events for delete operations', (done) => {
      const changeEvent = {
        operationType: 'delete',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-789' }
      };

      listener.once('change', (event) => {
        expect(event.operationType).toBe('delete');
        expect(event.documentKey._id).toBe('user-789');
        done();
      });

      mockChangeStream.emit('change', changeEvent);
    });

    it('should store resume token from change events', (done) => {
      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-999' },
        fullDocument: { _id: 'user-999', name: 'Test User' },
        _id: { _data: 'new-resume-token-123' }
      };

      listener.once('change', () => {
        expect(listener.resumeToken).toEqual({ _data: 'new-resume-token-123' });
        done();
      });

      mockChangeStream.emit('change', changeEvent);
    });

    it('should filter events by collection', (done) => {
      listener.collections = ['users'];

      const userEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-1' },
        fullDocument: { _id: 'user-1' }
      };

      const companyEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'companies' },
        documentKey: { _id: 'company-1' },
        fullDocument: { _id: 'company-1' }
      };

      let eventCount = 0;
      listener.on('change', (event) => {
        eventCount++;
        expect(event.ns.coll).toBe('users');
      });

      mockChangeStream.emit('change', userEvent);
      mockChangeStream.emit('change', companyEvent);

      setTimeout(() => {
        expect(eventCount).toBe(1);
        done();
      }, 100);
    });
  });

  describe('Batch Processing', () => {
    beforeEach(() => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users'],
        batchSize: 3,
        batchTimeoutMs: 1000
      });
      listener.on('batch', eventCallback);
    });

    it('should emit batch when size limit is reached', (done) => {
      listener.start().then(() => {
        const events = [
          {
            operationType: 'insert',
            ns: { db: 'opencap', coll: 'users' },
            documentKey: { _id: '1' },
            fullDocument: { _id: '1', name: 'User 1' }
          },
          {
            operationType: 'insert',
            ns: { db: 'opencap', coll: 'users' },
            documentKey: { _id: '2' },
            fullDocument: { _id: '2', name: 'User 2' }
          },
          {
            operationType: 'insert',
            ns: { db: 'opencap', coll: 'users' },
            documentKey: { _id: '3' },
            fullDocument: { _id: '3', name: 'User 3' }
          }
        ];

        listener.once('batch', (batch) => {
          expect(batch).toHaveLength(3);
          expect(batch[0].fullDocument.name).toBe('User 1');
          expect(batch[2].fullDocument.name).toBe('User 3');
          done();
        });

        events.forEach(event => mockChangeStream.emit('change', event));
      });
    });

    it('should emit batch after timeout even if size not reached', (done) => {
      listener.start().then(() => {
        const event = {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '1' },
          fullDocument: { _id: '1', name: 'User 1' }
        };

        listener.once('batch', (batch) => {
          expect(batch).toHaveLength(1);
          expect(batch[0].fullDocument.name).toBe('User 1');
          done();
        });

        mockChangeStream.emit('change', event);
      });
    }, 2000);

    it('should reset batch after emission', (done) => {
      listener.start().then(() => {
        const events = Array(6).fill(null).map((_, i) => ({
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: String(i) },
          fullDocument: { _id: String(i), name: `User ${i}` }
        }));

        let batchCount = 0;
        listener.on('batch', (batch) => {
          batchCount++;
          expect(batch).toHaveLength(3);

          if (batchCount === 2) {
            done();
          }
        });

        events.forEach(event => mockChangeStream.emit('change', event));
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users']
      });
      listener.on('error', errorCallback);
    });

    it('should emit error event on change stream error', (done) => {
      listener.start().then(() => {
        const error = new Error('Change stream error');

        listener.once('error', (err) => {
          expect(err.message).toBe('Change stream error');
          done();
        });

        mockChangeStream.emit('error', error);
      });
    });

    it('should attempt reconnection on network error', (done) => {
      listener.maxReconnectAttempts = 3;
      listener.reconnectDelayMs = 100;
      listener.on('reconnecting', reconnectCallback);

      listener.start().then(() => {
        const networkError = new Error('ECONNRESET');
        networkError.code = 'ECONNRESET';

        listener.once('reconnecting', (attempt) => {
          expect(attempt).toBe(1);
          expect(reconnectCallback).toHaveBeenCalled();
          done();
        });

        mockChangeStream.emit('error', networkError);
      });
    });

    it('should handle resume token invalidation', (done) => {
      const resumeToken = { _data: 'invalid-token' };
      listener.resumeToken = resumeToken;

      listener.start().then(() => {
        const invalidTokenError = new Error('Resume token not found');
        invalidTokenError.code = 'ChangeStreamHistoryLost';

        listener.once('error', (err) => {
          expect(err.code).toBe('ChangeStreamHistoryLost');
          expect(listener.resumeToken).toBeNull();
          done();
        });

        mockChangeStream.emit('error', invalidTokenError);
      });
    });

    it('should stop after max reconnection attempts', (done) => {
      listener.maxReconnectAttempts = 2;
      listener.reconnectDelayMs = 50;

      let reconnectCount = 0;
      listener.on('reconnecting', () => {
        reconnectCount++;
      });

      listener.start().then(() => {
        const error = new Error('Persistent error');

        listener.once('reconnect_failed', () => {
          expect(reconnectCount).toBe(2);
          expect(listener.isRunning).toBe(false);
          done();
        });

        // Simulate persistent errors
        const interval = setInterval(() => {
          mockChangeStream.emit('error', error);
          if (reconnectCount >= 2) {
            clearInterval(interval);
          }
        }, 60);
      });
    }, 5000);
  });

  describe('Reconnection Logic', () => {
    beforeEach(() => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users'],
        maxReconnectAttempts: 5,
        reconnectDelayMs: 100
      });
    });

    it('should reconnect with exponential backoff', (done) => {
      const reconnectTimes = [];

      listener.on('reconnecting', (attempt, delay) => {
        reconnectTimes.push({ attempt, delay, timestamp: Date.now() });

        if (attempt === 3) {
          // Verify exponential backoff
          expect(delay).toBe(100 * Math.pow(2, 2)); // 400ms for attempt 3
          done();
        }
      });

      listener.start().then(() => {
        const error = new Error('Connection lost');
        mockChangeStream.emit('error', error);
      });
    }, 5000);

    it('should preserve resume token across reconnections', (done) => {
      const originalToken = { _data: 'original-token' };
      listener.resumeToken = originalToken;

      listener.on('reconnected', () => {
        expect(listener.resumeToken).toEqual(originalToken);
        done();
      });

      listener.start().then(() => {
        const error = new Error('Temporary connection loss');
        mockChangeStream.emit('error', error);

        // Simulate successful reconnection
        setTimeout(() => {
          listener.emit('reconnected');
        }, 150);
      });
    }, 2000);

    it('should reset reconnection count after successful connection', (done) => {
      let reconnectAttempt = 0;

      listener.on('reconnecting', (attempt) => {
        reconnectAttempt = attempt;
      });

      listener.start().then(() => {
        // First error
        mockChangeStream.emit('error', new Error('Error 1'));

        setTimeout(() => {
          expect(reconnectAttempt).toBeGreaterThan(0);

          // Simulate successful reconnection
          listener.emit('reconnected');
          listener.reconnectAttempts = 0;

          // Second error should start from attempt 1
          mockChangeStream.emit('error', new Error('Error 2'));

          setTimeout(() => {
            expect(reconnectAttempt).toBe(1);
            done();
          }, 150);
        }, 150);
      });
    }, 3000);
  });

  describe('Health Check', () => {
    beforeEach(() => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users']
      });
    });

    it('should return healthy status when running', async () => {
      await listener.start();

      const health = listener.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.isRunning).toBe(true);
      expect(health.collections).toEqual(['users']);
    });

    it('should return unhealthy status when stopped', () => {
      const health = listener.getHealth();

      expect(health.status).toBe('stopped');
      expect(health.isRunning).toBe(false);
    });

    it('should include reconnection status in health check', async () => {
      await listener.start();
      listener.reconnectAttempts = 2;

      const health = listener.getHealth();

      expect(health.reconnectAttempts).toBe(2);
      expect(health.maxReconnectAttempts).toBe(listener.maxReconnectAttempts);
    });

    it('should include resume token status', async () => {
      const resumeToken = { _data: 'test-token' };
      listener.resumeToken = resumeToken;
      await listener.start();

      const health = listener.getHealth();

      expect(health.hasResumeToken).toBe(true);
      expect(health.resumeToken).toEqual(resumeToken);
    });

    it('should include event statistics', async () => {
      await listener.start();

      // Simulate some events
      const events = Array(5).fill(null).map((_, i) => ({
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: String(i) },
        fullDocument: { _id: String(i) }
      }));

      events.forEach(event => mockChangeStream.emit('change', event));

      const health = listener.getHealth();

      expect(health.eventsProcessed).toBe(5);
      expect(health.lastEventTimestamp).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate batchSize is positive', () => {
      expect(() => {
        mongoChangeStreamListener.initialize({
          collections: ['users'],
          batchSize: -1
        });
      }).toThrow('Batch size must be positive');
    });

    it('should validate batchTimeoutMs is positive', () => {
      expect(() => {
        mongoChangeStreamListener.initialize({
          collections: ['users'],
          batchTimeoutMs: 0
        });
      }).toThrow('Batch timeout must be positive');
    });

    it('should validate maxReconnectAttempts is positive', () => {
      expect(() => {
        mongoChangeStreamListener.initialize({
          collections: ['users'],
          maxReconnectAttempts: -5
        });
      }).toThrow('Max reconnect attempts must be positive');
    });

    it('should use default values for optional parameters', () => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users']
      });

      expect(listener.batchSize).toBe(100);
      expect(listener.batchTimeoutMs).toBe(5000);
      expect(listener.maxReconnectAttempts).toBe(10);
      expect(listener.reconnectDelayMs).toBe(1000);
    });
  });

  describe('Change Stream Pipeline', () => {
    beforeEach(() => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users', 'companies']
      });
    });

    it('should create pipeline for specified collections', async () => {
      await listener.start();

      const expectedPipeline = [
        {
          $match: {
            'ns.coll': { $in: ['users', 'companies'] }
          }
        }
      ];

      expect(mockCollection.watch).toHaveBeenCalledWith(
        expectedPipeline,
        expect.any(Object)
      );
    });

    it('should include operation types in pipeline', async () => {
      listener.operationTypes = ['insert', 'update'];
      await listener.start();

      const call = mockCollection.watch.mock.calls[0];
      const pipeline = call[0];

      expect(pipeline).toContainEqual(
        expect.objectContaining({
          $match: expect.objectContaining({
            operationType: { $in: ['insert', 'update'] }
          })
        })
      );
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      listener = mongoChangeStreamListener.initialize({
        collections: ['users'],
        batchSize: 10
      });
    });

    it('should clean up event listeners on stop', async () => {
      await listener.start();

      const listenersBefore = mockChangeStream.listenerCount('change');
      expect(listenersBefore).toBeGreaterThan(0);

      await listener.stop();

      const listenersAfter = mockChangeStream.listenerCount('change');
      expect(listenersAfter).toBe(0);
    });

    it('should clear batch timeout on stop', async () => {
      await listener.start();

      // Trigger batch timeout creation
      const event = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: '1' },
        fullDocument: { _id: '1' }
      };
      mockChangeStream.emit('change', event);

      await listener.stop();

      // Verify timeout is cleared (batch should not fire)
      const batchCallback = jest.fn();
      listener.on('batch', batchCallback);

      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(batchCallback).not.toHaveBeenCalled();
    });

    it('should not accumulate events after stop', async () => {
      await listener.start();
      await listener.stop();

      const changeCallback = jest.fn();
      listener.on('change', changeCallback);

      const event = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: '1' },
        fullDocument: { _id: '1' }
      };

      mockChangeStream.emit('change', event);

      expect(changeCallback).not.toHaveBeenCalled();
    });
  });
});
