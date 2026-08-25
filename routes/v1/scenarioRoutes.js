/**
 * Scenario Routes
 * Issue #661: Unified scenario modeling endpoint
 * Issue #176: RBAC-protected CRUD stubs (replaced unprotected inline handlers in app.js)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const scenarioFundraiseController = require('../../controllers/scenarioFundraiseController');
const scenarioController = require('../../controllers/scenarioController');

router.use(authenticateToken);

const SCENARIO_ROLES = ['super_admin', 'admin', 'founder'];

/**
 * GET /api/v1/scenarios
 * Issue #176: List scenarios (stub — returns empty list for frontend localStorage fallback)
 */
router.get('/', hasRole(SCENARIO_ROLES), scenarioController.list);

/**
 * POST /api/v1/scenarios
 * Issue #176: Create a scenario (stub — echoes back body with generated id)
 */
router.post('/', hasRole(SCENARIO_ROLES), scenarioController.create);

/**
 * PUT /api/v1/scenarios/:id
 * Issue #176: Update a scenario (stub — echoes back body with id)
 */
router.put('/:id', hasRole(SCENARIO_ROLES), scenarioController.update);

/**
 * DELETE /api/v1/scenarios/:id
 * Issue #176: Delete a scenario (stub — returns success)
 */
router.delete('/:id', hasRole(SCENARIO_ROLES), scenarioController.remove);

/**
 * POST /api/v1/scenarios/fundraise
 * Issue #661: Unified fundraise scenario modeling
 * Accepts priced, SAFE, and convertible note instruments.
 * Returns per-stakeholder pre/post ownership table + scenario ID.
 */
router.post('/fundraise', hasRole(['super_admin', 'admin', 'founder', 'manager']), scenarioFundraiseController.fundraise);

module.exports = router;
