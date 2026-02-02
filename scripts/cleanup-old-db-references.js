#!/usr/bin/env node

/**
 * Database Reference Cleanup Script
 *
 * Automated tool to detect and report old database references (MongoDB, Neo4j, PostgreSQL)
 * that should be migrated to ZeroDB as part of Phase 6 cleanup.
 *
 * Usage: node scripts/cleanup-old-db-references.js [--fix] [--report-only]
 *
 * CRITICAL: Issues #32, #33, #34 - Database Migration Cleanup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DatabaseReferenceCleanup {
  constructor(options = {}) {
    this.fix = options.fix || false;
    this.reportOnly = options.reportOnly || false;
    this.rootDir = path.resolve(__dirname, '..');

    this.results = {
      mongodbReferences: [],
      neo4jReferences: [],
      postgresReferences: [],
      deadCode: [],
      unusedImports: [],
      todoComments: [],
      securityIssues: []
    };

    this.stats = {
      filesScanned: 0,
      issuesFound: 0,
      issuesFixed: 0
    };

    // Patterns to detect
    this.patterns = {
      mongodb: [
        /mongoose\./g,
        /require\(['"]mongoose['"]\)/g,
        /require\(['"]mongodb['"]\)/g,
        /new\s+mongoose\.Schema/g,
        /mongoose\.model\(/g,
        /mongoose\.connect/g,
        /MongoDB/gi,
        /MONGO_URI/g,
        /MONGODB_/g
      ],
      neo4j: [
        /require\(['"]neo4j-driver['"]\)/g,
        /neo4j\./g,
        /Neo4j/gi,
        /NEO4J_/g,
        /bolt:\/\//g
      ],
      postgres: [
        /require\(['"]pg['"]\)/g,
        /new\s+Pool\(/g,
        /\.query\(/g,
        /postgres/gi,
        /postgresql/gi,
        /POSTGRES_/g,
        /PG_/g
      ]
    };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🔍 Database Reference Cleanup Tool');
    console.log('=' .repeat(60));
    console.log(`Mode: ${this.fix ? 'FIX' : 'SCAN ONLY'}`);
    console.log(`Root Directory: ${this.rootDir}\n`);

    try {
      // Step 1: Scan JavaScript files
      await this.scanJavaScriptFiles();

      // Step 2: Check package.json dependencies
      await this.checkDependencies();

      // Step 3: Check environment variables
      await this.checkEnvironmentFiles();

      // Step 4: Check configuration files
      await this.checkConfigurationFiles();

      // Step 5: Find TODO/FIXME comments
      await this.findTodoComments();

      // Step 6: Detect dead code
      await this.detectDeadCode();

      // Step 7: Generate report
      this.generateReport();

      // Step 8: Apply fixes if requested
      if (this.fix) {
        await this.applyFixes();
      }

      // Step 9: Save report to file
      await this.saveReport();

      return this.results;
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Scan all JavaScript files for database references
   */
  async scanJavaScriptFiles() {
    console.log('📁 Scanning JavaScript files...');

    const excludeDirs = ['node_modules', 'frontend', '.git', 'coverage', 'dist', 'build'];
    const files = this.getAllJSFiles(this.rootDir, excludeDirs);

    for (const filePath of files) {
      this.stats.filesScanned++;
      await this.scanFile(filePath);
    }

    console.log(`✅ Scanned ${this.stats.filesScanned} files\n`);
  }

  /**
   * Scan individual file for database references
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relPath = path.relative(this.rootDir, filePath);

      // Check for MongoDB references
      for (const pattern of this.patterns.mongodb) {
        const matches = content.match(pattern);
        if (matches) {
          this.results.mongodbReferences.push({
            file: relPath,
            pattern: pattern.toString(),
            count: matches.length,
            lines: this.getLineNumbers(content, pattern)
          });
          this.stats.issuesFound++;
        }
      }

      // Check for Neo4j references
      for (const pattern of this.patterns.neo4j) {
        const matches = content.match(pattern);
        if (matches) {
          this.results.neo4jReferences.push({
            file: relPath,
            pattern: pattern.toString(),
            count: matches.length,
            lines: this.getLineNumbers(content, pattern)
          });
          this.stats.issuesFound++;
        }
      }

      // Check for PostgreSQL references
      for (const pattern of this.patterns.postgres) {
        const matches = content.match(pattern);
        if (matches) {
          this.results.postgresReferences.push({
            file: relPath,
            pattern: pattern.toString(),
            count: matches.length,
            lines: this.getLineNumbers(content, pattern)
          });
          this.stats.issuesFound++;
        }
      }

      // Check for unused imports
      this.checkUnusedImports(filePath, content);

    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
    }
  }

  /**
   * Get line numbers where pattern matches
   */
  getLineNumbers(content, pattern) {
    const lines = content.split('\n');
    const lineNumbers = [];

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        lineNumbers.push(index + 1);
      }
    });

    return lineNumbers;
  }

  /**
   * Check for unused imports
   */
  checkUnusedImports(filePath, content) {
    const requirePattern = /const\s+(\w+)\s+=\s+require\(['"](.*?)['"]\)/g;
    const imports = [];
    let match;

    while ((match = requirePattern.exec(content)) !== null) {
      const varName = match[1];
      const moduleName = match[2];

      // Check if variable is used elsewhere in file
      const varUsagePattern = new RegExp(`\\b${varName}\\b`, 'g');
      const matches = content.match(varUsagePattern) || [];

      // If only one match (the import itself), it's unused
      if (matches.length === 1 &&
          (moduleName.includes('mongo') || moduleName.includes('neo4j') || moduleName === 'pg')) {
        this.results.unusedImports.push({
          file: path.relative(this.rootDir, filePath),
          variable: varName,
          module: moduleName,
          line: this.getLineNumbers(content, new RegExp(match[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))[0]
        });
      }
    }
  }

  /**
   * Check package.json dependencies
   */
  async checkDependencies() {
    console.log('📦 Checking package.json dependencies...');

    const packagePath = path.join(this.rootDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    const oldDeps = {
      mongodb: [],
      neo4j: [],
      postgres: []
    };

    // Check dependencies
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };

    for (const [dep, version] of Object.entries(allDeps)) {
      if (dep.includes('mongo')) {
        oldDeps.mongodb.push({ name: dep, version });
      }
      if (dep.includes('neo4j')) {
        oldDeps.neo4j.push({ name: dep, version });
      }
      if (dep === 'pg' || dep.includes('postgres')) {
        oldDeps.postgres.push({ name: dep, version });
      }
    }

    if (oldDeps.mongodb.length > 0) {
      console.log(`⚠️  Found ${oldDeps.mongodb.length} MongoDB dependencies`);
      this.results.mongodbReferences.push({
        file: 'package.json',
        type: 'dependencies',
        packages: oldDeps.mongodb
      });
    }

    if (oldDeps.neo4j.length > 0) {
      console.log(`⚠️  Found ${oldDeps.neo4j.length} Neo4j dependencies`);
      this.results.neo4jReferences.push({
        file: 'package.json',
        type: 'dependencies',
        packages: oldDeps.neo4j
      });
    }

    if (oldDeps.postgres.length > 0) {
      console.log(`⚠️  Found ${oldDeps.postgres.length} PostgreSQL dependencies`);
      this.results.postgresReferences.push({
        file: 'package.json',
        type: 'dependencies',
        packages: oldDeps.postgres
      });
    }

    console.log('');
  }

  /**
   * Check environment files for old database configs
   */
  async checkEnvironmentFiles() {
    console.log('🔐 Checking environment files...');

    const envFiles = ['.env.example', '.env.template'];

    for (const envFile of envFiles) {
      const envPath = path.join(this.rootDir, envFile);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');

        // Check for old database env vars
        const oldVars = [];

        if (content.includes('MONGO')) {
          oldVars.push(...content.match(/MONGO[A-Z_]*/g) || []);
        }
        if (content.includes('NEO4J')) {
          oldVars.push(...content.match(/NEO4J[A-Z_]*/g) || []);
        }
        if (content.includes('POSTGRES') || content.includes('PG_')) {
          oldVars.push(...content.match(/(?:POSTGRES|PG)[A-Z_]*/g) || []);
        }

        if (oldVars.length > 0) {
          console.log(`⚠️  Found ${oldVars.length} old environment variables in ${envFile}`);
          this.results.mongodbReferences.push({
            file: envFile,
            type: 'environment',
            variables: [...new Set(oldVars)]
          });
        }
      }
    }

    console.log('');
  }

  /**
   * Check configuration files
   */
  async checkConfigurationFiles() {
    console.log('⚙️  Checking configuration files...');

    const configFiles = [
      'docker-compose.yml',
      'docker-compose.yaml',
      'docker-compose.simple.yml',
      'Dockerfile'
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(this.rootDir, configFile);
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');

        if (content.includes('mongo') || content.includes('27017')) {
          console.log(`⚠️  Found MongoDB references in ${configFile}`);
          this.results.mongodbReferences.push({
            file: configFile,
            type: 'docker-config',
            issue: 'Contains MongoDB service definition'
          });
        }

        if (content.includes('neo4j') || content.includes('7687')) {
          console.log(`⚠️  Found Neo4j references in ${configFile}`);
          this.results.neo4jReferences.push({
            file: configFile,
            type: 'docker-config',
            issue: 'Contains Neo4j service definition'
          });
        }

        if (content.includes('postgres') || content.includes('5432')) {
          console.log(`⚠️  Found PostgreSQL references in ${configFile}`);
          this.results.postgresReferences.push({
            file: configFile,
            type: 'docker-config',
            issue: 'Contains PostgreSQL service definition'
          });
        }
      }
    }

    console.log('');
  }

  /**
   * Find TODO/FIXME comments related to migration
   */
  async findTodoComments() {
    console.log('📝 Finding TODO/FIXME comments...');

    try {
      const grepCommand = `grep -r "TODO\\|FIXME\\|HACK\\|XXX" --include="*.js" --exclude-dir=node_modules --exclude-dir=frontend ${this.rootDir} || true`;
      const output = execSync(grepCommand, { encoding: 'utf8' });

      const lines = output.split('\n').filter(line => line.trim());
      this.results.todoComments = lines.map(line => {
        const [filePath, ...rest] = line.split(':');
        return {
          file: path.relative(this.rootDir, filePath),
          comment: rest.join(':').trim()
        };
      });

      console.log(`Found ${this.results.todoComments.length} TODO/FIXME comments\n`);
    } catch (error) {
      console.log('No TODO/FIXME comments found or grep failed\n');
    }
  }

  /**
   * Detect dead code (files that should be removed)
   */
  async detectDeadCode() {
    console.log('🗑️  Detecting dead code...');

    const deadCodeCandidates = [
      'db.js',
      'db/mongoConnection.js',
      'db/neo4j.js',
      'models/GraphModels.js',
      'init-scripts/mongo',
      'deployment/kubernetes/mongodb.yaml',
      'deployment/kubernetes/postgres.yaml',
      'deployment/kubernetes/neo4j.yaml'
    ];

    for (const candidate of deadCodeCandidates) {
      const fullPath = path.join(this.rootDir, candidate);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        this.results.deadCode.push({
          path: candidate,
          type: stats.isDirectory() ? 'directory' : 'file',
          reason: 'Legacy database code - should be removed after ZeroDB migration'
        });
      }
    }

    console.log(`Found ${this.results.deadCode.length} dead code items\n`);
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP REPORT');
    console.log('='.repeat(60) + '\n');

    console.log('📈 Statistics:');
    console.log(`   Files Scanned: ${this.stats.filesScanned}`);
    console.log(`   Issues Found: ${this.stats.issuesFound}`);
    console.log(`   Issues Fixed: ${this.stats.issuesFixed}\n`);

    if (this.results.mongodbReferences.length > 0) {
      console.log(`⚠️  MongoDB References: ${this.results.mongodbReferences.length}`);
      console.log('   Action Required: Remove MongoDB dependencies (Issue #32)');
    }

    if (this.results.neo4jReferences.length > 0) {
      console.log(`⚠️  Neo4j References: ${this.results.neo4jReferences.length}`);
      console.log('   Action Required: Remove Neo4j dependencies (Issue #34)');
    }

    if (this.results.postgresReferences.length > 0) {
      console.log(`⚠️  PostgreSQL References: ${this.results.postgresReferences.length}`);
      console.log('   Action Required: Remove PostgreSQL dependencies (Issue #34)');
    }

    if (this.results.deadCode.length > 0) {
      console.log(`\n🗑️  Dead Code Items: ${this.results.deadCode.length}`);
      this.results.deadCode.forEach(item => {
        console.log(`   - ${item.path} (${item.type})`);
      });
    }

    if (this.results.unusedImports.length > 0) {
      console.log(`\n📦 Unused Imports: ${this.results.unusedImports.length}`);
      console.log('   These imports should be removed for code cleanup');
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  /**
   * Apply automatic fixes
   */
  async applyFixes() {
    console.log('🔧 Applying automatic fixes...');

    // Remove unused imports
    for (const item of this.results.unusedImports) {
      try {
        const filePath = path.join(this.rootDir, item.file);
        let content = fs.readFileSync(filePath, 'utf8');

        // Remove the require line
        const requirePattern = new RegExp(`const\\s+${item.variable}\\s+=\\s+require\\(['"](.*?)['"]\);?\\s*\\n`, 'g');
        content = content.replace(requirePattern, '');

        fs.writeFileSync(filePath, content, 'utf8');
        this.stats.issuesFixed++;
        console.log(`   ✅ Removed unused import from ${item.file}`);
      } catch (error) {
        console.error(`   ❌ Failed to fix ${item.file}:`, error.message);
      }
    }

    console.log(`\nFixed ${this.stats.issuesFixed} issues automatically\n`);
  }

  /**
   * Save report to file
   */
  async saveReport() {
    const reportPath = path.join(this.rootDir, 'docs', 'DATABASE_CLEANUP_REPORT.md');

    const report = this.generateMarkdownReport();

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report, 'utf8');

    console.log(`📄 Full report saved to: ${path.relative(this.rootDir, reportPath)}`);
  }

  /**
   * Generate Markdown report
   */
  generateMarkdownReport() {
    const timestamp = new Date().toISOString();

    let report = `# Database Cleanup Report\n\n`;
    report += `Generated: ${timestamp}\n\n`;
    report += `## Summary\n\n`;
    report += `- **Files Scanned**: ${this.stats.filesScanned}\n`;
    report += `- **Issues Found**: ${this.stats.issuesFound}\n`;
    report += `- **Issues Fixed**: ${this.stats.issuesFixed}\n\n`;

    report += `## Issues by Category\n\n`;

    if (this.results.mongodbReferences.length > 0) {
      report += `### MongoDB References (${this.results.mongodbReferences.length})\n\n`;
      report += `**Action Required**: Remove MongoDB dependencies (Issue #32)\n\n`;
      report += `Files affected:\n`;
      this.results.mongodbReferences.forEach(ref => {
        report += `- \`${ref.file}\`\n`;
      });
      report += `\n`;
    }

    if (this.results.neo4jReferences.length > 0) {
      report += `### Neo4j References (${this.results.neo4jReferences.length})\n\n`;
      report += `**Action Required**: Remove Neo4j dependencies (Issue #34)\n\n`;
      report += `Files affected:\n`;
      this.results.neo4jReferences.forEach(ref => {
        report += `- \`${ref.file}\`\n`;
      });
      report += `\n`;
    }

    if (this.results.postgresReferences.length > 0) {
      report += `### PostgreSQL References (${this.results.postgresReferences.length})\n\n`;
      report += `**Action Required**: Remove PostgreSQL dependencies (Issue #34)\n\n`;
      report += `Files affected:\n`;
      this.results.postgresReferences.forEach(ref => {
        report += `- \`${ref.file}\`\n`;
      });
      report += `\n`;
    }

    if (this.results.deadCode.length > 0) {
      report += `### Dead Code Items (${this.results.deadCode.length})\n\n`;
      report += `Files/directories that should be removed:\n\n`;
      this.results.deadCode.forEach(item => {
        report += `- \`${item.path}\` - ${item.reason}\n`;
      });
      report += `\n`;
    }

    report += `## Recommendations\n\n`;
    report += `1. **Phase 6.1 (Issue #32)**: Remove all MongoDB dependencies from package.json\n`;
    report += `2. **Phase 6.2 (Issue #33)**: Remove MongoDB from Docker configurations\n`;
    report += `3. **Phase 6.3 (Issue #34)**: Remove Neo4j and PostgreSQL dependencies\n`;
    report += `4. **Code Cleanup**: Remove dead code files and unused imports\n`;
    report += `5. **Testing**: Ensure all tests pass after cleanup\n`;
    report += `6. **Documentation**: Update README and architecture docs\n\n`;

    report += `## Next Steps\n\n`;
    report += `- [ ] Review this report\n`;
    report += `- [ ] Create backup before making changes\n`;
    report += `- [ ] Execute cleanup in phases\n`;
    report += `- [ ] Run full test suite after each phase\n`;
    report += `- [ ] Update deployment configurations\n`;
    report += `- [ ] Document migration completion\n\n`;

    return report;
  }

  /**
   * Get all JavaScript files recursively
   */
  getAllJSFiles(dir, excludeDirs = []) {
    const files = [];

    const scan = (currentDir) => {
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
    };

    scan(dir);
    return files;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    fix: args.includes('--fix'),
    reportOnly: args.includes('--report-only')
  };

  const cleanup = new DatabaseReferenceCleanup(options);

  cleanup.run()
    .then(() => {
      console.log('✅ Cleanup scan completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup scan failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseReferenceCleanup;
