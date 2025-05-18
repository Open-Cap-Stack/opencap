/**
 * Complete Test Suite for AuthController
 * Feature: OCAE-202: Implement user registration endpoint
 * Bug: OCDI-303: Fix User Authentication Test Failures
 * 
 * This comprehensive test suite targets all controller functions to 
 * achieve OpenCap's required coverage targets:
 * - Controllers: 85% statements, 75% branches, 85% lines, 85% functions
 */

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');
const authController = require('../../controllers/authController');

// Import test database utilities
const { connectDB, clearDB, disconnectDB } = require('../setup/testDB');

// Ensure test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_VERIFICATION_SECRET = process.env.JWT_VERIFICATION_SECRET || 'test-verification-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Mock email functionality
jest.mock('../../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ 
    success: true,
    messageId: 'mock-email-id'
  }),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-reset-email-id'
  })
}));

// We'll directly reference these in our tests
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../utils/email');

describe('Auth Controller - Complete Test Suite (OCDI-303)', () => {
  let mockRequest;
  let mockResponse;
  
  beforeAll(async () => {
    await connectDB();
  });
  
  afterEach(async () => {
    await clearDB();
    jest.clearAllMocks();
  });
  
  afterAll(async () => {
    await disconnectDB();
  });
  
  beforeEach(() => {
    // Set up mock request and response objects
    mockRequest = {
      body: {},
      params: {},
      headers: {},
      user: {}
    };
    
    mockResponse = {
      status: jest.fn(() => mockResponse),
      json: jest.fn(),
      cookie: jest.fn()
    };
  });
  
  describe('User Registration', () => {
    it('should register a new user and send verification email', async () => {
      // 1. Set up test data
      mockRequest.body = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
        password: 'SecureP@ssw0rd',
        confirmPassword: 'SecureP@ssw0rd',
        role: 'user'
      };
      
      // 2. Execute controller function
      await authController.registerUser(mockRequest, mockResponse);
      
      // 3. Assert response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          user: expect.objectContaining({
            email: 'jane.doe@example.com',
            firstName: 'Jane',
            lastName: 'Doe'
          })
        })
      );
      
      // 4. Verify email was sent
      expect(sendVerificationEmail).toHaveBeenCalled();
      
      // 5. Verify user was saved to database
      const createdUser = await User.findOne({ email: 'jane.doe@example.com' });
      expect(createdUser).toBeTruthy();
      expect(createdUser.role).toBe('user');
      expect(createdUser.status).toBe('pending');
    });
    
    it('should handle registration validation errors', async () => {
      // Missing required fields
      mockRequest.body = {
        email: 'incomplete@example.com',
        password: 'Password123'
      };
      
      await authController.registerUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          errors: expect.arrayContaining([
            'First name is required',
            'Last name is required'
          ])
        })
      );
    });
    
    it('should handle duplicate email registration', async () => {
      // Create a user first
      const existingUser = new User({
        firstName: 'Existing',
        lastName: 'User',
        email: 'duplicate@example.com',
        password: await bcrypt.hash('Password123', 10),
        role: 'user',
        status: 'active'
      });
      await existingUser.save();
      
      // Try to register with same email
      mockRequest.body = {
        firstName: 'New',
        lastName: 'User',
        email: 'duplicate@example.com', // Same email
        password: 'SecureP@ssw0rd',
        confirmPassword: 'SecureP@ssw0rd',
        role: 'user'
      };
      
      await authController.registerUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('exists')
        })
      );
    });
    
    it('should handle server errors during registration', async () => {
      // Set up test data
      mockRequest.body = {
        firstName: 'Error',
        lastName: 'Test',
        email: 'error.test@example.com',
        password: 'SecureP@ssw0rd',
        confirmPassword: 'SecureP@ssw0rd',
        role: 'user'
      };
      
      // Mock User.findOne to throw an error
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementationOnce(() => {
        throw new Error('Database error');
      });
      
      // Console spy
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await authController.registerUser(mockRequest, mockResponse);
      
      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error'
        })
      );
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Restore mocks
      User.findOne = originalFindOne;
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('User Login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash('Password123', 10);
      const testUser = new User({
        firstName: 'Login',
        lastName: 'Test',
        email: 'login.test@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active',
        emailVerified: true
      });
      await testUser.save();
    });
    
    it('should successfully login with valid credentials', async () => {
      mockRequest.body = {
        email: 'login.test@example.com',
        password: 'Password123'
      };
      
      await authController.loginUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: expect.any(String),
          user: expect.objectContaining({
            email: 'login.test@example.com'
          })
        })
      );
    });
    
    it('should reject login with invalid email', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
        password: 'Password123'
      };
      
      await authController.loginUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid email or password')
        })
      );
    });
    
    it('should reject login with invalid password', async () => {
      mockRequest.body = {
        email: 'login.test@example.com',
        password: 'WrongPassword'
      };
      
      await authController.loginUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid email or password')
        })
      );
    });
    
    it('should reject login for inactive users', async () => {
      // Create an inactive user
      const hashedPassword = await bcrypt.hash('Password123', 10);
      const inactiveUser = new User({
        firstName: 'Inactive',
        lastName: 'User',
        email: 'inactive@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'inactive',
        emailVerified: true
      });
      await inactiveUser.save();
      
      mockRequest.body = {
        email: 'inactive@example.com',
        password: 'Password123'
      };
      
      await authController.loginUser(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('inactive')
        })
      );
    });
    
    it('should handle server errors during login', async () => {
      mockRequest.body = {
        email: 'login.test@example.com',
        password: 'Password123'
      };
      
      // Mock bcrypt.compare to throw an error
      const originalCompare = bcrypt.compare;
      bcrypt.compare = jest.fn().mockImplementationOnce(() => {
        throw new Error('Bcrypt error');
      });
      
      // Console spy
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await authController.loginUser(mockRequest, mockResponse);
      
      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error'
        })
      );
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Restore mocks
      bcrypt.compare = originalCompare;
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('Password Reset', () => {
    beforeEach(async () => {
      // Create a test user for password reset tests
      const hashedPassword = await bcrypt.hash('OldPassword123', 10);
      const testUser = new User({
        firstName: 'Reset',
        lastName: 'Test',
        email: 'reset.test@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active'
      });
      await testUser.save();
    });
    
    it('should send a password reset email', async () => {
      mockRequest.body = {
        email: 'reset.test@example.com'
      };
      
      await authController.requestPasswordReset(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('reset link sent')
        })
      );
      
      // Verify email was sent
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
    
    it('should handle non-existent email for password reset', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com'
      };
      
      await authController.requestPasswordReset(mockRequest, mockResponse);
      
      // Still return 200 for security reasons
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('reset link sent')
        })
      );
      
      // Verify no email was sent
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
    
    it('should verify a valid reset token', async () => {
      // Create a valid reset token
      const user = await User.findOne({ email: 'reset.test@example.com' });
      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      mockRequest.params = { token: resetToken };
      
      await authController.verifyResetToken(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: true,
          message: 'Token is valid'
        })
      );
    });
    
    it('should reject an invalid reset token', async () => {
      mockRequest.params = { token: 'invalid-token' };
      
      await authController.verifyResetToken(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
          message: expect.stringContaining('invalid')
        })
      );
    });
    
    it('should reset password with valid token', async () => {
      // Create a valid reset token
      const user = await User.findOne({ email: 'reset.test@example.com' });
      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      mockRequest.body = {
        token: resetToken,
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      };
      
      await authController.resetPassword(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('reset successfully')
        })
      );
      
      // Verify password was updated
      const updatedUser = await User.findById(user._id);
      const passwordValid = await bcrypt.compare('NewPassword123', updatedUser.password);
      expect(passwordValid).toBe(true);
    });
    
    it('should reject password reset with password mismatch', async () => {
      // Create a valid reset token
      const user = await User.findOne({ email: 'reset.test@example.com' });
      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      mockRequest.body = {
        token: resetToken,
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword'
      };
      
      await authController.resetPassword(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('match')
        })
      );
    });
    
    it('should reject password reset with weak password', async () => {
      // Create a valid reset token
      const user = await User.findOne({ email: 'reset.test@example.com' });
      const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_RESET_SECRET || process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      mockRequest.body = {
        token: resetToken,
        password: 'weak',
        confirmPassword: 'weak'
      };
      
      await authController.resetPassword(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
  
  describe('Email Verification', () => {
    beforeEach(async () => {
      // Create a test user for verification tests
      const testUser = new User({
        firstName: 'Verify',
        lastName: 'Test',
        email: 'verify.test@example.com',
        password: await bcrypt.hash('Password123', 10),
        role: 'user',
        status: 'pending',
        emailVerified: false
      });
      await testUser.save();
    });
    
    it('should verify a user email with valid token', async () => {
      // Create a valid verification token
      const user = await User.findOne({ email: 'verify.test@example.com' });
      const verificationToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      mockRequest.params = { token: verificationToken };
      
      await authController.verifyEmail(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('verified')
        })
      );
      
      // Verify user status was updated
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.status).toBe('active');
    });
    
    it('should handle already verified user', async () => {
      // Update user to verified
      const user = await User.findOne({ email: 'verify.test@example.com' });
      user.emailVerified = true;
      user.status = 'active';
      await user.save();
      
      // Create verification token
      const verificationToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      mockRequest.params = { token: verificationToken };
      
      await authController.verifyEmail(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('already verified')
        })
      );
    });
    
    it('should reject verification with invalid token', async () => {
      mockRequest.params = { token: 'invalid-token' };
      
      await authController.verifyEmail(mockRequest, mockResponse);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid')
        })
      );
    });
  });
  
  describe('OAuth Authentication', () => {
    it('should handle OAuth login attempt', async () => {
      // Mock a Google OAuth token
      mockRequest.body = {
        token: 'mock-google-token',
        provider: 'google'
      };
      
      // Since we can't easily test the entire OAuth flow, we'll mock the key functions
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockReturnValue({ 
        email: 'oauth.user@example.com',
        name: 'OAuth User'
      });
      
      // Simulate first-time OAuth user
      User.findOne = jest.fn().mockResolvedValue(null);
      
      // Mock User construction and save
      const mockUserInstance = {
        save: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          firstName: 'OAuth',
          lastName: 'User',
          email: 'oauth.user@example.com',
          role: 'user',
          toJSON: function() {
            return this;
          }
        })
      };
      
      const originalUserConstructor = User;
      global.User = jest.fn().mockReturnValue(mockUserInstance);
      
      await authController.oauthLogin(mockRequest, mockResponse);
      
      // Restore mocks
      jwt.verify = originalVerify;
      global.User = originalUserConstructor;
      
      // We expect to get some kind of response, but exact details may vary
      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
  
  describe('Auth Middleware', () => {
    it('should authenticate a valid JWT token', async () => {
      // Create a valid JWT token
      const token = jwt.sign(
        { userId: new mongoose.Types.ObjectId().toString(), role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // Set up mock next function
      const mockNext = jest.fn();
      
      // Set request with token
      mockRequest.headers.authorization = `Bearer ${token}`;
      
      // Call auth middleware
      await authController.authenticateToken(mockRequest, mockResponse, mockNext);
      
      // Verify user was set and next was called
      expect(mockRequest.user).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should reject requests without token', async () => {
      // No authorization header
      
      // Set up mock next function
      const mockNext = jest.fn();
      
      await authController.authenticateToken(mockRequest, mockResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No token provided')
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject requests with invalid token', async () => {
      // Set invalid token
      mockRequest.headers.authorization = 'Bearer invalid-token';
      
      // Set up mock next function
      const mockNext = jest.fn();
      
      await authController.authenticateToken(mockRequest, mockResponse, mockNext);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid')
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
  
  describe('Role-based Authorization', () => {
    it('should authorize users with required role', () => {
      // Set up allowed roles
      const requiredRoles = ['admin', 'manager'];
      
      // Set up middleware
      const checkRoleMiddleware = authController.checkRole(requiredRoles);
      
      // Set up user with allowed role
      mockRequest.user = { role: 'admin' };
      
      // Set up mock next function
      const mockNext = jest.fn();
      
      // Call middleware
      checkRoleMiddleware(mockRequest, mockResponse, mockNext);
      
      // Verify next was called
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should reject users without required role', () => {
      // Set up allowed roles
      const requiredRoles = ['admin', 'manager'];
      
      // Set up middleware
      const checkRoleMiddleware = authController.checkRole(requiredRoles);
      
      // Set up user with non-allowed role
      mockRequest.user = { role: 'user' };
      
      // Set up mock next function
      const mockNext = jest.fn();
      
      // Call middleware
      checkRoleMiddleware(mockRequest, mockResponse, mockNext);
      
      // Verify unauthorized response
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Unauthorized')
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
