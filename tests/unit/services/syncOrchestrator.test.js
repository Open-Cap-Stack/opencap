/**
 * Unit Tests for Sync Orchestrator
 * Tests coordination between MongoDB change streams and ZeroDB sync operations
 */

const syncOrchestrator = require('../../../services/syncOrchestrator');
const mongoChangeStreamListener = require('../../../services/mongoChangeStreamListener');
const zerodbSyncService = require('../../../services/zerodbSyncService');
const EventEmitter = require('events');

// Mock dependencies
jest.mock('../../../services/mongoChangeStreamListener');
jest.mock('../../../services/zerodbSyncService');

describe('Sync Orchestrator', () => {
  let orchestrator;
  let mockListener;
  let mockSyncService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock listener that extends EventEmitter
    mockListener = new EventEmitter();
    mockListener.start = jest.fn().mockResolvedValue(undefined);
    mockListener.stop = jest.fn().mockResolvedValue(undefined);
    mockListener.isRunning = false;
    mockListener.getHealth = jest.fn().mockReturnValue({
      status: 'healthy',
      isRunning: true
    });
    mockListener.resumeToken = null;

    // Create mock sync service
    mockSyncService = {
      initialize: jest.fn(),
      syncInsert: jest.fn().mockResolvedValue({ success: true }),
      syncUpdate: jest.fn().mockResolvedValue({ success: true }),
      syncDelete: jest.fn().mockResolvedValue({ success: true }),
      syncBatch: jest.fn().mockResolvedValue([{ success: true }]),
      getStats: jest.fn().mockReturnValue({
        inserts: 0,
        updates: 0,
        deletes: 0,
        errors: 0
      }),
      getHealth: jest.fn().mockReturnValue({
        status: 'healthy',
        errorRate: 0
      })
    };

    mongoChangeStreamListener.initialize = jest.fn().mockReturnValue(mockListener);
    zerodbSyncService.initialize = jest.fn();
    zerodbSyncService.syncInsert = mockSyncService.syncInsert;
    zerodbSyncService.syncUpdate = mockSyncService.syncUpdate;
    zerodbSyncService.syncDelete = mockSyncService.syncDelete;
    zerodbSyncService.syncBatch = mockSyncService.syncBatch;
    zerodbSyncService.getStats = mockSyncService.getStats;
    zerodbSyncService.getHealth = mockSyncService.getHealth;
  });

  describe('Initialization', () => {
    it('should initialize with configuration', async () => {
      const config = {
        collections: ['users', 'companies'],
        tableMappings: {
          users: 'sync_users',
          companies: 'sync_companies'
        },
        batchSize: 50,
        conflictResolution: 'last-write-wins'
      };

      orchestrator = await syncOrchestrator.initialize(config);

      expect(mongoChangeStreamListener.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          collections: ['users', 'companies'],
          batchSize: 50
        })
      );

      expect(zerodbSyncService.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          tableMappings: config.tableMappings,
          conflictResolution: 'last-write-wins'
        })
      );
    });

    it('should validate required configuration', async () => {
      await expect(syncOrchestrator.initialize({})).rejects.toThrow('Collections are required');
    });

    it('should load resume token from storage if available', async () => {
      const storedToken = { _data: 'stored-resume-token' };
      const mockStorage = {
        getResumeToken: jest.fn().mockResolvedValue(storedToken)
      };

      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        storage: mockStorage
      });

      expect(mongoChangeStreamListener.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeToken: storedToken
        })
      );
    });

    it('should use default batch size if not provided', async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users']
      });

      expect(mongoChangeStreamListener.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          batchSize: 100
        })
      );
    });
  });

  describe('Starting and Stopping', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users', 'companies']
      });
    });

    it('should start change stream listener and sync service', async () => {
      await orchestrator.start();

      expect(mockListener.start).toHaveBeenCalled();
      expect(orchestrator.isRunning).toBe(true);
    });

    it('should not start if already running', async () => {
      await orchestrator.start();
      const firstCallCount = mockListener.start.mock.calls.length;

      await orchestrator.start();

      expect(mockListener.start).toHaveBeenCalledTimes(firstCallCount);
    });

    it('should stop gracefully', async () => {
      await orchestrator.start();
      await orchestrator.stop();

      expect(mockListener.stop).toHaveBeenCalled();
      expect(orchestrator.isRunning).toBe(false);
    });

    it('should save resume token on stop', async () => {
      const mockStorage = {
        saveResumeToken: jest.fn().mockResolvedValue(undefined)
      };

      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        storage: mockStorage
      });

      mockListener.resumeToken = { _data: 'current-token' };

      await orchestrator.start();
      await orchestrator.stop();

      expect(mockStorage.saveResumeToken).toHaveBeenCalledWith({ _data: 'current-token' });
    });

    it('should handle stop errors gracefully', async () => {
      await orchestrator.start();

      mockListener.stop.mockRejectedValue(new Error('Stop failed'));

      await expect(orchestrator.stop()).rejects.toThrow('Stop failed');
    });
  });

  describe('Event Processing', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users']
      });
      await orchestrator.start();
    });

    it('should handle insert events', (done) => {
      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123', name: 'New User' }
      };

      mockSyncService.syncInsert.mockResolvedValue({ success: true });

      setTimeout(() => {
        expect(mockSyncService.syncInsert).toHaveBeenCalledWith(changeEvent);
        done();
      }, 100);

      mockListener.emit('change', changeEvent);
    });

    it('should handle update events', (done) => {
      const changeEvent = {
        operationType: 'update',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-456' },
        fullDocument: { _id: 'user-456', name: 'Updated User' }
      };

      mockSyncService.syncUpdate.mockResolvedValue({ success: true });

      setTimeout(() => {
        expect(mockSyncService.syncUpdate).toHaveBeenCalledWith(changeEvent);
        done();
      }, 100);

      mockListener.emit('change', changeEvent);
    });

    it('should handle delete events', (done) => {
      const changeEvent = {
        operationType: 'delete',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-789' }
      };

      mockSyncService.syncDelete.mockResolvedValue({ success: true });

      setTimeout(() => {
        expect(mockSyncService.syncDelete).toHaveBeenCalledWith(changeEvent);
        done();
      }, 100);

      mockListener.emit('change', changeEvent);
    });

    it('should ignore unsupported operation types', (done) => {
      const changeEvent = {
        operationType: 'invalidate',
        ns: { db: 'opencap', coll: 'users' }
      };

      setTimeout(() => {
        expect(mockSyncService.syncInsert).not.toHaveBeenCalled();
        expect(mockSyncService.syncUpdate).not.toHaveBeenCalled();
        expect(mockSyncService.syncDelete).not.toHaveBeenCalled();
        done();
      }, 100);

      mockListener.emit('change', changeEvent);
    });

    it('should emit sync success events', (done) => {
      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123' }
      };

      orchestrator.on('sync:success', (event) => {
        expect(event.operationType).toBe('insert');
        expect(event.documentKey._id).toBe('user-123');
        done();
      });

      mockListener.emit('change', changeEvent);
    });

    it('should emit sync error events', (done) => {
      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123' }
      };

      const syncError = new Error('Sync failed');
      mockSyncService.syncInsert.mockRejectedValue(syncError);

      orchestrator.on('sync:error', (error, event) => {
        expect(error.message).toBe('Sync failed');
        expect(event.documentKey._id).toBe('user-123');
        done();
      });

      mockListener.emit('change', changeEvent);
    });
  });

  describe('Batch Processing', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        batchSize: 3
      });
      await orchestrator.start();
    });

    it('should process batch of changes', (done) => {
      const batch = [
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '1' },
          fullDocument: { _id: '1' }
        },
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '2' },
          fullDocument: { _id: '2' }
        },
        {
          operationType: 'update',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '3' },
          fullDocument: { _id: '3' }
        }
      ];

      mockSyncService.syncBatch.mockResolvedValue([
        { success: true },
        { success: true },
        { success: true }
      ]);

      setTimeout(() => {
        expect(mockSyncService.syncBatch).toHaveBeenCalledWith(batch);
        done();
      }, 100);

      mockListener.emit('batch', batch);
    });

    it('should emit batch complete event', (done) => {
      const batch = [
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '1' },
          fullDocument: { _id: '1' }
        }
      ];

      orchestrator.on('batch:complete', (results) => {
        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
        done();
      });

      mockListener.emit('batch', batch);
    });

    it('should handle batch processing errors', (done) => {
      const batch = [
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '1' },
          fullDocument: { _id: '1' }
        }
      ];

      const batchError = new Error('Batch processing failed');
      mockSyncService.syncBatch.mockRejectedValue(batchError);

      orchestrator.on('batch:error', (error) => {
        expect(error.message).toBe('Batch processing failed');
        done();
      });

      mockListener.emit('batch', batch);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        errorHandling: 'retry'
      });
      await orchestrator.start();
    });

    it('should handle change stream errors', (done) => {
      const streamError = new Error('Change stream error');

      orchestrator.on('listener:error', (error) => {
        expect(error.message).toBe('Change stream error');
        done();
      });

      mockListener.emit('error', streamError);
    });

    it('should attempt reconnection on listener errors', (done) => {
      orchestrator.on('listener:reconnecting', (attempt) => {
        expect(attempt).toBeGreaterThan(0);
        done();
      });

      mockListener.emit('reconnecting', 1);
    });

    it('should pause sync on critical errors', (done) => {
      const criticalError = new Error('Critical database error');
      criticalError.code = 'CRITICAL';

      mockSyncService.syncInsert.mockRejectedValue(criticalError);

      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123' }
      };

      orchestrator.on('sync:paused', (reason) => {
        expect(reason).toContain('Critical');
        expect(orchestrator.isPaused).toBe(true);
        done();
      });

      mockListener.emit('change', changeEvent);
    });

    it('should resume sync after pause', async () => {
      orchestrator.isPaused = true;

      await orchestrator.resume();

      expect(orchestrator.isPaused).toBe(false);
    });

    it('should queue events while paused', (done) => {
      orchestrator.isPaused = true;

      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123' }
      };

      mockListener.emit('change', changeEvent);

      setTimeout(() => {
        expect(orchestrator.eventQueue).toHaveLength(1);
        expect(mockSyncService.syncInsert).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should process queued events on resume', async () => {
      orchestrator.isPaused = true;
      orchestrator.eventQueue = [
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '1' },
          fullDocument: { _id: '1' }
        },
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '2' },
          fullDocument: { _id: '2' }
        }
      ];

      await orchestrator.resume();

      expect(mockSyncService.syncBatch).toHaveBeenCalledWith(orchestrator.eventQueue);
      expect(orchestrator.eventQueue).toHaveLength(0);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users']
      });
      await orchestrator.start();
    });

    it('should aggregate health from all components', () => {
      mockListener.getHealth.mockReturnValue({
        status: 'healthy',
        isRunning: true,
        eventsProcessed: 100
      });

      mockSyncService.getStats.mockReturnValue({
        inserts: 50,
        updates: 30,
        deletes: 20,
        errors: 0
      });

      const health = orchestrator.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.listener.status).toBe('healthy');
      expect(health.sync.inserts).toBe(50);
      expect(health.isRunning).toBe(true);
    });

    it('should report degraded status if listener is unhealthy', () => {
      mockListener.getHealth.mockReturnValue({
        status: 'reconnecting',
        isRunning: true,
        reconnectAttempts: 2
      });

      const health = orchestrator.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.listener.status).toBe('reconnecting');
    });

    it('should report unhealthy status if sync service has high error rate', () => {
      mockSyncService.getHealth.mockReturnValue({
        status: 'unhealthy',
        errorRate: 0.5
      });

      const health = orchestrator.getHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.sync.status).toBe('unhealthy');
    });

    it('should include performance metrics', () => {
      const health = orchestrator.getHealth();

      expect(health.metrics).toBeDefined();
      expect(health.metrics.uptime).toBeDefined();
      expect(health.metrics.throughput).toBeDefined();
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users']
      });
      await orchestrator.start();
    });

    it('should track throughput', (done) => {
      const events = Array(10).fill(null).map((_, i) => ({
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: String(i) },
        fullDocument: { _id: String(i) }
      }));

      events.forEach(event => mockListener.emit('change', event));

      setTimeout(() => {
        const metrics = orchestrator.getMetrics();
        expect(metrics.eventsPerSecond).toBeGreaterThan(0);
        done();
      }, 1000);
    }, 2000);

    it('should track sync latency', (done) => {
      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123' }
      };

      mockSyncService.syncInsert.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { success: true };
      });

      setTimeout(() => {
        const metrics = orchestrator.getMetrics();
        expect(metrics.averageLatencyMs).toBeGreaterThan(0);
        done();
      }, 200);

      mockListener.emit('change', changeEvent);
    }, 500);

    it('should calculate success rate', () => {
      orchestrator.stats = {
        successful: 95,
        failed: 5,
        total: 100
      };

      const metrics = orchestrator.getMetrics();

      expect(metrics.successRate).toBe(0.95);
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users']
      });
      await orchestrator.start();
    });

    it('should process pending events before shutdown', async () => {
      orchestrator.eventQueue = [
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '1' },
          fullDocument: { _id: '1' }
        }
      ];

      await orchestrator.shutdown();

      expect(mockSyncService.syncBatch).toHaveBeenCalled();
      expect(mockListener.stop).toHaveBeenCalled();
    });

    it('should save resume token on shutdown', async () => {
      const mockStorage = {
        saveResumeToken: jest.fn().mockResolvedValue(undefined)
      };

      orchestrator.storage = mockStorage;
      mockListener.resumeToken = { _data: 'final-token' };

      await orchestrator.shutdown();

      expect(mockStorage.saveResumeToken).toHaveBeenCalledWith({ _data: 'final-token' });
    });

    it('should wait for in-flight operations', async () => {
      let syncComplete = false;

      mockSyncService.syncInsert.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        syncComplete = true;
        return { success: true };
      });

      const changeEvent = {
        operationType: 'insert',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: { _id: 'user-123' }
      };

      mockListener.emit('change', changeEvent);

      await orchestrator.shutdown();

      expect(syncComplete).toBe(true);
    }, 2000);

    it('should timeout if shutdown takes too long', async () => {
      orchestrator.shutdownTimeoutMs = 1000;

      mockSyncService.syncBatch.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return [{ success: true }];
      });

      orchestrator.eventQueue = [
        {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: '1' },
          fullDocument: { _id: '1' }
        }
      ];

      await expect(orchestrator.shutdown()).rejects.toThrow('Shutdown timeout');
    }, 3000);
  });

  describe('Configuration Validation', () => {
    it('should validate batch size is positive', async () => {
      await expect(syncOrchestrator.initialize({
        collections: ['users'],
        batchSize: -1
      })).rejects.toThrow('Batch size must be positive');
    });

    it('should validate collections array is not empty', async () => {
      await expect(syncOrchestrator.initialize({
        collections: []
      })).rejects.toThrow('At least one collection is required');
    });

    it('should validate conflict resolution strategy', async () => {
      await expect(syncOrchestrator.initialize({
        collections: ['users'],
        conflictResolution: 'invalid-strategy'
      })).rejects.toThrow('Invalid conflict resolution strategy');
    });

    it('should accept valid configuration', async () => {
      const config = {
        collections: ['users', 'companies'],
        batchSize: 50,
        conflictResolution: 'last-write-wins',
        tableMappings: {
          users: 'sync_users'
        }
      };

      const result = await syncOrchestrator.initialize(config);

      expect(result).toBeDefined();
    });
  });

  describe('Resume Token Management', () => {
    it('should save resume token periodically', async () => {
      const mockStorage = {
        saveResumeToken: jest.fn().mockResolvedValue(undefined)
      };

      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        storage: mockStorage,
        resumeTokenSaveInterval: 100
      });

      await orchestrator.start();

      mockListener.resumeToken = { _data: 'token-1' };

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(mockStorage.saveResumeToken).toHaveBeenCalled();

      await orchestrator.stop();
    }, 500);

    it('should update resume token on change events', (done) => {
      orchestrator = syncOrchestrator.initialize({
        collections: ['users']
      }).then(async (orch) => {
        orchestrator = orch;
        await orchestrator.start();

        const changeEvent = {
          operationType: 'insert',
          ns: { db: 'opencap', coll: 'users' },
          documentKey: { _id: 'user-123' },
          fullDocument: { _id: 'user-123' },
          _id: { _data: 'new-token' }
        };

        mockListener.emit('change', changeEvent);

        setTimeout(() => {
          expect(mockListener.resumeToken).toEqual({ _data: 'new-token' });
          done();
        }, 100);
      });
    });
  });

  describe('Bidirectional Sync', () => {
    beforeEach(async () => {
      orchestrator = await syncOrchestrator.initialize({
        collections: ['users'],
        bidirectional: true
      });
      await orchestrator.start();
    });

    it('should poll ZeroDB for changes', (done) => {
      mockSyncService.detectZeroDBChanges = jest.fn().mockResolvedValue([
        {
          mongo_id: 'user-123',
          name: 'Updated from ZeroDB',
          sync_timestamp: new Date()
        }
      ]);

      orchestrator.pollZeroDBChanges();

      setTimeout(() => {
        expect(mockSyncService.detectZeroDBChanges).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should sync ZeroDB changes to MongoDB', (done) => {
      mockSyncService.detectZeroDBChanges = jest.fn().mockResolvedValue([
        {
          mongo_id: 'user-456',
          name: 'ZeroDB Update'
        }
      ]);

      mockSyncService.syncToMongo = jest.fn().mockResolvedValue({ success: true });

      orchestrator.on('reverse:sync:complete', (count) => {
        expect(count).toBe(1);
        expect(mockSyncService.syncToMongo).toHaveBeenCalled();
        done();
      });

      orchestrator.pollZeroDBChanges();
    });

    it('should prevent sync loops in bidirectional mode', (done) => {
      const changeEvent = {
        operationType: 'update',
        ns: { db: 'opencap', coll: 'users' },
        documentKey: { _id: 'user-123' },
        fullDocument: {
          _id: 'user-123',
          sync_source: 'zerodb',
          sync_timestamp: new Date()
        }
      };

      setTimeout(() => {
        expect(mockSyncService.syncUpdate).not.toHaveBeenCalled();
        done();
      }, 100);

      mockListener.emit('change', changeEvent);
    });
  });
});
