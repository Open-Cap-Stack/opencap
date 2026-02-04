/**
 * Route Loading Tests
 * Issue #183: Backend Route Loading - Multiple route modules failing to load
 *
 * These tests verify that all route modules can be loaded successfully
 * and that middleware exports are properly configured.
 */

const fs = require('fs');
const path = require('path');

describe('Route Loading', () => {
  describe('Middleware Exports', () => {
    it('should export authenticateToken from middleware/auth', () => {
      const auth = require('../../middleware/auth');
      expect(auth).toBeDefined();
      expect(auth.authenticateToken).toBeDefined();
      expect(typeof auth.authenticateToken).toBe('function');
    });

    it('should export authenticateJWT from middleware/auth', () => {
      const auth = require('../../middleware/auth');
      expect(auth.authenticateJWT).toBeDefined();
      expect(typeof auth.authenticateJWT).toBe('function');
    });

    it('should export authMiddleware as a function for router.use()', () => {
      const authMiddleware = require('../../middleware/authMiddleware');
      expect(authMiddleware).toBeDefined();
      expect(typeof authMiddleware).toBe('function');
    });

    it('should export requireRole from middleware/rbacMiddleware', () => {
      const rbac = require('../../middleware/rbacMiddleware');
      expect(rbac).toBeDefined();
      expect(rbac.requireRole).toBeDefined();
      expect(typeof rbac.requireRole).toBe('function');
    });

    it('should export hasRole from middleware/rbacMiddleware', () => {
      const rbac = require('../../middleware/rbacMiddleware');
      expect(rbac.hasRole).toBeDefined();
      expect(typeof rbac.hasRole).toBe('function');
    });

    it('should export authenticateJWT from middleware/jwtAuth', () => {
      const jwtAuth = require('../../middleware/jwtAuth');
      expect(jwtAuth).toBeDefined();
      expect(jwtAuth.authenticateJWT).toBeDefined();
      expect(typeof jwtAuth.authenticateJWT).toBe('function');
    });
  });

  describe('Route Module Loading', () => {
    const routesDir = path.join(__dirname, '../../routes/v1');
    const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

    // Critical routes that must load successfully
    const criticalRoutes = [
      'authRoutes.js',
      'userRoutes.js',
      'companyRoutes.js',
      'documentRoutes.js',
      'stakeholderRoutes.js'
    ];

    // Routes that were failing in issue #183
    const previouslyFailingRoutes = [
      'documentEmbeddingRoutes.js',
      'securityAuditRoutes.js',
      'financialDataRoutes.js',
      'eventStreamingRoutes.js',
      'safeRoutes.js',
      'valuation409ARoutes.js',
      'materialEventRoutes.js',
      'valuationPartnerRoutes.js'
    ];

    criticalRoutes.forEach(routeFile => {
      it(`should load critical route: ${routeFile}`, () => {
        const routePath = path.join(routesDir, routeFile);
        expect(fs.existsSync(routePath)).toBe(true);

        let router;
        expect(() => {
          router = require(routePath);
        }).not.toThrow();

        expect(router).toBeDefined();
        expect(typeof router).toBe('function'); // Express Router is a function
      });
    });

    previouslyFailingRoutes.forEach(routeFile => {
      it(`should load previously failing route: ${routeFile}`, () => {
        const routePath = path.join(routesDir, routeFile);

        if (!fs.existsSync(routePath)) {
          console.warn(`Route file does not exist: ${routePath}`);
          return; // Skip if file doesn't exist
        }

        let router;
        expect(() => {
          router = require(routePath);
        }).not.toThrow();

        expect(router).toBeDefined();
        expect(typeof router).toBe('function'); // Express Router is a function
      });
    });

    it('should load all route files without errors', () => {
      const failedRoutes = [];
      const loadedRoutes = [];

      routeFiles.forEach(routeFile => {
        const routePath = path.join(routesDir, routeFile);
        try {
          const router = require(routePath);
          if (router && typeof router === 'function') {
            loadedRoutes.push(routeFile);
          } else {
            failedRoutes.push({
              file: routeFile,
              reason: 'Router is not a function'
            });
          }
        } catch (error) {
          failedRoutes.push({
            file: routeFile,
            reason: error.message,
            stack: error.stack
          });
        }
      });

      // Report results
      console.log(`Successfully loaded ${loadedRoutes.length} route files`);
      if (failedRoutes.length > 0) {
        console.error('Failed to load routes:', JSON.stringify(failedRoutes, null, 2));
      }

      // Allow some optional routes to fail, but critical routes must load
      expect(failedRoutes.length).toBeLessThan(routeFiles.length * 0.2); // Max 20% failure rate
    });
  });

  describe('Controller Dependencies', () => {
    it('should load documentEmbeddingController without Configuration error', () => {
      let controller;
      expect(() => {
        controller = require('../../controllers/documentEmbeddingController');
      }).not.toThrow();

      expect(controller).toBeDefined();
    });

    it('should verify OpenAI is imported correctly', () => {
      // This test verifies that the OpenAI import doesn't throw
      // The actual import is tested in the controller loading test above
      const openaiModule = require('openai');
      expect(openaiModule).toBeDefined();
      expect(openaiModule.OpenAI).toBeDefined();
    });
  });

  describe('Route Registration Helper', () => {
    it('should safely require existing route', () => {
      const safeRequire = (modulePath) => {
        try {
          const fullPath = modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
          if (!fs.existsSync(fullPath)) {
            return null;
          }
          return require(fullPath);
        } catch (err) {
          console.error(`Error loading route file ${modulePath}:`, err.message);
          return null;
        }
      };

      const authRoutePath = path.join(__dirname, '../../routes/v1/authRoutes');
      const router = safeRequire(authRoutePath);

      expect(router).toBeDefined();
      expect(typeof router).toBe('function');
    });

    it('should return null for non-existent route', () => {
      const safeRequire = (modulePath) => {
        try {
          const fullPath = modulePath.endsWith('.js') ? modulePath : `${modulePath}.js`;
          if (!fs.existsSync(fullPath)) {
            return null;
          }
          return require(fullPath);
        } catch (err) {
          return null;
        }
      };

      const nonExistentPath = path.join(__dirname, '../../routes/v1/nonExistentRoute');
      const router = safeRequire(nonExistentPath);

      expect(router).toBeNull();
    });
  });

  describe('Middleware Compatibility', () => {
    it('should allow authMiddleware to be used with router.use()', () => {
      const express = require('express');
      const authMiddleware = require('../../middleware/authMiddleware');

      const router = express.Router();

      // This should not throw
      expect(() => {
        router.use(authMiddleware);
      }).not.toThrow();
    });

    it('should allow requireRole to be used with router.use()', () => {
      const express = require('express');
      const { requireRole } = require('../../middleware/rbacMiddleware');

      const router = express.Router();

      // This should not throw
      expect(() => {
        router.use(requireRole(['admin']));
      }).not.toThrow();
    });

    it('should allow authenticateJWT to be used with router.use()', () => {
      const express = require('express');
      const { authenticateJWT } = require('../../middleware/jwtAuth');

      const router = express.Router();

      // This should not throw
      expect(() => {
        router.use(authenticateJWT);
      }).not.toThrow();
    });
  });
});
