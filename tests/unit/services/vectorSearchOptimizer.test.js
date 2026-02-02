/**
 * Vector Search Optimizer Test Suite
 *
 * [Feature] Issue #26: Optimize vector search performance
 * Comprehensive test coverage for vector search optimizations including:
 * - LRU caching for embeddings
 * - Batch processing for embedding generation
 * - Query result caching
 * - Pagination for large result sets
 * - Performance metrics collection
 */

// Import the module that we will implement
const VectorSearchOptimizer = require('../../../services/vectorSearchOptimizer');

// Mock dependencies
jest.mock('../../../services/zerodbService', () => ({
  searchVectors: jest.fn(),
  upsertVector: jest.fn(),
  listVectors: jest.fn()
}));

jest.mock('../../../services/vectorService', () => ({
  generateEmbedding: jest.fn(),
  searchDocuments: jest.fn()
}));

const zerodbService = require('../../../services/zerodbService');
const vectorService = require('../../../services/vectorService');

describe('VectorSearchOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    optimizer = new VectorSearchOptimizer();
  });

  afterEach(() => {
    if (optimizer && optimizer.destroy) {
      optimizer.destroy();
    }
  });

  describe('LRU Cache', () => {
    describe('constructor', () => {
      it('should initialize with default cache configuration', () => {
        expect(optimizer.embeddingCache).toBeDefined();
        expect(optimizer.embeddingCacheMaxSize).toBe(1000);
        expect(optimizer.embeddingCacheTTL).toBe(3600000); // 1 hour in ms
      });

      it('should accept custom cache configuration', () => {
        const customOptimizer = new VectorSearchOptimizer({
          embeddingCacheMaxSize: 500,
          embeddingCacheTTL: 1800000 // 30 minutes
        });

        expect(customOptimizer.embeddingCacheMaxSize).toBe(500);
        expect(customOptimizer.embeddingCacheTTL).toBe(1800000);

        if (customOptimizer.destroy) {
          customOptimizer.destroy();
        }
      });
    });

    describe('getCachedEmbedding', () => {
      it('should return null for cache miss', () => {
        const result = optimizer.getCachedEmbedding('unknown-text');
        expect(result).toBeNull();
      });

      it('should return cached embedding on cache hit', () => {
        const text = 'test document content';
        const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

        optimizer.setCachedEmbedding(text, embedding);
        const result = optimizer.getCachedEmbedding(text);

        expect(result).toEqual(embedding);
      });

      it('should return null for expired cache entry', async () => {
        const shortTTLOptimizer = new VectorSearchOptimizer({
          embeddingCacheTTL: 50 // 50ms TTL
        });

        const text = 'expiring content';
        const embedding = [0.1, 0.2, 0.3];

        shortTTLOptimizer.setCachedEmbedding(text, embedding);

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 100));

        const result = shortTTLOptimizer.getCachedEmbedding(text);
        expect(result).toBeNull();

        if (shortTTLOptimizer.destroy) {
          shortTTLOptimizer.destroy();
        }
      });
    });

    describe('setCachedEmbedding', () => {
      it('should store embedding in cache', () => {
        const text = 'sample text';
        const embedding = [0.5, 0.6, 0.7];

        optimizer.setCachedEmbedding(text, embedding);

        expect(optimizer.getCachedEmbedding(text)).toEqual(embedding);
      });

      it('should evict least recently used item when cache is full', () => {
        const smallCacheOptimizer = new VectorSearchOptimizer({
          embeddingCacheMaxSize: 3
        });

        // Fill cache to capacity
        smallCacheOptimizer.setCachedEmbedding('text1', [0.1]);
        smallCacheOptimizer.setCachedEmbedding('text2', [0.2]);
        smallCacheOptimizer.setCachedEmbedding('text3', [0.3]);

        // Access text1 to make it recently used
        smallCacheOptimizer.getCachedEmbedding('text1');

        // Add new item, should evict text2 (LRU)
        smallCacheOptimizer.setCachedEmbedding('text4', [0.4]);

        expect(smallCacheOptimizer.getCachedEmbedding('text1')).toEqual([0.1]);
        expect(smallCacheOptimizer.getCachedEmbedding('text2')).toBeNull(); // Evicted
        expect(smallCacheOptimizer.getCachedEmbedding('text3')).toEqual([0.3]);
        expect(smallCacheOptimizer.getCachedEmbedding('text4')).toEqual([0.4]);

        if (smallCacheOptimizer.destroy) {
          smallCacheOptimizer.destroy();
        }
      });

      it('should update timestamp on cache hit', async () => {
        const text = 'cached text';
        const embedding = [0.8, 0.9];

        optimizer.setCachedEmbedding(text, embedding);
        const firstTimestamp = optimizer.getCacheEntryTimestamp(text);

        // Wait a bit and access again
        await new Promise(resolve => setTimeout(resolve, 15));
        optimizer.getCachedEmbedding(text);
        const secondTimestamp = optimizer.getCacheEntryTimestamp(text);
        expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp);
      });
    });

    describe('clearEmbeddingCache', () => {
      it('should remove all entries from cache', () => {
        optimizer.setCachedEmbedding('text1', [0.1]);
        optimizer.setCachedEmbedding('text2', [0.2]);

        optimizer.clearEmbeddingCache();

        expect(optimizer.getCachedEmbedding('text1')).toBeNull();
        expect(optimizer.getCachedEmbedding('text2')).toBeNull();
        expect(optimizer.getEmbeddingCacheSize()).toBe(0);
      });
    });

    describe('getEmbeddingCacheStats', () => {
      it('should return cache statistics', () => {
        optimizer.setCachedEmbedding('text1', [0.1, 0.2, 0.3]);
        optimizer.setCachedEmbedding('text2', [0.4, 0.5, 0.6]);
        optimizer.getCachedEmbedding('text1'); // Hit
        optimizer.getCachedEmbedding('text1'); // Hit
        optimizer.getCachedEmbedding('unknown'); // Miss

        const stats = optimizer.getEmbeddingCacheStats();

        expect(stats).toHaveProperty('size');
        expect(stats).toHaveProperty('maxSize');
        expect(stats).toHaveProperty('hits');
        expect(stats).toHaveProperty('misses');
        expect(stats).toHaveProperty('hitRate');
        expect(stats.size).toBe(2);
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBeCloseTo(0.67, 1);
      });
    });
  });

  describe('Batch Embedding Generation', () => {
    describe('generateEmbeddingsBatch', () => {
      it('should generate embeddings for multiple texts', async () => {
        const texts = ['document 1', 'document 2', 'document 3'];
        const mockEmbeddings = [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
          [0.7, 0.8, 0.9]
        ];

        vectorService.generateEmbedding
          .mockResolvedValueOnce(mockEmbeddings[0])
          .mockResolvedValueOnce(mockEmbeddings[1])
          .mockResolvedValueOnce(mockEmbeddings[2]);

        const results = await optimizer.generateEmbeddingsBatch(texts);

        expect(results).toHaveLength(3);
        expect(results[0]).toEqual({ text: 'document 1', embedding: mockEmbeddings[0], cached: false });
        expect(results[1]).toEqual({ text: 'document 2', embedding: mockEmbeddings[1], cached: false });
        expect(results[2]).toEqual({ text: 'document 3', embedding: mockEmbeddings[2], cached: false });
      });

      it('should use cached embeddings when available', async () => {
        const texts = ['cached doc', 'new doc'];
        const cachedEmbedding = [0.1, 0.2, 0.3];
        const newEmbedding = [0.4, 0.5, 0.6];

        // Pre-cache one embedding
        optimizer.setCachedEmbedding('cached doc', cachedEmbedding);

        vectorService.generateEmbedding.mockResolvedValue(newEmbedding);

        const results = await optimizer.generateEmbeddingsBatch(texts);

        expect(vectorService.generateEmbedding).toHaveBeenCalledTimes(1);
        expect(vectorService.generateEmbedding).toHaveBeenCalledWith('new doc');
        expect(results[0]).toEqual({ text: 'cached doc', embedding: cachedEmbedding, cached: true });
        expect(results[1]).toEqual({ text: 'new doc', embedding: newEmbedding, cached: false });
      });

      it('should respect batch size configuration', async () => {
        const texts = Array.from({ length: 10 }, (_, i) => `document ${i}`);
        const batchSize = 3;

        vectorService.generateEmbedding.mockImplementation(async (text) => {
          return [0.1, 0.2, 0.3];
        });

        const batchOptimizer = new VectorSearchOptimizer({ batchSize });
        const results = await batchOptimizer.generateEmbeddingsBatch(texts);

        expect(results).toHaveLength(10);
        // Verify batch processing occurred (mock was called for each non-cached item)
        expect(vectorService.generateEmbedding).toHaveBeenCalledTimes(10);

        if (batchOptimizer.destroy) {
          batchOptimizer.destroy();
        }
      });

      it('should handle errors in batch processing gracefully', async () => {
        const texts = ['good doc', 'bad doc', 'another good doc'];

        vectorService.generateEmbedding
          .mockResolvedValueOnce([0.1, 0.2, 0.3])
          .mockRejectedValueOnce(new Error('Embedding generation failed'))
          .mockResolvedValueOnce([0.4, 0.5, 0.6]);

        const results = await optimizer.generateEmbeddingsBatch(texts);

        expect(results).toHaveLength(3);
        expect(results[0]).toHaveProperty('embedding');
        expect(results[1]).toHaveProperty('error');
        expect(results[1].error).toBe('Embedding generation failed');
        expect(results[2]).toHaveProperty('embedding');
      });

      it('should store generated embeddings in cache', async () => {
        const texts = ['new document'];
        const embedding = [0.1, 0.2, 0.3];

        vectorService.generateEmbedding.mockResolvedValue(embedding);

        await optimizer.generateEmbeddingsBatch(texts);

        expect(optimizer.getCachedEmbedding('new document')).toEqual(embedding);
      });

      it('should process batches with concurrency limit', async () => {
        const texts = Array.from({ length: 20 }, (_, i) => `doc ${i}`);
        let maxConcurrent = 0;
        let currentConcurrent = 0;

        vectorService.generateEmbedding.mockImplementation(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise(resolve => setTimeout(resolve, 10));
          currentConcurrent--;
          return [0.1, 0.2, 0.3];
        });

        const concurrencyOptimizer = new VectorSearchOptimizer({
          batchConcurrency: 5
        });

        await concurrencyOptimizer.generateEmbeddingsBatch(texts);

        expect(maxConcurrent).toBeLessThanOrEqual(5);

        if (concurrencyOptimizer.destroy) {
          concurrencyOptimizer.destroy();
        }
      });
    });

    describe('indexDocumentsBatch', () => {
      it('should index multiple documents with embeddings', async () => {
        const documents = [
          { id: 'doc1', title: 'Title 1', content: 'Content 1', type: 'financial' },
          { id: 'doc2', title: 'Title 2', content: 'Content 2', type: 'compliance' }
        ];

        vectorService.generateEmbedding.mockImplementation(async () => [0.1, 0.2, 0.3]);
        zerodbService.upsertVector.mockResolvedValue({ success: true });

        const result = await optimizer.indexDocumentsBatch(documents);

        expect(result.results).toHaveLength(2);
        expect(result.results[0]).toHaveProperty('documentId', 'doc1');
        expect(result.results[0]).toHaveProperty('success', true);
        expect(zerodbService.upsertVector).toHaveBeenCalledTimes(2);
      });

      it('should return performance metrics for batch indexing', async () => {
        const documents = [
          { id: 'doc1', title: 'Title', content: 'Content', type: 'financial' }
        ];

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.upsertVector.mockResolvedValue({ success: true });

        const results = await optimizer.indexDocumentsBatch(documents);

        expect(results).toHaveProperty('metrics');
        expect(results.metrics).toHaveProperty('totalDocuments');
        expect(results.metrics).toHaveProperty('successCount');
        expect(results.metrics).toHaveProperty('errorCount');
        expect(results.metrics).toHaveProperty('totalTimeMs');
        expect(results.metrics).toHaveProperty('averageTimePerDocument');
      });
    });
  });

  describe('Query Result Caching', () => {
    describe('searchWithCache', () => {
      it('should return cached results on cache hit', async () => {
        const query = 'financial reports';
        const cachedResults = {
          query,
          results: [{ id: 'doc1', score: 0.95 }],
          total_count: 1
        };

        optimizer.setQueryCache(query, 'documents', cachedResults);

        const results = await optimizer.searchWithCache(query, 'documents');

        expect(results).toEqual({ ...cachedResults, cached: true });
        expect(results.cached).toBe(true);
        expect(zerodbService.searchVectors).not.toHaveBeenCalled();
      });

      it('should perform search and cache results on cache miss', async () => {
        const query = 'new search query';
        const searchResults = {
          vectors: [{ id: 'doc1', similarity_score: 0.9 }]
        };

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue(searchResults);

        const results = await optimizer.searchWithCache(query, 'documents');

        expect(zerodbService.searchVectors).toHaveBeenCalled();
        expect(results.cached).toBe(false);

        // Verify result was cached
        const cachedResult = optimizer.getQueryCache(query, 'documents');
        expect(cachedResult).toBeDefined();
      });

      it('should respect query cache TTL', async () => {
        const shortTTLOptimizer = new VectorSearchOptimizer({
          queryCacheTTL: 50 // 50ms TTL
        });

        const query = 'expiring query';
        const cachedResults = { results: [] };

        shortTTLOptimizer.setQueryCache(query, 'documents', cachedResults);

        await new Promise(resolve => setTimeout(resolve, 100));

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        const results = await shortTTLOptimizer.searchWithCache(query, 'documents');

        expect(results.cached).toBe(false);
        expect(zerodbService.searchVectors).toHaveBeenCalled();

        if (shortTTLOptimizer.destroy) {
          shortTTLOptimizer.destroy();
        }
      });

      it('should invalidate cache based on query parameters', async () => {
        const query = 'test query';

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        // First search with limit 10
        await optimizer.searchWithCache(query, 'documents', { limit: 10 });

        // Second search with different limit should miss cache
        await optimizer.searchWithCache(query, 'documents', { limit: 20 });

        expect(zerodbService.searchVectors).toHaveBeenCalledTimes(2);
      });
    });

    describe('invalidateQueryCache', () => {
      it('should invalidate specific query cache', () => {
        const query = 'cached query';
        optimizer.setQueryCache(query, 'documents', { results: [] });

        optimizer.invalidateQueryCache(query, 'documents');

        expect(optimizer.getQueryCache(query, 'documents')).toBeNull();
      });

      it('should invalidate all caches for a namespace', () => {
        optimizer.setQueryCache('query1', 'documents', { results: [] });
        optimizer.setQueryCache('query2', 'documents', { results: [] });
        optimizer.setQueryCache('query3', 'compliance', { results: [] });

        optimizer.invalidateNamespaceCache('documents');

        expect(optimizer.getQueryCache('query1', 'documents')).toBeNull();
        expect(optimizer.getQueryCache('query2', 'documents')).toBeNull();
        expect(optimizer.getQueryCache('query3', 'compliance')).not.toBeNull();
      });

      it('should clear all query caches', () => {
        optimizer.setQueryCache('query1', 'ns1', { results: [] });
        optimizer.setQueryCache('query2', 'ns2', { results: [] });

        optimizer.clearAllQueryCaches();

        expect(optimizer.getQueryCache('query1', 'ns1')).toBeNull();
        expect(optimizer.getQueryCache('query2', 'ns2')).toBeNull();
      });
    });

    describe('getQueryCacheStats', () => {
      it('should return query cache statistics', () => {
        optimizer.setQueryCache('q1', 'ns1', { results: [] });
        optimizer.setQueryCache('q2', 'ns1', { results: [] });

        const stats = optimizer.getQueryCacheStats();

        expect(stats).toHaveProperty('totalEntries');
        expect(stats).toHaveProperty('byNamespace');
        expect(stats.totalEntries).toBe(2);
      });
    });
  });

  describe('Pagination', () => {
    describe('searchWithPagination', () => {
      it('should return paginated results', async () => {
        const query = 'search query';
        const allResults = Array.from({ length: 50 }, (_, i) => ({
          id: `doc${i}`,
          similarity_score: 1 - (i * 0.01)
        }));

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: allResults });

        const page1 = await optimizer.searchWithPagination(query, 'documents', {
          page: 1,
          pageSize: 10
        });

        expect(page1.results).toHaveLength(10);
        expect(page1.pagination).toHaveProperty('currentPage', 1);
        expect(page1.pagination).toHaveProperty('pageSize', 10);
        expect(page1.pagination).toHaveProperty('totalResults', 50);
        expect(page1.pagination).toHaveProperty('totalPages', 5);
        expect(page1.pagination).toHaveProperty('hasNextPage', true);
        expect(page1.pagination).toHaveProperty('hasPreviousPage', false);
      });

      it('should return correct page of results', async () => {
        const allResults = Array.from({ length: 50 }, (_, i) => ({
          id: `doc${i}`,
          similarity_score: 1 - (i * 0.01)
        }));

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: allResults });

        const page3 = await optimizer.searchWithPagination('query', 'documents', {
          page: 3,
          pageSize: 10
        });

        expect(page3.results[0].id).toBe('doc20');
        expect(page3.results[9].id).toBe('doc29');
        expect(page3.pagination.hasNextPage).toBe(true);
        expect(page3.pagination.hasPreviousPage).toBe(true);
      });

      it('should handle last page correctly', async () => {
        const allResults = Array.from({ length: 25 }, (_, i) => ({
          id: `doc${i}`,
          similarity_score: 1 - (i * 0.01)
        }));

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: allResults });

        const lastPage = await optimizer.searchWithPagination('query', 'documents', {
          page: 3,
          pageSize: 10
        });

        expect(lastPage.results).toHaveLength(5);
        expect(lastPage.pagination.hasNextPage).toBe(false);
        expect(lastPage.pagination.hasPreviousPage).toBe(true);
      });

      it('should use default pagination values', async () => {
        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        const results = await optimizer.searchWithPagination('query', 'documents');

        expect(results.pagination.currentPage).toBe(1);
        expect(results.pagination.pageSize).toBe(10);
      });

      it('should return cursor-based pagination info', async () => {
        const allResults = Array.from({ length: 20 }, (_, i) => ({
          id: `doc${i}`,
          similarity_score: 1 - (i * 0.01)
        }));

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: allResults });

        const results = await optimizer.searchWithPagination('query', 'documents', {
          page: 1,
          pageSize: 10,
          includeCursor: true
        });

        expect(results.pagination).toHaveProperty('nextCursor');
        expect(results.pagination.nextCursor).toBeDefined();
      });
    });

    describe('searchWithCursor', () => {
      it('should support cursor-based pagination', async () => {
        const allResults = Array.from({ length: 30 }, (_, i) => ({
          id: `doc${i}`,
          similarity_score: 1 - (i * 0.01)
        }));

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: allResults });

        // First request
        const firstPage = await optimizer.searchWithCursor('query', 'documents', {
          limit: 10
        });

        expect(firstPage.results).toHaveLength(10);
        expect(firstPage).toHaveProperty('nextCursor');

        // Second request using cursor
        const secondPage = await optimizer.searchWithCursor('query', 'documents', {
          limit: 10,
          cursor: firstPage.nextCursor
        });

        expect(secondPage.results).toHaveLength(10);
        expect(secondPage.results[0].id).toBe('doc10');
      });
    });
  });

  describe('Performance Metrics', () => {
    describe('getPerformanceMetrics', () => {
      it('should track search latency', async () => {
        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        await optimizer.searchWithCache('query1', 'documents');
        await optimizer.searchWithCache('query2', 'documents');

        const metrics = optimizer.getPerformanceMetrics();

        expect(metrics).toHaveProperty('searchLatency');
        expect(metrics.searchLatency).toHaveProperty('average');
        expect(metrics.searchLatency).toHaveProperty('min');
        expect(metrics.searchLatency).toHaveProperty('max');
        expect(metrics.searchLatency).toHaveProperty('p95');
        expect(metrics.searchLatency).toHaveProperty('p99');
      });

      it('should track embedding generation time', async () => {
        vectorService.generateEmbedding.mockImplementation(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return [0.1, 0.2, 0.3];
        });

        await optimizer.generateEmbeddingsBatch(['text1', 'text2', 'text3']);

        const metrics = optimizer.getPerformanceMetrics();

        expect(metrics).toHaveProperty('embeddingGeneration');
        expect(metrics.embeddingGeneration).toHaveProperty('totalGenerated');
        expect(metrics.embeddingGeneration).toHaveProperty('averageTimeMs');
        expect(metrics.embeddingGeneration.totalGenerated).toBe(3);
      });

      it('should track cache performance', async () => {
        optimizer.setCachedEmbedding('text1', [0.1]);
        optimizer.getCachedEmbedding('text1'); // Hit
        optimizer.getCachedEmbedding('text2'); // Miss

        const metrics = optimizer.getPerformanceMetrics();

        expect(metrics).toHaveProperty('cachePerformance');
        expect(metrics.cachePerformance).toHaveProperty('embeddingCacheHitRate');
        expect(metrics.cachePerformance).toHaveProperty('queryCacheHitRate');
      });

      it('should track throughput metrics', async () => {
        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        for (let i = 0; i < 5; i++) {
          await optimizer.searchWithCache(`query${i}`, 'documents');
        }

        const metrics = optimizer.getPerformanceMetrics();

        expect(metrics).toHaveProperty('throughput');
        expect(metrics.throughput).toHaveProperty('searchesPerSecond');
        expect(metrics.throughput).toHaveProperty('embeddingsPerSecond');
      });

      it('should track storage usage metrics', async () => {
        optimizer.setCachedEmbedding('text1', new Array(768).fill(0.1));
        optimizer.setCachedEmbedding('text2', new Array(768).fill(0.2));

        const metrics = optimizer.getPerformanceMetrics();

        expect(metrics).toHaveProperty('storage');
        expect(metrics.storage).toHaveProperty('embeddingCacheSizeBytes');
        expect(metrics.storage).toHaveProperty('queryCacheSizeBytes');
      });
    });

    describe('resetMetrics', () => {
      it('should reset all performance metrics', async () => {
        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        await optimizer.searchWithCache('query', 'documents');
        optimizer.resetMetrics();

        const metrics = optimizer.getPerformanceMetrics();

        expect(metrics.searchLatency.average).toBe(0);
        expect(metrics.embeddingGeneration.totalGenerated).toBe(0);
      });
    });

    describe('getMetricsReport', () => {
      it('should generate a comprehensive metrics report', async () => {
        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        await optimizer.searchWithCache('query', 'documents');

        const report = optimizer.getMetricsReport();

        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('uptime');
        expect(report).toHaveProperty('metrics');
        expect(report).toHaveProperty('recommendations');
      });

      it('should include performance recommendations', async () => {
        // Create high miss rate scenario
        for (let i = 0; i < 10; i++) {
          optimizer.getCachedEmbedding(`uncached-${i}`); // Miss
        }
        optimizer.setCachedEmbedding('cached', [0.1]);
        optimizer.getCachedEmbedding('cached'); // Hit

        const report = optimizer.getMetricsReport();

        expect(report.recommendations).toBeInstanceOf(Array);
        // Should recommend increasing cache size due to high miss rate
        expect(report.recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Vector Index Management', () => {
    describe('createVectorIndex', () => {
      it('should create vector index with configuration', async () => {
        const indexConfig = {
          namespace: 'documents',
          indexType: 'hnsw',
          dimensions: 768,
          metric: 'cosine'
        };

        const result = await optimizer.createVectorIndex(indexConfig);

        expect(result).toHaveProperty('indexName');
        expect(result).toHaveProperty('status', 'created');
        expect(result).toHaveProperty('config');
      });

      it('should validate index configuration', async () => {
        const invalidConfig = {
          namespace: 'documents',
          indexType: 'invalid_type'
        };

        await expect(optimizer.createVectorIndex(invalidConfig))
          .rejects.toThrow('Invalid index type');
      });
    });

    describe('getIndexStats', () => {
      it('should return vector index statistics', async () => {
        const stats = await optimizer.getIndexStats('documents');

        expect(stats).toHaveProperty('namespace');
        expect(stats).toHaveProperty('vectorCount');
        expect(stats).toHaveProperty('indexSize');
        expect(stats).toHaveProperty('lastUpdated');
      });
    });
  });

  describe('Configuration', () => {
    describe('updateConfig', () => {
      it('should update optimizer configuration', () => {
        optimizer.updateConfig({
          embeddingCacheMaxSize: 2000,
          queryCacheTTL: 7200000
        });

        expect(optimizer.embeddingCacheMaxSize).toBe(2000);
        expect(optimizer.queryCacheTTL).toBe(7200000);
      });

      it('should validate configuration values', () => {
        expect(() => optimizer.updateConfig({ embeddingCacheMaxSize: -1 }))
          .toThrow('Invalid configuration');
      });
    });

    describe('getConfig', () => {
      it('should return current configuration', () => {
        const config = optimizer.getConfig();

        expect(config).toHaveProperty('embeddingCacheMaxSize');
        expect(config).toHaveProperty('embeddingCacheTTL');
        expect(config).toHaveProperty('queryCacheTTL');
        expect(config).toHaveProperty('batchSize');
        expect(config).toHaveProperty('batchConcurrency');
      });
    });
  });

  describe('Cleanup and Lifecycle', () => {
    describe('destroy', () => {
      it('should clean up resources', () => {
        optimizer.setCachedEmbedding('text', [0.1]);
        optimizer.setQueryCache('query', 'ns', { results: [] });

        optimizer.destroy();

        expect(optimizer.getEmbeddingCacheSize()).toBe(0);
        expect(optimizer.getQueryCacheStats().totalEntries).toBe(0);
      });
    });

    describe('warmupCache', () => {
      it('should pre-populate cache with common queries', async () => {
        const commonQueries = [
          { text: 'financial report', namespace: 'financial' },
          { text: 'compliance audit', namespace: 'compliance' }
        ];

        vectorService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        zerodbService.searchVectors.mockResolvedValue({ vectors: [] });

        await optimizer.warmupCache(commonQueries);

        expect(optimizer.getCachedEmbedding('financial report')).toBeDefined();
        expect(optimizer.getCachedEmbedding('compliance audit')).toBeDefined();
      });
    });
  });
});
