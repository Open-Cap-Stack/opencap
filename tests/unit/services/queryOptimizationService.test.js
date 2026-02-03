/**
 * Query Optimization Service Unit Tests
 * Issue #47: Implement Database Optimization and Caching
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const QueryOptimizationService = require('../../../services/queryOptimizationService');

describe('QueryOptimizationService', () => {
  let queryOptimizationService;

  beforeEach(() => {
    queryOptimizationService = QueryOptimizationService;
    // Reset internal state if available
    if (queryOptimizationService.reset) {
      queryOptimizationService.reset();
    }
  });

  describe('analyzeQuery', () => {
    it('should analyze query execution time', async () => {
      const query = {
        collection: 'users',
        filter: { status: 'active' },
        executionTimeMs: 150
      };

      const analysis = await queryOptimizationService.analyzeQuery(query);

      expect(analysis).toHaveProperty('executionTime');
      expect(analysis).toHaveProperty('isSlowQuery');
    });

    it('should identify slow queries', async () => {
      const query = {
        collection: 'users',
        filter: { status: 'active' },
        executionTimeMs: 1500 // 1.5 seconds
      };

      const analysis = await queryOptimizationService.analyzeQuery(query);

      expect(analysis.isSlowQuery).toBe(true);
    });

    it('should identify fast queries', async () => {
      const query = {
        collection: 'users',
        filter: { _id: '12345' },
        executionTimeMs: 5
      };

      const analysis = await queryOptimizationService.analyzeQuery(query);

      expect(analysis.isSlowQuery).toBe(false);
    });

    it('should analyze query complexity', async () => {
      const query = {
        collection: 'users',
        filter: {
          $or: [
            { status: 'active', age: { $gte: 18 } },
            { role: 'admin' }
          ],
          'profile.verified': true
        },
        sort: { createdAt: -1 },
        executionTimeMs: 200
      };

      const analysis = await queryOptimizationService.analyzeQuery(query);

      expect(analysis).toHaveProperty('complexity');
      expect(analysis.complexity).toBeGreaterThan(1); // Complex query
    });

    it('should detect full collection scans', async () => {
      const query = {
        collection: 'users',
        filter: {},
        executionTimeMs: 500,
        docsExamined: 10000,
        docsReturned: 10000
      };

      const analysis = await queryOptimizationService.analyzeQuery(query);

      expect(analysis).toHaveProperty('isFullScan');
      expect(analysis.isFullScan).toBe(true);
    });

    it('should detect inefficient queries', async () => {
      const query = {
        collection: 'users',
        filter: { name: { $regex: 'John' } },
        executionTimeMs: 800,
        docsExamined: 50000,
        docsReturned: 100
      };

      const analysis = await queryOptimizationService.analyzeQuery(query);

      expect(analysis).toHaveProperty('efficiency');
      expect(analysis.efficiency).toBeLessThan(0.1); // Very inefficient
    });

    it('should provide optimization suggestions', async () => {
      const query = {
        collection: 'users',
        filter: { email: 'test@example.com' },
        executionTimeMs: 300,
        docsExamined: 5000,
        docsReturned: 1
      };

      const analysis = await queryOptimizationService.analyzeQuery(query);

      expect(analysis).toHaveProperty('suggestions');
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });

    it('should use custom slow query threshold', async () => {
      const query = {
        collection: 'users',
        filter: {},
        executionTimeMs: 50
      };

      // With default threshold (usually 100ms), this should NOT be slow
      let analysis = await queryOptimizationService.analyzeQuery(query);
      expect(analysis.isSlowQuery).toBe(false);

      // With lower threshold, this SHOULD be slow
      analysis = await queryOptimizationService.analyzeQuery(query, {
        slowQueryThresholdMs: 25
      });
      expect(analysis.isSlowQuery).toBe(true);
    });
  });

  describe('suggestIndexes', () => {
    it('should suggest index for single field filter', async () => {
      const query = {
        collection: 'users',
        filter: { email: 'test@example.com' }
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatchObject({
        field: 'email',
        type: 'single'
      });
    });

    it('should suggest compound index for multiple field filter', async () => {
      const query = {
        collection: 'users',
        filter: { status: 'active', role: 'admin' }
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      expect(suggestions.some(s => s.type === 'compound')).toBe(true);
    });

    it('should suggest index for sort fields', async () => {
      const query = {
        collection: 'users',
        filter: {},
        sort: { createdAt: -1 }
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      expect(suggestions.some(s => s.field === 'createdAt')).toBe(true);
    });

    it('should suggest covered index for projection', async () => {
      const query = {
        collection: 'users',
        filter: { status: 'active' },
        projection: { name: 1, email: 1 },
        sort: { createdAt: -1 }
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      expect(suggestions.some(s => s.type === 'covered')).toBe(true);
    });

    it('should suggest text index for text search', async () => {
      const query = {
        collection: 'documents',
        filter: { $text: { $search: 'important meeting' } }
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      expect(suggestions.some(s => s.type === 'text')).toBe(true);
    });

    it('should not suggest index for _id queries', async () => {
      const query = {
        collection: 'users',
        filter: { _id: '12345' }
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      expect(suggestions).toHaveLength(0); // _id is always indexed
    });

    it('should include estimated impact', async () => {
      const query = {
        collection: 'users',
        filter: { email: 'test@example.com' },
        executionTimeMs: 500
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('estimatedImpact');
      }
    });

    it('should provide index creation command', async () => {
      const query = {
        collection: 'users',
        filter: { email: 'test@example.com' }
      };

      const suggestions = await queryOptimizationService.suggestIndexes(query);

      if (suggestions.length > 0) {
        expect(suggestions[0]).toHaveProperty('createCommand');
        expect(suggestions[0].createCommand).toContain('createIndex');
      }
    });
  });

  describe('logSlowQueries', () => {
    it('should log slow query', () => {
      const query = {
        collection: 'users',
        filter: { status: 'active' },
        executionTimeMs: 1500
      };

      queryOptimizationService.logSlowQuery(query);

      const slowQueries = queryOptimizationService.getSlowQueries();
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].executionTimeMs).toBe(1500);
    });

    it('should include timestamp in log', () => {
      const query = {
        collection: 'users',
        filter: {},
        executionTimeMs: 1000
      };

      queryOptimizationService.logSlowQuery(query);

      const slowQueries = queryOptimizationService.getSlowQueries();
      expect(slowQueries[0]).toHaveProperty('timestamp');
      expect(slowQueries[0].timestamp).toBeInstanceOf(Date);
    });

    it('should limit slow query log size', () => {
      const maxSize = 100;
      queryOptimizationService.setMaxSlowQueryLogSize(maxSize);

      // Log more queries than the max size
      for (let i = 0; i < 150; i++) {
        queryOptimizationService.logSlowQuery({
          collection: 'users',
          filter: {},
          executionTimeMs: 1000
        });
      }

      const slowQueries = queryOptimizationService.getSlowQueries();
      expect(slowQueries.length).toBeLessThanOrEqual(maxSize);
    });

    it('should filter slow queries by collection', () => {
      queryOptimizationService.logSlowQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 1000
      });
      queryOptimizationService.logSlowQuery({
        collection: 'companies',
        filter: {},
        executionTimeMs: 1500
      });
      queryOptimizationService.logSlowQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 2000
      });

      const userQueries = queryOptimizationService.getSlowQueries({ collection: 'users' });
      expect(userQueries).toHaveLength(2);
    });

    it('should filter slow queries by time range', () => {
      const now = Date.now();

      queryOptimizationService.logSlowQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 1000,
        timestamp: new Date(now - 3600000) // 1 hour ago
      });
      queryOptimizationService.logSlowQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 1500,
        timestamp: new Date(now - 60000) // 1 minute ago
      });

      const recentQueries = queryOptimizationService.getSlowQueries({
        since: new Date(now - 300000) // Last 5 minutes
      });
      expect(recentQueries).toHaveLength(1);
    });

    it('should clear slow query log', () => {
      queryOptimizationService.logSlowQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 1000
      });

      queryOptimizationService.clearSlowQueryLog();

      const slowQueries = queryOptimizationService.getSlowQueries();
      expect(slowQueries).toHaveLength(0);
    });
  });

  describe('getQueryStats', () => {
    it('should return overall query statistics', () => {
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 50
      });
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 100
      });

      const stats = queryOptimizationService.getQueryStats();

      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('averageExecutionTime');
      expect(stats).toHaveProperty('slowQueryCount');
    });

    it('should return statistics by collection', () => {
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 50
      });
      queryOptimizationService.trackQuery({
        collection: 'companies',
        filter: {},
        executionTimeMs: 100
      });

      const stats = queryOptimizationService.getQueryStats();

      expect(stats).toHaveProperty('byCollection');
      expect(stats.byCollection).toHaveProperty('users');
      expect(stats.byCollection).toHaveProperty('companies');
    });

    it('should calculate percentiles', () => {
      for (let i = 1; i <= 100; i++) {
        queryOptimizationService.trackQuery({
          collection: 'users',
          filter: {},
          executionTimeMs: i * 10
        });
      }

      const stats = queryOptimizationService.getQueryStats();

      expect(stats).toHaveProperty('p50'); // Median
      expect(stats).toHaveProperty('p95');
      expect(stats).toHaveProperty('p99');
      expect(stats.p50).toBeCloseTo(500, -1); // ~500ms
      expect(stats.p95).toBeGreaterThan(stats.p50);
    });

    it('should track query patterns', () => {
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: { status: 'active' },
        executionTimeMs: 50
      });
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: { status: 'active' },
        executionTimeMs: 60
      });
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: { _id: '123' },
        executionTimeMs: 5
      });

      const stats = queryOptimizationService.getQueryStats();

      expect(stats).toHaveProperty('topPatterns');
      expect(Array.isArray(stats.topPatterns)).toBe(true);
    });

    it('should filter stats by time range', () => {
      const now = Date.now();

      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 50,
        timestamp: new Date(now - 7200000) // 2 hours ago
      });
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 100,
        timestamp: new Date(now - 300000) // 5 minutes ago
      });

      const stats = queryOptimizationService.getQueryStats({
        since: new Date(now - 3600000) // Last hour
      });

      expect(stats.totalQueries).toBe(1);
    });
  });

  describe('trackQuery', () => {
    it('should track query execution', () => {
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: { status: 'active' },
        executionTimeMs: 50
      });

      const stats = queryOptimizationService.getQueryStats();
      expect(stats.totalQueries).toBe(1);
    });

    it('should automatically log slow queries', () => {
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 2000 // Very slow
      });

      const slowQueries = queryOptimizationService.getSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);
    });

    it('should normalize query patterns', () => {
      // These should be recognized as the same pattern
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: { email: 'test1@example.com' },
        executionTimeMs: 50
      });
      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: { email: 'test2@example.com' },
        executionTimeMs: 60
      });

      const stats = queryOptimizationService.getQueryStats();
      // Both should be counted as the same pattern (filter by email)
      expect(stats.topPatterns.length).toBe(1);
      expect(stats.topPatterns[0].count).toBe(2);
    });
  });

  describe('getRecommendations', () => {
    it('should provide recommendations based on query history', async () => {
      // Log some queries
      for (let i = 0; i < 10; i++) {
        queryOptimizationService.trackQuery({
          collection: 'users',
          filter: { email: `test${i}@example.com` },
          executionTimeMs: 300,
          docsExamined: 5000,
          docsReturned: 1
        });
      }

      const recommendations = await queryOptimizationService.getRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('type');
      expect(recommendations[0]).toHaveProperty('priority');
      expect(recommendations[0]).toHaveProperty('description');
    });

    it('should prioritize high-impact recommendations', async () => {
      // Log slow, frequent queries
      for (let i = 0; i < 100; i++) {
        queryOptimizationService.trackQuery({
          collection: 'users',
          filter: { status: 'active' },
          executionTimeMs: 1000
        });
      }

      const recommendations = await queryOptimizationService.getRecommendations();

      // First recommendation should be high priority
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('setSlowQueryThreshold', () => {
    it('should update slow query threshold', () => {
      queryOptimizationService.setSlowQueryThreshold(50);

      queryOptimizationService.trackQuery({
        collection: 'users',
        filter: {},
        executionTimeMs: 75
      });

      const slowQueries = queryOptimizationService.getSlowQueries();
      expect(slowQueries.length).toBe(1);
    });

    it('should return current threshold', () => {
      queryOptimizationService.setSlowQueryThreshold(200);
      const threshold = queryOptimizationService.getSlowQueryThreshold();
      expect(threshold).toBe(200);
    });
  });
});
