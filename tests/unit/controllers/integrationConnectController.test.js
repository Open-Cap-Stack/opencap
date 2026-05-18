/**
 * Integration Connect Controller Unit Tests
 * Issue #582: Add integration connect/disconnect endpoints
 * TDD: Tests for getConnectedIntegrations, connectIntegration, disconnectIntegration
 */
process.env.SKIP_DB_SETUP = 'true';

// Mock User model before requiring the controller
jest.mock('../../../models/User', () => ({
  findOne: jest.fn(),
  updateOne: jest.fn()
}));

const httpMocks = require('node-mocks-http');
const User = require('../../../models/User');
const {
  getConnectedIntegrations,
  connectIntegration,
  disconnectIntegration,
  SUPPORTED_INTEGRATIONS
} = require('../../../controllers/integrationConnectController');

describe('IntegrationConnectController', () => {
  let req, res;

  beforeEach(() => {
    req = httpMocks.createRequest();
    res = httpMocks.createResponse();
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/integrations/connected
  // -----------------------------------------------------------------------
  describe('getConnectedIntegrations', () => {
    it('should return 401 when user is not authenticated', async () => {
      req.user = null;
      await getConnectedIntegrations(req, res);
      expect(res.statusCode).toBe(401);
      expect(res._getJSONData()).toEqual({ error: 'Unauthorized' });
    });

    it('should return empty array when user has no connected integrations', async () => {
      req.user = { userId: 'user_123' };
      User.findOne.mockResolvedValue({ userId: 'user_123' });

      await getConnectedIntegrations(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ integrations: [] });
    });

    it('should return connected integrations for authenticated user', async () => {
      const mockIntegrations = [
        { id: 'github', name: 'Github', connectedAt: '2026-01-01T00:00:00.000Z' }
      ];
      req.user = { userId: 'user_123' };
      User.findOne.mockResolvedValue({
        userId: 'user_123',
        connectedIntegrations: mockIntegrations
      });

      await getConnectedIntegrations(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ integrations: mockIntegrations });
    });

    it('should return empty array on database error (non-fatal)', async () => {
      req.user = { userId: 'user_123' };
      User.findOne.mockRejectedValue(new Error('DB error'));

      await getConnectedIntegrations(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ integrations: [] });
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/integrations/connect
  // -----------------------------------------------------------------------
  describe('connectIntegration', () => {
    it('should return 401 when user is not authenticated', async () => {
      req.user = null;
      req.body = { integrationId: 'github' };
      await connectIntegration(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when integrationId is missing', async () => {
      req.user = { userId: 'user_123' };
      req.body = {};
      await connectIntegration(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/integrationId/i);
    });

    it('should return 400 for unsupported integration', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'unsupported-tool' };
      await connectIntegration(req, res);
      expect(res.statusCode).toBe(400);
      expect(res._getJSONData().error).toMatch(/not supported/i);
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'github' };
      User.findOne.mockResolvedValue(null);

      await connectIntegration(req, res);
      expect(res.statusCode).toBe(404);
    });

    it('should return 409 when integration is already connected', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'github' };
      User.findOne.mockResolvedValue({
        userId: 'user_123',
        connectedIntegrations: [{ id: 'github', name: 'Github', connectedAt: '2026-01-01T00:00:00.000Z' }]
      });

      await connectIntegration(req, res);
      expect(res.statusCode).toBe(409);
    });

    it('should connect a new integration successfully', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'slack' };
      User.findOne.mockResolvedValue({
        userId: 'user_123',
        connectedIntegrations: []
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await connectIntegration(req, res);
      expect(res.statusCode).toBe(200);

      const data = res._getJSONData();
      expect(data.success).toBe(true);
      expect(data.integration.id).toBe('slack');
      expect(data.integration.name).toBe('Slack');
      expect(data.integration.connectedAt).toBeDefined();

      // Verify updateOne was called correctly
      expect(User.updateOne).toHaveBeenCalledWith(
        { userId: 'user_123' },
        expect.objectContaining({
          $set: expect.objectContaining({
            connectedIntegrations: expect.arrayContaining([
              expect.objectContaining({ id: 'slack' })
            ])
          })
        })
      );
    });

    it('should format multi-word integration names correctly', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'google-drive' };
      User.findOne.mockResolvedValue({ userId: 'user_123', connectedIntegrations: [] });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await connectIntegration(req, res);
      const data = res._getJSONData();
      expect(data.integration.name).toBe('Google Drive');
    });

    it('should return 500 on unexpected error', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'github' };
      User.findOne.mockRejectedValue(new Error('Unexpected DB failure'));

      await connectIntegration(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/integrations/disconnect
  // -----------------------------------------------------------------------
  describe('disconnectIntegration', () => {
    it('should return 401 when user is not authenticated', async () => {
      req.user = null;
      req.body = { integrationId: 'github' };
      await disconnectIntegration(req, res);
      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when integrationId is missing', async () => {
      req.user = { userId: 'user_123' };
      req.body = {};
      await disconnectIntegration(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('should return 404 when user not found', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'github' };
      User.findOne.mockResolvedValue(null);

      await disconnectIntegration(req, res);
      expect(res.statusCode).toBe(404);
      expect(res._getJSONData().error).toMatch(/User not found/i);
    });

    it('should return 404 when integration is not connected', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'github' };
      User.findOne.mockResolvedValue({
        userId: 'user_123',
        connectedIntegrations: []
      });

      await disconnectIntegration(req, res);
      expect(res.statusCode).toBe(404);
      expect(res._getJSONData().error).toMatch(/not connected/i);
    });

    it('should disconnect an integration successfully', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'github' };
      User.findOne.mockResolvedValue({
        userId: 'user_123',
        connectedIntegrations: [
          { id: 'github', name: 'Github', connectedAt: '2026-01-01T00:00:00.000Z' },
          { id: 'slack', name: 'Slack', connectedAt: '2026-01-02T00:00:00.000Z' }
        ]
      });
      User.updateOne.mockResolvedValue({ modifiedCount: 1 });

      await disconnectIntegration(req, res);
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ success: true });

      // Verify only github was removed, slack remains
      const updateCall = User.updateOne.mock.calls[0];
      const updatedList = updateCall[1].$set.connectedIntegrations;
      expect(updatedList).toHaveLength(1);
      expect(updatedList[0].id).toBe('slack');
    });

    it('should return 500 on unexpected error', async () => {
      req.user = { userId: 'user_123' };
      req.body = { integrationId: 'github' };
      User.findOne.mockRejectedValue(new Error('DB failure'));

      await disconnectIntegration(req, res);
      expect(res.statusCode).toBe(500);
    });
  });

  // -----------------------------------------------------------------------
  // Supported integrations list
  // -----------------------------------------------------------------------
  describe('SUPPORTED_INTEGRATIONS', () => {
    it('should include common integrations', () => {
      expect(SUPPORTED_INTEGRATIONS).toContain('github');
      expect(SUPPORTED_INTEGRATIONS).toContain('slack');
      expect(SUPPORTED_INTEGRATIONS).toContain('google-drive');
    });
  });
});
