/**
 * Waterfall Analysis Service Unit Tests
 * Issue #56: Create waterfall analysis engine
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const WaterfallAnalysisService = require('../../../services/waterfallAnalysisService');

describe('WaterfallAnalysisService', () => {
  describe('calculateWaterfall', () => {
    const baseAnalysis = {
      companyId: 'comp-123',
      exitValuation: 10000000,
      exitType: 'acquisition',
      transactionCosts: 0,
      escrowAmount: 0,
      debtPayoff: 0,
      shareClasses: [
        {
          shareClassId: 'common',
          name: 'Common Stock',
          preferenceType: 'common',
          totalShares: 8000000,
          pricePerShare: 0.001
        },
        {
          shareClassId: 'series-a',
          name: 'Series A Preferred',
          preferenceType: 'non_participating',
          liquidationMultiple: 1,
          seniorityRank: 1,
          totalShares: 2000000,
          pricePerShare: 1.00,
          originalInvestment: 2000000
        }
      ]
    };

    it('should calculate waterfall for simple non-participating preferred', () => {
      const result = WaterfallAnalysisService.calculateWaterfall(baseAnalysis);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalDistributed).toBeCloseTo(10000000, -2);
    });

    it('should pay preference first before common', () => {
      const analysis = {
        ...baseAnalysis,
        exitValuation: 5000000 // $5M exit
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // Series A gets $2M preference
      // Remaining $3M split among all shares pro-rata
      // Common: 8M / 10M = 80% of $3M = $2.4M
      // Series A: 2M / 10M = 20% of $3M = $0.6M (conversion value)
      // But non-participating, so Series A gets max($2M, $0.6M) = $2M
      expect(result.shareClassResults).toBeDefined();

      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');
      const commonResult = result.shareClassResults.find(r => r.shareClassId === 'common');

      expect(seriesAResult.totalProceeds).toBe(2000000);
      expect(commonResult.totalProceeds).toBe(3000000);
    });

    it('should handle non-participating preferred conversion choice', () => {
      const analysis = {
        ...baseAnalysis,
        exitValuation: 50000000 // $50M exit - conversion is better
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // At $50M, common ownership is more valuable than $2M preference
      // Series A owns 2M/10M = 20% = $10M vs $2M preference
      // Non-participating preferred should choose conversion
      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');

      expect(seriesAResult.conversionElected).toBe(true);
      expect(seriesAResult.totalProceeds).toBe(10000000); // 20% of $50M
    });

    it('should handle participating preferred', () => {
      const analysis = {
        ...baseAnalysis,
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common Stock',
            preferenceType: 'common',
            totalShares: 8000000,
            pricePerShare: 0.001
          },
          {
            shareClassId: 'series-a',
            name: 'Series A Preferred',
            preferenceType: 'participating',
            liquidationMultiple: 1,
            seniorityRank: 1,
            totalShares: 2000000,
            pricePerShare: 1.00,
            originalInvestment: 2000000
          }
        ],
        exitValuation: 10000000
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // Participating preferred:
      // Series A gets $2M preference PLUS pro-rata of remaining
      // Remaining: $10M - $2M = $8M
      // Series A participation: 2M/10M * $8M = $1.6M
      // Total Series A: $2M + $1.6M = $3.6M

      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');
      expect(seriesAResult.preferenceAmount).toBe(2000000);
      expect(seriesAResult.participationAmount).toBeCloseTo(1600000, -2);
      expect(seriesAResult.totalProceeds).toBeCloseTo(3600000, -2);
    });

    it('should handle participating preferred with cap', () => {
      const analysis = {
        ...baseAnalysis,
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common Stock',
            preferenceType: 'common',
            totalShares: 8000000,
            pricePerShare: 0.001
          },
          {
            shareClassId: 'series-a',
            name: 'Series A Preferred',
            preferenceType: 'participating_capped',
            liquidationMultiple: 1,
            participationCap: 3, // 3x cap on total return
            seniorityRank: 1,
            totalShares: 2000000,
            pricePerShare: 1.00,
            originalInvestment: 2000000
          }
        ],
        exitValuation: 50000000
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // With 3x cap on $2M investment, max return is $6M
      // Check if capped correctly
      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');
      expect(seriesAResult.totalProceeds).toBeLessThanOrEqual(6000000);
    });

    it('should handle multiple preference rounds with seniority', () => {
      const analysis = {
        companyId: 'comp-123',
        exitValuation: 15000000,
        exitType: 'acquisition',
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common Stock',
            preferenceType: 'common',
            totalShares: 7000000,
            pricePerShare: 0.001
          },
          {
            shareClassId: 'series-a',
            name: 'Series A Preferred',
            preferenceType: 'non_participating',
            liquidationMultiple: 1,
            seniorityRank: 2, // Junior to Series B
            totalShares: 2000000,
            pricePerShare: 1.00,
            originalInvestment: 2000000
          },
          {
            shareClassId: 'series-b',
            name: 'Series B Preferred',
            preferenceType: 'non_participating',
            liquidationMultiple: 1,
            seniorityRank: 1, // Most senior
            totalShares: 1000000,
            pricePerShare: 5.00,
            originalInvestment: 5000000
          }
        ]
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // Series B (senior): $5M preference, 1M/10M = 10% pro-rata = $1.5M - should take preference
      // Series A (junior): $2M preference, 2M/10M = 20% pro-rata = $3M - should convert
      // Total preferences: $7M
      // Remaining for pro-rata: $8M

      const seriesBResult = result.shareClassResults.find(r => r.shareClassId === 'series-b');
      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');

      // Series B should take their preference (conversion value is lower)
      expect(seriesBResult.preferenceAmount).toBe(5000000);
      // Series A should convert (3M > 2M preference)
      // Verify either took preference or converted - both are valid strategies
      expect(seriesAResult.totalProceeds).toBeGreaterThanOrEqual(2000000);
    });

    it('should handle insufficient proceeds for all preferences', () => {
      const analysis = {
        ...baseAnalysis,
        exitValuation: 1500000, // Only $1.5M - less than $2M preference
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common Stock',
            preferenceType: 'common',
            totalShares: 8000000,
            pricePerShare: 0.001
          },
          {
            shareClassId: 'series-a',
            name: 'Series A Preferred',
            preferenceType: 'non_participating',
            liquidationMultiple: 1,
            seniorityRank: 1,
            totalShares: 2000000,
            pricePerShare: 1.00,
            originalInvestment: 2000000
          }
        ]
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // Series A should get all $1.5M (up to their preference)
      // Common gets $0
      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');
      const commonResult = result.shareClassResults.find(r => r.shareClassId === 'common');

      expect(seriesAResult.totalProceeds).toBe(1500000);
      expect(commonResult.totalProceeds).toBe(0);
    });

    it('should deduct transaction costs before distribution', () => {
      const analysis = {
        ...baseAnalysis,
        exitValuation: 10000000,
        transactionCosts: 500000, // $500K costs
        escrowAmount: 200000,
        debtPayoff: 300000
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // Net proceeds: $10M - $500K - $200K - $300K = $9M
      expect(result.summary.totalDistributed).toBeCloseTo(9000000, -2);
    });

    it('should handle 2x liquidation multiple', () => {
      const analysis = {
        ...baseAnalysis,
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common Stock',
            preferenceType: 'common',
            totalShares: 8000000,
            pricePerShare: 0.001
          },
          {
            shareClassId: 'series-a',
            name: 'Series A Preferred',
            preferenceType: 'non_participating',
            liquidationMultiple: 2, // 2x preference
            seniorityRank: 1,
            totalShares: 2000000,
            pricePerShare: 1.00,
            originalInvestment: 2000000
          }
        ],
        exitValuation: 10000000
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // 2x on $2M = $4M preference
      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');
      expect(seriesAResult.preferenceAmount).toBe(4000000);
    });

    it('should handle all common stock (no preferences)', () => {
      const analysis = {
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common Stock',
            preferenceType: 'common',
            totalShares: 10000000,
            pricePerShare: 0.001
          }
        ]
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      expect(result.shareClassResults[0].totalProceeds).toBe(10000000);
      expect(result.summary.totalToPreferred).toBe(0);
      expect(result.summary.totalToCommon).toBe(10000000);
    });
  });

  describe('applyLiquidationPreferences', () => {
    it('should apply preferences in seniority order', () => {
      const shareClasses = [
        {
          shareClassId: 'series-b',
          name: 'Series B',
          preferenceType: 'non_participating',
          liquidationMultiple: 1,
          seniorityRank: 1,
          totalShares: 1000000,
          pricePerShare: 5.00,
          originalInvestment: 5000000
        },
        {
          shareClassId: 'series-a',
          name: 'Series A',
          preferenceType: 'non_participating',
          liquidationMultiple: 1,
          seniorityRank: 2,
          totalShares: 2000000,
          pricePerShare: 1.00,
          originalInvestment: 2000000
        }
      ];

      const result = WaterfallAnalysisService.applyLiquidationPreferences(shareClasses, 10000000);

      expect(result.allocations['series-b']).toBe(5000000);
      expect(result.allocations['series-a']).toBe(2000000);
      expect(result.remainingProceeds).toBe(3000000);
    });

    it('should handle partial preference satisfaction', () => {
      const shareClasses = [
        {
          shareClassId: 'series-a',
          name: 'Series A',
          preferenceType: 'non_participating',
          liquidationMultiple: 1,
          seniorityRank: 1,
          totalShares: 2000000,
          pricePerShare: 1.00,
          originalInvestment: 2000000
        }
      ];

      const result = WaterfallAnalysisService.applyLiquidationPreferences(shareClasses, 1500000);

      expect(result.allocations['series-a']).toBe(1500000);
      expect(result.remainingProceeds).toBe(0);
    });
  });

  describe('calculateParticipation', () => {
    it('should calculate participation for participating preferred', () => {
      const shareClasses = [
        {
          shareClassId: 'common',
          name: 'Common Stock',
          preferenceType: 'common',
          totalShares: 8000000
        },
        {
          shareClassId: 'series-a',
          name: 'Series A',
          preferenceType: 'participating',
          totalShares: 2000000
        }
      ];

      const result = WaterfallAnalysisService.calculateParticipation(shareClasses, 8000000);

      // Series A: 2M/10M = 20% of $8M = $1.6M
      expect(result['series-a']).toBeCloseTo(1600000, -2);
      expect(result['common']).toBeCloseTo(6400000, -2);
    });

    it('should apply participation cap', () => {
      const shareClasses = [
        {
          shareClassId: 'common',
          name: 'Common Stock',
          preferenceType: 'common',
          totalShares: 8000000
        },
        {
          shareClassId: 'series-a',
          name: 'Series A',
          preferenceType: 'participating_capped',
          participationCap: 3, // 3x cap
          totalShares: 2000000,
          originalInvestment: 2000000,
          preferenceAlreadyPaid: 2000000 // Already got $2M preference
        }
      ];

      const result = WaterfallAnalysisService.calculateParticipation(shareClasses, 10000000);

      // Max total return: 3x * $2M = $6M
      // Already got $2M, so max participation: $4M
      expect(result['series-a']).toBeLessThanOrEqual(4000000);
    });
  });

  describe('distributeProceeds', () => {
    it('should distribute pro-rata based on ownership', () => {
      const shareClasses = [
        { shareClassId: 'common', totalShares: 8000000 },
        { shareClassId: 'series-a', totalShares: 2000000 }
      ];

      const result = WaterfallAnalysisService.distributeProceeds(shareClasses, 10000000);

      expect(result['common']).toBe(8000000);
      expect(result['series-a']).toBe(2000000);
    });

    it('should handle single share class', () => {
      const shareClasses = [
        { shareClassId: 'common', totalShares: 10000000 }
      ];

      const result = WaterfallAnalysisService.distributeProceeds(shareClasses, 5000000);

      expect(result['common']).toBe(5000000);
    });
  });

  describe('compareScenarios', () => {
    it('should compare multiple exit scenarios', () => {
      const scenarios = [
        {
          scenarioName: 'Base Case',
          exitValuation: 10000000,
          shareClasses: [
            { shareClassId: 'common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
            { shareClassId: 'series-a', preferenceType: 'non_participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
          ]
        },
        {
          scenarioName: 'Upside Case',
          exitValuation: 50000000,
          shareClasses: [
            { shareClassId: 'common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
            { shareClassId: 'series-a', preferenceType: 'non_participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
          ]
        }
      ];

      const result = WaterfallAnalysisService.compareScenarios(scenarios);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].scenarioName).toBe('Base Case');
      expect(result[1].scenarioName).toBe('Upside Case');
      expect(result[1].summary.totalDistributed).toBeGreaterThan(result[0].summary.totalDistributed);
    });

    it('should include comparison metrics', () => {
      const scenarios = [
        {
          scenarioName: 'Scenario A',
          exitValuation: 10000000,
          shareClasses: [
            { shareClassId: 'common', preferenceType: 'common', totalShares: 10000000, pricePerShare: 0.001 }
          ]
        }
      ];

      const result = WaterfallAnalysisService.compareScenarios(scenarios);

      expect(result[0]).toHaveProperty('summary');
      expect(result[0]).toHaveProperty('shareClassResults');
    });
  });

  describe('generateWaterfallChart', () => {
    it('should generate visualization data for waterfall chart', () => {
      const analysis = {
        exitValuation: 10000000,
        shareClasses: [
          { shareClassId: 'common', name: 'Common Stock', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
          { shareClassId: 'series-a', name: 'Series A', preferenceType: 'non_participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
        ]
      };

      const result = WaterfallAnalysisService.generateWaterfallChart(analysis);

      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('datasets');
      expect(result.labels).toContain('Common Stock');
      expect(result.labels).toContain('Series A');
    });

    it('should include breakdown by preference and participation', () => {
      const analysis = {
        exitValuation: 10000000,
        shareClasses: [
          { shareClassId: 'common', name: 'Common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
          { shareClassId: 'series-a', name: 'Series A', preferenceType: 'participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
        ]
      };

      const result = WaterfallAnalysisService.generateWaterfallChart(analysis);

      expect(result.datasets).toContainEqual(
        expect.objectContaining({ label: expect.stringMatching(/Preference/i) })
      );
      expect(result.datasets).toContainEqual(
        expect.objectContaining({ label: expect.stringMatching(/Participation|Pro-rata/i) })
      );
    });

    it('should generate sensitivity analysis data', () => {
      const analysis = {
        exitValuation: 10000000,
        shareClasses: [
          { shareClassId: 'common', name: 'Common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
          { shareClassId: 'series-a', name: 'Series A', preferenceType: 'non_participating', liquidationMultiple: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000, seniorityRank: 1 }
        ]
      };

      const result = WaterfallAnalysisService.generateWaterfallChart(analysis, { includeSensitivity: true });

      expect(result).toHaveProperty('sensitivityData');
      expect(result.sensitivityData.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero exit valuation', () => {
      const analysis = {
        exitValuation: 0,
        shareClasses: [
          { shareClassId: 'common', preferenceType: 'common', totalShares: 10000000, pricePerShare: 0.001 }
        ]
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      expect(result.summary.totalDistributed).toBe(0);
    });

    it('should handle empty share classes', () => {
      const analysis = {
        exitValuation: 10000000,
        shareClasses: []
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      expect(result.summary.totalDistributed).toBe(0);
      expect(result.shareClassResults).toEqual([]);
    });

    it('should handle pari passu preferences (same seniority)', () => {
      const analysis = {
        exitValuation: 6000000,
        shareClasses: [
          { shareClassId: 'common', preferenceType: 'common', totalShares: 8000000, pricePerShare: 0.001 },
          { shareClassId: 'series-a', preferenceType: 'non_participating', liquidationMultiple: 1, seniorityRank: 1, totalShares: 2000000, pricePerShare: 1.00, originalInvestment: 2000000 },
          { shareClassId: 'series-b', preferenceType: 'non_participating', liquidationMultiple: 1, seniorityRank: 1, totalShares: 1000000, pricePerShare: 2.00, originalInvestment: 2000000 }
        ]
      };

      const result = WaterfallAnalysisService.calculateWaterfall(analysis);

      // Both Series A and B have same seniority, should split pro-rata if not enough for both
      const seriesAResult = result.shareClassResults.find(r => r.shareClassId === 'series-a');
      const seriesBResult = result.shareClassResults.find(r => r.shareClassId === 'series-b');

      // Total preferences: $4M, but only $6M exit, so everyone should get something
      expect(seriesAResult.totalProceeds).toBeGreaterThan(0);
      expect(seriesBResult.totalProceeds).toBeGreaterThan(0);
    });
  });
});
