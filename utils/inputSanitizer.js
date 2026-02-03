/**
 * Input Sanitization Utilities
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Provides defense-in-depth security measures for input validation
 * and sanitization to prevent injection attacks.
 *
 * IMPORTANT: This application uses ZeroDB API which provides built-in
 * protection against injection attacks. These utilities add an extra
 * layer of validation as a security best practice.
 */

const validator = require('validator');

/**
 * Validate UUID format (used by ZeroDB for IDs)
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid UUID
 */
function isValidObjectId(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }

    // UUID v4 format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Also accept MongoDB-style ObjectId for backwards compatibility
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    // Also accept custom prefixed IDs (user_xxx, company_xxx, etc.)
    const prefixedIdRegex = /^[a-z_]+_[0-9a-f-]{36}$/i;

    return uuidRegex.test(id) || objectIdRegex.test(id) || prefixedIdRegex.test(id);
}

/**
 * Sanitize query object by removing dangerous operators
 * @param {Object} query - Query object to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitized query object
 */
function sanitizeMongoQuery(query, options = {}) {
    const {
        allowOperators = false,
        allowedOperators = [],
        maxDepth = 3,
        currentDepth = 0
    } = options;

    if (typeof query !== 'object' || query === null) {
        return {};
    }

    if (currentDepth > maxDepth) {
        return {};
    }

    if (Array.isArray(query)) {
        return query.map(item =>
            sanitizeMongoQuery(item, { ...options, currentDepth: currentDepth + 1 })
        );
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(query)) {
        if (key.startsWith('$')) {
            const dangerousOperators = ['$where', '$function', '$accumulator', '$expr'];

            if (dangerousOperators.includes(key)) {
                console.warn(`Blocked dangerous operator: ${key}`);
                continue;
            }

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
                console.warn(`Blocked operator in query: ${key}`);
                continue;
            } else {
                sanitized[key] = sanitizeMongoQuery(value, {
                    ...options,
                    currentDepth: currentDepth + 1
                });
            }
        } else {
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

    if (trim) {
        sanitized = sanitized.trim();
    }

    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    if (!allowHtml) {
        sanitized = validator.escape(sanitized);
    }

    if (!allowSpecialChars) {
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

    const normalized = validator.normalizeEmail(email, {
        all_lowercase: true,
        gmail_remove_dots: false,
        gmail_remove_subaddress: false,
        outlookdotcom_remove_subaddress: false,
        yahoo_remove_subaddress: false,
        icloud_remove_subaddress: false
    });

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
        itemSanitizer = null,
        allowEmpty = true
    } = options;

    if (!Array.isArray(input)) {
        if (input === null || input === undefined) {
            return allowEmpty ? [] : null;
        }
        input = [input];
    }

    let sanitized = input.slice(0, maxLength);

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
        if (key.startsWith('$')) {
            console.warn(`Blocked operator in request body: ${key}`);
            continue;
        }

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
        if (key.startsWith('$') || key.startsWith('_')) {
            console.warn(`Blocked special parameter: ${key}`);
            continue;
        }

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
                if (typeof value === 'string') {
                    sanitized[key] = sanitizeString(value, {
                        maxLength: 100,
                        allowSpecialChars: false
                    });
                }
                break;

            case 'fields':
            case 'select':
                if (typeof value === 'string') {
                    sanitized[key] = sanitizeString(value, {
                        maxLength: 500,
                        allowSpecialChars: false
                    });
                }
                break;

            default:
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
