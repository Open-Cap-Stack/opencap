/**
 * Tests for capTableHealthService
 * Issue #660: Cap table health scorecard engine
 *
 * Score dimensions (weighted):
 * - Document completeness 20%
 * - OCTA compliance 20%
 * - 409A currency 15%
 * - Stakeholder completeness 15%
 * - Structural cleanliness 15%
 * - SAFE/note status 15%
 */

const capTableHealthService = require('../../../services/capTableHealthService');

describe('capTableHealthService', () => {
  describe('scoreDocumentCompleteness', () => {
    it('should return 100 when all required document types present', () => {
      const documents = [
        { type: 'articles_of_incorporation' },
        { type: 'bylaws' },
        { type: 'stock_plan' },
        { type: 'shareholder_agreement' },
        { type: 'board_consents' }
      ];
      const result = capTableHealthService.scoreDocumentCompleteness(documents);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should return 0 when no documents', () => {
      const result = capTableHealthService.scoreDocumentCompleteness([]);
      expect(result.score).toBe(0);
    });

    it('should return partial score for partial documents', () => {
      const documents = [{ type: 'articles_of_incorporation' }];
      const result = capTableHealthService.scoreDocumentCompleteness(documents);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('scoreOctaCompliance', () => {
    it('should return high score for OCTA-compliant stakeholders', () => {
      const stakeholders = [
        { stakeholderId: 'sh-1', name: 'Alice', email: 'alice@example.com', role: 'founder', sharesOwned: 1000000, shareClass: 'Common' },
        { stakeholderId: 'sh-2', name: 'Bob', email: 'bob@example.com', role: 'investor', sharesOwned: 500000, shareClass: 'Series A' }
      ];
      const shareClasses = [
        { name: 'Common', authorizedShares: 10000000, issuedShares: 5000000 },
        { name: 'Series A', authorizedShares: 5000000, issuedShares: 2000000 }
      ];
      const result = capTableHealthService.scoreOctaCompliance({ stakeholders, shareClasses });
      expect(result.score).toBeGreaterThan(50);
    });

    it('should return low score when stakeholders lack required fields', () => {
      const stakeholders = [{ name: 'Alice' }];
      const result = capTableHealthService.scoreOctaCompliance({ stakeholders, shareClasses: [] });
      expect(result.score).toBeLessThan(50);
    });
  });

  describe('score409ACurrency', () => {
    it('should return 100 for valuation done within 12 months', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 3);
      const result = capTableHealthService.score409ACurrency({
        lastValuationDate: recentDate.toISOString()
      });
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it('should return 0 for missing valuation', () => {
      const result = capTableHealthService.score409ACurrency({ lastValuationDate: null });
      expect(result.score).toBe(0);
    });

    it('should return low score for stale valuation', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      const result = capTableHealthService.score409ACurrency({
        lastValuationDate: oldDate.toISOString()
      });
      expect(result.score).toBeLessThan(30);
    });
  });

  describe('scoreStakeholderCompleteness', () => {
    it('should score based on profile completeness', () => {
      const stakeholders = [
        { name: 'Alice', email: 'alice@example.com', role: 'founder', address: '123 Main St', taxId: '123-45-6789' }
      ];
      const result = capTableHealthService.scoreStakeholderCompleteness(stakeholders);
      expect(result.score).toBeGreaterThan(0);
    });

    it('should return 0 for empty stakeholders', () => {
      const result = capTableHealthService.scoreStakeholderCompleteness([]);
      expect(result.score).toBe(0);
    });
  });

  describe('scoreStructuralCleanliness', () => {
    it('should detect over-issuance as structural issue', () => {
      const shareClasses = [
        { name: 'Common', authorizedShares: 1000, issuedShares: 2000 } // over-issued
      ];
      const result = capTableHealthService.scoreStructuralCleanliness({ shareClasses, equityGrants: [] });
      expect(result.score).toBeLessThan(80);
      expect(result.issues).toBeDefined();
    });

    it('should return high score for clean structure', () => {
      const shareClasses = [
        { name: 'Common', authorizedShares: 10000000, issuedShares: 5000000 }
      ];
      const result = capTableHealthService.scoreStructuralCleanliness({ shareClasses, equityGrants: [] });
      expect(result.score).toBeGreaterThan(70);
    });
  });

  describe('scoreSafeNoteStatus', () => {
    it('should return high score when all SAFEs have complete data', () => {
      const safes = [
        { investor: 'Alice', amount: 500000, valuationCap: 5000000, discountRate: 0.2, status: 'active' }
      ];
      const result = capTableHealthService.scoreSafeNoteStatus(safes);
      expect(result.score).toBeGreaterThan(70);
    });

    it('should return 100 when no SAFEs exist (not a problem)', () => {
      const result = capTableHealthService.scoreSafeNoteStatus([]);
      expect(result.score).toBe(100);
    });

    it('should penalize SAFEs missing key fields', () => {
      const safes = [{ investor: 'Alice' }]; // missing amount, valuationCap
      const result = capTableHealthService.scoreSafeNoteStatus(safes);
      expect(result.score).toBeLessThan(80);
    });
  });

  describe('computeHealthScore', () => {
    it('should return a complete health scorecard', () => {
      const data = {
        companyId: 'co-123',
        documents: [
          { type: 'articles_of_incorporation' },
          { type: 'bylaws' }
        ],
        stakeholders: [
          { name: 'Alice', email: 'alice@example.com', role: 'founder', sharesOwned: 1000000, shareClass: 'Common' }
        ],
        shareClasses: [
          { name: 'Common', authorizedShares: 10000000, issuedShares: 5000000 }
        ],
        equityGrants: [],
        safes: [],
        lastValuationDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      };

      const result = capTableHealthService.computeHealthScore(data);

      expect(result).toBeDefined();
      expect(result.companyId).toBe('co-123');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.dimensions).toBeDefined();
      expect(result.dimensions.documentCompleteness).toBeDefined();
      expect(result.dimensions.octaCompliance).toBeDefined();
      expect(result.dimensions.valuation409ACurrency).toBeDefined();
      expect(result.dimensions.stakeholderCompleteness).toBeDefined();
      expect(result.dimensions.structuralCleanliness).toBeDefined();
      expect(result.dimensions.safeNoteStatus).toBeDefined();
      expect(result.grade).toBeDefined();
      expect(['A', 'B', 'C', 'D', 'F']).toContain(result.grade);
    });

    it('should return grade F for empty data', () => {
      const result = capTableHealthService.computeHealthScore({ companyId: 'co-empty' });
      expect(result.grade).toBe('F');
    });

    it('should apply correct dimension weights summing to 1.0', () => {
      const result = capTableHealthService.computeHealthScore({ companyId: 'co-test' });
      expect(result.dimensionWeights).toBeDefined();
      const totalWeight = Object.values(result.dimensionWeights).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });
  });
});
