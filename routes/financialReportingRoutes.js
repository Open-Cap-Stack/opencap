// routes/financialReportingRoutes.js
const express = require('express');
const router = express.Router();
const financialReportController = require('../controllers/financialReportingController');
const { validateApiKey } = require('../utils/auth');  // Updated path to utils instead of middleware

// Authentication middleware
router.use(validateApiKey);

// Routes
router.post('/financial-reports', financialReportController.createFinancialReport);
router.get('/financial-reports', financialReportController.listFinancialReports);
router.get('/financial-reports/:id', financialReportController.getFinancialReport);
router.put('/financial-reports/:id', financialReportController.updateFinancialReport);
router.delete('/financial-reports/:id', financialReportController.deleteFinancialReport);

module.exports = router;