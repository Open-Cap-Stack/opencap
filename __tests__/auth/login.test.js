const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
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

/**
 * [Feature] OCAE-203: Implement user login endpoint
 * [Bug] OCDI-303: Fix User Authentication Login Test Failures
 * 
 * This test suite follows OpenCap's TDD workflow and ensures code coverage
 * meets the required thresholds:
 * - Controllers: 85% statements, 75% branches, 85% lines, 85% functions
 * - Models: 90% statements, 80% branches, 90% lines, 90% functions
 */
describe('User Login API', () => {
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

  describe('POST /auth/login', () => {
    // Create a test user before each test in this block
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
      const testUser = new User({
        userId: new mongoose.Types.ObjectId().toString(),
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active',
        emailVerified: true
      });
      await testUser.save();
    });

    it('should login a user with valid credentials', async () => {
      try {
        console.log('Starting test: should login a user with valid credentials');
        
        const loginData = {
          email: 'test@example.com',
          password: 'SecurePassword123!'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('email', loginData.email);
        expect(response.body.user).not.toHaveProperty('password');
        
        // Verify the JWT token
        const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
        expect(decodedToken).toHaveProperty('userId');
        expect(decodedToken).toHaveProperty('email', loginData.email);
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject login with invalid email', async () => {
      try {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'SecurePassword123!'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid email or password');
        expect(response.body).not.toHaveProperty('token');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject login with invalid password', async () => {
      try {
        const loginData = {
          email: 'test@example.com',
          password: 'WrongPassword123!'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid email or password');
        expect(response.body).not.toHaveProperty('token');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject login with missing email', async () => {
      try {
        const loginData = {
          password: 'SecurePassword123!'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Email is required');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject login with missing password', async () => {
      try {
        const loginData = {
          email: 'test@example.com'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Password is required');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject login for inactive user accounts', async () => {
      try {
        // Create an inactive user
        const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
        const inactiveUser = new User({
          userId: new mongoose.Types.ObjectId().toString(),
          firstName: 'Inactive',
          lastName: 'User',
          email: 'inactive@example.com',
          password: hashedPassword,
          role: 'user',
          status: 'inactive',
          emailVerified: true
        });
        await inactiveUser.save();
        
        const loginData = {
          email: 'inactive@example.com',
          password: 'SecurePassword123!'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Account is inactive. Please contact support.');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject login for suspended user accounts', async () => {
      try {
        // Create a suspended user
        const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
        const suspendedUser = new User({
          userId: new mongoose.Types.ObjectId().toString(),
          firstName: 'Suspended',
          lastName: 'User',
          email: 'suspended@example.com',
          password: hashedPassword,
          role: 'user',
          status: 'suspended',
          emailVerified: true
        });
        await suspendedUser.save();
        
        const loginData = {
          email: 'suspended@example.com',
          password: 'SecurePassword123!'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Account is suspended. Please contact support.');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should handle server errors gracefully during login', async () => {
      try {
        // Mock a database error by having the User.findOne method throw an error
        const originalFindOne = User.findOne;
        User.findOne = jest.fn().mockImplementationOnce(() => {
          throw new Error('Simulated database error');
        });

        const loginData = {
          email: 'test@example.com',
          password: 'SecurePassword123!'
        };
        
        const response = await request(app)
          .post('/auth/login')
          .send(loginData);
        
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

  describe('POST /auth/refresh-token', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);
      testUser = new User({
        userId: new mongoose.Types.ObjectId().toString(),
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active',
        emailVerified: true
      });
      await testUser.save();
      
      // Generate a valid token for this user
      validToken = jwt.sign(
        { userId: testUser.userId, email: testUser.email, role: testUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );
    });
    
    it('should refresh token with valid existing token', async () => {
      try {
        const response = await request(app)
          .post('/auth/refresh-token')
          .set('Authorization', `Bearer ${validToken}`)
          .send();
          
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('message', 'Token refreshed');
        
        // Verify the new token
        const decodedToken = jwt.verify(response.body.token, process.env.JWT_SECRET);
        expect(decodedToken).toHaveProperty('userId', testUser.userId);
        expect(decodedToken).toHaveProperty('email', testUser.email);
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });
    
    it('should reject token refresh with invalid token', async () => {
      try {
        const invalidToken = 'invalid-token';
        
        const response = await request(app)
          .post('/auth/refresh-token')
          .set('Authorization', `Bearer ${invalidToken}`)
          .send();
          
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });
    
    it('should reject token refresh with expired token', async () => {
      try {
        // Generate an expired token
        const expiredToken = jwt.sign(
          { userId: testUser.userId, email: testUser.email },
          process.env.JWT_SECRET,
          { expiresIn: '0s' }
        );
        
        // Wait a bit to ensure token expires
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const response = await request(app)
          .post('/auth/refresh-token')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send();
          
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });
    
    it('should reject token refresh with missing token', async () => {
      try {
        const response = await request(app)
          .post('/auth/refresh-token')
          .send();
          
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'No token provided');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });

    it('should reject token refresh if user no longer exists', async () => {
      try {
        // Generate a token for a non-existent user
        const nonExistentToken = jwt.sign(
          { userId: new mongoose.Types.ObjectId().toString(), email: 'nonexistent@example.com' },
          process.env.JWT_SECRET,
          { expiresIn: '15m' }
        );
        
        const response = await request(app)
          .post('/auth/refresh-token')
          .set('Authorization', `Bearer ${nonExistentToken}`)
          .send();
          
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'User not found');
      } catch (error) {
        logTestError(error);
        throw error;
      }
    });
  });
});
