'use strict';

/**
 * Mercury Banking Integration Routes
 * Issues #671-#675: Mercury API routes
 * Issues #674, #679: SAFE funding verification + Mercury snapshots
 *
 * Base path: /api/v1/integrations/mercury
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const mercuryImportController = require('../../controllers/mercuryImportController');
const mercuryController = require('../../controllers/mercuryController');

const ALLOWED_ROLES = ['super_admin', 'admin', 'founder'];

// All Mercury routes require authentication
router.use(authenticateToken);

// GET  /status          — Mercury connection status (#671)
router.get('/status', hasRole(ALLOWED_ROLES), mercuryController.getStatus);

// GET  /accounts        — List connected Mercury bank accounts (#671)
router.get('/accounts', hasRole(ALLOWED_ROLES), mercuryController.getAccounts);

// GET  /balance         — Aggregated balance, burn rate, runway (#672)
router.get('/balance', hasRole(ALLOWED_ROLES), mercuryController.getBalance);

// POST /verify-funding  — Verify SAFE funding via Mercury wire (#674)
router.post('/verify-funding', hasRole(ALLOWED_ROLES), mercuryController.verifyFunding);

// POST /snapshots       — Create a Mercury balance snapshot (#679)
router.post('/snapshots', hasRole(ALLOWED_ROLES), mercuryController.createSnapshot);

// POST /import-statements — Import bank statements from Mercury (#675)
router.post(
    '/import-statements',
    hasRole(ALLOWED_ROLES),
    mercuryImportController.importStatements
);

module.exports = router;
