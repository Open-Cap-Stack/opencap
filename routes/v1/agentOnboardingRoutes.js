const express = require('express');
const router = express.Router();
const { createEndpointRateLimiter } = require('../../middleware/rateLimiter');
const { authenticateToken } = require('../../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const zerodbService = require('../../services/zerodbService');

/**
 * Unwrap ZeroDB response into a plain array of row objects.
 */
function unwrap(result) {
  const raw = result.data || result.rows || result || [];
  if (!Array.isArray(raw)) return [];
  return raw.map(item =>
    item.row_data ? { ...item.row_data, id: item.row_data.id || item.row_id } : item
  );
}

/**
 * JWT authentication middleware for agent management endpoints.
 */
function requireJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header', status: 401 } });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token', status: 401 } });
  }
}

/**
 * Persist an agent record to ZeroDB. Creates the agents table if it does not exist.
 */
async function persistAgent(agentRecord) {
  try {
    await zerodbService.insertRow('agents', agentRecord);
  } catch (insertErr) {
    // Table may not exist yet — create it and retry once
    try {
      await zerodbService.createTable('agents', {
        columns: [
          { name: 'agent_id', type: 'string' },
          { name: 'agent_name', type: 'string' },
          { name: 'capabilities', type: 'json' },
          { name: 'company_id', type: 'string' },
          { name: 'api_key', type: 'string' },
          { name: 'created_at', type: 'string' },
          { name: 'status', type: 'string' },
        ],
      });
      await zerodbService.insertRow('agents', agentRecord);
    } catch (retryErr) {
      console.error('Failed to persist agent record to ZeroDB:', retryErr.message);
    }
  }
}

const VALID_CAPABILITIES = [
  'read:cap-table',
  'write:stakeholders',
  'write:equity',
  'read:financials',
  'write:documents',
  'read:analytics',
];

/**
 * POST /api/v1/agents/onboard
 * Zero-human-step agent self-registration.
 * Agents POST their agent_id and requested capabilities, receive a JWT immediately.
 * No email verification, no CAPTCHA, no human in the loop.
 */
router.post(
  '/onboard',
  authenticateToken,
  createEndpointRateLimiter('/api/v1/agents/onboard'),
  (req, res) => {
    const allowedRoles = ['super_admin', 'admin'];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only admin users can onboard agents',
          status: 403,
        },
      });
    }

    const { agent_id, agent_name, capabilities = [], company_context } = req.body;

    if (!agent_id || typeof agent_id !== 'string' || agent_id.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_AGENT_ID',
          message: 'agent_id is required',
          status: 400,
          docs: 'https://opencapstack.com/AGENTS.md',
        },
      });
    }

    // Validate requested capabilities — silently drop unknown ones
    const grantedCapabilities = capabilities.filter((c) =>
      VALID_CAPABILITIES.includes(c)
    );
    // Default to read-only if none requested
    if (grantedCapabilities.length === 0) {
      grantedCapabilities.push('read:cap-table');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 60 * 60 * 24 * 365; // 1 year

    const payload = {
      sub: `agent:${agent_id.trim()}`,
      name: agent_name || agent_id,
      type: 'agent',
      capabilities: grantedCapabilities,
      company_id: company_context || null,
      iat: now,
    };

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        error: {
          code: 'CONFIGURATION_ERROR',
          message: 'Server is not properly configured',
          status: 500,
        },
      });
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn,
    });

    // Generate a long-lived API key (ocs_ prefix, 32 random hex bytes)
    const apiKey = `ocs_${crypto.randomBytes(32).toString('hex')}`;

    // Persist agent record to ZeroDB (best-effort, do not block response on failure)
    persistAgent({
      agent_id: agent_id.trim(),
      agent_name: agent_name || agent_id,
      capabilities: grantedCapabilities,
      company_id: company_context || null,
      api_key: apiKey,
      created_at: new Date().toISOString(),
      status: 'active',
    }).catch((err) => {
      console.error('Background agent persistence failed:', err.message);
    });

    return res.status(201).json({
      token,
      api_key: apiKey,
      company_id: company_context || null,
      capabilities: grantedCapabilities,
      provisioned_at: new Date().toISOString(),
      expires_at: new Date((now + expiresIn) * 1000).toISOString(),
      docs: 'https://opencapstack.com/AGENTS.md',
    });
  }
);

/**
 * GET /api/v1/agents/capabilities
 * List available capability scopes — no auth required.
 */
router.get('/capabilities', (req, res) => {
  res.json({
    capabilities: VALID_CAPABILITIES.map((cap) => ({
      scope: cap,
      description: {
        'read:cap-table': 'Read stakeholders, share classes, equity plans, securities',
        'write:stakeholders': 'Create and update stakeholder records',
        'write:equity': 'Issue grants, update vesting schedules, manage equity',
        'read:financials': 'Access valuations, financial reports, analytics',
        'write:documents': 'Upload and manage documents',
        'read:analytics': 'Access reporting, analytics, and dashboards',
      }[cap],
    })),
  });
});

/**
 * GET /api/v1/agents
 * List all registered agents. Requires JWT authentication.
 * The api_key field is stripped from each record before returning.
 */
router.get('/', requireJwt, async (req, res) => {
  try {
    const result = await zerodbService.queryTable('agents', {});
    const agents = unwrap(result).map(
      ({ api_key, ...rest }) => rest // strip api_key from response
    );
    return res.json({ agents });
  } catch (err) {
    // Table may not exist yet — return empty list
    return res.json({ agents: [] });
  }
});

/**
 * DELETE /api/v1/agents/:agentId
 * Revoke an agent by setting its status to 'revoked'. Requires JWT authentication.
 */
router.delete('/:agentId', requireJwt, async (req, res) => {
  const { agentId } = req.params;
  try {
    // Look up the agent first to confirm it exists
    const result = await zerodbService.queryTable('agents', {
      filter: { agent_id: agentId },
      limit: 1,
    });
    const agents = unwrap(result);
    if (agents.length === 0) {
      return res.status(404).json({
        error: { code: 'AGENT_NOT_FOUND', message: `Agent ${agentId} not found`, status: 404 },
      });
    }

    await zerodbService.updateRows('agents', {
      filter: { agent_id: agentId },
      update: { status: 'revoked' },
    });

    return res.json({ message: 'Agent revoked' });
  } catch (err) {
    // If table doesn't exist, agent can't exist either
    return res.status(404).json({
      error: { code: 'AGENT_NOT_FOUND', message: `Agent ${agentId} not found`, status: 404 },
    });
  }
});

module.exports = router;
