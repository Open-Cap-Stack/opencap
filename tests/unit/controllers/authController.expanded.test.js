/**
 * Auth Controller - Expanded Tests
 * Covers: adminToken, adminForcePassword, ainativeLogin, changePassword,
 * uploadAvatar, sendVerificationEmail, verifyEmail, ainativeOAuthCallback,
 * and additional edge cases for exchangeAINativeToken
 */

jest.mock('../../../models/User', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  updateLastLogin: jest.fn().mockResolvedValue({})
}));

jest.mock('../../../middleware/authMiddleware', () => ({
  blacklistToken: jest.fn().mockResolvedValue(true),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  authenticateToken: jest.fn((req, res, next) => next()),
  provisionAINativeUser: jest.fn()
}));

jest.mock('axios');

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

jest.mock('../../../services/analyticsService', () => ({
  trackSignup: jest.fn().mockResolvedValue(undefined),
  trackLogin: jest.fn().mockResolvedValue(undefined)
}));

const httpMocks = require('node-mocks-http');
const authController = require('../../../controllers/authController');
const User = require('../../../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { provisionAINativeUser, blacklistToken } = require('../../../middleware/authMiddleware');

jest.spyOn(bcrypt, 'hash');
jest.spyOn(bcrypt, 'compare');
jest.spyOn(jwt, 'sign');
jest.spyOn(jwt, 'verify');

describe('AuthController - Expanded Coverage', () => {
  let req, res;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_RESET_SECRET = 'test-reset-secret';
    process.env.JWT_VERIFICATION_SECRET = 'test-verification-secret';
    process.env.NODE_ENV = 'development';
    process.env.ADMIN_SECRET = 'super-secret-admin';

    bcrypt.hash.mockResolvedValue('hashed_password');
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock-jwt-token');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ── adminToken ─────────────────────────────────────────────────────────────

  describe('adminToken', () => {
    it('should generate admin token with valid admin secret', async () => {
      req.body = {
        adminSecret: 'super-secret-admin',
        email: 'admin@test.com',
        companyId: 'test-company'
      };

      await authController.adminToken(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.token).toBe('mock-jwt-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@test.com',
          role: 'admin',
          companyId: 'test-company'
        }),
        'test-secret',
        { expiresIn: '24h' }
      );
    });

    it('should use default email and companyId when not provided', async () => {
      req.body = { adminSecret: 'super-secret-admin' };

      await authController.adminToken(req, res);

      expect(res.statusCode).toBe(200);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'admin@ainative.studio',
          companyId: 'ainative-studio'
        }),
        'test-secret',
        { expiresIn: '24h' }
      );
    });

    it('should return 403 when admin secret is wrong', async () => {
      req.body = { adminSecret: 'wrong-secret' };

      await authController.adminToken(req, res);

      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Forbidden');
    });

    it('should return 403 when admin secret is not set in env', async () => {
      delete process.env.ADMIN_SECRET;
      req.body = { adminSecret: 'any-secret' };

      await authController.adminToken(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 403 when adminSecret is missing from body', async () => {
      req.body = {};

      await authController.adminToken(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  // ── adminForcePassword ─────────────────────────────────────────────────────

  describe('adminForcePassword', () => {
    it('should force reset password with valid admin secret', async () => {
      req.body = {
        adminSecret: 'super-secret-admin',
        email: 'user@test.com',
        newPassword: 'NewPassword123!'
      };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        email: 'user@test.com'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.adminForcePassword(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Password updated');
      expect(data.email).toBe('user@test.com');
      expect(User.updateOne).toHaveBeenCalledWith(
        { email: 'user@test.com' },
        expect.objectContaining({
          password: 'hashed_password',
          status: 'active',
          is_active: true
        })
      );
    });

    it('should normalize email to lowercase', async () => {
      req.body = {
        adminSecret: 'super-secret-admin',
        email: ' USER@TEST.COM ',
        newPassword: 'NewPassword123!'
      };

      User.findOne.mockResolvedValue({ _id: 'user_1', email: 'user@test.com' });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.adminForcePassword(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@test.com' });
    });

    it('should return 403 when admin secret is wrong', async () => {
      req.body = {
        adminSecret: 'wrong-secret',
        email: 'user@test.com',
        newPassword: 'NewPassword123!'
      };

      await authController.adminForcePassword(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should return 400 when email is missing', async () => {
      req.body = {
        adminSecret: 'super-secret-admin',
        newPassword: 'NewPassword123!'
      };

      await authController.adminForcePassword(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when newPassword is missing', async () => {
      req.body = {
        adminSecret: 'super-secret-admin',
        email: 'user@test.com'
      };

      await authController.adminForcePassword(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when user is not found', async () => {
      req.body = {
        adminSecret: 'super-secret-admin',
        email: 'nonexistent@test.com',
        newPassword: 'NewPassword123!'
      };

      User.findOne.mockResolvedValue(null);

      await authController.adminForcePassword(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      req.body = {
        adminSecret: 'super-secret-admin',
        email: 'user@test.com',
        newPassword: 'NewPassword123!'
      };

      User.findOne.mockRejectedValue(new Error('DB connection lost'));

      await authController.adminForcePassword(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ── changePassword ─────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      req.user = { userId: 'user_1' };
      req.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        password: 'old_hashed'
      });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new_hashed');
      User.findOneAndUpdate.mockResolvedValue({ _id: 'user_1' });

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Password changed successfully');
    });

    it('should return 400 when currentPassword is missing', async () => {
      req.user = { userId: 'user_1' };
      req.body = { newPassword: 'NewPassword123!' };

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when newPassword is missing', async () => {
      req.user = { userId: 'user_1' };
      req.body = { currentPassword: 'OldPassword123!' };

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when new password is too short', async () => {
      req.user = { userId: 'user_1' };
      req.body = { currentPassword: 'OldPassword123!', newPassword: 'Short1!' };

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when new password lacks complexity', async () => {
      req.user = { userId: 'user_1' };
      req.body = { currentPassword: 'OldPassword123!', newPassword: 'simplepassword' };

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'nonexistent' };
      req.body = { currentPassword: 'Old123!', newPassword: 'NewPassword123!' };

      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 when current password is incorrect', async () => {
      req.user = { userId: 'user_1' };
      req.body = { currentPassword: 'WrongPassword123!', newPassword: 'NewPassword123!' };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        password: 'old_hashed'
      });
      bcrypt.compare.mockResolvedValue(false);

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Current password is incorrect');
    });

    it('should return 500 on unexpected error', async () => {
      req.user = { userId: 'user_1' };
      req.body = { currentPassword: 'OldPassword123!', newPassword: 'NewPassword123!' };

      User.findOne.mockRejectedValue(new Error('DB error'));

      await authController.changePassword(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ── uploadAvatar ───────────────────────────────────────────────────────────

  describe('uploadAvatar', () => {
    it('should upload avatar from multipart file', async () => {
      req.user = { userId: 'user_1' };
      req.file = {
        buffer: Buffer.from('fake-image-data'),
        mimetype: 'image/png'
      };

      User.findOne.mockResolvedValue({ _id: 'user_1', userId: 'user_1' });
      User.findOneAndUpdate.mockResolvedValue({ _id: 'user_1' });

      await authController.uploadAvatar(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Avatar updated');
      expect(data.avatarUrl).toContain('data:image/png;base64,');
    });

    it('should upload avatar from base64 JSON', async () => {
      req.user = { userId: 'user_1' };
      req.body = { avatar: 'data:image/jpeg;base64,/9j/4AAQ' };

      User.findOne.mockResolvedValue({ _id: 'user_1', userId: 'user_1' });
      User.findOneAndUpdate.mockResolvedValue({ _id: 'user_1' });

      await authController.uploadAvatar(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.avatarUrl).toBe('data:image/jpeg;base64,/9j/4AAQ');
    });

    it('should return 400 when no avatar file provided', async () => {
      req.user = { userId: 'user_1' };
      req.body = {};

      await authController.uploadAvatar(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('No avatar file provided');
    });

    it('should return 400 when avatar is too large', async () => {
      req.user = { userId: 'user_1' };
      // Create a base64 string > 8MB
      req.body = { avatar: 'data:image/png;base64,' + 'A'.repeat(8 * 1024 * 1024 + 1) };

      await authController.uploadAvatar(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('5 MB');
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'nonexistent' };
      req.body = { avatar: 'data:image/png;base64,small' };

      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await authController.uploadAvatar(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 500 on database error', async () => {
      req.user = { userId: 'user_1' };
      req.body = { avatar: 'data:image/png;base64,small' };

      User.findOne.mockRejectedValue(new Error('DB error'));

      await authController.uploadAvatar(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ── sendVerificationEmail ──────────────────────────────────────────────────

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      req.user = { userId: 'user_1' };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        email: 'user@test.com',
        firstName: 'Test',
        emailVerified: false
      });

      await authController.sendVerificationEmail(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Verification email sent');
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'nonexistent' };

      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await authController.sendVerificationEmail(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 when email is already verified', async () => {
      req.user = { userId: 'user_1' };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        email: 'user@test.com',
        emailVerified: true
      });

      await authController.sendVerificationEmail(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Email is already verified');
    });

    it('should return 500 on unexpected error', async () => {
      req.user = { userId: 'user_1' };

      User.findOne.mockRejectedValue(new Error('DB error'));

      await authController.sendVerificationEmail(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ── verifyEmail ────────────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      req.params = { token: 'valid-verification-token' };

      jwt.verify.mockReturnValue({ userId: 'user_1' });
      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        email: 'user@test.com'
      });
      User.findOneAndUpdate.mockResolvedValue({
        _id: 'user_1',
        emailVerified: true,
        status: 'active'
      });

      await authController.verifyEmail(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Email verified successfully');
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user_1' },
        { emailVerified: true, status: 'active' },
        { new: true }
      );
    });

    it('should return 400 when token is missing', async () => {
      req.params = {};

      await authController.verifyEmail(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when token is invalid', async () => {
      req.params = { token: 'invalid-token' };
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

      await authController.verifyEmail(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('Invalid or expired');
    });

    it('should return 404 when user not found', async () => {
      req.params = { token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 'nonexistent' });
      User.findOne.mockResolvedValue(null);

      await authController.verifyEmail(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should fall back to _id lookup when userId not found', async () => {
      req.params = { token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 'user_1' });
      User.findOne
        .mockResolvedValueOnce(null) // first with { userId }
        .mockResolvedValueOnce({ _id: 'user_1', userId: 'user_1' }); // second with { _id }
      User.findOneAndUpdate.mockResolvedValue({ _id: 'user_1' });

      await authController.verifyEmail(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.findOne).toHaveBeenCalledTimes(2);
    });
  });

  // ── ainativeLogin ──────────────────────────────────────────────────────────

  describe('ainativeLogin', () => {
    it('should login via AINative successfully', async () => {
      req.body = { email: 'user@ainative.studio', password: 'Password123!' };

      axios.post.mockResolvedValue({ data: { access_token: 'ainative-token' } });
      axios.get.mockResolvedValue({
        data: { id: 'ainative-user-1', email: 'user@ainative.studio', name: 'Test User' }
      });

      provisionAINativeUser.mockResolvedValue({
        userId: 'local-user-1',
        email: 'user@ainative.studio',
        displayName: 'Test User',
        role: 'employee',
        permissions: [],
        companyId: 'company-1'
      });

      jwt.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await authController.ainativeLogin(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Login successful');
      expect(data.accessToken).toBe('access-token');
      expect(data.refreshToken).toBe('refresh-token');
    });

    it('should return 400 when email is missing', async () => {
      req.body = { password: 'Password123!' };

      await authController.ainativeLogin(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      req.body = { email: 'user@ainative.studio' };

      await authController.ainativeLogin(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 when AINative credentials are invalid', async () => {
      req.body = { email: 'user@ainative.studio', password: 'wrong' };

      axios.post.mockRejectedValue(new Error('Unauthorized'));

      await authController.ainativeLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid AINative credentials');
    });

    it('should return 401 when AINative token validation fails', async () => {
      req.body = { email: 'user@ainative.studio', password: 'Password123!' };

      axios.post.mockResolvedValue({ data: { access_token: 'bad-token' } });
      axios.get.mockRejectedValue(new Error('Token validation failed'));

      await authController.ainativeLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('AINative token validation failed');
    });

    it('should return 500 on unexpected error', async () => {
      req.body = { email: 'user@ainative.studio', password: 'Password123!' };

      axios.post.mockResolvedValue({ data: { access_token: 'token' } });
      axios.get.mockResolvedValue({
        data: { id: 'user-1', email: 'user@ainative.studio', name: 'User' }
      });
      provisionAINativeUser.mockRejectedValue(new Error('Unexpected error'));

      await authController.ainativeLogin(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ── exchangeAINativeToken - code flow ──────────────────────────────────────

  describe('exchangeAINativeToken - authorization code flow', () => {
    it('should exchange authorization code for local JWT', async () => {
      req.body = { code: 'auth-code-123', redirect_uri: 'https://app.com/callback' };

      axios.post.mockResolvedValue({
        data: { access_token: 'exchanged-token' }
      });
      axios.get.mockResolvedValue({
        data: { sub: 'user-sub', email: 'code@example.com', name: 'Code User' }
      });

      provisionAINativeUser.mockResolvedValue({
        userId: 'local-1',
        email: 'code@example.com',
        role: 'employee',
        permissions: [],
        companyId: 'c1'
      });

      jwt.sign.mockReturnValueOnce('access-jwt').mockReturnValueOnce('refresh-jwt');

      await authController.exchangeAINativeToken(req, res);

      expect(res.statusCode).toBe(200);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/v1/oauth/token'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return 502 when code exchange returns no access_token', async () => {
      req.body = { code: 'auth-code-123' };

      axios.post.mockResolvedValue({ data: {} }); // no access_token

      await authController.exchangeAINativeToken(req, res);

      expect(res.statusCode).toBe(502);
    });

    it('should include code_verifier when provided', async () => {
      req.body = {
        code: 'auth-code-123',
        code_verifier: 'pkce-verifier-abc',
        redirect_uri: 'https://app.com/callback'
      };

      axios.post.mockResolvedValue({ data: { access_token: 'token' } });
      axios.get.mockResolvedValue({
        data: { sub: 'user-1', email: 'pkce@example.com', name: 'PKCE User' }
      });
      provisionAINativeUser.mockResolvedValue({
        userId: 'local-1',
        email: 'pkce@example.com',
        role: 'employee',
        permissions: []
      });
      jwt.sign.mockReturnValue('jwt-token');

      await authController.exchangeAINativeToken(req, res);

      expect(res.statusCode).toBe(200);
      // Verify code_verifier was included in the POST body
      const postCall = axios.post.mock.calls[0];
      expect(postCall[1]).toContain('code_verifier');
    });
  });

  // ── exchangeAINativeToken - fallback to JWT decode ─────────────────────────

  describe('exchangeAINativeToken - JWT decode fallback', () => {
    it('should decode JWT payload when API calls fail', async () => {
      // Create a fake JWT with sub claim
      const payload = { sub: 'decoded@example.com' };
      const fakeJwt = 'header.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.signature';

      req.body = { ainativeToken: fakeJwt };

      // Both API calls fail
      axios.get.mockRejectedValue(new Error('API unavailable'));

      provisionAINativeUser.mockResolvedValue({
        userId: 'local-decoded',
        email: 'decoded@example.com',
        role: 'employee',
        permissions: []
      });
      jwt.sign.mockReturnValue('jwt-token');

      await authController.exchangeAINativeToken(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  // ── logout edge cases ──────────────────────────────────────────────────────

  describe('logout - edge cases', () => {
    it('should return 500 when blacklistToken fails', async () => {
      req.token = 'valid_token';
      const { blacklistToken: bt } = require('../../../middleware/authMiddleware');
      bt.mockResolvedValueOnce(false);

      await authController.logout(req, res);

      expect(res.statusCode).toBe(500);
    });

    it('should handle errors in logout gracefully', async () => {
      req.token = 'valid_token';
      const { blacklistToken: bt } = require('../../../middleware/authMiddleware');
      bt.mockRejectedValueOnce(new Error('Redis error'));

      await authController.logout(req, res);

      expect(res.statusCode).toBe(500);
    });
  });

  // ── registerUser - accountant role ─────────────────────────────────────────

  describe('registerUser - accountant role', () => {
    it('should reject accountant registration without invite code', async () => {
      req.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'accountant@test.com',
        password: 'Password123!',
        role: 'accountant'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('invite code');
    });

    it('should reject accountant registration with wrong invite code', async () => {
      process.env.ACCOUNTANT_INVITE_CODE = 'correct-code';
      req.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'accountant@test.com',
        password: 'Password123!',
        role: 'accountant',
        accountantInviteCode: 'wrong-code'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(403);
    });

    it('should accept accountant registration with valid invite code', async () => {
      process.env.ACCOUNTANT_INVITE_CODE = 'valid-code';
      req.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'accountant@test.com',
        password: 'Password123!',
        role: 'accountant',
        accountantInviteCode: 'valid-code'
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        email: 'accountant@test.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'accountant'
      });

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(201);
    });
  });

  // ── registerUser - race condition on create ────────────────────────────────

  describe('registerUser - race condition', () => {
    it('should handle race condition when User.create fails with duplicate', async () => {
      req.body = {
        firstName: 'Race',
        lastName: 'Condition',
        email: 'race@test.com',
        password: 'Password123!'
      };

      User.findOne
        .mockResolvedValueOnce(null) // first check: user does not exist
        .mockResolvedValueOnce({ _id: 'existing_user', email: 'race@test.com' }); // second check after race
      User.create.mockRejectedValue(new Error('Duplicate key'));

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('User already exists');
    });
  });

  // ── updateUserProfile - password change ────────────────────────────────────

  describe('updateUserProfile - password update flow', () => {
    it('should update password when currentPassword and newPassword are provided', async () => {
      req.user = { userId: 'user_1' };
      req.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!'
      };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        password: 'old_hashed',
        email: 'user@test.com'
      });
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new_hashed');
      User.findOneAndUpdate.mockResolvedValue({ _id: 'user_1', userId: 'user_1' });

      await authController.updateUserProfile(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user_1' },
        expect.objectContaining({ password: 'new_hashed' }),
        { new: true }
      );
    });

    it('should reject password change when current password is wrong', async () => {
      req.user = { userId: 'user_1' };
      req.body = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!'
      };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        password: 'old_hashed',
        email: 'user@test.com'
      });
      bcrypt.compare.mockResolvedValue(false);

      await authController.updateUserProfile(req, res);

      expect(res.statusCode).toBe(401);
    });

    it('should reject weak new password', async () => {
      req.user = { userId: 'user_1' };
      req.body = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weakpassword'
      };

      User.findOne.mockResolvedValue({
        _id: 'user_1',
        userId: 'user_1',
        password: 'old_hashed',
        email: 'user@test.com'
      });
      bcrypt.compare.mockResolvedValue(true);

      await authController.updateUserProfile(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ── updateUserProfile - email change ───────────────────────────────────────

  describe('updateUserProfile - email change', () => {
    it('should reject email change when new email is already in use', async () => {
      req.user = { userId: 'user_1' };
      req.body = { email: 'taken@test.com' };

      User.findOne
        .mockResolvedValueOnce({ // find current user
          _id: 'user_1',
          userId: 'user_1',
          email: 'old@test.com'
        })
        .mockResolvedValueOnce({ // email already taken by another user
          _id: 'user_2',
          userId: 'user_2',
          email: 'taken@test.com'
        });

      await authController.updateUserProfile(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Email already in use');
    });
  });

  // ── resetPassword - token from body ────────────────────────────────────────

  describe('resetPassword - token in body', () => {
    it('should accept token from body when not in params', async () => {
      req.params = {};
      req.body = { token: 'body-token', password: 'NewPassword123!' };

      jwt.verify.mockReturnValue({ userId: 'user_1' });
      User.findOne.mockResolvedValue({ _id: 'user_1', userId: 'user_1' });
      bcrypt.hash.mockResolvedValue('hashed');
      User.findOneAndUpdate.mockResolvedValue({ _id: 'user_1' });

      await authController.resetPassword(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when token is missing from both params and body', async () => {
      req.params = {};
      req.body = { password: 'NewPassword123!' };

      await authController.resetPassword(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when user not found during reset', async () => {
      req.body = { token: 'valid-token', password: 'NewPassword123!' };

      jwt.verify.mockReturnValue({ userId: 'nonexistent' });
      User.findOne.mockResolvedValue(null);

      await authController.resetPassword(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for password without special character', async () => {
      req.body = { token: 'valid-token', password: 'NoSpecial123' };

      await authController.resetPassword(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  // ── verifyResetToken edge cases ────────────────────────────────────────────

  describe('verifyResetToken - edge cases', () => {
    it('should return 400 when token param is missing', async () => {
      req.params = {};
      req.body = {};

      await authController.verifyResetToken(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when user not found after token decode', async () => {
      req.params = { token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 'nonexistent' });
      User.findOne.mockResolvedValue(null);

      await authController.verifyResetToken(req, res);

      expect(res.statusCode).toBe(404);
    });

    it('should fall back to _id lookup when userId not found', async () => {
      req.params = { token: 'valid-token' };
      jwt.verify.mockReturnValue({ userId: 'user_1' });
      User.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: 'user_1', userId: 'user_1' });

      await authController.verifyResetToken(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  // ── refreshToken - user not found ──────────────────────────────────────────

  describe('refreshToken - user not found after both lookups', () => {
    it('should return 404 when user not found via both userId and _id', async () => {
      req.body = { refreshToken: 'valid_refresh_token' };
      jwt.verify.mockReturnValue({ userId: 'nonexistent' });
      User.findOne.mockResolvedValue(null);

      await authController.refreshToken(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  // ── resendVerification - SMTP not configured ──────────────────────────────

  describe('resendVerification - SMTP not configured', () => {
    it('should return 200 with generic message when SMTP is not configured', async () => {
      delete process.env.EMAIL_PASS;
      delete process.env.RESEND_API_KEY;

      req.body = { email: 'pending@test.com' };
      User.findOne.mockResolvedValue({
        _id: 'user_1',
        email: 'pending@test.com',
        status: 'pending',
        emailVerified: false
      });

      await authController.resendVerification(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
