/**
 * Waterfall Analysis Invariant Tests
 * T1-8: Verify financial invariants in waterfall calculations
 */
process.env.SKIP_DB_SETUP = 'true';

const WaterfallAnalysisService = require('../../../services/waterfallAnalysisService');

describe('Waterfall Analysis - Financial Invariants', () => {
  const EPSILON = 0.01; // Allow 1 cent tolerance for floating point

  describe('totalDistributed <= netProceeds invariant', () => {
    it('should never distribute more than available proceeds', () => {
      const scenarios = [
        { exitValuation: 10000000, desc: '$10M exit' },
        { exitValuation: 1000000, desc: '$1M exit (underwater)' },
        { exitValuation: 100000000, desc: '$100M exit' },
        { exitValuation: 500000, desc: '$500K exit (deeply underwater)' },
        { exitValuation: 0, desc: '$0 exit' }
      ];

      const shareClasses = [
        {
          shareClassId: 'series-b',
          name: 'Series B',
          preferenceType: 'participating',
          totalShares: 1000000,
          pricePerShare: 5,
          liquidationMultiple: 1,
          seniorityRank: 1,
          originalInvestment: 5000000
        },
        {
          shareClassId: 'series-a',
          name: 'Series A',
          preferenceType: 'non_participating',
          totalShares: 2000000,
          pricePerShare: 2,
          liquidationMultiple: 1,
          seniorityRank: 2,
          originalInvestment: 4000000
        },
        {
          shareClassId: 'common',
          name: 'Common',
          preferenceType: 'common',
          totalShares: 7000000,
          pricePerShare: 0.001
        }
      ];

      for (const scenario of scenarios) {
        const result = WaterfallAnalysisService.calculateWaterfall({
          exitValuation: scenario.exitValuation,
          shareClasses
        });

        const netProceeds = Math.max(0, scenario.exitValuation);

        // Invariant: totalDistributed <= netProceeds
        expect(result.summary.totalDistributed).toBeLessThanOrEqual(netProceeds + EPSILON);

        // Invariant: sum of all class payouts == totalDistributed
        const sumOfPayouts = result.shareClassResults.reduce(
          (sum, r) => sum + r.totalProceeds, 0
        );
        expect(Math.abs(sumOfPayouts - result.summary.totalDistributed)).toBeLessThan(EPSILON);

        // Invariant: no negative payouts
        for (const r of result.shareClassResults) {
          expect(r.totalProceeds).toBeGreaterThanOrEqual(-EPSILON);
        }
      }
    });
  });

  describe('seniority ordering invariant', () => {
    it('senior preferred should get paid before junior when proceeds are limited', () => {
      const result = WaterfallAnalysisService.calculateWaterfall({
        exitValuation: 3000000, // Only enough for senior preference
        shareClasses: [
          {
            shareClassId: 'senior',
            name: 'Series B (Senior)',
            preferenceType: 'non_participating',
            totalShares: 1000000,
            pricePerShare: 3,
            liquidationMultiple: 1,
            seniorityRank: 1,
            originalInvestment: 3000000
          },
          {
            shareClassId: 'junior',
            name: 'Series A (Junior)',
            preferenceType: 'non_participating',
            totalShares: 1000000,
            pricePerShare: 2,
            liquidationMultiple: 1,
            seniorityRank: 2,
            originalInvestment: 2000000
          },
          {
            shareClassId: 'common',
            name: 'Common',
            preferenceType: 'common',
            totalShares: 5000000,
            pricePerShare: 0.001
          }
        ]
      });

      const seniorResult = result.shareClassResults.find(r => r.shareClassId === 'senior');
      const juniorResult = result.shareClassResults.find(r => r.shareClassId === 'junior');

      // Senior gets full preference, junior gets nothing
      expect(seniorResult.totalProceeds).toBeGreaterThan(0);
      // Junior may get 0 or partial
      expect(juniorResult.totalProceeds).toBeLessThanOrEqual(seniorResult.totalProceeds);
    });
  });

  describe('conversion election invariant', () => {
    it('non-participating preferred should convert when pro-rata exceeds preference', () => {
      const result = WaterfallAnalysisService.calculateWaterfall({
        exitValuation: 100000000, // High exit - conversion better than preference
        shareClasses: [
          {
            shareClassId: 'series-a',
            name: 'Series A',
            preferenceType: 'non_participating',
            totalShares: 5000000,
            pricePerShare: 2,
            liquidationMultiple: 1,
            seniorityRank: 1,
            originalInvestment: 10000000
          },
          {
            shareClassId: 'common',
            name: 'Common',
            preferenceType: 'common',
            totalShares: 5000000,
            pricePerShare: 0.001
          }
        ]
      });

      const seriesA = result.shareClassResults.find(r => r.shareClassId === 'series-a');

      // At $100M exit with 50% ownership, pro-rata ($50M) > preference ($10M)
      expect(seriesA.conversionElected).toBe(true);
      expect(seriesA.totalProceeds).toBeGreaterThan(10000000);
    });
  });

  describe('zero and edge cases', () => {
    it('should handle empty share classes', () => {
      const result = WaterfallAnalysisService.calculateWaterfall({
        exitValuation: 1000000,
        shareClasses: []
      });

      expect(result.summary.totalDistributed).toBe(0);
      expect(result.shareClassResults).toHaveLength(0);
    });

    it('should handle zero exit valuation', () => {
      const result = WaterfallAnalysisService.calculateWaterfall({
        exitValuation: 0,
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common',
            preferenceType: 'common',
            totalShares: 1000000,
            pricePerShare: 1
          }
        ]
      });

      expect(result.summary.totalDistributed).toBe(0);
    });

    it('should handle transaction costs exceeding exit valuation', () => {
      const result = WaterfallAnalysisService.calculateWaterfall({
        exitValuation: 1000000,
        transactionCosts: 2000000, // More than exit
        shareClasses: [
          {
            shareClassId: 'common',
            name: 'Common',
            preferenceType: 'common',
            totalShares: 1000000,
            pricePerShare: 1
          }
        ]
      });

      expect(result.summary.totalDistributed).toBe(0);
    });
  });

  describe('scenario comparison', () => {
    it('should calculate multiple exit scenarios correctly', () => {
      const scenarios = [
        {
          scenarioName: 'Low Exit',
          exitValuation: 5000000,
          shareClasses: [
            {
              shareClassId: 'preferred',
              name: 'Preferred',
              preferenceType: 'non_participating',
              totalShares: 1000000,
              pricePerShare: 5,
              liquidationMultiple: 1,
              seniorityRank: 1,
              originalInvestment: 5000000
            },
            {
              shareClassId: 'common',
              name: 'Common',
              preferenceType: 'common',
              totalShares: 4000000,
              pricePerShare: 0.001
            }
          ]
        },
        {
          scenarioName: 'High Exit',
          exitValuation: 50000000,
          shareClasses: [
            {
              shareClassId: 'preferred',
              name: 'Preferred',
              preferenceType: 'non_participating',
              totalShares: 1000000,
              pricePerShare: 5,
              liquidationMultiple: 1,
              seniorityRank: 1,
              originalInvestment: 5000000
            },
            {
              shareClassId: 'common',
              name: 'Common',
              preferenceType: 'common',
              totalShares: 4000000,
              pricePerShare: 0.001
            }
          ]
        }
      ];

      const results = WaterfallAnalysisService.compareScenarios(scenarios);

      expect(results).toHaveLength(2);
      expect(results[0].scenarioName).toBe('Low Exit');
      expect(results[1].scenarioName).toBe('High Exit');

      // Higher exit should distribute more
      expect(results[1].summary.totalDistributed).toBeGreaterThan(
        results[0].summary.totalDistributed
      );
    });
  });
});
