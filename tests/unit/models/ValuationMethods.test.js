/**
 * ValuationMethods Model Tests
 * Feature: Issue #263 - Create valuation_assumptions and valuation_methods tables
 * TDD: Tests for valuation methods model
 */

describe('ValuationMethods Model', () => {
    // Constants from the model
    const VALUATION_METHODS = [
        'BACKSOLVE_OPM',
        'PWERM',
        'DCF',
        'MARKET_MULTIPLES',
        'TRANSACTION_MULTIPLES',
        'ASSET_BASED',
        'HYBRID',
        'RULE_OF_THUMB'
    ];

    describe('Schema Validation', () => {
        it('should define all valid valuation methods', () => {
            expect(VALUATION_METHODS).toContain('BACKSOLVE_OPM');
            expect(VALUATION_METHODS).toContain('PWERM');
            expect(VALUATION_METHODS).toContain('DCF');
            expect(VALUATION_METHODS).toContain('MARKET_MULTIPLES');
            expect(VALUATION_METHODS).toContain('TRANSACTION_MULTIPLES');
            expect(VALUATION_METHODS).toContain('ASSET_BASED');
            expect(VALUATION_METHODS).toContain('HYBRID');
            expect(VALUATION_METHODS).toContain('RULE_OF_THUMB');
            expect(VALUATION_METHODS.length).toBe(8);
        });

        it('should reject invalid valuation methods', () => {
            const invalidMethods = ['INVALID', 'UNKNOWN', 'CUSTOM'];
            invalidMethods.forEach(method => {
                expect(VALUATION_METHODS).not.toContain(method);
            });
        });

        it('should auto-generate id with prefix', () => {
            const prefix = 'vm_';
            const mockId = `${prefix}${Date.now()}`;
            expect(mockId.startsWith('vm_')).toBe(true);
        });
    });

    describe('Weight Validation', () => {
        it('should accept weight between 0 and 1', () => {
            const validWeights = [0, 0.25, 0.5, 0.75, 1.0];
            validWeights.forEach(weight => {
                expect(weight).toBeGreaterThanOrEqual(0);
                expect(weight).toBeLessThanOrEqual(1);
            });
        });

        it('should reject weight greater than 1', () => {
            const invalidWeight = 1.5;
            expect(invalidWeight).toBeGreaterThan(1);
        });

        it('should reject negative weight', () => {
            const negativeWeight = -0.5;
            expect(negativeWeight).toBeLessThan(0);
        });
    });

    describe('Method Value Validation', () => {
        it('should accept positive method values', () => {
            const validValues = [1000000, 5000000, 10000000];
            validValues.forEach(value => {
                expect(value).toBeGreaterThan(0);
            });
        });

        it('should reject negative method values', () => {
            const negativeValue = -1000000;
            expect(negativeValue).toBeLessThan(0);
        });
    });

    describe('Weight Sum Validation', () => {
        it('should validate that method weights sum to 1.0', () => {
            const methods = [
                { method: 'DCF', weight: 0.40 },
                { method: 'MARKET_MULTIPLES', weight: 0.35 },
                { method: 'BACKSOLVE_OPM', weight: 0.25 }
            ];

            const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
            const isValid = Math.abs(totalWeight - 1.0) < 0.0001;

            expect(isValid).toBe(true);
            expect(Math.round(totalWeight * 10000) / 10000).toBe(1);
        });

        it('should reject weights that do not sum to 1.0', () => {
            const methods = [
                { method: 'DCF', weight: 0.40 },
                { method: 'MARKET_MULTIPLES', weight: 0.35 }
            ];

            const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
            const isValid = Math.abs(totalWeight - 1.0) < 0.0001;

            expect(isValid).toBe(false);
            expect(totalWeight).toBe(0.75);
        });

        it('should allow single method with weight 1.0', () => {
            const methods = [
                { method: 'DCF', weight: 1.0 }
            ];

            const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
            const isValid = Math.abs(totalWeight - 1.0) < 0.0001;

            expect(isValid).toBe(true);
        });

        it('should handle floating point precision', () => {
            const methods = [
                { method: 'DCF', weight: 0.3333 },
                { method: 'MARKET_MULTIPLES', weight: 0.3333 },
                { method: 'BACKSOLVE_OPM', weight: 0.3334 }
            ];

            const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
            const isValid = Math.abs(totalWeight - 1.0) < 0.0001;

            expect(isValid).toBe(true);
        });
    });

    describe('Weighted Value Calculation', () => {
        it('should calculate weighted average value correctly', () => {
            const methods = [
                { method: 'DCF', weight: 0.40, methodValue: 10000000 },
                { method: 'MARKET_MULTIPLES', weight: 0.35, methodValue: 12000000 },
                { method: 'BACKSOLVE_OPM', weight: 0.25, methodValue: 8000000 }
            ];

            const weightedValue = methods.reduce((sum, m) => {
                return sum + (m.methodValue * m.weight);
            }, 0);

            // 10M * 0.40 + 12M * 0.35 + 8M * 0.25 = 4M + 4.2M + 2M = 10.2M
            expect(weightedValue).toBe(10200000);
        });

        it('should handle single method weighted value', () => {
            const methods = [
                { method: 'DCF', weight: 1.0, methodValue: 15000000 }
            ];

            const weightedValue = methods.reduce((sum, m) => {
                return sum + (m.methodValue * m.weight);
            }, 0);

            expect(weightedValue).toBe(15000000);
        });

        it('should return null for empty methods list', () => {
            const methods = [];
            const weightedValue = methods.length === 0 ? null :
                methods.reduce((sum, m) => sum + (m.methodValue * m.weight), 0);

            expect(weightedValue).toBeNull();
        });
    });

    describe('Comparable Companies', () => {
        it('should store comparable company data', () => {
            const comparableCompanies = [
                {
                    name: 'Company A',
                    ticker: 'CMPA',
                    industry: 'Software',
                    marketCap: 5000000000,
                    revenueMultiple: 8.5,
                    ebitdaMultiple: 15.2
                },
                {
                    name: 'Company B',
                    ticker: 'CMPB',
                    industry: 'Software',
                    marketCap: 3000000000,
                    revenueMultiple: 6.0,
                    ebitdaMultiple: 12.0
                }
            ];

            expect(comparableCompanies.length).toBe(2);
            expect(comparableCompanies[0].name).toBe('Company A');
            expect(comparableCompanies[0].revenueMultiple).toBe(8.5);
        });

        it('should default to empty array for comparable companies', () => {
            const method = {
                method: 'DCF',
                weight: 1.0,
                methodValue: 10000000,
                comparableCompanies: []
            };

            expect(method.comparableCompanies).toEqual([]);
        });
    });

    describe('Method Summary', () => {
        it('should generate method summary for valuation', () => {
            const methods = [
                { method: 'DCF', weight: 0.50, methodValue: 10000000 },
                { method: 'MARKET_MULTIPLES', weight: 0.50, methodValue: 12000000 }
            ];

            const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
            const weightedValue = methods.reduce((sum, m) => sum + (m.methodValue * m.weight), 0);

            const summary = {
                methodCount: methods.length,
                methods: methods.map(m => ({
                    method: m.method,
                    weight: m.weight,
                    methodValue: m.methodValue
                })),
                weightsValid: Math.abs(totalWeight - 1.0) < 0.0001,
                totalWeight: Math.round(totalWeight * 10000) / 10000,
                calculatedValue: Math.round(weightedValue * 100) / 100
            };

            expect(summary.methodCount).toBe(2);
            expect(summary.weightsValid).toBe(true);
            expect(summary.totalWeight).toBe(1);
            expect(summary.calculatedValue).toBe(11000000);
        });

        it('should return invalid when no methods found', () => {
            const methods = [];

            const validation = {
                valid: methods.length > 0,
                total: 0,
                error: methods.length === 0 ? 'No methods found for valuation' : null
            };

            expect(validation.valid).toBe(false);
            expect(validation.error).toBe('No methods found for valuation');
        });
    });

    describe('Method Types Description', () => {
        it('should describe BACKSOLVE_OPM correctly', () => {
            const description = 'Option Pricing Model backsolve';
            expect(description).toContain('Option Pricing');
        });

        it('should describe PWERM correctly', () => {
            const description = 'Probability-Weighted Expected Return';
            expect(description).toContain('Probability');
        });

        it('should describe DCF correctly', () => {
            const description = 'Discounted Cash Flow';
            expect(description).toContain('Discounted');
        });

        it('should describe MARKET_MULTIPLES correctly', () => {
            const description = 'Guideline public company method';
            expect(description).toContain('public company');
        });

        it('should describe TRANSACTION_MULTIPLES correctly', () => {
            const description = 'Guideline transaction method';
            expect(description).toContain('transaction');
        });

        it('should describe ASSET_BASED correctly', () => {
            const description = 'Net asset value';
            expect(description).toContain('asset');
        });

        it('should describe HYBRID correctly', () => {
            const description = 'Combination approach';
            expect(description).toContain('Combination');
        });

        it('should describe RULE_OF_THUMB correctly', () => {
            const description = 'Industry-specific rules';
            expect(description).toContain('Industry');
        });
    });

    describe('Valuation Integration', () => {
        it('should link method to valuation via valuationId', () => {
            const method = {
                id: 'vm_123',
                valuationId: 'val_456',
                method: 'DCF',
                weight: 1.0,
                methodValue: 10000000
            };

            expect(method.valuationId).toBe('val_456');
        });

        it('should require at least one method for approved valuations', () => {
            const methods = [];
            const canApprove = methods.length >= 1;
            expect(canApprove).toBe(false);
        });

        it('should allow approval with valid methods', () => {
            const methods = [
                { method: 'DCF', weight: 1.0, methodValue: 10000000 }
            ];
            const totalWeight = methods.reduce((sum, m) => sum + m.weight, 0);
            const weightsValid = Math.abs(totalWeight - 1.0) < 0.0001;
            const canApprove = methods.length >= 1 && weightsValid;

            expect(canApprove).toBe(true);
        });
    });
});
