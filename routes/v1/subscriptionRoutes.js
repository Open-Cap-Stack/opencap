/**
 * Subscription Routes
 * Issue #115: Implement Subscription System
 *
 * API routes for subscription and plan management
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/authMiddleware');
const subscriptionController = require('../../controllers/subscriptionController');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Subscription CRUD operations
router.post('/subscriptions', subscriptionController.createSubscription);
router.get('/subscriptions', subscriptionController.getSubscriptions);
router.get('/subscriptions/status', subscriptionController.getSubscriptionStatus);
router.get('/subscriptions/feature-access', subscriptionController.checkFeatureAccess);
router.get('/subscriptions/usage-limit', subscriptionController.checkUsageLimit);
router.get('/subscriptions/:id', subscriptionController.getSubscription);
router.put('/subscriptions/:id', subscriptionController.updateSubscription);

// Subscription lifecycle operations
router.post('/subscriptions/:id/cancel', subscriptionController.cancelSubscription);
router.post('/subscriptions/:id/pause', subscriptionController.pauseSubscription);
router.post('/subscriptions/:id/resume', subscriptionController.resumeSubscription);
router.post('/subscriptions/:id/reactivate', subscriptionController.reactivateSubscription);
router.post('/subscriptions/:id/renew', subscriptionController.processRenewal);

// Plan management operations
router.get('/plans', subscriptionController.getPlans);
router.post('/plans', subscriptionController.createPlan);
router.get('/plans/:id', subscriptionController.getPlan);
router.put('/plans/:id', subscriptionController.updatePlan);
router.delete('/plans/:id', subscriptionController.deletePlan);

module.exports = router;
