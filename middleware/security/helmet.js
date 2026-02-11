/**
 * OpenCap Security Middleware - Helmet Configuration
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * 
 * This module configures helmet middleware for Express to enhance 
 * API security by setting various HTTP headers.
 */

const helmet = require('helmet');

// Configure helmet with hardened CSP for financial applications
// Issue #383: Remove unsafe-inline directives to prevent XSS attacks
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Removed unsafe-inline - use nonces or hashes for inline scripts
      scriptSrc: ["'self'"],
      // Removed unsafe-inline - use external stylesheets or nonces
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  xssFilter: true,
  noSniff: true,
  frameguard: { action: 'deny' },
  hsts: {
    maxAge: 31536000, // 1 year in seconds (increased from 180 days)
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Additional security headers
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  dnsPrefetchControl: { allow: false },
});

module.exports = helmetMiddleware;
