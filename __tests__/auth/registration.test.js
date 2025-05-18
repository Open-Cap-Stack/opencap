const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = require('../../app');
const User = require('../../models/User');

// Import test database utilities
const { connectDB, clearDB, disconnectDB } = require('../setup/testDB');

// Import test environment setup
require('../setup/middleware-test-env');

// Enable verbose logging for tests
console.log = jest.fn(console.log);
console.error = jest.fn(console.error);

// Mock the email sending function
jest.mock('../../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockImplementation((user, verificationUrl) => {
    console.log(`Mock sendVerificationEmail called for ${user.email} with URL: ${verificationUrl}`);
    return Promise.resolve({ success: true, messageId: 'test-message-id' });
  })
}));

// Helper function to log test errors
const logTestError = (error) => {
  console.error('Test Error:', error);
  if (error.response) {
    console.error('Response status:', error.response.status);
    console.error('Response body:', error.response.body);
  }
};

describe('User Registration API', () => {
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

  /**
   * [Feature] OCAE-202: Implement user registration endpoint
   * [Bug] OCDI-302: Fix User Authentication Test Failures
   * 
   * This test suite follows OpenCap's TDD workflow and ensures code coverage
   * meets the required thresholds:
   * - Controllers: 85% statements, 75% branches, 85% lines, 85% functions
   * - Models: 90% statements, 80% branches, 90% lines, 90% functions
   */
  describe('POST /auth/register', () => {
    it('should register a new user with valid information', async () => {
      try {
        console.log('Starting test: should register a new user with valid information');
        
        const userData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          role: 'user',
          companyId: 'company123'
        };

        console.log('Sending registration request with data:', userData);
        
        // Make the request to register a new user
        const response = await request(app)
          .post('/auth/register')
          .send(userData);

        console.log('Received response:', {
          status: response.status,
          body: response.body
        });

        // Check the response
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'User registered successfully');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('userId');
        expect(response.body.user).toHaveProperty('email', userData.email);
        expect(response.body.user).toHaveProperty('firstName', userData.firstName);
        expect(response.body.user).toHaveProperty('lastName', userData.lastName);
        expect(response.body.user).toHaveProperty('role', userData.role);
        expect(response.body.user).toHaveProperty('status', 'pending');
        
        // Password should not be returned in the response
        expect(response.body.user).not.toHaveProperty('password');

        // Check the database to ensure the user was saved correctly
        const savedUser = await User.findOne({ email: userData.email });
        expect(savedUser).toBeTruthy();
        expect(savedUser.firstName).toBe(userData.firstName);
        expect(savedUser.lastName).toBe(userData.lastName);
        expect(savedUser.role).toBe(userData.role);
        expect(savedUser.status).toBe('pending');
        expect(savedUser.emailVerified).toBe(false);
        
        // Verify the password was properly hashed with bcrypt
        const isPasswordValid = await bcrypt.compare(userData.password, savedUser.password);
        expect(isPasswordValid).toBe(true);
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject registration with missing required fields', async () => {
      try {
        console.log('Starting test: should reject registration with missing required fields');
        
        // Missing firstName and lastName
        const incompleteData = {
          email: 'incomplete@example.com',
          password: 'SecurePassword123!',
          role: 'user'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(incompleteData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Validation failed');
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors).toContain('First name is required');
        expect(response.body.errors).toContain('Last name is required');

        // Verify no user was created
        const user = await User.findOne({ email: incompleteData.email });
        expect(user).toBeNull();
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject registration with invalid email format', async () => {
      try {
        const invalidEmailData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email', // Invalid email format
          password: 'SecurePassword123!',
          role: 'user'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(invalidEmailData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid email format');

        // Verify no user was created
        const user = await User.findOne({ email: invalidEmailData.email });
        expect(user).toBeNull();
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject registration when passwords do not match', async () => {
      try {
        const mismatchedPasswordData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'password-mismatch@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'DifferentPassword123!', // Doesn't match password
          role: 'user'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(mismatchedPasswordData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Passwords do not match');

        // Verify no user was created
        const user = await User.findOne({ email: mismatchedPasswordData.email });
        expect(user).toBeNull();
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject registration with weak password', async () => {
      try {
        const weakPasswordData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'weak-password@example.com',
          password: 'weak', // Too short
          role: 'user'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(weakPasswordData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Password must be at least 8 characters long');

        // Verify no user was created
        const user = await User.findOne({ email: weakPasswordData.email });
        expect(user).toBeNull();
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject registration with password lacking complexity', async () => {
      try {
        const simplePasswordData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'simple-password@example.com',
          password: 'SimplePassword123', // Missing special character
          role: 'user'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(simplePasswordData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

        // Verify no user was created
        const user = await User.findOne({ email: simplePasswordData.email });
        expect(user).toBeNull();
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject registration with invalid role', async () => {
      try {
        const invalidRoleData = {
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-role@example.com',
          password: 'SecurePassword123!',
          role: 'invalid-role' // Not an allowed role
        };

        const response = await request(app)
          .post('/auth/register')
          .send(invalidRoleData);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Role must be one of');

        // Verify no user was created
        const user = await User.findOne({ email: invalidRoleData.email });
        expect(user).toBeNull();
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should prevent duplicate user registration', async () => {
      try {
        // Create a user first
        const existingUserData = {
          userId: new mongoose.Types.ObjectId().toString(),
          firstName: 'Existing',
          lastName: 'User',
          email: 'duplicate@example.com',
          password: await bcrypt.hash('SecurePassword123!', 10),
          role: 'user',
          status: 'active'
        };

        const existingUser = new User(existingUserData);
        await existingUser.save();

        // Try to register with the same email
        const duplicateUserData = {
          firstName: 'Duplicate',
          lastName: 'Attempt',
          email: 'duplicate@example.com', // Same email as existing user
          password: 'SecurePassword123!',
          role: 'user'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(duplicateUserData);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'User already exists');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should handle server errors gracefully during registration', async () => {
      try {
        // Mock a database error by having the User.findOne method throw an error
        const originalFindOne = User.findOne;
        User.findOne = jest.fn().mockImplementationOnce(() => {
          throw new Error('Simulated database error');
        });

        const userData = {
          firstName: 'Error',
          lastName: 'Test',
          email: 'error-test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          role: 'user'
        };

        const response = await request(app)
          .post('/auth/register')
          .send(userData);

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
