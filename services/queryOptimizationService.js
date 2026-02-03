/**
 * Query Optimization Service
 * Issue #47: Implement Database Optimization and Caching
 *
 * Provides query analysis, optimization suggestions, and slow query tracking
 * Features: query analysis, index suggestions, slow query logging, statistics
 */

class QueryOptimizationService {
  constructor() {
    this.slowQueryThreshold = 100; // 100ms default
    this.maxSlowQueryLogSize = 1000;
    this.slowQueryLog = [];
    this.queryLog = [];
    this.maxQueryLogSize = 10000;
    this.patternStats = new Map();
  }

  /**
   * Analyze query performance
   * @param {Object} query - Query with execution details
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeQuery(query, options = {}) {
    const {
      slowQueryThresholdMs = this.slowQueryThreshold
    } = options;

    const {
      collection,
      filter = {},
      sort,
      executionTimeMs,
      docsExamined = 0,
      docsReturned = 0
    } = query;

    // Determine if slow query
    const isSlowQuery = executionTimeMs >= slowQueryThresholdMs;

    // Calculate complexity score
    const complexity = this.calculateComplexity(filter, sort);

    // Check for full collection scan
    const isFullScan = docsExamined > 0 && docsExamined === docsReturned && filter && Object.keys(filter).length === 0;

    // Calculate efficiency (ratio of returned to examined documents)
    const efficiency = docsExamined > 0 ? docsReturned / docsExamined : 1;

    // Generate suggestions
    const suggestions = this.generateSuggestions(query, {
      isSlowQuery,
      isFullScan,
      efficiency,
      complexity
    });

    return {
      collection,
      executionTime: executionTimeMs,
      isSlowQuery,
      complexity,
      isFullScan,
      efficiency,
      docsExamined,
      docsReturned,
      suggestions
    };
  }

  /**
   * Suggest indexes for a query
   * @param {Object} query - Query parameters
   * @returns {Promise<Object[]>} Index suggestions
   */
  async suggestIndexes(query) {
    const { collection, filter = {}, sort, projection } = query;
    const suggestions = [];

    // Get filter fields (excluding _id which is always indexed)
    const filterFields = this.extractFields(filter).filter(f => f !== '_id');

    // Check for text search
    if (filter.$text) {
      suggestions.push({
        field: 'text',
        type: 'text',
        reason: 'Query uses $text search',
        createCommand: `db.${collection}.createIndex({ "$**": "text" })`
      });
    }

    // Single field indexes for simple filters
    if (filterFields.length === 1) {
      const field = filterFields[0];
      suggestions.push({
        field,
        type: 'single',
        reason: `Single field filter on '${field}'`,
        estimatedImpact: 'high',
        createCommand: `db.${collection}.createIndex({ "${field}": 1 })`
      });
    }

    // Compound index for multiple filter fields
    if (filterFields.length > 1) {
      const fields = filterFields.join(', ');
      const indexSpec = filterFields.map(f => `"${f}": 1`).join(', ');
      suggestions.push({
        field: fields,
        type: 'compound',
        reason: `Multi-field filter on ${fields}`,
        estimatedImpact: 'high',
        createCommand: `db.${collection}.createIndex({ ${indexSpec} })`
      });
    }

    // Sort index suggestions
    if (sort) {
      const sortFields = Object.keys(sort);
      for (const field of sortFields) {
        if (!filterFields.includes(field) && field !== '_id') {
          const direction = sort[field];
          suggestions.push({
            field,
            type: 'single',
            reason: `Sort operation on '${field}'`,
            estimatedImpact: 'medium',
            createCommand: `db.${collection}.createIndex({ "${field}": ${direction} })`
          });
        }
      }
    }

    // Covered index suggestion for projection
    if (projection && filterFields.length > 0) {
      const projectionFields = Object.keys(projection).filter(f => projection[f] === 1 && f !== '_id');
      if (projectionFields.length > 0) {
        const allFields = [...new Set([...filterFields, ...projectionFields])];
        if (allFields.length <= 5) { // Reasonable covered index size
          const indexSpec = allFields.map(f => `"${f}": 1`).join(', ');
          suggestions.push({
            field: allFields.join(', '),
            type: 'covered',
            reason: 'Covered index for filter and projection fields',
            estimatedImpact: 'high',
            createCommand: `db.${collection}.createIndex({ ${indexSpec} })`
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Log a slow query
   * @param {Object} query - Query details
   */
  logSlowQuery(query) {
    const entry = {
      ...query,
      timestamp: query.timestamp || new Date()
    };

    this.slowQueryLog.push(entry);

    // Trim to max size
    if (this.slowQueryLog.length > this.maxSlowQueryLogSize) {
      this.slowQueryLog.shift();
    }
  }

  /**
   * Get slow queries from log
   * @param {Object} options - Filter options
   * @returns {Object[]} Slow queries
   */
  getSlowQueries(options = {}) {
    const { collection, since } = options;

    let queries = [...this.slowQueryLog];

    if (collection) {
      queries = queries.filter(q => q.collection === collection);
    }

    if (since) {
      const sinceTime = since.getTime();
      queries = queries.filter(q => new Date(q.timestamp).getTime() >= sinceTime);
    }

    return queries;
  }

  /**
   * Clear slow query log
   */
  clearSlowQueryLog() {
    this.slowQueryLog = [];
  }

  /**
   * Set max slow query log size
   * @param {number} size - Maximum entries
   */
  setMaxSlowQueryLogSize(size) {
    this.maxSlowQueryLogSize = size;
    while (this.slowQueryLog.length > size) {
      this.slowQueryLog.shift();
    }
  }

  /**
   * Track query execution
   * @param {Object} query - Query details
   */
  trackQuery(query) {
    const entry = {
      ...query,
      timestamp: query.timestamp || new Date()
    };

    this.queryLog.push(entry);

    // Trim to max size
    if (this.queryLog.length > this.maxQueryLogSize) {
      this.queryLog.shift();
    }

    // Update pattern stats
    const pattern = this.getQueryPattern(query);
    if (!this.patternStats.has(pattern)) {
      this.patternStats.set(pattern, {
        count: 0,
        totalTime: 0,
        collection: query.collection
      });
    }
    const stats = this.patternStats.get(pattern);
    stats.count++;
    stats.totalTime += query.executionTimeMs || 0;

    // Auto-log slow queries
    if (query.executionTimeMs >= this.slowQueryThreshold) {
      this.logSlowQuery(query);
    }
  }

  /**
   * Get query statistics
   * @param {Object} options - Filter options
   * @returns {Object} Query statistics
   */
  getQueryStats(options = {}) {
    const { since } = options;

    let queries = [...this.queryLog];

    if (since) {
      const sinceTime = since.getTime();
      queries = queries.filter(q => new Date(q.timestamp).getTime() >= sinceTime);
    }

    if (queries.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        slowQueryCount: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        byCollection: {},
        topPatterns: []
      };
    }

    const executionTimes = queries
      .map(q => q.executionTimeMs || 0)
      .filter(t => t > 0)
      .sort((a, b) => a - b);

    const totalTime = executionTimes.reduce((sum, t) => sum + t, 0);
    const avgTime = totalTime / (executionTimes.length || 1);

    // Calculate percentiles
    const p50 = this.percentile(executionTimes, 50);
    const p95 = this.percentile(executionTimes, 95);
    const p99 = this.percentile(executionTimes, 99);

    // Group by collection
    const byCollection = {};
    for (const query of queries) {
      const col = query.collection;
      if (!byCollection[col]) {
        byCollection[col] = { count: 0, totalTime: 0 };
      }
      byCollection[col].count++;
      byCollection[col].totalTime += query.executionTimeMs || 0;
    }

    // Get top patterns
    const topPatterns = Array.from(this.patternStats.entries())
      .map(([pattern, stats]) => ({
        pattern,
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        collection: stats.collection
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalQueries: queries.length,
      averageExecutionTime: Math.round(avgTime * 100) / 100,
      slowQueryCount: queries.filter(q => (q.executionTimeMs || 0) >= this.slowQueryThreshold).length,
      p50,
      p95,
      p99,
      byCollection,
      topPatterns
    };
  }

  /**
   * Get optimization recommendations
   * @returns {Promise<Object[]>} Recommendations
   */
  async getRecommendations() {
    const recommendations = [];
    const stats = this.getQueryStats();

    // Recommend indexes for frequent slow patterns
    for (const pattern of stats.topPatterns) {
      if (pattern.avgTime > this.slowQueryThreshold && pattern.count > 5) {
        recommendations.push({
          type: 'index',
          priority: 'high',
          description: `Frequently slow query pattern on ${pattern.collection}`,
          pattern: pattern.pattern,
          avgTime: pattern.avgTime,
          count: pattern.count,
          action: 'Consider adding an index for this query pattern'
        });
      }
    }

    // Warn about high slow query rate
    if (stats.totalQueries > 0) {
      const slowRate = (stats.slowQueryCount / stats.totalQueries) * 100;
      if (slowRate > 10) {
        recommendations.push({
          type: 'performance',
          priority: 'high',
          description: `High slow query rate: ${slowRate.toFixed(1)}%`,
          action: 'Review slow queries and add appropriate indexes'
        });
      }
    }

    // Recommend cache for repeated queries
    for (const pattern of stats.topPatterns) {
      if (pattern.count > 100) {
        recommendations.push({
          type: 'caching',
          priority: 'medium',
          description: `High frequency query pattern (${pattern.count} calls)`,
          pattern: pattern.pattern,
          action: 'Consider caching results for this query'
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Set slow query threshold
   * @param {number} thresholdMs - Threshold in milliseconds
   */
  setSlowQueryThreshold(thresholdMs) {
    this.slowQueryThreshold = thresholdMs;
  }

  /**
   * Get current slow query threshold
   * @returns {number} Threshold in milliseconds
   */
  getSlowQueryThreshold() {
    return this.slowQueryThreshold;
  }

  /**
   * Reset service state
   */
  reset() {
    this.slowQueryLog = [];
    this.queryLog = [];
    this.patternStats.clear();
  }

  // Private helper methods

  /**
   * Calculate query complexity score
   * @param {Object} filter - Query filter
   * @param {Object} sort - Sort specification
   * @returns {number} Complexity score
   */
  calculateComplexity(filter, sort) {
    let complexity = 1;

    if (!filter || Object.keys(filter).length === 0) {
      return complexity;
    }

    // Add for each filter field
    complexity += Object.keys(filter).length;

    // Add for special operators
    const filterString = JSON.stringify(filter);
    if (filterString.includes('$or')) complexity += 2;
    if (filterString.includes('$and')) complexity += 1;
    if (filterString.includes('$regex')) complexity += 3;
    if (filterString.includes('$in')) complexity += 1;
    if (filterString.includes('$exists')) complexity += 1;

    // Add for nested fields
    const nestedFieldCount = (filterString.match(/\./g) || []).length;
    complexity += nestedFieldCount;

    // Add for sorting
    if (sort) {
      complexity += Object.keys(sort).length;
    }

    return complexity;
  }

  /**
   * Generate optimization suggestions
   * @param {Object} query - Query details
   * @param {Object} analysis - Analysis results
   * @returns {string[]} Suggestions
   */
  generateSuggestions(query, analysis) {
    const suggestions = [];

    if (analysis.isFullScan) {
      suggestions.push('Consider adding a filter to avoid full collection scan');
    }

    if (analysis.efficiency < 0.1 && analysis.isSlowQuery) {
      suggestions.push('Low query efficiency - consider adding an index on filter fields');
    }

    if (analysis.complexity > 5) {
      suggestions.push('Complex query - consider breaking into simpler queries or denormalizing data');
    }

    if (query.filter && query.filter.$regex) {
      suggestions.push('Regex queries can be slow - consider text indexes or prefix matching');
    }

    return suggestions;
  }

  /**
   * Extract field names from filter object
   * @param {Object} filter - Query filter
   * @returns {string[]} Field names
   */
  extractFields(filter) {
    const fields = new Set();

    const extract = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('$')) {
          // Handle logical operators
          if (key === '$or' || key === '$and') {
            for (const subFilter of value) {
              extract(subFilter, prefix);
            }
          }
          continue;
        }

        const fullPath = prefix ? `${prefix}.${key}` : key;
        fields.add(fullPath);

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Handle nested objects (but not operators)
          const hasOperators = Object.keys(value).some(k => k.startsWith('$'));
          if (!hasOperators) {
            extract(value, fullPath);
          }
        }
      }
    };

    extract(filter);
    return Array.from(fields);
  }

  /**
   * Get normalized query pattern
   * @param {Object} query - Query details
   * @returns {string} Pattern string
   */
  getQueryPattern(query) {
    const fields = this.extractFields(query.filter || {}).sort();
    return `${query.collection}:${fields.join(',')}`;
  }

  /**
   * Calculate percentile
   * @param {number[]} sortedArray - Sorted array of values
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  percentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }
}

// Export singleton instance
module.exports = new QueryOptimizationService();
