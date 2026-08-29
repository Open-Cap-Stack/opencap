/**
 * SAFE Routes
 * Feature: Issue #64, #66, #68 - SAFE Management
 */
const express = require('express');
const router = express.Router();
const safeController = require('../../controllers/safeController');
const SAFE = require('../../models/SAFE');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const { requireAccreditation } = require('../../middleware/kycVerification');

// Local helper (mirrors the one in safeController)
function normalizeSafeType(safe) {
  if (!safe || !safe.safeType) return safe;
  const typeMap = { post_money: 'post-money', pre_money: 'pre-money' };
  return { ...safe, safeType: typeMap[safe.safeType] || safe.safeType };
}

// Apply authentication to all routes
router.use(authenticateToken);

// SAFE CRUD operations
router.post('/', hasRole(['super_admin', 'admin', 'founder', 'manager']), requireAccreditation('safe'), safeController.createSAFE);
// Root GET — list SAFEs for the authenticated user's company (frontend calls GET /safes)
router.get('/', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), (req, res, next) => {
  const companyId = req.user?.companyId || '';
  req.params = { ...req.params, companyId };
  return safeController.getCompanySAFEs(req, res, next);
});
router.get('/company/:companyId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), safeController.getCompanySAFEs);
router.get('/company/:companyId/summary', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), safeController.getCompanySummary);
router.get('/:safeId', hasRole(['super_admin', 'admin', 'founder', 'manager', 'employee']), safeController.getSAFE);
router.put('/:safeId', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.updateSAFE);
router.patch('/:safeId/status', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.updateStatus);
router.delete('/:safeId', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.deleteSAFE);

// SAFE workflow
router.post('/:safeId/send', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.sendSAFE);
router.post('/:safeId/sign/investor', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.recordInvestorSignature);
router.post('/:safeId/sign/company', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.recordCompanySignature);
router.post('/:safeId/fund', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.markFunded);
router.post('/:safeId/cancel', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.cancelSAFE);

// Conversion operations
router.post('/company/:companyId/conversion/preview', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.previewConversion);
router.post('/company/:companyId/conversion/create', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.createConversions);
router.post('/conversion/:conversionId/execute', hasRole(['super_admin', 'admin', 'founder', 'manager']), safeController.executeConversion);

module.exports = router;
