/**
 * Authentication Middleware
 *
 * [Feature] OCAE-208: Implement share class management endpoints
 * [Feature] OCAE-302: Implement role-based access control
 * [Feature] OCAE-204: Implement company management endpoints
 * [Bug] OCDI-302: Fix User Authentication Test Failures
 * [Bug] OCAE-206: Fix Permission & Role-Based Access Control Tests
 *
 * JWT-based authentication middleware for API routes with improved
 * reliability and token management. Uses ZeroDB as the primary database.
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const { promisify } = require('util');

// AINative API configuration for token validation
const AINATIVE_API_URL = process.env.AINATIVE_API_URL || process.env.ZERODB_BASE_URL || 'https://api.ainative.studio';

// Configuration constants
const JWT_VERIFICATION_TIMEOUT_MS = 5000; // 5 seconds timeout for JWT verification
const TOKEN_BLACKLIST_TTL = 3600; // 1 hour TTL for blacklisted tokens

// T2-4: Use in-memory token blacklist with TTL tracking
// Map<token, expiresAt> instead of a bare Set, so we can periodically purge expired entries
let tokenBlacklist = new Map();

// User lookup cache: Map<userId, { user, expiresAt }>
// Prevents a ZeroDB query on every authenticated request (critical for free-tier rate limits)
const USER_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const userCache = new Map();

// Periodic cleanup of stale user cache entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  let purged = 0;
  for (const [userId, entry] of userCache) {
    if (entry.expiresAt <= now) {
      userCache.delete(userId);
      purged++;
    }
  }
  if (purged > 0) {
    console.log(`[AuthMiddleware] Purged ${purged} stale user cache entries`);
  }
}, 5 * 60 * 1000).unref();

async function findUserCached(userId) {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > now) return cached.user;
  const user = await User.findOne({ userId });
  if (user) userCache.set(userId, { user, expiresAt: now + USER_CACHE_TTL_MS });
  return user;
}

// Periodic cleanup of expired blacklisted tokens (every 10 minutes)
const BLACKLIST_CLEANUP_INTERVAL = 10 * 60 * 1000;
setInterval(() => {
  if (tokenBlacklist instanceof Map) {
    const now = Date.now();
    let purged = 0;
    for (const [token, expiresAt] of tokenBlacklist) {
      if (expiresAt <= now) {
        tokenBlacklist.delete(token);
        purged++;
      }
    }
    if (purged > 0) {
      console.log(`[AuthMiddleware] Purged ${purged} expired tokens from blacklist (remaining: ${tokenBlacklist.size})`);
    }
  }
}, BLACKLIST_CLEANUP_INTERVAL).unref(); // .unref() so this doesn't prevent process exit

// Setup Redis client if available (conditionally loaded)
let redisClient = null;
try {
  // Only try to use Redis if the env var is set
  if (process.env.REDIS_URL) {
    // Dynamically import Redis to avoid issues in environments where it's not installed
    const redis = require('redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    
    // Log connection status
    redisClient.on('connect', () => console.log('Redis connected for token blacklisting'));
    redisClient.on('error', err => {
      console.error('Redis error:', err);
      // If Redis connection fails, fallback to memory
      redisClient = null;
    });
    
    // Connect to Redis
    redisClient.connect().catch(err => {
      console.error('Redis connection failed:', err);
      redisClient = null;
    });
  }
} catch (error) {
  console.error('Redis client initialization failed, using in-memory blacklist:', error);
  redisClient = null;
}

/**
 * Verifies the JWT token in the Authorization header
 * Enhanced with MongoDB retry logic and improved error handling
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Extract token from "Bearer TOKEN" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ message: 'Token is invalidated' });
    }
    
    // Verify token with timeout
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const decoded = await verifyTokenWithTimeout(
      token, 
      process.env.JWT_SECRET,
      JWT_VERIFICATION_TIMEOUT_MS
    );
    
    // Try to find or provision user in our database
    // Support both 'userId' and 'sub' (standard JWT claim) for user ID
    const tokenUserId = decoded.userId || decoded.sub;
    let user = await findUserCached(tokenUserId);

    // If user not found but token has user info, provision them
    if (!user && tokenUserId && decoded.email) {
      console.log(`Provisioning user from JWT: ${decoded.email}`);
      user = await provisionUserFromToken(decoded);
      // Cache the newly provisioned user
      if (user) userCache.set(tokenUserId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
    }

    // Agent tokens: type==='agent' in payload — authenticate without DB user lookup
    if (!user && decoded.type === 'agent') {
      req.user = {
        userId: tokenUserId,
        _id: tokenUserId,
        email: null,
        role: 'agent',
        capabilities: decoded.capabilities || [],
        companyId: decoded.company_id || null,
        isAgent: true,
      };
      req.token = token;
      return next();
    }

    // If still no user, check if token has role (test/admin tokens)
    if (!user && decoded.role) {
      req.user = {
        userId: tokenUserId,
        _id: tokenUserId,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
        companyId: decoded.companyId
      };
      req.token = token;
      return next();
    }

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    // Add user data to request
    // Trust JWT role over stored role — tokens signed with JWT_SECRET are authoritative
    const effectiveRole = decoded.role || user.role;
    req.user = {
      userId: user.userId,
      _id: user._id || user.userId,
      email: user.email,
      role: effectiveRole,
      permissions: user.permissions || [],
      companyId: user.companyId || decoded.companyId || null
    };
    
    // Attach token to request for potential blacklisting on logout
    req.token = token;
    
    // Continue with the request
    next();
  } catch (error) {
    // Preserve the original JWT error name before any async work that could
    // overwrite the error reference in scope.
    const originalErrorName = error.name;

    // If local JWT verification fails with a token-level error, attempt
    // AINative token validation as a fallback (tokens issued by AINative
    // are not signed with our JWT_SECRET).
    if (
      originalErrorName === 'JsonWebTokenError' ||
      originalErrorName === 'TokenExpiredError' ||
      originalErrorName === 'NotBeforeError'
    ) {
      try {
        // Extract token again for AINative validation
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;

        if (token) {
          const ainativeUser = await validateAINativeToken(token);

          // Provision or retrieve local user record
          const localUser = await provisionAINativeUser(ainativeUser);

          // Set user from local record (same shape as normal auth path)
          req.user = {
            userId: localUser.userId,
            _id: localUser._id || localUser.userId,
            email: localUser.email,
            role: localUser.role || 'user',
            permissions: localUser.permissions || [],
            companyId: localUser.companyId
          };

          req.token = token;
          return next();
        }
      } catch (ainativeError) {
        // AINative validation also failed — fall through to the 401 response
        // below using the *original* JWT error name.
        console.error('AINative token validation failed:', ainativeError.message);
      }
    }

    // Return the appropriate 4xx response based on the original error.
    // All JWT-level errors (invalid signature, expired, not-yet-valid, timeout)
    // are client errors and must never produce a 500.
    if (originalErrorName === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (
      originalErrorName === 'JsonWebTokenError' ||
      originalErrorName === 'NotBeforeError'
    ) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (originalErrorName === 'TokenVerificationTimeoutError') {
      return res.status(401).json({ message: 'Token verification timed out' });
    }

    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};

/**
 * Validate token against AINative API
 * Used when local JWT verification fails (for tokens issued by AINative)
 *
 * @param {string} token - JWT token to validate
 * @returns {Promise<Object>} - User data from AINative
 * @throws {Error} - On validation failure
 */
const validateAINativeToken = async (token) => {
  try {
    const response = await axios.get(`${AINATIVE_API_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    // AINative returns user object with id, email, name, etc.
    const ainativeUser = response.data;

    return {
      userId: ainativeUser.id,
      email: ainativeUser.email,
      name: ainativeUser.name,
      role: 'user', // Default role for AINative users
      permissions: [],
      isAINativeUser: true
    };
  } catch (error) {
    const ainativeError = new Error('AINative token validation failed');
    ainativeError.name = 'AINativeValidationError';
    ainativeError.originalError = error;
    throw ainativeError;
  }
};

/**
 * Provision user from decoded JWT token
 * Creates a local user record for users authenticated via JWT
 *
 * @param {Object} decoded - Decoded JWT payload
 * @returns {Promise<Object>} - Local user record
 */
const provisionUserFromToken = async (decoded) => {
  try {
    // Check if user already exists
    let localUser = await User.findByEmail(decoded.email);
    if (localUser) {
      await User.updateLastLogin(localUser.userId);
      return localUser;
    }

    console.log(`Creating new user from JWT: ${decoded.email}`);

    // Parse name
    const name = decoded.name || decoded.displayName || decoded.email.split('@')[0];
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newUser = await User.create({
      userId: decoded.userId,
      email: decoded.email,
      firstName: firstName,
      lastName: lastName,
      displayName: name,
      password: crypto.randomBytes(32).toString('hex'),
      role: decoded.role || 'user',
      status: 'active',
      permissions: User.getPermissionsForRole(decoded.role || 'user'),
      companyId: decoded.companyId || null,
      lastLogin: new Date().toISOString(),
      authProvider: 'jwt'
    });

    console.log(`User provisioned: ${newUser.email} (${newUser.userId})`);
    return newUser;
  } catch (error) {
    console.error('Failed to provision user from token:', error.message);
    return null;
  }
};

/**
 * Provision user on first AINative login
 * Creates a local user record for AINative authenticated users
 *
 * @param {Object} ainativeUser - User data from AINative validation
 * @returns {Promise<Object>} - Local user record
 */
const provisionAINativeUser = async (ainativeUser) => {
  try {
    // Check if user already exists by email
    let localUser = await User.findByEmail(ainativeUser.email);

    if (localUser) {
      // Existing user - update last login
      await User.updateLastLogin(localUser.userId);
      return localUser;
    }

    // First-time login - create new user record
    console.log(`Provisioning new user for AINative login: ${ainativeUser.email}`);

    // Parse name into first/last
    const nameParts = (ainativeUser.name || ainativeUser.email.split('@')[0]).split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    const newUser = await User.create({
      userId: ainativeUser.userId,
      email: ainativeUser.email,
      firstName: firstName,
      lastName: lastName,
      displayName: ainativeUser.name || ainativeUser.email.split('@')[0],
      password: crypto.randomBytes(32).toString('hex'), // Random — SSO users don't use password auth
      role: 'user',
      status: 'active',
      permissions: User.getPermissionsForRole('user'),
      profile: {
        bio: '',
        avatar: null,
        avatarThumbnail: null,
        phoneNumber: null,
        address: {}
      },
      lastLogin: new Date().toISOString(),
      authProvider: 'ainative',
      ainativeId: ainativeUser.userId
    });

    console.log(`Successfully provisioned user: ${newUser.email} (${newUser.userId})`);
    return newUser;
  } catch (error) {
    console.error('Failed to provision AINative user:', error.message);
    // Return basic user data if provisioning fails - don't block login
    return {
      userId: ainativeUser.userId,
      email: ainativeUser.email,
      name: ainativeUser.name,
      role: 'user',
      permissions: [],
      isAINativeUser: true,
      provisioningFailed: true
    };
  }
};

/**
 * Promise-based JWT verify with timeout
 *
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret to use for verification
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} - Decoded token payload
 * @throws {Error} - On verification failure or timeout
 */
const verifyTokenWithTimeout = (token, secret, timeoutMs) => {
  return new Promise((resolve, reject) => {
    // Set a timeout to reject the promise if verification takes too long
    const timeoutId = setTimeout(() => {
      const error = new Error('Token verification timed out');
      error.name = 'TokenVerificationTimeoutError';
      reject(error);
    }, timeoutMs);
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, secret);
      clearTimeout(timeoutId);
      resolve(decoded);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
};

/**
 * Alias for authenticateToken to maintain consistent naming across codebase
 * Used by company management routes (OCAE-204)
 */
const authenticate = authenticateToken;

/**
 * Check if a token is blacklisted
 * Uses Redis if available, otherwise falls back to in-memory Set
 * 
 * @param {string} token - JWT token to check
 * @returns {Promise<boolean>} - True if blacklisted, false otherwise
 */
const isTokenBlacklisted = async (token) => {
  // If Redis client exists and is ready, try to use it
  if (redisClient && redisClient.isReady) {
    try {
      // Check if token exists in Redis
      const result = await redisClient.get(`blacklist:${token}`);
      return result !== null;
    } catch (error) {
      console.error('Redis blacklist check failed:', error);
      // Fall back to in-memory blacklist
      const expiresAt = tokenBlacklist.get(token);
      return expiresAt !== undefined && expiresAt > Date.now();
    }
  } else {
    // Use in-memory blacklist with TTL check
    const expiresAt = tokenBlacklist.get(token);
    return expiresAt !== undefined && expiresAt > Date.now();
  }
};

/**
 * Check token blacklist - synchronous version for backward compatibility
 * @deprecated Use isTokenBlacklisted instead
 */
const checkTokenBlacklist = (token) => {
  // For backward compatibility, return synchronously from memory
  const expiresAt = tokenBlacklist.get(token);
  return expiresAt !== undefined && expiresAt > Date.now();
};

/**
 * Add token to blacklist
 * Uses Redis if available, otherwise falls back to in-memory Set
 * 
 * @param {string} token - JWT token to blacklist
 * @returns {Promise<boolean>} - True if successful
 */
const blacklistToken = async (token) => {
  try {
    // Always add to in-memory blacklist with TTL as a fallback
    tokenBlacklist.set(token, Date.now() + (TOKEN_BLACKLIST_TTL * 1000));
    
    // If Redis client exists and is ready, try to use it
    if (redisClient && redisClient.isReady) {
      try {
        // Add to Redis with TTL
        await redisClient.setEx(`blacklist:${token}`, TOKEN_BLACKLIST_TTL, '1');
        return true;
      } catch (error) {
        console.error('Redis blacklist add failed:', error);
        // Return true because we've already added to in-memory blacklist
        return true;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Token blacklisting failed:', error);
    return false;
  }
};

// Export all functions
module.exports = {
  authenticateToken,
  authenticate,
  checkTokenBlacklist,
  isTokenBlacklisted,
  blacklistToken,
  verifyTokenWithTimeout,
  validateAINativeToken,
  provisionAINativeUser,
  provisionUserFromToken
};
