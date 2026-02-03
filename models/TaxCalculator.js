/**
 * TaxCalculator Model
 * Migrated: ZeroDB Migration - Issue #175
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition (for documentation)
const schema = {
    _id: { type: 'string', required: true },
    calculationId: { type: 'string', required: true, unique: true },
    SaleScenario: { type: 'object', required: true },
    ShareClassInvolved: { type: 'string', required: true },
    SaleAmount: { type: 'number', required: true },
    TaxRate: { type: 'number', required: true },
    TaxImplication: { type: 'object', required: true },
    CalculatedTax: { type: 'number', required: true },
    TaxDueDate: { type: 'date', required: true },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Validation function
const validateTaxCalculation = (data) => {
    const errors = [];

    if (!data.calculationId) {
        errors.push('calculationId is required');
    }

    if (!data.SaleScenario || typeof data.SaleScenario !== 'object') {
        errors.push('SaleScenario is required and must be an object');
    }

    if (!data.ShareClassInvolved) {
        errors.push('ShareClassInvolved is required');
    }

    if (typeof data.SaleAmount !== 'number' || data.SaleAmount < 0) {
        errors.push('SaleAmount is required and must be a non-negative number');
    }

    if (typeof data.TaxRate !== 'number' || data.TaxRate < 0 || data.TaxRate > 1) {
        errors.push('TaxRate is required and must be between 0 and 1');
    }

    if (!data.TaxImplication || typeof data.TaxImplication !== 'object') {
        errors.push('TaxImplication is required and must be an object');
    }

    if (typeof data.CalculatedTax !== 'number') {
        errors.push('CalculatedTax is required and must be a number');
    }

    if (!data.TaxDueDate) {
        errors.push('TaxDueDate is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

// Create base model
const baseModel = createModel('tax_calculations', schema);

// Extended model with custom methods
const TaxCalculator = {
    ...baseModel,

    /**
     * Create a new tax calculation with validation
     * @param {Object} data - Tax calculation data
     * @returns {Object} Created tax calculation
     */
    async create(data) {
        // Generate calculationId if not provided
        const calculationId = data.calculationId || `tax_${uuidv4()}`;

        // Prepare data with calculationId
        const calcData = {
            ...data,
            calculationId
        };

        // Validate data
        const validation = validateTaxCalculation(calcData);
        if (!validation.valid) {
            const error = new Error(validation.errors.join(', '));
            error.name = 'ValidationError';
            throw error;
        }

        // Check for duplicate calculationId
        const existing = await baseModel.findOne({ calculationId });
        if (existing) {
            const error = new Error('A tax calculation with this calculationId already exists');
            error.name = 'DuplicateError';
            throw error;
        }

        // Normalize date
        const normalizedData = {
            ...calcData,
            TaxDueDate: calcData.TaxDueDate instanceof Date
                ? calcData.TaxDueDate.toISOString()
                : new Date(calcData.TaxDueDate).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        return baseModel.create(normalizedData);
    },

    /**
     * Find by calculation ID
     * @param {string} calculationId - The calculation ID
     * @returns {Object|null} Tax calculation or null
     */
    async findByCalculationId(calculationId) {
        return baseModel.findOne({ calculationId });
    },

    /**
     * Find by share class
     * @param {string} shareClass - Share class involved
     * @returns {Array} Tax calculations for the share class
     */
    async findByShareClass(shareClass) {
        return baseModel.find({ ShareClassInvolved: shareClass });
    },

    /**
     * Find calculations due before a date
     * @param {Date} date - Due date threshold
     * @returns {Array} Tax calculations due before the date
     */
    async findDueBefore(date) {
        const dateStr = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
        const results = await baseModel.find({});
        return results.filter(calc => calc.TaxDueDate < dateStr);
    },

    /**
     * Calculate total tax for a set of calculations
     * @param {Array} calculations - Array of tax calculations
     * @returns {number} Total calculated tax
     */
    calculateTotalTax(calculations) {
        return calculations.reduce((sum, calc) => sum + (calc.CalculatedTax || 0), 0);
    },

    /**
     * Update a tax calculation
     * @param {string} calculationId - Calculation ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated calculation
     */
    async updateByCalculationId(calculationId, updateData) {
        const updateFields = {
            ...updateData,
            updatedAt: new Date().toISOString()
        };

        // Normalize date if provided
        if (updateFields.TaxDueDate) {
            updateFields.TaxDueDate = updateFields.TaxDueDate instanceof Date
                ? updateFields.TaxDueDate.toISOString()
                : new Date(updateFields.TaxDueDate).toISOString();
        }

        return baseModel.findOneAndUpdate(
            { calculationId },
            { $set: updateFields },
            { new: true }
        );
    },

    /**
     * Delete by calculation ID
     * @param {string} calculationId - Calculation ID
     * @returns {Object} Delete result
     */
    async deleteByCalculationId(calculationId) {
        return baseModel.deleteOne({ calculationId });
    },

    // Expose validation
    validateTaxCalculation
};

module.exports = TaxCalculator;
