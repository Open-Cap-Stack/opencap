/**
 * WaterfallAnalysis Model Unit Tests
 * Issue #56: Create waterfall analysis engine
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';

const mongoose = require('mongoose');

// Mock mongoose before requiring the model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn().mockImplementation((name, schema) => {
      return actualMongoose.model(name, schema);
    }),
    Schema: actualMongoose.Schema
  };
});

describe('WaterfallAnalysis Model', () => {
  let WaterfallAnalysis;

  beforeAll(() => {
    // Clear any cached models
    if (mongoose.models.WaterfallAnalysis) {
      delete mongoose.models.WaterfallAnalysis;
    }
    WaterfallAnalysis = require('../../../models/WaterfallAnalysis');
  });

  afterAll(() => {
    // Clean up
    if (mongoose.models.WaterfallAnalysis) {
      delete mongoose.models.WaterfallAnalysis;
    }
  });

  describe('Schema Validation', () => {
    it('should require companyId', async () => {
      const analysis = new WaterfallAnalysis({
        exitValuation: 10000000,
        exitType: 'acquisition'
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.companyId).toBeDefined();
    });

    it('should require exitValuation', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitType: 'acquisition'
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.exitValuation).toBeDefined();
    });

    it('should require exitType', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.exitType).toBeDefined();
    });

    it('should only allow valid exit types', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'invalid_type'
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.exitType).toBeDefined();
    });

    it('should accept valid exit types', async () => {
      const validTypes = ['acquisition', 'ipo', 'liquidation', 'merger', 'dissolution'];

      for (const exitType of validTypes) {
        const analysis = new WaterfallAnalysis({
          companyId: 'comp-123',
          exitValuation: 10000000,
          exitType
        });

        let error;
        try {
          await analysis.validate();
        } catch (e) {
          error = e;
        }

        expect(error?.errors?.exitType).toBeUndefined();
      }
    });

    it('should not allow negative exit valuation', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: -1000000,
        exitType: 'acquisition'
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors.exitValuation).toBeDefined();
    });

    it('should create valid analysis with all required fields', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        scenarioName: 'Base Case Acquisition'
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeUndefined();
    });
  });

  describe('ShareClass Schema', () => {
    it('should accept valid preference type', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        shareClasses: [{
          shareClassId: 'sc-001',
          name: 'Series A Preferred',
          preferenceType: 'non_participating',
          liquidationMultiple: 1,
          totalShares: 1000000,
          pricePerShare: 1.00
        }]
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error?.errors?.['shareClasses.0.preferenceType']).toBeUndefined();
    });

    it('should accept participating preferred with cap', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        shareClasses: [{
          shareClassId: 'sc-001',
          name: 'Series A Preferred',
          preferenceType: 'participating_capped',
          liquidationMultiple: 1,
          participationCap: 3,
          totalShares: 1000000,
          pricePerShare: 1.00
        }]
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeUndefined();
    });

    it('should require shareClassId in shareClasses', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        shareClasses: [{
          name: 'Series A Preferred',
          preferenceType: 'non_participating',
          liquidationMultiple: 1,
          totalShares: 1000000,
          pricePerShare: 1.00
        }]
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeDefined();
      expect(error.errors['shareClasses.0.shareClassId']).toBeDefined();
    });
  });

  describe('Results Schema', () => {
    it('should store results by stakeholder', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        results: [{
          stakeholderId: 'stake-001',
          shareClassId: 'sc-001',
          shareClassName: 'Series A Preferred',
          sharesOwned: 100000,
          proceedsFromPreference: 100000,
          proceedsFromParticipation: 50000,
          totalProceeds: 150000,
          percentageOfExit: 1.5
        }]
      });

      let error;
      try {
        await analysis.validate();
      } catch (e) {
        error = e;
      }

      expect(error).toBeUndefined();
      expect(analysis.results[0].totalProceeds).toBe(150000);
    });
  });

  describe('Scenario Fields', () => {
    it('should store scenario name and description', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        scenarioName: 'Base Case Acquisition',
        scenarioDescription: 'Analysis of base case $10M acquisition scenario'
      });

      expect(analysis.scenarioName).toBe('Base Case Acquisition');
      expect(analysis.scenarioDescription).toBe('Analysis of base case $10M acquisition scenario');
    });

    it('should have default status of draft', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition'
      });

      expect(analysis.status).toBe('draft');
    });
  });

  describe('Summary Calculations', () => {
    it('should store summary totals', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        summary: {
          totalDistributed: 9500000,
          totalToPreferred: 5000000,
          totalToCommon: 4500000,
          remainingProceeds: 500000,
          effectiveExitMultiple: 2.5
        }
      });

      expect(analysis.summary.totalDistributed).toBe(9500000);
      expect(analysis.summary.effectiveExitMultiple).toBe(2.5);
    });
  });

  describe('Seniority Stack', () => {
    it('should track seniority order for preferences', async () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition',
        shareClasses: [
          {
            shareClassId: 'sc-001',
            name: 'Series B Preferred',
            preferenceType: 'non_participating',
            liquidationMultiple: 1,
            seniorityRank: 1,
            totalShares: 500000,
            pricePerShare: 2.00
          },
          {
            shareClassId: 'sc-002',
            name: 'Series A Preferred',
            preferenceType: 'participating',
            liquidationMultiple: 1,
            seniorityRank: 2,
            totalShares: 1000000,
            pricePerShare: 1.00
          }
        ]
      });

      expect(analysis.shareClasses[0].seniorityRank).toBe(1);
      expect(analysis.shareClasses[1].seniorityRank).toBe(2);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      const analysis = new WaterfallAnalysis({
        companyId: 'comp-123',
        exitValuation: 10000000,
        exitType: 'acquisition'
      });

      // Schema should define timestamps
      expect(WaterfallAnalysis.schema.options.timestamps).toBe(true);
    });
  });
});
