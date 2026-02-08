/**
 * Comprehensive ShareClass Model Unit Tests
 * Tests for the enhanced ShareClass model with 409A compliance fields
 *
 * Issue #320: Enhance ShareClass model with 409A-required fields
 */

// Mock ZeroDB base model before requiring ShareClass
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
            findOneAndUpdate: jest.fn(async (query, update) => ({ ...query, ...update })),
            findByIdAndUpdate: jest.fn(async (id, update) => ({ _id: id, ...update })),
            deleteOne: jest.fn(async (query) => ({ deletedCount: 1 })),
            deleteMany: jest.fn(async (query) => ({ deletedCount: 1 })),
            findOneAndDelete: jest.fn(async (query) => query),
            findByIdAndDelete: jest.fn(async (id) => ({ _id: id })),
            countDocuments: jest.fn(async () => mockData.length),
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

const ShareClass = require('../../../models/ShareClass');

describe('ShareClass Model - 409A Enhanced', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema Structure', () => {
        it('should have all 409A-required fields in schema', () => {
            const schema = ShareClass.schema;

            // Core identifiers
            expect(schema).toHaveProperty('shareClassId');
            expect(schema).toHaveProperty('companyId');
            expect(schema).toHaveProperty('name');
            expect(schema).toHaveProperty('description');

            // Classification
            expect(schema).toHaveProperty('classType');
            expect(schema).toHaveProperty('subType');

            // Pricing
            expect(schema).toHaveProperty('parValue');
            expect(schema).toHaveProperty('pricePerShare');
            expect(schema).toHaveProperty('votesPerShare');

            // Share counts
            expect(schema).toHaveProperty('authorizedShares');
            expect(schema).toHaveProperty('outstandingShares');
            expect(schema).toHaveProperty('issuedShares');
            expect(schema).toHaveProperty('reservedShares');
            expect(schema).toHaveProperty('dilutedShares');

            // Preferred terms
            expect(schema).toHaveProperty('liquidationPreference');
            expect(schema).toHaveProperty('participatingPreferred');
            expect(schema).toHaveProperty('participationCap');
            expect(schema).toHaveProperty('conversionRatio');
            expect(schema).toHaveProperty('antidilutionProtection');
            expect(schema).toHaveProperty('dividendRate');
            expect(schema).toHaveProperty('cumulativeDividends');

            // Rights
            expect(schema).toHaveProperty('votingRights');
            expect(schema).toHaveProperty('preemptiveRights');
            expect(schema).toHaveProperty('redemptionRights');
            expect(schema).toHaveProperty('conversionRights');

            // Seniority
            expect(schema).toHaveProperty('seniorityRank');
            expect(schema).toHaveProperty('pariPassuGroup');
        });

        it('should expose CLASS_TYPES enum', () => {
            expect(ShareClass.CLASS_TYPES).toEqual(['common', 'preferred', 'restricted_common', 'founders']);
        });

        it('should expose ANTIDILUTION_TYPES enum', () => {
            expect(ShareClass.ANTIDILUTION_TYPES).toEqual(['none', 'full_ratchet', 'weighted_average', 'narrow_based']);
        });
    });

    describe('Create Method Validation', () => {
        const validData = {
            companyId: 'company_123',
            name: 'Series A Preferred',
            description: 'Series A preferred stock with 1x liquidation preference',
            amountRaised: 5000000,
            ownershipPercentage: 20,
            dilutedShares: 1000000,
            authorizedShares: 5000000
        };

        it('should create share class with all required fields', async () => {
            const result = await ShareClass.create(validData);

            expect(result).toHaveProperty('_id');
            expect(result).toHaveProperty('shareClassId');
            expect(result.companyId).toBe(validData.companyId);
            expect(result.name).toBe(validData.name);
            expect(result.description).toBe(validData.description);
        });

        it('should generate shareClassId if not provided', async () => {
            const result = await ShareClass.create(validData);

            expect(result.shareClassId).toMatch(/^sc_/);
        });

        it('should apply default values for new fields', async () => {
            const result = await ShareClass.create(validData);

            expect(result.classType).toBe('common');
            expect(result.parValue).toBe(0.001);
            expect(result.votesPerShare).toBe(1);
            expect(result.outstandingShares).toBe(0);
            expect(result.issuedShares).toBe(0);
            expect(result.reservedShares).toBe(0);
            expect(result.conversionRatio).toBe(1);
            expect(result.antidilutionProtection).toBe('none');
            expect(result.participatingPreferred).toBe(false);
            expect(result.cumulativeDividends).toBe(false);
            expect(result.votingRights).toBe(true);
            expect(result.preemptiveRights).toBe(false);
            expect(result.redemptionRights).toBe(false);
            expect(result.conversionRights).toBe(true);
            expect(result.seniorityRank).toBe(1);
        });

        it('should throw error when companyId is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.companyId;

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Company ID is required');
        });

        it('should throw error when name is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.name;

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Share class name is required');
        });

        it('should throw error when description is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.description;

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Description is required');
        });

        it('should throw error when amountRaised is negative', async () => {
            const invalidData = { ...validData, amountRaised: -1000 };

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Amount raised is required and cannot be negative');
        });

        it('should throw error when ownershipPercentage is out of range', async () => {
            const invalidData = { ...validData, ownershipPercentage: 150 };

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Ownership percentage must be between 0 and 100');
        });

        it('should throw error when dilutedShares is negative', async () => {
            const invalidData = { ...validData, dilutedShares: -100 };

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Diluted shares is required and cannot be negative');
        });

        it('should throw error when authorizedShares is negative', async () => {
            const invalidData = { ...validData, authorizedShares: -100 };

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Authorized shares is required and cannot be negative');
        });

        it('should throw error for invalid classType', async () => {
            const invalidData = { ...validData, classType: 'invalid' };

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Invalid class type');
        });

        it('should throw error for invalid antidilutionProtection', async () => {
            const invalidData = { ...validData, antidilutionProtection: 'invalid' };

            await expect(ShareClass.create(invalidData)).rejects.toThrow('Invalid antidilution protection');
        });

        it('should accept valid classType values', async () => {
            for (const classType of ShareClass.CLASS_TYPES) {
                const data = { ...validData, classType };
                const result = await ShareClass.create(data);
                expect(result.classType).toBe(classType);
            }
        });

        it('should accept valid antidilutionProtection values', async () => {
            for (const antidilution of ShareClass.ANTIDILUTION_TYPES) {
                const data = { ...validData, antidilutionProtection: antidilution };
                const result = await ShareClass.create(data);
                expect(result.antidilutionProtection).toBe(antidilution);
            }
        });
    });

    describe('Find Methods', () => {
        it('should have findByShareClassId method', () => {
            expect(typeof ShareClass.findByShareClassId).toBe('function');
        });

        it('should have findByCompany method', () => {
            expect(typeof ShareClass.findByCompany).toBe('function');
        });

        it('should have findByType method', () => {
            expect(typeof ShareClass.findByType).toBe('function');
        });

        it('should have findByName method', () => {
            expect(typeof ShareClass.findByName).toBe('function');
        });

        it('should have findPreferredByCompany method', () => {
            expect(typeof ShareClass.findPreferredByCompany).toBe('function');
        });

        it('should have search method', () => {
            expect(typeof ShareClass.search).toBe('function');
        });
    });

    describe('Conversion Rate Calculation', () => {
        it('should calculate conversion rate correctly', () => {
            const shareClass = {
                authorizedShares: 5000000,
                dilutedShares: 1000000
            };

            const rate = ShareClass.getConversionRate(shareClass);
            expect(rate).toBe(5);
        });

        it('should return 0 when dilutedShares is 0', () => {
            const shareClass = {
                authorizedShares: 5000000,
                dilutedShares: 0
            };

            const rate = ShareClass.getConversionRate(shareClass);
            expect(rate).toBe(0);
        });

        it('should handle 1:1 conversion rate', () => {
            const shareClass = {
                authorizedShares: 1000000,
                dilutedShares: 1000000
            };

            const rate = ShareClass.getConversionRate(shareClass);
            expect(rate).toBe(1);
        });

        it('should round fractional rates to 2 decimal places', () => {
            const shareClass = {
                authorizedShares: 10000000,
                dilutedShares: 3000000
            };

            const rate = ShareClass.getConversionRate(shareClass);
            expect(rate).toBe(3.33);
        });
    });

    describe('Liquidation Payout Calculation', () => {
        it('should calculate basic liquidation payout', () => {
            const shareClass = {
                pricePerShare: 10,
                liquidationPreference: 1,
                participatingPreferred: false
            };

            const result = ShareClass.calculateLiquidationPayout(shareClass, 1000000, 50000);

            expect(result.preferenceAmount).toBe(500000);
            expect(result.participationAmount).toBe(0);
            expect(result.totalPayout).toBe(500000);
            expect(result.payoutPerShare).toBe(10);
            expect(result.fullPreferencePaid).toBe(true);
        });

        it('should handle partial payout when proceeds are insufficient', () => {
            const shareClass = {
                pricePerShare: 10,
                liquidationPreference: 1,
                participatingPreferred: false
            };

            const result = ShareClass.calculateLiquidationPayout(shareClass, 300000, 50000);

            expect(result.preferenceAmount).toBe(300000);
            expect(result.totalPayout).toBe(300000);
            expect(result.fullPreferencePaid).toBe(false);
        });

        it('should calculate participating preferred payout', () => {
            const shareClass = {
                pricePerShare: 10,
                liquidationPreference: 1,
                participatingPreferred: true
            };

            const result = ShareClass.calculateLiquidationPayout(shareClass, 1000000, 50000);

            expect(result.preferenceAmount).toBe(500000);
            expect(result.participationAmount).toBe(500000); // Remaining proceeds
            expect(result.totalPayout).toBe(1000000);
        });

        it('should respect participation cap', () => {
            const shareClass = {
                pricePerShare: 10,
                liquidationPreference: 1,
                participatingPreferred: true,
                participationCap: 2 // 2x cap
            };

            const result = ShareClass.calculateLiquidationPayout(shareClass, 2000000, 50000);

            expect(result.preferenceAmount).toBe(500000);
            // Participation capped at 2x = 2 * 10 * 50000 = 1,000,000
            expect(result.participationAmount).toBe(1000000);
            expect(result.totalPayout).toBe(1500000);
        });

        it('should handle 2x liquidation preference', () => {
            const shareClass = {
                pricePerShare: 10,
                liquidationPreference: 2,
                participatingPreferred: false
            };

            const result = ShareClass.calculateLiquidationPayout(shareClass, 2000000, 50000);

            expect(result.preferenceAmount).toBe(1000000); // 2x preference
            expect(result.fullPreferencePaid).toBe(true);
        });

        it('should handle zero shares gracefully', () => {
            const shareClass = {
                pricePerShare: 10,
                liquidationPreference: 1,
                participatingPreferred: false
            };

            const result = ShareClass.calculateLiquidationPayout(shareClass, 1000000, 0);

            expect(result.preferenceAmount).toBe(0);
            expect(result.payoutPerShare).toBe(0);
        });

        it('should handle missing pricePerShare', () => {
            const shareClass = {
                liquidationPreference: 1,
                participatingPreferred: false
            };

            const result = ShareClass.calculateLiquidationPayout(shareClass, 1000000, 50000);

            expect(result.preferenceAmount).toBe(0);
            expect(result.fullPreferencePaid).toBe(true);
        });
    });

    describe('Validate Shares', () => {
        it('should return true when dilutedShares <= authorizedShares', () => {
            const shareClass = {
                dilutedShares: 100000,
                authorizedShares: 500000
            };

            expect(ShareClass.validateShares(shareClass)).toBe(true);
        });

        it('should return true when shares are equal', () => {
            const shareClass = {
                dilutedShares: 500000,
                authorizedShares: 500000
            };

            expect(ShareClass.validateShares(shareClass)).toBe(true);
        });

        it('should return false when dilutedShares > authorizedShares', () => {
            const shareClass = {
                dilutedShares: 600000,
                authorizedShares: 500000
            };

            expect(ShareClass.validateShares(shareClass)).toBe(false);
        });
    });

    describe('Share Class Types', () => {
        const baseData = {
            companyId: 'company_123',
            description: 'Test description',
            amountRaised: 0,
            ownershipPercentage: 10,
            dilutedShares: 100000,
            authorizedShares: 500000
        };

        it('should create common stock class', async () => {
            const result = await ShareClass.create({
                ...baseData,
                name: 'Common Stock',
                classType: 'common'
            });

            expect(result.classType).toBe('common');
        });

        it('should create preferred stock class with liquidation terms', async () => {
            const result = await ShareClass.create({
                ...baseData,
                name: 'Series A Preferred',
                classType: 'preferred',
                liquidationPreference: 1,
                participatingPreferred: false,
                antidilutionProtection: 'weighted_average',
                seniorityRank: 1
            });

            expect(result.classType).toBe('preferred');
            expect(result.liquidationPreference).toBe(1);
            expect(result.antidilutionProtection).toBe('weighted_average');
        });

        it('should create restricted common stock class', async () => {
            const result = await ShareClass.create({
                ...baseData,
                name: 'Restricted Common',
                classType: 'restricted_common'
            });

            expect(result.classType).toBe('restricted_common');
        });

        it('should create founders shares class', async () => {
            const result = await ShareClass.create({
                ...baseData,
                name: 'Founder Shares',
                classType: 'founders'
            });

            expect(result.classType).toBe('founders');
        });
    });

    describe('Preferred Terms', () => {
        const preferredData = {
            companyId: 'company_123',
            name: 'Series B Preferred',
            description: 'Series B with full terms',
            amountRaised: 10000000,
            ownershipPercentage: 25,
            dilutedShares: 2500000,
            authorizedShares: 3000000,
            classType: 'preferred'
        };

        it('should store all preferred terms correctly', async () => {
            const fullTerms = {
                ...preferredData,
                liquidationPreference: 2,
                participatingPreferred: true,
                participationCap: 3,
                conversionRatio: 1.5,
                antidilutionProtection: 'full_ratchet',
                dividendRate: 8,
                cumulativeDividends: true
            };

            const result = await ShareClass.create(fullTerms);

            expect(result.liquidationPreference).toBe(2);
            expect(result.participatingPreferred).toBe(true);
            expect(result.participationCap).toBe(3);
            expect(result.conversionRatio).toBe(1.5);
            expect(result.antidilutionProtection).toBe('full_ratchet');
            expect(result.dividendRate).toBe(8);
            expect(result.cumulativeDividends).toBe(true);
        });
    });

    describe('Rights Fields', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Test Share Class',
            description: 'Test description',
            amountRaised: 1000000,
            ownershipPercentage: 10,
            dilutedShares: 100000,
            authorizedShares: 500000
        };

        it('should store voting rights', async () => {
            const result = await ShareClass.create({
                ...baseData,
                votingRights: false
            });

            expect(result.votingRights).toBe(false);
        });

        it('should store preemptive rights', async () => {
            const result = await ShareClass.create({
                ...baseData,
                preemptiveRights: true
            });

            expect(result.preemptiveRights).toBe(true);
        });

        it('should store redemption rights', async () => {
            const result = await ShareClass.create({
                ...baseData,
                redemptionRights: true
            });

            expect(result.redemptionRights).toBe(true);
        });

        it('should store conversion rights', async () => {
            const result = await ShareClass.create({
                ...baseData,
                conversionRights: false
            });

            expect(result.conversionRights).toBe(false);
        });
    });

    describe('Seniority Fields', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Test Share Class',
            description: 'Test description',
            amountRaised: 1000000,
            ownershipPercentage: 10,
            dilutedShares: 100000,
            authorizedShares: 500000,
            classType: 'preferred'
        };

        it('should store seniority rank', async () => {
            const result = await ShareClass.create({
                ...baseData,
                seniorityRank: 2
            });

            expect(result.seniorityRank).toBe(2);
        });

        it('should store pari passu group', async () => {
            const result = await ShareClass.create({
                ...baseData,
                pariPassuGroup: 'series_a_group'
            });

            expect(result.pariPassuGroup).toBe('series_a_group');
        });
    });

    describe('Complex Cap Table Scenarios', () => {
        it('should handle complete startup cap table', async () => {
            const shareClasses = [];

            // Founders shares
            shareClasses.push(await ShareClass.create({
                companyId: 'startup_123',
                name: 'Founder Common',
                description: 'Founder shares',
                classType: 'founders',
                amountRaised: 0,
                ownershipPercentage: 40,
                dilutedShares: 4000000,
                authorizedShares: 5000000,
                parValue: 0.0001,
                votesPerShare: 10 // Super voting
            }));

            // Common stock
            shareClasses.push(await ShareClass.create({
                companyId: 'startup_123',
                name: 'Common Stock',
                description: 'Standard common shares',
                classType: 'common',
                amountRaised: 0,
                ownershipPercentage: 10,
                dilutedShares: 1000000,
                authorizedShares: 10000000,
                parValue: 0.0001,
                votesPerShare: 1
            }));

            // Series A
            shareClasses.push(await ShareClass.create({
                companyId: 'startup_123',
                name: 'Series A Preferred',
                description: 'Series A investment round',
                classType: 'preferred',
                amountRaised: 5000000,
                ownershipPercentage: 20,
                dilutedShares: 2000000,
                authorizedShares: 2500000,
                pricePerShare: 2.50,
                liquidationPreference: 1,
                participatingPreferred: false,
                antidilutionProtection: 'weighted_average',
                seniorityRank: 2
            }));

            // Series B
            shareClasses.push(await ShareClass.create({
                companyId: 'startup_123',
                name: 'Series B Preferred',
                description: 'Series B investment round',
                classType: 'preferred',
                amountRaised: 15000000,
                ownershipPercentage: 20,
                dilutedShares: 2000000,
                authorizedShares: 2500000,
                pricePerShare: 7.50,
                liquidationPreference: 1,
                participatingPreferred: true,
                participationCap: 3,
                antidilutionProtection: 'weighted_average',
                seniorityRank: 1 // Senior to Series A
            }));

            // Option pool
            shareClasses.push(await ShareClass.create({
                companyId: 'startup_123',
                name: 'Option Pool',
                description: 'Employee stock option pool',
                classType: 'common',
                amountRaised: 0,
                ownershipPercentage: 10,
                dilutedShares: 1000000,
                authorizedShares: 1500000,
                reservedShares: 500000
            }));

            // Verify all created correctly
            expect(shareClasses.length).toBe(5);

            // Check total ownership adds up to 100%
            const totalOwnership = shareClasses.reduce((sum, sc) => sum + sc.ownershipPercentage, 0);
            expect(totalOwnership).toBe(100);

            // Verify seniority order
            const preferred = shareClasses.filter(sc => sc.classType === 'preferred');
            expect(preferred[0].seniorityRank).toBe(2); // Series A
            expect(preferred[1].seniorityRank).toBe(1); // Series B is senior
        });
    });

    describe('Backward Compatibility', () => {
        it('should work with legacy data (missing new fields)', async () => {
            const legacyData = {
                companyId: 'legacy_company',
                shareClassId: 'sc_legacy_123',
                name: 'Legacy Common',
                description: 'Legacy share class without new fields',
                amountRaised: 0,
                ownershipPercentage: 50,
                dilutedShares: 5000000,
                authorizedShares: 10000000
            };

            const result = await ShareClass.create(legacyData);

            // Should apply defaults
            expect(result.classType).toBe('common');
            expect(result.parValue).toBe(0.001);
            expect(result.votesPerShare).toBe(1);
            expect(result.outstandingShares).toBe(0);
        });
    });

    describe('Base Model Methods', () => {
        it('should expose find method', () => {
            expect(typeof ShareClass.find).toBe('function');
        });

        it('should expose findOne method', () => {
            expect(typeof ShareClass.findOne).toBe('function');
        });

        it('should expose findById method', () => {
            expect(typeof ShareClass.findById).toBe('function');
        });

        it('should expose updateOne method', () => {
            expect(typeof ShareClass.updateOne).toBe('function');
        });

        it('should expose deleteOne method', () => {
            expect(typeof ShareClass.deleteOne).toBe('function');
        });

        it('should expose countDocuments method', () => {
            expect(typeof ShareClass.countDocuments).toBe('function');
        });

        it('should expose exists method', () => {
            expect(typeof ShareClass.exists).toBe('function');
        });
    });
});
