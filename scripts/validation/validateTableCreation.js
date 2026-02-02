#!/usr/bin/env node

/**
 * ZeroDB Table Creation Validation Script
 *
 * Validates that all required tables are properly created with correct schemas
 * in the ZeroDB project. This script is part of Phase 1 validation work.
 *
 * Usage:
 *   node scripts/validation/validateTableCreation.js
 *   npm run validate:tables
 */

const jwt = require('jsonwebtoken');
const zerodbService = require('../../services/zerodbService');

// Configuration
const config = {
  secretKey: process.env.JWT_SECRET || 'your-secret-key-here',
  userId: process.env.OPENCAP_USER_ID || 'opencap-validation-user',
  userEmail: process.env.OPENCAP_USER_EMAIL || 'validation@opencap.ai'
};

// Expected table schemas
const EXPECTED_TABLES = {
  financial_reports: {
    id: 'uuid',
    company_id: 'string',
    report_type: 'string',
    reporting_period: 'string',
    total_revenue: 'decimal',
    total_expenses: 'decimal',
    net_income: 'decimal',
    created_at: 'timestamp',
    updated_at: 'timestamp'
  },
  documents: {
    id: 'uuid',
    document_name: 'string',
    document_type: 'string',
    file_size: 'integer',
    content_type: 'string',
    company_id: 'string',
    access_level: 'string',
    created_at: 'timestamp'
  },
  spvs: {
    id: 'uuid',
    spv_name: 'string',
    spv_type: 'string',
    total_commitment: 'decimal',
    investor_count: 'integer',
    status: 'string',
    created_at: 'timestamp'
  },
  user_activities: {
    id: 'uuid',
    user_id: 'string',
    activity_type: 'string',
    entity_type: 'string',
    entity_id: 'string',
    timestamp: 'timestamp',
    metadata: 'json'
  }
};

class TableValidator {
  constructor() {
    this.validationResults = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Generate JWT token for validation operations
   */
  generateToken() {
    const payload = {
      sub: config.userId,
      role: 'ADMIN',
      email: config.userEmail,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, config.secretKey, { algorithm: 'HS256' });
  }

  /**
   * Initialize ZeroDB connection
   */
  async initialize() {
    try {
      const token = this.generateToken();
      await zerodbService.initialize(token);
      console.log('✅ ZeroDB connection initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize ZeroDB:', error.message);
      this.errors.push({
        type: 'INITIALIZATION_ERROR',
        message: 'Failed to initialize ZeroDB connection',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Validate table exists
   */
  async validateTableExists(tableName) {
    try {
      const tables = await zerodbService.listTables();
      const tableExists = tables.some(t => t.table_name === tableName);

      if (tableExists) {
        console.log(`✅ Table '${tableName}' exists`);
        return { exists: true, table: tables.find(t => t.table_name === tableName) };
      } else {
        console.error(`❌ Table '${tableName}' does not exist`);
        this.errors.push({
          type: 'TABLE_NOT_FOUND',
          table: tableName,
          message: `Required table '${tableName}' not found in ZeroDB`
        });
        return { exists: false, table: null };
      }
    } catch (error) {
      console.error(`❌ Error checking table '${tableName}':`, error.message);
      this.errors.push({
        type: 'TABLE_CHECK_ERROR',
        table: tableName,
        message: `Error checking table existence: ${error.message}`
      });
      return { exists: false, table: null };
    }
  }

  /**
   * Validate table schema
   */
  validateTableSchema(tableName, actualSchema, expectedSchema) {
    console.log(`🔍 Validating schema for '${tableName}'...`);

    const schemaIssues = [];

    // Check for missing fields
    for (const [fieldName, fieldType] of Object.entries(expectedSchema)) {
      if (!actualSchema || !actualSchema[fieldName]) {
        schemaIssues.push({
          type: 'MISSING_FIELD',
          field: fieldName,
          expectedType: fieldType,
          message: `Missing required field '${fieldName}' (expected type: ${fieldType})`
        });
      } else if (actualSchema[fieldName] !== fieldType) {
        schemaIssues.push({
          type: 'TYPE_MISMATCH',
          field: fieldName,
          expectedType: fieldType,
          actualType: actualSchema[fieldName],
          message: `Field '${fieldName}' type mismatch: expected '${fieldType}', got '${actualSchema[fieldName]}'`
        });
      }
    }

    // Check for unexpected fields
    if (actualSchema) {
      for (const [fieldName, fieldType] of Object.entries(actualSchema)) {
        if (!expectedSchema[fieldName]) {
          schemaIssues.push({
            type: 'UNEXPECTED_FIELD',
            field: fieldName,
            actualType: fieldType,
            message: `Unexpected field '${fieldName}' found (type: ${fieldType})`
          });
          this.warnings.push({
            type: 'UNEXPECTED_FIELD',
            table: tableName,
            field: fieldName,
            message: `Table '${tableName}' has unexpected field '${fieldName}'`
          });
        }
      }
    }

    if (schemaIssues.length === 0) {
      console.log(`✅ Schema validation passed for '${tableName}'`);
      return { valid: true, issues: [] };
    } else {
      console.error(`❌ Schema validation failed for '${tableName}':`);
      schemaIssues.forEach(issue => {
        console.error(`   - ${issue.message}`);
        if (issue.type !== 'UNEXPECTED_FIELD') {
          this.errors.push({
            type: 'SCHEMA_VALIDATION_ERROR',
            table: tableName,
            ...issue
          });
        }
      });
      return { valid: false, issues: schemaIssues };
    }
  }

  /**
   * Validate all tables
   */
  async validateAllTables() {
    console.log('\n📋 Validating all required tables...');
    console.log('='.repeat(60));

    const results = {};

    for (const [tableName, expectedSchema] of Object.entries(EXPECTED_TABLES)) {
      console.log(`\n🔍 Validating table: ${tableName}`);

      // Check if table exists
      const { exists, table } = await this.validateTableExists(tableName);

      if (!exists) {
        results[tableName] = {
          exists: false,
          schemaValid: false,
          issues: ['Table does not exist']
        };
        continue;
      }

      // Validate schema
      const schemaValidation = this.validateTableSchema(
        tableName,
        table.schema_definition,
        expectedSchema
      );

      results[tableName] = {
        exists: true,
        schemaValid: schemaValidation.valid,
        issues: schemaValidation.issues.map(i => i.message),
        table: table
      };
    }

    return results;
  }

  /**
   * Validate database status
   */
  async validateDatabaseStatus() {
    console.log('\n🔍 Validating database status...');

    try {
      const status = await zerodbService.getDatabaseStatus();
      console.log('✅ Database status retrieved successfully');
      console.log(`   Status: ${JSON.stringify(status)}`);
      return { valid: true, status };
    } catch (error) {
      console.error('❌ Failed to get database status:', error.message);
      this.errors.push({
        type: 'DATABASE_STATUS_ERROR',
        message: `Failed to retrieve database status: ${error.message}`
      });
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate validation report
   */
  generateReport(validationResults, dbStatus) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION REPORT');
    console.log('='.repeat(60));

    const totalTables = Object.keys(EXPECTED_TABLES).length;
    const existingTables = Object.values(validationResults).filter(r => r.exists).length;
    const validSchemas = Object.values(validationResults).filter(r => r.schemaValid).length;

    console.log(`\n📈 Summary:`);
    console.log(`   Total expected tables: ${totalTables}`);
    console.log(`   Tables found: ${existingTables}/${totalTables}`);
    console.log(`   Valid schemas: ${validSchemas}/${totalTables}`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);

    // Table-by-table results
    console.log(`\n📋 Table Validation Results:`);
    for (const [tableName, result] of Object.entries(validationResults)) {
      const status = result.exists && result.schemaValid ? '✅' : '❌';
      console.log(`   ${status} ${tableName}`);
      if (result.issues && result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(`      - ${issue}`);
        });
      }
    }

    // Errors
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.type}] ${error.message}`);
        if (error.table) console.log(`      Table: ${error.table}`);
        if (error.field) console.log(`      Field: ${error.field}`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.type}] ${warning.message}`);
      });
    }

    // Database status
    console.log(`\n🗄️  Database Status:`);
    if (dbStatus.valid) {
      console.log(`   ✅ Database is operational`);
      if (dbStatus.status) {
        console.log(`   Details: ${JSON.stringify(dbStatus.status, null, 2).split('\n').join('\n   ')}`);
      }
    } else {
      console.log(`   ❌ Database status check failed: ${dbStatus.error}`);
    }

    // Overall result
    console.log('\n' + '='.repeat(60));
    const allValid = existingTables === totalTables &&
                     validSchemas === totalTables &&
                     this.errors.length === 0 &&
                     dbStatus.valid;

    if (allValid) {
      console.log('✅ VALIDATION PASSED - All tables are properly configured');
    } else {
      console.log('❌ VALIDATION FAILED - Issues detected');
    }
    console.log('='.repeat(60) + '\n');

    return {
      success: allValid,
      summary: {
        totalTables,
        existingTables,
        validSchemas,
        errorsCount: this.errors.length,
        warningsCount: this.warnings.length
      },
      tables: validationResults,
      databaseStatus: dbStatus,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Run complete validation
   */
  async run() {
    console.log('🧪 Starting ZeroDB Table Creation Validation');
    console.log('='.repeat(60));

    try {
      // Initialize connection
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('\n❌ Cannot proceed - initialization failed');
        process.exit(1);
      }

      // Validate database status
      const dbStatus = await this.validateDatabaseStatus();

      // Validate all tables
      const validationResults = await this.validateAllTables();

      // Generate report
      const report = this.generateReport(validationResults, dbStatus);

      // Exit with appropriate code
      process.exit(report.success ? 0 : 1);

    } catch (error) {
      console.error('\n💥 Unexpected validation error:', error);
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TableValidator();
  validator.run().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TableValidator;
