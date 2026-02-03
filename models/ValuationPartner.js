/**
 * ValuationPartner Model
 * Feature: Issue #61 - Implement Valuation Specialist Integration
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages relationships with 409A valuation service providers.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    partnerId: { type: 'string', unique: true, index: true },

    // Company using this partner (null for global partners)
    companyId: { type: 'string', index: true },

    // Partner details
    name: { type: 'string', required: true },
    legalName: { type: 'string' },
    type: {
        type: 'string',
        enum: ['valuation_firm', 'accounting_firm', 'independent_appraiser', 'consulting_firm'],
        default: 'valuation_firm'
    },
    status: {
        type: 'string',
        enum: ['active', 'inactive', 'pending_approval', 'suspended'],
        default: 'pending_approval',
        index: true
    },

    // Contact information
    contacts: { type: 'array', items: {
        _id: { type: 'string' },
        name: { type: 'string', required: true },
        email: { type: 'string', required: true },
        phone: { type: 'string' },
        title: { type: 'string' },
        isPrimary: { type: 'boolean', default: false }
    }},

    // Address
    address: {
        street: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zipCode: { type: 'string' },
        country: { type: 'string', default: 'USA' }
    },

    // Qualifications
    qualifications: {
        certifications: { type: 'array', items: { type: 'string' } },
        yearsInBusiness: { type: 'number' },
        valuationsCompleted: { type: 'number' },
        specializations: { type: 'array', items: { type: 'string' } },
        insuranceCoverage: { type: 'number' },
        rating: { type: 'number', min: 1, max: 5 }
    },

    // Service packages
    servicePackages: { type: 'array', items: {
        _id: { type: 'string' },
        name: { type: 'string', required: true },
        description: { type: 'string' },
        price: { type: 'number' },
        currency: { type: 'string', default: 'USD' },
        turnaroundDays: { type: 'number' },
        features: { type: 'array', items: { type: 'string' } }
    }},

    // API Integration
    apiIntegration: {
        enabled: { type: 'boolean', default: false },
        apiKey: { type: 'string' },
        webhookUrl: { type: 'string' },
        lastSyncAt: { type: 'date' }
    },

    // Communication history
    communications: { type: 'array', items: {
        _id: { type: 'string' },
        type: { type: 'string', enum: ['email', 'call', 'meeting', 'message', 'document_shared'], required: true },
        subject: { type: 'string' },
        content: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
        scheduledAt: { type: 'date' },
        completedAt: { type: 'date' },
        duration: { type: 'number' },
        outcome: { type: 'string' },
        relatedValuationId: { type: 'string' },
        createdBy: { type: 'string' },
        attachments: { type: 'array', items: {
            documentId: { type: 'string' },
            name: { type: 'string' }
        }},
        createdAt: { type: 'date' }
    }},

    // Scheduled calls
    scheduledCalls: { type: 'array', items: {
        _id: { type: 'string' },
        title: { type: 'string', required: true },
        description: { type: 'string' },
        scheduledAt: { type: 'date', required: true },
        duration: { type: 'number', default: 30 },
        status: { type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'], default: 'scheduled' },
        meetingLink: { type: 'string' },
        participants: { type: 'array', items: {
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' }
        }},
        agenda: { type: 'string' },
        notes: { type: 'string' },
        relatedValuationId: { type: 'string' },
        createdBy: { type: 'string' },
        confirmedAt: { type: 'date' },
        completedAt: { type: 'date' },
        cancelledAt: { type: 'date' },
        cancelReason: { type: 'string' },
        createdAt: { type: 'date' }
    }},

    // Performance metrics
    metrics: {
        averageTurnaroundDays: { type: 'number' },
        completedValuations: { type: 'number', default: 0 },
        onTimeDeliveryRate: { type: 'number' },
        customerSatisfaction: { type: 'number' },
        lastEngagement: { type: 'date' }
    },

    // Contract details
    contract: {
        startDate: { type: 'date' },
        endDate: { type: 'date' },
        terms: { type: 'string' },
        documentId: { type: 'string' }
    },

    // Additional data
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object', default: {} },

    // Tracking
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' }
};

// Create base model
const baseModel = createModel('valuations', schema);

// Extended ValuationPartner model with custom methods
const ValuationPartner = {
    ...baseModel,

    /**
     * Create a new valuation partner with generated partnerId
     * @param {Object} data - Partner data
     * @returns {Object} Created partner
     */
    async create(data) {
        const partnerData = {
            ...data,
            partnerId: data.partnerId || `vp_${uuidv4()}`,
            status: data.status || 'pending_approval',
            contacts: (data.contacts || []).map(c => ({ ...c, _id: c._id || uuidv4() })),
            servicePackages: (data.servicePackages || []).map(p => ({ ...p, _id: p._id || uuidv4() })),
            communications: (data.communications || []).map(c => ({ ...c, _id: c._id || uuidv4() })),
            scheduledCalls: (data.scheduledCalls || []).map(c => ({ ...c, _id: c._id || uuidv4() })),
            metrics: data.metrics || { completedValuations: 0 },
            metadata: data.metadata || {}
        };
        return baseModel.create(partnerData);
    },

    /**
     * Get primary contact for partner
     * @param {Object} partner - Partner document
     * @returns {Object|null}
     */
    getPrimaryContact(partner) {
        return partner.contacts?.find(c => c.isPrimary) || partner.contacts?.[0] || null;
    },

    /**
     * Check if contract is active
     * @param {Object} partner - Partner document
     * @returns {boolean}
     */
    isContractActive(partner) {
        if (!partner.contract?.startDate) return false;
        const now = new Date();
        return now >= new Date(partner.contract.startDate) &&
               (!partner.contract.endDate || now <= new Date(partner.contract.endDate));
    },

    /**
     * Get upcoming calls for partner
     * @param {Object} partner - Partner document
     * @returns {Array}
     */
    getUpcomingCalls(partner) {
        const now = new Date();
        return (partner.scheduledCalls || [])
            .filter(c => c.status === 'scheduled' && new Date(c.scheduledAt) > now)
            .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    },

    /**
     * Add contact to partner
     * @param {string} partnerId - Partner ID
     * @param {Object} contactData - Contact data
     * @param {string} userId - User ID
     * @returns {Object} Updated partner
     */
    async addContact(partnerId, contactData, userId) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const contacts = partner.contacts || [];
        const newContact = {
            ...contactData,
            _id: uuidv4(),
            isPrimary: contacts.length === 0 ? true : (contactData.isPrimary || false)
        };

        contacts.push(newContact);

        await this.updateOne({ partnerId }, {
            $set: {
                contacts,
                updatedBy: userId
            }
        });

        return this.findOne({ partnerId });
    },

    /**
     * Set primary contact
     * @param {string} partnerId - Partner ID
     * @param {string} contactId - Contact ID
     * @param {string} userId - User ID
     * @returns {Object} Updated partner
     */
    async setPrimaryContact(partnerId, contactId, userId) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const contacts = (partner.contacts || []).map(c => ({
            ...c,
            isPrimary: c._id === contactId
        }));

        await this.updateOne({ partnerId }, {
            $set: {
                contacts,
                updatedBy: userId
            }
        });

        return this.findOne({ partnerId });
    },

    /**
     * Schedule a call
     * @param {string} partnerId - Partner ID
     * @param {Object} callData - Call data
     * @param {string} userId - User ID
     * @returns {Object} Created call
     */
    async scheduleCall(partnerId, callData, userId) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const scheduledCalls = partner.scheduledCalls || [];
        const newCall = {
            ...callData,
            _id: uuidv4(),
            status: 'scheduled',
            createdBy: userId,
            createdAt: new Date().toISOString()
        };

        scheduledCalls.push(newCall);

        await this.updateOne({ partnerId }, {
            $set: {
                scheduledCalls,
                updatedBy: userId
            }
        });

        return newCall;
    },

    /**
     * Update call status
     * @param {string} partnerId - Partner ID
     * @param {string} callId - Call ID
     * @param {string} status - New status
     * @param {string} userId - User ID
     * @param {Object} data - Additional data
     * @returns {Object} Updated partner
     */
    async updateCallStatus(partnerId, callId, status, userId, data = {}) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const scheduledCalls = partner.scheduledCalls || [];
        const callIndex = scheduledCalls.findIndex(c => c._id === callId);
        if (callIndex === -1) {
            throw new Error('Call not found');
        }

        const call = scheduledCalls[callIndex];
        call.status = status;

        switch (status) {
            case 'confirmed':
                call.confirmedAt = new Date().toISOString();
                if (data.meetingLink) call.meetingLink = data.meetingLink;
                break;
            case 'completed':
                call.completedAt = new Date().toISOString();
                if (data.notes) call.notes = data.notes;
                if (data.duration) call.duration = data.duration;
                break;
            case 'cancelled':
                call.cancelledAt = new Date().toISOString();
                call.cancelReason = data.reason;
                break;
            case 'rescheduled':
                call.scheduledAt = data.newTime;
                break;
        }

        scheduledCalls[callIndex] = call;

        await this.updateOne({ partnerId }, {
            $set: {
                scheduledCalls,
                updatedBy: userId
            }
        });

        return this.findOne({ partnerId });
    },

    /**
     * Add communication record
     * @param {string} partnerId - Partner ID
     * @param {Object} commData - Communication data
     * @param {string} userId - User ID
     * @returns {Object} Updated partner
     */
    async addCommunication(partnerId, commData, userId) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const communications = partner.communications || [];
        const newComm = {
            ...commData,
            _id: uuidv4(),
            createdBy: userId,
            createdAt: new Date().toISOString()
        };

        communications.push(newComm);

        const metrics = partner.metrics || {};
        metrics.lastEngagement = new Date().toISOString();

        await this.updateOne({ partnerId }, {
            $set: {
                communications,
                metrics,
                updatedBy: userId
            }
        });

        return this.findOne({ partnerId });
    },

    /**
     * Activate partner
     * @param {string} partnerId - Partner ID
     * @param {string} userId - User ID
     * @returns {Object} Updated partner
     */
    async activate(partnerId, userId) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        if (partner.status === 'active') {
            throw new Error('Partner is already active');
        }

        await this.updateOne({ partnerId }, {
            $set: {
                status: 'active',
                updatedBy: userId
            }
        });

        return this.findOne({ partnerId });
    },

    /**
     * Deactivate partner
     * @param {string} partnerId - Partner ID
     * @param {string} userId - User ID
     * @param {string} reason - Deactivation reason
     * @returns {Object} Updated partner
     */
    async deactivate(partnerId, userId, reason = null) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const notes = reason
            ? `${partner.notes || ''}\n[${new Date().toISOString()}] Deactivated: ${reason}`.trim()
            : partner.notes;

        await this.updateOne({ partnerId }, {
            $set: {
                status: 'inactive',
                notes,
                updatedBy: userId
            }
        });

        return this.findOne({ partnerId });
    },

    /**
     * Update metrics
     * @param {string} partnerId - Partner ID
     * @param {Object} metricsData - Metrics data
     * @returns {Object} Updated partner
     */
    async updateMetrics(partnerId, metricsData) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const metrics = { ...(partner.metrics || {}), ...metricsData };

        await this.updateOne({ partnerId }, { $set: { metrics } });
        return this.findOne({ partnerId });
    },

    /**
     * Find active partners
     * @param {string} companyId - Optional company ID
     * @returns {Array} Active partners
     */
    async findActive(companyId = null) {
        const query = { status: 'active' };
        if (companyId) {
            // Include company-specific and global partners
            const companyPartners = await this.find({ ...query, companyId });
            const globalPartners = await this.find({ ...query, companyId: null });
            const allPartners = [...companyPartners, ...globalPartners];
            return allPartners.sort((a, b) =>
                (b.qualifications?.rating || 0) - (a.qualifications?.rating || 0)
            );
        }
        const partners = await this.find(query);
        return partners.sort((a, b) =>
            (b.qualifications?.rating || 0) - (a.qualifications?.rating || 0)
        );
    },

    /**
     * Find partners by type
     * @param {string} type - Partner type
     * @param {string} companyId - Optional company ID
     * @returns {Array} Partners
     */
    async findByType(type, companyId = null) {
        const query = { type, status: 'active' };
        if (companyId) {
            const companyPartners = await this.find({ ...query, companyId });
            const globalPartners = await this.find({ ...query, companyId: null });
            const allPartners = [...companyPartners, ...globalPartners];
            return allPartners.sort((a, b) =>
                (b.qualifications?.rating || 0) - (a.qualifications?.rating || 0)
            );
        }
        const partners = await this.find(query);
        return partners.sort((a, b) =>
            (b.qualifications?.rating || 0) - (a.qualifications?.rating || 0)
        );
    },

    /**
     * Search partners by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Array} Matching partners
     */
    async searchPartners(criteria) {
        const partners = await this.find({ status: 'active' });

        return partners.filter(partner => {
            if (criteria.type && partner.type !== criteria.type) return false;
            if (criteria.minRating && (partner.qualifications?.rating || 0) < criteria.minRating) return false;
            if (criteria.specialization &&
                !partner.qualifications?.specializations?.includes(criteria.specialization)) return false;
            if (criteria.maxTurnaround) {
                const hasPackage = partner.servicePackages?.some(
                    p => p.turnaroundDays && p.turnaroundDays <= criteria.maxTurnaround
                );
                if (!hasPackage) return false;
            }
            return true;
        }).sort((a, b) =>
            (b.qualifications?.rating || 0) - (a.qualifications?.rating || 0)
        );
    },

    /**
     * Get partner summary
     * @param {string} partnerId - Partner ID
     * @returns {Object} Partner summary
     */
    async getPartnerSummary(partnerId) {
        const partner = await this.findOne({ partnerId });
        if (!partner) {
            throw new Error('Partner not found');
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

        const recentCommunications = (partner.communications || [])
            .filter(c => c.createdAt && new Date(c.createdAt) > thirtyDaysAgo)
            .slice(-5);

        return {
            partner: {
                partnerId: partner.partnerId,
                name: partner.name,
                type: partner.type,
                status: partner.status,
                primaryContact: this.getPrimaryContact(partner)
            },
            metrics: partner.metrics,
            recentCommunications,
            upcomingCalls: this.getUpcomingCalls(partner),
            servicePackages: (partner.servicePackages || []).length,
            qualifications: partner.qualifications
        };
    }
};

module.exports = ValuationPartner;
