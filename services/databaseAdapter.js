/**
 * Database Abstraction Layer
 *
 * ZeroDB-only implementation for OpenCap Stack.
 * Provides unified interface for database operations using ZeroDB.
 *
 * Includes metrics collection and consistent error handling.
 */

const zerodbService = require('./zerodbService');

class DatabaseAdapter {
  constructor() {
    this.metrics = {
      zerodb: { responseTime: [], errorCount: 0, successCount: 0 }
    };
    this.initialized = false;
  }

  /**
   * Get the current migration mode (always ZeroDB-only)
   * @returns {string} Always returns 'zerodb-only'
   */
  getMigrationMode() {
    return 'zerodb-only';
  }

  /**
   * Check if MongoDB is required (always false for ZeroDB-only)
   * @returns {boolean} Always returns false
   */
  isMongoDBRequired() {
    return false;
  }

  /**
   * Initialize database connections
   * @param {string} zerodbToken - JWT token for ZeroDB authentication
   */
  async initialize(zerodbToken) {
    try {
      if (!zerodbToken) {
        throw new Error('ZeroDB token required');
      }
      await zerodbService.initialize(zerodbToken);
      this.initialized = true;
      console.log('DatabaseAdapter initialized with ZeroDB');
    } catch (error) {
      console.error('Failed to initialize DatabaseAdapter:', error);
      throw error;
    }
  }

  /**
   * Create a new document
   * @param {string} modelName - Name of the model
   * @param {Object} data - Document data
   * @returns {Object} Created document
   */
  async create(modelName, data) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const result = await zerodbService.insertRow(tableName, data);
      this._recordMetric(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB create error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find documents by query
   * @param {string} modelName - Name of the model
   * @param {Object} query - Query object
   * @param {Object} options - Query options (limit, sort, etc.)
   * @returns {Array} Found documents
   */
  async find(modelName, query = {}, options = {}) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const result = await this._findInZeroDB(tableName, query, options);
      this._recordMetric(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB find error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find a single document by query
   * @param {string} modelName - Name of the model
   * @param {Object} query - Query object
   * @param {Object} options - Query options (select, etc.)
   * @returns {Object} Found document
   */
  async findOne(modelName, query = {}, options = {}) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const results = await this._findInZeroDB(tableName, query, { limit: 1, ...options });
      this._recordMetric(Date.now() - startTime, true);
      return results && results.length > 0 ? results[0] : null;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB findOne error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Find document by ID
   * @param {string} modelName - Name of the model
   * @param {string} id - Document ID
   * @param {Object} options - Query options (select, etc.)
   * @returns {Object} Found document
   */
  async findById(modelName, id, options = {}) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const results = await this._findInZeroDB(tableName, { _id: id }, { limit: 1, ...options });
      this._recordMetric(Date.now() - startTime, true);
      return results && results.length > 0 ? results[0] : null;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB findById error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update documents by query
   * @param {string} modelName - Name of the model
   * @param {Object} query - Query object
   * @param {Object} update - Update data
   * @param {Object} options - Update options
   * @returns {Object} Update result
   */
  async update(modelName, query, update, options = {}) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const result = await this._updateInZeroDB(tableName, query, update);
      this._recordMetric(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB update error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Update a single document by ID
   * @param {string} modelName - Name of the model
   * @param {string} id - Document ID
   * @param {Object} update - Update data
   * @returns {Object} Updated document
   */
  async findByIdAndUpdate(modelName, id, update, options = {}) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const result = await this._updateInZeroDB(tableName, { _id: id }, update);
      this._recordMetric(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB findByIdAndUpdate error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete documents by query
   * @param {string} modelName - Name of the model
   * @param {Object} query - Query object
   * @returns {Object} Delete result
   */
  async delete(modelName, query) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const result = await this._deleteInZeroDB(tableName, query);
      this._recordMetric(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB delete error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete document by ID
   * @param {string} modelName - Name of the model
   * @param {string} id - Document ID
   * @returns {Object} Deleted document
   */
  async findByIdAndDelete(modelName, id) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const result = await this._deleteInZeroDB(tableName, { _id: id });
      this._recordMetric(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB findByIdAndDelete error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Count documents matching query
   * @param {string} modelName - Name of the model
   * @param {Object} query - Query object
   * @returns {number} Count of matching documents
   */
  async count(modelName, query = {}) {
    this._checkInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      const result = await this._countInZeroDB(tableName, query);
      this._recordMetric(Date.now() - startTime, true);
      return result;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB count error for ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get metrics for ZeroDB
   * @returns {Object} Metrics data
   */
  getMetrics() {
    const calculateAverage = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      zerodb: {
        averageResponseTime: calculateAverage(this.metrics.zerodb.responseTime),
        errorCount: this.metrics.zerodb.errorCount,
        successCount: this.metrics.zerodb.successCount,
        errorRate: this.metrics.zerodb.successCount > 0
          ? (this.metrics.zerodb.errorCount / (this.metrics.zerodb.errorCount + this.metrics.zerodb.successCount)) * 100
          : 0
      }
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      zerodb: { responseTime: [], errorCount: 0, successCount: 0 }
    };
  }

  // Private helper methods

  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('DatabaseAdapter not initialized. Call initialize() first.');
    }
  }

  _recordMetric(responseTime, success) {
    if (responseTime > 0) {
      this.metrics.zerodb.responseTime.push(responseTime);
      // Keep only last 1000 measurements to prevent memory issues
      if (this.metrics.zerodb.responseTime.length > 1000) {
        this.metrics.zerodb.responseTime.shift();
      }
    }

    if (success) {
      this.metrics.zerodb.successCount++;
    } else {
      this.metrics.zerodb.errorCount++;
    }
  }

  _modelToTableName(modelName) {
    // Convert model name to ZeroDB table name
    // Convention: lowercase with underscores
    // e.g., "ShareClass" -> "share_class", "FinancialReport" -> "financial_report"
    return modelName
      .replace(/([A-Z])/g, '_$1')  // Add underscore before uppercase letters
      .toLowerCase()               // Convert to lowercase
      .replace(/^_/, '');          // Remove leading underscore
  }

  // ZeroDB-specific operations

  /**
   * Find documents in ZeroDB
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter
   * @param {Object} options - Query options (limit, sort, skip, projection)
   * @returns {Array} Found documents
   */
  async _findInZeroDB(tableName, query, options) {
    const { limit, sort, skip, projection } = options;
    return await zerodbService.queryTable(tableName, {
      filter: query,
      limit,
      sort,
      skip,
      projection
    });
  }

  /**
   * Update documents in ZeroDB
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter
   * @param {Object} update - Update operations
   * @returns {Object} Update result
   */
  async _updateInZeroDB(tableName, query, update) {
    return await zerodbService.updateRows(tableName, {
      filter: query,
      update: update
    });
  }

  /**
   * Delete documents from ZeroDB
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter
   * @returns {Object} Delete result
   */
  async _deleteInZeroDB(tableName, query) {
    return await zerodbService.deleteRows(tableName, {
      filter: query
    });
  }

  /**
   * Count documents in ZeroDB
   * @param {string} tableName - Name of the table
   * @param {Object} query - Query filter
   * @returns {number} Count of matching documents
   */
  async _countInZeroDB(tableName, query) {
    const results = await zerodbService.queryTable(tableName, {
      filter: query,
      countOnly: true
    });
    return typeof results === 'number' ? results : (results?.count || results?.length || 0);
  }
}

// Export singleton instance
module.exports = new DatabaseAdapter();
