/**
 * Database Abstraction Layer
 *
 * [Issue #32] MongoDB Dependency Clarification
 *
 * IMPORTANT: This adapter supports multiple database modes for migration scenarios.
 * MongoDB support is OPTIONAL - ZeroDB is the recommended primary database.
 *
 * Provides unified interface for routing operations between MongoDB and ZeroDB
 * Supports three migration modes:
 * - zerodb-only: Use ZeroDB exclusively (RECOMMENDED)
 * - mongodb-only: Use MongoDB exclusively (legacy)
 * - parallel: Write to both, read from MongoDB with ZeroDB fallback (migration mode)
 *
 * Includes metrics collection, fallback logic, and data consistency validation
 *
 * Set MIGRATION_MODE environment variable to control behavior:
 * - MIGRATION_MODE=zerodb-only (recommended for new deployments)
 * - MIGRATION_MODE=parallel (for migration period)
 * - MIGRATION_MODE=mongodb-only (legacy, not recommended)
 */

const mongoose = require('mongoose');
const zerodbService = require('./zerodbService');
const { connectDB } = require('../db');

class DatabaseAdapter {
  constructor() {
    this.migrationMode = process.env.MIGRATION_MODE || 'mongodb-only';
    this.metrics = {
      mongodb: { responseTime: [], errorCount: 0, successCount: 0 },
      zerodb: { responseTime: [], errorCount: 0, successCount: 0 }
    };
    this.initialized = false;
  }

  /**
   * Initialize database connections
   * @param {string} zerodbToken - JWT token for ZeroDB authentication
   */
  async initialize(zerodbToken) {
    try {
      // Initialize MongoDB if needed
      if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
        await connectDB();
        console.log('DatabaseAdapter: MongoDB initialized');
      }

      // Initialize ZeroDB if needed
      if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
        if (!zerodbToken) {
          throw new Error('ZeroDB token required for zerodb-only or parallel mode');
        }
        await zerodbService.initialize(zerodbToken);
        console.log('DatabaseAdapter: ZeroDB initialized');
      }

      this.initialized = true;
      console.log(`DatabaseAdapter initialized in ${this.migrationMode} mode`);
    } catch (error) {
      console.error('Failed to initialize DatabaseAdapter:', error);
      throw error;
    }
  }

  /**
   * Create a new document
   * @param {string} modelName - Name of the Mongoose model
   * @param {Object} data - Document data
   * @returns {Object} Created document
   */
  async create(modelName, data) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        const doc = new Model(data);
        results.mongodb = await doc.save();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB create error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        // Map to ZeroDB table
        const tableName = this._modelToTableName(modelName);
        results.zerodb = await this._createInZeroDB(tableName, data);
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB create error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'create');
  }

  /**
   * Find documents by query
   * @param {string} modelName - Name of the Mongoose model
   * @param {Object} query - Query object
   * @param {Object} options - Query options (limit, sort, etc.)
   * @returns {Array} Found documents
   */
  async find(modelName, query = {}, options = {}) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        let mongoQuery = Model.find(query);

        if (options.limit) mongoQuery = mongoQuery.limit(options.limit);
        if (options.sort) mongoQuery = mongoQuery.sort(options.sort);
        if (options.select) mongoQuery = mongoQuery.select(options.select);

        results.mongodb = await mongoQuery.exec();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB find error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const tableName = this._modelToTableName(modelName);
        results.zerodb = await this._findInZeroDB(tableName, query, options);
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB find error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'find');
  }

  /**
   * Find a single document by query
   * @param {string} modelName - Name of the Mongoose model
   * @param {Object} query - Query object
   * @returns {Object} Found document
   */
  async findOne(modelName, query = {}) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        results.mongodb = await Model.findOne(query).exec();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB findOne error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const tableName = this._modelToTableName(modelName);
        const zerodbResults = await this._findInZeroDB(tableName, query, { limit: 1 });
        results.zerodb = zerodbResults && zerodbResults.length > 0 ? zerodbResults[0] : null;
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB findOne error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'findOne');
  }

  /**
   * Find document by ID
   * @param {string} modelName - Name of the Mongoose model
   * @param {string} id - Document ID
   * @returns {Object} Found document
   */
  async findById(modelName, id) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        results.mongodb = await Model.findById(id).exec();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB findById error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const tableName = this._modelToTableName(modelName);
        const zerodbResults = await this._findInZeroDB(tableName, { _id: id }, { limit: 1 });
        results.zerodb = zerodbResults && zerodbResults.length > 0 ? zerodbResults[0] : null;
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB findById error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'findById');
  }

  /**
   * Update documents by query
   * @param {string} modelName - Name of the Mongoose model
   * @param {Object} query - Query object
   * @param {Object} update - Update data
   * @param {Object} options - Update options
   * @returns {Object} Update result
   */
  async update(modelName, query, update, options = {}) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        results.mongodb = await Model.updateMany(query, update, options).exec();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB update error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const tableName = this._modelToTableName(modelName);
        results.zerodb = await this._updateInZeroDB(tableName, query, update);
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB update error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'update');
  }

  /**
   * Update a single document by ID
   * @param {string} modelName - Name of the Mongoose model
   * @param {string} id - Document ID
   * @param {Object} update - Update data
   * @returns {Object} Updated document
   */
  async findByIdAndUpdate(modelName, id, update, options = {}) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        results.mongodb = await Model.findByIdAndUpdate(id, update, { new: true, ...options }).exec();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB findByIdAndUpdate error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const tableName = this._modelToTableName(modelName);
        results.zerodb = await this._updateInZeroDB(tableName, { _id: id }, update);
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB findByIdAndUpdate error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'findByIdAndUpdate');
  }

  /**
   * Delete documents by query
   * @param {string} modelName - Name of the Mongoose model
   * @param {Object} query - Query object
   * @returns {Object} Delete result
   */
  async delete(modelName, query) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        results.mongodb = await Model.deleteMany(query).exec();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB delete error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const tableName = this._modelToTableName(modelName);
        results.zerodb = await this._deleteInZeroDB(tableName, query);
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB delete error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'delete');
  }

  /**
   * Delete document by ID
   * @param {string} modelName - Name of the Mongoose model
   * @param {string} id - Document ID
   * @returns {Object} Deleted document
   */
  async findByIdAndDelete(modelName, id) {
    this._checkInitialized();

    const results = {};
    const errors = {};

    // MongoDB operation
    if (this.migrationMode === 'mongodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const Model = mongoose.model(modelName);
        results.mongodb = await Model.findByIdAndDelete(id).exec();
        this._recordMetric('mongodb', Date.now() - startTime, true);
      } catch (error) {
        errors.mongodb = error;
        this._recordMetric('mongodb', 0, false);
        console.error(`MongoDB findByIdAndDelete error for ${modelName}:`, error);
      }
    }

    // ZeroDB operation
    if (this.migrationMode === 'zerodb-only' || this.migrationMode === 'parallel') {
      try {
        const startTime = Date.now();
        const tableName = this._modelToTableName(modelName);
        results.zerodb = await this._deleteInZeroDB(tableName, { _id: id });
        this._recordMetric('zerodb', Date.now() - startTime, true);
      } catch (error) {
        errors.zerodb = error;
        this._recordMetric('zerodb', 0, false);
        console.error(`ZeroDB findByIdAndDelete error for ${modelName}:`, error);
      }
    }

    // Handle results based on mode
    return this._handleOperationResults(results, errors, 'findByIdAndDelete');
  }

  /**
   * Get metrics for both databases
   * @returns {Object} Metrics data
   */
  getMetrics() {
    const calculateAverage = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      mongodb: {
        averageResponseTime: calculateAverage(this.metrics.mongodb.responseTime),
        errorCount: this.metrics.mongodb.errorCount,
        successCount: this.metrics.mongodb.successCount,
        errorRate: this.metrics.mongodb.successCount > 0
          ? (this.metrics.mongodb.errorCount / (this.metrics.mongodb.errorCount + this.metrics.mongodb.successCount)) * 100
          : 0
      },
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
      mongodb: { responseTime: [], errorCount: 0, successCount: 0 },
      zerodb: { responseTime: [], errorCount: 0, successCount: 0 }
    };
  }

  /**
   * Validate data consistency between MongoDB and ZeroDB
   * @param {string} modelName - Name of the Mongoose model
   * @param {Object} query - Query to compare
   * @returns {Object} Consistency report
   */
  async validateConsistency(modelName, query = {}) {
    if (this.migrationMode !== 'parallel') {
      throw new Error('Consistency validation only available in parallel mode');
    }

    try {
      const tableName = this._modelToTableName(modelName);

      // Fetch from both databases
      const [mongoResults, zerodbResults] = await Promise.all([
        mongoose.model(modelName).find(query).lean().exec(),
        this._findInZeroDB(tableName, query, {})
      ]);

      // Compare results
      const consistencyReport = {
        modelName,
        mongoCount: mongoResults.length,
        zerodbCount: zerodbResults.length,
        countMatch: mongoResults.length === zerodbResults.length,
        discrepancies: []
      };

      // Detailed comparison
      const mongoMap = new Map(mongoResults.map(doc => [doc._id.toString(), doc]));
      const zerodbMap = new Map(zerodbResults.map(doc => [doc._id, doc]));

      // Check for missing documents
      for (const [id, mongoDoc] of mongoMap) {
        if (!zerodbMap.has(id)) {
          consistencyReport.discrepancies.push({
            type: 'MISSING_IN_ZERODB',
            id,
            mongoDoc
          });
        } else {
          // Compare document data
          const zerodbDoc = zerodbMap.get(id);
          const differences = this._compareDocuments(mongoDoc, zerodbDoc);
          if (differences.length > 0) {
            consistencyReport.discrepancies.push({
              type: 'DATA_MISMATCH',
              id,
              differences
            });
          }
        }
      }

      for (const [id, zerodbDoc] of zerodbMap) {
        if (!mongoMap.has(id)) {
          consistencyReport.discrepancies.push({
            type: 'MISSING_IN_MONGODB',
            id,
            zerodbDoc
          });
        }
      }

      consistencyReport.consistent = consistencyReport.discrepancies.length === 0;

      return consistencyReport;
    } catch (error) {
      console.error('Error validating consistency:', error);
      throw error;
    }
  }

  // Private helper methods

  _checkInitialized() {
    if (!this.initialized) {
      throw new Error('DatabaseAdapter not initialized. Call initialize() first.');
    }
  }

  _recordMetric(database, responseTime, success) {
    if (responseTime > 0) {
      this.metrics[database].responseTime.push(responseTime);
      // Keep only last 1000 measurements to prevent memory issues
      if (this.metrics[database].responseTime.length > 1000) {
        this.metrics[database].responseTime.shift();
      }
    }

    if (success) {
      this.metrics[database].successCount++;
    } else {
      this.metrics[database].errorCount++;
    }
  }

  _modelToTableName(modelName) {
    // Convert Mongoose model name to ZeroDB table name
    // Convention: lowercase with underscores
    return modelName.toLowerCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '');
  }

  _handleOperationResults(results, errors, operation) {
    const hasMongoResult = 'mongodb' in results;
    const hasZerodbResult = 'zerodb' in results;
    const hasMongoError = 'mongodb' in errors;
    const hasZerodbError = 'zerodb' in errors;

    // Parallel mode: Return result if at least one succeeds
    if (this.migrationMode === 'parallel') {
      // Log discrepancies in parallel mode
      if (hasMongoResult && hasZerodbResult) {
        const consistent = this._compareResults(results.mongodb, results.zerodb);
        if (!consistent) {
          console.warn(`Data consistency warning for ${operation}: MongoDB and ZeroDB results differ`);
        }
      }

      // Prefer MongoDB result if available, fallback to ZeroDB
      if (hasMongoResult) {
        return results.mongodb;
      } else if (hasZerodbResult) {
        console.warn(`Fallback to ZeroDB for ${operation} after MongoDB failure`);
        return results.zerodb;
      } else {
        // Both failed
        throw new Error(`${operation} failed on both databases: MongoDB: ${errors.mongodb?.message}, ZeroDB: ${errors.zerodb?.message}`);
      }
    }

    // Single mode: Return the result or throw error
    if (this.migrationMode === 'mongodb-only') {
      if (hasMongoResult) {
        return results.mongodb;
      } else {
        throw errors.mongodb;
      }
    }

    if (this.migrationMode === 'zerodb-only') {
      if (hasZerodbResult) {
        return results.zerodb;
      } else {
        throw errors.zerodb;
      }
    }

    throw new Error(`Invalid migration mode: ${this.migrationMode}`);
  }

  _compareResults(result1, result2) {
    // Simple comparison - can be enhanced based on needs
    try {
      const json1 = JSON.stringify(result1);
      const json2 = JSON.stringify(result2);
      return json1 === json2;
    } catch (error) {
      console.error('Error comparing results:', error);
      return false;
    }
  }

  _compareDocuments(doc1, doc2) {
    const differences = [];
    const allKeys = new Set([...Object.keys(doc1), ...Object.keys(doc2)]);

    for (const key of allKeys) {
      // Skip internal fields
      if (key === '__v' || key === 'updatedAt') continue;

      const val1 = doc1[key];
      const val2 = doc2[key];

      if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        differences.push({
          field: key,
          mongoValue: val1,
          zerodbValue: val2
        });
      }
    }

    return differences;
  }

  // ZeroDB-specific operations (to be implemented based on ZeroDB API)

  async _createInZeroDB(tableName, data) {
    // TODO: Implement ZeroDB table insert logic
    // This will need to map Mongoose document structure to ZeroDB table schema
    // For now, we'll use a placeholder that uses ZeroDB's table API
    throw new Error('ZeroDB create operation not yet implemented');
  }

  async _findInZeroDB(tableName, query, options) {
    // TODO: Implement ZeroDB table query logic
    // This will need to translate Mongoose query to ZeroDB query format
    throw new Error('ZeroDB find operation not yet implemented');
  }

  async _updateInZeroDB(tableName, query, update) {
    // TODO: Implement ZeroDB table update logic
    throw new Error('ZeroDB update operation not yet implemented');
  }

  async _deleteInZeroDB(tableName, query) {
    // TODO: Implement ZeroDB table delete logic
    throw new Error('ZeroDB delete operation not yet implemented');
  }
}

// Export singleton instance
module.exports = new DatabaseAdapter();
