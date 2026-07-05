/**
 * Export Routes
 *
 * Provides CSV/XLSX download endpoints for cap table, stakeholders,
 * and documents.
 */

const express = require('express');
const router = express.Router();
const exportController = require('../../controllers/exportController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

router.get('/cap-table', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant']), exportController.exportCapTable);
router.get('/stakeholders', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant']), exportController.exportStakeholders);
router.get('/documents', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant']), exportController.exportDocuments);

module.exports = router;
