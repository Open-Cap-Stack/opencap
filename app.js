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
  taxCalculatorRoutes: safeRequire("./routes/taxCalculatorRoutes")
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
const hasCustomV1Implementation = Object.keys(v1Routes);

// Mount legacy routes only if they exist and don't have a custom v1 implementation
Object.entries(routeMappings).forEach(([path, routeName]) => {
  // Skip routes that have custom v1 implementations
  if (routes[routeName] && !hasCustomV1Implementation.includes(routeName)) {
    app.use(path, routes[routeName]);
  }
});

// Create versioned routes (e.g., /api/v1/spvs) but skip those with custom v1 implementations
const filteredRouteMappings = Object.entries(routeMappings)
  .filter(([_, routeName]) => !hasCustomV1Implementation.includes(routeName))
  .reduce((acc, [path, routeName]) => ({ ...acc, [path]: routeName }), {});

createVersionedRoutes(app, routes, filteredRouteMappings);

// Mount custom v1 routes manually
app.use('/api/v1/share-classes', v1Routes.shareClassRoutes);
app.use('/api/v1/financial-reports', v1Routes.financialReportRoutes);

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