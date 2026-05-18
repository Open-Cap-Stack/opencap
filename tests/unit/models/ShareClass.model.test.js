/**
 * ShareClass Model Unit Tests
 * Tests real ShareClass model code paths by mocking ZeroDB service.
 */

jest.mock('../../../services/zerodbService', () => ({
    insertRow: jest.fn(),
    queryTable: jest.fn(),
    updateRows: jest.fn(),
    deleteRows: jest.fn(),
    deleteRowById: jest.fn(),
    initialize: jest.fn(),
    projectId: 'mock-project-id'
}));

const zerodbService = require('../../../services/zerodbService');
const ShareClass = require('../../../models/ShareClass');

describe('ShareClass Model', () => {
    const makeInsertResponse = (overrides = {}) => ({
        data: [{
            row_id: 'row-1',
            row_data: {
                _id: 'sc-id-1',
                shareClassId: 'sc_abc',
                companyId: 'company_1',
                name: 'Series A Preferred',
                description: 'Series A investment',
                classType: 'preferred',
                authorizedShares: 1000000,
                dilutedShares: 500000,
                amountRaised: 5000000,
                ownershipPercentage: 20,
                ...overrides
            }
        }]
    });

    beforeEach(() => {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1 });
    });

    // -------------------------------------------------------------------------
    // Schema structure
    // -------------------------------------------------------------------------
    describe('schema structure', () => {
        it('exposes schema property', () => {
            expect(ShareClass.schema).toBeDefined();
        });

        it('has shareClassId as required unique string', () => {
            expect(ShareClass.schema.shareClassId.type).toBe('string');
            expect(ShareClass.schema.shareClassId.required).toBe(true);
        });

        it('has companyId as required string', () => {
            expect(ShareClass.schema.companyId.type).toBe('string');
            expect(ShareClass.schema.companyId.required).toBe(true);
        });

        it('has name as required string', () => {
            expect(ShareClass.schema.name.type).toBe('string');
            expect(ShareClass.schema.name.required).toBe(true);
        });

        it('has description as required string', () => {
            expect(ShareClass.schema.description.type).toBe('string');
            expect(ShareClass.schema.description.required).toBe(true);
        });

        it('has authorizedShares as required number', () => {
            expect(ShareClass.schema.authorizedShares.type).toBe('number');
            expect(ShareClass.schema.authorizedShares.required).toBe(true);
        });

        it('has dilutedShares as required number', () => {
            expect(ShareClass.schema.dilutedShares.type).toBe('number');
            expect(ShareClass.schema.dilutedShares.required).toBe(true);
        });

        it('has amountRaised as required number', () => {
            expect(ShareClass.schema.amountRaised.type).toBe('number');
            expect(ShareClass.schema.amountRaised.required).toBe(true);
        });

        it('has ownershipPercentage as required number', () => {
            expect(ShareClass.schema.ownershipPercentage.type).toBe('number');
            expect(ShareClass.schema.ownershipPercentage.required).toBe(true);
        });

        it('has parValue defaulting to 0.001', () => {
            expect(ShareClass.schema.parValue.default).toBe(0.001);
        });

        it('has votesPerShare defaulting to 1', () => {
            expect(ShareClass.schema.votesPerShare.default).toBe(1);
        });

        it('has outstandingShares defaulting to 0', () => {
            expect(ShareClass.schema.outstandingShares.default).toBe(0);
        });

        it('has reservedShares defaulting to 0', () => {
            expect(ShareClass.schema.reservedShares.default).toBe(0);
        });

        it('has conversionRatio defaulting to 1', () => {
            expect(ShareClass.schema.conversionRatio.default).toBe(1);
        });

        it('has antidilutionProtection defaulting to "none"', () => {
            expect(ShareClass.schema.antidilutionProtection.default).toBe('none');
        });

        it('has participatingPreferred defaulting to false', () => {
            expect(ShareClass.schema.participatingPreferred.default).toBe(false);
        });

        it('has votingRights defaulting to true', () => {
            expect(ShareClass.schema.votingRights.default).toBe(true);
        });

        it('has seniorityRank defaulting to 1', () => {
            expect(ShareClass.schema.seniorityRank.default).toBe(1);
        });
    });

    // -------------------------------------------------------------------------
    // CLASS_TYPES enum
    // -------------------------------------------------------------------------
    describe('CLASS_TYPES enum', () => {
        const expectedTypes = ['common', 'preferred', 'restricted_common', 'founders'];

        it('exposes CLASS_TYPES array', () => {
            expect(Array.isArray(ShareClass.CLASS_TYPES)).toBe(true);
        });

        expectedTypes.forEach(type => {
            it(`includes "${type}" in CLASS_TYPES`, () => {
                expect(ShareClass.CLASS_TYPES).toContain(type);
            });
        });

        it('classType schema field defaults to "common"', () => {
            expect(ShareClass.schema.classType.default).toBe('common');
        });
    });

    // -------------------------------------------------------------------------
    // ANTIDILUTION_TYPES enum
    // -------------------------------------------------------------------------
    describe('ANTIDILUTION_TYPES enum', () => {
        const expectedTypes = ['none', 'full_ratchet', 'weighted_average', 'narrow_based'];

        it('exposes ANTIDILUTION_TYPES array', () => {
            expect(Array.isArray(ShareClass.ANTIDILUTION_TYPES)).toBe(true);
        });

        expectedTypes.forEach(type => {
            it(`includes "${type}" in ANTIDILUTION_TYPES`, () => {
                expect(ShareClass.ANTIDILUTION_TYPES).toContain(type);
            });
        });
    });

    // -------------------------------------------------------------------------
    // Model identity
    // -------------------------------------------------------------------------
    describe('model identity', () => {
        it('has tableName "securities"', () => {
            expect(ShareClass.tableName).toBe('securities');
        });

        it('exposes CRUD methods', () => {
            ['create', 'find', 'findOne', 'updateOne', 'deleteOne'].forEach(method => {
                expect(typeof ShareClass[method]).toBe('function');
            });
        });
    });

    // -------------------------------------------------------------------------
    // create() — validation and defaults
    // -------------------------------------------------------------------------
    describe('create()', () => {
        const minimalData = () => ({
            companyId: 'company_1',
            name: 'Common Stock',
            description: 'Standard common shares',
            authorizedShares: 10000000,
            dilutedShares: 5000000,
            amountRaised: 0,
            ownershipPercentage: 100
        });

        it('generates shareClassId when not provided', async () => {
            await ShareClass.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.shareClassId).toMatch(/^sc_/);
        });

        it('preserves provided shareClassId', async () => {
            await ShareClass.create({ ...minimalData(), shareClassId: 'sc_custom_999' });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.shareClassId).toBe('sc_custom_999');
        });

        it('applies default classType of "common"', async () => {
            await ShareClass.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.classType).toBe('common');
        });

        it('preserves provided classType', async () => {
            await ShareClass.create({ ...minimalData(), classType: 'preferred' });
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.classType).toBe('preferred');
        });

        it('applies default parValue of 0.001', async () => {
            await ShareClass.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.parValue).toBe(0.001);
        });

        it('applies default votingRights = true', async () => {
            await ShareClass.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.votingRights).toBe(true);
        });

        it('applies default antidilutionProtection = "none"', async () => {
            await ShareClass.create(minimalData());
            const inserted = zerodbService.insertRow.mock.calls[0][1];
            expect(inserted.antidilutionProtection).toBe('none');
        });

        it('throws when companyId is missing', async () => {
            const data = { ...minimalData() };
            delete data.companyId;
            await expect(ShareClass.create(data)).rejects.toThrow('Company ID is required');
        });

        it('throws when name is missing', async () => {
            const data = { ...minimalData() };
            delete data.name;
            await expect(ShareClass.create(data)).rejects.toThrow('Share class name is required');
        });

        it('throws when description is missing', async () => {
            const data = { ...minimalData() };
            delete data.description;
            await expect(ShareClass.create(data)).rejects.toThrow('Description is required');
        });

        it('throws when amountRaised is undefined', async () => {
            const data = { ...minimalData() };
            delete data.amountRaised;
            await expect(ShareClass.create(data)).rejects.toThrow('Amount raised is required');
        });

        it('throws when amountRaised is negative', async () => {
            await expect(
                ShareClass.create({ ...minimalData(), amountRaised: -100 })
            ).rejects.toThrow('Amount raised is required');
        });

        it('throws when ownershipPercentage is undefined', async () => {
            const data = { ...minimalData() };
            delete data.ownershipPercentage;
            await expect(ShareClass.create(data)).rejects.toThrow('Ownership percentage must be between 0 and 100');
        });

        it('throws when ownershipPercentage exceeds 100', async () => {
            await expect(
                ShareClass.create({ ...minimalData(), ownershipPercentage: 101 })
            ).rejects.toThrow('Ownership percentage must be between 0 and 100');
        });

        it('throws when ownershipPercentage is negative', async () => {
            await expect(
                ShareClass.create({ ...minimalData(), ownershipPercentage: -1 })
            ).rejects.toThrow('Ownership percentage must be between 0 and 100');
        });

        it('throws when dilutedShares is undefined', async () => {
            const data = { ...minimalData() };
            delete data.dilutedShares;
            await expect(ShareClass.create(data)).rejects.toThrow('Diluted shares is required');
        });

        it('throws when authorizedShares is undefined', async () => {
            const data = { ...minimalData() };
            delete data.authorizedShares;
            await expect(ShareClass.create(data)).rejects.toThrow('Authorized shares is required');
        });

        it('throws for invalid classType', async () => {
            await expect(
                ShareClass.create({ ...minimalData(), classType: 'super_preferred' })
            ).rejects.toThrow('Invalid class type');
        });

        it('throws for invalid antidilutionProtection', async () => {
            await expect(
                ShareClass.create({ ...minimalData(), antidilutionProtection: 'magic_ratchet' })
            ).rejects.toThrow('Invalid antidilution protection');
        });

        it('accepts ownershipPercentage of 0', async () => {
            await expect(
                ShareClass.create({ ...minimalData(), ownershipPercentage: 0 })
            ).resolves.toBeDefined();
        });

        it('accepts ownershipPercentage of 100', async () => {
            await expect(
                ShareClass.create({ ...minimalData(), ownershipPercentage: 100 })
            ).resolves.toBeDefined();
        });
    });

    // -------------------------------------------------------------------------
    // findByShareClassId()
    // -------------------------------------------------------------------------
    describe('findByShareClassId()', () => {
        it('returns the share class when found', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { shareClassId: 'sc_abc' } }]
            });
            const result = await ShareClass.findByShareClassId('sc_abc');
            expect(result).toBeDefined();
        });

        it('returns null when not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const result = await ShareClass.findByShareClassId('nonexistent');
            expect(result).toBeNull();
        });
    });

    // -------------------------------------------------------------------------
    // findByCompany()
    // -------------------------------------------------------------------------
    describe('findByCompany()', () => {
        it('queries with companyId filter', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            await ShareClass.findByCompany('company_x');
            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({ filter: { companyId: 'company_x' } })
            );
        });
    });

    // -------------------------------------------------------------------------
    // findByType()
    // -------------------------------------------------------------------------
    describe('findByType()', () => {
        it('filters results to matching classType', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    { row_id: 'r1', row_data: { shareClassId: 'sc1', companyId: 'c1', classType: 'common' } },
                    { row_id: 'r2', row_data: { shareClassId: 'sc2', companyId: 'c1', classType: 'preferred' } }
                ]
            });
            const results = await ShareClass.findByType('c1', 'preferred');
            expect(results).toHaveLength(1);
            expect(results[0].classType).toBe('preferred');
        });
    });

    // -------------------------------------------------------------------------
    // findPreferredByCompany()
    // -------------------------------------------------------------------------
    describe('findPreferredByCompany()', () => {
        it('returns only preferred classes sorted by seniorityRank ascending', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    { row_id: 'r1', row_data: { shareClassId: 'sc1', classType: 'preferred', seniorityRank: 2 } },
                    { row_id: 'r2', row_data: { shareClassId: 'sc2', classType: 'common', seniorityRank: 1 } },
                    { row_id: 'r3', row_data: { shareClassId: 'sc3', classType: 'preferred', seniorityRank: 1 } }
                ]
            });
            const results = await ShareClass.findPreferredByCompany('company_1');
            expect(results).toHaveLength(2);
            expect(results[0].seniorityRank).toBe(1);
            expect(results[1].seniorityRank).toBe(2);
        });
    });

    // -------------------------------------------------------------------------
    // getConversionRate()
    // -------------------------------------------------------------------------
    describe('getConversionRate()', () => {
        it('calculates ratio as authorizedShares / dilutedShares', () => {
            expect(ShareClass.getConversionRate({ authorizedShares: 1000000, dilutedShares: 500000 })).toBe(2);
        });

        it('returns 0 when dilutedShares is 0', () => {
            expect(ShareClass.getConversionRate({ authorizedShares: 1000000, dilutedShares: 0 })).toBe(0);
        });

        it('rounds to 2 decimal places', () => {
            expect(ShareClass.getConversionRate({ authorizedShares: 1000, dilutedShares: 3 })).toBe(333.33);
        });
    });

    // -------------------------------------------------------------------------
    // validateShares()
    // -------------------------------------------------------------------------
    describe('validateShares()', () => {
        it('returns true when dilutedShares <= authorizedShares', () => {
            expect(ShareClass.validateShares({ authorizedShares: 1000000, dilutedShares: 500000 })).toBe(true);
        });

        it('returns true when dilutedShares equals authorizedShares', () => {
            expect(ShareClass.validateShares({ authorizedShares: 500000, dilutedShares: 500000 })).toBe(true);
        });

        it('returns false when dilutedShares > authorizedShares', () => {
            expect(ShareClass.validateShares({ authorizedShares: 400000, dilutedShares: 500000 })).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // calculateLiquidationPayout()
    // -------------------------------------------------------------------------
    describe('calculateLiquidationPayout()', () => {
        it('returns partial payout when proceeds are insufficient for preference', () => {
            const sc = { pricePerShare: 10, liquidationPreference: 1, participatingPreferred: false };
            const result = ShareClass.calculateLiquidationPayout(sc, 500, 100);
            // preferenceAmount = 10 * 1 * 100 = 1000, only 500 available
            expect(result.fullPreferencePaid).toBe(false);
            expect(result.totalPayout).toBe(500);
            expect(result.participationAmount).toBe(0);
        });

        it('returns full preference when proceeds cover it (non-participating)', () => {
            const sc = { pricePerShare: 10, liquidationPreference: 1, participatingPreferred: false };
            const result = ShareClass.calculateLiquidationPayout(sc, 5000, 100);
            expect(result.fullPreferencePaid).toBe(true);
            expect(result.preferenceAmount).toBe(1000);
            expect(result.participationAmount).toBe(0);
            expect(result.totalPayout).toBe(1000);
        });

        it('includes participation amount for participating preferred', () => {
            const sc = { pricePerShare: 10, liquidationPreference: 1, participatingPreferred: true };
            const result = ShareClass.calculateLiquidationPayout(sc, 5000, 100);
            expect(result.fullPreferencePaid).toBe(true);
            expect(result.participationAmount).toBeGreaterThan(0);
        });

        it('caps participation when participationCap is set', () => {
            const sc = {
                pricePerShare: 10, liquidationPreference: 1,
                participatingPreferred: true, participationCap: 0.5
            };
            const result = ShareClass.calculateLiquidationPayout(sc, 5000, 100);
            // maxParticipation = 10 * 0.5 * 100 = 500
            expect(result.participationAmount).toBeLessThanOrEqual(500);
        });

        it('calculates payoutPerShare = totalPayout / totalShares', () => {
            const sc = { pricePerShare: 10, liquidationPreference: 1, participatingPreferred: false };
            const result = ShareClass.calculateLiquidationPayout(sc, 5000, 100);
            expect(result.payoutPerShare).toBe(result.totalPayout / 100);
        });

        it('returns 0 payoutPerShare when totalShares is 0', () => {
            const sc = { pricePerShare: 10, liquidationPreference: 1, participatingPreferred: false };
            const result = ShareClass.calculateLiquidationPayout(sc, 5000, 0);
            expect(result.payoutPerShare).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // search()
    // -------------------------------------------------------------------------
    describe('search()', () => {
        it('finds share classes matching name', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    { row_id: 'r1', row_data: { shareClassId: 'sc1', name: 'Series A Preferred' } },
                    { row_id: 'r2', row_data: { shareClassId: 'sc2', name: 'Common Stock' } }
                ]
            });
            const results = await ShareClass.search('series');
            expect(results).toHaveLength(1);
            expect(results[0].shareClassId).toBe('sc1');
        });

        it('is case-insensitive', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { shareClassId: 'sc1', name: 'Common Stock' } }]
            });
            const results = await ShareClass.search('COMMON');
            expect(results).toHaveLength(1);
        });

        it('returns empty array when nothing matches', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [{ row_id: 'r1', row_data: { shareClassId: 'sc1', name: 'Other' } }]
            });
            const results = await ShareClass.search('xyznotfound');
            expect(results).toHaveLength(0);
        });
    });

    // -------------------------------------------------------------------------
    // calculateFullyDiluted()
    // -------------------------------------------------------------------------
    describe('calculateFullyDiluted()', () => {
        it('sums outstandingShares + reservedShares across all classes', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    { row_id: 'r1', row_data: { companyId: 'c1', outstandingShares: 500000, reservedShares: 100000 } },
                    { row_id: 'r2', row_data: { companyId: 'c1', outstandingShares: 200000, reservedShares: 50000 } }
                ]
            });
            const total = await ShareClass.calculateFullyDiluted('c1');
            expect(total).toBe(850000);
        });

        it('returns 0 when no classes exist', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const total = await ShareClass.calculateFullyDiluted('empty_company');
            expect(total).toBe(0);
        });
    });

    // -------------------------------------------------------------------------
    // getOwnershipBreakdown()
    // -------------------------------------------------------------------------
    describe('getOwnershipBreakdown()', () => {
        it('returns fullyDiluted and per-type percentages', async () => {
            zerodbService.queryTable.mockResolvedValue({
                data: [
                    {
                        row_id: 'r1',
                        row_data: { companyId: 'c1', classType: 'common', outstandingShares: 800000, reservedShares: 0 }
                    },
                    {
                        row_id: 'r2',
                        row_data: { companyId: 'c1', classType: 'preferred', outstandingShares: 200000, reservedShares: 0 }
                    }
                ]
            });
            const result = await ShareClass.getOwnershipBreakdown('c1');
            expect(result.fullyDiluted).toBe(1000000);
            expect(result.breakdown.common.shares).toBe(800000);
            expect(result.breakdown.common.percentage).toBeCloseTo(80, 1);
            expect(result.breakdown.preferred.percentage).toBeCloseTo(20, 1);
        });

        it('returns 0% breakdown when fullyDiluted is 0', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });
            const result = await ShareClass.getOwnershipBreakdown('empty_co');
            expect(result.fullyDiluted).toBe(0);
            expect(result.breakdown.common.percentage).toBe(0);
        });
    });
});
