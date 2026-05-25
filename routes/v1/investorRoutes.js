// investor.routes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const investorController = require('../../controllers/investorController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Search (must be before /:id)
router.get('/search', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorController.searchInvestors);

// Bulk create for programmatic seeding
router.post('/bulk', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorController.bulkCreateInvestors);

// Investor routes
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorController.getAllInvestors);
router.get('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorController.getInvestorById);
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorController.createInvestor);
router.put('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorController.updateInvestor);
router.delete('/:id', hasRole(['super_admin', 'admin', 'founder', 'manager', 'service_provider']), investorController.deleteInvestor);

module.exports = router;
