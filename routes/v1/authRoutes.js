const express = require('express');
const multer = require('multer');
const router = express.Router();
const authController = require('../../controllers/authController');
const { authenticateToken } = require('../../middleware/authMiddleware.js');

// Multer config for avatar uploads (memory storage, 5MB limit)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});
const { debugTokenEndpoint } = require('../../middleware/authErrorLogger');
const { createEndpointRateLimiter } = require('../../middleware/rateLimiter');
const { auditAction } = require('../../middleware/auditLog');

// Debug endpoint disabled in production (Issue #250)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug-token', debugTokenEndpoint);
}

// Existing routes
router.post('/register', createEndpointRateLimiter('/api/v1/auth/register'), authController.registerUser);
router.post('/login', createEndpointRateLimiter('/api/v1/auth/login'), auditAction('login', 'auth'), authController.loginUser);
router.post('/oauth-login', auditAction('login', 'auth'), authController.oauthLogin);

// Token exchange: convert AINative token to fast local JWT (unprotected, rate-limited)
router.post('/exchange-token', createEndpointRateLimiter('/api/v1/auth/login'), authController.exchangeAINativeToken);

// AINative credential login: authenticate directly with AINative email/password (rate-limited)
router.post('/ainative-login', createEndpointRateLimiter('/api/v1/auth/login'), auditAction('login', 'auth'), authController.ainativeLogin);

// New routes for OCAE-203
// Token management
router.post('/token/refresh', createEndpointRateLimiter('/api/v1/auth/login'), authController.refreshToken);
router.post('/logout', authenticateToken, auditAction('logout', 'auth'), authController.logout);

// Password reset flow
router.post('/password/reset-request', authController.requestPasswordReset);
router.post('/password/verify-token', authController.verifyResetToken);
router.post('/password/reset', authController.resetPassword);

// User profile
router.get('/profile', authenticateToken, authController.getUserProfile);
router.put('/profile', authenticateToken, authController.updateUserProfile);
router.post('/profile/avatar', authenticateToken, avatarUpload.single('avatar'), authController.uploadAvatar);

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

// Change password (authenticated)
router.put('/change-password', authenticateToken, auditAction('change_password', 'auth'), authController.changePassword);

// Email verification
router.post('/verify/send', authenticateToken, authController.sendVerificationEmail);
router.get('/verify/:token', authController.verifyEmail);

// Resend verification email — unauthenticated; used when a pending user cannot log in
router.post('/resend-verification', createEndpointRateLimiter('/api/v1/auth/resend-verification'), authController.resendVerification);

// Admin token — gated by ADMIN_SECRET env var, no rate limit
router.post('/admin-token', authController.adminToken);

// Admin force-password — gated by ADMIN_SECRET, bypasses old password requirement
router.post('/admin-force-password', authController.adminForcePassword);

module.exports = router;
