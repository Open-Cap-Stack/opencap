/**
 * SPV Model Expanded Fields Tests
 * Issue #579: Expand SPV data model with terms, adviser, memo, carry, LP fields
 *
 * Tests that the new schema fields, enums, and validators are properly defined
 * while maintaining backward compatibility with existing required fields.
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
const SPV = require('../../../models/SPV');

describe('SPV Model - Expanded Fields (Issue #579)', () => {
    const makeInsertResponse = (overrides = {}) => ({
        data: [{
            row_id: 'row-1',
            row_data: {
                _id: 'spv-id-1',
                SPVID: 'spv_abc',
                Name: 'Test SPV',
                Purpose: 'Investment vehicle',
                Status: 'active',
                ComplianceStatus: 'Compliant',
                ParentCompanyID: 'company_1',
                ...overrides
            }
        }]
    });

    const minimalData = () => ({
        Name: 'Alpha SPV',
        Purpose: 'Series A investment',
        Status: 'active',
        ComplianceStatus: 'Compliant',
        ParentCompanyID: 'company_1'
    });

    beforeEach(() => {
        jest.clearAllMocks();
        zerodbService.insertRow.mockResolvedValue(makeInsertResponse());
        zerodbService.queryTable.mockResolvedValue({ data: [] });
        zerodbService.updateRows.mockResolvedValue({ modifiedCount: 1, matchedCount: 1 });
    });

    // -------------------------------------------------------------------------
    // Backward compatibility: original required fields still work
    // -------------------------------------------------------------------------
    describe('backward compatibility', () => {
        it('still requires Name, Purpose, ParentCompanyID', async () => {
            await expect(SPV.create({ Purpose: 'test', ParentCompanyID: 'c1' }))
                .rejects.toThrow('Name is required');
            await expect(SPV.create({ Name: 'SPV', ParentCompanyID: 'c1' }))
                .rejects.toThrow('Purpose is required');
            await expect(SPV.create({ Name: 'SPV', Purpose: 'test' }))
                .rejects.toThrow('ParentCompanyID is required');
        });

        it('creates SPV with only original fields (no new fields needed)', async () => {
            const result = await SPV.create(minimalData());
            expect(result).toBeDefined();
            expect(zerodbService.insertRow).toHaveBeenCalled();
        });

        it('original schema fields remain required', () => {
            expect(SPV.schema.SPVID.required).toBe(true);
            expect(SPV.schema.Name.required).toBe(true);
            expect(SPV.schema.Purpose.required).toBe(true);
            expect(SPV.schema.CreationDate.required).toBe(true);
            expect(SPV.schema.Status.required).toBe(true);
            expect(SPV.schema.ParentCompanyID.required).toBe(true);
            expect(SPV.schema.ComplianceStatus.required).toBe(true);
        });
    });

    // -------------------------------------------------------------------------
    // New enum constants are exported
    // -------------------------------------------------------------------------
    describe('new enum constants', () => {
        it('exports VALID_COMPANY_STAGES', () => {
            expect(SPV.VALID_COMPANY_STAGES).toEqual([
                'pre-seed', 'seed', 'series-a', 'series-b', 'post-revenue', 'other'
            ]);
        });

        it('exports VALID_INCORPORATION_TYPES', () => {
            expect(SPV.VALID_INCORPORATION_TYPES).toEqual(['c-corp', 'llc', 's-corp', 'other']);
        });

        it('exports VALID_MONTHS_OF_RUNWAY', () => {
            expect(SPV.VALID_MONTHS_OF_RUNWAY).toEqual(['less-than-12', '12-or-more']);
        });

        it('exports VALID_TRANSACTION_TYPES', () => {
            expect(SPV.VALID_TRANSACTION_TYPES).toEqual(['primary', 'secondary']);
        });

        it('exports VALID_INSTRUMENTS', () => {
            expect(SPV.VALID_INSTRUMENTS).toEqual([
                'safe', 'convertible-note', 'preferred-equity', 'common-equity', 'other'
            ]);
        });

        it('exports VALID_VALUATIONS', () => {
            expect(SPV.VALID_VALUATIONS).toEqual(['capped', 'uncapped']);
        });

        it('exports VALID_ADVISER_TYPES', () => {
            expect(SPV.VALID_ADVISER_TYPES).toEqual(['platform-advisor', 'self-advised']);
        });
    });

    // -------------------------------------------------------------------------
    // New validators
    // -------------------------------------------------------------------------
    describe('new validators', () => {
        it('isValidCompanyStage accepts valid values', () => {
            SPV.VALID_COMPANY_STAGES.forEach(s => {
                expect(SPV.validators.isValidCompanyStage(s)).toBe(true);
            });
        });

        it('isValidCompanyStage rejects invalid values', () => {
            expect(SPV.validators.isValidCompanyStage('series-c')).toBe(false);
        });

        it('isValidIncorporationType accepts valid values', () => {
            SPV.VALID_INCORPORATION_TYPES.forEach(t => {
                expect(SPV.validators.isValidIncorporationType(t)).toBe(true);
            });
        });

        it('isValidIncorporationType rejects invalid values', () => {
            expect(SPV.validators.isValidIncorporationType('partnership')).toBe(false);
        });

        it('isValidMonthsOfRunway accepts valid values', () => {
            SPV.VALID_MONTHS_OF_RUNWAY.forEach(v => {
                expect(SPV.validators.isValidMonthsOfRunway(v)).toBe(true);
            });
        });

        it('isValidMonthsOfRunway rejects invalid values', () => {
            expect(SPV.validators.isValidMonthsOfRunway('6-months')).toBe(false);
        });

        it('isValidTransactionType accepts valid values', () => {
            SPV.VALID_TRANSACTION_TYPES.forEach(t => {
                expect(SPV.validators.isValidTransactionType(t)).toBe(true);
            });
        });

        it('isValidTransactionType rejects invalid values', () => {
            expect(SPV.validators.isValidTransactionType('tertiary')).toBe(false);
        });

        it('isValidInstrument accepts valid values', () => {
            SPV.VALID_INSTRUMENTS.forEach(i => {
                expect(SPV.validators.isValidInstrument(i)).toBe(true);
            });
        });

        it('isValidInstrument rejects invalid values', () => {
            expect(SPV.validators.isValidInstrument('warrant')).toBe(false);
        });

        it('isValidValuation accepts valid values', () => {
            SPV.VALID_VALUATIONS.forEach(v => {
                expect(SPV.validators.isValidValuation(v)).toBe(true);
            });
        });

        it('isValidValuation rejects invalid values', () => {
            expect(SPV.validators.isValidValuation('flat')).toBe(false);
        });

        it('isValidAdviserType accepts valid values', () => {
            SPV.VALID_ADVISER_TYPES.forEach(a => {
                expect(SPV.validators.isValidAdviserType(a)).toBe(true);
            });
        });

        it('isValidAdviserType rejects invalid values', () => {
            expect(SPV.validators.isValidAdviserType('external')).toBe(false);
        });
    });

    // -------------------------------------------------------------------------
    // Schema field definitions for new fields
    // -------------------------------------------------------------------------
    describe('schema - Basic Info additions', () => {
        it('has companyId as optional string', () => {
            expect(SPV.schema.companyId).toBeDefined();
            expect(SPV.schema.companyId.type).toBe('string');
            expect(SPV.schema.companyId.required).toBeUndefined();
        });

        it('has companyLegalName as optional string', () => {
            expect(SPV.schema.companyLegalName.type).toBe('string');
        });

        it('has companyStage with enum', () => {
            expect(SPV.schema.companyStage.type).toBe('string');
            expect(SPV.schema.companyStage.enum).toEqual(SPV.VALID_COMPANY_STAGES);
        });

        it('has countryOfIncorporation with default', () => {
            expect(SPV.schema.countryOfIncorporation.type).toBe('string');
            expect(SPV.schema.countryOfIncorporation.default).toBe('United States');
        });

        it('has incorporationType with enum', () => {
            expect(SPV.schema.incorporationType.type).toBe('string');
            expect(SPV.schema.incorporationType.enum).toEqual(SPV.VALID_INCORPORATION_TYPES);
        });

        it('has founderEmails as array', () => {
            expect(SPV.schema.founderEmails.type).toBe('array');
        });

        it('has monthsOfRunway with enum', () => {
            expect(SPV.schema.monthsOfRunway.type).toBe('string');
            expect(SPV.schema.monthsOfRunway.enum).toEqual(SPV.VALID_MONTHS_OF_RUNWAY);
        });

        it('has proRataRights as boolean', () => {
            expect(SPV.schema.proRataRights.type).toBe('boolean');
        });

        it('has targetClosingDate as date', () => {
            expect(SPV.schema.targetClosingDate.type).toBe('date');
        });

        it('has lpMinimumInvestment as number', () => {
            expect(SPV.schema.lpMinimumInvestment.type).toBe('number');
        });
    });

    describe('schema - Terms', () => {
        it('has transactionType with enum', () => {
            expect(SPV.schema.transactionType.enum).toEqual(SPV.VALID_TRANSACTION_TYPES);
        });

        it('has instrument with enum', () => {
            expect(SPV.schema.instrument.enum).toEqual(SPV.VALID_INSTRUMENTS);
        });

        it('has includesTokenWarrant as boolean', () => {
            expect(SPV.schema.includesTokenWarrant.type).toBe('boolean');
        });

        it('has valuation with enum', () => {
            expect(SPV.schema.valuation.enum).toEqual(SPV.VALID_VALUATIONS);
        });

        it('has valuationCap as number', () => {
            expect(SPV.schema.valuationCap.type).toBe('number');
        });

        it('has discount as number', () => {
            expect(SPV.schema.discount.type).toBe('number');
        });

        it('has round as string', () => {
            expect(SPV.schema.round.type).toBe('string');
        });

        it('has roundSize as number', () => {
            expect(SPV.schema.roundSize.type).toBe('number');
        });

        it('has allocation as number', () => {
            expect(SPV.schema.allocation.type).toBe('number');
        });

        it('has otherTerms as string', () => {
            expect(SPV.schema.otherTerms.type).toBe('string');
        });

        it('has termDocuments as array', () => {
            expect(SPV.schema.termDocuments.type).toBe('array');
        });
    });

    describe('schema - Adviser & ERA', () => {
        it('has adviserType with enum', () => {
            expect(SPV.schema.adviserType.enum).toEqual(SPV.VALID_ADVISER_TYPES);
        });

        it('has masterPartnershipEntity as string', () => {
            expect(SPV.schema.masterPartnershipEntity.type).toBe('string');
        });

        it('has fundLead as string', () => {
            expect(SPV.schema.fundLead.type).toBe('string');
        });
    });

    describe('schema - Data room & memo', () => {
        it('has memo as string', () => {
            expect(SPV.schema.memo.type).toBe('string');
        });

        it('has pitchDeckUrl as string', () => {
            expect(SPV.schema.pitchDeckUrl.type).toBe('string');
        });

        it('has coInvestors as array', () => {
            expect(SPV.schema.coInvestors.type).toBe('array');
        });

        it('has pastFinancing as boolean', () => {
            expect(SPV.schema.pastFinancing.type).toBe('boolean');
        });

        it('has risks as array', () => {
            expect(SPV.schema.risks.type).toBe('array');
        });

        it('has disclosures as object', () => {
            expect(SPV.schema.disclosures.type).toBe('object');
        });
    });

    describe('schema - Carry & GP', () => {
        it('has carryPercentage as number with default 0', () => {
            expect(SPV.schema.carryPercentage.type).toBe('number');
            expect(SPV.schema.carryPercentage.default).toBe(0);
        });

        it('has carryRecipientEntity as string', () => {
            expect(SPV.schema.carryRecipientEntity.type).toBe('string');
        });

        it('has gpCommitmentAmount as number', () => {
            expect(SPV.schema.gpCommitmentAmount.type).toBe('number');
        });

        it('has gpCommitmentFromFund as boolean', () => {
            expect(SPV.schema.gpCommitmentFromFund.type).toBe('boolean');
        });

        it('has investingOnDifferentTerms as boolean', () => {
            expect(SPV.schema.investingOnDifferentTerms.type).toBe('boolean');
        });

        it('has dealPartners as array', () => {
            expect(SPV.schema.dealPartners.type).toBe('array');
        });
    });

    describe('schema - Additional services', () => {
        it('has has3c7ParallelFunds as boolean', () => {
            expect(SPV.schema.has3c7ParallelFunds.type).toBe('boolean');
        });

        it('has hasFinancialStatements as boolean', () => {
            expect(SPV.schema.hasFinancialStatements.type).toBe('boolean');
        });
    });

    describe('schema - Metrics', () => {
        it('has totalRaised as number with default 0', () => {
            expect(SPV.schema.totalRaised.type).toBe('number');
            expect(SPV.schema.totalRaised.default).toBe(0);
        });

        it('has lpCount as number with default 0', () => {
            expect(SPV.schema.lpCount.type).toBe('number');
            expect(SPV.schema.lpCount.default).toBe(0);
        });
    });

    describe('schema - Wizard state', () => {
        it('has wizardStep as number with default 0', () => {
            expect(SPV.schema.wizardStep.type).toBe('number');
            expect(SPV.schema.wizardStep.default).toBe(0);
        });

        it('has wizardCompletedSteps as array', () => {
            expect(SPV.schema.wizardCompletedSteps.type).toBe('array');
        });
    });

    // -------------------------------------------------------------------------
    // create() with extended fields
    // -------------------------------------------------------------------------
    describe('create() with extended fields', () => {
        it('stores extended fields alongside original fields', async () => {
            const extendedOverrides = {
                companyId: 'comp_123',
                companyStage: 'seed',
                instrument: 'safe',
                valuation: 'capped',
                valuationCap: 5000000,
                carryPercentage: 20,
                memo: 'Investment memo text',
                coInvestors: [{ name: 'Fund A', amount: 100000 }],
                wizardStep: 2,
                wizardCompletedSteps: ['basic-info', 'terms']
            };

            zerodbService.insertRow.mockResolvedValue(makeInsertResponse(extendedOverrides));

            const result = await SPV.create({ ...minimalData(), ...extendedOverrides });
            expect(result).toBeDefined();

            const insertedData = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedData.companyId).toBe('comp_123');
            expect(insertedData.companyStage).toBe('seed');
            expect(insertedData.instrument).toBe('safe');
            expect(insertedData.valuationCap).toBe(5000000);
            expect(insertedData.carryPercentage).toBe(20);
            expect(insertedData.memo).toBe('Investment memo text');
            expect(insertedData.coInvestors).toEqual([{ name: 'Fund A', amount: 100000 }]);
        });

        it('stores disclosures object', async () => {
            const disclosures = {
                investedPreviously: true,
                downRound: false,
                advisoryShares: false,
                officerOrEmployee: false,
                relativeWorking: false,
                otherConflicts: false,
                noConflicts: true
            };

            zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ disclosures }));

            await SPV.create({ ...minimalData(), disclosures });
            const insertedData = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedData.disclosures).toEqual(disclosures);
        });

        it('stores dealPartners array', async () => {
            const dealPartners = [
                { userId: 'user_1', carryPercentage: 10 },
                { userId: 'user_2', carryPercentage: 5 }
            ];

            zerodbService.insertRow.mockResolvedValue(makeInsertResponse({ dealPartners }));

            await SPV.create({ ...minimalData(), dealPartners });
            const insertedData = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedData.dealPartners).toEqual(dealPartners);
        });

        it('stores boolean fields correctly', async () => {
            const boolFields = {
                proRataRights: true,
                includesTokenWarrant: false,
                pastFinancing: true,
                gpCommitmentFromFund: false,
                investingOnDifferentTerms: true,
                has3c7ParallelFunds: false,
                hasFinancialStatements: true
            };

            zerodbService.insertRow.mockResolvedValue(makeInsertResponse(boolFields));

            await SPV.create({ ...minimalData(), ...boolFields });
            const insertedData = zerodbService.insertRow.mock.calls[0][1];
            expect(insertedData.proRataRights).toBe(true);
            expect(insertedData.includesTokenWarrant).toBe(false);
            expect(insertedData.has3c7ParallelFunds).toBe(false);
            expect(insertedData.hasFinancialStatements).toBe(true);
        });
    });
});
