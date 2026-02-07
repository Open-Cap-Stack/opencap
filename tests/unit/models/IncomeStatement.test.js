/**
 * Income Statement Model Unit Tests
 *
 * Tests for the IncomeStatement model including validation, calculations, and methods.
 * Implements: Issue #265 - Create income statement model for historical financials
 */

// Mock the ZeroDB service before requiring the model
jest.mock('../../../services/zerodbService', () => ({
    initialize: jest.fn().mockResolvedValue(true),
    insertRow: jest.fn().mockResolvedValue({ data: [{ row_id: 'test-id', row_data: {} }] }),
    queryTable: jest.fn().mockResolvedValue({ data: [] }),
    updateRows: jest.fn().mockResolvedValue({ modified_count: 1 }),
    deleteRows: jest.fn().mockResolvedValue({ deleted_count: 1 }),
    createTable: jest.fn().mockResolvedValue({}),
    projectId: 'test-project'
}));

const IncomeStatement = require('../../../models/IncomeStatement');

describe('IncomeStatement Model', () => {
    const validPeriodTypes = ['MONTH', 'QUARTER', 'YEAR'];
    const validStatuses = ['draft', 'under_review', 'approved', 'published'];
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

    describe('Utility Functions', () => {
        describe('calculateTotals', () => {
            it('should calculate gross profit correctly', () => {
                const doc = {
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    opexTotal: 300000
                };

                IncomeStatement.calculateTotals(doc);

                expect(doc.grossProfit).toBe(600000);
            });

            it('should calculate operating income correctly', () => {
                const doc = {
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    opexTotal: 300000
                };

                IncomeStatement.calculateTotals(doc);

                expect(doc.operatingIncome).toBe(300000);
            });

            it('should calculate EBITDA correctly', () => {
                const doc = {
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    opexTotal: 300000,
                    opexDepreciation: 50000,
                    opexAmortization: 25000
                };

                IncomeStatement.calculateTotals(doc);

                // EBITDA = Operating Income + Depreciation + Amortization
                expect(doc.ebitda).toBe(375000);
            });

            it('should calculate income before tax correctly', () => {
                const doc = {
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    opexTotal: 300000,
                    interestIncome: 10000,
                    interestExpense: 20000,
                    otherIncomeExpense: 5000
                };

                IncomeStatement.calculateTotals(doc);

                // Income Before Tax = Operating Income + Interest Income - Interest Expense + Other
                expect(doc.incomeBeforeTax).toBe(295000);
            });

            it('should calculate net income correctly', () => {
                const doc = {
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    opexTotal: 300000,
                    interestIncome: 0,
                    interestExpense: 0,
                    otherIncomeExpense: 0,
                    incomeTaxExpense: 75000
                };

                IncomeStatement.calculateTotals(doc);

                // Net Income = Income Before Tax - Tax Expense
                expect(doc.netIncome).toBe(225000);
            });

            it('should handle zero revenue', () => {
                const doc = {
                    revenueTotal: 0,
                    cogsTotal: 0,
                    opexTotal: 50000
                };

                IncomeStatement.calculateTotals(doc);

                expect(doc.grossProfit).toBe(0);
                expect(doc.operatingIncome).toBe(-50000);
            });

            it('should handle missing fields with defaults', () => {
                const doc = {
                    revenueTotal: 500000
                };

                IncomeStatement.calculateTotals(doc);

                expect(doc.grossProfit).toBe(500000);
                expect(doc.operatingIncome).toBe(500000);
                expect(doc.ebitda).toBe(500000);
                expect(doc.netIncome).toBe(500000);
            });
        });

        describe('Margin Calculations', () => {
            const sampleDoc = {
                revenueTotal: 1000000,
                grossProfit: 600000,
                operatingIncome: 300000,
                netIncome: 225000,
                ebitda: 375000,
                headcountEnd: 50
            };

            describe('grossMargin', () => {
                it('should calculate gross margin correctly', () => {
                    const margin = IncomeStatement.grossMargin(sampleDoc);
                    expect(margin).toBe(0.6);
                });

                it('should return null when revenue is zero', () => {
                    const margin = IncomeStatement.grossMargin({ ...sampleDoc, revenueTotal: 0 });
                    expect(margin).toBeNull();
                });

                it('should return null when revenue is undefined', () => {
                    const margin = IncomeStatement.grossMargin({});
                    expect(margin).toBeNull();
                });
            });

            describe('operatingMargin', () => {
                it('should calculate operating margin correctly', () => {
                    const margin = IncomeStatement.operatingMargin(sampleDoc);
                    expect(margin).toBe(0.3);
                });

                it('should return null when revenue is zero', () => {
                    const margin = IncomeStatement.operatingMargin({ ...sampleDoc, revenueTotal: 0 });
                    expect(margin).toBeNull();
                });
            });

            describe('netMargin', () => {
                it('should calculate net margin correctly', () => {
                    const margin = IncomeStatement.netMargin(sampleDoc);
                    expect(margin).toBe(0.225);
                });

                it('should handle negative net income', () => {
                    const margin = IncomeStatement.netMargin({ ...sampleDoc, netIncome: -100000 });
                    expect(margin).toBe(-0.1);
                });
            });

            describe('ebitdaMargin', () => {
                it('should calculate EBITDA margin correctly', () => {
                    const margin = IncomeStatement.ebitdaMargin(sampleDoc);
                    expect(margin).toBe(0.375);
                });
            });

            describe('revenuePerEmployee', () => {
                it('should calculate revenue per employee correctly', () => {
                    const rpe = IncomeStatement.revenuePerEmployee(sampleDoc);
                    expect(rpe).toBe(20000);
                });

                it('should return null when headcount is zero', () => {
                    const rpe = IncomeStatement.revenuePerEmployee({ ...sampleDoc, headcountEnd: 0 });
                    expect(rpe).toBeNull();
                });

                it('should return null when headcount is undefined', () => {
                    const rpe = IncomeStatement.revenuePerEmployee({ revenueTotal: 1000000 });
                    expect(rpe).toBeNull();
                });
            });

            describe('calculateMargins', () => {
                it('should return all margin calculations', () => {
                    const margins = IncomeStatement.calculateMargins(sampleDoc);

                    expect(margins.grossMargin).toBe(0.6);
                    expect(margins.operatingMargin).toBe(0.3);
                    expect(margins.netMargin).toBe(0.225);
                    expect(margins.ebitdaMargin).toBe(0.375);
                    expect(margins.revenuePerEmployee).toBe(20000);
                });

                it('should handle document with zero revenue', () => {
                    const margins = IncomeStatement.calculateMargins({ revenueTotal: 0 });

                    expect(margins.grossMargin).toBeNull();
                    expect(margins.operatingMargin).toBeNull();
                    expect(margins.netMargin).toBeNull();
                    expect(margins.ebitdaMargin).toBeNull();
                });
            });
        });

        describe('validateIncomeStatement', () => {
            it('should validate correct income statement', () => {
                const doc = {
                    periodStart: new Date('2024-01-01'),
                    periodEnd: new Date('2024-03-31'),
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    grossProfit: 600000,
                    opexTotal: 300000,
                    operatingIncome: 300000
                };

                const result = IncomeStatement.validateIncomeStatement(doc);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should detect invalid period dates', () => {
                const doc = {
                    periodStart: new Date('2024-03-31'),
                    periodEnd: new Date('2024-01-01'),
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    grossProfit: 600000,
                    opexTotal: 300000,
                    operatingIncome: 300000
                };

                const result = IncomeStatement.validateIncomeStatement(doc);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Period start date must be before period end date');
            });

            it('should detect incorrect gross profit calculation', () => {
                const doc = {
                    periodStart: new Date('2024-01-01'),
                    periodEnd: new Date('2024-03-31'),
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    grossProfit: 500000, // Wrong: should be 600000
                    opexTotal: 300000,
                    operatingIncome: 200000
                };

                const result = IncomeStatement.validateIncomeStatement(doc);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Gross profit does not match revenue minus COGS');
            });

            it('should detect incorrect operating income calculation', () => {
                const doc = {
                    periodStart: new Date('2024-01-01'),
                    periodEnd: new Date('2024-03-31'),
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    grossProfit: 600000,
                    opexTotal: 300000,
                    operatingIncome: 400000 // Wrong: should be 300000
                };

                const result = IncomeStatement.validateIncomeStatement(doc);

                expect(result.isValid).toBe(false);
                expect(result.errors).toContain('Operating income does not match gross profit minus opex');
            });
        });
    });

    describe('Period Types', () => {
        it.each(validPeriodTypes)('should accept valid period type "%s"', (periodType) => {
            const doc = {
                companyId: 'company-123',
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-03-31'),
                periodType,
                revenueTotal: 1000000,
                cogsTotal: 400000,
                opexTotal: 300000
            };

            // Calculate totals to ensure validation passes
            IncomeStatement.calculateTotals(doc);
            const result = IncomeStatement.validateIncomeStatement(doc);

            expect(result.isValid).toBe(true);
        });
    });

    describe('Financial Scenarios', () => {
        describe('Profitable Company', () => {
            it('should correctly calculate metrics for a profitable company', () => {
                const doc = {
                    revenueTotal: 10000000,
                    cogsTotal: 4000000,
                    opexTotal: 3500000,
                    opexDepreciation: 200000,
                    opexAmortization: 100000,
                    interestIncome: 50000,
                    interestExpense: 150000,
                    otherIncomeExpense: 0,
                    incomeTaxExpense: 500000,
                    headcountEnd: 100
                };

                IncomeStatement.calculateTotals(doc);
                const margins = IncomeStatement.calculateMargins(doc);

                expect(doc.grossProfit).toBe(6000000);
                expect(doc.operatingIncome).toBe(2500000);
                expect(doc.ebitda).toBe(2800000);
                expect(doc.incomeBeforeTax).toBe(2400000);
                expect(doc.netIncome).toBe(1900000);
                expect(margins.grossMargin).toBe(0.6);
                expect(margins.operatingMargin).toBe(0.25);
                expect(margins.netMargin).toBe(0.19);
                expect(margins.revenuePerEmployee).toBe(100000);
            });
        });

        describe('Loss-Making Company', () => {
            it('should correctly calculate metrics for a loss-making company', () => {
                const doc = {
                    revenueTotal: 5000000,
                    cogsTotal: 3000000,
                    opexTotal: 4000000,
                    opexDepreciation: 100000,
                    opexAmortization: 50000,
                    interestIncome: 10000,
                    interestExpense: 200000,
                    otherIncomeExpense: 0,
                    incomeTaxExpense: 0,
                    headcountEnd: 50
                };

                IncomeStatement.calculateTotals(doc);
                const margins = IncomeStatement.calculateMargins(doc);

                expect(doc.grossProfit).toBe(2000000);
                expect(doc.operatingIncome).toBe(-2000000);
                expect(doc.ebitda).toBe(-1850000);
                expect(doc.incomeBeforeTax).toBe(-2190000);
                expect(doc.netIncome).toBe(-2190000);
                expect(margins.grossMargin).toBe(0.4);
                expect(margins.operatingMargin).toBe(-0.4);
                expect(margins.netMargin).toBe(-0.438);
            });
        });

        describe('SaaS Company', () => {
            it('should correctly handle high recurring revenue scenario', () => {
                const doc = {
                    revenueTotal: 20000000,
                    revenueRecurring: 18000000,
                    revenueNonRecurring: 2000000,
                    cogsTotal: 4000000,
                    opexTotal: 12000000,
                    opexResearchDevelopment: 5000000,
                    opexSalesMarketing: 5000000,
                    opexGeneralAdmin: 1500000,
                    opexStockCompensation: 500000,
                    opexDepreciation: 100000,
                    opexAmortization: 50000,
                    interestIncome: 100000,
                    interestExpense: 0,
                    incomeTaxExpense: 800000,
                    headcountEnd: 200
                };

                IncomeStatement.calculateTotals(doc);
                const margins = IncomeStatement.calculateMargins(doc);

                expect(doc.grossProfit).toBe(16000000);
                expect(doc.operatingIncome).toBe(4000000);
                expect(margins.grossMargin).toBe(0.8);
                expect(margins.operatingMargin).toBe(0.2);
                expect(margins.revenuePerEmployee).toBe(100000);
            });
        });

        describe('Manufacturing Company', () => {
            it('should correctly handle high COGS scenario', () => {
                const doc = {
                    revenueTotal: 50000000,
                    revenueProduct: 45000000,
                    revenueServices: 5000000,
                    cogsTotal: 35000000,
                    cogsMaterials: 25000000,
                    cogsLabor: 8000000,
                    cogsOther: 2000000,
                    opexTotal: 10000000,
                    opexGeneralAdmin: 5000000,
                    opexSalesMarketing: 3000000,
                    opexDepreciation: 2000000,
                    interestExpense: 500000,
                    incomeTaxExpense: 1000000,
                    headcountEnd: 500
                };

                IncomeStatement.calculateTotals(doc);
                const margins = IncomeStatement.calculateMargins(doc);

                expect(doc.grossProfit).toBe(15000000);
                expect(margins.grossMargin).toBe(0.3);
                expect(margins.revenuePerEmployee).toBe(100000);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero revenue without errors', () => {
            const doc = {
                revenueTotal: 0,
                cogsTotal: 0,
                opexTotal: 100000
            };

            expect(() => IncomeStatement.calculateTotals(doc)).not.toThrow();

            const margins = IncomeStatement.calculateMargins(doc);
            expect(margins.grossMargin).toBeNull();
            expect(margins.operatingMargin).toBeNull();
        });

        it('should handle very large numbers', () => {
            const doc = {
                revenueTotal: 100000000000,
                cogsTotal: 40000000000,
                opexTotal: 30000000000
            };

            IncomeStatement.calculateTotals(doc);

            expect(doc.grossProfit).toBe(60000000000);
            expect(doc.operatingIncome).toBe(30000000000);
        });

        it('should handle decimal values', () => {
            const doc = {
                revenueTotal: 1234567.89,
                cogsTotal: 493827.16,
                opexTotal: 370370.37
            };

            IncomeStatement.calculateTotals(doc);

            expect(doc.grossProfit).toBeCloseTo(740740.73, 2);
            expect(doc.operatingIncome).toBeCloseTo(370370.36, 2);
        });

        it('should handle negative other income/expense', () => {
            const doc = {
                revenueTotal: 1000000,
                cogsTotal: 400000,
                opexTotal: 300000,
                otherIncomeExpense: -50000,
                incomeTaxExpense: 50000
            };

            IncomeStatement.calculateTotals(doc);

            expect(doc.incomeBeforeTax).toBe(250000);
            expect(doc.netIncome).toBe(200000);
        });
    });

    describe('Model Methods', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe('create', () => {
            it('should set documentType to income_statement', async () => {
                const data = {
                    companyId: 'company-123',
                    periodStart: new Date('2024-01-01'),
                    periodEnd: new Date('2024-03-31'),
                    periodType: 'QUARTER',
                    revenueTotal: 1000000,
                    cogsTotal: 400000,
                    opexTotal: 300000
                };

                const zerodbService = require('../../../services/zerodbService');
                zerodbService.insertRow.mockResolvedValueOnce({
                    data: [{
                        row_id: 'new-id',
                        row_data: { ...data, documentType: 'income_statement' }
                    }]
                });

                await IncomeStatement.create(data);

                expect(zerodbService.insertRow).toHaveBeenCalled();
                const callArgs = zerodbService.insertRow.mock.calls[0][1];
                expect(callArgs.documentType).toBe('income_statement');
            });

            it('should throw error for invalid period dates', async () => {
                const data = {
                    companyId: 'company-123',
                    periodStart: new Date('2024-03-31'),
                    periodEnd: new Date('2024-01-01'),
                    periodType: 'QUARTER',
                    revenueTotal: 1000000
                };

                await expect(IncomeStatement.create(data)).rejects.toThrow(
                    'Period start date must be before period end date'
                );
            });
        });

        describe('find and findOne', () => {
            it('should add documentType filter to queries', async () => {
                const zerodbService = require('../../../services/zerodbService');
                zerodbService.queryTable.mockResolvedValueOnce({ data: [] });

                await IncomeStatement.find({ companyId: 'company-123' });

                expect(zerodbService.queryTable).toHaveBeenCalled();
                const callArgs = zerodbService.queryTable.mock.calls[0][1];
                expect(callArgs.filter.documentType).toBe('income_statement');
            });
        });
    });

    describe('Currency Support', () => {
        it.each(validCurrencies)('should accept valid currency "%s"', (currency) => {
            const doc = {
                companyId: 'company-123',
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-03-31'),
                periodType: 'QUARTER',
                currency,
                revenueTotal: 1000000,
                cogsTotal: 400000,
                opexTotal: 300000
            };

            IncomeStatement.calculateTotals(doc);
            const result = IncomeStatement.validateIncomeStatement(doc);

            expect(result.isValid).toBe(true);
        });
    });

    describe('Status Workflow', () => {
        it.each(validStatuses)('should accept valid status "%s"', (status) => {
            const doc = {
                companyId: 'company-123',
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-03-31'),
                periodType: 'QUARTER',
                status,
                revenueTotal: 1000000,
                cogsTotal: 400000,
                opexTotal: 300000
            };

            IncomeStatement.calculateTotals(doc);
            const result = IncomeStatement.validateIncomeStatement(doc);

            expect(result.isValid).toBe(true);
        });
    });

    describe('Audit Status', () => {
        it('should handle audited vs unaudited income statements', () => {
            const auditedDoc = {
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-12-31'),
                periodType: 'YEAR',
                isAudited: true,
                auditStatus: 'audited',
                revenueTotal: 10000000,
                cogsTotal: 4000000,
                opexTotal: 3000000
            };

            const unauditedDoc = {
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-03-31'),
                periodType: 'QUARTER',
                isAudited: false,
                auditStatus: 'unaudited',
                revenueTotal: 2500000,
                cogsTotal: 1000000,
                opexTotal: 750000
            };

            IncomeStatement.calculateTotals(auditedDoc);
            IncomeStatement.calculateTotals(unauditedDoc);

            expect(auditedDoc.grossProfit).toBe(6000000);
            expect(unauditedDoc.grossProfit).toBe(1500000);
        });
    });

    describe('Actual vs Estimate', () => {
        it('should handle actual vs estimated income statements', () => {
            const actualDoc = {
                periodStart: new Date('2024-01-01'),
                periodEnd: new Date('2024-03-31'),
                isActual: true,
                revenueTotal: 5000000,
                cogsTotal: 2000000,
                opexTotal: 1500000
            };

            const estimateDoc = {
                periodStart: new Date('2024-04-01'),
                periodEnd: new Date('2024-06-30'),
                isActual: false,
                revenueTotal: 5500000,
                cogsTotal: 2200000,
                opexTotal: 1600000
            };

            IncomeStatement.calculateTotals(actualDoc);
            IncomeStatement.calculateTotals(estimateDoc);

            expect(actualDoc.grossProfit).toBe(3000000);
            expect(estimateDoc.grossProfit).toBe(3300000);
        });
    });
});
