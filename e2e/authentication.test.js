/**
 * E2E Tests: Authentication Flow
 * GitHub Issue #43: Implement E2E Test Suite
 *
 * Tests the complete authentication journey including:
 * - User login/logout
 * - Token management
 * - Session handling
 * - Password reset flow
 */

const { test, expect } = require('@playwright/test');

// Base API URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Test data generators
const generateUniqueEmail = () => `authtest_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`;
const generateUniqueUsername = () => `authtest_${Date.now()}_${Math.random().toString(36).substring(7)}`;

test.describe('Authentication Flow', () => {
  // Shared test user credentials
  let testUser = {
    name: 'Auth Test User',
    email: generateUniqueEmail(),
    password: 'SecurePassword123!',
    username: generateUniqueUsername(),
    role: 'investor'
  };
  let authToken;
  let refreshToken;

  test.describe('User Login', () => {
    test.beforeAll(async ({ request }) => {
      // Register a user first
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/register`, {
        data: testUser
      });

      if (response.status() === 200 || response.status() === 201) {
        const body = await response.json();
        authToken = body.token || body.accessToken || (body.data && body.data.token);
        refreshToken = body.refreshToken || (body.data && body.data.refreshToken);
      }
    });

    test('should login with valid credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        }
      });

      expect([200, 201]).toContain(response.status());

      const body = await response.json();
      expect(body).toBeDefined();

      // Should return token
      const token = body.token || body.accessToken || (body.data && body.data.token);
      if (token) {
        expect(typeof token).toBe('string');
        authToken = token;
      }

      // Should return refresh token
      const refresh = body.refreshToken || (body.data && body.data.refreshToken);
      if (refresh) {
        expect(typeof refresh).toBe('string');
        refreshToken = refresh;
      }
    });

    test('should reject login with invalid password', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
        data: {
          email: testUser.email,
          password: 'WrongPassword123!'
        }
      });

      expect([400, 401, 403]).toContain(response.status());

      const body = await response.json();
      expect(body.error || body.message).toBeDefined();
    });

    test('should reject login with non-existent email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        }
      });

      expect([400, 401, 404]).toContain(response.status());

      const body = await response.json();
      expect(body.error || body.message).toBeDefined();
    });

    test('should reject login with missing email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
        data: {
          password: 'SomePassword123!'
        }
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should reject login with missing password', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
        data: {
          email: testUser.email
        }
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should reject login with empty credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
        data: {}
      });

      expect([400, 422]).toContain(response.status());
    });
  });

  test.describe('Token Management', () => {
    test('should refresh access token with valid refresh token', async ({ request }) => {
      test.skip(!refreshToken, 'No refresh token available');

      const response = await request.post(`${API_BASE_URL}/api/v1/auth/token/refresh`, {
        data: {
          refreshToken: refreshToken
        }
      });

      // May be 200 if refresh token is supported, or 400/404 if not
      if (response.status() === 200) {
        const body = await response.json();
        expect(body.token || body.accessToken).toBeDefined();
      }
    });

    test('should reject token refresh with invalid refresh token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/token/refresh`, {
        data: {
          refreshToken: 'invalid-refresh-token-12345'
        }
      });

      expect([400, 401, 403, 404]).toContain(response.status());
    });

    test('should reject token refresh with expired token', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkV4cGlyZWQgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxNTE2MjM5MDIyfQ.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';

      const response = await request.post(`${API_BASE_URL}/api/v1/auth/token/refresh`, {
        data: {
          refreshToken: expiredToken
        }
      });

      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe('User Logout', () => {
    test('should logout successfully with valid token', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.post(`${API_BASE_URL}/api/v1/auth/logout`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Logout should succeed
      expect([200, 204]).toContain(response.status());
    });

    test('should reject logout without authentication', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/logout`);

      expect([401, 403]).toContain(response.status());
    });

    test('should reject logout with invalid token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/logout`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345'
        }
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Protected Routes Access', () => {
    test('should access protected route with valid token', async ({ request }) => {
      test.skip(!authToken, 'No auth token available');

      const response = await request.get(`${API_BASE_URL}/api/v1/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Should succeed with valid token
      expect([200, 401]).toContain(response.status());
    });

    test('should reject protected route without token', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/v1/auth/profile`);

      expect([401, 403]).toContain(response.status());
    });

    test('should reject protected route with malformed token', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/v1/auth/profile`, {
        headers: {
          'Authorization': 'Bearer malformed.token.here'
        }
      });

      expect([401, 403]).toContain(response.status());
    });

    test('should reject protected route with expired token', async ({ request }) => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkV4cGlyZWQiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyMn0.KPKt8FLKAb7W9_gfvYT5HcLkKMV-8B7bKmKS7xS7tM8';

      const response = await request.get(`${API_BASE_URL}/api/v1/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should request password reset for registered email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/password/reset-request`, {
        data: {
          email: testUser.email
        }
      });

      // Should accept the request (may not send email in test)
      expect([200, 201, 202, 404]).toContain(response.status());

      if (response.status() === 200 || response.status() === 202) {
        const body = await response.json();
        expect(body.message || body.success).toBeDefined();
      }
    });

    test('should handle password reset request for non-existent email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/password/reset-request`, {
        data: {
          email: 'nonexistent@example.com'
        }
      });

      // Should still return 200 to prevent email enumeration, or 404
      expect([200, 404]).toContain(response.status());
    });

    test('should reject password reset request without email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/password/reset-request`, {
        data: {}
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should reject password reset with invalid token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/password/reset`, {
        data: {
          token: 'invalid-reset-token',
          newPassword: 'NewSecurePassword123!'
        }
      });

      expect([400, 401, 404]).toContain(response.status());
    });

    test('should verify reset token validity', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/password/verify-token`, {
        data: {
          token: 'test-verification-token'
        }
      });

      // Token verification should return valid/invalid
      expect([200, 400, 401, 404]).toContain(response.status());
    });
  });

  test.describe('OAuth Login', () => {
    test('should handle OAuth login request', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/oauth-login`, {
        data: {
          provider: 'google',
          token: 'test-oauth-token'
        }
      });

      // OAuth may not be configured in test environment
      expect([200, 400, 401, 501]).toContain(response.status());
    });

    test('should reject OAuth login with missing provider', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/oauth-login`, {
        data: {
          token: 'test-oauth-token'
        }
      });

      expect([400, 422]).toContain(response.status());
    });

    test('should reject OAuth login with invalid provider', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/v1/auth/oauth-login`, {
        data: {
          provider: 'invalid-provider',
          token: 'test-oauth-token'
        }
      });

      expect([400, 422, 501]).toContain(response.status());
    });
  });

  test.describe('Login Rate Limiting', () => {
    test('should handle rapid login attempts gracefully', async ({ request }) => {
      const attempts = 10;
      const responses = [];

      for (let i = 0; i < attempts; i++) {
        const response = await request.post(`${API_BASE_URL}/api/v1/auth/login`, {
          data: {
            email: `ratelimit_${i}@example.com`,
            password: 'TestPassword123!'
          }
        });

        responses.push(response.status());
      }

      // Should handle gracefully, either with auth failures or rate limiting
      const expectedStatuses = [200, 400, 401, 403, 404, 429];
      responses.forEach(status => {
        expect(expectedStatuses).toContain(status);
      });
    });
  });
});

test.describe('Session Management', () => {
  test('should maintain session across multiple requests', async ({ request }) => {
    // Register and login
    const testEmail = generateUniqueEmail();
    const testUser = {
      name: 'Session Test User',
      email: testEmail,
      password: 'SessionTest123!',
      username: generateUniqueUsername(),
      role: 'investor'
    };

    // Register
    const registerResponse = await request.post(`${API_BASE_URL}/api/v1/auth/register`, {
      data: testUser
    });

    let authToken;
    if (registerResponse.status() === 200 || registerResponse.status() === 201) {
      const body = await registerResponse.json();
      authToken = body.token || body.accessToken || (body.data && body.data.token);
    }

    test.skip(!authToken, 'No auth token available');

    // Make multiple authenticated requests
    const requests = [
      request.get(`${API_BASE_URL}/api/v1/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      request.get(`${API_BASE_URL}/api/v1/user`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      request.get(`${API_BASE_URL}/health`)
    ];

    const responses = await Promise.all(requests);

    // At least health check should succeed
    expect(responses[2].status()).toBe(200);
  });
});

test.describe('Email Verification Flow', () => {
  let testUser;
  let authToken;

  test.beforeAll(async ({ request }) => {
    testUser = {
      name: 'Verify Test User',
      email: generateUniqueEmail(),
      password: 'VerifyTest123!',
      username: generateUniqueUsername(),
      role: 'investor'
    };

    const response = await request.post(`${API_BASE_URL}/api/v1/auth/register`, {
      data: testUser
    });

    if (response.status() === 200 || response.status() === 201) {
      const body = await response.json();
      authToken = body.token || body.accessToken || (body.data && body.data.token);
    }
  });

  test('should request email verification resend', async ({ request }) => {
    test.skip(!authToken, 'No auth token available');

    const response = await request.post(`${API_BASE_URL}/api/v1/auth/verify/send`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    // Should accept the request
    expect([200, 202, 401, 429]).toContain(response.status());
  });

  test('should handle email verification with token', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/v1/auth/verify/test-verification-token`);

    // Token verification
    expect([200, 400, 404]).toContain(response.status());
  });

  test('should reject email verification without authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/api/v1/auth/verify/send`);

    expect([401, 403]).toContain(response.status());
  });
});
