/**
 * Tests for Auth Controller - Register User Function
 * Feature: OCAE-202: Implement user registration endpoint with consolidated model
 */

// Start by mocking modules before importing any other modules
jest.mock('../../models/User', () => {
  return jest.fn().mockImplementation((userData) => {
    return {
      ...userData,
      save: jest.fn().mockResolvedValue(undefined),
      toJSON: jest.fn().mockImplementation(function() {
        const { password, ...rest } = this;
        return rest;
      })
    };
  });
});

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword123'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('mongoose', () => {
  return {
    Types: {
      ObjectId: jest.fn().mockImplementation(() => ({
        toString: () => 'mock-object-id'
      }))
    }
  };
});

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token')
}));

// Mock the Google OAuth client
jest.mock('google-auth-library', () => {
  const mockVerifyIdToken = jest.fn().mockImplementation(() => ({
    getPayload: jest.fn().mockReturnValue({
      email: 'oauth-user@example.com',
      name: 'OAuth User'
    })
  }));
  
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken
    }))
  };
});

// Now we can import the modules
const authController = require('../../controllers/authController');
const User = require('../../models/User');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

describe('Auth Controller (OCAE-202)', () => {
  let req, res, next;

  // Setup request, response, and next function mocks before each test
  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn()
    };
    next = jest.fn();

    // Mock environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Setup common User model mock behaviors
    User.findOne = jest.fn();
  });

  describe('registerUser function', () => {
    it('should register a new user successfully', async () => {
      // Mock request body
      req.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'user'
      };

      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      // Call the function
      await authController.registerUser(req, res);

      // Assert that the user findOne function was called with the correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
      
      // Assert that bcrypt was called to hash the password
      expect(bcrypt.hash).toHaveBeenCalledWith(req.body.password, 10);
      
      // Assert that User constructor was called
      expect(User).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'mock-object-id',
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: 'hashedPassword123',
        role: req.body.role,
        status: 'pending'
      }));
      
      // Assert the response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'User registered successfully',
        user: expect.any(Object)
      }));
    });

    it('should return 400 if email already exists', async () => {
      // Mock request body
      req.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'existing@example.com',
        password: 'SecurePassword123!',
        role: 'user'
      };

      // Mock User.findOne to return a user (user already exists)
      User.findOne.mockResolvedValueOnce({
        email: 'existing@example.com'
      });

      // Call the function
      await authController.registerUser(req, res);

      // Assert response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Email already exists'
      });
      
      // Assert that User constructor was not called
      expect(User).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      // Mock request with missing fields
      req.body = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
        // Missing firstName, lastName, role
      };

      // Call the function
      await authController.registerUser(req, res);

      // Assert response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Validation failed',
        errors: ['First name is required', 'Last name is required', 'Role is required']
      }));
    });

    it('should validate email format', async () => {
      // Mock request with invalid email
      req.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'SecurePassword123!',
        role: 'user'
      };

      // Call the function
      await authController.registerUser(req, res);

      // Assert response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid email format'
      }));
    });

    it('should validate password strength', async () => {
      // Mock request with weak password
      req.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'weak',
        role: 'user'
      };

      // Call the function
      await authController.registerUser(req, res);

      // Assert response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Password must be at least 8 characters long'
      }));
    });

    it('should validate password complexity', async () => {
      // Mock request with password that meets length but not complexity
      req.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password12345', // Missing uppercase and special chars
        role: 'user'
      };

      // Call the function
      await authController.registerUser(req, res);

      // Assert response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Password must contain')
      }));
    });

    it('should validate role is one of the allowed values', async () => {
      // Mock request with invalid role
      req.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'invalid-role'
      };

      // Call the function
      await authController.registerUser(req, res);

      // Assert response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Role must be one of')
      }));
    });

    it('should handle database errors during save', async () => {
      // Mock request body
      req.body = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'user'
      };

      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);

      // Create a mock save method that rejects with an error
      const mockError = new Error('Database error');
      
      // Mock the User implementation for this test only
      User.mockImplementationOnce(() => ({
        userId: 'mock-object-id',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'user',
        status: 'pending',
        save: jest.fn().mockRejectedValueOnce(mockError),
        toJSON: jest.fn().mockReturnThis()
      }));

      // Mock console.error to prevent console output during tests
      console.error = jest.fn();

      // Call the function
      await authController.registerUser(req, res);

      // Assert that console.error was called with the error
      expect(console.error).toHaveBeenCalledWith(
        'Error during user registration:',
        mockError
      );
      
      // Assert the response
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Internal server error'
      }));
    });
  });

  describe('loginUser function', () => {
    it('should login a user successfully with valid credentials', async () => {
      // Mock request body
      req.body = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };
      
      // Mock user found
      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'user'
      };
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock password comparison
      bcrypt.compare.mockResolvedValueOnce(true);
      
      // Mock JWT sign
      jwt.sign.mockReturnValueOnce('mock-jwt-token');
      
      // Mock console.log to prevent console output during tests
      console.log = jest.fn();
      
      // Call the function
      await authController.loginUser(req, res);
      
      // Verify User.findOne was called with correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: req.body.email });
      
      // Verify bcrypt.compare was called with correct args
      expect(bcrypt.compare).toHaveBeenCalledWith(req.body.password, mockUser.password);
      
      // Verify JWT sign was called with correct payload
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.userId, role: mockUser.role },
        'test-secret',
        { expiresIn: '1h' }
      );
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({ token: 'mock-jwt-token' });
    });
    
    it('should return 404 if user is not found', async () => {
      // Mock request body
      req.body = {
        email: 'nonexistent@example.com',
        password: 'SecurePassword123!'
      };
      
      // Mock User.findOne to return null (user not found)
      User.findOne.mockResolvedValueOnce(null);
      
      // Mock console.log to prevent console output during tests
      console.log = jest.fn();
      
      // Call the function
      await authController.loginUser(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
    
    it('should return 400 if password is not provided', async () => {
      // Mock request body without password
      req.body = {
        email: 'test@example.com'
        // No password provided
      };
      
      // Mock user found
      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'user'
      };
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock console.log to prevent console output during tests
      console.log = jest.fn();
      
      // Call the function
      await authController.loginUser(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password is required' });
    });
    
    it('should return 400 if user has no password field', async () => {
      // Mock request body
      req.body = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };
      
      // Mock user found but without password (e.g., OAuth user)
      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        // No password field
        role: 'user'
      };
      
      // Mock User.findOne to return a user without password
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock console.log to prevent console output during tests
      console.log = jest.fn();
      
      // Call the function
      await authController.loginUser(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password is required' });
    });
    
    it('should return 400 if password is incorrect', async () => {
      // Mock request body
      req.body = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };
      
      // Mock user found
      const mockUser = {
        userId: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        role: 'user'
      };
      
      // Mock User.findOne to return a user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Mock bcrypt.compare to return false (incorrect password)
      bcrypt.compare.mockResolvedValueOnce(false);
      
      // Mock console.log to prevent console output during tests
      console.log = jest.fn();
      
      // Call the function
      await authController.loginUser(req, res);
      
      // Verify response
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
    
    it('should handle errors during login', async () => {
      // Mock request body
      req.body = {
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };
      
      // Mock User.findOne to throw an error
      const mockError = new Error('Database connection error');
      User.findOne.mockRejectedValueOnce(mockError);
      
      // Mock console.error to prevent console output during tests
      console.error = jest.fn();
      console.log = jest.fn();
      
      // Call the function
      await authController.loginUser(req, res);
      
      // Verify error handling
      expect(console.error).toHaveBeenCalledWith('Error during login:', mockError.message);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });

  describe('oauthLogin function', () => {
    let mockOAuthClient;
    
    beforeEach(() => {
      // Reset the mocks for OAuth client
      const { OAuth2Client } = require('google-auth-library');
      mockOAuthClient = new OAuth2Client();
    });
    
    it('should login an existing user with OAuth credentials', async () => {
      // Mock request body with Google token
      req.body = {
        token: 'google-oauth-token'
      };
      
      // Mock existing user
      const mockUser = {
        userId: 'user123',
        firstName: 'OAuth',
        lastName: 'User',
        email: 'oauth-user@example.com',
        role: 'user'
      };
      
      // Mock User.findOne to return existing user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Call the function
      await authController.oauthLogin(req, res);
      
      // Verify OAuth client was called correctly
      expect(mockOAuthClient.verifyIdToken).toHaveBeenCalledWith({
        idToken: 'google-oauth-token',
        audience: 'test-google-client-id'
      });
      
      // Verify User.findOne was called with the correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: 'oauth-user@example.com' });
      
      // Verify JWT sign was called with correct payload
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.userId, role: mockUser.role },
        'test-secret',
        { expiresIn: '1h' }
      );
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({ token: 'mock-jwt-token' });
      
      // Verify user was not created (since it already exists)
      expect(User).not.toHaveBeenCalledWith(expect.objectContaining({
        email: 'oauth-user@example.com'
      }));
    });
    
    it('should create a new user when OAuth user does not exist', async () => {
      // Mock request body with Google token
      req.body = {
        token: 'google-oauth-token'
      };
      
      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      // Call the function
      await authController.oauthLogin(req, res);
      
      // Verify User.findOne was called with the correct email
      expect(User.findOne).toHaveBeenCalledWith({ email: 'oauth-user@example.com' });
      
      // Verify User constructor was called with correct params
      expect(User).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'mock-object-id',
        firstName: 'OAuth',
        lastName: 'User',
        email: 'oauth-user@example.com',
        role: 'user',
        status: 'active'
      }));
      
      // Verify JWT token was generated
      expect(jwt.sign).toHaveBeenCalled();
      
      // Verify response
      expect(res.json).toHaveBeenCalledWith({ token: 'mock-jwt-token' });
    });
    
    it('should handle a first name and last name split from the full name', async () => {
      // Mock request body with Google token
      req.body = {
        token: 'google-oauth-token'
      };
      
      // Mock OAuth payload with full name
      const mockFullName = 'John Smith Doe';
      
      // Replace the getPayload mock for this test only
      const { OAuth2Client } = require('google-auth-library');
      mockOAuthClient.verifyIdToken.mockImplementationOnce(() => ({
        getPayload: jest.fn().mockReturnValue({
          email: 'john.doe@example.com',
          name: mockFullName
        })
      }));
      
      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      // Call the function
      await authController.oauthLogin(req, res);
      
      // Verify User constructor was called with correct name split
      expect(User).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'mock-object-id',
        firstName: 'John',
        lastName: 'Smith Doe',
        email: 'john.doe@example.com',
        role: 'user',
        status: 'active'
      }));
    });
    
    it('should handle errors during OAuth login', async () => {
      // Mock request body with token
      req.body = {
        token: 'invalid-token'
      };
      
      // Mock OAuth verification to throw an error
      const mockError = new Error('Invalid token');
      mockOAuthClient.verifyIdToken.mockRejectedValueOnce(mockError);
      
      // Call the function
      await authController.oauthLogin(req, res);
      
      // Verify error handling
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
    
    it('should handle errors during user save', async () => {
      // Mock request body with token
      req.body = {
        token: 'google-oauth-token'
      };
      
      // Mock User.findOne to return null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);
      
      // Create a mock save method that rejects with an error
      const mockError = new Error('Database error');
      
      // Mock the User implementation for this test only
      User.mockImplementationOnce(() => ({
        userId: 'mock-object-id',
        firstName: 'OAuth',
        lastName: 'User',
        email: 'oauth-user@example.com',
        role: 'user',
        status: 'active',
        save: jest.fn().mockRejectedValueOnce(mockError)
      }));
      
      // Mock console.error to prevent console output during tests
      console.error = jest.fn();
      
      // Call the function
      await authController.oauthLogin(req, res);
      
      // Verify error handling
      expect(console.error).toHaveBeenCalledWith('Error during OAuth login:', mockError.message);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
    });
  });
});
