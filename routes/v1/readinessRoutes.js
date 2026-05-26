'use strict';

/**
 * Investor Readiness Score Routes
 * Issue #651: Public API + lead magnet
 *
 * POST /score       — public, rate-limited 3/day per IP
 * POST /score/full  — authenticated, any role
 * GET  /score/:companyId — authenticated, admin/founder only
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const readinessController = require('../../controllers/readinessController');

/**
 * Factory that builds a fresh router (with its own rate limiter store).
 * Exported as the router itself for standard Express mounting.
 */
function createReadinessRouter() {
  const router = express.Router();

  // Rate limiter: 3 requests per day (24h) per IP for the public endpoint
  const publicScoreRateLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      message: 'Rate limit exceeded. Free tier allows 3 readiness score requests per day. Sign up for unlimited access.',
    },
    skip: () => false,
    keyGenerator: (req) => {
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
  });

  // Public endpoint — rate limited
  router.post('/score', publicScoreRateLimit, readinessController.scorePublic);

  // Authenticated endpoint — full results
  router.post('/score/full', authenticateToken, (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  }, readinessController.scoreFull);

  // Company score from ZeroDB — admin/founder only
  router.get(
    '/score/:companyId',
    authenticateToken,
    hasRole(['super_admin', 'admin', 'founder']),
    readinessController.scoreCompany
  );

  return router;
}

// Default export is a router instance for standard app.use() mounting
module.exports = createReadinessRouter();

// Also export the factory for tests that need a fresh rate limiter
module.exports.createReadinessRouter = createReadinessRouter;
