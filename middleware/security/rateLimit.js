/**
 * OpenCap Security Middleware - Rate Limiting
 * 
 * [Feature] OCAE-201: Set up Express server with middleware
 * 
 * This module configures rate limiting for the API to prevent abuse
 * and maintain service quality for all users.
 */

const rateLimit = require('express-rate-limit');

// Create a rate limiter middleware
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: true, // Add X-RateLimit headers for older compatibility
  message: {
    status: 429,
    error: 'Too many requests, please try again later.',
  },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
});

// Special endpoints that need more strict rate limiting
const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    status: 429,
    error: 'Too many authentication attempts, please try again later.',
  },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === 'test' && process.env.DISABLE_RATE_LIMIT === 'true',
});

// Test endpoint for rate limit testing
const testRateLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 5, // Limit each IP to 5 requests per 10 seconds
  standardHeaders: true,
  legacyHeaders: true,
  message: {
    status: 429,
    error: 'Rate limit exceeded for test endpoint.',
  },
  // Don't skip in test environment since this is for test purposes
  skip: () => false
});

module.exports = {
  rateLimiter,
  authRateLimiter,
  testRateLimiter
};
