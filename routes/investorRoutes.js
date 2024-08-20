// investor.routes.js
const express = require('express');
const router = express.Router();
const investorController = require('../controllers/investorController');

// Investor routes
router.get('/', investorController.getAllInvestors);
router.get('/:id', investorController.getInvestorById);
router.post('/', investorController.createInvestor);
router.put('/:id', investorController.updateInvestor);
router.delete('/:id', investorController.deleteInvestor);

module.exports = router;
