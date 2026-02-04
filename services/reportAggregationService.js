/**
 * Report Aggregation Service
 * Issue #197: Build Custom Report Builder Engine
 *
 * Provides aggregation and grouping functionality for custom reports.
 * Supports SUM, AVG, COUNT, MIN, MAX, and GROUP BY operations.
 */

const zeroDbService = require('./zerodbService');
const queryBuilderService = require('./queryBuilderService');

class ReportAggregationService {
  /**
   * Validate aggregation function
   * @param {string} func - Aggregation function name
   * @returns {boolean} - Whether function is valid
   */
  validateAggregationFunction(func) {
    const validFunctions = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT'];
    return validFunctions.includes(func);
  }

  /**
   * Build aggregation pipeline for MongoDB
   * @param {Object} reportConfig - Report configuration
   * @param {Object} filterQuery - Pre-built filter query
   * @returns {Array} - MongoDB aggregation pipeline
   */
  buildAggregationPipeline(reportConfig, filterQuery = {}) {
    const pipeline = [];

    // Stage 1: Match (filter)
    if (Object.keys(filterQuery).length > 0) {
      pipeline.push({ $match: filterQuery });
    }

    // Stage 2: Group (if groupBy specified)
    if (reportConfig.groupBy && reportConfig.groupBy.length > 0) {
      const groupStage = this.buildGroupStage(reportConfig);
      pipeline.push(groupStage);
    }

    // Stage 3: Aggregations (if no groupBy, aggregate all)
    if (reportConfig.aggregations && reportConfig.aggregations.length > 0) {
      if (!reportConfig.groupBy || reportConfig.groupBy.length === 0) {
        const aggStage = this.buildAggregationStage(reportConfig.aggregations);
        pipeline.push(aggStage);
      }
    }

    // Stage 4: Project (select fields)
    if (reportConfig.fields && reportConfig.fields.length > 0) {
      const projectStage = this.buildProjectStage(reportConfig);
      pipeline.push(projectStage);
    }

    // Stage 5: Sort
    if (reportConfig.sortBy && reportConfig.sortBy.field) {
      const sortStage = {
        $sort: {
          [reportConfig.sortBy.field]: reportConfig.sortBy.order === 'DESC' ? -1 : 1
        }
      };
      pipeline.push(sortStage);
    }

    // Stage 6: Limit
    if (reportConfig.limit) {
      pipeline.push({ $limit: reportConfig.limit });
    }

    return pipeline;
  }

  /**
   * Build group stage for aggregation pipeline
   * @param {Object} reportConfig - Report configuration
   * @returns {Object} - MongoDB $group stage
   */
  buildGroupStage(reportConfig) {
    const groupStage = {
      $group: {
        _id: {}
      }
    };

    // Build _id with groupBy fields
    for (const field of reportConfig.groupBy) {
      if (!queryBuilderService.validateField(field, reportConfig.fields)) {
        throw new Error(`Invalid groupBy field: ${field}`);
      }
      groupStage.$group._id[field] = `$${field}`;
    }

    // Add aggregations to group stage
    if (reportConfig.aggregations && reportConfig.aggregations.length > 0) {
      for (const agg of reportConfig.aggregations) {
        if (!this.validateAggregationFunction(agg.function)) {
          throw new Error(`Invalid aggregation function: ${agg.function}`);
        }

        const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
        groupStage.$group[alias] = this.buildAggregationExpression(agg);
      }
    }

    return groupStage;
  }

  /**
   * Build aggregation stage (for non-grouped aggregations)
   * @param {Array} aggregations - Array of aggregation configs
   * @returns {Object} - MongoDB $group stage
   */
  buildAggregationStage(aggregations) {
    const groupStage = {
      $group: {
        _id: null
      }
    };

    for (const agg of aggregations) {
      if (!this.validateAggregationFunction(agg.function)) {
        throw new Error(`Invalid aggregation function: ${agg.function}`);
      }

      const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
      groupStage.$group[alias] = this.buildAggregationExpression(agg);
    }

    return groupStage;
  }

  /**
   * Build aggregation expression for a single aggregation
   * @param {Object} agg - Aggregation configuration
   * @returns {Object} - MongoDB aggregation expression
   */
  buildAggregationExpression(agg) {
    switch (agg.function) {
      case 'SUM':
        return { $sum: `$${agg.field}` };
      case 'AVG':
        return { $avg: `$${agg.field}` };
      case 'COUNT':
        return { $sum: 1 };
      case 'MIN':
        return { $min: `$${agg.field}` };
      case 'MAX':
        return { $max: `$${agg.field}` };
      case 'DISTINCT_COUNT':
        return { $addToSet: `$${agg.field}` };
      default:
        throw new Error(`Unsupported aggregation function: ${agg.function}`);
    }
  }

  /**
   * Build project stage for selecting fields
   * @param {Object} reportConfig - Report configuration
   * @returns {Object} - MongoDB $project stage
   */
  buildProjectStage(reportConfig) {
    const projectStage = {
      $project: {
        _id: 0
      }
    };

    // Include selected fields
    for (const field of reportConfig.fields) {
      if (!queryBuilderService.validateField(field, reportConfig.fields)) {
        throw new Error(`Invalid field: ${field}`);
      }
      projectStage.$project[field] = 1;
    }

    // Include aggregation aliases
    if (reportConfig.aggregations && reportConfig.aggregations.length > 0) {
      for (const agg of reportConfig.aggregations) {
        const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
        projectStage.$project[alias] = 1;
      }
    }

    // Include groupBy fields
    if (reportConfig.groupBy && reportConfig.groupBy.length > 0) {
      for (const field of reportConfig.groupBy) {
        projectStage.$project[field] = `$_id.${field}`;
      }
    }

    return projectStage;
  }

  /**
   * Execute aggregation query
   * @param {string} tableName - Table name
   * @param {Array} pipeline - Aggregation pipeline
   * @returns {Promise<Array>} - Aggregation results
   */
  async executeAggregation(tableName, pipeline) {
    try {
      // Validate table name
      if (!queryBuilderService.validateField(tableName, null)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      // Note: ZeroDB might need specific aggregation support
      // For now, we'll use queryTable and process results in memory
      // In production, this should use ZeroDB's native aggregation capabilities

      const results = await zeroDbService.queryTable(tableName, {
        filter: {},
        limit: 10000 // Increase limit for aggregation
      });

      return results;
    } catch (error) {
      throw new Error(`Aggregation execution failed: ${error.message}`);
    }
  }

  /**
   * Perform in-memory aggregation on results
   * @param {Array} data - Data to aggregate
   * @param {Object} reportConfig - Report configuration
   * @returns {Array} - Aggregated results
   */
  performInMemoryAggregation(data, reportConfig) {
    if (!data || data.length === 0) {
      return [];
    }

    // If no groupBy, perform global aggregation
    if (!reportConfig.groupBy || reportConfig.groupBy.length === 0) {
      return this.performGlobalAggregation(data, reportConfig);
    }

    // Perform grouped aggregation
    return this.performGroupedAggregation(data, reportConfig);
  }

  /**
   * Perform global aggregation (no grouping)
   * @param {Array} data - Data to aggregate
   * @param {Object} reportConfig - Report configuration
   * @returns {Array} - Aggregated result (single object)
   */
  performGlobalAggregation(data, reportConfig) {
    const result = {};

    if (reportConfig.aggregations && reportConfig.aggregations.length > 0) {
      for (const agg of reportConfig.aggregations) {
        const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
        result[alias] = this.calculateAggregation(data, agg);
      }
    }

    return [result];
  }

  /**
   * Perform grouped aggregation
   * @param {Array} data - Data to aggregate
   * @param {Object} reportConfig - Report configuration
   * @returns {Array} - Aggregated results
   */
  performGroupedAggregation(data, reportConfig) {
    // Group data by groupBy fields
    const groups = new Map();

    for (const row of data) {
      const groupKey = reportConfig.groupBy
        .map(field => row[field])
        .join('|');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(row);
    }

    // Perform aggregation for each group
    const results = [];

    for (const [groupKey, groupData] of groups.entries()) {
      const result = {};

      // Add groupBy fields
      const groupValues = groupKey.split('|');
      reportConfig.groupBy.forEach((field, index) => {
        result[field] = groupValues[index];
      });

      // Add aggregations
      if (reportConfig.aggregations && reportConfig.aggregations.length > 0) {
        for (const agg of reportConfig.aggregations) {
          const alias = agg.alias || `${agg.function.toLowerCase()}_${agg.field}`;
          result[alias] = this.calculateAggregation(groupData, agg);
        }
      }

      results.push(result);
    }

    // Sort results
    if (reportConfig.sortBy && reportConfig.sortBy.field) {
      const sortField = reportConfig.sortBy.field;
      const sortOrder = reportConfig.sortBy.order === 'DESC' ? -1 : 1;

      results.sort((a, b) => {
        if (a[sortField] < b[sortField]) return -1 * sortOrder;
        if (a[sortField] > b[sortField]) return 1 * sortOrder;
        return 0;
      });
    }

    // Apply limit
    if (reportConfig.limit) {
      return results.slice(0, reportConfig.limit);
    }

    return results;
  }

  /**
   * Calculate aggregation value for a dataset
   * @param {Array} data - Data to aggregate
   * @param {Object} agg - Aggregation configuration
   * @returns {number|any} - Aggregation result
   */
  calculateAggregation(data, agg) {
    const values = data.map(row => row[agg.field]).filter(v => v !== null && v !== undefined);

    switch (agg.function) {
      case 'SUM':
        return values.reduce((sum, val) => sum + parseFloat(val), 0);

      case 'AVG':
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + parseFloat(val), 0) / values.length;

      case 'COUNT':
        return data.length;

      case 'MIN':
        if (values.length === 0) return null;
        return Math.min(...values.map(v => parseFloat(v)));

      case 'MAX':
        if (values.length === 0) return null;
        return Math.max(...values.map(v => parseFloat(v)));

      case 'DISTINCT_COUNT':
        return new Set(values).size;

      default:
        throw new Error(`Unsupported aggregation function: ${agg.function}`);
    }
  }

  /**
   * Execute complete report with aggregations
   * @param {Object} report - Report configuration
   * @param {Object} filterQuery - Filter query
   * @returns {Promise<Array>} - Report results
   */
  async executeReport(report, filterQuery = {}) {
    try {
      // Get data from primary data source
      const tableName = report.dataSources[0];

      // Fetch raw data
      const rawData = await zeroDbService.queryTable(tableName, {
        filter: filterQuery,
        limit: 10000
      });

      // Apply aggregations in memory
      const results = this.performInMemoryAggregation(rawData, report);

      return results;
    } catch (error) {
      throw new Error(`Report execution failed: ${error.message}`);
    }
  }
}

module.exports = new ReportAggregationService();
