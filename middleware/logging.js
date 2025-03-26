/**
 * OpenCap Logging Middleware
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * 
 * This module configures request logging for the OpenCap API
 * using morgan with customized output formatting.
 */

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Custom token for API version
morgan.token('api-version', (req) => req.headers['x-api-version'] || 'none');

// Custom token for user ID (when authenticated)
morgan.token('user-id', (req) => (req.user ? req.user.id : 'anonymous'));

// Create a custom logging format
const logFormat = process.env.NODE_ENV === 'production'
  ? ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms - API v:api-version'
  : '[:date[clf]] :method :url :status :response-time ms - :res[content-length] - API v:api-version';

// Initialize logging middleware based on environment
const getLoggingMiddleware = () => {
  if (process.env.NODE_ENV === 'test' && !process.env.ENABLE_TEST_LOGS) {
    // Skip logging in test environment unless explicitly enabled
    return (req, res, next) => next();
  }
  
  if (process.env.NODE_ENV === 'production') {
    // In production, log to both console and file
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Create a write stream for access logs
    const accessLogStream = fs.createWriteStream(
      path.join(logsDir, 'access.log'),
      { flags: 'a' }
    );
    
    // Setup console and file logging
    return [
      morgan(logFormat, { stream: accessLogStream }),
      morgan(logFormat)
    ];
  }
  
  // For development and other environments, just log to console
  return morgan(logFormat);
};

module.exports = getLoggingMiddleware;
