// investor.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const investorController = require('../../controllers/investorController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Search (must be before /:id)
router.get('/search', investorController.searchInvestors);

// Bulk create for programmatic seeding
router.post('/bulk', investorController.bulkCreateInvestors);

// Investor routes
router.get('/', investorController.getAllInvestors);
router.get('/:id', investorController.getInvestorById);
router.post('/', investorController.createInvestor);
router.put('/:id', investorController.updateInvestor);
router.delete('/:id', investorController.deleteInvestor);

module.exports = router;
