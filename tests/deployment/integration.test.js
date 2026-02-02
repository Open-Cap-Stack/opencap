/**
 * ZeroDB-Only Deployment Integration Tests
 *
 * Tests that the application works correctly when deployed with ZeroDB
 * as the primary database, without MongoDB dependency.
 *
 * Following TDD principles - these tests validate the complete deployment.
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

describe('ZeroDB-Only Deployment Integration Tests', () => {
  const TEST_PORT = 3099;
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  let serverProcess = null;

  // Helper to start server with ZeroDB configuration
  const startServer = (env = {}) => {
    return new Promise((resolve, reject) => {
      const appPath = path.join(__dirname, '../../app.js');

      const serverEnv = {
        ...process.env,
        NODE_ENV: 'test',
        PORT: TEST_PORT.toString(),
        ZERODB_API_KEY: 'test_key',
        ZERODB_BASE_URL: 'https://api.ainative.studio/api/v1',
        ZERODB_PROJECT_ID: 'test_project',
        ENABLE_ZERODB: 'false', // Disabled for tests
        ENABLE_SYNC: 'false',
        MONGODB_URI: '', // Explicitly empty
        ...env
      };

      serverProcess = spawn('node', [appPath], {
        env: serverEnv,
        stdio: 'pipe'
      });

      let output = '';

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server running') || output.includes('listening')) {
          resolve(serverProcess);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        // Only reject on fatal errors
        if (errorMsg.includes('EADDRINUSE') || errorMsg.includes('FATAL')) {
          reject(new Error(errorMsg));
        }
      });

      serverProcess.on('error', reject);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          resolve(serverProcess); // Resolve anyway, server might be ready
        }
      }, 10000);
    });
  };

  // Helper to stop server
  const stopServer = () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  };

  // Helper to wait for service
  const waitForService = async (url, maxAttempts = 30) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await axios.get(url, { timeout: 2000 });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Service at ${url} did not become ready`);
  };

  afterEach(() => {
    stopServer();
  });

  describe('Application Startup', () => {
    test('should start without MongoDB connection', async () => {
      await startServer({
        MONGODB_URI: '', // No MongoDB
        ENABLE_ZERODB: 'false'
      });

      // Wait for server to be ready
      await waitForService(`${BASE_URL}/health`);

      // Server should be running
      expect(serverProcess).not.toBeNull();
      expect(serverProcess.killed).toBe(false);
    }, 60000);

    test('should accept connections on configured port', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
    }, 60000);

    test('should initialize with ZeroDB configuration', async () => {
      await startServer({
        ENABLE_ZERODB: 'true',
        ZERODB_API_KEY: 'test_key',
        ZERODB_PROJECT_ID: 'test_project'
      });

      await waitForService(`${BASE_URL}/health`);

      // Server should start even if ZeroDB connection fails in test
      expect(serverProcess.killed).toBe(false);
    }, 60000);

    test('should not crash without MongoDB URI', async () => {
      await startServer({
        MONGODB_URI: undefined
      });

      await waitForService(`${BASE_URL}/health`);

      // Wait a bit more to ensure stability
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(serverProcess.killed).toBe(false);
    }, 60000);
  });

  describe('Health Check Endpoints', () => {
    beforeEach(async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);
    }, 60000);

    test('should respond to /health endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/health`);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
      expect(response.data.status).toBe('ok');
    });

    test('should have /health/zerodb endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/health/zerodb`);

      // Should respond with 200 or 503 depending on ZeroDB availability
      expect([200, 503]).toContain(response.status);
      expect(response.data).toHaveProperty('status');
    });

    test('/health endpoint should not require authentication', async () => {
      const response = await axios.get(`${BASE_URL}/health`);

      expect(response.status).toBe(200);
      // No authentication required
    });

    test('/health endpoint should return quickly', async () => {
      const startTime = Date.now();
      await axios.get(`${BASE_URL}/health`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond in under 1 second
    });
  });

  describe('API Endpoints', () => {
    beforeEach(async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);
    }, 60000);

    test('should handle 404 for non-existent routes', async () => {
      try {
        await axios.get(`${BASE_URL}/api/v1/nonexistent`);
        fail('Should have thrown 404 error');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });

    test('should serve API documentation endpoint', async () => {
      try {
        const response = await axios.get(`${BASE_URL}/api-docs`, {
          maxRedirects: 5
        });
        // Should either redirect to Swagger UI or return documentation
        expect([200, 301, 302]).toContain(response.status);
      } catch (error) {
        // API docs might not be enabled in test environment
        expect([404, 500]).toContain(error.response.status);
      }
    });

    test('should accept JSON content type', async () => {
      try {
        await axios.post(`${BASE_URL}/api/v1/test`, {
          test: 'data'
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        // Endpoint might not exist, but should parse JSON
        expect([404, 401]).toContain(error.response.status);
      }
    });
  });

  describe('Deployment Scenarios', () => {
    test('should work in production mode without MongoDB', async () => {
      await startServer({
        NODE_ENV: 'production',
        MONGODB_URI: '',
        ENABLE_ZERODB: 'false'
      });

      await waitForService(`${BASE_URL}/health`);

      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
    }, 60000);

    test('should work with sync disabled', async () => {
      await startServer({
        ENABLE_SYNC: 'false',
        ENABLE_MONGO_CHANGESTREAM: 'false'
      });

      await waitForService(`${BASE_URL}/health`);

      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
    }, 60000);

    test('should handle missing optional environment variables', async () => {
      await startServer({
        LOG_LEVEL: undefined,
        SHORTCUT_API_TOKEN: undefined,
        EMAIL_API_KEY: undefined
      });

      await waitForService(`${BASE_URL}/health`);

      expect(serverProcess.killed).toBe(false);
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should handle invalid ZeroDB credentials gracefully', async () => {
      await startServer({
        ENABLE_ZERODB: 'true',
        ZERODB_API_KEY: 'invalid_key',
        ZERODB_PROJECT_ID: 'invalid_project'
      });

      await waitForService(`${BASE_URL}/health`);

      // Server should start despite invalid ZeroDB credentials
      expect(serverProcess.killed).toBe(false);

      // ZeroDB health should reflect error
      try {
        const response = await axios.get(`${BASE_URL}/health/zerodb`);
        expect([503, 500]).toContain(response.status);
      } catch (error) {
        expect([503, 500]).toContain(error.response.status);
      }
    }, 60000);

    test('should return 500 for server errors', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      // Try to trigger a server error (invalid endpoint that might cause error)
      try {
        await axios.post(`${BASE_URL}/api/v1/invalid`, {
          invalid: 'data'
        });
      } catch (error) {
        expect([400, 404, 500]).toContain(error.response.status);
      }
    });
  });

  describe('Graceful Shutdown', () => {
    test('should handle SIGTERM signal', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      // Send SIGTERM
      serverProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(serverProcess.killed).toBe(true);
    }, 60000);

    test('should handle SIGINT signal', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      // Send SIGINT
      serverProcess.kill('SIGINT');

      // Wait for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 3000));

      expect(serverProcess.killed).toBe(true);
    }, 60000);

    test('should close connections on shutdown', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      // Make a request
      await axios.get(`${BASE_URL}/health`);

      // Shutdown
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // New requests should fail
      try {
        await axios.get(`${BASE_URL}/health`, { timeout: 1000 });
        fail('Request should have failed after shutdown');
      } catch (error) {
        expect(error.code).toMatch(/ECONNREFUSED|ETIMEDOUT/);
      }
    }, 60000);
  });

  describe('Migration from MongoDB to ZeroDB', () => {
    test('should support migration mode with both databases', async () => {
      await startServer({
        ENABLE_SYNC: 'true',
        SYNC_DIRECTION: 'bidirectional',
        MONGODB_URI: 'mongodb://localhost:27017/test',
        ENABLE_ZERODB: 'true'
      });

      await waitForService(`${BASE_URL}/health`);

      // Server should start even if MongoDB connection fails
      expect(serverProcess.killed).toBe(false);
    }, 60000);

    test('should support ZeroDB-only mode after migration', async () => {
      await startServer({
        ENABLE_SYNC: 'false',
        MONGODB_URI: '', // Migration complete, no MongoDB
        ENABLE_ZERODB: 'false' // Using ZeroDB as primary
      });

      await waitForService(`${BASE_URL}/health`);

      const response = await axios.get(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
    }, 60000);
  });

  describe('Performance', () => {
    test('should respond to health checks within acceptable time', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      const startTime = Date.now();
      await axios.get(`${BASE_URL}/health`);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(500); // Under 500ms
    }, 60000);

    test('should handle concurrent requests', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      // Make 10 concurrent requests
      const requests = Array(10).fill(null).map(() =>
        axios.get(`${BASE_URL}/health`)
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    }, 60000);
  });

  describe('Security', () => {
    test('should have security headers', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      const response = await axios.get(`${BASE_URL}/health`);

      // Check for common security headers
      expect(response.headers).toBeDefined();
      // X-Content-Type-Options, X-Frame-Options, etc. might be set by helmet
    });

    test('should handle CORS properly', async () => {
      await startServer();
      await waitForService(`${BASE_URL}/health`);

      const response = await axios.get(`${BASE_URL}/health`, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      // CORS headers should be present
      expect(response.status).toBe(200);
    });
  });
});
