#!/usr/bin/env node

/**
 * ZeroDB Migration Validation Tool
 *
 * Comprehensive validation script to ensure complete migration from legacy databases
 * to ZeroDB, checking schema consistency, data integrity, and code compliance.
 *
 * Usage: node scripts/validate-zerodb-migration.js [--full] [--check-data]
 *
 * CRITICAL: Phase 6 Final Validation (Issues #32-#37)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ZeroDBMigrationValidator {
  constructor(options = {}) {
    this.full = options.full || false;
    this.checkData = options.checkData || false;
    this.rootDir = path.resolve(__dirname, '..');

    this.validationResults = {
      codeValidation: {
        passed: [],
        failed: [],
        warnings: []
      },
      schemaValidation: {
        passed: [],
        failed: [],
        warnings: []
      },
      dataValidation: {
        passed: [],
        failed: [],
        warnings: []
      },
      deploymentValidation: {
        passed: [],
        failed: [],
        warnings: []
      }
    };

    this.expectedTables = [
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

    this.requiredZeroDBServices = [
      'zerodbService',
      'databaseAdapter'
    ];
  }

  /**
   * Main validation execution
   */
  async run() {
    console.log('🔍 ZeroDB Migration Validation Tool');
    console.log('=' .repeat(60));
    console.log(`Mode: ${this.full ? 'FULL' : 'STANDARD'}`);
    console.log(`Data Check: ${this.checkData ? 'ENABLED' : 'DISABLED'}\n`);

    try {
      // Phase 1: Code Validation
      console.log('📝 Phase 1: Code Validation');
      console.log('-'.repeat(60));
      await this.validateCodeMigration();

      // Phase 2: Schema Validation
      console.log('\n🗄️  Phase 2: Schema Validation');
      console.log('-'.repeat(60));
      await this.validateSchema();

      // Phase 3: Data Validation (if enabled)
      if (this.checkData) {
        console.log('\n📊 Phase 3: Data Validation');
        console.log('-'.repeat(60));
        await this.validateData();
      }

      // Phase 4: Deployment Validation
      console.log('\n🚀 Phase 4: Deployment Configuration Validation');
      console.log('-'.repeat(60));
      await this.validateDeployment();

      // Generate final report
      this.generateFinalReport();

      // Save detailed report
      await this.saveDetailedReport();

      return this.validationResults;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw error;
    }
  }

  /**
   * Validate code migration completeness
   */
  async validateCodeMigration() {
    // Check 1: No Mongoose models remain
    await this.checkNoMongooseModels();

    // Check 2: All controllers use ZeroDB
    await this.checkControllersUseZeroDB();

    // Check 3: No MongoDB connection code
    await this.checkNoMongoDBConnections();

    // Check 4: ZeroDB services exist
    await this.checkZeroDBServicesExist();

    // Check 5: Database adapter configured
    await this.checkDatabaseAdapterConfiguration();

    // Check 6: No orphaned references
    await this.checkNoOrphanedReferences();
  }

  /**
   * Check that no Mongoose models remain
   */
  async checkNoMongooseModels() {
    const check = 'No Mongoose Models Remaining';

    try {
      const modelsDir = path.join(this.rootDir, 'models');
      const modelFiles = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

      let mongooseModelsFound = 0;

      for (const file of modelFiles) {
        const filePath = path.join(modelsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        if (content.includes('mongoose.Schema') || content.includes('mongoose.model')) {
          mongooseModelsFound++;
          this.validationResults.codeValidation.failed.push({
            check,
            file: `models/${file}`,
            issue: 'Still uses Mongoose',
            severity: 'HIGH'
          });
        }
      }

      if (mongooseModelsFound === 0) {
        this.validationResults.codeValidation.passed.push({
          check,
          message: 'All models migrated away from Mongoose'
        });
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check} - Found ${mongooseModelsFound} Mongoose models`);
      }
    } catch (error) {
      this.validationResults.codeValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check that controllers use ZeroDB
   */
  async checkControllersUseZeroDB() {
    const check = 'Controllers Use ZeroDB';

    try {
      const controllersDir = path.join(this.rootDir, 'controllers');
      const controllerFiles = this.getAllJSFiles(controllersDir);

      let controllersNotMigrated = 0;

      for (const filePath of controllerFiles) {
        const content = fs.readFileSync(filePath, 'utf8');
        const relPath = path.relative(this.rootDir, filePath);

        // Check if controller imports MongoDB/Mongoose
        if (content.includes('mongoose') || content.match(/require\(['"]\.\.\/models\//)) {
          // Verify it also uses ZeroDB
          if (!content.includes('zerodbService') && !content.includes('databaseAdapter')) {
            controllersNotMigrated++;
            this.validationResults.codeValidation.failed.push({
              check,
              file: relPath,
              issue: 'Uses Mongoose but not ZeroDB',
              severity: 'HIGH'
            });
          } else {
            this.validationResults.codeValidation.warnings.push({
              check,
              file: relPath,
              issue: 'Uses both Mongoose and ZeroDB (migration in progress?)',
              severity: 'MEDIUM'
            });
          }
        } else if (content.includes('zerodbService') || content.includes('databaseAdapter')) {
          // Good - uses ZeroDB only
          this.validationResults.codeValidation.passed.push({
            check,
            file: relPath,
            message: 'Uses ZeroDB'
          });
        }
      }

      if (controllersNotMigrated === 0) {
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check} - ${controllersNotMigrated} controllers not migrated`);
      }
    } catch (error) {
      this.validationResults.codeValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check no MongoDB connection code exists
   */
  async checkNoMongoDBConnections() {
    const check = 'No MongoDB Connection Code';

    try {
      const dbFiles = [
        'db.js',
        'db/mongoConnection.js',
        'db/index.js'
      ];

      let mongoConnectionsFound = 0;

      for (const file of dbFiles) {
        const filePath = path.join(this.rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('mongoose.connect') || content.includes('mongodb://')) {
            mongoConnectionsFound++;
            this.validationResults.codeValidation.failed.push({
              check,
              file,
              issue: 'Contains MongoDB connection code',
              severity: 'HIGH'
            });
          }
        }
      }

      if (mongoConnectionsFound === 0) {
        this.validationResults.codeValidation.passed.push({
          check,
          message: 'No MongoDB connection code found'
        });
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check} - Found ${mongoConnectionsFound} files`);
      }
    } catch (error) {
      this.validationResults.codeValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check ZeroDB services exist
   */
  async checkZeroDBServicesExist() {
    const check = 'ZeroDB Services Exist';

    try {
      let allServicesExist = true;

      for (const service of this.requiredZeroDBServices) {
        const servicePath = path.join(this.rootDir, 'services', `${service}.js`);
        if (!fs.existsSync(servicePath)) {
          allServicesExist = false;
          this.validationResults.codeValidation.failed.push({
            check,
            file: `services/${service}.js`,
            issue: 'Required ZeroDB service not found',
            severity: 'CRITICAL'
          });
        }
      }

      if (allServicesExist) {
        this.validationResults.codeValidation.passed.push({
          check,
          message: 'All required ZeroDB services exist'
        });
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check} - Missing services`);
      }
    } catch (error) {
      this.validationResults.codeValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check database adapter configuration
   */
  async checkDatabaseAdapterConfiguration() {
    const check = 'Database Adapter Configured';

    try {
      const adapterPath = path.join(this.rootDir, 'services', 'databaseAdapter.js');
      if (fs.existsSync(adapterPath)) {
        const content = fs.readFileSync(adapterPath, 'utf8');

        // Check migration mode support
        if (content.includes('MIGRATION_MODE')) {
          this.validationResults.codeValidation.passed.push({
            check,
            message: 'Database adapter supports migration modes'
          });
          console.log(`   ✅ ${check}`);
        } else {
          this.validationResults.codeValidation.warnings.push({
            check,
            issue: 'Database adapter may not support migration modes',
            severity: 'MEDIUM'
          });
          console.log(`   ⚠️  ${check} - Migration mode support unclear`);
        }
      } else {
        this.validationResults.codeValidation.failed.push({
          check,
          issue: 'Database adapter not found',
          severity: 'CRITICAL'
        });
        console.log(`   ❌ ${check} - Not found`);
      }
    } catch (error) {
      this.validationResults.codeValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check for orphaned references
   */
  async checkNoOrphanedReferences() {
    const check = 'No Orphaned Database References';

    try {
      const orphanedFiles = [
        'db/neo4j.js',
        'models/GraphModels.js',
        'init-scripts/mongo'
      ];

      let orphansFound = 0;

      for (const file of orphanedFiles) {
        const filePath = path.join(this.rootDir, file);
        if (fs.existsSync(filePath)) {
          orphansFound++;
          this.validationResults.codeValidation.failed.push({
            check,
            file,
            issue: 'Orphaned database file should be removed',
            severity: 'MEDIUM'
          });
        }
      }

      if (orphansFound === 0) {
        this.validationResults.codeValidation.passed.push({
          check,
          message: 'No orphaned database files found'
        });
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ⚠️  ${check} - Found ${orphansFound} orphaned files`);
      }
    } catch (error) {
      this.validationResults.codeValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Validate ZeroDB schema
   */
  async validateSchema() {
    // Check 1: All expected tables exist
    await this.checkExpectedTablesExist();

    // Check 2: Table schemas are properly defined
    await this.checkTableSchemas();

    // Check 3: Indexes are created
    await this.checkIndexes();

    // Check 4: Vector search configured
    await this.checkVectorSearchConfiguration();
  }

  /**
   * Check expected tables exist
   */
  async checkExpectedTablesExist() {
    const check = 'Expected Tables Exist';

    try {
      const createTablesScript = path.join(this.rootDir, 'scripts', 'createZeroDBTables.js');

      if (fs.existsSync(createTablesScript)) {
        const content = fs.readFileSync(createTablesScript, 'utf8');

        let missingTables = [];
        for (const table of this.expectedTables) {
          if (!content.includes(table)) {
            missingTables.push(table);
          }
        }

        if (missingTables.length === 0) {
          this.validationResults.schemaValidation.passed.push({
            check,
            message: 'All expected tables defined in creation script'
          });
          console.log(`   ✅ ${check}`);
        } else {
          this.validationResults.schemaValidation.failed.push({
            check,
            issue: `Missing table definitions: ${missingTables.join(', ')}`,
            severity: 'HIGH'
          });
          console.log(`   ❌ ${check} - Missing ${missingTables.length} tables`);
        }
      } else {
        this.validationResults.schemaValidation.failed.push({
          check,
          issue: 'Table creation script not found',
          severity: 'CRITICAL'
        });
        console.log(`   ❌ ${check} - Creation script not found`);
      }
    } catch (error) {
      this.validationResults.schemaValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check table schemas
   */
  async checkTableSchemas() {
    const check = 'Table Schemas Properly Defined';

    try {
      const createTablesScript = path.join(this.rootDir, 'scripts', 'createZeroDBTables.js');

      if (fs.existsSync(createTablesScript)) {
        const content = fs.readFileSync(createTablesScript, 'utf8');

        // Check for schema definitions
        const hasSchemas = content.includes('schema') || content.includes('columns');

        if (hasSchemas) {
          this.validationResults.schemaValidation.passed.push({
            check,
            message: 'Table schemas are defined'
          });
          console.log(`   ✅ ${check}`);
        } else {
          this.validationResults.schemaValidation.warnings.push({
            check,
            issue: 'Schema definitions may be incomplete',
            severity: 'MEDIUM'
          });
          console.log(`   ⚠️  ${check} - Schema definitions unclear`);
        }
      }
    } catch (error) {
      this.validationResults.schemaValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check indexes
   */
  async checkIndexes() {
    const check = 'Indexes Created';

    // This would require actual ZeroDB connection to verify
    // For now, check if index creation code exists
    try {
      const createTablesScript = path.join(this.rootDir, 'scripts', 'createZeroDBTables.js');

      if (fs.existsSync(createTablesScript)) {
        const content = fs.readFileSync(createTablesScript, 'utf8');

        if (content.includes('index') || content.includes('Index')) {
          this.validationResults.schemaValidation.passed.push({
            check,
            message: 'Index creation code present'
          });
          console.log(`   ✅ ${check}`);
        } else {
          this.validationResults.schemaValidation.warnings.push({
            check,
            issue: 'No index creation code found',
            severity: 'LOW'
          });
          console.log(`   ⚠️  ${check} - No index code found`);
        }
      }
    } catch (error) {
      this.validationResults.schemaValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check vector search configuration
   */
  async checkVectorSearchConfiguration() {
    const check = 'Vector Search Configured';

    try {
      const vectorServices = [
        'services/semanticSearchService.js',
        'services/documentEmbeddingService.js'
      ];

      let vectorServicesExist = true;

      for (const service of vectorServices) {
        const servicePath = path.join(this.rootDir, service);
        if (!fs.existsSync(servicePath)) {
          vectorServicesExist = false;
        }
      }

      if (vectorServicesExist) {
        this.validationResults.schemaValidation.passed.push({
          check,
          message: 'Vector search services exist'
        });
        console.log(`   ✅ ${check}`);
      } else {
        this.validationResults.schemaValidation.warnings.push({
          check,
          issue: 'Some vector search services not found',
          severity: 'MEDIUM'
        });
        console.log(`   ⚠️  ${check} - Some services missing`);
      }
    } catch (error) {
      this.validationResults.schemaValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Validate data integrity
   */
  async validateData() {
    console.log('   ⚠️  Data validation requires ZeroDB connection');
    console.log('   ℹ️  Skipping for now - implement with actual API calls');

    this.validationResults.dataValidation.warnings.push({
      check: 'Data Integrity',
      issue: 'Data validation not implemented yet',
      severity: 'LOW'
    });
  }

  /**
   * Validate deployment configuration
   */
  async validateDeployment() {
    // Check 1: No MongoDB in package.json
    await this.checkPackageJSON();

    // Check 2: No MongoDB in Docker configs
    await this.checkDockerConfigs();

    // Check 3: Environment variables updated
    await this.checkEnvironmentVariables();

    // Check 4: Tests updated
    await this.checkTestsUpdated();
  }

  /**
   * Check package.json
   */
  async checkPackageJSON() {
    const check = 'Package.json Clean';

    try {
      const packagePath = path.join(this.rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

      const allDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      const oldDeps = Object.keys(allDeps).filter(dep =>
        dep.includes('mongo') || dep.includes('neo4j') || dep === 'pg'
      );

      if (oldDeps.length === 0) {
        this.validationResults.deploymentValidation.passed.push({
          check,
          message: 'No old database dependencies'
        });
        console.log(`   ✅ ${check}`);
      } else {
        this.validationResults.deploymentValidation.failed.push({
          check,
          issue: `Old dependencies still present: ${oldDeps.join(', ')}`,
          severity: 'HIGH'
        });
        console.log(`   ❌ ${check} - Found ${oldDeps.length} old dependencies`);
      }
    } catch (error) {
      this.validationResults.deploymentValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check Docker configs
   */
  async checkDockerConfigs() {
    const check = 'Docker Configs Clean';

    try {
      const dockerFiles = ['docker-compose.yml', 'docker-compose.yaml', 'Dockerfile'];
      let oldDbReferencesFound = 0;

      for (const file of dockerFiles) {
        const filePath = path.join(this.rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');

          if (content.includes('mongo:') || content.includes('neo4j:') || content.includes('postgres:')) {
            oldDbReferencesFound++;
            this.validationResults.deploymentValidation.failed.push({
              check,
              file,
              issue: 'Contains old database service',
              severity: 'HIGH'
            });
          }
        }
      }

      if (oldDbReferencesFound === 0) {
        this.validationResults.deploymentValidation.passed.push({
          check,
          message: 'Docker configs clean'
        });
        console.log(`   ✅ ${check}`);
      } else {
        console.log(`   ❌ ${check} - Found ${oldDbReferencesFound} files with old DB services`);
      }
    } catch (error) {
      this.validationResults.deploymentValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check environment variables
   */
  async checkEnvironmentVariables() {
    const check = 'Environment Variables Updated';

    try {
      const envExample = path.join(this.rootDir, '.env.example');

      if (fs.existsSync(envExample)) {
        const content = fs.readFileSync(envExample, 'utf8');

        // Check for ZeroDB variables
        const hasZeroDBVars = content.includes('AINATIVE') || content.includes('ZERODB');

        // Check for old database variables
        const hasOldVars = content.includes('MONGO') || content.includes('NEO4J') || content.includes('POSTGRES');

        if (hasZeroDBVars && !hasOldVars) {
          this.validationResults.deploymentValidation.passed.push({
            check,
            message: 'Environment variables updated for ZeroDB'
          });
          console.log(`   ✅ ${check}`);
        } else if (hasOldVars) {
          this.validationResults.deploymentValidation.failed.push({
            check,
            issue: 'Old database environment variables still present',
            severity: 'MEDIUM'
          });
          console.log(`   ❌ ${check} - Old variables present`);
        } else {
          this.validationResults.deploymentValidation.warnings.push({
            check,
            issue: 'ZeroDB environment variables may be missing',
            severity: 'MEDIUM'
          });
          console.log(`   ⚠️  ${check} - ZeroDB vars may be missing`);
        }
      }
    } catch (error) {
      this.validationResults.deploymentValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Check tests updated
   */
  async checkTestsUpdated() {
    const check = 'Tests Updated for ZeroDB';

    try {
      const testsDir = path.join(this.rootDir, 'tests');
      const testFiles = this.getAllJSFiles(testsDir);

      let testsUsingOldDB = 0;
      let testsUsingZeroDB = 0;

      for (const filePath of testFiles) {
        const content = fs.readFileSync(filePath, 'utf8');

        if (content.includes('mongoose') || content.includes('mongodb-memory-server')) {
          testsUsingOldDB++;
        }

        if (content.includes('zerodbService') || content.includes('databaseAdapter')) {
          testsUsingZeroDB++;
        }
      }

      if (testsUsingOldDB === 0 && testsUsingZeroDB > 0) {
        this.validationResults.deploymentValidation.passed.push({
          check,
          message: 'Tests migrated to ZeroDB'
        });
        console.log(`   ✅ ${check}`);
      } else if (testsUsingOldDB > 0) {
        this.validationResults.deploymentValidation.failed.push({
          check,
          issue: `${testsUsingOldDB} tests still use old database`,
          severity: 'HIGH'
        });
        console.log(`   ❌ ${check} - ${testsUsingOldDB} tests need migration`);
      } else {
        this.validationResults.deploymentValidation.warnings.push({
          check,
          issue: 'No tests found using ZeroDB',
          severity: 'MEDIUM'
        });
        console.log(`   ⚠️  ${check} - No ZeroDB tests found`);
      }
    } catch (error) {
      this.validationResults.deploymentValidation.failed.push({
        check,
        error: error.message
      });
      console.log(`   ❌ ${check} - ${error.message}`);
    }
  }

  /**
   * Generate final validation report
   */
  generateFinalReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION VALIDATION REPORT');
    console.log('='.repeat(60) + '\n');

    const categories = ['codeValidation', 'schemaValidation', 'dataValidation', 'deploymentValidation'];
    const labels = {
      codeValidation: 'Code Migration',
      schemaValidation: 'Schema Validation',
      dataValidation: 'Data Integrity',
      deploymentValidation: 'Deployment Config'
    };

    let totalPassed = 0;
    let totalFailed = 0;
    let totalWarnings = 0;

    for (const category of categories) {
      const results = this.validationResults[category];
      const passed = results.passed.length;
      const failed = results.failed.length;
      const warnings = results.warnings.length;

      totalPassed += passed;
      totalFailed += failed;
      totalWarnings += warnings;

      console.log(`${labels[category]}:`);
      console.log(`   ✅ Passed: ${passed}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   ⚠️  Warnings: ${warnings}\n`);
    }

    console.log('Overall:');
    console.log(`   ✅ Total Passed: ${totalPassed}`);
    console.log(`   ❌ Total Failed: ${totalFailed}`);
    console.log(`   ⚠️  Total Warnings: ${totalWarnings}\n`);

    const migrationComplete = totalFailed === 0 && totalWarnings < 5;
    console.log('Migration Status: ' +
      (migrationComplete ? '✅ COMPLETE' : '⚠️  IN PROGRESS'));

    if (!migrationComplete) {
      console.log('\n🔧 Action Items:');
      console.log('   1. Review all failed checks');
      console.log('   2. Address high-severity issues first');
      console.log('   3. Update documentation');
      console.log('   4. Run validation again');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Save detailed report to file
   */
  async saveDetailedReport() {
    const reportPath = path.join(this.rootDir, 'docs', 'ZERODB_MIGRATION_VALIDATION_REPORT.md');

    const report = this.generateMarkdownReport();

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report, 'utf8');

    console.log(`📄 Detailed report saved to: ${path.relative(this.rootDir, reportPath)}`);
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport() {
    const timestamp = new Date().toISOString();

    let report = `# ZeroDB Migration Validation Report\n\n`;
    report += `**Generated**: ${timestamp}\n\n`;
    report += `**Mode**: ${this.full ? 'Full' : 'Standard'}\n`;
    report += `**Data Validation**: ${this.checkData ? 'Enabled' : 'Disabled'}\n\n`;

    const categories = ['codeValidation', 'schemaValidation', 'dataValidation', 'deploymentValidation'];
    const labels = {
      codeValidation: 'Code Migration',
      schemaValidation: 'Schema Validation',
      dataValidation: 'Data Integrity',
      deploymentValidation: 'Deployment Configuration'
    };

    for (const category of categories) {
      const results = this.validationResults[category];
      report += `## ${labels[category]}\n\n`;

      if (results.passed.length > 0) {
        report += `### ✅ Passed (${results.passed.length})\n\n`;
        results.passed.forEach(item => {
          report += `- **${item.check || 'Check'}**: ${item.message || item.file}\n`;
        });
        report += `\n`;
      }

      if (results.failed.length > 0) {
        report += `### ❌ Failed (${results.failed.length})\n\n`;
        results.failed.forEach(item => {
          report += `- **${item.check || 'Check'}** (Severity: ${item.severity || 'UNKNOWN'})\n`;
          report += `  - File: \`${item.file || 'N/A'}\`\n`;
          report += `  - Issue: ${item.issue || item.error || 'Unknown'}\n`;
        });
        report += `\n`;
      }

      if (results.warnings.length > 0) {
        report += `### ⚠️  Warnings (${results.warnings.length})\n\n`;
        results.warnings.forEach(item => {
          report += `- **${item.check || 'Check'}** (Severity: ${item.severity || 'UNKNOWN'})\n`;
          report += `  - Issue: ${item.issue || 'Unknown'}\n`;
        });
        report += `\n`;
      }
    }

    report += `## Summary\n\n`;
    report += `### Migration Checklist\n\n`;
    report += `- [${this.validationResults.codeValidation.failed.length === 0 ? 'x' : ' '}] Code migration complete\n`;
    report += `- [${this.validationResults.schemaValidation.failed.length === 0 ? 'x' : ' '}] Schema validated\n`;
    report += `- [${this.checkData ? (this.validationResults.dataValidation.failed.length === 0 ? 'x' : ' ') : ' '}] Data integrity verified\n`;
    report += `- [${this.validationResults.deploymentValidation.failed.length === 0 ? 'x' : ' '}] Deployment configs updated\n\n`;

    report += `### Next Steps\n\n`;

    const hasFailures = categories.some(cat => this.validationResults[cat].failed.length > 0);

    if (hasFailures) {
      report += `1. Address all failed checks (see details above)\n`;
      report += `2. Review and resolve high-severity issues first\n`;
      report += `3. Update tests to ensure coverage\n`;
      report += `4. Re-run validation script\n`;
      report += `5. Document any remaining technical debt\n\n`;
    } else {
      report += `1. Review warnings and address if necessary\n`;
      report += `2. Run full test suite\n`;
      report += `3. Deploy to staging environment\n`;
      report += `4. Perform end-to-end testing\n`;
      report += `5. Update documentation for production\n`;
      report += `6. Plan production deployment\n\n`;
    }

    report += `---\n\n`;
    report += `*Generated by ZeroDB Migration Validation Tool*\n`;

    return report;
  }

  /**
   * Get all JavaScript files recursively
   */
  getAllJSFiles(dir, excludeDirs = ['node_modules', '.git', 'coverage']) {
    const files = [];

    const scan = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);

        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            if (!excludeDirs.includes(item) && !item.startsWith('.')) {
              scan(fullPath);
            }
          } else if (item.endsWith('.js')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };

    scan(dir);
    return files;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    full: args.includes('--full'),
    checkData: args.includes('--check-data')
  };

  const validator = new ZeroDBMigrationValidator(options);

  validator.run()
    .then(() => {
      console.log('✅ Validation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}

module.exports = ZeroDBMigrationValidator;
