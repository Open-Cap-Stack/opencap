/**
 * Dilution Calculation Service Tests
 * Issue #195: Interactive Fundraising Modeling Engine
 *
 * Tests for dilution calculation and pro-forma cap table generation.
 * Following TDD principles - tests written before implementation.
 */

const DilutionCalculationService = require('../../../services/dilutionCalculationService');

describe('DilutionCalculationService', () => {
    describe('calculateProFormaCapTable', () => {
        it('should calculate pro-forma cap table for simple Series A', () => {
            const baseCapTable = {
                totalShares: 10000000,
                fullyDilutedShares: 10000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        name: 'Common Stock',
                        shares: 10000000,
                        pricePerShare: 0.01,
                        preferenceType: 'common'
                    }
                ],
                stakeholders: [
                    {
                        stakeholderId: 'founder-1',
                        name: 'Founder 1',
                        shareClassId: 'common-1',
                        shares: 7000000,
                        ownershipPercentage: 70
                    },
                    {
                        stakeholderId: 'founder-2',
                        name: 'Founder 2',
                        shareClassId: 'common-1',
                        shares: 3000000,
                        ownershipPercentage: 30
                    }
                ],
                optionPool: {
                    allocated: 0,
                    unallocated: 0,
                    total: 0
                }
            };

            const financing = {
                amount: 2000000,
                pricePerShare: 1.00,
                investors: [
                    {
                        investorId: 'investor-1',
                        name: 'VC Fund',
                        investmentAmount: 2000000,
                        leadInvestor: true
                    }
                ]
            };

            const result = DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);

            expect(result).toBeDefined();
            expect(result.totalShares).toBe(12000000);
            expect(result.stakeholders).toHaveLength(3);

            // Check founder dilution
            const founder1 = result.stakeholders.find(s => s.stakeholderId === 'founder-1');
            expect(founder1).toBeDefined();
            expect(founder1.shares).toBe(7000000);
            expect(founder1.ownershipPercentage).toBeCloseTo(58.33, 2);
        });

        it('should handle option pool expansion pre-money', () => {
            const baseCapTable = {
                totalShares: 10000000,
                fullyDilutedShares: 10000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        name: 'Common Stock',
                        shares: 10000000,
                        pricePerShare: 0.01,
                        preferenceType: 'common'
                    }
                ],
                stakeholders: [
                    {
                        stakeholderId: 'founder-1',
                        name: 'Founder 1',
                        shareClassId: 'common-1',
                        shares: 10000000,
                        ownershipPercentage: 100
                    }
                ],
                optionPool: { allocated: 0, unallocated: 0, total: 0 }
            };

            const financing = {
                amount: 5000000,
                pricePerShare: 2.00,
                optionPoolExpansion: true,
                optionPoolTargetPercentage: 20,
                optionPoolPreOrPost: 'pre',
                investors: [
                    {
                        investorId: 'investor-1',
                        name: 'Lead Investor',
                        investmentAmount: 5000000
                    }
                ]
            };

            const result = DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);

            expect(result.optionPool).toBeDefined();
            expect(result.optionPool.percentageOfCapitalization).toBeCloseTo(20, 1);

            // Founders should be diluted by both option pool and new investment
            const founder = result.stakeholders.find(s => s.stakeholderId === 'founder-1');
            expect(founder.ownershipPercentage).toBeLessThan(100);
        });

        it('should handle option pool expansion post-money', () => {
            const baseCapTable = {
                totalShares: 10000000,
                fullyDilutedShares: 10000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        name: 'Common Stock',
                        shares: 10000000,
                        pricePerShare: 0.01,
                        preferenceType: 'common'
                    }
                ],
                stakeholders: [
                    {
                        stakeholderId: 'founder-1',
                        name: 'Founder 1',
                        shareClassId: 'common-1',
                        shares: 10000000,
                        ownershipPercentage: 100
                    }
                ],
                optionPool: { allocated: 0, unallocated: 0, total: 0 }
            };

            const financing = {
                amount: 3000000,
                pricePerShare: 1.50,
                optionPoolExpansion: true,
                optionPoolTargetPercentage: 15,
                optionPoolPreOrPost: 'post',
                investors: [
                    {
                        investorId: 'investor-1',
                        name: 'VC Partner',
                        investmentAmount: 3000000
                    }
                ]
            };

            const result = DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);

            expect(result.optionPool.percentageOfCapitalization).toBeCloseTo(15, 1);

            // Post-money option pool should dilute both founders and investors
            const founder = result.stakeholders.find(s => s.stakeholderId === 'founder-1');
            const investor = result.stakeholders.find(s => s.investorId === 'investor-1');

            expect(founder).toBeDefined();
            expect(investor).toBeDefined();
            expect(founder.ownershipPercentage + investor.ownershipPercentage).toBeLessThan(85);
        });

        it('should handle multiple investors with different amounts', () => {
            const baseCapTable = {
                totalShares: 10000000,
                fullyDilutedShares: 10000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        name: 'Common Stock',
                        shares: 10000000,
                        pricePerShare: 0.01,
                        preferenceType: 'common'
                    }
                ],
                stakeholders: [
                    {
                        stakeholderId: 'founder-1',
                        name: 'Founder',
                        shareClassId: 'common-1',
                        shares: 10000000,
                        ownershipPercentage: 100
                    }
                ],
                optionPool: { allocated: 0, unallocated: 0, total: 0 }
            };

            const financing = {
                amount: 5000000,
                pricePerShare: 2.00,
                investors: [
                    {
                        investorId: 'investor-1',
                        name: 'Lead Investor',
                        investmentAmount: 3000000,
                        leadInvestor: true
                    },
                    {
                        investorId: 'investor-2',
                        name: 'Co-Investor',
                        investmentAmount: 2000000,
                        leadInvestor: false
                    }
                ]
            };

            const result = DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);

            const lead = result.stakeholders.find(s => s.investorId === 'investor-1');
            const coInvestor = result.stakeholders.find(s => s.investorId === 'investor-2');

            expect(lead.investmentAmount).toBe(3000000);
            expect(coInvestor.investmentAmount).toBe(2000000);
            expect(lead.ownershipPercentage).toBeGreaterThan(coInvestor.ownershipPercentage);
        });

        it('should throw error for invalid cap table', () => {
            expect(() => {
                DilutionCalculationService.calculateProFormaCapTable(null, {});
            }).toThrow('Base cap table is required');
        });

        it('should throw error for invalid financing terms', () => {
            const baseCapTable = {
                totalShares: 10000000,
                stakeholders: []
            };

            expect(() => {
                DilutionCalculationService.calculateProFormaCapTable(baseCapTable, null);
            }).toThrow('Financing terms are required');
        });

        it('should calculate valuation metrics correctly', () => {
            const baseCapTable = {
                totalShares: 10000000,
                fullyDilutedShares: 10000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        name: 'Common Stock',
                        shares: 10000000,
                        pricePerShare: 0.01,
                        preferenceType: 'common'
                    }
                ],
                stakeholders: [
                    {
                        stakeholderId: 'founder-1',
                        name: 'Founder',
                        shareClassId: 'common-1',
                        shares: 10000000,
                        ownershipPercentage: 100
                    }
                ],
                optionPool: { allocated: 0, unallocated: 0, total: 0 }
            };

            const financing = {
                amount: 5000000,
                pricePerShare: 2.00,
                preMoneyValuation: 10000000,
                investors: [
                    {
                        investorId: 'investor-1',
                        name: 'VC',
                        investmentAmount: 5000000
                    }
                ]
            };

            const result = DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);

            expect(result.postMoneyValuation).toBe(15000000);
        });
    });

    describe('calculateDilution', () => {
        it('should calculate dilution for all stakeholders', () => {
            const baseCapTable = {
                stakeholders: [
                    {
                        stakeholderId: 'founder-1',
                        name: 'Founder 1',
                        ownershipPercentage: 70
                    },
                    {
                        stakeholderId: 'founder-2',
                        name: 'Founder 2',
                        ownershipPercentage: 30
                    }
                ]
            };

            const proFormaCapTable = {
                stakeholders: [
                    {
                        stakeholderId: 'founder-1',
                        name: 'Founder 1',
                        ownershipPercentage: 56
                    },
                    {
                        stakeholderId: 'founder-2',
                        name: 'Founder 2',
                        ownershipPercentage: 24
                    },
                    {
                        investorId: 'investor-1',
                        name: 'New Investor',
                        ownershipPercentage: 20
                    }
                ]
            };

            const result = DilutionCalculationService.calculateDilution(baseCapTable, proFormaCapTable);

            expect(result.byStakeholder).toHaveLength(2);

            const founder1Dilution = result.byStakeholder.find(d => d.stakeholderId === 'founder-1');
            expect(founder1Dilution.preFunding).toBe(70);
            expect(founder1Dilution.postFunding).toBe(56);
            expect(founder1Dilution.absoluteDilution).toBe(14);
            expect(founder1Dilution.dilutionPercentage).toBeCloseTo(20, 1);
        });

        it('should calculate average dilution correctly', () => {
            const baseCapTable = {
                stakeholders: [
                    { stakeholderId: '1', ownershipPercentage: 50 },
                    { stakeholderId: '2', ownershipPercentage: 50 }
                ]
            };

            const proFormaCapTable = {
                stakeholders: [
                    { stakeholderId: '1', ownershipPercentage: 40 },
                    { stakeholderId: '2', ownershipPercentage: 40 }
                ]
            };

            const result = DilutionCalculationService.calculateDilution(baseCapTable, proFormaCapTable);

            expect(result.averageDilution).toBeCloseTo(20, 1);
        });

        it('should handle zero ownership correctly', () => {
            const baseCapTable = {
                stakeholders: [
                    { stakeholderId: '1', ownershipPercentage: 0 }
                ]
            };

            const proFormaCapTable = {
                stakeholders: [
                    { stakeholderId: '1', ownershipPercentage: 0 }
                ]
            };

            const result = DilutionCalculationService.calculateDilution(baseCapTable, proFormaCapTable);

            expect(result.averageDilution).toBe(0);
        });
    });

    describe('calculateWaterfallWithNewRound', () => {
        it('should integrate with waterfall analysis for exit scenarios', () => {
            const proFormaCapTable = {
                totalShares: 15000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        name: 'Common Stock',
                        shares: 10000000,
                        pricePerShare: 0.01,
                        preferenceType: 'common'
                    },
                    {
                        shareClassId: 'series-a',
                        name: 'Series A Preferred',
                        shares: 5000000,
                        pricePerShare: 1.00,
                        preferenceType: 'preferred',
                        liquidationMultiple: 1,
                        participationRights: false
                    }
                ]
            };

            const exitValuation = 30000000;

            const result = DilutionCalculationService.calculateWaterfallWithNewRound(
                proFormaCapTable,
                exitValuation
            );

            expect(result).toBeDefined();
            expect(result.shareClassResults).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.summary.totalDistributed).toBeGreaterThan(0);
        });

        it('should calculate waterfall with participating preferred', () => {
            const proFormaCapTable = {
                totalShares: 12000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        name: 'Common Stock',
                        shares: 10000000,
                        pricePerShare: 0.01,
                        preferenceType: 'common'
                    },
                    {
                        shareClassId: 'series-a',
                        name: 'Series A Preferred',
                        shares: 2000000,
                        pricePerShare: 2.50,
                        preferenceType: 'preferred',
                        liquidationMultiple: 1,
                        participationRights: true
                    }
                ]
            };

            const exitValuation = 25000000;

            const result = DilutionCalculationService.calculateWaterfallWithNewRound(
                proFormaCapTable,
                exitValuation
            );

            const seriesA = result.shareClassResults.find(r => r.shareClassId === 'series-a');
            expect(seriesA.preferenceAmount).toBeGreaterThan(0);
            expect(seriesA.participationAmount).toBeGreaterThan(0);
        });
    });

    describe('generateComparisonReport', () => {
        it('should compare multiple scenarios', () => {
            const scenarios = [
                {
                    name: 'Low Valuation',
                    proFormaCapTable: {
                        postMoneyValuation: 10000000,
                        stakeholders: [
                            { stakeholderId: 'founder-1', ownershipPercentage: 60 }
                        ]
                    },
                    dilutionAnalysis: { averageDilution: 30 }
                },
                {
                    name: 'High Valuation',
                    proFormaCapTable: {
                        postMoneyValuation: 15000000,
                        stakeholders: [
                            { stakeholderId: 'founder-1', ownershipPercentage: 70 }
                        ]
                    },
                    dilutionAnalysis: { averageDilution: 20 }
                }
            ];

            const result = DilutionCalculationService.generateComparisonReport(scenarios);

            expect(result).toBeDefined();
            expect(result.scenarios).toHaveLength(2);
            expect(result.summary).toBeDefined();
            expect(result.summary.minValuation).toBe(10000000);
            expect(result.summary.maxValuation).toBe(15000000);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero investment amount', () => {
            const baseCapTable = {
                totalShares: 10000000,
                shareClasses: [{ shareClassId: 'common-1', shares: 10000000, preferenceType: 'common' }],
                stakeholders: [{ stakeholderId: 'founder-1', shares: 10000000, ownershipPercentage: 100 }],
                optionPool: { allocated: 0, unallocated: 0, total: 0 }
            };

            const financing = {
                amount: 0,
                pricePerShare: 1.00,
                investors: []
            };

            const result = DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);
            expect(result.totalShares).toBe(10000000);
        });

        it('should handle existing option pool correctly', () => {
            const baseCapTable = {
                totalShares: 10000000,
                fullyDilutedShares: 11000000,
                shareClasses: [
                    {
                        shareClassId: 'common-1',
                        shares: 10000000,
                        preferenceType: 'common'
                    }
                ],
                stakeholders: [
                    { stakeholderId: 'founder-1', shares: 10000000, ownershipPercentage: 90.91 }
                ],
                optionPool: {
                    allocated: 500000,
                    unallocated: 500000,
                    total: 1000000
                }
            };

            const financing = {
                amount: 2000000,
                pricePerShare: 1.00,
                investors: [
                    { investorId: 'investor-1', investmentAmount: 2000000 }
                ]
            };

            const result = DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);

            expect(result.optionPool.total).toBeGreaterThanOrEqual(1000000);
        });

        it('should validate price per share is positive', () => {
            const baseCapTable = {
                totalShares: 10000000,
                shareClasses: [],
                stakeholders: [],
                optionPool: { allocated: 0, unallocated: 0, total: 0 }
            };

            const financing = {
                amount: 1000000,
                pricePerShare: -1.00,
                investors: []
            };

            expect(() => {
                DilutionCalculationService.calculateProFormaCapTable(baseCapTable, financing);
            }).toThrow();
        });
    });
});
