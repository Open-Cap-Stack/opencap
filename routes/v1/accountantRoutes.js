/**
 * Accountant Routes
 * Feature: AI-Powered 409A Valuation - Accountant Review Workflow
 */
const express = require('express');
const router = express.Router();
const accountantController = require('../../controllers/accountantController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

router.use(authenticateToken);

// Queue management
router.get('/queue', hasRole(['super_admin', 'admin', 'founder', 'accountant']), accountantController.getQueue);
router.get('/queue/:queueId', hasRole(['super_admin', 'admin', 'founder', 'accountant']), accountantController.getQueueItem);
router.post('/queue/:queueId/claim', hasRole(['super_admin', 'admin', 'accountant']), accountantController.claimQueueItem);
router.post('/queue/:queueId/start-review', hasRole(['super_admin', 'admin', 'accountant']), accountantController.startReview);

// Annotations on a valuation
router.post('/valuations/:valuationId/annotate', hasRole(['super_admin', 'admin', 'accountant']), accountantController.addAnnotation);
router.put('/valuations/:valuationId/annotations/:annotationId/resolve', hasRole(['super_admin', 'admin', 'accountant']), accountantController.resolveAnnotation);

// Sign-off and release
router.post('/valuations/:valuationId/approve', hasRole(['super_admin', 'admin', 'accountant']), accountantController.approveAndSign);
router.post('/valuations/:valuationId/release', hasRole(['super_admin', 'admin', 'accountant']), accountantController.releaseToCompany);

// Dashboard stats
router.get('/stats', hasRole(['super_admin', 'admin', 'founder', 'accountant']), accountantController.getStats);

// Stripe Connect payout onboarding
router.post('/connect/onboard', hasRole(['super_admin', 'admin', 'accountant']), accountantController.createConnectOnboardingLink);
router.get('/connect/status', hasRole(['super_admin', 'admin', 'accountant']), accountantController.getConnectStatus);

// Transfer history
router.get('/transfers', hasRole(['super_admin', 'admin', 'founder', 'accountant']), accountantController.getTransferHistory);

// Admin: accountant management
router.get('/accountants', hasRole(['super_admin', 'admin']), accountantController.listAccountants);
router.patch('/queue/:queueId/assign', hasRole(['super_admin', 'admin']), accountantController.adminAssignQueueItem);

module.exports = router;
