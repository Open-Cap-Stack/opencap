/**
 * Investment Tracker Routes - V1
 * [Feature] OCAE-208: Investment tracking endpoints
 */

const express = require('express');
const router = express.Router();
const investmentTrackerController = require('../../controllers/investmentTrackerController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Route for tracking investments
router.post('/', authenticateToken, investmentTrackerController.trackInvestment);

module.exports = router;
