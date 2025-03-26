const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/userModel');

// Mock the User model methods
jest.mock('../../models/userModel');

// Mock nodemailer if we're implementing email functionality
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  })
}));

// Mock JWT
jest.mock('jsonwebtoken');

describe('User Authentication Endpoints (OCAE-203)', () => {
  let mockUser;
  let validToken;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup mock user
    mockUser = {
      userId: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword123',
      UserRoles: ['User'],
      Permissions: 'Standard',
      AuthenticationMethods: 'UsernamePassword',
      save: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        userId: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        UserRoles: ['User']
      })
    };
    
    // Setup valid JWT
    validToken = 'valid.jwt.token';
    jwt.sign.mockReturnValue(validToken);
    jwt.verify.mockReturnValue({ userId: mockUser.userId, roles: mockUser.UserRoles });
  });

  describe('POST /api/auth/token/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Mock user findOne to return our test user
      User.findOne.mockResolvedValueOnce(mockUser);
      
      // Test the refresh token endpoint
      const response = await request(app)
        .post('/api/auth/token/refresh')
        .send({ refreshToken: 'valid-refresh-token' });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refreshToken');
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });

    it('should return 401 for invalid refresh token', async () => {
      // Mock jwt.verify to throw an error
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });
      
      const response = await request(app)
        .post('/api/auth/token/refresh')
        .send({ refreshToken: 'invalid-token' });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout user and invalidate token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .post('/api/auth/logout');
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });
  });

  describe('Password Reset Flow', () => {
    describe('POST /api/auth/password/reset-request', () => {
      it('should send password reset email if user exists', async () => {
        // Mock User.findOne to return our test user
        User.findOne.mockResolvedValueOnce(mockUser);
        
        const response = await request(app)
          .post('/api/auth/password/reset-request')
          .send({ email: mockUser.email });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Password reset email sent');
      });

      it('should return 200 even if user email does not exist (security best practice)', async () => {
        // Mock User.findOne to return null (user not found)
        User.findOne.mockResolvedValueOnce(null);
        
        const response = await request(app)
          .post('/api/auth/password/reset-request')
          .send({ email: 'nonexistent@example.com' });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Password reset email sent');
      });
    });

    describe('POST /api/auth/password/verify-token', () => {
      it('should verify a valid reset token', async () => {
        // Mock jwt.verify for successful verification
        jwt.verify.mockReturnValueOnce({ userId: mockUser.userId });
        
        const response = await request(app)
          .post('/api/auth/password/verify-token')
          .send({ token: 'valid-reset-token' });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Token is valid');
      });

      it('should return 401 for invalid or expired token', async () => {
        // Mock jwt.verify to throw error
        jwt.verify.mockImplementationOnce(() => {
          throw new Error('Invalid or expired token');
        });
        
        const response = await request(app)
          .post('/api/auth/password/verify-token')
          .send({ token: 'invalid-token' });
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired token');
      });
    });

    describe('POST /api/auth/password/reset', () => {
      it('should reset password with valid token', async () => {
        // Mock jwt.verify to return user ID
        jwt.verify.mockReturnValueOnce({ userId: mockUser.userId });
        
        // Mock User.findOne to return our test user
        User.findOne.mockResolvedValueOnce(mockUser);
        
        // Mock bcrypt.hash
        bcrypt.hash.mockResolvedValueOnce('new-hashed-password');
        
        const response = await request(app)
          .post('/api/auth/password/reset')
          .send({ 
            token: 'valid-reset-token',
            newPassword: 'NewSecurePassword123',
            confirmPassword: 'NewSecurePassword123'
          });
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Password reset successful');
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should return 400 if passwords do not match', async () => {
        const response = await request(app)
          .post('/api/auth/password/reset')
          .send({ 
            token: 'valid-reset-token',
            newPassword: 'NewSecurePassword123',
            confirmPassword: 'DifferentPassword123'
          });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Passwords do not match');
      });

      it('should return 400 if password is too weak', async () => {
        const response = await request(app)
          .post('/api/auth/password/reset')
          .send({ 
            token: 'valid-reset-token',
            newPassword: 'weak',
            confirmPassword: 'weak'
          });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Password must be at least 8 characters long and include uppercase, lowercase letters, and numbers');
      });
    });
  });

  describe('User Profile Endpoints', () => {
    describe('GET /api/auth/profile', () => {
      it('should return user profile for authenticated user', async () => {
        // Mock authMiddleware to set req.user
        User.findOne.mockResolvedValueOnce(mockUser);
        
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('username', mockUser.username);
        expect(response.body).toHaveProperty('email', mockUser.email);
        // Should not contain password
        expect(response.body).not.toHaveProperty('password');
      });

      it('should return 401 if not authenticated', async () => {
        const response = await request(app)
          .get('/api/auth/profile');
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'No token provided');
      });
    });

    describe('PUT /api/auth/profile', () => {
      it('should update user profile fields', async () => {
        // Mock User.findOne to return our test user
        User.findOne.mockResolvedValueOnce(mockUser);
        
        const updatedFields = {
          username: 'updatedUsername',
          email: 'updated@example.com',
        };
        
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .send(updatedFields);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Profile updated successfully');
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should return 401 if not authenticated', async () => {
        const response = await request(app)
          .put('/api/auth/profile')
          .send({ username: 'updatedUsername' });
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'No token provided');
      });

      it('should return 400 for invalid email format', async () => {
        // Mock User.findOne to return our test user
        User.findOne.mockResolvedValueOnce(mockUser);
        
        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ email: 'invalid-email' });
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('message', 'Invalid email format');
      });
    });
  });

  describe('Email Verification Flow', () => {
    describe('POST /api/auth/verify/send', () => {
      it('should send verification email to user', async () => {
        // Mock User.findOne to return our test user
        User.findOne.mockResolvedValueOnce(mockUser);
        
        const response = await request(app)
          .post('/api/auth/verify/send')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Verification email sent');
      });

      it('should return 401 if not authenticated', async () => {
        const response = await request(app)
          .post('/api/auth/verify/send');
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'No token provided');
      });
    });

    describe('GET /api/auth/verify/:token', () => {
      it('should verify user with valid token', async () => {
        // Mock jwt.verify to return user ID
        jwt.verify.mockReturnValueOnce({ userId: mockUser.userId });
        
        // Mock User.findOne to return our test user
        User.findOne.mockResolvedValueOnce(mockUser);
        
        const response = await request(app)
          .get('/api/auth/verify/valid-verification-token');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Email verified successfully');
        expect(mockUser.save).toHaveBeenCalled();
      });

      it('should return 401 for invalid or expired token', async () => {
        // Mock jwt.verify to throw error
        jwt.verify.mockImplementationOnce(() => {
          throw new Error('Invalid or expired token');
        });
        
        const response = await request(app)
          .get('/api/auth/verify/invalid-verification-token');
        
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid or expired verification token');
      });
    });
  });
});
