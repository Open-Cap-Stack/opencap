/**
 * SAFE Routes
 * Feature: Issue #64, #66, #68 - SAFE Management
 */
const express = require('express');
const router = express.Router();
const safeController = require('../../controllers/safeController');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticateToken);

// SAFE CRUD operations
router.post('/', safeController.createSAFE);
router.get('/company/:companyId', safeController.getCompanySAFEs);
router.get('/company/:companyId/summary', safeController.getCompanySummary);
router.get('/:safeId', safeController.getSAFE);
router.put('/:safeId', safeController.updateSAFE);

// SAFE workflow
router.post('/:safeId/send', safeController.sendSAFE);
router.post('/:safeId/sign/investor', safeController.recordInvestorSignature);
router.post('/:safeId/sign/company', safeController.recordCompanySignature);
router.post('/:safeId/fund', safeController.markFunded);
router.post('/:safeId/cancel', safeController.cancelSAFE);

// Conversion operations
router.post('/company/:companyId/conversion/preview', safeController.previewConversion);
router.post('/company/:companyId/conversion/create', safeController.createConversions);
router.post('/conversion/:conversionId/execute', safeController.executeConversion);

module.exports = router;
