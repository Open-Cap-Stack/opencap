/**
 * Accountant Routes
 * Feature: AI-Powered 409A Valuation - Accountant Review Workflow
 */
const express = require('express');
const router = express.Router();
const accountantController = require('../../controllers/accountantController');
const { authenticateToken } = require('../../middleware/authMiddleware');

router.use(authenticateToken);

// Queue management
router.get('/queue', accountantController.getQueue);
router.get('/queue/:queueId', accountantController.getQueueItem);
router.post('/queue/:queueId/claim', accountantController.claimQueueItem);
router.post('/queue/:queueId/start-review', accountantController.startReview);

// Annotations on a valuation
router.post('/valuations/:valuationId/annotate', accountantController.addAnnotation);
router.put('/valuations/:valuationId/annotations/:annotationId/resolve', accountantController.resolveAnnotation);

// Sign-off and release
router.post('/valuations/:valuationId/approve', accountantController.approveAndSign);
router.post('/valuations/:valuationId/release', accountantController.releaseToCompany);

// Dashboard stats
router.get('/stats', accountantController.getStats);

// Stripe Connect payout onboarding
router.post('/connect/onboard', accountantController.createConnectOnboardingLink);
router.get('/connect/status', accountantController.getConnectStatus);

// Transfer history
router.get('/transfers', accountantController.getTransferHistory);

// Admin: accountant management
router.get('/accountants', accountantController.listAccountants);
router.patch('/queue/:queueId/assign', accountantController.adminAssignQueueItem);

module.exports = router;
