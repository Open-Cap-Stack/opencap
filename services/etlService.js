/**
 * ETL Service
 * Issue #50: Implement Data Processing Pipeline
 *
 * Provides Extract, Transform, Load capabilities for data processing pipelines
 * Supports multiple data sources (ZeroDB, files, APIs) and destinations
 */

const databaseAdapter = require('./databaseAdapter');
const fs = require('fs').promises;
const axios = require('axios');

class ETLService {
  constructor() {
    this.runningPipelines = new Map();
    this.pipelineHistory = new Map();
  }

  /**
   * Extract data from various sources
   * @param {Object} config - Extraction configuration
   * @returns {Promise<Array>} Extracted data
   */
  async extractData(config) {
    const { source, collection, query = {}, options = {}, filePath, fileType, url, method = 'GET', headers = {} } = config;

    try {
      switch (source) {
        case 'zerodb':
          return await this._extractFromZeroDB(collection, query, options);

        case 'file':
          return await this._extractFromFile(filePath, fileType);

        case 'api':
          return await this._extractFromAPI(url, method, headers);

        default:
          throw new Error(`Unsupported extraction source: ${source}`);
      }
    } catch (error) {
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract data from ZeroDB
   */
  async _extractFromZeroDB(collection, query, options) {
    return await databaseAdapter.find(collection, query, options);
  }

  /**
   * Extract data from file
   */
  async _extractFromFile(filePath, fileType) {
    const content = await fs.readFile(filePath, 'utf-8');

    switch (fileType) {
      case 'json':
        return JSON.parse(content);

      case 'csv':
        return this._parseCSV(content);

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Parse CSV content to array of objects
   */
  _parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }

    return data;
  }

  /**
   * Extract data from API
   */
  async _extractFromAPI(url, method, headers) {
    const response = await axios.get(url, { headers });
    return response.data;
  }

  /**
   * Transform data with various operations
   * @param {Array} data - Data to transform
   * @param {Object} config - Transformation configuration
   * @returns {Promise<Array|Object>} Transformed data
   */
  async transformData(data, config) {
    const { operations = [] } = config;

    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    let result = [...data];
    let aggregations = {};
    let groups = {};

    for (const operation of operations) {
      switch (operation.type) {
        case 'clean':
          result = this._applyCleanOperation(result, operation);
          break;

        case 'normalize':
          result = this._applyNormalizeOperation(result, operation);
          break;

        case 'aggregate':
          const aggResult = this._applyAggregateOperation(result, operation);
          if (aggResult.aggregations) {
            aggregations = { ...aggregations, ...aggResult.aggregations };
          }
          if (aggResult.groups) {
            groups = { ...groups, ...aggResult.groups };
          }
          break;

        case 'map':
          result = this._applyMapOperation(result, operation);
          break;

        case 'filter':
          result = this._applyFilterOperation(result, operation);
          break;

        default:
          throw new Error(`Unknown transformation type: ${operation.type}`);
      }
    }

    // Return data with aggregations if any were computed
    if (Object.keys(aggregations).length > 0 || Object.keys(groups).length > 0) {
      return {
        data: result,
        aggregations,
        groups
      };
    }

    return result;
  }

  /**
   * Apply clean operations
   */
  _applyCleanOperation(data, operation) {
    const { action, fields = [], defaultValue, key } = operation;

    switch (action) {
      case 'removeNulls':
        return data.filter(row =>
          fields.every(field => row[field] !== null && row[field] !== undefined)
        );

      case 'fillNulls':
        return data.map(row => {
          const newRow = { ...row };
          fields.forEach(field => {
            if (newRow[field] === null || newRow[field] === undefined) {
              newRow[field] = defaultValue;
            }
          });
          return newRow;
        });

      case 'trim':
        return data.map(row => {
          const newRow = { ...row };
          fields.forEach(field => {
            if (typeof newRow[field] === 'string') {
              newRow[field] = newRow[field].trim();
            }
          });
          return newRow;
        });

      case 'removeDuplicates':
        const seen = new Set();
        return data.filter(row => {
          const keyValue = row[key];
          if (seen.has(keyValue)) return false;
          seen.add(keyValue);
          return true;
        });

      default:
        return data;
    }
  }

  /**
   * Apply normalize operations
   */
  _applyNormalizeOperation(data, operation) {
    const { action, fields = [], format } = operation;

    switch (action) {
      case 'minMax':
        return this._normalizeMinMax(data, fields);

      case 'fieldNames':
        return this._normalizeFieldNames(data, format);

      case 'dateFormat':
        return this._normalizeDateFormat(data, fields, format);

      default:
        return data;
    }
  }

  /**
   * Min-max normalization to [0, 1]
   */
  _normalizeMinMax(data, fields) {
    if (data.length === 0) return data;

    const stats = {};
    fields.forEach(field => {
      const values = data.map(row => row[field]).filter(v => typeof v === 'number');
      stats[field] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    return data.map(row => {
      const newRow = { ...row };
      fields.forEach(field => {
        const { min, max } = stats[field];
        if (typeof row[field] === 'number' && max !== min) {
          newRow[`${field}_normalized`] = (row[field] - min) / (max - min);
        }
      });
      return newRow;
    });
  }

  /**
   * Normalize field names to specified format
   */
  _normalizeFieldNames(data, format) {
    return data.map(row => {
      const newRow = {};
      Object.keys(row).forEach(key => {
        let newKey;
        switch (format) {
          case 'snake_case':
            newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            break;
          case 'camelCase':
            newKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            break;
          default:
            newKey = key;
        }
        newRow[newKey] = row[key];
      });
      return newRow;
    });
  }

  /**
   * Normalize date format
   */
  _normalizeDateFormat(data, fields, format) {
    return data.map(row => {
      const newRow = { ...row };
      fields.forEach(field => {
        if (row[field]) {
          const date = new Date(row[field]);
          if (!isNaN(date.getTime())) {
            // Simple YYYY-MM-DD format
            newRow[field] = date.toISOString().split('T')[0];
          }
        }
      });
      return newRow;
    });
  }

  /**
   * Apply aggregate operations
   */
  _applyAggregateOperation(data, operation) {
    const { action, field, groupField, aggregateField, aggregateAction } = operation;
    const aggregations = {};
    const groups = {};

    switch (action) {
      case 'sum':
        const sum = data.reduce((acc, row) => acc + (row[field] || 0), 0);
        aggregations[`${field}_sum`] = sum;
        break;

      case 'average':
        const avg = data.reduce((acc, row) => acc + (row[field] || 0), 0) / data.length;
        aggregations[`${field}_average`] = avg;
        break;

      case 'count':
        aggregations.count = data.length;
        break;

      case 'groupBy':
        const grouped = {};
        data.forEach(row => {
          const key = row[groupField];
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(row);
        });

        Object.keys(grouped).forEach(key => {
          const groupData = grouped[key];
          switch (aggregateAction) {
            case 'sum':
              groups[key] = groupData.reduce((acc, row) => acc + (row[aggregateField] || 0), 0);
              break;
            case 'average':
              groups[key] = groupData.reduce((acc, row) => acc + (row[aggregateField] || 0), 0) / groupData.length;
              break;
            case 'count':
              groups[key] = groupData.length;
              break;
          }
        });
        break;
    }

    return { aggregations, groups };
  }

  /**
   * Apply map operations
   */
  _applyMapOperation(data, operation) {
    const { action, field, computation, from, to, fields } = operation;

    switch (action) {
      case 'addField':
        return data.map(row => {
          const newRow = { ...row };
          // Simple computation evaluation
          const computeValue = this._evaluateComputation(computation, row);
          newRow[field] = computeValue;
          return newRow;
        });

      case 'renameField':
        return data.map(row => {
          const newRow = { ...row };
          newRow[to] = row[from];
          delete newRow[from];
          return newRow;
        });

      case 'selectFields':
        return data.map(row => {
          const newRow = {};
          fields.forEach(f => {
            if (row.hasOwnProperty(f)) {
              newRow[f] = row[f];
            }
          });
          return newRow;
        });

      default:
        return data;
    }
  }

  /**
   * Evaluate simple computation expressions
   */
  _evaluateComputation(computation, row) {
    // Handle simple arithmetic: "fieldA - fieldB" or "fieldA + fieldB"
    const match = computation.match(/(\w+)\s*([\+\-\*\/])\s*(\w+)/);
    if (match) {
      const [, fieldA, operator, fieldB] = match;
      const valueA = parseFloat(row[fieldA]) || 0;
      const valueB = parseFloat(row[fieldB]) || 0;

      switch (operator) {
        case '+': return valueA + valueB;
        case '-': return valueA - valueB;
        case '*': return valueA * valueB;
        case '/': return valueB !== 0 ? valueA / valueB : 0;
      }
    }
    return null;
  }

  /**
   * Apply filter operations
   */
  _applyFilterOperation(data, operation) {
    const { condition, conditions } = operation;

    if (condition) {
      // Simple condition string: "field > value"
      return data.filter(row => this._evaluateCondition(condition, row));
    }

    if (conditions) {
      return data.filter(row =>
        conditions.every(cond => this._evaluateFieldCondition(cond, row))
      );
    }

    return data;
  }

  /**
   * Evaluate simple condition string
   */
  _evaluateCondition(condition, row) {
    const match = condition.match(/(\w+)\s*(>|<|>=|<=|===|!==|==|!=)\s*(\d+)/);
    if (match) {
      const [, field, operator, value] = match;
      const fieldValue = parseFloat(row[field]) || 0;
      const compareValue = parseFloat(value);

      switch (operator) {
        case '>': return fieldValue > compareValue;
        case '<': return fieldValue < compareValue;
        case '>=': return fieldValue >= compareValue;
        case '<=': return fieldValue <= compareValue;
        case '===':
        case '==': return fieldValue === compareValue;
        case '!==':
        case '!=': return fieldValue !== compareValue;
      }
    }
    return true;
  }

  /**
   * Evaluate field condition object
   */
  _evaluateFieldCondition(cond, row) {
    const { field, operator, value } = cond;
    const fieldValue = row[field];

    switch (operator) {
      case '>': return fieldValue > value;
      case '<': return fieldValue < value;
      case '>=': return fieldValue >= value;
      case '<=': return fieldValue <= value;
      case '===':
      case '==': return fieldValue === value;
      case '!==':
      case '!=': return fieldValue !== value;
      default: return true;
    }
  }

  /**
   * Load data to destination
   * @param {Array} data - Data to load
   * @param {Object} config - Load configuration
   * @returns {Promise<Object>} Load result
   */
  async loadData(data, config) {
    const { destination, collection, mode = 'insert', upsertKey, batchSize = 100, filePath, fileType } = config;

    try {
      switch (destination) {
        case 'zerodb':
          return await this._loadToZeroDB(data, collection, mode, upsertKey, batchSize);

        case 'file':
          return await this._loadToFile(data, filePath, fileType);

        default:
          throw new Error(`Unsupported load destination: ${destination}`);
      }
    } catch (error) {
      throw new Error(`Load failed: ${error.message}`);
    }
  }

  /**
   * Load data to ZeroDB
   */
  async _loadToZeroDB(data, collection, mode, upsertKey, batchSize) {
    let recordsLoaded = 0;
    let batches = 0;

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      batches++;

      for (const record of batch) {
        if (mode === 'upsert' && upsertKey) {
          await databaseAdapter.findByIdAndUpdate(
            collection,
            record[upsertKey],
            { $set: record },
            { upsert: true }
          );
        } else {
          await databaseAdapter.create(collection, record);
        }
        recordsLoaded++;
      }
    }

    return {
      success: true,
      recordsLoaded,
      batches: Math.ceil(data.length / batchSize)
    };
  }

  /**
   * Load data to file
   */
  async _loadToFile(data, filePath, fileType) {
    let content;

    switch (fileType) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        break;

      case 'csv':
        content = this._toCSV(data);
        break;

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    await fs.writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      recordsLoaded: data.length,
      filePath
    };
  }

  /**
   * Convert data array to CSV string
   */
  _toCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(h => {
        const value = row[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return String(value);
      });
      lines.push(values.join(','));
    });

    return lines.join('\n');
  }

  /**
   * Run complete ETL pipeline
   * @param {Object} pipelineConfig - Pipeline configuration
   * @returns {Promise<Object>} Pipeline execution result
   */
  async runETLPipeline(pipelineConfig) {
    const { name, extract, transform, load, dryRun = false } = pipelineConfig;
    const startTime = Date.now();
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = {
      pipelineId,
      pipelineName: name,
      success: false,
      status: 'running',
      stages: {
        extract: { status: 'pending' },
        transform: { status: 'pending' },
        load: { status: 'pending' }
      },
      dryRun
    };

    this.runningPipelines.set(pipelineId, result);

    try {
      // Extract stage
      result.stages.extract.status = 'running';
      let extractedData;
      try {
        extractedData = await this.extractData(extract);
        result.extractedRecords = extractedData.length;
        result.stages.extract.status = 'completed';
        result.stages.extract.recordCount = extractedData.length;
      } catch (error) {
        result.stages.extract.status = 'failed';
        result.stages.extract.error = error.message;
        result.status = 'failed';
        result.error = `Extraction failed: ${error.message}`;
        return result;
      }

      // Transform stage
      result.stages.transform.status = 'running';
      let transformedData;
      try {
        const transformResult = await this.transformData(extractedData, transform);

        // Handle validation if configured
        if (transform.validation) {
          const validationResults = this._validateData(transformResult.data || transformResult, transform.validation);
          result.validationResults = validationResults;
          transformedData = validationResults.validData;
        } else {
          transformedData = Array.isArray(transformResult) ? transformResult : transformResult.data || transformResult;
        }

        result.transformedRecords = Array.isArray(transformedData) ? transformedData.length : 0;
        result.stages.transform.status = 'completed';
        result.stages.transform.recordCount = result.transformedRecords;
      } catch (error) {
        result.stages.transform.status = 'failed';
        result.stages.transform.error = error.message;
        result.status = 'failed';
        result.error = `Transform failed: ${error.message}`;
        return result;
      }

      // Load stage
      if (!dryRun) {
        result.stages.load.status = 'running';
        try {
          const loadResult = await this.loadData(transformedData, load);
          result.loadedRecords = loadResult.recordsLoaded;
          result.stages.load.status = 'completed';
          result.stages.load.recordCount = loadResult.recordsLoaded;
        } catch (error) {
          result.stages.load.status = 'failed';
          result.stages.load.error = error.message;
          result.status = 'failed';
          result.error = `Load failed: ${error.message}`;
          return result;
        }
      } else {
        result.stages.load.status = 'skipped';
        result.loadedRecords = 0;
      }

      result.success = true;
      result.status = 'completed';
      result.duration = Date.now() - startTime;

    } finally {
      this.runningPipelines.delete(pipelineId);
      this.pipelineHistory.set(pipelineId, result);
    }

    return result;
  }

  /**
   * Validate data against rules
   */
  _validateData(data, validation) {
    const { rules = [] } = validation;
    const validData = [];
    const invalidData = [];

    data.forEach(row => {
      let isValid = true;

      for (const rule of rules) {
        if (rule.required && (row[rule.field] === null || row[rule.field] === undefined || row[rule.field] === '')) {
          isValid = false;
          break;
        }

        if (rule.minLength && typeof row[rule.field] === 'string' && row[rule.field].length < rule.minLength) {
          isValid = false;
          break;
        }

        if (rule.type === 'number' && typeof row[rule.field] !== 'number') {
          isValid = false;
          break;
        }

        if (rule.min !== undefined && row[rule.field] < rule.min) {
          isValid = false;
          break;
        }
      }

      if (isValid) {
        validData.push(row);
      } else {
        invalidData.push(row);
      }
    });

    return {
      passed: validData.length,
      failed: invalidData.length,
      validData
    };
  }

  /**
   * Get pipeline status by ID
   */
  getPipelineStatus(pipelineId) {
    const running = this.runningPipelines.get(pipelineId);
    if (running) return running;

    const completed = this.pipelineHistory.get(pipelineId);
    if (completed) return completed;

    return {
      pipelineId,
      status: 'not_found'
    };
  }

  /**
   * List running pipelines
   */
  listRunningPipelines() {
    return Array.from(this.runningPipelines.values());
  }

  /**
   * Cancel running pipeline
   */
  async cancelPipeline(pipelineId) {
    const pipeline = this.runningPipelines.get(pipelineId);
    if (!pipeline) {
      return { cancelled: false, reason: 'Pipeline not found or already completed' };
    }

    pipeline.status = 'cancelled';
    this.runningPipelines.delete(pipelineId);
    this.pipelineHistory.set(pipelineId, pipeline);

    return { cancelled: true, pipelineId };
  }

  /**
   * Validate extraction configuration
   */
  validateExtractionConfig(config) {
    if (!config || !config.source) {
      throw new Error('Extraction config must specify a source');
    }
  }

  /**
   * Validate transformation configuration
   */
  validateTransformConfig(config) {
    if (!config || !Array.isArray(config.operations)) {
      throw new Error('Transform config must specify operations array');
    }
  }

  /**
   * Validate load configuration
   */
  validateLoadConfig(config) {
    if (!config || !config.destination) {
      throw new Error('Load config must specify a destination');
    }
  }
}

module.exports = new ETLService();
