/**
 * Input Validation Middleware
 *
 * Express middleware for validating and sanitizing request inputs
 * to prevent injection attacks and ensure data integrity.
 *
 * Provides defense-in-depth security alongside Mongoose ORM's
 * built-in protections.
 */

const {
  sanitizeMongoQuery,
  sanitizeRequestBody,
  sanitizeQueryParams,
  isValidObjectId
} = require('../utils/inputSanitizer');

/**
 * Middleware to sanitize request body
 * @param {Object} schema - Optional validation schema
 * @returns {Function} Express middleware function
 */
function sanitizeBody(schema = {}) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      try {
        req.body = sanitizeRequestBody(req.body, schema);
        next();
      } catch (error) {
        console.error('Error sanitizing request body:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid request body format'
        });
      }
    } else {
      next();
    }
  };
}

/**
 * Middleware to sanitize query parameters
 * @returns {Function} Express middleware function
 */
function sanitizeQuery() {
  return (req, res, next) => {
    if (req.query && typeof req.query === 'object') {
      try {
        req.query = sanitizeQueryParams(req.query);
        next();
      } catch (error) {
        console.error('Error sanitizing query parameters:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters'
        });
      }
    } else {
      next();
    }
  };
}

/**
 * Middleware to validate ObjectId parameters
 * @param {string} paramName - Name of the parameter to validate
 * @returns {Function} Express middleware function
 */
function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({
        success: false,
        error: `Missing required parameter: ${paramName}`
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
    }

    next();
  };
}

/**
 * Middleware to prevent MongoDB operator injection in query
 * @param {Object} options - Sanitization options
 * @returns {Function} Express middleware function
 */
function preventOperatorInjection(options = {}) {
  return (req, res, next) => {
    try {
      // Sanitize query parameters
      if (req.query && typeof req.query === 'object') {
        req.query = sanitizeMongoQuery(req.query, {
          allowOperators: false,
          ...options
        });
      }

      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        // Check for operators at root level
        const hasOperators = Object.keys(req.body).some(key => key.startsWith('$'));
        if (hasOperators) {
          console.warn('Blocked request with MongoDB operators in body', {
            ip: req.ip,
            path: req.path,
            method: req.method
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid request format'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error preventing operator injection:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
    }
  };
}

/**
 * Middleware to log potential injection attempts
 * @returns {Function} Express middleware function
 */
function logInjectionAttempts() {
  return (req, res, next) => {
    const suspiciousPatterns = [
      /\$where/i,
      /\$function/i,
      /DROP\s+TABLE/i,
      /DELETE\s+FROM/i,
      /INSERT\s+INTO/i,
      /UPDATE\s+\w+\s+SET/i,
      /UNION\s+SELECT/i,
      /--\s*$/,
      /\/\*.*\*\//,
      /'.*OR.*'.*=.*'/i
    ];

    const checkForInjection = (obj, path = '') => {
      if (typeof obj === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(obj)) {
            console.warn('Potential injection attempt detected', {
              ip: req.ip,
              path: req.path,
              method: req.method,
              field: path,
              pattern: pattern.toString(),
              value: obj.substring(0, 100), // Log first 100 chars
              userAgent: req.get('user-agent'),
              timestamp: new Date().toISOString()
            });
            return true;
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (checkForInjection(value, `${path}.${key}`)) {
            return true;
          }
        }
      }
      return false;
    };

    // Check query parameters
    checkForInjection(req.query, 'query');

    // Check request body
    checkForInjection(req.body, 'body');

    // Check URL parameters
    checkForInjection(req.params, 'params');

    next();
  };
}

/**
 * Middleware to enforce input size limits
 * @param {Object} options - Size limit options
 * @returns {Function} Express middleware function
 */
function enforceSizeLimits(options = {}) {
  const {
    maxBodySize = 1024 * 1024, // 1MB default
    maxQueryParams = 50,
    maxStringLength = 10000,
    maxArrayLength = 1000
  } = options;

  return (req, res, next) => {
    try {
      // Check body size
      if (req.body) {
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize > maxBodySize) {
          return res.status(413).json({
            success: false,
            error: 'Request body too large'
          });
        }
      }

      // Check number of query parameters
      if (req.query && Object.keys(req.query).length > maxQueryParams) {
        return res.status(400).json({
          success: false,
          error: 'Too many query parameters'
        });
      }

      // Check string and array lengths recursively
      const checkLimits = (obj) => {
        if (typeof obj === 'string' && obj.length > maxStringLength) {
          return false;
        }
        if (Array.isArray(obj) && obj.length > maxArrayLength) {
          return false;
        }
        if (typeof obj === 'object' && obj !== null) {
          for (const value of Object.values(obj)) {
            if (!checkLimits(value)) {
              return false;
            }
          }
        }
        return true;
      };

      if (req.body && !checkLimits(req.body)) {
        return res.status(400).json({
          success: false,
          error: 'Input exceeds maximum allowed length'
        });
      }

      next();
    } catch (error) {
      console.error('Error enforcing size limits:', error);
      return res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
    }
  };
}

/**
 * Middleware to validate pagination parameters
 * @returns {Function} Express middleware function
 */
function validatePagination() {
  return (req, res, next) => {
    // Set defaults and validate
    if (req.query.page) {
      const page = parseInt(req.query.page, 10);
      req.query.page = isNaN(page) || page < 1 ? 1 : Math.min(page, 10000);
    }

    if (req.query.limit) {
      const limit = parseInt(req.query.limit, 10);
      req.query.limit = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100);
    }

    if (req.query.skip) {
      const skip = parseInt(req.query.skip, 10);
      req.query.skip = isNaN(skip) || skip < 0 ? 0 : Math.min(skip, 100000);
    }

    next();
  };
}

/**
 * Middleware to prevent regex injection (ReDoS)
 * @returns {Function} Express middleware function
 */
function preventRegexInjection() {
  return (req, res, next) => {
    const checkRegex = (obj) => {
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          // Check for $regex operator
          if (key === '$regex') {
            // Block complex patterns that could cause ReDoS
            const dangerousPatterns = [
              /\(\w+\+?\)\*/,  // (a+)*
              /\(\w+\*?\)\+/,  // (a*)+
              /\(\w+\|\w+\)\*/,  // (a|b)*
              /\(\.\*?\)\+/,   // (.*)+
              /\(\.\+?\)\*/    // (.+)*
            ];

            const regexString = typeof value === 'string' ? value : value.toString();
            for (const pattern of dangerousPatterns) {
              if (pattern.test(regexString)) {
                console.warn('Blocked potential ReDoS pattern', {
                  ip: req.ip,
                  path: req.path,
                  pattern: regexString
                });
                return false;
              }
            }
          } else if (typeof value === 'object') {
            if (!checkRegex(value)) {
              return false;
            }
          }
        }
      }
      return true;
    };

    if (req.query && !checkRegex(req.query)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query pattern'
      });
    }

    if (req.body && !checkRegex(req.body)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request pattern'
      });
    }

    next();
  };
}

/**
 * Combined security middleware stack
 * Applies all security validations in the correct order
 */
const securityMiddleware = [
  logInjectionAttempts(),
  sanitizeQuery(),
  preventOperatorInjection(),
  enforceSizeLimits(),
  validatePagination(),
  preventRegexInjection()
];

module.exports = {
  sanitizeBody,
  sanitizeQuery,
  validateObjectId,
  preventOperatorInjection,
  logInjectionAttempts,
  enforceSizeLimits,
  validatePagination,
  preventRegexInjection,
  securityMiddleware
};
