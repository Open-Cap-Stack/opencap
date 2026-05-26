'use strict';

/**
 * Tests for clerkyIntegrationController
 * Issue #662: Clerky OAuth integration
 */

const request = require('supertest');
const express = require('express');
const crypto = require('crypto');

// Generate a test encryption key (32 bytes = 64 hex chars)
const TEST_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

// Mock auth middleware
jest.mock('../../../middleware/authMiddleware', () => ({
  authenticateToken: (req, res, next) => {
    if (req.headers.authorization === 'Bearer founder-token') {
      req.user = { userId: 'user-1', role: 'founder', companyId: 'company-1' };
    } else if (req.headers.authorization === 'Bearer admin-token') {
      req.user = { userId: 'user-2', role: 'admin', companyId: 'company-1' };
    } else if (req.headers.authorization === 'Bearer employee-token') {
      req.user = { userId: 'user-3', role: 'employee', companyId: 'company-1' };
    } else if (req.headers.authorization === 'Bearer no-company-token') {
      req.user = { userId: 'user-4', role: 'founder' };
    }
    next();
  },
}));

// Mock rbacMiddleware
jest.mock('../../../middleware/rbacMiddleware', () => ({
  hasRole: (roles) => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (allowed.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: 'Access denied: Insufficient role permissions' });
  },
  hasPermission: () => (req, res, next) => next(),
}));

// In-memory store for mocked ZeroDB
let mockStore = {};

jest.mock('../../../services/zerodbService', () => ({
  insertRow: jest.fn(async (table, data) => {
    if (!mockStore[table]) mockStore[table] = [];
    mockStore[table].push(data);
    return { data };
  }),
  queryTable: jest.fn(async (table, opts) => {
    const rows = mockStore[table] || [];
    const filter = opts?.filter || {};
    const matched = rows.filter((row) =>
      Object.keys(filter).every((k) => row[k] === filter[k])
    );
    return { data: matched.map((r) => ({ row_data: r })) };
  }),
  updateRows: jest.fn(async (table, opts) => {
    const rows = mockStore[table] || [];
    const filter = opts?.filter || {};
    const update = opts?.update || {};
    rows.forEach((row) => {
      const match = Object.keys(filter).every((k) => row[k] === filter[k]);
      if (match) Object.assign(row, update);
    });
    return { updated: 1 };
  }),
  deleteRows: jest.fn(async (table, opts) => {
    const filter = opts?.filter || {};
    if (!mockStore[table]) return { deleted: 0 };
    const before = mockStore[table].length;
    mockStore[table] = mockStore[table].filter(
      (row) => !Object.keys(filter).every((k) => row[k] === filter[k])
    );
    return { deleted: before - mockStore[table].length };
  }),
}));

// Set encryption key before requiring controller
process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

const clerkyRoutes = require('../../../routes/v1/clerkyIntegrationRoutes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/integrations/clerky', clerkyRoutes);
  return app;
}

beforeEach(() => {
  mockStore = {};
  jest.clearAllMocks();
});

describe('Clerky Integration Controller', () => {
  // ── Connect ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/integrations/clerky/connect', () => {
    it('should connect and store encrypted API key', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer founder-token')
        .send({ apiKey: 'clerky_live_abc123', orgId: 'org-clerky-1' });

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.connectionId).toBeDefined();

      // Verify plaintext key is NOT stored in the record
      const stored = mockStore.clerky_connections[0];
      expect(stored.accessToken).toBeDefined();
      expect(stored.accessToken).not.toBe('clerky_live_abc123');
      expect(stored.accessTokenIv).toBeDefined();
      expect(stored.accessTokenTag).toBeDefined();
    });

    it('should reject missing apiKey', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer founder-token')
        .send({ orgId: 'org-1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/apiKey.*required/i);
    });

    it('should reject missing orgId', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer founder-token')
        .send({ apiKey: 'clerky_live_abc123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/orgId.*required/i);
    });

    it('should reject when user has no companyId', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer no-company-token')
        .send({ apiKey: 'clerky_live_abc123', orgId: 'org-1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/company/i);
    });
  });

  // ── Status ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/integrations/clerky/status', () => {
    it('should return connected: false when no connection exists', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/v1/integrations/clerky/status')
        .set('Authorization', 'Bearer founder-token');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
    });

    it('should return correct shape when connected', async () => {
      const app = createApp();
      // First connect
      await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer founder-token')
        .send({ apiKey: 'clerky_live_abc123', orgId: 'org-clerky-1' });

      const res = await request(app)
        .get('/api/v1/integrations/clerky/status')
        .set('Authorization', 'Bearer founder-token');

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.clerkyOrgId).toBe('org-clerky-1');
      expect(res.body.connectedAt).toBeDefined();
      expect(res.body).toHaveProperty('lastSyncedAt');
    });
  });

  // ── Sync ───────────────────────────────────────────────────────────────────

  describe('POST /api/v1/integrations/clerky/sync', () => {
    it('should return 404 when no connection exists', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/integrations/clerky/sync')
        .set('Authorization', 'Bearer founder-token');

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/no.*connection/i);
    });

    it('should sync and return document list', async () => {
      const app = createApp();
      // Connect first
      await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer founder-token')
        .send({ apiKey: 'clerky_live_abc123', orgId: 'org-clerky-1' });

      const res = await request(app)
        .post('/api/v1/integrations/clerky/sync')
        .set('Authorization', 'Bearer founder-token');

      expect(res.status).toBe(200);
      expect(res.body.synced).toBeGreaterThan(0);
      expect(Array.isArray(res.body.documents)).toBe(true);
      expect(res.body.documents.length).toBeGreaterThan(0);

      // Verify documents contain expected types
      const types = res.body.documents.map((d) => d.category);
      expect(types).toContain('Certificate of Incorporation');
      expect(types).toContain('SAFE');
      expect(types).toContain('83b Election');
    });

    it('should update lastSyncedAt after sync', async () => {
      const app = createApp();
      await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer founder-token')
        .send({ apiKey: 'clerky_live_abc123', orgId: 'org-clerky-1' });

      await request(app)
        .post('/api/v1/integrations/clerky/sync')
        .set('Authorization', 'Bearer founder-token');

      const statusRes = await request(app)
        .get('/api/v1/integrations/clerky/status')
        .set('Authorization', 'Bearer founder-token');

      expect(statusRes.body.lastSyncedAt).toBeDefined();
      expect(statusRes.body.lastSyncedAt).not.toBeNull();
    });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/integrations/clerky/disconnect', () => {
    it('should disconnect and return success', async () => {
      const app = createApp();
      await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer founder-token')
        .send({ apiKey: 'clerky_live_abc123', orgId: 'org-clerky-1' });

      const res = await request(app)
        .delete('/api/v1/integrations/clerky/disconnect')
        .set('Authorization', 'Bearer founder-token');

      expect(res.status).toBe(200);
      expect(res.body.disconnected).toBe(true);

      // Verify status shows disconnected
      const statusRes = await request(app)
        .get('/api/v1/integrations/clerky/status')
        .set('Authorization', 'Bearer founder-token');

      expect(statusRes.body.connected).toBe(false);
    });

    it('should return 404 when no connection exists', async () => {
      const app = createApp();
      const res = await request(app)
        .delete('/api/v1/integrations/clerky/disconnect')
        .set('Authorization', 'Bearer founder-token');

      expect(res.status).toBe(404);
    });
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/v1/integrations/clerky/status');

      expect(res.status).toBe(401);
    });

    it('should reject employee role', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/v1/integrations/clerky/connect')
        .set('Authorization', 'Bearer employee-token')
        .send({ apiKey: 'clerky_live_abc123', orgId: 'org-1' });

      expect(res.status).toBe(403);
    });

    it('should allow admin role', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/v1/integrations/clerky/status')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
    });
  });
});
