/**
 * FinancialMetrics Model Unit Tests
 *
 * Tests for the FinancialMetrics model including score calculation,
 * red flags, benchmarks, trend analysis, and edge cases.
 */

// Mock the ZeroDB service before requiring the model
jest.mock('../../../services/zerodbService', () => ({
    initialize: jest.fn().mockResolvedValue(true),
    insertRow: jest.fn().mockResolvedValue({ data: [{ row_id: 'test-row-id', row_data: {} }] }),
    queryTable: jest.fn().mockResolvedValue({ data: [] }),
    updateRows: jest.fn().mockResolvedValue({ modified_count: 1 }),
    deleteRows: jest.fn().mockResolvedValue({ deleted_count: 1 }),
    createTable: jest.fn().mockResolvedValue({}),
    client: { put: jest.fn().mockResolvedValue({}) },
    projectId: 'test-project'
}));

const FinancialMetrics = require('../../../models/FinancialMetrics');
const zerodbService = require('../../../services/zerodbService');

describe('FinancialMetrics Model', () => {
    beforeEach(() => {
        zerodbService.initialize.mockReset().mockResolvedValue(true);
        zerodbService.insertRow.mockReset().mockResolvedValue({ data: [{ row_id: 'test-row-id', row_data: {} }] });
        zerodbService.queryTable.mockReset().mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockReset().mockResolvedValue({ modified_count: 1 });
        zerodbService.deleteRows.mockReset().mockResolvedValue({ deleted_count: 1 });
        zerodbService.createTable.mockReset().mockResolvedValue({});
        zerodbService.client.put.mockReset().mockResolvedValue({});
    });

    function makeMetrics(overrides = {}) {
        return {
            _id: 'fm-1',
            companyId: 'company-1',
            reportingPeriod: 'Q4 2025',
            reportingDate: '2025-12-31',
            calculatedBy: 'user-1',
            liquidityRatios: {
                currentRatio: 2.0,
                quickRatio: 1.5,
                cashRatio: 0.8,
                workingCapital: 50000,
                operatingCashFlowRatio: 0.3
            },
            profitabilityRatios: {
                grossProfitMargin: 0.6,
                operatingProfitMargin: 0.2,
                netProfitMargin: 0.12,
                returnOnAssets: 0.10,
                returnOnEquity: 0.18
            },
            leverageRatios: {
                debtToAssets: 0.4,
                debtToEquity: 0.8,
                equityMultiplier: 1.8,
                timesInterestEarned: 4.0
            },
            cashFlowMetrics: {
                operatingCashFlow: 80000,
                freeCashFlow: 50000
            },
            ...overrides
        };
    }

    // ------------------------------------------------------------------
    // calculateScores
    // ------------------------------------------------------------------
    describe('calculateScores', () => {
        it('should calculate liquidityScore based on current and quick ratios', () => {
            const doc = makeMetrics();
            FinancialMetrics.calculateScores(doc);
            // currentRatio 2.0 in [1.5,3.0] -> 35
            // quickRatio 1.5 in [1.0,2.0] -> 35
            // operatingCashFlowRatio 0.3 >= 0.2 -> 20
            expect(doc.liquidityScore).toBe(90);
        });

        it('should calculate profitabilityScore', () => {
            const doc = makeMetrics();
            FinancialMetrics.calculateScores(doc);
            // netProfitMargin 0.12 >= 0.10 -> 25
            // returnOnAssets 0.10 >= 0.10 -> 20
            // returnOnEquity 0.18 >= 0.15 -> 25
            expect(doc.profitabilityScore).toBe(70);
        });

        it('should calculate leverageScore', () => {
            const doc = makeMetrics();
            FinancialMetrics.calculateScores(doc);
            // debtToAssets 0.4 <= 0.5 -> 30
            // debtToEquity 0.8 <= 1.0 -> 20
            // timesInterestEarned 4.0 >= 3.0 -> 20
            expect(doc.leverageScore).toBe(70);
        });

        it('should calculate financialStrengthScore as weighted average', () => {
            const doc = makeMetrics();
            FinancialMetrics.calculateScores(doc);
            const expected = Math.round(
                (doc.liquidityScore * 0.3) +
                (doc.profitabilityScore * 0.4) +
                (doc.leverageScore * 0.3)
            );
            expect(doc.financialStrengthScore).toBe(expected);
        });

        it('should cap scores at 100', () => {
            const doc = makeMetrics({
                liquidityRatios: {
                    currentRatio: 2.0,
                    quickRatio: 1.5,
                    operatingCashFlowRatio: 0.5
                }
            });
            FinancialMetrics.calculateScores(doc);
            // 35 + 35 + 30 = 100
            expect(doc.liquidityScore).toBeLessThanOrEqual(100);
        });

        it('should handle zero scores when no ratios provided', () => {
            const doc = { _id: 'fm-empty' };
            FinancialMetrics.calculateScores(doc);
            expect(doc.liquidityScore).toBe(0);
            expect(doc.profitabilityScore).toBe(0);
            expect(doc.leverageScore).toBe(0);
            expect(doc.financialStrengthScore).toBe(0);
        });

        it('should score low currentRatio correctly', () => {
            const doc = makeMetrics({
                liquidityRatios: {
                    currentRatio: 0.9,
                    quickRatio: 0.6,
                    operatingCashFlowRatio: 0.05
                }
            });
            FinancialMetrics.calculateScores(doc);
            // currentRatio 0.9 >= 0.8 -> 10
            // quickRatio 0.6 >= 0.5 -> 10
            // operatingCashFlowRatio 0.05 < 0.1 -> 0
            expect(doc.liquidityScore).toBe(20);
        });

        it('should score excellent profitability correctly', () => {
            const doc = makeMetrics({
                profitabilityRatios: {
                    netProfitMargin: 0.25,
                    returnOnAssets: 0.20,
                    returnOnEquity: 0.30
                }
            });
            FinancialMetrics.calculateScores(doc);
            // netProfitMargin 0.25 >= 0.15 -> 35
            // returnOnAssets 0.20 >= 0.15 -> 30
            // returnOnEquity 0.30 >= 0.20 -> 35
            expect(doc.profitabilityScore).toBe(100);
        });

        it('should score lowest leverage tiers', () => {
            const doc = makeMetrics({
                leverageRatios: {
                    debtToAssets: 0.95,
                    debtToEquity: 4.0,
                    timesInterestEarned: 1.0
                }
            });
            FinancialMetrics.calculateScores(doc);
            // debtToAssets 0.95 > 0.9 -> 0
            // debtToEquity 4.0 > 3.0 -> 0
            // timesInterestEarned 1.0 < 1.5 -> 0
            expect(doc.leverageScore).toBe(0);
        });
    });

    // ------------------------------------------------------------------
    // getIndustryBenchmarks
    // ------------------------------------------------------------------
    describe('getIndustryBenchmarks', () => {
        it('should return benchmark object with expected keys', () => {
            const benchmarks = FinancialMetrics.getIndustryBenchmarks('tech');
            expect(benchmarks.currentRatio).toBeDefined();
            expect(benchmarks.currentRatio.median).toBe(2.0);
            expect(benchmarks.quickRatio).toBeDefined();
            expect(benchmarks.debtToEquity).toBeDefined();
            expect(benchmarks.netProfitMargin).toBeDefined();
            expect(benchmarks.returnOnAssets).toBeDefined();
            expect(benchmarks.returnOnEquity).toBeDefined();
        });

        it('should return same benchmarks regardless of industry (placeholder)', () => {
            const a = FinancialMetrics.getIndustryBenchmarks('tech');
            const b = FinancialMetrics.getIndustryBenchmarks('healthcare');
            expect(a).toEqual(b);
        });
    });

    // ------------------------------------------------------------------
    // calculatePercentile
    // ------------------------------------------------------------------
    describe('calculatePercentile', () => {
        const benchmark = { q1: 1.0, median: 2.0, q3: 3.0 };

        it('should return 75 for values >= q3', () => {
            expect(FinancialMetrics.calculatePercentile(3.0, benchmark)).toBe(75);
            expect(FinancialMetrics.calculatePercentile(5.0, benchmark)).toBe(75);
        });

        it('should return 50 for values >= median but < q3', () => {
            expect(FinancialMetrics.calculatePercentile(2.0, benchmark)).toBe(50);
            expect(FinancialMetrics.calculatePercentile(2.5, benchmark)).toBe(50);
        });

        it('should return 25 for values >= q1 but < median', () => {
            expect(FinancialMetrics.calculatePercentile(1.0, benchmark)).toBe(25);
            expect(FinancialMetrics.calculatePercentile(1.5, benchmark)).toBe(25);
        });

        it('should return 10 for values < q1', () => {
            expect(FinancialMetrics.calculatePercentile(0.5, benchmark)).toBe(10);
        });
    });

    // ------------------------------------------------------------------
    // compareToBenchmarks
    // ------------------------------------------------------------------
    describe('compareToBenchmarks', () => {
        it('should compare currentRatio to benchmark', () => {
            const doc = makeMetrics();
            const benchmarks = FinancialMetrics.getIndustryBenchmarks();
            const comparison = FinancialMetrics.compareToBenchmarks(doc, benchmarks);
            expect(comparison.currentRatio).toBeDefined();
            expect(comparison.currentRatio.value).toBe(2.0);
            expect(comparison.currentRatio.percentile).toBe(50);
            expect(comparison.currentRatio.status).toBe('above');
        });

        it('should mark status as below when value < median', () => {
            const doc = makeMetrics({
                liquidityRatios: { currentRatio: 1.0 }
            });
            const benchmarks = FinancialMetrics.getIndustryBenchmarks();
            const comparison = FinancialMetrics.compareToBenchmarks(doc, benchmarks);
            expect(comparison.currentRatio.status).toBe('below');
        });

        it('should handle missing liquidityRatios', () => {
            const doc = makeMetrics({ liquidityRatios: undefined });
            const benchmarks = FinancialMetrics.getIndustryBenchmarks();
            const comparison = FinancialMetrics.compareToBenchmarks(doc, benchmarks);
            expect(comparison.currentRatio).toBeUndefined();
        });
    });

    // ------------------------------------------------------------------
    // identifyRedFlags
    // ------------------------------------------------------------------
    describe('identifyRedFlags', () => {
        it('should return empty array for healthy metrics', () => {
            const doc = makeMetrics();
            const flags = FinancialMetrics.identifyRedFlags(doc);
            expect(flags).toEqual([]);
        });

        it('should flag low current ratio', () => {
            const doc = makeMetrics({
                liquidityRatios: { currentRatio: 0.8 }
            });
            const flags = FinancialMetrics.identifyRedFlags(doc);
            expect(flags).toContain('Current ratio below 1.0 indicates potential liquidity issues');
        });

        it('should flag high debt-to-equity', () => {
            const doc = makeMetrics({
                leverageRatios: { debtToEquity: 3.0 }
            });
            const flags = FinancialMetrics.identifyRedFlags(doc);
            expect(flags).toContain('High debt-to-equity ratio indicates high financial leverage');
        });

        it('should flag negative profit margin', () => {
            const doc = makeMetrics({
                profitabilityRatios: { netProfitMargin: -0.05 }
            });
            const flags = FinancialMetrics.identifyRedFlags(doc);
            expect(flags).toContain('Negative profit margin indicates losses');
        });

        it('should flag negative free cash flow', () => {
            const doc = makeMetrics({
                cashFlowMetrics: { freeCashFlow: -10000 }
            });
            const flags = FinancialMetrics.identifyRedFlags(doc);
            expect(flags).toContain('Negative free cash flow indicates cash generation issues');
        });

        it('should flag low interest coverage', () => {
            const doc = makeMetrics({
                leverageRatios: { timesInterestEarned: 1.5 }
            });
            const flags = FinancialMetrics.identifyRedFlags(doc);
            expect(flags).toContain('Low interest coverage ratio indicates difficulty servicing debt');
        });

        it('should return multiple flags when multiple issues exist', () => {
            const doc = makeMetrics({
                liquidityRatios: { currentRatio: 0.5 },
                leverageRatios: { debtToEquity: 5.0, timesInterestEarned: 1.0 },
                profitabilityRatios: { netProfitMargin: -0.1 },
                cashFlowMetrics: { freeCashFlow: -5000 }
            });
            const flags = FinancialMetrics.identifyRedFlags(doc);
            expect(flags.length).toBe(5);
        });
    });

    // ------------------------------------------------------------------
    // create
    // ------------------------------------------------------------------
    describe('create', () => {
        it('should set documentType and calculate scores', async () => {
            const data = makeMetrics();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: { ...data, documentType: 'financial_metrics' } }]
            });

            await FinancialMetrics.create(data);
            const insertedDoc = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedDoc.documentType).toBe('financial_metrics');
            expect(insertedDoc.financialStrengthScore).toBeDefined();
        });

        it('should set calculatedAt if not provided', async () => {
            const data = makeMetrics();
            delete data.calculatedAt;
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await FinancialMetrics.create(data);
            const insertedDoc = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedDoc.calculatedAt).toBeDefined();
        });
    });

    // ------------------------------------------------------------------
    // findOneAndUpdate
    // ------------------------------------------------------------------
    describe('findOneAndUpdate', () => {
        it('should recalculate scores when ratio data is updated', async () => {
            const existing = makeMetrics();
            FinancialMetrics.calculateScores(existing);

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await FinancialMetrics.findOneAndUpdate(
                { _id: 'fm-1' },
                { $set: { liquidityRatios: { currentRatio: 3.0 } } }
            );
            expect(result).toBeDefined();
        });

        it('should skip recalculation for non-ratio updates', async () => {
            const existing = makeMetrics();

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await FinancialMetrics.findOneAndUpdate(
                { _id: 'fm-1' },
                { $set: { status: 'approved' } }
            );
            expect(result).toBeDefined();
        });
    });

    // ------------------------------------------------------------------
    // findByIdWithAnalysis
    // ------------------------------------------------------------------
    describe('findByIdWithAnalysis', () => {
        it('should return doc with redFlags, benchmarkComparison, and benchmarks', async () => {
            const existing = makeMetrics();

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await FinancialMetrics.findByIdWithAnalysis('fm-1');
            expect(result).toBeDefined();
            expect(result.redFlags).toBeDefined();
            expect(Array.isArray(result.redFlags)).toBe(true);
            expect(result.benchmarkComparison).toBeDefined();
            expect(result.benchmarks).toBeDefined();
        });

        it('should return null when not found', async () => {
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [] })
                .mockResolvedValueOnce({ data: [] })
                .mockResolvedValueOnce({ data: [] });
            const result = await FinancialMetrics.findByIdWithAnalysis('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // getHistory
    // ------------------------------------------------------------------
    describe('getHistory', () => {
        it('should query with companyId and default limit', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            const result = await FinancialMetrics.getHistory('c1');
            expect(zerodbService.queryTable).toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should accept custom periods count', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            await FinancialMetrics.getHistory('c1', 4);
            const opts = zerodbService.queryTable.mock.calls[0][1];
            expect(opts.limit).toBe(4);
        });
    });

    // ------------------------------------------------------------------
    // getTrendAnalysis
    // ------------------------------------------------------------------
    describe('getTrendAnalysis', () => {
        it('should return null when fewer than 2 metrics', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: makeMetrics() }]
            });
            const result = await FinancialMetrics.getTrendAnalysis('c1', 'liquidityRatios.currentRatio');
            expect(result).toBeNull();
        });

        it('should calculate increasing trend', async () => {
            const m1 = makeMetrics({ reportingDate: '2025-03-31', liquidityRatios: { currentRatio: 1.5 } });
            const m2 = makeMetrics({ reportingDate: '2025-06-30', liquidityRatios: { currentRatio: 2.0 } });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r2', row_data: m2 },
                    { row_id: 'r1', row_data: m1 }
                ]
            });
            const result = await FinancialMetrics.getTrendAnalysis('c1', 'liquidityRatios.currentRatio');
            expect(result).toBeDefined();
            expect(result.trend).toBe('increasing');
            expect(result.growthRate).toBeCloseTo((2.0 - 1.5) / 1.5, 4);
        });

        it('should calculate decreasing trend', async () => {
            const m1 = makeMetrics({ reportingDate: '2025-03-31', liquidityRatios: { currentRatio: 3.0 } });
            const m2 = makeMetrics({ reportingDate: '2025-06-30', liquidityRatios: { currentRatio: 2.0 } });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r2', row_data: m2 },
                    { row_id: 'r1', row_data: m1 }
                ]
            });
            const result = await FinancialMetrics.getTrendAnalysis('c1', 'liquidityRatios.currentRatio');
            expect(result.trend).toBe('decreasing');
        });

        it('should calculate stable trend', async () => {
            const m1 = makeMetrics({ reportingDate: '2025-03-31', liquidityRatios: { currentRatio: 2.0 } });
            const m2 = makeMetrics({ reportingDate: '2025-06-30', liquidityRatios: { currentRatio: 2.05 } });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r2', row_data: m2 },
                    { row_id: 'r1', row_data: m1 }
                ]
            });
            const result = await FinancialMetrics.getTrendAnalysis('c1', 'liquidityRatios.currentRatio');
            expect(result.trend).toBe('stable');
        });

        it('should return null when metric path does not exist', async () => {
            const m1 = makeMetrics({ reportingDate: '2025-03-31' });
            const m2 = makeMetrics({ reportingDate: '2025-06-30' });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r2', row_data: m2 },
                    { row_id: 'r1', row_data: m1 }
                ]
            });
            const result = await FinancialMetrics.getTrendAnalysis('c1', 'nonexistent.path');
            expect(result).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // find and findOne with documentType injection
    // ------------------------------------------------------------------
    describe('find', () => {
        it('should add documentType to query', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            await FinancialMetrics.find({ companyId: 'c1' });
            const calledFilter = zerodbService.queryTable.mock.calls[0][1].filter;
            expect(calledFilter.documentType).toBe('financial_metrics');
        });
    });

    describe('findOne', () => {
        it('should add documentType to query', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            await FinancialMetrics.findOne({ companyId: 'c1' });
            const calledFilter = zerodbService.queryTable.mock.calls[0][1].filter;
            expect(calledFilter.documentType).toBe('financial_metrics');
        });
    });
});
