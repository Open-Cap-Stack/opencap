/**
 * Company Model Legal Structure Tests
 * Issue #261: Enhance Company model with legal structure fields for 409A compliance
 *
 * Tests for the new legal structure fields including:
 * - entityType, stateOfIncorporation, dateOfIncorporation
 * - qualifiedSmallBusiness, section1202Eligible, taxStatus
 * - registeredAgentName, registeredAgentAddress, ein
 * - fiscalYearEnd, authorizedShares
 */

// Mock the ZeroDB service
jest.mock('../../../services/zerodbService', () => ({
    initialize: jest.fn().mockResolvedValue(true),
    insertRow: jest.fn().mockResolvedValue({ data: [{ row_id: 'test-id', row_data: {} }] }),
    queryTable: jest.fn().mockResolvedValue({ data: [] }),
    updateRows: jest.fn().mockResolvedValue({ modified_count: 1 }),
    deleteRows: jest.fn().mockResolvedValue({ deleted_count: 1 }),
    createTable: jest.fn().mockResolvedValue({}),
    projectId: 'test-project'
}));

// Mock Settings to prevent side effects
jest.mock('../../../models/Settings', () => ({
    createCompanySettings: jest.fn().mockResolvedValue({})
}));

const Company = require('../../../models/Company');
const zerodbService = require('../../../services/zerodbService');

describe('Company Model - Legal Structure Fields (Issue #261)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema Definition', () => {
        it('should have entityType field in schema', () => {
            expect(Company.schema.entityType).toBeDefined();
            expect(Company.schema.entityType.type).toBe('string');
            expect(Company.schema.entityType.enum).toEqual([
                'C_CORP', 'S_CORP', 'LLC', 'LP', 'DELAWARE_C_CORP', 'DELAWARE_LLC'
            ]);
        });

        it('should have stateOfIncorporation field in schema', () => {
            expect(Company.schema.stateOfIncorporation).toBeDefined();
            expect(Company.schema.stateOfIncorporation.type).toBe('string');
            expect(Company.schema.stateOfIncorporation.enum).toContain('DE');
            expect(Company.schema.stateOfIncorporation.enum).toContain('CA');
            expect(Company.schema.stateOfIncorporation.enum).toContain('NY');
        });

        it('should have dateOfIncorporation field in schema', () => {
            expect(Company.schema.dateOfIncorporation).toBeDefined();
            expect(Company.schema.dateOfIncorporation.type).toBe('date');
        });

        it('should have qualifiedSmallBusiness field in schema', () => {
            expect(Company.schema.qualifiedSmallBusiness).toBeDefined();
            expect(Company.schema.qualifiedSmallBusiness.type).toBe('boolean');
            expect(Company.schema.qualifiedSmallBusiness.default).toBe(false);
        });

        it('should have section1202Eligible field in schema', () => {
            expect(Company.schema.section1202Eligible).toBeDefined();
            expect(Company.schema.section1202Eligible.type).toBe('boolean');
            expect(Company.schema.section1202Eligible.default).toBe(false);
        });

        it('should have taxStatus field in schema', () => {
            expect(Company.schema.taxStatus).toBeDefined();
            expect(Company.schema.taxStatus.type).toBe('string');
            expect(Company.schema.taxStatus.enum).toEqual(['ACTIVE', 'SUSPENDED', 'DISSOLVED']);
            expect(Company.schema.taxStatus.default).toBe('ACTIVE');
        });

        it('should have registeredAgentName field in schema', () => {
            expect(Company.schema.registeredAgentName).toBeDefined();
            expect(Company.schema.registeredAgentName.type).toBe('string');
        });

        it('should have registeredAgentAddress field in schema', () => {
            expect(Company.schema.registeredAgentAddress).toBeDefined();
            expect(Company.schema.registeredAgentAddress.type).toBe('object');
            expect(Company.schema.registeredAgentAddress.properties).toBeDefined();
            expect(Company.schema.registeredAgentAddress.properties.street).toBeDefined();
            expect(Company.schema.registeredAgentAddress.properties.city).toBeDefined();
            expect(Company.schema.registeredAgentAddress.properties.state).toBeDefined();
            expect(Company.schema.registeredAgentAddress.properties.zip).toBeDefined();
        });

        it('should have ein field in schema with encryption flag', () => {
            expect(Company.schema.ein).toBeDefined();
            expect(Company.schema.ein.type).toBe('string');
            expect(Company.schema.ein.encrypted).toBe(true);
        });

        it('should have fiscalYearEnd field in schema', () => {
            expect(Company.schema.fiscalYearEnd).toBeDefined();
            expect(Company.schema.fiscalYearEnd.type).toBe('string');
            expect(Company.schema.fiscalYearEnd.enum).toEqual([
                'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
            ]);
        });

        it('should have authorizedShares field in schema', () => {
            expect(Company.schema.authorizedShares).toBeDefined();
            expect(Company.schema.authorizedShares.type).toBe('number');
        });
    });

    describe('Enum Exports', () => {
        it('should export ENTITY_TYPES array', () => {
            expect(Company.ENTITY_TYPES).toBeDefined();
            expect(Array.isArray(Company.ENTITY_TYPES)).toBe(true);
            expect(Company.ENTITY_TYPES).toContain('C_CORP');
            expect(Company.ENTITY_TYPES).toContain('S_CORP');
            expect(Company.ENTITY_TYPES).toContain('LLC');
            expect(Company.ENTITY_TYPES).toContain('LP');
            expect(Company.ENTITY_TYPES).toContain('DELAWARE_C_CORP');
            expect(Company.ENTITY_TYPES).toContain('DELAWARE_LLC');
        });

        it('should export US_STATES array with all 50 states and territories', () => {
            expect(Company.US_STATES).toBeDefined();
            expect(Array.isArray(Company.US_STATES)).toBe(true);
            expect(Company.US_STATES.length).toBeGreaterThanOrEqual(50);
            // Check some key states
            expect(Company.US_STATES).toContain('CA');
            expect(Company.US_STATES).toContain('DE');
            expect(Company.US_STATES).toContain('NY');
            expect(Company.US_STATES).toContain('TX');
            expect(Company.US_STATES).toContain('FL');
            // Check DC and territories
            expect(Company.US_STATES).toContain('DC');
            expect(Company.US_STATES).toContain('PR');
        });

        it('should export TAX_STATUS_TYPES array', () => {
            expect(Company.TAX_STATUS_TYPES).toBeDefined();
            expect(Array.isArray(Company.TAX_STATUS_TYPES)).toBe(true);
            expect(Company.TAX_STATUS_TYPES).toEqual(['ACTIVE', 'SUSPENDED', 'DISSOLVED']);
        });

        it('should export FISCAL_YEAR_END_MONTHS array', () => {
            expect(Company.FISCAL_YEAR_END_MONTHS).toBeDefined();
            expect(Array.isArray(Company.FISCAL_YEAR_END_MONTHS)).toBe(true);
            expect(Company.FISCAL_YEAR_END_MONTHS.length).toBe(12);
            expect(Company.FISCAL_YEAR_END_MONTHS[0]).toBe('JANUARY');
            expect(Company.FISCAL_YEAR_END_MONTHS[11]).toBe('DECEMBER');
        });
    });

    describe('Validation Helper Methods', () => {
        describe('isValidEntityType', () => {
            it('should return true for valid entity types', () => {
                expect(Company.isValidEntityType('C_CORP')).toBe(true);
                expect(Company.isValidEntityType('S_CORP')).toBe(true);
                expect(Company.isValidEntityType('LLC')).toBe(true);
                expect(Company.isValidEntityType('LP')).toBe(true);
                expect(Company.isValidEntityType('DELAWARE_C_CORP')).toBe(true);
                expect(Company.isValidEntityType('DELAWARE_LLC')).toBe(true);
            });

            it('should return false for invalid entity types', () => {
                expect(Company.isValidEntityType('INVALID')).toBe(false);
                expect(Company.isValidEntityType('c_corp')).toBe(false); // case sensitive
                expect(Company.isValidEntityType('')).toBe(false);
                expect(Company.isValidEntityType(null)).toBe(false);
                expect(Company.isValidEntityType(undefined)).toBe(false);
            });
        });

        describe('isValidState', () => {
            it('should return true for valid US state codes', () => {
                expect(Company.isValidState('CA')).toBe(true);
                expect(Company.isValidState('DE')).toBe(true);
                expect(Company.isValidState('NY')).toBe(true);
                expect(Company.isValidState('TX')).toBe(true);
                expect(Company.isValidState('DC')).toBe(true);
            });

            it('should return false for invalid state codes', () => {
                expect(Company.isValidState('XX')).toBe(false);
                expect(Company.isValidState('California')).toBe(false);
                expect(Company.isValidState('ca')).toBe(false); // case sensitive
                expect(Company.isValidState('')).toBe(false);
                expect(Company.isValidState(null)).toBe(false);
            });
        });

        describe('isValidTaxStatus', () => {
            it('should return true for valid tax statuses', () => {
                expect(Company.isValidTaxStatus('ACTIVE')).toBe(true);
                expect(Company.isValidTaxStatus('SUSPENDED')).toBe(true);
                expect(Company.isValidTaxStatus('DISSOLVED')).toBe(true);
            });

            it('should return false for invalid tax statuses', () => {
                expect(Company.isValidTaxStatus('INACTIVE')).toBe(false);
                expect(Company.isValidTaxStatus('active')).toBe(false); // case sensitive
                expect(Company.isValidTaxStatus('')).toBe(false);
                expect(Company.isValidTaxStatus(null)).toBe(false);
            });
        });

        describe('isValidFiscalYearEnd', () => {
            it('should return true for valid months', () => {
                expect(Company.isValidFiscalYearEnd('JANUARY')).toBe(true);
                expect(Company.isValidFiscalYearEnd('JUNE')).toBe(true);
                expect(Company.isValidFiscalYearEnd('DECEMBER')).toBe(true);
            });

            it('should return false for invalid months', () => {
                expect(Company.isValidFiscalYearEnd('INVALID')).toBe(false);
                expect(Company.isValidFiscalYearEnd('january')).toBe(false); // case sensitive
                expect(Company.isValidFiscalYearEnd('Jan')).toBe(false);
                expect(Company.isValidFiscalYearEnd('')).toBe(false);
            });
        });
    });

    describe('Company Creation with Legal Structure Fields', () => {
        it('should create company with all legal structure fields', async () => {
            const companyData = {
                companyId: 'comp-409a-001',
                CompanyName: 'Tech Startup Inc.',
                CompanyType: 'startup',
                RegisteredAddress: '123 Innovation Way, San Francisco, CA 94107',
                TaxID: '94-1234567',
                corporationDate: new Date('2020-01-15'),
                entityType: 'DELAWARE_C_CORP',
                stateOfIncorporation: 'DE',
                dateOfIncorporation: new Date('2020-01-10'),
                qualifiedSmallBusiness: true,
                section1202Eligible: true,
                taxStatus: 'ACTIVE',
                registeredAgentName: 'Delaware Registered Agents LLC',
                registeredAgentAddress: {
                    street: '100 Corporate Blvd',
                    city: 'Wilmington',
                    state: 'DE',
                    zip: '19801'
                },
                ein: '94-1234567',
                fiscalYearEnd: 'DECEMBER',
                authorizedShares: 10000000
            };

            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'new-id', row_data: companyData }]
            });

            const result = await Company.create(companyData);

            expect(zerodbService.insertRow).toHaveBeenCalled();
            expect(result.entityType).toBe('DELAWARE_C_CORP');
            expect(result.stateOfIncorporation).toBe('DE');
            expect(result.qualifiedSmallBusiness).toBe(true);
            expect(result.section1202Eligible).toBe(true);
            expect(result.taxStatus).toBe('ACTIVE');
            expect(result.registeredAgentName).toBe('Delaware Registered Agents LLC');
            expect(result.registeredAgentAddress.city).toBe('Wilmington');
            expect(result.fiscalYearEnd).toBe('DECEMBER');
            expect(result.authorizedShares).toBe(10000000);
        });

        it('should create company without optional legal structure fields', async () => {
            const companyData = {
                companyId: 'comp-basic-001',
                CompanyName: 'Basic Corp',
                CompanyType: 'corporation',
                RegisteredAddress: '456 Main St',
                TaxID: '12-3456789',
                corporationDate: new Date()
            };

            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'basic-id', row_data: companyData }]
            });

            const result = await Company.create(companyData);

            expect(zerodbService.insertRow).toHaveBeenCalled();
            expect(result.entityType).toBeUndefined();
            expect(result.stateOfIncorporation).toBeUndefined();
        });
    });

    describe('Query Methods for Legal Structure', () => {
        describe('findByEntityType', () => {
            it('should find companies by entity type', async () => {
                const mockCompanies = [
                    { companyId: 'comp-1', entityType: 'C_CORP' },
                    { companyId: 'comp-2', entityType: 'C_CORP' }
                ];

                zerodbService.queryTable.mockResolvedValueOnce({
                    data: mockCompanies.map(c => ({ row_data: c }))
                });

                const result = await Company.findByEntityType('C_CORP');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'companies',
                    expect.objectContaining({
                        filter: { entityType: 'C_CORP' }
                    })
                );
                expect(result.length).toBe(2);
            });
        });

        describe('findByStateOfIncorporation', () => {
            it('should find companies by state', async () => {
                const mockCompanies = [
                    { companyId: 'comp-1', stateOfIncorporation: 'DE' }
                ];

                zerodbService.queryTable.mockResolvedValueOnce({
                    data: mockCompanies.map(c => ({ row_data: c }))
                });

                const result = await Company.findByStateOfIncorporation('DE');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'companies',
                    expect.objectContaining({
                        filter: { stateOfIncorporation: 'DE' }
                    })
                );
                expect(result.length).toBe(1);
            });
        });

        describe('findQSBSEligible', () => {
            it('should find QSBS eligible companies', async () => {
                const mockCompanies = [
                    { companyId: 'comp-1', qualifiedSmallBusiness: true }
                ];

                zerodbService.queryTable.mockResolvedValueOnce({
                    data: mockCompanies.map(c => ({ row_data: c }))
                });

                const result = await Company.findQSBSEligible();

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'companies',
                    expect.objectContaining({
                        filter: { qualifiedSmallBusiness: true }
                    })
                );
                expect(result.length).toBe(1);
            });
        });

        describe('findSection1202Eligible', () => {
            it('should find Section 1202 eligible companies', async () => {
                const mockCompanies = [
                    { companyId: 'comp-1', section1202Eligible: true }
                ];

                zerodbService.queryTable.mockResolvedValueOnce({
                    data: mockCompanies.map(c => ({ row_data: c }))
                });

                const result = await Company.findSection1202Eligible();

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'companies',
                    expect.objectContaining({
                        filter: { section1202Eligible: true }
                    })
                );
                expect(result.length).toBe(1);
            });
        });

        describe('findByTaxStatus', () => {
            it('should find companies by tax status', async () => {
                const mockCompanies = [
                    { companyId: 'comp-1', taxStatus: 'ACTIVE' }
                ];

                zerodbService.queryTable.mockResolvedValueOnce({
                    data: mockCompanies.map(c => ({ row_data: c }))
                });

                const result = await Company.findByTaxStatus('ACTIVE');

                expect(zerodbService.queryTable).toHaveBeenCalledWith(
                    'companies',
                    expect.objectContaining({
                        filter: { taxStatus: 'ACTIVE' }
                    })
                );
                expect(result.length).toBe(1);
            });
        });
    });

    describe('updateLegalStructure Method', () => {
        it('should update legal structure fields', async () => {
            const companyId = 'comp-update-001';
            const legalStructureData = {
                entityType: 'S_CORP',
                qualifiedSmallBusiness: true,
                section1202Eligible: false,
                authorizedShares: 5000000
            };

            const updatedCompany = {
                companyId,
                ...legalStructureData
            };

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: { companyId } }]
            });

            zerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: updatedCompany }]
            });

            const result = await Company.updateLegalStructure(companyId, legalStructureData);

            expect(zerodbService.updateRows).toHaveBeenCalled();
        });

        it('should filter out non-allowed fields', async () => {
            const companyId = 'comp-filter-001';
            const dataWithInvalidFields = {
                entityType: 'LLC',
                CompanyName: 'Should Not Update', // Not a legal structure field
                invalidField: 'Should Be Ignored'
            };

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: { companyId } }]
            });

            zerodbService.updateRows.mockResolvedValueOnce({ modified_count: 1 });

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: { companyId, entityType: 'LLC' } }]
            });

            await Company.updateLegalStructure(companyId, dataWithInvalidFields);

            // Verify updateRows was called without the invalid fields
            const updateCall = zerodbService.updateRows.mock.calls[0];
            expect(updateCall[1].update.$set).not.toHaveProperty('CompanyName');
            expect(updateCall[1].update.$set).not.toHaveProperty('invalidField');
            expect(updateCall[1].update.$set.entityType).toBe('LLC');
        });
    });

    describe('isDelawareIncorporated Method', () => {
        it('should return true for DE state of incorporation', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: { companyId: 'comp-de-001', stateOfIncorporation: 'DE' } }]
            });

            const result = await Company.isDelawareIncorporated('comp-de-001');

            expect(result).toBe(true);
        });

        it('should return true for DELAWARE_C_CORP entity type', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: { companyId: 'comp-de-002', entityType: 'DELAWARE_C_CORP' } }]
            });

            const result = await Company.isDelawareIncorporated('comp-de-002');

            expect(result).toBe(true);
        });

        it('should return true for DELAWARE_LLC entity type', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: { companyId: 'comp-de-003', entityType: 'DELAWARE_LLC' } }]
            });

            const result = await Company.isDelawareIncorporated('comp-de-003');

            expect(result).toBe(true);
        });

        it('should return false for non-Delaware company', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: { companyId: 'comp-ca-001', stateOfIncorporation: 'CA', entityType: 'C_CORP' } }]
            });

            const result = await Company.isDelawareIncorporated('comp-ca-001');

            expect(result).toBe(false);
        });

        it('should return false for non-existent company', async () => {
            zerodbService.queryTable.mockResolvedValueOnce({
                data: []
            });

            const result = await Company.isDelawareIncorporated('non-existent');

            expect(result).toBe(false);
        });
    });

    describe('409A Compliance Scenarios', () => {
        it('should support typical 409A valuation company setup', async () => {
            const valuationReadyCompany = {
                companyId: 'comp-409a-ready',
                CompanyName: 'Valuation Ready Startup',
                CompanyType: 'startup',
                RegisteredAddress: '1 Startup Lane, Palo Alto, CA 94301',
                TaxID: '94-7654321',
                corporationDate: new Date('2022-03-15'),
                entityType: 'DELAWARE_C_CORP',
                stateOfIncorporation: 'DE',
                dateOfIncorporation: new Date('2022-03-10'),
                qualifiedSmallBusiness: true,
                section1202Eligible: true,
                taxStatus: 'ACTIVE',
                registeredAgentName: 'Corporation Trust Company',
                registeredAgentAddress: {
                    street: '1209 Orange Street',
                    city: 'Wilmington',
                    state: 'DE',
                    zip: '19801'
                },
                ein: '94-7654321',
                fiscalYearEnd: 'DECEMBER',
                authorizedShares: 50000000
            };

            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: '409a-id', row_data: valuationReadyCompany }]
            });

            const result = await Company.create(valuationReadyCompany);

            // Verify all 409A-relevant fields are present
            expect(result.entityType).toBe('DELAWARE_C_CORP');
            expect(result.qualifiedSmallBusiness).toBe(true);
            expect(result.section1202Eligible).toBe(true);
            expect(result.authorizedShares).toBe(50000000);
            expect(result.fiscalYearEnd).toBe('DECEMBER');
        });

        it('should track dissolved companies for historical 409A records', async () => {
            const mockCompany = {
                companyId: 'comp-dissolved-001',
                CompanyName: 'Former Startup LLC',
                taxStatus: 'DISSOLVED',
                entityType: 'LLC',
                stateOfIncorporation: 'CA'
            };

            zerodbService.queryTable.mockResolvedValueOnce({
                data: [{ row_data: mockCompany }]
            });

            const result = await Company.findByTaxStatus('DISSOLVED');

            expect(result[0].taxStatus).toBe('DISSOLVED');
            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'companies',
                expect.objectContaining({
                    filter: { taxStatus: 'DISSOLVED' }
                })
            );
        });

        it('should support S-Corp election tracking', async () => {
            const sCorpCompany = {
                companyId: 'comp-scorp-001',
                CompanyName: 'S-Corp Election Company',
                CompanyType: 'corporation',
                RegisteredAddress: '789 Main St, Austin, TX 78701',
                TaxID: '75-1234567',
                corporationDate: new Date('2021-06-01'),
                entityType: 'S_CORP',
                stateOfIncorporation: 'TX',
                dateOfIncorporation: new Date('2021-06-01'),
                qualifiedSmallBusiness: false,
                section1202Eligible: false, // S-Corps not eligible for 1202
                taxStatus: 'ACTIVE',
                fiscalYearEnd: 'DECEMBER',
                authorizedShares: 1000000
            };

            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'scorp-id', row_data: sCorpCompany }]
            });

            const result = await Company.create(sCorpCompany);

            expect(result.entityType).toBe('S_CORP');
            expect(result.section1202Eligible).toBe(false);
        });
    });

    describe('Registered Agent Address Validation', () => {
        it('should store complete registered agent address', async () => {
            const companyWithAgent = {
                companyId: 'comp-agent-001',
                CompanyName: 'Agent Test Corp',
                CompanyType: 'corporation',
                RegisteredAddress: '123 Main St',
                TaxID: '12-3456789',
                corporationDate: new Date(),
                registeredAgentName: 'National Registered Agents, Inc.',
                registeredAgentAddress: {
                    street: '160 Greentree Drive, Suite 101',
                    city: 'Dover',
                    state: 'DE',
                    zip: '19904'
                }
            };

            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'agent-id', row_data: companyWithAgent }]
            });

            const result = await Company.create(companyWithAgent);

            expect(result.registeredAgentName).toBe('National Registered Agents, Inc.');
            expect(result.registeredAgentAddress.street).toBe('160 Greentree Drive, Suite 101');
            expect(result.registeredAgentAddress.city).toBe('Dover');
            expect(result.registeredAgentAddress.state).toBe('DE');
            expect(result.registeredAgentAddress.zip).toBe('19904');
        });
    });

    describe('Authorized Shares', () => {
        it('should accept typical startup authorized share amounts', async () => {
            const shareAmounts = [
                10000000,    // 10 million
                50000000,    // 50 million
                100000000,   // 100 million
                1000000000   // 1 billion
            ];

            for (const shares of shareAmounts) {
                const companyData = {
                    companyId: `comp-shares-${shares}`,
                    CompanyName: 'Shares Test Corp',
                    CompanyType: 'startup',
                    RegisteredAddress: '123 Main St',
                    TaxID: '12-3456789',
                    corporationDate: new Date(),
                    authorizedShares: shares
                };

                zerodbService.insertRow.mockResolvedValueOnce({
                    data: [{ row_id: `shares-${shares}`, row_data: companyData }]
                });

                const result = await Company.create(companyData);
                expect(result.authorizedShares).toBe(shares);
            }
        });
    });

    describe('EIN (Employer Identification Number)', () => {
        it('should store EIN with encryption flag', () => {
            expect(Company.schema.ein.encrypted).toBe(true);
        });

        it('should accept valid EIN formats', async () => {
            const einFormats = [
                '12-3456789',
                '94-1234567',
                '00-0000000'
            ];

            for (const ein of einFormats) {
                const companyData = {
                    companyId: `comp-ein-${ein.replace('-', '')}`,
                    CompanyName: 'EIN Test Corp',
                    CompanyType: 'corporation',
                    RegisteredAddress: '123 Main St',
                    TaxID: '12-3456789',
                    corporationDate: new Date(),
                    ein: ein
                };

                zerodbService.insertRow.mockResolvedValueOnce({
                    data: [{ row_id: `ein-${ein}`, row_data: companyData }]
                });

                const result = await Company.create(companyData);
                expect(result.ein).toBe(ein);
            }
        });
    });

    describe('Fiscal Year End', () => {
        it('should accept all valid months', async () => {
            const months = Company.FISCAL_YEAR_END_MONTHS;

            for (const month of months) {
                expect(Company.isValidFiscalYearEnd(month)).toBe(true);
            }
        });

        it('should store fiscal year end correctly', async () => {
            const companyData = {
                companyId: 'comp-fy-june',
                CompanyName: 'June Fiscal Year Corp',
                CompanyType: 'corporation',
                RegisteredAddress: '123 Main St',
                TaxID: '12-3456789',
                corporationDate: new Date(),
                fiscalYearEnd: 'JUNE'
            };

            zerodbService.insertRow.mockResolvedValueOnce({
                data: [{ row_id: 'fy-june', row_data: companyData }]
            });

            const result = await Company.create(companyData);
            expect(result.fiscalYearEnd).toBe('JUNE');
        });
    });
});
