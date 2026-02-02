#!/usr/bin/env node

/**
 * ZeroDB Table Rollback Script
 *
 * Safely removes ZeroDB tables created during initialization.
 * Implements safety checks, dry-run mode, and comprehensive logging.
 *
 * Usage:
 *   node scripts/migration/rollbackTables.js [options]
 *   npm run rollback:tables
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 *   --force      Skip confirmation prompts (use with caution)
 *   --tables     Comma-separated list of specific tables to rollback
 *
 * Examples:
 *   node scripts/migration/rollbackTables.js --dry-run
 *   node scripts/migration/rollbackTables.js --force
 *   node scripts/migration/rollbackTables.js --tables=financial_reports,documents
 */

const jwt = require('jsonwebtoken');
const zerodbService = require('../../services/zerodbService');
const readline = require('readline');

// Configuration
const config = {
  secretKey: process.env.JWT_SECRET || 'your-secret-key-here',
  userId: process.env.OPENCAP_USER_ID || 'opencap-rollback-user',
  userEmail: process.env.OPENCAP_USER_EMAIL || 'rollback@opencap.ai'
};

// Tables managed by OpenCap initialization
const MANAGED_TABLES = [
  'financial_reports',
  'documents',
  'spvs',
  'user_activities'
];

class TableRollback {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    this.specificTables = options.tables || null;
    this.deletedTables = [];
    this.errors = [];
    this.warnings = [];
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Generate JWT token for rollback operations
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
   * Prompt user for confirmation
   */
  async promptConfirmation(message) {
    return new Promise((resolve) => {
      this.rl.question(`${message} (yes/no): `, (answer) => {
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Get list of tables to rollback
   */
  getTablesToRollback() {
    if (this.specificTables) {
      const requestedTables = this.specificTables.split(',').map(t => t.trim());
      const validTables = requestedTables.filter(t => MANAGED_TABLES.includes(t));
      const invalidTables = requestedTables.filter(t => !MANAGED_TABLES.includes(t));

      if (invalidTables.length > 0) {
        this.warnings.push({
          type: 'INVALID_TABLE_NAMES',
          tables: invalidTables,
          message: `The following tables are not managed by OpenCap: ${invalidTables.join(', ')}`
        });
      }

      return validTables;
    }

    return MANAGED_TABLES;
  }

  /**
   * Check which tables exist
   */
  async checkExistingTables(tablesToCheck) {
    console.log('\n🔍 Checking existing tables...');

    try {
      const allTables = await zerodbService.listTables();
      const existingTables = tablesToCheck.filter(tableName => {
        const exists = allTables.some(t => t.table_name === tableName);
        if (exists) {
          console.log(`  ✓ Found: ${tableName}`);
        } else {
          console.log(`  ⊘ Not found: ${tableName}`);
          this.warnings.push({
            type: 'TABLE_NOT_FOUND',
            table: tableName,
            message: `Table '${tableName}' does not exist (already deleted or never created)`
          });
        }
        return exists;
      });

      return existingTables;
    } catch (error) {
      console.error('❌ Error checking tables:', error.message);
      this.errors.push({
        type: 'TABLE_CHECK_ERROR',
        message: `Failed to list tables: ${error.message}`
      });
      return [];
    }
  }

  /**
   * Check for table data before deletion
   */
  async checkTableData(tableName) {
    try {
      // Note: ZeroDB API doesn't have a direct row count endpoint
      // We'll need to query the table to check if it has data
      // For now, we'll add a warning that data check is not implemented
      this.warnings.push({
        type: 'DATA_CHECK_NOT_IMPLEMENTED',
        table: tableName,
        message: `Cannot verify if table '${tableName}' contains data. Deletion will remove all data.`
      });
      return { hasData: 'unknown', rowCount: null };
    } catch (error) {
      this.warnings.push({
        type: 'DATA_CHECK_ERROR',
        table: tableName,
        message: `Could not check data in table '${tableName}': ${error.message}`
      });
      return { hasData: 'unknown', rowCount: null };
    }
  }

  /**
   * Delete a table
   */
  async deleteTable(tableName) {
    try {
      if (this.dryRun) {
        console.log(`  [DRY RUN] Would delete table: ${tableName}`);
        this.deletedTables.push({
          table: tableName,
          status: 'dry_run',
          timestamp: new Date().toISOString()
        });
        return true;
      }

      // ZeroDB API endpoint for table deletion
      // Note: The actual API endpoint may vary - this is based on common patterns
      const response = await zerodbService.client.delete(
        `/projects/${zerodbService.projectId}/database/tables/${tableName}`
      );

      console.log(`  ✅ Deleted table: ${tableName}`);
      this.deletedTables.push({
        table: tableName,
        status: 'deleted',
        timestamp: new Date().toISOString(),
        response: response.data
      });
      return true;
    } catch (error) {
      console.error(`  ❌ Failed to delete table '${tableName}':`, error.message);
      this.errors.push({
        type: 'TABLE_DELETION_ERROR',
        table: tableName,
        message: `Failed to delete table: ${error.message}`,
        error: error.response?.data || error.message
      });
      return false;
    }
  }

  /**
   * Perform rollback operation
   */
  async performRollback() {
    const tablesToRollback = this.getTablesToRollback();

    if (tablesToRollback.length === 0) {
      console.log('\n⚠️  No valid tables specified for rollback');
      return { success: false, reason: 'no_tables' };
    }

    console.log('\n📋 Tables targeted for rollback:');
    tablesToRollback.forEach(table => console.log(`  - ${table}`));

    // Check which tables exist
    const existingTables = await this.checkExistingTables(tablesToRollback);

    if (existingTables.length === 0) {
      console.log('\n⚠️  No tables found to rollback');
      return { success: true, reason: 'no_existing_tables' };
    }

    // Check for data in tables
    console.log('\n🔍 Checking table data...');
    for (const tableName of existingTables) {
      await this.checkTableData(tableName);
    }

    // Confirmation prompt (unless force mode or dry run)
    if (!this.force && !this.dryRun) {
      console.log('\n⚠️  WARNING: This operation will permanently delete the following tables and ALL their data:');
      existingTables.forEach(table => console.log(`  - ${table}`));
      console.log('\nThis action CANNOT be undone!');

      const confirmed = await this.promptConfirmation('\nAre you sure you want to proceed?');
      if (!confirmed) {
        console.log('\n❌ Rollback cancelled by user');
        return { success: false, reason: 'user_cancelled' };
      }
    }

    // Perform deletions
    console.log(`\n${this.dryRun ? '🧪 [DRY RUN] ' : '🗑️  '}Deleting tables...`);
    let successCount = 0;
    let failureCount = 0;

    for (const tableName of existingTables) {
      const success = await this.deleteTable(tableName);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: failureCount === 0,
      successCount,
      failureCount,
      totalTables: existingTables.length
    };
  }

  /**
   * Generate rollback report
   */
  generateReport(rollbackResult) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ROLLBACK REPORT');
    console.log('='.repeat(60));

    // Summary
    console.log('\n📈 Summary:');
    console.log(`   Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`   Tables deleted: ${this.deletedTables.length}`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}`);

    // Deleted tables
    if (this.deletedTables.length > 0) {
      console.log('\n🗑️  Deleted Tables:');
      this.deletedTables.forEach(item => {
        const status = item.status === 'dry_run' ? '[DRY RUN]' : '✅';
        console.log(`   ${status} ${item.table} (${item.timestamp})`);
      });
    }

    // Warnings
    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. [${warning.type}] ${warning.message}`);
        if (warning.table) console.log(`      Table: ${warning.table}`);
        if (warning.tables) console.log(`      Tables: ${warning.tables.join(', ')}`);
      });
    }

    // Errors
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. [${error.type}] ${error.message}`);
        if (error.table) console.log(`      Table: ${error.table}`);
        if (error.error) console.log(`      Details: ${error.error}`);
      });
    }

    // Overall result
    console.log('\n' + '='.repeat(60));
    if (this.dryRun) {
      console.log('🧪 DRY RUN COMPLETED - No actual changes were made');
    } else if (rollbackResult.success) {
      console.log('✅ ROLLBACK SUCCESSFUL - All tables deleted successfully');
    } else if (rollbackResult.reason === 'user_cancelled') {
      console.log('⏹️  ROLLBACK CANCELLED - No changes were made');
    } else if (rollbackResult.reason === 'no_tables') {
      console.log('⚠️  ROLLBACK SKIPPED - No valid tables specified');
    } else {
      console.log('⚠️  ROLLBACK COMPLETED WITH ERRORS - Some tables may not have been deleted');
    }
    console.log('='.repeat(60) + '\n');

    return {
      success: rollbackResult.success,
      dryRun: this.dryRun,
      summary: {
        deletedCount: this.deletedTables.length,
        errorsCount: this.errors.length,
        warningsCount: this.warnings.length
      },
      deletedTables: this.deletedTables,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Run complete rollback
   */
  async run() {
    console.log('🔄 Starting ZeroDB Table Rollback');
    console.log('='.repeat(60));

    try {
      // Initialize connection
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('\n❌ Cannot proceed - initialization failed');
        this.rl.close();
        process.exit(1);
      }

      // Perform rollback
      const rollbackResult = await this.performRollback();

      // Generate report
      const report = this.generateReport(rollbackResult);

      // Close readline interface
      this.rl.close();

      // Exit with appropriate code
      const exitCode = report.success || this.dryRun ? 0 : 1;
      process.exit(exitCode);

    } catch (error) {
      console.error('\n💥 Unexpected rollback error:', error);
      this.rl.close();
      process.exit(1);
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    force: false,
    tables: null
  };

  args.forEach(arg => {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--tables=')) {
      options.tables = arg.split('=')[1];
    }
  });

  return options;
}

// Run rollback if called directly
if (require.main === module) {
  const options = parseArgs();
  const rollback = new TableRollback(options);
  rollback.run().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TableRollback;
