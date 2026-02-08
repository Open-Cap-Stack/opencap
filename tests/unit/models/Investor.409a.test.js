/**
 * Investor Model Unit Tests - 409A Enhanced
 * Issue #323: Enhance Investor model with 409A-required fields
 */

// Mock ZeroDB base model before requiring Investor
jest.mock('../../../models/base/ZeroDBModel', () => ({
    createModel: jest.fn((tableName, schema) => {
        const mockData = [];
        return {
            tableName,
            schema,
            create: jest.fn(async (data) => {
                const record = {
                    _id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    ...data,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                mockData.push(record);
                return record;
            }),
            find: jest.fn(async (query = {}) => {
                return mockData.filter(item => {
                    for (const key of Object.keys(query)) {
                        if (item[key] !== query[key]) return false;
                    }
                    return true;
                });
            }),
            findOne: jest.fn(async (query = {}) => {
                return mockData.find(item => {
                    for (const key of Object.keys(query)) {
                        if (item[key] !== query[key]) return false;
                    }
                    return true;
                }) || null;
            }),
            findById: jest.fn(async (id) => mockData.find(item => item._id === id) || null),
            updateOne: jest.fn(async (query, update) => ({ modifiedCount: 1 })),
            updateMany: jest.fn(async (query, update) => ({ modifiedCount: 1 })),
            findOneAndUpdate: jest.fn(async (query, update) => ({ ...query, ...update.$set })),
            findByIdAndUpdate: jest.fn(async (id, update) => ({ _id: id, ...update })),
            deleteOne: jest.fn(async (query) => ({ deletedCount: 1 })),
            deleteMany: jest.fn(async (query) => ({ deletedCount: 1 })),
            findOneAndDelete: jest.fn(async (query) => query),
            findByIdAndDelete: jest.fn(async (id) => ({ _id: id })),
            countDocuments: jest.fn(async (query) => {
                return mockData.filter(item => {
                    for (const key of Object.keys(query)) {
                        if (item[key] !== query[key]) return false;
                    }
                    return true;
                }).length;
            }),
            exists: jest.fn(async (query) => mockData.some(item => {
                for (const key of Object.keys(query)) {
                    if (item[key] !== query[key]) return false;
                }
                return true;
            })),
            distinct: jest.fn(async (field) => [...new Set(mockData.map(item => item[field]))]),
            aggregate: jest.fn(async () => []),
            _mockData: mockData,
            _clearMockData: () => mockData.length = 0
        };
    })
}));

const Investor = require('../../../models/Investor');

// Helper to generate unique test data
let testCounter = 0;
const getUniqueData = (base = {}) => ({
    companyId: `company_${++testCounter}`,
    name: `Test Investor ${testCounter}`,
    investorType: 'venture_capital',
    ...base
});

describe('Investor Model - 409A Enhanced', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        testCounter = Date.now(); // Reset with timestamp for uniqueness
    });

    describe('Schema Structure', () => {
        it('should have all 409A-required fields in schema', () => {
            const schema = Investor.schema;

            // Core identifiers
            expect(schema).toHaveProperty('investorId');
            expect(schema).toHaveProperty('companyId');

            // Identity & Contact
            expect(schema).toHaveProperty('name');
            expect(schema).toHaveProperty('email');
            expect(schema).toHaveProperty('phone');
            expect(schema).toHaveProperty('address');
            expect(schema).toHaveProperty('entityType');

            // Classification
            expect(schema).toHaveProperty('investorType');

            // Regulatory
            expect(schema).toHaveProperty('accreditedInvestor');
            expect(schema).toHaveProperty('accreditationMethod');
            expect(schema).toHaveProperty('accreditationVerifiedDate');
            expect(schema).toHaveProperty('qibStatus');

            // Board & Governance
            expect(schema).toHaveProperty('boardSeat');
            expect(schema).toHaveProperty('boardObserverRights');
            expect(schema).toHaveProperty('votingRights');

            // Rights Linkage
            expect(schema).toHaveProperty('investorRightsId');
            expect(schema).toHaveProperty('preferredTermsIds');

            // Multi-Round Tracking
            expect(schema).toHaveProperty('investments');
            expect(schema).toHaveProperty('totalInvested');
            expect(schema).toHaveProperty('totalShares');

            // Pro-rata rights
            expect(schema).toHaveProperty('proRataRights');
            expect(schema).toHaveProperty('majorInvestorThreshold');
            expect(schema).toHaveProperty('informationRights');
        });

        it('should expose expanded INVESTOR_TYPES enum', () => {
            expect(Investor.INVESTOR_TYPES).toContain('angel');
            expect(Investor.INVESTOR_TYPES).toContain('venture_capital');
            expect(Investor.INVESTOR_TYPES).toContain('private_equity');
            expect(Investor.INVESTOR_TYPES).toContain('family_office');
            expect(Investor.INVESTOR_TYPES).toContain('strategic');
            expect(Investor.INVESTOR_TYPES).toContain('institutional');
            expect(Investor.INVESTOR_TYPES).toContain('corporate');
            expect(Investor.INVESTOR_TYPES).toContain('crowdfunding');
            expect(Investor.INVESTOR_TYPES).toContain('employee');
            expect(Investor.INVESTOR_TYPES).toContain('founder');
        });

        it('should expose LEGACY_INVESTOR_TYPES for backward compatibility', () => {
            expect(Investor.LEGACY_INVESTOR_TYPES).toContain('Angel');
            expect(Investor.LEGACY_INVESTOR_TYPES).toContain('Venture Capital');
        });

        it('should expose ENTITY_TYPES enum', () => {
            expect(Investor.ENTITY_TYPES).toEqual(['individual', 'corporation', 'llc', 'partnership', 'trust', 'fund']);
        });

        it('should expose ACCREDITATION_METHODS enum', () => {
            expect(Investor.ACCREDITATION_METHODS).toEqual(['income', 'net_worth', 'professional', 'entity']);
        });
    });

    describe('Create Method Validation', () => {
        it('should create investor with all required fields', async () => {
            const data = getUniqueData({ name: 'Sequoia Capital' });
            const result = await Investor.create(data);

            expect(result).toHaveProperty('_id');
            expect(result).toHaveProperty('investorId');
            expect(result.companyId).toBe(data.companyId);
            expect(result.name).toBe(data.name);
            expect(result.investorType).toBe(data.investorType);
        });

        it('should generate investorId if not provided', async () => {
            const data = getUniqueData();
            const result = await Investor.create(data);
            expect(result.investorId).toMatch(/^inv_/);
        });

        it('should apply default values', async () => {
            const data = getUniqueData();
            const result = await Investor.create(data);

            expect(result.entityType).toBe('individual');
            expect(result.accreditedInvestor).toBe(false);
            expect(result.qibStatus).toBe(false);
            expect(result.boardSeat).toBe(false);
            expect(result.boardObserverRights).toBe(false);
            expect(result.votingRights).toBe(true);
            expect(result.investments).toEqual([]);
            expect(result.totalInvested).toBe(0);
            expect(result.totalShares).toBe(0);
            expect(result.proRataRights).toBe(false);
        });

        it('should throw error when companyId is missing', async () => {
            const invalidData = { name: 'Test', investorType: 'angel' };

            await expect(Investor.create(invalidData)).rejects.toThrow('companyId is required');
        });

        it('should throw error when name is missing', async () => {
            const invalidData = { companyId: 'company_123', investorType: 'angel' };

            await expect(Investor.create(invalidData)).rejects.toThrow('name is required');
        });

        it('should throw error when investorType is missing', async () => {
            const invalidData = { companyId: 'company_123', name: 'Test' };

            await expect(Investor.create(invalidData)).rejects.toThrow('investorType is required');
        });

        it('should throw error for invalid investorType', async () => {
            const invalidData = getUniqueData({ investorType: 'invalid' });

            await expect(Investor.create(invalidData)).rejects.toThrow('investorType must be one of');
        });

        it('should accept all new investor types', async () => {
            for (const investorType of Investor.INVESTOR_TYPES) {
                const data = getUniqueData({ investorType });
                const result = await Investor.create(data);
                expect(result.investorType).toBe(investorType);
            }
        });

        it('should accept legacy investor types', async () => {
            for (const investorType of Investor.LEGACY_INVESTOR_TYPES) {
                const data = getUniqueData({ investorType });
                const result = await Investor.create(data);
                expect(result.investorType).toBe(investorType);
            }
        });
    });

    describe('Find Methods', () => {
        it('should have findByInvestorId method', () => {
            expect(typeof Investor.findByInvestorId).toBe('function');
        });

        it('should have findByCompany method', () => {
            expect(typeof Investor.findByCompany).toBe('function');
        });

        it('should have findAccredited method', () => {
            expect(typeof Investor.findAccredited).toBe('function');
        });

        it('should have findBoardMembers method', () => {
            expect(typeof Investor.findBoardMembers).toBe('function');
        });

        it('should have findByType method', () => {
            expect(typeof Investor.findByType).toBe('function');
        });

        it('should have findByFundraisingRound method', () => {
            expect(typeof Investor.findByFundraisingRound).toBe('function');
        });

        it('should have findMajorInvestors method', () => {
            expect(typeof Investor.findMajorInvestors).toBe('function');
        });

        it('should have search method', () => {
            expect(typeof Investor.search).toBe('function');
        });
    });

    describe('Entity Types', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Test Investor',
            investorType: 'venture_capital'
        };

        it('should create individual investor', async () => {
            const result = await Investor.create({
                ...baseData,
                entityType: 'individual'
            });
            expect(result.entityType).toBe('individual');
        });

        it('should create corporation investor', async () => {
            const result = await Investor.create({
                ...baseData,
                entityType: 'corporation'
            });
            expect(result.entityType).toBe('corporation');
        });

        it('should create LLC investor', async () => {
            const result = await Investor.create({
                ...baseData,
                entityType: 'llc'
            });
            expect(result.entityType).toBe('llc');
        });

        it('should create partnership investor', async () => {
            const result = await Investor.create({
                ...baseData,
                entityType: 'partnership'
            });
            expect(result.entityType).toBe('partnership');
        });

        it('should create trust investor', async () => {
            const result = await Investor.create({
                ...baseData,
                entityType: 'trust'
            });
            expect(result.entityType).toBe('trust');
        });

        it('should create fund investor', async () => {
            const result = await Investor.create({
                ...baseData,
                entityType: 'fund'
            });
            expect(result.entityType).toBe('fund');
        });
    });

    describe('Accreditation Fields', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Accredited Investor',
            investorType: 'angel'
        };

        it('should store accredited investor status', async () => {
            const result = await Investor.create({
                ...baseData,
                accreditedInvestor: true
            });
            expect(result.accreditedInvestor).toBe(true);
        });

        it('should store accreditation method', async () => {
            const result = await Investor.create({
                ...baseData,
                accreditedInvestor: true,
                accreditationMethod: 'income'
            });
            expect(result.accreditationMethod).toBe('income');
        });

        it('should store accreditation verified date', async () => {
            const verifiedDate = new Date('2024-01-15');
            const result = await Investor.create({
                ...baseData,
                accreditedInvestor: true,
                accreditationVerifiedDate: verifiedDate
            });
            expect(result.accreditationVerifiedDate).toEqual(verifiedDate);
        });

        it('should store QIB status', async () => {
            const result = await Investor.create({
                ...baseData,
                qibStatus: true
            });
            expect(result.qibStatus).toBe(true);
        });
    });

    describe('Board & Governance Fields', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Board Investor',
            investorType: 'venture_capital'
        };

        it('should store board seat', async () => {
            const result = await Investor.create({
                ...baseData,
                boardSeat: true
            });
            expect(result.boardSeat).toBe(true);
        });

        it('should store board observer rights', async () => {
            const result = await Investor.create({
                ...baseData,
                boardObserverRights: true
            });
            expect(result.boardObserverRights).toBe(true);
        });

        it('should store voting rights', async () => {
            const result = await Investor.create({
                ...baseData,
                votingRights: false
            });
            expect(result.votingRights).toBe(false);
        });
    });

    describe('Rights Linkage', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Rights Investor',
            investorType: 'venture_capital'
        };

        it('should store investor rights ID', async () => {
            const result = await Investor.create({
                ...baseData,
                investorRightsId: 'rights_123'
            });
            expect(result.investorRightsId).toBe('rights_123');
        });

        it('should store preferred terms IDs', async () => {
            const result = await Investor.create({
                ...baseData,
                preferredTermsIds: ['terms_1', 'terms_2']
            });
            expect(result.preferredTermsIds).toEqual(['terms_1', 'terms_2']);
        });
    });

    describe('Multi-Round Tracking', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Multi-Round Investor',
            investorType: 'venture_capital'
        };

        it('should store investments array', async () => {
            const investments = [
                { roundId: 'round_1', amount: 1000000, sharesAcquired: 100000, pricePerShare: 10 },
                { roundId: 'round_2', amount: 2000000, sharesAcquired: 150000, pricePerShare: 13.33 }
            ];

            const result = await Investor.create({
                ...baseData,
                investments
            });

            expect(result.investments).toHaveLength(2);
            expect(result.investments[0].roundId).toBe('round_1');
        });

        it('should calculate total invested from investments', async () => {
            const investments = [
                { roundId: 'round_1', amount: 1000000, sharesAcquired: 100000 },
                { roundId: 'round_2', amount: 2000000, sharesAcquired: 150000 }
            ];

            const result = await Investor.create({
                ...baseData,
                investments
            });

            expect(result.totalInvested).toBe(3000000);
        });

        it('should calculate total shares from investments', async () => {
            const investments = [
                { roundId: 'round_1', amount: 1000000, sharesAcquired: 100000 },
                { roundId: 'round_2', amount: 2000000, sharesAcquired: 150000 }
            ];

            const result = await Investor.create({
                ...baseData,
                investments
            });

            expect(result.totalShares).toBe(250000);
        });
    });

    describe('Pro-Rata Rights', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Pro-Rata Investor',
            investorType: 'venture_capital'
        };

        it('should store pro-rata rights', async () => {
            const result = await Investor.create({
                ...baseData,
                proRataRights: true
            });
            expect(result.proRataRights).toBe(true);
        });

        it('should store major investor threshold', async () => {
            const result = await Investor.create({
                ...baseData,
                majorInvestorThreshold: 250000
            });
            expect(result.majorInvestorThreshold).toBe(250000);
        });

        it('should store information rights', async () => {
            const result = await Investor.create({
                ...baseData,
                informationRights: true
            });
            expect(result.informationRights).toBe(true);
        });

        it('should store co-sale rights', async () => {
            const result = await Investor.create({
                ...baseData,
                coSaleRights: true
            });
            expect(result.coSaleRights).toBe(true);
        });

        it('should store drag-along obligations', async () => {
            const result = await Investor.create({
                ...baseData,
                dragAlongObligations: true
            });
            expect(result.dragAlongObligations).toBe(true);
        });
    });

    describe('Backward Compatibility', () => {
        it('should work with legacy data structure', async () => {
            const legacyData = {
                investorId: 'inv_legacy_123',
                companyId: 'company_123',
                name: 'Legacy Investor',
                investorType: 'Angel', // Legacy type
                investmentAmount: 500000,
                equityPercentage: 5,
                relatedFundraisingRound: 'round_seed'
            };

            const result = await Investor.create(legacyData);

            expect(result.investorType).toBe('Angel');
            expect(result.investmentAmount).toBe(500000);
            expect(result.equityPercentage).toBe(5);
            expect(result.relatedFundraisingRound).toBe('round_seed');
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle complete VC investor scenario', async () => {
            const investor = await Investor.create({
                companyId: 'startup_123',
                name: 'Andreessen Horowitz',
                email: 'deals@a16z.com',
                entityType: 'fund',
                investorType: 'venture_capital',
                accreditedInvestor: true,
                accreditationMethod: 'entity',
                qibStatus: true,
                boardSeat: true,
                boardObserverRights: false,
                votingRights: true,
                investments: [
                    { roundId: 'series_a', amount: 5000000, sharesAcquired: 500000, pricePerShare: 10 },
                    { roundId: 'series_b', amount: 10000000, sharesAcquired: 400000, pricePerShare: 25 }
                ],
                proRataRights: true,
                majorInvestorThreshold: 1000000,
                informationRights: true,
                coSaleRights: true
            });

            expect(investor.entityType).toBe('fund');
            expect(investor.qibStatus).toBe(true);
            expect(investor.boardSeat).toBe(true);
            expect(investor.totalInvested).toBe(15000000);
            expect(investor.totalShares).toBe(900000);
            expect(investor.proRataRights).toBe(true);
        });

        it('should handle angel investor scenario', async () => {
            const investor = await Investor.create({
                companyId: 'startup_123',
                name: 'Jane Smith',
                email: 'jane@angel.com',
                entityType: 'individual',
                investorType: 'angel',
                accreditedInvestor: true,
                accreditationMethod: 'income',
                accreditationVerifiedDate: new Date('2024-01-01'),
                boardSeat: false,
                boardObserverRights: false,
                investments: [
                    { roundId: 'seed', amount: 50000, sharesAcquired: 50000, pricePerShare: 1 }
                ],
                proRataRights: true
            });

            expect(investor.entityType).toBe('individual');
            expect(investor.accreditedInvestor).toBe(true);
            expect(investor.totalInvested).toBe(50000);
        });
    });

    describe('Base Model Methods', () => {
        it('should expose find method', () => {
            expect(typeof Investor.find).toBe('function');
        });

        it('should expose findOne method', () => {
            expect(typeof Investor.findOne).toBe('function');
        });

        it('should expose countDocuments method', () => {
            expect(typeof Investor.countDocuments).toBe('function');
        });

        it('should expose updateByInvestorId method', () => {
            expect(typeof Investor.updateByInvestorId).toBe('function');
        });

        it('should expose deleteByInvestorId method', () => {
            expect(typeof Investor.deleteByInvestorId).toBe('function');
        });

        it('should expose addInvestment method', () => {
            expect(typeof Investor.addInvestment).toBe('function');
        });

        it('should expose getInvestmentSummary method', () => {
            expect(typeof Investor.getInvestmentSummary).toBe('function');
        });
    });
});
