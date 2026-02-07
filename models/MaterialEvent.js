/**
 * MaterialEvent Model
 * Feature: Issue #267 - Implement material events catalog and 409A trigger system
 * Original: Issue #60 - Build Material Events Tracking
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Tracks significant company events that may trigger 409A valuation requirements.
 * Implements the complete material events catalog per IRS guidelines.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Complete Material Event Types Catalog (Issue #267)
const EVENT_TYPES = {
    // Auto-detectable events
    FINANCING_ROUND: 'financing_round',
    DOWN_ROUND: 'down_round',
    BRIDGE_FINANCING: 'bridge_financing',
    BOARD_COMPOSITION_CHANGE: 'board_composition_change',
    STOCK_SPLIT: 'stock_split',
    REVERSE_SPLIT: 'reverse_split',

    // Manually reported events
    SIGNIFICANT_REVENUE_CHANGE: 'significant_revenue_change',
    MAJOR_CUSTOMER_WIN: 'major_customer_win',
    MAJOR_CUSTOMER_LOSS: 'major_customer_loss',
    KEY_EXECUTIVE_CHANGE: 'key_executive_change',
    KEY_EMPLOYEE_DEPARTURE: 'key_employee_departure',
    KEY_EMPLOYEE_HIRE: 'key_employee_hire',
    LITIGATION: 'litigation',
    REGULATORY_CHANGE: 'regulatory_change',
    MA_ACTIVITY: 'ma_activity',
    ACQUISITION_OFFER: 'acquisition_offer',
    MERGER_DISCUSSION: 'merger_discussion',
    GOING_CONCERN_DOUBT: 'going_concern_doubt',
    IP_EVENT: 'ip_event',
    PRODUCT_LAUNCH: 'product_launch',
    PRODUCT_FAILURE: 'product_failure',
    MARKET_DISRUPTION: 'market_disruption',
    IPO_FILING: 'ipo_filing',
    IPO_PREPARATION: 'ipo_preparation',
    SECONDARY_TRANSACTION: 'secondary_transaction',
    SIGNIFICANT_TRANSACTION: 'significant_transaction',
    OTHER: 'other'
};

// Detection methods
const DETECTION_METHODS = {
    AUTO: 'auto',
    MANUAL: 'manual',
    EXTERNAL: 'external',
    API_INTEGRATION: 'api_integration',
    SCHEDULED_SCAN: 'scheduled_scan'
};

// Impact severity levels
const SEVERITY_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Event status workflow
const EVENT_STATUSES = {
    DETECTED: 'detected',
    ACKNOWLEDGED: 'acknowledged',
    ACTION_REQUIRED: 'action_required',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed'
};

// Events that ALWAYS require a new 409A valuation
const ALWAYS_TRIGGER_409A = [
    EVENT_TYPES.FINANCING_ROUND,
    EVENT_TYPES.DOWN_ROUND,
    EVENT_TYPES.BRIDGE_FINANCING,
    EVENT_TYPES.SIGNIFICANT_TRANSACTION,
    EVENT_TYPES.ACQUISITION_OFFER,
    EVENT_TYPES.MERGER_DISCUSSION,
    EVENT_TYPES.MA_ACTIVITY,
    EVENT_TYPES.IPO_FILING,
    EVENT_TYPES.IPO_PREPARATION,
    EVENT_TYPES.GOING_CONCERN_DOUBT
];

// Events that trigger 409A under certain conditions
const CONDITIONAL_TRIGGER_409A = {
    [EVENT_TYPES.SIGNIFICANT_REVENUE_CHANGE]: { threshold: 0.50 }, // >50% change
    [EVENT_TYPES.MAJOR_CUSTOMER_WIN]: { threshold: 0.25 }, // >25% revenue impact
    [EVENT_TYPES.MAJOR_CUSTOMER_LOSS]: { threshold: 0.25 }, // >25% revenue impact
    [EVENT_TYPES.KEY_EXECUTIVE_CHANGE]: { roles: ['CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CPO', 'CLO'] },
    [EVENT_TYPES.KEY_EMPLOYEE_DEPARTURE]: { roles: ['CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CPO', 'CLO'] },
    [EVENT_TYPES.BOARD_COMPOSITION_CHANGE]: { threshold: 0.50 }, // Majority change
    [EVENT_TYPES.LITIGATION]: { materialThreshold: 'significant' },
    [EVENT_TYPES.IP_EVENT]: { materialThreshold: 'major' },
    [EVENT_TYPES.PRODUCT_LAUNCH]: { materialThreshold: 'significant' },
    [EVENT_TYPES.PRODUCT_FAILURE]: { materialThreshold: 'significant' }
};

// Auto-detectable events
const AUTO_DETECTABLE_EVENTS = [
    EVENT_TYPES.FINANCING_ROUND,
    EVENT_TYPES.DOWN_ROUND,
    EVENT_TYPES.BRIDGE_FINANCING,
    EVENT_TYPES.BOARD_COMPOSITION_CHANGE,
    EVENT_TYPES.STOCK_SPLIT,
    EVENT_TYPES.REVERSE_SPLIT
];

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    eventId: { type: 'string', unique: true, index: true },

    // Company reference
    companyId: { type: 'string', required: true, index: true },

    // Event details
    eventType: {
        type: 'string',
        enum: Object.values(EVENT_TYPES),
        required: true,
        index: true
    },

    eventDate: { type: 'date', required: true, index: true },
    detectedAt: { type: 'date' },
    description: { type: 'string', required: true },

    // Detection method
    detectionMethod: {
        type: 'string',
        enum: Object.values(DETECTION_METHODS),
        default: DETECTION_METHODS.MANUAL
    },

    // Impact assessment
    severity: {
        type: 'string',
        enum: Object.values(SEVERITY_LEVELS),
        default: SEVERITY_LEVELS.MEDIUM,
        index: true
    },

    // 409A trigger flag
    requires409AUpdate: { type: 'boolean', default: false, index: true },
    triggersValuation: { type: 'boolean', default: false, index: true }, // Alias for compatibility

    // Financial impact
    financialImpact: { type: 'number' }, // Estimated $ impact
    impactPercentage: { type: 'number' }, // Percentage impact on valuation

    // Status workflow
    status: {
        type: 'string',
        enum: Object.values(EVENT_STATUSES),
        default: EVENT_STATUSES.DETECTED,
        index: true
    },

    // Valuation references
    invalidatesValuationId: { type: 'string' }, // 409A being invalidated
    replacementValuationId: { type: 'string' }, // New 409A obtained

    // Acknowledgment
    acknowledgedBy: { type: 'string' },
    acknowledgedAt: { type: 'date' },

    // Related entities
    relatedEntities: { type: 'array', items: {
        entityType: { type: 'string', enum: ['FundraisingRound', 'Stakeholder', 'Transaction', 'Document', 'Company', 'EquityGrant', 'Other'], required: true },
        entityId: { type: 'string', required: true },
        description: { type: 'string' }
    }},

    // Supporting documents
    supportingDocuments: { type: 'array', items: {
        documentId: { type: 'string' },
        type: { type: 'string' },
        name: { type: 'string' },
        uploadedAt: { type: 'date' }
    }},

    // Action items
    actionItems: { type: 'array', items: {
        _id: { type: 'string' },
        action: { type: 'string', required: true },
        assignedTo: { type: 'string' },
        dueDate: { type: 'date' },
        completedAt: { type: 'date' },
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
        notes: { type: 'string' }
    }},

    // Resolution
    resolution: {
        resolvedAt: { type: 'date' },
        resolvedBy: { type: 'string' },
        resolutionNotes: { type: 'string' },
        valuationRequestId: { type: 'string' }
    },

    // Detection source (legacy field)
    detectionSource: {
        type: 'string',
        enum: ['automatic', 'manual', 'api_integration', 'scheduled_scan'],
        default: 'manual'
    },
    detectedBy: { type: 'string' },

    // Audit trail
    statusHistory: { type: 'array', items: {
        status: { type: 'string', required: true },
        changedAt: { type: 'date' },
        changedBy: { type: 'string' },
        reason: { type: 'string' }
    }},

    // Additional data
    metadata: { type: 'object', default: {} },
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },

    // Tracking
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' }
};

// Create base model
const baseModel = createModel('material_events', schema);

// Extended MaterialEvent model with custom methods
const MaterialEvent = {
    ...baseModel,
    tableName: 'material_events',
    schema,

    // Export constants for external use
    EVENT_TYPES,
    DETECTION_METHODS,
    SEVERITY_LEVELS,
    EVENT_STATUSES,
    ALWAYS_TRIGGER_409A,
    CONDITIONAL_TRIGGER_409A,
    AUTO_DETECTABLE_EVENTS,

    /**
     * Check if an event type always triggers 409A
     * @param {string} eventType - Event type
     * @returns {boolean}
     */
    alwaysTriggers409A(eventType) {
        return ALWAYS_TRIGGER_409A.includes(eventType);
    },

    /**
     * Check if an event type is auto-detectable
     * @param {string} eventType - Event type
     * @returns {boolean}
     */
    isAutoDetectable(eventType) {
        return AUTO_DETECTABLE_EVENTS.includes(eventType);
    },

    /**
     * Determine if event requires 409A update based on type and metadata
     * @param {string} eventType - Event type
     * @param {Object} metadata - Event metadata
     * @returns {boolean}
     */
    requires409AUpdate(eventType, metadata = {}) {
        // Always trigger events
        if (ALWAYS_TRIGGER_409A.includes(eventType)) {
            return true;
        }

        // Conditional trigger events
        const condition = CONDITIONAL_TRIGGER_409A[eventType];
        if (!condition) {
            return false;
        }

        // Check threshold conditions
        if (condition.threshold && metadata.impactPercentage) {
            return Math.abs(metadata.impactPercentage) >= condition.threshold;
        }

        // Check role conditions for executive changes
        if (condition.roles && metadata.role) {
            const role = metadata.role.toUpperCase();
            return condition.roles.some(r => role.includes(r));
        }

        // Check material threshold
        if (condition.materialThreshold && metadata.materialLevel) {
            const levels = ['minor', 'moderate', 'significant', 'major', 'critical'];
            const thresholdIndex = levels.indexOf(condition.materialThreshold);
            const actualIndex = levels.indexOf(metadata.materialLevel);
            return actualIndex >= thresholdIndex;
        }

        return false;
    },

    /**
     * Determine severity based on event type and metadata
     * @param {string} eventType - Event type
     * @param {Object} metadata - Event metadata
     * @returns {string}
     */
    determineSeverity(eventType, metadata = {}) {
        // Critical events
        if ([
            EVENT_TYPES.DOWN_ROUND,
            EVENT_TYPES.GOING_CONCERN_DOUBT,
            EVENT_TYPES.IPO_FILING,
            EVENT_TYPES.MA_ACTIVITY,
            EVENT_TYPES.ACQUISITION_OFFER
        ].includes(eventType)) {
            return SEVERITY_LEVELS.CRITICAL;
        }

        // High severity events
        if ([
            EVENT_TYPES.FINANCING_ROUND,
            EVENT_TYPES.BRIDGE_FINANCING,
            EVENT_TYPES.MERGER_DISCUSSION,
            EVENT_TYPES.IPO_PREPARATION,
            EVENT_TYPES.KEY_EXECUTIVE_CHANGE
        ].includes(eventType)) {
            return SEVERITY_LEVELS.HIGH;
        }

        // Check metadata for severity hints
        if (metadata.financialImpact && metadata.financialImpact > 1000000) {
            return SEVERITY_LEVELS.HIGH;
        }

        if (metadata.impactPercentage && Math.abs(metadata.impactPercentage) > 0.25) {
            return SEVERITY_LEVELS.HIGH;
        }

        return SEVERITY_LEVELS.MEDIUM;
    },

    /**
     * Create a new material event with generated eventId
     * @param {Object} data - Event data
     * @returns {Object} Created event
     */
    async create(data) {
        // Determine if event requires 409A update
        const requires409A = data.requires409AUpdate !== undefined
            ? data.requires409AUpdate
            : this.requires409AUpdate(data.eventType, data.metadata || {});

        // Determine severity
        const severity = data.severity || this.determineSeverity(data.eventType, data.metadata || {});

        const eventData = {
            ...data,
            eventId: data.eventId || `evt_${uuidv4()}`,
            status: data.status || EVENT_STATUSES.DETECTED,
            detectedAt: data.detectedAt || new Date().toISOString(),
            requires409AUpdate: requires409A,
            triggersValuation: requires409A, // Alias for backward compatibility
            severity,
            detectionMethod: data.detectionMethod || DETECTION_METHODS.MANUAL,
            actionItems: (data.actionItems || []).map(a => ({ ...a, _id: a._id || uuidv4() })),
            statusHistory: data.statusHistory || [{
                status: EVENT_STATUSES.DETECTED,
                changedAt: new Date().toISOString(),
                changedBy: data.createdBy,
                reason: 'Event created'
            }],
            metadata: data.metadata || {}
        };

        return baseModel.create(eventData);
    },

    /**
     * Check if event requires immediate action
     * @param {Object} event - Event document
     * @returns {boolean}
     */
    requiresImmediateAction(event) {
        return event.requires409AUpdate &&
               event.severity === SEVERITY_LEVELS.CRITICAL &&
               event.status !== EVENT_STATUSES.RESOLVED &&
               event.status !== EVENT_STATUSES.DISMISSED;
    },

    /**
     * Get days since event
     * @param {Object} event - Event document
     * @returns {number}
     */
    getDaysSinceEvent(event) {
        return Math.floor((new Date() - new Date(event.eventDate)) / (1000 * 60 * 60 * 24));
    },

    /**
     * Check if company can issue grants (no unresolved material events)
     * @param {string} companyId - Company ID
     * @param {Date} grantDate - Optional grant date
     * @returns {Object} { allowed: boolean, reason?: string, events?: Array }
     */
    async canIssueGrant(companyId, grantDate = new Date()) {
        const unresolvedEvents = await this.find({
            companyId,
            requires409AUpdate: true
        });

        const blockingEvents = unresolvedEvents.filter(event =>
            event.status !== EVENT_STATUSES.RESOLVED &&
            event.status !== EVENT_STATUSES.DISMISSED &&
            new Date(event.eventDate) <= grantDate
        );

        if (blockingEvents.length > 0) {
            return {
                allowed: false,
                reason: 'UNRESOLVED_MATERIAL_EVENT',
                events: blockingEvents.map(e => ({
                    eventId: e.eventId,
                    eventType: e.eventType,
                    eventDate: e.eventDate,
                    status: e.status,
                    severity: e.severity
                }))
            };
        }

        return { allowed: true };
    },

    /**
     * Acknowledge event
     * @param {string} eventId - Event ID
     * @param {string} userId - User ID
     * @param {string} notes - Optional notes
     * @returns {Object} Updated event
     */
    async acknowledge(eventId, userId, notes = null) {
        const event = await this.findOne({ eventId });
        if (!event) {
            throw new Error('Event not found');
        }

        if (event.status !== EVENT_STATUSES.DETECTED) {
            throw new Error('Can only acknowledge events in detected status');
        }

        const statusHistory = event.statusHistory || [];
        statusHistory.push({
            status: EVENT_STATUSES.ACKNOWLEDGED,
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason: notes || 'Event acknowledged'
        });

        await this.updateOne({ eventId }, {
            $set: {
                status: EVENT_STATUSES.ACKNOWLEDGED,
                acknowledgedBy: userId,
                acknowledgedAt: new Date().toISOString(),
                statusHistory,
                updatedBy: userId
            }
        });

        return this.findOne({ eventId });
    },

    /**
     * Mark event as requiring action
     * @param {string} eventId - Event ID
     * @param {string} userId - User ID
     * @param {Array} actionItems - Action items to add
     * @param {string} notes - Optional notes
     * @returns {Object} Updated event
     */
    async markActionRequired(eventId, userId, actionItems = [], notes = null) {
        const event = await this.findOne({ eventId });
        if (!event) {
            throw new Error('Event not found');
        }

        const statusHistory = event.statusHistory || [];
        statusHistory.push({
            status: EVENT_STATUSES.ACTION_REQUIRED,
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason: notes || 'Action required'
        });

        const existingItems = event.actionItems || [];
        const newItems = actionItems.map(item => ({
            ...item,
            _id: uuidv4(),
            status: 'pending'
        }));

        await this.updateOne({ eventId }, {
            $set: {
                status: EVENT_STATUSES.ACTION_REQUIRED,
                statusHistory,
                actionItems: [...existingItems, ...newItems],
                updatedBy: userId
            }
        });

        return this.findOne({ eventId });
    },

    /**
     * Resolve event
     * @param {string} eventId - Event ID
     * @param {string} userId - User ID
     * @param {Object} resolutionData - Resolution data
     * @returns {Object} Updated event
     */
    async resolve(eventId, userId, resolutionData = {}) {
        const event = await this.findOne({ eventId });
        if (!event) {
            throw new Error('Event not found');
        }

        const statusHistory = event.statusHistory || [];
        statusHistory.push({
            status: EVENT_STATUSES.RESOLVED,
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason: resolutionData.notes || 'Event resolved'
        });

        await this.updateOne({ eventId }, {
            $set: {
                status: EVENT_STATUSES.RESOLVED,
                statusHistory,
                resolution: {
                    resolvedAt: new Date().toISOString(),
                    resolvedBy: userId,
                    resolutionNotes: resolutionData.notes,
                    valuationRequestId: resolutionData.valuationRequestId
                },
                replacementValuationId: resolutionData.valuationRequestId,
                updatedBy: userId
            }
        });

        return this.findOne({ eventId });
    },

    /**
     * Dismiss event
     * @param {string} eventId - Event ID
     * @param {string} userId - User ID
     * @param {string} reason - Dismissal reason (required)
     * @returns {Object} Updated event
     */
    async dismiss(eventId, userId, reason) {
        if (!reason) {
            throw new Error('Dismissal reason is required');
        }

        const event = await this.findOne({ eventId });
        if (!event) {
            throw new Error('Event not found');
        }

        const statusHistory = event.statusHistory || [];
        statusHistory.push({
            status: EVENT_STATUSES.DISMISSED,
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason
        });

        await this.updateOne({ eventId }, {
            $set: {
                status: EVENT_STATUSES.DISMISSED,
                statusHistory,
                updatedBy: userId
            }
        });

        return this.findOne({ eventId });
    },

    /**
     * Add action item to event
     * @param {string} eventId - Event ID
     * @param {Object} actionItem - Action item data
     * @param {string} userId - User ID
     * @returns {Object} Updated event
     */
    async addActionItem(eventId, actionItem, userId) {
        const event = await this.findOne({ eventId });
        if (!event) {
            throw new Error('Event not found');
        }

        const actionItems = event.actionItems || [];
        actionItems.push({
            ...actionItem,
            _id: uuidv4(),
            status: 'pending'
        });

        await this.updateOne({ eventId }, {
            $set: {
                actionItems,
                updatedBy: userId
            }
        });

        return this.findOne({ eventId });
    },

    /**
     * Complete action item
     * @param {string} eventId - Event ID
     * @param {string} actionItemId - Action item ID
     * @param {string} userId - User ID
     * @param {string} notes - Optional completion notes
     * @returns {Object} Updated event
     */
    async completeActionItem(eventId, actionItemId, userId, notes = null) {
        const event = await this.findOne({ eventId });
        if (!event) {
            throw new Error('Event not found');
        }

        const actionItems = event.actionItems || [];
        const itemIndex = actionItems.findIndex(a => a._id === actionItemId);
        if (itemIndex === -1) {
            throw new Error('Action item not found');
        }

        actionItems[itemIndex].status = 'completed';
        actionItems[itemIndex].completedAt = new Date().toISOString();
        if (notes) actionItems[itemIndex].notes = notes;

        await this.updateOne({ eventId }, {
            $set: {
                actionItems,
                updatedBy: userId
            }
        });

        // Auto-resolve if all action items completed
        const updatedEvent = await this.findOne({ eventId });
        const allCompleted = updatedEvent.actionItems.every(item =>
            item.status === 'completed' || item.status === 'cancelled'
        );

        if (allCompleted && updatedEvent.status === EVENT_STATUSES.ACTION_REQUIRED) {
            return this.resolve(eventId, userId, { notes: 'All action items completed' });
        }

        return updatedEvent;
    },

    /**
     * Find events by company
     * @param {string} companyId - Company ID
     * @param {Object} options - Filter options
     * @returns {Array} Events
     */
    async findByCompany(companyId, options = {}) {
        const query = { companyId };

        if (options.status) query.status = options.status;
        if (options.eventType) query.eventType = options.eventType;
        if (options.requires409AUpdate !== undefined) {
            query.requires409AUpdate = options.requires409AUpdate;
        }
        // Backward compatibility
        if (options.triggersValuation !== undefined) {
            query.requires409AUpdate = options.triggersValuation;
        }

        return this.find(query, { sort: { eventDate: -1 } });
    },

    /**
     * Find unresolved events for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Unresolved events
     */
    async findUnresolved(companyId) {
        const events = await this.find({ companyId });
        return events.filter(e =>
            e.status !== EVENT_STATUSES.RESOLVED &&
            e.status !== EVENT_STATUSES.DISMISSED
        ).sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
            if (severityDiff !== 0) return severityDiff;
            return new Date(b.eventDate) - new Date(a.eventDate);
        });
    },

    /**
     * Find events requiring action
     * @param {string} companyId - Optional company ID
     * @returns {Array} Events requiring action
     */
    async findActionRequired(companyId = null) {
        const query = { status: EVENT_STATUSES.ACTION_REQUIRED };
        if (companyId) query.companyId = companyId;

        const events = await this.find(query);
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return events.sort((a, b) => {
            const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
            if (severityDiff !== 0) return severityDiff;
            return new Date(b.eventDate) - new Date(a.eventDate);
        });
    },

    /**
     * Find events that trigger valuation
     * @param {string} companyId - Optional company ID
     * @returns {Array} Valuation trigger events
     */
    async findValuationTriggers(companyId = null) {
        const query = { requires409AUpdate: true };
        if (companyId) query.companyId = companyId;

        const events = await this.find(query);
        return events.filter(e =>
            e.status !== EVENT_STATUSES.RESOLVED &&
            e.status !== EVENT_STATUSES.DISMISSED
        ).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    },

    /**
     * Get company event summary
     * @param {string} companyId - Company ID
     * @returns {Object} Event summary
     */
    async getCompanySummary(companyId) {
        const events = await this.find({ companyId });

        const summary = {
            total: events.length,
            byStatus: {},
            byType: {},
            bySeverity: {},
            requires409AUpdate: 0,
            actionRequired: 0,
            unresolved: 0,
            recentEvents: []
        };

        events.forEach(event => {
            summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;
            summary.byType[event.eventType] = (summary.byType[event.eventType] || 0) + 1;
            summary.bySeverity[event.severity] = (summary.bySeverity[event.severity] || 0) + 1;
            if (event.requires409AUpdate) summary.requires409AUpdate++;
            if (event.status === EVENT_STATUSES.ACTION_REQUIRED) summary.actionRequired++;
            if (event.status !== EVENT_STATUSES.RESOLVED && event.status !== EVENT_STATUSES.DISMISSED) {
                summary.unresolved++;
            }
        });

        // Get 5 most recent events
        summary.recentEvents = events
            .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
            .slice(0, 5)
            .map(e => ({
                eventId: e.eventId,
                eventType: e.eventType,
                eventDate: e.eventDate,
                status: e.status,
                severity: e.severity,
                requires409AUpdate: e.requires409AUpdate
            }));

        return summary;
    },

    /**
     * Auto-detect material event from financing round
     * @param {Object} roundData - Fundraising round data
     * @param {string} userId - User ID
     * @returns {Object} Created event
     */
    async detectFromFinancingRound(roundData, userId) {
        // Check if this is a down round
        let eventType = EVENT_TYPES.FINANCING_ROUND;
        let severity = SEVERITY_LEVELS.HIGH;
        let description = `Financing round: ${roundData.name || roundData.type} - $${roundData.amount?.toLocaleString() || 'TBD'}`;

        if (roundData.previousPricePerShare && roundData.pricePerShare) {
            if (roundData.pricePerShare < roundData.previousPricePerShare) {
                eventType = EVENT_TYPES.DOWN_ROUND;
                severity = SEVERITY_LEVELS.CRITICAL;
                description = `Down round: $${roundData.pricePerShare} vs previous $${roundData.previousPricePerShare}`;
            }
        }

        // Check if bridge financing
        if (roundData.type?.toLowerCase().includes('bridge')) {
            eventType = EVENT_TYPES.BRIDGE_FINANCING;
        }

        const eventData = {
            companyId: roundData.companyId,
            eventType,
            eventDate: roundData.closedDate || new Date().toISOString(),
            description,
            requires409AUpdate: true,
            severity,
            detectionMethod: DETECTION_METHODS.AUTO,
            detectedBy: userId,
            createdBy: userId,
            relatedEntities: [{
                entityType: 'FundraisingRound',
                entityId: roundData._id,
                description: roundData.name
            }],
            metadata: {
                roundType: roundData.type,
                roundAmount: roundData.amount,
                roundName: roundData.name,
                pricePerShare: roundData.pricePerShare,
                previousPricePerShare: roundData.previousPricePerShare
            }
        };

        return this.create(eventData);
    },

    /**
     * Auto-detect material event from employee change
     * @param {Object} employeeData - Employee data
     * @param {string} changeType - 'departure' or 'hire'
     * @param {string} userId - User ID
     * @returns {Object} Created event
     */
    async detectFromEmployeeChange(employeeData, changeType, userId) {
        const cLevelRoles = ['CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CPO', 'CLO'];
        const isCLevel = cLevelRoles.some(
            title => employeeData.title?.toUpperCase().includes(title)
        );

        const eventType = changeType === 'departure'
            ? EVENT_TYPES.KEY_EMPLOYEE_DEPARTURE
            : EVENT_TYPES.KEY_EMPLOYEE_HIRE;

        const eventData = {
            companyId: employeeData.companyId,
            eventType,
            eventDate: employeeData.effectiveDate || new Date().toISOString(),
            description: `${changeType === 'departure' ? 'Departure' : 'Hire'}: ${employeeData.name} (${employeeData.title})`,
            requires409AUpdate: isCLevel,
            severity: isCLevel ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
            detectionMethod: DETECTION_METHODS.AUTO,
            detectedBy: userId,
            createdBy: userId,
            relatedEntities: [{
                entityType: 'Stakeholder',
                entityId: employeeData._id,
                description: `${employeeData.name} - ${employeeData.title}`
            }],
            metadata: {
                employeeName: employeeData.name,
                employeeTitle: employeeData.title,
                role: employeeData.title,
                isCLevel,
                changeType
            }
        };

        return this.create(eventData);
    },

    /**
     * Check going concern status based on cash runway
     * @param {Object} companyFinancials - Company financial data
     * @param {string} userId - User ID
     * @returns {Object|null} Created event or null if no concern
     */
    async checkGoingConcern(companyFinancials, userId) {
        const { companyId, cashBalance, monthlyBurnRate } = companyFinancials;

        if (!cashBalance || !monthlyBurnRate || monthlyBurnRate <= 0) {
            return null;
        }

        const runwayMonths = cashBalance / monthlyBurnRate;

        if (runwayMonths < 6) {
            const eventData = {
                companyId,
                eventType: EVENT_TYPES.GOING_CONCERN_DOUBT,
                eventDate: new Date().toISOString(),
                description: `Cash runway: ${runwayMonths.toFixed(1)} months (less than 6 months)`,
                requires409AUpdate: true,
                severity: SEVERITY_LEVELS.CRITICAL,
                detectionMethod: DETECTION_METHODS.SCHEDULED_SCAN,
                detectedBy: userId,
                createdBy: userId,
                metadata: {
                    cashBalance,
                    monthlyBurnRate,
                    runwayMonths
                }
            };

            return this.create(eventData);
        }

        return null;
    }
};

module.exports = MaterialEvent;
