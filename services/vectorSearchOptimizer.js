/**
 * Vector Search Optimizer Service
 *
 * Provides performance optimizations for vector search operations including:
 * - LRU caching for embeddings
 * - Batch processing for embedding generation
 * - Query result caching
 * - Pagination for large result sets
 * - Performance metrics collection
 *
 * Issue #26: Optimize vector search performance
 */

const zerodbService = require('./zerodbService');
const vectorService = require('./vectorService');

/**
 * LRU Cache implementation for embeddings and query results
 */
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const entry = this.cache.get(key);

    // Check TTL if set
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    entry.lastAccessed = Date.now();
    this.cache.set(key, entry);
    this.hits++;

    return entry.value;
  }

  set(key, value, ttl = null) {
    // Delete if exists to move to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null
    });
  }

  has(key) {
    if (!this.cache.has(key)) return false;
    const entry = this.cache.get(key);
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  size() {
    return this.cache.size;
  }

  getTimestamp(key) {
    const entry = this.cache.get(key);
    return entry ? entry.lastAccessed : null;
  }

  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  estimateSizeBytes() {
    let size = 0;
    for (const [key, entry] of this.cache) {
      size += key.length * 2; // String key
      if (Array.isArray(entry.value)) {
        size += entry.value.length * 8; // Float64
      } else if (typeof entry.value === 'object') {
        size += JSON.stringify(entry.value).length * 2;
      }
    }
    return size;
  }
}

/**
 * Performance metrics collector
 */
class MetricsCollector {
  constructor() {
    this.reset();
  }

  reset() {
    this.searchLatencies = [];
    this.embeddingLatencies = [];
    this.totalSearches = 0;
    this.totalEmbeddings = 0;
    this.startTime = Date.now();
  }

  recordSearchLatency(latencyMs) {
    this.searchLatencies.push(latencyMs);
    this.totalSearches++;
  }

  recordEmbeddingLatency(latencyMs) {
    this.embeddingLatencies.push(latencyMs);
    this.totalEmbeddings++;
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getSearchLatencyStats() {
    if (this.searchLatencies.length === 0) {
      return { average: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }
    const sum = this.searchLatencies.reduce((a, b) => a + b, 0);
    return {
      average: sum / this.searchLatencies.length,
      min: Math.min(...this.searchLatencies),
      max: Math.max(...this.searchLatencies),
      p95: this.calculatePercentile(this.searchLatencies, 95),
      p99: this.calculatePercentile(this.searchLatencies, 99)
    };
  }

  getEmbeddingStats() {
    if (this.embeddingLatencies.length === 0) {
      return { totalGenerated: 0, averageTimeMs: 0 };
    }
    const sum = this.embeddingLatencies.reduce((a, b) => a + b, 0);
    return {
      totalGenerated: this.totalEmbeddings,
      averageTimeMs: sum / this.embeddingLatencies.length
    };
  }

  getThroughput() {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    return {
      searchesPerSecond: uptimeSeconds > 0 ? this.totalSearches / uptimeSeconds : 0,
      embeddingsPerSecond: uptimeSeconds > 0 ? this.totalEmbeddings / uptimeSeconds : 0
    };
  }

  getUptime() {
    return Date.now() - this.startTime;
  }
}

/**
 * VectorSearchOptimizer - Main class for vector search performance optimization
 */
class VectorSearchOptimizer {
  constructor(config = {}) {
    // Embedding cache configuration
    this.embeddingCacheMaxSize = config.embeddingCacheMaxSize || 1000;
    this.embeddingCacheTTL = config.embeddingCacheTTL || 3600000; // 1 hour default

    // Query cache configuration
    this.queryCacheTTL = config.queryCacheTTL || 300000; // 5 minutes default
    this.queryCacheMaxSize = config.queryCacheMaxSize || 500;

    // Batch processing configuration
    this.batchSize = config.batchSize || 10;
    this.batchConcurrency = config.batchConcurrency || 5;

    // Initialize caches
    this.embeddingCache = new LRUCache(this.embeddingCacheMaxSize);
    this.queryCache = new LRUCache(this.queryCacheMaxSize);

    // Initialize metrics collector
    this.metrics = new MetricsCollector();

    // Index configurations
    this.indexes = new Map();
  }

  // ==================== LRU Cache Methods ====================

  /**
   * Get cached embedding for text
   * @param {string} text - Text to look up
   * @returns {Array|null} Cached embedding or null
   */
  getCachedEmbedding(text) {
    return this.embeddingCache.get(text);
  }

  /**
   * Store embedding in cache
   * @param {string} text - Text key
   * @param {Array} embedding - Embedding vector
   */
  setCachedEmbedding(text, embedding) {
    this.embeddingCache.set(text, embedding, this.embeddingCacheTTL);
  }

  /**
   * Get cache entry timestamp
   * @param {string} text - Text key
   * @returns {number|null} Timestamp or null
   */
  getCacheEntryTimestamp(text) {
    return this.embeddingCache.getTimestamp(text);
  }

  /**
   * Clear all embedding cache entries
   */
  clearEmbeddingCache() {
    this.embeddingCache.clear();
  }

  /**
   * Get current embedding cache size
   * @returns {number} Cache size
   */
  getEmbeddingCacheSize() {
    return this.embeddingCache.size();
  }

  /**
   * Get embedding cache statistics
   * @returns {Object} Cache stats
   */
  getEmbeddingCacheStats() {
    return this.embeddingCache.getStats();
  }

  // ==================== Batch Embedding Generation ====================

  /**
   * Generate embeddings for multiple texts with caching and batching
   * @param {Array<string>} texts - Array of texts to embed
   * @returns {Promise<Array>} Array of embedding results
   */
  async generateEmbeddingsBatch(texts) {
    const results = [];
    const uncachedTexts = [];
    const uncachedIndices = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const cachedEmbedding = this.getCachedEmbedding(texts[i]);
      if (cachedEmbedding) {
        results[i] = { text: texts[i], embedding: cachedEmbedding, cached: true };
      } else {
        uncachedTexts.push(texts[i]);
        uncachedIndices.push(i);
      }
    }

    // Process uncached texts in batches with concurrency limit
    const batches = [];
    for (let i = 0; i < uncachedTexts.length; i += this.batchSize) {
      batches.push(uncachedTexts.slice(i, i + this.batchSize));
    }

    let currentBatchIndex = 0;
    const processedResults = [];

    // Process batches with concurrency limit
    const processBatch = async (batch, startIndex) => {
      const batchResults = [];
      for (let i = 0; i < batch.length; i++) {
        const text = batch[i];
        const startTime = Date.now();
        try {
          const embedding = await vectorService.generateEmbedding(text);
          const latency = Date.now() - startTime;
          this.metrics.recordEmbeddingLatency(latency);

          // Cache the generated embedding
          this.setCachedEmbedding(text, embedding);

          batchResults.push({ text, embedding, cached: false });
        } catch (error) {
          batchResults.push({ text, error: error.message, cached: false });
        }
      }
      return { startIndex, results: batchResults };
    };

    // Execute batches with concurrency limit
    const executing = [];
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const startIndex = i * this.batchSize;

      const promise = processBatch(batch, startIndex).then((result) => {
        processedResults.push(result);
        executing.splice(executing.indexOf(promise), 1);
      });

      executing.push(promise);

      if (executing.length >= this.batchConcurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);

    // Merge results back in order
    processedResults.forEach(({ startIndex, results: batchResults }) => {
      batchResults.forEach((result, i) => {
        const originalIndex = uncachedIndices[startIndex + i];
        results[originalIndex] = result;
      });
    });

    return results;
  }

  /**
   * Index multiple documents in batch
   * @param {Array<Object>} documents - Documents to index
   * @returns {Promise<Object>} Indexing results with metrics
   */
  async indexDocumentsBatch(documents) {
    const startTime = Date.now();
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Generate embeddings for all documents
    const contents = documents.map((d) => d.content);
    const embeddings = await this.generateEmbeddingsBatch(contents);

    // Index each document
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const embeddingResult = embeddings[i];

      if (embeddingResult.error) {
        results.push({
          documentId: doc.id,
          success: false,
          error: embeddingResult.error
        });
        errorCount++;
        continue;
      }

      try {
        await zerodbService.upsertVector(
          embeddingResult.embedding,
          doc.type || 'documents',
          {
            document_id: doc.id,
            title: doc.title,
            type: doc.type,
            indexed_at: new Date().toISOString()
          },
          doc.content,
          `document:${doc.id}`
        );

        results.push({ documentId: doc.id, success: true });
        successCount++;
      } catch (error) {
        results.push({
          documentId: doc.id,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    const totalTimeMs = Date.now() - startTime;

    return {
      results,
      metrics: {
        totalDocuments: documents.length,
        successCount,
        errorCount,
        totalTimeMs,
        averageTimePerDocument:
          documents.length > 0 ? totalTimeMs / documents.length : 0
      }
    };
  }

  // ==================== Query Result Caching ====================

  /**
   * Generate cache key for query
   * @param {string} query - Search query
   * @param {string} namespace - Search namespace
   * @param {Object} options - Search options
   * @returns {string} Cache key
   */
  _generateQueryCacheKey(query, namespace, options = {}) {
    return `${namespace}:${query}:${JSON.stringify(options)}`;
  }

  /**
   * Get cached query results
   * @param {string} query - Search query
   * @param {string} namespace - Search namespace
   * @param {Object} options - Search options
   * @returns {Object|null} Cached results or null
   */
  getQueryCache(query, namespace, options = {}) {
    const key = this._generateQueryCacheKey(query, namespace, options);
    return this.queryCache.get(key);
  }

  /**
   * Store query results in cache
   * @param {string} query - Search query
   * @param {string} namespace - Search namespace
   * @param {Object} results - Search results
   * @param {Object} options - Search options
   */
  setQueryCache(query, namespace, results, options = {}) {
    const key = this._generateQueryCacheKey(query, namespace, options);
    this.queryCache.set(key, results, this.queryCacheTTL);
  }

  /**
   * Invalidate specific query cache
   * @param {string} query - Search query
   * @param {string} namespace - Search namespace
   * @param {Object} options - Search options
   */
  invalidateQueryCache(query, namespace, options = {}) {
    const key = this._generateQueryCacheKey(query, namespace, options);
    this.queryCache.delete(key);
  }

  /**
   * Invalidate all caches for a namespace
   * @param {string} namespace - Namespace to invalidate
   */
  invalidateNamespaceCache(namespace) {
    const keysToDelete = [];
    for (const key of this.queryCache.cache.keys()) {
      if (key.startsWith(`${namespace}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.queryCache.delete(key));
  }

  /**
   * Clear all query caches
   */
  clearAllQueryCaches() {
    this.queryCache.clear();
  }

  /**
   * Get query cache statistics
   * @returns {Object} Cache stats
   */
  getQueryCacheStats() {
    const stats = this.queryCache.getStats();
    const byNamespace = {};

    for (const key of this.queryCache.cache.keys()) {
      const namespace = key.split(':')[0];
      byNamespace[namespace] = (byNamespace[namespace] || 0) + 1;
    }

    return {
      ...stats,
      totalEntries: stats.size,
      byNamespace
    };
  }

  /**
   * Search with caching
   * @param {string} query - Search query
   * @param {string} namespace - Search namespace
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  async searchWithCache(query, namespace, options = {}) {
    const cacheKey = this._generateQueryCacheKey(query, namespace, options);

    // Check cache
    const cachedResults = this.queryCache.get(cacheKey);
    if (cachedResults) {
      return { ...cachedResults, cached: true };
    }

    // Perform search
    const startTime = Date.now();

    // Generate embedding for query
    let queryEmbedding = this.getCachedEmbedding(query);
    if (!queryEmbedding) {
      queryEmbedding = await vectorService.generateEmbedding(query);
      this.setCachedEmbedding(query, queryEmbedding);
    }

    // Search vectors
    const searchResults = await zerodbService.searchVectors(
      queryEmbedding,
      options.limit || 10,
      namespace
    );

    const latency = Date.now() - startTime;
    this.metrics.recordSearchLatency(latency);

    const results = {
      query,
      results: searchResults.vectors || [],
      total_count: (searchResults.vectors || []).length,
      search_time_ms: latency
    };

    // Cache results
    this.setQueryCache(query, namespace, results, options);

    return { ...results, cached: false };
  }

  // ==================== Pagination ====================

  /**
   * Search with pagination support
   * @param {string} query - Search query
   * @param {string} namespace - Search namespace
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async searchWithPagination(query, namespace, options = {}) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const includeCursor = options.includeCursor || false;

    // Fetch more results than needed for pagination
    const fetchLimit = Math.max(pageSize * page + pageSize, 100);

    const startTime = Date.now();

    // Generate embedding for query
    let queryEmbedding = this.getCachedEmbedding(query);
    if (!queryEmbedding) {
      queryEmbedding = await vectorService.generateEmbedding(query);
      this.setCachedEmbedding(query, queryEmbedding);
    }

    // Search vectors
    const searchResults = await zerodbService.searchVectors(
      queryEmbedding,
      fetchLimit,
      namespace
    );

    const latency = Date.now() - startTime;
    this.metrics.recordSearchLatency(latency);

    const allResults = searchResults.vectors || [];
    const totalResults = allResults.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedResults = allResults.slice(startIndex, endIndex);

    const pagination = {
      currentPage: page,
      pageSize,
      totalResults,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };

    if (includeCursor && paginatedResults.length > 0) {
      const lastResult = paginatedResults[paginatedResults.length - 1];
      pagination.nextCursor = Buffer.from(
        JSON.stringify({
          offset: endIndex,
          lastId: lastResult.id
        })
      ).toString('base64');
    }

    return {
      results: paginatedResults,
      pagination,
      search_time_ms: latency
    };
  }

  /**
   * Search with cursor-based pagination
   * @param {string} query - Search query
   * @param {string} namespace - Search namespace
   * @param {Object} options - Cursor options
   * @returns {Promise<Object>} Cursor-paginated results
   */
  async searchWithCursor(query, namespace, options = {}) {
    const limit = options.limit || 10;
    let offset = 0;

    if (options.cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(options.cursor, 'base64').toString('utf8')
        );
        offset = decoded.offset || 0;
      } catch (e) {
        // Invalid cursor, start from beginning
      }
    }

    const startTime = Date.now();

    // Generate embedding for query
    let queryEmbedding = this.getCachedEmbedding(query);
    if (!queryEmbedding) {
      queryEmbedding = await vectorService.generateEmbedding(query);
      this.setCachedEmbedding(query, queryEmbedding);
    }

    // Fetch results
    const fetchLimit = offset + limit + 1; // Extra to check for next page
    const searchResults = await zerodbService.searchVectors(
      queryEmbedding,
      fetchLimit,
      namespace
    );

    const latency = Date.now() - startTime;
    this.metrics.recordSearchLatency(latency);

    const allResults = searchResults.vectors || [];
    const results = allResults.slice(offset, offset + limit);
    const hasMore = allResults.length > offset + limit;

    let nextCursor = null;
    if (hasMore && results.length > 0) {
      nextCursor = Buffer.from(
        JSON.stringify({
          offset: offset + limit,
          lastId: results[results.length - 1].id
        })
      ).toString('base64');
    }

    return {
      results,
      nextCursor,
      hasMore,
      search_time_ms: latency
    };
  }

  // ==================== Performance Metrics ====================

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      searchLatency: this.metrics.getSearchLatencyStats(),
      embeddingGeneration: this.metrics.getEmbeddingStats(),
      cachePerformance: {
        embeddingCacheHitRate: this.embeddingCache.getStats().hitRate,
        queryCacheHitRate: this.queryCache.getStats().hitRate
      },
      throughput: this.metrics.getThroughput(),
      storage: {
        embeddingCacheSizeBytes: this.embeddingCache.estimateSizeBytes(),
        queryCacheSizeBytes: this.queryCache.estimateSizeBytes()
      }
    };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics.reset();
    this.embeddingCache.hits = 0;
    this.embeddingCache.misses = 0;
    this.queryCache.hits = 0;
    this.queryCache.misses = 0;
  }

  /**
   * Generate comprehensive metrics report
   * @returns {Object} Metrics report with recommendations
   */
  getMetricsReport() {
    const metrics = this.getPerformanceMetrics();
    const recommendations = [];

    // Check embedding cache hit rate
    if (metrics.cachePerformance.embeddingCacheHitRate < 0.5) {
      recommendations.push({
        type: 'cache',
        severity: 'medium',
        message: 'Low embedding cache hit rate. Consider increasing cache size.',
        metric: 'embeddingCacheHitRate',
        value: metrics.cachePerformance.embeddingCacheHitRate
      });
    }

    // Check search latency
    if (metrics.searchLatency.p95 > 1000) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: 'High search latency detected. Consider optimizing index or caching.',
        metric: 'searchLatencyP95',
        value: metrics.searchLatency.p95
      });
    }

    // Check query cache hit rate
    if (metrics.cachePerformance.queryCacheHitRate < 0.3) {
      recommendations.push({
        type: 'cache',
        severity: 'low',
        message: 'Low query cache hit rate. Consider increasing TTL or cache size.',
        metric: 'queryCacheHitRate',
        value: metrics.cachePerformance.queryCacheHitRate
      });
    }

    return {
      timestamp: new Date().toISOString(),
      uptime: this.metrics.getUptime(),
      metrics,
      recommendations
    };
  }

  // ==================== Vector Index Management ====================

  /**
   * Create vector index
   * @param {Object} config - Index configuration
   * @returns {Promise<Object>} Created index details
   */
  async createVectorIndex(config) {
    const validIndexTypes = ['hnsw', 'flat', 'ivf'];

    if (config.indexType && !validIndexTypes.includes(config.indexType)) {
      throw new Error(
        `Invalid index type: ${config.indexType}. Must be one of: ${validIndexTypes.join(', ')}`
      );
    }

    const indexConfig = {
      namespace: config.namespace,
      indexType: config.indexType || 'hnsw',
      dimensions: config.dimensions || 768,
      metric: config.metric || 'cosine',
      createdAt: new Date().toISOString()
    };

    const indexName = `idx_${config.namespace}_${indexConfig.indexType}`;
    this.indexes.set(indexName, indexConfig);

    return {
      indexName,
      status: 'created',
      config: indexConfig
    };
  }

  /**
   * Get index statistics
   * @param {string} namespace - Namespace to get stats for
   * @returns {Promise<Object>} Index statistics
   */
  async getIndexStats(namespace) {
    // This would normally call the vector database API
    // For now, return simulated stats
    return {
      namespace,
      vectorCount: 0,
      indexSize: '0 MB',
      lastUpdated: new Date().toISOString()
    };
  }

  // ==================== Configuration ====================

  /**
   * Update optimizer configuration
   * @param {Object} newConfig - New configuration values
   */
  updateConfig(newConfig) {
    // Validate configuration
    if (
      newConfig.embeddingCacheMaxSize !== undefined &&
      newConfig.embeddingCacheMaxSize < 1
    ) {
      throw new Error('Invalid configuration: embeddingCacheMaxSize must be >= 1');
    }
    if (newConfig.queryCacheMaxSize !== undefined && newConfig.queryCacheMaxSize < 1) {
      throw new Error('Invalid configuration: queryCacheMaxSize must be >= 1');
    }
    if (newConfig.batchSize !== undefined && newConfig.batchSize < 1) {
      throw new Error('Invalid configuration: batchSize must be >= 1');
    }
    if (newConfig.batchConcurrency !== undefined && newConfig.batchConcurrency < 1) {
      throw new Error('Invalid configuration: batchConcurrency must be >= 1');
    }

    // Apply configuration
    if (newConfig.embeddingCacheMaxSize !== undefined) {
      this.embeddingCacheMaxSize = newConfig.embeddingCacheMaxSize;
      this.embeddingCache.maxSize = newConfig.embeddingCacheMaxSize;
    }
    if (newConfig.embeddingCacheTTL !== undefined) {
      this.embeddingCacheTTL = newConfig.embeddingCacheTTL;
    }
    if (newConfig.queryCacheTTL !== undefined) {
      this.queryCacheTTL = newConfig.queryCacheTTL;
    }
    if (newConfig.queryCacheMaxSize !== undefined) {
      this.queryCacheMaxSize = newConfig.queryCacheMaxSize;
      this.queryCache.maxSize = newConfig.queryCacheMaxSize;
    }
    if (newConfig.batchSize !== undefined) {
      this.batchSize = newConfig.batchSize;
    }
    if (newConfig.batchConcurrency !== undefined) {
      this.batchConcurrency = newConfig.batchConcurrency;
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      embeddingCacheMaxSize: this.embeddingCacheMaxSize,
      embeddingCacheTTL: this.embeddingCacheTTL,
      queryCacheTTL: this.queryCacheTTL,
      queryCacheMaxSize: this.queryCacheMaxSize,
      batchSize: this.batchSize,
      batchConcurrency: this.batchConcurrency
    };
  }

  // ==================== Lifecycle ====================

  /**
   * Clean up resources
   */
  destroy() {
    this.embeddingCache.clear();
    this.queryCache.clear();
    this.indexes.clear();
    this.metrics.reset();
  }

  /**
   * Warmup cache with common queries
   * @param {Array<Object>} queries - Common queries to pre-cache
   * @returns {Promise<void>}
   */
  async warmupCache(queries) {
    for (const { text, namespace } of queries) {
      try {
        // Generate and cache embedding
        const embedding = await vectorService.generateEmbedding(text);
        this.setCachedEmbedding(text, embedding);

        // Optionally perform search to cache results
        if (namespace) {
          await this.searchWithCache(text, namespace);
        }
      } catch (error) {
        console.warn(`Failed to warmup cache for query "${text}":`, error.message);
      }
    }
  }
}

module.exports = VectorSearchOptimizer;
