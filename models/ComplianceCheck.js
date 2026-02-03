/**
 * ComplianceCheck Model
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Constants
const REGULATION_TYPES = ['GDPR', 'HIPAA', 'SOX', 'CCPA'];
const COMPLIANCE_STATUSES = ['Compliant', 'Non-Compliant'];
const ID_FORMAT = /^[A-Z0-9-]+$/;
const MAX_DETAILS_LENGTH = 1000;
const DEFAULT_EXPIRY_DAYS = 365;

// Utility Functions
const calculateAge = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return null;
    return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
};

const normalizeRegulationType = (type) => {
    if (!type || typeof type !== 'string') return '';
    return type.trim().toUpperCase();
};

// Validation functions
const validateCheckId = (id) => {
    if (!id) return { valid: false, message: 'CheckID is required' };
    if (!ID_FORMAT.test(id)) {
        return { valid: false, message: 'CheckID must contain only uppercase letters, numbers, and hyphens' };
    }
    return { valid: true };
};

const validateSPVID = (id) => {
    if (!id) return { valid: false, message: 'SPVID is required' };
    if (!ID_FORMAT.test(id)) {
        return { valid: false, message: 'SPVID must contain only uppercase letters, numbers, and hyphens' };
    }
    return { valid: true };
};

const validateRegulationType = (type) => {
    if (!type) return { valid: false, message: 'RegulationType is required' };
    const normalized = normalizeRegulationType(type);
    if (!REGULATION_TYPES.includes(normalized)) {
        return { valid: false, message: `RegulationType must be one of: ${REGULATION_TYPES.join(', ')}` };
    }
    return { valid: true };
};

const validateStatus = (status) => {
    if (!status) return { valid: false, message: 'Status is required' };
    if (!COMPLIANCE_STATUSES.includes(status)) {
        return { valid: false, message: `Status must be one of: ${COMPLIANCE_STATUSES.join(', ')}` };
    }
    return { valid: true };
};

const validateTimestamp = (timestamp) => {
    if (!timestamp) return { valid: false, message: 'Timestamp is required' };
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) {
        return { valid: false, message: 'Timestamp must be a valid date' };
    }
    if (date > new Date()) {
        return { valid: false, message: 'Timestamp cannot be in the future' };
    }
    return { valid: true };
};

const validateDetails = (details) => {
    if (details && details.length > MAX_DETAILS_LENGTH) {
        return { valid: false, message: `Details cannot be longer than ${MAX_DETAILS_LENGTH} characters` };
    }
    return { valid: true };
};

const validateComplianceCheck = (data) => {
    const errors = [];

    const checkIdResult = validateCheckId(data.CheckID);
    if (!checkIdResult.valid) errors.push(checkIdResult.message);

    const spvIdResult = validateSPVID(data.SPVID);
    if (!spvIdResult.valid) errors.push(spvIdResult.message);

    const regTypeResult = validateRegulationType(data.RegulationType);
    if (!regTypeResult.valid) errors.push(regTypeResult.message);

    const statusResult = validateStatus(data.Status);
    if (!statusResult.valid) errors.push(statusResult.message);

    const timestampResult = validateTimestamp(data.Timestamp);
    if (!timestampResult.valid) errors.push(timestampResult.message);

    const detailsResult = validateDetails(data.Details);
    if (!detailsResult.valid) errors.push(detailsResult.message);

    if (!data.LastCheckedBy) {
        errors.push('LastCheckedBy is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// Schema definition (for documentation)
const schema = {
    _id: { type: 'string', required: true },
    CheckID: { type: 'string', required: true, unique: true },
    SPVID: { type: 'string', required: true },
    RegulationType: { type: 'string', required: true, enum: REGULATION_TYPES },
    Status: { type: 'string', required: true, enum: COMPLIANCE_STATUSES },
    Details: { type: 'string', maxLength: MAX_DETAILS_LENGTH },
    Timestamp: { type: 'date', required: true },
    LastCheckedBy: { type: 'string', required: true },
    CreatedAt: { type: 'date' },
    UpdatedAt: { type: 'date' }
};

// Create base model
const baseModel = createModel('compliance_checks', schema);

// Extended model with custom methods
const ComplianceCheck = {
    ...baseModel,

    /**
     * Create a new compliance check with validation
     * @param {Object} data - Compliance check data
     * @returns {Object} Created compliance check
     */
    async create(data) {
        // Validate data
        const validation = validateComplianceCheck(data);
        if (!validation.valid) {
            const error = new Error(validation.errors.join(', '));
            error.name = 'ValidationError';
            throw error;
        }

        // Check for duplicate CheckID
        const existing = await baseModel.findOne({ CheckID: data.CheckID });
        if (existing) {
            const error = new Error('A compliance check with this CheckID already exists');
            error.name = 'DuplicateError';
            throw error;
        }

        // Normalize regulation type
        const normalizedData = {
            ...data,
            RegulationType: normalizeRegulationType(data.RegulationType),
            Details: data.Details ? data.Details.trim() : undefined,
            Timestamp: data.Timestamp instanceof Date
                ? data.Timestamp.toISOString()
                : new Date(data.Timestamp).toISOString(),
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
        };

        return baseModel.create(normalizedData);
    },

    /**
     * Find non-compliant records
     * @returns {Array} Non-compliant compliance checks
     */
    async findNonCompliant() {
        try {
            const results = await baseModel.find({ Status: 'Non-Compliant' });
            return results.sort((a, b) => {
                const dateA = new Date(a.Timestamp);
                const dateB = new Date(b.Timestamp);
                return dateB - dateA;
            });
        } catch (error) {
            return [];
        }
    },

    /**
     * Find by regulation type
     * @param {string} regulationType - Regulation type to filter by
     * @returns {Array} Matching compliance checks
     */
    async findByRegulation(regulationType) {
        try {
            const normalizedType = normalizeRegulationType(regulationType);
            if (!normalizedType || !REGULATION_TYPES.includes(normalizedType)) {
                return [];
            }
            const results = await baseModel.find({ RegulationType: normalizedType });
            return results.sort((a, b) => {
                const dateA = new Date(a.Timestamp);
                const dateB = new Date(b.Timestamp);
                return dateB - dateA;
            });
        } catch (error) {
            return [];
        }
    },

    /**
     * Calculate compliance age (virtual)
     * @param {Object} doc - Compliance check document
     * @returns {number|null} Age in days
     */
    getComplianceAge(doc) {
        return calculateAge(doc.Timestamp);
    },

    /**
     * Check if compliance check is expired
     * @param {Object} doc - Compliance check document
     * @param {number} daysThreshold - Number of days threshold
     * @returns {boolean} True if expired
     */
    isExpired(doc, daysThreshold = DEFAULT_EXPIRY_DAYS) {
        const age = calculateAge(doc.Timestamp);
        return age === null ? true : age > daysThreshold;
    },

    /**
     * Transform document for JSON response
     * @param {Object} doc - Document to transform
     * @returns {Object} Transformed document
     */
    toJSON(doc) {
        if (!doc) return null;
        const { _id, __v, ...rest } = doc;
        return {
            ...rest,
            complianceAge: calculateAge(doc.Timestamp)
        };
    },

    // Expose constants
    REGULATION_TYPES,
    COMPLIANCE_STATUSES,
    DEFAULT_EXPIRY_DAYS,

    // Expose validation functions
    validateComplianceCheck,
    normalizeRegulationType
};

module.exports = ComplianceCheck;
module.exports.REGULATION_TYPES = REGULATION_TYPES;
module.exports.COMPLIANCE_STATUSES = COMPLIANCE_STATUSES;
