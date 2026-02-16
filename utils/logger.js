/**
 * Structured Logger Utility
 *
 * Provides JSON-formatted log output with consistent fields
 * for better observability in production environments.
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
}

const logger = {
  debug(message, meta) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.debug(formatLog('debug', message, meta));
    }
  },
  info(message, meta) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.info(formatLog('info', message, meta));
    }
  },
  warn(message, meta) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  error(message, meta) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatLog('error', message, meta));
    }
  }
};

module.exports = logger;
