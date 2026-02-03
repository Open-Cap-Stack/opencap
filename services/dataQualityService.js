/**
 * Data Quality Service
 * Issue #50: Implement Data Processing Pipeline
 *
 * Provides data quality validation, completeness checking, anomaly detection,
 * and quality reporting capabilities
 */

class DataQualityService {
  /**
   * Validate data against a schema
   * @param {Array} data - Data to validate
   * @param {Object} schema - Schema definition
   * @returns {Object} Validation result
   */
  validateSchema(data, schema) {
    if (!schema) {
      throw new Error('Schema is required for validation');
    }

    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }

    const result = {
      valid: true,
      errors: [],
      validRecords: 0,
      invalidRecords: 0,
      recordErrors: {}
    };

    data.forEach((row, index) => {
      const rowErrors = this._validateRow(row, schema, index);
      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        result.invalidRecords++;
        result.recordErrors[index] = rowErrors;
        result.valid = false;
      } else {
        result.validRecords++;
      }
    });

    return result;
  }

  /**
   * Validate a single row against schema
   */
  _validateRow(row, schema, rowIndex) {
    const errors = [];
    const { fields = [] } = schema;

    fields.forEach(fieldDef => {
      const { name, type, required, minLength, maxLength, min, max, pattern, enum: enumValues } = fieldDef;
      const value = row[name];

      // Required check
      if (required && (value === null || value === undefined || value === '')) {
        errors.push({
          rowIndex,
          field: name,
          type: 'required',
          message: `Field '${name}' is required`
        });
        return;
      }

      // Skip further validation if value is null/undefined and not required
      if (value === null || value === undefined) return;

      // Type check
      if (type) {
        const actualType = this._getType(value);
        if (!this._isTypeMatch(actualType, type, value)) {
          errors.push({
            rowIndex,
            field: name,
            type: 'type_mismatch',
            message: `Field '${name}' expected type '${type}' but got '${actualType}'`
          });
        }
      }

      // String length checks
      if (typeof value === 'string') {
        if (minLength !== undefined && value.length < minLength) {
          errors.push({
            rowIndex,
            field: name,
            type: 'minLength',
            message: `Field '${name}' must be at least ${minLength} characters`
          });
        }

        if (maxLength !== undefined && value.length > maxLength) {
          errors.push({
            rowIndex,
            field: name,
            type: 'maxLength',
            message: `Field '${name}' must be at most ${maxLength} characters`
          });
        }
      }

      // Number range checks
      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          errors.push({
            rowIndex,
            field: name,
            type: 'min',
            message: `Field '${name}' must be at least ${min}`
          });
        }

        if (max !== undefined && value > max) {
          errors.push({
            rowIndex,
            field: name,
            type: 'max',
            message: `Field '${name}' must be at most ${max}`
          });
        }
      }

      // Pattern check
      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          errors.push({
            rowIndex,
            field: name,
            type: 'pattern',
            message: `Field '${name}' does not match required pattern`
          });
        }
      }

      // Enum check
      if (enumValues && !enumValues.includes(value)) {
        errors.push({
          rowIndex,
          field: name,
          type: 'enum',
          message: `Field '${name}' must be one of: ${enumValues.join(', ')}`
        });
      }
    });

    return errors;
  }

  /**
   * Get JavaScript type of value
   */
  _getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (value instanceof Date) return 'date';
    return typeof value;
  }

  /**
   * Check if value type matches expected type
   */
  _isTypeMatch(actualType, expectedType, value) {
    switch (expectedType) {
      case 'string':
        return actualType === 'string';
      case 'number':
        return actualType === 'number' && !isNaN(value);
      case 'boolean':
        return actualType === 'boolean';
      case 'date':
        return actualType === 'date' || (actualType === 'string' && !isNaN(Date.parse(value)));
      case 'array':
        return actualType === 'array';
      case 'object':
        return actualType === 'object';
      default:
        return true;
    }
  }

  /**
   * Check data completeness
   * @param {Array} data - Data to check
   * @param {Object} options - Completeness options
   * @returns {Object} Completeness result
   */
  checkCompleteness(data, options = {}) {
    const { requiredFields = [], treatEmptyAsNull = false } = options;

    if (data.length === 0) {
      return {
        overallCompleteness: 1,
        fieldCompleteness: {},
        recordCount: 0,
        incompleteRecords: []
      };
    }

    // Get all fields from data
    const allFields = new Set();
    data.forEach(row => {
      Object.keys(row).forEach(key => allFields.add(key));
    });

    const fieldCompleteness = {};
    const incompleteRecords = [];

    // Calculate completeness for each field
    allFields.forEach(field => {
      let nonNullCount = 0;
      data.forEach(row => {
        const value = row[field];
        const isNull = value === null || value === undefined ||
          (treatEmptyAsNull && value === '');
        if (!isNull) nonNullCount++;
      });
      fieldCompleteness[field] = nonNullCount / data.length;
    });

    // Calculate overall completeness
    const completenessValues = Object.values(fieldCompleteness);
    const overallCompleteness = completenessValues.length > 0
      ? completenessValues.reduce((a, b) => a + b, 0) / completenessValues.length
      : 1;

    // Find incomplete records
    data.forEach((row, index) => {
      const missingFields = [];
      allFields.forEach(field => {
        const value = row[field];
        const isNull = value === null || value === undefined ||
          (treatEmptyAsNull && value === '');
        if (isNull) missingFields.push(field);
      });

      if (missingFields.length > 0) {
        incompleteRecords.push({
          recordIndex: index,
          missingFields
        });
      }
    });

    // Check required fields completeness
    let requiredFieldCompleteness = 1;
    const missingRequiredFields = [];
    if (requiredFields.length > 0) {
      let totalRequiredValues = 0;
      let filledRequiredValues = 0;

      requiredFields.forEach(field => {
        data.forEach(row => {
          totalRequiredValues++;
          const value = row[field];
          const isNull = value === null || value === undefined ||
            (treatEmptyAsNull && value === '');
          if (!isNull) {
            filledRequiredValues++;
          } else if (!missingRequiredFields.includes(field)) {
            missingRequiredFields.push(field);
          }
        });
      });

      requiredFieldCompleteness = totalRequiredValues > 0
        ? filledRequiredValues / totalRequiredValues
        : 1;
    }

    return {
      overallCompleteness,
      fieldCompleteness,
      recordCount: data.length,
      incompleteRecords,
      requiredFieldCompleteness,
      missingRequiredFields
    };
  }

  /**
   * Detect anomalies in data
   * @param {Array} data - Data to analyze
   * @param {Object} config - Anomaly detection configuration
   * @returns {Object} Anomaly detection result
   */
  detectAnomalies(data, config = {}) {
    const { method, fields = [], threshold = 2, patterns = {}, rules = [] } = config;

    if (!['zscore', 'iqr', 'pattern', 'null_detection', 'business_rules'].includes(method)) {
      throw new Error(`Unsupported anomaly detection method: ${method}`);
    }

    if (data.length === 0) {
      return {
        anomalies: [],
        statistics: { totalRecords: 0, anomalyCount: 0, anomalyRate: 0 }
      };
    }

    let anomalies = [];

    switch (method) {
      case 'zscore':
        anomalies = this._detectZScoreAnomalies(data, fields, threshold);
        break;

      case 'iqr':
        anomalies = this._detectIQRAnomalies(data, fields);
        break;

      case 'pattern':
        anomalies = this._detectPatternAnomalies(data, fields, patterns);
        break;

      case 'null_detection':
        anomalies = this._detectNullAnomalies(data, fields);
        break;

      case 'business_rules':
        anomalies = this._detectBusinessRuleAnomalies(data, rules);
        break;
    }

    return {
      anomalies,
      statistics: {
        totalRecords: data.length,
        anomalyCount: anomalies.length,
        anomalyRate: anomalies.length / data.length
      }
    };
  }

  /**
   * Detect anomalies using z-score method
   */
  _detectZScoreAnomalies(data, fields, threshold) {
    const anomalies = [];

    fields.forEach(field => {
      const values = data.map(row => row[field]).filter(v => typeof v === 'number');
      if (values.length === 0) return;

      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) return;

      data.forEach((row, index) => {
        const value = row[field];
        if (typeof value !== 'number') return;

        const zScore = Math.abs((value - mean) / stdDev);
        if (zScore > threshold) {
          anomalies.push({
            recordId: row.id || String(index),
            recordIndex: index,
            field,
            value,
            type: 'outlier',
            zScore,
            severity: zScore > threshold * 1.5 ? 'high' : 'medium'
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect anomalies using IQR method
   */
  _detectIQRAnomalies(data, fields) {
    const anomalies = [];

    fields.forEach(field => {
      const values = data.map(row => row[field]).filter(v => typeof v === 'number').sort((a, b) => a - b);
      if (values.length < 4) return;

      const q1Index = Math.floor(values.length * 0.25);
      const q3Index = Math.floor(values.length * 0.75);
      const q1 = values[q1Index];
      const q3 = values[q3Index];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      data.forEach((row, index) => {
        const value = row[field];
        if (typeof value !== 'number') return;

        if (value < lowerBound || value > upperBound) {
          anomalies.push({
            recordId: row.id || String(index),
            recordIndex: index,
            field,
            value,
            type: 'outlier',
            bounds: { lower: lowerBound, upper: upperBound },
            severity: 'medium'
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect pattern anomalies
   */
  _detectPatternAnomalies(data, fields, patterns) {
    const anomalies = [];

    fields.forEach(field => {
      const pattern = patterns[field];
      if (!pattern) return;

      const regex = new RegExp(pattern);

      data.forEach((row, index) => {
        const value = row[field];
        if (typeof value !== 'string') return;

        if (!regex.test(value)) {
          anomalies.push({
            recordId: row.id || String(index),
            recordIndex: index,
            field,
            value,
            type: 'pattern_violation',
            expectedPattern: pattern,
            severity: 'low'
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect unexpected null values
   */
  _detectNullAnomalies(data, fields) {
    const anomalies = [];

    fields.forEach(field => {
      data.forEach((row, index) => {
        const value = row[field];
        if (value === null || value === undefined) {
          anomalies.push({
            recordId: row.id || String(index),
            recordIndex: index,
            field,
            type: 'unexpected_null',
            severity: 'medium'
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * Detect business rule anomalies
   */
  _detectBusinessRuleAnomalies(data, rules) {
    const anomalies = [];

    data.forEach((row, index) => {
      rules.forEach(rule => {
        const { condition, severity = 'medium', message } = rule;

        // Simple condition evaluation
        if (this._evaluateBusinessRule(condition, row)) {
          anomalies.push({
            recordId: row.id || String(index),
            recordIndex: index,
            type: 'business_rule_violation',
            rule: condition,
            message,
            severity
          });
        }
      });
    });

    return anomalies;
  }

  /**
   * Evaluate business rule condition
   */
  _evaluateBusinessRule(condition, row) {
    // Handle simple comparisons like "expenses > revenue" or "endDate < startDate"
    const match = condition.match(/(\w+)\s*(>|<|>=|<=|===|!==)\s*(\w+)/);
    if (match) {
      const [, fieldA, operator, fieldB] = match;
      let valueA = row[fieldA];
      let valueB = row[fieldB];

      // Try to parse as dates if they're strings
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        const dateA = Date.parse(valueA);
        const dateB = Date.parse(valueB);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          valueA = dateA;
          valueB = dateB;
        }
      }

      switch (operator) {
        case '>': return valueA > valueB;
        case '<': return valueA < valueB;
        case '>=': return valueA >= valueB;
        case '<=': return valueA <= valueB;
        case '===': return valueA === valueB;
        case '!==': return valueA !== valueB;
      }
    }
    return false;
  }

  /**
   * Generate comprehensive quality report
   * @param {Array} data - Data to analyze
   * @param {Object} config - Report configuration
   * @returns {Object} Quality report
   */
  generateQualityReport(data, config = {}) {
    const { schema, anomalyConfig = {}, thresholds = {}, metadata = {} } = config;

    // Schema validation
    const schemaValidation = schema
      ? this.validateSchema(data, schema)
      : { valid: true, errors: [], validRecords: data.length, invalidRecords: 0 };

    // Completeness check
    const completeness = this.checkCompleteness(data);

    // Anomaly detection
    const anomalyDetectionConfig = {
      method: anomalyConfig.method || 'zscore',
      fields: anomalyConfig.fields || [],
      threshold: anomalyConfig.threshold || 2
    };

    let anomalies = { anomalies: [], statistics: { totalRecords: data.length, anomalyCount: 0, anomalyRate: 0 } };
    if (anomalyConfig.fields && anomalyConfig.fields.length > 0) {
      anomalies = this.detectAnomalies(data, anomalyDetectionConfig);
    }

    // Calculate dimension scores
    const completenessScore = completeness.overallCompleteness * 100;
    const validityScore = data.length > 0
      ? (schemaValidation.validRecords / data.length) * 100
      : 100;
    const consistencyScore = 100 - (anomalies.statistics.anomalyRate * 100);
    const accuracyScore = (completenessScore + validityScore + consistencyScore) / 3;

    const dimensionScores = {
      completeness: Math.round(completenessScore),
      validity: Math.round(validityScore),
      consistency: Math.round(consistencyScore),
      accuracy: Math.round(accuracyScore)
    };

    // Overall score
    const overallScore = Math.round(
      (dimensionScores.completeness + dimensionScores.validity +
       dimensionScores.consistency + dimensionScores.accuracy) / 4
    );

    // Generate recommendations
    const recommendations = this._generateRecommendations(
      schemaValidation, completeness, anomalies, dimensionScores
    );

    // Field-level analysis
    const fieldAnalysis = this._generateFieldAnalysis(data, schema);

    // Check threshold violations
    const thresholdViolations = this._checkThresholds(dimensionScores, thresholds);

    return {
      summary: {
        recordCount: data.length,
        overallScore,
        dimensionScores
      },
      schemaValidation,
      completeness,
      anomalies,
      fieldAnalysis,
      recommendations,
      thresholdViolations,
      generatedAt: new Date().toISOString(),
      metadata
    };
  }

  /**
   * Generate recommendations based on quality issues
   */
  _generateRecommendations(schemaValidation, completeness, anomalies, scores) {
    const recommendations = [];

    if (schemaValidation.invalidRecords > 0) {
      recommendations.push({
        issue: `${schemaValidation.invalidRecords} records failed schema validation`,
        recommendation: 'Review and fix schema validation errors before processing',
        priority: 'high'
      });
    }

    if (completeness.overallCompleteness < 0.95) {
      recommendations.push({
        issue: `Data completeness is ${Math.round(completeness.overallCompleteness * 100)}%`,
        recommendation: 'Investigate and fill missing values or validate data source',
        priority: completeness.overallCompleteness < 0.8 ? 'high' : 'medium'
      });
    }

    if (anomalies.statistics.anomalyCount > 0) {
      recommendations.push({
        issue: `${anomalies.statistics.anomalyCount} anomalies detected`,
        recommendation: 'Review anomalies and determine if they are data errors or legitimate outliers',
        priority: anomalies.statistics.anomalyRate > 0.1 ? 'high' : 'medium'
      });
    }

    if (scores.validity < 90) {
      recommendations.push({
        issue: 'Low validity score indicates data format issues',
        recommendation: 'Implement data validation at source to prevent invalid data entry',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  /**
   * Generate field-level analysis
   */
  _generateFieldAnalysis(data, schema) {
    if (data.length === 0) return {};

    const fields = new Set();
    data.forEach(row => Object.keys(row).forEach(k => fields.add(k)));

    const analysis = {};
    fields.forEach(field => {
      const values = data.map(row => row[field]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined);

      analysis[field] = {
        completeness: nonNullValues.length / values.length,
        validity: 1, // Would be calculated based on schema
        uniqueCount: new Set(nonNullValues).size,
        nullCount: values.length - nonNullValues.length
      };
    });

    return analysis;
  }

  /**
   * Check threshold violations
   */
  _checkThresholds(scores, thresholds) {
    const violations = [];

    if (thresholds.completeness && scores.completeness / 100 < thresholds.completeness) {
      violations.push({
        dimension: 'completeness',
        threshold: thresholds.completeness,
        actual: scores.completeness / 100
      });
    }

    if (thresholds.validity && scores.validity / 100 < thresholds.validity) {
      violations.push({
        dimension: 'validity',
        threshold: thresholds.validity,
        actual: scores.validity / 100
      });
    }

    return violations;
  }

  /**
   * Calculate precision metric
   */
  calculatePrecision(data, field, expectedPrecision) {
    const valuesExceedingPrecision = [];

    data.forEach((row, index) => {
      const value = row[field];
      if (typeof value !== 'number') return;

      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > expectedPrecision) {
        valuesExceedingPrecision.push({
          recordIndex: index,
          value,
          decimalPlaces
        });
      }
    });

    return {
      precisionScore: 1 - (valuesExceedingPrecision.length / data.length),
      valuesExceedingPrecision
    };
  }

  /**
   * Calculate uniqueness metric
   */
  calculateUniqueness(data, field) {
    const values = data.map(row => row[field]);
    const uniqueValues = new Set(values);
    const duplicates = [];

    const valueCounts = {};
    values.forEach((value, index) => {
      if (valueCounts[value]) {
        duplicates.push({ value, indices: [...valueCounts[value].indices, index] });
      } else {
        valueCounts[value] = { indices: [index] };
      }
    });

    return {
      uniquenessScore: uniqueValues.size / values.length,
      duplicates: duplicates.filter(d => d.indices && d.indices.length > 1)
    };
  }

  /**
   * Calculate timeliness metric
   */
  calculateTimeliness(data, field, options = {}) {
    const { freshnessThreshold = 24 * 60 * 60 * 1000 } = options; // Default 24 hours
    const now = Date.now();
    const staleRecords = [];

    data.forEach((row, index) => {
      const value = row[field];
      if (!value) return;

      const timestamp = new Date(value).getTime();
      if (isNaN(timestamp)) return;

      const age = now - timestamp;
      if (age > freshnessThreshold) {
        staleRecords.push({
          recordIndex: index,
          timestamp: value,
          age
        });
      }
    });

    return {
      timelinessScore: 1 - (staleRecords.length / data.length),
      staleRecords
    };
  }

  /**
   * Profile a single field
   */
  profileField(data, field) {
    const values = data.map(row => row[field]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    const dataType = this._inferDataType(nonNullValues);

    const profile = {
      fieldName: field,
      dataType,
      count: values.length,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: new Set(nonNullValues).size,
      statistics: {}
    };

    // Add type-specific statistics
    switch (dataType) {
      case 'number':
        const numericValues = nonNullValues.filter(v => typeof v === 'number');
        profile.statistics = {
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          mean: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
          median: this._calculateMedian(numericValues),
          stdDev: this._calculateStdDev(numericValues)
        };
        break;

      case 'string':
        const stringValues = nonNullValues.filter(v => typeof v === 'string');
        const lengths = stringValues.map(s => s.length);
        profile.statistics = {
          minLength: Math.min(...lengths),
          maxLength: Math.max(...lengths),
          avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length
        };
        break;

      case 'date':
        const timestamps = nonNullValues.map(v => new Date(v).getTime()).filter(t => !isNaN(t));
        profile.statistics = {
          earliest: new Date(Math.min(...timestamps)).toISOString(),
          latest: new Date(Math.max(...timestamps)).toISOString(),
          range: Math.max(...timestamps) - Math.min(...timestamps)
        };
        break;
    }

    return profile;
  }

  /**
   * Profile entire dataset
   */
  profileData(data) {
    if (data.length === 0) {
      return { recordCount: 0, fieldCount: 0, fields: {} };
    }

    const fields = new Set();
    data.forEach(row => Object.keys(row).forEach(k => fields.add(k)));

    const fieldProfiles = {};
    fields.forEach(field => {
      fieldProfiles[field] = this.profileField(data, field);
    });

    return {
      recordCount: data.length,
      fieldCount: fields.size,
      fields: fieldProfiles
    };
  }

  /**
   * Infer data type from values
   */
  _inferDataType(values) {
    if (values.length === 0) return 'unknown';

    const sampleValue = values[0];
    if (typeof sampleValue === 'number') return 'number';
    if (typeof sampleValue === 'boolean') return 'boolean';
    if (typeof sampleValue === 'string') {
      // Check if it's a date
      if (!isNaN(Date.parse(sampleValue)) && sampleValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        return 'date';
      }
      return 'string';
    }
    return 'unknown';
  }

  /**
   * Calculate median
   */
  _calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate standard deviation
   */
  _calculateStdDev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

module.exports = new DataQualityService();
