/**
 * Migration Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Tracks database migrations and their status for schema evolution.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const migrationSchema = {
    name: { type: 'string', required: true, unique: true },
    description: { type: 'string' },
    applied: { type: 'boolean', default: false },
    registered: { type: 'date' },
    appliedAt: { type: 'date' },
    version: { type: 'number' },
    error: {
        message: { type: 'string' },
        stack: { type: 'string' },
        occurredAt: { type: 'date' }
    }
};

const baseModel = createModel('companies', migrationSchema);

/**
 * Validate migration data
 * @param {Object} data - Migration data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateMigration(data) {
    const errors = [];

    if (!data.name || !data.name.trim()) {
        errors.push('name is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const Migration = {
    ...baseModel,

    /**
     * Create a new migration with validation
     * @param {Object} data - Migration data
     * @returns {Object} Created migration
     */
    async create(data) {
        const validation = validateMigration(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Check for duplicate name
        const existing = await this.findByName(data.name);
        if (existing) {
            const error = new Error(`Duplicate key error: migration name ${data.name} already exists`);
            error.code = 11000;
            throw error;
        }

        const doc = {
            ...data,
            name: data.name.trim(),
            applied: data.applied || false,
            registered: data.registered || new Date().toISOString(),
            appliedAt: data.applied ? (data.appliedAt || new Date().toISOString()) : null,
            _type: 'migration'
        };

        return baseModel.create(doc);
    },

    /**
     * Find migration by name
     * @param {string} name - Migration name
     * @returns {Object|null} Migration or null
     */
    async findByName(name) {
        return baseModel.findOne({ name, _type: 'migration' });
    },

    /**
     * Get pending migrations (not yet applied)
     * @returns {Array} Pending migrations sorted by registered date
     */
    async getPending() {
        const migrations = await baseModel.find(
            { applied: false, _type: 'migration' },
            { sort: { registered: 1 } }
        );
        return migrations;
    },

    /**
     * Get applied migrations
     * @returns {Array} Applied migrations sorted by appliedAt date
     */
    async getApplied() {
        const migrations = await baseModel.find(
            { applied: true, _type: 'migration' },
            { sort: { appliedAt: 1 } }
        );
        return migrations;
    },

    /**
     * Mark a migration as applied
     * @param {string} name - Migration name
     * @returns {Object|null} Updated migration
     */
    async markApplied(name) {
        await baseModel.updateOne(
            { name, _type: 'migration' },
            { $set: { applied: true, appliedAt: new Date().toISOString() } }
        );
        return this.findByName(name);
    },

    /**
     * Mark a migration as rolled back
     * @param {string} name - Migration name
     * @returns {Object|null} Updated migration
     */
    async markRolledBack(name) {
        await baseModel.updateOne(
            { name, _type: 'migration' },
            { $set: { applied: false, appliedAt: null } }
        );
        return this.findByName(name);
    },

    /**
     * Record migration error
     * @param {string} name - Migration name
     * @param {Error} error - Error object
     * @returns {Object|null} Updated migration
     */
    async recordError(name, error) {
        await baseModel.updateOne(
            { name, _type: 'migration' },
            {
                $set: {
                    error: {
                        message: error.message,
                        stack: error.stack,
                        occurredAt: new Date().toISOString()
                    }
                }
            }
        );
        return this.findByName(name);
    },

    /**
     * Clear migration error
     * @param {string} name - Migration name
     * @returns {Object|null} Updated migration
     */
    async clearError(name) {
        await baseModel.updateOne(
            { name, _type: 'migration' },
            { $set: { error: null } }
        );
        return this.findByName(name);
    },

    /**
     * Get migrations with errors
     * @returns {Array} Migrations that have errors
     */
    async getWithErrors() {
        const allMigrations = await baseModel.find({ _type: 'migration' });
        return allMigrations.filter(m => m.error && m.error.message);
    },

    /**
     * Delete migration
     * @param {string} name - Migration name
     * @returns {Object} Delete result
     */
    async deleteByName(name) {
        return baseModel.deleteOne({ name, _type: 'migration' });
    },

    /**
     * Find all migrations (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Migrations
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'migration' }, options);
    },

    /**
     * Find a single migration
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Migration or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'migration' }, options);
    },

    /**
     * Count migrations matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'migration' });
    }
};

module.exports = Migration;
