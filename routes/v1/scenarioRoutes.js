/**
 * Scenario Routes
 * Issue #661: Unified scenario modeling endpoint
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const scenarioFundraiseController = require('../../controllers/scenarioFundraiseController');

router.use(authenticateToken);

/**
 * POST /api/v1/scenarios/fundraise
 * Issue #661: Unified fundraise scenario modeling
 * Accepts priced, SAFE, and convertible note instruments.
 * Returns per-stakeholder pre/post ownership table + scenario ID.
 */
router.post('/fundraise', scenarioFundraiseController.fundraise);

module.exports = router;
