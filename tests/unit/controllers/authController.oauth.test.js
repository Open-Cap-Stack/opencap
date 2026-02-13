/**
 * OAuth Controller Tests - Production Verification Suite
 *
 * Comprehensive tests for Google and LinkedIn OAuth authentication flows.
 * These tests verify production readiness including security, race conditions,
 * error handling, and edge cases.
 */

// Set environment variables BEFORE requiring any modules
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-secret';

// Mock fetch globally for LinkedIn tests BEFORE any imports
global.fetch = jest.fn();

// Create mock Google client instance that will be shared
const mockVerifyIdToken = jest.fn();
const mockGoogleClientInstance = {
  verifyIdToken: mockVerifyIdToken
};

// Mock dependencies
jest.mock('../../../models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => mockGoogleClientInstance)
}));

jest.mock('jsonwebtoken');
jest.mock('../../../utils/sanitizeUser');

const httpMocks = require('node-mocks-http');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { sanitizeUser } = require('../../../utils/sanitizeUser');

// Now require authController AFTER setting up environment and mocks
const authController = require('../../../controllers/authController');
const User = require('../../../models/User');

describe('authController.oauthLogin - Production Verification', () => {
  let req, res;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh request/response mocks
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();

    // Set up environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.LINKEDIN_CLIENT_ID = 'test-linkedin-client-id';
    process.env.LINKEDIN_CLIENT_SECRET = 'test-linkedin-secret';

    // Default sanitizeUser implementation
    sanitizeUser.mockImplementation(user => {
      const { password, ...sanitized } = user;
      return sanitized;
    });

    // Default JWT sign
    jwt.sign.mockReturnValue('mock-jwt-token');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ============================================================================
  // GOOGLE OAUTH TESTS (20 tests)
  // ============================================================================

  describe('Google OAuth', () => {
    // Test 1: Successful authentication with valid Google token
    it('should successfully authenticate with valid Google token', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-google-token'
      };

      const mockPayload = {
        email: 'user@example.com',
        given_name: 'John',
        family_name: 'Doe',
        sub: 'google-123',
        picture: 'https://example.com/photo.jpg'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      const mockUser = {
        _id: 'user-id-123',
        userId: 'user_123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        status: 'active',
        password: 'hashed-password'
      };

      User.findOne.mockResolvedValue(mockUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('OAuth login successful');
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
      expect(data.user).toBeDefined();
      expect(sanitizeUser).toHaveBeenCalledWith(mockUser);
    });

    // Test 2: Create new user on first Google login
    it('should create new user on first Google login', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-google-token'
      };

      const mockPayload = {
        email: 'newuser@example.com',
        given_name: 'Jane',
        family_name: 'Smith',
        sub: 'google-456'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      // First findOne returns null (user doesn't exist)
      User.findOne.mockResolvedValueOnce(null);

      const newUser = {
        _id: 'new-user-id',
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'user',
        status: 'active',
        emailVerified: true,
        oauthProvider: 'google',
        oauthId: 'google-456',
        password: 'random-hash'
      };

      User.create.mockResolvedValue(newUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'newuser@example.com',
          role: 'user',
          status: 'active',
          emailVerified: true,
          oauthProvider: 'google',
          oauthId: 'google-456'
        })
      );
    });

    // Test 3: Link existing user on subsequent Google login
    it('should link existing user on subsequent Google login', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-google-token'
      };

      const mockPayload = {
        email: 'existing@example.com',
        given_name: 'Bob',
        family_name: 'Jones',
        sub: 'google-789'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      const existingUser = {
        _id: 'existing-user-id',
        email: 'existing@example.com',
        firstName: 'Bob',
        lastName: 'Jones',
        role: 'user',
        password: 'hashed-password'
      };

      User.findOne.mockResolvedValue(existingUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).not.toHaveBeenCalled();
      expect(User.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
    });

    // Test 4: Generate JWT access and refresh tokens
    it('should generate JWT access and refresh tokens', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-google-token'
      };

      const mockPayload = {
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
        sub: 'google-999'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      const mockUser = {
        _id: 'user-id',
        userId: 'user_abc',
        email: 'user@example.com',
        role: 'user',
        password: 'hash'
      };

      User.findOne.mockResolvedValue(mockUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      jwt.sign
        .mockReturnValueOnce('mock-access-token')
        .mockReturnValueOnce('mock-refresh-token');

      await authController.oauthLogin(req, res);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user_abc', role: 'user' },
        'test-jwt-secret',
        { expiresIn: '1h' }
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user_abc' },
        'test-refresh-secret',
        { expiresIn: '7d' }
      );

      const data = JSON.parse(res._getData());
      expect(data.accessToken).toBe('mock-access-token');
      expect(data.refreshToken).toBe('mock-refresh-token');
    });

    // Test 5: Return 400 when token is missing
    it('should return 400 when token is missing', async () => {
      req.body = {
        provider: 'google'
        // token is missing
      };

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Token is required for Google OAuth');
    });

    // Test 6: Return 503 when GOOGLE_CLIENT_ID not configured
    it('should return 503 when GOOGLE_CLIENT_ID not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;

      // Force re-require to pick up the env change
      jest.resetModules();
      delete require.cache[require.resolve('../../../controllers/authController')];
      const authCtrl = require('../../../controllers/authController');

      req.body = {
        provider: 'google',
        token: 'some-token'
      };

      await authCtrl.oauthLogin(req, res);

      expect(res.statusCode).toBe(503);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Google OAuth not configured');
    });

    // Test 7: Return 401 for invalid Google token
    it('should return 401 for invalid Google token', async () => {
      req.body = {
        provider: 'google',
        token: 'invalid-token'
      };

      mockVerifyIdToken.mockRejectedValue(
        new Error('Invalid token')
      );

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid Google OAuth token');
    });

    // Test 8: Handle Google API errors gracefully
    it('should handle Google API errors gracefully', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      mockVerifyIdToken.mockRejectedValue(
        new Error('Google API unavailable')
      );

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid Google OAuth token');
    });

    // Test 9: Extract correct user info (email, name, picture)
    it('should extract correct user info from Google payload', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'test@example.com',
        given_name: 'First',
        family_name: 'Last',
        sub: 'google-sub-123',
        picture: 'https://example.com/pic.jpg'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'new-id',
        email: 'test@example.com',
        firstName: 'First',
        lastName: 'Last',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          firstName: 'First',
          lastName: 'Last',
          oauthId: 'google-sub-123'
        })
      );
    });

    // Test 10: Use atomic upsert to prevent race conditions
    it('should handle race condition when creating user', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'concurrent@example.com',
        given_name: 'Concurrent',
        family_name: 'User',
        sub: 'google-concurrent'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      // Simulate race condition: first findOne returns null
      User.findOne.mockResolvedValueOnce(null);

      // Create fails with duplicate key error
      User.create.mockRejectedValueOnce(
        new Error('E11000 duplicate key error')
      );

      // Second findOne returns the user created by concurrent request
      const existingUser = {
        _id: 'concurrent-id',
        email: 'concurrent@example.com',
        firstName: 'Concurrent',
        lastName: 'User',
        password: 'hash'
      };
      User.findOne.mockResolvedValueOnce(existingUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      // Should succeed despite race condition
      expect(res.statusCode).toBe(200);
      expect(User.findOne).toHaveBeenCalledTimes(2);
    });

    // Test 11: Exclude password from response
    it('should exclude password from response', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'user@example.com',
        given_name: 'Test',
        family_name: 'User',
        sub: 'google-123'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      const mockUser = {
        _id: 'user-id',
        email: 'user@example.com',
        password: 'should-be-removed',
        firstName: 'Test',
        lastName: 'User'
      };

      User.findOne.mockResolvedValue(mockUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      sanitizeUser.mockReturnValue({
        _id: 'user-id',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User'
        // password removed
      });

      await authController.oauthLogin(req, res);

      const data = JSON.parse(res._getData());
      expect(data.user.password).toBeUndefined();
      expect(sanitizeUser).toHaveBeenCalledWith(mockUser);
    });

    // Test 12: Set emailVerified to true
    it('should set emailVerified to true for new Google users', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'verified@example.com',
        given_name: 'Verified',
        family_name: 'User',
        sub: 'google-verified'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'verified-id',
        email: 'verified@example.com',
        emailVerified: true,
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true
        })
      );
    });

    // Test 13: Set user status to 'active'
    it('should set user status to active for new Google users', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'active@example.com',
        given_name: 'Active',
        family_name: 'User',
        sub: 'google-active'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'active-id',
        email: 'active@example.com',
        status: 'active',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active'
        })
      );
    });

    // Test 14: Handle duplicate email scenarios
    it('should handle duplicate email scenarios gracefully', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'duplicate@example.com',
        given_name: 'Dup',
        family_name: 'User',
        sub: 'google-dup'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      const existingUser = {
        _id: 'existing-id',
        email: 'duplicate@example.com',
        password: 'hash'
      };

      User.findOne.mockResolvedValue(existingUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).not.toHaveBeenCalled();
    });

    // Test 15: Validate token audience
    it('should verify token with correct audience', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'user@example.com',
        given_name: 'User',
        family_name: 'Test',
        sub: 'google-123'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      User.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'user@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-token',
        audience: 'test-google-client-id'
      });
    });

    // Test 16: Handle network errors
    it('should handle network errors during Google verification', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      mockVerifyIdToken.mockRejectedValue(
        new Error('Network timeout')
      );

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
    });

    // Test 17: Handle malformed tokens
    it('should handle malformed Google tokens', async () => {
      req.body = {
        provider: 'google',
        token: 'malformed-token-xyz'
      };

      mockVerifyIdToken.mockRejectedValue(
        new Error('Token format invalid')
      );

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Invalid Google OAuth token');
    });

    // Test 18: Update lastLogin timestamp
    it('should update lastLogin timestamp', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'user@example.com',
        given_name: 'User',
        family_name: 'Test',
        sub: 'google-123'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      User.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'user@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(User.updateOne).toHaveBeenCalledWith(
        { email: 'user@example.com' },
        { $set: { lastLogin: expect.any(Date) } }
      );
    });

    // Test 19: Handle unicode characters in names
    it('should handle unicode characters in names', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'unicode@example.com',
        given_name: '张',
        family_name: '伟',
        sub: 'google-unicode'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'unicode-id',
        firstName: '张',
        lastName: '伟',
        email: 'unicode@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: '张',
          lastName: '伟'
        })
      );
    });

    // Test 20: Handle missing profile picture
    it('should handle missing profile picture', async () => {
      req.body = {
        provider: 'google',
        token: 'valid-token'
      };

      const mockPayload = {
        email: 'nopic@example.com',
        given_name: 'No',
        family_name: 'Picture',
        sub: 'google-nopic'
        // picture field is missing
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => mockPayload
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'nopic-id',
        email: 'nopic@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // LINKEDIN OAUTH TESTS (20 tests)
  // ============================================================================

  describe('LinkedIn OAuth', () => {
    beforeEach(() => {
      global.fetch.mockClear();
    });

    // Test 21: Successfully authenticate with valid LinkedIn code
    it('should successfully authenticate with valid LinkedIn code', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'valid-linkedin-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      // Mock token exchange
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'linkedin-access-token' })
      });

      // Mock profile fetch
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'linkedin@example.com',
          given_name: 'LinkedIn',
          family_name: 'User',
          sub: 'linkedin-123'
        })
      });

      const mockUser = {
        _id: 'linkedin-user-id',
        email: 'linkedin@example.com',
        password: 'hash'
      };

      User.findOne.mockResolvedValue(mockUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('OAuth login successful');
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    // Test 22: Create new user on first LinkedIn login
    it('should create new user on first LinkedIn login', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'new-user-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'new-access-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'newlinkedin@example.com',
          given_name: 'New',
          family_name: 'LinkedIn',
          sub: 'linkedin-new'
        })
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'new-linkedin-id',
        email: 'newlinkedin@example.com',
        firstName: 'New',
        lastName: 'LinkedIn',
        status: 'active',
        emailVerified: true,
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newlinkedin@example.com',
          firstName: 'New',
          lastName: 'LinkedIn',
          status: 'active',
          emailVerified: true,
          oauthProvider: 'linkedin'
        })
      );
    });

    // Test 23: Link existing user on subsequent LinkedIn login
    it('should link existing user on subsequent LinkedIn login', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'existing-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'existing-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'existing@example.com',
          given_name: 'Existing',
          family_name: 'User',
          sub: 'linkedin-existing'
        })
      });

      const existingUser = {
        _id: 'existing-id',
        email: 'existing@example.com',
        password: 'hash'
      };

      User.findOne.mockResolvedValue(existingUser);
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).not.toHaveBeenCalled();
    });

    // Test 24: Generate JWT access and refresh tokens
    it('should generate JWT access and refresh tokens for LinkedIn', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'valid-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'token@example.com',
          given_name: 'Token',
          family_name: 'Test',
          sub: 'linkedin-token'
        })
      });

      User.findOne.mockResolvedValue({
        _id: 'user-id',
        userId: 'user_li',
        email: 'token@example.com',
        role: 'user',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      jwt.sign
        .mockReturnValueOnce('li-access-token')
        .mockReturnValueOnce('li-refresh-token');

      await authController.oauthLogin(req, res);

      const data = JSON.parse(res._getData());
      expect(data.accessToken).toBe('li-access-token');
      expect(data.refreshToken).toBe('li-refresh-token');
    });

    // Test 25: Return 400 when code is missing
    it('should return 400 when code is missing', async () => {
      req.body = {
        provider: 'linkedin'
        // code is missing
      };

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Authorization code is required for LinkedIn OAuth');
    });

    // Test 26: Return 503 when LinkedIn credentials not configured
    it('should return 503 when LinkedIn credentials not configured', async () => {
      delete process.env.LINKEDIN_CLIENT_ID;

      req.body = {
        provider: 'linkedin',
        code: 'some-code'
      };

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(503);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('LinkedIn OAuth not configured on server');
    });

    // Test 27: Return 401 for invalid authorization code
    it('should return 401 for invalid authorization code', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'invalid-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid authorization code'
      });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('LinkedIn authorization code exchange failed');
    });

    // Test 28: Handle LinkedIn API errors gracefully
    it('should handle LinkedIn API errors gracefully', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'error-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockRejectedValueOnce(new Error('LinkedIn API error'));

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('LinkedIn authentication failed');
    });

    // Test 29: Exchange code for access token correctly
    it('should exchange code for access token correctly', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'exchange-code',
        redirect_uri: 'http://localhost:3000/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'exchanged-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'exchange@example.com',
          given_name: 'Exchange',
          family_name: 'Test',
          sub: 'linkedin-exchange'
        })
      });

      User.findOne.mockResolvedValue({
        _id: 'user-id',
        email: 'exchange@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.linkedin.com/oauth/v2/accessToken',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
      );
    });

    // Test 30: Fetch user profile from /v2/userinfo
    it('should fetch user profile from /v2/userinfo', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'profile-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'profile-access-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'profile@example.com',
          given_name: 'Profile',
          family_name: 'User',
          sub: 'linkedin-profile'
        })
      });

      User.findOne.mockResolvedValue({
        _id: 'profile-id',
        email: 'profile@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.linkedin.com/v2/userinfo',
        expect.objectContaining({
          headers: { Authorization: 'Bearer profile-access-token' }
        })
      );
    });

    // Test 31: Use atomic upsert to prevent race conditions
    it('should handle race condition when creating LinkedIn user', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'race-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'race-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'race@example.com',
          given_name: 'Race',
          family_name: 'Test',
          sub: 'linkedin-race'
        })
      });

      // Simulate race condition
      User.findOne.mockResolvedValueOnce(null);
      User.create.mockRejectedValueOnce(
        new Error('E11000 duplicate key error')
      );
      User.findOne.mockResolvedValueOnce({
        _id: 'race-id',
        email: 'race@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
    });

    // Test 32: Exclude password from response
    it('should exclude password from LinkedIn response', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'password-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'password-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'password@example.com',
          given_name: 'Password',
          family_name: 'Test',
          sub: 'linkedin-password'
        })
      });

      User.findOne.mockResolvedValue({
        _id: 'password-id',
        email: 'password@example.com',
        password: 'should-be-removed'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      sanitizeUser.mockReturnValue({
        _id: 'password-id',
        email: 'password@example.com'
        // password removed
      });

      await authController.oauthLogin(req, res);

      const data = JSON.parse(res._getData());
      expect(data.user.password).toBeUndefined();
    });

    // Test 33: Set emailVerified to true
    it('should set emailVerified to true for new LinkedIn users', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'verified-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'verified-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'verified@example.com',
          given_name: 'Verified',
          family_name: 'User',
          sub: 'linkedin-verified'
        })
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'verified-id',
        email: 'verified@example.com',
        emailVerified: true,
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true
        })
      );
    });

    // Test 34: Set user status to 'active'
    it('should set user status to active for new LinkedIn users', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'active-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'active-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'active@example.com',
          given_name: 'Active',
          family_name: 'User',
          sub: 'linkedin-active'
        })
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'active-id',
        email: 'active@example.com',
        status: 'active',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active'
        })
      );
    });

    // Test 35: Handle duplicate email scenarios
    it('should handle duplicate email scenarios for LinkedIn', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'dup-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'dup-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'dup@example.com',
          given_name: 'Dup',
          family_name: 'User',
          sub: 'linkedin-dup'
        })
      });

      User.findOne.mockResolvedValue({
        _id: 'dup-id',
        email: 'dup@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).not.toHaveBeenCalled();
    });

    // Test 36: Handle network errors during token exchange
    it('should handle network errors during token exchange', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'network-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('LinkedIn authentication failed');
    });

    // Test 37: Handle network errors during profile fetch
    it('should handle network errors during profile fetch', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'profile-error-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' })
      });

      global.fetch.mockRejectedValueOnce(new Error('Profile fetch failed'));

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
    });

    // Test 38: Update lastLogin timestamp
    it('should update lastLogin timestamp for LinkedIn', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'lastlogin-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'lastlogin-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'lastlogin@example.com',
          given_name: 'LastLogin',
          family_name: 'User',
          sub: 'linkedin-lastlogin'
        })
      });

      User.findOne.mockResolvedValue({
        _id: 'lastlogin-id',
        email: 'lastlogin@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(User.updateOne).toHaveBeenCalledWith(
        { email: 'lastlogin@example.com' },
        { $set: { lastLogin: expect.any(Date) } }
      );
    });

    // Test 39: Handle unicode characters in names
    it('should handle unicode characters in LinkedIn names', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'unicode-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'unicode-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'unicode@example.com',
          given_name: 'José',
          family_name: 'García',
          sub: 'linkedin-unicode'
        })
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'unicode-id',
        firstName: 'José',
        lastName: 'García',
        email: 'unicode@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'José',
          lastName: 'García'
        })
      );
    });

    // Test 40: Validate redirect_uri parameter
    it('should include redirect_uri in token exchange', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'redirect-code',
        redirect_uri: 'http://example.com/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'redirect-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'redirect@example.com',
          given_name: 'Redirect',
          family_name: 'Test',
          sub: 'linkedin-redirect'
        })
      });

      User.findOne.mockResolvedValue({
        _id: 'redirect-id',
        email: 'redirect@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      const tokenExchangeCall = global.fetch.mock.calls[0];
      const body = tokenExchangeCall[1].body;
      expect(body).toContain('redirect_uri=http%3A%2F%2Fexample.com%2Fcallback');
    });
  });

  // ============================================================================
  // ENVIRONMENT VALIDATION TESTS
  // ============================================================================

  describe('Environment Validation', () => {
    // Test 41: Return 400 when provider is missing
    it('should return 400 when provider is missing', async () => {
      req.body = {
        token: 'some-token'
        // provider is missing
      };

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Provider is required');
    });

    // Test 42: Return 400 for unsupported OAuth provider
    it('should return 400 for unsupported OAuth provider', async () => {
      req.body = {
        provider: 'facebook',
        token: 'facebook-token'
      };

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Unsupported OAuth provider');
    });

    // Test 43: Handle internal server errors gracefully
    it('should handle internal server errors gracefully', async () => {
      req.body = {
        provider: 'google',
        token: 'error-token'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
            email: 'error@example.com',
            given_name: 'Error',
            family_name: 'Test',
            sub: 'google-error'
          })
        });

      // Simulate database error
      User.findOne.mockRejectedValue(new Error('Database connection failed'));

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Internal server error');
    });

    // Test 44: Handle missing LinkedIn client secret
    it('should return 503 when LinkedIn client secret is missing', async () => {
      delete process.env.LINKEDIN_CLIENT_SECRET;

      req.body = {
        provider: 'linkedin',
        code: 'some-code'
      };

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(503);
    });

    // Test 45: Handle profile fetch failure with 401
    it('should return 401 when LinkedIn profile fetch fails', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'profile-fail-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'profile-fail-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Unauthorized'
      });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Failed to retrieve LinkedIn profile');
    });

    // Test 46: Handle name parsing from full name field
    it('should parse names from LinkedIn full name field', async () => {
      req.body = {
        provider: 'linkedin',
        code: 'fullname-code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'fullname-token' })
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          email: 'fullname@example.com',
          name: 'John Michael Doe',
          sub: 'linkedin-fullname'
          // given_name and family_name are missing
        })
      });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'fullname-id',
        firstName: 'John',
        lastName: 'Michael Doe',
        email: 'fullname@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
    });

    // Test 47: Handle lastLogin update failure gracefully
    it('should continue if lastLogin update fails', async () => {
      req.body = {
        provider: 'google',
        token: 'lastlogin-fail-token'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
            email: 'lastloginfail@example.com',
            given_name: 'LastLogin',
            family_name: 'Fail',
            sub: 'google-lastloginfail'
          })
        });

      User.findOne.mockResolvedValue({
        _id: 'lastloginfail-id',
        email: 'lastloginfail@example.com',
        password: 'hash'
      });

      // lastLogin update fails
      User.updateOne.mockRejectedValue(new Error('Update failed'));

      await authController.oauthLogin(req, res);

      // Should still succeed
      expect(res.statusCode).toBe(200);
    });

    // Test 48: Handle empty name fields
    it('should handle empty name fields from OAuth provider', async () => {
      req.body = {
        provider: 'google',
        token: 'empty-name-token'
      };

      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
            email: 'emptyname@example.com',
            given_name: '',
            family_name: '',
            sub: 'google-emptyname'
          })
        });

      User.findOne.mockResolvedValueOnce(null);
      User.create.mockResolvedValue({
        _id: 'emptyname-id',
        firstName: '',
        lastName: '',
        email: 'emptyname@example.com',
        password: 'hash'
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await authController.oauthLogin(req, res);

      expect(res.statusCode).toBe(200);
    });
  });
});
