/**
 * Auth Controller Tests
 * Rewritten to mock User model directly instead of databaseAdapter
 */

jest.mock('../../../models/User', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
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
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue(true) }))
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: jest.fn() }))
}));

const httpMocks = require('node-mocks-http');
const authController = require('../../../controllers/authController');
const User = require('../../../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { provisionAINativeUser, blacklistToken, isTokenBlacklisted } = require('../../../middleware/authMiddleware');

// Spy on bcrypt and jwt (real modules, not mocked)
jest.spyOn(bcrypt, 'hash');
jest.spyOn(bcrypt, 'compare');
jest.spyOn(jwt, 'sign');
jest.spyOn(jwt, 'verify');

describe('AuthController', () => {
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

    // Default bcrypt behavior
    bcrypt.hash.mockResolvedValue('hashed_password');
    bcrypt.compare.mockResolvedValue(true);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com', password: 'Password123!', confirmPassword: 'Password123!', role: 'user' };
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: 'user_123', firstName: 'John', lastName: 'Doe', email: 'john.doe@example.com' });
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(201);
    });

    it('should return 400 when firstName is missing', async () => {
      req.body = { lastName: 'Doe', email: 'john@example.com', password: 'Password123!' };
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.errors).toContain('First name is required');
    });

    it('should return 400 when lastName is missing', async () => {
      req.body = { firstName: 'John', email: 'john@example.com', password: 'Password123!' };
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'invalid-email', password: 'Password123!' };
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('Invalid email format');
    });

    it('should return 400 when passwords do not match', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Password123!', confirmPassword: 'DifferentPassword123!' };
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('Passwords do not match');
    });

    it('should return 400 when password is too short', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Pass1!' };
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('8 characters');
    });

    it('should return 400 when password lacks complexity', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'password123' };
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when user already exists', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'existing@example.com', password: 'Password123!' };
      User.findOne.mockResolvedValue({ _id: 'existing_user' });
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('User already exists');
    });

    it('should return 400 for invalid role', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'john@example.com', password: 'Password123!', role: 'superadmin' };
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('Role must be one of');
    });

    it('should normalize email to lowercase and trimmed', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: '  John@Example.COM  ', password: 'Password123!' };
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: 'user_123', email: 'john@example.com' });
      await authController.registerUser(req, res);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
    });

    it('should accept emails with + tags', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'john+test@example.com', password: 'Password123!' };
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: 'user_123', email: 'john+test@example.com' });
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(201);
    });

    it('should accept founder and investor roles', async () => {
      req.body = { firstName: 'John', lastName: 'Doe', email: 'founder@example.com', password: 'Password123!', role: 'founder' };
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: 'user_123', email: 'founder@example.com', role: 'founder' });
      await authController.registerUser(req, res);
      expect(res.statusCode).toBe(201);
    });
  });

  describe('loginUser', () => {
    it('should login a user successfully', async () => {
      req.body = { email: 'john@example.com', password: 'Password123!' };
      User.findOne.mockResolvedValue({ _id: 'user_123', userId: 'user_123', email: 'john@example.com', password: 'hashed_password', role: 'user', permissions: ['read:users'], companyId: 'company_1' });
      bcrypt.compare.mockResolvedValue(true);
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
      // Verify JWT includes full claims
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          email: 'john@example.com',
          role: 'user',
          permissions: ['read:users'],
          companyId: 'company_1'
        }),
        'test-secret',
        { expiresIn: '1h' }
      );
      // Verify lastLogin is updated
      expect(User.updateLastLogin).toHaveBeenCalledWith('user_123');
    });

    it('should normalize email to lowercase and trimmed', async () => {
      req.body = { email: '  John@Example.COM  ', password: 'Password123!' };
      User.findOne.mockResolvedValue(null);
      await authController.loginUser(req, res);
      expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
    });

    it('should return 400 when email is missing', async () => {
      req.body = { password: 'Password123!' };
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      req.body = { email: 'john@example.com' };
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 401 for invalid credentials - user not found', async () => {
      req.body = { email: 'nonexistent@example.com', password: 'Password123!' };
      User.findOne.mockResolvedValue(null);
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for invalid credentials - wrong password', async () => {
      req.body = { email: 'john@example.com', password: 'WrongPassword123!' };
      User.findOne.mockResolvedValue({ _id: 'user_123', email: 'john@example.com', password: 'hashed_password' });
      bcrypt.compare.mockResolvedValue(false);
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 with EMAIL_NOT_VERIFIED code when account status is pending', async () => {
      req.body = { email: 'pending@example.com', password: 'Password123!' };
      User.findOne.mockResolvedValue({
        _id: 'user_pending',
        userId: 'user_pending',
        email: 'pending@example.com',
        password: 'hashed_password',
        status: 'pending'
      });
      bcrypt.compare.mockResolvedValue(true);
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.code).toBe('EMAIL_NOT_VERIFIED');
      expect(data.message).toMatch(/verify your email/i);
    });

    it('should not reveal pending status when password is wrong', async () => {
      req.body = { email: 'pending@example.com', password: 'WrongPass123!' };
      User.findOne.mockResolvedValue({
        _id: 'user_pending',
        email: 'pending@example.com',
        password: 'hashed_password',
        status: 'pending'
      });
      bcrypt.compare.mockResolvedValue(false);
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.code).toBeUndefined();
    });
  });

  describe('resendVerification', () => {
    it('should return 200 and send email when user exists with pending status', async () => {
      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_USER = 'user@example.com';
      process.env.EMAIL_PASSWORD = 'secret';
      req.body = { email: 'pending@example.com' };
      User.findOne.mockResolvedValue({
        _id: 'user_pending',
        userId: 'user_pending',
        email: 'pending@example.com',
        status: 'pending',
        emailVerified: false
      });
      await authController.resendVerification(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toMatch(/verification email sent/i);
    });

    it('should return 200 even when user does not exist (avoid enumeration)', async () => {
      req.body = { email: 'nobody@example.com' };
      User.findOne.mockResolvedValue(null);
      await authController.resendVerification(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 400 when email is missing', async () => {
      req.body = {};
      await authController.resendVerification(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when account is already active', async () => {
      req.body = { email: 'active@example.com' };
      User.findOne.mockResolvedValue({
        _id: 'user_active',
        email: 'active@example.com',
        status: 'active',
        emailVerified: true
      });
      await authController.resendVerification(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toMatch(/already verified/i);
    });
  });

  describe('logout', () => {
    it('should logout a user successfully', async () => {
      req.token = 'valid_token';
      await authController.logout(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toBe('Logout successful');
      expect(blacklistToken).toHaveBeenCalledWith('valid_token');
    });

    it('should return 400 when no token provided', async () => {
      req.token = null;
      await authController.logout(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should also blacklist refresh token when provided', async () => {
      req.token = 'access_token';
      req.body = { refreshToken: 'refresh_token' };
      await authController.logout(req, res);
      expect(res.statusCode).toBe(200);
      expect(blacklistToken).toHaveBeenCalledWith('access_token');
      expect(blacklistToken).toHaveBeenCalledWith('refresh_token');
      expect(blacklistToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully with full claims', async () => {
      req.body = { refreshToken: 'valid_refresh_token' };
      jwt.verify.mockReturnValue({ userId: 'user_123' });
      User.findOne.mockResolvedValue({ _id: 'user_123', userId: 'user_123', email: 'john@example.com', role: 'user', status: 'active', permissions: ['read:users'], companyId: 'company_1' });
      jwt.sign.mockReturnValue('new_access_token');
      await authController.refreshToken(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).accessToken).toBe('new_access_token');
      // Verify JWT includes full claims
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          email: 'john@example.com',
          role: 'user',
          permissions: ['read:users'],
          companyId: 'company_1'
        }),
        'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should return 400 when refresh token is missing', async () => {
      req.body = {};
      await authController.refreshToken(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 401 for invalid refresh token', async () => {
      req.body = { refreshToken: 'invalid_token' };
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      await authController.refreshToken(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 if refresh token is blacklisted', async () => {
      req.body = { refreshToken: 'blacklisted_token' };
      isTokenBlacklisted.mockResolvedValueOnce(true);
      await authController.refreshToken(req, res);
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res._getData()).message).toBe('Refresh token has been revoked');
    });

    it('should return 403 if user account is not active', async () => {
      req.body = { refreshToken: 'valid_refresh_token' };
      jwt.verify.mockReturnValue({ userId: 'user_123' });
      User.findOne.mockResolvedValue({ _id: 'user_123', userId: 'user_123', role: 'user', status: 'suspended' });
      await authController.refreshToken(req, res);
      expect(res.statusCode).toBe(403);
    });

    it('should fall back to _id lookup when userId not found', async () => {
      req.body = { refreshToken: 'valid_refresh_token' };
      jwt.verify.mockReturnValue({ userId: 'user_123' });
      User.findOne
        .mockResolvedValueOnce(null) // first call with { userId } returns null
        .mockResolvedValueOnce({ _id: 'user_123', userId: 'user_123', email: 'john@example.com', role: 'user', status: 'active', permissions: [] });
      jwt.sign.mockReturnValue('new_access_token');
      await authController.refreshToken(req, res);
      expect(res.statusCode).toBe(200);
      expect(User.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return 200 regardless of whether user exists', async () => {
      req.body = { email: 'john@example.com' };
      User.findOne.mockResolvedValue(null);
      await authController.requestPasswordReset(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toContain('If an account exists');
    });

    it('should return 400 when email is missing', async () => {
      req.body = {};
      await authController.requestPasswordReset(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('verifyResetToken', () => {
    it('should verify a valid reset token', async () => {
      req.params = { token: 'valid_reset_token' };
      jwt.verify.mockReturnValue({ userId: 'user_123' });
      User.findOne.mockResolvedValue({ _id: 'user_123' });
      await authController.verifyResetToken(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toBe('Token is valid');
    });

    it('should return 400 for invalid token', async () => {
      req.params = { token: 'invalid_token' };
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      await authController.verifyResetToken(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      req.params = { token: 'valid_reset_token' };
      req.body = { password: 'NewPassword123!' };
      jwt.verify.mockReturnValue({ userId: 'user_123' });
      User.findOne.mockResolvedValue({ _id: 'user_123', userId: 'user_123' });
      bcrypt.hash.mockResolvedValue('new_hashed_password');
      User.findOneAndUpdate.mockResolvedValue({ _id: 'user_123', password: 'new_hashed_password' });
      await authController.resetPassword(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toContain('reset successfully');
    });

    it('should return 400 when password is missing', async () => {
      req.params = { token: 'valid_token' };
      req.body = {};
      await authController.resetPassword(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for weak password', async () => {
      req.params = { token: 'valid_token' };
      req.body = { password: 'weak' };
      await authController.resetPassword(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid token', async () => {
      req.params = { token: 'invalid_token' };
      req.body = { password: 'NewPassword123!' };
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      await authController.resetPassword(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      req.user = { userId: 'user_123' };
      User.findOne.mockResolvedValue({ _id: 'user_123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' });
      await authController.getUserProfile(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'nonexistent_user' };
      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);
      await authController.getUserProfile(req, res);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      req.user = { userId: 'user_123' };
      req.body = { firstName: 'Jane' };
      const mockUser = { _id: 'user_123', userId: 'user_123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      User.findOne.mockResolvedValue(mockUser);
      User.findOneAndUpdate.mockResolvedValue({ ...mockUser, firstName: 'Jane' });
      await authController.updateUserProfile(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'nonexistent_user' };
      req.body = { firstName: 'Jane' };
      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);
      await authController.updateUserProfile(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should persist companyId when provided', async () => {
      req.user = { userId: 'user_123' };
      req.body = { companyId: 'company-abc-123' };
      const mockUser = { _id: 'user_123', userId: 'user_123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' };
      User.findOne.mockResolvedValue(mockUser);
      User.findOneAndUpdate.mockResolvedValue({ ...mockUser, companyId: 'company-abc-123' });
      await authController.updateUserProfile(req, res);
      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user_123' },
        expect.objectContaining({ companyId: 'company-abc-123' }),
        { new: true }
      );
      expect(res.statusCode).toBe(200);
    });
  });

  describe('exchangeAINativeToken', () => {
    it('should return 400 when ainativeToken is missing', async () => {
      req.body = {};
      await authController.exchangeAINativeToken(req, res);
      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('ainativeToken is required');
    });

    it('should return 401 when AINative token is invalid', async () => {
      req.body = { ainativeToken: 'invalid-token' };
      axios.get.mockRejectedValue(new Error('Unauthorized'));
      await authController.exchangeAINativeToken(req, res);
      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid AINative token');
    });

    it('should exchange valid AINative token for local JWT', async () => {
      req.body = { ainativeToken: 'valid-ainative-token' };

      axios.get.mockResolvedValue({
        data: { id: 'ainative-user-1', email: 'User@Example.COM', name: 'Test User' }
      });

      const mockLocalUser = {
        userId: 'local-user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'user',
        permissions: ['read'],
        companyId: 'company-1'
      };
      provisionAINativeUser.mockResolvedValue(mockLocalUser);

      jwt.sign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      await authController.exchangeAINativeToken(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Token exchanged successfully');
      expect(data.accessToken).toBe('mock-access-token');
      expect(data.refreshToken).toBe('mock-refresh-token');
      expect(data.user.email).toBe('user@example.com');
      expect(data.user.userId).toBe('local-user-1');
      expect(data.user.companyId).toBe('company-1');

      // Verify correct API path
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-ainative-token'
          }),
          timeout: 10000
        })
      );
      // Verify email was normalized before provisioning
      expect(provisionAINativeUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'ainative-user-1',
          email: 'user@example.com',
          isAINativeUser: true
        })
      );
      // Verify JWT has consistent claim shape (no 'name', matches login)
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'local-user-1',
          email: 'user@example.com',
          role: 'user',
          permissions: ['read'],
          companyId: 'company-1'
        }),
        'test-secret',
        { expiresIn: '1h' }
      );
    });

    it('should use ainativeUser name as fallback when localUser has no displayName', async () => {
      req.body = { ainativeToken: 'valid-token' };

      axios.get.mockResolvedValue({
        data: { id: 'user-2', email: 'fallback@example.com', name: 'Fallback Name' }
      });

      provisionAINativeUser.mockResolvedValue({
        userId: 'local-2',
        email: 'fallback@example.com',
        role: 'user',
        permissions: []
      });

      jwt.sign
        .mockReturnValueOnce('access-token-2')
        .mockReturnValueOnce('refresh-token-2');

      await authController.exchangeAINativeToken(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.user.name).toBe('Fallback Name');
    });

    it('should return 500 on unexpected errors', async () => {
      req.body = { ainativeToken: 'valid-token' };

      axios.get.mockResolvedValue({
        data: { id: 'user-3', email: 'error@example.com', name: 'Error User' }
      });

      provisionAINativeUser.mockImplementation(() => {
        throw new Error('Unexpected DB error');
      });

      await authController.exchangeAINativeToken(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Internal server error');
    });
  });
});
