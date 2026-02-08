/**
 * ConvertibleNote Model Unit Tests
 * Issue #322: Add Convertible Note terms data model for 409A compliance
 */

// Mock ZeroDB base model before requiring ConvertibleNote
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

const ConvertibleNote = require('../../../models/ConvertibleNote');

describe('ConvertibleNote Model', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Schema Structure', () => {
        it('should have all required fields in schema', () => {
            const schema = ConvertibleNote.schema;

            // Core identifiers
            expect(schema).toHaveProperty('noteId');
            expect(schema).toHaveProperty('companyId');
            expect(schema).toHaveProperty('name');
            expect(schema).toHaveProperty('description');

            // Classification
            expect(schema).toHaveProperty('noteType');
            expect(schema).toHaveProperty('safeType');
            expect(schema).toHaveProperty('status');

            // Linked entities
            expect(schema).toHaveProperty('investorId');
            expect(schema).toHaveProperty('financingRoundId');
            expect(schema).toHaveProperty('convertedToRoundId');
            expect(schema).toHaveProperty('shareClassId');

            // Principal
            expect(schema).toHaveProperty('principalAmount');
            expect(schema).toHaveProperty('purchaseDate');

            // Interest terms
            expect(schema).toHaveProperty('interestRate');
            expect(schema).toHaveProperty('interestMethod');
            expect(schema).toHaveProperty('accruedInterest');
            expect(schema).toHaveProperty('interestStartDate');

            // Maturity
            expect(schema).toHaveProperty('maturityDate');
            expect(schema).toHaveProperty('maturityMonths');

            // Conversion terms
            expect(schema).toHaveProperty('valuationCap');
            expect(schema).toHaveProperty('discount');
            expect(schema).toHaveProperty('discountRate');
            expect(schema).toHaveProperty('conversionFloor');
            expect(schema).toHaveProperty('qualifiedFinancingThreshold');

            // Conversion details
            expect(schema).toHaveProperty('conversionDate');
            expect(schema).toHaveProperty('conversionPricePerShare');
            expect(schema).toHaveProperty('sharesConverted');
            expect(schema).toHaveProperty('conversionValuation');
            expect(schema).toHaveProperty('wasCapHit');
            expect(schema).toHaveProperty('wasDiscountApplied');

            // Rights
            expect(schema).toHaveProperty('proRataRights');
            expect(schema).toHaveProperty('majorInvestorThreshold');
            expect(schema).toHaveProperty('informationRights');
            expect(schema).toHaveProperty('mfnRights');

            // 409A impact
            expect(schema).toHaveProperty('estimatedConversionPrice');
            expect(schema).toHaveProperty('estimatedShares');
            expect(schema).toHaveProperty('dilutiveImpact');
            expect(schema).toHaveProperty('probabilityOfConversion');
        });

        it('should expose NOTE_TYPES enum', () => {
            expect(ConvertibleNote.NOTE_TYPES).toEqual(['convertible_note', 'safe', 'kiss', 'simple_agreement']);
        });

        it('should expose NOTE_STATUS enum', () => {
            expect(ConvertibleNote.NOTE_STATUS).toEqual(['outstanding', 'converted', 'repaid', 'defaulted', 'cancelled']);
        });

        it('should expose INTEREST_METHODS enum', () => {
            expect(ConvertibleNote.INTEREST_METHODS).toEqual(['simple', 'compound_annual', 'compound_monthly', 'none']);
        });

        it('should expose SAFE_TYPES enum', () => {
            expect(ConvertibleNote.SAFE_TYPES).toEqual(['pre_money', 'post_money', 'mfn']);
        });
    });

    describe('Create Method Validation', () => {
        const validData = {
            companyId: 'company_123',
            name: 'Bridge Note',
            principalAmount: 500000,
            purchaseDate: new Date('2024-01-01')
        };

        it('should create note with all required fields', async () => {
            const result = await ConvertibleNote.create(validData);

            expect(result).toHaveProperty('_id');
            expect(result).toHaveProperty('noteId');
            expect(result.companyId).toBe(validData.companyId);
            expect(result.name).toBe(validData.name);
            expect(result.principalAmount).toBe(validData.principalAmount);
        });

        it('should generate noteId if not provided', async () => {
            const result = await ConvertibleNote.create(validData);
            expect(result.noteId).toMatch(/^note_/);
        });

        it('should apply default values', async () => {
            const result = await ConvertibleNote.create(validData);

            expect(result.noteType).toBe('convertible_note');
            expect(result.status).toBe('outstanding');
            expect(result.interestRate).toBe(0);
            expect(result.interestMethod).toBe('simple');
            expect(result.accruedInterest).toBe(0);
            expect(result.discount).toBe(0);
            expect(result.autoConvertOnQualifiedFinancing).toBe(true);
            expect(result.autoConvertOnMaturity).toBe(false);
            expect(result.proRataRights).toBe(false);
        });

        it('should throw error when companyId is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.companyId;

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Company ID is required');
        });

        it('should throw error when name is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.name;

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Note name is required');
        });

        it('should throw error when principalAmount is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.principalAmount;

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Principal amount is required');
        });

        it('should throw error when principalAmount is negative', async () => {
            const invalidData = { ...validData, principalAmount: -100 };

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Principal amount is required and cannot be negative');
        });

        it('should throw error when purchaseDate is missing', async () => {
            const invalidData = { ...validData };
            delete invalidData.purchaseDate;

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Purchase date is required');
        });

        it('should throw error for invalid noteType', async () => {
            const invalidData = { ...validData, noteType: 'invalid' };

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Invalid note type');
        });

        it('should throw error for invalid status', async () => {
            const invalidData = { ...validData, status: 'invalid' };

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Invalid status');
        });

        it('should throw error for invalid interestMethod', async () => {
            const invalidData = { ...validData, interestMethod: 'invalid' };

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('Invalid interest method');
        });

        it('should throw error when SAFE has interest', async () => {
            const invalidData = { ...validData, noteType: 'safe', interestRate: 5 };

            await expect(ConvertibleNote.create(invalidData)).rejects.toThrow('SAFEs do not accrue interest');
        });
    });

    describe('SAFE Creation', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'SAFE Investment',
            principalAmount: 250000,
            purchaseDate: new Date('2024-01-01'),
            noteType: 'safe'
        };

        it('should create SAFE with zero interest', async () => {
            const result = await ConvertibleNote.create(baseData);

            expect(result.noteType).toBe('safe');
            expect(result.interestRate).toBe(0);
            expect(result.interestMethod).toBe('none');
            expect(result.accruedInterest).toBe(0);
        });

        it('should create pre-money SAFE', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                safeType: 'pre_money',
                valuationCap: 5000000
            });

            expect(result.safeType).toBe('pre_money');
            expect(result.valuationCap).toBe(5000000);
        });

        it('should create post-money SAFE', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                safeType: 'post_money',
                valuationCap: 6000000
            });

            expect(result.safeType).toBe('post_money');
        });

        it('should create MFN SAFE', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                safeType: 'mfn',
                mfnRights: true
            });

            expect(result.safeType).toBe('mfn');
            expect(result.mfnRights).toBe(true);
        });
    });

    describe('Convertible Note with Interest', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Bridge Note',
            principalAmount: 500000,
            purchaseDate: new Date('2024-01-01'),
            noteType: 'convertible_note',
            interestRate: 8,
            interestMethod: 'simple',
            maturityMonths: 24
        };

        it('should create note with interest terms', async () => {
            const result = await ConvertibleNote.create(baseData);

            expect(result.interestRate).toBe(8);
            expect(result.interestMethod).toBe('simple');
        });

        it('should calculate maturity date from months', async () => {
            const result = await ConvertibleNote.create(baseData);

            expect(result.maturityDate).toBeTruthy();
            const expectedMaturity = new Date('2026-01-01');
            expect(new Date(result.maturityDate).getFullYear()).toBe(expectedMaturity.getFullYear());
        });
    });

    describe('Find Methods', () => {
        it('should have findByNoteId method', () => {
            expect(typeof ConvertibleNote.findByNoteId).toBe('function');
        });

        it('should have findByCompany method', () => {
            expect(typeof ConvertibleNote.findByCompany).toBe('function');
        });

        it('should have findOutstanding method', () => {
            expect(typeof ConvertibleNote.findOutstanding).toBe('function');
        });

        it('should have findByInvestor method', () => {
            expect(typeof ConvertibleNote.findByInvestor).toBe('function');
        });

        it('should have findByType method', () => {
            expect(typeof ConvertibleNote.findByType).toBe('function');
        });

        it('should have findSAFEs method', () => {
            expect(typeof ConvertibleNote.findSAFEs).toBe('function');
        });

        it('should have findMaturingBetween method', () => {
            expect(typeof ConvertibleNote.findMaturingBetween).toBe('function');
        });

        it('should have search method', () => {
            expect(typeof ConvertibleNote.search).toBe('function');
        });
    });

    describe('Interest Calculation', () => {
        describe('calculateAccruedInterest', () => {
            it('should calculate simple interest correctly', () => {
                const note = {
                    noteType: 'convertible_note',
                    principalAmount: 500000,
                    interestRate: 8,
                    interestMethod: 'simple',
                    purchaseDate: new Date('2024-01-01')
                };

                // After ~1 year: 500000 * 0.08 * ~1 = ~40000 (±1% for leap year)
                const oneYearLater = new Date('2025-01-01');
                const interest = ConvertibleNote.calculateAccruedInterest(note, oneYearLater);

                // Allow 1% tolerance for leap year differences
                expect(interest).toBeGreaterThan(39000);
                expect(interest).toBeLessThan(41000);
            });

            it('should calculate compound annual interest correctly', () => {
                const note = {
                    noteType: 'convertible_note',
                    principalAmount: 500000,
                    interestRate: 8,
                    interestMethod: 'compound_annual',
                    purchaseDate: new Date('2024-01-01')
                };

                const twoYearsLater = new Date('2026-01-01');
                const interest = ConvertibleNote.calculateAccruedInterest(note, twoYearsLater);

                // (1.08)^2 - 1 = 0.1664, * 500000 = ~83200 (±2% for date rounding)
                expect(interest).toBeGreaterThan(80000);
                expect(interest).toBeLessThan(86000);
            });

            it('should return 0 for SAFEs', () => {
                const safe = {
                    noteType: 'safe',
                    principalAmount: 250000,
                    purchaseDate: new Date('2024-01-01')
                };

                const interest = ConvertibleNote.calculateAccruedInterest(safe, new Date('2025-01-01'));
                expect(interest).toBe(0);
            });

            it('should return 0 when interest rate is 0', () => {
                const note = {
                    noteType: 'convertible_note',
                    principalAmount: 500000,
                    interestRate: 0,
                    interestMethod: 'simple',
                    purchaseDate: new Date('2024-01-01')
                };

                const interest = ConvertibleNote.calculateAccruedInterest(note, new Date('2025-01-01'));
                expect(interest).toBe(0);
            });

            it('should return 0 for dates before purchase', () => {
                const note = {
                    noteType: 'convertible_note',
                    principalAmount: 500000,
                    interestRate: 8,
                    interestMethod: 'simple',
                    purchaseDate: new Date('2024-01-01')
                };

                const beforePurchase = new Date('2023-01-01');
                const interest = ConvertibleNote.calculateAccruedInterest(note, beforePurchase);
                expect(interest).toBe(0);
            });
        });

        describe('calculateTotalDue', () => {
            it('should calculate total due correctly', () => {
                const note = {
                    noteType: 'convertible_note',
                    principalAmount: 500000,
                    interestRate: 8,
                    interestMethod: 'simple',
                    purchaseDate: new Date('2024-01-01')
                };

                const oneYearLater = new Date('2025-01-01');
                const total = ConvertibleNote.calculateTotalDue(note, oneYearLater);

                // 500000 + ~40000 = ~540000 (±1% for leap year)
                expect(total).toBeGreaterThan(539000);
                expect(total).toBeLessThan(541000);
            });
        });
    });

    describe('Conversion Calculation', () => {
        describe('calculateConversionPrice', () => {
            it('should apply discount correctly', () => {
                const note = {
                    discount: 20,
                    valuationCap: null
                };

                const result = ConvertibleNote.calculateConversionPrice(note, 1.00, null);

                expect(result.conversionPrice).toBe(0.80);
                expect(result.wasDiscountApplied).toBe(true);
                expect(result.wasCapHit).toBe(false);
            });

            it('should apply valuation cap correctly', () => {
                const note = {
                    discount: 0,
                    valuationCap: 5000000
                };

                // If round is at $10M, cap gives 50% of price
                const result = ConvertibleNote.calculateConversionPrice(note, 1.00, 10000000);

                expect(result.conversionPrice).toBe(0.50);
                expect(result.wasCapHit).toBe(true);
            });

            it('should use better of discount or cap', () => {
                const note = {
                    discount: 20, // 20% discount = $0.80
                    valuationCap: 5000000 // Cap at 5M vs 10M = $0.50
                };

                const result = ConvertibleNote.calculateConversionPrice(note, 1.00, 10000000);

                // Cap ($0.50) is better than discount ($0.80)
                expect(result.conversionPrice).toBe(0.50);
                expect(result.wasCapHit).toBe(true);
            });

            it('should not apply cap when valuation is below cap', () => {
                const note = {
                    discount: 20,
                    valuationCap: 10000000
                };

                // Valuation is 5M, below 10M cap
                const result = ConvertibleNote.calculateConversionPrice(note, 1.00, 5000000);

                expect(result.conversionPrice).toBe(0.80); // Just discount
                expect(result.wasCapHit).toBe(false);
                expect(result.wasDiscountApplied).toBe(true);
            });

            it('should respect conversion floor', () => {
                const note = {
                    discount: 50,
                    conversionFloor: 0.60
                };

                // 50% discount would be $0.50, but floor is $0.60
                const result = ConvertibleNote.calculateConversionPrice(note, 1.00, null);

                expect(result.conversionPrice).toBe(0.60);
            });
        });

        describe('calculateConversionShares', () => {
            it('should calculate shares correctly', () => {
                const note = {
                    noteType: 'convertible_note',
                    principalAmount: 500000,
                    interestRate: 0,
                    interestMethod: 'none',
                    purchaseDate: new Date('2024-01-01')
                };

                const shares = ConvertibleNote.calculateConversionShares(note, 0.50);

                // 500000 / 0.50 = 1,000,000 shares
                expect(shares).toBe(1000000);
            });

            it('should include accrued interest in shares calculation', () => {
                const note = {
                    noteType: 'convertible_note',
                    principalAmount: 500000,
                    interestRate: 8,
                    interestMethod: 'simple',
                    purchaseDate: new Date('2024-01-01')
                };

                const oneYearLater = new Date('2025-01-01');
                const shares = ConvertibleNote.calculateConversionShares(note, 1.00, oneYearLater);

                // (500000 + ~40000) / 1.00 = ~540,000 shares (±1% for leap year)
                expect(shares).toBeGreaterThan(539000);
                expect(shares).toBeLessThan(541000);
            });
        });
    });

    describe('Maturity Methods', () => {
        describe('isPastMaturity', () => {
            it('should return true for past maturity', () => {
                const note = { maturityDate: new Date('2020-01-01') };
                expect(ConvertibleNote.isPastMaturity(note)).toBe(true);
            });

            it('should return false for future maturity', () => {
                const note = { maturityDate: new Date('2030-01-01') };
                expect(ConvertibleNote.isPastMaturity(note)).toBe(false);
            });

            it('should return false when no maturity date (SAFEs)', () => {
                const safe = {};
                expect(ConvertibleNote.isPastMaturity(safe)).toBe(false);
            });
        });

        describe('getDaysToMaturity', () => {
            it('should return positive days for future maturity', () => {
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 30);
                const note = { maturityDate: futureDate };

                const days = ConvertibleNote.getDaysToMaturity(note);
                expect(days).toBeGreaterThan(29);
                expect(days).toBeLessThanOrEqual(31);
            });

            it('should return negative days for past maturity', () => {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 30);
                const note = { maturityDate: pastDate };

                const days = ConvertibleNote.getDaysToMaturity(note);
                expect(days).toBeLessThan(0);
            });

            it('should return null when no maturity date', () => {
                const safe = {};
                expect(ConvertibleNote.getDaysToMaturity(safe)).toBeNull();
            });
        });
    });

    describe('Note Types', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Test Note',
            principalAmount: 100000,
            purchaseDate: new Date('2024-01-01')
        };

        it('should create convertible_note', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                noteType: 'convertible_note'
            });
            expect(result.noteType).toBe('convertible_note');
        });

        it('should create safe', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                noteType: 'safe'
            });
            expect(result.noteType).toBe('safe');
        });

        it('should create kiss', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                noteType: 'kiss'
            });
            expect(result.noteType).toBe('kiss');
        });

        it('should create simple_agreement', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                noteType: 'simple_agreement'
            });
            expect(result.noteType).toBe('simple_agreement');
        });
    });

    describe('Rights Fields', () => {
        const baseData = {
            companyId: 'company_123',
            name: 'Rights Note',
            principalAmount: 500000,
            purchaseDate: new Date('2024-01-01')
        };

        it('should store pro rata rights', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                proRataRights: true,
                majorInvestorThreshold: 250000
            });

            expect(result.proRataRights).toBe(true);
            expect(result.majorInvestorThreshold).toBe(250000);
        });

        it('should store information rights', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                informationRights: true
            });

            expect(result.informationRights).toBe(true);
        });

        it('should store MFN rights', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                mfnRights: true
            });

            expect(result.mfnRights).toBe(true);
        });
    });

    describe('409A Valuation Fields', () => {
        const baseData = {
            companyId: 'company_123',
            name: '409A Note',
            principalAmount: 500000,
            purchaseDate: new Date('2024-01-01')
        };

        it('should store estimated conversion price', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                estimatedConversionPrice: 0.75
            });

            expect(result.estimatedConversionPrice).toBe(0.75);
        });

        it('should store estimated shares', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                estimatedShares: 666667
            });

            expect(result.estimatedShares).toBe(666667);
        });

        it('should store dilutive impact', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                dilutiveImpact: 0.05
            });

            expect(result.dilutiveImpact).toBe(0.05);
        });

        it('should store probability of conversion', async () => {
            const result = await ConvertibleNote.create({
                ...baseData,
                probabilityOfConversion: 90
            });

            expect(result.probabilityOfConversion).toBe(90);
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle complete bridge financing scenario', async () => {
            const note = await ConvertibleNote.create({
                companyId: 'startup_123',
                investorId: 'investor_456',
                name: 'Bridge Note - Series A',
                description: 'Bridge financing prior to Series A',
                noteType: 'convertible_note',
                principalAmount: 500000,
                purchaseDate: new Date('2024-01-01'),
                interestRate: 8,
                interestMethod: 'simple',
                maturityMonths: 24,
                valuationCap: 8000000,
                discount: 20,
                qualifiedFinancingThreshold: 1000000,
                autoConvertOnQualifiedFinancing: true,
                proRataRights: true,
                majorInvestorThreshold: 250000
            });

            expect(note.noteType).toBe('convertible_note');
            expect(note.interestRate).toBe(8);
            expect(note.valuationCap).toBe(8000000);
            expect(note.discount).toBe(20);
            expect(note.proRataRights).toBe(true);
        });

        it('should handle YC SAFE scenario', async () => {
            const safe = await ConvertibleNote.create({
                companyId: 'startup_123',
                investorId: 'yc_investor',
                name: 'YC Post-Money SAFE',
                noteType: 'safe',
                safeType: 'post_money',
                principalAmount: 125000,
                purchaseDate: new Date('2024-06-01'),
                valuationCap: 10000000,
                discount: 0, // YC SAFEs typically don't have discount
                mfnRights: false,
                proRataRights: true,
                majorInvestorThreshold: 125000
            });

            expect(safe.noteType).toBe('safe');
            expect(safe.safeType).toBe('post_money');
            expect(safe.interestRate).toBe(0);
            expect(safe.interestMethod).toBe('none');
            expect(safe.valuationCap).toBe(10000000);
        });
    });

    describe('Base Model Methods', () => {
        it('should expose find method', () => {
            expect(typeof ConvertibleNote.find).toBe('function');
        });

        it('should expose findOne method', () => {
            expect(typeof ConvertibleNote.findOne).toBe('function');
        });

        it('should expose findById method', () => {
            expect(typeof ConvertibleNote.findById).toBe('function');
        });

        it('should expose updateOne method', () => {
            expect(typeof ConvertibleNote.updateOne).toBe('function');
        });

        it('should expose deleteOne method', () => {
            expect(typeof ConvertibleNote.deleteOne).toBe('function');
        });

        it('should expose countDocuments method', () => {
            expect(typeof ConvertibleNote.countDocuments).toBe('function');
        });

        it('should expose exists method', () => {
            expect(typeof ConvertibleNote.exists).toBe('function');
        });
    });
});
