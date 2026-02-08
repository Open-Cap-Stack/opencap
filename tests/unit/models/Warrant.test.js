/**
 * Warrant Model Unit Tests
 * Issue #321: Add Warrant terms data model for 409A compliance
 */

// Mock ZeroDB base model before requiring Warrant
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
            findOneAndUpdate: jest.fn(async (query, update) => {
                const item = mockData.find(i => {
                    for (const key of Object.keys(query)) {
                        if (i[key] !== query[key]) return false;
                    }
                    return true;
                });
                if (item) {
                    Object.assign(item, update);
                    return item;
                }
                return { ...query, ...update };
            }),
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

const Warrant = require('../../../models/Warrant');

describe('Warrant Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema Structure', () => {
        it('should have all required fields in schema', () => {
            const schema = Warrant.schema;

            // Core identifiers
            expect(schema).toHaveProperty('warrantId');
            expect(schema).toHaveProperty('companyId');
            expect(schema).toHaveProperty('name');
            expect(schema).toHaveProperty('description');

            // Classification
            expect(schema).toHaveProperty('warrantType');
            expect(schema).toHaveProperty('status');

            // Linked entities
            expect(schema).toHaveProperty('shareClassId');
            expect(schema).toHaveProperty('investorId');
            expect(schema).toHaveProperty('financingRoundId');

            // Share terms
            expect(schema).toHaveProperty('numberOfShares');
            expect(schema).toHaveProperty('exercisedShares');
            expect(schema).toHaveProperty('remainingShares');

            // Pricing
            expect(schema).toHaveProperty('exercisePrice');
            expect(schema).toHaveProperty('purchasePrice');

            // Dates
            expect(schema).toHaveProperty('issueDate');
            expect(schema).toHaveProperty('expirationDate');
            expect(schema).toHaveProperty('vestingStartDate');
            expect(schema).toHaveProperty('vestingEndDate');

            // Vesting
            expect(schema).toHaveProperty('vestingSchedule');
            expect(schema).toHaveProperty('cliffMonths');
            expect(schema).toHaveProperty('totalVestingMonths');
            expect(schema).toHaveProperty('vestedPercentage');

            // Exercise mechanics
            expect(schema).toHaveProperty('cashlessExercise');
            expect(schema).toHaveProperty('partialExercise');
            expect(schema).toHaveProperty('transferable');
            expect(schema).toHaveProperty('automaticExercise');

            // Antidilution
            expect(schema).toHaveProperty('antidilutionProtection');
            expect(schema).toHaveProperty('adjustedExercisePrice');

            // 409A impact
            expect(schema).toHaveProperty('currentFMV');
            expect(schema).toHaveProperty('intrinsicValue');
            expect(schema).toHaveProperty('blackScholesValue');
            expect(schema).toHaveProperty('dilutiveImpact');
        });

        it('should expose WARRANT_TYPES enum', () => {
            expect(Warrant.WARRANT_TYPES).toEqual(['penny', 'standard', 'participating', 'coverage']);
        });

        it('should expose WARRANT_STATUS enum', () => {
            expect(Warrant.WARRANT_STATUS).toEqual(['outstanding', 'exercised', 'expired', 'cancelled', 'partially_exercised']);
        });

        it('should expose ANTIDILUTION_TYPES enum', () => {
            expect(Warrant.ANTIDILUTION_TYPES).toEqual(['none', 'full_ratchet', 'weighted_average', 'narrow_based']);
        });
    });

    describe('Create Method Validation', () => {
        const validData = {
            companyId: 'company_123',
            name: 'Series A Warrant',
            numberOfShares: 100000,
            exercisePrice: 1.50,
            issueDate: new Date('2024-01-01'),
            expirationDate: new Date('2034-01-01')
        };

        it('should create warrant with all required fields', async () => {
            const result = await Warrant.create(validData);

            expect(result).toHaveProperty('_id');
            expect(result).toHaveProperty('warrantId');
            expect(result.companyId).toBe(validData.companyId);
            expect(result.name).toBe(validData.name);
            expect(result.numberOfShares).toBe(validData.numberOfShares);
            expect(result.exercisePrice).toBe(validData.exercisePrice);
        });

        it('should generate warrantId if not provided', async () => {
            const result = await Warrant.create(validData);
            expect(result.warrantId).toMatch(/^wrt_/);
        });

        it('should apply default values', async () => {
            const result = await Warrant.create(validData);

            expect(result.warrantType).toBe('standard');
            expect(result.status).toBe('outstanding');
            expect(result.exercisedShares).toBe(0);
            expect(result.remainingShares).toBe(validData.numberOfShares);
            expect(result.purchasePrice).toBe(0);
            expect(result.cashlessExercise).toBe(false);
            expect(result.partialExercise).toBe(true);
            expect(result.transferable).toBe(false);
            expect(result.automaticExercise).toBe(false);
            expect(result.antidilutionProtection).toBe('none');
        });

        it('should throw error when companyId is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.companyId;

            await expect(Warrant.create(invalidData)).rejects.toThrow('Company ID is required');
        });

        it('should throw error when name is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.name;

            await expect(Warrant.create(invalidData)).rejects.toThrow('Warrant name is required');
        });

        it('should throw error when numberOfShares is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.numberOfShares;

            await expect(Warrant.create(invalidData)).rejects.toThrow('Number of shares is required');
        });

        it('should throw error when numberOfShares is negative', async () => {
            const invalidData = { ...validData, numberOfShares: -100 };

            await expect(Warrant.create(invalidData)).rejects.toThrow('Number of shares is required and cannot be negative');
        });

        it('should throw error when exercisePrice is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.exercisePrice;

            await expect(Warrant.create(invalidData)).rejects.toThrow('Exercise price is required');
        });

        it('should throw error when exercisePrice is negative', async () => {
            const invalidData = { ...validData, exercisePrice: -1 };

            await expect(Warrant.create(invalidData)).rejects.toThrow('Exercise price is required and cannot be negative');
        });

        it('should throw error when issueDate is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.issueDate;

            await expect(Warrant.create(invalidData)).rejects.toThrow('Issue date is required');
        });

        it('should throw error when expirationDate is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.expirationDate;

            await expect(Warrant.create(invalidData)).rejects.toThrow('Expiration date is required');
        });

        it('should throw error when expirationDate is before issueDate', async () => {
            const invalidData = {
                ...validData,
                issueDate: new Date('2024-01-01'),
                expirationDate: new Date('2023-01-01')
            };

            await expect(Warrant.create(invalidData)).rejects.toThrow('Expiration date must be after issue date');
        });

        it('should throw error for invalid warrantType', async () => {
            const invalidData = { ...validData, warrantType: 'invalid' };

            await expect(Warrant.create(invalidData)).rejects.toThrow('Invalid warrant type');
        });

        it('should throw error for invalid status', async () => {
            const invalidData = { ...validData, status: 'invalid' };

            await expect(Warrant.create(invalidData)).rejects.toThrow('Invalid status');
        });

        it('should throw error for invalid antidilutionProtection', async () => {
            const invalidData = { ...validData, antidilutionProtection: 'invalid' };

            await expect(Warrant.create(invalidData)).rejects.toThrow('Invalid antidilution protection');
        });

        it('should accept valid warrantType values', async () => {
            for (const warrantType of Warrant.WARRANT_TYPES) {
                const data = { ...validData, warrantType };
                const result = await Warrant.create(data);
                expect(result.warrantType).toBe(warrantType);
            }
        });
    });

    describe('Find Methods', () => {
        it('should have findByWarrantId method', () => {
            expect(typeof Warrant.findByWarrantId).toBe('function');
        });

        it('should have findByCompany method', () => {
            expect(typeof Warrant.findByCompany).toBe('function');
        });

        it('should have findOutstanding method', () => {
            expect(typeof Warrant.findOutstanding).toBe('function');
        });

        it('should have findByInvestor method', () => {
            expect(typeof Warrant.findByInvestor).toBe('function');
        });

        it('should have findByFinancingRound method', () => {
            expect(typeof Warrant.findByFinancingRound).toBe('function');
        });

        it('should have findExpiringBetween method', () => {
            expect(typeof Warrant.findExpiringBetween).toBe('function');
        });

        it('should have search method', () => {
            expect(typeof Warrant.search).toBe('function');
        });
    });

    describe('Valuation Methods', () => {
        describe('isInTheMoney', () => {
            it('should return true when FMV > exercise price', () => {
                const warrant = { exercisePrice: 1.50 };
                expect(Warrant.isInTheMoney(warrant, 2.00)).toBe(true);
            });

            it('should return false when FMV <= exercise price', () => {
                const warrant = { exercisePrice: 1.50 };
                expect(Warrant.isInTheMoney(warrant, 1.00)).toBe(false);
                expect(Warrant.isInTheMoney(warrant, 1.50)).toBe(false);
            });

            it('should use adjustedExercisePrice when available', () => {
                const warrant = { exercisePrice: 2.00, adjustedExercisePrice: 1.00 };
                expect(Warrant.isInTheMoney(warrant, 1.50)).toBe(true);
            });
        });

        describe('calculateIntrinsicValue', () => {
            it('should calculate intrinsic value correctly', () => {
                const warrant = {
                    exercisePrice: 1.50,
                    remainingShares: 100000
                };
                // (2.00 - 1.50) * 100000 = 50000
                expect(Warrant.calculateIntrinsicValue(warrant, 2.00)).toBe(50000);
            });

            it('should return 0 when out of the money', () => {
                const warrant = {
                    exercisePrice: 2.00,
                    remainingShares: 100000
                };
                expect(Warrant.calculateIntrinsicValue(warrant, 1.00)).toBe(0);
            });

            it('should use numberOfShares when remainingShares not set', () => {
                const warrant = {
                    exercisePrice: 1.50,
                    numberOfShares: 50000
                };
                // (2.00 - 1.50) * 50000 = 25000
                expect(Warrant.calculateIntrinsicValue(warrant, 2.00)).toBe(25000);
            });

            it('should use adjustedExercisePrice when available', () => {
                const warrant = {
                    exercisePrice: 2.00,
                    adjustedExercisePrice: 1.00,
                    remainingShares: 100000
                };
                // (2.00 - 1.00) * 100000 = 100000
                expect(Warrant.calculateIntrinsicValue(warrant, 2.00)).toBe(100000);
            });
        });
    });

    describe('Expiration Methods', () => {
        describe('isExpired', () => {
            it('should return true for past expiration date', () => {
                const warrant = { expirationDate: new Date('2020-01-01') };
                expect(Warrant.isExpired(warrant)).toBe(true);
            });

            it('should return false for future expiration date', () => {
                const warrant = { expirationDate: new Date('2030-01-01') };
                expect(Warrant.isExpired(warrant)).toBe(false);
            });
        });

        describe('getDaysToExpiration', () => {
            it('should return positive days for future expiration', () => {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 30);
                const warrant = { expirationDate: futureDate };

                const days = Warrant.getDaysToExpiration(warrant);
                expect(days).toBeGreaterThan(29);
                expect(days).toBeLessThanOrEqual(31);
            });

            it('should return negative days for past expiration', () => {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 30);
                const warrant = { expirationDate: pastDate };

                const days = Warrant.getDaysToExpiration(warrant);
                expect(days).toBeLessThan(0);
            });
        });
    });

    describe('Exercise Methods', () => {
        const validData = {
            companyId: 'company_123',
            name: 'Test Warrant',
            numberOfShares: 100000,
            exercisePrice: 1.50,
            issueDate: new Date('2024-01-01'),
            expirationDate: new Date('2034-01-01')
        };

        it('should have exerciseShares method', () => {
            expect(typeof Warrant.exerciseShares).toBe('function');
        });

        it('should create warrants with exercise history array', async () => {
            const result = await Warrant.create(validData);
            expect(result.exerciseHistory).toEqual([]);
        });

        it('should track remaining shares after creation', async () => {
            const result = await Warrant.create(validData);
            expect(result.remainingShares).toBe(validData.numberOfShares);
            expect(result.exercisedShares).toBe(0);
        });
    });

    describe('Warrant Types', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Test Warrant',
            numberOfShares: 100000,
            exercisePrice: 1.50,
            issueDate: new Date('2024-01-01'),
            expirationDate: new Date('2034-01-01')
        };

        it('should create penny warrant', async () => {
            const result = await Warrant.create({
                ...baseData,
                name: 'Penny Warrant',
                warrantType: 'penny',
                exercisePrice: 0.01
            });

            expect(result.warrantType).toBe('penny');
            expect(result.exercisePrice).toBe(0.01);
        });

        it('should create standard warrant', async () => {
            const result = await Warrant.create({
                ...baseData,
                name: 'Standard Warrant',
                warrantType: 'standard'
            });

            expect(result.warrantType).toBe('standard');
        });

        it('should create participating warrant', async () => {
            const result = await Warrant.create({
                ...baseData,
                name: 'Participating Warrant',
                warrantType: 'participating'
            });

            expect(result.warrantType).toBe('participating');
        });

        it('should create coverage warrant', async () => {
            const result = await Warrant.create({
                ...baseData,
                name: 'Coverage Warrant',
                warrantType: 'coverage'
            });

            expect(result.warrantType).toBe('coverage');
        });
    });

    describe('Warrant Status Lifecycle', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Test Warrant',
            numberOfShares: 100000,
            exercisePrice: 1.50,
            issueDate: new Date('2024-01-01'),
            expirationDate: new Date('2034-01-01')
        };

        it('should create with outstanding status by default', async () => {
            const result = await Warrant.create(baseData);
            expect(result.status).toBe('outstanding');
        });

        it('should allow explicit status values', async () => {
            for (const status of Warrant.WARRANT_STATUS) {
                const data = { ...baseData, status };
                const result = await Warrant.create(data);
                expect(result.status).toBe(status);
            }
        });
    });

    describe('Antidilution Protection', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Protected Warrant',
            numberOfShares: 100000,
            exercisePrice: 1.50,
            issueDate: new Date('2024-01-01'),
            expirationDate: new Date('2034-01-01')
        };

        it('should store full ratchet protection', async () => {
            const result = await Warrant.create({
                ...baseData,
                antidilutionProtection: 'full_ratchet'
            });

            expect(result.antidilutionProtection).toBe('full_ratchet');
        });

        it('should store weighted average protection', async () => {
            const result = await Warrant.create({
                ...baseData,
                antidilutionProtection: 'weighted_average'
            });

            expect(result.antidilutionProtection).toBe('weighted_average');
        });

        it('should store adjusted exercise price', async () => {
            const result = await Warrant.create({
                ...baseData,
                antidilutionProtection: 'full_ratchet',
                adjustedExercisePrice: 1.00
            });

            expect(result.adjustedExercisePrice).toBe(1.00);
        });
    });

    describe('Exercise Mechanics', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Test Warrant',
            numberOfShares: 100000,
            exercisePrice: 1.50,
            issueDate: new Date('2024-01-01'),
            expirationDate: new Date('2034-01-01')
        };

        it('should store cashless exercise option', async () => {
            const result = await Warrant.create({
                ...baseData,
                cashlessExercise: true
            });

            expect(result.cashlessExercise).toBe(true);
        });

        it('should store partial exercise option', async () => {
            const result = await Warrant.create({
                ...baseData,
                partialExercise: false
            });

            expect(result.partialExercise).toBe(false);
        });

        it('should store transferability', async () => {
            const result = await Warrant.create({
                ...baseData,
                transferable: true
            });

            expect(result.transferable).toBe(true);
        });

        it('should store automatic exercise option', async () => {
            const result = await Warrant.create({
                ...baseData,
                automaticExercise: true
            });

            expect(result.automaticExercise).toBe(true);
        });
    });

    describe('409A Valuation Fields', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Valued Warrant',
            numberOfShares: 100000,
            exercisePrice: 1.50,
            issueDate: new Date('2024-01-01'),
            expirationDate: new Date('2034-01-01')
        };

        it('should store current FMV', async () => {
            const result = await Warrant.create({
                ...baseData,
                currentFMV: 2.50
            });

            expect(result.currentFMV).toBe(2.50);
        });

        it('should store intrinsic value', async () => {
            const result = await Warrant.create({
                ...baseData,
                intrinsicValue: 100000
            });

            expect(result.intrinsicValue).toBe(100000);
        });

        it('should store Black-Scholes value', async () => {
            const result = await Warrant.create({
                ...baseData,
                blackScholesValue: 75000
            });

            expect(result.blackScholesValue).toBe(75000);
        });

        it('should store dilutive impact', async () => {
            const result = await Warrant.create({
                ...baseData,
                dilutiveImpact: 0.05
            });

            expect(result.dilutiveImpact).toBe(0.05);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle complete warrant issuance scenario', async () => {
            // Investor gets warrants as part of debt financing
            const warrant = await Warrant.create({
                companyId: 'startup_123',
                name: 'Bridge Note Warrant',
                description: 'Warrant coverage on bridge financing',
                warrantType: 'coverage',
                investorId: 'investor_456',
                financingRoundId: 'round_789',
                shareClassId: 'sc_common',
                numberOfShares: 200000,
                exercisePrice: 0.75,
                purchasePrice: 0,
                issueDate: new Date('2024-06-01'),
                expirationDate: new Date('2034-06-01'),
                cashlessExercise: true,
                partialExercise: true,
                transferable: false,
                antidilutionProtection: 'weighted_average'
            });

            expect(warrant.warrantType).toBe('coverage');
            expect(warrant.numberOfShares).toBe(200000);
            expect(warrant.cashlessExercise).toBe(true);
            expect(warrant.antidilutionProtection).toBe('weighted_average');
        });
    });

    describe('Base Model Methods', () => {
        it('should expose find method', () => {
            expect(typeof Warrant.find).toBe('function');
        });

        it('should expose findOne method', () => {
            expect(typeof Warrant.findOne).toBe('function');
        });

        it('should expose findById method', () => {
            expect(typeof Warrant.findById).toBe('function');
        });

        it('should expose updateOne method', () => {
            expect(typeof Warrant.updateOne).toBe('function');
        });

        it('should expose deleteOne method', () => {
            expect(typeof Warrant.deleteOne).toBe('function');
        });

        it('should expose countDocuments method', () => {
            expect(typeof Warrant.countDocuments).toBe('function');
        });

        it('should expose exists method', () => {
            expect(typeof Warrant.exists).toBe('function');
        });
    });
});
