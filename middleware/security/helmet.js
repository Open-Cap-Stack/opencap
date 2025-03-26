/**
 * OpenCap Security Middleware - Helmet Configuration
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * 
 * This module configures helmet middleware for Express to enhance 
 * API security by setting various HTTP headers.
 */

const helmet = require('helmet');

// Configure helmet with sensible defaults for financial applications
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  xssFilter: true, // Simple boolean for XSS protection
  noSniff: true,
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 15552000, // 180 days in seconds
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

module.exports = helmetMiddleware;
