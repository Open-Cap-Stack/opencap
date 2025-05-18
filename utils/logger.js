/**
 * Logger Utility
 * 
 * Provides consistent logging throughout the application with different log levels.
 * In test environment, logs are suppressed by default to keep test output clean.
 */

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ' ' + JSON.stringify(metadata, null, 2);
  }
  
  return msg;
});

// Create a logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport for all environments
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        logFormat
      ),
      silent: process.env.NODE_ENV === 'test' && !process.env.LOG_LEVEL // Silent in test env unless LOG_LEVEL is set
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new transports.File({ 
    filename: 'logs/combined.log' 
  }));
}

module.exports = logger;
