/**
 * Integration Connect Controller
 * Handles user integration connections (GitHub, Slack, Google Drive, etc.)
 * Stores connected integrations per user in ZeroDB via the User model.
 *
 * Endpoints:
 *   GET  /api/v1/integrations/connected   - list connected integrations
 *   POST /api/v1/integrations/connect      - connect an integration
 *   POST /api/v1/integrations/disconnect   - disconnect an integration
 */

const User = require('../models/User');

const SUPPORTED_INTEGRATIONS = [
  'github',
  'slack',
  'google-drive',
  'jira',
  'quickbooks',
  'xero',
  'docusign',
  'stripe'
];

/**
 * GET /api/v1/integrations/connected
 * Returns the list of integrations the authenticated user has connected.
 */
async function getConnectedIntegrations(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findOne({ userId });
    const integrations = user?.connectedIntegrations || [];
    return res.json({ integrations });
  } catch (err) {
    console.error('[integrations] getConnected error:', err.message);
    // Non-fatal: return empty list so frontend renders gracefully
    return res.json({ integrations: [] });
  }
}

/**
 * POST /api/v1/integrations/connect
 * Connects an integration for the authenticated user.
 * Body: { integrationId: string }
 */
async function connectIntegration(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { integrationId } = req.body;
    if (!integrationId) {
      return res.status(400).json({ error: 'integrationId is required' });
    }

    if (!SUPPORTED_INTEGRATIONS.includes(integrationId)) {
      return res.status(400).json({
        error: `Integration "${integrationId}" is not supported`,
        supported: SUPPORTED_INTEGRATIONS
      });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = user.connectedIntegrations || [];
    if (existing.some(i => i.id === integrationId)) {
      return res.status(409).json({ error: 'Integration already connected' });
    }

    // For OAuth-based integrations a real implementation would generate a
    // redirectUrl here. For now we record the connection directly.
    const newIntegration = {
      id: integrationId,
      name: integrationId
        .split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      connectedAt: new Date().toISOString()
    };

    await User.updateOne(
      { userId },
      {
        $set: {
          connectedIntegrations: [...existing, newIntegration],
          updatedAt: new Date().toISOString()
        }
      }
    );

    return res.json({ success: true, integration: newIntegration });
  } catch (err) {
    console.error('[integrations] connect error:', err.message);
    return res.status(500).json({ error: 'Failed to connect integration', message: err.message });
  }
}

/**
 * POST /api/v1/integrations/disconnect
 * Disconnects an integration for the authenticated user.
 * Body: { integrationId: string }
 */
async function disconnectIntegration(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { integrationId } = req.body;
    if (!integrationId) {
      return res.status(400).json({ error: 'integrationId is required' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existing = user.connectedIntegrations || [];
    const found = existing.some(i => i.id === integrationId);
    if (!found) {
      return res.status(404).json({ error: 'Integration not connected' });
    }

    const updated = existing.filter(i => i.id !== integrationId);

    await User.updateOne(
      { userId },
      {
        $set: {
          connectedIntegrations: updated,
          updatedAt: new Date().toISOString()
        }
      }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('[integrations] disconnect error:', err.message);
    return res.status(500).json({ error: 'Failed to disconnect integration', message: err.message });
  }
}

module.exports = {
  getConnectedIntegrations,
  connectIntegration,
  disconnectIntegration,
  SUPPORTED_INTEGRATIONS
};
