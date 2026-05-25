/**
 * 409A Trigger Detection Routes
 * Issue #654: Automatic 409A trigger detection
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const valuation409ATriggerService = require('../../services/valuation409ATriggerService');

router.use(authenticateToken);

/**
 * GET /api/v1/valuations/409a/staleness-check
 * Check whether a company's 409A is stale and detect trigger events
 * Query params: companyId, lastValuationDate
 */
router.get('/409a/staleness-check', async (req, res) => {
  try {
    const { companyId, lastValuationDate } = req.query;

    if (!companyId) {
      return res.status(400).json({ message: 'companyId query parameter is required' });
    }

    const result = await valuation409ATriggerService.analyzeStaleness({
      companyId,
      lastValuationDate: lastValuationDate || null,
      recentEvents: []
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('409A staleness check failed:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
