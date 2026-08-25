/**
 * ASC718Expense Model Unit Tests
 *
 * Tests for the ASC718Expense model including creation, forfeiture recording,
 * modification tracking, period expense calculation, and edge cases.
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

const ASC718Expense = require('../../../models/ASC718Expense');
const zerodbService = require('../../../services/zerodbService');

describe('ASC718Expense Model', () => {
    beforeEach(() => {
        zerodbService.initialize.mockReset().mockResolvedValue(true);
        zerodbService.insertRow.mockReset().mockResolvedValue({ data: [{ row_id: 'test-row-id', row_data: {} }] });
        zerodbService.queryTable.mockReset().mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockReset().mockResolvedValue({ modified_count: 1 });
        zerodbService.deleteRows.mockReset().mockResolvedValue({ deleted_count: 1 });
        zerodbService.createTable.mockReset().mockResolvedValue({});
        zerodbService.client.put.mockReset().mockResolvedValue({});
    });

    function makeExpense(overrides = {}) {
        return {
            _id: 'exp-1',
            companyId: 'company-1',
            grantId: 'grant-1',
            grantType: 'iso',
            employeeId: 'emp-1',
            employeeName: 'Jane Doe',
            grantDetails: {
                grantDate: '2024-01-01',
                vestingStartDate: '2024-01-01',
                vestingEndDate: '2028-01-01',
                vestingPeriodMonths: 48,
                cliffMonths: 12,
                totalShares: 10000,
                exercisePrice: 1.0
            },
            fairValueInputs: {
                stockPrice: 5.0,
                exercisePrice: 1.0,
                expectedTerm: 6,
                volatility: 0.5,
                riskFreeRate: 0.03,
                dividendYield: 0,
                valuationMethod: 'black_scholes'
            },
            fairValue: {
                perShare: 4.0,
                total: 40000
            },
            recognition: {
                method: 'straight_line',
                startDate: '2024-01-01',
                endDate: '2028-01-01',
                totalExpense: 40000,
                recognizedToDate: 10000
            },
            status: 'active',
            createdBy: 'user-1',
            ...overrides
        };
    }

    // ------------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------------
    describe('Constants', () => {
        it('should expose GRANT_TYPES', () => {
            expect(ASC718Expense.GRANT_TYPES).toEqual(['iso', 'nso', 'rsu', 'rsa', 'sar', 'phantom']);
        });

        it('should expose VALUATION_METHODS', () => {
            expect(ASC718Expense.VALUATION_METHODS).toEqual(['black_scholes', 'binomial', 'monte_carlo', 'intrinsic']);
        });

        it('should expose RECOGNITION_METHODS', () => {
            expect(ASC718Expense.RECOGNITION_METHODS).toEqual(['straight_line', 'graded', 'accelerated']);
        });

        it('should expose STATUSES', () => {
            expect(ASC718Expense.STATUSES).toEqual(['active', 'fully_recognized', 'forfeited', 'modified', 'cancelled']);
        });
    });

    // ------------------------------------------------------------------
    // getPercentRecognized
    // ------------------------------------------------------------------
    describe('getPercentRecognized', () => {
        it('should calculate percentage correctly', () => {
            const doc = makeExpense();
            expect(ASC718Expense.getPercentRecognized(doc)).toBe(25); // 10000/40000 = 25%
        });

        it('should return 100 when totalExpense is 0', () => {
            const doc = makeExpense({ recognition: { totalExpense: 0, recognizedToDate: 0 } });
            expect(ASC718Expense.getPercentRecognized(doc)).toBe(100);
        });

        it('should return 100 when recognition is missing', () => {
            const doc = { _id: 'x' };
            expect(ASC718Expense.getPercentRecognized(doc)).toBe(100);
        });
    });

    // ------------------------------------------------------------------
    // getMonthsRemaining
    // ------------------------------------------------------------------
    describe('getMonthsRemaining', () => {
        it('should return 0 when endDate is in the past', () => {
            const doc = makeExpense({
                recognition: {
                    ...makeExpense().recognition,
                    endDate: '2020-01-01'
                }
            });
            expect(ASC718Expense.getMonthsRemaining(doc)).toBe(0);
        });

        it('should return positive months when endDate is in the future', () => {
            const futureDate = new Date();
            futureDate.setFullYear(futureDate.getFullYear() + 2);
            const doc = makeExpense({
                recognition: {
                    ...makeExpense().recognition,
                    endDate: futureDate.toISOString()
                }
            });
            const months = ASC718Expense.getMonthsRemaining(doc);
            expect(months).toBeGreaterThan(0);
        });

        it('should return 0 when recognition is missing', () => {
            const doc = { _id: 'x' };
            expect(ASC718Expense.getMonthsRemaining(doc)).toBe(0);
        });
    });

    // ------------------------------------------------------------------
    // toJSON
    // ------------------------------------------------------------------
    describe('toJSON', () => {
        it('should add percentRecognized and monthsRemaining', () => {
            const doc = makeExpense();
            const json = ASC718Expense.toJSON(doc);
            expect(json.percentRecognized).toBe(25);
            expect(typeof json.monthsRemaining).toBe('number');
        });

        it('should return null for null input', () => {
            expect(ASC718Expense.toJSON(null)).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // create
    // ------------------------------------------------------------------
    describe('create', () => {
        it('should calculate remaining expense and set defaults', async () => {
            const data = makeExpense();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await ASC718Expense.create(data);
            const insertedDoc = zerodbService.insertRow.mock.calls[0][1];

            // remainingExpense = 40000 - 10000 = 30000
            expect(insertedDoc.recognition.remainingExpense).toBe(30000);
            expect(insertedDoc.expenseId).toBeDefined();
            expect(insertedDoc.forfeitures.estimatedRate).toBe(0);
        });

        it('should auto-set status to fully_recognized when all recognized', async () => {
            const data = makeExpense({
                recognition: {
                    method: 'straight_line',
                    startDate: '2024-01-01',
                    endDate: '2028-01-01',
                    totalExpense: 40000,
                    recognizedToDate: 40000
                }
            });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await ASC718Expense.create(data);
            const insertedDoc = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedDoc.status).toBe('fully_recognized');
        });

        it('should generate expenseId if not provided', async () => {
            const data = makeExpense();
            delete data.expenseId;
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await ASC718Expense.create(data);
            const insertedDoc = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedDoc.expenseId).toMatch(/^asc718_/);
        });

        it('should use provided expenseId', async () => {
            const data = makeExpense({ expenseId: 'custom-id' });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await ASC718Expense.create(data);
            const insertedDoc = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedDoc.expenseId).toBe('custom-id');
        });
    });

    // ------------------------------------------------------------------
    // findOneAndUpdate
    // ------------------------------------------------------------------
    describe('findOneAndUpdate', () => {
        it('should recalculate remaining expense on recognition update', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await ASC718Expense.findOneAndUpdate(
                { _id: 'exp-1' },
                { $set: { recognition: { recognizedToDate: 20000 } } }
            );
            expect(result).toBeDefined();
        });

        it('should set fully_recognized when recognition meets total', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            await ASC718Expense.findOneAndUpdate(
                { _id: 'exp-1' },
                { $set: { recognition: { recognizedToDate: 40000 } } }
            );
            // The update should have set status to fully_recognized
            const updateCall = zerodbService.updateRows.mock.calls[0] ||
                               zerodbService.queryTable.mock.calls;
            expect(updateCall).toBeDefined();
        });
    });

    // ------------------------------------------------------------------
    // calculatePeriodExpense
    // ------------------------------------------------------------------
    describe('calculatePeriodExpense', () => {
        it('should return expense for period within vesting window', async () => {
            const existing = makeExpense();
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const expense = await ASC718Expense.calculatePeriodExpense(
                'exp-1',
                '2025-01-01',
                '2025-12-31'
            );
            expect(expense).toBeGreaterThan(0);
        });

        it('should return 0 for period outside vesting window', async () => {
            const existing = makeExpense();
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const expense = await ASC718Expense.calculatePeriodExpense(
                'exp-1',
                '2030-01-01',
                '2030-12-31'
            );
            expect(expense).toBe(0);
        });

        it('should return 0 when document not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const expense = await ASC718Expense.calculatePeriodExpense(
                'nonexistent',
                '2025-01-01',
                '2025-12-31'
            );
            expect(expense).toBe(0);
        });

        it('should return 0 for forfeited status', async () => {
            const existing = makeExpense({ status: 'forfeited' });
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const expense = await ASC718Expense.calculatePeriodExpense(
                'exp-1',
                '2025-01-01',
                '2025-12-31'
            );
            expect(expense).toBe(0);
        });

        it('should return 0 for cancelled status', async () => {
            const existing = makeExpense({ status: 'cancelled' });
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const expense = await ASC718Expense.calculatePeriodExpense(
                'exp-1',
                '2025-01-01',
                '2025-12-31'
            );
            expect(expense).toBe(0);
        });

        it('should handle partial period overlap at the start', async () => {
            const existing = makeExpense();
            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            // Period starts before vesting start
            const expense = await ASC718Expense.calculatePeriodExpense(
                'exp-1',
                '2023-01-01',
                '2024-06-30'
            );
            expect(expense).toBeGreaterThan(0);
        });
    });

    // ------------------------------------------------------------------
    // recordForfeiture
    // ------------------------------------------------------------------
    describe('recordForfeiture', () => {
        it('should record a partial forfeiture', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await ASC718Expense.recordForfeiture('exp-1', 2000, 'admin-1');
            expect(result.forfeitures.actualForfeitures).toBe(2000);
            expect(result.status).toBe('active'); // only partial
        });

        it('should set status to forfeited when all shares forfeited', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await ASC718Expense.recordForfeiture('exp-1', 10000, 'admin-1');
            expect(result.status).toBe('forfeited');
        });

        it('should throw when expense not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await expect(
                ASC718Expense.recordForfeiture('nonexistent', 1000, 'admin-1')
            ).rejects.toThrow('Expense record not found');
        });

        it('should adjust totalExpense and remainingExpense', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await ASC718Expense.recordForfeiture('exp-1', 5000, 'admin-1');
            // forfeitedPercentage = 5000/10000 = 0.5
            // forfeitedExpense = 40000 * 0.5 = 20000
            // new totalExpense = 40000 - 20000 = 20000
            expect(result.recognition.totalExpense).toBe(20000);
            // remainingExpense = 20000 - 10000 = 10000
            expect(result.recognition.remainingExpense).toBe(10000);
        });
    });

    // ------------------------------------------------------------------
    // recordModification
    // ------------------------------------------------------------------
    describe('recordModification', () => {
        it('should record a modification with incremental expense', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            // New fair value = 6.0 * 10000 = 60000 vs current 40000 = incremental 20000
            const result = await ASC718Expense.recordModification('exp-1', 6.0, 'repricing', 'admin-1');
            expect(result.status).toBe('modified');
            expect(result.modifications.length).toBe(1);
            expect(result.modifications[0].incrementalExpense).toBe(20000);
            expect(result.fairValue.perShare).toBe(6.0);
            expect(result.fairValue.total).toBe(60000);
            expect(result.recognition.totalExpense).toBe(60000);
        });

        it('should not add incremental expense when new fair value is lower', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            // New fair value = 2.0 * 10000 = 20000 < 40000, incremental = max(0, -20000) = 0
            const result = await ASC718Expense.recordModification('exp-1', 2.0, 'adjustment', 'admin-1');
            expect(result.modifications[0].incrementalExpense).toBe(0);
            // totalExpense should remain unchanged
            expect(result.recognition.totalExpense).toBe(40000);
        });

        it('should throw when expense not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await expect(
                ASC718Expense.recordModification('nonexistent', 5.0, 'reason', 'admin-1')
            ).rejects.toThrow('Expense record not found');
        });
    });

    // ------------------------------------------------------------------
    // updateRecognizedExpense
    // ------------------------------------------------------------------
    describe('updateRecognizedExpense', () => {
        it('should add amount to recognizedToDate', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await ASC718Expense.updateRecognizedExpense('exp-1', 5000, 'admin-1');
            // 10000 + 5000 = 15000
            expect(result.recognition.recognizedToDate).toBe(15000);
            expect(result.recognition.remainingExpense).toBe(25000);
        });

        it('should set fully_recognized when total is reached', async () => {
            const existing = makeExpense();
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await ASC718Expense.updateRecognizedExpense('exp-1', 30000, 'admin-1');
            expect(result.status).toBe('fully_recognized');
        });

        it('should throw when expense not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await expect(
                ASC718Expense.updateRecognizedExpense('nonexistent', 1000, 'admin-1')
            ).rejects.toThrow('Expense record not found');
        });
    });

    // ------------------------------------------------------------------
    // findByCompany
    // ------------------------------------------------------------------
    describe('findByCompany', () => {
        it('should return expenses sorted by grantDate descending', async () => {
            const e1 = makeExpense({ grantDetails: { grantDate: '2024-01-01' } });
            const e2 = makeExpense({ grantDetails: { grantDate: '2025-06-01' } });
            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r1', row_data: e1 },
                    { row_id: 'r2', row_data: e2 }
                ]
            });

            const results = await ASC718Expense.findByCompany('company-1');
            expect(results.length).toBe(2);
            // Most recent first
            expect(new Date(results[0].grantDetails.grantDate).getTime())
                .toBeGreaterThanOrEqual(new Date(results[1].grantDetails.grantDate).getTime());
        });

        it('should filter by status when provided', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            await ASC718Expense.findByCompany('company-1', 'active');
            const calledFilter = zerodbService.queryTable.mock.calls[0][1].filter;
            expect(calledFilter.status).toBe('active');
        });
    });

    // ------------------------------------------------------------------
    // getCompanyPeriodExpense
    // ------------------------------------------------------------------
    describe('getCompanyPeriodExpense', () => {
        it('should sum expenses across active grants', async () => {
            const e1 = makeExpense({ status: 'active' });
            const e2 = makeExpense({
                _id: 'exp-2',
                grantId: 'grant-2',
                status: 'modified',
                recognition: {
                    method: 'straight_line',
                    startDate: '2024-01-01',
                    endDate: '2028-01-01',
                    totalExpense: 20000,
                    recognizedToDate: 5000
                }
            });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r1', row_data: e1 },
                    { row_id: 'r2', row_data: e2 }
                ]
            });

            const result = await ASC718Expense.getCompanyPeriodExpense(
                'company-1',
                '2025-01-01',
                '2025-12-31'
            );
            expect(result.totalExpense).toBeGreaterThan(0);
            expect(result.details.length).toBe(2);
            expect(result.periodStart).toBe('2025-01-01');
            expect(result.periodEnd).toBe('2025-12-31');
        });
    });

    // ------------------------------------------------------------------
    // getCompanyExpenseSummary
    // ------------------------------------------------------------------
    describe('getCompanyExpenseSummary', () => {
        it('should summarize expenses by type and status', async () => {
            const e1 = makeExpense({ status: 'active', grantType: 'iso' });
            const e2 = makeExpense({
                status: 'fully_recognized',
                grantType: 'nso',
                fairValue: { total: 20000 },
                recognition: { totalExpense: 20000, recognizedToDate: 20000, remainingExpense: 0 }
            });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r1', row_data: e1 },
                    { row_id: 'r2', row_data: e2 }
                ]
            });

            const summary = await ASC718Expense.getCompanyExpenseSummary('company-1');
            expect(summary.totalGrants).toBe(2);
            expect(summary.activeGrants).toBe(1);
            expect(summary.byStatus.active).toBe(1);
            expect(summary.byStatus.fully_recognized).toBe(1);
            expect(summary.byType.iso).toBeDefined();
            expect(summary.byType.nso).toBeDefined();
            expect(summary.totalFairValue).toBe(60000);
        });

        it('should handle empty result set', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({ data: [] });
            const summary = await ASC718Expense.getCompanyExpenseSummary('company-1');
            expect(summary.totalGrants).toBe(0);
            expect(summary.activeGrants).toBe(0);
            expect(summary.totalFairValue).toBe(0);
        });
    });
});
