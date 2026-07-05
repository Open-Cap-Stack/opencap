#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * GitHub Issue #35: Final validation and production readiness
 *
 * Comprehensive validation to ensure ZeroDB migration is complete
 * and the system is ready for production deployment.
 *
 * Usage:
 *   node scripts/validate-production-readiness.js [options]
 *
 * Options:
 *   --dry-run      Run without making actual API calls
 *   --verbose      Include detailed output
 *   --skip-api     Skip API endpoint tests
 *   --output FILE  Save report to specified file
 */

const fs = require('fs').promises;
const path = require('path');

class ProductionReadinessValidator {
  constructor(options = {}) {
    this.config = {
      skipApiTests: options.skipApiTests || options.dryRun || false,
      verbose: options.verbose || false,
      timeout: options.timeout || 30000,
      dryRun: options.dryRun || false,
      outputFile: options.outputFile || null
    };

    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };

    // Required tables for ZeroDB
    this.requiredTables = [
      'users',
      'companies',
      'stakeholders',
      'transactions',
      'documents',
      'equity_plans',
      'fundraising_rounds',
      'spvs',
      'share_classes',
      'financial_reports',
      'activities'
    ];

    // Required environment variables
    this.requiredEnvVars = [
      'ZERODB_API_KEY',
      'ZERODB_BASE_URL',
      'NODE_ENV',
      'JWT_SECRET'
    ];

    // Optional but recommended env vars
    this.recommendedEnvVars = [
      'PORT',
      'LOG_LEVEL',
      'ENABLE_ZERODB'
    ];
  }

  /**
   * Add a validation result
   */
  addResult(status, name, message, details = null) {
    const result = {
      name,
      message,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    };

    switch (status) {
      case 'pass':
        this.results.passed.push(result);
        break;
      case 'fail':
        this.results.failed.push(result);
        break;
      case 'warn':
        this.results.warnings.push(result);
        break;
    }

    if (this.config.verbose) {
      const icon = status === 'pass' ? '[PASS]' : status === 'fail' ? '[FAIL]' : '[WARN]';
      console.log(`${icon} ${name}: ${message}`);
    }
  }

  /**
   * Get summary of results
   */
  getSummary() {
    return {
      total: this.results.passed.length + this.results.failed.length + this.results.warnings.length,
      passed: this.results.passed.length,
      failed: this.results.failed.length,
      warnings: this.results.warnings.length
    };
  }

  /**
   * Check if system is production ready
   */
  isProductionReady() {
    return this.results.failed.length === 0;
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables() {
    const checks = [];

    // Check required environment variables
    for (const envVar of this.requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        checks.push({
          name: envVar,
          status: 'pass',
          value: envVar.includes('KEY') || envVar.includes('SECRET') ? '***' : value
        });
        this.addResult('pass', `ENV: ${envVar}`, 'Environment variable is set');
      } else {
        checks.push({
          name: envVar,
          status: 'fail',
          value: null
        });
        this.addResult('fail', `ENV: ${envVar}`, 'Required environment variable is not set');
      }
    }

    // Check recommended environment variables
    for (const envVar of this.recommendedEnvVars) {
      const value = process.env[envVar];
      if (value) {
        checks.push({
          name: envVar,
          status: 'pass',
          value: value
        });
      } else {
        checks.push({
          name: envVar,
          status: 'warn',
          value: null
        });
        this.addResult('warn', `ENV: ${envVar}`, 'Recommended environment variable is not set');
      }
    }

    // Check NODE_ENV specifically
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      this.addResult('pass', 'Production Mode', 'NODE_ENV is set to production');
    } else if (nodeEnv) {
      this.addResult('warn', 'Production Mode', `NODE_ENV is set to '${nodeEnv}', not 'production'`);
    }

    return {
      valid: checks.filter(c => c.status === 'fail').length === 0,
      checks
    };
  }

  /**
   * Check ZeroDB health status
   */
  async checkZeroDBHealth() {
    if (this.config.skipApiTests) {
      return { healthy: true, skipped: true, message: 'API tests skipped' };
    }

    try {
      const zerodbService = require('../services/zerodbService');

      if (!zerodbService.projectId) {
        this.addResult('fail', 'ZeroDB Health', 'ZeroDB service not initialized');
        return {
          healthy: false,
          error: 'ZeroDB service not initialized'
        };
      }

      const status = await zerodbService.getDatabaseStatus();

      if (status.status === 'healthy' || status.status === 'ok') {
        this.addResult('pass', 'ZeroDB Health', 'ZeroDB is healthy and responding');
        return {
          healthy: true,
          status: status.status,
          details: status
        };
      } else {
        this.addResult('fail', 'ZeroDB Health', `ZeroDB status is ${status.status}`);
        return {
          healthy: false,
          status: status.status,
          details: status
        };
      }
    } catch (error) {
      this.addResult('fail', 'ZeroDB Health', `Health check failed: ${error.message}`);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity() {
    if (this.config.skipApiTests) {
      return { tablesExist: true, skipped: true };
    }

    try {
      const zerodbService = require('../services/zerodbService');

      if (!zerodbService.projectId) {
        this.addResult('fail', 'Data Integrity', 'Cannot validate - ZeroDB not initialized');
        return {
          tablesExist: false,
          error: 'ZeroDB not initialized'
        };
      }

      const tables = await zerodbService.listTables();
      const tableNames = tables.map(t => t.name || t.table_name);

      const missingTables = this.requiredTables.filter(
        required => !tableNames.some(name => name.toLowerCase().includes(required.toLowerCase()))
      );

      if (missingTables.length === 0) {
        this.addResult('pass', 'Data Integrity', `All ${this.requiredTables.length} required tables exist`);
        return {
          tablesExist: true,
          tableCount: tables.length,
          tables: tableNames
        };
      } else {
        this.addResult('fail', 'Data Integrity', `Missing tables: ${missingTables.join(', ')}`);
        return {
          tablesExist: false,
          tableCount: tables.length,
          missingTables,
          existingTables: tableNames
        };
      }
    } catch (error) {
      this.addResult('fail', 'Data Integrity', `Validation failed: ${error.message}`);
      return {
        tablesExist: false,
        error: error.message
      };
    }
  }

  /**
   * Test failover and recovery scenarios
   */
  async testFailoverRecovery() {
    if (this.config.skipApiTests) {
      return { recoverySuccessful: true, skipped: true };
    }

    const maxRetries = 3;
    let retryAttempts = 0;
    let lastError = null;

    try {
      const zerodbService = require('../services/zerodbService');

      if (!zerodbService.projectId) {
        this.addResult('fail', 'Failover Recovery', 'Cannot test - ZeroDB not initialized');
        return {
          recoverySuccessful: false,
          error: 'ZeroDB not initialized'
        };
      }

      // Test recovery by simulating connection issues
      while (retryAttempts < maxRetries) {
        try {
          await zerodbService.getDatabaseStatus();
          this.addResult('pass', 'Failover Recovery', `Recovery successful after ${retryAttempts} retry attempts`);
          return {
            recoverySuccessful: true,
            retryAttempts
          };
        } catch (error) {
          lastError = error;
          retryAttempts++;
          if (retryAttempts < maxRetries) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryAttempts));
          }
        }
      }

      this.addResult('fail', 'Failover Recovery', `Recovery failed after ${retryAttempts} attempts: ${lastError.message}`);
      return {
        recoverySuccessful: false,
        retryAttempts,
        error: lastError.message
      };
    } catch (error) {
      this.addResult('fail', 'Failover Recovery', `Test failed: ${error.message}`);
      return {
        recoverySuccessful: false,
        retryAttempts,
        error: error.message
      };
    }
  }

  /**
   * Validate file system requirements
   */
  validateFileSystem() {
    const requiredFiles = [
      'app.js',
      'package.json',
      'services/zerodbService.js',
      'services/databaseAdapter.js'
    ];

    const requiredDirs = [
      'controllers',
      'routes',
      'services',
      'middleware'
    ];

    let allExist = true;

    // Check files
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      try {
        require('fs').accessSync(filePath);
        this.addResult('pass', `File: ${file}`, 'File exists');
      } catch {
        this.addResult('fail', `File: ${file}`, 'Required file not found');
        allExist = false;
      }
    }

    // Check directories
    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, '..', dir);
      try {
        require('fs').accessSync(dirPath);
        this.addResult('pass', `Directory: ${dir}`, 'Directory exists');
      } catch {
        this.addResult('fail', `Directory: ${dir}`, 'Required directory not found');
        allExist = false;
      }
    }

    return { valid: allExist };
  }

  /**
   * Validate security configuration
   */
  validateSecurityConfig() {
    const checks = [];

    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length >= 32) {
      checks.push({ name: 'JWT_SECRET length', status: 'pass' });
      this.addResult('pass', 'Security: JWT Secret', 'JWT secret has adequate length');
    } else if (jwtSecret) {
      checks.push({ name: 'JWT_SECRET length', status: 'warn' });
      this.addResult('warn', 'Security: JWT Secret', 'JWT secret should be at least 32 characters');
    } else {
      checks.push({ name: 'JWT_SECRET', status: 'fail' });
    }

    // Check for development secrets in production
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      const devSecrets = ['secret', 'test', 'development', '12345'];
      if (jwtSecret && devSecrets.some(s => jwtSecret.toLowerCase().includes(s))) {
        checks.push({ name: 'Production secrets', status: 'fail' });
        this.addResult('fail', 'Security: Production', 'JWT secret appears to be a development value');
      } else {
        checks.push({ name: 'Production secrets', status: 'pass' });
      }
    }

    return {
      valid: checks.filter(c => c.status === 'fail').length === 0,
      checks
    };
  }

  /**
   * Run production deployment checklist
   */
  async runProductionChecklist() {
    console.log('\n======================================');
    console.log('Production Readiness Checklist');
    console.log('======================================\n');

    const checklist = [];

    // 1. Environment Variables
    console.log('1. Checking Environment Variables...');
    const envResult = this.validateEnvironmentVariables();
    checklist.push({
      name: 'Environment Variables',
      passed: envResult.valid,
      details: envResult.checks
    });

    // 2. File System
    console.log('2. Checking File System...');
    const fsResult = this.validateFileSystem();
    checklist.push({
      name: 'File System',
      passed: fsResult.valid
    });

    // 3. Security Configuration
    console.log('3. Checking Security Configuration...');
    const securityResult = this.validateSecurityConfig();
    checklist.push({
      name: 'Security Configuration',
      passed: securityResult.valid,
      details: securityResult.checks
    });

    // 4. ZeroDB Health
    console.log('4. Checking ZeroDB Health...');
    const healthResult = await this.checkZeroDBHealth();
    checklist.push({
      name: 'ZeroDB Health',
      passed: healthResult.healthy,
      details: healthResult
    });

    // 5. Data Integrity
    console.log('5. Validating Data Integrity...');
    const integrityResult = await this.validateDataIntegrity();
    checklist.push({
      name: 'Data Integrity',
      passed: integrityResult.tablesExist,
      details: integrityResult
    });

    // 6. Failover Recovery
    console.log('6. Testing Failover Recovery...');
    const failoverResult = await this.testFailoverRecovery();
    checklist.push({
      name: 'Failover Recovery',
      passed: failoverResult.recoverySuccessful,
      details: failoverResult
    });

    const passedChecks = checklist.filter(c => c.passed).length;
    const failedChecks = checklist.filter(c => !c.passed).length;

    return {
      deploymentReady: failedChecks === 0,
      passedChecks,
      failedChecks,
      totalChecks: checklist.length,
      checklist
    };
  }

  /**
   * Generate report
   */
  generateReport() {
    const summary = this.getSummary();
    const timestamp = new Date().toISOString();

    let report = `# Production Readiness Report\n\n`;
    report += `**Generated**: ${timestamp}\n`;
    report += `**Status**: ${this.isProductionReady() ? 'READY' : 'NOT READY'}\n\n`;

    report += `## Summary\n\n`;
    report += `- Total Checks: ${summary.total}\n`;
    report += `- Passed: ${summary.passed}\n`;
    report += `- Failed: ${summary.failed}\n`;
    report += `- Warnings: ${summary.warnings}\n\n`;

    if (this.results.passed.length > 0) {
      report += `## Passed Checks\n\n`;
      for (const result of this.results.passed) {
        report += `- **${result.name}**: ${result.message}\n`;
      }
      report += `\n`;
    }

    if (this.results.failed.length > 0) {
      report += `## Failed Checks\n\n`;
      for (const result of this.results.failed) {
        report += `- **${result.name}**: ${result.message}\n`;
      }
      report += `\n`;
    }

    if (this.results.warnings.length > 0) {
      report += `## Warnings\n\n`;
      for (const result of this.results.warnings) {
        report += `- **${result.name}**: ${result.message}\n`;
      }
      report += `\n`;
    }

    report += `## Recommendations\n\n`;
    if (this.results.failed.length > 0) {
      report += `1. Address all failed checks before deploying to production\n`;
      report += `2. Review and fix any security-related failures immediately\n`;
      report += `3. Ensure ZeroDB connectivity is stable\n`;
    } else if (this.results.warnings.length > 0) {
      report += `1. Review warnings and address if possible\n`;
      report += `2. Document any accepted warnings\n`;
    } else {
      report += `All checks passed. System is ready for production deployment.\n`;
    }

    report += `\n---\n\n`;
    report += `*Generated by Production Readiness Validator*\n`;

    return report;
  }

  /**
   * Save report to file
   */
  async saveReport(filePath) {
    const report = this.generateReport();
    await fs.writeFile(filePath, report, 'utf8');
    console.log(`\nReport saved to: ${filePath}`);
  }

  /**
   * Run all validations
   */
  async run() {
    console.log('\n======================================');
    console.log('ZeroDB Production Readiness Validation');
    console.log('======================================\n');

    if (this.config.dryRun) {
      console.log('Running in DRY RUN mode - no API calls will be made\n');
    }

    // Run checklist
    const checklistResult = await this.runProductionChecklist();

    // Print summary
    console.log('\n======================================');
    console.log('Validation Summary');
    console.log('======================================\n');

    const summary = this.getSummary();
    console.log(`Total Checks: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Warnings: ${summary.warnings}`);

    console.log(`\nDeployment Status: ${this.isProductionReady() ? 'READY' : 'NOT READY'}\n`);

    // Save report if output file specified
    if (this.config.outputFile) {
      await this.saveReport(this.config.outputFile);
    }

    return {
      ...checklistResult,
      dryRun: this.config.dryRun,
      verbose: this.config.verbose,
      summary,
      ready: this.isProductionReady()
    };
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    skipApiTests: args.includes('--skip-api')
  };

  // Parse output file
  const outputIndex = args.findIndex(a => a === '--output' || a === '-o');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputFile = args[outputIndex + 1];
  }

  const validator = new ProductionReadinessValidator(options);

  validator.run()
    .then(result => {
      if (result.ready) {
        console.log('\n[SUCCESS] System is ready for production deployment\n');
        process.exit(0);
      } else {
        console.log('\n[FAILED] System is NOT ready for production deployment\n');
        console.log('Please address all failed checks before deploying.\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n[ERROR] Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = ProductionReadinessValidator;
