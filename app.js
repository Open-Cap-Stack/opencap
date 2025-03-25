// app.js
const express = require("express");
const dotenv = require("dotenv");
const fs = require("fs");
const { connectToMongoDB } = require('./db/mongoConnection');
const { addVersionHeaders, createVersionedRoutes, validateApiVersion } = require('./middleware/apiVersioning');

// Initialize dotenv to load environment variables
dotenv.config();

// Initialize the Express app
const app = express();
app.use(express.json());

// Apply API versioning middleware
app.use(addVersionHeaders);
app.use(validateApiVersion);

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

// Mount legacy routes
Object.entries(routeMappings).forEach(([path, routeName]) => {
  if (routes[routeName]) {
    app.use(path, routes[routeName]);
  }
});

// Create versioned routes for legacy endpoints (except those with custom v1 implementations)
const excludeFromAutoVersioning = ['shareClasses']; // Routes with custom v1 implementations

const filteredMappings = Object.fromEntries(
  Object.entries(routeMappings)
    .filter(([path]) => {
      // Extract resource path (e.g., '/api/shareClasses' -> 'shareClasses')
      const resourcePath = path.replace('/api/', '');
      return !excludeFromAutoVersioning.includes(resourcePath);
    })
);

// Apply versioning to legacy routes (not including those with custom v1 implementations) 
createVersionedRoutes(app, routes, filteredMappings);

// Mount custom v1 routes directly
if (routes.v1ShareClassRoutes) {
  app.use('/api/v1/shareClasses', routes.v1ShareClassRoutes);
  console.log('Registered custom v1 route: /api/v1/shareClasses -> v1ShareClassRoutes');
}

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