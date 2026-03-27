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

// Apply authentication to all routes
router.use(authenticate);

router.post('/', fundraisingRoundController.createFundraisingRound);
router.get('/', fundraisingRoundController.getFundraisingRounds);
router.get('/:id', fundraisingRoundController.getFundraisingRoundById);
router.put('/:id', fundraisingRoundController.updateFundraisingRound);
router.delete('/:id', fundraisingRoundController.deleteFundraisingRound);

module.exports = router;
