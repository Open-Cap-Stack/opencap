/**
 * OpenCap Security Middleware - CORS Configuration
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * 
 * This module configures CORS middleware for Express to handle
 * cross-origin requests securely.
 */

const cors = require('cors');

/**
 * Configure CORS options for the OpenCap API
 * - Controls which domains can access the API
 * - Specifies allowed methods and headers
 * - Sets appropriate security options
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // In test environment, allow all origins
    if (process.env.NODE_ENV === 'test') {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    const allowedOrigins = [
      // Development origins
      'http://localhost:3000',
      'http://localhost:8080',
      'http://example.com', // Used in tests
      // Production origins - these should be set in environment variables in production
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'x-api-version'],
  exposedHeaders: ['x-api-version', 'x-ratelimit-limit', 'x-ratelimit-remaining'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

module.exports = cors(corsOptions);
