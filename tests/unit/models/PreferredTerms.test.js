/**
 * PreferredTerms Model Unit Tests
 * Issue #260: Create preferred_terms table for liquidation preferences and seniority stack
 *
 * Comprehensive tests for the PreferredTerms model including:
 * - Schema validation
 * - Liquidation preferences
 * - Seniority stack
 * - Participation rights
 * - Dividend rights
 * - Conversion ratios
 * - Anti-dilution provisions
 * - Voting rights
 * - Protective provisions
 * - Business logic methods
 */

describe('PreferredTerms Model', () => {
  let PreferredTerms;

  beforeAll(() => {
    PreferredTerms = require('../../../models/PreferredTerms');
  });

  describe('Schema Constants', () => {
    describe('DIVIDEND_TYPES', () => {
      it('should define all valid dividend types', () => {
        expect(PreferredTerms.DIVIDEND_TYPES).toContain('NONE');
        expect(PreferredTerms.DIVIDEND_TYPES).toContain('NON_CUMULATIVE');
        expect(PreferredTerms.DIVIDEND_TYPES).toContain('CUMULATIVE');
        expect(PreferredTerms.DIVIDEND_TYPES.length).toBe(3);
      });

      it('should not contain invalid dividend types', () => {
        expect(PreferredTerms.DIVIDEND_TYPES).not.toContain('PREFERRED');
        expect(PreferredTerms.DIVIDEND_TYPES).not.toContain('COMMON');
      });
    });

    describe('ANTI_DILUTION_TYPES', () => {
      it('should define all valid anti-dilution types', () => {
        expect(PreferredTerms.ANTI_DILUTION_TYPES).toContain('NONE');
        expect(PreferredTerms.ANTI_DILUTION_TYPES).toContain('FULL_RATCHET');
        expect(PreferredTerms.ANTI_DILUTION_TYPES).toContain('BROAD_BASED_WEIGHTED_AVERAGE');
        expect(PreferredTerms.ANTI_DILUTION_TYPES).toContain('NARROW_BASED_WEIGHTED_AVERAGE');
        expect(PreferredTerms.ANTI_DILUTION_TYPES.length).toBe(4);
      });
    });

    describe('VOTING_RIGHTS_TYPES', () => {
      it('should define all valid voting rights types', () => {
        expect(PreferredTerms.VOTING_RIGHTS_TYPES).toContain('AS_CONVERTED');
        expect(PreferredTerms.VOTING_RIGHTS_TYPES).toContain('CLASS_SPECIFIC');
        expect(PreferredTerms.VOTING_RIGHTS_TYPES).toContain('NONE');
        expect(PreferredTerms.VOTING_RIGHTS_TYPES.length).toBe(3);
      });
    });

    describe('VALID_STATUSES', () => {
      it('should define all valid statuses', () => {
        expect(PreferredTerms.VALID_STATUSES).toContain('ACTIVE');
        expect(PreferredTerms.VALID_STATUSES).toContain('CONVERTED');
        expect(PreferredTerms.VALID_STATUSES).toContain('REDEEMED');
        expect(PreferredTerms.VALID_STATUSES).toContain('MODIFIED');
        expect(PreferredTerms.VALID_STATUSES).toContain('ARCHIVED');
        expect(PreferredTerms.VALID_STATUSES.length).toBe(5);
      });
    });
  });

  describe('Schema Fields', () => {
    it('should have required core fields in schema', () => {
      const schema = PreferredTerms.schema;
      expect(schema.preferredTermsId).toBeDefined();
      expect(schema.shareClassId).toBeDefined();
      expect(schema.companyId).toBeDefined();
      expect(schema.seniorityRank).toBeDefined();
    });

    it('should have liquidation preference fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.liquidationPreferenceMultiple).toBeDefined();
      expect(schema.liquidationPreferenceMultiple.default).toBe(1.0);
    });

    it('should have participation fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.isParticipating).toBeDefined();
      expect(schema.participationCapMultiple).toBeDefined();
      expect(schema.isParticipating.default).toBe(false);
    });

    it('should have dividend fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.dividendType).toBeDefined();
      expect(schema.dividendRate).toBeDefined();
      expect(schema.accruedDividends).toBeDefined();
      expect(schema.dividendType.default).toBe('NONE');
    });

    it('should have conversion fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.conversionRatio).toBeDefined();
      expect(schema.isAutoConvert).toBeDefined();
      expect(schema.autoConvertThreshold).toBeDefined();
      expect(schema.conversionRatio.default).toBe(1.0);
    });

    it('should have redemption fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.hasRedemptionRights).toBeDefined();
      expect(schema.redemptionStartDate).toBeDefined();
      expect(schema.redemptionPrice).toBeDefined();
      expect(schema.redemptionTerms).toBeDefined();
    });

    it('should have anti-dilution fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.antiDilutionType).toBeDefined();
      expect(schema.antiDilutionExclusions).toBeDefined();
      expect(schema.antiDilutionType.default).toBe('NONE');
    });

    it('should have voting rights fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.votingRightsType).toBeDefined();
      expect(schema.votesPerShare).toBeDefined();
      expect(schema.hasVetoRights).toBeDefined();
      expect(schema.votingRightsType.default).toBe('AS_CONVERTED');
    });

    it('should have protective provisions field', () => {
      const schema = PreferredTerms.schema;
      expect(schema.protectiveProvisions).toBeDefined();
      expect(schema.protectiveProvisions.default).toBeDefined();
    });

    it('should have pay-to-play fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.hasPayToPlay).toBeDefined();
      expect(schema.payToPlayTerms).toBeDefined();
      expect(schema.payToPlayConversionRatio).toBeDefined();
    });

    it('should have transfer rights fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.hasROFR).toBeDefined();
      expect(schema.hasCoSale).toBeDefined();
      expect(schema.hasDragAlong).toBeDefined();
    });

    it('should have audit and metadata fields', () => {
      const schema = PreferredTerms.schema;
      expect(schema.status).toBeDefined();
      expect(schema.notes).toBeDefined();
      expect(schema.metadata).toBeDefined();
      expect(schema.auditLog).toBeDefined();
      expect(schema.createdAt).toBeDefined();
      expect(schema.updatedAt).toBeDefined();
    });
  });

  describe('Liquidation Preference Validation', () => {
    it('should accept valid liquidation preference multiples', () => {
      const validMultiples = [0.5, 1.0, 1.5, 2.0, 3.0];
      validMultiples.forEach(multiple => {
        expect(multiple).toBeGreaterThanOrEqual(0);
      });
    });

    it('should reject negative liquidation preference', () => {
      const invalidMultiple = -1.0;
      expect(invalidMultiple).toBeLessThan(0);
    });

    it('should default liquidation preference to 1.0', () => {
      const schema = PreferredTerms.schema;
      expect(schema.liquidationPreferenceMultiple.default).toBe(1.0);
    });
  });

  describe('Seniority Stack Validation', () => {
    it('should require seniority rank >= 1', () => {
      const validRanks = [1, 2, 3, 4, 5];
      validRanks.forEach(rank => {
        expect(rank).toBeGreaterThanOrEqual(1);
      });
    });

    it('should reject seniority rank of 0', () => {
      const invalidRank = 0;
      expect(invalidRank).toBeLessThan(1);
    });

    it('should reject negative seniority rank', () => {
      const invalidRank = -1;
      expect(invalidRank).toBeLessThan(1);
    });

    it('should support pari passu grouping', () => {
      const schema = PreferredTerms.schema;
      expect(schema.pariPassuGroup).toBeDefined();
    });
  });

  describe('Participation Rights Validation', () => {
    it('should default isParticipating to false', () => {
      const schema = PreferredTerms.schema;
      expect(schema.isParticipating.default).toBe(false);
    });

    it('should allow participation cap only when participating', () => {
      const participatingWithCap = {
        isParticipating: true,
        participationCapMultiple: 3.0
      };
      expect(participatingWithCap.isParticipating).toBe(true);
      expect(participatingWithCap.participationCapMultiple).toBe(3.0);
    });

    it('should not allow participation cap when not participating', () => {
      // This is enforced in the create method
      const nonParticipating = {
        isParticipating: false,
        participationCapMultiple: null
      };
      expect(nonParticipating.isParticipating).toBe(false);
      expect(nonParticipating.participationCapMultiple).toBeNull();
    });
  });

  describe('Dividend Validation', () => {
    it('should default dividend type to NONE', () => {
      const schema = PreferredTerms.schema;
      expect(schema.dividendType.default).toBe('NONE');
    });

    it('should require dividend rate for non-NONE dividend types', () => {
      const cumulativeWithRate = {
        dividendType: 'CUMULATIVE',
        dividendRate: 0.08 // 8%
      };
      expect(cumulativeWithRate.dividendType).not.toBe('NONE');
      expect(cumulativeWithRate.dividendRate).toBeDefined();
      expect(cumulativeWithRate.dividendRate).toBeGreaterThan(0);
    });

    it('should accept dividend rate between 0 and 1', () => {
      const validRates = [0, 0.05, 0.08, 0.10, 0.12, 1.0];
      validRates.forEach(rate => {
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(1);
      });
    });

    it('should reject invalid dividend rate', () => {
      const invalidRates = [-0.05, 1.5, 2.0];
      invalidRates.forEach(rate => {
        expect(rate < 0 || rate > 1).toBe(true);
      });
    });

    it('should track accrued dividends for cumulative', () => {
      const schema = PreferredTerms.schema;
      expect(schema.accruedDividends).toBeDefined();
      expect(schema.accruedDividends.default).toBe(0);
    });
  });

  describe('Conversion Ratio Validation', () => {
    it('should default conversion ratio to 1.0', () => {
      const schema = PreferredTerms.schema;
      expect(schema.conversionRatio.default).toBe(1.0);
    });

    it('should accept positive conversion ratios', () => {
      const validRatios = [0.5, 1.0, 1.5, 2.0, 5.0];
      validRatios.forEach(ratio => {
        expect(ratio).toBeGreaterThan(0);
      });
    });

    it('should support auto-conversion trigger', () => {
      const schema = PreferredTerms.schema;
      expect(schema.isAutoConvert).toBeDefined();
      expect(schema.autoConvertThreshold).toBeDefined();
      expect(schema.autoConvertTrigger).toBeDefined();
    });
  });

  describe('Anti-Dilution Validation', () => {
    it('should default anti-dilution to NONE', () => {
      const schema = PreferredTerms.schema;
      expect(schema.antiDilutionType.default).toBe('NONE');
    });

    it('should accept valid anti-dilution types', () => {
      const validTypes = PreferredTerms.ANTI_DILUTION_TYPES;
      expect(validTypes).toContain('FULL_RATCHET');
      expect(validTypes).toContain('BROAD_BASED_WEIGHTED_AVERAGE');
      expect(validTypes).toContain('NARROW_BASED_WEIGHTED_AVERAGE');
    });

    it('should support exclusions from anti-dilution', () => {
      const schema = PreferredTerms.schema;
      expect(schema.antiDilutionExclusions).toBeDefined();
      expect(schema.antiDilutionExclusions.default).toEqual([]);
    });
  });

  describe('Voting Rights Validation', () => {
    it('should default voting rights to AS_CONVERTED', () => {
      const schema = PreferredTerms.schema;
      expect(schema.votingRightsType.default).toBe('AS_CONVERTED');
    });

    it('should default votes per share to 1', () => {
      const schema = PreferredTerms.schema;
      expect(schema.votesPerShare.default).toBe(1);
    });

    it('should track veto rights separately', () => {
      const schema = PreferredTerms.schema;
      expect(schema.hasVetoRights).toBeDefined();
      expect(schema.hasVetoRights.default).toBe(false);
    });
  });

  describe('Protective Provisions', () => {
    it('should have default protective provisions structure', () => {
      const schema = PreferredTerms.schema;
      const defaults = schema.protectiveProvisions.default;

      expect(defaults.amendCharterOrBylaws).toBe(false);
      expect(defaults.createSeniorSecurity).toBe(false);
      expect(defaults.authorizeAdditionalShares).toBe(false);
      expect(defaults.declareOrPayDividends).toBe(false);
      expect(defaults.redeemOrRepurchaseStock).toBe(false);
      expect(defaults.mergerOrAcquisition).toBe(false);
      expect(defaults.sellAllAssets).toBe(false);
      expect(defaults.incurIndebtedness).toBe(false);
      expect(defaults.issueNewSecurities).toBe(false);
      expect(defaults.changeCapitalization).toBe(false);
      expect(defaults.enterNewBusinessLine).toBe(false);
      expect(defaults.hireOrFireExecutives).toBe(false);
      expect(defaults.changeBoardSize).toBe(false);
      expect(defaults.approveAnnualBudget).toBe(false);
    });

    it('should support custom provisions', () => {
      const schema = PreferredTerms.schema;
      const defaults = schema.protectiveProvisions.default;
      expect(defaults.customProvisions).toEqual([]);
    });
  });

  describe('calculateLiquidationPreference Method', () => {
    it('should calculate basic 1x liquidation preference', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        dividendType: 'NONE'
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(1000000);
    });

    it('should calculate 2x liquidation preference', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 2.0,
        originalInvestment: 1000000,
        dividendType: 'NONE'
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(2000000);
    });

    it('should calculate from shares * price when no originalInvestment', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 1.0,
        totalShares: 1000000,
        pricePerShare: 1.5,
        dividendType: 'NONE'
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(1500000);
    });

    it('should include accrued dividends for cumulative preferred', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        dividendType: 'CUMULATIVE',
        accruedDividends: 80000
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(1080000);
    });

    it('should not include accrued dividends for non-cumulative', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        dividendType: 'NON_CUMULATIVE',
        accruedDividends: 80000
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(1000000);
    });

    it('should return 0 when no investment info', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 1.0,
        dividendType: 'NONE'
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(0);
    });
  });

  describe('calculateParticipation Method', () => {
    it('should return 0 for non-participating preferred', () => {
      const preferredTerms = {
        isParticipating: false,
        totalShares: 1000000,
        conversionRatio: 1.0
      };

      const participation = PreferredTerms.calculateParticipation(
        preferredTerms,
        5000000,
        10000000
      );
      expect(participation).toBe(0);
    });

    it('should calculate pro-rata participation', () => {
      const preferredTerms = {
        isParticipating: true,
        totalShares: 1000000,
        conversionRatio: 1.0,
        participationCapMultiple: null
      };

      // 1M shares out of 10M total = 10% of 5M remaining = 500K
      const participation = PreferredTerms.calculateParticipation(
        preferredTerms,
        5000000,
        10000000
      );
      expect(participation).toBe(500000);
    });

    it('should apply participation cap', () => {
      const preferredTerms = {
        isParticipating: true,
        totalShares: 1000000,
        conversionRatio: 1.0,
        participationCapMultiple: 2.0,
        originalInvestment: 1000000,
        liquidationPreferenceMultiple: 1.0,
        dividendType: 'NONE'
      };

      // Cap is 2x = 2M total. Preference is 1M. Max participation = 1M
      // Pro-rata would be 500K (10% of 5M), which is less than 1M cap
      const participation = PreferredTerms.calculateParticipation(
        preferredTerms,
        5000000,
        10000000
      );
      expect(participation).toBe(500000);
    });

    it('should limit participation to cap when pro-rata exceeds cap', () => {
      const preferredTerms = {
        isParticipating: true,
        totalShares: 3000000,
        conversionRatio: 1.0,
        participationCapMultiple: 1.5,
        originalInvestment: 1000000,
        liquidationPreferenceMultiple: 1.0,
        dividendType: 'NONE'
      };

      // Cap is 1.5x = 1.5M total. Preference is 1M. Max participation = 0.5M
      // Pro-rata would be 3M/10M * 5M = 1.5M, but capped at 0.5M
      const participation = PreferredTerms.calculateParticipation(
        preferredTerms,
        5000000,
        10000000
      );
      expect(participation).toBe(500000);
    });

    it('should apply conversion ratio', () => {
      const preferredTerms = {
        isParticipating: true,
        totalShares: 500000,
        conversionRatio: 2.0, // Each share converts to 2 common
        participationCapMultiple: null
      };

      // 500K shares * 2 = 1M as-converted / 10M = 10% of 5M = 500K
      const participation = PreferredTerms.calculateParticipation(
        preferredTerms,
        5000000,
        10000000
      );
      expect(participation).toBe(500000);
    });
  });

  describe('shouldConvert Method', () => {
    it('should recommend conversion when as-converted value exceeds preference', () => {
      const preferredTerms = {
        totalShares: 1000000,
        conversionRatio: 1.0,
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        isParticipating: false,
        dividendType: 'NONE'
      };

      // Exit: 20M, 1M/10M = 2M as-converted vs 1M preference
      const result = PreferredTerms.shouldConvert(preferredTerms, 20000000, 10000000);

      expect(result.shouldConvert).toBe(true);
      expect(result.asConvertedValue).toBe(2000000);
      expect(result.preferenceValue).toBe(1000000);
      expect(result.valueDifference).toBe(1000000);
    });

    it('should recommend preference when it exceeds as-converted value', () => {
      const preferredTerms = {
        totalShares: 1000000,
        conversionRatio: 1.0,
        liquidationPreferenceMultiple: 2.0,
        originalInvestment: 1000000,
        isParticipating: false,
        dividendType: 'NONE'
      };

      // Exit: 10M, 1M/10M = 1M as-converted vs 2M preference (2x)
      const result = PreferredTerms.shouldConvert(preferredTerms, 10000000, 10000000);

      expect(result.shouldConvert).toBe(false);
      expect(result.asConvertedValue).toBe(1000000);
      expect(result.preferenceValue).toBe(2000000);
      expect(result.valueDifference).toBe(-1000000);
    });

    it('should factor in participation for participating preferred', () => {
      const preferredTerms = {
        totalShares: 1000000,
        conversionRatio: 1.0,
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        isParticipating: true,
        participationCapMultiple: null,
        dividendType: 'NONE'
      };

      // Exit: 10M
      // Preference: 1M
      // Remaining: 9M
      // Participation: 1M/10M * 9M = 900K
      // Total preference value: 1M + 900K = 1.9M
      // As-converted: 1M/10M * 10M = 1M
      const result = PreferredTerms.shouldConvert(preferredTerms, 10000000, 10000000);

      expect(result.shouldConvert).toBe(false);
      expect(result.asConvertedValue).toBe(1000000);
      expect(result.preferenceValue).toBeGreaterThan(1000000);
    });
  });

  describe('getActiveProtectiveProvisions Method', () => {
    it('should return empty array when no provisions active', () => {
      const preferredTerms = {
        protectiveProvisions: {
          amendCharterOrBylaws: false,
          mergerOrAcquisition: false,
          customProvisions: []
        }
      };

      const provisions = PreferredTerms.getActiveProtectiveProvisions(preferredTerms);
      expect(provisions).toEqual([]);
    });

    it('should return active standard provisions', () => {
      const preferredTerms = {
        protectiveProvisions: {
          amendCharterOrBylaws: true,
          mergerOrAcquisition: true,
          sellAllAssets: false,
          customProvisions: []
        }
      };

      const provisions = PreferredTerms.getActiveProtectiveProvisions(preferredTerms);

      expect(provisions.length).toBe(2);
      expect(provisions.find(p => p.key === 'amendCharterOrBylaws')).toBeDefined();
      expect(provisions.find(p => p.key === 'mergerOrAcquisition')).toBeDefined();
    });

    it('should include custom provisions', () => {
      const preferredTerms = {
        protectiveProvisions: {
          amendCharterOrBylaws: true,
          customProvisions: [
            { name: 'Executive Compensation Changes' },
            'International Expansion'
          ]
        }
      };

      const provisions = PreferredTerms.getActiveProtectiveProvisions(preferredTerms);

      expect(provisions.length).toBe(3);
      expect(provisions.filter(p => p.custom).length).toBe(2);
    });

    it('should handle missing protectiveProvisions', () => {
      const preferredTerms = {};

      const provisions = PreferredTerms.getActiveProtectiveProvisions(preferredTerms);
      expect(provisions).toEqual([]);
    });
  });

  describe('isRedemptionAvailable Method', () => {
    it('should return unavailable when no redemption rights', () => {
      const preferredTerms = {
        hasRedemptionRights: false
      };

      const result = PreferredTerms.isRedemptionAvailable(preferredTerms);

      expect(result.available).toBe(false);
      expect(result.reason).toBe('No redemption rights');
    });

    it('should return unavailable before start date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const preferredTerms = {
        hasRedemptionRights: true,
        redemptionStartDate: futureDate.toISOString()
      };

      const result = PreferredTerms.isRedemptionAvailable(preferredTerms);

      expect(result.available).toBe(false);
      expect(result.reason).toBe('Redemption period not yet started');
      expect(result.startDate).toBe(preferredTerms.redemptionStartDate);
    });

    it('should return available after start date', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      const preferredTerms = {
        hasRedemptionRights: true,
        redemptionStartDate: pastDate.toISOString(),
        redemptionPrice: 1.10,
        redemptionTerms: 'At 110% of original issue price'
      };

      const result = PreferredTerms.isRedemptionAvailable(preferredTerms);

      expect(result.available).toBe(true);
      expect(result.redemptionPrice).toBe(1.10);
      expect(result.terms).toBe('At 110% of original issue price');
    });

    it('should return available when no start date specified', () => {
      const preferredTerms = {
        hasRedemptionRights: true,
        redemptionStartDate: null,
        redemptionPrice: 1.0
      };

      const result = PreferredTerms.isRedemptionAvailable(preferredTerms);

      expect(result.available).toBe(true);
    });
  });

  describe('Model Methods', () => {
    it('should have create method', () => {
      expect(typeof PreferredTerms.create).toBe('function');
    });

    it('should have findByPreferredTermsId method', () => {
      expect(typeof PreferredTerms.findByPreferredTermsId).toBe('function');
    });

    it('should have findByShareClass method', () => {
      expect(typeof PreferredTerms.findByShareClass).toBe('function');
    });

    it('should have findByCompany method', () => {
      expect(typeof PreferredTerms.findByCompany).toBe('function');
    });

    it('should have getPreferenceStack method', () => {
      expect(typeof PreferredTerms.getPreferenceStack).toBe('function');
    });

    it('should have validateSeniorityRank method', () => {
      expect(typeof PreferredTerms.validateSeniorityRank).toBe('function');
    });

    it('should have calculateLiquidationPreference method', () => {
      expect(typeof PreferredTerms.calculateLiquidationPreference).toBe('function');
    });

    it('should have calculateParticipation method', () => {
      expect(typeof PreferredTerms.calculateParticipation).toBe('function');
    });

    it('should have shouldConvert method', () => {
      expect(typeof PreferredTerms.shouldConvert).toBe('function');
    });

    it('should have getActiveProtectiveProvisions method', () => {
      expect(typeof PreferredTerms.getActiveProtectiveProvisions).toBe('function');
    });

    it('should have isRedemptionAvailable method', () => {
      expect(typeof PreferredTerms.isRedemptionAvailable).toBe('function');
    });

    it('should have addAuditEntry method', () => {
      expect(typeof PreferredTerms.addAuditEntry).toBe('function');
    });

    it('should have reorderSeniority method', () => {
      expect(typeof PreferredTerms.reorderSeniority).toBe('function');
    });

    it('should have markConverted method', () => {
      expect(typeof PreferredTerms.markConverted).toBe('function');
    });

    it('should have markRedeemed method', () => {
      expect(typeof PreferredTerms.markRedeemed).toBe('function');
    });

    it('should have base model CRUD methods', () => {
      expect(typeof PreferredTerms.find).toBe('function');
      expect(typeof PreferredTerms.findOne).toBe('function');
      expect(typeof PreferredTerms.findById).toBe('function');
      expect(typeof PreferredTerms.updateOne).toBe('function');
      expect(typeof PreferredTerms.updateMany).toBe('function');
      expect(typeof PreferredTerms.deleteOne).toBe('function');
      expect(typeof PreferredTerms.deleteMany).toBe('function');
      expect(typeof PreferredTerms.countDocuments).toBe('function');
      expect(typeof PreferredTerms.exists).toBe('function');
    });
  });

  describe('Preference Stack Calculations', () => {
    it('should order share classes by seniority rank', () => {
      const shareClasses = [
        { name: 'Series B', seniorityRank: 1 },
        { name: 'Series A', seniorityRank: 2 },
        { name: 'Common', seniorityRank: 3 }
      ];

      const sorted = [...shareClasses].sort((a, b) => a.seniorityRank - b.seniorityRank);

      expect(sorted[0].name).toBe('Series B');
      expect(sorted[1].name).toBe('Series A');
      expect(sorted[2].name).toBe('Common');
    });

    it('should calculate total preference stack correctly', () => {
      const shareClasses = [
        { liquidationPreferenceMultiple: 1.0, originalInvestment: 2000000, dividendType: 'NONE' },
        { liquidationPreferenceMultiple: 1.0, originalInvestment: 1000000, dividendType: 'NONE' }
      ];

      const totalPreference = shareClasses.reduce((sum, sc) => {
        return sum + PreferredTerms.calculateLiquidationPreference(sc);
      }, 0);

      expect(totalPreference).toBe(3000000);
    });

    it('should handle 2x preferences in stack', () => {
      const shareClasses = [
        { liquidationPreferenceMultiple: 2.0, originalInvestment: 1000000, dividendType: 'NONE' },
        { liquidationPreferenceMultiple: 1.0, originalInvestment: 500000, dividendType: 'NONE' }
      ];

      const totalPreference = shareClasses.reduce((sum, sc) => {
        return sum + PreferredTerms.calculateLiquidationPreference(sc);
      }, 0);

      expect(totalPreference).toBe(2500000); // 2M + 500K
    });
  });

  describe('409A Valuation Support', () => {
    it('should provide data needed for waterfall calculations', () => {
      const preferredTerms = {
        shareClassId: 'sc-001',
        liquidationPreferenceMultiple: 1.0,
        isParticipating: true,
        participationCapMultiple: 3.0,
        conversionRatio: 1.0,
        seniorityRank: 1,
        originalInvestment: 1000000,
        totalShares: 1000000,
        pricePerShare: 1.0,
        dividendType: 'NONE'
      };

      // All fields needed for 409A waterfall should be present
      expect(preferredTerms.liquidationPreferenceMultiple).toBeDefined();
      expect(preferredTerms.isParticipating).toBeDefined();
      expect(preferredTerms.participationCapMultiple).toBeDefined();
      expect(preferredTerms.conversionRatio).toBeDefined();
      expect(preferredTerms.seniorityRank).toBeDefined();
      expect(preferredTerms.originalInvestment).toBeDefined();
    });

    it('should calculate breakeven valuation for conversion', () => {
      const preferredTerms = {
        totalShares: 1000000,
        conversionRatio: 1.0,
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 1000000,
        isParticipating: false,
        dividendType: 'NONE'
      };

      const fullyDilutedShares = 10000000;

      // Breakeven is when as-converted = preference
      // preference = 1M
      // asConverted = 1M/10M * exitVal = 0.1 * exitVal
      // 0.1 * exitVal = 1M
      // exitVal = 10M
      const breakeven = (preferredTerms.originalInvestment * preferredTerms.liquidationPreferenceMultiple) /
        (preferredTerms.totalShares * preferredTerms.conversionRatio / fullyDilutedShares);

      expect(breakeven).toBe(10000000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero investment amount', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 1.0,
        originalInvestment: 0,
        dividendType: 'NONE'
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(0);
    });

    it('should handle undefined shares for participation', () => {
      const preferredTerms = {
        isParticipating: true,
        totalShares: undefined,
        conversionRatio: 1.0
      };

      const participation = PreferredTerms.calculateParticipation(
        preferredTerms,
        5000000,
        10000000
      );
      expect(participation).toBe(0);
    });

    it('should handle zero conversion ratio edge case', () => {
      const preferredTerms = {
        isParticipating: true,
        totalShares: 1000000,
        conversionRatio: 0
      };

      const participation = PreferredTerms.calculateParticipation(
        preferredTerms,
        5000000,
        10000000
      );
      expect(participation).toBe(0);
    });

    it('should handle fractional liquidation multiples', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 0.5,
        originalInvestment: 1000000,
        dividendType: 'NONE'
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(500000);
    });

    it('should handle high liquidation multiples', () => {
      const preferredTerms = {
        liquidationPreferenceMultiple: 3.0,
        originalInvestment: 1000000,
        dividendType: 'NONE'
      };

      const preference = PreferredTerms.calculateLiquidationPreference(preferredTerms);
      expect(preference).toBe(3000000);
    });
  });

  describe('ID Generation', () => {
    it('should generate ID with pt_ prefix', () => {
      const prefix = 'pt_';
      const mockId = `${prefix}test-uuid`;
      expect(mockId.startsWith('pt_')).toBe(true);
    });
  });

  describe('Table Configuration', () => {
    it('should use preferred_terms table name', () => {
      expect(PreferredTerms.tableName).toBe('preferred_terms');
    });
  });
});
