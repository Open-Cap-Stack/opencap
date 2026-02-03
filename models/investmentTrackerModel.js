/**
 * Investment Tracker Model
 *
 * Migrated: ZeroDB Migration - Issue #175
 *
 * Tracks investments including company, equity percentage, and current value.
 */

const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

const trackerSchema = {
    TrackID: { type: 'string', required: true, unique: true },
    Company: { type: 'string' },
    EquityPercentage: { type: 'number' },
    CurrentValue: { type: 'number' }
};

const baseModel = createModel('companies', trackerSchema);

/**
 * Validate investment tracker data
 * @param {Object} data - Investment tracker data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateTracker(data) {
    const errors = [];

    if (!data.TrackID) {
        errors.push('TrackID is required');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

const InvestmentTracker = {
    ...baseModel,

    /**
     * Create a new investment tracker with validation
     * @param {Object} data - Investment tracker data
     * @returns {Object} Created investment tracker
     */
    async create(data) {
        const validation = validateTracker(data);
        if (!validation.isValid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Check for duplicate TrackID
        const existing = await this.findByTrackId(data.TrackID);
        if (existing) {
            const error = new Error(`Duplicate key error: TrackID ${data.TrackID} already exists`);
            error.code = 11000;
            throw error;
        }

        const doc = {
            ...data,
            _type: 'investment_tracker'
        };

        return baseModel.create(doc);
    },

    /**
     * Find investment tracker by TrackID
     * @param {string} trackId - Track ID
     * @returns {Object|null} Investment tracker or null
     */
    async findByTrackId(trackId) {
        return baseModel.findOne({ TrackID: trackId, _type: 'investment_tracker' });
    },

    /**
     * Find investment trackers by company
     * @param {string} company - Company name
     * @param {Object} options - Query options
     * @returns {Array} Investment trackers for company
     */
    async findByCompany(company, options = {}) {
        return baseModel.find(
            { Company: company, _type: 'investment_tracker' },
            options
        );
    },

    /**
     * Update investment tracker values
     * @param {string} trackId - Track ID
     * @param {Object} updateData - Data to update
     * @returns {Object|null} Updated investment tracker
     */
    async updateByTrackId(trackId, updateData) {
        await baseModel.updateOne(
            { TrackID: trackId, _type: 'investment_tracker' },
            { $set: updateData }
        );
        return this.findByTrackId(trackId);
    },

    /**
     * Delete investment tracker
     * @param {string} trackId - Track ID
     * @returns {Object} Delete result
     */
    async deleteByTrackId(trackId) {
        return baseModel.deleteOne({ TrackID: trackId, _type: 'investment_tracker' });
    },

    /**
     * Get total portfolio value
     * @returns {number} Total current value across all trackers
     */
    async getTotalPortfolioValue() {
        const trackers = await baseModel.find({ _type: 'investment_tracker' });
        return trackers.reduce((total, tracker) => total + (tracker.CurrentValue || 0), 0);
    },

    /**
     * Get total equity percentage
     * @returns {number} Total equity percentage across all trackers
     */
    async getTotalEquityPercentage() {
        const trackers = await baseModel.find({ _type: 'investment_tracker' });
        return trackers.reduce((total, tracker) => total + (tracker.EquityPercentage || 0), 0);
    },

    /**
     * Find all investment trackers (filtered by type)
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Array} Investment trackers
     */
    async find(query = {}, options = {}) {
        return baseModel.find({ ...query, _type: 'investment_tracker' }, options);
    },

    /**
     * Find a single investment tracker
     * @param {Object} query - Query filter
     * @param {Object} options - Query options
     * @returns {Object|null} Investment tracker or null
     */
    async findOne(query = {}, options = {}) {
        return baseModel.findOne({ ...query, _type: 'investment_tracker' }, options);
    },

    /**
     * Count investment trackers matching query
     * @param {Object} query - Query filter
     * @returns {number} Count
     */
    async countDocuments(query = {}) {
        return baseModel.countDocuments({ ...query, _type: 'investment_tracker' });
    }
};

module.exports = InvestmentTracker;
