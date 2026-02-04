/**
 * Health Check Routes
 * GitHub Issue #35: Final validation and production readiness
 *
 * Provides comprehensive health check endpoints for:
 * - Basic server health
 * - ZeroDB connectivity
 * - Production readiness
 * - Kubernetes-style probes
 */

const express = require('express');
const router = express.Router();
const zerodbService = require('../../services/zerodbService');
const os = require('os');

/**
 * GET /api/v1/health
 * Basic health check - always returns ok if server is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * GET /api/v1/health/zerodb
 * ZeroDB-specific health check
 */
router.get('/zerodb', async (req, res) => {
  try {
    if (!zerodbService.projectId) {
      return res.status(503).json({
        status: 'error',
        message: 'ZeroDB not initialized',
        enabled: process.env.ENABLE_ZERODB === 'true',
        timestamp: new Date().toISOString()
      });
    }

    const dbStatus = await zerodbService.getDatabaseStatus();

    res.status(200).json({
      status: 'ok',
      projectId: zerodbService.projectId,
      zerodb: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/v1/health/sync
 * Sync health check (deprecated - now using ZeroDB only)
 */
router.get('/sync', async (req, res) => {
  res.status(200).json({
    status: 'not_applicable',
    message: 'OpenCap Stack uses ZeroDB as the primary database. Sync service is not needed.',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/v1/health/ready
 * Production readiness check - comprehensive system validation
 */
router.get('/ready', async (req, res) => {
  const checks = [];
  let allHealthy = true;
  let hasWarnings = false;

  // Check 1: Server is running
  checks.push({
    name: 'server',
    status: 'pass',
    message: 'Server process is running'
  });

  // Check 2: ZeroDB connectivity
  if (zerodbService.projectId) {
    try {
      const dbStatus = await zerodbService.getDatabaseStatus();
      if (dbStatus.status === 'healthy' || dbStatus.status === 'ok') {
        checks.push({
          name: 'zerodb',
          status: 'pass',
          message: 'ZeroDB is healthy'
        });
      } else {
        checks.push({
          name: 'zerodb',
          status: 'warn',
          message: `ZeroDB status: ${dbStatus.status}`
        });
        hasWarnings = true;
      }
    } catch (error) {
      checks.push({
        name: 'zerodb',
        status: 'fail',
        message: error.message
      });
      allHealthy = false;
    }
  } else {
    checks.push({
      name: 'zerodb',
      status: 'skip',
      reason: 'ZeroDB not initialized'
    });
  }

  // Check 3: Required environment variables
  const requiredEnvVars = ['NODE_ENV'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length === 0) {
    checks.push({
      name: 'environment',
      status: 'pass',
      message: 'All required environment variables set'
    });
  } else {
    checks.push({
      name: 'environment',
      status: 'warn',
      missing: missingVars
    });
    hasWarnings = true;
  }

  // Check 4: Memory usage
  const memUsage = process.memoryUsage();
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const heapPercentage = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

  if (heapPercentage < 90) {
    checks.push({
      name: 'memory',
      status: 'pass',
      message: `Heap usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapPercentage}%)`
    });
  } else {
    checks.push({
      name: 'memory',
      status: 'warn',
      message: `High heap usage: ${heapPercentage}%`
    });
    hasWarnings = true;
  }

  const overallStatus = allHealthy ? (hasWarnings ? 'ready_with_warnings' : 'ready') : 'not_ready';

  res.status(allHealthy ? 200 : 503).json({
    ready: allHealthy,
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      passed: checks.filter(c => c.status === 'pass').length,
      warnings: checks.filter(c => c.status === 'warn').length,
      failed: checks.filter(c => c.status === 'fail').length,
      skipped: checks.filter(c => c.status === 'skip').length
    }
  });
});

/**
 * GET /api/v1/health/live
 * Kubernetes liveness probe - minimal check that process is alive
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/v1/health/startup
 * Kubernetes startup probe - check if application has started
 */
router.get('/startup', (req, res) => {
  // Application is considered started if it can respond to this endpoint
  res.status(200).json({
    status: 'started',
    timestamp: new Date().toISOString(),
    pid: process.pid,
    nodeVersion: process.version
  });
});

/**
 * GET /api/v1/health/detailed
 * Detailed system information (restricted in production)
 */
router.get('/detailed', (req, res) => {
  // In production, require authentication or limit information
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  };

  // Add more details in non-production environments
  if (!isProduction) {
    response.system = {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
      loadAverage: os.loadavg()
    };
    response.process = {
      pid: process.pid,
      nodeVersion: process.version,
      title: process.title
    };
    response.zerodb = {
      initialized: !!zerodbService.projectId,
      projectId: zerodbService.projectId
    };
  }

  res.status(200).json(response);
});

/**
 * GET /api/v1/health/endpoints
 * List all available health endpoints
 */
router.get('/endpoints', (req, res) => {
  res.status(200).json({
    endpoints: [
      { path: '/api/v1/health', method: 'GET', description: 'Basic health check' },
      { path: '/api/v1/health/zerodb', method: 'GET', description: 'ZeroDB health check' },
      { path: '/api/v1/health/sync', method: 'GET', description: 'Sync service health check' },
      { path: '/api/v1/health/ready', method: 'GET', description: 'Production readiness check' },
      { path: '/api/v1/health/live', method: 'GET', description: 'Kubernetes liveness probe' },
      { path: '/api/v1/health/startup', method: 'GET', description: 'Kubernetes startup probe' },
      { path: '/api/v1/health/detailed', method: 'GET', description: 'Detailed system information' }
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
