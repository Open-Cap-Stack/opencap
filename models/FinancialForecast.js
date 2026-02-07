/**
 * FinancialForecast Model
 * Feature: Issue #264 - Create financial forecasts model for DCF valuation inputs
 *
 * Implements models for storing management-approved financial projections
 * required for Income Approach (DCF) valuation methodology.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Forecast metrics enum - comprehensive list for DCF inputs
const FORECAST_METRICS = [
    // Revenue
    'REVENUE',
    'REVENUE_RECURRING',
    'REVENUE_SERVICES',
    'REVENUE_OTHER',

    // Costs
    'COGS',
    'GROSS_PROFIT',
    'GROSS_MARGIN_PCT',

    // Operating Expenses
    'OPEX_TOTAL',
    'OPEX_RD',
    'OPEX_SALES_MARKETING',
    'OPEX_GENERAL_ADMIN',

    // Profitability
    'EBITDA',
    'EBITDA_MARGIN_PCT',
    'EBIT',
    'NET_INCOME',

    // Cash
    'CASH_BURN',
    'CASH_BALANCE',
    'FREE_CASH_FLOW',

    // Operational
    'HEADCOUNT',
    'CUSTOMERS',
    'ARR',
    'MRR',

    // Capital
    'CAPEX',
    'WORKING_CAPITAL'
];

// Schema definition for forecasts table
const forecastSchema = {
    // Unique identifier
    forecastId: { type: 'string', unique: true, index: true },

    // Company reference
    companyId: { type: 'string', required: true, index: true },

    // Forecast metadata
    name: { type: 'string', required: true },
    description: { type: 'string' },

    // Forecast type
    forecastType: {
        type: 'string',
        enum: ['BUDGET', 'PROJECTION', 'SCENARIO'],
        required: true
    },

    // Scenario type for DCF modeling
    scenarioType: {
        type: 'string',
        enum: ['BASE', 'BULL', 'BEAR'],
        default: 'BASE'
    },

    // Period configuration
    startDate: { type: 'date', required: true },
    endDate: { type: 'date', required: true },
    periodType: {
        type: 'string',
        enum: ['MONTHLY', 'QUARTERLY', 'ANNUAL'],
        default: 'ANNUAL'
    },

    // Status workflow
    status: {
        type: 'string',
        enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'SUPERSEDED'],
        default: 'DRAFT',
        required: true,
        index: true
    },

    // User tracking
    createdBy: { type: 'string', required: true },
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },

    // Board approval linkage
    boardApprovalId: { type: 'string' },

    // Valuation linkage for DCF
    valuationId: { type: 'string', index: true },

    // Growth assumptions for DCF
    growthAssumptions: {
        revenueGrowthRate: { type: 'number' },
        terminalGrowthRate: { type: 'number' },
        discountRate: { type: 'number' },
        taxRate: { type: 'number' }
    },

    // Status history for audit trail
    statusHistory: {
        type: 'array',
        items: {
            status: { type: 'string', required: true },
            changedAt: { type: 'date' },
            changedBy: { type: 'string' },
            reason: { type: 'string' }
        }
    },

    // Additional notes
    notes: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    metadata: { type: 'object', default: {} }
};

// Schema definition for forecast_lines table
const forecastLineSchema = {
    // Unique identifier
    lineId: { type: 'string', unique: true, index: true },

    // Parent forecast reference
    forecastId: { type: 'string', required: true, index: true },

    // Period for this line
    periodStart: { type: 'date', required: true },
    periodEnd: { type: 'date', required: true },

    // Metric type
    metric: {
        type: 'string',
        enum: FORECAST_METRICS,
        required: true
    },

    // Value
    value: { type: 'number', required: true },
    currency: { type: 'string', default: 'USD' },

    // Confidence level
    confidence: {
        type: 'string',
        enum: ['HIGH', 'MEDIUM', 'LOW'],
        default: 'MEDIUM'
    },

    // Assumptions and notes
    notes: { type: 'string' }
};

// Valid status transitions
const validTransitions = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['APPROVED', 'DRAFT'],
    APPROVED: ['SUPERSEDED'],
    SUPERSEDED: []
};

// Create base models
const baseForecastModel = createModel('forecasts', forecastSchema);
const baseForecastLineModel = createModel('forecast_lines', forecastLineSchema);

// Extended FinancialForecast model with custom methods
const FinancialForecast = {
    ...baseForecastModel,
    tableName: 'forecasts',
    schema: forecastSchema,
    FORECAST_METRICS,

    // Delegate core methods to baseModel
    async find(query, options) {
        return baseForecastModel.find.call(baseForecastModel, query, options);
    },

    async findOne(query, options) {
        return baseForecastModel.findOne.call(baseForecastModel, query, options);
    },

    async findById(id, options) {
        return baseForecastModel.findById.call(baseForecastModel, id, options);
    },

    async updateOne(query, update, options) {
        return baseForecastModel.updateOne.call(baseForecastModel, query, update, options);
    },

    async deleteOne(query) {
        return baseForecastModel.deleteOne.call(baseForecastModel, query);
    },

    async countDocuments(query) {
        return baseForecastModel.countDocuments.call(baseForecastModel, query);
    },

    /**
     * Create a new forecast with generated forecastId
     * @param {Object} data - Forecast data
     * @returns {Object} Created forecast
     */
    async create(data) {
        // Validate required fields
        if (!data.companyId) {
            throw new Error('companyId is required');
        }
        if (!data.name) {
            throw new Error('name is required');
        }
        if (!data.forecastType) {
            throw new Error('forecastType is required');
        }
        if (!data.startDate) {
            throw new Error('startDate is required');
        }
        if (!data.endDate) {
            throw new Error('endDate is required');
        }
        if (!data.createdBy) {
            throw new Error('createdBy is required');
        }

        // Validate forecastType enum
        const validForecastTypes = ['BUDGET', 'PROJECTION', 'SCENARIO'];
        if (!validForecastTypes.includes(data.forecastType)) {
            throw new Error(`Invalid forecastType: ${data.forecastType}`);
        }

        // Validate scenarioType enum if provided
        if (data.scenarioType) {
            const validScenarioTypes = ['BASE', 'BULL', 'BEAR'];
            if (!validScenarioTypes.includes(data.scenarioType)) {
                throw new Error(`Invalid scenarioType: ${data.scenarioType}`);
            }
        }

        // Validate date range
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);
        if (endDate <= startDate) {
            throw new Error('endDate must be after startDate');
        }

        const forecastData = {
            ...data,
            forecastId: data.forecastId || `forecast_${uuidv4()}`,
            status: data.status || 'DRAFT',
            scenarioType: data.scenarioType || 'BASE',
            periodType: data.periodType || 'ANNUAL',
            statusHistory: data.statusHistory || [{
                status: 'DRAFT',
                changedAt: new Date().toISOString(),
                changedBy: data.createdBy,
                reason: 'Forecast created'
            }],
            growthAssumptions: data.growthAssumptions || {},
            metadata: data.metadata || {}
        };

        return baseForecastModel.create(forecastData);
    },

    /**
     * Check if status transition is valid
     * @param {string} currentStatus - Current status
     * @param {string} newStatus - New status
     * @returns {boolean}
     */
    canTransitionTo(currentStatus, newStatus) {
        return validTransitions[currentStatus]?.includes(newStatus) || false;
    },

    /**
     * Transition forecast to new status
     * @param {string} forecastId - Forecast ID
     * @param {string} newStatus - New status
     * @param {string} userId - User making the change
     * @param {string} reason - Reason for change
     * @returns {Object} Updated forecast
     */
    async transitionTo(forecastId, newStatus, userId, reason = null) {
        const forecast = await this.findOne({ forecastId });
        if (!forecast) {
            throw new Error('Forecast not found');
        }

        if (!this.canTransitionTo(forecast.status, newStatus)) {
            throw new Error(`Cannot transition from ${forecast.status} to ${newStatus}`);
        }

        const statusHistory = forecast.statusHistory || [];
        statusHistory.push({
            status: newStatus,
            changedAt: new Date().toISOString(),
            changedBy: userId,
            reason
        });

        const updateData = {
            status: newStatus,
            statusHistory
        };

        if (newStatus === 'APPROVED') {
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date().toISOString();
        }

        await this.updateOne({ forecastId }, { $set: updateData });
        return this.findOne({ forecastId });
    },

    /**
     * Submit forecast for approval
     * @param {string} forecastId - Forecast ID
     * @param {string} userId - User submitting
     * @returns {Object} Updated forecast
     */
    async submit(forecastId, userId) {
        return this.transitionTo(forecastId, 'SUBMITTED', userId, 'Submitted for approval');
    },

    /**
     * Approve forecast
     * @param {string} forecastId - Forecast ID
     * @param {string} userId - User approving
     * @param {string} boardApprovalId - Optional board approval ID
     * @returns {Object} Updated forecast
     */
    async approve(forecastId, userId, boardApprovalId = null) {
        const forecast = await this.findOne({ forecastId });
        if (!forecast) {
            throw new Error('Forecast not found');
        }

        // Check for existing approved forecast for this company
        const existingApproved = await this.find({
            companyId: forecast.companyId,
            status: 'APPROVED'
        });

        // Supersede existing approved forecasts
        for (const existing of existingApproved) {
            if (existing.forecastId !== forecastId) {
                await this.transitionTo(existing.forecastId, 'SUPERSEDED', userId, 'Superseded by new approved forecast');
            }
        }

        if (boardApprovalId) {
            await this.updateOne({ forecastId }, { $set: { boardApprovalId } });
        }

        return this.transitionTo(forecastId, 'APPROVED', userId, 'Forecast approved');
    },

    /**
     * Link forecast to valuation
     * @param {string} forecastId - Forecast ID
     * @param {string} valuationId - Valuation ID
     * @param {string} userId - User linking
     * @returns {Object} Updated forecast
     */
    async linkToValuation(forecastId, valuationId, userId) {
        const forecast = await this.findOne({ forecastId });
        if (!forecast) {
            throw new Error('Forecast not found');
        }

        if (forecast.status !== 'APPROVED') {
            throw new Error('Only approved forecasts can be linked to valuations');
        }

        await this.updateOne({ forecastId }, { $set: { valuationId } });
        return this.findOne({ forecastId });
    },

    /**
     * Check if forecast is stale (>6 months old)
     * @param {Object} forecast - Forecast document
     * @returns {boolean}
     */
    isStale(forecast) {
        if (!forecast.approvedAt) return false;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(forecast.approvedAt) < sixMonthsAgo;
    },

    /**
     * Find forecasts by company
     * @param {string} companyId - Company ID
     * @param {string} status - Optional status filter
     * @returns {Array} Forecasts
     */
    async findByCompany(companyId, status = null) {
        const query = { companyId };
        if (status) query.status = status;
        return this.find(query, { sort: { createdAt: -1 } });
    },

    /**
     * Find latest approved forecast for company
     * @param {string} companyId - Company ID
     * @returns {Object|null} Latest approved forecast
     */
    async findLatestApproved(companyId) {
        const forecasts = await this.find({
            companyId,
            status: 'APPROVED'
        }, { sort: { approvedAt: -1 } });

        return forecasts[0] || null;
    },

    /**
     * Update growth assumptions
     * @param {string} forecastId - Forecast ID
     * @param {Object} assumptions - Growth assumptions
     * @param {string} userId - User updating
     * @returns {Object} Updated forecast
     */
    async updateGrowthAssumptions(forecastId, assumptions, userId) {
        const forecast = await this.findOne({ forecastId });
        if (!forecast) {
            throw new Error('Forecast not found');
        }

        if (forecast.status === 'APPROVED') {
            throw new Error('Cannot modify approved forecasts');
        }

        const growthAssumptions = {
            ...forecast.growthAssumptions,
            ...assumptions
        };

        await this.updateOne({ forecastId }, { $set: { growthAssumptions } });
        return this.findOne({ forecastId });
    },

    /**
     * Validate forecast period coverage
     * @param {Object} forecast - Forecast document
     * @param {Array} lines - Forecast lines
     * @returns {Object} Validation result
     */
    validatePeriodCoverage(forecast, lines) {
        const startDate = new Date(forecast.startDate);
        const endDate = new Date(forecast.endDate);
        const errors = [];

        // Group lines by period
        const periods = new Map();
        for (const line of lines) {
            const periodKey = `${line.periodStart}_${line.periodEnd}`;
            if (!periods.has(periodKey)) {
                periods.set(periodKey, []);
            }
            periods.get(periodKey).push(line);
        }

        // Check for gaps (simplified check)
        if (lines.length === 0) {
            errors.push('No forecast lines defined');
        }

        return {
            valid: errors.length === 0,
            errors,
            periodCount: periods.size
        };
    }
};

// Extended ForecastLine model with custom methods
const ForecastLine = {
    ...baseForecastLineModel,
    tableName: 'forecast_lines',
    schema: forecastLineSchema,
    FORECAST_METRICS,

    // Delegate core methods to baseModel
    async find(query, options) {
        return baseForecastLineModel.find.call(baseForecastLineModel, query, options);
    },

    async findOne(query, options) {
        return baseForecastLineModel.findOne.call(baseForecastLineModel, query, options);
    },

    async updateOne(query, update, options) {
        return baseForecastLineModel.updateOne.call(baseForecastLineModel, query, update, options);
    },

    async deleteOne(query) {
        return baseForecastLineModel.deleteOne.call(baseForecastLineModel, query);
    },

    async deleteMany(query) {
        return baseForecastLineModel.deleteMany.call(baseForecastLineModel, query);
    },

    /**
     * Create a new forecast line with generated lineId
     * @param {Object} data - Line data
     * @returns {Object} Created line
     */
    async create(data) {
        // Validate required fields
        if (!data.forecastId) {
            throw new Error('forecastId is required');
        }
        if (!data.periodStart) {
            throw new Error('periodStart is required');
        }
        if (!data.periodEnd) {
            throw new Error('periodEnd is required');
        }
        if (!data.metric) {
            throw new Error('metric is required');
        }
        if (data.value === undefined || data.value === null) {
            throw new Error('value is required');
        }

        // Validate metric enum
        if (!FORECAST_METRICS.includes(data.metric)) {
            throw new Error(`Invalid metric: ${data.metric}`);
        }

        // Validate confidence enum if provided
        if (data.confidence) {
            const validConfidence = ['HIGH', 'MEDIUM', 'LOW'];
            if (!validConfidence.includes(data.confidence)) {
                throw new Error(`Invalid confidence: ${data.confidence}`);
            }
        }

        const lineData = {
            ...data,
            lineId: data.lineId || `line_${uuidv4()}`,
            currency: data.currency || 'USD',
            confidence: data.confidence || 'MEDIUM'
        };

        return baseForecastLineModel.create(lineData);
    },

    /**
     * Create multiple forecast lines
     * @param {Array} dataArray - Array of line data
     * @returns {Array} Created lines
     */
    async createMany(dataArray) {
        const results = [];
        for (const data of dataArray) {
            const line = await this.create(data);
            results.push(line);
        }
        return results;
    },

    /**
     * Find lines by forecast
     * @param {string} forecastId - Forecast ID
     * @returns {Array} Forecast lines
     */
    async findByForecast(forecastId) {
        return this.find({ forecastId }, { sort: { periodStart: 1, metric: 1 } });
    },

    /**
     * Find lines by metric
     * @param {string} forecastId - Forecast ID
     * @param {string} metric - Metric type
     * @returns {Array} Forecast lines
     */
    async findByMetric(forecastId, metric) {
        return this.find({ forecastId, metric }, { sort: { periodStart: 1 } });
    },

    /**
     * Update a forecast line
     * @param {string} lineId - Line ID
     * @param {Object} data - Update data
     * @returns {Object} Updated line
     */
    async update(lineId, data) {
        // Check if forecast is approved (cannot modify)
        const line = await this.findOne({ lineId });
        if (!line) {
            throw new Error('Forecast line not found');
        }

        const forecast = await FinancialForecast.findOne({ forecastId: line.forecastId });
        if (forecast && forecast.status === 'APPROVED') {
            throw new Error('Cannot modify lines of approved forecasts');
        }

        // Validate metric if being updated
        if (data.metric && !FORECAST_METRICS.includes(data.metric)) {
            throw new Error(`Invalid metric: ${data.metric}`);
        }

        await this.updateOne({ lineId }, { $set: data });
        return this.findOne({ lineId });
    },

    /**
     * Delete all lines for a forecast
     * @param {string} forecastId - Forecast ID
     * @returns {Object} Delete result
     */
    async deleteByForecast(forecastId) {
        const forecast = await FinancialForecast.findOne({ forecastId });
        if (forecast && forecast.status === 'APPROVED') {
            throw new Error('Cannot delete lines of approved forecasts');
        }

        return this.deleteMany({ forecastId });
    },

    /**
     * Calculate EBITDA from component lines
     * @param {string} forecastId - Forecast ID
     * @param {string} periodStart - Period start
     * @param {string} periodEnd - Period end
     * @returns {number|null} Calculated EBITDA
     */
    async calculateEBITDA(forecastId, periodStart, periodEnd) {
        const lines = await this.find({
            forecastId,
            periodStart,
            periodEnd,
            metric: { $in: ['REVENUE', 'COGS', 'OPEX_TOTAL'] }
        });

        let revenue = 0;
        let cogs = 0;
        let opex = 0;

        for (const line of lines) {
            if (line.metric === 'REVENUE') revenue = line.value;
            if (line.metric === 'COGS') cogs = line.value;
            if (line.metric === 'OPEX_TOTAL') opex = line.value;
        }

        if (revenue === 0) return null;

        return revenue - cogs - opex;
    },

    /**
     * Get summary by metric across all periods
     * @param {string} forecastId - Forecast ID
     * @returns {Object} Summary by metric
     */
    async getSummaryByMetric(forecastId) {
        const lines = await this.findByForecast(forecastId);
        const summary = {};

        for (const line of lines) {
            if (!summary[line.metric]) {
                summary[line.metric] = {
                    total: 0,
                    periods: []
                };
            }
            summary[line.metric].total += line.value;
            summary[line.metric].periods.push({
                periodStart: line.periodStart,
                periodEnd: line.periodEnd,
                value: line.value
            });
        }

        return summary;
    }
};

module.exports = {
    FinancialForecast,
    ForecastLine,
    FORECAST_METRICS
};
