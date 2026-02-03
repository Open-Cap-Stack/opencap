/**
 * ModelScenario Model
 * Issue #195: Interactive Fundraising Modeling Engine
 *
 * Data model for scenario variations in fundraising modeling.
 * Allows users to create and compare multiple what-if scenarios
 * for a single fundraising round.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition
const schema = {
    // Unique identifier
    scenarioId: { type: 'string', unique: true, index: true },

    // Parent model reference
    modelId: { type: 'string', required: true, index: true },
    companyId: { type: 'string', required: true, index: true },

    // Scenario metadata
    name: { type: 'string', required: true },
    description: { type: 'string' },
    scenarioType: {
        type: 'string',
        enum: ['base_case', 'best_case', 'worst_case', 'optimistic', 'pessimistic', 'custom'],
        default: 'custom'
    },

    // Scenario-specific financing terms (overrides)
    financingOverrides: {
        amount: { type: 'number', min: 0 },
        pricePerShare: { type: 'number', min: 0 },
        preMoneyValuation: { type: 'number', min: 0 },
        postMoneyValuation: { type: 'number', min: 0 },
        optionPoolTargetPercentage: { type: 'number', min: 0, max: 100 },
        liquidationPreference: { type: 'number', min: 0 },
        participatingPreferred: { type: 'boolean' },
        investors: { type: 'array', items: {
            investorId: { type: 'string' },
            name: { type: 'string' },
            investmentAmount: { type: 'number', min: 0 },
            ownershipPercentage: { type: 'number', min: 0, max: 100 }
        }}
    },

    // Calculated results for this scenario
    results: {
        proFormaCapTable: {
            totalShares: { type: 'number' },
            fullyDilutedShares: { type: 'number' },
            postMoneyValuation: { type: 'number' },
            shareClasses: { type: 'array' },
            stakeholders: { type: 'array' },
            optionPool: { type: 'object' }
        },
        dilutionAnalysis: {
            foundersDilution: { type: 'number' },
            existingInvestorsDilution: { type: 'number' },
            employeesDilution: { type: 'number' },
            averageDilution: { type: 'number' },
            byStakeholder: { type: 'array' }
        },
        valuationMetrics: {
            pricePerShare: { type: 'number' },
            fullyDilutedValue: { type: 'number' },
            enterpriseValue: { type: 'number' },
            equityValue: { type: 'number' },
            impliedValuation: { type: 'number' }
        },
        waterfallAnalysis: {
            exitValuation: { type: 'number' },
            shareClassResults: { type: 'array' },
            summary: { type: 'object' }
        }
    },

    // Comparison metrics (vs base model)
    comparisonMetrics: {
        dilutionDifference: { type: 'number' },
        valuationDifference: { type: 'number' },
        ownershipDifference: { type: 'number' },
        raiseAmountDifference: { type: 'number' }
    },

    // Status
    status: {
        type: 'string',
        enum: ['draft', 'calculated', 'approved', 'rejected', 'archived'],
        default: 'draft',
        index: true
    },

    calculatedAt: { type: 'date' },

    // Approval workflow
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },
    rejectedBy: { type: 'string' },
    rejectedAt: { type: 'date' },
    rejectionReason: { type: 'string' },

    // Notes and tags
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object', default: {} },

    // Audit fields
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' }
};

// Create base model
const baseModel = createModel('model_scenarios', schema);

// Extended ModelScenario with custom methods
const ModelScenario = {
    ...baseModel,

    /**
     * Create a new scenario with generated scenarioId
     * @param {Object} data - Scenario data
     * @returns {Object} Created scenario
     */
    async create(data) {
        const scenarioData = {
            ...data,
            scenarioId: data.scenarioId || `scn_${uuidv4()}`,
            status: data.status || 'draft',
            metadata: data.metadata || {}
        };
        return baseModel.create(scenarioData);
    },

    /**
     * Find scenarios by model
     * @param {string} modelId - Model ID
     * @param {string} status - Optional status filter
     * @returns {Array} Scenarios
     */
    async findByModel(modelId, status = null) {
        const query = { modelId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Find scenarios by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} Scenarios
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Calculate comparison metrics against base model
     * @param {Object} scenario - Scenario with results
     * @param {Object} baseModel - Base model with results
     * @returns {Object} Comparison metrics
     */
    calculateComparison(scenario, baseModel) {
        const scenarioResults = scenario.results || {};
        const baseResults = baseModel.proFormaCapTable || {};

        const scenarioDilution = scenarioResults.dilutionAnalysis?.averageDilution || 0;
        const baseDilution = baseModel.dilutionAnalysis?.averageDilution || 0;

        const scenarioValuation = scenarioResults.valuationMetrics?.fullyDilutedValue || 0;
        const baseValuation = baseModel.valuationMetrics?.fullyDilutedValue || 0;

        const scenarioAmount = scenario.financingOverrides?.amount || 0;
        const baseAmount = baseModel.financing?.amount || 0;

        return {
            dilutionDifference: scenarioDilution - baseDilution,
            valuationDifference: scenarioValuation - baseValuation,
            raiseAmountDifference: scenarioAmount - baseAmount,
            ownershipDifference: this._calculateOwnershipDifference(scenario, baseModel)
        };
    },

    /**
     * Calculate ownership difference
     * @private
     */
    _calculateOwnershipDifference(scenario, baseModel) {
        const scenarioStakeholders = scenario.results?.proFormaCapTable?.stakeholders || [];
        const baseStakeholders = baseModel.proFormaCapTable?.stakeholders || [];

        let totalDifference = 0;
        let count = 0;

        for (const baseStakeholder of baseStakeholders) {
            const scenarioStakeholder = scenarioStakeholders.find(
                s => s.stakeholderId === baseStakeholder.stakeholderId
            );

            if (scenarioStakeholder) {
                const diff = (scenarioStakeholder.ownershipPercentage || 0) - (baseStakeholder.ownershipPercentage || 0);
                totalDifference += Math.abs(diff);
                count++;
            }
        }

        return count > 0 ? totalDifference / count : 0;
    },

    /**
     * Approve a scenario
     * @param {string} scenarioId - Scenario ID
     * @param {string} userId - User ID
     * @returns {Object} Updated scenario
     */
    async approve(scenarioId, userId) {
        const scenario = await this.findOne({ scenarioId });
        if (!scenario) {
            throw new Error('Scenario not found');
        }

        if (scenario.status !== 'calculated') {
            throw new Error('Scenario must be calculated before approval');
        }

        const updateData = {
            status: 'approved',
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
            updatedBy: userId
        };

        await this.updateOne({ scenarioId }, { $set: updateData });
        return this.findOne({ scenarioId });
    },

    /**
     * Reject a scenario
     * @param {string} scenarioId - Scenario ID
     * @param {string} userId - User ID
     * @param {string} reason - Rejection reason
     * @returns {Object} Updated scenario
     */
    async reject(scenarioId, userId, reason) {
        const scenario = await this.findOne({ scenarioId });
        if (!scenario) {
            throw new Error('Scenario not found');
        }

        const updateData = {
            status: 'rejected',
            rejectedBy: userId,
            rejectedAt: new Date().toISOString(),
            rejectionReason: reason,
            updatedBy: userId
        };

        await this.updateOne({ scenarioId }, { $set: updateData });
        return this.findOne({ scenarioId });
    },

    /**
     * Archive a scenario
     * @param {string} scenarioId - Scenario ID
     * @param {string} userId - User ID
     * @returns {Object} Updated scenario
     */
    async archive(scenarioId, userId) {
        const updateData = {
            status: 'archived',
            updatedBy: userId
        };

        await this.updateOne({ scenarioId }, { $set: updateData });
        return this.findOne({ scenarioId });
    }
};

module.exports = ModelScenario;
