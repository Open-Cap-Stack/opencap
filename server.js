// server.js
const app = require('./app');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle server shutdown gracefully
    const shutdown = async () => {
      console.log('Shutting down server...');
      await new Promise((resolve) => {
        server.close(resolve);
      });
      // ZeroDB uses HTTP API, no persistent connection to close
      console.log('Server shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = { startServer }; // Export for testing purposes
