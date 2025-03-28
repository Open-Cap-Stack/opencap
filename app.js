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
const { 
  rateLimiter, 
  authRateLimiter,
  createRouteRateLimit,
  createTieredRateLimit,
  includeAdvancedHeaders 
} = require('./middleware/security/rateLimit');
const getLoggingMiddleware = require('./middleware/logging');
const testEndpoints = require('./middleware/testEndpoints');

// Initialize dotenv to load environment variables
dotenv.config();

// Initialize the Express app
const app = express();

// Apply security middleware first
app.use(helmetMiddleware);
app.use(corsMiddleware);

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

// Mount test endpoints for middleware testing
app.use('/api', testEndpoints);

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
    return fs.existsSync(path) ? require(path) : null;
  } catch (err) {
    console.warn(`Warning: Could not load route file: ${path}`);
    return null;
  }
};

// Import route modules
const routes = {
  // Core routes that should always exist
  financialReportRoutes: require("./routes/financialReportingRoutes"),
  userRoutes: require("./routes/userRoutes"),
  shareClassRoutes: require("./routes/shareClassRoutes"),
  stakeholderRoutes: require("./routes/stakeholderRoutes"),
  documentRoutes: require("./routes/documentRoutes"),
  fundraisingRoundRoutes: require("./routes/fundraisingRoundRoutes"),
  equityPlanRoutes: require("./routes/equityPlanRoutes"),
  documentEmbeddingRoutes: require("./routes/documentEmbeddingRoutes"),
  employeeRoutes: require("./routes/employeeRoutes"),
  activityRoutes: require("./routes/activityRoutes"),
  investmentRoutes: require("./routes/investmentTrackerRoutes"),
  adminRoutes: require("./routes/adminRoutes"),
  documentAccessRoutes: require("./routes/documentAccessRoutes"),
  investorRoutes: require("./routes/investorRoutes"),
  companyRoutes: require("./routes/companyRoutes"),
  authRoutes: require("./routes/authRoutes"),

  // Optional routes that might not exist in all environments
  communicationRoutes: safeRequire("./routes/Communication"),
  notificationRoutes: safeRequire("./routes/notificationRoutes"),
  inviteManagementRoutes: safeRequire("./routes/inviteManagementRoutes"),
  spvRoutes: safeRequire("./routes/SPV"),
  spvAssetRoutes: safeRequire("./routes/SPVasset"),
  complianceCheckRoutes: safeRequire("./routes/complianceCheckRoutes"),
  integrationModuleRoutes: safeRequire("./routes/integrationModuleRoutes"),
  taxCalculatorRoutes: safeRequire("./routes/taxCalculatorRoutes"),
  
  // OCAE-208: Enhanced V1 Routes 
  v1ShareClassRoutes: safeRequire("./routes/v1/shareClassRoutes")
};

// Import custom v1 routes
const v1Routes = {
  shareClassRoutes: require('./routes/v1/shareClassRoutes'),
  financialReportRoutes: require('./routes/v1/financialReportRoutes')
};

// Route mapping with paths
const routeMappings = {
  '/api/financial-reports': 'financialReportRoutes',
  '/api/users': 'userRoutes',
  '/api/shareClasses': 'shareClassRoutes',
  '/api/stakeholders': 'stakeholderRoutes',
  '/api/documents': 'documentRoutes',
  '/api/fundraisingRounds': 'fundraisingRoundRoutes',
  '/api/equityPlans': 'equityPlanRoutes',
  '/api/documentEmbeddings': 'documentEmbeddingRoutes',
  '/api/employees': 'employeeRoutes',
  '/api/activities': 'activityRoutes',
  '/api/investments': 'investmentRoutes',
  '/api/admins': 'adminRoutes',
  '/api/documentAccesses': 'documentAccessRoutes',
  '/api/investors': 'investorRoutes',
  '/api/companies': 'companyRoutes',
  '/auth': 'authRoutes',
  '/api/communications': 'communicationRoutes',
  '/api/notifications': 'notificationRoutes',
  '/api/invites': 'inviteManagementRoutes',
  '/api/spvs': 'spvRoutes',
  '/api/spvassets': 'spvAssetRoutes',
  '/api/compliance-checks': 'complianceCheckRoutes',
  '/api/integration-modules': 'integrationModuleRoutes',
  '/api/taxCalculations': 'taxCalculatorRoutes'
};

// Keep track of routes that have custom v1 implementations
const hasCustomV1Implementation = ['shareClassRoutes', 'financialReportRoutes']; // Routes with custom v1 implementations

// Mount legacy routes only if they exist and don't have a custom v1 implementation
Object.entries(routeMappings).forEach(([path, routeName]) => {
  if (routes[routeName] && !hasCustomV1Implementation.includes(routeName)) {
    app.use(path, routes[routeName]);
  }
});

// Create versioned routes for legacy endpoints (except those with custom v1 implementations)
const filteredMappings = Object.fromEntries(
  Object.entries(routeMappings)
    .filter(([path, routeName]) => !hasCustomV1Implementation.includes(routeName))
);

// Apply versioning to legacy routes (not including those with custom v1 implementations) 
createVersionedRoutes(app, routes, filteredMappings);

// Mount custom v1 routes directly
// OCAE-208: Share class routes
if (routes.v1ShareClassRoutes) {
  app.use('/api/v1/shareClasses', routes.v1ShareClassRoutes);
  console.log('Registered custom v1 route: /api/v1/shareClasses -> v1ShareClassRoutes');
}

// OCAE-206: Financial report routes
app.use('/api/v1/financial-reports', v1Routes.financialReportRoutes);
console.log('Registered custom v1 route: /api/v1/financial-reports -> financialReportRoutes');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;