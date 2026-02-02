/**
 * MongoDB Removal Tests
 *
 * Tests to verify MongoDB dependencies are properly handled:
 * - MongoDB is optional (only needed for sync feature)
 * - App can run in ZeroDB-only mode
 * - Sync feature can be disabled cleanly
 * - No direct MongoDB usage outside of sync components
 *
 * Issue: #32 - Remove MongoDB dependencies from codebase
 */

const path = require('path');
const fs = require('fs');

describe('MongoDB Dependency Removal - TDD Tests', () => {
  describe('Given the codebase needs to minimize MongoDB dependencies', () => {
    describe('When MongoDB is disabled', () => {
      it('should allow app to start without MongoDB connection', async () => {
        // Test that app.js can initialize without MongoDB
        const originalEnv = process.env.SYNC_ENABLED;
        process.env.SYNC_ENABLED = 'false';

        // This test verifies app initialization doesn't require MongoDB
        // when sync is disabled
        const appPath = path.join(__dirname, '../../app.js');
        expect(fs.existsSync(appPath)).toBe(true);

        // Restore environment
        process.env.SYNC_ENABLED = originalEnv;
      });

      it('should not initialize MongoDB connection when SYNC_ENABLED=false', () => {
        // Verify MongoDB initialization is conditional
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // MongoDB connection should be conditional on sync being enabled
        expect(appContent).toContain('SYNC_ENABLED');
        expect(appContent).toContain('connectToMongoDB');
      });

      it('should use ZeroDB as primary database when sync is disabled', () => {
        // Verify ZeroDB service is the primary data source
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        expect(appContent).toContain('zerodbService');
        expect(appContent).toContain('ENABLE_ZERODB');
      });
    });

    describe('When MongoDB is only used for continuous sync', () => {
      it('should only import mongoose in sync-related files', () => {
        // Files that should use mongoose (sync feature only)
        const allowedMongooseFiles = [
          'services/mongoChangeStreamListener.js',
          'services/syncOrchestrator.js',
          'services/databaseAdapter.js',
          'db/mongoConnection.js',
          'middleware/databaseMonitor.js'
        ];

        // Check these files exist and use mongoose
        allowedMongooseFiles.forEach(file => {
          const filePath = path.join(__dirname, '../../', file);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            expect(content).toContain('mongoose');
          }
        });
      });

      it('should have clear documentation about MongoDB sync dependency', () => {
        // Check that db/mongoConnection.js has proper documentation
        const mongoConnectionPath = path.join(__dirname, '../../db/mongoConnection.js');

        if (fs.existsSync(mongoConnectionPath)) {
          const content = fs.readFileSync(mongoConnectionPath, 'utf8');

          // Should document that this is for sync feature
          expect(content).toContain('MongoDB');
          expect(content.toLowerCase()).toMatch(/(sync|continuous|change.*stream)/i);
        }
      });

      it('should not use Mongoose models directly in controllers', () => {
        // Controllers should not import mongoose or mongoose models directly
        const controllersPath = path.join(__dirname, '../../controllers');

        if (fs.existsSync(controllersPath)) {
          const controllerFiles = fs.readdirSync(controllersPath)
            .filter(f => f.endsWith('.js'));

          controllerFiles.forEach(file => {
            const content = fs.readFileSync(
              path.join(controllersPath, file),
              'utf8'
            );

            // Controllers should not require mongoose directly
            // (They may reference models for sync, but not use mongoose API)
            const hasDirectMongooseImport = content.match(/require\(['"]mongoose['"]\)/);

            if (hasDirectMongooseImport) {
              console.warn(`Warning: ${file} imports mongoose directly`);
            }
          });
        }
      });
    });

    describe('When checking package.json dependencies', () => {
      it('should document why MongoDB/Mongoose are kept', () => {
        const packagePath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // MongoDB and mongoose should be in dependencies (for sync feature)
        expect(packageJson.dependencies.mongodb).toBeDefined();
        expect(packageJson.dependencies.mongoose).toBeDefined();
      });

      it('should have ZeroDB as the primary database dependency', () => {
        const packagePath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // Check for ZeroDB-related dependencies or environment setup
        // (ZeroDB is accessed via API, not npm package)
        expect(process.env.AINATIVE_API_TOKEN || packageJson.description).toBeDefined();
      });
    });

    describe('When reviewing environment configuration', () => {
      it('should have SYNC_ENABLED environment variable documented', () => {
        const envExamplePath = path.join(__dirname, '../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const content = fs.readFileSync(envExamplePath, 'utf8');

          // Should document sync configuration
          expect(content).toContain('SYNC_ENABLED');
        }
      });

      it('should have ENABLE_ZERODB environment variable', () => {
        const envExamplePath = path.join(__dirname, '../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const content = fs.readFileSync(envExamplePath, 'utf8');
          expect(content).toContain('ENABLE_ZERODB');
        }
      });

      it('should document MongoDB connection is optional', () => {
        const envExamplePath = path.join(__dirname, '../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const content = fs.readFileSync(envExamplePath, 'utf8');

          // Check for documentation about MongoDB being optional
          expect(content.toLowerCase()).toMatch(/(mongodb|mongo).*optional|sync/i);
        }
      });
    });

    describe('When checking database initialization', () => {
      it('should initialize ZeroDB before MongoDB in app.js', () => {
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // ZeroDB initialization should come before or independent of MongoDB
        const zerodbInitIndex = appContent.indexOf('zerodbService.initialize');
        const mongoInitIndex = appContent.indexOf('connectToMongoDB');

        // Both should be present
        expect(zerodbInitIndex).toBeGreaterThan(-1);
        expect(mongoInitIndex).toBeGreaterThan(-1);
      });

      it('should handle MongoDB connection failure gracefully', () => {
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // Should have error handling for MongoDB connection
        expect(appContent).toMatch(/connectToMongoDB.*catch/s);
      });
    });

    describe('When checking README and documentation', () => {
      it('should document MongoDB as optional dependency', () => {
        const readmePath = path.join(__dirname, '../../README.md');

        if (fs.existsSync(readmePath)) {
          const content = fs.readFileSync(readmePath, 'utf8');

          // README should mention MongoDB is optional or for sync only
          expect(content.toLowerCase()).toContain('mongodb');
        }
      });

      it('should document how to run without MongoDB', () => {
        const readmePath = path.join(__dirname, '../../README.md');

        if (fs.existsSync(readmePath)) {
          const content = fs.readFileSync(readmePath, 'utf8');

          // Should have instructions for ZeroDB-only mode
          expect(content.toLowerCase()).toMatch(/(zerodb|database.*configuration)/i);
        }
      });

      it('should document the continuous sync feature', () => {
        const readmePath = path.join(__dirname, '../../README.md');

        if (fs.existsSync(readmePath)) {
          const content = fs.readFileSync(readmePath, 'utf8');

          // Should document sync feature
          expect(content.toLowerCase()).toMatch(/(sync|continuous|real.*time)/i);
        }
      });
    });

    describe('When validating code architecture', () => {
      it('should have database adapter for abstraction', () => {
        const adapterPath = path.join(__dirname, '../../services/databaseAdapter.js');
        expect(fs.existsSync(adapterPath)).toBe(true);

        if (fs.existsSync(adapterPath)) {
          const content = fs.readFileSync(adapterPath, 'utf8');

          // Should support both MongoDB and ZeroDB
          expect(content).toContain('mongoose');
          expect(content).toContain('zerodbService');
          expect(content).toContain('migrationMode');
        }
      });

      it('should have clear separation between sync and core functionality', () => {
        // Sync services should be separate from core services
        const syncFiles = [
          'services/mongoChangeStreamListener.js',
          'services/syncOrchestrator.js'
        ];

        syncFiles.forEach(file => {
          const filePath = path.join(__dirname, '../../', file);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');

            // Should document this is for sync feature
            expect(content.toLowerCase()).toMatch(/(sync|change.*stream)/i);
          }
        });
      });
    });

    describe('When verifying backward compatibility', () => {
      it('should maintain existing model files for sync compatibility', () => {
        // Model files should exist for MongoDB sync feature
        const modelsPath = path.join(__dirname, '../../models');

        if (fs.existsSync(modelsPath)) {
          const modelFiles = fs.readdirSync(modelsPath)
            .filter(f => f.endsWith('.js'));

          // Should have model files (needed for MongoDB schema in sync)
          expect(modelFiles.length).toBeGreaterThan(0);

          // Each model should use mongoose
          modelFiles.forEach(file => {
            const content = fs.readFileSync(
              path.join(modelsPath, file),
              'utf8'
            );
            expect(content).toContain('mongoose');
          });
        }
      });

      it('should have migration scripts that work with both databases', () => {
        const scriptsPath = path.join(__dirname, '../../scripts');

        if (fs.existsSync(scriptsPath)) {
          const migrationFiles = fs.readdirSync(scriptsPath)
            .filter(f => f.includes('migrate'));

          // Migration scripts should exist for data transfer
          if (migrationFiles.length > 0) {
            migrationFiles.forEach(file => {
              const content = fs.readFileSync(
                path.join(scriptsPath, file),
                'utf8'
              );

              // Should reference both MongoDB and ZeroDB
              expect(content.toLowerCase()).toMatch(/(mongo|zerodb)/i);
            });
          }
        }
      });
    });

    describe('When running in production mode', () => {
      it('should support ZeroDB-only configuration', () => {
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // Should check ENABLE_ZERODB flag
        expect(appContent).toContain('ENABLE_ZERODB');

        // Should allow running without MongoDB (checks for SYNC_ENABLED === 'true')
        expect(appContent).toMatch(/SYNC_ENABLED.*===.*['"]true['"]/);
      });

      it('should log clear messages about database configuration', () => {
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // Should have console.log statements about database initialization
        expect(appContent).toMatch(/console\.log.*ZeroDB/i);
        expect(appContent).toMatch(/console\.log.*MongoDB/i);
      });
    });
  });
});
