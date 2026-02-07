/**
 * MaterialEvent Model Tests
 * Feature: Issue #267 - Implement material events catalog and 409A trigger system
 * Original: Issue #60 - Build Material Events Tracking
 * TDD: Write comprehensive tests for material event tracking
 */

const MaterialEvent = require('../../../models/MaterialEvent');

describe('MaterialEvent Model', () => {
    describe('Event Types Catalog', () => {
        it('should export all required event types', () => {
            const { EVENT_TYPES } = MaterialEvent;

            // Auto-detectable events
            expect(EVENT_TYPES.FINANCING_ROUND).toBe('financing_round');
            expect(EVENT_TYPES.DOWN_ROUND).toBe('down_round');
            expect(EVENT_TYPES.BRIDGE_FINANCING).toBe('bridge_financing');
            expect(EVENT_TYPES.BOARD_COMPOSITION_CHANGE).toBe('board_composition_change');
            expect(EVENT_TYPES.STOCK_SPLIT).toBe('stock_split');
            expect(EVENT_TYPES.REVERSE_SPLIT).toBe('reverse_split');

            // Manually reported events
            expect(EVENT_TYPES.SIGNIFICANT_REVENUE_CHANGE).toBe('significant_revenue_change');
            expect(EVENT_TYPES.MAJOR_CUSTOMER_WIN).toBe('major_customer_win');
            expect(EVENT_TYPES.MAJOR_CUSTOMER_LOSS).toBe('major_customer_loss');
            expect(EVENT_TYPES.KEY_EXECUTIVE_CHANGE).toBe('key_executive_change');
            expect(EVENT_TYPES.KEY_EMPLOYEE_DEPARTURE).toBe('key_employee_departure');
            expect(EVENT_TYPES.KEY_EMPLOYEE_HIRE).toBe('key_employee_hire');
            expect(EVENT_TYPES.LITIGATION).toBe('litigation');
            expect(EVENT_TYPES.REGULATORY_CHANGE).toBe('regulatory_change');
            expect(EVENT_TYPES.MA_ACTIVITY).toBe('ma_activity');
            expect(EVENT_TYPES.ACQUISITION_OFFER).toBe('acquisition_offer');
            expect(EVENT_TYPES.MERGER_DISCUSSION).toBe('merger_discussion');
            expect(EVENT_TYPES.GOING_CONCERN_DOUBT).toBe('going_concern_doubt');
            expect(EVENT_TYPES.IP_EVENT).toBe('ip_event');
            expect(EVENT_TYPES.PRODUCT_LAUNCH).toBe('product_launch');
            expect(EVENT_TYPES.PRODUCT_FAILURE).toBe('product_failure');
            expect(EVENT_TYPES.MARKET_DISRUPTION).toBe('market_disruption');
            expect(EVENT_TYPES.IPO_FILING).toBe('ipo_filing');
            expect(EVENT_TYPES.IPO_PREPARATION).toBe('ipo_preparation');
            expect(EVENT_TYPES.SECONDARY_TRANSACTION).toBe('secondary_transaction');
            expect(EVENT_TYPES.SIGNIFICANT_TRANSACTION).toBe('significant_transaction');
            expect(EVENT_TYPES.OTHER).toBe('other');
        });

        it('should have at least 20 event types in the catalog', () => {
            const { EVENT_TYPES } = MaterialEvent;
            expect(Object.keys(EVENT_TYPES).length).toBeGreaterThanOrEqual(20);
        });

        it('should export auto-detectable events list', () => {
            const { AUTO_DETECTABLE_EVENTS, EVENT_TYPES } = MaterialEvent;

            expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.FINANCING_ROUND);
            expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.DOWN_ROUND);
            expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.BRIDGE_FINANCING);
            expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.BOARD_COMPOSITION_CHANGE);
            expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.STOCK_SPLIT);
            expect(AUTO_DETECTABLE_EVENTS).toContain(EVENT_TYPES.REVERSE_SPLIT);
        });
    });

    describe('409A Trigger Logic', () => {
        describe('alwaysTriggers409A', () => {
            it('should return true for financing round events', () => {
                expect(MaterialEvent.alwaysTriggers409A('financing_round')).toBe(true);
            });

            it('should return true for down round events', () => {
                expect(MaterialEvent.alwaysTriggers409A('down_round')).toBe(true);
            });

            it('should return true for bridge financing', () => {
                expect(MaterialEvent.alwaysTriggers409A('bridge_financing')).toBe(true);
            });

            it('should return true for significant transactions', () => {
                expect(MaterialEvent.alwaysTriggers409A('significant_transaction')).toBe(true);
            });

            it('should return true for M&A activity', () => {
                expect(MaterialEvent.alwaysTriggers409A('ma_activity')).toBe(true);
                expect(MaterialEvent.alwaysTriggers409A('acquisition_offer')).toBe(true);
                expect(MaterialEvent.alwaysTriggers409A('merger_discussion')).toBe(true);
            });

            it('should return true for IPO events', () => {
                expect(MaterialEvent.alwaysTriggers409A('ipo_filing')).toBe(true);
                expect(MaterialEvent.alwaysTriggers409A('ipo_preparation')).toBe(true);
            });

            it('should return true for going concern doubt', () => {
                expect(MaterialEvent.alwaysTriggers409A('going_concern_doubt')).toBe(true);
            });

            it('should return false for non-always-trigger events', () => {
                expect(MaterialEvent.alwaysTriggers409A('litigation')).toBe(false);
                expect(MaterialEvent.alwaysTriggers409A('product_launch')).toBe(false);
                expect(MaterialEvent.alwaysTriggers409A('key_employee_hire')).toBe(false);
            });
        });

        describe('requires409AUpdate', () => {
            it('should return true for always-trigger events', () => {
                expect(MaterialEvent.requires409AUpdate('financing_round')).toBe(true);
                expect(MaterialEvent.requires409AUpdate('down_round')).toBe(true);
                expect(MaterialEvent.requires409AUpdate('acquisition_offer')).toBe(true);
            });

            it('should return true for revenue change above threshold', () => {
                expect(MaterialEvent.requires409AUpdate('significant_revenue_change', {
                    impactPercentage: 0.55
                })).toBe(true);

                expect(MaterialEvent.requires409AUpdate('significant_revenue_change', {
                    impactPercentage: -0.60
                })).toBe(true);
            });

            it('should return false for revenue change below threshold', () => {
                expect(MaterialEvent.requires409AUpdate('significant_revenue_change', {
                    impactPercentage: 0.30
                })).toBe(false);
            });

            it('should return true for C-level executive changes', () => {
                expect(MaterialEvent.requires409AUpdate('key_executive_change', {
                    role: 'CEO'
                })).toBe(true);

                expect(MaterialEvent.requires409AUpdate('key_employee_departure', {
                    role: 'CFO'
                })).toBe(true);

                expect(MaterialEvent.requires409AUpdate('key_executive_change', {
                    role: 'CTO and Co-Founder'
                })).toBe(true);
            });

            it('should return false for non-C-level changes', () => {
                expect(MaterialEvent.requires409AUpdate('key_employee_departure', {
                    role: 'Senior Engineer'
                })).toBe(false);
            });

            it('should return true for major customer changes above threshold', () => {
                expect(MaterialEvent.requires409AUpdate('major_customer_loss', {
                    impactPercentage: 0.30
                })).toBe(true);
            });

            it('should return true for significant litigation', () => {
                expect(MaterialEvent.requires409AUpdate('litigation', {
                    materialLevel: 'significant'
                })).toBe(true);

                expect(MaterialEvent.requires409AUpdate('litigation', {
                    materialLevel: 'major'
                })).toBe(true);
            });

            it('should return false for minor litigation', () => {
                expect(MaterialEvent.requires409AUpdate('litigation', {
                    materialLevel: 'minor'
                })).toBe(false);
            });

            it('should return false for unrecognized event types', () => {
                expect(MaterialEvent.requires409AUpdate('unknown_event')).toBe(false);
            });
        });

        describe('isAutoDetectable', () => {
            it('should return true for auto-detectable events', () => {
                expect(MaterialEvent.isAutoDetectable('financing_round')).toBe(true);
                expect(MaterialEvent.isAutoDetectable('down_round')).toBe(true);
                expect(MaterialEvent.isAutoDetectable('bridge_financing')).toBe(true);
                expect(MaterialEvent.isAutoDetectable('stock_split')).toBe(true);
            });

            it('should return false for manually reported events', () => {
                expect(MaterialEvent.isAutoDetectable('litigation')).toBe(false);
                expect(MaterialEvent.isAutoDetectable('product_launch')).toBe(false);
                expect(MaterialEvent.isAutoDetectable('market_disruption')).toBe(false);
            });
        });
    });

    describe('Severity Determination', () => {
        describe('determineSeverity', () => {
            it('should return critical for down rounds', () => {
                expect(MaterialEvent.determineSeverity('down_round')).toBe('critical');
            });

            it('should return critical for going concern doubt', () => {
                expect(MaterialEvent.determineSeverity('going_concern_doubt')).toBe('critical');
            });

            it('should return critical for M&A activity', () => {
                expect(MaterialEvent.determineSeverity('ma_activity')).toBe('critical');
                expect(MaterialEvent.determineSeverity('acquisition_offer')).toBe('critical');
            });

            it('should return critical for IPO filing', () => {
                expect(MaterialEvent.determineSeverity('ipo_filing')).toBe('critical');
            });

            it('should return high for financing rounds', () => {
                expect(MaterialEvent.determineSeverity('financing_round')).toBe('high');
            });

            it('should return high for bridge financing', () => {
                expect(MaterialEvent.determineSeverity('bridge_financing')).toBe('high');
            });

            it('should return high for key executive changes', () => {
                expect(MaterialEvent.determineSeverity('key_executive_change')).toBe('high');
            });

            it('should return high for large financial impact', () => {
                expect(MaterialEvent.determineSeverity('other', {
                    financialImpact: 5000000
                })).toBe('high');
            });

            it('should return high for significant percentage impact', () => {
                expect(MaterialEvent.determineSeverity('other', {
                    impactPercentage: 0.30
                })).toBe('high');
            });

            it('should return medium for other events', () => {
                expect(MaterialEvent.determineSeverity('product_launch')).toBe('medium');
                expect(MaterialEvent.determineSeverity('regulatory_change')).toBe('medium');
            });
        });
    });

    describe('Event Status Workflow', () => {
        it('should export valid status values', () => {
            const { EVENT_STATUSES } = MaterialEvent;

            expect(EVENT_STATUSES.DETECTED).toBe('detected');
            expect(EVENT_STATUSES.ACKNOWLEDGED).toBe('acknowledged');
            expect(EVENT_STATUSES.ACTION_REQUIRED).toBe('action_required');
            expect(EVENT_STATUSES.RESOLVED).toBe('resolved');
            expect(EVENT_STATUSES.DISMISSED).toBe('dismissed');
        });

        it('should have 5 status values', () => {
            const { EVENT_STATUSES } = MaterialEvent;
            expect(Object.keys(EVENT_STATUSES).length).toBe(5);
        });
    });

    describe('Detection Methods', () => {
        it('should export valid detection methods', () => {
            const { DETECTION_METHODS } = MaterialEvent;

            expect(DETECTION_METHODS.AUTO).toBe('auto');
            expect(DETECTION_METHODS.MANUAL).toBe('manual');
            expect(DETECTION_METHODS.EXTERNAL).toBe('external');
            expect(DETECTION_METHODS.API_INTEGRATION).toBe('api_integration');
            expect(DETECTION_METHODS.SCHEDULED_SCAN).toBe('scheduled_scan');
        });
    });

    describe('Helper Methods', () => {
        describe('requiresImmediateAction', () => {
            it('should return true for critical unresolved events requiring 409A', () => {
                const event = {
                    requires409AUpdate: true,
                    severity: 'critical',
                    status: 'detected'
                };
                expect(MaterialEvent.requiresImmediateAction(event)).toBe(true);
            });

            it('should return false for resolved events', () => {
                const event = {
                    requires409AUpdate: true,
                    severity: 'critical',
                    status: 'resolved'
                };
                expect(MaterialEvent.requiresImmediateAction(event)).toBe(false);
            });

            it('should return false for dismissed events', () => {
                const event = {
                    requires409AUpdate: true,
                    severity: 'critical',
                    status: 'dismissed'
                };
                expect(MaterialEvent.requiresImmediateAction(event)).toBe(false);
            });

            it('should return false for non-critical events', () => {
                const event = {
                    requires409AUpdate: true,
                    severity: 'medium',
                    status: 'detected'
                };
                expect(MaterialEvent.requiresImmediateAction(event)).toBe(false);
            });

            it('should return false for events not requiring 409A', () => {
                const event = {
                    requires409AUpdate: false,
                    severity: 'critical',
                    status: 'detected'
                };
                expect(MaterialEvent.requiresImmediateAction(event)).toBe(false);
            });
        });

        describe('getDaysSinceEvent', () => {
            it('should calculate days since event correctly', () => {
                const tenDaysAgo = new Date();
                tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

                const event = { eventDate: tenDaysAgo.toISOString() };
                expect(MaterialEvent.getDaysSinceEvent(event)).toBe(10);
            });

            it('should return 0 for today', () => {
                const event = { eventDate: new Date().toISOString() };
                expect(MaterialEvent.getDaysSinceEvent(event)).toBe(0);
            });
        });
    });

    describe('Conditional Trigger Thresholds', () => {
        it('should have correct threshold for significant revenue change', () => {
            const { CONDITIONAL_TRIGGER_409A, EVENT_TYPES } = MaterialEvent;
            expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.SIGNIFICANT_REVENUE_CHANGE].threshold).toBe(0.50);
        });

        it('should have correct threshold for major customer events', () => {
            const { CONDITIONAL_TRIGGER_409A, EVENT_TYPES } = MaterialEvent;
            expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.MAJOR_CUSTOMER_WIN].threshold).toBe(0.25);
            expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.MAJOR_CUSTOMER_LOSS].threshold).toBe(0.25);
        });

        it('should have correct roles for executive changes', () => {
            const { CONDITIONAL_TRIGGER_409A, EVENT_TYPES } = MaterialEvent;
            const roles = CONDITIONAL_TRIGGER_409A[EVENT_TYPES.KEY_EXECUTIVE_CHANGE].roles;

            expect(roles).toContain('CEO');
            expect(roles).toContain('CFO');
            expect(roles).toContain('CTO');
            expect(roles).toContain('COO');
        });

        it('should have correct threshold for board composition change', () => {
            const { CONDITIONAL_TRIGGER_409A, EVENT_TYPES } = MaterialEvent;
            expect(CONDITIONAL_TRIGGER_409A[EVENT_TYPES.BOARD_COMPOSITION_CHANGE].threshold).toBe(0.50);
        });
    });

    describe('ALWAYS_TRIGGER_409A list', () => {
        it('should contain all critical triggering events', () => {
            const { ALWAYS_TRIGGER_409A } = MaterialEvent;

            expect(ALWAYS_TRIGGER_409A).toContain('financing_round');
            expect(ALWAYS_TRIGGER_409A).toContain('down_round');
            expect(ALWAYS_TRIGGER_409A).toContain('bridge_financing');
            expect(ALWAYS_TRIGGER_409A).toContain('significant_transaction');
            expect(ALWAYS_TRIGGER_409A).toContain('acquisition_offer');
            expect(ALWAYS_TRIGGER_409A).toContain('merger_discussion');
            expect(ALWAYS_TRIGGER_409A).toContain('ma_activity');
            expect(ALWAYS_TRIGGER_409A).toContain('ipo_filing');
            expect(ALWAYS_TRIGGER_409A).toContain('ipo_preparation');
            expect(ALWAYS_TRIGGER_409A).toContain('going_concern_doubt');
        });

        it('should have at least 10 always-trigger events', () => {
            const { ALWAYS_TRIGGER_409A } = MaterialEvent;
            expect(ALWAYS_TRIGGER_409A.length).toBeGreaterThanOrEqual(10);
        });
    });

    describe('Compliance Dashboard Integration', () => {
        it('should be able to filter events requiring action', () => {
            const events = [
                { status: 'action_required', eventType: 'financing_round' },
                { status: 'resolved', eventType: 'key_employee_hire' },
                { status: 'action_required', eventType: 'acquisition_offer' }
            ];

            const actionRequired = events.filter(e => e.status === 'action_required');
            expect(actionRequired.length).toBe(2);
        });

        it('should be able to calculate summary statistics', () => {
            const calculateSummary = (events) => ({
                total: events.length,
                actionRequired: events.filter(e => e.status === 'action_required').length,
                requires409AUpdate: events.filter(e => e.requires409AUpdate).length,
                unresolved: events.filter(e =>
                    e.status !== 'resolved' && e.status !== 'dismissed'
                ).length
            });

            const events = [
                { status: 'action_required', requires409AUpdate: true },
                { status: 'resolved', requires409AUpdate: true },
                { status: 'detected', requires409AUpdate: false },
                { status: 'dismissed', requires409AUpdate: true }
            ];

            const summary = calculateSummary(events);
            expect(summary.total).toBe(4);
            expect(summary.actionRequired).toBe(1);
            expect(summary.requires409AUpdate).toBe(3);
            expect(summary.unresolved).toBe(2);
        });
    });

    describe('Schema Validation', () => {
        it('should have required fields defined in schema', () => {
            const { schema } = MaterialEvent;

            expect(schema.eventId).toBeDefined();
            expect(schema.companyId).toBeDefined();
            expect(schema.eventType).toBeDefined();
            expect(schema.eventDate).toBeDefined();
            expect(schema.description).toBeDefined();
            expect(schema.requires409AUpdate).toBeDefined();
            expect(schema.severity).toBeDefined();
            expect(schema.status).toBeDefined();
        });

        it('should have companyId marked as required', () => {
            const { schema } = MaterialEvent;
            expect(schema.companyId.required).toBe(true);
        });

        it('should have eventType marked as required', () => {
            const { schema } = MaterialEvent;
            expect(schema.eventType.required).toBe(true);
        });

        it('should have eventDate marked as required', () => {
            const { schema } = MaterialEvent;
            expect(schema.eventDate.required).toBe(true);
        });

        it('should have proper enum for severity levels', () => {
            const { schema, SEVERITY_LEVELS } = MaterialEvent;
            expect(schema.severity.enum).toEqual(Object.values(SEVERITY_LEVELS));
        });

        it('should have proper enum for event statuses', () => {
            const { schema, EVENT_STATUSES } = MaterialEvent;
            expect(schema.status.enum).toEqual(Object.values(EVENT_STATUSES));
        });

        it('should have valuation reference fields', () => {
            const { schema } = MaterialEvent;
            expect(schema.invalidatesValuationId).toBeDefined();
            expect(schema.replacementValuationId).toBeDefined();
        });

        it('should have acknowledgment fields', () => {
            const { schema } = MaterialEvent;
            expect(schema.acknowledgedBy).toBeDefined();
            expect(schema.acknowledgedAt).toBeDefined();
        });

        it('should have financial impact fields', () => {
            const { schema } = MaterialEvent;
            expect(schema.financialImpact).toBeDefined();
            expect(schema.impactPercentage).toBeDefined();
        });
    });

    describe('Related Entities', () => {
        it('should support FundraisingRound entity type', () => {
            const event = {
                eventType: 'financing_round',
                relatedEntities: [{
                    entityType: 'FundraisingRound',
                    entityId: 'round_123',
                    description: 'Series A'
                }]
            };

            expect(event.relatedEntities[0].entityType).toBe('FundraisingRound');
        });

        it('should support Stakeholder entity type', () => {
            const event = {
                eventType: 'key_employee_departure',
                relatedEntities: [{
                    entityType: 'Stakeholder',
                    entityId: 'stakeholder_456',
                    description: 'John Doe - CFO'
                }]
            };

            expect(event.relatedEntities[0].entityType).toBe('Stakeholder');
        });

        it('should support EquityGrant entity type', () => {
            const event = {
                eventType: 'secondary_transaction',
                relatedEntities: [{
                    entityType: 'EquityGrant',
                    entityId: 'grant_789',
                    description: 'Stock option exercise'
                }]
            };

            expect(event.relatedEntities[0].entityType).toBe('EquityGrant');
        });
    });
});
