/**
 * RiskFactors Model
 * Feature: Issue #272 - Create risk factors model for company stage and valuation adjustments
 *
 * Captures company risk factors that affect 409A valuations.
 * Factors directly influence discount rates, volatility assumptions,
 * DLOM (Discount for Lack of Marketability), and DLOC (Discount for Lack of Control).
 */
const { createModel } = require('./base/ZeroDBModel');
const { v4: uuidv4 } = require('uuid');

// Company stage enums
const COMPANY_STAGES = [
    'PRE_SEED',
    'SEED',
    'SERIES_A',
    'SERIES_B',
    'GROWTH',
    'LATE_STAGE',
    'PRE_IPO'
];

// Revenue stage enums
const REVENUE_STAGES = [
    'PRE_REVENUE',
    'EARLY_REVENUE',
    'SCALING',
    'PROFITABLE'
];

// Risk profile statuses
const PROFILE_STATUSES = [
    'DRAFT',
    'REVIEWED',
    'APPROVED'
];

// Risk factor categories
const RISK_CATEGORIES = [
    'MARKET',
    'TECHNOLOGY',
    'FINANCIAL',
    'OPERATIONAL',
    'REGULATORY',
    'KEY_PERSON',
    'COMPETITION',
    'CUSTOMER',
    'CAPITAL'
];

// Severity levels
const SEVERITY_LEVELS = [
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
];

// Likelihood levels
const LIKELIHOOD_LEVELS = [
    'UNLIKELY',
    'POSSIBLE',
    'LIKELY',
    'ALMOST_CERTAIN'
];

// Mitigation statuses
const MITIGATION_STATUSES = [
    'UNMITIGATED',
    'PARTIAL',
    'MITIGATED'
];

// Severity weights for risk score calculation
const SEVERITY_WEIGHTS = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
};

// Likelihood weights for risk score calculation
const LIKELIHOOD_WEIGHTS = {
    UNLIKELY: 1,
    POSSIBLE: 2,
    LIKELY: 3,
    ALMOST_CERTAIN: 4
};

// Base DLOM ranges by revenue stage (percentages)
const BASE_DLOM_RANGES = {
    PRE_REVENUE: { min: 0.30, max: 0.45 },
    EARLY_REVENUE: { min: 0.25, max: 0.35 },
    SCALING: { min: 0.20, max: 0.30 },
    PROFITABLE: { min: 0.15, max: 0.25 }
};

// Company stage risk multipliers
const STAGE_RISK_MULTIPLIERS = {
    PRE_SEED: 1.5,
    SEED: 1.3,
    SERIES_A: 1.15,
    SERIES_B: 1.0,
    GROWTH: 0.9,
    LATE_STAGE: 0.8,
    PRE_IPO: 0.7
};

// Base volatility by company stage (for OPM)
const BASE_VOLATILITY_BY_STAGE = {
    PRE_SEED: 0.90,
    SEED: 0.80,
    SERIES_A: 0.70,
    SERIES_B: 0.60,
    GROWTH: 0.50,
    LATE_STAGE: 0.45,
    PRE_IPO: 0.40
};

// Default risk factor templates
const DEFAULT_RISK_TEMPLATES = [
    // Market Risk
    { category: 'MARKET', factorName: 'Total Addressable Market Uncertainty', description: 'Uncertainty in the size and growth of the target market', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B'] },
    { category: 'MARKET', factorName: 'Market Timing Risk', description: 'Risk that the market is not ready or timing is suboptimal', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A'] },
    { category: 'MARKET', factorName: 'Competitive Landscape Intensity', description: 'Level of competition and barriers to entry', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'MARKET', factorName: 'Customer Adoption Risk', description: 'Risk of slow or limited customer adoption', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B'] },

    // Technology Risk
    { category: 'TECHNOLOGY', factorName: 'Product Development Stage', description: 'Risk based on current product development maturity', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A'] },
    { category: 'TECHNOLOGY', factorName: 'Technical Feasibility', description: 'Risk that technical challenges may not be overcome', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A'] },
    { category: 'TECHNOLOGY', factorName: 'IP Protection Status', description: 'Strength and defensibility of intellectual property', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'TECHNOLOGY', factorName: 'Platform/Scalability Risk', description: 'Ability of technology to scale with growth', applicableStages: ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH'] },

    // Financial Risk
    { category: 'FINANCIAL', factorName: 'Burn Rate vs Runway', description: 'Cash runway relative to current spending rate', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'GROWTH'] },
    { category: 'FINANCIAL', factorName: 'Revenue Predictability', description: 'Consistency and predictability of revenue streams', applicableStages: ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'FINANCIAL', factorName: 'Unit Economics Clarity', description: 'Understanding and viability of unit economics', applicableStages: ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH'] },
    { category: 'FINANCIAL', factorName: 'Capital Dependency', description: 'Reliance on external capital for operations', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'GROWTH'] },

    // Operational Risk
    { category: 'OPERATIONAL', factorName: 'Team Completeness', description: 'Gaps in key roles or competencies', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B'] },
    { category: 'OPERATIONAL', factorName: 'Operational Scalability', description: 'Ability to scale operations efficiently', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE'] },
    { category: 'OPERATIONAL', factorName: 'Supply Chain Dependency', description: 'Risks from supplier concentration or disruption', applicableStages: ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'OPERATIONAL', factorName: 'Geographic Concentration', description: 'Over-reliance on specific geographic markets', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },

    // Key Person Risk
    { category: 'KEY_PERSON', factorName: 'Founder Dependency', description: 'Reliance on founders for critical operations', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B'] },
    { category: 'KEY_PERSON', factorName: 'Key Employee Retention', description: 'Risk of losing critical team members', applicableStages: ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'KEY_PERSON', factorName: 'Succession Planning', description: 'Adequacy of succession plans for key roles', applicableStages: ['SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'KEY_PERSON', factorName: 'Non-compete Enforceability', description: 'Strength of non-compete and non-solicitation agreements', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },

    // Regulatory Risk
    { category: 'REGULATORY', factorName: 'Industry Regulation Exposure', description: 'Exposure to current and potential regulations', applicableStages: ['PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'REGULATORY', factorName: 'Compliance Requirements', description: 'Burden and cost of regulatory compliance', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'REGULATORY', factorName: 'Litigation Exposure', description: 'Current or potential litigation risks', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'REGULATORY', factorName: 'Data Privacy Obligations', description: 'GDPR, CCPA, and other privacy compliance requirements', applicableStages: ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },

    // Customer Risk
    { category: 'CUSTOMER', factorName: 'Customer Concentration', description: 'Risk from customers representing >10% of revenue', applicableStages: ['SEED', 'SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'CUSTOMER', factorName: 'Churn Rate', description: 'Customer retention and churn metrics', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'CUSTOMER', factorName: 'Contract Duration', description: 'Length and stability of customer contracts', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] },
    { category: 'CUSTOMER', factorName: 'Payment Reliability', description: 'Customer creditworthiness and payment history', applicableStages: ['SERIES_A', 'SERIES_B', 'GROWTH', 'LATE_STAGE', 'PRE_IPO'] }
];

// Schema for company_risk_profiles table
const riskProfileSchema = {
    // Unique identifier
    id: { type: 'string', unique: true, index: true },

    // Company reference
    companyId: { type: 'string', required: true, index: true },

    // Assessment details
    assessmentDate: { type: 'date', required: true },
    assessedBy: { type: 'string', required: true },

    // Company stage
    stage: {
        type: 'string',
        enum: COMPANY_STAGES,
        required: true
    },

    // Revenue stage
    revenueStage: {
        type: 'string',
        enum: REVENUE_STAGES,
        required: true
    },

    // Overall scores (1-5 scale, 5 = highest risk)
    overallRiskScore: {
        type: 'number',
        min: 1,
        max: 5
    },

    // Suggested DLOM (Discount for Lack of Marketability)
    suggestedDlomPercent: {
        type: 'number',
        min: 0,
        max: 100
    },

    // Suggested volatility for OPM
    suggestedVolatility: {
        type: 'number',
        min: 0,
        max: 3  // Up to 300%
    },

    // Suggested discount rate adjustment
    suggestedDiscountRateAdjustment: {
        type: 'number',
        min: -0.1,
        max: 0.2
    },

    // DLOC (Discount for Lack of Control)
    suggestedDlocPercent: {
        type: 'number',
        min: 0,
        max: 50
    },

    // Notes
    notes: { type: 'string' },

    // Status workflow
    status: {
        type: 'string',
        enum: PROFILE_STATUSES,
        default: 'DRAFT',
        index: true
    },

    // Approval
    approvedBy: { type: 'string' },
    approvedAt: { type: 'date' },

    // Linked valuation
    linkedValuationId: { type: 'string', index: true },

    // Category scores (for detailed breakdown)
    categoryScores: {
        type: 'object',
        default: {}
    },

    // Metadata
    metadata: { type: 'object', default: {} },

    // Tracking
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' }
};

// Schema for risk_factors table (individual assessments)
const riskFactorSchema = {
    // Unique identifier
    id: { type: 'string', unique: true, index: true },

    // Link to risk profile
    riskProfileId: { type: 'string', required: true, index: true },

    // Factor details
    category: {
        type: 'string',
        enum: RISK_CATEGORIES,
        required: true,
        index: true
    },

    factorName: { type: 'string', required: true },
    description: { type: 'string' },

    // Scoring
    severity: {
        type: 'string',
        enum: SEVERITY_LEVELS,
        required: true
    },

    likelihood: {
        type: 'string',
        enum: LIKELIHOOD_LEVELS,
        required: true
    },

    // Calculated risk score (severity * likelihood, max 16)
    riskScore: {
        type: 'number',
        min: 1,
        max: 16
    },

    // Mitigation
    mitigationStatus: {
        type: 'string',
        enum: MITIGATION_STATUSES,
        default: 'UNMITIGATED'
    },

    mitigationNotes: { type: 'string' },

    // Template reference
    templateId: { type: 'string' },

    // Tracking
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' }
};

// Schema for risk_factor_templates table
const riskTemplateSchema = {
    // Unique identifier
    id: { type: 'string', unique: true, index: true },

    // Template details
    category: {
        type: 'string',
        enum: RISK_CATEGORIES,
        required: true,
        index: true
    },

    factorName: { type: 'string', required: true },
    description: { type: 'string', required: true },

    // Applicable stages
    applicableStages: {
        type: 'array',
        items: { type: 'string', enum: COMPANY_STAGES }
    },

    // Active flag
    isActive: { type: 'boolean', default: true },

    // Sort order
    sortOrder: { type: 'number', default: 0 },

    // Tracking
    createdBy: { type: 'string' },
    updatedBy: { type: 'string' }
};

// Create base models
const riskProfileModel = createModel('company_risk_profiles', riskProfileSchema);
const riskFactorModel = createModel('risk_factors', riskFactorSchema);
const riskTemplateModel = createModel('risk_factor_templates', riskTemplateSchema);

/**
 * Calculate risk score from severity and likelihood
 * @param {string} severity - Severity level
 * @param {string} likelihood - Likelihood level
 * @returns {number} Risk score (1-16)
 */
function calculateRiskScore(severity, likelihood) {
    const severityWeight = SEVERITY_WEIGHTS[severity] || 2;
    const likelihoodWeight = LIKELIHOOD_WEIGHTS[likelihood] || 2;
    return severityWeight * likelihoodWeight;
}

/**
 * Calculate overall risk score from individual factors
 * @param {Array} factors - Array of risk factors
 * @returns {number} Overall score (1-5 scale)
 */
function calculateOverallRiskScore(factors) {
    if (!factors || factors.length === 0) return 3; // Default medium risk

    const totalScore = factors.reduce((sum, f) => sum + (f.riskScore || calculateRiskScore(f.severity, f.likelihood)), 0);
    const avgScore = totalScore / factors.length;

    // Convert 1-16 scale to 1-5 scale
    // 1-3 -> 1, 4-6 -> 2, 7-9 -> 3, 10-12 -> 4, 13-16 -> 5
    if (avgScore <= 3) return 1;
    if (avgScore <= 6) return 2;
    if (avgScore <= 9) return 3;
    if (avgScore <= 12) return 4;
    return 5;
}

/**
 * Calculate category scores from factors
 * @param {Array} factors - Array of risk factors
 * @returns {Object} Category scores
 */
function calculateCategoryScores(factors) {
    const categoryScores = {};

    RISK_CATEGORIES.forEach(category => {
        const categoryFactors = factors.filter(f => f.category === category);
        if (categoryFactors.length > 0) {
            const totalScore = categoryFactors.reduce((sum, f) =>
                sum + (f.riskScore || calculateRiskScore(f.severity, f.likelihood)), 0);
            categoryScores[category] = {
                avgScore: totalScore / categoryFactors.length,
                factorCount: categoryFactors.length
            };
        }
    });

    return categoryScores;
}

/**
 * Suggest DLOM based on risk score and stage
 * @param {number} overallScore - Overall risk score (1-5)
 * @param {string} revenueStage - Revenue stage
 * @param {string} companyStage - Company stage
 * @returns {number} Suggested DLOM percentage
 */
function suggestDLOM(overallScore, revenueStage, companyStage) {
    // Get base DLOM range from revenue stage
    const baseRange = BASE_DLOM_RANGES[revenueStage] || BASE_DLOM_RANGES.EARLY_REVENUE;

    // Calculate base DLOM (midpoint of range)
    let baseDlom = (baseRange.min + baseRange.max) / 2;

    // Apply company stage multiplier
    const stageMultiplier = STAGE_RISK_MULTIPLIERS[companyStage] || 1.0;
    baseDlom *= stageMultiplier;

    // Adjust based on overall risk score (1-5)
    // Score 1-2: use lower end, Score 3: use mid, Score 4-5: use higher end
    const riskAdjustment = (overallScore - 3) * 0.05; // +/- 5% per score point from 3
    baseDlom += riskAdjustment;

    // Clamp to reasonable bounds (10% - 50%)
    baseDlom = Math.max(0.10, Math.min(0.50, baseDlom));

    // Return as percentage (multiply by 100)
    return Math.round(baseDlom * 100 * 10) / 10; // One decimal place
}

/**
 * Suggest volatility based on company stage and risk score
 * @param {number} overallScore - Overall risk score (1-5)
 * @param {string} companyStage - Company stage
 * @returns {number} Suggested volatility (0-3)
 */
function suggestVolatility(overallScore, companyStage) {
    // Get base volatility from company stage
    let baseVolatility = BASE_VOLATILITY_BY_STAGE[companyStage] || 0.60;

    // Adjust based on risk score
    // Score 1-2: reduce volatility, Score 3: keep base, Score 4-5: increase volatility
    const riskAdjustment = (overallScore - 3) * 0.10; // +/- 10% per score point from 3
    baseVolatility += riskAdjustment;

    // Clamp to reasonable bounds (30% - 120%)
    baseVolatility = Math.max(0.30, Math.min(1.20, baseVolatility));

    return Math.round(baseVolatility * 100) / 100; // Two decimal places
}

/**
 * Suggest DLOC based on stage and control factors
 * @param {string} companyStage - Company stage
 * @param {Object} metadata - Additional metadata
 * @returns {number} Suggested DLOC percentage
 */
function suggestDLOC(companyStage, metadata = {}) {
    // Base DLOC by stage (minority interest discount)
    const baseDlocByStage = {
        PRE_SEED: 25,
        SEED: 22,
        SERIES_A: 20,
        SERIES_B: 18,
        GROWTH: 15,
        LATE_STAGE: 12,
        PRE_IPO: 10
    };

    let dloc = baseDlocByStage[companyStage] || 15;

    // Adjust for specific factors
    if (metadata.hasBlockingRights) dloc -= 5;
    if (metadata.hasBoardSeat) dloc -= 3;
    if (metadata.hasVetoRights) dloc -= 3;
    if (metadata.isMinorityHolder) dloc += 5;

    // Clamp to reasonable bounds (5% - 35%)
    dloc = Math.max(5, Math.min(35, dloc));

    return dloc;
}

/**
 * Suggest discount rate adjustment based on risk profile
 * @param {number} overallScore - Overall risk score (1-5)
 * @param {string} companyStage - Company stage
 * @returns {number} Discount rate adjustment (-0.05 to 0.10)
 */
function suggestDiscountRateAdjustment(overallScore, companyStage) {
    // Base adjustment by stage
    const baseAdjustmentByStage = {
        PRE_SEED: 0.05,
        SEED: 0.04,
        SERIES_A: 0.03,
        SERIES_B: 0.02,
        GROWTH: 0.01,
        LATE_STAGE: 0,
        PRE_IPO: -0.01
    };

    let adjustment = baseAdjustmentByStage[companyStage] || 0.02;

    // Adjust based on risk score
    adjustment += (overallScore - 3) * 0.02;

    // Clamp to reasonable bounds
    return Math.max(-0.05, Math.min(0.10, Math.round(adjustment * 1000) / 1000));
}

// Extended RiskFactors model with custom methods
const RiskFactors = {
    // Export constants
    COMPANY_STAGES,
    REVENUE_STAGES,
    PROFILE_STATUSES,
    RISK_CATEGORIES,
    SEVERITY_LEVELS,
    LIKELIHOOD_LEVELS,
    MITIGATION_STATUSES,
    SEVERITY_WEIGHTS,
    LIKELIHOOD_WEIGHTS,
    BASE_DLOM_RANGES,
    STAGE_RISK_MULTIPLIERS,
    BASE_VOLATILITY_BY_STAGE,
    DEFAULT_RISK_TEMPLATES,

    // Export schemas
    riskProfileSchema,
    riskFactorSchema,
    riskTemplateSchema,

    // Export calculation functions
    calculateRiskScore,
    calculateOverallRiskScore,
    calculateCategoryScores,
    suggestDLOM,
    suggestVolatility,
    suggestDLOC,
    suggestDiscountRateAdjustment,

    // Table names
    profileTableName: 'company_risk_profiles',
    factorTableName: 'risk_factors',
    templateTableName: 'risk_factor_templates',

    // ============ RISK PROFILE METHODS ============

    /**
     * Create a new risk profile
     * @param {Object} data - Profile data
     * @returns {Object} Created profile
     */
    async createProfile(data) {
        // Validate required fields
        if (!data.companyId) throw new Error('companyId is required');
        if (!data.stage) throw new Error('stage is required');
        if (!data.revenueStage) throw new Error('revenueStage is required');

        // Validate enums
        if (!COMPANY_STAGES.includes(data.stage)) {
            throw new Error(`Invalid stage: ${data.stage}. Must be one of: ${COMPANY_STAGES.join(', ')}`);
        }
        if (!REVENUE_STAGES.includes(data.revenueStage)) {
            throw new Error(`Invalid revenueStage: ${data.revenueStage}. Must be one of: ${REVENUE_STAGES.join(', ')}`);
        }

        const profileData = {
            ...data,
            id: data.id || `rp_${uuidv4()}`,
            assessmentDate: data.assessmentDate || new Date().toISOString(),
            assessedBy: data.assessedBy || data.createdBy,
            status: data.status || 'DRAFT',
            categoryScores: data.categoryScores || {},
            metadata: data.metadata || {}
        };

        return riskProfileModel.create(profileData);
    },

    /**
     * Find profile by ID
     * @param {string} id - Profile ID
     * @returns {Object|null} Profile
     */
    async findProfileById(id) {
        return riskProfileModel.findOne({ id });
    },

    /**
     * Find profiles by company
     * @param {string} companyId - Company ID
     * @param {Object} options - Query options
     * @returns {Array} Profiles
     */
    async findProfilesByCompany(companyId, options = {}) {
        const query = { companyId };
        if (options.status) query.status = options.status;
        return riskProfileModel.find(query, { sort: { assessmentDate: -1 } });
    },

    /**
     * Get latest approved profile for company
     * @param {string} companyId - Company ID
     * @returns {Object|null} Latest approved profile
     */
    async getLatestApprovedProfile(companyId) {
        const profiles = await riskProfileModel.find(
            { companyId, status: 'APPROVED' },
            { sort: { assessmentDate: -1 }, limit: 1 }
        );
        return profiles[0] || null;
    },

    /**
     * Update risk profile
     * @param {string} profileId - Profile ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID
     * @returns {Object} Updated profile
     */
    async updateProfile(profileId, updateData, userId) {
        // Validate enums if provided
        if (updateData.stage && !COMPANY_STAGES.includes(updateData.stage)) {
            throw new Error(`Invalid stage: ${updateData.stage}`);
        }
        if (updateData.revenueStage && !REVENUE_STAGES.includes(updateData.revenueStage)) {
            throw new Error(`Invalid revenueStage: ${updateData.revenueStage}`);
        }
        if (updateData.status && !PROFILE_STATUSES.includes(updateData.status)) {
            throw new Error(`Invalid status: ${updateData.status}`);
        }

        await riskProfileModel.updateOne(
            { id: profileId },
            { $set: { ...updateData, updatedBy: userId } }
        );

        return riskProfileModel.findOne({ id: profileId });
    },

    /**
     * Approve risk profile
     * @param {string} profileId - Profile ID
     * @param {string} userId - Approving user ID
     * @param {string} notes - Optional approval notes
     * @returns {Object} Approved profile
     */
    async approveProfile(profileId, userId, notes = null) {
        const profile = await this.findProfileById(profileId);
        if (!profile) throw new Error('Profile not found');

        if (profile.status !== 'REVIEWED' && profile.status !== 'DRAFT') {
            throw new Error('Can only approve profiles in DRAFT or REVIEWED status');
        }

        const updateData = {
            status: 'APPROVED',
            approvedBy: userId,
            approvedAt: new Date().toISOString(),
            updatedBy: userId
        };

        if (notes) {
            updateData.notes = notes;
        }

        await riskProfileModel.updateOne({ id: profileId }, { $set: updateData });
        return riskProfileModel.findOne({ id: profileId });
    },

    /**
     * Delete risk profile and associated factors
     * @param {string} profileId - Profile ID
     * @returns {Object} Delete result
     */
    async deleteProfile(profileId) {
        // Delete associated factors first
        await riskFactorModel.deleteMany({ riskProfileId: profileId });
        // Delete profile
        return riskProfileModel.deleteOne({ id: profileId });
    },

    // ============ RISK FACTOR METHODS ============

    /**
     * Create a risk factor
     * @param {Object} data - Factor data
     * @returns {Object} Created factor
     */
    async createFactor(data) {
        // Validate required fields
        if (!data.riskProfileId) throw new Error('riskProfileId is required');
        if (!data.category) throw new Error('category is required');
        if (!data.factorName) throw new Error('factorName is required');
        if (!data.severity) throw new Error('severity is required');
        if (!data.likelihood) throw new Error('likelihood is required');

        // Validate enums
        if (!RISK_CATEGORIES.includes(data.category)) {
            throw new Error(`Invalid category: ${data.category}. Must be one of: ${RISK_CATEGORIES.join(', ')}`);
        }
        if (!SEVERITY_LEVELS.includes(data.severity)) {
            throw new Error(`Invalid severity: ${data.severity}. Must be one of: ${SEVERITY_LEVELS.join(', ')}`);
        }
        if (!LIKELIHOOD_LEVELS.includes(data.likelihood)) {
            throw new Error(`Invalid likelihood: ${data.likelihood}. Must be one of: ${LIKELIHOOD_LEVELS.join(', ')}`);
        }

        // Calculate risk score
        const riskScore = calculateRiskScore(data.severity, data.likelihood);

        const factorData = {
            ...data,
            id: data.id || `rf_${uuidv4()}`,
            riskScore,
            mitigationStatus: data.mitigationStatus || 'UNMITIGATED'
        };

        return riskFactorModel.create(factorData);
    },

    /**
     * Find factor by ID
     * @param {string} id - Factor ID
     * @returns {Object|null} Factor
     */
    async findFactorById(id) {
        return riskFactorModel.findOne({ id });
    },

    /**
     * Find factors by profile
     * @param {string} riskProfileId - Profile ID
     * @param {Object} options - Query options
     * @returns {Array} Factors
     */
    async findFactorsByProfile(riskProfileId, options = {}) {
        const query = { riskProfileId };
        if (options.category) query.category = options.category;
        return riskFactorModel.find(query);
    },

    /**
     * Update risk factor
     * @param {string} factorId - Factor ID
     * @param {Object} updateData - Update data
     * @param {string} userId - User ID
     * @returns {Object} Updated factor
     */
    async updateFactor(factorId, updateData, userId) {
        // Validate enums if provided
        if (updateData.category && !RISK_CATEGORIES.includes(updateData.category)) {
            throw new Error(`Invalid category: ${updateData.category}`);
        }
        if (updateData.severity && !SEVERITY_LEVELS.includes(updateData.severity)) {
            throw new Error(`Invalid severity: ${updateData.severity}`);
        }
        if (updateData.likelihood && !LIKELIHOOD_LEVELS.includes(updateData.likelihood)) {
            throw new Error(`Invalid likelihood: ${updateData.likelihood}`);
        }
        if (updateData.mitigationStatus && !MITIGATION_STATUSES.includes(updateData.mitigationStatus)) {
            throw new Error(`Invalid mitigationStatus: ${updateData.mitigationStatus}`);
        }

        // Recalculate risk score if severity or likelihood changed
        const factor = await this.findFactorById(factorId);
        if (!factor) throw new Error('Factor not found');

        const newSeverity = updateData.severity || factor.severity;
        const newLikelihood = updateData.likelihood || factor.likelihood;

        if (updateData.severity || updateData.likelihood) {
            updateData.riskScore = calculateRiskScore(newSeverity, newLikelihood);
        }

        await riskFactorModel.updateOne(
            { id: factorId },
            { $set: { ...updateData, updatedBy: userId } }
        );

        return riskFactorModel.findOne({ id: factorId });
    },

    /**
     * Delete risk factor
     * @param {string} factorId - Factor ID
     * @returns {Object} Delete result
     */
    async deleteFactor(factorId) {
        return riskFactorModel.deleteOne({ id: factorId });
    },

    // ============ RISK TEMPLATE METHODS ============

    /**
     * Create a risk factor template
     * @param {Object} data - Template data
     * @returns {Object} Created template
     */
    async createTemplate(data) {
        if (!data.category) throw new Error('category is required');
        if (!data.factorName) throw new Error('factorName is required');

        if (!RISK_CATEGORIES.includes(data.category)) {
            throw new Error(`Invalid category: ${data.category}`);
        }

        const templateData = {
            ...data,
            id: data.id || `rt_${uuidv4()}`,
            isActive: data.isActive !== undefined ? data.isActive : true,
            applicableStages: data.applicableStages || COMPANY_STAGES,
            sortOrder: data.sortOrder || 0
        };

        return riskTemplateModel.create(templateData);
    },

    /**
     * Find template by ID
     * @param {string} id - Template ID
     * @returns {Object|null} Template
     */
    async findTemplateById(id) {
        return riskTemplateModel.findOne({ id });
    },

    /**
     * Get all active templates
     * @param {Object} options - Query options
     * @returns {Array} Templates
     */
    async getActiveTemplates(options = {}) {
        const query = { isActive: true };
        if (options.category) query.category = options.category;
        if (options.stage) {
            // Filter by applicable stage
            const templates = await riskTemplateModel.find(query);
            return templates.filter(t =>
                t.applicableStages && t.applicableStages.includes(options.stage)
            );
        }
        return riskTemplateModel.find(query);
    },

    /**
     * Get templates by category
     * @param {string} category - Risk category
     * @returns {Array} Templates
     */
    async getTemplatesByCategory(category) {
        return riskTemplateModel.find({ category, isActive: true });
    },

    /**
     * Seed default templates
     * @param {string} userId - User ID for createdBy
     * @returns {Array} Created templates
     */
    async seedDefaultTemplates(userId = 'system') {
        const createdTemplates = [];

        for (const template of DEFAULT_RISK_TEMPLATES) {
            try {
                const created = await this.createTemplate({
                    ...template,
                    createdBy: userId
                });
                createdTemplates.push(created);
            } catch (error) {
                console.error(`Failed to create template ${template.factorName}:`, error.message);
            }
        }

        return createdTemplates;
    },

    // ============ CALCULATION METHODS ============

    /**
     * Recalculate profile scores from factors
     * @param {string} profileId - Profile ID
     * @param {string} userId - User ID
     * @returns {Object} Updated profile
     */
    async recalculateProfileScores(profileId, userId) {
        const profile = await this.findProfileById(profileId);
        if (!profile) throw new Error('Profile not found');

        const factors = await this.findFactorsByProfile(profileId);

        const overallRiskScore = calculateOverallRiskScore(factors);
        const categoryScores = calculateCategoryScores(factors);
        const suggestedDlomPercent = suggestDLOM(overallRiskScore, profile.revenueStage, profile.stage);
        const suggestedVolatilityValue = suggestVolatility(overallRiskScore, profile.stage);
        const suggestedDlocPercent = suggestDLOC(profile.stage, profile.metadata || {});
        const suggestedDiscountRateAdj = suggestDiscountRateAdjustment(overallRiskScore, profile.stage);

        await riskProfileModel.updateOne(
            { id: profileId },
            {
                $set: {
                    overallRiskScore,
                    categoryScores,
                    suggestedDlomPercent,
                    suggestedVolatility: suggestedVolatilityValue,
                    suggestedDlocPercent,
                    suggestedDiscountRateAdjustment: suggestedDiscountRateAdj,
                    updatedBy: userId
                }
            }
        );

        return riskProfileModel.findOne({ id: profileId });
    },

    // ============ SUMMARY METHODS ============

    /**
     * Get risk summary for a company
     * @param {string} companyId - Company ID
     * @returns {Object} Risk summary
     */
    async getRiskSummary(companyId) {
        const latestProfile = await this.getLatestApprovedProfile(companyId);

        if (!latestProfile) {
            return {
                hasRiskProfile: false,
                companyId,
                message: 'No approved risk profile found'
            };
        }

        const factors = await this.findFactorsByProfile(latestProfile.id);

        // Group factors by severity
        const bySeverity = {
            CRITICAL: factors.filter(f => f.severity === 'CRITICAL').length,
            HIGH: factors.filter(f => f.severity === 'HIGH').length,
            MEDIUM: factors.filter(f => f.severity === 'MEDIUM').length,
            LOW: factors.filter(f => f.severity === 'LOW').length
        };

        // Group factors by mitigation status
        const byMitigation = {
            UNMITIGATED: factors.filter(f => f.mitigationStatus === 'UNMITIGATED').length,
            PARTIAL: factors.filter(f => f.mitigationStatus === 'PARTIAL').length,
            MITIGATED: factors.filter(f => f.mitigationStatus === 'MITIGATED').length
        };

        // Get top risks (highest risk scores)
        const topRisks = [...factors]
            .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
            .slice(0, 5)
            .map(f => ({
                category: f.category,
                factorName: f.factorName,
                severity: f.severity,
                likelihood: f.likelihood,
                riskScore: f.riskScore,
                mitigationStatus: f.mitigationStatus
            }));

        return {
            hasRiskProfile: true,
            companyId,
            profile: {
                id: latestProfile.id,
                assessmentDate: latestProfile.assessmentDate,
                stage: latestProfile.stage,
                revenueStage: latestProfile.revenueStage,
                status: latestProfile.status,
                approvedAt: latestProfile.approvedAt
            },
            scores: {
                overall: latestProfile.overallRiskScore,
                byCategory: latestProfile.categoryScores
            },
            suggestions: {
                dlomPercent: latestProfile.suggestedDlomPercent,
                dlocPercent: latestProfile.suggestedDlocPercent,
                volatility: latestProfile.suggestedVolatility,
                discountRateAdjustment: latestProfile.suggestedDiscountRateAdjustment
            },
            factorCount: factors.length,
            bySeverity,
            byMitigation,
            topRisks
        };
    },

    /**
     * Link risk profile to valuation
     * @param {string} profileId - Profile ID
     * @param {string} valuationId - Valuation ID
     * @param {string} userId - User ID
     * @returns {Object} Updated profile
     */
    async linkToValuation(profileId, valuationId, userId) {
        await riskProfileModel.updateOne(
            { id: profileId },
            { $set: { linkedValuationId: valuationId, updatedBy: userId } }
        );
        return riskProfileModel.findOne({ id: profileId });
    },

    /**
     * Get profile linked to valuation
     * @param {string} valuationId - Valuation ID
     * @returns {Object|null} Profile
     */
    async getProfileForValuation(valuationId) {
        return riskProfileModel.findOne({ linkedValuationId: valuationId });
    }
};

module.exports = RiskFactors;
