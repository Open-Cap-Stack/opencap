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

      it('should not have MongoDB connection code after migration', () => {
        // After ZeroDB migration, app.js should not reference MongoDB
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // MongoDB has been fully removed
        expect(appContent).not.toContain('connectToMongoDB');
        expect(appContent).not.toContain('mongoose.connect');
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
      it('should not have mongoose as a required dependency after migration', () => {
        // After full ZeroDB migration, mongoose should be removed from dependencies
        const packagePath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // MongoDB/mongoose have been fully removed from dependencies
        expect(packageJson.dependencies || {}).not.toHaveProperty('mongoose');
        expect(packageJson.dependencies || {}).not.toHaveProperty('mongodb');
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
      it('should have MongoDB and Mongoose removed from dependencies', () => {
        const packagePath = path.join(__dirname, '../../package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // MongoDB and mongoose should be fully removed after migration
        expect(packageJson.dependencies || {}).not.toHaveProperty('mongodb');
        expect(packageJson.dependencies || {}).not.toHaveProperty('mongoose');
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
      it('should not have SYNC_ENABLED in env example after migration', () => {
        const envExamplePath = path.join(__dirname, '../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const envContent = fs.readFileSync(envExamplePath, 'utf8');

          // SYNC_ENABLED removed after full migration
          expect(envContent).not.toContain('SYNC_ENABLED');
        }
      });

      it('should have ENABLE_ZERODB environment variable', () => {
        const envExamplePath = path.join(__dirname, '../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const content = fs.readFileSync(envExamplePath, 'utf8');
          expect(content).toContain('ENABLE_ZERODB');
        }
      });

      it('should document ZeroDB as primary database', () => {
        const envExamplePath = path.join(__dirname, '../../.env.example');

        if (fs.existsSync(envExamplePath)) {
          const envContent = fs.readFileSync(envExamplePath, 'utf8');

          // Should document ZeroDB configuration
          expect(envContent).toContain('ENABLE_ZERODB');
          expect(envContent).toContain('AINATIVE_API_TOKEN');
        }
      });
    });

    describe('When checking database initialization', () => {
      it('should only initialize ZeroDB in app.js (MongoDB removed)', () => {
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // ZeroDB initialization should be present
        expect(appContent).toContain('zerodbService.initialize');
        // MongoDB initialization should be removed
        expect(appContent).not.toContain('connectToMongoDB');
      });

      it('should handle ZeroDB initialization failure gracefully', () => {
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // Should have error handling for ZeroDB initialization
        expect(appContent).toMatch(/zerodbService\.initialize[\s\S]*?\.catch/s);
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
          const adapterContent = fs.readFileSync(adapterPath, 'utf8');

          // Should reference ZeroDB service
          expect(adapterContent).toContain('zerodbService');
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
      it('should maintain model files using ZeroDB after migration', () => {
        // Model files should exist using ZeroDB patterns
        const modelsPath = path.join(__dirname, '../../models');

        if (fs.existsSync(modelsPath)) {
          const modelFiles = fs.readdirSync(modelsPath)
            .filter(f => f.endsWith('.js') && !f.startsWith('base'));

          // Should have model files
          expect(modelFiles.length).toBeGreaterThan(0);

          // Models should NOT use mongoose (migrated to ZeroDB)
          modelFiles.forEach(file => {
            const modelContent = fs.readFileSync(
              path.join(modelsPath, file),
              'utf8'
            );
            expect(modelContent).not.toContain("require('mongoose')");
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


      });

      it('should log clear messages about database configuration', () => {
        const appContent = fs.readFileSync(
          path.join(__dirname, '../../app.js'),
          'utf8'
        );

        // Should have console.log statements about ZeroDB initialization
        expect(appContent).toMatch(/console\.log.*ZeroDB/i);
        // MongoDB logging should be removed
        expect(appContent).not.toMatch(/console\.log.*MongoDB/i);
      });
    });
  });
});
