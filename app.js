// app.js
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const { connectToMongoDB } = require('./db/mongoConnection');
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

// Conditionally connect to MongoDB unless in a test environment
if (!isTestEnv) {
  connectToMongoDB()
    .catch(err => console.error("MongoDB connection failed:", err));
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
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;