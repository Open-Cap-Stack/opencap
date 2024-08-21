const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const authController = require('../controllers/authController');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const { connectDB, disconnectDB } = require('../db');

// Set up the Express app
const app = express();
app.use(bodyParser.json());

// Define routes for authentication
app.post('/auth/register', authController.registerUser);
app.post('/auth/login', authController.loginUser);
app.post('/auth/oauth-login', authController.oauthLogin);

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

// Mock Google OAuth Client
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({
        getPayload: () => ({
          email: 'oauthuser@example.com',
          name: 'OAuth User',
        }),
      }),
    })),
  };
});

describe('Authentication API', () => {
  // Test for registering a new user
  test('POST /auth/register - Register a new user', async () => {
    const response = await request(app).post('/auth/register').send({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'TestPassword123',
      roles: ['Viewer'],
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe('User registered successfully');

    const user = await User.findOne({ username: 'testuser' });
    expect(user).toBeTruthy();
    expect(user.email).toBe('testuser@example.com');
  });

  // Test for logging in with username and password
  test('POST /auth/login - Log in with username and password', async () => {
    // First, register a user to log in with
    await request(app).post('/auth/register').send({
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'TestPassword123',
      roles: ['Viewer'],
    });
    
    const response = await request(app).post('/auth/login').send({
      username: 'testuser',
      password: 'TestPassword123',
    });    

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();

    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBeTruthy();
    expect(decoded.roles).toContain('Viewer');
  });

  // Test for logging in with OAuth
  test('POST /auth/oauth-login - Log in with OAuth (Google)', async () => {
    const response = await request(app).post('/auth/oauth-login').send({
      token: 'mockGoogleToken',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeTruthy();

    const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(decoded.userId).toBeTruthy();

    const user = await User.findOne({ email: 'oauthuser@example.com' });
    expect(user).toBeTruthy();
    expect(user.username).toBe('OAuth User');
  });
});
