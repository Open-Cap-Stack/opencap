/**
 * Stakeholder Model - 409A Enhancement Tests
 * Issue #324: Enhance Stakeholder model with holdings summary and equity linkage
 *
 * Tests for holdings summary, equity linkage, financial summary,
 * accreditation fields, and new methods.
 */

const Stakeholder = require('../../../models/Stakeholder');

// Mock the ZeroDB base model
jest.mock('../../../models/base/ZeroDBModel', () => ({
    createModel: jest.fn(() => {
        const mockData = [];

        return {
            create: jest.fn(async (data) => {
                const doc = { _id: `id_${Date.now()}_${Math.random()}`, ...data };
                mockData.push(doc);
                return doc;
            }),
            find: jest.fn(async (query = {}) => {
                return mockData.filter(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                });
            }),
            findOne: jest.fn(async (query = {}) => {
                return mockData.find(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                }) || null;
            }),
            findById: jest.fn(async (id) => {
                return mockData.find(doc => doc._id === id) || null;
            }),
            findOneAndUpdate: jest.fn(async (query, update) => {
                const doc = mockData.find(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (doc) {
                    Object.assign(doc, update);
                    return doc;
                }
                return null;
            }),
            updateOne: jest.fn(async (query, update) => {
                const doc = mockData.find(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (doc) {
                    if (update.$set) {
                        Object.assign(doc, update.$set);
                    } else {
                        Object.assign(doc, update);
                    }
                    return { modifiedCount: 1 };
                }
                return { modifiedCount: 0 };
            }),
            updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
            findByIdAndUpdate: jest.fn(async (id, update) => {
                const doc = mockData.find(d => d._id === id);
                if (doc) {
                    Object.assign(doc, update);
                    return doc;
                }
                return null;
            }),
            deleteOne: jest.fn(async (query) => {
                const index = mockData.findIndex(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (index >= 0) {
                    mockData.splice(index, 1);
                    return { deletedCount: 1 };
                }
                return { deletedCount: 0 };
            }),
            deleteMany: jest.fn(async () => ({ deletedCount: 0 })),
            findOneAndDelete: jest.fn(async (query) => {
                const index = mockData.findIndex(d => {
                    for (const [key, value] of Object.entries(query)) {
                        if (d[key] !== value) return false;
                    }
                    return true;
                });
                if (index >= 0) {
                    const [doc] = mockData.splice(index, 1);
                    return doc;
                }
                return null;
            }),
            findByIdAndDelete: jest.fn(async (id) => {
                const index = mockData.findIndex(d => d._id === id);
                if (index >= 0) {
                    const [doc] = mockData.splice(index, 1);
                    return doc;
                }
                return null;
            }),
            countDocuments: jest.fn(async (query = {}) => {
                return mockData.filter(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                }).length;
            }),
            exists: jest.fn(async (query) => {
                return mockData.some(doc => {
                    for (const [key, value] of Object.entries(query)) {
                        if (doc[key] !== value) return false;
                    }
                    return true;
                });
            }),
            distinct: jest.fn(async () => []),
            aggregate: jest.fn(async () => []),
            _mockData: mockData,
            _clearMockData: () => mockData.length = 0
        };
    })
}));

// Helper to generate unique test data
let testCounter = 0;
const getUniqueData = (base = {}) => ({
    companyId: `company_${++testCounter}`,
    name: `Test Stakeholder ${testCounter}`,
    email: `stakeholder${testCounter}@example.com`,
    role: 'employee',
    ...base
});

describe('Stakeholder Model - 409A Enhancements', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema and Enums', () => {
        it('should export STAKEHOLDER_TYPES enum', () => {
            expect(Stakeholder.STAKEHOLDER_TYPES).toEqual([
                'common', 'preferred', 'option', 'warrant', 'convertible', 'rsu', 'phantom'
            ]);
        });

        it('should export STAKEHOLDER_STATUS enum', () => {
            expect(Stakeholder.STAKEHOLDER_STATUS).toEqual([
                'active', 'inactive', 'pending', 'terminated', 'deceased'
            ]);
        });

        it('should export STAKEHOLDER_ROLES enum', () => {
            expect(Stakeholder.STAKEHOLDER_ROLES).toEqual([
                'founder', 'co_founder', 'employee', 'advisor', 'consultant', 'investor', 'board_member', 'service_provider', 'engineer', 'manager', 'venture_capitalist'
            ]);
        });

        it('should have schema with holdings summary fields', () => {
            const schema = Stakeholder.schema;
            expect(schema.totalGrantedShares).toBeDefined();
            expect(schema.totalVestedShares).toBeDefined();
            expect(schema.totalExercisedShares).toBeDefined();
            expect(schema.totalUnvestedShares).toBeDefined();
            expect(schema.totalForfeitedShares).toBeDefined();
        });

        it('should have schema with equity linkage fields', () => {
            const schema = Stakeholder.schema;
            expect(schema.equityGrantIds).toBeDefined();
            expect(schema.vestingScheduleIds).toBeDefined();
            expect(schema.exerciseRequestIds).toBeDefined();
        });

        it('should have schema with financial summary fields', () => {
            const schema = Stakeholder.schema;
            expect(schema.totalEquityValue).toBeDefined();
            expect(schema.totalExerciseCost).toBeDefined();
            expect(schema.weightedAverageStrikePrice).toBeDefined();
        });

        it('should have schema with accreditation fields', () => {
            const schema = Stakeholder.schema;
            expect(schema.accreditedInvestor).toBeDefined();
            expect(schema.insiderStatus).toBeDefined();
            expect(schema.affiliateStatus).toBeDefined();
        });
    });

    describe('create', () => {
        it('should create stakeholder with required fields', async () => {
            const data = getUniqueData();
            const stakeholder = await Stakeholder.create(data);

            expect(stakeholder).toBeDefined();
            expect(stakeholder.name).toBe(data.name);
            expect(stakeholder.email).toBe(data.email);
            expect(stakeholder.role).toBe(data.role);
            expect(stakeholder.companyId).toBe(data.companyId);
        });

        it('should generate stakeholderId if not provided', async () => {
            const data = getUniqueData();
            const stakeholder = await Stakeholder.create(data);

            expect(stakeholder.stakeholderId).toBeDefined();
            expect(stakeholder.stakeholderId).toMatch(/^stakeholder_/);
        });

        it('should use provided stakeholderId', async () => {
            const data = getUniqueData({ stakeholderId: 'custom_stakeholder_123' });
            const stakeholder = await Stakeholder.create(data);

            expect(stakeholder.stakeholderId).toBe('custom_stakeholder_123');
        });

        it('should set default values for holdings summary', async () => {
            const data = getUniqueData();
            const stakeholder = await Stakeholder.create(data);

            expect(stakeholder.totalGrantedShares).toBe(0);
            expect(stakeholder.totalVestedShares).toBe(0);
            expect(stakeholder.totalExercisedShares).toBe(0);
            expect(stakeholder.totalUnvestedShares).toBe(0);
            expect(stakeholder.totalForfeitedShares).toBe(0);
        });

        it('should set default values for equity linkage', async () => {
            const data = getUniqueData();
            const stakeholder = await Stakeholder.create(data);

            expect(stakeholder.equityGrantIds).toEqual([]);
            expect(stakeholder.vestingScheduleIds).toEqual([]);
            expect(stakeholder.exerciseRequestIds).toEqual([]);
        });

        it('should set default values for accreditation', async () => {
            const data = getUniqueData();
            const stakeholder = await Stakeholder.create(data);

            expect(stakeholder.accreditedInvestor).toBe(false);
            expect(stakeholder.insiderStatus).toBe(false);
            expect(stakeholder.affiliateStatus).toBe(false);
        });

        it('should throw error if companyId is missing', async () => {
            const data = {
                name: 'Test',
                email: 'test@example.com',
                role: 'employee'
            };

            await expect(Stakeholder.create(data))
                .rejects.toThrow('Company ID is required');
        });

        it('should throw error if name is missing', async () => {
            const data = {
                companyId: 'company_1',
                email: 'test@example.com',
                role: 'employee'
            };

            await expect(Stakeholder.create(data))
                .rejects.toThrow('Stakeholder name is required');
        });

        it('should throw error if email is missing', async () => {
            const data = {
                companyId: 'company_1',
                name: 'Test',
                role: 'employee'
            };

            await expect(Stakeholder.create(data))
                .rejects.toThrow('Email is required');
        });

        it('should throw error if role is missing', async () => {
            const data = {
                companyId: 'company_1',
                name: 'Test',
                email: 'test@example.com'
            };

            await expect(Stakeholder.create(data))
                .rejects.toThrow('Role is required');
        });

        it('should throw error for invalid role', async () => {
            const data = getUniqueData({ role: 'invalid_role' });

            await expect(Stakeholder.create(data))
                .rejects.toThrow(/Invalid role/);
        });

        it('should throw error for invalid type', async () => {
            const data = getUniqueData({ type: 'invalid_type' });

            await expect(Stakeholder.create(data))
                .rejects.toThrow(/Invalid stakeholder type/);
        });

        it('should throw error for invalid status', async () => {
            const data = getUniqueData({ status: 'invalid_status' });

            await expect(Stakeholder.create(data))
                .rejects.toThrow(/Invalid status/);
        });

        it('should accept valid type values', async () => {
            for (const type of Stakeholder.STAKEHOLDER_TYPES) {
                const data = getUniqueData({ type });
                const stakeholder = await Stakeholder.create(data);
                expect(stakeholder.type).toBe(type);
            }
        });

        it('should accept valid role values', async () => {
            for (const role of Stakeholder.STAKEHOLDER_ROLES) {
                const data = getUniqueData({ role });
                const stakeholder = await Stakeholder.create(data);
                expect(stakeholder.role).toBe(role);
            }
        });
    });

    describe('findByStakeholderId', () => {
        it('should find stakeholder by stakeholderId', async () => {
            const data = getUniqueData({ stakeholderId: 'find_test_1' });
            await Stakeholder.create(data);

            const found = await Stakeholder.findByStakeholderId('find_test_1');
            expect(found).toBeDefined();
            expect(found.stakeholderId).toBe('find_test_1');
        });

        it('should return null for non-existent stakeholder', async () => {
            const found = await Stakeholder.findByStakeholderId('non_existent');
            expect(found).toBeNull();
        });
    });

    describe('findByCompany', () => {
        it('should find all stakeholders for a company', async () => {
            const companyId = `company_findByCompany_${Date.now()}`;
            await Stakeholder.create(getUniqueData({ companyId, name: 'Employee 1' }));
            await Stakeholder.create(getUniqueData({ companyId, name: 'Employee 2' }));
            await Stakeholder.create(getUniqueData({ companyId: 'other_company', name: 'Other' }));

            const stakeholders = await Stakeholder.findByCompany(companyId);
            expect(stakeholders.length).toBe(2);
            expect(stakeholders.every(s => s.companyId === companyId)).toBe(true);
        });

        it('should return empty array for company with no stakeholders', async () => {
            const stakeholders = await Stakeholder.findByCompany('empty_company');
            expect(stakeholders).toEqual([]);
        });
    });

    describe('findByRole', () => {
        it('should find stakeholders by role', async () => {
            await Stakeholder.create(getUniqueData({ role: 'founder' }));
            await Stakeholder.create(getUniqueData({ role: 'founder' }));
            await Stakeholder.create(getUniqueData({ role: 'employee' }));

            const founders = await Stakeholder.findByRole('founder');
            expect(founders.length).toBeGreaterThanOrEqual(2);
            expect(founders.every(s => s.role === 'founder')).toBe(true);
        });

        it('should find stakeholders by role and company', async () => {
            const companyId = `company_role_${Date.now()}`;
            await Stakeholder.create(getUniqueData({ companyId, role: 'advisor' }));
            await Stakeholder.create(getUniqueData({ companyId, role: 'advisor' }));
            await Stakeholder.create(getUniqueData({ companyId: 'other', role: 'advisor' }));

            const advisors = await Stakeholder.findByRole('advisor', companyId);
            expect(advisors.length).toBe(2);
            expect(advisors.every(s => s.role === 'advisor' && s.companyId === companyId)).toBe(true);
        });
    });

    describe('findActiveByCompany', () => {
        it('should find only active stakeholders', async () => {
            const companyId = `company_active_${Date.now()}`;
            await Stakeholder.create(getUniqueData({ companyId, status: 'active' }));
            await Stakeholder.create(getUniqueData({ companyId, status: 'active' }));
            await Stakeholder.create(getUniqueData({ companyId, status: 'terminated' }));

            const active = await Stakeholder.findActiveByCompany(companyId);
            expect(active.length).toBe(2);
            expect(active.every(s => s.status === 'active')).toBe(true);
        });
    });

    describe('findInsidersAndAffiliates', () => {
        it('should find stakeholders with insider or affiliate status', async () => {
            const companyId = `company_insider_${Date.now()}`;
            await Stakeholder.create(getUniqueData({ companyId, insiderStatus: true }));
            await Stakeholder.create(getUniqueData({ companyId, affiliateStatus: true }));
            await Stakeholder.create(getUniqueData({ companyId, insiderStatus: false, affiliateStatus: false }));

            const insiders = await Stakeholder.findInsidersAndAffiliates(companyId);
            expect(insiders.length).toBe(2);
            expect(insiders.every(s => s.insiderStatus || s.affiliateStatus)).toBe(true);
        });
    });

    describe('findAccreditedInvestors', () => {
        it('should find accredited investor stakeholders', async () => {
            const companyId = `company_accredited_${Date.now()}`;
            await Stakeholder.create(getUniqueData({ companyId, role: 'investor', accreditedInvestor: true }));
            await Stakeholder.create(getUniqueData({ companyId, role: 'investor', accreditedInvestor: false }));
            await Stakeholder.create(getUniqueData({ companyId, role: 'employee', accreditedInvestor: true }));

            const accredited = await Stakeholder.findAccreditedInvestors(companyId);
            expect(accredited.length).toBe(1);
            expect(accredited[0].role).toBe('investor');
            expect(accredited[0].accreditedInvestor).toBe(true);
        });
    });

    describe('getHoldingsSummary', () => {
        it('should return holdings summary for stakeholder', async () => {
            const data = getUniqueData({
                stakeholderId: 'holdings_test_1',
                totalGrantedShares: 10000,
                totalVestedShares: 5000,
                totalExercisedShares: 2000,
                totalUnvestedShares: 5000,
                totalForfeitedShares: 0,
                totalEquityValue: 150000,
                totalExerciseCost: 10000,
                weightedAverageStrikePrice: 5,
                equityGrantIds: ['grant_1', 'grant_2'],
                vestingScheduleIds: ['schedule_1'],
                exerciseRequestIds: ['exercise_1']
            });
            await Stakeholder.create(data);

            const summary = await Stakeholder.getHoldingsSummary('holdings_test_1');

            expect(summary.stakeholderId).toBe('holdings_test_1');
            expect(summary.holdings.totalGrantedShares).toBe(10000);
            expect(summary.holdings.totalVestedShares).toBe(5000);
            expect(summary.holdings.totalExercisedShares).toBe(2000);
            expect(summary.financial.totalEquityValue).toBe(150000);
            expect(summary.financial.totalExerciseCost).toBe(10000);
            expect(summary.financial.weightedAverageStrikePrice).toBe(5);
            expect(summary.linkedGrants).toEqual(['grant_1', 'grant_2']);
            expect(summary.linkedVestingSchedules).toEqual(['schedule_1']);
        });

        it('should throw error for non-existent stakeholder', async () => {
            await expect(Stakeholder.getHoldingsSummary('non_existent'))
                .rejects.toThrow('Stakeholder not found');
        });

        it('should handle stakeholder with no holdings', async () => {
            const data = getUniqueData({ stakeholderId: 'empty_holdings' });
            await Stakeholder.create(data);

            const summary = await Stakeholder.getHoldingsSummary('empty_holdings');

            expect(summary.holdings.totalGrantedShares).toBe(0);
            expect(summary.holdings.totalVestedShares).toBe(0);
            expect(summary.financial.totalEquityValue).toBe(0);
            expect(summary.linkedGrants).toEqual([]);
        });
    });

    describe('refreshEquitySummary', () => {
        it('should calculate totals from grant data', async () => {
            const data = getUniqueData({ stakeholderId: 'refresh_test_1' });
            await Stakeholder.create(data);

            const grantData = {
                grants: [
                    { grantedShares: 5000, vestedShares: 2500, exercisedShares: 1000, unvestedShares: 2500, forfeitedShares: 0, strikePrice: 2 },
                    { grantedShares: 3000, vestedShares: 1500, exercisedShares: 500, unvestedShares: 1500, forfeitedShares: 0, strikePrice: 5 }
                ],
                currentFMV: 10
            };

            const updated = await Stakeholder.refreshEquitySummary('refresh_test_1', grantData);

            expect(updated.totalGrantedShares).toBe(8000);
            expect(updated.totalVestedShares).toBe(4000);
            expect(updated.totalExercisedShares).toBe(1500);
            expect(updated.totalUnvestedShares).toBe(4000);
            expect(updated.holdingsSummaryUpdatedAt).toBeDefined();
        });

        it('should calculate weighted average strike price', async () => {
            const data = getUniqueData({ stakeholderId: 'weighted_test' });
            await Stakeholder.create(data);

            const grantData = {
                grants: [
                    { grantedShares: 1000, vestedShares: 1000, exercisedShares: 0, strikePrice: 2 },
                    { grantedShares: 1000, vestedShares: 1000, exercisedShares: 0, strikePrice: 4 }
                ],
                currentFMV: 10
            };

            const updated = await Stakeholder.refreshEquitySummary('weighted_test', grantData);

            // (2*1000 + 4*1000) / 2000 = 3
            expect(updated.weightedAverageStrikePrice).toBe(3);
        });

        it('should calculate total exercise cost', async () => {
            const data = getUniqueData({ stakeholderId: 'exercise_cost_test' });
            await Stakeholder.create(data);

            const grantData = {
                grants: [
                    { grantedShares: 1000, vestedShares: 500, exercisedShares: 100, strikePrice: 5 }
                ],
                currentFMV: 10
            };

            const updated = await Stakeholder.refreshEquitySummary('exercise_cost_test', grantData);

            // Exercisable = 500 - 100 = 400, Cost = 400 * 5 = 2000
            expect(updated.totalExerciseCost).toBe(2000);
        });

        it('should calculate total equity value', async () => {
            const data = getUniqueData({ stakeholderId: 'equity_value_test' });
            await Stakeholder.create(data);

            const grantData = {
                grants: [
                    { grantedShares: 1000, vestedShares: 1000, exercisedShares: 0, strikePrice: 5 }
                ],
                currentFMV: 10
            };

            const updated = await Stakeholder.refreshEquitySummary('equity_value_test', grantData);

            // Value = (10 - 5) * 1000 = 5000
            expect(updated.totalEquityValue).toBe(5000);
        });

        it('should throw error for non-existent stakeholder', async () => {
            await expect(Stakeholder.refreshEquitySummary('non_existent', {}))
                .rejects.toThrow('Stakeholder not found');
        });

        it('should handle empty grant data', async () => {
            const data = getUniqueData({ stakeholderId: 'empty_grant_test' });
            await Stakeholder.create(data);

            const updated = await Stakeholder.refreshEquitySummary('empty_grant_test', {});

            expect(updated.totalGrantedShares).toBe(0);
            expect(updated.totalVestedShares).toBe(0);
            expect(updated.weightedAverageStrikePrice).toBe(0);
        });
    });

    describe('addEquityGrant', () => {
        it('should add grant ID to stakeholder', async () => {
            const data = getUniqueData({ stakeholderId: 'add_grant_test' });
            await Stakeholder.create(data);

            const updated = await Stakeholder.addEquityGrant('add_grant_test', 'grant_123');

            expect(updated.equityGrantIds).toContain('grant_123');
        });

        it('should not duplicate grant IDs', async () => {
            const data = getUniqueData({ stakeholderId: 'dup_grant_test', equityGrantIds: ['grant_123'] });
            await Stakeholder.create(data);

            const updated = await Stakeholder.addEquityGrant('dup_grant_test', 'grant_123');

            expect(updated.equityGrantIds.filter(id => id === 'grant_123').length).toBe(1);
        });

        it('should throw error for non-existent stakeholder', async () => {
            await expect(Stakeholder.addEquityGrant('non_existent', 'grant_1'))
                .rejects.toThrow('Stakeholder not found');
        });
    });

    describe('addVestingSchedule', () => {
        it('should add vesting schedule ID to stakeholder', async () => {
            const data = getUniqueData({ stakeholderId: 'add_vesting_test' });
            await Stakeholder.create(data);

            const updated = await Stakeholder.addVestingSchedule('add_vesting_test', 'schedule_123');

            expect(updated.vestingScheduleIds).toContain('schedule_123');
        });

        it('should not duplicate schedule IDs', async () => {
            const data = getUniqueData({ stakeholderId: 'dup_vesting_test', vestingScheduleIds: ['schedule_123'] });
            await Stakeholder.create(data);

            const updated = await Stakeholder.addVestingSchedule('dup_vesting_test', 'schedule_123');

            expect(updated.vestingScheduleIds.filter(id => id === 'schedule_123').length).toBe(1);
        });

        it('should throw error for non-existent stakeholder', async () => {
            await expect(Stakeholder.addVestingSchedule('non_existent', 'schedule_1'))
                .rejects.toThrow('Stakeholder not found');
        });
    });

    describe('updateAccreditation', () => {
        it('should update accreditation status', async () => {
            const data = getUniqueData({ stakeholderId: 'accred_update_test' });
            await Stakeholder.create(data);

            const updated = await Stakeholder.updateAccreditation('accred_update_test', {
                accreditedInvestor: true,
                insiderStatus: true,
                affiliateStatus: false
            });

            expect(updated.accreditedInvestor).toBe(true);
            expect(updated.insiderStatus).toBe(true);
            expect(updated.affiliateStatus).toBe(false);
        });

        it('should only update valid boolean fields', async () => {
            const data = getUniqueData({ stakeholderId: 'accred_valid_test' });
            await Stakeholder.create(data);

            const updated = await Stakeholder.updateAccreditation('accred_valid_test', {
                accreditedInvestor: true,
                invalidField: true,
                insiderStatus: 'not_boolean'
            });

            expect(updated.accreditedInvestor).toBe(true);
            expect(updated.invalidField).toBeUndefined();
        });

        it('should throw error for non-existent stakeholder', async () => {
            await expect(Stakeholder.updateAccreditation('non_existent', {}))
                .rejects.toThrow('Stakeholder not found');
        });
    });

    describe('getCapTableSummary', () => {
        it('should return cap table summary for company', async () => {
            const companyId = `company_captable_${Date.now()}`;
            await Stakeholder.create(getUniqueData({
                companyId,
                role: 'founder',
                status: 'active',
                totalGrantedShares: 5000,
                totalVestedShares: 5000,
                totalExercisedShares: 0
            }));
            await Stakeholder.create(getUniqueData({
                companyId,
                role: 'employee',
                status: 'active',
                totalGrantedShares: 1000,
                totalVestedShares: 500,
                totalExercisedShares: 100
            }));
            await Stakeholder.create(getUniqueData({
                companyId,
                role: 'employee',
                status: 'terminated',
                totalGrantedShares: 500,
                totalVestedShares: 250
            }));

            const summary = await Stakeholder.getCapTableSummary(companyId);

            expect(summary.companyId).toBe(companyId);
            expect(summary.totalStakeholders).toBe(2); // Only active
            expect(summary.totals.granted).toBe(6000);
            expect(summary.totals.vested).toBe(5500);
            expect(summary.byRole.founder.count).toBe(1);
            expect(summary.byRole.employee.count).toBe(1);
            expect(summary.stakeholders.length).toBe(2);
        });

        it('should handle company with no stakeholders', async () => {
            const summary = await Stakeholder.getCapTableSummary('empty_company');

            expect(summary.totalStakeholders).toBe(0);
            expect(summary.totals.granted).toBe(0);
            expect(summary.stakeholders).toEqual([]);
        });
    });

    describe('terminate', () => {
        it('should terminate stakeholder and forfeit unvested shares', async () => {
            const data = getUniqueData({
                stakeholderId: 'terminate_test',
                status: 'active',
                totalUnvestedShares: 5000,
                totalForfeitedShares: 0
            });
            await Stakeholder.create(data);

            const terminated = await Stakeholder.terminate('terminate_test');

            expect(terminated.status).toBe('terminated');
            expect(terminated.totalUnvestedShares).toBe(0);
            expect(terminated.totalForfeitedShares).toBe(5000);
            expect(terminated.terminationDate).toBeDefined();
        });

        it('should throw error if stakeholder already terminated', async () => {
            const data = getUniqueData({
                stakeholderId: 'already_terminated',
                status: 'terminated'
            });
            await Stakeholder.create(data);

            await expect(Stakeholder.terminate('already_terminated'))
                .rejects.toThrow('Stakeholder already terminated');
        });

        it('should throw error for non-existent stakeholder', async () => {
            await expect(Stakeholder.terminate('non_existent'))
                .rejects.toThrow('Stakeholder not found');
        });

        it('should accept custom termination date', async () => {
            const data = getUniqueData({
                stakeholderId: 'custom_date_terminate',
                status: 'active'
            });
            await Stakeholder.create(data);

            const terminationDate = new Date('2024-06-15');
            const terminated = await Stakeholder.terminate('custom_date_terminate', terminationDate);

            expect(terminated.terminationDate).toEqual(terminationDate);
        });
    });

    describe('Backward Compatibility', () => {
        it('should preserve legacy equity and shares fields', async () => {
            const data = getUniqueData({
                equity: '10%',
                shares: '100000',
                vestingSchedule: '4-year cliff'
            });
            const stakeholder = await Stakeholder.create(data);

            expect(stakeholder.equity).toBe('10%');
            expect(stakeholder.shares).toBe('100000');
            expect(stakeholder.vestingSchedule).toBe('4-year cliff');
        });

        it('should work with base model methods', async () => {
            const data = getUniqueData();
            const created = await Stakeholder.create(data);

            // Test find
            const found = await Stakeholder.find({ companyId: data.companyId });
            expect(found.length).toBeGreaterThanOrEqual(1);

            // Test countDocuments
            const count = await Stakeholder.countDocuments({ companyId: data.companyId });
            expect(count).toBeGreaterThanOrEqual(1);
        });
    });
});
