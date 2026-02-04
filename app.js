// app.js
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const { connectToMongoDB } = require('./db/mongoConnection');
const zerodbService = require('./services/zerodbService');
const { addVersionHeaders, createVersionedRoutes, validateApiVersion } = require('./middleware/apiVersioning');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const helmetMiddleware = require('./middleware/security/helmet');
const corsMiddleware = require('./middleware/security/cors');
const secureHeadersMiddleware = require('./middleware/secureHeadersMiddleware'); // OCAE-304: Import secure headers
const { 
  rateLimiter, 
  authRateLimiter,
  createRouteRateLimit,
  createTieredRateLimit,
  includeAdvancedHeaders 
} = require('./middleware/security/rateLimit');
const getLoggingMiddleware = require('./middleware/logging');
const { securityLogger } = require('./middleware/securityAuditLogger'); // OCAE-306: Import security audit logging
// testEndpoints removed - no longer needed
const { setupSwagger } = require('./middleware/swaggerDocs'); // OCAE-210: Import Swagger middleware
const { databaseMonitor, metricsMiddleware } = require('./middleware/databaseMonitor'); // GitHub Issue #8: Database monitoring
const mongoChangeStreamListener = require('./services/mongoChangeStreamListener'); // GitHub Issue #14: Real-time sync

// Initialize dotenv to load environment variables
dotenv.config();

// Initialize the Express app
const app = express();

// Trust first proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Apply security middleware first
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(secureHeadersMiddleware()); // OCAE-304: Apply secure headers middleware

// Apply compression middleware early in the pipeline
app.use(compression());

// Request logging middleware
const loggingMiddleware = getLoggingMiddleware();
if (Array.isArray(loggingMiddleware)) {
  loggingMiddleware.forEach(middleware => app.use(middleware));
} else {
  app.use(loggingMiddleware);
}

// GitHub Issue #8: Database monitoring metrics endpoint
app.use(metricsMiddleware);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// Apply advanced rate limiting headers
app.use(includeAdvancedHeaders());

// Create route-specific rate limiters
const apiRateLimiter = createRouteRateLimit('api', 100, 15 * 60 * 1000);
const adminRateLimiter = createRouteRateLimit('admin', 50, 15 * 60 * 1000);

// Apply default rate limiting
app.use(rateLimiter);

// Apply stricter rate limiting to auth routes
app.use('/auth', authRateLimiter);

// Apply route-specific rate limiting
app.use('/api', apiRateLimiter);
app.use('/admin', adminRateLimiter);

// Apply tiered rate limiting to premium routes if user is authenticated
app.use('/api/premium', (req, res, next) => {
  // Check if user exists and has a role/tier
  if (req.user && req.user.tier) {
    // Apply appropriate tier limiter
    const tierLimiter = createTieredRateLimit(req.user.tier);
    return tierLimiter(req, res, next);
  }
  // If no user or tier, proceed without tier-specific rate limiting
  next();
});

// Apply API versioning middleware
app.use(addVersionHeaders);
app.use(validateApiVersion);

// OCAE-306: Apply security audit logging middleware
app.use(securityLogger.errorHandler());

// OCAE-210: Setup Swagger documentation middleware
setupSwagger(app);

// Test endpoints removed - using real OpenCAP Stack API only

// Determine if the environment is a test environment
const isTestEnv = process.env.NODE_ENV === "test";

// ============================================================================
// MONGODB CONNECTION - OPTIONAL (Only for Continuous Sync Feature)
// ============================================================================
// MongoDB is ONLY needed if you enable the continuous sync feature (Issue #14)
// To run without MongoDB: Set SYNC_ENABLED=false or omit it entirely
//
// The application will work perfectly with ZeroDB only when sync is disabled
// ============================================================================
if (!isTestEnv && process.env.SYNC_ENABLED === 'true') {
  console.log('🔄 Continuous sync enabled - connecting to MongoDB...');
  connectToMongoDB()
    .then(() => {
      console.log('✅ MongoDB connected successfully (for continuous sync)');
      // GitHub Issue #8: Initialize database monitoring after MongoDB connection
      databaseMonitor.initialize();
    })
    .catch(err => {
      console.error("❌ MongoDB connection failed:", err);
      console.error("⚠️  Continuous sync feature will not be available");
      console.error("💡 To run without MongoDB, set SYNC_ENABLED=false");
    });
} else if (!isTestEnv) {
  console.log('ℹ️  MongoDB connection skipped (SYNC_ENABLED=false or not set)');
  console.log('✓ Running in ZeroDB-only mode');
}

// Initialize ZeroDB if enabled
if (!isTestEnv && process.env.ENABLE_ZERODB === 'true') {
  if (process.env.AINATIVE_API_TOKEN) {
    zerodbService.initialize(process.env.AINATIVE_API_TOKEN)
      .then(async result => {
        console.log('✅ ZeroDB initialized:', result);
        // GitHub Issue #8: Setup ZeroDB monitoring after initialization
        databaseMonitor.setupZeroDBMonitoring(zerodbService);

        // GitHub Issue #14: Initialize MongoDB to ZeroDB real-time sync
        if (process.env.SYNC_ENABLED === 'true') {
          try {
            // Parse sync configuration from environment
            const syncConfig = {
              enabled: process.env.SYNC_ENABLED === 'true',
              batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '50', 10),
              batchTimeoutMs: parseInt(process.env.SYNC_BATCH_TIMEOUT_MS || '5000', 10),
              retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3', 10),
              retryDelayMs: parseInt(process.env.SYNC_RETRY_DELAY_MS || '1000', 10),
              maxRetryDelayMs: parseInt(process.env.SYNC_MAX_RETRY_DELAY_MS || '30000', 10),
              resumeTokenPersistence: process.env.SYNC_RESUME_TOKEN_PERSISTENCE !== 'false',
              resumeTokenPath: process.env.SYNC_RESUME_TOKEN_PATH || './data/change-stream-tokens.json',
              deadLetterQueuePath: process.env.SYNC_DLQ_PATH || './data/sync-dlq.json',
              maxDeadLetterQueueSize: parseInt(process.env.SYNC_MAX_DLQ_SIZE || '1000', 10),
              healthCheckIntervalMs: parseInt(process.env.SYNC_HEALTH_CHECK_INTERVAL_MS || '60000', 10),
              reconnectDelayMs: parseInt(process.env.SYNC_RECONNECT_DELAY_MS || '5000', 10),
              maxReconnectDelayMs: parseInt(process.env.SYNC_MAX_RECONNECT_DELAY_MS || '60000', 10)
            };

            // Parse collections to sync
            if (process.env.SYNC_COLLECTIONS) {
              syncConfig.collections = process.env.SYNC_COLLECTIONS.split(',').map(c => c.trim());
            }

            // Parse operation types
            if (process.env.SYNC_OPERATION_TYPES) {
              syncConfig.operationTypes = process.env.SYNC_OPERATION_TYPES.split(',').map(o => o.trim());
            }

            // Initialize change stream listener with parsed config
            mongoChangeStreamListener.config = { ...mongoChangeStreamListener.config, ...syncConfig };
            await mongoChangeStreamListener.initialize({
              zerodbToken: process.env.AINATIVE_API_TOKEN
            });
            console.log('✅ MongoDB Change Stream Listener initialized');
          } catch (err) {
            console.error('❌ MongoDB Change Stream Listener initialization failed:', err);
          }
        }
      })
      .catch(err => console.error('❌ ZeroDB initialization failed:', err));
  } else {
    console.warn('⚠️  ZeroDB enabled but AINATIVE_API_TOKEN not set');
  }
}

// Function to safely require routes
const safeRequire = (path) => {
  try {
    // Ensure the path has a .js extension
    const fullPath = path.endsWith('.js') ? path : `${path}.js`;
    
    console.log(`Checking if file exists: ${fullPath}`);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: Route file does not exist: ${fullPath}`);
      return null;
    }
    
    console.log(`Attempting to require: ${fullPath}`);
    const module = require(fullPath);
    console.log(`Successfully loaded route module: ${fullPath}`);
    console.log(`Module exports:`, Object.keys(module || {}));
    return module;
  } catch (err) {
    console.error(`Error loading route file ${path}:`, err.message);
    console.error('Error details:', {
      code: err.code,
      path: err.path || path,
      requireStack: err.requireStack || []
    });
    console.error('Error stack:', err.stack);
    return null;
  }
};

// Import route modules using absolute paths
const path = require('path');
const routes = {
  // Core routes that should always exist
  financialReportRoutes: safeRequire(path.join(__dirname, 'routes/v1/financialReportingRoutes')),
  userRoutes: safeRequire(path.join(__dirname, 'routes/v1/userRoutes')),
  shareClassRoutes: safeRequire(path.join(__dirname, 'routes/v1/shareClassRoutes')),
  stakeholderRoutes: safeRequire(path.join(__dirname, 'routes/v1/stakeholderRoutes')),
  documentRoutes: safeRequire(path.join(__dirname, 'routes/v1/documentRoutes')),
  fundraisingRoundRoutes: safeRequire(path.join(__dirname, 'routes/v1/fundraisingRoundRoutes')),
  equityPlanRoutes: safeRequire(path.join(__dirname, 'routes/v1/equityPlanRoutes')),
  documentEmbeddingRoutes: safeRequire(path.join(__dirname, 'routes/v1/documentEmbeddingRoutes')),
  employeeRoutes: safeRequire(path.join(__dirname, 'routes/v1/employeeRoutes')),
  activityRoutes: safeRequire(path.join(__dirname, 'routes/v1/activityRoutes')),
  investmentTrackerRoutes: safeRequire(path.join(__dirname, 'routes/v1/investmentTrackerRoutes')),
  adminRoutes: safeRequire(path.join(__dirname, 'routes/v1/adminRoutes')),
  documentAccessRoutes: safeRequire(path.join(__dirname, 'routes/v1/documentAccessRoutes')),
  investorRoutes: safeRequire(path.join(__dirname, 'routes/v1/investorRoutes')),
  companyRoutes: safeRequire(path.join(__dirname, 'routes/v1/companyRoutes')),
  authRoutes: safeRequire(path.join(__dirname, 'routes/v1/authRoutes')),
  communicationRoutes: safeRequire(path.join(__dirname, 'routes/v1/communicationRoutes')),
  notificationRoutes: safeRequire(path.join(__dirname, 'routes/v1/notificationRoutes')),
  inviteManagementRoutes: safeRequire(path.join(__dirname, 'routes/v1/inviteManagementRoutes')),
  spvRoutes: safeRequire(path.join(__dirname, 'routes/v1/spvRoutes')),
  spvAssetRoutes: safeRequire(path.join(__dirname, 'routes/v1/spvAssetRoutes')),
  complianceCheckRoutes: safeRequire(path.join(__dirname, 'routes/v1/complianceCheckRoutes')),
  integrationModuleRoutes: safeRequire(path.join(__dirname, 'routes/v1/integrationModuleRoutes')),
  taxCalculatorRoutes: safeRequire(path.join(__dirname, 'routes/v1/taxCalculatorRoutes')),
  securityAuditRoutes: safeRequire(path.join(__dirname, 'routes/v1/securityAuditRoutes')),
  financialDataRoutes: safeRequire(path.join(__dirname, 'routes/v1/financialDataRoutes')),
  semanticSearchRoutes: safeRequire(path.join(__dirname, 'routes/v1/semanticSearchRoutes')),
  searchRoutes: safeRequire(path.join(__dirname, 'routes/v1/searchRoutes')), // Issue #190: Global multi-entity search
  agentMemoryRoutes: safeRequire(path.join(__dirname, 'routes/v1/agentMemoryRoutes')), // Issue #27: Agent memory
  rlhfRoutes: safeRequire(path.join(__dirname, 'routes/v1/rlhfRoutes')), // Issue #29: RLHF data collection
  advancedAnalyticsRoutes: safeRequire(path.join(__dirname, 'routes/v1/advancedAnalyticsRoutes')), // Issue #31: Analytics
  eventStreamingRoutes: safeRequire(path.join(__dirname, 'routes/v1/eventStreamingRoutes')), // Issue #28: Event streaming
  fileStorageRoutes: safeRequire(path.join(__dirname, 'routes/v1/fileStorageRoutes')), // Issue #30: File storage
  safeRoutes: safeRequire(path.join(__dirname, 'routes/v1/safeRoutes')), // Issue #64, #66, #68: SAFE management
  taskRoutes: safeRequire(path.join(__dirname, 'routes/v1/taskRoutes')), // Issue #121: Task management
  healthRoutes: safeRequire(path.join(__dirname, 'routes/v1/healthRoutes')), // Issue #35: Production readiness health checks
  valuation409ARoutes: safeRequire(path.join(__dirname, 'routes/v1/valuation409ARoutes')), // Issue #59: 409A Valuation Request System
  materialEventRoutes: safeRequire(path.join(__dirname, 'routes/v1/materialEventRoutes')), // Issue #60: Material Events Tracking
  valuationPartnerRoutes: safeRequire(path.join(__dirname, 'routes/v1/valuationPartnerRoutes')), // Issue #61: Valuation Specialist Integration
  equityGrantRoutes: safeRequire(path.join(__dirname, 'routes/v1/equityGrantRoutes')), // Issue #77: Equity Grant Management
  exerciseRoutes: safeRequire(path.join(__dirname, 'routes/v1/exerciseRoutes')), // Issue #79: Exercise Management System
  terminationRoutes: safeRequire(path.join(__dirname, 'routes/v1/terminationRoutes')), // Issue #81: Termination Equity Workflow
  bulkMessageRoutes: safeRequire(path.join(__dirname, 'routes/v1/bulkMessageRoutes')), // Issue #86: Bulk Messaging System
  emailTrackingRoutes: safeRequire(path.join(__dirname, 'routes/v1/emailTrackingRoutes')), // Issue #87: Email Delivery Tracking
  investorRightsRoutes: safeRequire(path.join(__dirname, 'routes/v1/investorRightsRoutes')), // Issue #92: Investor Rights Tracking
  investorCommunicationRoutes: safeRequire(path.join(__dirname, 'routes/v1/investorCommunicationRoutes')), // Issue #91: Investor Communication System
  messageTriggerRoutes: safeRequire(path.join(__dirname, 'routes/v1/messageTriggerRoutes')), // Issue #88: Automated Triggered Messages
  securityIssuanceRoutes: safeRequire(path.join(__dirname, 'routes/v1/securityIssuanceRoutes')), // Issue #76: Security Issuances Register
  vestingScheduleRoutes: safeRequire(path.join(__dirname, 'routes/v1/vestingScheduleRoutes')), // Issue #78: Automated Vesting Schedules
  equityPlanReportRoutes: safeRequire(path.join(__dirname, 'routes/v1/equityPlanReportRoutes')), // Issue #110: Equity Plan Reports
  financialAnalyticsRoutes: safeRequire(path.join(__dirname, 'routes/v1/financialAnalyticsRoutes')), // Issue #44: Financial Analytics
  riskAssessmentRoutes: safeRequire(path.join(__dirname, 'routes/v1/riskAssessmentRoutes')), // Issue #44: Risk Assessment
  currencyRoutes: safeRequire(path.join(__dirname, 'routes/v1/currencyRoutes')), // Issue #44: Currency Service
  waterfallAnalysisRoutes: safeRequire(path.join(__dirname, 'routes/v1/waterfallAnalysisRoutes')), // Issue #56: Waterfall Analysis Engine
  documentAuditRoutes: safeRequire(path.join(__dirname, 'routes/v1/documentAuditRoutes')), // Issue #102: Document Audit Trail
  cacheRoutes: safeRequire(path.join(__dirname, 'routes/v1/cacheRoutes')), // Issue #47: Database Optimization and Caching
  fundraiseModelRoutes: safeRequire(path.join(__dirname, 'routes/v1/fundraiseModelRoutes')), // Issue #195: Interactive Fundraising Modeling Engine
  customReportRoutes: safeRequire(path.join(__dirname, 'routes/v1/customReportRoutes')), // Issue #197: Custom Report Builder Engine
  dataRoomRoutes: safeRequire(path.join(__dirname, 'routes/v1/dataRoomRoutes')), // Issue #194: Data Room Backend Infrastructure
  reportLibraryRoutes: safeRequire(path.join(__dirname, 'routes/v1/reportLibraryRoutes')), // Issue #199: Report Library Categorization
  integrationMarketplaceRoutes: safeRequire(path.join(__dirname, 'routes/v1/integrationMarketplaceRoutes')), // Issue #202: Integration Marketplace
  documentTemplateRoutes: safeRequire(path.join(__dirname, 'routes/v1/documentTemplateRoutes')), // Issue #193: Document Template System
  // Optional routes that may not exist in all environments
  financialMetricsRoutes: (() => {
    const fullPath = path.join(__dirname, 'routes/v1/financialMetricsRoutes.js');
    console.log(`Attempting to load financial metrics routes from: ${fullPath}`);
    console.log(`File exists: ${fs.existsSync(fullPath) ? 'yes' : 'no'}`);
    const result = safeRequire(fullPath);
    console.log(`Financial metrics routes loaded: ${result ? 'success' : 'failed'}`);
    return result;
  })(),
};

// Mount routes with correct paths
Object.entries(routes).forEach(([key, route]) => {
  // Skip if route is null or undefined
  if (!route) {
    console.log(`Skipping null/undefined route: ${key}`);
    if (key === 'financialMetricsRoutes') {
      console.log('Financial metrics routes failed to load. Check previous logs for details.');
    }
    return;
  }
  if (route) {
    let path;
    // Special case for auth routes
    if (key === 'authRoutes') {
      path = '/api/v1/auth';
    } else if (key === 'investmentTrackerRoutes') {
      path = '/api/v1/investments';
    } else if (key === 'financialReportRoutes') {
      path = '/api/v1/financial-reports';
    } else if (key === 'documentEmbeddingRoutes') {
      path = '/api/v1/document-embeddings';
    } else if (key === 'documentAccessRoutes') {
      path = '/api/v1/document-accesses';
    } else if (key === 'fundraisingRoundRoutes') {
      path = '/api/v1/fundraising-rounds';
    } else if (key === 'equityPlanRoutes') {
      path = '/api/v1/equity-plans';
    } else if (key === 'shareClassRoutes') {
      path = '/api/v1/share-classes';
    } else if (key === 'spvAssetRoutes') {
      path = '/api/v1/spv-assets';
    } else if (key === 'complianceCheckRoutes') {
      path = '/api/v1/compliance-checks';
    } else if (key === 'integrationModuleRoutes') {
      path = '/api/v1/integration-modules';
    } else if (key === 'financialMetricsRoutes') {
      path = '/api/v1/metrics';
    } else if (key === 'taxCalculatorRoutes') {
      path = '/api/v1/tax-calculations';
    } else if (key === 'inviteManagementRoutes') {
      path = '/api/v1/invites';
    } else if (key === 'securityAuditRoutes') {
      path = '/api/v1/security-audits';
    } else if (key === 'financialDataRoutes') {
      path = '/api/v1/financial-data';
    } else if (key === 'semanticSearchRoutes') {
      path = '/api/v1/documents/search';
    } else if (key === 'searchRoutes') {
      path = '/api/v1/search';
    } else if (key === 'agentMemoryRoutes') {
      path = '/api/v1/agent-memory';
    } else if (key === 'rlhfRoutes') {
      path = '/api/v1/rlhf';
    } else if (key === 'advancedAnalyticsRoutes') {
      path = '/api/v1/analytics';
    } else if (key === 'eventStreamingRoutes') {
      path = '/api/v1/events';
    } else if (key === 'fileStorageRoutes') {
      path = '/api/v1/files';
    } else if (key === 'safeRoutes') {
      path = '/api/v1/safes';
    } else if (key === 'taskRoutes') {
      path = '/api/v1/tasks';
    } else if (key === 'healthRoutes') {
      path = '/api/v1/health';
    } else if (key === 'valuation409ARoutes') {
      path = '/api/v1/valuations';
    } else if (key === 'materialEventRoutes') {
      path = '/api/v1/material-events';
    } else if (key === 'valuationPartnerRoutes') {
      path = '/api/v1/valuation-partners';
    } else if (key === 'equityGrantRoutes') {
      path = '/api/v1/equity-grants';
    } else if (key === 'exerciseRoutes') {
      path = '/api/v1'; // Routes already have /exercise-requests prefix
    } else if (key === 'terminationRoutes') {
      path = '/api/v1/terminations';
    } else if (key === 'investorRightsRoutes') {
      path = '/api/v1/investor-rights';
    } else if (key === 'emailTrackingRoutes') {
      path = '/api/v1/email-tracking';
    } else if (key === 'bulkMessageRoutes') {
      path = '/api/v1/bulk-messages';
    } else if (key === 'investorCommunicationRoutes') {
      path = '/api/v1/investor-communications';
    } else if (key === 'messageTriggerRoutes') {
      path = '/api/v1/message-triggers';
    } else if (key === 'securityIssuanceRoutes') {
      path = '/api/v1/security-issuances';
    } else if (key === 'vestingScheduleRoutes') {
      path = '/api/v1';
    } else if (key === 'equityPlanReportRoutes') {
      path = '/api/v1/equity-plan-reports';
    } else if (key === 'financialAnalyticsRoutes') {
      path = '/api/v1/financial-analytics';
    } else if (key === 'riskAssessmentRoutes') {
      path = '/api/v1/risk-assessment';
    } else if (key === 'currencyRoutes') {
      path = '/api/v1/currency';
    } else if (key === 'waterfallAnalysisRoutes') {
      path = '/api/v1'; // Routes already have /waterfall-analyses prefix
    } else if (key === 'documentAuditRoutes') {
      path = '/api/v1/audit'; // Issue #102: Document Audit Trail
    } else if (key === 'cacheRoutes') {
      path = '/api/v1/cache'; // Issue #47: Database Optimization and Caching
    } else if (key === 'customReportRoutes') {
      path = '/api/v1/reports/custom'; // Issue #197: Custom Report Builder Engine
    } else if (key === 'dataRoomRoutes') {
      path = '/api/v1/data-rooms'; // Issue #194: Data Room Backend Infrastructure
    } else if (key === 'reportLibraryRoutes') {
      path = '/api/v1/reports'; // Issue #199: Report Library Categorization
    } else if (key === 'integrationMarketplaceRoutes') {
      path = '/api/v1/integrations'; // Issue #202: Integration Marketplace
    } else if (key === 'documentTemplateRoutes') {
      path = '/api/v1/templates'; // Issue #193: Document Template System
    } else {
      path = `/api/v1/${key.replace('Routes', '').toLowerCase()}`;
    }
    
    // Ensure the route is a function before mounting
    if (typeof route === 'function') {
      app.use(path, route);
      console.log(`Registered custom v1 route: ${path} -> ${key}`);
    } else {
      console.error(`Error: Route ${key} is not a valid middleware function`);
    }
  } else if (route) {
    console.log(`Route not mounted (not a function): ${key} (type: ${typeof route})`);
  } else {
    console.log(`Route not found: ${key}`);
  }
});

// Health check endpoint - must be before error handlers
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// ZeroDB health check endpoint
app.get('/health/zerodb', async (req, res) => {
  try {
    if (!zerodbService.projectId) {
      return res.status(503).json({
        status: 'error',
        message: 'ZeroDB not initialized',
        enabled: process.env.ENABLE_ZERODB === 'true'
      });
    }
    const dbStatus = await zerodbService.getDatabaseStatus();
    res.status(200).json({
      status: 'ok',
      projectId: zerodbService.projectId,
      zerodb: dbStatus
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// MongoDB to ZeroDB sync health check endpoint (GitHub Issue #14)
app.get('/health/sync', async (req, res) => {
  try {
    if (process.env.SYNC_ENABLED !== 'true') {
      return res.status(200).json({
        status: 'disabled',
        message: 'MongoDB to ZeroDB sync is not enabled'
      });
    }

    const health = mongoChangeStreamListener.healthCheck();
    const status = health.isRunning && Object.values(health.streamStatuses).every(s => s === 'active' || s === 'skipped')
      ? 'ok'
      : 'degraded';

    res.status(status === 'ok' ? 200 : 503).json({
      status,
      sync: health
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get sync metrics endpoint (GitHub Issue #14)
app.get('/api/v1/admin/sync-metrics', async (req, res) => {
  try {
    if (process.env.SYNC_ENABLED !== 'true') {
      return res.status(200).json({
        success: false,
        message: 'Sync is not enabled'
      });
    }

    const metrics = mongoChangeStreamListener.getMetrics();
    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get dead letter queue endpoint (GitHub Issue #14)
app.get('/api/v1/admin/sync-dlq', async (req, res) => {
  try {
    if (process.env.SYNC_ENABLED !== 'true') {
      return res.status(200).json({
        success: false,
        message: 'Sync is not enabled'
      });
    }

    const limit = parseInt(req.query.limit || '100', 10);
    const dlq = mongoChangeStreamListener.getDeadLetterQueue(limit);
    res.status(200).json({
      success: true,
      data: dlq,
      total: dlq.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reprocess dead letter queue endpoint (GitHub Issue #14)
app.post('/api/v1/admin/sync-dlq/reprocess', async (req, res) => {
  try {
    if (process.env.SYNC_ENABLED !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Sync is not enabled'
      });
    }

    const limit = parseInt(req.body.limit || '10', 10);
    const results = await mongoChangeStreamListener.reprocessDeadLetterQueue(limit);
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Pause/Resume sync endpoints (GitHub Issue #14)
app.post('/api/v1/admin/sync/pause', (req, res) => {
  try {
    if (process.env.SYNC_ENABLED !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Sync is not enabled'
      });
    }

    mongoChangeStreamListener.pause();
    res.status(200).json({
      success: true,
      message: 'Sync paused successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post('/api/v1/admin/sync/resume', (req, res) => {
  try {
    if (process.env.SYNC_ENABLED !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Sync is not enabled'
      });
    }

    mongoChangeStreamListener.resume();
    res.status(200).json({
      success: true,
      message: 'Sync resumed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Set up server and start listening
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  });

  // Graceful shutdown handler (GitHub Issue #14)
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
    });

    try {
      // Stop MongoDB change stream listener if running
      if (process.env.SYNC_ENABLED === 'true' && mongoChangeStreamListener.isRunning) {
        console.log('Stopping MongoDB change stream listener...');
        await mongoChangeStreamListener.stopAll();
      }

      // Note: ZeroDB uses HTTP API, no persistent connection to close
      console.log('Database connections handled (ZeroDB uses stateless HTTP API)');

      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

module.exports = app;