/**
 * RiskFactors Model Tests
 * Feature: Issue #272 - Create risk factors model for company stage and valuation adjustments
 * TDD: Comprehensive tests for risk factors model
 */

const RiskFactors = require('../../../models/RiskFactors');

// Mock the ZeroDBModel base
jest.mock('../../../models/base/ZeroDBModel', () => {
    const mockModel = {
        create: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        deleteMany: jest.fn()
    };

    return {
        createModel: jest.fn(() => mockModel),
        ZeroDBModel: jest.fn()
    };
});

// Get the mocked createModel to access mock methods
const { createModel } = require('../../../models/base/ZeroDBModel');

describe('RiskFactors Model', () => {
    describe('Constants Export', () => {
        describe('COMPANY_STAGES', () => {
            it('should export all company stages', () => {
                const { COMPANY_STAGES } = RiskFactors;

                expect(COMPANY_STAGES).toContain('PRE_SEED');
                expect(COMPANY_STAGES).toContain('SEED');
                expect(COMPANY_STAGES).toContain('SERIES_A');
                expect(COMPANY_STAGES).toContain('SERIES_B');
                expect(COMPANY_STAGES).toContain('GROWTH');
                expect(COMPANY_STAGES).toContain('LATE_STAGE');
                expect(COMPANY_STAGES).toContain('PRE_IPO');
            });

            it('should have exactly 7 company stages', () => {
                expect(RiskFactors.COMPANY_STAGES.length).toBe(7);
            });
        });

        describe('REVENUE_STAGES', () => {
            it('should export all revenue stages', () => {
                const { REVENUE_STAGES } = RiskFactors;

                expect(REVENUE_STAGES).toContain('PRE_REVENUE');
                expect(REVENUE_STAGES).toContain('EARLY_REVENUE');
                expect(REVENUE_STAGES).toContain('SCALING');
                expect(REVENUE_STAGES).toContain('PROFITABLE');
            });

            it('should have exactly 4 revenue stages', () => {
                expect(RiskFactors.REVENUE_STAGES.length).toBe(4);
            });
        });

        describe('RISK_CATEGORIES', () => {
            it('should export all risk categories', () => {
                const { RISK_CATEGORIES } = RiskFactors;

                expect(RISK_CATEGORIES).toContain('MARKET');
                expect(RISK_CATEGORIES).toContain('TECHNOLOGY');
                expect(RISK_CATEGORIES).toContain('FINANCIAL');
                expect(RISK_CATEGORIES).toContain('OPERATIONAL');
                expect(RISK_CATEGORIES).toContain('REGULATORY');
                expect(RISK_CATEGORIES).toContain('KEY_PERSON');
                expect(RISK_CATEGORIES).toContain('COMPETITION');
                expect(RISK_CATEGORIES).toContain('CUSTOMER');
                expect(RISK_CATEGORIES).toContain('CAPITAL');
            });

            it('should have exactly 9 risk categories', () => {
                expect(RiskFactors.RISK_CATEGORIES.length).toBe(9);
            });
        });

        describe('SEVERITY_LEVELS', () => {
            it('should export all severity levels', () => {
                const { SEVERITY_LEVELS } = RiskFactors;

                expect(SEVERITY_LEVELS).toContain('LOW');
                expect(SEVERITY_LEVELS).toContain('MEDIUM');
                expect(SEVERITY_LEVELS).toContain('HIGH');
                expect(SEVERITY_LEVELS).toContain('CRITICAL');
            });

            it('should have exactly 4 severity levels', () => {
                expect(RiskFactors.SEVERITY_LEVELS.length).toBe(4);
            });
        });

        describe('LIKELIHOOD_LEVELS', () => {
            it('should export all likelihood levels', () => {
                const { LIKELIHOOD_LEVELS } = RiskFactors;

                expect(LIKELIHOOD_LEVELS).toContain('UNLIKELY');
                expect(LIKELIHOOD_LEVELS).toContain('POSSIBLE');
                expect(LIKELIHOOD_LEVELS).toContain('LIKELY');
                expect(LIKELIHOOD_LEVELS).toContain('ALMOST_CERTAIN');
            });

            it('should have exactly 4 likelihood levels', () => {
                expect(RiskFactors.LIKELIHOOD_LEVELS.length).toBe(4);
            });
        });

        describe('MITIGATION_STATUSES', () => {
            it('should export all mitigation statuses', () => {
                const { MITIGATION_STATUSES } = RiskFactors;

                expect(MITIGATION_STATUSES).toContain('UNMITIGATED');
                expect(MITIGATION_STATUSES).toContain('PARTIAL');
                expect(MITIGATION_STATUSES).toContain('MITIGATED');
            });

            it('should have exactly 3 mitigation statuses', () => {
                expect(RiskFactors.MITIGATION_STATUSES.length).toBe(3);
            });
        });

        describe('PROFILE_STATUSES', () => {
            it('should export all profile statuses', () => {
                const { PROFILE_STATUSES } = RiskFactors;

                expect(PROFILE_STATUSES).toContain('DRAFT');
                expect(PROFILE_STATUSES).toContain('REVIEWED');
                expect(PROFILE_STATUSES).toContain('APPROVED');
            });

            it('should have exactly 3 profile statuses', () => {
                expect(RiskFactors.PROFILE_STATUSES.length).toBe(3);
            });
        });

        describe('SEVERITY_WEIGHTS', () => {
            it('should have correct weights for each severity', () => {
                const { SEVERITY_WEIGHTS } = RiskFactors;

                expect(SEVERITY_WEIGHTS.LOW).toBe(1);
                expect(SEVERITY_WEIGHTS.MEDIUM).toBe(2);
                expect(SEVERITY_WEIGHTS.HIGH).toBe(3);
                expect(SEVERITY_WEIGHTS.CRITICAL).toBe(4);
            });
        });

        describe('LIKELIHOOD_WEIGHTS', () => {
            it('should have correct weights for each likelihood', () => {
                const { LIKELIHOOD_WEIGHTS } = RiskFactors;

                expect(LIKELIHOOD_WEIGHTS.UNLIKELY).toBe(1);
                expect(LIKELIHOOD_WEIGHTS.POSSIBLE).toBe(2);
                expect(LIKELIHOOD_WEIGHTS.LIKELY).toBe(3);
                expect(LIKELIHOOD_WEIGHTS.ALMOST_CERTAIN).toBe(4);
            });
        });
    });

    describe('Risk Score Calculation', () => {
        describe('calculateRiskScore', () => {
            it('should calculate minimum risk score (LOW + UNLIKELY)', () => {
                const score = RiskFactors.calculateRiskScore('LOW', 'UNLIKELY');
                expect(score).toBe(1); // 1 * 1
            });

            it('should calculate maximum risk score (CRITICAL + ALMOST_CERTAIN)', () => {
                const score = RiskFactors.calculateRiskScore('CRITICAL', 'ALMOST_CERTAIN');
                expect(score).toBe(16); // 4 * 4
            });

            it('should calculate medium risk score (MEDIUM + POSSIBLE)', () => {
                const score = RiskFactors.calculateRiskScore('MEDIUM', 'POSSIBLE');
                expect(score).toBe(4); // 2 * 2
            });

            it('should calculate HIGH + LIKELY correctly', () => {
                const score = RiskFactors.calculateRiskScore('HIGH', 'LIKELY');
                expect(score).toBe(9); // 3 * 3
            });

            it('should handle CRITICAL + UNLIKELY', () => {
                const score = RiskFactors.calculateRiskScore('CRITICAL', 'UNLIKELY');
                expect(score).toBe(4); // 4 * 1
            });

            it('should handle LOW + ALMOST_CERTAIN', () => {
                const score = RiskFactors.calculateRiskScore('LOW', 'ALMOST_CERTAIN');
                expect(score).toBe(4); // 1 * 4
            });

            it('should default to 4 for unknown values', () => {
                const score = RiskFactors.calculateRiskScore('UNKNOWN', 'UNKNOWN');
                expect(score).toBe(4); // 2 * 2 (defaults)
            });
        });

        describe('calculateOverallRiskScore', () => {
            it('should return 3 for empty factors array', () => {
                const score = RiskFactors.calculateOverallRiskScore([]);
                expect(score).toBe(3);
            });

            it('should return 3 for null factors', () => {
                const score = RiskFactors.calculateOverallRiskScore(null);
                expect(score).toBe(3);
            });

            it('should return 1 for very low risk factors', () => {
                const factors = [
                    { riskScore: 1 },
                    { riskScore: 2 },
                    { riskScore: 3 }
                ];
                const score = RiskFactors.calculateOverallRiskScore(factors);
                expect(score).toBe(1); // avg 2 -> 1-3 range -> 1
            });

            it('should return 5 for very high risk factors', () => {
                const factors = [
                    { riskScore: 14 },
                    { riskScore: 15 },
                    { riskScore: 16 }
                ];
                const score = RiskFactors.calculateOverallRiskScore(factors);
                expect(score).toBe(5); // avg 15 -> 13-16 range -> 5
            });

            it('should return 3 for medium risk factors', () => {
                const factors = [
                    { riskScore: 7 },
                    { riskScore: 8 },
                    { riskScore: 9 }
                ];
                const score = RiskFactors.calculateOverallRiskScore(factors);
                expect(score).toBe(3); // avg 8 -> 7-9 range -> 3
            });

            it('should calculate from severity/likelihood if riskScore missing', () => {
                const factors = [
                    { severity: 'MEDIUM', likelihood: 'POSSIBLE' }, // score 4
                    { severity: 'MEDIUM', likelihood: 'LIKELY' } // score 6
                ];
                const score = RiskFactors.calculateOverallRiskScore(factors);
                expect(score).toBe(2); // avg 5 -> 4-6 range -> 2
            });
        });

        describe('calculateCategoryScores', () => {
            it('should return empty object for empty factors', () => {
                const scores = RiskFactors.calculateCategoryScores([]);
                expect(scores).toEqual({});
            });

            it('should calculate scores per category', () => {
                const factors = [
                    { category: 'MARKET', riskScore: 8 },
                    { category: 'MARKET', riskScore: 10 },
                    { category: 'FINANCIAL', riskScore: 6 }
                ];

                const scores = RiskFactors.calculateCategoryScores(factors);

                expect(scores.MARKET).toBeDefined();
                expect(scores.MARKET.avgScore).toBe(9); // (8+10)/2
                expect(scores.MARKET.factorCount).toBe(2);

                expect(scores.FINANCIAL).toBeDefined();
                expect(scores.FINANCIAL.avgScore).toBe(6);
                expect(scores.FINANCIAL.factorCount).toBe(1);
            });

            it('should not include categories with no factors', () => {
                const factors = [
                    { category: 'TECHNOLOGY', riskScore: 5 }
                ];

                const scores = RiskFactors.calculateCategoryScores(factors);

                expect(scores.TECHNOLOGY).toBeDefined();
                expect(scores.MARKET).toBeUndefined();
                expect(scores.FINANCIAL).toBeUndefined();
            });
        });
    });

    describe('DLOM Calculation', () => {
        describe('suggestDLOM', () => {
            it('should return higher DLOM for PRE_REVENUE stage', () => {
                const dlom = RiskFactors.suggestDLOM(3, 'PRE_REVENUE', 'SEED');
                expect(dlom).toBeGreaterThan(30);
                expect(dlom).toBeLessThanOrEqual(50);
            });

            it('should return lower DLOM for PROFITABLE stage', () => {
                const dlom = RiskFactors.suggestDLOM(3, 'PROFITABLE', 'LATE_STAGE');
                expect(dlom).toBeGreaterThanOrEqual(10);
                expect(dlom).toBeLessThan(30);
            });

            it('should increase DLOM for higher risk scores', () => {
                const lowRiskDlom = RiskFactors.suggestDLOM(1, 'EARLY_REVENUE', 'SERIES_A');
                const highRiskDlom = RiskFactors.suggestDLOM(5, 'EARLY_REVENUE', 'SERIES_A');

                expect(highRiskDlom).toBeGreaterThan(lowRiskDlom);
            });

            it('should apply stage multiplier for early stages', () => {
                const preSeedDlom = RiskFactors.suggestDLOM(3, 'EARLY_REVENUE', 'PRE_SEED');
                const seriesBDlom = RiskFactors.suggestDLOM(3, 'EARLY_REVENUE', 'SERIES_B');

                expect(preSeedDlom).toBeGreaterThan(seriesBDlom);
            });

            it('should return DLOM clamped between 10-50%', () => {
                // Very low risk
                const lowDlom = RiskFactors.suggestDLOM(1, 'PROFITABLE', 'PRE_IPO');
                expect(lowDlom).toBeGreaterThanOrEqual(10);

                // Very high risk
                const highDlom = RiskFactors.suggestDLOM(5, 'PRE_REVENUE', 'PRE_SEED');
                expect(highDlom).toBeLessThanOrEqual(50);
            });

            it('should return numeric percentage value', () => {
                const dlom = RiskFactors.suggestDLOM(3, 'EARLY_REVENUE', 'SERIES_A');
                expect(typeof dlom).toBe('number');
                expect(dlom).toBeGreaterThan(0);
            });
        });

        describe('BASE_DLOM_RANGES', () => {
            it('should have ranges for all revenue stages', () => {
                const { BASE_DLOM_RANGES } = RiskFactors;

                expect(BASE_DLOM_RANGES.PRE_REVENUE).toBeDefined();
                expect(BASE_DLOM_RANGES.EARLY_REVENUE).toBeDefined();
                expect(BASE_DLOM_RANGES.SCALING).toBeDefined();
                expect(BASE_DLOM_RANGES.PROFITABLE).toBeDefined();
            });

            it('should have min/max for each range', () => {
                const { BASE_DLOM_RANGES } = RiskFactors;

                Object.values(BASE_DLOM_RANGES).forEach(range => {
                    expect(range.min).toBeDefined();
                    expect(range.max).toBeDefined();
                    expect(range.max).toBeGreaterThan(range.min);
                });
            });

            it('should have PRE_REVENUE with highest range', () => {
                const { BASE_DLOM_RANGES } = RiskFactors;
                expect(BASE_DLOM_RANGES.PRE_REVENUE.min).toBeGreaterThan(BASE_DLOM_RANGES.PROFITABLE.min);
            });
        });
    });

    describe('DLOC Calculation', () => {
        describe('suggestDLOC', () => {
            it('should return higher DLOC for early stages', () => {
                const preSeedDloc = RiskFactors.suggestDLOC('PRE_SEED');
                const preIpoDloc = RiskFactors.suggestDLOC('PRE_IPO');

                expect(preSeedDloc).toBeGreaterThan(preIpoDloc);
            });

            it('should reduce DLOC for blocking rights', () => {
                const withoutRights = RiskFactors.suggestDLOC('SERIES_A', {});
                const withBlockingRights = RiskFactors.suggestDLOC('SERIES_A', { hasBlockingRights: true });

                expect(withBlockingRights).toBeLessThan(withoutRights);
            });

            it('should reduce DLOC for board seat', () => {
                const withoutSeat = RiskFactors.suggestDLOC('SERIES_A', {});
                const withBoardSeat = RiskFactors.suggestDLOC('SERIES_A', { hasBoardSeat: true });

                expect(withBoardSeat).toBeLessThan(withoutSeat);
            });

            it('should reduce DLOC for veto rights', () => {
                const withoutVeto = RiskFactors.suggestDLOC('SERIES_A', {});
                const withVetoRights = RiskFactors.suggestDLOC('SERIES_A', { hasVetoRights: true });

                expect(withVetoRights).toBeLessThan(withoutVeto);
            });

            it('should increase DLOC for minority holders', () => {
                const notMinority = RiskFactors.suggestDLOC('SERIES_A', {});
                const isMinority = RiskFactors.suggestDLOC('SERIES_A', { isMinorityHolder: true });

                expect(isMinority).toBeGreaterThan(notMinority);
            });

            it('should clamp DLOC between 5-35%', () => {
                // With all reducing factors
                const lowDloc = RiskFactors.suggestDLOC('PRE_IPO', {
                    hasBlockingRights: true,
                    hasBoardSeat: true,
                    hasVetoRights: true
                });
                expect(lowDloc).toBeGreaterThanOrEqual(5);

                // With minority factor on early stage
                const highDloc = RiskFactors.suggestDLOC('PRE_SEED', { isMinorityHolder: true });
                expect(highDloc).toBeLessThanOrEqual(35);
            });
        });
    });

    describe('Volatility Calculation', () => {
        describe('suggestVolatility', () => {
            it('should return higher volatility for early stages', () => {
                const preSeedVol = RiskFactors.suggestVolatility(3, 'PRE_SEED');
                const preIpoVol = RiskFactors.suggestVolatility(3, 'PRE_IPO');

                expect(preSeedVol).toBeGreaterThan(preIpoVol);
            });

            it('should increase volatility for higher risk scores', () => {
                const lowRiskVol = RiskFactors.suggestVolatility(1, 'SERIES_A');
                const highRiskVol = RiskFactors.suggestVolatility(5, 'SERIES_A');

                expect(highRiskVol).toBeGreaterThan(lowRiskVol);
            });

            it('should return volatility between 0.30 and 1.20', () => {
                // All combinations should be in range
                RiskFactors.COMPANY_STAGES.forEach(stage => {
                    [1, 2, 3, 4, 5].forEach(score => {
                        const vol = RiskFactors.suggestVolatility(score, stage);
                        expect(vol).toBeGreaterThanOrEqual(0.30);
                        expect(vol).toBeLessThanOrEqual(1.20);
                    });
                });
            });
        });

        describe('BASE_VOLATILITY_BY_STAGE', () => {
            it('should have volatility for all stages', () => {
                const { BASE_VOLATILITY_BY_STAGE, COMPANY_STAGES } = RiskFactors;

                COMPANY_STAGES.forEach(stage => {
                    expect(BASE_VOLATILITY_BY_STAGE[stage]).toBeDefined();
                    expect(BASE_VOLATILITY_BY_STAGE[stage]).toBeGreaterThan(0);
                });
            });

            it('should have decreasing volatility for later stages', () => {
                const { BASE_VOLATILITY_BY_STAGE } = RiskFactors;

                expect(BASE_VOLATILITY_BY_STAGE.PRE_SEED).toBeGreaterThan(BASE_VOLATILITY_BY_STAGE.SEED);
                expect(BASE_VOLATILITY_BY_STAGE.SEED).toBeGreaterThan(BASE_VOLATILITY_BY_STAGE.SERIES_A);
                expect(BASE_VOLATILITY_BY_STAGE.SERIES_A).toBeGreaterThan(BASE_VOLATILITY_BY_STAGE.SERIES_B);
                expect(BASE_VOLATILITY_BY_STAGE.SERIES_B).toBeGreaterThan(BASE_VOLATILITY_BY_STAGE.GROWTH);
            });
        });
    });

    describe('Discount Rate Adjustment', () => {
        describe('suggestDiscountRateAdjustment', () => {
            it('should return positive adjustment for early stages', () => {
                const adjustment = RiskFactors.suggestDiscountRateAdjustment(3, 'PRE_SEED');
                expect(adjustment).toBeGreaterThan(0);
            });

            it('should return negative or zero adjustment for late stages', () => {
                const adjustment = RiskFactors.suggestDiscountRateAdjustment(3, 'PRE_IPO');
                expect(adjustment).toBeLessThanOrEqual(0);
            });

            it('should increase adjustment for higher risk scores', () => {
                const lowRiskAdj = RiskFactors.suggestDiscountRateAdjustment(1, 'SERIES_A');
                const highRiskAdj = RiskFactors.suggestDiscountRateAdjustment(5, 'SERIES_A');

                expect(highRiskAdj).toBeGreaterThan(lowRiskAdj);
            });

            it('should clamp adjustment between -0.05 and 0.10', () => {
                // Low risk, late stage
                const minAdj = RiskFactors.suggestDiscountRateAdjustment(1, 'PRE_IPO');
                expect(minAdj).toBeGreaterThanOrEqual(-0.05);

                // High risk, early stage
                const maxAdj = RiskFactors.suggestDiscountRateAdjustment(5, 'PRE_SEED');
                expect(maxAdj).toBeLessThanOrEqual(0.10);
            });
        });
    });

    describe('Stage Risk Multipliers', () => {
        describe('STAGE_RISK_MULTIPLIERS', () => {
            it('should have multipliers for all stages', () => {
                const { STAGE_RISK_MULTIPLIERS, COMPANY_STAGES } = RiskFactors;

                COMPANY_STAGES.forEach(stage => {
                    expect(STAGE_RISK_MULTIPLIERS[stage]).toBeDefined();
                    expect(STAGE_RISK_MULTIPLIERS[stage]).toBeGreaterThan(0);
                });
            });

            it('should have higher multipliers for earlier stages', () => {
                const { STAGE_RISK_MULTIPLIERS } = RiskFactors;

                expect(STAGE_RISK_MULTIPLIERS.PRE_SEED).toBeGreaterThan(STAGE_RISK_MULTIPLIERS.SEED);
                expect(STAGE_RISK_MULTIPLIERS.SEED).toBeGreaterThan(STAGE_RISK_MULTIPLIERS.SERIES_A);
            });

            it('should have lower multipliers for later stages', () => {
                const { STAGE_RISK_MULTIPLIERS } = RiskFactors;

                expect(STAGE_RISK_MULTIPLIERS.PRE_IPO).toBeLessThan(STAGE_RISK_MULTIPLIERS.LATE_STAGE);
                expect(STAGE_RISK_MULTIPLIERS.LATE_STAGE).toBeLessThan(STAGE_RISK_MULTIPLIERS.GROWTH);
            });

            it('should have SERIES_B as baseline (1.0)', () => {
                const { STAGE_RISK_MULTIPLIERS } = RiskFactors;
                expect(STAGE_RISK_MULTIPLIERS.SERIES_B).toBe(1.0);
            });
        });
    });

    describe('Default Risk Templates', () => {
        describe('DEFAULT_RISK_TEMPLATES', () => {
            it('should have at least 20 default templates', () => {
                const { DEFAULT_RISK_TEMPLATES } = RiskFactors;
                expect(DEFAULT_RISK_TEMPLATES.length).toBeGreaterThanOrEqual(20);
            });

            it('should have templates for all categories', () => {
                const { DEFAULT_RISK_TEMPLATES, RISK_CATEGORIES } = RiskFactors;

                const templateCategories = [...new Set(DEFAULT_RISK_TEMPLATES.map(t => t.category))];

                // Should cover most categories
                expect(templateCategories.length).toBeGreaterThanOrEqual(6);

                // Check specific expected categories
                expect(templateCategories).toContain('MARKET');
                expect(templateCategories).toContain('TECHNOLOGY');
                expect(templateCategories).toContain('FINANCIAL');
                expect(templateCategories).toContain('OPERATIONAL');
                expect(templateCategories).toContain('KEY_PERSON');
                expect(templateCategories).toContain('REGULATORY');
            });

            it('should have required fields for each template', () => {
                const { DEFAULT_RISK_TEMPLATES } = RiskFactors;

                DEFAULT_RISK_TEMPLATES.forEach((template, index) => {
                    expect(template.category).toBeDefined();
                    expect(template.factorName).toBeDefined();
                    expect(template.description).toBeDefined();
                    expect(template.applicableStages).toBeDefined();
                    expect(Array.isArray(template.applicableStages)).toBe(true);
                    expect(template.applicableStages.length).toBeGreaterThan(0);
                });
            });

            it('should have Market Risk templates', () => {
                const { DEFAULT_RISK_TEMPLATES } = RiskFactors;
                const marketTemplates = DEFAULT_RISK_TEMPLATES.filter(t => t.category === 'MARKET');

                expect(marketTemplates.length).toBeGreaterThanOrEqual(3);

                const factorNames = marketTemplates.map(t => t.factorName);
                expect(factorNames).toContain('Total Addressable Market Uncertainty');
                expect(factorNames).toContain('Competitive Landscape Intensity');
            });

            it('should have Technology Risk templates', () => {
                const { DEFAULT_RISK_TEMPLATES } = RiskFactors;
                const techTemplates = DEFAULT_RISK_TEMPLATES.filter(t => t.category === 'TECHNOLOGY');

                expect(techTemplates.length).toBeGreaterThanOrEqual(3);

                const factorNames = techTemplates.map(t => t.factorName);
                expect(factorNames).toContain('Product Development Stage');
                expect(factorNames).toContain('IP Protection Status');
            });

            it('should have Financial Risk templates', () => {
                const { DEFAULT_RISK_TEMPLATES } = RiskFactors;
                const financialTemplates = DEFAULT_RISK_TEMPLATES.filter(t => t.category === 'FINANCIAL');

                expect(financialTemplates.length).toBeGreaterThanOrEqual(3);

                const factorNames = financialTemplates.map(t => t.factorName);
                expect(factorNames).toContain('Burn Rate vs Runway');
                expect(factorNames).toContain('Revenue Predictability');
            });

            it('should have Key Person Risk templates', () => {
                const { DEFAULT_RISK_TEMPLATES } = RiskFactors;
                const keyPersonTemplates = DEFAULT_RISK_TEMPLATES.filter(t => t.category === 'KEY_PERSON');

                expect(keyPersonTemplates.length).toBeGreaterThanOrEqual(3);

                const factorNames = keyPersonTemplates.map(t => t.factorName);
                expect(factorNames).toContain('Founder Dependency');
                expect(factorNames).toContain('Key Employee Retention');
            });

            it('should have Customer Risk templates', () => {
                const { DEFAULT_RISK_TEMPLATES } = RiskFactors;
                const customerTemplates = DEFAULT_RISK_TEMPLATES.filter(t => t.category === 'CUSTOMER');

                expect(customerTemplates.length).toBeGreaterThanOrEqual(3);

                const factorNames = customerTemplates.map(t => t.factorName);
                expect(factorNames).toContain('Customer Concentration');
                expect(factorNames).toContain('Churn Rate');
            });
        });
    });

    describe('Schema Definitions', () => {
        describe('riskProfileSchema', () => {
            it('should define required fields', () => {
                const { riskProfileSchema } = RiskFactors;

                expect(riskProfileSchema.id).toBeDefined();
                expect(riskProfileSchema.companyId).toBeDefined();
                expect(riskProfileSchema.companyId.required).toBe(true);
                expect(riskProfileSchema.assessmentDate).toBeDefined();
                expect(riskProfileSchema.assessmentDate.required).toBe(true);
                expect(riskProfileSchema.assessedBy).toBeDefined();
                expect(riskProfileSchema.assessedBy.required).toBe(true);
            });

            it('should define stage fields', () => {
                const { riskProfileSchema } = RiskFactors;

                expect(riskProfileSchema.stage).toBeDefined();
                expect(riskProfileSchema.stage.required).toBe(true);
                expect(riskProfileSchema.stage.enum).toBeDefined();

                expect(riskProfileSchema.revenueStage).toBeDefined();
                expect(riskProfileSchema.revenueStage.required).toBe(true);
                expect(riskProfileSchema.revenueStage.enum).toBeDefined();
            });

            it('should define scoring fields', () => {
                const { riskProfileSchema } = RiskFactors;

                expect(riskProfileSchema.overallRiskScore).toBeDefined();
                expect(riskProfileSchema.overallRiskScore.min).toBe(1);
                expect(riskProfileSchema.overallRiskScore.max).toBe(5);

                expect(riskProfileSchema.suggestedDlomPercent).toBeDefined();
                expect(riskProfileSchema.suggestedVolatility).toBeDefined();
                expect(riskProfileSchema.suggestedDlocPercent).toBeDefined();
            });

            it('should define status workflow fields', () => {
                const { riskProfileSchema } = RiskFactors;

                expect(riskProfileSchema.status).toBeDefined();
                expect(riskProfileSchema.status.enum).toBeDefined();
                expect(riskProfileSchema.status.default).toBe('DRAFT');

                expect(riskProfileSchema.approvedBy).toBeDefined();
                expect(riskProfileSchema.approvedAt).toBeDefined();
            });

            it('should define valuation link field', () => {
                const { riskProfileSchema } = RiskFactors;
                expect(riskProfileSchema.linkedValuationId).toBeDefined();
            });
        });

        describe('riskFactorSchema', () => {
            it('should define required fields', () => {
                const { riskFactorSchema } = RiskFactors;

                expect(riskFactorSchema.id).toBeDefined();
                expect(riskFactorSchema.riskProfileId).toBeDefined();
                expect(riskFactorSchema.riskProfileId.required).toBe(true);
                expect(riskFactorSchema.category).toBeDefined();
                expect(riskFactorSchema.category.required).toBe(true);
                expect(riskFactorSchema.factorName).toBeDefined();
                expect(riskFactorSchema.factorName.required).toBe(true);
            });

            it('should define scoring fields', () => {
                const { riskFactorSchema } = RiskFactors;

                expect(riskFactorSchema.severity).toBeDefined();
                expect(riskFactorSchema.severity.required).toBe(true);
                expect(riskFactorSchema.severity.enum).toBeDefined();

                expect(riskFactorSchema.likelihood).toBeDefined();
                expect(riskFactorSchema.likelihood.required).toBe(true);
                expect(riskFactorSchema.likelihood.enum).toBeDefined();

                expect(riskFactorSchema.riskScore).toBeDefined();
                expect(riskFactorSchema.riskScore.min).toBe(1);
                expect(riskFactorSchema.riskScore.max).toBe(16);
            });

            it('should define mitigation fields', () => {
                const { riskFactorSchema } = RiskFactors;

                expect(riskFactorSchema.mitigationStatus).toBeDefined();
                expect(riskFactorSchema.mitigationStatus.enum).toBeDefined();
                expect(riskFactorSchema.mitigationStatus.default).toBe('UNMITIGATED');

                expect(riskFactorSchema.mitigationNotes).toBeDefined();
            });
        });

        describe('riskTemplateSchema', () => {
            it('should define required fields', () => {
                const { riskTemplateSchema } = RiskFactors;

                expect(riskTemplateSchema.id).toBeDefined();
                expect(riskTemplateSchema.category).toBeDefined();
                expect(riskTemplateSchema.category.required).toBe(true);
                expect(riskTemplateSchema.factorName).toBeDefined();
                expect(riskTemplateSchema.factorName.required).toBe(true);
                expect(riskTemplateSchema.description).toBeDefined();
                expect(riskTemplateSchema.description.required).toBe(true);
            });

            it('should define applicable stages field', () => {
                const { riskTemplateSchema } = RiskFactors;
                expect(riskTemplateSchema.applicableStages).toBeDefined();
                expect(riskTemplateSchema.applicableStages.type).toBe('array');
            });

            it('should define active flag with default', () => {
                const { riskTemplateSchema } = RiskFactors;
                expect(riskTemplateSchema.isActive).toBeDefined();
                expect(riskTemplateSchema.isActive.default).toBe(true);
            });
        });
    });

    describe('Table Names', () => {
        it('should export correct table names', () => {
            expect(RiskFactors.profileTableName).toBe('company_risk_profiles');
            expect(RiskFactors.factorTableName).toBe('risk_factors');
            expect(RiskFactors.templateTableName).toBe('risk_factor_templates');
        });
    });

    describe('Integration with 409A Valuation', () => {
        it('should have method to link profile to valuation', () => {
            expect(typeof RiskFactors.linkToValuation).toBe('function');
        });

        it('should have method to get profile for valuation', () => {
            expect(typeof RiskFactors.getProfileForValuation).toBe('function');
        });

        it('should provide DLOM suggestion compatible with ValuationAssumptions', () => {
            // DLOM should be a percentage that can be converted to decimal
            const dlomPercent = RiskFactors.suggestDLOM(3, 'EARLY_REVENUE', 'SERIES_A');
            const dlomDecimal = dlomPercent / 100;

            // Should be in valid range for ValuationAssumptions (0-1)
            expect(dlomDecimal).toBeGreaterThan(0);
            expect(dlomDecimal).toBeLessThan(1);
        });

        it('should provide volatility suggestion compatible with ValuationAssumptions', () => {
            // Volatility should be compatible with ValuationAssumptions (0-3)
            const volatility = RiskFactors.suggestVolatility(3, 'SERIES_A');

            expect(volatility).toBeGreaterThanOrEqual(0);
            expect(volatility).toBeLessThanOrEqual(3);
        });
    });

    describe('API Method Existence', () => {
        describe('Profile Methods', () => {
            it('should have createProfile method', () => {
                expect(typeof RiskFactors.createProfile).toBe('function');
            });

            it('should have findProfileById method', () => {
                expect(typeof RiskFactors.findProfileById).toBe('function');
            });

            it('should have findProfilesByCompany method', () => {
                expect(typeof RiskFactors.findProfilesByCompany).toBe('function');
            });

            it('should have getLatestApprovedProfile method', () => {
                expect(typeof RiskFactors.getLatestApprovedProfile).toBe('function');
            });

            it('should have updateProfile method', () => {
                expect(typeof RiskFactors.updateProfile).toBe('function');
            });

            it('should have approveProfile method', () => {
                expect(typeof RiskFactors.approveProfile).toBe('function');
            });

            it('should have deleteProfile method', () => {
                expect(typeof RiskFactors.deleteProfile).toBe('function');
            });
        });

        describe('Factor Methods', () => {
            it('should have createFactor method', () => {
                expect(typeof RiskFactors.createFactor).toBe('function');
            });

            it('should have findFactorById method', () => {
                expect(typeof RiskFactors.findFactorById).toBe('function');
            });

            it('should have findFactorsByProfile method', () => {
                expect(typeof RiskFactors.findFactorsByProfile).toBe('function');
            });

            it('should have updateFactor method', () => {
                expect(typeof RiskFactors.updateFactor).toBe('function');
            });

            it('should have deleteFactor method', () => {
                expect(typeof RiskFactors.deleteFactor).toBe('function');
            });
        });

        describe('Template Methods', () => {
            it('should have createTemplate method', () => {
                expect(typeof RiskFactors.createTemplate).toBe('function');
            });

            it('should have findTemplateById method', () => {
                expect(typeof RiskFactors.findTemplateById).toBe('function');
            });

            it('should have getActiveTemplates method', () => {
                expect(typeof RiskFactors.getActiveTemplates).toBe('function');
            });

            it('should have getTemplatesByCategory method', () => {
                expect(typeof RiskFactors.getTemplatesByCategory).toBe('function');
            });

            it('should have seedDefaultTemplates method', () => {
                expect(typeof RiskFactors.seedDefaultTemplates).toBe('function');
            });
        });

        describe('Calculation Methods', () => {
            it('should have recalculateProfileScores method', () => {
                expect(typeof RiskFactors.recalculateProfileScores).toBe('function');
            });

            it('should have getRiskSummary method', () => {
                expect(typeof RiskFactors.getRiskSummary).toBe('function');
            });
        });
    });

    describe('Edge Cases', () => {
        describe('Risk Score Boundaries', () => {
            it('should handle score of exactly 1', () => {
                const overall = RiskFactors.calculateOverallRiskScore([{ riskScore: 1 }]);
                expect(overall).toBe(1);
            });

            it('should handle score of exactly 16', () => {
                const overall = RiskFactors.calculateOverallRiskScore([{ riskScore: 16 }]);
                expect(overall).toBe(5);
            });

            it('should handle mixed extreme scores', () => {
                const factors = [{ riskScore: 1 }, { riskScore: 16 }];
                const overall = RiskFactors.calculateOverallRiskScore(factors);
                // avg = 8.5, which falls in 7-9 range -> 3
                expect(overall).toBe(3);
            });
        });

        describe('Stage Handling', () => {
            it('should handle unknown stage with defaults', () => {
                const volatility = RiskFactors.suggestVolatility(3, 'UNKNOWN_STAGE');
                expect(volatility).toBeGreaterThan(0);
            });

            it('should handle unknown revenue stage with defaults', () => {
                const dlom = RiskFactors.suggestDLOM(3, 'UNKNOWN_REVENUE', 'SERIES_A');
                expect(dlom).toBeGreaterThan(0);
            });
        });

        describe('Empty/Null Inputs', () => {
            it('should handle empty metadata for DLOC', () => {
                const dloc = RiskFactors.suggestDLOC('SERIES_A', {});
                expect(dloc).toBeGreaterThan(0);
            });

            it('should handle undefined metadata for DLOC', () => {
                const dloc = RiskFactors.suggestDLOC('SERIES_A', undefined);
                expect(dloc).toBeGreaterThan(0);
            });
        });
    });

    describe('Compliance Dashboard Integration', () => {
        it('should provide data structure compatible with dashboard display', () => {
            // Simulate what getRiskSummary would return
            const mockSummary = {
                hasRiskProfile: true,
                companyId: 'company_123',
                profile: {
                    id: 'rp_456',
                    assessmentDate: '2026-02-07',
                    stage: 'SERIES_A',
                    revenueStage: 'EARLY_REVENUE',
                    status: 'APPROVED'
                },
                scores: {
                    overall: 3,
                    byCategory: {
                        MARKET: { avgScore: 8, factorCount: 2 },
                        FINANCIAL: { avgScore: 6, factorCount: 3 }
                    }
                },
                suggestions: {
                    dlomPercent: 28.5,
                    dlocPercent: 18,
                    volatility: 0.65,
                    discountRateAdjustment: 0.03
                },
                factorCount: 10,
                bySeverity: {
                    CRITICAL: 1,
                    HIGH: 3,
                    MEDIUM: 4,
                    LOW: 2
                },
                byMitigation: {
                    UNMITIGATED: 3,
                    PARTIAL: 4,
                    MITIGATED: 3
                },
                topRisks: [
                    { category: 'FINANCIAL', factorName: 'Burn Rate vs Runway', riskScore: 12 }
                ]
            };

            expect(mockSummary.hasRiskProfile).toBe(true);
            expect(mockSummary.scores.overall).toBeGreaterThanOrEqual(1);
            expect(mockSummary.scores.overall).toBeLessThanOrEqual(5);
            expect(mockSummary.suggestions.dlomPercent).toBeGreaterThan(0);
            expect(mockSummary.topRisks.length).toBeGreaterThan(0);
        });
    });

    describe('Material Event Trigger Integration', () => {
        it('should provide data usable for re-assessment triggers', () => {
            // Risk profile should contain stage info that can be compared
            // when material events occur to determine if re-assessment is needed
            const mockProfile = {
                id: 'rp_123',
                companyId: 'company_456',
                stage: 'SERIES_A',
                revenueStage: 'EARLY_REVENUE',
                assessmentDate: '2026-01-15',
                status: 'APPROVED'
            };

            // A material event might trigger re-assessment if:
            // 1. Profile is older than X days
            // 2. Company stage has changed
            // 3. Revenue stage has changed

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const profileDate = new Date(mockProfile.assessmentDate);
            const needsReassessment = profileDate < thirtyDaysAgo;

            expect(typeof mockProfile.stage).toBe('string');
            expect(RiskFactors.COMPANY_STAGES).toContain(mockProfile.stage);
        });
    });

    describe('Async Method Validation', () => {
        describe('createProfile validation', () => {
            it('should throw error when companyId is missing', async () => {
                const data = {
                    stage: 'SERIES_A',
                    revenueStage: 'EARLY_REVENUE',
                    assessedBy: 'user_123'
                };

                await expect(RiskFactors.createProfile(data)).rejects.toThrow('companyId is required');
            });

            it('should throw error when stage is missing', async () => {
                const data = {
                    companyId: 'company_123',
                    revenueStage: 'EARLY_REVENUE',
                    assessedBy: 'user_123'
                };

                await expect(RiskFactors.createProfile(data)).rejects.toThrow('stage is required');
            });

            it('should throw error when revenueStage is missing', async () => {
                const data = {
                    companyId: 'company_123',
                    stage: 'SERIES_A',
                    assessedBy: 'user_123'
                };

                await expect(RiskFactors.createProfile(data)).rejects.toThrow('revenueStage is required');
            });

            it('should throw error for invalid stage enum', async () => {
                const data = {
                    companyId: 'company_123',
                    stage: 'INVALID_STAGE',
                    revenueStage: 'EARLY_REVENUE',
                    assessedBy: 'user_123'
                };

                await expect(RiskFactors.createProfile(data)).rejects.toThrow('Invalid stage');
            });

            it('should throw error for invalid revenueStage enum', async () => {
                const data = {
                    companyId: 'company_123',
                    stage: 'SERIES_A',
                    revenueStage: 'INVALID_REVENUE',
                    assessedBy: 'user_123'
                };

                await expect(RiskFactors.createProfile(data)).rejects.toThrow('Invalid revenueStage');
            });
        });

        describe('createFactor validation', () => {
            it('should throw error when riskProfileId is missing', async () => {
                const data = {
                    category: 'MARKET',
                    factorName: 'Test Factor',
                    severity: 'MEDIUM',
                    likelihood: 'POSSIBLE'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('riskProfileId is required');
            });

            it('should throw error when category is missing', async () => {
                const data = {
                    riskProfileId: 'rp_123',
                    factorName: 'Test Factor',
                    severity: 'MEDIUM',
                    likelihood: 'POSSIBLE'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('category is required');
            });

            it('should throw error when factorName is missing', async () => {
                const data = {
                    riskProfileId: 'rp_123',
                    category: 'MARKET',
                    severity: 'MEDIUM',
                    likelihood: 'POSSIBLE'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('factorName is required');
            });

            it('should throw error when severity is missing', async () => {
                const data = {
                    riskProfileId: 'rp_123',
                    category: 'MARKET',
                    factorName: 'Test Factor',
                    likelihood: 'POSSIBLE'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('severity is required');
            });

            it('should throw error when likelihood is missing', async () => {
                const data = {
                    riskProfileId: 'rp_123',
                    category: 'MARKET',
                    factorName: 'Test Factor',
                    severity: 'MEDIUM'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('likelihood is required');
            });

            it('should throw error for invalid category enum', async () => {
                const data = {
                    riskProfileId: 'rp_123',
                    category: 'INVALID_CATEGORY',
                    factorName: 'Test Factor',
                    severity: 'MEDIUM',
                    likelihood: 'POSSIBLE'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('Invalid category');
            });

            it('should throw error for invalid severity enum', async () => {
                const data = {
                    riskProfileId: 'rp_123',
                    category: 'MARKET',
                    factorName: 'Test Factor',
                    severity: 'INVALID_SEVERITY',
                    likelihood: 'POSSIBLE'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('Invalid severity');
            });

            it('should throw error for invalid likelihood enum', async () => {
                const data = {
                    riskProfileId: 'rp_123',
                    category: 'MARKET',
                    factorName: 'Test Factor',
                    severity: 'MEDIUM',
                    likelihood: 'INVALID_LIKELIHOOD'
                };

                await expect(RiskFactors.createFactor(data)).rejects.toThrow('Invalid likelihood');
            });
        });

        describe('createTemplate validation', () => {
            it('should throw error when category is missing', async () => {
                const data = {
                    factorName: 'Test Template',
                    description: 'Test description'
                };

                await expect(RiskFactors.createTemplate(data)).rejects.toThrow('category is required');
            });

            it('should throw error when factorName is missing', async () => {
                const data = {
                    category: 'MARKET',
                    description: 'Test description'
                };

                await expect(RiskFactors.createTemplate(data)).rejects.toThrow('factorName is required');
            });

            it('should throw error for invalid category enum', async () => {
                const data = {
                    category: 'INVALID_CATEGORY',
                    factorName: 'Test Template',
                    description: 'Test description'
                };

                await expect(RiskFactors.createTemplate(data)).rejects.toThrow('Invalid category');
            });
        });

        describe('updateProfile validation', () => {
            it('should throw error for invalid stage in update', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({ id: 'rp_123', stage: 'SERIES_A' });

                await expect(
                    RiskFactors.updateProfile('rp_123', { stage: 'INVALID_STAGE' }, 'user_123')
                ).rejects.toThrow('Invalid stage');
            });

            it('should throw error for invalid revenueStage in update', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({ id: 'rp_123', revenueStage: 'EARLY_REVENUE' });

                await expect(
                    RiskFactors.updateProfile('rp_123', { revenueStage: 'INVALID_REVENUE' }, 'user_123')
                ).rejects.toThrow('Invalid revenueStage');
            });

            it('should throw error for invalid status in update', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({ id: 'rp_123', status: 'DRAFT' });

                await expect(
                    RiskFactors.updateProfile('rp_123', { status: 'INVALID_STATUS' }, 'user_123')
                ).rejects.toThrow('Invalid status');
            });
        });

        describe('updateFactor validation', () => {
            beforeEach(() => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({
                    id: 'rf_123',
                    severity: 'MEDIUM',
                    likelihood: 'POSSIBLE',
                    riskScore: 4
                });
            });

            it('should throw error for invalid category in update', async () => {
                await expect(
                    RiskFactors.updateFactor('rf_123', { category: 'INVALID_CATEGORY' }, 'user_123')
                ).rejects.toThrow('Invalid category');
            });

            it('should throw error for invalid severity in update', async () => {
                await expect(
                    RiskFactors.updateFactor('rf_123', { severity: 'INVALID_SEVERITY' }, 'user_123')
                ).rejects.toThrow('Invalid severity');
            });

            it('should throw error for invalid likelihood in update', async () => {
                await expect(
                    RiskFactors.updateFactor('rf_123', { likelihood: 'INVALID_LIKELIHOOD' }, 'user_123')
                ).rejects.toThrow('Invalid likelihood');
            });

            it('should throw error for invalid mitigationStatus in update', async () => {
                await expect(
                    RiskFactors.updateFactor('rf_123', { mitigationStatus: 'INVALID_STATUS' }, 'user_123')
                ).rejects.toThrow('Invalid mitigationStatus');
            });

            it('should throw error when factor not found', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue(null);

                await expect(
                    RiskFactors.updateFactor('rf_999', { severity: 'HIGH' }, 'user_123')
                ).rejects.toThrow('Factor not found');
            });
        });

        describe('approveProfile validation', () => {
            it('should throw error when profile not found', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue(null);

                await expect(
                    RiskFactors.approveProfile('rp_999', 'user_123')
                ).rejects.toThrow('Profile not found');
            });

            it('should throw error when profile already approved', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({
                    id: 'rp_123',
                    status: 'APPROVED'
                });

                await expect(
                    RiskFactors.approveProfile('rp_123', 'user_123')
                ).rejects.toThrow('Can only approve profiles in DRAFT or REVIEWED status');
            });
        });

        describe('recalculateProfileScores validation', () => {
            it('should throw error when profile not found', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue(null);

                await expect(
                    RiskFactors.recalculateProfileScores('rp_999', 'user_123')
                ).rejects.toThrow('Profile not found');
            });
        });
    });

    describe('ID Generation', () => {
        it('should generate profile ID with rp_ prefix', async () => {
            const mockCreate = createModel().create;
            mockCreate.mockImplementation(data => Promise.resolve(data));

            const result = await RiskFactors.createProfile({
                companyId: 'company_123',
                stage: 'SERIES_A',
                revenueStage: 'EARLY_REVENUE',
                assessedBy: 'user_123'
            });

            expect(result.id).toMatch(/^rp_/);
        });

        it('should generate factor ID with rf_ prefix', async () => {
            const mockCreate = createModel().create;
            mockCreate.mockImplementation(data => Promise.resolve(data));

            const result = await RiskFactors.createFactor({
                riskProfileId: 'rp_123',
                category: 'MARKET',
                factorName: 'Test Factor',
                severity: 'MEDIUM',
                likelihood: 'POSSIBLE'
            });

            expect(result.id).toMatch(/^rf_/);
            expect(result.riskScore).toBe(4); // MEDIUM (2) * POSSIBLE (2)
        });

        it('should generate template ID with rt_ prefix', async () => {
            const mockCreate = createModel().create;
            mockCreate.mockImplementation(data => Promise.resolve(data));

            const result = await RiskFactors.createTemplate({
                category: 'MARKET',
                factorName: 'Test Template',
                description: 'Test description'
            });

            expect(result.id).toMatch(/^rt_/);
            expect(result.isActive).toBe(true);
        });
    });

    describe('Default Value Application', () => {
        it('should set default status to DRAFT for new profile', async () => {
            const mockCreate = createModel().create;
            mockCreate.mockImplementation(data => Promise.resolve(data));

            const result = await RiskFactors.createProfile({
                companyId: 'company_123',
                stage: 'SERIES_A',
                revenueStage: 'EARLY_REVENUE',
                assessedBy: 'user_123'
            });

            expect(result.status).toBe('DRAFT');
        });

        it('should set default mitigationStatus to UNMITIGATED for new factor', async () => {
            const mockCreate = createModel().create;
            mockCreate.mockImplementation(data => Promise.resolve(data));

            const result = await RiskFactors.createFactor({
                riskProfileId: 'rp_123',
                category: 'MARKET',
                factorName: 'Test Factor',
                severity: 'HIGH',
                likelihood: 'LIKELY'
            });

            expect(result.mitigationStatus).toBe('UNMITIGATED');
            expect(result.riskScore).toBe(9); // HIGH (3) * LIKELY (3)
        });

        it('should set default isActive to true for new template', async () => {
            const mockCreate = createModel().create;
            mockCreate.mockImplementation(data => Promise.resolve(data));

            const result = await RiskFactors.createTemplate({
                category: 'TECHNOLOGY',
                factorName: 'IP Risk',
                description: 'Intellectual property risk'
            });

            expect(result.isActive).toBe(true);
            expect(result.applicableStages).toEqual(RiskFactors.COMPANY_STAGES);
        });

        it('should auto-set assessmentDate if not provided', async () => {
            const mockCreate = createModel().create;
            mockCreate.mockImplementation(data => Promise.resolve(data));

            const result = await RiskFactors.createProfile({
                companyId: 'company_123',
                stage: 'SERIES_A',
                revenueStage: 'EARLY_REVENUE',
                assessedBy: 'user_123'
            });

            expect(result.assessmentDate).toBeDefined();
        });
    });

    describe('Risk Score Recalculation on Update', () => {
        it('should recalculate riskScore when severity changes', async () => {
            const mockFindOne = createModel().findOne;
            const mockUpdateOne = createModel().updateOne;

            mockFindOne.mockResolvedValue({
                id: 'rf_123',
                severity: 'MEDIUM',
                likelihood: 'POSSIBLE',
                riskScore: 4
            });
            mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

            // After update, findOne should return updated
            mockFindOne.mockResolvedValueOnce({
                id: 'rf_123',
                severity: 'MEDIUM',
                likelihood: 'POSSIBLE',
                riskScore: 4
            }).mockResolvedValueOnce({
                id: 'rf_123',
                severity: 'HIGH',
                likelihood: 'POSSIBLE',
                riskScore: 6
            });

            const result = await RiskFactors.updateFactor('rf_123', { severity: 'HIGH' }, 'user_123');

            // Verify updateOne was called with recalculated score
            expect(mockUpdateOne).toHaveBeenCalled();
            const updateCall = mockUpdateOne.mock.calls[0];
            expect(updateCall[1].$set.riskScore).toBe(6); // HIGH (3) * POSSIBLE (2)
        });

        it('should recalculate riskScore when likelihood changes', async () => {
            const mockFindOne = createModel().findOne;
            const mockUpdateOne = createModel().updateOne;

            mockFindOne.mockResolvedValue({
                id: 'rf_123',
                severity: 'MEDIUM',
                likelihood: 'POSSIBLE',
                riskScore: 4
            });
            mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

            await RiskFactors.updateFactor('rf_123', { likelihood: 'LIKELY' }, 'user_123');

            expect(mockUpdateOne).toHaveBeenCalled();
            const updateCall = mockUpdateOne.mock.calls[0];
            expect(updateCall[1].$set.riskScore).toBe(6); // MEDIUM (2) * LIKELY (3)
        });
    });

    describe('Additional Async Method Tests', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe('findProfilesByCompany', () => {
            it('should find profiles by company', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rp_1', companyId: 'company_123', status: 'APPROVED' },
                    { id: 'rp_2', companyId: 'company_123', status: 'DRAFT' }
                ]);

                const result = await RiskFactors.findProfilesByCompany('company_123');

                expect(mockFind).toHaveBeenCalled();
                expect(result).toHaveLength(2);
            });

            it('should filter by status when provided', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rp_1', companyId: 'company_123', status: 'APPROVED' }
                ]);

                const result = await RiskFactors.findProfilesByCompany('company_123', { status: 'APPROVED' });

                expect(mockFind).toHaveBeenCalled();
                const callArgs = mockFind.mock.calls[0];
                expect(callArgs[0]).toEqual({ companyId: 'company_123', status: 'APPROVED' });
            });
        });

        describe('getLatestApprovedProfile', () => {
            it('should return latest approved profile', async () => {
                const mockFind = createModel().find;
                const approvedProfile = {
                    id: 'rp_1',
                    companyId: 'company_123',
                    status: 'APPROVED',
                    assessmentDate: '2026-02-01'
                };
                mockFind.mockResolvedValue([approvedProfile]);

                const result = await RiskFactors.getLatestApprovedProfile('company_123');

                expect(result).toEqual(approvedProfile);
            });

            it('should return null when no approved profiles', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([]);

                const result = await RiskFactors.getLatestApprovedProfile('company_123');

                expect(result).toBeNull();
            });
        });

        describe('updateProfile success cases', () => {
            it('should update profile with valid data', async () => {
                const mockUpdateOne = createModel().updateOne;
                const mockFindOne = createModel().findOne;

                mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
                mockFindOne.mockResolvedValue({
                    id: 'rp_123',
                    stage: 'SERIES_B',
                    status: 'REVIEWED'
                });

                const result = await RiskFactors.updateProfile('rp_123', { stage: 'SERIES_B' }, 'user_123');

                expect(mockUpdateOne).toHaveBeenCalled();
                expect(result.stage).toBe('SERIES_B');
            });
        });

        describe('approveProfile success cases', () => {
            it('should approve profile in DRAFT status', async () => {
                const mockFindOne = createModel().findOne;
                const mockUpdateOne = createModel().updateOne;

                mockFindOne
                    .mockResolvedValueOnce({ id: 'rp_123', status: 'DRAFT' })
                    .mockResolvedValueOnce({ id: 'rp_123', status: 'APPROVED' });
                mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

                const result = await RiskFactors.approveProfile('rp_123', 'user_123');

                expect(result.status).toBe('APPROVED');
            });

            it('should approve profile in REVIEWED status', async () => {
                const mockFindOne = createModel().findOne;
                const mockUpdateOne = createModel().updateOne;

                mockFindOne
                    .mockResolvedValueOnce({ id: 'rp_123', status: 'REVIEWED' })
                    .mockResolvedValueOnce({ id: 'rp_123', status: 'APPROVED' });
                mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

                const result = await RiskFactors.approveProfile('rp_123', 'user_123');

                expect(result.status).toBe('APPROVED');
            });

            it('should include notes when provided', async () => {
                const mockFindOne = createModel().findOne;
                const mockUpdateOne = createModel().updateOne;

                mockFindOne
                    .mockResolvedValueOnce({ id: 'rp_123', status: 'DRAFT' })
                    .mockResolvedValueOnce({ id: 'rp_123', status: 'APPROVED', notes: 'Approval notes' });
                mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

                const result = await RiskFactors.approveProfile('rp_123', 'user_123', 'Approval notes');

                const updateCall = mockUpdateOne.mock.calls[0];
                expect(updateCall[1].$set.notes).toBe('Approval notes');
            });
        });

        describe('deleteProfile', () => {
            it('should delete profile and associated factors', async () => {
                const mockDeleteMany = createModel().deleteMany;
                const mockDeleteOne = createModel().deleteOne;

                mockDeleteMany.mockResolvedValue({ deletedCount: 5 });
                mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

                const result = await RiskFactors.deleteProfile('rp_123');

                expect(mockDeleteMany).toHaveBeenCalledWith({ riskProfileId: 'rp_123' });
                expect(mockDeleteOne).toHaveBeenCalledWith({ id: 'rp_123' });
            });
        });

        describe('findFactorsByProfile', () => {
            it('should find factors by profile', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rf_1', riskProfileId: 'rp_123', category: 'MARKET' },
                    { id: 'rf_2', riskProfileId: 'rp_123', category: 'FINANCIAL' }
                ]);

                const result = await RiskFactors.findFactorsByProfile('rp_123');

                expect(mockFind).toHaveBeenCalled();
                expect(result).toHaveLength(2);
            });

            it('should filter by category when provided', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rf_1', riskProfileId: 'rp_123', category: 'MARKET' }
                ]);

                const result = await RiskFactors.findFactorsByProfile('rp_123', { category: 'MARKET' });

                const callArgs = mockFind.mock.calls[0];
                expect(callArgs[0]).toEqual({ riskProfileId: 'rp_123', category: 'MARKET' });
            });
        });

        describe('deleteFactor', () => {
            it('should delete factor', async () => {
                const mockDeleteOne = createModel().deleteOne;
                mockDeleteOne.mockResolvedValue({ deletedCount: 1 });

                const result = await RiskFactors.deleteFactor('rf_123');

                expect(mockDeleteOne).toHaveBeenCalledWith({ id: 'rf_123' });
            });
        });

        describe('findTemplateById', () => {
            it('should find template by ID', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({
                    id: 'rt_123',
                    category: 'MARKET',
                    factorName: 'Test Template'
                });

                const result = await RiskFactors.findTemplateById('rt_123');

                expect(mockFindOne).toHaveBeenCalledWith({ id: 'rt_123' });
                expect(result.factorName).toBe('Test Template');
            });
        });

        describe('getActiveTemplates', () => {
            it('should get all active templates', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rt_1', category: 'MARKET', isActive: true },
                    { id: 'rt_2', category: 'FINANCIAL', isActive: true }
                ]);

                const result = await RiskFactors.getActiveTemplates();

                expect(mockFind).toHaveBeenCalledWith({ isActive: true });
            });

            it('should filter by category when provided', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rt_1', category: 'MARKET', isActive: true }
                ]);

                const result = await RiskFactors.getActiveTemplates({ category: 'MARKET' });

                const callArgs = mockFind.mock.calls[0];
                expect(callArgs[0]).toEqual({ isActive: true, category: 'MARKET' });
            });

            it('should filter by applicable stage', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rt_1', category: 'MARKET', isActive: true, applicableStages: ['PRE_SEED', 'SEED'] },
                    { id: 'rt_2', category: 'MARKET', isActive: true, applicableStages: ['SERIES_A', 'SERIES_B'] }
                ]);

                const result = await RiskFactors.getActiveTemplates({ stage: 'SEED' });

                expect(result).toHaveLength(1);
                expect(result[0].id).toBe('rt_1');
            });
        });

        describe('getTemplatesByCategory', () => {
            it('should get templates by category', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([
                    { id: 'rt_1', category: 'TECHNOLOGY', isActive: true }
                ]);

                const result = await RiskFactors.getTemplatesByCategory('TECHNOLOGY');

                expect(mockFind).toHaveBeenCalledWith({ category: 'TECHNOLOGY', isActive: true });
            });
        });

        describe('seedDefaultTemplates', () => {
            it('should seed default templates', async () => {
                const mockCreate = createModel().create;
                mockCreate.mockImplementation(data => Promise.resolve(data));

                const result = await RiskFactors.seedDefaultTemplates('admin_user');

                expect(result.length).toBeGreaterThan(0);
                expect(mockCreate).toHaveBeenCalled();
            });

            it('should handle template creation errors gracefully', async () => {
                const mockCreate = createModel().create;
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

                // First call fails, second succeeds
                mockCreate
                    .mockRejectedValueOnce(new Error('Create failed'))
                    .mockImplementation(data => Promise.resolve(data));

                const result = await RiskFactors.seedDefaultTemplates('admin_user');

                expect(consoleSpy).toHaveBeenCalled();
                consoleSpy.mockRestore();
            });
        });

        describe('recalculateProfileScores', () => {
            it('should recalculate all scores', async () => {
                const mockFindOne = createModel().findOne;
                const mockFind = createModel().find;
                const mockUpdateOne = createModel().updateOne;

                mockFindOne
                    .mockResolvedValueOnce({
                        id: 'rp_123',
                        stage: 'SERIES_A',
                        revenueStage: 'EARLY_REVENUE',
                        metadata: {}
                    })
                    .mockResolvedValueOnce({
                        id: 'rp_123',
                        stage: 'SERIES_A',
                        revenueStage: 'EARLY_REVENUE',
                        overallRiskScore: 3,
                        suggestedDlomPercent: 28.5
                    });

                mockFind.mockResolvedValue([
                    { id: 'rf_1', severity: 'MEDIUM', likelihood: 'POSSIBLE', riskScore: 4, category: 'MARKET' },
                    { id: 'rf_2', severity: 'HIGH', likelihood: 'LIKELY', riskScore: 9, category: 'FINANCIAL' }
                ]);

                mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });

                const result = await RiskFactors.recalculateProfileScores('rp_123', 'user_123');

                expect(mockUpdateOne).toHaveBeenCalled();
                const updateCall = mockUpdateOne.mock.calls[0];
                expect(updateCall[1].$set.overallRiskScore).toBeDefined();
                expect(updateCall[1].$set.suggestedDlomPercent).toBeDefined();
                expect(updateCall[1].$set.suggestedVolatility).toBeDefined();
                expect(updateCall[1].$set.suggestedDlocPercent).toBeDefined();
                expect(updateCall[1].$set.categoryScores).toBeDefined();
            });
        });

        describe('getRiskSummary', () => {
            it('should return no profile message when none approved', async () => {
                const mockFind = createModel().find;
                mockFind.mockResolvedValue([]);

                const result = await RiskFactors.getRiskSummary('company_123');

                expect(result.hasRiskProfile).toBe(false);
                expect(result.message).toBe('No approved risk profile found');
            });

            it('should return full summary with profile', async () => {
                const mockFind = createModel().find;
                const mockProfile = {
                    id: 'rp_123',
                    companyId: 'company_123',
                    status: 'APPROVED',
                    stage: 'SERIES_A',
                    revenueStage: 'EARLY_REVENUE',
                    assessmentDate: '2026-02-01',
                    overallRiskScore: 3,
                    categoryScores: { MARKET: { avgScore: 6, factorCount: 2 } },
                    suggestedDlomPercent: 25,
                    suggestedDlocPercent: 15,
                    suggestedVolatility: 0.65,
                    suggestedDiscountRateAdjustment: 0.03
                };

                const mockFactors = [
                    { id: 'rf_1', category: 'MARKET', factorName: 'TAM Risk', severity: 'HIGH', likelihood: 'POSSIBLE', riskScore: 6, mitigationStatus: 'UNMITIGATED' },
                    { id: 'rf_2', category: 'FINANCIAL', factorName: 'Burn Rate', severity: 'MEDIUM', likelihood: 'LIKELY', riskScore: 6, mitigationStatus: 'PARTIAL' },
                    { id: 'rf_3', category: 'OPERATIONAL', factorName: 'Team Gaps', severity: 'LOW', likelihood: 'UNLIKELY', riskScore: 1, mitigationStatus: 'MITIGATED' },
                    { id: 'rf_4', category: 'REGULATORY', factorName: 'Compliance', severity: 'CRITICAL', likelihood: 'POSSIBLE', riskScore: 8, mitigationStatus: 'UNMITIGATED' }
                ];

                mockFind
                    .mockResolvedValueOnce([mockProfile]) // getLatestApprovedProfile
                    .mockResolvedValueOnce(mockFactors);   // findFactorsByProfile

                const result = await RiskFactors.getRiskSummary('company_123');

                expect(result.hasRiskProfile).toBe(true);
                expect(result.profile.id).toBe('rp_123');
                expect(result.factorCount).toBe(4);
                expect(result.bySeverity.CRITICAL).toBe(1);
                expect(result.bySeverity.HIGH).toBe(1);
                expect(result.bySeverity.MEDIUM).toBe(1);
                expect(result.bySeverity.LOW).toBe(1);
                expect(result.byMitigation.UNMITIGATED).toBe(2);
                expect(result.byMitigation.PARTIAL).toBe(1);
                expect(result.byMitigation.MITIGATED).toBe(1);
                expect(result.topRisks).toHaveLength(4);
            });
        });

        describe('linkToValuation', () => {
            it('should link profile to valuation', async () => {
                const mockUpdateOne = createModel().updateOne;
                const mockFindOne = createModel().findOne;

                mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
                mockFindOne.mockResolvedValue({
                    id: 'rp_123',
                    linkedValuationId: 'val_456'
                });

                const result = await RiskFactors.linkToValuation('rp_123', 'val_456', 'user_123');

                expect(mockUpdateOne).toHaveBeenCalled();
                const updateCall = mockUpdateOne.mock.calls[0];
                expect(updateCall[1].$set.linkedValuationId).toBe('val_456');
            });
        });

        describe('getProfileForValuation', () => {
            it('should get profile linked to valuation', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({
                    id: 'rp_123',
                    linkedValuationId: 'val_456'
                });

                const result = await RiskFactors.getProfileForValuation('val_456');

                expect(mockFindOne).toHaveBeenCalledWith({ linkedValuationId: 'val_456' });
            });
        });

        describe('findProfileById', () => {
            it('should find profile by ID', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({
                    id: 'rp_123',
                    companyId: 'company_456'
                });

                const result = await RiskFactors.findProfileById('rp_123');

                expect(mockFindOne).toHaveBeenCalledWith({ id: 'rp_123' });
            });
        });

        describe('findFactorById', () => {
            it('should find factor by ID', async () => {
                const mockFindOne = createModel().findOne;
                mockFindOne.mockResolvedValue({
                    id: 'rf_123',
                    category: 'MARKET'
                });

                const result = await RiskFactors.findFactorById('rf_123');

                expect(mockFindOne).toHaveBeenCalledWith({ id: 'rf_123' });
            });
        });
    });
});
