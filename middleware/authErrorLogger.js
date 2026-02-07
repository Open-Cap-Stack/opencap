/**
 * Authentication Error Logger Middleware
 * Issue #250: Fix 401 Unauthorized errors on Valuations page
 *
 * Provides detailed logging for authentication failures to help debug 401 errors
 */

/**
 * Log authentication error with context
 *
 * @param {Object} req - Express request object
 * @param {string} errorType - Type of authentication error
 * @param {Object} details - Additional error details
 */
const logAuthError = (req, errorType, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    errorType,
    method: req.method,
    path: req.path,
    url: req.url,
    ip: req.ip || (req.connection && req.connection.remoteAddress),
    userAgent: req.get('user-agent'),
    hasAuthHeader: !!req.headers.authorization,
    authHeaderPrefix: req.headers.authorization
      ? req.headers.authorization.substring(0, 10) + '...'
      : 'none',
    ...details
  };

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUTH ERROR]', JSON.stringify(logEntry, null, 2));
  }

  // In production, you would send this to your logging service
  // Example: sendToLoggingService(logEntry);

  return logEntry;
};

/**
 * Enhanced authentication middleware with error logging
 *
 * Wraps the standard authenticateToken middleware to add logging
 */
const authenticateWithLogging = (authenticateToken) => {
  return async (req, res, next) => {
    // Store original json method to intercept error responses
    const originalJson = res.json.bind(res);

    // Intercept json responses to log 401 errors
    res.json = function (body) {
      if (res.statusCode === 401) {
        // Extract error type from response body
        const errorType = body.message || 'Unknown authentication error';

        // Log the authentication error
        logAuthError(req, errorType, {
          responseBody: body,
          statusCode: res.statusCode
        });
      }

      return originalJson(body);
    };

    // Call the original authentication middleware
    return authenticateToken(req, res, next);
  };
};

/**
 * Extract detailed token information for debugging (without exposing sensitive data)
 *
 * @param {string} token - JWT token
 * @returns {Object} - Safe token information
 */
const getTokenDebugInfo = (token) => {
  if (!token) {
    return { error: 'No token provided' };
  }

  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return {
        error: 'Invalid token format',
        partsCount: parts.length
      };
    }

    // Decode header and payload (not verifying signature)
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return {
      header,
      payload: {
        userId: payload.userId || 'missing',
        email: payload.email || 'missing',
        role: payload.role || 'missing',
        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'missing',
        iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'missing',
        isExpired: payload.exp ? Date.now() > payload.exp * 1000 : 'unknown'
      },
      signatureLength: parts[2].length
    };
  } catch (error) {
    return {
      error: 'Failed to decode token',
      message: error.message
    };
  }
};

/**
 * Debug endpoint to check token validity
 * Route: GET /api/v1/auth/debug-token
 *
 * This endpoint helps frontend developers debug authentication issues
 */
const debugTokenEndpoint = (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(200).json({
      success: false,
      debug: {
        hasAuthHeader: false,
        message: 'No Authorization header found',
        headers: Object.keys(req.headers)
      }
    });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(200).json({
      success: false,
      debug: {
        hasAuthHeader: true,
        hasBearer: false,
        message: 'Authorization header does not start with "Bearer "',
        authHeaderPrefix: authHeader.substring(0, 20)
      }
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(200).json({
      success: false,
      debug: {
        hasAuthHeader: true,
        hasBearer: true,
        hasToken: false,
        message: 'Token is empty after "Bearer "'
      }
    });
  }

  const tokenInfo = getTokenDebugInfo(token);

  return res.status(200).json({
    success: true,
    debug: {
      hasAuthHeader: true,
      hasBearer: true,
      hasToken: true,
      tokenInfo,
      message: 'Token structure is valid'
    }
  });
};

module.exports = {
  logAuthError,
  authenticateWithLogging,
  getTokenDebugInfo,
  debugTokenEndpoint
};
