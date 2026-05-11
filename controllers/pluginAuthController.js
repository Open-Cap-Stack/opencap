/**
 * Plugin Auth Controller
 * Issue #505: OAuth 2.0 authorization server for claude.ai plugin auth
 *
 * Implements the OAuth 2.0 authorization code flow for AI plugin integrations.
 * Authorization codes are stored in-memory with a 5-minute TTL.
 * Access tokens are standard JWTs compatible with the rest of the API.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// In-memory authorization code store: Map<code, { userId, email, companyId, redirectUri, expiresAt }>
const authorizationCodes = new Map();
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of expired codes (every 2 minutes)
const CODE_CLEANUP_INTERVAL = 2 * 60 * 1000;
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  let purged = 0;
  for (const [code, data] of authorizationCodes) {
    if (data.expiresAt <= now) {
      authorizationCodes.delete(code);
      purged++;
    }
  }
  if (purged > 0) {
    console.log(`[PluginAuth] Purged ${purged} expired authorization codes`);
  }
}, CODE_CLEANUP_INTERVAL);
// Prevent cleanup timer from keeping the process alive
if (cleanupTimer.unref) cleanupTimer.unref();

/**
 * GET /api/v1/auth/plugin/authorize
 *
 * OAuth authorization endpoint. If user is authenticated (req.user set by
 * authMiddleware), generates an authorization code and redirects back to the
 * plugin's redirect_uri. If not authenticated, returns 401 so the client can
 * direct the user to log in first.
 */
const authorize = (req, res) => {
  try {
    const { client_id, redirect_uri, state, response_type } = req.query;

    // Validate client_id
    const expectedClientId = process.env.PLUGIN_CLIENT_ID;
    if (!expectedClientId) {
      return res.status(500).json({ error: 'Plugin client not configured on server' });
    }
    if (!client_id || client_id !== expectedClientId) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }

    // Validate redirect_uri
    const expectedRedirectUri = process.env.PLUGIN_REDIRECT_URI;
    if (!redirect_uri) {
      return res.status(400).json({ error: 'redirect_uri is required' });
    }
    if (expectedRedirectUri && redirect_uri !== expectedRedirectUri) {
      return res.status(400).json({ error: 'Invalid redirect_uri' });
    }

    // Validate response_type if provided (must be 'code')
    if (response_type && response_type !== 'code') {
      return res.status(400).json({ error: 'Unsupported response_type. Only "code" is supported.' });
    }

    // User must be authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        error: 'Authentication required',
        login_url: '/api/v1/auth/login'
      });
    }

    // Generate authorization code
    const code = crypto.randomBytes(32).toString('hex');
    authorizationCodes.set(code, {
      userId: req.user.userId,
      email: req.user.email,
      companyId: req.user.companyId,
      role: req.user.role,
      redirectUri: redirect_uri,
      expiresAt: Date.now() + CODE_TTL_MS
    });

    // Build redirect URL with code and state
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.set('code', code);
    if (state) {
      redirectUrl.searchParams.set('state', state);
    }

    return res.redirect(302, redirectUrl.toString());
  } catch (error) {
    console.error('[PluginAuth] Authorize error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/v1/auth/plugin/token
 *
 * Exchanges an authorization code for a JWT access token.
 * The token is a standard OpenCap JWT, identical to what the rest of the API uses.
 */
const token = (req, res) => {
  try {
    const { code, client_id, client_secret, redirect_uri, grant_type } = req.body;

    // Validate grant_type
    if (grant_type && grant_type !== 'authorization_code') {
      return res.status(400).json({ error: 'Unsupported grant_type' });
    }

    // Validate client_id
    const expectedClientId = process.env.PLUGIN_CLIENT_ID;
    if (!expectedClientId) {
      return res.status(500).json({ error: 'Plugin client not configured on server' });
    }
    if (!client_id || client_id !== expectedClientId) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }

    // Validate client_secret if configured
    const expectedSecret = process.env.PLUGIN_CLIENT_SECRET;
    if (expectedSecret && client_secret !== expectedSecret) {
      return res.status(401).json({ error: 'Invalid client_secret' });
    }

    // Validate authorization code
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const codeData = authorizationCodes.get(code);
    if (!codeData) {
      return res.status(400).json({ error: 'Invalid or expired authorization code' });
    }

    // Check expiration
    if (codeData.expiresAt <= Date.now()) {
      authorizationCodes.delete(code);
      return res.status(400).json({ error: 'Authorization code has expired' });
    }

    // Validate redirect_uri matches what was used in the authorize step
    if (redirect_uri && codeData.redirectUri && redirect_uri !== codeData.redirectUri) {
      return res.status(400).json({ error: 'redirect_uri mismatch' });
    }

    // Code is single-use — delete it immediately
    authorizationCodes.delete(code);

    // Issue JWT access token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const expiresIn = 3600; // 1 hour
    const accessToken = jwt.sign(
      {
        userId: codeData.userId,
        email: codeData.email,
        companyId: codeData.companyId,
        role: codeData.role,
        source: 'plugin'
      },
      jwtSecret,
      { expiresIn }
    );

    return res.status(200).json({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn
    });
  } catch (error) {
    console.error('[PluginAuth] Token exchange error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/auth/plugin/userinfo
 *
 * Returns basic user info for the authenticated plugin session.
 * Requires a valid Bearer token (handled by authMiddleware).
 */
const userinfo = (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    return res.status(200).json({
      id: req.user.userId,
      email: req.user.email,
      companyId: req.user.companyId,
      role: req.user.role
    });
  } catch (error) {
    console.error('[PluginAuth] Userinfo error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Expose internals for testing
const _testing = {
  authorizationCodes,
  CODE_TTL_MS
};

module.exports = {
  authorize,
  token,
  userinfo,
  _testing
};
