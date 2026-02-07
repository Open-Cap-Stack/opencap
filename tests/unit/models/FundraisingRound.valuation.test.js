/**
 * FundraisingRound Valuation Tests
 * Issue #262: Add valuation fields to financing_rounds model
 *
 * Comprehensive test suite for valuation-related fields and methods
 */
const FundraisingRound = require('../../../models/FundraisingRoundModel');
const zerodbService = require('../../../services/zerodbService');

// Mock ZeroDB service
jest.mock('../../../services/zerodbService');

describe('FundraisingRound Model - Valuation Fields', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mocks
        zerodbService.initialize = jest.fn().mockResolvedValue({ projectId: 'test-project' });
        zerodbService.projectId = 'test-project';
        zerodbService.insertRow = jest.fn().mockResolvedValue({
            data: [{
                row_data: {
                    _id: 'test-id',
                    roundId: 'FR-TEST-001',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            }]
        });
        zerodbService.queryTable = jest.fn().mockResolvedValue({ data: [] });
        zerodbService.updateRows = jest.fn().mockResolvedValue({ modified_count: 1, matched_count: 1 });
        zerodbService.deleteRows = jest.fn().mockResolvedValue({ deleted_count: 1 });
    });

    describe('Constants', () => {
        it('should export ROUND_TYPES constant', () => {
            expect(FundraisingRound.ROUND_TYPES).toBeDefined();
            expect(Array.isArray(FundraisingRound.ROUND_TYPES)).toBe(true);
        });

        it('should include all required round types', () => {
            const requiredTypes = [
                'PRICED_EQUITY', 'SAFE', 'CONVERTIBLE_NOTE', 'SECONDARY',
                'BRIDGE', 'EXTENSION', 'SEED', 'SERIES_A', 'SERIES_B',
                'SERIES_C', 'SERIES_D_PLUS'
            ];
            requiredTypes.forEach(type => {
                expect(FundraisingRound.ROUND_TYPES).toContain(type);
            });
        });

        it('should export VALUATION_METHODS constant', () => {
            expect(FundraisingRound.VALUATION_METHODS).toBeDefined();
            expect(Array.isArray(FundraisingRound.VALUATION_METHODS)).toBe(true);
        });

        it('should include all valuation methods', () => {
            const requiredMethods = ['PRICED', 'SAFE', 'CONVERTIBLE_NOTE', 'WARRANT'];
            requiredMethods.forEach(method => {
                expect(FundraisingRound.VALUATION_METHODS).toContain(method);
            });
        });
    });

    describe('Schema Validation', () => {
        it('should have correct table name', () => {
            expect(FundraisingRound.tableName).toBe('securities');
        });

        it('should validate required fields', async () => {
            const invalidData = {
                roundId: 'FR-001'
                // Missing required fields
            };

            await expect(FundraisingRound.create(invalidData)).rejects.toThrow('Validation failed');
        });

        it('should reject invalid RoundType', async () => {
            const invalidData = {
                roundId: 'FR-001',
                roundName: 'Test Round',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'INVALID_TYPE'
            };

            await expect(FundraisingRound.create(invalidData)).rejects.toThrow('RoundType must be one of');
        });

        it('should reject invalid valuationMethod', async () => {
            const invalidData = {
                roundId: 'FR-001',
                roundName: 'Test Round',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                valuationMethod: 'INVALID_METHOD'
            };

            await expect(FundraisingRound.create(invalidData)).rejects.toThrow('valuationMethod must be one of');
        });

        it('should validate pre/post money relationship', async () => {
            const invalidData = {
                roundId: 'FR-001',
                roundName: 'Test Round',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                preMoneyValuation: 10000000,
                postMoneyValuation: 20000000 // Should be 15000000
            };

            await expect(FundraisingRound.create(invalidData)).rejects.toThrow('postMoneyValuation should equal preMoneyValuation + amountRaised');
        });

        it('should accept valid pre/post money relationship', async () => {
            const validData = {
                roundId: 'FR-001',
                roundName: 'Test Round',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                preMoneyValuation: 10000000,
                postMoneyValuation: 15000000 // Correct: 10M + 5M = 15M
            };

            await expect(FundraisingRound.create(validData)).resolves.toBeDefined();
        });

        it('should validate discount range', async () => {
            const invalidData = {
                roundId: 'FR-001',
                roundName: 'Test Round',
                amountRaised: 500000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 0,
                RoundType: 'SAFE',
                discount: 150 // Invalid: > 100
            };

            await expect(FundraisingRound.create(invalidData)).rejects.toThrow('discount must be between 0 and 100');
        });

        it('should validate optionPoolPercentage range', async () => {
            const invalidData = {
                roundId: 'FR-001',
                roundName: 'Test Round',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                optionPoolPercentage: 120 // Invalid: > 100
            };

            await expect(FundraisingRound.create(invalidData)).rejects.toThrow('optionPoolPercentage must be between 0 and 100');
        });

        it('should require preMoneyValuation for priced rounds', async () => {
            const invalidData = {
                roundId: 'FR-001',
                roundName: 'Test Round',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A'
                // Missing preMoneyValuation
            };

            await expect(FundraisingRound.create(invalidData)).rejects.toThrow('preMoneyValuation is required for priced rounds');
        });
    });

    describe('create()', () => {
        it('should create a fundraising round with valuation fields', async () => {
            const roundData = {
                roundId: 'FR-001',
                roundName: 'Series A',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1', 'investor-2'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                preMoneyValuation: 10000000,
                postMoneyValuation: 15000000,
                pricePerShare: 2.50,
                valuationMethod: 'PRICED',
                fullyDilutedSharesPre: 4000000,
                fullyDilutedSharesPost: 6000000,
                optionPoolPercentage: 15,
                isArmsLength: true,
                boardApprovalDate: new Date(),
                closingDate: new Date()
            };

            zerodbService.insertRow.mockResolvedValue({
                data: [{ row_data: { ...roundData, _id: 'fr-1' } }]
            });

            const round = await FundraisingRound.create(roundData);

            expect(round).toBeDefined();
            expect(zerodbService.insertRow).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    roundId: roundData.roundId,
                    preMoneyValuation: roundData.preMoneyValuation,
                    postMoneyValuation: roundData.postMoneyValuation,
                    pricePerShare: roundData.pricePerShare,
                    valuationMethod: roundData.valuationMethod,
                    _type: 'fundraising_round'
                })
            );
        });

        it('should auto-calculate postMoneyValuation if not provided', async () => {
            const roundData = {
                roundId: 'FR-001',
                roundName: 'Series A',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                preMoneyValuation: 10000000
                // postMoneyValuation not provided
            };

            await FundraisingRound.create(roundData);

            expect(zerodbService.insertRow).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    postMoneyValuation: 15000000 // 10M + 5M
                })
            );
        });

        it('should auto-calculate pricePerShare from valuation', async () => {
            const roundData = {
                roundId: 'FR-001',
                roundName: 'Series A',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                preMoneyValuation: 10000000,
                fullyDilutedSharesPre: 4000000
                // pricePerShare not provided
            };

            await FundraisingRound.create(roundData);

            expect(zerodbService.insertRow).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    pricePerShare: 2.5 // 10M / 4M shares
                })
            );
        });

        it('should auto-detect down round', async () => {
            const roundData = {
                roundId: 'FR-001',
                roundName: 'Series B',
                amountRaised: 3000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 15,
                RoundType: 'SERIES_B',
                preMoneyValuation: 8000000,
                pricePerShare: 1.50,
                previousPricePerShare: 2.50 // Previous was higher
            };

            await FundraisingRound.create(roundData);

            expect(zerodbService.insertRow).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    isDownRound: true
                })
            );
        });

        it('should default isArmsLength to true', async () => {
            const roundData = {
                roundId: 'FR-001',
                roundName: 'Series A',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                preMoneyValuation: 10000000
            };

            await FundraisingRound.create(roundData);

            expect(zerodbService.insertRow).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    isArmsLength: true
                })
            );
        });

        it('should create SAFE round with cap and discount', async () => {
            const roundData = {
                roundId: 'FR-SAFE-001',
                roundName: 'SAFE Round',
                amountRaised: 500000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 0,
                RoundType: 'SAFE',
                valuationCap: 8000000,
                discount: 20,
                valuationMethod: 'SAFE'
            };

            zerodbService.insertRow.mockResolvedValue({
                data: [{ row_data: { ...roundData, _id: 'safe-1' } }]
            });

            const round = await FundraisingRound.create(roundData);

            expect(round).toBeDefined();
            expect(zerodbService.insertRow).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    valuationCap: 8000000,
                    discount: 20,
                    valuationMethod: 'SAFE'
                })
            );
        });

        it('should create convertible note round', async () => {
            const roundData = {
                roundId: 'FR-CN-001',
                roundName: 'Convertible Note',
                amountRaised: 750000,
                date: new Date(),
                investors: ['investor-1'],
                equityGiven: 0,
                RoundType: 'CONVERTIBLE_NOTE',
                valuationCap: 10000000,
                discount: 15,
                valuationMethod: 'CONVERTIBLE_NOTE'
            };

            await FundraisingRound.create(roundData);

            expect(zerodbService.insertRow).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    RoundType: 'CONVERTIBLE_NOTE',
                    valuationMethod: 'CONVERTIBLE_NOTE'
                })
            );
        });
    });

    describe('calculatePricePerShare()', () => {
        it('should return existing pricePerShare if available', () => {
            const round = {
                pricePerShare: 2.50,
                preMoneyValuation: 10000000,
                fullyDilutedSharesPre: 4000000
            };

            expect(FundraisingRound.calculatePricePerShare(round)).toBe(2.50);
        });

        it('should calculate from valuation if pricePerShare not set', () => {
            const round = {
                preMoneyValuation: 10000000,
                fullyDilutedSharesPre: 4000000
            };

            expect(FundraisingRound.calculatePricePerShare(round)).toBe(2.50);
        });

        it('should return null if cannot calculate', () => {
            const round = {
                preMoneyValuation: 10000000
                // Missing shares
            };

            expect(FundraisingRound.calculatePricePerShare(round)).toBeNull();
        });

        it('should handle zero shares gracefully', () => {
            const round = {
                preMoneyValuation: 10000000,
                fullyDilutedSharesPre: 0
            };

            expect(FundraisingRound.calculatePricePerShare(round)).toBeNull();
        });
    });

    describe('isDownRound()', () => {
        it('should return true when current price < previous price', () => {
            const round = {
                pricePerShare: 1.50,
                previousPricePerShare: 2.50
            };

            expect(FundraisingRound.isDownRound(round)).toBe(true);
        });

        it('should return false when current price >= previous price', () => {
            const round = {
                pricePerShare: 3.00,
                previousPricePerShare: 2.50
            };

            expect(FundraisingRound.isDownRound(round)).toBe(false);
        });

        it('should use stored isDownRound if available', () => {
            const round = {
                isDownRound: true,
                pricePerShare: 3.00,
                previousPricePerShare: 2.50
            };

            expect(FundraisingRound.isDownRound(round)).toBe(true);
        });

        it('should return false if no previous price', () => {
            const round = {
                pricePerShare: 2.50
            };

            expect(FundraisingRound.isDownRound(round)).toBe(false);
        });
    });

    describe('calculateDilution()', () => {
        it('should calculate from share counts', () => {
            const round = {
                fullyDilutedSharesPre: 4000000,
                fullyDilutedSharesPost: 5000000
            };

            // New shares = 1M, Dilution = 1M / 5M = 20%
            expect(FundraisingRound.calculateDilution(round)).toBeCloseTo(20, 1);
        });

        it('should fallback to amount/valuation calculation', () => {
            const round = {
                amountRaised: 5000000,
                postMoneyValuation: 15000000
            };

            // 5M / 15M = 33.33%
            expect(FundraisingRound.calculateDilution(round)).toBeCloseTo(33.33, 1);
        });

        it('should fallback to equityGiven', () => {
            const round = {
                equityGiven: 25
            };

            expect(FundraisingRound.calculateDilution(round)).toBe(25);
        });

        it('should return 0 if no data available', () => {
            const round = {};

            expect(FundraisingRound.calculateDilution(round)).toBe(0);
        });
    });

    describe('calculateImpliedOwnershipSold()', () => {
        it('should calculate ownership from amount and valuation', () => {
            const round = {
                amountRaised: 5000000,
                postMoneyValuation: 15000000
            };

            expect(FundraisingRound.calculateImpliedOwnershipSold(round)).toBeCloseTo(33.33, 1);
        });

        it('should return 0 if no post-money valuation', () => {
            const round = {
                amountRaised: 5000000
            };

            expect(FundraisingRound.calculateImpliedOwnershipSold(round)).toBe(0);
        });

        it('should handle zero post-money valuation', () => {
            const round = {
                amountRaised: 5000000,
                postMoneyValuation: 0
            };

            expect(FundraisingRound.calculateImpliedOwnershipSold(round)).toBe(0);
        });
    });

    describe('getLatestPricedRound()', () => {
        it('should return the latest priced round', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-002',
                        RoundType: 'SERIES_B',
                        preMoneyValuation: 30000000,
                        date: '2024-06-01'
                    }
                },
                {
                    row_data: {
                        roundId: 'FR-001',
                        RoundType: 'SERIES_A',
                        preMoneyValuation: 10000000,
                        date: '2023-06-01'
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const latestRound = await FundraisingRound.getLatestPricedRound('company-123');

            expect(latestRound).toBeDefined();
            expect(latestRound.roundId).toBe('FR-002');
        });

        it('should return null if no priced rounds found', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-001',
                        RoundType: 'SAFE',
                        valuationCap: 5000000
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const latestRound = await FundraisingRound.getLatestPricedRound('company-123');

            expect(latestRound).toBeNull();
        });

        it('should exclude rounds without valuation data', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-002',
                        RoundType: 'SERIES_B'
                        // No preMoneyValuation
                    }
                },
                {
                    row_data: {
                        roundId: 'FR-001',
                        RoundType: 'SERIES_A',
                        preMoneyValuation: 10000000
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const latestRound = await FundraisingRound.getLatestPricedRound('company-123');

            expect(latestRound.roundId).toBe('FR-001');
        });
    });

    describe('getValuationHistory()', () => {
        it('should return valuation history sorted by date', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-001',
                        roundName: 'Seed',
                        RoundType: 'SEED',
                        date: '2022-01-01',
                        preMoneyValuation: 3000000,
                        postMoneyValuation: 4000000,
                        amountRaised: 1000000
                    }
                },
                {
                    row_data: {
                        roundId: 'FR-002',
                        roundName: 'Series A',
                        RoundType: 'SERIES_A',
                        date: '2023-06-01',
                        preMoneyValuation: 10000000,
                        postMoneyValuation: 15000000,
                        amountRaised: 5000000,
                        pricePerShare: 2.50
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const history = await FundraisingRound.getValuationHistory('company-123');

            expect(history).toHaveLength(2);
            expect(history[0].roundId).toBe('FR-001');
            expect(history[1].roundId).toBe('FR-002');
            expect(history[1].pricePerShare).toBe(2.50);
        });

        it('should calculate dilution for each round', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-001',
                        roundName: 'Series A',
                        RoundType: 'SERIES_A',
                        date: '2023-06-01',
                        preMoneyValuation: 10000000,
                        postMoneyValuation: 15000000,
                        amountRaised: 5000000
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const history = await FundraisingRound.getValuationHistory('company-123');

            expect(history[0].dilution).toBeCloseTo(33.33, 1);
        });

        it('should exclude rounds without valuation data', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-001',
                        roundName: 'Series A',
                        RoundType: 'SERIES_A',
                        date: '2023-06-01',
                        preMoneyValuation: 10000000
                    }
                },
                {
                    row_data: {
                        roundId: 'FR-002',
                        roundName: 'Bridge',
                        RoundType: 'BRIDGE',
                        date: '2024-01-01'
                        // No valuation data
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const history = await FundraisingRound.getValuationHistory('company-123');

            expect(history).toHaveLength(1);
            expect(history[0].roundId).toBe('FR-001');
        });
    });

    describe('getDownRounds()', () => {
        it('should return only down rounds', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-001',
                        RoundType: 'SERIES_A',
                        pricePerShare: 2.50
                    }
                },
                {
                    row_data: {
                        roundId: 'FR-002',
                        RoundType: 'SERIES_B',
                        pricePerShare: 1.50,
                        previousPricePerShare: 2.50,
                        isDownRound: true
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const downRounds = await FundraisingRound.getDownRounds('company-123');

            expect(downRounds).toHaveLength(1);
            expect(downRounds[0].roundId).toBe('FR-002');
        });
    });

    describe('getArmsLengthRounds()', () => {
        it('should return only arm\'s length rounds', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-001',
                        RoundType: 'SERIES_A',
                        preMoneyValuation: 10000000,
                        isArmsLength: true,
                        isInsiderRound: false
                    }
                },
                {
                    row_data: {
                        roundId: 'FR-002',
                        RoundType: 'BRIDGE',
                        preMoneyValuation: 12000000,
                        isArmsLength: false,
                        isInsiderRound: true
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const armsLengthRounds = await FundraisingRound.getArmsLengthRounds('company-123');

            expect(armsLengthRounds).toHaveLength(1);
            expect(armsLengthRounds[0].roundId).toBe('FR-001');
        });

        it('should exclude insider rounds', async () => {
            const mockRounds = [
                {
                    row_data: {
                        roundId: 'FR-001',
                        preMoneyValuation: 10000000,
                        isArmsLength: true,
                        isInsiderRound: true // Insider participation
                    }
                }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const armsLengthRounds = await FundraisingRound.getArmsLengthRounds('company-123');

            expect(armsLengthRounds).toHaveLength(0);
        });
    });

    describe('updateValuation()', () => {
        it('should update valuation fields', async () => {
            const mockRound = {
                row_data: {
                    roundId: 'FR-001',
                    preMoneyValuation: 10000000
                }
            };

            zerodbService.queryTable.mockResolvedValue({ data: [mockRound] });

            await FundraisingRound.updateValuation('FR-001', {
                postMoneyValuation: 15000000,
                pricePerShare: 2.50,
                isArmsLength: true
            });

            expect(zerodbService.updateRows).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    filter: { roundId: 'FR-001', _type: 'fundraising_round' },
                    update: {
                        $set: expect.objectContaining({
                            postMoneyValuation: 15000000,
                            pricePerShare: 2.50,
                            isArmsLength: true
                        })
                    }
                })
            );
        });

        it('should auto-detect down round on price update', async () => {
            const mockRound = {
                row_data: {
                    roundId: 'FR-001',
                    pricePerShare: 2.50
                }
            };

            zerodbService.queryTable.mockResolvedValue({ data: [mockRound] });

            await FundraisingRound.updateValuation('FR-001', {
                pricePerShare: 1.50,
                previousPricePerShare: 2.50
            });

            expect(zerodbService.updateRows).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    update: {
                        $set: expect.objectContaining({
                            isDownRound: true
                        })
                    }
                })
            );
        });

        it('should only update allowed valuation fields', async () => {
            const mockRound = {
                row_data: { roundId: 'FR-001' }
            };

            zerodbService.queryTable.mockResolvedValue({ data: [mockRound] });

            await FundraisingRound.updateValuation('FR-001', {
                preMoneyValuation: 10000000,
                roundName: 'Should Not Update', // Not in allowed fields
                maliciousField: 'Should Be Ignored'
            });

            const updateCall = zerodbService.updateRows.mock.calls[0][1];
            expect(updateCall.update.$set.preMoneyValuation).toBe(10000000);
            expect(updateCall.update.$set.roundName).toBeUndefined();
            expect(updateCall.update.$set.maliciousField).toBeUndefined();
        });
    });

    describe('link409AValuation()', () => {
        it('should link round to 409A valuation', async () => {
            const mockRound = {
                row_data: { roundId: 'FR-001' }
            };

            zerodbService.queryTable.mockResolvedValue({ data: [mockRound] });

            await FundraisingRound.link409AValuation('FR-001', 'val-409a-001');

            expect(zerodbService.updateRows).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    update: {
                        $set: expect.objectContaining({
                            valuation409aId: 'val-409a-001'
                        })
                    }
                })
            );
        });
    });

    describe('getRoundSummary()', () => {
        it('should return comprehensive round summary', async () => {
            const mockRound = {
                row_data: {
                    roundId: 'FR-001',
                    roundName: 'Series A',
                    RoundType: 'SERIES_A',
                    date: '2023-06-01',
                    closingDate: '2023-06-15',
                    amountRaised: 5000000,
                    preMoneyValuation: 10000000,
                    postMoneyValuation: 15000000,
                    pricePerShare: 2.50,
                    valuationMethod: 'PRICED',
                    isArmsLength: true,
                    valuation409aId: 'val-001',
                    investors: ['inv-1', 'inv-2'],
                    leadInvestorId: 'inv-1'
                }
            };

            zerodbService.queryTable.mockResolvedValue({ data: [mockRound] });

            const summary = await FundraisingRound.getRoundSummary('FR-001');

            expect(summary).toBeDefined();
            expect(summary.roundId).toBe('FR-001');
            expect(summary.roundName).toBe('Series A');
            expect(summary.amountRaised).toBe(5000000);
            expect(summary.preMoneyValuation).toBe(10000000);
            expect(summary.pricePerShare).toBe(2.50);
            expect(summary.isDownRound).toBe(false);
            expect(summary.dilution).toBeCloseTo(33.33, 1);
            expect(summary.impliedOwnershipSold).toBeCloseTo(33.33, 1);
            expect(summary.leadInvestorId).toBe('inv-1');
        });

        it('should return null if round not found', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });

            const summary = await FundraisingRound.getRoundSummary('NON-EXISTENT');

            expect(summary).toBeNull();
        });

        it('should use closingDate over date when available', async () => {
            const mockRound = {
                row_data: {
                    roundId: 'FR-001',
                    roundName: 'Series A',
                    RoundType: 'SERIES_A',
                    date: '2023-06-01',
                    closingDate: '2023-06-15',
                    amountRaised: 5000000,
                    investors: []
                }
            };

            zerodbService.queryTable.mockResolvedValue({ data: [mockRound] });

            const summary = await FundraisingRound.getRoundSummary('FR-001');

            expect(summary.date).toBe('2023-06-15');
        });
    });

    describe('findByCompany()', () => {
        it('should find all rounds for a company', async () => {
            const mockRounds = [
                { row_data: { roundId: 'FR-001', companyId: 'company-123' } },
                { row_data: { roundId: 'FR-002', companyId: 'company-123' } }
            ];

            zerodbService.queryTable.mockResolvedValue({ data: mockRounds });

            const rounds = await FundraisingRound.findByCompany('company-123');

            expect(rounds).toHaveLength(2);
            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    filter: expect.objectContaining({
                        companyId: 'company-123'
                    })
                })
            );
        });

        it('should support query options', async () => {
            zerodbService.queryTable.mockResolvedValue({ data: [] });

            await FundraisingRound.findByCompany('company-123', {
                sort: { date: -1 },
                limit: 10
            });

            expect(zerodbService.queryTable).toHaveBeenCalledWith(
                'securities',
                expect.objectContaining({
                    sort: { date: -1 },
                    limit: 10
                })
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle round with all valuation fields', async () => {
            const completeRound = {
                roundId: 'FR-COMPLETE',
                roundName: 'Complete Series A',
                amountRaised: 5000000,
                date: new Date(),
                investors: ['inv-1'],
                equityGiven: 20,
                RoundType: 'SERIES_A',
                preMoneyValuation: 10000000,
                postMoneyValuation: 15000000,
                pricePerShare: 2.50,
                previousPricePerShare: 2.00,
                valuationCap: null,
                discount: null,
                isDownRound: false,
                valuationMethod: 'PRICED',
                fullyDilutedShares: 6000000,
                fullyDilutedSharesPre: 4000000,
                fullyDilutedSharesPost: 6000000,
                optionPoolIncrease: 500000,
                optionPoolPercentage: 10,
                isArmsLength: true,
                isInsiderRound: false,
                isBridgeRound: false,
                leadInvestorId: 'inv-1',
                valuation409aId: 'val-001',
                boardApprovalDate: new Date(),
                closingDate: new Date()
            };

            zerodbService.insertRow.mockResolvedValue({
                data: [{ row_data: { ...completeRound, _id: 'complete-1' } }]
            });

            const round = await FundraisingRound.create(completeRound);

            expect(round).toBeDefined();
        });

        it('should handle legacy round types for backwards compatibility', async () => {
            const legacyRound = {
                roundId: 'FR-LEGACY',
                roundName: 'Legacy Seed',
                amountRaised: 500000,
                date: new Date(),
                investors: ['inv-1'],
                equityGiven: 10,
                RoundType: 'Seed' // Legacy format
            };

            await expect(FundraisingRound.create(legacyRound)).resolves.toBeDefined();
        });

        it('should handle bridge round with minimal valuation', async () => {
            const bridgeRound = {
                roundId: 'FR-BRIDGE',
                roundName: 'Bridge Loan',
                amountRaised: 200000,
                date: new Date(),
                investors: ['inv-1'],
                equityGiven: 0,
                RoundType: 'BRIDGE',
                isBridgeRound: true,
                isInsiderRound: true,
                valuationMethod: 'CONVERTIBLE_NOTE'
            };

            await expect(FundraisingRound.create(bridgeRound)).resolves.toBeDefined();
        });
    });
});
