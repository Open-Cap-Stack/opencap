/**
 * Plugin Auth Controller Test Suite
 *
 * Tests for the OAuth 2.0 authorization server for plugin auth
 * Issue #505: OAuth 2.0 authorization server for plugin auth
 *
 * Test Coverage:
 * - Authorization endpoint (redirect, validation, error cases)
 * - Token exchange endpoint (code exchange, validation, error cases)
 * - User info endpoint
 */

const jwt = require('jsonwebtoken');

// Store original env values
const originalEnv = { ...process.env };

// Import controller
const pluginAuthController = require('../../../controllers/pluginAuthController');

describe('Plugin Auth Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variables for tests
    process.env.PLUGIN_CLIENT_ID = 'test-client-id';
    process.env.PLUGIN_REDIRECT_URI = 'https://chat.example.com/callback';
    process.env.PLUGIN_CLIENT_SECRET = 'test-client-secret';
    process.env.JWT_SECRET = 'test-jwt-secret-for-plugin-auth';

    // Clear authorization codes between tests
    pluginAuthController._testing.authorizationCodes.clear();

    mockReq = {
      query: {},
      body: {},
      user: {
        userId: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'admin'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    };
  });

  afterAll(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('Given the authorize endpoint', () => {
    describe('When called with valid parameters and authenticated user', () => {
      it('Then it should redirect with an authorization code', () => {
        mockReq.query = {
          client_id: 'test-client-id',
          redirect_uri: 'https://chat.example.com/callback',
          state: 'random-state-value',
          response_type: 'code'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalledTimes(1);
        const redirectCall = mockRes.redirect.mock.calls[0];
        expect(redirectCall[0]).toBe(302);

        const redirectUrl = new URL(redirectCall[1]);
        expect(redirectUrl.origin).toBe('https://chat.example.com');
        expect(redirectUrl.pathname).toBe('/callback');
        expect(redirectUrl.searchParams.get('code')).toBeTruthy();
        expect(redirectUrl.searchParams.get('code').length).toBe(64); // 32 bytes hex
        expect(redirectUrl.searchParams.get('state')).toBe('random-state-value');

        // Verify code was stored
        const storedCode = redirectUrl.searchParams.get('code');
        expect(pluginAuthController._testing.authorizationCodes.has(storedCode)).toBe(true);
        const codeData = pluginAuthController._testing.authorizationCodes.get(storedCode);
        expect(codeData.userId).toBe('user-123');
        expect(codeData.email).toBe('test@example.com');
        expect(codeData.companyId).toBe('company-456');
      });
    });

    describe('When called without state parameter', () => {
      it('Then it should redirect without state in the URL', () => {
        mockReq.query = {
          client_id: 'test-client-id',
          redirect_uri: 'https://chat.example.com/callback'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.redirect).toHaveBeenCalledTimes(1);
        const redirectUrl = new URL(mockRes.redirect.mock.calls[0][1]);
        expect(redirectUrl.searchParams.has('state')).toBe(false);
        expect(redirectUrl.searchParams.has('code')).toBe(true);
      });
    });

    describe('When called with invalid client_id', () => {
      it('Then it should return 400', () => {
        mockReq.query = {
          client_id: 'wrong-client-id',
          redirect_uri: 'https://chat.example.com/callback'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid client_id' });
      });
    });

    describe('When called with missing client_id', () => {
      it('Then it should return 400', () => {
        mockReq.query = {
          redirect_uri: 'https://chat.example.com/callback'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid client_id' });
      });
    });

    describe('When called with invalid redirect_uri', () => {
      it('Then it should return 400', () => {
        mockReq.query = {
          client_id: 'test-client-id',
          redirect_uri: 'https://evil.example.com/steal'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid redirect_uri' });
      });
    });

    describe('When called with missing redirect_uri', () => {
      it('Then it should return 400', () => {
        mockReq.query = {
          client_id: 'test-client-id'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'redirect_uri is required' });
      });
    });

    describe('When called with unsupported response_type', () => {
      it('Then it should return 400', () => {
        mockReq.query = {
          client_id: 'test-client-id',
          redirect_uri: 'https://chat.example.com/callback',
          response_type: 'token'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Unsupported response_type. Only "code" is supported.'
        });
      });
    });

    describe('When called without authentication', () => {
      it('Then it should return 401', () => {
        mockReq.user = null;
        mockReq.query = {
          client_id: 'test-client-id',
          redirect_uri: 'https://chat.example.com/callback'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({ error: 'Authentication required' })
        );
      });
    });

    describe('When PLUGIN_CLIENT_ID is not configured', () => {
      it('Then it should return 500', () => {
        delete process.env.PLUGIN_CLIENT_ID;
        mockReq.query = {
          client_id: 'test-client-id',
          redirect_uri: 'https://chat.example.com/callback'
        };

        pluginAuthController.authorize(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Plugin client not configured on server'
        });
      });
    });
  });

  describe('Given the token endpoint', () => {
    let validCode;

    beforeEach(() => {
      // Pre-populate an authorization code
      validCode = 'a'.repeat(64);
      pluginAuthController._testing.authorizationCodes.set(validCode, {
        userId: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'admin',
        redirectUri: 'https://chat.example.com/callback',
        expiresAt: Date.now() + 300000 // 5 minutes from now
      });
    });

    describe('When exchanging a valid authorization code', () => {
      it('Then it should return an access token', () => {
        mockReq.body = {
          code: validCode,
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          redirect_uri: 'https://chat.example.com/callback',
          grant_type: 'authorization_code'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        const responseBody = mockRes.json.mock.calls[0][0];
        expect(responseBody).toHaveProperty('access_token');
        expect(responseBody.token_type).toBe('bearer');
        expect(responseBody.expires_in).toBe(3600);

        // Verify the JWT is valid
        const decoded = jwt.verify(responseBody.access_token, 'test-jwt-secret-for-plugin-auth');
        expect(decoded.userId).toBe('user-123');
        expect(decoded.email).toBe('test@example.com');
        expect(decoded.companyId).toBe('company-456');
        expect(decoded.source).toBe('plugin');

        // Code should be consumed (single-use)
        expect(pluginAuthController._testing.authorizationCodes.has(validCode)).toBe(false);
      });
    });

    describe('When exchanging an invalid authorization code', () => {
      it('Then it should return 400', () => {
        mockReq.body = {
          code: 'invalid-code',
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid or expired authorization code'
        });
      });
    });

    describe('When exchanging an expired authorization code', () => {
      it('Then it should return 400', () => {
        const expiredCode = 'b'.repeat(64);
        pluginAuthController._testing.authorizationCodes.set(expiredCode, {
          userId: 'user-123',
          email: 'test@example.com',
          companyId: 'company-456',
          role: 'admin',
          redirectUri: 'https://chat.example.com/callback',
          expiresAt: Date.now() - 1000 // Already expired
        });

        mockReq.body = {
          code: expiredCode,
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authorization code has expired'
        });
      });
    });

    describe('When called with missing code', () => {
      it('Then it should return 400', () => {
        mockReq.body = {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authorization code is required'
        });
      });
    });

    describe('When called with invalid client_id', () => {
      it('Then it should return 400', () => {
        mockReq.body = {
          code: validCode,
          client_id: 'wrong-client',
          client_secret: 'test-client-secret'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid client_id' });
      });
    });

    describe('When called with invalid client_secret', () => {
      it('Then it should return 401', () => {
        mockReq.body = {
          code: validCode,
          client_id: 'test-client-id',
          client_secret: 'wrong-secret'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid client_secret' });
      });
    });

    describe('When called with unsupported grant_type', () => {
      it('Then it should return 400', () => {
        mockReq.body = {
          code: validCode,
          client_id: 'test-client-id',
          grant_type: 'client_credentials'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unsupported grant_type' });
      });
    });

    describe('When redirect_uri does not match', () => {
      it('Then it should return 400', () => {
        mockReq.body = {
          code: validCode,
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          redirect_uri: 'https://different.example.com/callback'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'redirect_uri mismatch' });
      });
    });

    describe('When JWT_SECRET is not configured', () => {
      it('Then it should return 500', () => {
        delete process.env.JWT_SECRET;
        mockReq.body = {
          code: validCode,
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        };

        pluginAuthController.token(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'JWT secret not configured' });
      });
    });
  });

  describe('Given the userinfo endpoint', () => {
    describe('When called with an authenticated user', () => {
      it('Then it should return user info', () => {
        pluginAuthController.userinfo(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
          id: 'user-123',
          email: 'test@example.com',
          companyId: 'company-456',
          role: 'admin'
        });
      });
    });

    describe('When called without authentication', () => {
      it('Then it should return 401', () => {
        mockReq.user = null;

        pluginAuthController.userinfo(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      });
    });

    describe('When called with incomplete user data', () => {
      it('Then it should return 401 if userId is missing', () => {
        mockReq.user = { email: 'test@example.com' };

        pluginAuthController.userinfo(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(401);
      });
    });
  });
});
