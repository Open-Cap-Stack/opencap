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
    await this._ensureInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      let result;
      try {
        result = await zerodbService.insertRow(tableName, data);
      } catch (insertErr) {
        // If table doesn't exist, create it and retry
        if (insertErr.message && (insertErr.message.includes('404') || insertErr.message.includes('not found') || insertErr.message.includes('500'))) {
          try {
            await zerodbService.createTable(tableName, {});
          } catch { /* table may already exist */ }
          result = await zerodbService.insertRow(tableName, data);
        } else {
          throw insertErr;
        }
      }
      this._recordMetric(Date.now() - startTime, true);

      // Unwrap: { data: [{ row_id, row_data }] } → flat object
      const rows = result?.data || result?.rows || [];
      if (Array.isArray(rows) && rows.length > 0) {
        const item = rows[0];
        if (item.row_data) {
          return { ...item.row_data, row_id: item.row_id };
        }
        return item;
      }
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
    await this._ensureInitialized();

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
    await this._ensureInitialized();

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
    await this._ensureInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);
      // Query by _id field
      let results = await this._findInZeroDB(tableName, { _id: id }, { limit: 1, ...options });
      if (!results || results.length === 0) {
        results = await this._findInZeroDB(tableName, { row_id: id }, { limit: 1, ...options });
      }
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
    await this._ensureInitialized();

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
    await this._ensureInitialized();

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
    await this._ensureInitialized();

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
    await this._ensureInitialized();

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
    await this._ensureInitialized();

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
   * Perform aggregation operations
   * @param {string} modelName - Name of the model
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Array} Aggregation result
   */
  async aggregate(modelName, pipeline) {
    await this._ensureInitialized();

    try {
      const startTime = Date.now();
      const tableName = this._modelToTableName(modelName);

      // Since ZeroDB may not support MongoDB-style aggregation,
      // we implement basic aggregation manually
      let results = [];

      // Process pipeline stages
      for (const stage of pipeline) {
        if (stage.$match) {
          // $match stage - filter documents
          results = await this._findInZeroDB(tableName, stage.$match, {});
        } else if (stage.$group) {
          // $group stage - group and aggregate
          const groupKey = stage.$group._id;
          const groups = {};

          for (const doc of results) {
            // Get the group key value (handle $fieldName syntax)
            const keyField = groupKey?.startsWith('$') ? groupKey.slice(1) : groupKey;
            const keyValue = keyField ? doc[keyField] : null;

            if (!groups[keyValue]) {
              groups[keyValue] = { _id: keyValue, docs: [] };
            }
            groups[keyValue].docs.push(doc);
          }

          // Apply aggregation operators
          results = Object.values(groups).map(group => {
            const result = { _id: group._id };

            for (const [outputField, operator] of Object.entries(stage.$group)) {
              if (outputField === '_id') continue;

              if (operator.$sum) {
                const sumField = operator.$sum.startsWith('$') ? operator.$sum.slice(1) : operator.$sum;
                result[outputField] = group.docs.reduce((sum, doc) => sum + (doc[sumField] || 0), 0);
              } else if (operator.$avg) {
                const avgField = operator.$avg.startsWith('$') ? operator.$avg.slice(1) : operator.$avg;
                const values = group.docs.map(doc => doc[avgField] || 0);
                result[outputField] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
              } else if (operator.$count) {
                result[outputField] = group.docs.length;
              } else if (operator.$max) {
                const maxField = operator.$max.startsWith('$') ? operator.$max.slice(1) : operator.$max;
                result[outputField] = Math.max(...group.docs.map(doc => doc[maxField] || 0));
              } else if (operator.$min) {
                const minField = operator.$min.startsWith('$') ? operator.$min.slice(1) : operator.$min;
                result[outputField] = Math.min(...group.docs.map(doc => doc[minField] || 0));
              }
            }

            return result;
          });
        }
      }

      this._recordMetric(Date.now() - startTime, true);
      return results;
    } catch (error) {
      this._recordMetric(0, false);
      console.error(`ZeroDB aggregate error for ${modelName}:`, error);
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

  async _ensureInitialized() {
    if (!this.initialized) {
      const token = process.env.AINATIVE_API_TOKEN;
      if (!token) {
        throw new Error('DatabaseAdapter not initialized and AINATIVE_API_TOKEN not set.');
      }
      await this.initialize(token);
    }
  }

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
    // Handle special cases like "SPV" -> "spv" (not "s_p_v")
    // e.g., "ShareClass" -> "share_classes", "SPVAsset" -> "spv_assets"

    // Special model to table mappings
    const tableNameMap = {
      'SPV': 'spvs',
      'SPVAsset': 'spv_assets',
      'User': 'users',
      'Document': 'documents',
      'Company': 'companies',
      'Stakeholder': 'stakeholders',
      'Transaction': 'transactions',
      'Security': 'securities',
      'Valuation': 'valuations',
      'AuditLog': 'audit_logs',
      'ComplianceEvent': 'compliance_events',
      'DocumentFolder': 'document_folders',
      'DocumentAccessLog': 'document_access_logs',
      'UserSettings': 'user_settings',
      'EventAuditLog': 'event_audit_log',
      'Task': 'tasks',
      'Communication': 'communications',
      'Notification': 'notifications',
      'Activity': 'activities',
      'EquityPlan': 'equity_plans',
      'EquityGrant': 'equity_grants',
      'EquityPlanReport': 'equity_plan_reports',
      'ShareClass': 'share_classes',
      'FinancialReport': 'financial_reports',
      'IntegrationMarketplaceItem': 'integration_marketplace_items',
      'InstalledIntegration': 'installed_integrations',
      'ComplianceCheck': 'compliance_checks',
      'TenderSubmission': 'tender_submissions',
      'TenderOffer': 'tender_offers',
      'Termination': 'terminations',
      'TriggerHistory': 'trigger_history',
      'WebhookDelivery': 'webhook_deliveries',
      'WebhookEvent': 'webhook_events',
      'DataRoom': 'data_rooms',
      'CustomReport': 'custom_reports',
      'BoardApproval': 'board_approvals',
      'TransferRequest': 'transfer_requests',
      'ExerciseRequest': 'exercise_requests',
      'SignatureRequest': 'signature_requests',
      'DocumentEmbedding': 'document_embeddings',
      'DocumentVersion': 'document_versions',
      'DocumentFolder': 'document_folders',
      'DocumentAccessLog': 'document_access_logs',
      'TaxDocument': 'tax_documents',
      'TaxCalculation': 'tax_calculations',
      'TaxWithholding': 'tax_withholdings',
      'ValuationDocument': 'valuation_documents',
      'WaterfallAnalysis': 'waterfall_analyses',
      'InvestorPreference': 'investor_preferences',
      'InvestorCommunicationTemplate': 'investor_communication_templates',
      'SecurityIssuance': 'security_issuances',
      'ReportExecution': 'report_executions',
      'ScheduledTrigger': 'scheduled_triggers',
      'PreferredTerms': 'preferred_terms',
      'SubscriptionPlan': 'subscription_plans',
      'EmailTracking': 'email_tracking',
      'Form3921': 'form3921',
      'InviteManagement': 'invite_management',
      'SPVAssetModel': 'spv_asset_models',
      'FundraisingRound': 'fundraising_rounds',
      'EmailTemplate': 'email_templates'
    };

    // Check for direct mapping first
    if (tableNameMap[modelName]) {
      return tableNameMap[modelName];
    }

    // Fall back to conversion algorithm that handles consecutive uppercase
    // "SPVAsset" -> handled above, "ShareClass" -> "share_class"
    return modelName
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')  // Handle consecutive uppercase followed by lowercase
      .replace(/([a-z])([A-Z])/g, '$1_$2')        // Handle lowercase followed by uppercase
      .toLowerCase();
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
    try {
      const result = await zerodbService.queryTable(tableName, {
        filter: query,
        limit,
        sort,
        skip,
        projection
      });

      // Unwrap ZeroDB response: { data: [{ row_id, row_data }] } → flat array
      const rawData = result?.data || result?.rows || result || [];
      if (Array.isArray(rawData)) {
        return rawData.map(item => {
          if (item.row_data) {
            return { ...item.row_data, row_id: item.row_id };
          }
          return item;
        });
      }
      return rawData;
    } catch (error) {
      // Handle table not found gracefully - return empty array
      if (error.response?.data?.detail?.includes('not found') ||
          error.message?.includes('not found')) {
        console.warn(`Table '${tableName}' not found, returning empty results`);
        return [];
      }
      throw error;
    }
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
    try {
      const results = await zerodbService.queryTable(tableName, {
        filter: query,
        countOnly: true
      });
      return typeof results === 'number' ? results : (results?.count || results?.length || 0);
    } catch (error) {
      // Handle table not found gracefully - return 0 count
      if (error.response?.data?.detail?.includes('not found') ||
          error.message?.includes('not found')) {
        console.warn(`Table '${tableName}' not found, returning 0 count`);
        return 0;
      }
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new DatabaseAdapter();
