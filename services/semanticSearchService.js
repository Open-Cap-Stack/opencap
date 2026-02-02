/**
 * Semantic Search Service
 *
 * [Feature] OCAE-23: Semantic Document Search
 * Provides semantic search functionality for natural language document queries
 * using vector embeddings and similarity search
 */

const vectorService = require('./vectorService');
const zerodbService = require('./zerodbService');

/**
 * Configuration constants
 */
const CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 1000,
  DEFAULT_NAMESPACE: 'documents',
  TITLE_MATCH_BOOST: 0.15,
  SNIPPET_LENGTH: 200
};

/**
 * Search analytics storage (in production, would use a persistent store)
 */
const searchAnalyticsStore = [];

/**
 * SemanticSearchService class provides methods for semantic document search
 */
class SemanticSearchService {
  /**
   * Generate embedding vector for a search query
   * @param {string} query - The search query text
   * @returns {Promise<number[]>} - The embedding vector
   * @throws {Error} - If query is empty or null
   */
  async generateQueryEmbedding(query) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    // Normalize query: lowercase, trim, collapse whitespace
    const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');

    try {
      const embedding = await vectorService.generateEmbedding(normalizedQuery);
      return embedding;
    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw new Error('Failed to generate query embedding');
    }
  }

  /**
   * Perform semantic search on documents
   * @param {string} query - The search query text
   * @param {Object} options - Search options
   * @param {Object} options.filters - Filter criteria (companyId, category, dateRange, etc.)
   * @param {Object} options.pagination - Pagination options (page, pageSize)
   * @param {string} options.userId - User ID for analytics tracking
   * @param {number} options.limit - Maximum results to return from vector search
   * @param {number} options.minRelevance - Minimum relevance score threshold
   * @param {boolean} options.highlight - Whether to highlight matching terms
   * @param {boolean} options.includeContent - Whether to include full document content
   * @returns {Promise<Object>} - Search results with metadata
   */
  async search(query, options = {}) {
    const startTime = Date.now();

    // Validate pagination parameters
    this.validatePaginationParams(options.pagination);

    // Set defaults
    const pagination = {
      page: options.pagination?.page || 1,
      pageSize: Math.min(options.pagination?.pageSize || CONFIG.DEFAULT_PAGE_SIZE, CONFIG.MAX_PAGE_SIZE)
    };

    const filters = options.filters || {};
    const limit = options.limit || CONFIG.MAX_PAGE_SIZE;
    const minRelevance = options.minRelevance || 0;
    const namespace = filters.namespace || CONFIG.DEFAULT_NAMESPACE;

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Perform vector similarity search
      const searchResults = await zerodbService.searchVectors(
        queryEmbedding,
        limit,
        namespace
      );

      // Extract and transform results
      let results = this.transformSearchResults(searchResults.vectors || [], query, options);

      // Apply filters
      results = this.applyFilters(results, filters);

      // Apply minimum relevance threshold
      if (minRelevance > 0) {
        results = results.filter(r => r.relevanceScore >= minRelevance);
      }

      // Calculate pagination
      const totalCount = results.length;
      const totalPages = Math.ceil(totalCount / pagination.pageSize);
      const startIndex = (pagination.page - 1) * pagination.pageSize;
      const paginatedResults = results.slice(startIndex, startIndex + pagination.pageSize);

      const responseTimeMs = Date.now() - startTime;

      // Track analytics
      this.trackSearchAnalytics({
        query,
        userId: options.userId,
        resultCount: totalCount,
        responseTimeMs,
        filters,
        timestamp: new Date()
      });

      return {
        results: paginatedResults,
        totalCount,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages,
        searchTimeMs: searchResults.search_time_ms || responseTimeMs
      };
    } catch (error) {
      console.error('Semantic search error:', error);
      if (error.message === 'Failed to generate query embedding') {
        throw error;
      }
      throw new Error('Search service error');
    }
  }

  /**
   * Transform raw vector search results into formatted search results
   * @param {Array} vectors - Raw vector results from ZeroDB
   * @param {string} query - Original search query for relevance boosting
   * @param {Object} options - Search options
   * @returns {Array} - Transformed search results
   */
  transformSearchResults(vectors, query, options = {}) {
    const normalizedQuery = query.toLowerCase().trim();

    return vectors.map(vector => {
      const metadata = vector.vector_metadata || {};
      const similarityScore = vector.similarity_score || 0;

      // Calculate relevance score with title match boosting
      let relevanceScore = this.normalizeScore(similarityScore);
      const title = (metadata.title || '').toLowerCase();

      if (title.includes(normalizedQuery) || this.hasSignificantOverlap(title, normalizedQuery)) {
        relevanceScore = Math.min(relevanceScore + CONFIG.TITLE_MATCH_BOOST, 1);
      }

      // Generate snippet from document content
      const snippet = this.generateSnippet(vector.document || '', normalizedQuery);

      const result = {
        documentId: metadata.document_id,
        title: metadata.title,
        category: metadata.type,
        companyId: metadata.company_id,
        indexedAt: metadata.indexed_at,
        relevanceScore,
        snippet
      };

      // Include full content if requested
      if (options.includeContent) {
        result.content = vector.document;
      }

      // Add highlighting if requested
      if (options.highlight) {
        result.highlights = this.generateHighlights(vector.document || '', normalizedQuery);
      }

      return result;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Normalize similarity score to be between 0 and 1
   * @param {number} score - Raw similarity score
   * @returns {number} - Normalized score
   */
  normalizeScore(score) {
    if (score < 0) return 0;
    if (score > 1) return 1;
    return score;
  }

  /**
   * Check if title has significant word overlap with query
   * @param {string} title - Document title
   * @param {string} query - Search query
   * @returns {boolean} - Whether there is significant overlap
   */
  hasSignificantOverlap(title, query) {
    const titleWords = title.split(/\s+/).filter(w => w.length > 2);
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);

    if (queryWords.length === 0) return false;

    const matchCount = queryWords.filter(qw =>
      titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
    ).length;

    return matchCount >= Math.ceil(queryWords.length * 0.5);
  }

  /**
   * Generate a snippet from document content
   * @param {string} content - Full document content
   * @param {string} query - Search query for context
   * @returns {string} - Content snippet
   */
  generateSnippet(content, query) {
    if (!content) return '';

    const lowerContent = content.toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);

    // Find the first occurrence of a query word
    let startIndex = 0;
    for (const word of queryWords) {
      const index = lowerContent.indexOf(word);
      if (index !== -1) {
        startIndex = Math.max(0, index - 50);
        break;
      }
    }

    // Extract snippet
    let snippet = content.substring(startIndex, startIndex + CONFIG.SNIPPET_LENGTH);

    // Clean up snippet boundaries
    if (startIndex > 0) {
      snippet = '...' + snippet.substring(snippet.indexOf(' ') + 1);
    }
    if (startIndex + CONFIG.SNIPPET_LENGTH < content.length) {
      const lastSpace = snippet.lastIndexOf(' ');
      if (lastSpace > CONFIG.SNIPPET_LENGTH - 50) {
        snippet = snippet.substring(0, lastSpace) + '...';
      } else {
        snippet += '...';
      }
    }

    return snippet.trim();
  }

  /**
   * Generate highlighted excerpts from content
   * @param {string} content - Document content
   * @param {string} query - Search query
   * @returns {Array} - Array of highlighted excerpts
   */
  generateHighlights(content, query) {
    const highlights = [];
    const lowerContent = content.toLowerCase();
    const queryWords = query.split(/\s+/).filter(w => w.length > 2);

    for (const word of queryWords) {
      let index = lowerContent.indexOf(word);
      while (index !== -1 && highlights.length < 3) {
        const start = Math.max(0, index - 30);
        const end = Math.min(content.length, index + word.length + 30);
        const excerpt = content.substring(start, end);
        highlights.push({
          text: excerpt,
          matchStart: index - start,
          matchEnd: index - start + word.length
        });
        index = lowerContent.indexOf(word, index + 1);
      }
    }

    return highlights;
  }

  /**
   * Apply filters to search results
   * @param {Array} results - Search results to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} - Filtered results
   */
  applyFilters(results, filters) {
    let filtered = [...results];

    // Filter by company ID
    if (filters.companyId) {
      filtered = filtered.filter(r => r.companyId === filters.companyId);
    }

    // Filter by single category
    if (filters.category) {
      filtered = filtered.filter(r => r.category === filters.category);
    }

    // Filter by multiple categories
    if (filters.categories && Array.isArray(filters.categories)) {
      filtered = filtered.filter(r => filters.categories.includes(r.category));
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(r => r.status === filters.status);
    }

    // Filter by tags
    if (filters.tags && Array.isArray(filters.tags)) {
      filtered = filtered.filter(r =>
        r.tags && filters.tags.some(tag => r.tags.includes(tag))
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      const startDate = start instanceof Date ? start : new Date(start);
      const endDate = end instanceof Date ? end : new Date(end);

      filtered = filtered.filter(r => {
        if (!r.indexedAt) return true;
        const indexedDate = new Date(r.indexedAt);
        return indexedDate >= startDate && indexedDate <= endDate;
      });
    }

    return filtered;
  }

  /**
   * Validate pagination parameters
   * @param {Object} pagination - Pagination options
   * @throws {Error} - If parameters are invalid
   */
  validatePaginationParams(pagination) {
    if (!pagination) return;

    if (pagination.page !== undefined) {
      if (typeof pagination.page !== 'number' || pagination.page < 1 || !Number.isInteger(pagination.page)) {
        throw new Error('Invalid pagination parameters: page must be a positive integer');
      }
    }

    if (pagination.pageSize !== undefined) {
      if (typeof pagination.pageSize !== 'number' || pagination.pageSize < 1 || !Number.isInteger(pagination.pageSize)) {
        throw new Error('Invalid pagination parameters: pageSize must be a positive integer');
      }
    }
  }

  /**
   * Track search analytics
   * @param {Object} analyticsData - Analytics data to track
   */
  trackSearchAnalytics(analyticsData) {
    try {
      searchAnalyticsStore.push({
        ...analyticsData,
        trackedAt: new Date()
      });

      // In production, this would persist to a database
      // Keep only last 1000 entries in memory
      if (searchAnalyticsStore.length > 1000) {
        searchAnalyticsStore.shift();
      }
    } catch (error) {
      console.error('Failed to track search analytics:', error);
      // Don't throw - analytics tracking shouldn't break search
    }
  }

  /**
   * Get search suggestions for autocomplete
   * @param {string} partialQuery - Partial search query
   * @param {Object} options - Options (companyId, limit)
   * @returns {Promise<Array>} - Array of suggestions
   */
  async getSuggestions(partialQuery, options = {}) {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const limit = options.limit || 10;

    // In production, this would query a suggestions index
    // For now, derive suggestions from recent searches
    const recentQueries = searchAnalyticsStore
      .filter(a => {
        const matchesQuery = a.query.toLowerCase().includes(partialQuery.toLowerCase());
        const matchesCompany = !options.companyId ||
          (a.filters && a.filters.companyId === options.companyId);
        return matchesQuery && matchesCompany;
      })
      .map(a => a.query);

    // Deduplicate and limit
    const uniqueSuggestions = [...new Set(recentQueries)];
    return uniqueSuggestions.slice(0, limit);
  }

  /**
   * Get search analytics data
   * @param {Object} options - Filter options (companyId, dateRange)
   * @returns {Promise<Object>} - Analytics summary
   */
  async getSearchAnalytics(options = {}) {
    let analytics = [...searchAnalyticsStore];

    // Filter by company
    if (options.companyId) {
      analytics = analytics.filter(a =>
        a.filters && a.filters.companyId === options.companyId
      );
    }

    // Filter by date range
    if (options.dateRange) {
      const { start, end } = options.dateRange;
      const startDate = new Date(start);
      const endDate = new Date(end);

      analytics = analytics.filter(a => {
        const timestamp = new Date(a.timestamp);
        return timestamp >= startDate && timestamp <= endDate;
      });
    }

    // Calculate metrics
    const totalSearches = analytics.length;
    const uniqueQueries = new Set(analytics.map(a => a.query)).size;
    const totalResponseTime = analytics.reduce((sum, a) => sum + (a.responseTimeMs || 0), 0);
    const averageResponseTime = totalSearches > 0 ? Math.round(totalResponseTime / totalSearches) : 0;

    // Get top queries
    const queryCount = {};
    analytics.forEach(a => {
      queryCount[a.query] = (queryCount[a.query] || 0) + 1;
    });

    const topQueries = Object.entries(queryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Get searches by category
    const searchesByCategory = {};
    analytics.forEach(a => {
      if (a.filters && a.filters.category) {
        const category = a.filters.category;
        searchesByCategory[category] = (searchesByCategory[category] || 0) + 1;
      }
    });

    return {
      totalSearches,
      uniqueQueries,
      averageResponseTime,
      topQueries,
      searchesByCategory
    };
  }
}

// Export singleton instance
module.exports = new SemanticSearchService();
