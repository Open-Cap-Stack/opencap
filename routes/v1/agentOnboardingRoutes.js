const express = require('express');
const router = express.Router();
const { createEndpointRateLimiter } = require('../../middleware/rateLimiter');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
  createEndpointRateLimiter('/api/v1/agents/onboard'),
  (req, res) => {
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

module.exports = router;
