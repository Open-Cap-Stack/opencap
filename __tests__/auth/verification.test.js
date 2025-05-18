/**
 * Tests for Email Verification API
 * Feature: OCAE-204: Implement user email verification
 * Bug: OCDI-303: Fix User Authentication Test Failures
 * 
 * This test suite follows OpenCap's TDD workflow and ensures code coverage
 * meets the required thresholds.
 */

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');

// Import test database utilities
const { connectDB, clearDB, disconnectDB } = require('../setup/testDB');

// Import test environment setup
require('../setup/middleware-test-env');

// Enable verbose logging for tests
console.log = jest.fn(console.log);
console.error = jest.fn(console.error);

// Helper function to log test errors
const logTestError = (error) => {
  console.error('Test Error:', error);
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response body:', error.response.body);
  }
};

describe('User Email Verification API', () => {
  beforeAll(async () => {
    // Connect to the test database
    await connectDB();
  });

  afterEach(async () => {
    // Clear test data
    await clearDB();
  });

  afterAll(async () => {
    // Disconnect from the test database
    await disconnectDB();
  });

  describe('GET /auth/verify-email', () => {
    it('should verify a user email with valid token', async () => {
      try {
        // Create a user with pending status
        const userData = {
          userId: new mongoose.Types.ObjectId().toString(),
          firstName: 'Verify',
          lastName: 'User',
          email: 'verify@example.com',
          password: 'SecurePassword123!',
          role: 'user',
          status: 'pending',
          emailVerified: false
        };

        const user = new User(userData);
        await user.save();

        // Create verification token
        const verificationToken = jwt.sign(
          { userId: userData.userId },
          process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Make the request to verify email
        const response = await request(app)
          .get(`/auth/verify-email/${verificationToken}`);

        // Verify response
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Email verified successfully');
        
        // Check user was updated in database
        const updatedUser = await User.findOne({ userId: userData.userId });
        expect(updatedUser.emailVerified).toBe(true);
        expect(updatedUser.status).toBe('active');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject verification with invalid token', async () => {
      try {
        const response = await request(app)
          .get('/auth/verify-email/invalid-token');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid verification token');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject verification for non-existent user', async () => {
      try {
        // Create token for non-existent user
        const nonExistentToken = jwt.sign(
          { userId: new mongoose.Types.ObjectId().toString() },
          process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        const response = await request(app)
          .get(`/auth/verify-email/${nonExistentToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'User not found');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should handle expired verification token', async () => {
      try {
        // Create a user
        const userData = {
          userId: new mongoose.Types.ObjectId().toString(),
          firstName: 'Expired',
          lastName: 'Token',
          email: 'expired@example.com',
          password: 'SecurePassword123!',
          role: 'user',
          status: 'pending'
        };

        const user = new User(userData);
        await user.save();

        // Create expired token
        const expiredToken = jwt.sign(
          { userId: userData.userId },
          process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
          { expiresIn: '0s' }
        );

        // Wait a moment to ensure token expires
        await new Promise(resolve => setTimeout(resolve, 100));

        const response = await request(app)
          .get(`/auth/verify-email/${expiredToken}`);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Token expired');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should handle already verified user', async () => {
      try {
        // Create a user that's already verified
        const userData = {
          userId: new mongoose.Types.ObjectId().toString(),
          firstName: 'Already',
          lastName: 'Verified',
          email: 'already-verified@example.com',
          password: 'SecurePassword123!',
          role: 'user',
          status: 'active',
          emailVerified: true
        };

        const user = new User(userData);
        await user.save();

        // Create verification token
        const verificationToken = jwt.sign(
          { userId: userData.userId },
          process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        const response = await request(app)
          .get(`/auth/verify-email/${verificationToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Email already verified');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should handle server errors during verification', async () => {
      try {
        // Create a valid token
        const token = jwt.sign(
          { userId: new mongoose.Types.ObjectId().toString() },
          process.env.JWT_VERIFICATION_SECRET || process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Mock database error
        const originalFindOne = User.findOne;
        User.findOne = jest.fn().mockImplementationOnce(() => {
          throw new Error('Simulated database error');
        });

        const response = await request(app)
          .get(`/auth/verify-email/${token}`);

        // Verify error response
        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('message', 'Internal server error');

        // Restore original method
        User.findOne = originalFindOne;
      } catch (error) {
        // Restore original method in case of error
        User.findOne = User.findOne.mockRestore ? User.findOne.mockRestore() : User.findOne;
        logTestError(error);
        throw error;
      }
    });
  });
});
