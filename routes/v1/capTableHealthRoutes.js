/**
 * Cap Table Health Routes
 * Issue #660: Cap table health scorecard engine
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const capTableHealthService = require('../../services/capTableHealthService');

router.use(authenticateToken);

/**
 * GET /api/v1/cap-table/health-score
 * Issue #660: Compute cap table health scorecard for a company
 * Query: companyId (required), and optionally lastValuationDate
 * Body can also contain full data payload for richer scoring
 */
router.get('/health-score', hasRole(['super_admin', 'admin', 'founder', 'manager']), async (req, res) => {
  try {
    const { companyId, lastValuationDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'companyId query parameter is required' });
    }

    // Accept richer data from request body or fall back to query params only
    const data = {
      companyId,
      lastValuationDate: lastValuationDate || null,
      documents: req.body?.documents || [],
      stakeholders: req.body?.stakeholders || [],
      shareClasses: req.body?.shareClasses || [],
      equityGrants: req.body?.equityGrants || [],
      safes: req.body?.safes || []
    };

    const result = capTableHealthService.computeHealthScore(data);
    res.status(200).json(result);
  } catch (error) {
    console.error('Cap table health score failed:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
