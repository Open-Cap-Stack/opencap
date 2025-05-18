/**
 * Authentication Tests - User Registration and Login
 * 
 * [Feature] OCAE-202: Implement user registration endpoint
 * [Bug] OCDI-302: Fix User Authentication Test Failures
 * 
 * Following OpenCap's Semantic Seed TDD workflow and testing standards.
 * Ensuring code coverage meets required thresholds:
 * - Controllers: 85% statements, 75% branches, 85% lines, 85% functions
 * - Models: 90% statements, 80% branches, 90% lines, 90% functions
 */

// Mock nodemailer first to prevent actual email sending
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: mockSendMail,
    verify: jest.fn().mockResolvedValue(true)
  })
}));

// Create mock for sendVerificationEmailToUser in authController
const mockSendVerificationEmail = jest.fn().mockResolvedValue({ success: true });
jest.mock('../../controllers/authController', () => {
  const originalModule = jest.requireActual('../../controllers/authController');
  return {
    ...originalModule,
    sendVerificationEmailToUser: mockSendVerificationEmail
  };
});

// Import dependencies after mocks are set up
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Import the app and models
const app = require('../../app');
const User = require('../../models/User');
const authController = require('../../controllers/authController');

// Set up test environment variables
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NODE_ENV = 'test';

// Setup test logging
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

/**
 * We're following the OpenCap TDD workflow (WIP: Red → Green → Refactor)
 * and strictly meeting code coverage requirements:
 * - Controllers: 85%+ statements, 75%+ branches, 85%+ lines, 85%+ functions
 * - Models: 90%+ statements, 80%+ branches, 90%+ lines, 90%+ functions
 */

// MongoDB in-memory server instance
let mongoServer;

beforeAll(async () => {
  // Set up test output logging
  console.log = jest.fn((...args) => {
    originalConsoleLog('TEST:', ...args);
  });
  console.error = jest.fn((...args) => {
    originalConsoleError('TEST ERROR:', ...args);
  });
  
  try {
    // Create MongoDB memory server with optimized settings
    mongoServer = await MongoMemoryServer.create({
      instance: { dbName: 'auth-test-db' }
    });
    
    const mongoUri = mongoServer.getUri();
    console.log(`Setting up MongoDB Memory Server at: ${mongoUri}`);
    
    // Connect to the isolated test database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    // Verify connection
    console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);
  } catch (error) {
    console.error('MongoDB Memory Server setup failed:', error);
    throw error;
  }
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up database after each test for isolation
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  try {
    // Proper cleanup sequence
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Test cleanup error:', error);
  } finally {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  }
});

/**
 * Authentication Tests
 * 
 * Following OpenCap Semantic Seed Venture Studio Coding Standards V2.0
 * Implemented as part of OCAE-202: Implement user registration endpoint
 * Fixing OCDI-302: Fix User Authentication Test Failures
 */
describe('User Authentication', () => {
  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      // Prepare valid test user data with required fields
      const userData = {
        firstName: 'Test',  // Controller should auto-generate userId
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
        role: 'user',
        companyId: 'company123'
      };
      
      // Send registration request
      const response = await request(app)
        .post('/auth/register')
        .send(userData);
      
      // Assertions for response
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', userData.email);
      expect(response.body.user).toHaveProperty('firstName', userData.firstName);
      expect(response.body.user).toHaveProperty('lastName', userData.lastName);
      expect(response.body.user).toHaveProperty('role', userData.role);
      expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned
      
      // Verify user was saved to database
      const savedUser = await User.findOne({ email: userData.email });
      expect(savedUser).toBeTruthy();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.firstName).toBe(userData.firstName);
      expect(savedUser.lastName).toBe(userData.lastName);
      expect(savedUser.status).toBe('pending'); // Default status should be pending
      expect(savedUser.userId).toBeTruthy(); // Should have auto-generated userId
      
      // Verify password was properly hashed
      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
      
      // Verify email verification function was called
      expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: userData.email })
      );
    });
    
    it('should reject registration with missing required fields', async () => {
      // Missing firstName and lastName
      const incompleteData = {
        email: 'incomplete@example.com',
        password: 'Password123!',
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
      
      // Verify email verification function was NOT called
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
    
    it('should reject registration with invalid email format', async () => {
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
      
      // Verify email verification function was NOT called
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
    
    it('should reject registration when passwords do not match', async () => {
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
      
      // Verify email verification function was NOT called
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
    
    it('should reject registration with weak password', async () => {
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
      
      // Verify email verification function was NOT called
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
    
    it('should reject registration with password lacking complexity', async () => {
      const simplePasswordData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'simple-password@example.com',
        // Password without special character
        password: 'SimplePassword123', 
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
      
      // Verify email verification function was NOT called
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
    
    it('should reject registration with invalid role', async () => {
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
      
      // Verify email verification function was NOT called
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
    
    it('should prevent duplicate user registration', async () => {
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
      
      // Verify email verification function was NOT called
      expect(mockSendVerificationEmail).not.toHaveBeenCalled();
    });
  });
  
  describe('User Login', () => {
    it('should successfully log in a registered user', async () => {
      // Create a test user with known credentials
      const password = 'SecurePassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        userId: new mongoose.Types.ObjectId().toString(),
        firstName: 'Login',
        lastName: 'Test',
        email: 'login-test@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active'
      };
      
      const user = new User(userData);
      await user.save();
      
      // Attempt to log in with correct credentials
      const loginData = {
        email: 'login-test@example.com',
        password: password
      };
      
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);
        
      // Verify successful login response
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', loginData.email);
      expect(response.body.user).toHaveProperty('firstName', userData.firstName);
      expect(response.body.user).toHaveProperty('lastName', userData.lastName);
      expect(response.body.user).not.toHaveProperty('password'); // Password should not be returned
      
      // Verify JWT token contains correct data
      const token = response.body.accessToken;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');
      expect(decoded).toHaveProperty('userId', userData.userId);
      expect(decoded).toHaveProperty('role', userData.role);
    });
    
    it('should reject login with wrong password', async () => {
      // Create a test user
      const password = 'SecurePassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const userData = {
        userId: new mongoose.Types.ObjectId().toString(),
        firstName: 'Wrong',
        lastName: 'Password',
        email: 'wrong-password@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active'
      };
      
      const user = new User(userData);
      await user.save();
      
      // Attempt to log in with wrong password
      const loginData = {
        email: 'wrong-password@example.com',
        password: 'WrongPassword123!'
      };
      
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);
        
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
    
    it('should reject login with non-existent email', async () => {
      // Attempt to login with non-existent user
      const loginData = {
        email: 'non-existent@example.com',
        password: 'SecurePassword123!'
      };
      
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid credentials');
    });
    
    it('should reject login with missing credentials', async () => {
      // Missing email
      const missingEmailData = {
        password: 'SecurePassword123!'
      };
      
      const emailResponse = await request(app)
        .post('/auth/login')
        .send(missingEmailData);
      
      expect(emailResponse.status).toBe(400);
      expect(emailResponse.body).toHaveProperty('message', 'Email and password are required');
      
      // Missing password
      const missingPasswordData = {
        email: 'test@example.com'
      };
      
      const passwordResponse = await request(app)
        .post('/auth/login')
        .send(missingPasswordData);
      
      expect(passwordResponse.status).toBe(400);
      expect(passwordResponse.body).toHaveProperty('message', 'Email and password are required');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle server errors gracefully during registration', async () => {
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
    });
    
    it('should handle server errors gracefully during login', async () => {
      // Mock a database error
      const originalFindOne = User.findOne;
      User.findOne = jest.fn().mockImplementationOnce(() => {
        throw new Error('Simulated database error');
      });
      
      const loginData = {
        email: 'error-login@example.com',
        password: 'SecurePassword123!'
      };
      
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);
      
      // Verify error response
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('message', 'Internal server error');
      
      // Restore original method
      User.findOne = originalFindOne;
    });
  });
});

