/**
 * TenderOffer Routes
 * Issue #105: Implement Tender Offer System (Basic)
 *
 * API routes for tender offer management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const tenderOfferController = require('../../controllers/tenderOfferController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Tender Offer CRUD
router.post('/tender-offers', tenderOfferController.createTenderOffer);
router.get('/tender-offers', tenderOfferController.getTenderOffers);
router.get('/tender-offers/:id', tenderOfferController.getTenderOffer);
router.put('/tender-offers/:id', tenderOfferController.updateTenderOffer);
router.delete('/tender-offers/:id', tenderOfferController.deleteTenderOffer);

// Tender Offer Lifecycle
router.post('/tender-offers/:id/publish', tenderOfferController.publishTenderOffer);
router.post('/tender-offers/:id/close', tenderOfferController.closeTenderOffer);
router.post('/tender-offers/:id/settle', tenderOfferController.settleOffer);
router.post('/tender-offers/:id/cancel', tenderOfferController.cancelTenderOffer);

// Tender Offer Analytics
router.get('/tender-offers/:id/summary', tenderOfferController.getOfferSummary);
router.get('/tender-offers/:id/submissions', tenderOfferController.getSubmissionsForOffer);

// Tender Submissions
router.post('/tender-submissions', tenderOfferController.submitTender);
router.get('/tender-submissions/:id', tenderOfferController.getSubmission);
router.post('/tender-submissions/:id/withdraw', tenderOfferController.withdrawSubmission);

module.exports = router;
