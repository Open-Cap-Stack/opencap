/**
 * SAFE Routes
 * Feature: Issue #64, #66, #68 - SAFE Management
 */
const express = require('express');
const router = express.Router();
const safeController = require('../../controllers/safeController');
const SAFE = require('../../models/SAFE');
const { authenticateToken } = require('../../middleware/authMiddleware');

// Local helper (mirrors the one in safeController)
function normalizeSafeType(safe) {
  if (!safe || !safe.safeType) return safe;
  const typeMap = { post_money: 'post-money', pre_money: 'pre-money' };
  return { ...safe, safeType: typeMap[safe.safeType] || safe.safeType };
}

// Apply authentication to all routes
router.use(authenticateToken);

// SAFE CRUD operations
router.post('/', safeController.createSAFE);
// Root GET — list SAFEs for the authenticated user's company (frontend calls GET /safes)
router.get('/', (req, res, next) => {
  const companyId = req.user?.companyId;
  // If no companyId on token, fetch all SAFEs (companyId-less demo mode)
  if (!companyId) {
    return SAFE.find({}, { sort: { createdAt: -1 }, limit: 100 })
      .then(safes => res.json({ success: true, data: (safes || []).map(normalizeSafeType), pagination: { page: 1, limit: 100, total: (safes || []).length, pages: 1 } }))
      .catch(err => res.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } }));
  }
  req.params.companyId = companyId;
  return safeController.getCompanySAFEs(req, res, next);
});
router.get('/company/:companyId', safeController.getCompanySAFEs);
router.get('/company/:companyId/summary', safeController.getCompanySummary);
router.get('/:safeId', safeController.getSAFE);
router.put('/:safeId', safeController.updateSAFE);
router.delete('/:safeId', safeController.deleteSAFE);

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
