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

// Public routes
router.get('/', subscriptionTierController.getAllTiers);
router.get('/compare/:tier1/:tier2', subscriptionTierController.compareTiers);
router.get('/:name/features', subscriptionTierController.getTierFeatures);
router.get('/:name', subscriptionTierController.getTierByName);

// Authenticated routes
router.get('/company/:companyId/feature/:featureName', authenticateToken, subscriptionTierController.checkFeatureAccess);
router.get('/company/:companyId/limit/:limitName', authenticateToken, subscriptionTierController.checkUsageLimit);
router.get('/company/:companyId/upgrades', authenticateToken, subscriptionTierController.getUpgradeOptions);
router.get('/company/:companyId/limits', authenticateToken, subscriptionTierController.getCompanyLimits);

// Admin routes
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

router.post('/', authenticateToken, requireAdmin, subscriptionTierController.createTier);
router.put('/:tierId', authenticateToken, requireAdmin, subscriptionTierController.updateTier);
router.delete('/:tierId', authenticateToken, requireAdmin, subscriptionTierController.deleteTier);

module.exports = router;
