/**
 * Document Access Validation Middleware
 *
 * Validates and sanitizes document access requests to prevent:
 * - Missing required fields
 * - Invalid data types
 * - SQL/NoSQL injection attempts
 * - XSS attacks
 * - Invalid enum values
 * - Immutable field updates
 */

const VALID_ACCESS_LEVELS = ['Read', 'Write', 'Admin'];
const MAX_STRING_LENGTH = 500;
const ALLOWED_UPDATE_FIELDS = ['AccessLevel', 'Permissions'];

/**
 * Check if a string contains potentially malicious content
 * @param {string} str - String to validate
 * @returns {boolean} True if string is safe
 */
function isSafeString(str) {
  // Check for SQL injection patterns
  const sqlPatterns = [
    /;.*DROP/i,
    /;.*DELETE/i,
    /;.*UPDATE/i,
    /;.*INSERT/i,
    /'.*OR.*'/i,
    /--.*$/,
    /\/\*.*\*\//
  ];

  // Check for XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers
    /<img[^>]+src/i
  ];

  const allPatterns = [...sqlPatterns, ...xssPatterns];

  for (const pattern of allPatterns) {
    if (pattern.test(str)) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that field is a non-empty string
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {Object|null} Error object or null if valid
 */
function validateRequiredString(value, fieldName) {
  // Check for null or undefined
  if (value === null || value === undefined) {
    return {
      success: false,
      error: `${fieldName} is required`,
      field: fieldName
    };
  }

  // Check type
  if (typeof value !== 'string') {
    return {
      success: false,
      error: `${fieldName} must be a valid string`,
      field: fieldName
    };
  }

  // Check if empty or whitespace only
  if (value.trim().length === 0) {
    return {
      success: false,
      error: `${fieldName} is required`,
      field: fieldName
    };
  }

  // Check length
  if (value.length > MAX_STRING_LENGTH) {
    return {
      success: false,
      error: `${fieldName} exceeds maximum length of ${MAX_STRING_LENGTH} characters`,
      field: fieldName
    };
  }

  // Check for malicious content
  if (!isSafeString(value)) {
    return {
      success: false,
      error: `${fieldName} contains invalid characters`,
      field: fieldName
    };
  }

  return null;
}

/**
 * Validate AccessLevel field
 * @param {any} value - AccessLevel value
 * @returns {Object|null} Error object or null if valid
 */
function validateAccessLevel(value, required = true) {
  if (value === undefined || value === null) {
    if (required) {
      return {
        success: false,
        error: 'AccessLevel is required',
        field: 'AccessLevel'
      };
    }
    return null;
  }

  if (typeof value !== 'string') {
    return {
      success: false,
      error: 'AccessLevel must be a valid string',
      field: 'AccessLevel'
    };
  }

  if (!VALID_ACCESS_LEVELS.includes(value)) {
    return {
      success: false,
      error: `AccessLevel must be one of: ${VALID_ACCESS_LEVELS.join(', ')}`,
      field: 'AccessLevel'
    };
  }

  return null;
}

/**
 * Check for dangerous field names
 * @param {Object} body - Request body
 * @returns {boolean} True if contains dangerous fields
 */
function hasDangerousFields(body) {
  const dangerousFields = ['$where', '$function', '__proto__', 'constructor', 'prototype'];

  for (const key of Object.keys(body)) {
    if (key.startsWith('$') || dangerousFields.includes(key)) {
      return true;
    }
  }

  return false;
}

/**
 * Middleware to validate document access creation requests
 */
function validateDocumentAccessCreation(req, res, next) {
  try {
    const { body } = req;

    // Check for dangerous field names
    if (hasDangerousFields(body)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid field names detected'
      });
    }

    // Validate User (required)
    const userError = validateRequiredString(body.User, 'User');
    if (userError) {
      return res.status(400).json(userError);
    }

    // Validate RelatedDocument (required)
    const docError = validateRequiredString(body.RelatedDocument, 'RelatedDocument');
    if (docError) {
      return res.status(400).json(docError);
    }

    // Validate AccessLevel (required)
    const accessLevelError = validateAccessLevel(body.AccessLevel, true);
    if (accessLevelError) {
      return res.status(400).json(accessLevelError);
    }

    // Sanitize string fields by trimming whitespace
    if (typeof body.User === 'string') {
      body.User = body.User.trim();
    }
    if (typeof body.RelatedDocument === 'string') {
      body.RelatedDocument = body.RelatedDocument.trim();
    }
    if (typeof body.Permissions === 'string') {
      body.Permissions = body.Permissions.trim();
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request format'
    });
  }
}

/**
 * Middleware to validate document access update requests
 */
function validateDocumentAccessUpdate(req, res, next) {
  try {
    const { body } = req;

    // Check for dangerous field names
    if (hasDangerousFields(body)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid field names detected'
      });
    }

    // Check if body is empty
    if (!body || Object.keys(body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Update body cannot be empty'
      });
    }

    // Check for attempts to update immutable fields
    if (body.User !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'User field cannot be updated'
      });
    }

    if (body.RelatedDocument !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'RelatedDocument field cannot be updated'
      });
    }

    // Check if there are any valid fields to update
    const hasValidFields = Object.keys(body).some(key =>
      ALLOWED_UPDATE_FIELDS.includes(key)
    );

    if (!hasValidFields) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Validate AccessLevel if provided
    if (body.AccessLevel !== undefined) {
      const accessLevelError = validateAccessLevel(body.AccessLevel, false);
      if (accessLevelError) {
        return res.status(400).json(accessLevelError);
      }
    }

    // Validate Permissions if provided
    if (body.Permissions !== undefined && typeof body.Permissions === 'string') {
      if (body.Permissions.length > MAX_STRING_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Permissions exceeds maximum length of ${MAX_STRING_LENGTH} characters`,
          field: 'Permissions'
        });
      }
      body.Permissions = body.Permissions.trim();
    }

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request format'
    });
  }
}

module.exports = {
  validateDocumentAccessCreation,
  validateDocumentAccessUpdate,
  // Export for testing
  VALID_ACCESS_LEVELS,
  validateRequiredString,
  validateAccessLevel,
  isSafeString
};
