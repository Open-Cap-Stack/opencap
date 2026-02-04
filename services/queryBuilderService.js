/**
 * Query Builder Service
 * Issue #197: Build Custom Report Builder Engine
 *
 * Provides dynamic query building with SQL injection protection.
 * Converts report configurations into safe database queries.
 */

const zeroDbService = require('./zerodbService');
const ReportFilter = require('../models/ReportFilter');
const CustomReportField = require('../models/CustomReportField');

class QueryBuilderService {
  /**
   * Validate field names against whitelist to prevent injection
   * @param {string} field - Field name to validate
   * @param {Array} allowedFields - List of allowed field names
   * @returns {boolean} - Whether field is valid
   */
  validateField(field, allowedFields) {
    if (!field || typeof field !== 'string') {
      return false;
    }

    // Check against whitelist
    if (allowedFields && !allowedFields.includes(field)) {
      return false;
    }

    // Prevent SQL injection patterns
    const dangerousPatterns = [
      /;/,           // Statement terminator
      /--/,          // SQL comment
      /\/\*/,        // Multi-line comment start
      /\*\//,        // Multi-line comment end
      /xp_/i,        // Extended stored procedures
      /sp_/i,        // System stored procedures
      /exec/i,       // Execute command
      /execute/i,    // Execute command
      /union/i,      // Union query
      /select.*from/i, // Select statement
      /insert.*into/i, // Insert statement
      /update.*set/i,  // Update statement
      /delete.*from/i, // Delete statement
      /drop/i,       // Drop command
      /create/i,     // Create command
      /alter/i,      // Alter command
      /script/i,     // Script tag
      /<.*>/,        // HTML/XML tags
    ];

    return !dangerousPatterns.some(pattern => pattern.test(field));
  }

  /**
   * Sanitize input value to prevent injection
   * @param {any} value - Value to sanitize
   * @param {string} dataType - Data type of the value
   * @returns {any} - Sanitized value
   */
  sanitizeValue(value, dataType) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (dataType) {
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${value}`);
        }
        return num;

      case 'boolean':
        if (typeof value === 'boolean') {
          return value;
        }
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date value: ${value}`);
        }
        return date;

      case 'string':
        // Remove potentially dangerous characters
        return String(value)
          .replace(/[<>]/g, '') // Remove HTML tags
          .replace(/[;'"\\]/g, '') // Remove SQL special chars
          .trim();

      case 'array':
        if (!Array.isArray(value)) {
          throw new Error('Value must be an array');
        }
        return value.map(v => this.sanitizeValue(v, 'string'));

      default:
        return String(value).trim();
    }
  }

  /**
   * Build filter query from report filters
   * @param {Array} filters - Array of filter objects
   * @param {Array} allowedFields - Whitelist of allowed fields
   * @returns {Object} - MongoDB query object
   */
  buildFilterQuery(filters, allowedFields) {
    if (!filters || filters.length === 0) {
      return {};
    }

    const andConditions = [];
    const orConditions = [];

    for (const filter of filters) {
      if (!filter.isActive) {
        continue;
      }

      // Validate field name
      if (!this.validateField(filter.field, allowedFields)) {
        throw new Error(`Invalid field name: ${filter.field}`);
      }

      // Sanitize value
      let sanitizedValue = filter.value;
      if (sanitizedValue !== null && sanitizedValue !== undefined) {
        sanitizedValue = this.sanitizeValue(filter.value, filter.dataType);
      }

      // Build condition based on operator
      const condition = this.buildCondition(filter.field, filter.operator, sanitizedValue);

      // Add to appropriate logical group
      if (filter.logicalOperator === 'OR') {
        orConditions.push(condition);
      } else {
        andConditions.push(condition);
      }
    }

    // Combine conditions
    const query = {};

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    if (orConditions.length > 0) {
      if (query.$and) {
        query.$and.push({ $or: orConditions });
      } else {
        query.$or = orConditions;
      }
    }

    return query;
  }

  /**
   * Build single condition for a filter
   * @param {string} field - Field name
   * @param {string} operator - Filter operator
   * @param {any} value - Filter value
   * @returns {Object} - MongoDB condition
   */
  buildCondition(field, operator, value) {
    const condition = {};

    switch (operator) {
      case 'equals':
        condition[field] = value;
        break;
      case 'not_equals':
        condition[field] = { $ne: value };
        break;
      case 'greater_than':
        condition[field] = { $gt: value };
        break;
      case 'greater_than_or_equal':
        condition[field] = { $gte: value };
        break;
      case 'less_than':
        condition[field] = { $lt: value };
        break;
      case 'less_than_or_equal':
        condition[field] = { $lte: value };
        break;
      case 'contains':
        // Escape special regex characters
        const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        condition[field] = { $regex: escapedValue, $options: 'i' };
        break;
      case 'not_contains':
        const escapedNotValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        condition[field] = { $not: { $regex: escapedNotValue, $options: 'i' } };
        break;
      case 'starts_with':
        const escapedStartValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        condition[field] = { $regex: `^${escapedStartValue}`, $options: 'i' };
        break;
      case 'ends_with':
        const escapedEndValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        condition[field] = { $regex: `${escapedEndValue}$`, $options: 'i' };
        break;
      case 'in':
        condition[field] = { $in: value };
        break;
      case 'not_in':
        condition[field] = { $nin: value };
        break;
      case 'is_null':
        condition[field] = null;
        break;
      case 'is_not_null':
        condition[field] = { $ne: null };
        break;
      case 'between':
        condition[field] = { $gte: value[0], $lte: value[1] };
        break;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }

    return condition;
  }

  /**
   * Build projection object for selecting fields
   * @param {Array} fields - Array of field names
   * @param {Array} allowedFields - Whitelist of allowed fields
   * @returns {Object} - MongoDB projection object
   */
  buildProjection(fields, allowedFields) {
    if (!fields || fields.length === 0) {
      return {};
    }

    const projection = {};

    for (const field of fields) {
      // Validate field name
      if (!this.validateField(field, allowedFields)) {
        throw new Error(`Invalid field name: ${field}`);
      }

      projection[field] = 1;
    }

    return projection;
  }

  /**
   * Build sort object
   * @param {Object} sortBy - Sort configuration
   * @param {Array} allowedFields - Whitelist of allowed fields
   * @returns {Object} - MongoDB sort object
   */
  buildSort(sortBy, allowedFields) {
    if (!sortBy || !sortBy.field) {
      return {};
    }

    // Validate field name
    if (!this.validateField(sortBy.field, allowedFields)) {
      throw new Error(`Invalid sort field: ${sortBy.field}`);
    }

    return {
      [sortBy.field]: sortBy.order === 'DESC' ? -1 : 1
    };
  }

  /**
   * Execute query against ZeroDB
   * @param {string} tableName - Table name to query
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Query results
   */
  async executeQuery(tableName, options = {}) {
    try {
      const { filter = {}, projection = {}, sort = {}, skip = 0, limit = 100 } = options;

      // Validate table name
      if (!this.validateField(tableName, null)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      // Execute query through ZeroDB service
      const results = await zeroDbService.queryTable(tableName, {
        filter,
        projection,
        sort,
        skip,
        limit
      });

      return results;
    } catch (error) {
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Get available fields for a data source
   * @param {string} dataSource - Data source name
   * @returns {Promise<Array>} - Available fields
   */
  async getAvailableFields(dataSource) {
    try {
      // Validate data source name
      if (!this.validateField(dataSource, null)) {
        throw new Error(`Invalid data source: ${dataSource}`);
      }

      const fields = await CustomReportField.find({
        dataSource,
        isActive: true
      }).sort({ displayName: 1 });

      return fields;
    } catch (error) {
      throw new Error(`Failed to get available fields: ${error.message}`);
    }
  }

  /**
   * Validate report configuration
   * @param {Object} reportConfig - Report configuration
   * @returns {Object} - Validation result
   */
  async validateReportConfig(reportConfig) {
    const errors = [];

    // Validate data sources
    if (!reportConfig.dataSources || reportConfig.dataSources.length === 0) {
      errors.push('At least one data source is required');
    }

    // Validate fields
    if (!reportConfig.fields || reportConfig.fields.length === 0) {
      errors.push('At least one field is required');
    } else {
      // Get available fields for each data source
      const allowedFields = [];
      for (const dataSource of reportConfig.dataSources) {
        const fields = await this.getAvailableFields(dataSource);
        allowedFields.push(...fields.map(f => f.fieldName));
      }

      // Validate each field
      for (const field of reportConfig.fields) {
        if (!this.validateField(field, allowedFields)) {
          errors.push(`Invalid field: ${field}`);
        }
      }
    }

    // Validate filters
    if (reportConfig.filters && Array.isArray(reportConfig.filters)) {
      for (const filter of reportConfig.filters) {
        try {
          this.sanitizeValue(filter.value, filter.dataType);
        } catch (error) {
          errors.push(`Invalid filter value for ${filter.field}: ${error.message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new QueryBuilderService();
