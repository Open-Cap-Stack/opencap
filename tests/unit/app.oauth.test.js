/**
 * OAuth Auth Endpoint Authentication Tests
 *
 * Issues #174, #169: Verify that OAuth /auth endpoints require authentication
 * and use req.user.userId instead of an untrusted req.query.userId parameter.
 *
 * These tests confirm that unauthenticated requests to the Google Drive,
 * Gmail, and Mercury OAuth initiation endpoints are rejected with 401.
 */
process.env.SKIP_DB_SETUP = 'true';
process.env.JWT_SECRET = 'test-secret-oauth-auth';
process.env.GOOGLE_CLIENT_ID = 'fake-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'fake-google-client-secret';
process.env.MERCURY_CLIENT_ID = 'fake-mercury-client-id';
process.env.MERCURY_CLIENT_SECRET = 'fake-mercury-client-secret';

// Mock User model used by authMiddleware
jest.mock('../../models/User', () => ({
  findOne: jest.fn().mockResolvedValue(null),
  findByEmail: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(null),
  getPermissionsForRole: jest.fn().mockReturnValue([]),
  updateLastLogin: jest.fn().mockResolvedValue(null)
}));

// Mock ZeroDB service to prevent real DB connections
jest.mock('../../services/zerodbService', () => ({
  queryRows: jest.fn().mockResolvedValue({ rows: [] }),
  insertRow: jest.fn().mockResolvedValue({}),
  deleteRowById: jest.fn().mockResolvedValue({}),
  getHealth: jest.fn().mockResolvedValue({ status: 'ok' }),
  isAvailable: jest.fn().mockReturnValue(true),
}));

jest.mock('../../services/databaseAdapter', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true),
}));

const request = require('supertest');

let app;
beforeAll(() => {
  app = require('../../app');
});

describe('OAuth /auth endpoints require authentication (Issues #174, #169)', () => {
  const endpoints = [
    {
      name: 'Google Drive',
      path: '/api/v1/connect/google/google-drive/auth',
    },
    {
      name: 'Gmail',
      path: '/api/v1/connect/google/gmail/auth',
    },
    {
      name: 'Mercury',
      path: '/api/v1/connect/mercury/auth',
    },
  ];

  endpoints.forEach(({ name, path }) => {
    it(`${name} auth endpoint rejects unauthenticated requests with 401`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no token provided/i);
    });

    it(`${name} auth endpoint rejects requests with userId query param but no token`, async () => {
      const res = await request(app).get(path).query({ userId: 'attacker-id' });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/no token provided/i);
    });
  });

  // Callback endpoints should remain unauthenticated (they receive OAuth provider redirects)
  it('Google Drive callback remains accessible without auth', async () => {
    const res = await request(app).get('/api/v1/connect/google/google-drive/callback');
    // Should not return 401 -- it will redirect to frontend with an error param instead
    expect(res.status).not.toBe(401);
  });

  it('Gmail callback remains accessible without auth', async () => {
    const res = await request(app).get('/api/v1/connect/google/gmail/callback');
    expect(res.status).not.toBe(401);
  });

  it('Mercury callback remains accessible without auth', async () => {
    const res = await request(app).get('/api/v1/connect/mercury/callback');
    expect(res.status).not.toBe(401);
  });
});
