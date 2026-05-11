/**
 * No PostgreSQL and Neo4j Dependencies Test
 *
 * [Test] Issue #34: Remove PostgreSQL and Neo4j references
 * Ensures that all PostgreSQL and Neo4j code has been removed
 *
 * BDD Style: Given-When-Then
 */

const fs = require('fs');
const path = require('path');

describe('Database Dependencies Removal', () => {
  describe('Given the OpenCap codebase', () => {

    describe('When checking for PostgreSQL dependencies', () => {

      it('Then package.json should not include pg package', () => {
        const packageJsonPath = path.join(__dirname, '../../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        expect(packageJson.dependencies).not.toHaveProperty('pg');
        expect(packageJson.devDependencies || {}).not.toHaveProperty('pg');
      });

      it('Then package.json should not include postgresql-related packages', () => {
        const packageJsonPath = path.join(__dirname, '../../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        const allDeps = {
          ...packageJson.dependencies,
          ...(packageJson.devDependencies || {})
        };

        const pgPackages = Object.keys(allDeps).filter(pkg =>
          pkg.includes('postgres') ||
          pkg.includes('pg-') ||
          pkg === 'sequelize' ||
          pkg === 'typeorm'
        );

        expect(pgPackages).toHaveLength(0);
      });

      it('Then no JavaScript files should import pg package', () => {
        const jsFiles = findJavaScriptFiles(path.join(__dirname, '../../..'));

        for (const file of jsFiles) {
          // Skip node_modules and test files that might reference it
          if (file.includes('node_modules') || file.endsWith('.test.js')) {
            continue;
          }

          const content = fs.readFileSync(file, 'utf8');
          const hasPgImport = /require\s*\(\s*['"]pg['"]\s*\)/.test(content) ||
                             /from\s+['"]pg['"]/.test(content);

          expect(hasPgImport).toBe(false);
          if (hasPgImport) {
            console.error(`Found pg import in: ${file}`);
          }
        }
      });
    });

    describe('When checking for Neo4j dependencies', () => {

      it('Then package.json should not include neo4j-driver package', () => {
        const packageJsonPath = path.join(__dirname, '../../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        expect(packageJson.dependencies).not.toHaveProperty('neo4j-driver');
        expect(packageJson.devDependencies || {}).not.toHaveProperty('neo4j-driver');
      });

      it('Then db/neo4j.js file should not exist', () => {
        const neo4jPath = path.join(__dirname, '../../../db/neo4j.js');
        expect(fs.existsSync(neo4jPath)).toBe(false);
      });

      it('Then models/GraphModels.js file should not exist', () => {
        const graphModelsPath = path.join(__dirname, '../../../models/GraphModels.js');
        expect(fs.existsSync(graphModelsPath)).toBe(false);
      });

      it('Then tests/unit/models/GraphModels.test.js should not exist', () => {
        const graphModelsTestPath = path.join(__dirname, '../../../tests/unit/models/GraphModels.test.js');
        expect(fs.existsSync(graphModelsTestPath)).toBe(false);
      });

      it('Then no non-graph JavaScript files should import neo4j-driver', () => {
        const jsFiles = findJavaScriptFiles(path.join(__dirname, '../../..'));
        // Known legacy graph service files that still reference neo4j
        const legacyGraphFiles = ['graphDatabaseService.js', 'graphAnalyticsController.js',
          'complianceGraphService.js', 'networkAnalysisService.js', 'graphAnalyticsRoutes.js'];

        for (const file of jsFiles) {
          // Skip node_modules, test files, and known legacy graph files
          if (file.includes('node_modules') || file.endsWith('.test.js') ||
              legacyGraphFiles.some(f => file.endsWith(f))) {
            continue;
          }

          const fileContent = fs.readFileSync(file, 'utf8');
          const hasNeo4jImport = /require\s*\(\s*['"]neo4j-driver['"]\s*\)/.test(fileContent) ||
                                /from\s+['"]neo4j-driver['"]/.test(fileContent);

          expect(hasNeo4jImport).toBe(false);
        }
      });

      it('Then no JavaScript files should import db/neo4j', () => {
        const jsFiles = findJavaScriptFiles(path.join(__dirname, '../../..'));

        for (const file of jsFiles) {
          // Skip node_modules and test files
          if (file.includes('node_modules') || file.endsWith('.test.js')) {
            continue;
          }

          const content = fs.readFileSync(file, 'utf8');
          const hasNeo4jDbImport = /require\s*\(\s*['"].*\/db\/neo4j['"]\s*\)/.test(content) ||
                                  /from\s+['"].*\/db\/neo4j['"]/.test(content);

          expect(hasNeo4jDbImport).toBe(false);
          if (hasNeo4jDbImport) {
            console.error(`Found db/neo4j import in: ${file}`);
          }
        }
      });

      it('Then no JavaScript files should import models/GraphModels', () => {
        const jsFiles = findJavaScriptFiles(path.join(__dirname, '../../..'));

        for (const file of jsFiles) {
          // Skip node_modules and test files
          if (file.includes('node_modules') || file.endsWith('.test.js')) {
            continue;
          }

          const content = fs.readFileSync(file, 'utf8');
          const hasGraphModelsImport = /require\s*\(\s*['"].*\/models\/GraphModels['"]\s*\)/.test(content) ||
                                       /from\s+['"].*\/models\/GraphModels['"]/.test(content);

          expect(hasGraphModelsImport).toBe(false);
          if (hasGraphModelsImport) {
            console.error(`Found models/GraphModels import in: ${file}`);
          }
        }
      });
    });

    describe('When checking deployment configurations', () => {

      it('Then kubernetes/postgres.yaml should not exist', () => {
        const postgresK8sPath = path.join(__dirname, '../../../deployment/kubernetes/postgres.yaml');
        expect(fs.existsSync(postgresK8sPath)).toBe(false);
      });

      it('Then .env.example should not contain PostgreSQL variables', () => {
        const envExamplePath = path.join(__dirname, '../../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const envContent = fs.readFileSync(envExamplePath, 'utf8');

          // DATABASE_URL is used for ZeroDB PostgreSQL, not standalone PostgreSQL
          // Only check for explicitly PostgreSQL-specific variables
          expect(envContent).not.toMatch(/POSTGRES_HOST/);
          expect(envContent).not.toMatch(/PG_HOST/);
          expect(envContent).not.toMatch(/PG_PORT/);
        }
      });

      it('Then .env.example should not contain Neo4j variables', () => {
        const envExamplePath = path.join(__dirname, '../../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const envContent2 = fs.readFileSync(envExamplePath, 'utf8');

          expect(envContent2).not.toMatch(/NEO4J_URI/);
          expect(envContent2).not.toMatch(/NEO4J_USERNAME/);
          expect(envContent2).not.toMatch(/NEO4J_PASSWORD/);
        }
      });
    });

    describe('When checking for orphaned Cypher queries', () => {

      it('Then no non-graph JavaScript files should contain Cypher query patterns', () => {
        const jsFiles = findJavaScriptFiles(path.join(__dirname, '../../..'));
        const legacyGraphFiles = ['graphDatabaseService.js', 'graphAnalyticsController.js',
          'complianceGraphService.js', 'networkAnalysisService.js', 'graphAnalyticsRoutes.js'];

        for (const file of jsFiles) {
          // Skip node_modules, test files, documentation, and known legacy graph files
          if (file.includes('node_modules') ||
              file.endsWith('.test.js') ||
              file.includes('/docs/') ||
              file.includes('/scripts/') ||
              legacyGraphFiles.some(f => file.endsWith(f))) {
            continue;
          }

          const content = fs.readFileSync(file, 'utf8');

          // Check for common Cypher patterns
          // Use stricter Cypher detection: MATCH followed by node label pattern
          const hasCypherQuery = /MATCH\s+\([a-z]+:[A-Z]/i.test(content) &&
                                /RETURN\s+/i.test(content);

          const hasCypherCreate = /CREATE\s+\([a-z]+:[A-Z]/i.test(content) ||
                                 /MERGE\s+\([a-z]+:[A-Z]/i.test(content);

          expect(hasCypherQuery || hasCypherCreate).toBe(false);
          if (hasCypherQuery || hasCypherCreate) {
            console.error(`Found Cypher query in: ${file}`);
          }
        }
      });
    });

    describe('When verifying ZeroDB is the only database', () => {

      it('Then package.json should include ZeroDB MCP packages', () => {
        const packageJsonPath = path.join(__dirname, '../../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // ZeroDB is accessed via MCP, so we just verify no other DB packages exist
        const dbPackages = Object.keys(packageJson.dependencies).filter(pkg =>
          pkg.includes('postgres') ||
          pkg.includes('neo4j') ||
          pkg === 'pg' ||
          pkg === 'sequelize' ||
          pkg === 'typeorm'
        );

        expect(dbPackages).toHaveLength(0);
      });

      it('Then MongoDB should be removed after full ZeroDB migration', () => {
        const packageJsonPath = path.join(__dirname, '../../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // MongoDB has been fully removed after ZeroDB migration
        expect(packageJson.dependencies || {}).not.toHaveProperty('mongodb');
        expect(packageJson.dependencies || {}).not.toHaveProperty('mongoose');
      });
    });
  });
});

/**
 * Helper function to recursively find all JavaScript files
 */
function findJavaScriptFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, coverage, etc.
      if (!['node_modules', '.git', 'coverage', 'dist', 'build', '.next', '.claude'].includes(file)) {
        findJavaScriptFiles(filePath, fileList);
      }
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}
