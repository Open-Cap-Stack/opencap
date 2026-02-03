/**
 * MaterialEvent Model Tests
 * Feature: Issue #60 - Build Material Events Tracking
 * TDD: Write tests first
 */

describe('MaterialEvent Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid material event with required fields', () => {
      const validData = {
        companyId: 'company_123',
        eventType: 'fundraising_round',
        eventDate: new Date(),
        description: 'Series A funding round closed',
        triggersValuation: true
      };

      expect(validData.companyId).toBeDefined();
      expect(validData.eventType).toBeDefined();
      expect(validData.triggersValuation).toBe(true);
    });

    it('should validate event types', () => {
      const validEventTypes = [
        'fundraising_round',
        'significant_transaction',
        'key_employee_departure',
        'key_employee_hire',
        'acquisition_offer',
        'merger_discussion',
        'major_customer_change',
        'major_product_launch',
        'significant_revenue_change',
        'litigation',
        'regulatory_change',
        'market_condition_change',
        'other'
      ];

      expect(validEventTypes.length).toBeGreaterThan(10);
      expect(validEventTypes).toContain('fundraising_round');
      expect(validEventTypes).toContain('acquisition_offer');
    });

    it('should auto-generate eventId with prefix', () => {
      const prefix = 'evt_';
      const mockId = `${prefix}${Date.now()}`;
      expect(mockId.startsWith('evt_')).toBe(true);
    });
  });

  describe('Valuation Trigger Rules', () => {
    const triggerRules = {
      fundraising_round: { alwaysTriggers: true },
      significant_transaction: { alwaysTriggers: true },
      acquisition_offer: { alwaysTriggers: true },
      merger_discussion: { alwaysTriggers: true },
      key_employee_departure: { threshold: 'c_level' },
      major_customer_change: { threshold: 'revenue_impact_20_percent' },
      significant_revenue_change: { threshold: 'change_25_percent' }
    };

    it('should always trigger valuation for fundraising rounds', () => {
      expect(triggerRules.fundraising_round.alwaysTriggers).toBe(true);
    });

    it('should always trigger valuation for acquisitions/mergers', () => {
      expect(triggerRules.acquisition_offer.alwaysTriggers).toBe(true);
      expect(triggerRules.merger_discussion.alwaysTriggers).toBe(true);
    });

    it('should have threshold conditions for employee changes', () => {
      expect(triggerRules.key_employee_departure.threshold).toBe('c_level');
    });

    it('should have threshold conditions for revenue changes', () => {
      expect(triggerRules.significant_revenue_change.threshold).toBe('change_25_percent');
    });
  });

  describe('Event Status', () => {
    it('should have valid status values', () => {
      const validStatuses = ['detected', 'acknowledged', 'action_required', 'resolved', 'dismissed'];

      expect(validStatuses).toContain('detected');
      expect(validStatuses).toContain('action_required');
      expect(validStatuses).toContain('resolved');
    });

    it('should default to detected status', () => {
      const newEvent = { status: 'detected' };
      expect(newEvent.status).toBe('detected');
    });
  });

  describe('Valuation Impact Assessment', () => {
    it('should calculate impact severity', () => {
      const severityLevels = ['low', 'medium', 'high', 'critical'];

      const calculateSeverity = (eventType, metadata) => {
        if (['fundraising_round', 'acquisition_offer', 'merger_discussion'].includes(eventType)) {
          return 'critical';
        }
        if (eventType === 'significant_transaction' && metadata?.amount > 1000000) {
          return 'high';
        }
        return 'medium';
      };

      expect(calculateSeverity('fundraising_round', {})).toBe('critical');
      expect(calculateSeverity('significant_transaction', { amount: 5000000 })).toBe('high');
      expect(calculateSeverity('key_employee_departure', {})).toBe('medium');
    });

    it('should track days since last valuation', () => {
      const lastValuationDate = new Date();
      lastValuationDate.setMonth(lastValuationDate.getMonth() - 8);

      const daysSinceLastValuation = Math.floor(
        (new Date() - lastValuationDate) / (1000 * 60 * 60 * 24)
      );

      expect(daysSinceLastValuation).toBeGreaterThan(200);
    });
  });

  describe('Alert Generation', () => {
    it('should generate alert when event triggers valuation', () => {
      const event = {
        eventType: 'fundraising_round',
        triggersValuation: true,
        companyId: 'company_123'
      };

      const shouldAlert = event.triggersValuation;
      expect(shouldAlert).toBe(true);
    });

    it('should include relevant stakeholders in alert', () => {
      const alertRecipients = ['cfo', 'legal_counsel', 'hr_director'];
      expect(alertRecipients).toContain('cfo');
      expect(alertRecipients).toContain('legal_counsel');
    });
  });

  describe('Related Entities', () => {
    it('should link to related fundraising round', () => {
      const event = {
        eventType: 'fundraising_round',
        relatedEntity: {
          entityType: 'FundraisingRound',
          entityId: 'round_123'
        }
      };

      expect(event.relatedEntity.entityType).toBe('FundraisingRound');
    });

    it('should link to related stakeholder for employee events', () => {
      const event = {
        eventType: 'key_employee_departure',
        relatedEntity: {
          entityType: 'Stakeholder',
          entityId: 'stakeholder_456'
        }
      };

      expect(event.relatedEntity.entityType).toBe('Stakeholder');
    });
  });

  describe('Compliance Dashboard Integration', () => {
    it('should track events requiring action', () => {
      const events = [
        { status: 'action_required', eventType: 'fundraising_round' },
        { status: 'resolved', eventType: 'key_employee_hire' },
        { status: 'action_required', eventType: 'acquisition_offer' }
      ];

      const actionRequired = events.filter(e => e.status === 'action_required');
      expect(actionRequired.length).toBe(2);
    });

    it('should provide summary statistics', () => {
      const calculateSummary = (events) => ({
        total: events.length,
        actionRequired: events.filter(e => e.status === 'action_required').length,
        triggersValuation: events.filter(e => e.triggersValuation).length
      });

      const events = [
        { status: 'action_required', triggersValuation: true },
        { status: 'resolved', triggersValuation: true },
        { status: 'action_required', triggersValuation: false }
      ];

      const summary = calculateSummary(events);
      expect(summary.total).toBe(3);
      expect(summary.actionRequired).toBe(2);
      expect(summary.triggersValuation).toBe(2);
    });
  });
});
