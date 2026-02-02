#!/usr/bin/env node

/**
 * Data Integrity Validator
 *
 * Comprehensive validation of data integrity across ZeroDB and MongoDB
 */

const crypto = require('crypto');
const zerodbService = require('../services/zerodbService');
const mongoose = require('mongoose');

class DataIntegrityValidator {
  constructor(config = {}) {
    this.config = {
      strictMode: config.strictMode !== false,
      validateChecksums: config.validateChecksums !== false,
      validateRelationships: config.validateRelationships !== false
    };
  }

  calculateChecksum(data) {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }

  async validateTableChecksum(tableName, expectedChecksum, token) {
    try {
      await zerodbService.initialize(token);
      const data = await zerodbService.queryTable(tableName, {});

      const actualChecksum = this.calculateChecksum(data);

      return {
        valid: actualChecksum === expectedChecksum,
        corruption: actualChecksum !== expectedChecksum,
        checksum: actualChecksum,
        expectedChecksum,
        actualChecksum
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateRecordCount(tableName, token) {
    try {
      await zerodbService.initialize(token);
      const zerodbCount = await zerodbService.countRows(tableName);

      const modelName = this.tableToModelName(tableName);
      const Model = mongoose.model(modelName);
      const mongodbCount = await Model.countDocuments();

      const missingRecords = Math.abs(zerodbCount - mongodbCount);
      const discrepancy =
        zerodbCount < mongodbCount ? 'zerodb_missing_records' : 'mongodb_missing_records';

      return {
        valid: zerodbCount === mongodbCount,
        zerodbCount,
        mongodbCount,
        missingRecords: zerodbCount !== mongodbCount ? missingRecords : undefined,
        discrepancy: zerodbCount !== mongodbCount ? discrepancy : undefined
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateRequiredFields(tableName, requiredFields, token) {
    try {
      await zerodbService.initialize(token);
      const data = await zerodbService.queryTable(tableName, {});

      const missingFields = new Set();

      for (const record of data) {
        for (const field of requiredFields) {
          if (!(field in record)) {
            missingFields.add(field);
          }
        }
      }

      return {
        valid: missingFields.size === 0,
        missingFields: Array.from(missingFields)
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateFieldTypes(tableName, fieldTypes, token) {
    try {
      await zerodbService.initialize(token);
      const data = await zerodbService.queryTable(tableName, {});

      const typeErrors = [];

      for (const record of data) {
        for (const [field, expectedType] of Object.entries(fieldTypes)) {
          if (field in record) {
            const actualType = typeof record[field];
            if (actualType !== expectedType) {
              typeErrors.push({
                recordId: record._id,
                field,
                expectedType,
                actualType
              });
            }
          }
        }
      }

      return {
        valid: typeErrors.length === 0,
        typeErrors
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateForeignKeys(tableName, foreignKeyField, referencedTable, referencedField, token) {
    try {
      await zerodbService.initialize(token);

      const data = await zerodbService.queryTable(tableName, {});
      const referencedData = await zerodbService.queryTable(referencedTable, {});

      const referencedIds = new Set(referencedData.map((r) => r[referencedField]));
      const orphanedRecords = [];

      for (const record of data) {
        const foreignKeyValue = record[foreignKeyField];
        if (foreignKeyValue && !referencedIds.has(foreignKeyValue)) {
          orphanedRecords.push(record._id);
        }
      }

      return {
        valid: orphanedRecords.length === 0,
        orphanedRecords
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateFinancialLogic(tableName, token) {
    try {
      await zerodbService.initialize(token);
      const data = await zerodbService.queryTable(tableName, {});

      const calculationErrors = [];

      for (const record of data) {
        if ('TotalRevenue' in record && 'TotalExpenses' in record && 'NetIncome' in record) {
          const expectedNetIncome = record.TotalRevenue - record.TotalExpenses;
          if (Math.abs(expectedNetIncome - record.NetIncome) > 0.01) {
            calculationErrors.push({
              recordId: record._id,
              expected: expectedNetIncome,
              actual: record.NetIncome,
              difference: Math.abs(expectedNetIncome - record.NetIncome)
            });
          }
        }
      }

      return {
        valid: calculationErrors.length === 0,
        calculationErrors
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateDateSequence(tableName, startDateField, endDateField, token) {
    try {
      await zerodbService.initialize(token);
      const data = await zerodbService.queryTable(tableName, {});

      const dateSequenceErrors = [];

      for (const record of data) {
        if (startDateField in record && endDateField in record) {
          const startDate = new Date(record[startDateField]);
          const endDate = new Date(record[endDateField]);

          if (endDate < startDate) {
            dateSequenceErrors.push({
              recordId: record._id,
              startDate: record[startDateField],
              endDate: record[endDateField]
            });
          }
        }
      }

      return {
        valid: dateSequenceErrors.length === 0,
        dateSequenceErrors
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async validateCrossSystemConsistency(tableName, token) {
    try {
      await zerodbService.initialize(token);
      const zerodbData = await zerodbService.queryTable(tableName, {});

      const modelName = this.tableToModelName(tableName);
      const Model = mongoose.model(modelName);
      const mongodbData = await Model.find({}).lean().exec();

      const zerodbMap = new Map(zerodbData.map((d) => [d._id, d]));
      const mongoMap = new Map(mongodbData.map((d) => [d._id.toString(), d]));

      const discrepancies = [];

      // Check for field mismatches
      for (const [id, zerodbRecord] of zerodbMap) {
        const mongoRecord = mongoMap.get(id);
        if (mongoRecord) {
          for (const key of Object.keys(zerodbRecord)) {
            if (key !== '__v' && key !== 'updatedAt') {
              if (JSON.stringify(zerodbRecord[key]) !== JSON.stringify(mongoRecord[key])) {
                discrepancies.push({
                  type: 'field_mismatch',
                  recordId: id,
                  field: key,
                  zerodbValue: zerodbRecord[key],
                  mongodbValue: mongoRecord[key]
                });
              }
            }
          }
        }
      }

      return {
        consistent: discrepancies.length === 0,
        discrepancies
      };
    } catch (error) {
      return {
        consistent: false,
        error: error.message
      };
    }
  }

  async runComprehensiveValidation(tableName, token, options = {}) {
    const checks = [];

    if (options.validateChecksums) {
      const checksumResult = await this.validateTableChecksum(tableName, '', token);
      checks.push({ name: 'checksum', result: checksumResult });
    }

    if (options.validateCounts) {
      const countResult = await this.validateRecordCount(tableName, token);
      checks.push({ name: 'record_count', result: countResult });
    }

    if (options.validateTypes) {
      const typeResult = await this.validateFieldTypes(tableName, {}, token);
      checks.push({ name: 'field_types', result: typeResult });
    }

    if (options.validateBusinessLogic) {
      const logicResult = await this.validateFinancialLogic(tableName, token);
      checks.push({ name: 'business_logic', result: logicResult });
    }

    const passed = checks.filter((c) => c.result.valid).length;
    const failed = checks.filter((c) => !c.result.valid).length;

    return {
      summary: {
        totalChecks: checks.length,
        passed,
        failed
      },
      checks,
      overallValid: failed === 0
    };
  }

  prioritizeValidationIssues(validationResults) {
    const issues = [];

    for (const [checkName, result] of Object.entries(validationResults)) {
      if (!result.valid) {
        issues.push({
          check: checkName,
          severity: result.severity || 'medium',
          details: result
        });
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
  }

  getRemediationRecommendations(issues) {
    const recommendations = [];

    for (const issue of issues) {
      let recommendation = {
        issue: issue.type,
        action: '',
        steps: [],
        urgency: 'normal'
      };

      switch (issue.type) {
        case 'checksum_mismatch':
          recommendation.action = 'Restore from backup';
          recommendation.steps = [
            'Identify last known good backup',
            'Verify backup integrity',
            'Perform restore operation',
            'Validate restored data'
          ];
          recommendation.urgency = 'immediate';
          break;

        case 'missing_records':
          recommendation.action = 'Sync missing data';
          recommendation.steps = [
            'Identify missing records',
            'Locate records in source system',
            'Migrate missing records',
            'Verify record count matches'
          ];
          recommendation.urgency = 'high';
          break;

        default:
          recommendation.action = 'Investigate and fix';
          recommendation.steps = ['Review error details', 'Determine root cause', 'Apply fix'];
          break;
      }

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  tableToModelName(tableName) {
    return tableName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

module.exports = DataIntegrityValidator;
