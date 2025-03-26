/**
 * Test file for OCAE-202: Implement user registration endpoint
 * 
 * This file tests the user registration functionality ensuring:
 * - Proper input validation
 * - Password hashing
 * - User creation with correct fields
 * - Appropriate error handling
 */

const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const app = require('../../app');
const User = require('../../models/User');

// Setup test environment
require('../setup/middleware-test-env');
require('../setup/docker-test-env');

describe('User Registration API', () => {
  
  beforeAll(async () => {
    // Ensure MongoDB is connected before running tests
    if (!mongoose.connection.readyState) {
      console.log('Connecting to MongoDB for tests...');
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opencap-test', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    console.log('MongoDB connection ready state:', mongoose.connection.readyState);
  });
  
  beforeEach(async () => {
    // Clear users collection before each test
    await User.deleteMany({});
  });
  
  afterAll(async () => {
    // Close MongoDB connection after all tests
    await mongoose.connection.close();
  });
  
  describe('POST /auth/register', () => {
    
    it('should register a new user with valid information', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'user',
        companyId: 'company123'
      };
      
      try {
        const response = await request(app)
          .post('/auth/register')
          .send(userData);
        
        console.log('Registration response:', response.status, response.body);
        
        // Check response
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'User registered successfully');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('userId');
        expect(response.body.user).toHaveProperty('email', userData.email);
        expect(response.body.user).toHaveProperty('firstName', userData.firstName);
        expect(response.body.user).toHaveProperty('lastName', userData.lastName);
        expect(response.body.user).toHaveProperty('role', userData.role);
        expect(response.body.user).toHaveProperty('status', 'pending');
        
        // Password should not be returned
        expect(response.body.user).not.toHaveProperty('password');
        
        // Check database
        const savedUser = await User.findOne({ email: userData.email });
        expect(savedUser).toBeTruthy();
        
        // Verify password was hashed
        const passwordMatch = await bcrypt.compare(userData.password, savedUser.password);
        expect(passwordMatch).toBe(true);
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
    
    it('should return 400 if email already exists', async () => {
      // Create a user first
      const existingUser = new User({
        userId: new mongoose.Types.ObjectId().toString(),
        firstName: 'Existing',
        lastName: 'User',
        email: 'existing@example.com',
        password: 'hashedPassword',
        role: 'user',
        companyId: 'company123'
      });
      await existingUser.save();
      
      // Try to register with the same email
      const userData = {
        firstName: 'Another',
        lastName: 'User',
        email: 'existing@example.com', // Same email as existing user
        password: 'AnotherPassword123!',
        role: 'user'
      };
      
      try {
        const response = await request(app)
          .post('/auth/register')
          .send(userData);
        
        console.log('Duplicate email response:', response.status, response.body);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message.toLowerCase()).toContain('email already exists');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
    
    it('should validate required fields', async () => {
      const incompleteUserData = {
        // Missing firstName, lastName
        email: 'incomplete@example.com',
        password: 'Password123!'
      };
      
      try {
        const response = await request(app)
          .post('/auth/register')
          .send(incompleteUserData);
        
        console.log('Required fields response:', response.status, response.body);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toHaveLength(3); // Missing firstName, lastName, role
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
    
    it('should validate email format', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email', // Invalid email format
        password: 'SecurePassword123!',
        role: 'user'
      };
      
      try {
        const response = await request(app)
          .post('/auth/register')
          .send(userData);
        
        console.log('Invalid email response:', response.status, response.body);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message.toLowerCase()).toContain('invalid email');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
    
    it('should validate password strength', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'weak', // Too short and simple
        role: 'user'
      };
      
      try {
        const response = await request(app)
          .post('/auth/register')
          .send(userData);
        
        console.log('Weak password response:', response.status, response.body);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message.toLowerCase()).toContain('password');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
    
    it('should validate role is one of the allowed values', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'invalid-role' // Not in the enum list
      };
      
      try {
        const response = await request(app)
          .post('/auth/register')
          .send(userData);
        
        console.log('Invalid role response:', response.status, response.body);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message.toLowerCase()).toContain('role');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
    
    it('should set default status to pending', async () => {
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        role: 'user'
      };
      
      try {
        const response = await request(app)
          .post('/auth/register')
          .send(userData);
        
        console.log('Default status response:', response.status, response.body);
        
        expect(response.status).toBe(201);
        
        // Check database
        const savedUser = await User.findOne({ email: userData.email });
        expect(savedUser.status).toBe('pending');
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    });
  });
});
