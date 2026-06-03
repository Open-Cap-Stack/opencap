/**
 * Investor Portal Routes
 *
 * Endpoints:
 *   GET  /summary  — aggregate metrics (admin, founder, accountant, investor)
 *   POST /invite   — invite an investor to view the portal (admin, founder)
 *   GET  /access   — list who has portal access (admin, founder)
 */
const express = require('express');
const router = express.Router();
const investorPortalController = require('../../controllers/investorPortalController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

router.use(authenticateToken);

// Summary — viewable by admin, founder, accountant, and investor roles
router.get(
  '/summary',
  hasRole(['super_admin', 'admin', 'founder', 'accountant', 'investor']),
  investorPortalController.getSummary
);

// Invite — restricted to admin and founder
router.post(
  '/invite',
  hasRole(['super_admin', 'admin', 'founder']),
  investorPortalController.inviteInvestor
);

// Access list — restricted to admin and founder
router.get(
  '/access',
  hasRole(['super_admin', 'admin', 'founder']),
  investorPortalController.getAccessList
);

module.exports = router;
