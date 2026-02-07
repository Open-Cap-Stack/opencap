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
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../../../middleware/authMiddleware', () => ({
  blacklistToken: jest.fn().mockResolvedValue(true),
  authenticateToken: jest.fn((req, res, next) => next())
}));

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
  });

  describe('loginUser', () => {
    it('should login a user successfully', async () => {
      req.body = { email: 'john@example.com', password: 'Password123!' };
      User.findOne.mockResolvedValue({ _id: 'user_123', userId: 'user_123', email: 'john@example.com', password: 'hashed_password', role: 'user' });
      bcrypt.compare.mockResolvedValue(true);
      await authController.loginUser(req, res);
      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toHaveProperty('accessToken');
      expect(data).toHaveProperty('refreshToken');
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
  });

  describe('logout', () => {
    it('should logout a user successfully', async () => {
      req.token = 'valid_token';
      await authController.logout(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).message).toBe('Logout successful');
    });

    it('should return 400 when no token provided', async () => {
      req.token = null;
      await authController.logout(req, res);
      expect(res.statusCode).toBe(400);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      req.body = { refreshToken: 'valid_refresh_token' };
      // jwt.verify needs to actually work here, so we mock at a lower level
      jwt.verify.mockReturnValue({ userId: 'user_123' });
      User.findOne.mockResolvedValue({ _id: 'user_123', userId: 'user_123', role: 'user' });
      jwt.sign.mockReturnValue('new_access_token');
      await authController.refreshToken(req, res);
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res._getData()).accessToken).toBe('new_access_token');
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
      const mockUser = { _id: 'user_123', firstName: 'John', lastName: 'Doe', email: 'john@example.com', save: jest.fn().mockResolvedValue(true) };
      User.findOne.mockResolvedValue(mockUser);
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
  });
});
