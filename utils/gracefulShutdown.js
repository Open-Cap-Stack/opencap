/**
 * Graceful Shutdown Utility
 * Issue #388
 *
 * Handles graceful shutdown of the application when receiving termination signals.
 * Ensures all connections are properly closed and pending operations are completed.
 */

const logger = console; // Use console for now, can be replaced with winston/pino

/**
 * List of cleanup handlers to execute on shutdown
 */
const cleanupHandlers = [];

/**
 * Flag to track if shutdown is in progress
 */
let isShuttingDown = false;

/**
 * Shutdown timeout in milliseconds (default: 30 seconds)
 */
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT) || 30000;

/**
 * Register a cleanup handler to be called during shutdown
 * @param {Function} handler - Async function to execute during shutdown
 * @param {string} name - Name of the handler for logging
 */
function registerCleanupHandler(handler, name = 'Unnamed Handler') {
  if (typeof handler !== 'function') {
    throw new Error('Cleanup handler must be a function');
  }

  cleanupHandlers.push({ handler, name });
  logger.log(`Registered cleanup handler: ${name}`);
}

/**
 * Execute all cleanup handlers with timeout protection
 * @returns {Promise<void>}
 */
async function executeCleanupHandlers() {
  logger.log(`Executing ${cleanupHandlers.length} cleanup handlers...`);

  const cleanupPromises = cleanupHandlers.map(async ({ handler, name }) => {
    try {
      logger.log(`Running cleanup handler: ${name}`);
      await handler();
      logger.log(`Completed cleanup handler: ${name}`);
    } catch (error) {
      logger.error(`Error in cleanup handler ${name}:`, error);
    }
  });

  // Wait for all handlers with a timeout
  await Promise.race([
    Promise.all(cleanupPromises),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cleanup timeout')), SHUTDOWN_TIMEOUT)
    ),
  ]).catch((error) => {
    logger.error('Cleanup timeout exceeded:', error.message);
  });
}

/**
 * Perform graceful shutdown
 * @param {string} signal - Signal that triggered shutdown
 * @param {number} exitCode - Exit code to use (default: 0)
 */
async function gracefulShutdown(signal = 'SIGTERM', exitCode = 0) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring additional signal');
    return;
  }

  isShuttingDown = true;
  logger.log(`\nReceived ${signal}, starting graceful shutdown...`);

  try {
    // Execute all registered cleanup handlers
    await executeCleanupHandlers();

    logger.log('Graceful shutdown completed successfully');
    process.exit(exitCode);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers for common termination signals
 * @param {Object} server - Express server instance (optional)
 */
function setupGracefulShutdown(server) {
  // Register server close handler if server is provided
  if (server) {
    registerCleanupHandler(
      () =>
        new Promise((resolve, reject) => {
          logger.log('Closing HTTP server...');
          server.close((err) => {
            if (err) {
              logger.error('Error closing HTTP server:', err);
              reject(err);
            } else {
              logger.log('HTTP server closed');
              resolve();
            }
          });

          // Force close after timeout
          setTimeout(() => {
            logger.warn('Forcing HTTP server close after timeout');
            resolve();
          }, SHUTDOWN_TIMEOUT - 1000);
        }),
      'HTTP Server'
    );
  }

  // Handle SIGTERM (Docker, Kubernetes)
  process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM', 0);
  });

  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    gracefulShutdown('SIGINT', 0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException', 1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection', 1);
  });

  logger.log('Graceful shutdown handlers registered');
}

module.exports = {
  setupGracefulShutdown,
  registerCleanupHandler,
  gracefulShutdown,
};
