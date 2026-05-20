/**
 * Plugin Auth Controller
 * Issue #505: OAuth 2.0 authorization server for claude.ai plugin auth
 * Issue #507: Add refresh token support for plugin store submission
 *
 * Implements the OAuth 2.0 authorization code flow for AI plugin integrations.
 * Authorization codes are stored in-memory with a 5-minute TTL.
 * Access tokens are standard JWTs compatible with the rest of the API.
 * Refresh tokens are opaque tokens stored in-memory with a 30-day TTL.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// In-memory authorization code store: Map<code, { userId, email, companyId, redirectUri, expiresAt }>
const authorizationCodes = new Map();
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory refresh token store: Map<token, { userId, email, companyId, role, expiresAt }>
const refreshTokens = new Map();
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Periodic cleanup of expired codes and refresh tokens (every 2 minutes)
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
  for (const [token, data] of refreshTokens) {
    if (data.expiresAt <= now) {
      refreshTokens.delete(token);
      purged++;
    }
  }
  if (purged > 0) {
    console.log(`[PluginAuth] Purged ${purged} expired tokens/codes`);
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
 * Generates a new refresh token and stores it in the in-memory map.
 * Returns the opaque token string.
 */
function generateRefreshToken(userData) {
  const token = crypto.randomBytes(48).toString('hex');
  refreshTokens.set(token, {
    userId: userData.userId,
    email: userData.email,
    companyId: userData.companyId,
    role: userData.role,
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS
  });
  return token;
}

/**
 * Issues a JWT access token for the given user data.
 * Returns { accessToken, expiresIn }.
 */
function issueAccessToken(userData) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return null;
  }

  const expiresIn = 3600; // 1 hour
  const accessToken = jwt.sign(
    {
      userId: userData.userId,
      email: userData.email,
      companyId: userData.companyId,
      role: userData.role,
      source: 'plugin'
    },
    jwtSecret,
    { expiresIn }
  );

  return { accessToken, expiresIn };
}

/**
 * POST /api/v1/auth/plugin/token
 *
 * Handles two grant types:
 * - authorization_code: Exchanges an authorization code for access + refresh tokens.
 * - refresh_token: Exchanges a refresh token for a new access + refresh token (rotation).
 */
const token = (req, res) => {
  try {
    const { code, client_id, client_secret, redirect_uri, grant_type, refresh_token } = req.body;

    // Validate grant_type
    const validGrantTypes = ['authorization_code', 'refresh_token'];
    if (grant_type && !validGrantTypes.includes(grant_type)) {
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

    // Handle refresh_token grant type
    if (grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(req, res, refresh_token);
    }

    // Handle authorization_code grant type (default)
    return handleAuthorizationCodeGrant(req, res, code, redirect_uri);
  } catch (error) {
    console.error('[PluginAuth] Token exchange error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handles the authorization_code grant type.
 */
function handleAuthorizationCodeGrant(req, res, code, redirect_uri) {
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

  // Code is single-use -- delete it immediately
  authorizationCodes.delete(code);

  // Issue JWT access token
  const tokenResult = issueAccessToken(codeData);
  if (!tokenResult) {
    return res.status(500).json({ error: 'JWT secret not configured' });
  }

  // Issue refresh token
  const newRefreshToken = generateRefreshToken(codeData);

  return res.status(200).json({
    access_token: tokenResult.accessToken,
    token_type: 'bearer',
    expires_in: tokenResult.expiresIn,
    refresh_token: newRefreshToken
  });
}

/**
 * Handles the refresh_token grant type with token rotation.
 */
function handleRefreshTokenGrant(req, res, refreshToken) {
  if (!refreshToken) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  const tokenData = refreshTokens.get(refreshToken);
  if (!tokenData) {
    return res.status(400).json({ error: 'Invalid or expired refresh token' });
  }

  // Check expiration
  if (tokenData.expiresAt <= Date.now()) {
    refreshTokens.delete(refreshToken);
    return res.status(400).json({ error: 'Refresh token has expired' });
  }

  // Token rotation: invalidate the old refresh token
  refreshTokens.delete(refreshToken);

  // Issue new access token
  const tokenResult = issueAccessToken(tokenData);
  if (!tokenResult) {
    return res.status(500).json({ error: 'JWT secret not configured' });
  }

  // Issue new refresh token (rotation)
  const newRefreshToken = generateRefreshToken(tokenData);

  return res.status(200).json({
    access_token: tokenResult.accessToken,
    token_type: 'bearer',
    expires_in: tokenResult.expiresIn,
    refresh_token: newRefreshToken
  });
}

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
  refreshTokens,
  CODE_TTL_MS,
  REFRESH_TOKEN_TTL_MS
};

module.exports = {
  authorize,
  token,
  userinfo,
  _testing
};
