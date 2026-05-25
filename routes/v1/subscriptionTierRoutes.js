/**
 * Subscription Tier Routes
 * Issue #114: Define Subscription Tiers for OpenCap Stack
 *
 * API endpoints for subscription tier management
 */

const express = require('express');
const router = express.Router();
const subscriptionTierController = require('../../controllers/subscriptionTierController');
const { authenticateToken } = require('../../middleware/authMiddleware');
const { hasRole } = require('../../middleware/rbacMiddleware');

// Public routes
router.get('/', subscriptionTierController.getAllTiers);
router.get('/compare/:tier1/:tier2', subscriptionTierController.compareTiers);
router.get('/:name/features', subscriptionTierController.getTierFeatures);
router.get('/:name', subscriptionTierController.getTierByName);

// Authenticated routes
router.get('/company/:companyId/feature/:featureName', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), subscriptionTierController.checkFeatureAccess);
router.get('/company/:companyId/limit/:limitName', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), subscriptionTierController.checkUsageLimit);
router.get('/company/:companyId/upgrades', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), subscriptionTierController.getUpgradeOptions);
router.get('/company/:companyId/limits', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), subscriptionTierController.getCompanyLimits);

// Admin routes
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

router.post('/', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), requireAdmin, subscriptionTierController.createTier);
router.put('/:tierId', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), requireAdmin, subscriptionTierController.updateTier);
router.delete('/:tierId', authenticateToken, hasRole(['super_admin', 'admin', 'founder', 'accountant', 'manager', 'service_provider', 'investor', 'employee', 'client']), requireAdmin, subscriptionTierController.deleteTier);

module.exports = router;
