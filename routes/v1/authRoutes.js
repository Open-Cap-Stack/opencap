const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { authenticateToken } = require('../../middleware/authMiddleware.js');
const { debugTokenEndpoint } = require('../../middleware/authErrorLogger');

// Debug endpoint for troubleshooting authentication issues (Issue #250)
router.get('/debug-token', debugTokenEndpoint);

// Existing routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/oauth-login', authController.oauthLogin);

// Token exchange: convert AINative token to fast local JWT (unprotected)
router.post('/exchange-token', authController.exchangeAINativeToken);

// New routes for OCAE-203
// Token management
router.post('/token/refresh', authController.refreshToken);
router.post('/logout', authenticateToken, authController.logout);

// Password reset flow
router.post('/password/reset-request', authController.requestPasswordReset);
router.post('/password/verify-token', authController.verifyResetToken);
router.post('/password/reset', authController.resetPassword);

// User profile
router.get('/profile', authenticateToken, authController.getUserProfile);
router.put('/profile', authenticateToken, authController.updateUserProfile);

// GET /api/v1/auth/me - Get current user (provisions on first call)
// Frontend should call this immediately after AINative login
router.get('/me', authenticateToken, (req, res) => {
  // User is already provisioned by authenticateToken middleware
  res.status(200).json({
    user: {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      permissions: req.user.permissions,
      companyId: req.user.companyId
    },
    provisioned: true
  });
});

// Email verification
router.post('/verify/send', authenticateToken, authController.sendVerificationEmail);
router.get('/verify/:token', authController.verifyEmail);

module.exports = router;
