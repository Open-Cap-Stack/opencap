/**
 * Integration Module Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Manages external tool integrations and their configurations.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const integrationSchema = {
    IntegrationID: { type: 'string', required: true, unique: true },
    ToolName: { type: 'string', required: true },
    Description: { type: 'string' },
    Link: { type: 'string' }
};

const baseModel = createModel('companies', integrationSchema);

/**
 * Validate integration data
 * @param {Object} data - Integration data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateIntegration(data) {
    const errors = [];

    if (!data.IntegrationID) {
        errors.push('IntegrationID is required');
    }

    if (!data.ToolName) {
        errors.push('ToolName is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const IntegrationModule = {
    ...baseModel,

    /**
     * Create a new integration with validation
     * @param {Object} data - Integration data
     * @returns {Object} Created integration
     */
    async create(data) {
        const validation = validateIntegration(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Check for duplicate IntegrationID
        const existing = await this.findByIntegrationId(data.IntegrationID);
        if (existing) {
            const error = new Error(`Duplicate key error: IntegrationID ${data.IntegrationID} already exists`);
            error.code = 11000;
            throw error;
        }

        const doc = {
            ...data,
            _type: 'integration_module'
        };

        return baseModel.create(doc);
    },

    /**
     * Find integration by IntegrationID
     * @param {string} integrationId - Integration ID
     * @returns {Object|null} Integration or null
     */
    async findByIntegrationId(integrationId) {
        return baseModel.findOne({ IntegrationID: integrationId, _type: 'integration_module' });
    },

    /**
     * Find integrations by tool name
     * @param {string} toolName - Tool name
     * @param {Object} options - Query options
     * @returns {Array} Integrations with tool name
     */
    async findByToolName(toolName, options = {}) {
        return baseModel.find(
            { ToolName: toolName, _type: 'integration_module' },
            options
        );
    },

    /**
     * Update integration
     * @param {string} integrationId - Integration ID
     * @param {Object} updateData - Data to update
     * @returns {Object|null} Updated integration
     */
    async updateByIntegrationId(integrationId, updateData) {
        await baseModel.updateOne(
            { IntegrationID: integrationId, _type: 'integration_module' },
            { $set: updateData }
        );
        return this.findByIntegrationId(integrationId);
    },

    /**
     * Delete integration
     * @param {string} integrationId - Integration ID
     * @returns {Object} Delete result
     */
    async deleteByIntegrationId(integrationId) {
        return baseModel.deleteOne({ IntegrationID: integrationId, _type: 'integration_module' });
    },

    /**
     * Find all integrations (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Integrations
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'integration_module' }, options);
    },

    /**
     * Find a single integration
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Integration or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'integration_module' }, options);
    },

    /**
     * Count integrations matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'integration_module' });
    }
};

module.exports = IntegrationModule;
