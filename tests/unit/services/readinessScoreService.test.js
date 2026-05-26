'use strict';

/**
 * Tests for readinessScoreService
 * Issue #651: Investor readiness score API + lead magnet
 */

const readinessScoreService = require('../../../services/readinessScoreService');

describe('readinessScoreService', () => {
  describe('scoreDocuments', () => {
    it('should return 0 for empty document list', () => {
      const result = readinessScoreService.scoreDocuments([]);
      expect(result.score).toBe(0);
      expect(result.breakdown).toBeDefined();
      expect(result.criticalGaps).toBeDefined();
      expect(result.topRecommendations).toBeDefined();
      expect(result.upgradePrompt).toBeDefined();
    });

    it('should return high score for a full document set', () => {
      const documents = [
        { name: 'cap_table.xlsx', textContent: 'Share classes: Common A, Preferred Series A. Equity grants for 5 employees. SAFE notes outstanding.' },
        { name: 'certificate_of_incorporation.pdf', textContent: 'State of Delaware. Certificate of Incorporation for Acme Inc.' },
        { name: 'bylaws.pdf', textContent: 'Corporate bylaws for Acme Inc.' },
        { name: 'profit_and_loss.xlsx', textContent: 'P&L statement for FY2025. Revenue: $2M. COGS: $500K.' },
        { name: 'balance_sheet.xlsx', textContent: 'Balance sheet as of Dec 2025. Total assets: $5M.' },
        { name: 'bank_statement.pdf', textContent: 'Bank statement for Acme Inc. Ending balance: $1.2M.' },
        { name: 'board_minutes.pdf', textContent: 'Board meeting minutes from Q4 2025. Resolutions approved.' },
        { name: 'ip_assignment.pdf', textContent: 'Intellectual property assignment agreement. All founders assign IP to company.' },
        { name: 'shareholder_agreement.pdf', textContent: 'Shareholder agreement for Acme Inc. Drag-along and tag-along rights.' },
        { name: '409a_valuation.pdf', textContent: '409A valuation report. Fair market value: $1.50 per share. Valuation date: 2025-06-01.' },
        { name: 'pitch_deck.pptx', textContent: 'Acme Inc pitch deck. Market size: $10B. Traction: 500 customers.' },
        { name: 'operating_agreement.pdf', textContent: 'Operating agreement for the LLC.' },
      ];
      const result = readinessScoreService.scoreDocuments(documents);
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.criticalGaps.length).toBeLessThanOrEqual(3);
    });

    it('should give cap table category 25 points max', () => {
      const docs = [
        { name: 'cap_table.xlsx', textContent: 'Share classes: Common. Equity grants: 10. SAFE notes: 2 outstanding.' },
      ];
      const result = readinessScoreService.scoreDocuments(docs);
      expect(result.breakdown.capTable.maxPoints).toBe(25);
      expect(result.breakdown.capTable.earned).toBeGreaterThan(0);
      expect(result.breakdown.capTable.earned).toBeLessThanOrEqual(25);
    });

    it('should give formation docs category 20 points max', () => {
      const docs = [
        { name: 'certificate_of_incorporation.pdf', textContent: 'Certificate of incorporation filed in Delaware.' },
        { name: 'bylaws.pdf', textContent: 'Corporate bylaws.' },
      ];
      const result = readinessScoreService.scoreDocuments(docs);
      expect(result.breakdown.formationDocs.maxPoints).toBe(20);
      expect(result.breakdown.formationDocs.earned).toBeGreaterThan(0);
      expect(result.breakdown.formationDocs.earned).toBeLessThanOrEqual(20);
    });

    it('should give financials category 20 points max', () => {
      const docs = [
        { name: 'pnl.xlsx', textContent: 'Profit and loss statement. Revenue: $500K.' },
        { name: 'balance_sheet.xlsx', textContent: 'Balance sheet. Total assets: $2M.' },
        { name: 'bank_statement.pdf', textContent: 'Bank statement ending balance $300K.' },
      ];
      const result = readinessScoreService.scoreDocuments(docs);
      expect(result.breakdown.financials.maxPoints).toBe(20);
      expect(result.breakdown.financials.earned).toBeGreaterThan(0);
      expect(result.breakdown.financials.earned).toBeLessThanOrEqual(20);
    });

    it('should give compliance category 15 points max', () => {
      const docs = [
        { name: 'board_minutes.pdf', textContent: 'Board meeting minutes.' },
        { name: 'ip_assignment.pdf', textContent: 'IP assignment agreement.' },
        { name: 'shareholder_agreement.pdf', textContent: 'Shareholder agreement.' },
      ];
      const result = readinessScoreService.scoreDocuments(docs);
      expect(result.breakdown.compliance.maxPoints).toBe(15);
      expect(result.breakdown.compliance.earned).toBeGreaterThan(0);
      expect(result.breakdown.compliance.earned).toBeLessThanOrEqual(15);
    });

    it('should give 409A valuation category 10 points max', () => {
      const docs = [
        { name: '409a_report.pdf', textContent: '409A valuation. FMV: $2.00/share.' },
      ];
      const result = readinessScoreService.scoreDocuments(docs);
      expect(result.breakdown.valuation409A.maxPoints).toBe(10);
      expect(result.breakdown.valuation409A.earned).toBeGreaterThan(0);
      expect(result.breakdown.valuation409A.earned).toBeLessThanOrEqual(10);
    });

    it('should give other category 10 points max', () => {
      const docs = [
        { name: 'pitch_deck.pptx', textContent: 'Pitch deck for Series A.' },
        { name: 'operating_agreement.pdf', textContent: 'LLC operating agreement.' },
      ];
      const result = readinessScoreService.scoreDocuments(docs);
      expect(result.breakdown.other.maxPoints).toBe(10);
      expect(result.breakdown.other.earned).toBeGreaterThan(0);
      expect(result.breakdown.other.earned).toBeLessThanOrEqual(10);
    });

    it('should include an upgrade prompt in the response', () => {
      const result = readinessScoreService.scoreDocuments([]);
      expect(typeof result.upgradePrompt).toBe('string');
      expect(result.upgradePrompt.length).toBeGreaterThan(0);
    });

    it('should limit criticalGaps to top 3 for public response', () => {
      // With no docs, there should be many gaps but criticalGaps capped at 3
      const result = readinessScoreService.scoreDocuments([]);
      expect(result.criticalGaps.length).toBeLessThanOrEqual(3);
    });

    it('should provide full gaps list in allGaps', () => {
      const result = readinessScoreService.scoreDocuments([]);
      expect(result.allGaps).toBeDefined();
      expect(result.allGaps.length).toBeGreaterThan(3);
    });

    it('should provide topRecommendations', () => {
      const result = readinessScoreService.scoreDocuments([]);
      expect(Array.isArray(result.topRecommendations)).toBe(true);
      expect(result.topRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('scoreFromCompanyData', () => {
    it('should score based on ZeroDB document records', () => {
      const companyDocuments = [
        { documentType: 'certificate_of_incorporation', name: 'COI.pdf' },
        { documentType: 'bylaws', name: 'Bylaws.pdf' },
        { documentType: '409a_valuation', name: '409A.pdf' },
      ];
      const companyData = {
        documents: companyDocuments,
        shareClasses: [{ name: 'Common' }],
        equityGrants: [{ grantee: 'Alice', shares: 1000 }],
        safes: [],
      };
      const result = readinessScoreService.scoreFromCompanyData(companyData);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.breakdown).toBeDefined();
    });

    it('should return 0 for empty company data', () => {
      const result = readinessScoreService.scoreFromCompanyData({
        documents: [],
        shareClasses: [],
        equityGrants: [],
        safes: [],
      });
      expect(result.score).toBe(0);
    });
  });
});
