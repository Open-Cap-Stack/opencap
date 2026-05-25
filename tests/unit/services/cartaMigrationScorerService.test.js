/**
 * Tests for cartaMigrationScorerService
 * Issue #652: Carta migration score tool
 */

const cartaMigrationScorerService = require('../../../services/cartaMigrationScorerService');

describe('cartaMigrationScorerService', () => {
  describe('analyzeExport', () => {
    it('should return a score object with all dimension scores', () => {
      const exportData = {
        stakeholders: [
          { name: 'Alice', email: 'alice@example.com', role: 'founder', shares: 1000000 },
          { name: 'Bob', email: 'bob@example.com', role: 'investor', shares: 500000 }
        ],
        shareClasses: [
          { name: 'Common', authorizedShares: 10000000, pricePerShare: 1.00 },
          { name: 'Series A Preferred', authorizedShares: 5000000, pricePerShare: 2.50 }
        ],
        equityGrants: [
          { grantee: 'Charlie', shares: 100000, vestingSchedule: '4-year', cliffMonths: 12 }
        ],
        safes: [
          { investor: 'Dave', amount: 500000, valuationCap: 5000000 }
        ],
        documents: [
          { name: 'Articles of Incorporation', type: 'incorporation' },
          { name: 'Series A Term Sheet', type: 'termSheet' }
        ]
      };

      const result = cartaMigrationScorerService.analyzeExport(exportData);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.dimensions).toBeDefined();
      expect(result.dimensions.stakeholders).toBeDefined();
      expect(result.dimensions.shareClasses).toBeDefined();
      expect(result.dimensions.equityGrants).toBeDefined();
      expect(result.dimensions.safesAndNotes).toBeDefined();
      expect(result.dimensions.documents).toBeDefined();
    });

    it('should return low score for empty export', () => {
      const result = cartaMigrationScorerService.analyzeExport({});

      expect(result.overallScore).toBeLessThan(30);
      expect(result.dimensions.stakeholders.score).toBe(0);
      expect(result.dimensions.shareClasses.score).toBe(0);
      expect(result.dimensions.equityGrants.score).toBe(0);
    });

    it('should score stakeholders dimension based on completeness', () => {
      const complete = {
        stakeholders: [
          { name: 'Alice', email: 'alice@example.com', role: 'founder', shares: 1000000 },
          { name: 'Bob', email: 'bob@example.com', role: 'investor', shares: 500000 }
        ]
      };
      const incomplete = {
        stakeholders: [
          { name: 'Alice' }
        ]
      };

      const completeResult = cartaMigrationScorerService.analyzeExport(complete);
      const incompleteResult = cartaMigrationScorerService.analyzeExport(incomplete);

      expect(completeResult.dimensions.stakeholders.score).toBeGreaterThan(incompleteResult.dimensions.stakeholders.score);
    });

    it('should score share classes dimension', () => {
      const withClasses = {
        shareClasses: [
          { name: 'Common', authorizedShares: 10000000, pricePerShare: 1.00 },
          { name: 'Series A', authorizedShares: 5000000, pricePerShare: 2.50 }
        ]
      };
      const withoutClasses = {};

      const withResult = cartaMigrationScorerService.analyzeExport(withClasses);
      const withoutResult = cartaMigrationScorerService.analyzeExport(withoutClasses);

      expect(withResult.dimensions.shareClasses.score).toBeGreaterThan(withoutResult.dimensions.shareClasses.score);
    });

    it('should score equity grants dimension', () => {
      const withGrants = {
        equityGrants: [
          { grantee: 'Charlie', shares: 100000, vestingSchedule: '4-year', cliffMonths: 12, exercisePrice: 1.00 }
        ]
      };

      const result = cartaMigrationScorerService.analyzeExport(withGrants);

      expect(result.dimensions.equityGrants.score).toBeGreaterThan(0);
    });

    it('should score SAFEs and notes dimension', () => {
      const withSafes = {
        safes: [
          { investor: 'Dave', amount: 500000, valuationCap: 5000000, discountRate: 0.2 }
        ]
      };

      const result = cartaMigrationScorerService.analyzeExport(withSafes);

      expect(result.dimensions.safesAndNotes.score).toBeGreaterThan(0);
    });

    it('should score documents dimension', () => {
      const withDocs = {
        documents: [
          { name: 'Articles of Incorporation', type: 'incorporation' },
          { name: 'Series A Term Sheet', type: 'termSheet' },
          { name: 'Option Grant Agreement', type: 'optionGrant' }
        ]
      };

      const result = cartaMigrationScorerService.analyzeExport(withDocs);

      expect(result.dimensions.documents.score).toBeGreaterThan(0);
    });

    it('should return overall score as weighted average', () => {
      const fullExport = {
        stakeholders: [
          { name: 'Alice', email: 'alice@example.com', role: 'founder', shares: 1000000 },
          { name: 'Bob', email: 'bob@example.com', role: 'investor', shares: 500000 }
        ],
        shareClasses: [
          { name: 'Common', authorizedShares: 10000000, pricePerShare: 1.00 }
        ],
        equityGrants: [
          { grantee: 'Charlie', shares: 100000, vestingSchedule: '4-year', cliffMonths: 12 }
        ],
        safes: [
          { investor: 'Dave', amount: 500000, valuationCap: 5000000 }
        ],
        documents: [
          { name: 'Articles of Incorporation', type: 'incorporation' }
        ]
      };

      const result = cartaMigrationScorerService.analyzeExport(fullExport);

      expect(result.overallScore).toBeGreaterThan(50);
      expect(typeof result.overallScore).toBe('number');
    });

    it('should include readiness label based on score', () => {
      const highScore = {
        stakeholders: [
          { name: 'Alice', email: 'alice@example.com', role: 'founder', shares: 1000000 }
        ],
        shareClasses: [
          { name: 'Common', authorizedShares: 10000000, pricePerShare: 1.00 }
        ],
        equityGrants: [],
        safes: [],
        documents: [{ name: 'Inc', type: 'incorporation' }]
      };

      const result = cartaMigrationScorerService.analyzeExport(highScore);

      expect(result.readinessLabel).toBeDefined();
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.readinessLabel);
    });

    it('should include missing fields list per dimension', () => {
      const partial = {
        stakeholders: [{ name: 'Alice' }] // missing email, role, shares
      };

      const result = cartaMigrationScorerService.analyzeExport(partial);

      expect(result.dimensions.stakeholders.missingFields).toBeDefined();
      expect(Array.isArray(result.dimensions.stakeholders.missingFields)).toBe(true);
    });

    it('should handle null/undefined gracefully', () => {
      expect(() => cartaMigrationScorerService.analyzeExport(null)).not.toThrow();
      expect(() => cartaMigrationScorerService.analyzeExport(undefined)).not.toThrow();
    });
  });
});
