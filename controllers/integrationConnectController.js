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
  'mercury',
  'clerk',
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
    const userIntegrations = user?.connectedIntegrations || [];

    // Also check the OAuth integrations table for real connections (Google, Mercury)
    try {
      const zerodbService = require('../services/zerodbService');
      const result = await zerodbService.queryTable('integrations', {
        filter: { userId },
        limit: 20,
      });
      const oauthRows = (result.data || result || []).map(r => r.row_data || r);
      for (const row of oauthRows) {
        const provider = row.provider;
        const id = provider === 'google' ? 'google-drive' : provider;
        if (id && !userIntegrations.some(i => i.id === id)) {
          userIntegrations.push({
            id,
            name: (id).split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            connectedAt: row.connectedAt,
            email: row.email,
          });
        }
      }
    } catch {
      // integrations table may not exist — ignore
    }

    return res.json({ integrations: userIntegrations });
  } catch (err) {
    console.error('[integrations] getConnected error:', err.message);
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

    // OAuth-based integrations return a redirectUrl for the consent screen.
    // The frontend does window.location.href = redirectUrl to start the flow.
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://opencapstack.com';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.opencapstack.com';

    const oauthUrls = {
      'google-drive': `${API_URL}/api/v1/connect/google/google-drive/auth?userId=${userId}`,
      'slack': null, // TODO: Slack OAuth when SLACK_CLIENT_ID is configured
      'github': null, // TODO: GitHub OAuth
      'mercury': `${API_URL}/api/v1/connect/mercury/auth?userId=${userId}`,
    };

    if (oauthUrls[integrationId] !== undefined) {
      const redirectUrl = oauthUrls[integrationId];
      if (redirectUrl) {
        return res.json({ success: true, redirectUrl });
      }
      // No OAuth URL configured — fall through to direct connection
    }

    // For non-OAuth integrations, record the connection directly
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
