/**
 * ValuationMethods Model
 * Feature: Issue #263 - Create valuation_assumptions and valuation_methods tables
 *
 * Stores which valuation methods were used and their relative weights.
 * Required for 409A audit defense and IRS compliance.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Valuation method types
const VALUATION_METHODS = [
    'BACKSOLVE_OPM',        // Option Pricing Model backsolve
    'PWERM',                // Probability-Weighted Expected Return
    'DCF',                  // Discounted Cash Flow
    'MARKET_MULTIPLES',     // Guideline public company method
    'TRANSACTION_MULTIPLES', // Guideline transaction method
    'ASSET_BASED',          // Net asset value
    'HYBRID',               // Combination approach
    'RULE_OF_THUMB'         // Industry-specific rules
];

// Schema definition (for documentation and validation reference)
const schema = {
    // Unique identifier
    id: { type: 'string', unique: true, index: true },

    // Links to Valuation409A
    valuationId: { type: 'string', required: true, index: true },

    // Valuation methodology used
    method: {
        type: 'string',
        enum: VALUATION_METHODS,
        required: true
    },

    // Weight in final value (0.00-1.00)
    weight: {
        type: 'number',
        min: 0,
        max: 1,
        required: true
    },

    // Value from this method
    methodValue: {
        type: 'number',
        min: 0,
        required: true
    },

    // Brief description of approach
    summary: { type: 'string' },

    // List of comparable companies used (if applicable)
    comparableCompanies: {
        type: 'array',
        items: {
            name: { type: 'string' },
            ticker: { type: 'string' },
            industry: { type: 'string' },
            marketCap: { type: 'number' },
            revenueMultiple: { type: 'number' },
            ebitdaMultiple: { type: 'number' }
        },
        default: []
    },

    // Metadata
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' }
};

// Create base model
const baseModel = createModel('valuation_methods', schema);

// Extended ValuationMethods model with custom methods
const ValuationMethods = {
    ...baseModel,
    tableName: 'valuation_methods',
    schema,
    VALUATION_METHODS,

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
     * Create a new valuation method record
     * @param {Object} data - Method data
     * @returns {Object} Created method record
     */
    async create(data) {
        // Validate method enum
        if (!VALUATION_METHODS.includes(data.method)) {
            throw new Error(`Invalid method: ${data.method}. Must be one of: ${VALUATION_METHODS.join(', ')}`);
        }

        // Validate weight range
        if (data.weight < 0 || data.weight > 1) {
            throw new Error('Weight must be between 0 and 1');
        }

        // Validate methodValue is positive
        if (data.methodValue < 0) {
            throw new Error('Method value must be positive');
        }

        const methodData = {
            ...data,
            id: data.id || `vm_${uuidv4()}`,
            comparableCompanies: data.comparableCompanies || []
        };
        return baseModel.create(methodData);
    },

    /**
     * Find methods by valuation ID
     * @param {string} valuationId - Valuation ID
     * @returns {Array} Method records
     */
    async findByValuationId(valuationId) {
        return this.find({ valuationId }, { sort: { weight: -1 } });
    },

    /**
     * Validate that method weights sum to 1.0 for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Validation result
     */
    async validateWeights(valuationId) {
        const methods = await this.findByValuationId(valuationId);

        if (methods.length === 0) {
            return { valid: false, total: 0, error: 'No methods found for valuation' };
        }

        const total = methods.reduce((sum, m) => sum + (m.weight || 0), 0);
        const isValid = Math.abs(total - 1.0) < 0.0001; // Allow small floating point tolerance

        return {
            valid: isValid,
            total: Math.round(total * 10000) / 10000,
            methods: methods.length,
            error: isValid ? null : `Method weights sum to ${total}, must equal 1.0`
        };
    },

    /**
     * Calculate weighted average value from all methods
     * @param {string} valuationId - Valuation ID
     * @returns {number} Weighted average value
     */
    async calculateWeightedValue(valuationId) {
        const methods = await this.findByValuationId(valuationId);

        if (methods.length === 0) {
            return null;
        }

        const weightedSum = methods.reduce((sum, m) => {
            return sum + (m.methodValue * m.weight);
        }, 0);

        return Math.round(weightedSum * 100) / 100;
    },

    /**
     * Add a method to a valuation
     * @param {string} valuationId - Valuation ID
     * @param {Object} methodData - Method data
     * @param {string} userId - User ID
     * @returns {Object} Created method
     */
    async addMethod(valuationId, methodData, userId) {
        return this.create({
            ...methodData,
            valuationId,
            createdBy: userId
        });
    },

    /**
     * Update a method
     * @param {string} methodId - Method ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID
     * @returns {Object} Updated method
     */
    async updateMethod(methodId, updateData, userId) {
        // Validate method enum if provided
        if (updateData.method && !VALUATION_METHODS.includes(updateData.method)) {
            throw new Error(`Invalid method: ${updateData.method}. Must be one of: ${VALUATION_METHODS.join(', ')}`);
        }

        // Validate weight range if provided
        if (updateData.weight !== undefined && (updateData.weight < 0 || updateData.weight > 1)) {
            throw new Error('Weight must be between 0 and 1');
        }

        // Validate methodValue if provided
        if (updateData.methodValue !== undefined && updateData.methodValue < 0) {
            throw new Error('Method value must be positive');
        }

        await this.updateOne(
            { id: methodId },
            { $set: { ...updateData, updatedBy: userId } }
        );

        return this.findOne({ id: methodId });
    },

    /**
     * Delete a method
     * @param {string} methodId - Method ID
     * @returns {Object} Delete result
     */
    async deleteMethod(methodId) {
        return this.deleteOne({ id: methodId });
    },

    /**
     * Delete all methods for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Delete result
     */
    async deleteByValuationId(valuationId) {
        const methods = await this.findByValuationId(valuationId);
        for (const method of methods) {
            await this.deleteOne({ id: method.id });
        }
        return { deletedCount: methods.length };
    },

    /**
     * Get method summary for a valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Object} Summary
     */
    async getMethodSummary(valuationId) {
        const methods = await this.findByValuationId(valuationId);
        const weightValidation = await this.validateWeights(valuationId);
        const weightedValue = await this.calculateWeightedValue(valuationId);

        return {
            valuationId,
            methodCount: methods.length,
            methods: methods.map(m => ({
                method: m.method,
                weight: m.weight,
                methodValue: m.methodValue
            })),
            weightsValid: weightValidation.valid,
            totalWeight: weightValidation.total,
            calculatedValue: weightedValue
        };
    }
};

module.exports = ValuationMethods;
