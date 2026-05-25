/**
 * Subscription Routes
 * Issue #115: Implement Subscription System
 *
 * API routes for subscription and plan management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');
const subscriptionController = require('../../controllers/subscriptionController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Subscription CRUD operations
router.post('/subscriptions', hasRole(['super_admin', 'admin']), subscriptionController.createSubscription);
router.get('/subscriptions', hasRole(['super_admin', 'admin']), subscriptionController.getSubscriptions);
router.get('/subscriptions/status', hasRole(['super_admin', 'admin']), subscriptionController.getSubscriptionStatus);
router.get('/subscriptions/feature-access', hasRole(['super_admin', 'admin']), subscriptionController.checkFeatureAccess);
router.get('/subscriptions/usage-limit', hasRole(['super_admin', 'admin']), subscriptionController.checkUsageLimit);
router.get('/subscriptions/:id', hasRole(['super_admin', 'admin']), subscriptionController.getSubscription);
router.put('/subscriptions/:id', hasRole(['super_admin', 'admin']), subscriptionController.updateSubscription);

// Subscription lifecycle operations
router.post('/subscriptions/:id/cancel', hasRole(['super_admin', 'admin']), subscriptionController.cancelSubscription);
router.post('/subscriptions/:id/pause', hasRole(['super_admin', 'admin']), subscriptionController.pauseSubscription);
router.post('/subscriptions/:id/resume', hasRole(['super_admin', 'admin']), subscriptionController.resumeSubscription);
router.post('/subscriptions/:id/reactivate', hasRole(['super_admin', 'admin']), subscriptionController.reactivateSubscription);
router.post('/subscriptions/:id/renew', hasRole(['super_admin', 'admin']), subscriptionController.processRenewal);

// Plan management operations
router.get('/plans', hasRole(['super_admin', 'admin']), subscriptionController.getPlans);
router.post('/plans', hasRole(['super_admin', 'admin']), subscriptionController.createPlan);
router.get('/plans/:id', hasRole(['super_admin', 'admin']), subscriptionController.getPlan);
router.put('/plans/:id', hasRole(['super_admin', 'admin']), subscriptionController.updatePlan);
router.delete('/plans/:id', hasRole(['super_admin', 'admin']), subscriptionController.deletePlan);

module.exports = router;
