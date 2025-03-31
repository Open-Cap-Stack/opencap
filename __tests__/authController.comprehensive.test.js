/**
 * Authentication Controller Comprehensive Tests
 * Created for: [Bug] OCAE-205: Fix User Authentication Test Failures
 * 
 * These tests target highly specific edge cases and branch conditions 
 * in the authentication controller to improve code coverage to meet
 * Semantic Seed Venture Studio Coding Standards.
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authController = require('../controllers/authController');
const User = require('../models/User');
const mongoDbConnection = require('../utils/mongoDbConnection');
const { OAuth2Client } = require('google-auth-library');

// Set up the Express app
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mock sensitive environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_RESET_SECRET = 'test-reset-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Define all routes for testing
app.post('/auth/register', authController.registerUser);
app.post('/auth/login', authController.loginUser);
app.post('/auth/oauth-login', authController.oauthLogin);
app.post('/auth/token/refresh', authController.refreshToken);
app.post('/auth/logout', (req, res, next) => {
  req.token = req.body.token || 'test-token';
  next();
}, authController.logout);
app.post('/auth/password/reset-request', authController.requestPasswordReset);
app.post('/auth/password/verify-token', authController.verifyResetToken);
app.post('/auth/password/reset', authController.resetPassword);
app.get('/auth/verify/:token', authController.verifyEmail);
app.post('/auth/verify', authController.verifyEmail);
app.post('/auth/verify/send', (req, res, next) => {
  req.user = { userId: req.body.userId };
  next();
}, authController.sendVerificationEmail);
app.get('/auth/profile', (req, res, next) => {
  req.user = { userId: req.headers['x-user-id'] };
  next();
}, authController.getUserProfile);
app.put('/auth/profile', (req, res, next) => {
  req.user = { userId: req.headers['x-user-id'] };
  next();
}, authController.updateUserProfile);

// Mock modules
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockImplementation((mailOptions) => {
        return Promise.resolve({ messageId: 'test-message-id' });
      }),
      verify: jest.fn().mockResolvedValue(true)
    })
  };
});

// Mock Google Auth Library
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => {
      return {
        verifyIdToken: jest.fn().mockImplementation(({ idToken }) => {
          if (idToken === 'valid-token') {
            return Promise.resolve({
              getPayload: () => ({
                email: 'oauth@example.com',
                given_name: 'OAuth',
                family_name: 'User',
                sub: 'google-oauth-id'
              })
            });
          } else if (idToken === 'no-email-token') {
            return Promise.resolve({
              getPayload: () => ({
                given_name: 'NoEmail',
                family_name: 'User',
                sub: 'google-no-email-id'
              })
            });
          } else {
            return Promise.reject(new Error('Invalid token'));
          }
        })
      };
    })
  };
});

beforeAll(async () => {
  await mongoDbConnection.connectWithRetry();
});

beforeEach(async () => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Clean up user collection before each test
  await mongoDbConnection.withRetry(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
    }
  });
});

afterAll(async () => {
  await mongoDbConnection.withRetry(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
    }
  });
  await mongoDbConnection.disconnect();
});

describe('Authentication Controller Comprehensive Tests', () => {
  describe('Registration Edge Cases', () => {
    test('should reject invalid email formats', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'Bad',
          lastName: 'Email',
          email: 'not-an-email',
          password: 'Password123!'
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('email');
    });
    
    test('should require first and last name', async () => {
      // Missing first name
      const missingFirst = await request(app)
        .post('/auth/register')
        .send({
          lastName: 'Name',
          email: 'missing@example.com',
          password: 'Password123!'
        });
      
      expect(missingFirst.statusCode).toBe(400);
      
      // Missing last name
      const missingLast = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'Missing',
          email: 'missing@example.com',
          password: 'Password123!'
        });
      
      expect(missingLast.statusCode).toBe(400);
    });
    
    test('should reject duplicate email registrations', async () => {
      // Create a user
      await request(app)
        .post('/auth/register')
        .send({
          firstName: 'First',
          lastName: 'User',
          email: 'duplicate@example.com',
          password: 'Password123!'
        });
      
      // Try to register with the same email
      const duplicate = await request(app)
        .post('/auth/register')
        .send({
          firstName: 'Second',
          lastName: 'User',
          email: 'duplicate@example.com',
          password: 'Password123!'
        });
      
      expect(duplicate.statusCode).toBe(400);
      expect(duplicate.body.message).toContain('exists');
    });
  });
  
  describe('Login Edge Cases', () => {
    test('should reject empty credential login attempts', async () => {
      // Empty email
      const emptyEmail = await request(app)
        .post('/auth/login')
        .send({
          email: '',
          password: 'Password123!'
        });
      
      expect(emptyEmail.statusCode).toBe(400);
      
      // Empty password
      const emptyPassword = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: ''
        });
      
      expect(emptyPassword.statusCode).toBe(400);
    });
    
    test('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });
    
    test('should handle login with incorrect password', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId().toString();
      const user = new User({
        userId,
        firstName: 'Password',
        lastName: 'Tester',
        email: 'password@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'user',
        status: 'active'
      });
      
      await mongoDbConnection.withRetry(async () => {
        await user.save();
      });
      
      // Try to login with wrong password
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'password@example.com',
          password: 'WrongPassword123!'
        });
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toContain('Invalid');
    });
  });
  
  describe('OAuth Login Edge Cases', () => {
    test('should reject OAuth login without provider', async () => {
      const response = await request(app)
        .post('/auth/oauth-login')
        .send({
          token: 'valid-token'
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('provider');
    });
    
    test('should reject OAuth login without token', async () => {
      const response = await request(app)
        .post('/auth/oauth-login')
        .send({
          provider: 'google'
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('token');
    });
    
    test('should reject invalid OAuth tokens', async () => {
      const response = await request(app)
        .post('/auth/oauth-login')
        .send({
          provider: 'google',
          token: 'invalid-token'
        });
      
      expect(response.statusCode).toBe(401);
    });
  });
  
  describe('Token Handling', () => {
    test('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/token/refresh')
        .send({});
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('required');
    });
    
    test('should handle invalid JWT in refresh token', async () => {
      const response = await request(app)
        .post('/auth/token/refresh')
        .send({
          refreshToken: 'not-a-valid-jwt'
        });
      
      expect(response.statusCode).toBe(401);
    });
    
    test('should reject token for non-existent user', async () => {
      // Generate a valid token but for a non-existent user
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const token = jwt.sign(
        { userId: nonExistentId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '1h' }
      );
      
      const response = await request(app)
        .post('/auth/token/refresh')
        .send({
          refreshToken: token
        });
      
      expect(response.statusCode).toBe(401);
    });
  });
  
  describe('Password Reset Flow', () => {
    test('should handle password reset request for non-existent email', async () => {
      const response = await request(app)
        .post('/auth/password/reset-request')
        .send({
          email: 'nonexistent@example.com'
        });
      
      // Should still return success to prevent user enumeration
      expect(response.statusCode).toBe(200);
    });
    
    test('should reject invalid token in password reset', async () => {
      const response = await request(app)
        .post('/auth/password/reset')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!'
        });
      
      expect(response.statusCode).toBe(401);
    });
    
    test('should require strong password in reset', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId().toString();
      const user = new User({
        userId,
        firstName: 'Reset',
        lastName: 'Password',
        email: 'reset@example.com',
        password: await bcrypt.hash('OldPassword123!', 10),
        role: 'user',
        status: 'active'
      });
      
      await mongoDbConnection.withRetry(async () => {
        await user.save();
      });
      
      // Create valid reset token
      const token = jwt.sign(
        { userId },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
      );
      
      // Try with weak password
      const response = await request(app)
        .post('/auth/password/reset')
        .send({
          token,
          password: 'weak'
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('length');
    });
  });
  
  describe('Email Verification', () => {
    test('should handle verification for non-existent user', async () => {
      // Create token for non-existent user
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const token = jwt.sign(
        { userId: nonExistentId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const response = await request(app)
        .post('/auth/verify')
        .send({
          token
        });
      
      expect(response.statusCode).toBe(404);
    });
    
    test('should reject invalid verification tokens', async () => {
      const response = await request(app)
        .post('/auth/verify')
        .send({
          token: 'invalid-token'
        });
      
      expect(response.statusCode).toBe(401);
    });
    
    test('should handle already verified emails', async () => {
      // Create a user with verified email
      const userId = new mongoose.Types.ObjectId().toString();
      const user = new User({
        userId,
        firstName: 'Already',
        lastName: 'Verified',
        email: 'verified@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'user',
        status: 'active',
        emailVerified: true
      });
      
      await mongoDbConnection.withRetry(async () => {
        await user.save();
      });
      
      // Create token
      const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      const response = await request(app)
        .post('/auth/verify')
        .send({
          token
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('already');
    });
  });
  
  describe('Profile Management', () => {
    test('should reject profile updates without user authentication', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .send({
          firstName: 'Updated'
        });
      
      expect(response.statusCode).toBe(404);
    });
    
    test('should handle profile update for non-existent user', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      const response = await request(app)
        .put('/auth/profile')
        .set('x-user-id', nonExistentId)
        .send({
          firstName: 'Updated'
        });
      
      expect(response.statusCode).toBe(404);
    });
    
    test('should reject invalid password change', async () => {
      // Create a user
      const userId = new mongoose.Types.ObjectId().toString();
      const user = new User({
        userId,
        firstName: 'Password',
        lastName: 'Updater',
        email: 'password-updater@example.com',
        password: await bcrypt.hash('OldPassword123!', 10),
        role: 'user',
        status: 'active'
      });
      
      await mongoDbConnection.withRetry(async () => {
        await user.save();
      });
      
      // Try to update password with wrong current password
      const response = await request(app)
        .put('/auth/profile')
        .set('x-user-id', userId)
        .send({
          password: {
            current: 'WrongPassword123!',
            new: 'NewPassword123!'
          }
        });
      
      expect(response.statusCode).toBe(401);
    });
  });
});
