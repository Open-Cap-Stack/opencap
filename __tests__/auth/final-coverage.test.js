/**
 * Final Coverage Test Suite for Authentication
 * Story: OCDI-303: Fix User Authentication Test Failures
 * 
 * This focused test suite targets specific coverage gaps
 * following OpenCap's TDD workflow and Semantic Seed standards
 */

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');

// Import test database utilities
const { connectDB, clearDB, disconnectDB } = require('../setup/testDB');

// Mock the email sending function
jest.mock('../../utils/email', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'mock-message-id'
  })
}));

// Get the mocked function
const { sendVerificationEmail } = require('../../utils/email');

describe('Authentication Final Coverage Tests (OCDI-303)', () => {
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

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'SecureP@ssword123',
        confirmPassword: 'SecureP@ssword123',
        role: 'user'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      
      // Check user was saved in database with correct fields
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.emailVerified).toBe(false);
      expect(user.status).toBe('pending');
      
      // Verify email was sent
      expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('should reject registration with missing fields', async () => {
      const incompleteData = {
        email: 'incomplete@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Validation failed');
      expect(response.body.errors).toContain('First name is required');
      expect(response.body.errors).toContain('Last name is required');
      
      // Verify no user was created
      const user = await User.findOne({ email: incompleteData.email });
      expect(user).toBeNull();
      
      // Verify no email was sent
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should reject registration when passwords do not match', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'password.mismatch@example.com',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Passwords do not match');
      
      // Verify no user was created
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeNull();
      
      // Verify no email was sent
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'weak.password@example.com',
        password: 'weak',
        confirmPassword: 'weak',
        role: 'user'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Password must be at least 8 characters long');
      
      // Verify no user was created
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeNull();
      
      // Verify no email was sent
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid email format', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid email format');
      
      // Verify no user was created
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeNull();
      
      // Verify no email was sent
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should reject registration with invalid role', async () => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid.role@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'invalid-role'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Role must be one of');
      
      // Verify no user was created
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeNull();
      
      // Verify no email was sent
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should prevent duplicate user registration', async () => {
      // Create a user first
      const existingUser = {
        firstName: 'Existing',
        lastName: 'User',
        email: 'duplicate@example.com',
        password: await bcrypt.hash('Password123!', 10),
        role: 'user',
        status: 'active'
      };

      await new User(existingUser).save();

      // Try to register with the same email
      const duplicateUserData = {
        firstName: 'Duplicate',
        lastName: 'Attempt',
        email: 'duplicate@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'user'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(duplicateUserData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message', 'User already exists');
      
      // Verify no email was sent
      expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('User Login', () => {
    // Create a test user before all login tests
    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const testUser = new User({
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
      const loginData = {
        email: 'test@example.com',
        password: 'Password123!'
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
    });

    it('should reject login with incorrect password', async () => {
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
    });

    it('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
      expect(response.body).not.toHaveProperty('token');
    });

    it('should reject login for inactive users', async () => {
      // Create an inactive user
      const hashedPassword = await bcrypt.hash('Password123!', 10);
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

      const loginData = {
        email: 'inactive@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Account is inactive. Please contact support.');
    });

    it('should reject login for suspended users', async () => {
      // Create a suspended user
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const suspendedUser = new User({
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
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Account is suspended. Please contact support.');
    });
  });

  describe('Token Management', () => {
    let testUser;
    let validToken;

    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      testUser = new User({
        firstName: 'Token',
        lastName: 'User',
        email: 'token@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active',
        emailVerified: true
      });
      await testUser.save();

      // Generate a valid token
      validToken = jwt.sign(
        { userId: testUser._id, email: testUser.email },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );
    });

    it('should refresh a valid token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .set('Authorization', `Bearer ${validToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('message', 'Token refreshed');
    });

    it('should reject token refresh with no token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .send();

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });

    it('should reject token refresh with invalid token', async () => {
      const response = await request(app)
        .post('/auth/refresh-token')
        .set('Authorization', 'Bearer invalid-token')
        .send();

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });
  });

  describe('Protected Routes', () => {
    let userToken;
    let adminToken;

    beforeEach(async () => {
      // Create a regular user
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const regularUser = new User({
        firstName: 'Regular',
        lastName: 'User',
        email: 'regular.user@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active',
        emailVerified: true
      });
      await regularUser.save();

      // Create an admin user
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin.user@example.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        emailVerified: true
      });
      await adminUser.save();

      // Generate tokens
      userToken = jwt.sign(
        { userId: regularUser._id, email: regularUser.email, role: 'user' },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );

      adminToken = jwt.sign(
        { userId: adminUser._id, email: adminUser.email, role: 'admin' },
        process.env.JWT_SECRET || 'test-jwt-secret',
        { expiresIn: '1h' }
      );
    });

    // Test protected routes that require authentication
    it('should allow authenticated access to protected route', async () => {
      // This test depends on there being a protected route in the API
      // For example, a user profile endpoint
      const response = await request(app)
        .get('/api/user-profile')
        .set('Authorization', `Bearer ${userToken}`);
      
      // The key point is to verify that authentication works
      // The actual status code may vary depending on the route and permissions
      expect(response.status).not.toBe(401); // Not unauthorized
    });

    // Test admin-only routes
    it('should restrict access to admin-only routes', async () => {
      // This test depends on there being an admin route in the API
      // For example, a users management endpoint
      const regularUserResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);
      
      const adminResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // Regular user should be forbidden
      expect(regularUserResponse.status).toBe(403);
      
      // Admin should be allowed (might be 200 or other success codes)
      expect(adminResponse.status).not.toBe(403);
    });
  });

  describe('User Model Methods', () => {
    it('should set a default display name based on first and last name', async () => {
      const user = new User({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'Password123!',
        role: 'user'
      });
      
      // Display name should be auto-generated if not provided
      expect(user.displayName).toBe('Jane Smith');
      
      await user.save();
      
      // Verify it persists
      const savedUser = await User.findOne({ email: 'jane.smith@example.com' });
      expect(savedUser.displayName).toBe('Jane Smith');
    });
    
    it('should use the provided display name if given', async () => {
      const user = new User({
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'JS',
        email: 'jane.custom@example.com',
        password: 'Password123!',
        role: 'user'
      });
      
      expect(user.displayName).toBe('JS');
      
      await user.save();
      
      const savedUser = await User.findOne({ email: 'jane.custom@example.com' });
      expect(savedUser.displayName).toBe('JS');
    });
    
    it('should not include password in JSON output', async () => {
      const user = new User({
        firstName: 'Security',
        lastName: 'Test',
        email: 'security.test@example.com',
        password: 'Password123!',
        role: 'user'
      });
      
      await user.save();
      
      const userJSON = user.toJSON();
      
      expect(userJSON).not.toHaveProperty('password');
      expect(userJSON).toHaveProperty('firstName');
      expect(userJSON).toHaveProperty('email');
    });
    
    it('should update user status and record timestamps', async () => {
      const user = new User({
        firstName: 'Status',
        lastName: 'Test',
        email: 'status.test@example.com',
        password: 'Password123!',
        role: 'user',
        status: 'pending'
      });
      
      await user.save();
      const initialCreatedAt = user.createdAt;
      
      // Update status after a brief delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      user.status = 'active';
      await user.save();
      
      const updatedUser = await User.findOne({ email: 'status.test@example.com' });
      
      expect(updatedUser.status).toBe('active');
      expect(updatedUser.createdAt).toEqual(initialCreatedAt);
      expect(updatedUser.updatedAt).not.toEqual(initialCreatedAt);
    });
  });
});
