/**
 * ComparableCompany Model
 * Feature: Issue #270 - Create comparable companies database for market approach valuations
 *
 * Stores and manages comparable company data for market-based valuation analysis.
 * Supports finding similar companies by industry, stage, and financial metrics.
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Schema definition for documentation and validation
const schema = {
    // Unique identifier
    comparableId: { type: 'string', unique: true, index: true },

    // Company information
    companyName: { type: 'string', required: true },
    industry: { type: 'string', required: true, index: true },
    subIndustry: { type: 'string' },

    // Company stage
    stage: {
        type: 'string',
        enum: ['SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH', 'PRE_IPO', 'PUBLIC'],
        required: true,
        index: true
    },

    // Valuation metrics
    latestValuation: { type: 'number', min: 0 },

    // Financial metrics
    revenue: { type: 'number', min: 0 },
    revenueGrowthRate: { type: 'number' }, // Can be negative
    ebitda: { type: 'number' }, // Can be negative
    ebitdaMargin: { type: 'number' }, // Percentage, can be negative

    // Company size
    employees: { type: 'number', min: 0 },

    // Funding information
    fundingTotal: { type: 'number', min: 0 },
    lastFundingDate: { type: 'date' },

    // Calculated multiples
    revenueMultiple: { type: 'number', min: 0 }, // valuation / revenue
    ebitdaMultiple: { type: 'number' }, // valuation / ebitda (can be null if ebitda <= 0)

    // Data source
    source: {
        type: 'string',
        enum: ['PITCHBOOK', 'CRUNCHBASE', 'SEC_FILINGS', 'MANUAL', 'API'],
        required: true
    },
    dataDate: { type: 'date', required: true },

    // Public company fields
    isPublic: { type: 'boolean', default: false },
    ticker: { type: 'string' }, // For public companies

    // Additional data
    metadata: { type: 'object', default: {} },
    tags: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' },

    // Timestamps
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
};

// Valid stages for reference
const VALID_STAGES = ['SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'GROWTH', 'PRE_IPO', 'PUBLIC'];
const VALID_SOURCES = ['PITCHBOOK', 'CRUNCHBASE', 'SEC_FILINGS', 'MANUAL', 'API'];

// Create base model
const baseModel = createModel('comparable_companies', schema);

// Extended ComparableCompany model with custom methods
const ComparableCompany = {
    ...baseModel,
    tableName: 'comparable_companies',
    schema,
    VALID_STAGES,
    VALID_SOURCES,

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

    async deleteMany(query) {
        return baseModel.deleteMany.call(baseModel, query);
    },

    async countDocuments(query) {
        return baseModel.countDocuments.call(baseModel, query);
    },

    async insertMany(dataArray) {
        // Process each entry with calculated fields
        const processedData = dataArray.map(data => this._prepareData(data));
        return baseModel.insertMany.call(baseModel, processedData);
    },

    /**
     * Prepare data with generated ID and calculated multiples
     * @private
     */
    _prepareData(data) {
        const prepared = {
            ...data,
            comparableId: data.comparableId || `comp_${uuidv4()}`,
            dataDate: data.dataDate || new Date().toISOString(),
            isPublic: data.isPublic || false,
            metadata: data.metadata || {},
            tags: data.tags || []
        };

        // Calculate revenue multiple if not provided
        if (prepared.latestValuation && prepared.revenue && prepared.revenue > 0 && !prepared.revenueMultiple) {
            prepared.revenueMultiple = prepared.latestValuation / prepared.revenue;
        }

        // Calculate EBITDA multiple if not provided (only if EBITDA is positive)
        if (prepared.latestValuation && prepared.ebitda && prepared.ebitda > 0 && !prepared.ebitdaMultiple) {
            prepared.ebitdaMultiple = prepared.latestValuation / prepared.ebitda;
        }

        return prepared;
    },

    /**
     * Create a new comparable company entry
     * @param {Object} data - Company data
     * @returns {Object} Created comparable company
     */
    async create(data) {
        const prepared = this._prepareData(data);
        return baseModel.create(prepared);
    },

    /**
     * Find comparable companies by industry
     * @param {string} industry - Industry name
     * @param {Object} options - Query options (sort, limit, etc.)
     * @returns {Array} Matching companies
     */
    async findByIndustry(industry, options = {}) {
        const query = { industry };
        return this.find(query, options);
    },

    /**
     * Find comparable companies with filtering options
     * @param {Object} options - Filter options
     * @param {string} options.industry - Industry filter
     * @param {string} options.stage - Funding stage filter
     * @param {number} options.minRevenue - Minimum revenue
     * @param {number} options.maxRevenue - Maximum revenue
     * @param {number} options.minValuation - Minimum valuation
     * @param {number} options.maxValuation - Maximum valuation
     * @param {boolean} options.isPublic - Filter by public/private status
     * @param {string} options.source - Data source filter
     * @param {number} options.limit - Maximum results
     * @returns {Array} Matching comparable companies
     */
    async findComparables(options = {}) {
        const {
            industry,
            stage,
            minRevenue,
            maxRevenue,
            minValuation,
            maxValuation,
            isPublic,
            source,
            limit = 50
        } = options;

        // Build query
        const query = {};
        if (industry) query.industry = industry;
        if (stage) query.stage = stage;
        if (source) query.source = source;
        if (typeof isPublic === 'boolean') query.isPublic = isPublic;

        // Get all matching companies
        let companies = await this.find(query, { limit: 1000 });

        // Apply additional filters that require comparison
        if (minRevenue !== undefined) {
            companies = companies.filter(c => c.revenue >= minRevenue);
        }
        if (maxRevenue !== undefined) {
            companies = companies.filter(c => c.revenue <= maxRevenue);
        }
        if (minValuation !== undefined) {
            companies = companies.filter(c => c.latestValuation >= minValuation);
        }
        if (maxValuation !== undefined) {
            companies = companies.filter(c => c.latestValuation <= maxValuation);
        }

        // Sort by relevance (most recent data first)
        companies.sort((a, b) => {
            const dateA = new Date(a.dataDate || 0);
            const dateB = new Date(b.dataDate || 0);
            return dateB - dateA;
        });

        // Apply limit
        return companies.slice(0, limit);
    },

    /**
     * Calculate median multiples for a given industry and stage
     * @param {string} industry - Industry to analyze
     * @param {string} stage - Optional funding stage filter
     * @returns {Object} Median multiples and statistics
     */
    async calculateMedianMultiples(industry, stage = null) {
        const query = { industry };
        if (stage) query.stage = stage;

        const companies = await this.find(query);

        if (companies.length === 0) {
            return {
                count: 0,
                medianRevenueMultiple: null,
                medianEbitdaMultiple: null,
                avgRevenueMultiple: null,
                avgEbitdaMultiple: null,
                minRevenueMultiple: null,
                maxRevenueMultiple: null,
                minEbitdaMultiple: null,
                maxEbitdaMultiple: null,
                percentile25RevenueMultiple: null,
                percentile75RevenueMultiple: null
            };
        }

        // Extract valid multiples
        const revenueMultiples = companies
            .filter(c => c.revenueMultiple && c.revenueMultiple > 0)
            .map(c => c.revenueMultiple)
            .sort((a, b) => a - b);

        const ebitdaMultiples = companies
            .filter(c => c.ebitdaMultiple && c.ebitdaMultiple > 0)
            .map(c => c.ebitdaMultiple)
            .sort((a, b) => a - b);

        // Calculate median
        const getMedian = (arr) => {
            if (arr.length === 0) return null;
            const mid = Math.floor(arr.length / 2);
            return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
        };

        // Calculate average
        const getAverage = (arr) => {
            if (arr.length === 0) return null;
            return arr.reduce((sum, val) => sum + val, 0) / arr.length;
        };

        // Calculate percentile
        const getPercentile = (arr, percentile) => {
            if (arr.length === 0) return null;
            const index = Math.ceil((percentile / 100) * arr.length) - 1;
            return arr[Math.max(0, index)];
        };

        return {
            count: companies.length,
            revenueMultipleCount: revenueMultiples.length,
            ebitdaMultipleCount: ebitdaMultiples.length,
            medianRevenueMultiple: getMedian(revenueMultiples),
            medianEbitdaMultiple: getMedian(ebitdaMultiples),
            avgRevenueMultiple: getAverage(revenueMultiples),
            avgEbitdaMultiple: getAverage(ebitdaMultiples),
            minRevenueMultiple: revenueMultiples.length > 0 ? revenueMultiples[0] : null,
            maxRevenueMultiple: revenueMultiples.length > 0 ? revenueMultiples[revenueMultiples.length - 1] : null,
            minEbitdaMultiple: ebitdaMultiples.length > 0 ? ebitdaMultiples[0] : null,
            maxEbitdaMultiple: ebitdaMultiples.length > 0 ? ebitdaMultiples[ebitdaMultiples.length - 1] : null,
            percentile25RevenueMultiple: getPercentile(revenueMultiples, 25),
            percentile75RevenueMultiple: getPercentile(revenueMultiples, 75)
        };
    },

    /**
     * Get market data for a public company (placeholder for API integration)
     * @param {string} ticker - Stock ticker symbol
     * @returns {Object|null} Market data or null if not found
     */
    async getMarketData(ticker) {
        // First check if we have data in our database
        const company = await this.findOne({ ticker, isPublic: true });

        if (company) {
            return {
                ticker: company.ticker,
                companyName: company.companyName,
                latestValuation: company.latestValuation,
                revenue: company.revenue,
                revenueMultiple: company.revenueMultiple,
                ebitdaMultiple: company.ebitdaMultiple,
                dataDate: company.dataDate,
                source: company.source
            };
        }

        // Placeholder for external API integration
        // In future, this could integrate with:
        // - Yahoo Finance API
        // - Alpha Vantage
        // - IEX Cloud
        // - Financial Modeling Prep
        return null;
    },

    /**
     * Find companies similar to a target company
     * @param {Object} targetCompany - Target company to find comparables for
     * @param {number} limit - Maximum number of results
     * @returns {Array} Similar companies sorted by similarity
     */
    async findSimilarCompanies(targetCompany, limit = 10) {
        const { industry, stage, revenue, latestValuation } = targetCompany;

        // First find by industry
        let candidates = await this.findByIndustry(industry);

        // Score each candidate by similarity
        candidates = candidates.map(company => {
            let score = 0;

            // Same industry = baseline match
            if (company.industry === industry) score += 10;

            // Same stage = strong match
            if (company.stage === stage) score += 20;

            // Revenue proximity (within 50% = good match)
            if (revenue && company.revenue) {
                const revenueDiff = Math.abs(company.revenue - revenue) / revenue;
                if (revenueDiff <= 0.5) score += 15 * (1 - revenueDiff);
            }

            // Valuation proximity (within 50% = good match)
            if (latestValuation && company.latestValuation) {
                const valuationDiff = Math.abs(company.latestValuation - latestValuation) / latestValuation;
                if (valuationDiff <= 0.5) score += 15 * (1 - valuationDiff);
            }

            return {
                ...company,
                similarityScore: score
            };
        });

        // Sort by similarity score and limit
        return candidates
            .sort((a, b) => b.similarityScore - a.similarityScore)
            .slice(0, limit);
    },

    /**
     * Get distinct industries in the database
     * @returns {Array} List of unique industries
     */
    async getIndustries() {
        return baseModel.distinct.call(baseModel, 'industry');
    },

    /**
     * Get statistics for the comparable companies database
     * @returns {Object} Database statistics
     */
    async getStatistics() {
        const total = await this.countDocuments({});
        const industries = await this.getIndustries();

        const byStage = {};
        for (const stage of VALID_STAGES) {
            byStage[stage] = await this.countDocuments({ stage });
        }

        const bySource = {};
        for (const source of VALID_SOURCES) {
            bySource[source] = await this.countDocuments({ source });
        }

        const publicCount = await this.countDocuments({ isPublic: true });
        const privateCount = await this.countDocuments({ isPublic: false });

        return {
            totalCompanies: total,
            industries: industries.length,
            industryList: industries,
            byStage,
            bySource,
            publicCompanies: publicCount,
            privateCompanies: privateCount
        };
    },

    /**
     * Validate company stage
     * @param {string} stage - Stage to validate
     * @returns {boolean} True if valid
     */
    isValidStage(stage) {
        return VALID_STAGES.includes(stage);
    },

    /**
     * Validate data source
     * @param {string} source - Source to validate
     * @returns {boolean} True if valid
     */
    isValidSource(source) {
        return VALID_SOURCES.includes(source);
    }
};

module.exports = ComparableCompany;
