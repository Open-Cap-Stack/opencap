// app.js
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
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
// Increased limits to support SPA with multiple concurrent API calls
const apiRateLimiter = createRouteRateLimit('api', 1000, 15 * 60 * 1000);
const adminRateLimiter = createRouteRateLimit('admin', 500, 15 * 60 * 1000);

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
// ZERODB INITIALIZATION
// ============================================================================
// ZeroDB is the primary and only database for OpenCap Stack
// ============================================================================
if (!isTestEnv && process.env.ENABLE_ZERODB === 'true') {
  if (process.env.AINATIVE_API_TOKEN) {
    zerodbService.initialize(process.env.AINATIVE_API_TOKEN)
      .then(async result => {
        console.log(`✅ ZeroDB initialized (project: ${result.projectId}, tables: ${result.databaseStatus?.tables || 0})`);
        databaseMonitor.setupZeroDBMonitoring(zerodbService);
      })
      .catch(err => console.error('❌ ZeroDB initialization failed:', err.message));
  } else {
    console.warn('⚠️  ZeroDB enabled but AINATIVE_API_TOKEN not set');
  }
}

// Function to safely require routes
const safeRequire = (routePath) => {
  try {
    const fullPath = routePath.endsWith('.js') ? routePath : `${routePath}.js`;

    if (!fs.existsSync(fullPath)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Route file not found: ${fullPath}`);
      }
      return null;
    }

    return require(fullPath);
  } catch (err) {
    console.error(`Error loading route ${routePath}:`, err.message);
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
  fundraisingAnalyticsRoutes: safeRequire(path.join(__dirname, 'routes/v1/fundraisingAnalyticsRoutes')), // Issue #196: Fundraising Analytics Service
  billingRoutes: safeRequire(path.join(__dirname, 'routes/v1/billingRoutes')), // Issue #201: Billing Dashboard APIs
  stakeholderReportRoutes: safeRequire(path.join(__dirname, 'routes/v1/stakeholderReportRoutes')), // Issue #198: Stakeholder Report Generation
  // Optional routes that may not exist in all environments
  financialMetricsRoutes: safeRequire(path.join(__dirname, 'routes/v1/financialMetricsRoutes')),
};

// Mount routes with correct paths
Object.entries(routes).forEach(([key, route]) => {
  // Skip if route is null or undefined
  if (!route) {
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
    } else if (key === 'stakeholderRoutes') {
      path = '/api/v1/stakeholders';
    } else if (key === 'documentRoutes') {
      path = '/api/v1/documents';
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
    } else if (key === 'fundraisingAnalyticsRoutes') {
      path = '/api/v1/fundraising'; // Issue #196: Fundraising Analytics Service
    } else if (key === 'billingRoutes') {
      path = '/api/v1/billing'; // Issue #201: Billing Dashboard APIs
    } else if (key === 'stakeholderReportRoutes') {
      path = '/api/v1/stakeholders'; // Issue #198: Stakeholder Report Generation
    } else {
      path = `/api/v1/${key.replace('Routes', '').toLowerCase()}`;
    }
    
    // Ensure the route is a function before mounting
    if (typeof route === 'function') {
      app.use(path, route);
    } else {
      console.error(`Route ${key} is not a valid middleware function`);
    }
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

  // Graceful shutdown handler
  const gracefulShutdown = async (signal) => {
    console.log(`\n${signal} received, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      console.log('HTTP server closed');
    });

    try {
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
