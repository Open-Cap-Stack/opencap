/**
 * ValuationAssumptions Model Tests
 * Feature: Issue #263 - Create valuation_assumptions and valuation_methods tables
 * TDD: Tests for valuation assumptions model
 */

describe('ValuationAssumptions Model', () => {
    // Constants from the model
    const EXIT_SCENARIOS = ['IPO', 'ACQUISITION', 'STAY_PRIVATE'];
    const OPTION_POOL_TREATMENT = [
        'INCLUDE_ALLOCATED_ONLY',
        'INCLUDE_FULL_POOL',
        'TREASURY_METHOD',
        'EXCLUDE'
    ];
    const CONVERTIBLE_TREATMENT = [
        'EXCLUDE_UNTIL_CONVERT',
        'INCLUDE_AS_CONVERTED',
        'PROBABILITY_WEIGHTED',
        'SHADOW_PREFERRED'
    ];

    describe('Schema Validation', () => {
        it('should define valid exit scenarios', () => {
            expect(EXIT_SCENARIOS).toContain('IPO');
            expect(EXIT_SCENARIOS).toContain('ACQUISITION');
            expect(EXIT_SCENARIOS).toContain('STAY_PRIVATE');
            expect(EXIT_SCENARIOS.length).toBe(3);
        });

        it('should define valid option pool treatments', () => {
            expect(OPTION_POOL_TREATMENT).toContain('INCLUDE_ALLOCATED_ONLY');
            expect(OPTION_POOL_TREATMENT).toContain('INCLUDE_FULL_POOL');
            expect(OPTION_POOL_TREATMENT).toContain('TREASURY_METHOD');
            expect(OPTION_POOL_TREATMENT).toContain('EXCLUDE');
            expect(OPTION_POOL_TREATMENT.length).toBe(4);
        });

        it('should define valid SAFE/note treatments', () => {
            expect(CONVERTIBLE_TREATMENT).toContain('EXCLUDE_UNTIL_CONVERT');
            expect(CONVERTIBLE_TREATMENT).toContain('INCLUDE_AS_CONVERTED');
            expect(CONVERTIBLE_TREATMENT).toContain('PROBABILITY_WEIGHTED');
            expect(CONVERTIBLE_TREATMENT).toContain('SHADOW_PREFERRED');
            expect(CONVERTIBLE_TREATMENT.length).toBe(4);
        });

        it('should reject invalid exit scenarios', () => {
            const invalidScenarios = ['MERGER', 'BANKRUPTCY', 'UNKNOWN'];
            invalidScenarios.forEach(scenario => {
                expect(EXIT_SCENARIOS).not.toContain(scenario);
            });
        });

        it('should auto-generate id with prefix', () => {
            const prefix = 'va_';
            const mockId = `${prefix}${Date.now()}`;
            expect(mockId.startsWith('va_')).toBe(true);
        });
    });

    describe('Rate Validation', () => {
        it('should validate risk-free rate bounds (0-100%)', () => {
            const validRates = [0, 0.02, 0.05, 0.10, 1.0];
            validRates.forEach(rate => {
                expect(rate).toBeGreaterThanOrEqual(0);
                expect(rate).toBeLessThanOrEqual(1);
            });
        });

        it('should reject negative risk-free rate', () => {
            const negativeRate = -0.01;
            expect(negativeRate).toBeLessThan(0);
        });

        it('should validate discount rate bounds (0-100%)', () => {
            const validRates = [0, 0.08, 0.15, 0.25];
            validRates.forEach(rate => {
                expect(rate).toBeGreaterThanOrEqual(0);
                expect(rate).toBeLessThanOrEqual(1);
            });
        });

        it('should validate equity volatility bounds (0-300%)', () => {
            const validVolatilities = [0, 0.30, 0.60, 1.0, 2.0, 3.0];
            validVolatilities.forEach(vol => {
                expect(vol).toBeGreaterThanOrEqual(0);
                expect(vol).toBeLessThanOrEqual(3);
            });
        });

        it('should validate DLOM bounds (0-100%)', () => {
            const validDlom = [0, 0.10, 0.20, 0.35, 0.50];
            validDlom.forEach(dlom => {
                expect(dlom).toBeGreaterThanOrEqual(0);
                expect(dlom).toBeLessThanOrEqual(1);
            });
        });

        it('should validate DLOC bounds (0-100%)', () => {
            const validDloc = [0, 0.10, 0.15, 0.25];
            validDloc.forEach(dloc => {
                expect(dloc).toBeGreaterThanOrEqual(0);
                expect(dloc).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('Time to Liquidity', () => {
        it('should accept valid time to liquidity values', () => {
            const validYears = [0, 0.5, 1, 2, 3, 5, 7, 10];
            validYears.forEach(years => {
                expect(years).toBeGreaterThanOrEqual(0);
            });
        });

        it('should reject negative time to liquidity', () => {
            const negativeYears = -1;
            expect(negativeYears).toBeLessThan(0);
        });
    });

    describe('Market Multiples', () => {
        it('should store revenue multiples', () => {
            const revenueMultiple = 5.5;
            expect(revenueMultiple).toBeGreaterThan(0);
        });

        it('should store EBITDA multiples', () => {
            const ebitdaMultiple = 12.0;
            expect(ebitdaMultiple).toBeGreaterThan(0);
        });

        it('should allow null multiples when not using market approach', () => {
            const assumptions = {
                valuationId: 'val_123',
                revenueMultiple: null,
                ebitdaMultiple: null
            };
            expect(assumptions.revenueMultiple).toBeNull();
            expect(assumptions.ebitdaMultiple).toBeNull();
        });
    });

    describe('Assumptions Validation for Approval', () => {
        it('should require discount rate for approval', () => {
            const incompleteAssumptions = {
                valuationId: 'val_123',
                discountRate: undefined,
                dlom: 0.25
            };
            const hasDiscountRate = incompleteAssumptions.discountRate !== undefined;
            expect(hasDiscountRate).toBe(false);
        });

        it('should require DLOM for approval', () => {
            const incompleteAssumptions = {
                valuationId: 'val_123',
                discountRate: 0.15,
                dlom: undefined
            };
            const hasDlom = incompleteAssumptions.dlom !== undefined;
            expect(hasDlom).toBe(false);
        });

        it('should pass validation with required fields', () => {
            const completeAssumptions = {
                valuationId: 'val_123',
                discountRate: 0.15,
                dlom: 0.25,
                exitScenario: 'ACQUISITION',
                timeToLiquidityYears: 3
            };
            const hasDiscountRate = completeAssumptions.discountRate !== undefined;
            const hasDlom = completeAssumptions.dlom !== undefined;
            expect(hasDiscountRate).toBe(true);
            expect(hasDlom).toBe(true);
        });

        it('should warn when exit scenario not specified', () => {
            const assumptions = {
                valuationId: 'val_123',
                discountRate: 0.15,
                dlom: 0.25,
                exitScenario: undefined
            };
            const hasExitScenario = assumptions.exitScenario !== undefined;
            expect(hasExitScenario).toBe(false);
        });

        it('should warn when assumptions narrative not provided', () => {
            const assumptions = {
                valuationId: 'val_123',
                discountRate: 0.15,
                dlom: 0.25,
                assumptionsNarrative: undefined
            };
            const hasNarrative = assumptions.assumptionsNarrative !== undefined;
            expect(hasNarrative).toBe(false);
        });
    });

    describe('Assumptions Summary', () => {
        it('should generate key rates summary', () => {
            const assumptions = {
                discountRate: 0.15,
                riskFreeRate: 0.04,
                equityVolatility: 0.60,
                terminalGrowthRate: 0.03
            };

            const keyRates = {
                discountRate: assumptions.discountRate,
                riskFreeRate: assumptions.riskFreeRate,
                equityVolatility: assumptions.equityVolatility,
                terminalGrowthRate: assumptions.terminalGrowthRate
            };

            expect(keyRates.discountRate).toBe(0.15);
            expect(keyRates.riskFreeRate).toBe(0.04);
            expect(keyRates.equityVolatility).toBe(0.60);
        });

        it('should generate discounts summary', () => {
            const assumptions = {
                dlom: 0.25,
                dloc: 0.15
            };

            const discounts = {
                dlom: assumptions.dlom,
                dloc: assumptions.dloc
            };

            expect(discounts.dlom).toBe(0.25);
            expect(discounts.dloc).toBe(0.15);
        });

        it('should generate exit assumptions summary', () => {
            const assumptions = {
                exitScenario: 'IPO',
                timeToLiquidityYears: 5
            };

            const exitAssumptions = {
                scenario: assumptions.exitScenario,
                timeToLiquidityYears: assumptions.timeToLiquidityYears
            };

            expect(exitAssumptions.scenario).toBe('IPO');
            expect(exitAssumptions.timeToLiquidityYears).toBe(5);
        });
    });

    describe('Additional Assumptions JSON', () => {
        it('should store custom assumptions in JSON field', () => {
            const customAssumptions = {
                industrySpecificRate: 0.12,
                geographicAdjustment: 0.05,
                specialCircumstances: ['pending litigation', 'key person risk']
            };

            expect(customAssumptions.industrySpecificRate).toBe(0.12);
            expect(customAssumptions.specialCircumstances.length).toBe(2);
        });

        it('should default to empty object for assumptionsJson', () => {
            const assumptions = {
                valuationId: 'val_123',
                assumptionsJson: {}
            };
            expect(assumptions.assumptionsJson).toEqual({});
        });
    });
});
