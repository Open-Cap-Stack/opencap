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

// All export routes require authentication
router.get('/cap-table', authenticateToken, exportController.exportCapTable);
router.get('/stakeholders', authenticateToken, exportController.exportStakeholders);
router.get('/documents', authenticateToken, exportController.exportDocuments);

module.exports = router;
