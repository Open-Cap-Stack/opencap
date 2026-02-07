/**
 * WaterfallAnalysis Model Unit Tests
 * Issue #56: Create waterfall analysis engine
 *
 * Tests for the WaterfallAnalysis ZeroDB model including schema structure,
 * field definitions, constants, and CRUD method existence.
 */

const WaterfallAnalysis = require('../../../models/WaterfallAnalysis');

describe('WaterfallAnalysis Model', () => {
  describe('Schema Structure', () => {
    it('should have a schema defined', () => {
      expect(WaterfallAnalysis.schema).toBeDefined();
      expect(typeof WaterfallAnalysis.schema).toBe('object');
    });

    it('should have analysisId field as required and unique', () => {
      expect(WaterfallAnalysis.schema.analysisId).toBeDefined();
      expect(WaterfallAnalysis.schema.analysisId.required).toBe(true);
      expect(WaterfallAnalysis.schema.analysisId.unique).toBe(true);
    });

    it('should have companyId field as required', () => {
      expect(WaterfallAnalysis.schema.companyId).toBeDefined();
      expect(WaterfallAnalysis.schema.companyId.required).toBe(true);
    });

    it('should have exitValuation field as required', () => {
      expect(WaterfallAnalysis.schema.exitValuation).toBeDefined();
      expect(WaterfallAnalysis.schema.exitValuation.required).toBe(true);
      expect(WaterfallAnalysis.schema.exitValuation.type).toBe('number');
    });

    it('should have exitType field as required with enum', () => {
      expect(WaterfallAnalysis.schema.exitType).toBeDefined();
      expect(WaterfallAnalysis.schema.exitType.required).toBe(true);
      expect(WaterfallAnalysis.schema.exitType.enum).toEqual(['acquisition', 'ipo', 'liquidation', 'merger', 'dissolution']);
    });

    it('should have transaction cost fields with defaults', () => {
      expect(WaterfallAnalysis.schema.transactionCosts).toBeDefined();
      expect(WaterfallAnalysis.schema.transactionCosts.default).toBe(0);

      expect(WaterfallAnalysis.schema.escrowAmount).toBeDefined();
      expect(WaterfallAnalysis.schema.escrowAmount.default).toBe(0);

      expect(WaterfallAnalysis.schema.debtPayoff).toBeDefined();
      expect(WaterfallAnalysis.schema.debtPayoff.default).toBe(0);

      expect(WaterfallAnalysis.schema.netProceeds).toBeDefined();
      expect(WaterfallAnalysis.schema.netProceeds.default).toBe(0);
    });

    it('should have scenario fields', () => {
      expect(WaterfallAnalysis.schema.scenarioName).toBeDefined();
      expect(WaterfallAnalysis.schema.scenarioName.type).toBe('string');

      expect(WaterfallAnalysis.schema.scenarioDescription).toBeDefined();
      expect(WaterfallAnalysis.schema.scenarioDescription.type).toBe('string');
    });

    it('should have shareClasses as array', () => {
      expect(WaterfallAnalysis.schema.shareClasses).toBeDefined();
      expect(WaterfallAnalysis.schema.shareClasses.type).toBe('array');
    });

    it('should have results as array', () => {
      expect(WaterfallAnalysis.schema.results).toBeDefined();
      expect(WaterfallAnalysis.schema.results.type).toBe('array');
    });

    it('should have shareClassResults as array', () => {
      expect(WaterfallAnalysis.schema.shareClassResults).toBeDefined();
      expect(WaterfallAnalysis.schema.shareClassResults.type).toBe('array');
    });

    it('should have summary as object with default', () => {
      expect(WaterfallAnalysis.schema.summary).toBeDefined();
      expect(WaterfallAnalysis.schema.summary.type).toBe('object');
      expect(WaterfallAnalysis.schema.summary.default).toBeDefined();
      expect(WaterfallAnalysis.schema.summary.default.totalDistributed).toBe(0);
    });

    it('should have status field with enum and default draft', () => {
      expect(WaterfallAnalysis.schema.status).toBeDefined();
      expect(WaterfallAnalysis.schema.status.enum).toEqual(['draft', 'calculated', 'finalized', 'archived']);
      expect(WaterfallAnalysis.schema.status.default).toBe('draft');
    });

    it('should have calculationVersion field', () => {
      expect(WaterfallAnalysis.schema.calculationVersion).toBeDefined();
      expect(WaterfallAnalysis.schema.calculationVersion.default).toBe('1.0');
    });

    it('should have comparisonGroupId field', () => {
      expect(WaterfallAnalysis.schema.comparisonGroupId).toBeDefined();
    });

    it('should have notes field', () => {
      expect(WaterfallAnalysis.schema.notes).toBeDefined();
      expect(WaterfallAnalysis.schema.notes.type).toBe('string');
    });

    it('should have metadata field', () => {
      expect(WaterfallAnalysis.schema.metadata).toBeDefined();
      expect(WaterfallAnalysis.schema.metadata.type).toBe('object');
    });

    it('should have timestamp fields', () => {
      expect(WaterfallAnalysis.schema.createdAt).toBeDefined();
      expect(WaterfallAnalysis.schema.updatedAt).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('should export EXIT_TYPES', () => {
      expect(WaterfallAnalysis.EXIT_TYPES).toBeDefined();
      expect(WaterfallAnalysis.EXIT_TYPES).toEqual(['acquisition', 'ipo', 'liquidation', 'merger', 'dissolution']);
    });

    it('should export PREFERENCE_TYPES', () => {
      expect(WaterfallAnalysis.PREFERENCE_TYPES).toBeDefined();
      expect(WaterfallAnalysis.PREFERENCE_TYPES).toEqual(['common', 'non_participating', 'participating', 'participating_capped']);
    });

    it('should export VALID_STATUSES', () => {
      expect(WaterfallAnalysis.VALID_STATUSES).toBeDefined();
      expect(WaterfallAnalysis.VALID_STATUSES).toEqual(['draft', 'calculated', 'finalized', 'archived']);
    });

    it('should accept all valid exit types', () => {
      const validTypes = ['acquisition', 'ipo', 'liquidation', 'merger', 'dissolution'];
      validTypes.forEach(exitType => {
        expect(WaterfallAnalysis.EXIT_TYPES).toContain(exitType);
      });
    });
  });

  describe('CRUD Methods', () => {
    it('should have create method', () => {
      expect(typeof WaterfallAnalysis.create).toBe('function');
    });

    it('should have find method', () => {
      expect(typeof WaterfallAnalysis.find).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof WaterfallAnalysis.findOne).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof WaterfallAnalysis.findById).toBe('function');
    });

    it('should have updateOne method', () => {
      expect(typeof WaterfallAnalysis.updateOne).toBe('function');
    });

    it('should have deleteOne method', () => {
      expect(typeof WaterfallAnalysis.deleteOne).toBe('function');
    });

    it('should have deleteMany method', () => {
      expect(typeof WaterfallAnalysis.deleteMany).toBe('function');
    });

    it('should have countDocuments method', () => {
      expect(typeof WaterfallAnalysis.countDocuments).toBe('function');
    });
  });

  describe('Custom Methods', () => {
    it('should have findByAnalysisId method', () => {
      expect(typeof WaterfallAnalysis.findByAnalysisId).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof WaterfallAnalysis.findByCompany).toBe('function');
    });

    it('should have findByComparisonGroup method', () => {
      expect(typeof WaterfallAnalysis.findByComparisonGroup).toBe('function');
    });

    it('should have markCalculated method', () => {
      expect(typeof WaterfallAnalysis.markCalculated).toBe('function');
    });

    it('should have finalize method', () => {
      expect(typeof WaterfallAnalysis.finalize).toBe('function');
    });

    it('should have archive method', () => {
      expect(typeof WaterfallAnalysis.archive).toBe('function');
    });
  });

  describe('Business Logic', () => {
    it('getTotalPreferenceStack should return 0 for empty share classes', () => {
      expect(WaterfallAnalysis.getTotalPreferenceStack({ shareClasses: [] })).toBe(0);
    });

    it('getTotalPreferenceStack should return 0 when no share classes', () => {
      expect(WaterfallAnalysis.getTotalPreferenceStack({})).toBe(0);
    });

    it('getTotalPreferenceStack should calculate for preferred share classes', () => {
      const analysis = {
        shareClasses: [
          {
            preferenceType: 'non_participating',
            originalInvestment: 1000000,
            liquidationMultiple: 1
          },
          {
            preferenceType: 'common',
            originalInvestment: 500000,
            liquidationMultiple: 1
          }
        ]
      };
      expect(WaterfallAnalysis.getTotalPreferenceStack(analysis)).toBe(1000000);
    });

    it('coversAllPreferences should return true when proceeds exceed preferences', () => {
      const analysis = {
        netProceeds: 5000000,
        shareClasses: [
          {
            preferenceType: 'non_participating',
            originalInvestment: 1000000,
            liquidationMultiple: 1
          }
        ]
      };
      expect(WaterfallAnalysis.coversAllPreferences(analysis)).toBe(true);
    });

    it('getOrderedShareClasses should sort by seniority rank', () => {
      const analysis = {
        shareClasses: [
          { name: 'Series B', seniorityRank: 1 },
          { name: 'Common', seniorityRank: 3 },
          { name: 'Series A', seniorityRank: 2 }
        ]
      };
      const ordered = WaterfallAnalysis.getOrderedShareClasses(analysis);
      expect(ordered[0].seniorityRank).toBe(1);
      expect(ordered[1].seniorityRank).toBe(2);
      expect(ordered[2].seniorityRank).toBe(3);
    });

    it('getPreferredClasses should filter out common classes', () => {
      const analysis = {
        shareClasses: [
          { name: 'Series A', preferenceType: 'non_participating', seniorityRank: 1 },
          { name: 'Common', preferenceType: 'common', seniorityRank: 3 }
        ]
      };
      const preferred = WaterfallAnalysis.getPreferredClasses(analysis);
      expect(preferred).toHaveLength(1);
      expect(preferred[0].name).toBe('Series A');
    });

    it('getCommonClasses should return only common classes', () => {
      const analysis = {
        shareClasses: [
          { name: 'Series A', preferenceType: 'non_participating' },
          { name: 'Common', preferenceType: 'common' }
        ]
      };
      const common = WaterfallAnalysis.getCommonClasses(analysis);
      expect(common).toHaveLength(1);
      expect(common[0].name).toBe('Common');
    });
  });
});
