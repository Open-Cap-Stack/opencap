/**
 * Auth Controller Tests
 *
 * Issue #20: Migrate remaining controllers to ZeroDB (Batch 2)
 *
 * Tests for the authentication controller using DatabaseAdapter for ZeroDB migration
 * Follows TDD pattern: Red -> Green -> Refactor
 */

const httpMocks = require('node-mocks-http');
const authController = require('../../../controllers/authController');
const databaseAdapter = require('../../../services/databaseAdapter');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock the database adapter
jest.mock('../../../services/databaseAdapter');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(true)
  }))
}));

describe('AuthController', () => {
  let req, res;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_RESET_SECRET: 'test-reset-secret',
      JWT_VERIFICATION_SECRET: 'test-verification-secret',
      NODE_ENV: 'test'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'user'
      };

      databaseAdapter.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_password');

      const mockUser = {
        _id: 'user_123',
        ...req.body,
        password: 'hashed_password'
      };

      databaseAdapter.create.mockResolvedValue(mockUser);

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(201);
      expect(databaseAdapter.findOne).toHaveBeenCalledWith('User', { email: 'john.doe@example.com' });
      expect(databaseAdapter.create).toHaveBeenCalledWith('User', expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com'
      }));
    });

    it('should return 400 when firstName is missing', async () => {
      req.body = {
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.errors).toContain('First name is required');
    });

    it('should return 400 when lastName is missing', async () => {
      req.body = {
        firstName: 'John',
        email: 'john@example.com',
        password: 'Password123!'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 for invalid email format', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'Password123!'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid email format');
    });

    it('should return 400 when passwords do not match', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Passwords do not match');
    });

    it('should return 400 when password is too short', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Pass1!'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('8 characters');
    });

    it('should return 400 when password lacks complexity', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 400 when user already exists', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'Password123!'
      };

      databaseAdapter.findOne.mockResolvedValue({ _id: 'existing_user' });

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('User already exists');
    });

    it('should return 400 for invalid role', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'Password123!',
        role: 'superadmin' // Invalid role
      };

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('Role must be one of');
    });
  });

  describe('loginUser', () => {
    it('should login a user successfully', async () => {
      req.body = {
        email: 'john@example.com',
        password: 'Password123!'
      };

      const mockUser = {
        _id: 'user_123',
        userId: 'user_123',
        email: 'john@example.com',
        password: 'hashed_password',
        role: 'user',
        toObject: () => ({
          _id: 'user_123',
          email: 'john@example.com',
          role: 'user'
        })
      };

      databaseAdapter.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      await authController.loginUser(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.accessToken).toBe('access_token');
      expect(data.refreshToken).toBe('refresh_token');
    });

    it('should return 400 when email is missing', async () => {
      req.body = { password: 'Password123!' };

      await authController.loginUser(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      req.body = { email: 'john@example.com' };

      await authController.loginUser(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 for invalid credentials - user not found', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      databaseAdapter.findOne.mockResolvedValue(null);

      await authController.loginUser(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid credentials');
    });

    it('should return 401 for invalid credentials - wrong password', async () => {
      req.body = {
        email: 'john@example.com',
        password: 'WrongPassword123!'
      };

      const mockUser = {
        _id: 'user_123',
        email: 'john@example.com',
        password: 'hashed_password'
      };

      databaseAdapter.findOne.mockResolvedValue(mockUser);
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
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Logout successful');
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

      const mockUser = {
        _id: 'user_123',
        userId: 'user_123',
        role: 'user'
      };

      jwt.verify.mockReturnValue({ userId: 'user_123' });
      databaseAdapter.findOne.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('new_access_token');

      await authController.refreshToken(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.accessToken).toBe('new_access_token');
    });

    it('should return 400 when refresh token is missing', async () => {
      req.body = {};

      await authController.refreshToken(req, res);

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 for invalid refresh token', async () => {
      req.body = { refreshToken: 'invalid_token' };

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.refreshToken(req, res);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('requestPasswordReset', () => {
    it('should return 200 regardless of whether user exists (security)', async () => {
      req.body = { email: 'john@example.com' };

      databaseAdapter.findOne.mockResolvedValue(null);

      await authController.requestPasswordReset(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('If an account exists');
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
      databaseAdapter.findOne.mockResolvedValue({ _id: 'user_123' });

      await authController.verifyResetToken(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Token is valid');
    });

    it('should return 400 for invalid token', async () => {
      req.params = { token: 'invalid_token' };

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.verifyResetToken(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      req.params = { token: 'valid_reset_token' };
      req.body = { password: 'NewPassword123!' };

      const mockUser = {
        _id: 'user_123',
        userId: 'user_123'
      };

      jwt.verify.mockReturnValue({ userId: 'user_123' });
      databaseAdapter.findOne.mockResolvedValue(mockUser);
      bcrypt.hash.mockResolvedValue('new_hashed_password');
      databaseAdapter.findByIdAndUpdate.mockResolvedValue({ ...mockUser, password: 'new_hashed_password' });

      await authController.resetPassword(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toContain('reset successfully');
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

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.resetPassword(req, res);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      req.user = { userId: 'user_123' };

      const mockUser = {
        _id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      databaseAdapter.findOne.mockResolvedValue(mockUser);

      await authController.getUserProfile(req, res);

      expect(res.statusCode).toBe(200);
      expect(databaseAdapter.findOne).toHaveBeenCalledWith(
        'User',
        { userId: 'user_123' },
        expect.any(Object)
      );
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'nonexistent_user' };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.findById.mockResolvedValue(null);

      await authController.getUserProfile(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      req.user = { userId: 'user_123' };
      req.body = { firstName: 'Jane' };

      const mockUser = {
        _id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: 'user_123',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'john@example.com'
        })
      };

      databaseAdapter.findOne.mockResolvedValue(mockUser);

      await authController.updateUserProfile(req, res);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'nonexistent_user' };
      req.body = { firstName: 'Jane' };

      databaseAdapter.findOne.mockResolvedValue(null);
      databaseAdapter.findById.mockResolvedValue(null);

      await authController.updateUserProfile(req, res);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('ZeroDB Migration Specific Tests', () => {
    it('should work in zerodb-only mode for user registration', async () => {
      req.body = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@zerodb.com',
        password: 'Password123!'
      };

      databaseAdapter.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashed_password');

      const zerodbResult = {
        id: 'zero_123',
        ...req.body,
        password: 'hashed_password'
      };

      databaseAdapter.create.mockResolvedValue(zerodbResult);

      await authController.registerUser(req, res);

      expect(res.statusCode).toBe(201);
    });

    it('should handle parallel mode for user lookup', async () => {
      req.body = {
        email: 'john@example.com',
        password: 'Password123!'
      };

      const parallelResult = {
        _id: 'mongo_123',
        email: 'john@example.com',
        password: 'hashed_password',
        role: 'user',
        toObject: () => ({
          _id: 'mongo_123',
          email: 'john@example.com',
          role: 'user'
        })
      };

      databaseAdapter.findOne.mockResolvedValue(parallelResult);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValueOnce('access_token').mockReturnValueOnce('refresh_token');

      await authController.loginUser(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
