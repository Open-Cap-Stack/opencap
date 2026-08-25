/**
 * Auth Routes Unit Tests
 *
 * Verifies route registration, middleware chain, and HTTP method mapping
 * for all authentication endpoints.
 */

const request = require('supertest');
const express = require('express');

// Mock middleware before requiring routes
jest.mock('../../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { userId: 'test-user', email: 'test@example.com', role: 'admin', companyId: 'co-001' };
    next();
  }
}));

jest.mock('../../../../middleware/authErrorLogger', () => ({
  logAuthError: jest.fn(),
  authenticateWithLogging: jest.fn((req, res, next) => next()),
  getTokenDebugInfo: jest.fn(),
  debugTokenEndpoint: jest.fn((req, res) => res.status(200).json({ debug: true }))
}));

jest.mock('../../../../middleware/rateLimiter', () => ({
  createEndpointRateLimiter: () => (req, res, next) => next(),
  createRoleTieredRateLimiter: () => (req, res, next) => next(),
  RateLimitConfig: class {},
  RateLimitStore: class {},
  TokenBucketLimiter: class {},
  getRateLimitHeaders: jest.fn(),
  globalStore: {}
}));

jest.mock('../../../../middleware/auditLog', () => ({
  auditAction: () => (req, res, next) => next()
}));

jest.mock('../../../../controllers/authController', () => ({
  registerUser: jest.fn((req, res) => res.status(201).json({ message: 'registered' })),
  loginUser: jest.fn((req, res) => res.status(200).json({ token: 'jwt-token' })),
  oauthLogin: jest.fn((req, res) => res.status(200).json({ token: 'oauth-token' })),
  exchangeAINativeToken: jest.fn((req, res) => res.status(200).json({ token: 'exchanged' })),
  ainativeLogin: jest.fn((req, res) => res.status(200).json({ token: 'ainative-token' })),
  ainativeOAuthCallback: jest.fn((req, res) => res.status(200).json({ callback: true })),
  refreshToken: jest.fn((req, res) => res.status(200).json({ token: 'refreshed' })),
  logout: jest.fn((req, res) => res.status(200).json({ message: 'logged out' })),
  requestPasswordReset: jest.fn((req, res) => res.status(200).json({ message: 'reset requested' })),
  verifyResetToken: jest.fn((req, res) => res.status(200).json({ valid: true })),
  resetPassword: jest.fn((req, res) => res.status(200).json({ message: 'password reset' })),
  getUserProfile: jest.fn((req, res) => res.status(200).json({ user: {} })),
  updateUserProfile: jest.fn((req, res) => res.status(200).json({ user: {} })),
  uploadAvatar: jest.fn((req, res) => res.status(200).json({ url: 'avatar-url' })),
  changePassword: jest.fn((req, res) => res.status(200).json({ message: 'changed' })),
  sendVerificationEmail: jest.fn((req, res) => res.status(200).json({ sent: true })),
  verifyEmail: jest.fn((req, res) => res.status(200).json({ verified: true })),
  resendVerification: jest.fn((req, res) => res.status(200).json({ sent: true })),
  adminToken: jest.fn((req, res) => res.status(200).json({ token: 'admin-token' })),
  adminForcePassword: jest.fn((req, res) => res.status(200).json({ message: 'forced' }))
}));

// Mock the User model used in /me route
jest.mock('../../../../models/User', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  findById: jest.fn().mockResolvedValue(null)
}));

jest.mock('../../../../services/zerodbService', () => ({
  isValidObjectId: jest.fn(() => false)
}));

const authRoutes = require('../../../../routes/v1/authRoutes');
const authController = require('../../../../controllers/authController');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should route to registerUser controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'new@test.com', password: 'pass123' });

      expect(response.status).toBe(201);
      expect(authController.registerUser).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should route to loginUser controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'pass123' });

      expect(response.status).toBe(200);
      expect(authController.loginUser).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/oauth-login', () => {
    it('should route to oauthLogin controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/oauth-login')
        .send({ provider: 'google', token: 'google-token' });

      expect(response.status).toBe(200);
      expect(authController.oauthLogin).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/exchange-token', () => {
    it('should route to exchangeAINativeToken controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/exchange-token')
        .send({ token: 'ainative-token' });

      expect(response.status).toBe(200);
      expect(authController.exchangeAINativeToken).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/ainative-login', () => {
    it('should route to ainativeLogin controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/ainative-login')
        .send({ email: 'user@ainative.studio', password: 'pass' });

      expect(response.status).toBe(200);
      expect(authController.ainativeLogin).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/auth/callback/ainative', () => {
    it('should route to ainativeOAuthCallback controller', async () => {
      const response = await request(app)
        .get('/api/v1/auth/callback/ainative');

      expect(response.status).toBe(200);
      expect(authController.ainativeOAuthCallback).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/token/refresh', () => {
    it('should route to refreshToken controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/token/refresh')
        .send({ refreshToken: 'rt-123' });

      expect(response.status).toBe(200);
      expect(authController.refreshToken).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should route to logout controller (requires auth)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(200);
      expect(authController.logout).toHaveBeenCalled();
    });
  });

  describe('Password reset flow', () => {
    it('POST /password/reset-request should route to requestPasswordReset', async () => {
      const response = await request(app)
        .post('/api/v1/auth/password/reset-request')
        .send({ email: 'user@test.com' });

      expect(response.status).toBe(200);
      expect(authController.requestPasswordReset).toHaveBeenCalled();
    });

    it('POST /password/verify-token should route to verifyResetToken', async () => {
      const response = await request(app)
        .post('/api/v1/auth/password/verify-token')
        .send({ token: 'reset-token' });

      expect(response.status).toBe(200);
      expect(authController.verifyResetToken).toHaveBeenCalled();
    });

    it('POST /password/reset should route to resetPassword', async () => {
      const response = await request(app)
        .post('/api/v1/auth/password/reset')
        .send({ token: 'reset-token', newPassword: 'newPass123' });

      expect(response.status).toBe(200);
      expect(authController.resetPassword).toHaveBeenCalled();
    });
  });

  describe('User profile', () => {
    it('GET /profile should route to getUserProfile', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');

      expect(response.status).toBe(200);
      expect(authController.getUserProfile).toHaveBeenCalled();
    });

    it('PUT /profile should route to updateUserProfile', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      expect(authController.updateUserProfile).toHaveBeenCalled();
    });

    it('POST /profile/avatar should accept file upload', async () => {
      const response = await request(app)
        .post('/api/v1/auth/profile/avatar');

      expect(response.status).toBe(200);
      expect(authController.uploadAvatar).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user data for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('provisioned', true);
      expect(response.body.user).toHaveProperty('userId', 'test-user');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    it('should route to changePassword controller', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .send({ oldPassword: 'old', newPassword: 'new' });

      expect(response.status).toBe(200);
      expect(authController.changePassword).toHaveBeenCalled();
    });
  });

  describe('Email verification', () => {
    it('POST /verify/send should route to sendVerificationEmail', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify/send');

      expect(response.status).toBe(200);
      expect(authController.sendVerificationEmail).toHaveBeenCalled();
    });

    it('GET /verify/:token should route to verifyEmail', async () => {
      const response = await request(app)
        .get('/api/v1/auth/verify/abc123');

      expect(response.status).toBe(200);
      expect(authController.verifyEmail).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/auth/resend-verification', () => {
    it('should route to resendVerification controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/resend-verification')
        .send({ email: 'user@test.com' });

      expect(response.status).toBe(200);
      expect(authController.resendVerification).toHaveBeenCalled();
    });
  });

  describe('Admin endpoints', () => {
    it('POST /admin-token should route to adminToken controller', async () => {
      const response = await request(app)
        .post('/api/v1/auth/admin-token')
        .send({ adminSecret: 'secret' });

      expect(response.status).toBe(200);
      expect(authController.adminToken).toHaveBeenCalled();
    });

    it('POST /admin-force-password should route to adminForcePassword', async () => {
      const response = await request(app)
        .post('/api/v1/auth/admin-force-password')
        .send({ adminSecret: 'secret', email: 'user@test.com', newPassword: 'pass' });

      expect(response.status).toBe(200);
      expect(authController.adminForcePassword).toHaveBeenCalled();
    });
  });

  describe('Route method restrictions', () => {
    it('should not respond to GET on /register', async () => {
      const response = await request(app).get('/api/v1/auth/register');
      expect(response.status).toBe(404);
    });

    it('should not respond to DELETE on /login', async () => {
      const response = await request(app).delete('/api/v1/auth/login');
      expect(response.status).toBe(404);
    });
  });
});
