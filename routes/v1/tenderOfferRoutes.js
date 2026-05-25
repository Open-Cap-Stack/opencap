/**
 * TenderOffer Routes
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * API routes for tender offer management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const tenderOfferController = require('../../controllers/tenderOfferController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Tender Offer CRUD
router.post('/tender-offers', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.createTenderOffer);
router.get('/tender-offers', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.getTenderOffers);
router.get('/tender-offers/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.getTenderOffer);
router.put('/tender-offers/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.updateTenderOffer);
router.delete('/tender-offers/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.deleteTenderOffer);

// Tender Offer Lifecycle
router.post('/tender-offers/:id/publish', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.publishTenderOffer);
router.post('/tender-offers/:id/close', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.closeTenderOffer);
router.post('/tender-offers/:id/settle', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.settleOffer);
router.post('/tender-offers/:id/cancel', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.cancelTenderOffer);

// Tender Offer Analytics
router.get('/tender-offers/:id/summary', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.getOfferSummary);
router.get('/tender-offers/:id/submissions', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.getSubmissionsForOffer);

// Tender Submissions
router.post('/tender-submissions', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.submitTender);
router.get('/tender-submissions/:id', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.getSubmission);
router.post('/tender-submissions/:id/withdraw', hasRole(['super_admin', 'admin', 'founder', 'manager']), tenderOfferController.withdrawSubmission);

module.exports = router;
