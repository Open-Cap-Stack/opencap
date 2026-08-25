/**
 * Test Application Setup
 * 
 * Provides Express app instance for testing
 * Sets up test-specific middleware and configuration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import routes
const authRoutes = require('../../routes/v1/authRoutes');
const userRoutes = require('../../routes/v1/userRoutes');
const financialReportRoutes = require('../../routes/v1/financialReportingRoutes');
const financialMetricsRoutes = require('../../routes/v1/financialMetricsRoutes');
const companyRoutes = require('../../routes/v1/companyRoutes');
const stakeholderRoutes = require('../../routes/v1/stakeholderRoutes');
const documentRoutes = require('../../routes/v1/documentRoutes');
const adminRoutes = require('../../routes/v1/adminRoutes');
const spvRoutes = require('../../routes/v1/spvRoutes');
const { authenticateToken } = require('../../middleware/authMiddleware');

let server;

/**
 * Create Express app for testing
 */
function createApp() {
  const app = express();

  // Enable MOCK_AUTH for integration tests so authenticateToken accepts JWT
  // claims without requiring a real DB user record.
  process.env.MOCK_AUTH = 'true';

  // Test environment middleware
  if (process.env.NODE_ENV === 'test') {
    app.use(morgan('combined'));
  }
  
  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
  }));
  
  // CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Compression
  app.use(compression());
  
  // Health check for tests
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Test server is running' });
  });
  
  // App-level auth middleware (mirrors main app.js behavior).
  // Authenticates all /api/v1 routes except auth, health, and webhook paths
  // so that req.user is set before route-level hasRole/hasPermission guards run.
  app.use('/api/v1', (req, res, next) => {
    const skipPaths = ['/auth', '/health', '/webhooks', '/billing/plans', '/billing/webhook'];
    if (skipPaths.some(p => req.path.startsWith(p))) {
      return next();
    }
    return authenticateToken(req, res, next);
  });

  // API routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/financial-reports', financialReportRoutes);
  app.use('/api/v1/metrics', financialMetricsRoutes);
  app.use('/api/v1/companies', companyRoutes);
  app.use('/api/v1/stakeholders', stakeholderRoutes);
  app.use('/api/v1/documents', documentRoutes);
  app.use('/api/v1/admin', adminRoutes);
  
  // SPV routes
  app.use('/api/spvs', spvRoutes);
  app.use('/api/v1/spvs', spvRoutes);

  // Legacy routes (for backward compatibility in tests)
  app.use('/api/users', userRoutes);
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Test app error:', err.message || err);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: status < 500 ? 'Bad request' : 'Internal server error',
      message: process.env.NODE_ENV === 'test' ? err.message : 'Something went wrong'
    });
  });
  
  return app;
}

/**
 * Start test server
 */
async function startServer(port = 5001) {
  try {
    const app = createApp();
    
    server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
    });
    
    return server;
  } catch (error) {
    console.error('Error starting test server:', error);
    throw error;
  }
}

/**
 * Stop test server
 */
async function stopServer() {
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('Test server stopped');
    }
  } catch (error) {
    console.error('Error stopping test server:', error);
    throw error;
  }
}

module.exports = {
  createApp,
  startServer,
  stopServer
};