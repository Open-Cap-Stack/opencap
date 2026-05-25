/**
 * Migration Routes
 * Issue #652: Carta migration score tool
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const cartaMigrationController = require('../../controllers/cartaMigrationController');

router.use(authenticateToken);

/**
 * POST /api/v1/migration/carta/analyze
 * Analyze a Carta export and return migration readiness score
 */
router.post('/carta/analyze', cartaMigrationController.analyzeCartaExport);

module.exports = router;
