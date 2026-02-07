/**
 * ValuationAssumptions Model
 * Feature: Issue #263 - Create valuation_assumptions and valuation_methods tables
 *
 * Stores the key assumptions used in 409A valuations.
 * Required for audit defense and IRS compliance.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Exit scenario types
const EXIT_SCENARIOS = [
    'IPO',
    'ACQUISITION',
    'STAY_PRIVATE'
];

// Option pool treatment options
const OPTION_POOL_TREATMENT = [
    'INCLUDE_ALLOCATED_ONLY',    // Only vested/allocated options
    'INCLUDE_FULL_POOL',         // Full authorized pool
    'TREASURY_METHOD',           // Treasury stock method
    'EXCLUDE'                    // Exclude from FD count
];

// SAFE/Note treatment options
const CONVERTIBLE_TREATMENT = [
    'EXCLUDE_UNTIL_CONVERT',     // Not in cap table until trigger
    'INCLUDE_AS_CONVERTED',      // Assume conversion
    'PROBABILITY_WEIGHTED',      // Weight by conversion probability
    'SHADOW_PREFERRED'           // Treat as shadow preferred
];

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    id: { type: 'string', unique: true, index: true },

    // Links to Valuation409A
    valuationId: { type: 'string', required: true, index: true },

    // Time to liquidity
    timeToLiquidityYears: {
        type: 'number',
        min: 0,
        max: 20
    },

    // Exit scenario
    exitScenario: {
        type: 'string',
        enum: EXIT_SCENARIOS
    },

    // Risk-free rate (Treasury rate used)
    riskFreeRate: {
        type: 'number',
        min: 0,
        max: 1
    },

    // Equity volatility assumption
    equityVolatility: {
        type: 'number',
        min: 0,
        max: 3  // Up to 300%
    },

    // Discount rate (WACC or required return)
    discountRate: {
        type: 'number',
        min: 0,
        max: 1
    },

    // Terminal growth rate for DCF
    terminalGrowthRate: {
        type: 'number',
        min: -1,  // Can be negative
        max: 1
    },

    // Discount for Lack of Marketability
    dlom: {
        type: 'number',
        min: 0,
        max: 1
    },

    // Discount for Lack of Control
    dloc: {
        type: 'number',
        min: 0,
        max: 1
    },

    // Option pool treatment
    optionPoolTreatment: {
        type: 'string',
        enum: OPTION_POOL_TREATMENT
    },

    // SAFE/Note treatment
    safeNoteTreatment: {
        type: 'string',
        enum: CONVERTIBLE_TREATMENT
    },

    // Market multiples if market approach used
    revenueMultiple: {
        type: 'number',
        min: 0
    },

    ebitdaMultiple: {
        type: 'number',
        min: 0
    },

    // Explanation of key assumptions
    assumptionsNarrative: { type: 'string' },

    // Additional structured assumptions
    assumptionsJson: {
        type: 'object',
        default: {}
    },

    // Metadata
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' }
};

// Create base model
const baseModel = createModel('valuation_assumptions', schema);

// Extended ValuationAssumptions model with custom methods
const ValuationAssumptions = {
    ...baseModel,
    tableName: 'valuation_assumptions',
    schema,
    EXIT_SCENARIOS,
    OPTION_POOL_TREATMENT,
    CONVERTIBLE_TREATMENT,

    // Delegate core methods to baseModel
    async find(query, options) {
        return baseModel.find.call(baseModel, query, options);
    },

    async findOne(query, options) {
        return baseModel.findOne.call(baseModel, query, options);
    },

    async findById(id, options) {
        return baseModel.findById.call(baseModel, id, options);
    },

    async updateOne(query, update, options) {
        return baseModel.updateOne.call(baseModel, query, update, options);
    },

    async deleteOne(query) {
        return baseModel.deleteOne.call(baseModel, query);
    },

    async countDocuments(query) {
        return baseModel.countDocuments.call(baseModel, query);
    },

    /**
     * Validate rate is within bounds (0 to max)
     * @param {number} value - Value to validate
     * @param {string} fieldName - Field name for error message
     * @param {number} max - Maximum value
     */
    validateRate(value, fieldName, max = 1) {
        if (value !== undefined && value !== null) {
            if (value < 0) {
                throw new Error(`${fieldName} must be non-negative`);
            }
            if (value > max) {
                throw new Error(`${fieldName} must not exceed ${max * 100}%`);
            }
        }
    },

    /**
     * Create a new valuation assumptions record
     * @param {Object} data - Assumptions data
     * @returns {Object} Created assumptions record
     */
    async create(data) {
        // Validate exit scenario enum
        if (data.exitScenario && !EXIT_SCENARIOS.includes(data.exitScenario)) {
            throw new Error(`Invalid exit scenario: ${data.exitScenario}. Must be one of: ${EXIT_SCENARIOS.join(', ')}`);
        }

        // Validate option pool treatment enum
        if (data.optionPoolTreatment && !OPTION_POOL_TREATMENT.includes(data.optionPoolTreatment)) {
            throw new Error(`Invalid option pool treatment: ${data.optionPoolTreatment}. Must be one of: ${OPTION_POOL_TREATMENT.join(', ')}`);
        }

        // Validate SAFE/note treatment enum
        if (data.safeNoteTreatment && !CONVERTIBLE_TREATMENT.includes(data.safeNoteTreatment)) {
            throw new Error(`Invalid SAFE/note treatment: ${data.safeNoteTreatment}. Must be one of: ${CONVERTIBLE_TREATMENT.join(', ')}`);
        }

        // Validate rates
        this.validateRate(data.riskFreeRate, 'Risk-free rate');
        this.validateRate(data.equityVolatility, 'Equity volatility', 3);
        this.validateRate(data.discountRate, 'Discount rate');
        this.validateRate(data.dlom, 'DLOM');
        this.validateRate(data.dloc, 'DLOC');

        // Validate time to liquidity
        if (data.timeToLiquidityYears !== undefined && data.timeToLiquidityYears < 0) {
            throw new Error('Time to liquidity must be non-negative');
        }

        const assumptionsData = {
            ...data,
            id: data.id || `va_${uuidv4()}`,
            assumptionsJson: data.assumptionsJson || {}
        };

        return baseModel.create(assumptionsData);
    },

    /**
     * Find assumptions by valuation ID
     * @param {string} valuationId - Valuation ID
     * @returns {Object|null} Assumptions record
     */
    async findByValuationId(valuationId) {
        return this.findOne({ valuationId });
    },

    /**
     * Create or update assumptions for a valuation
     * @param {string} valuationId - Valuation ID
     * @param {Object} assumptionsData - Assumptions data
     * @param {string} userId - User ID
     * @returns {Object} Created/updated assumptions
     */
    async upsert(valuationId, assumptionsData, userId) {
        const existing = await this.findByValuationId(valuationId);

        if (existing) {
            return this.updateAssumptions(existing.id, assumptionsData, userId);
        }

        return this.create({
            ...assumptionsData,
            valuationId,
            createdBy: userId
        });
    },

    /**
     * Update assumptions
     * @param {string} assumptionsId - Assumptions ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID
     * @returns {Object} Updated assumptions
     */
    async updateAssumptions(assumptionsId, updateData, userId) {
        // Validate exit scenario enum if provided
        if (updateData.exitScenario && !EXIT_SCENARIOS.includes(updateData.exitScenario)) {
            throw new Error(`Invalid exit scenario: ${updateData.exitScenario}. Must be one of: ${EXIT_SCENARIOS.join(', ')}`);
        }

        // Validate option pool treatment enum if provided
        if (updateData.optionPoolTreatment && !OPTION_POOL_TREATMENT.includes(updateData.optionPoolTreatment)) {
            throw new Error(`Invalid option pool treatment: ${updateData.optionPoolTreatment}. Must be one of: ${OPTION_POOL_TREATMENT.join(', ')}`);
        }

        // Validate SAFE/note treatment enum if provided
        if (updateData.safeNoteTreatment && !CONVERTIBLE_TREATMENT.includes(updateData.safeNoteTreatment)) {
            throw new Error(`Invalid SAFE/note treatment: ${updateData.safeNoteTreatment}. Must be one of: ${CONVERTIBLE_TREATMENT.join(', ')}`);
        }

        // Validate rates if provided
        this.validateRate(updateData.riskFreeRate, 'Risk-free rate');
        this.validateRate(updateData.equityVolatility, 'Equity volatility', 3);
        this.validateRate(updateData.discountRate, 'Discount rate');
        this.validateRate(updateData.dlom, 'DLOM');
        this.validateRate(updateData.dloc, 'DLOC');

        await this.updateOne(
            { id: assumptionsId },
            { $set: { ...updateData, updatedBy: userId } }
        );

        return this.findOne({ id: assumptionsId });
    },

    /**
     * Delete assumptions
     * @param {string} assumptionsId - Assumptions ID
     * @returns {Object} Delete result
     */
    async deleteAssumptions(assumptionsId) {
        return this.deleteOne({ id: assumptionsId });
    },

    /**
     * Delete assumptions for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Delete result
     */
    async deleteByValuationId(valuationId) {
        const assumptions = await this.findByValuationId(valuationId);
        if (assumptions) {
            await this.deleteOne({ id: assumptions.id });
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    },

    /**
     * Validate assumptions are complete for valuation approval
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Validation result
     */
    async validateForApproval(valuationId) {
        const assumptions = await this.findByValuationId(valuationId);

        if (!assumptions) {
            return {
                valid: false,
                errors: ['No assumptions found for valuation']
            };
        }

        const errors = [];
        const warnings = [];

        // Required fields for approval
        if (assumptions.discountRate === undefined || assumptions.discountRate === null) {
            errors.push('Discount rate is required');
        }

        if (assumptions.dlom === undefined || assumptions.dlom === null) {
            errors.push('DLOM (Discount for Lack of Marketability) is required');
        }

        // Warnings for recommended fields
        if (!assumptions.exitScenario) {
            warnings.push('Exit scenario not specified');
        }

        if (assumptions.timeToLiquidityYears === undefined) {
            warnings.push('Time to liquidity not specified');
        }

        if (!assumptions.assumptionsNarrative) {
            warnings.push('Assumptions narrative not provided');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            assumptions
        };
    },

    /**
     * Get assumptions summary for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Summary
     */
    async getAssumptionsSummary(valuationId) {
        const assumptions = await this.findByValuationId(valuationId);

        if (!assumptions) {
            return null;
        }

        return {
            valuationId,
            hasAssumptions: true,
            keyRates: {
                discountRate: assumptions.discountRate,
                riskFreeRate: assumptions.riskFreeRate,
                equityVolatility: assumptions.equityVolatility,
                terminalGrowthRate: assumptions.terminalGrowthRate
            },
            discounts: {
                dlom: assumptions.dlom,
                dloc: assumptions.dloc
            },
            exitAssumptions: {
                scenario: assumptions.exitScenario,
                timeToLiquidityYears: assumptions.timeToLiquidityYears
            },
            treatments: {
                optionPool: assumptions.optionPoolTreatment,
                safeNote: assumptions.safeNoteTreatment
            },
            marketMultiples: {
                revenue: assumptions.revenueMultiple,
                ebitda: assumptions.ebitdaMultiple
            }
        };
    }
};

module.exports = ValuationAssumptions;
