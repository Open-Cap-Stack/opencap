/**
 * Stakeholder Model
 * Issue #324: Enhance Stakeholder model with holdings summary and equity linkage
 *
 * Migrated: ZeroDB Migration - Issue #175
 * Enhanced: 409A compliance fields for consolidated equity position tracking
 *
 * Bridges between identity (Layer 0) and equity positions (Layer 1).
 * Provides a consolidated holdings view for waterfall analysis and cap table reporting.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Enum definitions for validation
const STAKEHOLDER_TYPES = ['common', 'preferred', 'option', 'warrant', 'convertible', 'rsu', 'phantom'];
const STAKEHOLDER_STATUS = ['active', 'inactive', 'pending', 'terminated', 'deceased'];
const STAKEHOLDER_ROLES = ['founder', 'co_founder', 'employee', 'advisor', 'consultant', 'investor', 'board_member', 'service_provider', 'engineer', 'manager', 'venture_capitalist'];

// Schema definition for documentation and validation
const stakeholderSchema = {
    // Core identifiers
    _id: { type: 'string', required: true, unique: true },
    stakeholderId: { type: 'string', required: true, unique: true },
    companyId: { type: 'string', required: true },
    projectId: { type: 'string' },
    userId: { type: 'string' }, // Link to user account if exists

    // Contact information
    name: { type: 'string', required: true },
    email: { type: 'string', required: true },
    phone: { type: 'string' },
    address: { type: 'string' },

    // Role and classification
    role: { type: 'string', required: true, enum: STAKEHOLDER_ROLES },
    type: { type: 'string', enum: STAKEHOLDER_TYPES },
    status: { type: 'string', enum: STAKEHOLDER_STATUS, default: 'active' },
    department: { type: 'string' },
    title: { type: 'string' },
    location: { type: 'string' },

    // Legacy fields (kept for backward compatibility)
    equity: { type: 'string' },
    shares: { type: 'string' },
    vestingSchedule: { type: 'string' },

    // Holdings summary (409A)
    totalGrantedShares: { type: 'number', default: 0, min: 0 },
    totalVestedShares: { type: 'number', default: 0, min: 0 },
    totalExercisedShares: { type: 'number', default: 0, min: 0 },
    totalUnvestedShares: { type: 'number', default: 0, min: 0 },
    totalForfeitedShares: { type: 'number', default: 0, min: 0 },

    // Equity linkage (409A)
    equityGrantIds: { type: 'array', default: [] },
    vestingScheduleIds: { type: 'array', default: [] },
    exerciseRequestIds: { type: 'array', default: [] },

    // Financial summary (409A)
    totalEquityValue: { type: 'number', default: 0, min: 0 },
    totalExerciseCost: { type: 'number', default: 0, min: 0 },
    weightedAverageStrikePrice: { type: 'number', default: 0, min: 0 },

    // Accreditation (for investor-stakeholders)
    accreditedInvestor: { type: 'boolean', default: false },
    insiderStatus: { type: 'boolean', default: false }, // Section 16 insider
    affiliateStatus: { type: 'boolean', default: false }, // Rule 144 affiliate

    // Dates
    joinDate: { type: 'date' },
    terminationDate: { type: 'date' },
    lastActivity: { type: 'date' },
    holdingsSummaryUpdatedAt: { type: 'date' },

    // Metadata
    documents: { type: 'number', default: 0 },
    notes: { type: 'string' },
    tags: { type: 'array', default: [] },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Create the base model
const baseModel = createModel('stakeholders', stakeholderSchema);

// Extended Stakeholder model with business logic
const Stakeholder = {
    ...baseModel,
    tableName: 'stakeholders',
    schema: stakeholderSchema,

    // Expose enums for validation
    STAKEHOLDER_TYPES,
    STAKEHOLDER_STATUS,
    STAKEHOLDER_ROLES,

    /**
     * Create a new stakeholder with defaults and validation
     * @param {Object} data - Stakeholder data
     * @returns {Object} Created stakeholder
     */
    async create(data) {
        // Validate required fields
        if (!data.companyId) {
            throw new Error('Company ID is required');
        }
        if (!data.name) {
            throw new Error('Stakeholder name is required');
        }
        if (!data.email) {
            throw new Error('Email is required');
        }
        if (!data.role) {
            throw new Error('Role is required');
        }

        // Validate enums
        if (data.type && !STAKEHOLDER_TYPES.includes(data.type)) {
            throw new Error(`Invalid stakeholder type. Must be one of: ${STAKEHOLDER_TYPES.join(', ')}`);
        }
        if (data.status && !STAKEHOLDER_STATUS.includes(data.status)) {
            throw new Error(`Invalid status. Must be one of: ${STAKEHOLDER_STATUS.join(', ')}`);
        }
        if (!STAKEHOLDER_ROLES.includes(data.role)) {
            throw new Error(`Invalid role. Must be one of: ${STAKEHOLDER_ROLES.join(', ')}`);
        }

        // Generate stakeholderId if not provided
        if (!data.stakeholderId) {
            data.stakeholderId = `stakeholder_${uuidv4()}`;
        }

        // Set defaults
        const dataWithDefaults = {
            status: 'active',
            totalGrantedShares: 0,
            totalVestedShares: 0,
            totalExercisedShares: 0,
            totalUnvestedShares: 0,
            totalForfeitedShares: 0,
            equityGrantIds: [],
            vestingScheduleIds: [],
            exerciseRequestIds: [],
            totalEquityValue: 0,
            totalExerciseCost: 0,
            weightedAverageStrikePrice: 0,
            accreditedInvestor: false,
            insiderStatus: false,
            affiliateStatus: false,
            documents: 0,
            tags: [],
            ...data
        };

        return baseModel.create.call(baseModel, dataWithDefaults);
    },

    /**
     * Find stakeholder by stakeholderId
     * @param {string} stakeholderId - Stakeholder ID
     * @returns {Object|null} Stakeholder or null
     */
    async findByStakeholderId(stakeholderId) {
        return baseModel.findOne.call(baseModel, { stakeholderId });
    },

    /**
     * Find all stakeholders for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Stakeholders for the company
     */
    async findByCompany(companyId) {
        return baseModel.find.call(baseModel, { companyId });
    },

    /**
     * Find stakeholders by project
     * @param {string} projectId - Project ID
     * @returns {Array} Stakeholders in project
     */
    async findByProject(projectId) {
        return baseModel.find.call(baseModel, { projectId });
    },

    /**
     * Find stakeholders by role
     * @param {string} role - Stakeholder role
     * @param {string} companyId - Optional company filter
     * @returns {Array} Stakeholders with given role
     */
    async findByRole(role, companyId = null) {
        const query = { role };
        if (companyId) {
            query.companyId = companyId;
        }
        return baseModel.find.call(baseModel, query);
    },

    /**
     * Find active stakeholders for a company
     * @param {string} companyId - Company ID
     * @returns {Array} Active stakeholders
     */
    async findActiveByCompany(companyId) {
        const stakeholders = await baseModel.find.call(baseModel, { companyId });
        return stakeholders.filter(s => s.status === 'active');
    },

    /**
     * Find stakeholders with insider or affiliate status
     * @param {string} companyId - Company ID
     * @returns {Array} Stakeholders with special status
     */
    async findInsidersAndAffiliates(companyId) {
        const stakeholders = await baseModel.find.call(baseModel, { companyId });
        return stakeholders.filter(s => s.insiderStatus || s.affiliateStatus);
    },

    /**
     * Find accredited investor stakeholders
     * @param {string} companyId - Company ID
     * @returns {Array} Accredited stakeholders
     */
    async findAccreditedInvestors(companyId) {
        const stakeholders = await baseModel.find.call(baseModel, { companyId });
        return stakeholders.filter(s => s.accreditedInvestor && s.role === 'investor');
    },

    /**
     * Get holdings summary for a stakeholder
     * Aggregates equity position from linked grants
     * @param {string} stakeholderId - Stakeholder ID
     * @returns {Object} Holdings summary
     */
    async getHoldingsSummary(stakeholderId) {
        const stakeholder = await this.findByStakeholderId(stakeholderId);

        if (!stakeholder) {
            throw new Error('Stakeholder not found');
        }

        return {
            stakeholderId: stakeholder.stakeholderId,
            name: stakeholder.name,
            holdings: {
                totalGrantedShares: stakeholder.totalGrantedShares || 0,
                totalVestedShares: stakeholder.totalVestedShares || 0,
                totalExercisedShares: stakeholder.totalExercisedShares || 0,
                totalUnvestedShares: stakeholder.totalUnvestedShares || 0,
                totalForfeitedShares: stakeholder.totalForfeitedShares || 0
            },
            financial: {
                totalEquityValue: stakeholder.totalEquityValue || 0,
                totalExerciseCost: stakeholder.totalExerciseCost || 0,
                weightedAverageStrikePrice: stakeholder.weightedAverageStrikePrice || 0
            },
            linkedGrants: stakeholder.equityGrantIds || [],
            linkedVestingSchedules: stakeholder.vestingScheduleIds || [],
            linkedExerciseRequests: stakeholder.exerciseRequestIds || [],
            lastUpdated: stakeholder.holdingsSummaryUpdatedAt
        };
    },

    /**
     * Refresh equity summary from source data
     * Recalculates totals from linked grant records
     * @param {string} stakeholderId - Stakeholder ID
     * @param {Object} grantData - Grant data to aggregate
     * @returns {Object} Updated stakeholder
     */
    async refreshEquitySummary(stakeholderId, grantData = {}) {
        const stakeholder = await this.findByStakeholderId(stakeholderId);

        if (!stakeholder) {
            throw new Error('Stakeholder not found');
        }

        // Calculate totals from provided grant data
        // In production, this would fetch from EquityGrant, VestingSchedule, etc.
        const {
            grants = [],
            currentFMV = 0
        } = grantData;

        let totalGrantedShares = 0;
        let totalVestedShares = 0;
        let totalExercisedShares = 0;
        let totalUnvestedShares = 0;
        let totalForfeitedShares = 0;
        let totalExerciseCost = 0;
        let weightedSum = 0;
        let totalShares = 0;

        for (const grant of grants) {
            totalGrantedShares += grant.grantedShares || 0;
            totalVestedShares += grant.vestedShares || 0;
            totalExercisedShares += grant.exercisedShares || 0;
            totalUnvestedShares += grant.unvestedShares || 0;
            totalForfeitedShares += grant.forfeitedShares || 0;

            const exercisableShares = (grant.vestedShares || 0) - (grant.exercisedShares || 0);
            totalExerciseCost += exercisableShares * (grant.strikePrice || 0);

            if (grant.grantedShares > 0) {
                weightedSum += (grant.strikePrice || 0) * grant.grantedShares;
                totalShares += grant.grantedShares;
            }
        }

        const weightedAverageStrikePrice = totalShares > 0 ? weightedSum / totalShares : 0;
        const totalEquityValue = Math.max(0, (currentFMV - weightedAverageStrikePrice) * (totalVestedShares - totalExercisedShares));

        const updateData = {
            totalGrantedShares,
            totalVestedShares,
            totalExercisedShares,
            totalUnvestedShares,
            totalForfeitedShares,
            totalExerciseCost,
            weightedAverageStrikePrice,
            totalEquityValue,
            holdingsSummaryUpdatedAt: new Date(),
            updatedAt: new Date()
        };

        return baseModel.findOneAndUpdate.call(baseModel,
            { stakeholderId },
            updateData
        );
    },

    /**
     * Add an equity grant to stakeholder
     * @param {string} stakeholderId - Stakeholder ID
     * @param {string} grantId - Grant ID to add
     * @returns {Object} Updated stakeholder
     */
    async addEquityGrant(stakeholderId, grantId) {
        const stakeholder = await this.findByStakeholderId(stakeholderId);

        if (!stakeholder) {
            throw new Error('Stakeholder not found');
        }

        const equityGrantIds = [...(stakeholder.equityGrantIds || [])];
        if (!equityGrantIds.includes(grantId)) {
            equityGrantIds.push(grantId);
        }

        return baseModel.findOneAndUpdate.call(baseModel,
            { stakeholderId },
            { equityGrantIds, updatedAt: new Date() }
        );
    },

    /**
     * Add a vesting schedule to stakeholder
     * @param {string} stakeholderId - Stakeholder ID
     * @param {string} scheduleId - Vesting schedule ID to add
     * @returns {Object} Updated stakeholder
     */
    async addVestingSchedule(stakeholderId, scheduleId) {
        const stakeholder = await this.findByStakeholderId(stakeholderId);

        if (!stakeholder) {
            throw new Error('Stakeholder not found');
        }

        const vestingScheduleIds = [...(stakeholder.vestingScheduleIds || [])];
        if (!vestingScheduleIds.includes(scheduleId)) {
            vestingScheduleIds.push(scheduleId);
        }

        return baseModel.findOneAndUpdate.call(baseModel,
            { stakeholderId },
            { vestingScheduleIds, updatedAt: new Date() }
        );
    },

    /**
     * Update accreditation status
     * @param {string} stakeholderId - Stakeholder ID
     * @param {Object} accreditationData - Accreditation flags
     * @returns {Object} Updated stakeholder
     */
    async updateAccreditation(stakeholderId, accreditationData) {
        const stakeholder = await this.findByStakeholderId(stakeholderId);

        if (!stakeholder) {
            throw new Error('Stakeholder not found');
        }

        const validFields = ['accreditedInvestor', 'insiderStatus', 'affiliateStatus'];
        const updateData = { updatedAt: new Date() };

        for (const field of validFields) {
            if (typeof accreditationData[field] === 'boolean') {
                updateData[field] = accreditationData[field];
            }
        }

        return baseModel.findOneAndUpdate.call(baseModel,
            { stakeholderId },
            updateData
        );
    },

    /**
     * Get cap table summary for company stakeholders
     * @param {string} companyId - Company ID
     * @returns {Object} Cap table summary
     */
    async getCapTableSummary(companyId) {
        const stakeholders = await this.findByCompany(companyId);
        const activeStakeholders = stakeholders.filter(s => s.status === 'active');

        const totalGranted = activeStakeholders.reduce((sum, s) => sum + (s.totalGrantedShares || 0), 0);
        const totalVested = activeStakeholders.reduce((sum, s) => sum + (s.totalVestedShares || 0), 0);
        const totalExercised = activeStakeholders.reduce((sum, s) => sum + (s.totalExercisedShares || 0), 0);
        const totalUnvested = activeStakeholders.reduce((sum, s) => sum + (s.totalUnvestedShares || 0), 0);
        const totalForfeited = activeStakeholders.reduce((sum, s) => sum + (s.totalForfeitedShares || 0), 0);

        // Group by role
        const byRole = {};
        for (const role of STAKEHOLDER_ROLES) {
            const roleStakeholders = activeStakeholders.filter(s => s.role === role);
            byRole[role] = {
                count: roleStakeholders.length,
                totalGrantedShares: roleStakeholders.reduce((sum, s) => sum + (s.totalGrantedShares || 0), 0),
                totalVestedShares: roleStakeholders.reduce((sum, s) => sum + (s.totalVestedShares || 0), 0)
            };
        }

        return {
            companyId,
            totalStakeholders: activeStakeholders.length,
            totals: {
                granted: totalGranted,
                vested: totalVested,
                exercised: totalExercised,
                unvested: totalUnvested,
                forfeited: totalForfeited
            },
            byRole,
            stakeholders: activeStakeholders.map(s => ({
                stakeholderId: s.stakeholderId,
                name: s.name,
                role: s.role,
                totalGrantedShares: s.totalGrantedShares || 0,
                totalVestedShares: s.totalVestedShares || 0,
                totalExercisedShares: s.totalExercisedShares || 0
            }))
        };
    },

    /**
     * Terminate stakeholder and handle forfeiture
     * @param {string} stakeholderId - Stakeholder ID
     * @param {Date} terminationDate - Termination date
     * @returns {Object} Updated stakeholder
     */
    /**
     * T1-6: Terminate stakeholder with optimistic locking to prevent double forfeiture.
     * Uses version check to ensure the stakeholder hasn't been modified between
     * the status check and the update.
     */
    async terminate(stakeholderId, terminationDate = new Date()) {
        const stakeholder = await this.findByStakeholderId(stakeholderId);

        if (!stakeholder) {
            throw new Error('Stakeholder not found');
        }

        if (stakeholder.status === 'terminated') {
            throw new Error('Stakeholder already terminated');
        }

        // Upon termination, unvested shares are typically forfeited
        const newForfeitedShares = (stakeholder.totalForfeitedShares || 0) + (stakeholder.totalUnvestedShares || 0);

        const updateData = {
            status: 'terminated',
            terminationDate,
            totalForfeitedShares: newForfeitedShares,
            totalUnvestedShares: 0,
            updatedAt: new Date()
        };

        // Use version-aware update to prevent concurrent terminations
        await baseModel.updateOne.call(baseModel,
            { stakeholderId },
            { $set: updateData },
            { expectedVersion: stakeholder.__v }
        );

        // Return the updated stakeholder (merge local update data for consistency)
        return { ...stakeholder, ...updateData };
    },

    // Expose base model methods
    find: baseModel.find.bind(baseModel),
    findOne: baseModel.findOne.bind(baseModel),
    findById: baseModel.findById.bind(baseModel),
    updateOne: baseModel.updateOne.bind(baseModel),
    updateMany: baseModel.updateMany.bind(baseModel),
    findOneAndUpdate: baseModel.findOneAndUpdate.bind(baseModel),
    findByIdAndUpdate: baseModel.findByIdAndUpdate.bind(baseModel),
    deleteOne: baseModel.deleteOne.bind(baseModel),
    deleteMany: baseModel.deleteMany.bind(baseModel),
    findOneAndDelete: baseModel.findOneAndDelete.bind(baseModel),
    findByIdAndDelete: baseModel.findByIdAndDelete.bind(baseModel),
    countDocuments: baseModel.countDocuments.bind(baseModel),
    exists: baseModel.exists.bind(baseModel),
    distinct: baseModel.distinct.bind(baseModel),
    aggregate: baseModel.aggregate.bind(baseModel)
};

module.exports = Stakeholder;
