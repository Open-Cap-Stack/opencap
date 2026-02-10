// investor.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const investorController = require('../../controllers/investorController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Investor routes
router.get('/', investorController.getAllInvestors);
router.get('/:id', investorController.getInvestorById);
router.post('/', investorController.createInvestor);
router.put('/:id', investorController.updateInvestor);
router.delete('/:id', investorController.deleteInvestor);

module.exports = router;
