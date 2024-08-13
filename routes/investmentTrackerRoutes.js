const express = require('express');
const router = express.Router();
const investmentTrackerController = require('../controllers/investmentTrackerController');

// Route for tracking investments
router.post('/investments', investmentTrackerController.trackInvestment);

module.exports = router;
