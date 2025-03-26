const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Existing routes
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/oauth-login', authController.oauthLogin);

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

// Email verification
router.post('/verify/send', authenticateToken, authController.sendVerificationEmail);
router.get('/verify/:token', authController.verifyEmail);

module.exports = router;
