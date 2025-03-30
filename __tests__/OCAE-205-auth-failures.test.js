/**
 * OCAE-205: Fix User Authentication Test Failures
 * 
 * This file documents the failing authentication tests that need to be fixed
 * according to the Semantic Seed Venture Studio Coding Standards.
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const User = require('../models/User');
const mongoDbConnection = require('../utils/mongoDbConnection');

// Set up the Express app for testing
const app = express();
app.use(bodyParser.json());

// Define routes for authentication
app.post('/auth/register', authController.registerUser);
app.post('/auth/login', authController.loginUser);
app.post('/auth/oauth-login', authController.oauthLogin);

// Set up environment variable for JWT_SECRET in tests if not already set
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';

// Test setup - use improved MongoDB connection with retry
beforeAll(async () => {
  // Connect to MongoDB with improved retry logic
  await mongoDbConnection.connectWithRetry();
  
  // Clear users collection to ensure clean test environment
  await User.deleteMany({});
});

// Proper test teardown - important for test isolation
afterAll(async () => {
  // Only drop database and clean up after all tests have run
  await mongoDbConnection.withRetry(async () => {
    await mongoose.connection.db.dropDatabase();
  });
  await mongoDbConnection.disconnect();
});

// Mock Google OAuth Client
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          email: 'oauthuser@example.com',
          name: 'OAuth User',
          given_name: 'OAuth',
          family_name: 'User',
        }),
      }),
    })),
  };
});

// Clean up between tests
beforeEach(async () => {
  // Clean up users to prevent test interference
  await mongoDbConnection.withRetry(async () => {
    await User.deleteMany({});
  });
});

describe('Authentication API - OCAE-205 Fixes', () => {
  // Test for registering a new user
  test('POST /auth/register - Register a new user', async () => {
    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      role: 'user'
    };

    const response = await request(app)
      .post('/auth/register')
      .send(userData);

    // This test is failing with 400 when it should return 201
    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe('User registered successfully');
    
    // Verify user was created in database
    const user = await mongoDbConnection.withRetry(async () => {
      return await User.findOne({ email: userData.email });
    });
    
    expect(user).toBeTruthy();
    expect(user.email).toBe(userData.email);
    expect(user.firstName).toBe(userData.firstName);
    expect(user.lastName).toBe(userData.lastName);
  });

  // Test for logging in with username and password
  test('POST /auth/login - Log in with email and password', async () => {
    // First, create a user directly through the model to test login
    const password = 'TestPassword123!';
    const hashedPassword = await require('bcrypt').hash(password, 10);
    
    const userData = {
      userId: new mongoose.Types.ObjectId().toString(),
      firstName: 'Login',
      lastName: 'Test',
      email: 'logintest@example.com',
      password: hashedPassword,
      role: 'user',
      status: 'active'
    };
    
    await mongoDbConnection.withRetry(async () => {
      const newUser = new User(userData);
      await newUser.save();
    });
    
    // Try to login
    const response = await request(app)
      .post('/auth/login')
      .send({
        email: userData.email,
        password: password
      });

    // This test is failing with 400 when it should return 200
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();

    // Verify JWT token
    const decoded = jwt.verify(response.body.accessToken, process.env.JWT_SECRET);
    expect(decoded.userId).toBeTruthy();
    expect(decoded.role).toBe('user');
  });

  // Test for OAuth login
  test('POST /auth/oauth-login - Log in with OAuth (Google)', async () => {
    const response = await request(app)
      .post('/auth/oauth-login')
      .send({
        token: 'mock_google_token',
        provider: 'google'
      });

    // This test is failing with 400 when it should return 200
    expect(response.statusCode).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    
    // Verify user was created from OAuth data
    const user = await mongoDbConnection.withRetry(async () => {
      return await User.findOne({ email: 'oauthuser@example.com' });
    });
    
    expect(user).toBeTruthy();
    expect(user.firstName).toBe('OAuth');
    expect(user.lastName).toBe('User');
  });

  // Test for dropped MongoDB connections
  test('Handles MongoDB connection drops gracefully', async () => {
    // This test verifies that operations can recover from MongoDB connection issues
    
    // First simulate a MongoDB disconnect
    await mongoose.connection.close();
    
    // Now perform operation that should recover
    const userData = {
      firstName: 'Resilient',
      lastName: 'User',
      email: 'resilient@example.com',
      password: 'ResilientPass123!',
      role: 'user'
    };

    const response = await request(app)
      .post('/auth/register')
      .send(userData);
      
    // Should still succeed because of retry logic
    expect(response.statusCode).toBe(201);
    
    // Reconnect for cleanup
    await mongoDbConnection.connectWithRetry();
  });
});
