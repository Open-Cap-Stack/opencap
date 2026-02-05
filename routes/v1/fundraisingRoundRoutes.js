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

router.post('/fundraising-rounds', fundraisingRoundController.createFundraisingRound);
router.get('/fundraising-rounds', fundraisingRoundController.getFundraisingRounds);
router.get('/fundraising-rounds/:id', fundraisingRoundController.getFundraisingRoundById);
router.put('/fundraising-rounds/:id', fundraisingRoundController.updateFundraisingRound);
router.delete('/fundraising-rounds/:id', fundraisingRoundController.deleteFundraisingRound);

module.exports = router;
