/**
 * Tests for qsbsEligibilityService
 * Issue #656: QSBS eligibility tracking (Section 1202)
 */

const qsbsEligibilityService = require('../../../services/qsbsEligibilityService');

describe('qsbsEligibilityService', () => {
  describe('checkCCorpStatus', () => {
    it('should return eligible=true for C-Corp entity type', () => {
      const result = qsbsEligibilityService.checkCCorpStatus({ entityType: 'c-corp' });
      expect(result.eligible).toBe(true);
    });

    it('should return eligible=true for corporation entity type', () => {
      const result = qsbsEligibilityService.checkCCorpStatus({ entityType: 'corporation' });
      expect(result.eligible).toBe(true);
    });

    it('should return eligible=false for LLC entity type', () => {
      const result = qsbsEligibilityService.checkCCorpStatus({ entityType: 'llc' });
      expect(result.eligible).toBe(false);
    });

    it('should return eligible=false for S-Corp entity type', () => {
      const result = qsbsEligibilityService.checkCCorpStatus({ entityType: 's-corp' });
      expect(result.eligible).toBe(false);
    });
  });

  describe('checkGrossAssetsThreshold', () => {
    it('should return eligible=true when gross assets < $50M at issuance', () => {
      const result = qsbsEligibilityService.checkGrossAssetsThreshold({
        grossAssetsAtIssuance: 10000000
      });
      expect(result.eligible).toBe(true);
    });

    it('should return eligible=true when gross assets exactly $50M', () => {
      const result = qsbsEligibilityService.checkGrossAssetsThreshold({
        grossAssetsAtIssuance: 50000000
      });
      expect(result.eligible).toBe(true);
    });

    it('should return eligible=false when gross assets > $50M at issuance', () => {
      const result = qsbsEligibilityService.checkGrossAssetsThreshold({
        grossAssetsAtIssuance: 75000000
      });
      expect(result.eligible).toBe(false);
    });

    it('should include threshold amount in result', () => {
      const result = qsbsEligibilityService.checkGrossAssetsThreshold({
        grossAssetsAtIssuance: 30000000
      });
      expect(result.thresholdAmount).toBe(50000000);
    });
  });

  describe('checkHoldingPeriod', () => {
    it('should return eligible=true when stock held 5+ years', () => {
      const purchaseDate = new Date();
      purchaseDate.setFullYear(purchaseDate.getFullYear() - 6);

      const result = qsbsEligibilityService.checkHoldingPeriod({
        acquisitionDate: purchaseDate.toISOString()
      });

      expect(result.eligible).toBe(true);
      expect(result.yearsHeld).toBeGreaterThanOrEqual(5);
    });

    it('should return eligible=false when stock held less than 5 years', () => {
      const purchaseDate = new Date();
      purchaseDate.setFullYear(purchaseDate.getFullYear() - 3);

      const result = qsbsEligibilityService.checkHoldingPeriod({
        acquisitionDate: purchaseDate.toISOString()
      });

      expect(result.eligible).toBe(false);
      expect(result.yearsHeld).toBeLessThan(5);
    });

    it('should include daysUntilEligible when not yet eligible', () => {
      const purchaseDate = new Date();
      purchaseDate.setFullYear(purchaseDate.getFullYear() - 2);

      const result = qsbsEligibilityService.checkHoldingPeriod({
        acquisitionDate: purchaseDate.toISOString()
      });

      expect(result.daysUntilEligible).toBeGreaterThan(0);
    });

    it('should return daysUntilEligible=0 when already eligible', () => {
      const purchaseDate = new Date();
      purchaseDate.setFullYear(purchaseDate.getFullYear() - 6);

      const result = qsbsEligibilityService.checkHoldingPeriod({
        acquisitionDate: purchaseDate.toISOString()
      });

      expect(result.daysUntilEligible).toBe(0);
    });
  });

  describe('checkActiveBusiness', () => {
    it('should return eligible=true for qualifying active business types', () => {
      const qualifyingTypes = ['technology', 'manufacturing', 'retail', 'software'];
      for (const businessType of qualifyingTypes) {
        const result = qsbsEligibilityService.checkActiveBusiness({ businessType });
        expect(result.eligible).toBe(true);
      }
    });

    it('should return eligible=false for excluded industries', () => {
      const excludedTypes = ['financial-services', 'banking', 'insurance', 'real-estate', 'hotel', 'restaurant', 'legal', 'health'];
      for (const businessType of excludedTypes) {
        const result = qsbsEligibilityService.checkActiveBusiness({ businessType });
        expect(result.eligible).toBe(false);
      }
    });
  });

  describe('evaluateEligibility', () => {
    it('should return fully eligible for a compliant QSBS scenario', () => {
      const data = {
        stakeholderId: 'sh-123',
        entityType: 'c-corp',
        grossAssetsAtIssuance: 20000000,
        acquisitionDate: new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        businessType: 'technology',
        sharesAcquired: 100000,
        acquisitionPrice: 1.00
      };

      const result = qsbsEligibilityService.evaluateEligibility(data);

      expect(result.overallEligible).toBe(true);
      expect(result.checks).toBeDefined();
      expect(result.checks.cCorp).toBeDefined();
      expect(result.checks.grossAssets).toBeDefined();
      expect(result.checks.holdingPeriod).toBeDefined();
      expect(result.checks.activeBusiness).toBeDefined();
    });

    it('should return not eligible when entity is LLC', () => {
      const data = {
        stakeholderId: 'sh-456',
        entityType: 'llc',
        grossAssetsAtIssuance: 20000000,
        acquisitionDate: new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        businessType: 'technology',
        sharesAcquired: 100000,
        acquisitionPrice: 1.00
      };

      const result = qsbsEligibilityService.evaluateEligibility(data);

      expect(result.overallEligible).toBe(false);
      expect(result.failedChecks).toContain('cCorp');
    });

    it('should return not eligible when gross assets exceed $50M', () => {
      const data = {
        stakeholderId: 'sh-789',
        entityType: 'c-corp',
        grossAssetsAtIssuance: 100000000,
        acquisitionDate: new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        businessType: 'technology',
        sharesAcquired: 100000,
        acquisitionPrice: 1.00
      };

      const result = qsbsEligibilityService.evaluateEligibility(data);

      expect(result.overallEligible).toBe(false);
      expect(result.failedChecks).toContain('grossAssets');
    });

    it('should include potential exclusion gain limit', () => {
      const data = {
        stakeholderId: 'sh-123',
        entityType: 'c-corp',
        grossAssetsAtIssuance: 20000000,
        acquisitionDate: new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString(),
        businessType: 'technology',
        sharesAcquired: 100000,
        acquisitionPrice: 5.00
      };

      const result = qsbsEligibilityService.evaluateEligibility(data);

      expect(result.potentialExclusionLimit).toBeDefined();
      // Section 1202: greater of $10M or 10x basis
      expect(result.potentialExclusionLimit).toBeGreaterThan(0);
    });

    it('should handle missing optional fields gracefully', () => {
      const data = {
        stakeholderId: 'sh-000',
        entityType: 'c-corp'
      };

      expect(() => qsbsEligibilityService.evaluateEligibility(data)).not.toThrow();
    });
  });
});
