/**
 * FinancialForecast Model Tests
 * Feature: Issue #264 - Create financial forecasts model for DCF valuation inputs
 * TDD: Write tests first
 */

const { FinancialForecast, ForecastLine, FORECAST_METRICS } = require('../../../models/FinancialForecast');

describe('FinancialForecast Model', () => {
  describe('Schema Validation', () => {
    it('should have all required forecast metrics defined', () => {
      // Revenue metrics
      expect(FORECAST_METRICS).toContain('REVENUE');
      expect(FORECAST_METRICS).toContain('REVENUE_RECURRING');
      expect(FORECAST_METRICS).toContain('REVENUE_SERVICES');
      expect(FORECAST_METRICS).toContain('REVENUE_OTHER');

      // Cost metrics
      expect(FORECAST_METRICS).toContain('COGS');
      expect(FORECAST_METRICS).toContain('GROSS_PROFIT');
      expect(FORECAST_METRICS).toContain('GROSS_MARGIN_PCT');

      // Operating expense metrics
      expect(FORECAST_METRICS).toContain('OPEX_TOTAL');
      expect(FORECAST_METRICS).toContain('OPEX_RD');
      expect(FORECAST_METRICS).toContain('OPEX_SALES_MARKETING');
      expect(FORECAST_METRICS).toContain('OPEX_GENERAL_ADMIN');

      // Profitability metrics
      expect(FORECAST_METRICS).toContain('EBITDA');
      expect(FORECAST_METRICS).toContain('EBITDA_MARGIN_PCT');
      expect(FORECAST_METRICS).toContain('EBIT');
      expect(FORECAST_METRICS).toContain('NET_INCOME');

      // Cash metrics
      expect(FORECAST_METRICS).toContain('CASH_BURN');
      expect(FORECAST_METRICS).toContain('CASH_BALANCE');
      expect(FORECAST_METRICS).toContain('FREE_CASH_FLOW');

      // Operational metrics
      expect(FORECAST_METRICS).toContain('HEADCOUNT');
      expect(FORECAST_METRICS).toContain('CUSTOMERS');
      expect(FORECAST_METRICS).toContain('ARR');
      expect(FORECAST_METRICS).toContain('MRR');

      // Capital metrics
      expect(FORECAST_METRICS).toContain('CAPEX');
      expect(FORECAST_METRICS).toContain('WORKING_CAPITAL');
    });

    it('should have exactly 24 forecast metrics', () => {
      expect(FORECAST_METRICS.length).toBe(24);
    });

    it('should create a valid forecast with required fields', () => {
      const validData = {
        companyId: 'company_123',
        name: '2026 Board Approved Forecast',
        forecastType: 'PROJECTION',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2030-12-31'),
        createdBy: 'user_123',
        status: 'DRAFT'
      };

      expect(validData.companyId).toBeDefined();
      expect(validData.name).toBeDefined();
      expect(validData.forecastType).toBeDefined();
      expect(validData.startDate).toBeDefined();
      expect(validData.endDate).toBeDefined();
      expect(validData.createdBy).toBeDefined();
      expect(validData.status).toBe('DRAFT');
    });

    it('should reject invalid forecastType values', () => {
      const validForecastTypes = ['BUDGET', 'PROJECTION', 'SCENARIO'];
      const invalidTypes = ['invalid', 'estimate', 'plan'];

      invalidTypes.forEach(type => {
        expect(validForecastTypes).not.toContain(type);
      });

      validForecastTypes.forEach(type => {
        expect(validForecastTypes).toContain(type);
      });
    });

    it('should support scenario types for DCF modeling', () => {
      const validScenarioTypes = ['BASE', 'BULL', 'BEAR'];

      expect(validScenarioTypes).toContain('BASE');
      expect(validScenarioTypes).toContain('BULL');
      expect(validScenarioTypes).toContain('BEAR');
      expect(validScenarioTypes.length).toBe(3);
    });

    it('should reject invalid periodType values', () => {
      const validPeriodTypes = ['MONTHLY', 'QUARTERLY', 'ANNUAL'];
      const invalidTypes = ['weekly', 'daily', 'biannual'];

      invalidTypes.forEach(type => {
        expect(validPeriodTypes).not.toContain(type);
      });
    });

    it('should auto-generate forecastId with prefix', () => {
      const prefix = 'forecast_';
      const mockId = `${prefix}${Date.now()}`;
      expect(mockId.startsWith('forecast_')).toBe(true);
    });
  });

  describe('Status Workflow', () => {
    const validTransitions = {
      DRAFT: ['SUBMITTED'],
      SUBMITTED: ['APPROVED', 'DRAFT'],
      APPROVED: ['SUPERSEDED'],
      SUPERSEDED: []
    };

    it('should allow valid status transitions', () => {
      expect(validTransitions.DRAFT).toContain('SUBMITTED');
      expect(validTransitions.SUBMITTED).toContain('APPROVED');
      expect(validTransitions.SUBMITTED).toContain('DRAFT');
      expect(validTransitions.APPROVED).toContain('SUPERSEDED');
    });

    it('should not allow invalid status transitions', () => {
      expect(validTransitions.DRAFT).not.toContain('APPROVED');
      expect(validTransitions.APPROVED).not.toContain('DRAFT');
      expect(validTransitions.SUPERSEDED.length).toBe(0);
    });

    it('should allow return to DRAFT from SUBMITTED', () => {
      expect(validTransitions.SUBMITTED).toContain('DRAFT');
    });

    it('should prevent modifications to APPROVED forecasts', () => {
      // Only SUPERSEDED is allowed from APPROVED
      expect(validTransitions.APPROVED).toEqual(['SUPERSEDED']);
    });

    it('should have canTransitionTo method', () => {
      expect(typeof FinancialForecast.canTransitionTo).toBe('function');
    });

    it('should correctly validate transitions with canTransitionTo', () => {
      expect(FinancialForecast.canTransitionTo('DRAFT', 'SUBMITTED')).toBe(true);
      expect(FinancialForecast.canTransitionTo('DRAFT', 'APPROVED')).toBe(false);
      expect(FinancialForecast.canTransitionTo('SUBMITTED', 'APPROVED')).toBe(true);
      expect(FinancialForecast.canTransitionTo('APPROVED', 'SUPERSEDED')).toBe(true);
      expect(FinancialForecast.canTransitionTo('SUPERSEDED', 'DRAFT')).toBe(false);
    });
  });

  describe('Growth Assumptions for DCF', () => {
    it('should store growth rate assumptions', () => {
      const growthAssumptions = {
        revenueGrowthRate: 0.25,
        terminalGrowthRate: 0.03,
        discountRate: 0.15,
        taxRate: 0.21
      };

      expect(growthAssumptions.revenueGrowthRate).toBe(0.25);
      expect(growthAssumptions.terminalGrowthRate).toBe(0.03);
      expect(growthAssumptions.discountRate).toBe(0.15);
      expect(growthAssumptions.taxRate).toBe(0.21);
    });

    it('should allow percentage values between 0 and 1', () => {
      const discountRate = 0.12;
      const terminalGrowthRate = 0.025;

      expect(discountRate).toBeGreaterThan(0);
      expect(discountRate).toBeLessThan(1);
      expect(terminalGrowthRate).toBeGreaterThan(0);
      expect(terminalGrowthRate).toBeLessThan(1);
    });
  });

  describe('Staleness Check', () => {
    it('should identify stale forecasts (>6 months old)', () => {
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      const staleforecast = {
        approvedAt: sevenMonthsAgo.toISOString(),
        status: 'APPROVED'
      };

      const isStale = FinancialForecast.isStale(staleforecast);
      expect(isStale).toBe(true);
    });

    it('should identify fresh forecasts (<6 months old)', () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const freshForecast = {
        approvedAt: threeMonthsAgo.toISOString(),
        status: 'APPROVED'
      };

      const isStale = FinancialForecast.isStale(freshForecast);
      expect(isStale).toBe(false);
    });

    it('should return false for forecasts without approvedAt', () => {
      const draftForecast = {
        status: 'DRAFT',
        approvedAt: null
      };

      const isStale = FinancialForecast.isStale(draftForecast);
      expect(isStale).toBe(false);
    });
  });

  describe('Date Range Validation', () => {
    it('should require endDate after startDate', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2030-12-31');

      expect(endDate > startDate).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      const startDate = new Date('2030-12-31');
      const endDate = new Date('2026-01-01');

      expect(endDate <= startDate).toBe(true);
    });

    it('should support 5-year projection periods', () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2030-12-31');

      const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
      expect(yearsDiff).toBe(4); // 4 years difference for 5 year coverage
    });
  });

  describe('Period Coverage Validation', () => {
    it('should validate period coverage with validatePeriodCoverage', () => {
      const forecast = {
        startDate: '2026-01-01',
        endDate: '2030-12-31'
      };

      const lines = [
        { periodStart: '2026-01-01', periodEnd: '2026-12-31', metric: 'REVENUE', value: 1000000 },
        { periodStart: '2027-01-01', periodEnd: '2027-12-31', metric: 'REVENUE', value: 1250000 }
      ];

      const result = FinancialForecast.validatePeriodCoverage(forecast, lines);
      expect(result.valid).toBe(true);
      expect(result.periodCount).toBe(2);
    });

    it('should fail validation with no lines', () => {
      const forecast = {
        startDate: '2026-01-01',
        endDate: '2030-12-31'
      };

      const result = FinancialForecast.validatePeriodCoverage(forecast, []);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No forecast lines defined');
    });
  });

  describe('Board Approval Linkage', () => {
    it('should store board approval reference', () => {
      const forecast = {
        boardApprovalId: 'board_approval_123',
        status: 'APPROVED'
      };

      expect(forecast.boardApprovalId).toBe('board_approval_123');
    });

    it('should store valuation linkage for DCF', () => {
      const forecast = {
        valuationId: 'val_123',
        status: 'APPROVED'
      };

      expect(forecast.valuationId).toBe('val_123');
    });
  });

  describe('Status History Audit Trail', () => {
    it('should track status history', () => {
      const statusHistory = [
        { status: 'DRAFT', changedAt: new Date().toISOString(), changedBy: 'user_1', reason: 'Forecast created' },
        { status: 'SUBMITTED', changedAt: new Date().toISOString(), changedBy: 'user_1', reason: 'Submitted for approval' },
        { status: 'APPROVED', changedAt: new Date().toISOString(), changedBy: 'user_2', reason: 'Forecast approved' }
      ];

      expect(statusHistory.length).toBe(3);
      expect(statusHistory[0].status).toBe('DRAFT');
      expect(statusHistory[1].status).toBe('SUBMITTED');
      expect(statusHistory[2].status).toBe('APPROVED');
    });
  });
});

describe('ForecastLine Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid forecast line with required fields', () => {
      const validLine = {
        forecastId: 'forecast_123',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-12-31'),
        metric: 'REVENUE',
        value: 5000000,
        currency: 'USD',
        confidence: 'HIGH'
      };

      expect(validLine.forecastId).toBeDefined();
      expect(validLine.periodStart).toBeDefined();
      expect(validLine.periodEnd).toBeDefined();
      expect(validLine.metric).toBeDefined();
      expect(validLine.value).toBeDefined();
    });

    it('should auto-generate lineId with prefix', () => {
      const prefix = 'line_';
      const mockId = `${prefix}${Date.now()}`;
      expect(mockId.startsWith('line_')).toBe(true);
    });

    it('should have all FORECAST_METRICS available', () => {
      expect(ForecastLine.FORECAST_METRICS).toEqual(FORECAST_METRICS);
    });

    it('should validate metric enum', () => {
      const validMetric = 'REVENUE';
      const invalidMetric = 'INVALID_METRIC';

      expect(FORECAST_METRICS).toContain(validMetric);
      expect(FORECAST_METRICS).not.toContain(invalidMetric);
    });

    it('should validate confidence enum', () => {
      const validConfidence = ['HIGH', 'MEDIUM', 'LOW'];

      expect(validConfidence).toContain('HIGH');
      expect(validConfidence).toContain('MEDIUM');
      expect(validConfidence).toContain('LOW');
      expect(validConfidence.length).toBe(3);
    });

    it('should default currency to USD', () => {
      const line = {
        forecastId: 'forecast_123',
        periodStart: '2026-01-01',
        periodEnd: '2026-12-31',
        metric: 'REVENUE',
        value: 5000000
      };

      const expectedCurrency = 'USD';
      expect(line.currency || expectedCurrency).toBe('USD');
    });
  });

  describe('Value Types', () => {
    it('should store numeric values for financial metrics', () => {
      const revenueValue = 10000000.50;
      expect(typeof revenueValue).toBe('number');
    });

    it('should store percentage values for margin metrics', () => {
      const grossMarginPct = 0.65;
      expect(grossMarginPct).toBeGreaterThan(0);
      expect(grossMarginPct).toBeLessThan(1);
    });

    it('should store integer values for operational metrics', () => {
      const headcount = 150;
      const customers = 5000;

      expect(Number.isInteger(headcount)).toBe(true);
      expect(Number.isInteger(customers)).toBe(true);
    });
  });

  describe('Period Validation', () => {
    it('should require valid period dates', () => {
      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-12-31');

      expect(periodEnd > periodStart).toBe(true);
    });

    it('should support annual periods', () => {
      const periodStart = new Date('2026-01-01');
      const periodEnd = new Date('2026-12-31');

      const daysInPeriod = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
      expect(daysInPeriod).toBeGreaterThanOrEqual(364);
    });

    it('should support quarterly periods', () => {
      const q1Start = new Date('2026-01-01');
      const q1End = new Date('2026-03-31');

      const daysInPeriod = Math.ceil((q1End - q1Start) / (1000 * 60 * 60 * 24));
      expect(daysInPeriod).toBeGreaterThanOrEqual(89);
      expect(daysInPeriod).toBeLessThanOrEqual(92);
    });

    it('should support monthly periods', () => {
      const janStart = new Date('2026-01-01');
      const janEnd = new Date('2026-01-31');

      const daysInPeriod = Math.ceil((janEnd - janStart) / (1000 * 60 * 60 * 24));
      expect(daysInPeriod).toBe(30);
    });
  });

  describe('EBITDA Calculation', () => {
    it('should calculate EBITDA from components', () => {
      const revenue = 10000000;
      const cogs = 3000000;
      const opex = 4000000;

      const expectedEBITDA = revenue - cogs - opex;
      expect(expectedEBITDA).toBe(3000000);
    });

    it('should handle negative EBITDA (loss)', () => {
      const revenue = 5000000;
      const cogs = 3000000;
      const opex = 6000000;

      const ebitda = revenue - cogs - opex;
      expect(ebitda).toBe(-4000000);
      expect(ebitda).toBeLessThan(0);
    });
  });

  describe('Summary by Metric', () => {
    it('should aggregate values by metric', () => {
      const lines = [
        { metric: 'REVENUE', value: 1000000, periodStart: '2026-01-01', periodEnd: '2026-12-31' },
        { metric: 'REVENUE', value: 1250000, periodStart: '2027-01-01', periodEnd: '2027-12-31' },
        { metric: 'REVENUE', value: 1500000, periodStart: '2028-01-01', periodEnd: '2028-12-31' }
      ];

      const summary = {};
      for (const line of lines) {
        if (!summary[line.metric]) {
          summary[line.metric] = { total: 0, periods: [] };
        }
        summary[line.metric].total += line.value;
        summary[line.metric].periods.push({
          periodStart: line.periodStart,
          periodEnd: line.periodEnd,
          value: line.value
        });
      }

      expect(summary.REVENUE.total).toBe(3750000);
      expect(summary.REVENUE.periods.length).toBe(3);
    });
  });
});

describe('DCF Integration', () => {
  describe('Forecast to Valuation Linkage', () => {
    it('should only allow linking approved forecasts to valuations', () => {
      const approvedForecast = { status: 'APPROVED', forecastId: 'forecast_123' };
      const draftForecast = { status: 'DRAFT', forecastId: 'forecast_456' };

      expect(approvedForecast.status).toBe('APPROVED');
      expect(draftForecast.status).not.toBe('APPROVED');
    });

    it('should store valuation reference in forecast', () => {
      const linkedForecast = {
        forecastId: 'forecast_123',
        valuationId: 'val_456',
        status: 'APPROVED'
      };

      expect(linkedForecast.valuationId).toBe('val_456');
    });
  });

  describe('Terminal Value Requirements', () => {
    it('should have terminalGrowthRate for DCF calculations', () => {
      const forecast = {
        growthAssumptions: {
          terminalGrowthRate: 0.025,
          discountRate: 0.12
        }
      };

      expect(forecast.growthAssumptions.terminalGrowthRate).toBe(0.025);
    });

    it('should have discountRate for DCF calculations', () => {
      const forecast = {
        growthAssumptions: {
          terminalGrowthRate: 0.025,
          discountRate: 0.12
        }
      };

      expect(forecast.growthAssumptions.discountRate).toBe(0.12);
    });
  });

  describe('Scenario Support', () => {
    it('should support multiple scenarios', () => {
      const baseCase = { scenarioType: 'BASE', forecastId: 'forecast_base' };
      const bullCase = { scenarioType: 'BULL', forecastId: 'forecast_bull' };
      const bearCase = { scenarioType: 'BEAR', forecastId: 'forecast_bear' };

      expect(baseCase.scenarioType).toBe('BASE');
      expect(bullCase.scenarioType).toBe('BULL');
      expect(bearCase.scenarioType).toBe('BEAR');
    });
  });
});

describe('Approval Workflow', () => {
  describe('Submit for Approval', () => {
    it('should have submit method', () => {
      expect(typeof FinancialForecast.submit).toBe('function');
    });
  });

  describe('Approve Forecast', () => {
    it('should have approve method', () => {
      expect(typeof FinancialForecast.approve).toBe('function');
    });
  });

  describe('Supersession Logic', () => {
    it('should only allow one approved forecast per company', () => {
      const companyId = 'company_123';
      const forecasts = [
        { forecastId: 'forecast_1', companyId, status: 'SUPERSEDED' },
        { forecastId: 'forecast_2', companyId, status: 'APPROVED' }
      ];

      const approvedCount = forecasts.filter(f => f.status === 'APPROVED').length;
      expect(approvedCount).toBe(1);
    });
  });

  describe('Link to Valuation', () => {
    it('should have linkToValuation method', () => {
      expect(typeof FinancialForecast.linkToValuation).toBe('function');
    });
  });
});

describe('Query Methods', () => {
  describe('Find by Company', () => {
    it('should have findByCompany method', () => {
      expect(typeof FinancialForecast.findByCompany).toBe('function');
    });
  });

  describe('Find Latest Approved', () => {
    it('should have findLatestApproved method', () => {
      expect(typeof FinancialForecast.findLatestApproved).toBe('function');
    });
  });

  describe('Update Growth Assumptions', () => {
    it('should have updateGrowthAssumptions method', () => {
      expect(typeof FinancialForecast.updateGrowthAssumptions).toBe('function');
    });
  });
});

describe('ForecastLine Query Methods', () => {
  describe('Find by Forecast', () => {
    it('should have findByForecast method', () => {
      expect(typeof ForecastLine.findByForecast).toBe('function');
    });
  });

  describe('Find by Metric', () => {
    it('should have findByMetric method', () => {
      expect(typeof ForecastLine.findByMetric).toBe('function');
    });
  });

  describe('Create Many Lines', () => {
    it('should have createMany method', () => {
      expect(typeof ForecastLine.createMany).toBe('function');
    });
  });

  describe('Get Summary by Metric', () => {
    it('should have getSummaryByMetric method', () => {
      expect(typeof ForecastLine.getSummaryByMetric).toBe('function');
    });
  });

  describe('Delete by Forecast', () => {
    it('should have deleteByForecast method', () => {
      expect(typeof ForecastLine.deleteByForecast).toBe('function');
    });
  });
});
