/**
 * MaterialEvent Model
 * Feature: Issue #60 - Build Material Events Tracking
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Tracks significant company events that may trigger 409A valuation requirements.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    eventId: { type: 'string', unique: true, index: true },

    // Company reference
    companyId: { type: 'string', required: true, index: true },

    // Event details
    eventType: {
        type: 'string',
        enum: [
            'fundraising_round',
            'significant_transaction',
            'key_employee_departure',
            'key_employee_hire',
            'acquisition_offer',
            'merger_discussion',
            'major_customer_change',
            'major_product_launch',
            'significant_revenue_change',
            'litigation',
            'regulatory_change',
            'market_condition_change',
            'ipo_preparation',
            'secondary_transaction',
            'other'
        ],
        required: true,
        index: true
    },

    eventDate: { type: 'date', required: true, index: true },
    detectedAt: { type: 'date' },
    description: { type: 'string', required: true },

    // Valuation impact
    triggersValuation: { type: 'boolean', default: false, index: true },
    impactSeverity: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    valuationImpactReason: { type: 'string' },

    // Status workflow
    status: {
        type: 'string',
        enum: ['detected', 'acknowledged', 'action_required', 'resolved', 'dismissed'],
        default: 'detected',
        index: true
    },

    // Related entities
    relatedEntities: { type: 'array', items: {
        entityType: { type: 'string', enum: ['FundraisingRound', 'Stakeholder', 'Transaction', 'Document', 'Company', 'Other'], required: true },
        entityId: { type: 'string', required: true },
        description: { type: 'string' }
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

    // Detection source
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

// Event types that always trigger valuation
const alwaysTriggerTypes = [
    'fundraising_round',
    'significant_transaction',
    'acquisition_offer',
    'merger_discussion',
    'ipo_preparation'
];

// Create base model
const baseModel = createModel('valuations', schema);

// Extended MaterialEvent model with custom methods
const MaterialEvent = {
    ...baseModel,

    /**
     * Create a new material event with generated eventId
     * @param {Object} data - Event data
     * @returns {Object} Created event
     */
    async create(data) {
        // Apply auto-trigger logic
        let triggersValuation = data.triggersValuation || false;
        let impactSeverity = data.impactSeverity || 'medium';

        if (alwaysTriggerTypes.includes(data.eventType)) {
            triggersValuation = true;
            impactSeverity = 'critical';
        }

        const eventData = {
            ...data,
            eventId: data.eventId || `evt_${uuidv4()}`,
            status: data.status || 'detected',
            detectedAt: data.detectedAt || new Date().toISOString(),
            triggersValuation,
            impactSeverity,
            actionItems: (data.actionItems || []).map(a => ({ ...a, _id: a._id || uuidv4() })),
            statusHistory: data.statusHistory || [{
                status: 'detected',
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
        return event.triggersValuation &&
               event.impactSeverity === 'critical' &&
               event.status !== 'resolved';
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

        if (event.status !== 'detected') {
            throw new Error('Can only acknowledge events in detected status');
        }

        const statusHistory = event.statusHistory || [];
        statusHistory.push({
            status: 'acknowledged',
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason: notes || 'Event acknowledged'
        });

        await this.updateOne({ eventId }, {
            $set: {
                status: 'acknowledged',
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
            status: 'action_required',
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
                status: 'action_required',
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
            status: 'resolved',
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason: resolutionData.notes || 'Event resolved'
        });

        await this.updateOne({ eventId }, {
            $set: {
                status: 'resolved',
                statusHistory,
                resolution: {
                    resolvedAt: new Date().toISOString(),
                    resolvedBy: userId,
                    resolutionNotes: resolutionData.notes,
                    valuationRequestId: resolutionData.valuationRequestId
                },
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
            status: 'dismissed',
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason
        });

        await this.updateOne({ eventId }, {
            $set: {
                status: 'dismissed',
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

        if (allCompleted && updatedEvent.status === 'action_required') {
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
        if (options.triggersValuation !== undefined) {
            query.triggersValuation = options.triggersValuation;
        }

        return this.find(query, { sort: { eventDate: -1 } });
    },

    /**
     * Find events requiring action
     * @param {string} companyId - Optional company ID
     * @returns {Array} Events requiring action
     */
    async findActionRequired(companyId = null) {
        const query = { status: 'action_required' };
        if (companyId) query.companyId = companyId;

        const events = await this.find(query);
        // Sort by impact severity (critical first) then by date
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return events.sort((a, b) => {
            const severityDiff = (severityOrder[a.impactSeverity] || 2) - (severityOrder[b.impactSeverity] || 2);
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
        const query = {
            triggersValuation: true
        };
        if (companyId) query.companyId = companyId;

        const events = await this.find(query);
        return events.filter(e => e.status !== 'resolved' && e.status !== 'dismissed')
            .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
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
            triggersValuation: 0,
            actionRequired: 0,
            recentEvents: []
        };

        events.forEach(event => {
            summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;
            summary.byType[event.eventType] = (summary.byType[event.eventType] || 0) + 1;
            if (event.triggersValuation) summary.triggersValuation++;
            if (event.status === 'action_required') summary.actionRequired++;
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
                triggersValuation: e.triggersValuation
            }));

        return summary;
    },

    /**
     * Auto-detect material event from fundraising round
     * @param {Object} roundData - Fundraising round data
     * @param {string} userId - User ID
     * @returns {Object} Created event
     */
    async detectFromFundraisingRound(roundData, userId) {
        const eventData = {
            companyId: roundData.companyId,
            eventType: 'fundraising_round',
            eventDate: roundData.closedDate || new Date().toISOString(),
            description: `Fundraising round: ${roundData.name || roundData.type} - $${roundData.amount?.toLocaleString() || 'TBD'}`,
            triggersValuation: true,
            impactSeverity: 'critical',
            detectionSource: 'automatic',
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
                roundName: roundData.name
            },
            statusHistory: [{
                status: 'detected',
                changedAt: new Date().toISOString(),
                changedBy: userId,
                reason: 'Auto-detected from fundraising round creation'
            }]
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
        const isCLevel = ['CEO', 'CFO', 'CTO', 'COO', 'CMO', 'CPO', 'CLO'].some(
            title => employeeData.title?.toUpperCase().includes(title)
        );

        const eventType = changeType === 'departure' ? 'key_employee_departure' : 'key_employee_hire';

        const eventData = {
            companyId: employeeData.companyId,
            eventType,
            eventDate: employeeData.effectiveDate || new Date().toISOString(),
            description: `${changeType === 'departure' ? 'Departure' : 'Hire'}: ${employeeData.name} (${employeeData.title})`,
            triggersValuation: isCLevel,
            impactSeverity: isCLevel ? 'high' : 'medium',
            detectionSource: 'automatic',
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
                isCLevel,
                changeType
            },
            statusHistory: [{
                status: 'detected',
                changedAt: new Date().toISOString(),
                changedBy: userId,
                reason: `Auto-detected from ${changeType}`
            }]
        };

        return this.create(eventData);
    }
};

module.exports = MaterialEvent;
