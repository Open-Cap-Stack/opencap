/**
 * Cache Controller Unit Tests
 * Issue #47: Implement Database Optimization and Caching
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const cacheController = require('../../../controllers/cacheController');

// Mock cacheService
jest.mock('../../../services/cacheService', () => ({
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  invalidate: jest.fn(),
  getOrSet: jest.fn(),
  flush: jest.fn(),
  getStats: jest.fn(),
  keys: jest.fn(),
  has: jest.fn()
}));

// Mock queryCacheService
jest.mock('../../../services/queryCacheService', () => ({
  invalidateQueryCache: jest.fn(),
  getQueryCacheStats: jest.fn(),
  warmCache: jest.fn()
}));

// Mock databaseMetricsService
jest.mock('../../../services/databaseMetricsService', () => ({
  getMetrics: jest.fn(),
  generatePerformanceReport: jest.fn(),
  getDatabaseHealth: jest.fn()
}));

const cacheService = require('../../../services/cacheService');
const queryCacheService = require('../../../services/queryCacheService');
const databaseMetricsService = require('../../../services/databaseMetricsService');

describe('CacheController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user123', role: 'admin' }
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const mockStats = {
        hits: 100,
        misses: 50,
        hitRate: 66.67,
        size: 150,
        memoryUsage: 1024000,
        keysByPrefix: {
          'query': 80,
          'user': 50,
          'session': 20
        }
      };
      cacheService.getStats.mockReturnValue(mockStats);

      await cacheController.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle errors gracefully', async () => {
      cacheService.getStats.mockImplementation(() => {
        throw new Error('Stats error');
      });

      await cacheController.getStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve cache statistics',
        error: 'Stats error'
      });
    });
  });

  describe('flush', () => {
    it('should flush all cache', async () => {
      cacheService.flush.mockReturnValue();

      await cacheController.flush(req, res);

      expect(cacheService.flush).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cache flushed successfully'
      });
    });

    it('should require admin role', async () => {
      req.user.role = 'user';

      await cacheController.flush(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions to flush cache'
      });
    });

    it('should handle flush errors', async () => {
      cacheService.flush.mockImplementation(() => {
        throw new Error('Flush failed');
      });

      await cacheController.flush(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to flush cache',
        error: 'Flush failed'
      });
    });
  });

  describe('deleteKey', () => {
    it('should delete a specific cache key', async () => {
      req.params.key = 'test-key';
      cacheService.delete.mockResolvedValue(true);

      await cacheController.deleteKey(req, res);

      expect(cacheService.delete).toHaveBeenCalledWith('test-key');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cache key deleted successfully'
      });
    });

    it('should return 404 for non-existent key', async () => {
      req.params.key = 'non-existent-key';
      cacheService.delete.mockResolvedValue(false);

      await cacheController.deleteKey(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cache key not found'
      });
    });

    it('should handle URL-encoded keys', async () => {
      req.params.key = 'query%3Ausers%3Aactive';
      cacheService.delete.mockResolvedValue(true);

      await cacheController.deleteKey(req, res);

      expect(cacheService.delete).toHaveBeenCalledWith('query:users:active');
    });

    it('should handle delete errors', async () => {
      req.params.key = 'test-key';
      cacheService.delete.mockRejectedValue(new Error('Delete failed'));

      await cacheController.deleteKey(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('invalidate', () => {
    it('should invalidate cache by pattern', async () => {
      req.body.pattern = 'query:users:*';
      cacheService.invalidate.mockResolvedValue(5);

      await cacheController.invalidate(req, res);

      expect(cacheService.invalidate).toHaveBeenCalledWith('query:users:*');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cache invalidated successfully',
        invalidatedCount: 5
      });
    });

    it('should require pattern in request body', async () => {
      req.body = {};

      await cacheController.invalidate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Pattern is required'
      });
    });

    it('should support multiple patterns', async () => {
      req.body.patterns = ['query:users:*', 'query:companies:*'];
      cacheService.invalidate
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2);

      await cacheController.invalidate(req, res);

      expect(cacheService.invalidate).toHaveBeenCalledTimes(2);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cache invalidated successfully',
        invalidatedCount: 5
      });
    });

    it('should handle invalidation errors', async () => {
      req.body.pattern = 'test:*';
      cacheService.invalidate.mockRejectedValue(new Error('Invalidation failed'));

      await cacheController.invalidate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getKey', () => {
    it('should get value for specific key', async () => {
      req.params.key = 'test-key';
      const cachedValue = { data: 'test' };
      cacheService.get.mockResolvedValue(cachedValue);

      await cacheController.getKey(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          key: 'test-key',
          value: cachedValue,
          exists: true
        }
      });
    });

    it('should return null for non-existent key', async () => {
      req.params.key = 'non-existent';
      cacheService.get.mockResolvedValue(null);

      await cacheController.getKey(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          key: 'non-existent',
          value: null,
          exists: false
        }
      });
    });
  });

  describe('setKey', () => {
    it('should set a cache key', async () => {
      req.body = {
        key: 'test-key',
        value: { data: 'test' },
        ttl: 60000
      };
      cacheService.set.mockResolvedValue(true);

      await cacheController.setKey(req, res);

      expect(cacheService.set).toHaveBeenCalledWith('test-key', { data: 'test' }, 60000);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cache key set successfully'
      });
    });

    it('should require key and value', async () => {
      req.body = { key: 'test-key' };

      await cacheController.setKey(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Key and value are required'
      });
    });
  });

  describe('listKeys', () => {
    it('should list all cache keys', async () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      cacheService.keys.mockResolvedValue(mockKeys);

      await cacheController.listKeys(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          keys: mockKeys,
          count: 3,
          limit: 100,
          offset: 0
        }
      });
    });

    it('should filter keys by pattern', async () => {
      req.query.pattern = 'query:*';
      const mockKeys = ['query:users', 'query:companies'];
      cacheService.keys.mockResolvedValue(mockKeys);

      await cacheController.listKeys(req, res);

      expect(cacheService.keys).toHaveBeenCalledWith('query:*');
    });

    it('should support pagination', async () => {
      req.query.limit = '10';
      req.query.offset = '5';
      const mockKeys = Array(100).fill(0).map((_, i) => `key${i}`);
      cacheService.keys.mockResolvedValue(mockKeys);

      await cacheController.listKeys(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          keys: mockKeys.slice(5, 15),
          count: 100,
          limit: 10,
          offset: 5
        }
      });
    });
  });

  describe('getQueryCacheStats', () => {
    it('should return query cache statistics', async () => {
      const mockStats = {
        hits: 500,
        misses: 100,
        hitRate: 83.33,
        byCollection: {
          users: { hits: 200, misses: 50 },
          companies: { hits: 300, misses: 50 }
        }
      };
      queryCacheService.getQueryCacheStats.mockReturnValue(mockStats);

      await cacheController.getQueryCacheStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('warmCache', () => {
    it('should warm cache for specified queries', async () => {
      req.body.queries = [
        { collection: 'users', filter: { status: 'active' } },
        { collection: 'companies', filter: {} }
      ];

      queryCacheService.warmCache.mockResolvedValue({
        warmed: 2,
        failed: 0,
        errors: []
      });

      await cacheController.warmCache(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          warmed: 2,
          failed: 0,
          errors: []
        }
      });
    });

    it('should require queries in request body', async () => {
      req.body = {};

      await cacheController.warmCache(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Queries array is required'
      });
    });

    it('should require admin role', async () => {
      req.user.role = 'user';
      req.body.queries = [];

      await cacheController.warmCache(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getDatabaseMetrics', () => {
    it('should return database metrics', async () => {
      const mockMetrics = {
        queries: {
          total: 1000,
          averageExecutionTime: 45,
          slowCount: 5
        },
        connections: {
          totalConnections: 10,
          availableConnections: 8
        }
      };
      databaseMetricsService.getMetrics.mockReturnValue(mockMetrics);

      await cacheController.getDatabaseMetrics(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics
      });
    });
  });

  describe('generatePerformanceReport', () => {
    it('should generate performance report', async () => {
      const mockReport = {
        generatedAt: new Date(),
        period: { start: new Date(), end: new Date() },
        summary: { totalQueries: 1000 },
        recommendations: []
      };
      databaseMetricsService.generatePerformanceReport.mockResolvedValue(mockReport);

      await cacheController.generatePerformanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport
      });
    });

    it('should support custom time range', async () => {
      const startTime = new Date('2024-01-01');
      const endTime = new Date('2024-01-31');
      req.query.startTime = startTime.toISOString();
      req.query.endTime = endTime.toISOString();

      databaseMetricsService.generatePerformanceReport.mockResolvedValue({});

      await cacheController.generatePerformanceReport(req, res);

      expect(databaseMetricsService.generatePerformanceReport).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: expect.any(Date),
          endTime: expect.any(Date)
        })
      );
    });

    it('should require admin role', async () => {
      req.user.role = 'user';

      await cacheController.generatePerformanceReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getDatabaseHealth', () => {
    it('should return database health status', async () => {
      const mockHealth = {
        status: 'healthy',
        connected: true,
        latencyMs: 5,
        score: 95,
        components: {
          connection: { status: 'healthy' },
          queryPerformance: { status: 'healthy' },
          resourceUsage: { status: 'healthy' }
        }
      };
      databaseMetricsService.getDatabaseHealth.mockResolvedValue(mockHealth);

      await cacheController.getDatabaseHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockHealth
      });
    });

    it('should return 503 when database is unhealthy', async () => {
      const mockHealth = {
        status: 'unhealthy',
        connected: false,
        latencyMs: null,
        score: 0
      };
      databaseMetricsService.getDatabaseHealth.mockResolvedValue(mockHealth);

      await cacheController.getDatabaseHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});
