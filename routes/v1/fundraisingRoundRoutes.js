/**
 * Fundraising Round Routes
 *
 * Issue #252: Fix Fundraising Model Page 401 Unauthorized Error
 * API endpoints for fundraising round operations
 */

const express = require('express');
const router = express.Router();
const fundraisingRoundController = require('../../controllers/fundraisingRoundController');
const { authenticate } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Apply authentication to all routes
router.use(authenticate);

router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraisingRoundController.createFundraisingRound);
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraisingRoundController.getFundraisingRounds);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraisingRoundController.getFundraisingRoundById);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraisingRoundController.updateFundraisingRound);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), fundraisingRoundController.deleteFundraisingRound);

module.exports = router;
