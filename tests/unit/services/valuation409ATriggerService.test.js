/**
 * Tests for valuation409ATriggerService
 * Issue #654: Automatic 409A trigger detection
 */

jest.mock('../../../services/alertService');

const valuation409ATriggerService = require('../../../services/valuation409ATriggerService');

describe('valuation409ATriggerService', () => {
  describe('checkStaleness', () => {
    it('should return stale=true when last 409A is over 12 months old', () => {
      const lastValuationDate = new Date();
      lastValuationDate.setMonth(lastValuationDate.getMonth() - 13);

      const result = valuation409ATriggerService.checkStaleness(lastValuationDate.toISOString());

      expect(result.isStale).toBe(true);
      expect(result.monthsOld).toBeGreaterThan(12);
      expect(result.triggerReason).toContain('12 months');
    });

    it('should return stale=false when last 409A is under 12 months old', () => {
      const lastValuationDate = new Date();
      lastValuationDate.setMonth(lastValuationDate.getMonth() - 6);

      const result = valuation409ATriggerService.checkStaleness(lastValuationDate.toISOString());

      expect(result.isStale).toBe(false);
      expect(result.monthsOld).toBeLessThan(12);
    });

    it('should return stale=true when no valuation date provided', () => {
      const result = valuation409ATriggerService.checkStaleness(null);

      expect(result.isStale).toBe(true);
      expect(result.triggerReason).toBeDefined();
    });

    it('should include days remaining before staleness', () => {
      const lastValuationDate = new Date();
      lastValuationDate.setMonth(lastValuationDate.getMonth() - 6);

      const result = valuation409ATriggerService.checkStaleness(lastValuationDate.toISOString());

      expect(result.daysRemaining).toBeDefined();
      expect(result.daysRemaining).toBeGreaterThan(0);
    });
  });

  describe('detectTriggers', () => {
    it('should detect funding round trigger', () => {
      const events = [
        { type: 'funding_round', date: new Date().toISOString(), details: { round: 'Series A', amount: 5000000 } }
      ];

      const triggers = valuation409ATriggerService.detectTriggers(events);

      expect(triggers).toHaveLength(1);
      expect(triggers[0].type).toBe('funding_round');
      expect(triggers[0].requiresNewValuation).toBe(true);
    });

    it('should detect new share class trigger', () => {
      const events = [
        { type: 'new_share_class', date: new Date().toISOString(), details: { className: 'Series B Preferred' } }
      ];

      const triggers = valuation409ATriggerService.detectTriggers(events);

      expect(triggers).toHaveLength(1);
      expect(triggers[0].type).toBe('new_share_class');
      expect(triggers[0].requiresNewValuation).toBe(true);
    });

    it('should detect staleness trigger from 12+ month old valuation', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      const events = [
        { type: 'last_409a', date: oldDate.toISOString(), details: {} }
      ];

      const triggers = valuation409ATriggerService.detectTriggers(events);

      const stalenessTrigger = triggers.find(t => t.type === 'staleness');
      expect(stalenessTrigger).toBeDefined();
      expect(stalenessTrigger.requiresNewValuation).toBe(true);
    });

    it('should return empty array when no triggers found', () => {
      const events = [
        { type: 'document_uploaded', date: new Date().toISOString(), details: {} }
      ];

      const triggers = valuation409ATriggerService.detectTriggers(events);

      expect(triggers).toHaveLength(0);
    });

    it('should handle empty events array', () => {
      const triggers = valuation409ATriggerService.detectTriggers([]);

      expect(Array.isArray(triggers)).toBe(true);
      expect(triggers).toHaveLength(0);
    });
  });

  describe('analyzeStaleness', () => {
    it('should return a full staleness analysis object', async () => {
      const companyData = {
        companyId: 'co-123',
        lastValuationDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(), // 400 days ago
        recentEvents: [
          { type: 'funding_round', date: new Date().toISOString(), details: { round: 'Series A' } }
        ]
      };

      const result = await valuation409ATriggerService.analyzeStaleness(companyData);

      expect(result).toBeDefined();
      expect(result.companyId).toBe('co-123');
      expect(result.isStale).toBe(true);
      expect(result.triggers).toBeDefined();
      expect(Array.isArray(result.triggers)).toBe(true);
      expect(result.recommendedAction).toBeDefined();
    });

    it('should recommend no action when valuation is current and no triggers', async () => {
      const companyData = {
        companyId: 'co-456',
        lastValuationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        recentEvents: []
      };

      const result = await valuation409ATriggerService.analyzeStaleness(companyData);

      expect(result.isStale).toBe(false);
      expect(result.recommendedAction).toBe('none');
    });

    it('should include urgency level in analysis', async () => {
      const companyData = {
        companyId: 'co-789',
        lastValuationDate: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(), // very old
        recentEvents: []
      };

      const result = await valuation409ATriggerService.analyzeStaleness(companyData);

      expect(result.urgency).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(result.urgency);
    });
  });
});
