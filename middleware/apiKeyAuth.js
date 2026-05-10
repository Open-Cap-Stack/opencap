/**
 * API Key Authentication Middleware
 * Issue #119: Create API Access for Partners
 *
 * Middleware for authenticating partner API requests:
 * - API key validation
 * - Permission checking
 * - Rate limiting
 * - IP whitelisting
 */

const partnerApiService = require('../services/partnerApiService');

// In-memory rate limit tracking (consider Redis for production)
const rateLimitStore = new Map();

/**
 * Parse API credentials from request
 * @param {Object} req - Express request
 * @returns {Object} Credentials { key, secret }
 */
const parseApiCredentials = (req) => {
  // Check Authorization header (format: ApiKey key:secret)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('ApiKey ')) {
    const credentials = authHeader.slice(7);
    const [key, secret] = credentials.split(':');
    if (key && secret) {
      return { key, secret };
    }
  }

  // Check X-API-Key and X-API-Secret headers
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];
  if (apiKey && apiSecret) {
    return { key: apiKey, secret: apiSecret };
  }

  return null;
};

/**
 * Authenticate API key middleware
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const credentials = parseApiCredentials(req);

    if (!credentials) {
      return res.status(401).json({
        error: 'API key required',
        code: 'MISSING_API_KEY'
      });
    }

    const { key, secret } = credentials;

    const result = await partnerApiService.validateApiKey(key, secret);

    if (!result.valid) {
      let code = 'INVALID_API_KEY';
      if (result.reason === 'API key is suspended') {
        code = 'API_KEY_SUSPENDED';
      } else if (result.reason === 'API key is revoked') {
        code = 'API_KEY_REVOKED';
      } else if (result.reason === 'API key has expired') {
        code = 'API_KEY_EXPIRED';
      }

      return res.status(401).json({
        error: result.reason,
        code
      });
    }

    // Attach API key info to request
    req.apiKey = result.apiKey;

    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Check API permission middleware factory
 * @param {string} requiredPermission - Required permission
 * @returns {Function} Middleware function
 */
const checkApiPermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'API key required',
        code: 'MISSING_API_KEY'
      });
    }

    const hasPermission = partnerApiService.checkPermission(req.apiKey, requiredPermission);

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: requiredPermission
      });
    }

    next();
  };
};

/**
 * Get rate limit key for tracking
 * @param {string} apiKeyId - API key ID
 * @param {string} windowType - 'minute' or 'hour'
 * @returns {string} Rate limit key
 */
const getRateLimitKey = (apiKeyId, windowType) => {
  const now = new Date();
  if (windowType === 'minute') {
    return `${apiKeyId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  }
  return `${apiKeyId}:${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
};

/**
 * Apply API rate limiting middleware
 */
const applyApiRateLimit = async (req, res, next) => {
  if (!req.apiKey) {
    // Skip rate limiting if no API key (will be handled by auth middleware)
    return next();
  }

  const { apiKeyId, rateLimit } = req.apiKey;
  const { requestsPerMinute, requestsPerHour } = rateLimit;

  // Get current usage
  const minuteKey = getRateLimitKey(apiKeyId, 'minute');
  const hourKey = getRateLimitKey(apiKeyId, 'hour');

  const minuteCount = (rateLimitStore.get(minuteKey) || 0) + 1;
  const hourCount = (rateLimitStore.get(hourKey) || 0) + 1;

  // Update counts
  rateLimitStore.set(minuteKey, minuteCount);
  rateLimitStore.set(hourKey, hourCount);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit-Minute', requestsPerMinute);
  res.setHeader('X-RateLimit-Remaining-Minute', Math.max(0, requestsPerMinute - minuteCount));
  res.setHeader('X-RateLimit-Limit-Hour', requestsPerHour);
  res.setHeader('X-RateLimit-Remaining-Hour', Math.max(0, requestsPerHour - hourCount));

  // Check rate limit
  const result = await partnerApiService.checkRateLimit(req.apiKey, { minuteCount, hourCount });

  if (!result.allowed) {
    res.setHeader('Retry-After', result.retryAfter);
    return res.status(429).json({
      error: result.reason,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfter
    });
  }

  next();
};

/**
 * Check if IP is in CIDR range
 * @param {string} ip - IP address to check
 * @param {string} cidr - CIDR notation (e.g., '10.0.0.0/8')
 * @returns {boolean} True if IP is in range
 */
const isIpInCidr = (ip, cidr) => {
  // Simple implementation for IPv4
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split('/');
  const mask = ~((1 << (32 - parseInt(bits, 10))) - 1);

  const ipToInt = (ipStr) => {
    const parts = ipStr.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  };

  try {
    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(range);
    return (ipInt & mask) === (rangeInt & mask);
  } catch {
    return false;
  }
};

/**
 * Check IP whitelist middleware
 */
const checkIpWhitelist = async (req, res, next) => {
  if (!req.apiKey) {
    return next();
  }

  const { ipWhitelist } = req.apiKey;

  // If no IP whitelist, allow all
  if (!ipWhitelist || ipWhitelist.length === 0) {
    return next();
  }

  // Get client IP
  const clientIp = req.ip || req.connection.remoteAddress || '';
  const normalizedIp = clientIp.replace('::ffff:', ''); // Handle IPv6-mapped IPv4

  // Check if IP is whitelisted
  const isAllowed = ipWhitelist.some(allowed => {
    if (allowed.includes('/')) {
      return isIpInCidr(normalizedIp, allowed);
    }
    return normalizedIp === allowed;
  });

  if (!isAllowed) {
    return res.status(403).json({
      error: 'IP address not allowed',
      code: 'IP_NOT_WHITELISTED'
    });
  }

  next();
};

/**
 * Cleanup old rate limit entries (call periodically)
 */
const cleanupRateLimitStore = () => {
  const now = new Date();
  const currentMinutePrefix = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
  const currentHourPrefix = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;

  for (const [key] of rateLimitStore) {
    if (!key.includes(currentMinutePrefix) && !key.includes(currentHourPrefix)) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupRateLimitStore, 60000).unref();

module.exports = {
  authenticateApiKey,
  checkApiPermission,
  applyApiRateLimit,
  checkIpWhitelist,
  parseApiCredentials,
  rateLimitStore
};
