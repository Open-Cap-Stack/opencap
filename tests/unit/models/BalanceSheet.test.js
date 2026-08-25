/**
 * BalanceSheet Model Unit Tests
 *
 * Tests for the BalanceSheet model including creation, validation,
 * calculation methods, ratios, and edge cases.
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

const BalanceSheet = require('../../../models/BalanceSheet');
const zerodbService = require('../../../services/zerodbService');

describe('BalanceSheet Model', () => {
    beforeEach(() => {
        // Reset all mocks including implementations, then set safe defaults
        zerodbService.initialize.mockReset().mockResolvedValue(true);
        zerodbService.insertRow.mockReset().mockResolvedValue({ data: [{ row_id: 'test-row-id', row_data: {} }] });
        zerodbService.queryTable.mockReset().mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockReset().mockResolvedValue({ modified_count: 1 });
        zerodbService.deleteRows.mockReset().mockResolvedValue({ deleted_count: 1 });
        zerodbService.createTable.mockReset().mockResolvedValue({});
        zerodbService.client.put.mockReset().mockResolvedValue({});
    });

    // Helper to build a balanced balance sheet
    function makeBalancedSheet(overrides = {}) {
        return {
            _id: 'bs-1',
            companyId: 'company-1',
            reportingDate: '2025-12-31',
            reportingPeriod: 'Q4 2025',
            preparedBy: 'user-1',
            currentAssets: {
                cash: 100000,
                accountsReceivable: 50000,
                inventory: 30000,
                prepaidExpenses: 10000,
                shortTermInvestments: 0,
                other: 0
            },
            nonCurrentAssets: {
                propertyPlantEquipment: {
                    gross: 200000,
                    accumulatedDepreciation: 50000,
                    net: 0
                },
                intangibleAssets: 20000,
                longTermInvestments: 0,
                deferredTaxAssets: 0,
                other: 0
            },
            currentLiabilities: {
                accountsPayable: 40000,
                shortTermDebt: 20000,
                accruedExpenses: 10000,
                deferredRevenue: 5000,
                currentTaxLiabilities: 5000,
                other: 0
            },
            nonCurrentLiabilities: {
                longTermDebt: 100000,
                deferredTaxLiabilities: 0,
                pensionObligations: 0,
                other: 0
            },
            equity: {
                shareCapital: 50000,
                retainedEarnings: 80000,
                additionalPaidInCapital: 50000,
                treasuryStock: 0,
                accumulatedOtherComprehensiveIncome: 0,
                nonControllingInterest: 0
            },
            ...overrides
        };
    }

    // ------------------------------------------------------------------
    // calculateTotals
    // ------------------------------------------------------------------
    describe('calculateTotals', () => {
        it('should calculate totalCurrentAssets correctly', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            // 100000 + 50000 + 30000 + 10000 + 0 + 0
            expect(doc.totalCurrentAssets).toBe(190000);
        });

        it('should calculate PP&E net and totalNonCurrentAssets correctly', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            // PP&E net = 200000 - 50000 = 150000
            expect(doc.nonCurrentAssets.propertyPlantEquipment.net).toBe(150000);
            // totalNonCurrentAssets = 150000 + 20000 + 0 + 0 + 0
            expect(doc.totalNonCurrentAssets).toBe(170000);
        });

        it('should calculate totalAssets correctly', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            // 190000 + 170000
            expect(doc.totalAssets).toBe(360000);
        });

        it('should calculate totalCurrentLiabilities correctly', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            // 40000 + 20000 + 10000 + 5000 + 5000 + 0
            expect(doc.totalCurrentLiabilities).toBe(80000);
        });

        it('should calculate totalNonCurrentLiabilities correctly', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            expect(doc.totalNonCurrentLiabilities).toBe(100000);
        });

        it('should calculate totalLiabilities correctly', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            // 80000 + 100000
            expect(doc.totalLiabilities).toBe(180000);
        });

        it('should calculate totalEquity correctly (subtracting treasury stock)', () => {
            const doc = makeBalancedSheet({
                equity: {
                    shareCapital: 50000,
                    retainedEarnings: 80000,
                    additionalPaidInCapital: 50000,
                    treasuryStock: 10000,
                    accumulatedOtherComprehensiveIncome: 5000,
                    nonControllingInterest: 5000
                }
            });
            BalanceSheet.calculateTotals(doc);
            // 50000 + 80000 + 50000 + 5000 + 5000 - 10000 = 180000
            expect(doc.totalEquity).toBe(180000);
        });

        it('should calculate totalLiabilitiesAndEquity correctly', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            expect(doc.totalLiabilitiesAndEquity).toBe(doc.totalLiabilities + doc.totalEquity);
        });

        it('should handle missing nested objects gracefully', () => {
            const doc = { _id: 'bs-empty' };
            BalanceSheet.calculateTotals(doc);
            expect(doc.totalCurrentAssets).toBe(0);
            expect(doc.totalNonCurrentAssets).toBe(0);
            expect(doc.totalAssets).toBe(0);
            expect(doc.totalCurrentLiabilities).toBe(0);
            expect(doc.totalNonCurrentLiabilities).toBe(0);
            expect(doc.totalLiabilities).toBe(0);
            expect(doc.totalEquity).toBe(0);
            expect(doc.totalLiabilitiesAndEquity).toBe(0);
        });

        it('should handle partial nested objects', () => {
            const doc = {
                currentAssets: { cash: 5000 },
                nonCurrentAssets: {},
                currentLiabilities: { accountsPayable: 2000 },
                nonCurrentLiabilities: {},
                equity: { shareCapital: 3000 }
            };
            BalanceSheet.calculateTotals(doc);
            expect(doc.totalCurrentAssets).toBe(5000);
            expect(doc.totalCurrentLiabilities).toBe(2000);
            expect(doc.totalEquity).toBe(3000);
        });
    });

    // ------------------------------------------------------------------
    // validateBalance
    // ------------------------------------------------------------------
    describe('validateBalance', () => {
        it('should return true when Assets = Liabilities + Equity', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            expect(BalanceSheet.validateBalance(doc)).toBe(true);
        });

        it('should return true for tiny rounding differences within tolerance', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            // nudge totalAssets by a tiny amount within 0.01 tolerance
            doc.totalAssets += 0.005;
            expect(BalanceSheet.validateBalance(doc)).toBe(true);
        });

        it('should return false when difference exceeds tolerance', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            doc.totalAssets += 1; // off by $1
            expect(BalanceSheet.validateBalance(doc)).toBe(false);
        });
    });

    // ------------------------------------------------------------------
    // calculateRatios
    // ------------------------------------------------------------------
    describe('calculateRatios', () => {
        it('should calculate currentRatio and quickRatio', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            const ratios = BalanceSheet.calculateRatios(doc);

            expect(ratios.currentRatio).toBeCloseTo(190000 / 80000, 4);
            // quickRatio = (190000 - 30000) / 80000
            expect(ratios.quickRatio).toBeCloseTo(160000 / 80000, 4);
        });

        it('should calculate debtToAssetsRatio', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            const ratios = BalanceSheet.calculateRatios(doc);
            expect(ratios.debtToAssetsRatio).toBeCloseTo(180000 / 360000, 4);
        });

        it('should calculate debtToEquityRatio when equity > 0', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            const ratios = BalanceSheet.calculateRatios(doc);
            expect(ratios.debtToEquityRatio).toBeCloseTo(180000 / 180000, 4);
        });

        it('should calculate equityMultiplier when equity > 0', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            const ratios = BalanceSheet.calculateRatios(doc);
            expect(ratios.equityMultiplier).toBeCloseTo(360000 / 180000, 4);
        });

        it('should skip ratios when totalCurrentLiabilities is 0', () => {
            const doc = makeBalancedSheet();
            doc.currentLiabilities = {};
            BalanceSheet.calculateTotals(doc);
            const ratios = BalanceSheet.calculateRatios(doc);
            expect(ratios.currentRatio).toBeUndefined();
            expect(ratios.quickRatio).toBeUndefined();
        });

        it('should skip debtToEquityRatio when equity is 0', () => {
            const doc = makeBalancedSheet();
            doc.equity = {};
            BalanceSheet.calculateTotals(doc);
            const ratios = BalanceSheet.calculateRatios(doc);
            expect(ratios.debtToEquityRatio).toBeUndefined();
        });

        it('should skip leverage ratios when totalAssets is 0', () => {
            const doc = {};
            BalanceSheet.calculateTotals(doc);
            const ratios = BalanceSheet.calculateRatios(doc);
            expect(ratios.debtToAssetsRatio).toBeUndefined();
        });
    });

    // ------------------------------------------------------------------
    // getWorkingCapital
    // ------------------------------------------------------------------
    describe('getWorkingCapital', () => {
        it('should return current assets minus current liabilities', () => {
            const doc = makeBalancedSheet();
            BalanceSheet.calculateTotals(doc);
            expect(BalanceSheet.getWorkingCapital(doc)).toBe(190000 - 80000);
        });

        it('should return negative working capital when liabilities exceed assets', () => {
            const doc = makeBalancedSheet();
            doc.currentLiabilities.shortTermDebt = 200000;
            BalanceSheet.calculateTotals(doc);
            expect(BalanceSheet.getWorkingCapital(doc)).toBeLessThan(0);
        });
    });

    // ------------------------------------------------------------------
    // create
    // ------------------------------------------------------------------
    describe('create', () => {
        it('should calculate totals and call baseModel.create for a balanced sheet', async () => {
            const data = makeBalancedSheet();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'new-row', row_data: { ...data, documentType: 'balance_sheet' } }]
            });

            const result = await BalanceSheet.create(data);
            expect(zerodbService.insertRow).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should set documentType to balance_sheet', async () => {
            const data = makeBalancedSheet();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: { ...data, documentType: 'balance_sheet' } }]
            });

            await BalanceSheet.create(data);
            // The first argument to insertRow is the table name, second is the doc
            const insertedDoc = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedDoc.documentType).toBe('balance_sheet');
        });

        it('should throw when balance sheet does not balance', async () => {
            const data = makeBalancedSheet();
            // Make equity too large so assets != liabilities + equity
            data.equity.shareCapital = 999999;
            await expect(BalanceSheet.create(data)).rejects.toThrow(
                'Balance sheet does not balance'
            );
        });
    });

    // ------------------------------------------------------------------
    // findOneAndUpdate
    // ------------------------------------------------------------------
    describe('findOneAndUpdate', () => {
        it('should recalculate totals when financial data is updated', async () => {
            const existing = makeBalancedSheet();
            BalanceSheet.calculateTotals(existing);

            // Mock findOne to return existing doc, then return updated doc
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await BalanceSheet.findOneAndUpdate(
                { _id: 'bs-1' },
                { $set: { currentAssets: { ...existing.currentAssets, cash: 100000 } } }
            );
            expect(result).toBeDefined();
        });

        it('should throw if update causes imbalance', async () => {
            const existing = makeBalancedSheet();
            BalanceSheet.calculateTotals(existing);

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            await expect(
                BalanceSheet.findOneAndUpdate(
                    { _id: 'bs-1' },
                    { $set: { equity: { shareCapital: 999999 } } }
                )
            ).rejects.toThrow('Balance sheet does not balance');
        });

        it('should pass through updates that do not touch financial data', async () => {
            const existing = makeBalancedSheet();
            BalanceSheet.calculateTotals(existing);

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await BalanceSheet.findOneAndUpdate(
                { _id: 'bs-1' },
                { $set: { status: 'approved' } }
            );
            expect(result).toBeDefined();
        });
    });

    // ------------------------------------------------------------------
    // findByIdWithRatios
    // ------------------------------------------------------------------
    describe('findByIdWithRatios', () => {
        it('should return doc with ratios and working capital', async () => {
            const existing = makeBalancedSheet();
            BalanceSheet.calculateTotals(existing);

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await BalanceSheet.findByIdWithRatios('bs-1');
            expect(result).toBeDefined();
            expect(result.ratios).toBeDefined();
            expect(result.ratios.currentRatio).toBeDefined();
            expect(result.workingCapital).toBeDefined();
        });

        it('should return null when document not found', async () => {
            // findById -> findOne({_id}) -> find({_id}) returns empty
            // -> fallback find({}) also returns empty
            // -> findById fallback find({}) also returns empty
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [] })
                .mockResolvedValueOnce({ data: [] })
                .mockResolvedValueOnce({ data: [] });

            const result = await BalanceSheet.findByIdWithRatios('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // getComparative
    // ------------------------------------------------------------------
    describe('getComparative', () => {
        it('should query with companyId and periods', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            await BalanceSheet.getComparative('company-1', ['Q1 2025', 'Q2 2025']);
            expect(zerodbService.queryTable).toHaveBeenCalled();
            const calledFilter = zerodbService.queryTable.mock.calls[0][1].filter;
            expect(calledFilter.companyId).toBe('company-1');
            expect(calledFilter.documentType).toBe('balance_sheet');
        });
    });

    // ------------------------------------------------------------------
    // getLatest
    // ------------------------------------------------------------------
    describe('getLatest', () => {
        it('should return the first result', async () => {
            const doc = makeBalancedSheet();
            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: doc }]
            });
            const result = await BalanceSheet.getLatest('company-1');
            expect(result).toBeDefined();
        });

        it('should return null when no results', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            const result = await BalanceSheet.getLatest('company-1');
            expect(result).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // find and findOne with documentType injection
    // ------------------------------------------------------------------
    describe('find', () => {
        it('should add documentType to query', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            await BalanceSheet.find({ companyId: 'c1' });
            const calledFilter = zerodbService.queryTable.mock.calls[0][1].filter;
            expect(calledFilter.documentType).toBe('balance_sheet');
        });
    });

    describe('findOne', () => {
        it('should add documentType to query', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            await BalanceSheet.findOne({ companyId: 'c1' });
            const calledFilter = zerodbService.queryTable.mock.calls[0][1].filter;
            expect(calledFilter.documentType).toBe('balance_sheet');
        });
    });
});
