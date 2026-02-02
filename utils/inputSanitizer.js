/**
 * Input Sanitization Utilities
 *
 * Provides defense-in-depth security measures for input validation
 * and sanitization to prevent injection attacks.
 *
 * IMPORTANT: This application uses Mongoose ORM and ZeroDB API which
 * provide built-in protection against SQL injection. These utilities
 * add an extra layer of validation as a security best practice.
 */

const mongoose = require('mongoose');
const validator = require('validator');

/**
 * Sanitize MongoDB query object by removing dangerous operators
 * @param {Object} query - Query object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized query object
 */
function sanitizeMongoQuery(query, options = {}) {
  const {
    allowOperators = false, // Allow MongoDB operators
    allowedOperators = [], // Specific operators to allow
    maxDepth = 3, // Maximum nesting depth
    currentDepth = 0
  } = options;

  // Handle non-object inputs
  if (typeof query !== 'object' || query === null) {
    return {};
  }

  // Prevent deep nesting attacks
  if (currentDepth > maxDepth) {
    return {};
  }

  // Handle arrays
  if (Array.isArray(query)) {
    return query.map(item =>
      sanitizeMongoQuery(item, { ...options, currentDepth: currentDepth + 1 })
    );
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(query)) {
    // Check if key is a MongoDB operator
    if (key.startsWith('$')) {
      // Dangerous operators that should always be blocked
      const dangerousOperators = ['$where', '$function', '$accumulator', '$expr'];

      if (dangerousOperators.includes(key)) {
        console.warn(`Blocked dangerous operator: ${key}`);
        continue;
      }

      // If operators are allowed, check whitelist
      if (allowOperators && allowedOperators.length > 0) {
        if (allowedOperators.includes(key)) {
          sanitized[key] = sanitizeMongoQuery(value, {
            ...options,
            currentDepth: currentDepth + 1
          });
        } else {
          console.warn(`Blocked non-whitelisted operator: ${key}`);
        }
      } else if (!allowOperators) {
        // Skip all operators if not explicitly allowed
        console.warn(`Blocked operator in query: ${key}`);
        continue;
      } else {
        // Allow all operators except dangerous ones
        sanitized[key] = sanitizeMongoQuery(value, {
          ...options,
          currentDepth: currentDepth + 1
        });
      }
    } else {
      // Regular field - sanitize value
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeMongoQuery(value, {
          ...options,
          currentDepth: currentDepth + 1
        });
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Validate ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
function sanitizeString(input, options = {}) {
  const {
    maxLength = 1000,
    allowHtml = false,
    allowSpecialChars = true,
    trim = true
  } = options;

  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML if not allowed
  if (!allowHtml) {
    sanitized = validator.escape(sanitized);
  }

  // Remove special SQL/NoSQL characters if needed
  if (!allowSpecialChars) {
    // Remove common injection characters
    sanitized = sanitized.replace(/['";\\${}]/g, '');
  }

  return sanitized;
}

/**
 * Sanitize numeric input
 * @param {*} input - Input to convert to number
 * @param {Object} options - Sanitization options
 * @returns {number|null} Sanitized number or null if invalid
 */
function sanitizeNumber(input, options = {}) {
  const {
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
    defaultValue = null,
    allowFloat = true
  } = options;

  // Handle various input types
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) {
      return defaultValue;
    }
  } else if (typeof input === 'string') {
    if (allowFloat) {
      input = parseFloat(input);
    } else {
      input = parseInt(input, 10);
    }

    if (isNaN(input)) {
      return defaultValue;
    }
  } else {
    return defaultValue;
  }

  // Enforce min/max bounds
  if (input < min) {
    input = min;
  }
  if (input > max) {
    input = max;
  }

  return input;
}

/**
 * Sanitize email input
 * @param {string} email - Email to sanitize
 * @returns {string|null} Sanitized email or null if invalid
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  // Normalize email
  const normalized = validator.normalizeEmail(email, {
    all_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
    icloud_remove_subaddress: false
  });

  // Validate email format
  if (!normalized || !validator.isEmail(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Sanitize array input
 * @param {*} input - Input to convert to array
 * @param {Object} options - Sanitization options
 * @returns {Array} Sanitized array
 */
function sanitizeArray(input, options = {}) {
  const {
    maxLength = 100,
    itemSanitizer = null, // Function to sanitize each item
    allowEmpty = true
  } = options;

  // Convert to array if not already
  if (!Array.isArray(input)) {
    if (input === null || input === undefined) {
      return allowEmpty ? [] : null;
    }
    input = [input];
  }

  // Limit array length
  let sanitized = input.slice(0, maxLength);

  // Sanitize each item if sanitizer provided
  if (itemSanitizer && typeof itemSanitizer === 'function') {
    sanitized = sanitized.map(item => itemSanitizer(item)).filter(item => item !== null);
  }

  return sanitized;
}

/**
 * Sanitize boolean input
 * @param {*} input - Input to convert to boolean
 * @param {*} defaultValue - Default value if invalid
 * @returns {boolean} Sanitized boolean
 */
function sanitizeBoolean(input, defaultValue = false) {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    const normalized = input.toLowerCase().trim();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }
    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  if (typeof input === 'number') {
    return input !== 0;
  }

  return defaultValue;
}

/**
 * Sanitize URL input
 * @param {string} url - URL to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string|null} Sanitized URL or null if invalid
 */
function sanitizeUrl(url, options = {}) {
  const {
    protocols = ['http', 'https'],
    requireProtocol = true,
    allowQueryComponents = true
  } = options;

  if (typeof url !== 'string') {
    return null;
  }

  // Validate URL format
  const isValid = validator.isURL(url, {
    protocols,
    require_protocol: requireProtocol,
    require_valid_protocol: true,
    allow_query_components: allowQueryComponents
  });

  if (!isValid) {
    return null;
  }

  return url;
}

/**
 * Sanitize date input
 * @param {*} input - Date input to sanitize
 * @param {*} defaultValue - Default value if invalid
 * @returns {Date|null} Sanitized date or default value
 */
function sanitizeDate(input, defaultValue = null) {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? defaultValue : input;
  }

  if (typeof input === 'string' || typeof input === 'number') {
    const date = new Date(input);
    return isNaN(date.getTime()) ? defaultValue : date;
  }

  return defaultValue;
}

/**
 * Sanitize enum input
 * @param {*} input - Input to validate against enum
 * @param {Array} allowedValues - Array of allowed values
 * @param {*} defaultValue - Default value if invalid
 * @returns {*} Sanitized enum value
 */
function sanitizeEnum(input, allowedValues, defaultValue = null) {
  if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
    return defaultValue;
  }

  if (allowedValues.includes(input)) {
    return input;
  }

  return defaultValue;
}

/**
 * Sanitize request body recursively
 * @param {Object} body - Request body to sanitize
 * @param {Object} schema - Validation schema
 * @returns {Object} Sanitized body
 */
function sanitizeRequestBody(body, schema = {}) {
  if (typeof body !== 'object' || body === null) {
    return {};
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(body)) {
    // Skip MongoDB operators at root level
    if (key.startsWith('$')) {
      console.warn(`Blocked operator in request body: ${key}`);
      continue;
    }

    // Apply schema-based sanitization if provided
    if (schema[key]) {
      const fieldSchema = schema[key];

      switch (fieldSchema.type) {
        case 'string':
          sanitized[key] = sanitizeString(value, fieldSchema.options || {});
          break;
        case 'number':
          sanitized[key] = sanitizeNumber(value, fieldSchema.options || {});
          break;
        case 'email':
          sanitized[key] = sanitizeEmail(value);
          break;
        case 'boolean':
          sanitized[key] = sanitizeBoolean(value, fieldSchema.default);
          break;
        case 'array':
          sanitized[key] = sanitizeArray(value, fieldSchema.options || {});
          break;
        case 'objectid':
          if (isValidObjectId(value)) {
            sanitized[key] = value;
          }
          break;
        case 'enum':
          sanitized[key] = sanitizeEnum(value, fieldSchema.values, fieldSchema.default);
          break;
        case 'date':
          sanitized[key] = sanitizeDate(value, fieldSchema.default);
          break;
        case 'url':
          sanitized[key] = sanitizeUrl(value, fieldSchema.options || {});
          break;
        case 'object':
          if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeRequestBody(value, fieldSchema.schema || {});
          }
          break;
        default:
          sanitized[key] = value;
      }
    } else {
      // No schema - apply basic sanitization
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeRequestBody(value, {});
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Sanitize query parameters
 * @param {Object} query - Query parameters to sanitize
 * @returns {Object} Sanitized query parameters
 */
function sanitizeQueryParams(query) {
  if (typeof query !== 'object' || query === null) {
    return {};
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(query)) {
    // Remove operators from query parameters
    if (key.startsWith('$') || key.startsWith('_')) {
      console.warn(`Blocked special parameter: ${key}`);
      continue;
    }

    // Sanitize common query parameters
    switch (key) {
      case 'limit':
      case 'skip':
      case 'page':
        sanitized[key] = sanitizeNumber(value, {
          min: 0,
          max: 1000,
          defaultValue: key === 'limit' ? 10 : 0,
          allowFloat: false
        });
        break;

      case 'sort':
        // Allow sorting but validate field names
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value, {
            maxLength: 100,
            allowSpecialChars: false
          });
        }
        break;

      case 'fields':
      case 'select':
        // Validate field projection
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value, {
            maxLength: 500,
            allowSpecialChars: false
          });
        }
        break;

      default:
        // General string sanitization
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value, { maxLength: 500 });
        } else if (typeof value === 'number') {
          sanitized[key] = sanitizeNumber(value);
        } else if (typeof value === 'boolean') {
          sanitized[key] = sanitizeBoolean(value);
        }
    }
  }

  return sanitized;
}

module.exports = {
  sanitizeMongoQuery,
  isValidObjectId,
  sanitizeString,
  sanitizeNumber,
  sanitizeEmail,
  sanitizeArray,
  sanitizeBoolean,
  sanitizeUrl,
  sanitizeDate,
  sanitizeEnum,
  sanitizeRequestBody,
  sanitizeQueryParams
};
