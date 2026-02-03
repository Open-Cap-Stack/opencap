/**
 * FundraisingModel Model
 * Issue #195: Interactive Fundraising Modeling Engine
 *
 * Data model for fundraising scenarios with dilution calculations and cap table projections.
 * Supports:
 * - Multiple financing scenarios (Series A, B, C, etc.)
 * - Pre-money and post-money valuations
 * - Option pool creation and expansion
 * - Multiple investment tranches
 * - Pro-forma cap table generation
 * - Dilution impact analysis
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition
const schema = {
    // Unique identifier
    modelId: { type: 'string', unique: true, index: true },

    // Company reference
    companyId: { type: 'string', required: true, index: true },

    // Model metadata
    name: { type: 'string', required: true },
    description: { type: 'string' },
    modelType: {
        type: 'string',
        enum: ['series_a', 'series_b', 'series_c', 'series_d', 'seed', 'bridge', 'convertible', 'safe_conversion'],
        default: 'series_a',
        required: true
    },

    // Base cap table snapshot (pre-financing)
    baseCapTable: {
        totalShares: { type: 'number', required: true, min: 0 },
        fullyDilutedShares: { type: 'number', required: true, min: 0 },
        shareClasses: { type: 'array', items: {
            shareClassId: { type: 'string', required: true },
            name: { type: 'string', required: true },
            shares: { type: 'number', required: true, min: 0 },
            pricePerShare: { type: 'number', required: true, min: 0 },
            preferenceType: { type: 'string', enum: ['common', 'preferred', 'warrant'], default: 'common' },
            liquidationMultiple: { type: 'number', default: 1, min: 0 },
            participationRights: { type: 'boolean', default: false }
        }},
        stakeholders: { type: 'array', items: {
            stakeholderId: { type: 'string', required: true },
            name: { type: 'string', required: true },
            shareClassId: { type: 'string', required: true },
            shares: { type: 'number', required: true, min: 0 },
            ownershipPercentage: { type: 'number', required: true, min: 0, max: 100 }
        }},
        optionPool: {
            allocated: { type: 'number', default: 0, min: 0 },
            unallocated: { type: 'number', default: 0, min: 0 },
            total: { type: 'number', default: 0, min: 0 }
        }
    },

    // Financing terms
    financing: {
        amount: { type: 'number', required: true, min: 0 },
        pricePerShare: { type: 'number', required: true, min: 0 },
        preMoneyValuation: { type: 'number', min: 0 },
        postMoneyValuation: { type: 'number', min: 0 },
        newShares: { type: 'number', min: 0 },

        // Option pool
        optionPoolExpansion: { type: 'boolean', default: false },
        optionPoolTargetPercentage: { type: 'number', min: 0, max: 100 },
        optionPoolPreOrPost: { type: 'string', enum: ['pre', 'post'], default: 'post' },

        // Investors
        investors: { type: 'array', items: {
            investorId: { type: 'string' },
            name: { type: 'string', required: true },
            investmentAmount: { type: 'number', required: true, min: 0 },
            ownershipPercentage: { type: 'number', min: 0, max: 100 },
            shares: { type: 'number', min: 0 },
            leadInvestor: { type: 'boolean', default: false }
        }},

        // Terms
        liquidationPreference: { type: 'number', default: 1, min: 0 },
        participatingPreferred: { type: 'boolean', default: false },
        participationCap: { type: 'number', min: 0 },
        dividendRate: { type: 'number', default: 0, min: 0 },
        antiDilutionProtection: {
            type: 'string',
            enum: ['none', 'full_ratchet', 'weighted_average_broad', 'weighted_average_narrow'],
            default: 'weighted_average_broad'
        },
        proRataRights: { type: 'boolean', default: true },

        // Board and governance
        boardSeats: { type: 'number', default: 0, min: 0 },
        boardObserverRights: { type: 'boolean', default: false },
        protectiveProvisions: { type: 'array', items: { type: 'string' } }
    },

    // Calculated results
    proFormaCapTable: {
        totalShares: { type: 'number' },
        fullyDilutedShares: { type: 'number' },
        postMoneyValuation: { type: 'number' },
        shareClasses: { type: 'array', items: {
            shareClassId: { type: 'string' },
            name: { type: 'string' },
            shares: { type: 'number' },
            ownershipPercentage: { type: 'number' },
            fullyDilutedPercentage: { type: 'number' },
            value: { type: 'number' }
        }},
        stakeholders: { type: 'array', items: {
            stakeholderId: { type: 'string' },
            name: { type: 'string' },
            shareClassId: { type: 'string' },
            shares: { type: 'number' },
            ownershipPercentage: { type: 'number' },
            fullyDilutedPercentage: { type: 'number' },
            value: { type: 'number' },
            dilution: { type: 'number' }
        }},
        optionPool: {
            allocated: { type: 'number' },
            unallocated: { type: 'number' },
            total: { type: 'number' },
            percentageOfCapitalization: { type: 'number' }
        }
    },

    // Dilution analysis
    dilutionAnalysis: {
        foundersDilution: { type: 'number' },
        existingInvestorsDilution: { type: 'number' },
        employeesDilution: { type: 'number' },
        averageDilution: { type: 'number' },
        byStakeholder: { type: 'array', items: {
            stakeholderId: { type: 'string' },
            name: { type: 'string' },
            preFunding: { type: 'number' },
            postFunding: { type: 'number' },
            dilutionPercentage: { type: 'number' },
            absoluteDilution: { type: 'number' }
        }}
    },

    // Valuation metrics
    valuationMetrics: {
        pricePerShare: { type: 'number' },
        fullyDilutedValue: { type: 'number' },
        enterpriseValue: { type: 'number' },
        equityValue: { type: 'number' },
        impliedValuation: { type: 'number' }
    },

    // Associated scenarios for comparison
    scenarios: { type: 'array', items: { type: 'string' } },

    // Status and metadata
    status: {
        type: 'string',
        enum: ['draft', 'calculated', 'finalized', 'archived'],
        default: 'draft',
        index: true
    },

    calculatedAt: { type: 'date' },
    finalizedAt: { type: 'date' },

    // Notes and tags
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object', default: {} },

    // Audit fields
    createdBy: { type: 'string', required: true },
    updatedBy: { type: 'string' }
};

// Create base model
const baseModel = createModel('fundraising_models', schema);

// Extended FundraisingModel with custom methods
const FundraisingModel = {
    ...baseModel,

    /**
     * Create a new fundraising model with generated modelId
     * @param {Object} data - Model data
     * @returns {Object} Created model
     */
    async create(data) {
        const modelData = {
            ...data,
            modelId: data.modelId || `fm_${uuidv4()}`,
            status: data.status || 'draft',
            scenarios: data.scenarios || [],
            metadata: data.metadata || {}
        };
        return baseModel.create(modelData);
    },

    /**
     * Find models by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} Models
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Calculate dilution for a model
     * @param {Object} model - Fundraising model
     * @returns {Object} Dilution analysis
     */
    calculateDilution(model) {
        const { baseCapTable, proFormaCapTable } = model;

        if (!baseCapTable || !proFormaCapTable) {
            throw new Error('Both base and pro-forma cap tables are required for dilution calculation');
        }

        const dilutionByStakeholder = [];
        let totalDilution = 0;
        let foundersDilution = 0;
        let existingInvestorsDilution = 0;
        let employeesDilution = 0;
        let stakeholderCount = 0;

        // Calculate per stakeholder
        for (const baseStakeholder of baseCapTable.stakeholders || []) {
            const proFormaStakeholder = proFormaCapTable.stakeholders?.find(
                s => s.stakeholderId === baseStakeholder.stakeholderId
            );

            if (proFormaStakeholder) {
                const preFunding = baseStakeholder.ownershipPercentage || 0;
                const postFunding = proFormaStakeholder.ownershipPercentage || 0;
                const dilutionPercentage = ((preFunding - postFunding) / preFunding) * 100;
                const absoluteDilution = preFunding - postFunding;

                dilutionByStakeholder.push({
                    stakeholderId: baseStakeholder.stakeholderId,
                    name: baseStakeholder.name,
                    preFunding,
                    postFunding,
                    dilutionPercentage: isFinite(dilutionPercentage) ? dilutionPercentage : 0,
                    absoluteDilution
                });

                totalDilution += dilutionPercentage;
                stakeholderCount++;

                // Categorize dilution by stakeholder type
                const stakeholderName = baseStakeholder.name.toLowerCase();
                if (stakeholderName.includes('founder') || stakeholderName.includes('ceo')) {
                    foundersDilution += dilutionPercentage;
                } else if (stakeholderName.includes('investor') || stakeholderName.includes('vc')) {
                    existingInvestorsDilution += dilutionPercentage;
                } else if (stakeholderName.includes('employee') || stakeholderName.includes('option')) {
                    employeesDilution += dilutionPercentage;
                }
            }
        }

        return {
            foundersDilution: foundersDilution || 0,
            existingInvestorsDilution: existingInvestorsDilution || 0,
            employeesDilution: employeesDilution || 0,
            averageDilution: stakeholderCount > 0 ? totalDilution / stakeholderCount : 0,
            byStakeholder: dilutionByStakeholder
        };
    },

    /**
     * Mark model as finalized
     * @param {string} modelId - Model ID
     * @param {string} userId - User ID
     * @returns {Object} Updated model
     */
    async finalize(modelId, userId) {
        const model = await this.findOne({ modelId });
        if (!model) {
            throw new Error('Fundraising model not found');
        }

        if (model.status !== 'calculated') {
            throw new Error('Model must be calculated before finalizing');
        }

        const updateData = {
            status: 'finalized',
            finalizedAt: new Date().toISOString(),
            updatedBy: userId
        };

        await this.updateOne({ modelId }, { $set: updateData });
        return this.findOne({ modelId });
    },

    /**
     * Archive a model
     * @param {string} modelId - Model ID
     * @param {string} userId - User ID
     * @returns {Object} Updated model
     */
    async archive(modelId, userId) {
        const updateData = {
            status: 'archived',
            updatedBy: userId
        };

        await this.updateOne({ modelId }, { $set: updateData });
        return this.findOne({ modelId });
    },

    /**
     * Clone a model for scenario comparison
     * @param {string} modelId - Source model ID
     * @param {Object} overrides - Data to override
     * @param {string} userId - User ID
     * @returns {Object} Cloned model
     */
    async clone(modelId, overrides = {}, userId) {
        const source = await this.findOne({ modelId });
        if (!source) {
            throw new Error('Source model not found');
        }

        const cloneData = {
            companyId: source.companyId,
            name: overrides.name || `Copy of ${source.name}`,
            description: overrides.description || source.description,
            modelType: overrides.modelType || source.modelType,
            baseCapTable: source.baseCapTable,
            financing: { ...source.financing, ...overrides.financing },
            status: 'draft',
            createdBy: userId,
            metadata: {
                ...source.metadata,
                clonedFrom: modelId,
                clonedAt: new Date().toISOString()
            }
        };

        return this.create(cloneData);
    }
};

module.exports = FundraisingModel;
