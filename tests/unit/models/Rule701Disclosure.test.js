/**
 * Rule701Disclosure Model Unit Tests
 *
 * Tests for the Rule701Disclosure model including threshold calculations,
 * compliance determination, disclosure requirements, grant handling, and edge cases.
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

const Rule701Disclosure = require('../../../models/Rule701Disclosure');
const zerodbService = require('../../../services/zerodbService');

describe('Rule701Disclosure Model', () => {
    beforeEach(() => {
        zerodbService.initialize.mockReset().mockResolvedValue(true);
        zerodbService.insertRow.mockReset().mockResolvedValue({ data: [{ row_id: 'test-row-id', row_data: {} }] });
        zerodbService.queryTable.mockReset().mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockReset().mockResolvedValue({ modified_count: 1 });
        zerodbService.deleteRows.mockReset().mockResolvedValue({ deleted_count: 1 });
        zerodbService.createTable.mockReset().mockResolvedValue({});
        zerodbService.client.put.mockReset().mockResolvedValue({});
    });

    function makeDisclosure(overrides = {}) {
        return {
            _id: 'rd-1',
            companyId: 'company-1',
            periodType: 'rolling_12_month',
            periodStart: '2025-01-01',
            periodEnd: '2025-12-31',
            companyFinancials: {
                totalAssets: 10000000,
                annualRevenue: 5000000,
                outstandingSecurities: {
                    commonShares: 1000000,
                    preferredShares: 200000,
                    optionsOutstanding: 150000,
                    warrantsOutstanding: 50000
                }
            },
            aggregateSales: {
                totalSales: 800000,
                stockOptions: 500000,
                restrictedStock: 200000,
                rsus: 100000,
                espp: 0,
                other: 0
            },
            createdBy: 'user-1',
            ...overrides
        };
    }

    // ------------------------------------------------------------------
    // Constants
    // ------------------------------------------------------------------
    describe('Constants', () => {
        it('should expose PERIOD_TYPES', () => {
            expect(Rule701Disclosure.PERIOD_TYPES).toEqual(['annual', 'quarterly', 'rolling_12_month']);
        });

        it('should expose DISCLOSURE_LEVELS', () => {
            expect(Rule701Disclosure.DISCLOSURE_LEVELS).toEqual(['none', 'basic', 'enhanced']);
        });

        it('should expose STATUSES', () => {
            expect(Rule701Disclosure.STATUSES).toEqual(['draft', 'pending_review', 'approved', 'filed', 'archived']);
        });

        it('should expose RECIPIENT_TYPES', () => {
            expect(Rule701Disclosure.RECIPIENT_TYPES).toEqual(['employee', 'director', 'consultant']);
        });
    });

    // ------------------------------------------------------------------
    // Threshold calculations (internal function tested via create)
    // ------------------------------------------------------------------
    describe('threshold calculations', () => {
        it('should calculate asset-based threshold as 15% of totalAssets', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            // 15% of 10M = 1.5M
            expect(inserted.thresholds.assetBased).toBe(1500000);
        });

        it('should calculate security-based threshold as 15% of total securities', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            // 15% of (1000000 + 200000) = 180000
            expect(inserted.thresholds.securityBased).toBe(180000);
        });

        it('should use the maximum of basic, asset-based, and security-based', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            // max(1000000, 1500000, 180000) = 1500000
            expect(inserted.thresholds.applicable).toBe(1500000);
        });

        it('should default basic threshold to $1M', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.thresholds.basic).toBe(1000000);
        });

        it('should handle missing outstandingSecurities', async () => {
            const data = makeDisclosure({
                companyFinancials: { totalAssets: 5000000 }
            });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.thresholds.securityBased).toBe(0);
            // max(1000000, 750000, 0) = 1000000
            expect(inserted.thresholds.applicable).toBe(1000000);
        });
    });

    // ------------------------------------------------------------------
    // Compliance calculations
    // ------------------------------------------------------------------
    describe('compliance calculations', () => {
        it('should be compliant when totalSales <= applicable threshold', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.compliance.isCompliant).toBe(true);
        });

        it('should not be compliant when totalSales > applicable threshold', async () => {
            const data = makeDisclosure({
                aggregateSales: { totalSales: 2000000 }
            });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.compliance.isCompliant).toBe(false);
        });

        it('should calculate thresholdUtilization as percentage', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            // 800000 / 1500000 * 100
            expect(inserted.compliance.thresholdUtilization).toBeCloseTo(53.33, 1);
        });

        it('should calculate remainingCapacity', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            // 1500000 - 800000 = 700000
            expect(inserted.compliance.remainingCapacity).toBe(700000);
        });
    });

    // ------------------------------------------------------------------
    // Disclosure requirements
    // ------------------------------------------------------------------
    describe('disclosure requirements', () => {
        it('should require no disclosure when sales <= $5M', async () => {
            const data = makeDisclosure({ aggregateSales: { totalSales: 3000000 } });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.compliance.disclosureRequired).toBe(false);
            expect(inserted.compliance.disclosureLevel).toBe('none');
            expect(inserted.disclosureRequirements.riskFactorsRequired).toBe(false);
        });

        it('should require basic disclosure when sales > $5M and <= $10M', async () => {
            const data = makeDisclosure({
                aggregateSales: { totalSales: 7000000 },
                companyFinancials: { totalAssets: 100000000 }
            });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.compliance.disclosureRequired).toBe(true);
            expect(inserted.compliance.disclosureLevel).toBe('basic');
            expect(inserted.disclosureRequirements.riskFactorsRequired).toBe(true);
            expect(inserted.disclosureRequirements.financialStatementsRequired).toBe(false);
            expect(inserted.disclosureRequirements.summaryOfPlanRequired).toBe(true);
        });

        it('should require enhanced disclosure when sales > $10M', async () => {
            const data = makeDisclosure({
                aggregateSales: { totalSales: 15000000 },
                companyFinancials: { totalAssets: 200000000 }
            });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.compliance.disclosureRequired).toBe(true);
            expect(inserted.compliance.disclosureLevel).toBe('enhanced');
            expect(inserted.disclosureRequirements.riskFactorsRequired).toBe(true);
            expect(inserted.disclosureRequirements.financialStatementsRequired).toBe(true);
            expect(inserted.disclosureRequirements.summaryOfPlanRequired).toBe(true);
            expect(inserted.disclosureRequirements.additionalDisclosures.length).toBe(4);
        });
    });

    // ------------------------------------------------------------------
    // isOverThreshold and getUtilizationStatus
    // ------------------------------------------------------------------
    describe('isOverThreshold', () => {
        it('should return true when totalSales > applicable', () => {
            const doc = {
                aggregateSales: { totalSales: 2000000 },
                thresholds: { applicable: 1500000 }
            };
            expect(Rule701Disclosure.isOverThreshold(doc)).toBe(true);
        });

        it('should return false when totalSales <= applicable', () => {
            const doc = {
                aggregateSales: { totalSales: 800000 },
                thresholds: { applicable: 1500000 }
            };
            expect(Rule701Disclosure.isOverThreshold(doc)).toBe(false);
        });
    });

    describe('getUtilizationStatus', () => {
        it('should return exceeded when utilization >= 100', () => {
            const doc = { compliance: { thresholdUtilization: 110 } };
            expect(Rule701Disclosure.getUtilizationStatus(doc)).toBe('exceeded');
        });

        it('should return critical when utilization >= 90', () => {
            const doc = { compliance: { thresholdUtilization: 95 } };
            expect(Rule701Disclosure.getUtilizationStatus(doc)).toBe('critical');
        });

        it('should return warning when utilization >= 75', () => {
            const doc = { compliance: { thresholdUtilization: 80 } };
            expect(Rule701Disclosure.getUtilizationStatus(doc)).toBe('warning');
        });

        it('should return normal when utilization < 75', () => {
            const doc = { compliance: { thresholdUtilization: 50 } };
            expect(Rule701Disclosure.getUtilizationStatus(doc)).toBe('normal');
        });

        it('should handle missing compliance', () => {
            const doc = {};
            expect(Rule701Disclosure.getUtilizationStatus(doc)).toBe('normal');
        });
    });

    // ------------------------------------------------------------------
    // toJSON
    // ------------------------------------------------------------------
    describe('toJSON', () => {
        it('should add isOverThreshold and utilizationStatus', () => {
            const doc = {
                aggregateSales: { totalSales: 2000000 },
                thresholds: { applicable: 1500000 },
                compliance: { thresholdUtilization: 133 }
            };
            const json = Rule701Disclosure.toJSON(doc);
            expect(json.isOverThreshold).toBe(true);
            expect(json.utilizationStatus).toBe('exceeded');
        });

        it('should return null for null input', () => {
            expect(Rule701Disclosure.toJSON(null)).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // create
    // ------------------------------------------------------------------
    describe('create', () => {
        it('should set defaults for aggregateSales and grantsSummary', async () => {
            const data = makeDisclosure();
            delete data.aggregateSales.espp;
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.aggregateSales.espp).toBe(0);
            expect(inserted.grantsSummary.totalGrants).toBe(0);
        });

        it('should generate disclosureId if not provided', async () => {
            const data = makeDisclosure();
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.disclosureId).toMatch(/^r701_/);
        });

        it('should use provided disclosureId', async () => {
            const data = makeDisclosure({ disclosureId: 'custom-id' });
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: data }]
            });

            await Rule701Disclosure.create(data);
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.disclosureId).toBe('custom-id');
        });
    });

    // ------------------------------------------------------------------
    // findOneAndUpdate
    // ------------------------------------------------------------------
    describe('findOneAndUpdate', () => {
        it('should recalculate compliance when financials are updated', async () => {
            const existing = makeDisclosure();
            existing.thresholds = { applicable: 1500000 };
            existing.compliance = { isCompliant: true };
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await Rule701Disclosure.findOneAndUpdate(
                { _id: 'rd-1' },
                { $set: { companyFinancials: { totalAssets: 20000000 } } }
            );
            expect(result).toBeDefined();
        });
    });

    // ------------------------------------------------------------------
    // approve
    // ------------------------------------------------------------------
    describe('approve', () => {
        it('should approve a pending_review disclosure', async () => {
            const existing = makeDisclosure({ status: 'pending_review' });
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const result = await Rule701Disclosure.approve('rd-1', 'approver-1');
            expect(result.status).toBe('approved');
            expect(result.approvedBy).toBe('approver-1');
        });

        it('should throw when disclosure not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await expect(
                Rule701Disclosure.approve('nonexistent', 'approver-1')
            ).rejects.toThrow('Disclosure not found');
        });

        it('should throw when disclosure is not in pending_review status', async () => {
            const existing = makeDisclosure({ status: 'draft' });
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            await expect(
                Rule701Disclosure.approve('rd-1', 'approver-1')
            ).rejects.toThrow('Disclosure must be in pending_review status');
        });
    });

    // ------------------------------------------------------------------
    // addGrant
    // ------------------------------------------------------------------
    describe('addGrant', () => {
        it('should add a grant and update aggregates', async () => {
            const existing = makeDisclosure();
            existing.thresholds = { applicable: 1500000 };
            existing.aggregateSales = {
                totalSales: 800000,
                stockOptions: 500000,
                restrictedStock: 200000,
                rsus: 100000,
                espp: 0,
                other: 0
            };
            existing.grantsSummary = {
                totalGrants: 5,
                totalRecipients: 5,
                byRecipientType: { employees: 3, directors: 1, consultants: 1 }
            };
            existing.grantsInPeriod = [];
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const grantData = {
                grantType: 'iso',
                aggregateValue: 50000,
                recipientType: 'employee'
            };

            const result = await Rule701Disclosure.addGrant('rd-1', grantData);
            expect(result.grantsInPeriod.length).toBe(1);
            expect(result.aggregateSales.totalSales).toBe(850000);
            expect(result.aggregateSales.stockOptions).toBe(550000);
            expect(result.grantsSummary.totalGrants).toBe(6);
            expect(result.grantsSummary.byRecipientType.employees).toBe(4);
        });

        it('should map RSU grant type correctly', async () => {
            const existing = makeDisclosure();
            existing.thresholds = { applicable: 1500000 };
            existing.aggregateSales = {
                totalSales: 500000,
                stockOptions: 0,
                restrictedStock: 0,
                rsus: 500000,
                espp: 0,
                other: 0
            };
            existing.grantsSummary = { totalGrants: 0, byRecipientType: {} };
            existing.grantsInPeriod = [];
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const grantData = {
                grantType: 'rsu',
                aggregateValue: 100000,
                recipientType: 'director'
            };

            const result = await Rule701Disclosure.addGrant('rd-1', grantData);
            expect(result.aggregateSales.rsus).toBe(600000);
        });

        it('should throw when disclosure not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await expect(
                Rule701Disclosure.addGrant('nonexistent', { aggregateValue: 1000, grantType: 'iso' })
            ).rejects.toThrow('Disclosure not found');
        });

        it('should recalculate compliance after adding grant', async () => {
            const existing = makeDisclosure();
            existing.thresholds = { applicable: 1500000 };
            existing.aggregateSales = { totalSales: 1400000, stockOptions: 1400000 };
            existing.grantsSummary = { totalGrants: 0, byRecipientType: {} };
            existing.grantsInPeriod = [];
            existing.row_id = 'r1';

            zerodbService.queryTable
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] })
                .mockResolvedValueOnce({ data: [{ row_id: 'r1', row_data: existing }] });

            const grantData = {
                grantType: 'nso',
                aggregateValue: 200000
            };

            const result = await Rule701Disclosure.addGrant('rd-1', grantData);
            // totalSales = 1600000, threshold = 1500000 -> not compliant
            expect(result.compliance.isCompliant).toBe(false);
        });
    });

    // ------------------------------------------------------------------
    // findByCompany
    // ------------------------------------------------------------------
    describe('findByCompany', () => {
        it('should return disclosures sorted by periodEnd descending', async () => {
            const d1 = makeDisclosure({ periodEnd: '2024-12-31' });
            const d2 = makeDisclosure({ periodEnd: '2025-12-31' });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r1', row_data: d1 },
                    { row_id: 'r2', row_data: d2 }
                ]
            });

            const results = await Rule701Disclosure.findByCompany('company-1');
            expect(results.length).toBe(2);
            expect(new Date(results[0].periodEnd).getTime())
                .toBeGreaterThanOrEqual(new Date(results[1].periodEnd).getTime());
        });
    });

    // ------------------------------------------------------------------
    // getCurrentPeriod
    // ------------------------------------------------------------------
    describe('getCurrentPeriod', () => {
        it('should return disclosure that spans current date', async () => {
            const now = new Date();
            const start = new Date(now);
            start.setMonth(start.getMonth() - 6);
            const end = new Date(now);
            end.setMonth(end.getMonth() + 6);

            const d1 = makeDisclosure({
                periodStart: start.toISOString(),
                periodEnd: end.toISOString()
            });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: d1 }]
            });

            const result = await Rule701Disclosure.getCurrentPeriod('company-1');
            expect(result).toBeDefined();
        });

        it('should return null when no current period exists', async () => {
            const d1 = makeDisclosure({
                periodStart: '2020-01-01',
                periodEnd: '2020-12-31'
            });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: d1 }]
            });

            const result = await Rule701Disclosure.getCurrentPeriod('company-1');
            expect(result).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // getComplianceHistory
    // ------------------------------------------------------------------
    describe('getComplianceHistory', () => {
        it('should return disclosures within the specified year range', async () => {
            const recent = makeDisclosure({ periodStart: '2024-01-01', periodEnd: '2024-12-31' });
            const old = makeDisclosure({ periodStart: '2015-01-01', periodEnd: '2015-12-31' });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [
                    { row_id: 'r1', row_data: recent },
                    { row_id: 'r2', row_data: old }
                ]
            });

            const results = await Rule701Disclosure.getComplianceHistory('company-1', 3);
            // Only recent should be within 3-year window
            expect(results.length).toBe(1);
        });
    });

    // ------------------------------------------------------------------
    // createRolling12MonthDisclosure
    // ------------------------------------------------------------------
    describe('createRolling12MonthDisclosure', () => {
        it('should create a disclosure with rolling_12_month period type', async () => {
            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'r1', row_data: {} }]
            });

            await Rule701Disclosure.createRolling12MonthDisclosure(
                'company-1',
                { totalAssets: 5000000 },
                'user-1'
            );
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.periodType).toBe('rolling_12_month');
            expect(inserted.companyId).toBe('company-1');
            expect(inserted.aggregateSales.totalSales).toBe(0);
        });
    });
});
