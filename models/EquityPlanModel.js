/**
 * Equity Plan Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages equity compensation plans including stock options and restricted stock.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const PLAN_TYPES = ['Stock Option Plan', 'Restricted Stock Plan'];
const ALLOCATION_TYPES = ['Fixed', 'Performance-Based'];

const equityPlanSchema = {
    planId: { type: 'string', required: true, unique: true },
    planName: { type: 'string', required: true },
    description: { type: 'string' },
    startDate: { type: 'date', required: true },
    endDate: { type: 'date' },
    allocation: { type: 'number', required: true },
    participants: { type: 'array' },
    VestingTerms: { type: 'object' },
    VestingStartDate: { type: 'date' },
    VestingEndDate: { type: 'date' },
    VestingSchedule: { type: 'string' },
    PlanType: { type: 'string', required: true, enum: PLAN_TYPES },
    AllocationType: { type: 'string', enum: ALLOCATION_TYPES },
    PlanAdministrator: { type: 'string' }
};

const baseModel = createModel('securities', equityPlanSchema);

/**
 * Validate equity plan data
 * @param {Object} data - Equity plan data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateEquityPlan(data) {
    const errors = [];

    if (!data.planId) {
        errors.push('planId is required');
    }

    if (!data.planName) {
        errors.push('planName is required');
    }

    if (!data.startDate) {
        errors.push('startDate is required');
    }

    if (data.allocation === undefined || data.allocation === null) {
        errors.push('allocation is required');
    }

    if (!data.PlanType) {
        errors.push('PlanType is required');
    } else if (!PLAN_TYPES.includes(data.PlanType)) {
        errors.push(`PlanType must be one of: ${PLAN_TYPES.join(', ')}`);
    }

    if (data.AllocationType && !ALLOCATION_TYPES.includes(data.AllocationType)) {
        errors.push(`AllocationType must be one of: ${ALLOCATION_TYPES.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const EquityPlan = {
    ...baseModel,
    PLAN_TYPES,
    ALLOCATION_TYPES,

    /**
     * Create a new equity plan with validation
     * @param {Object} data - Equity plan data
     * @returns {Object} Created equity plan
     */
    async create(data) {
        const validation = validateEquityPlan(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const doc = {
            ...data,
            participants: data.participants || [],
            _type: 'equity_plan'
        };

        return baseModel.create(doc);
    },

    /**
     * Find equity plan by planId
     * @param {string} planId - Plan ID
     * @returns {Object|null} Equity plan or null
     */
    async findByPlanId(planId) {
        return baseModel.findOne({ planId, _type: 'equity_plan' });
    },

    /**
     * Find equity plans by type
     * @param {string} planType - Plan type
     * @param {Object} options - Query options
     * @returns {Array} Equity plans of type
     */
    async findByType(planType, options = {}) {
        if (!PLAN_TYPES.includes(planType)) {
            throw new Error(`Invalid PlanType: ${planType}`);
        }
        return baseModel.find(
            { PlanType: planType, _type: 'equity_plan' },
            options
        );
    },

    /**
     * Find active equity plans (no end date or end date in future)
     * @param {Object} options - Query options
     * @returns {Array} Active equity plans
     */
    async findActive(options = {}) {
        const allPlans = await baseModel.find({ _type: 'equity_plan' }, options);
        const now = new Date();
        return allPlans.filter(plan =>
            !plan.endDate || new Date(plan.endDate) > now
        );
    },

    /**
     * Find equity plans by participant
     * @param {string} participantId - Participant ID
     * @param {Object} options - Query options
     * @returns {Array} Equity plans with participant
     */
    async findByParticipant(participantId, options = {}) {
        const allPlans = await baseModel.find({ _type: 'equity_plan' }, options);
        return allPlans.filter(plan =>
            plan.participants && plan.participants.includes(participantId)
        );
    },

    /**
     * Add participant to equity plan
     * @param {string} planId - Plan ID
     * @param {string} participantId - Participant ID to add
     * @returns {Object} Updated equity plan
     */
    async addParticipant(planId, participantId) {
        const plan = await this.findByPlanId(planId);
        if (!plan) {
            throw new Error(`Equity plan not found: ${planId}`);
        }

        const participants = plan.participants || [];
        if (!participants.includes(participantId)) {
            participants.push(participantId);
            await baseModel.updateOne(
                { planId, _type: 'equity_plan' },
                { $set: { participants } }
            );
        }

        return this.findByPlanId(planId);
    },

    /**
     * Remove participant from equity plan
     * @param {string} planId - Plan ID
     * @param {string} participantId - Participant ID to remove
     * @returns {Object} Updated equity plan
     */
    async removeParticipant(planId, participantId) {
        const plan = await this.findByPlanId(planId);
        if (!plan) {
            throw new Error(`Equity plan not found: ${planId}`);
        }

        const participants = (plan.participants || []).filter(p => p !== participantId);
        await baseModel.updateOne(
            { planId, _type: 'equity_plan' },
            { $set: { participants } }
        );

        return this.findByPlanId(planId);
    },

    /**
     * Find all equity plans (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Equity plans
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'equity_plan' }, options);
    },

    /**
     * Find a single equity plan
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Equity plan or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'equity_plan' }, options);
    },

    /**
     * Count equity plans matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'equity_plan' });
    }
};

module.exports = EquityPlan;
