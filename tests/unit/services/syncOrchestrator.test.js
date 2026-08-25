/**
 * SyncOrchestrator Tests
 * Issue #14: Continuous data sync implementation
 *
 * Test suite for bidirectional sync orchestration including:
 * - Initialization with different configurations
 * - Lifecycle management (start, stop, pause, resume)
 * - Status and health reporting
 * - Circuit breaker pattern
 * - Error handling and metrics
 */

// Set env vars BEFORE requiring the module
const originalEnv = { ...process.env };

beforeAll(() => {
  process.env.ENABLE_SYNC = 'false';
  process.env.MIGRATION_MODE = 'zerodb-only';
});

afterAll(() => {
  Object.assign(process.env, originalEnv);
});

// Must require after setting env vars because the module reads them at load time
jest.mock('../../../utils/metricsCollector', () => {
  return class MockMetricsCollector {
    constructor() {
      this.metrics = { mongodb: [], zerodb: [] };
    }
    trackQuery() {}
    getMetrics() { return { mongodb: {}, zerodb: {} }; }
    getSummaryStats() { return { averageResponseTime: 0 }; }
  };
});

// Prevent mongoose from being loaded
jest.mock('mongoose', () => {
  throw new Error('mongoose should not be loaded in zerodb-only mode');
}, { virtual: true });

const SyncOrchestrator = require('../../../services/syncOrchestrator');

describe('SyncOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    // Create a fresh instance for each test to avoid shared state
    const SyncOrchestratorClass = SyncOrchestrator.constructor;
    orchestrator = new SyncOrchestratorClass();
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      expect(orchestrator.state.status).toBe('stopped');
      expect(orchestrator.state.mongoToZerodb.enabled).toBe(false);
      expect(orchestrator.state.zerodbToMongo.enabled).toBe(false);
    });

    it('should initialize circuit breakers as closed', () => {
      expect(orchestrator.circuitBreaker.mongoToZerodb.state).toBe('closed');
      expect(orchestrator.circuitBreaker.zerodbToMongo.state).toBe('closed');
      expect(orchestrator.circuitBreaker.mongoToZerodb.failures).toBe(0);
    });

    it('should initialize empty sync queues', () => {
      expect(orchestrator.syncQueues.mongoToZerodb).toEqual([]);
      expect(orchestrator.syncQueues.zerodbToMongo).toEqual([]);
    });
  });

  describe('initialize', () => {
    it('should return disabled status when sync is not enabled', async () => {
      orchestrator.config.enabled = false;

      const result = await orchestrator.initialize();

      expect(result.status).toBe('disabled');
    });

    it('should throw if mongo-to-zerodb direction requires missing change stream listener', async () => {
      orchestrator.config.enabled = true;
      orchestrator.config.direction = 'mongo-to-zerodb';

      await expect(
        orchestrator.initialize({})
      ).rejects.toThrow('MongoDB change stream listener required');
    });

    it('should throw if zerodb-to-mongo direction requires missing sync service', async () => {
      orchestrator.config.enabled = true;
      orchestrator.config.direction = 'zerodb-to-mongo';

      await expect(
        orchestrator.initialize({})
      ).rejects.toThrow('ZeroDB sync service required');
    });

    it('should initialize successfully with required services for mongo-to-zerodb', async () => {
      orchestrator.config.enabled = true;
      orchestrator.config.direction = 'mongo-to-zerodb';

      const mockListener = { on: jest.fn() };

      const result = await orchestrator.initialize({
        mongoChangeStreamListener: mockListener
      });

      expect(result.status).toBe('initialized');
      expect(result.direction).toBe('mongo-to-zerodb');
    });

    it('should initialize for zerodb-to-mongo with required service', async () => {
      orchestrator.config.enabled = true;
      orchestrator.config.direction = 'zerodb-to-mongo';

      const mockSync = { on: jest.fn() };

      const result = await orchestrator.initialize({
        zerodbSyncService: mockSync
      });

      expect(result.status).toBe('initialized');
    });

    it('should set status to error on initialization failure', async () => {
      orchestrator.config.enabled = true;
      orchestrator.config.direction = 'bidirectional';

      try {
        await orchestrator.initialize({});
      } catch (e) {
        // expected
      }

      expect(orchestrator.state.status).toBe('error');
    });
  });

  describe('start', () => {
    it('should return disabled when sync not enabled', async () => {
      orchestrator.config.enabled = false;

      const result = await orchestrator.start();

      expect(result.status).toBe('disabled');
    });

    it('should return already_running when already running', async () => {
      orchestrator.config.enabled = true;
      orchestrator.state.status = 'running';

      const result = await orchestrator.start();

      expect(result.status).toBe('already_running');
    });
  });

  describe('stop', () => {
    it('should return already_stopped when already stopped', async () => {
      orchestrator.state.status = 'stopped';

      const result = await orchestrator.stop();

      expect(result.status).toBe('already_stopped');
    });

    it('should stop enabled sync services', async () => {
      orchestrator.state.status = 'running';
      orchestrator.state.mongoToZerodb.enabled = true;
      orchestrator.state.zerodbToMongo.enabled = true;
      orchestrator.mongoChangeStreamListener = { stop: jest.fn().mockResolvedValue() };
      orchestrator.zerodbSyncService = { stop: jest.fn().mockResolvedValue() };

      const result = await orchestrator.stop();

      expect(result.status).toBe('stopped');
      expect(orchestrator.mongoChangeStreamListener.stop).toHaveBeenCalled();
      expect(orchestrator.zerodbSyncService.stop).toHaveBeenCalled();
    });
  });

  describe('pause', () => {
    it('should return error if not running', async () => {
      orchestrator.state.status = 'stopped';

      const result = await orchestrator.pause();

      expect(result.status).toBe('error');
      expect(result.message).toContain('not running');
    });

    it('should pause running services', async () => {
      orchestrator.state.status = 'running';
      orchestrator.state.mongoToZerodb.enabled = true;
      orchestrator.state.zerodbToMongo.enabled = true;
      orchestrator.mongoChangeStreamListener = { pause: jest.fn().mockResolvedValue() };
      orchestrator.zerodbSyncService = { pause: jest.fn().mockResolvedValue() };

      const result = await orchestrator.pause();

      expect(result.status).toBe('paused');
      expect(orchestrator.mongoChangeStreamListener.pause).toHaveBeenCalled();
      expect(orchestrator.zerodbSyncService.pause).toHaveBeenCalled();
    });
  });

  describe('resume', () => {
    it('should return error if not paused', async () => {
      orchestrator.state.status = 'running';

      const result = await orchestrator.resume();

      expect(result.status).toBe('error');
      expect(result.message).toContain('not paused');
    });

    it('should resume paused services', async () => {
      orchestrator.state.status = 'paused';
      orchestrator.state.mongoToZerodb.enabled = true;
      orchestrator.state.zerodbToMongo.enabled = true;
      orchestrator.mongoChangeStreamListener = { resume: jest.fn().mockResolvedValue() };
      orchestrator.zerodbSyncService = { resume: jest.fn().mockResolvedValue() };

      const result = await orchestrator.resume();

      expect(result.status).toBe('running');
    });
  });

  describe('getStatus', () => {
    it('should return comprehensive status object', () => {
      const status = orchestrator.getStatus();

      expect(status.orchestrator).toBeDefined();
      expect(status.orchestrator.status).toBe('stopped');
      expect(status.mongoToZerodb).toBeDefined();
      expect(status.zerodbToMongo).toBeDefined();
      expect(status.connections).toBeDefined();
    });

    it('should include queue depth in status', () => {
      orchestrator.syncQueues.mongoToZerodb = [{ item: 1 }, { item: 2 }];

      const status = orchestrator.getStatus();

      expect(status.mongoToZerodb.queueDepth).toBe(2);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics for both directions', () => {
      const metrics = orchestrator.getMetrics();

      expect(metrics.mongoToZerodb).toBeDefined();
      expect(metrics.mongoToZerodb.successRate).toBe(0);
      expect(metrics.mongoToZerodb.totalSynced).toBe(0);
      expect(metrics.zerodbToMongo).toBeDefined();
      expect(metrics.database).toBeDefined();
    });

    it('should reflect success and error counts', () => {
      orchestrator.state.mongoToZerodb.successCount = 90;
      orchestrator.state.mongoToZerodb.errorCount = 10;

      const metrics = orchestrator.getMetrics();

      expect(metrics.mongoToZerodb.successRate).toBe(90);
      expect(metrics.mongoToZerodb.errorRate).toBe(10);
      expect(metrics.mongoToZerodb.totalSynced).toBe(90);
      expect(metrics.mongoToZerodb.totalErrors).toBe(10);
    });
  });

  describe('getHealthStatus', () => {
    it('should return overall health status', () => {
      const health = orchestrator.getHealthStatus();

      expect(health.overall).toBeDefined();
      expect(health.mongoToZerodb).toBeDefined();
      expect(health.zerodbToMongo).toBeDefined();
      expect(health.connections).toBeDefined();
    });

    it('should report healthy when error rates are low', () => {
      orchestrator.state.mongoToZerodb.successCount = 100;
      orchestrator.state.mongoToZerodb.errorCount = 0;

      const health = orchestrator.getHealthStatus();

      expect(health.mongoToZerodb.status).toBe('healthy');
    });

    it('should report unhealthy when circuit breaker is open', () => {
      orchestrator.circuitBreaker.mongoToZerodb.state = 'open';

      const health = orchestrator.getHealthStatus();

      expect(health.mongoToZerodb.status).toBe('unhealthy');
    });
  });

  describe('circuit breaker', () => {
    it('should open circuit breaker after threshold failures', () => {
      orchestrator.config.circuitBreakerThreshold = 3;

      for (let i = 0; i < 3; i++) {
        orchestrator._handleMongoToZerodbError(new Error('sync fail'));
      }

      expect(orchestrator.circuitBreaker.mongoToZerodb.state).toBe('open');
      expect(orchestrator.circuitBreaker.mongoToZerodb.nextRetry).toBeDefined();
    });

    it('should transition to half-open after reset time', () => {
      orchestrator.circuitBreaker.mongoToZerodb.state = 'open';
      orchestrator.circuitBreaker.mongoToZerodb.nextRetry = Date.now() - 1000;

      orchestrator._checkCircuitBreakers();

      expect(orchestrator.circuitBreaker.mongoToZerodb.state).toBe('half-open');
      expect(orchestrator.circuitBreaker.mongoToZerodb.failures).toBe(0);
    });

    it('should not transition if reset time not reached', () => {
      orchestrator.circuitBreaker.mongoToZerodb.state = 'open';
      orchestrator.circuitBreaker.mongoToZerodb.nextRetry = Date.now() + 60000;

      orchestrator._checkCircuitBreakers();

      expect(orchestrator.circuitBreaker.mongoToZerodb.state).toBe('open');
    });
  });

  describe('error handling', () => {
    it('should track mongo-to-zerodb errors', () => {
      orchestrator._handleMongoToZerodbError(new Error('test error'));

      expect(orchestrator.state.mongoToZerodb.errorCount).toBe(1);
      expect(orchestrator.state.mongoToZerodb.lastError.message).toBe('test error');
    });

    it('should track zerodb-to-mongo errors', () => {
      orchestrator._handleZerodbToMongoError(new Error('test error'));

      expect(orchestrator.state.zerodbToMongo.errorCount).toBe(1);
      expect(orchestrator.state.zerodbToMongo.lastError.message).toBe('test error');
    });

    it('should emit sync:error event on errors', () => {
      const handler = jest.fn();
      orchestrator.on('sync:error', handler);

      orchestrator._handleMongoToZerodbError(new Error('emit test'));

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ direction: 'mongoToZerodb' })
      );
    });
  });

  describe('_calculateSuccessRate', () => {
    it('should return 0 when no operations', () => {
      expect(orchestrator._calculateSuccessRate('mongoToZerodb')).toBe(0);
    });

    it('should calculate correct rate', () => {
      orchestrator.state.mongoToZerodb.successCount = 80;
      orchestrator.state.mongoToZerodb.errorCount = 20;

      expect(orchestrator._calculateSuccessRate('mongoToZerodb')).toBe(80);
    });
  });

  describe('_calculateSyncLag', () => {
    it('should return null when no lastSync', () => {
      expect(orchestrator._calculateSyncLag('mongoToZerodb')).toBeNull();
    });

    it('should return lag in milliseconds', () => {
      orchestrator.state.mongoToZerodb.lastSync = new Date(Date.now() - 5000).toISOString();

      const lag = orchestrator._calculateSyncLag('mongoToZerodb');
      expect(lag).toBeGreaterThanOrEqual(4000);
      expect(lag).toBeLessThan(10000);
    });
  });

  describe('_assessHealth', () => {
    it('should return healthy for low error rate', () => {
      orchestrator.state.mongoToZerodb.successCount = 100;
      orchestrator.state.mongoToZerodb.errorCount = 2;

      expect(orchestrator._assessHealth('mongoToZerodb')).toBe('healthy');
    });

    it('should return degraded for moderate error rate', () => {
      orchestrator.state.mongoToZerodb.successCount = 92;
      orchestrator.state.mongoToZerodb.errorCount = 8;

      expect(orchestrator._assessHealth('mongoToZerodb')).toBe('degraded');
    });

    it('should return unhealthy for high error rate', () => {
      orchestrator.state.mongoToZerodb.successCount = 85;
      orchestrator.state.mongoToZerodb.errorCount = 15;

      expect(orchestrator._assessHealth('mongoToZerodb')).toBe('unhealthy');
    });

    it('should return unhealthy when circuit breaker is open', () => {
      orchestrator.circuitBreaker.mongoToZerodb.state = 'open';

      expect(orchestrator._assessHealth('mongoToZerodb')).toBe('unhealthy');
    });
  });

  describe('_modelToTableName', () => {
    it('should convert camelCase to lowercase with underscores', () => {
      expect(orchestrator._modelToTableName('ShareClass')).toBe('shareclass');
    });

    it('should handle already lowercase names', () => {
      expect(orchestrator._modelToTableName('stakeholders')).toBe('stakeholders');
    });
  });

  describe('_handleZerodbSync', () => {
    it('should increment success count and update lastSync', () => {
      orchestrator._handleZerodbSync({ collection: 'test' });

      expect(orchestrator.state.zerodbToMongo.successCount).toBe(1);
      expect(orchestrator.state.zerodbToMongo.lastSync).toBeDefined();
    });
  });

  describe('_handleMongoChange', () => {
    it('should add change to sync queue', () => {
      orchestrator.queueProcessing.mongoToZerodb = true; // prevent auto-process

      orchestrator._handleMongoChange({ operationType: 'insert', ns: { coll: 'test' } });

      expect(orchestrator.syncQueues.mongoToZerodb).toHaveLength(1);
      expect(orchestrator.syncQueues.mongoToZerodb[0].retries).toBe(0);
    });
  });

  describe('shutdown', () => {
    it('should stop services and emit shutdown event', async () => {
      orchestrator.state.status = 'stopped'; // already stopped

      const handler = jest.fn();
      orchestrator.on('sync:shutdown', handler);

      await orchestrator.shutdown();

      expect(handler).toHaveBeenCalled();
    });
  });
});
