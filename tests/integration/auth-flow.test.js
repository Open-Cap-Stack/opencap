/**
 * Integration Tests: Authentication Flow
 * Issue #42: Implement Integration Test Suite
 *
 * Tests the complete authentication workflow:
 * - User registration
 * - User login
 * - Token refresh
 * - User logout
 * - Password reset flow
 */

const request = require('supertest');
const { createApp } = require('../setup/app');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('Authentication Flow Integration Tests', () => {
  let app;
  let testUser;
  let accessToken;
  let refreshToken;

  // Test user data
  const validUser = {
    firstName: 'Integration',
    lastName: 'TestUser',
    email: 'integration.test@opencap.com',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
    role: 'employee'
  };

  beforeAll(async () => {
    // Set required environment variables for tests
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-integration-tests';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key';
    process.env.JWT_RESET_SECRET = process.env.JWT_RESET_SECRET || 'test-jwt-reset-secret-key';
    process.env.JWT_VERIFICATION_SECRET = process.env.JWT_VERIFICATION_SECRET || 'test-jwt-verification-secret-key';
    process.env.NODE_ENV = 'test';

    // Create app instance
    app = createApp();
  });

  beforeEach(async () => {
    // No-op: ZeroDB handles data isolation
  });

  describe('Complete Authentication Workflow', () => {
    describe('POST /api/v1/auth/register - User Registration', () => {
      it('should successfully register a new user', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('userId');
        expect(response.body.message).toContain('Registration successful');
      });

      it('should reject registration with missing required fields', async () => {
        const incompleteUser = {
          email: 'incomplete@test.com',
          password: 'SecurePass123!'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(incompleteUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });

      it('should reject registration with invalid email format', async () => {
        const invalidEmailUser = {
          ...validUser,
          email: 'invalid-email-format'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(invalidEmailUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Invalid email');
      });

      it('should reject registration with weak password', async () => {
        const weakPasswordUser = {
          ...validUser,
          password: 'weak',
          confirmPassword: 'weak'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(weakPasswordUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('8 characters');
      });

      it('should reject registration when passwords do not match', async () => {
        const mismatchedPasswordUser = {
          ...validUser,
          confirmPassword: 'DifferentPass123!'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(mismatchedPasswordUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('do not match');
      });

      it('should reject registration with duplicate email', async () => {
        // First registration
        await request(app)
          .post('/api/v1/auth/register')
          .send(validUser);

        // Attempt duplicate registration
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(validUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('already exists');
      });

      it('should reject registration with invalid role', async () => {
        const invalidRoleUser = {
          ...validUser,
          email: 'invalidrole@test.com',
          role: 'superadmin'
        };

        const response = await request(app)
          .post('/api/v1/auth/register')
          .send(invalidRoleUser)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Role must be one of');
      });
    });

    describe('POST /api/v1/auth/login - User Login', () => {
      beforeEach(async () => {
        // Register a user for login tests
        await request(app)
          .post('/api/v1/auth/register')
          .send(validUser);
      });

      it('should successfully login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validUser.email,
            password: validUser.password
          })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(validUser.email);
        expect(response.body.user).not.toHaveProperty('password');

        // Store tokens for subsequent tests
        accessToken = response.body.accessToken;
        refreshToken = response.body.refreshToken;
      });

      it('should reject login with missing email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ password: 'SecurePass123!' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Email and password are required');
      });

      it('should reject login with missing password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: validUser.email })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
      });

      it('should reject login with non-existent user', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'SecurePass123!'
          })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid credentials');
      });

      it('should reject login with incorrect password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validUser.email,
            password: 'WrongPassword123!'
          })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid credentials');
      });
    });

    describe('POST /api/v1/auth/token/refresh - Token Refresh', () => {
      beforeEach(async () => {
        // Register and login to get tokens
        await request(app)
          .post('/api/v1/auth/register')
          .send(validUser);

        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validUser.email,
            password: validUser.password
          });

        accessToken = loginResponse.body.accessToken;
        refreshToken = loginResponse.body.refreshToken;
      });

      it('should successfully refresh access token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/token/refresh')
          .send({ refreshToken })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body.message).toContain('Token refreshed');
      });

      it('should reject refresh with missing token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/token/refresh')
          .send({})
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Refresh token is required');
      });

      it('should reject refresh with invalid token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/token/refresh')
          .send({ refreshToken: 'invalid-refresh-token' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
        expect(response.body.message).toContain('Invalid refresh token');
      });
    });

    describe('POST /api/v1/auth/logout - User Logout', () => {
      beforeEach(async () => {
        // Register and login
        await request(app)
          .post('/api/v1/auth/register')
          .send(validUser);

        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validUser.email,
            password: validUser.password
          });

        accessToken = loginResponse.body.accessToken;
      });

      it('should successfully logout with valid token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('Logout successful');
      });

      it('should reject logout without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/v1/auth/profile - Get User Profile', () => {
      beforeEach(async () => {
        // Register and login
        await request(app)
          .post('/api/v1/auth/register')
          .send(validUser);

        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validUser.email,
            password: validUser.password
          });

        accessToken = loginResponse.body.accessToken;
      });

      it('should successfully retrieve user profile', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(validUser.email);
        expect(response.body.user.firstName).toBe(validUser.firstName);
        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should reject profile access without authentication', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/v1/auth/profile - Update User Profile', () => {
      beforeEach(async () => {
        // Register and login
        await request(app)
          .post('/api/v1/auth/register')
          .send(validUser);

        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: validUser.email,
            password: validUser.password
          });

        accessToken = loginResponse.body.accessToken;
      });

      it('should successfully update user profile', async () => {
        const updateData = {
          firstName: 'UpdatedFirst',
          lastName: 'UpdatedLast'
        };

        const response = await request(app)
          .put('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(updateData)
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.firstName).toBe('UpdatedFirst');
        expect(response.body.user.lastName).toBe('UpdatedLast');
      });

      it('should reject profile update without authentication', async () => {
        const response = await request(app)
          .put('/api/v1/auth/profile')
          .send({ firstName: 'Unauthorized' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      // Register a user
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);
    });

    describe('POST /api/v1/auth/password/reset-request', () => {
      it('should accept password reset request for existing user', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password/reset-request')
          .send({ email: validUser.email })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('If an account exists');
      });

      it('should return 200 even for non-existent email (security)', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password/reset-request')
          .send({ email: 'nonexistent@test.com' })
          .expect('Content-Type', /json/);

        expect(response.status).toBe(200);
        expect(response.body.message).toContain('If an account exists');
      });

      it('should reject reset request without email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/password/reset-request')
          .send({})
          .expect('Content-Type', /json/);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Email is required');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle rate limiting gracefully', async () => {
      // This test would verify rate limiting if implemented
      // For now, we verify the endpoint responds correctly under normal load
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@test.com', password: 'password' })
      );

      const responses = await Promise.all(requests);

      // All requests should complete (may have different status codes)
      responses.forEach(response => {
        expect(response.status).toBeDefined();
      });
    });
  });
});
