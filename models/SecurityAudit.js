/**
 * Security Audit Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Stores security audit events for compliance reporting, threat analysis,
 * and security monitoring.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const EVENT_TYPES = [
    'auth.login.success',
    'auth.login.failure',
    'auth.logout',
    'auth.token.refresh',
    'auth.token.invalid',
    'auth.password.reset',
    'auth.unauthorized',
    'data.access',
    'data.modification',
    'data.deletion',
    'admin.action',
    'rbac.permission_denied',
    'security.rate_limit_exceeded',
    'security.suspicious_activity',
    'data.file_upload',
    'data.export_request',
    'admin.config_change'
];

const LEVELS = ['low', 'medium', 'high', 'critical'];

const securityAuditSchema = {
    eventId: { type: 'string', required: true, unique: true },
    eventType: { type: 'string', required: true, enum: EVENT_TYPES },
    level: { type: 'string', required: true, enum: LEVELS },
    timestamp: { type: 'date', required: true },
    userContext: {
        userId: { type: 'string' },
        userEmail: { type: 'string' },
        userRole: { type: 'string' },
        sessionId: { type: 'string' }
    },
    requestContext: {
        ip: { type: 'string', required: true },
        userAgent: { type: 'string' },
        method: { type: 'string' },
        url: { type: 'string' },
        headers: { type: 'object' }
    },
    details: { type: 'object', required: true },
    environment: { type: 'string', default: 'unknown' },
    nodeVersion: { type: 'string' },
    reviewed: { type: 'boolean', default: false },
    reviewedBy: { type: 'string' },
    reviewedAt: { type: 'date' },
    notes: { type: 'string' },
    riskScore: { type: 'number', min: 0, max: 100 },
    tags: { type: 'array' }
};

const baseModel = createModel('audit_logs', securityAuditSchema);

/**
 * Calculate risk score for an audit event
 * @param {Object} event - Security audit event
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(event) {
    let score = 0;

    // Base score by level
    const levelScores = {
        low: 10,
        medium: 30,
        high: 60,
        critical: 90
    };
    score += levelScores[event.level] || 0;

    // Event type modifiers
    const eventTypeModifiers = {
        'auth.login.failure': 5,
        'auth.unauthorized': 10,
        'security.suspicious_activity': 15,
        'admin.action': 5,
        'data.deletion': 10
    };
    score += eventTypeModifiers[event.eventType] || 0;

    // Time-based decay (recent events are higher risk)
    const eventTime = event.timestamp ? new Date(event.timestamp) : new Date();
    const hoursSinceEvent = (Date.now() - eventTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceEvent < 1) score += 10;
    else if (hoursSinceEvent < 24) score += 5;

    // Cap at 100
    return Math.min(score, 100);
}

/**
 * Validate security audit data
 * @param {Object} data - Security audit data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateSecurityAudit(data) {
    const errors = [];

    if (!data.eventId) {
        errors.push('eventId is required');
    }

    if (!data.eventType) {
        errors.push('eventType is required');
    } else if (!EVENT_TYPES.includes(data.eventType)) {
        errors.push(`eventType must be one of: ${EVENT_TYPES.join(', ')}`);
    }

    if (!data.level) {
        errors.push('level is required');
    } else if (!LEVELS.includes(data.level)) {
        errors.push(`level must be one of: ${LEVELS.join(', ')}`);
    }

    if (!data.requestContext || !data.requestContext.ip) {
        errors.push('requestContext.ip is required');
    }

    if (!data.details) {
        errors.push('details is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const SecurityAudit = {
    ...baseModel,
    EVENT_TYPES,
    LEVELS,

    /**
     * Create a new security audit event with validation
     * @param {Object} data - Security audit data
     * @returns {Object} Created security audit event
     */
    async create(data) {
        const validation = validateSecurityAudit(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const doc = {
            ...data,
            timestamp: data.timestamp || new Date().toISOString(),
            environment: data.environment || process.env.NODE_ENV || 'unknown',
            nodeVersion: data.nodeVersion || process.version,
            reviewed: data.reviewed || false,
            tags: data.tags || [],
            _type: 'security_audit'
        };

        // Calculate risk score if not provided
        if (doc.riskScore === undefined) {
            doc.riskScore = calculateRiskScore(doc);
        }

        return baseModel.create(doc);
    },

    /**
     * Find security audit by eventId
     * @param {string} eventId - Event ID
     * @returns {Object|null} Security audit or null
     */
    async findByEventId(eventId) {
        return baseModel.findOne({ eventId, _type: 'security_audit' });
    },

    /**
     * Find security audits by user
     * @param {string} userId - User ID
     * @param {number} days - Number of days to look back
     * @returns {Array} Security audits for user
     */
    async findByUser(userId, days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const allAudits = await baseModel.find(
            { 'userContext.userId': userId, _type: 'security_audit' },
            { sort: { timestamp: -1 } }
        );

        return allAudits.filter(audit =>
            new Date(audit.timestamp) >= cutoff
        );
    },

    /**
     * Find security audits by event type
     * @param {string} eventType - Event type
     * @param {number} days - Number of days to look back
     * @returns {Array} Security audits of type
     */
    async findByEventType(eventType, days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const allAudits = await baseModel.find(
            { eventType, _type: 'security_audit' },
            { sort: { timestamp: -1 } }
        );

        return allAudits.filter(audit =>
            new Date(audit.timestamp) >= cutoff
        );
    },

    /**
     * Find security audits by level
     * @param {string} level - Security level
     * @param {number} limit - Maximum results
     * @returns {Array} Security audits at level
     */
    async findByLevel(level, limit = 100) {
        return baseModel.find(
            { level, _type: 'security_audit' },
            { sort: { timestamp: -1 }, limit }
        );
    },

    /**
     * Get unreviewed critical events
     * @returns {Array} Unreviewed critical security audits
     */
    async getUnreviewedCritical() {
        return baseModel.find(
            { level: 'critical', reviewed: false, _type: 'security_audit' },
            { sort: { timestamp: -1 } }
        );
    },

    /**
     * Get suspicious activity
     * @param {number} days - Number of days to look back
     * @returns {Array} Suspicious security audits
     */
    async getSuspiciousActivity(days = 1) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const suspiciousTypes = [
            'auth.login.failure',
            'auth.unauthorized',
            'security.suspicious_activity',
            'security.rate_limit_exceeded'
        ];

        const allAudits = await baseModel.find(
            { _type: 'security_audit' },
            { sort: { timestamp: -1 } }
        );

        return allAudits.filter(audit =>
            suspiciousTypes.includes(audit.eventType) &&
            new Date(audit.timestamp) >= cutoff
        );
    },

    /**
     * Get security summary
     * @param {number} days - Number of days to look back
     * @returns {Array} Security summary grouped by type and level
     */
    async getSecuritySummary(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const allAudits = await baseModel.find({ _type: 'security_audit' });
        const filteredAudits = allAudits.filter(audit =>
            new Date(audit.timestamp) >= cutoff
        );

        // Group by eventType and level
        const groups = {};
        filteredAudits.forEach(audit => {
            const key = `${audit.eventType}:${audit.level}`;
            if (!groups[key]) {
                groups[key] = {
                    eventType: audit.eventType,
                    level: audit.level,
                    count: 0,
                    lastOccurrence: null
                };
            }
            groups[key].count++;
            const auditTime = new Date(audit.timestamp);
            if (!groups[key].lastOccurrence || auditTime > groups[key].lastOccurrence) {
                groups[key].lastOccurrence = auditTime;
            }
        });

        return Object.values(groups).sort((a, b) => b.count - a.count);
    },

    /**
     * Find by IP address
     * @param {string} ip - IP address
     * @param {number} days - Number of days to look back
     * @returns {Array} Security audits from IP
     */
    async findByIP(ip, days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const allAudits = await baseModel.find(
            { 'requestContext.ip': ip, _type: 'security_audit' },
            { sort: { timestamp: -1 } }
        );

        return allAudits.filter(audit =>
            new Date(audit.timestamp) >= cutoff
        );
    },

    /**
     * Mark an audit event as reviewed
     * @param {string} eventId - Event ID
     * @param {string} reviewedBy - Reviewer user ID
     * @param {string} notes - Review notes
     * @returns {Object|null} Updated security audit
     */
    async markReviewed(eventId, reviewedBy, notes = null) {
        const updateData = {
            reviewed: true,
            reviewedBy,
            reviewedAt: new Date().toISOString()
        };
        if (notes) {
            updateData.notes = notes;
        }

        await baseModel.updateOne(
            { eventId, _type: 'security_audit' },
            { $set: updateData }
        );
        return this.findByEventId(eventId);
    },

    /**
     * Add tag to audit event
     * @param {string} eventId - Event ID
     * @param {string} tag - Tag to add
     * @returns {Object|null} Updated security audit
     */
    async addTag(eventId, tag) {
        const audit = await this.findByEventId(eventId);
        if (!audit) {
            throw new Error(`Security audit not found: ${eventId}`);
        }

        const tags = audit.tags || [];
        if (!tags.includes(tag)) {
            tags.push(tag);
            await baseModel.updateOne(
                { eventId, _type: 'security_audit' },
                { $set: { tags } }
            );
        }

        return this.findByEventId(eventId);
    },

    /**
     * Find all security audits (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Security audits
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'security_audit' }, options);
    },

    /**
     * Find a single security audit
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Security audit or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'security_audit' }, options);
    },

    /**
     * Count security audits matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'security_audit' });
    },

    /**
     * Delete old audit events (for cleanup)
     * @param {number} days - Delete events older than this many days
     * @returns {Object} Delete result
     */
    async deleteOlderThan(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const allAudits = await baseModel.find({ _type: 'security_audit' });
        const toDelete = allAudits.filter(audit =>
            new Date(audit.timestamp) < cutoff
        );

        let deletedCount = 0;
        for (const audit of toDelete) {
            await baseModel.deleteOne({ eventId: audit.eventId, _type: 'security_audit' });
            deletedCount++;
        }

        return { deletedCount };
    }
};

module.exports = SecurityAudit;
