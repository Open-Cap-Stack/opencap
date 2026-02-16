/**
 * Tax Withholding Service Tests
 * Feature: Issue #72 - Tax Withholding Calculator
 */
const TaxWithholdingService = require('../../../services/taxWithholdingService');

describe('TaxWithholdingService', () => {
  const baseEmployeeProfile = {
    filingStatus: 'single',
    federalAllowances: 0,
    stateCode: 'CA',
    stateAllowances: 0,
    additionalWithholding: 0,
    isSubjectToAMT: false
  };

  describe('calculateNSOExerciseWithholding', () => {
    it('should calculate withholding for NSO exercise', () => {
      const params = {
        exercisePrice: 1.00,
        fmvAtExercise: 10.00,
        sharesExercised: 10000,
        employeeProfile: baseEmployeeProfile,
        ytdWages: 0,
        ytdSocialSecurity: 0
      };

      const result = TaxWithholdingService.calculateNSOExerciseWithholding(params);

      // Spread = ($10 - $1) * 10000 = $90,000 ordinary income
      expect(result.income.ordinaryIncome).toBe(90000);
      expect(result.income.grossAmount).toBe(90000);

      // Federal: 22% of $90,000 = $19,800
      expect(result.summary.federalWithholding).toBe(19800);

      // State (CA): 10.23% of $90,000 = $9,207
      expect(result.summary.stateWithholding).toBeCloseTo(9207, 0);

      // Social Security: 6.2% of $90,000 = $5,580
      expect(result.summary.socialSecurityWithholding).toBe(5580);

      // Medicare: 1.45% of $90,000 = $1,305
      expect(result.summary.medicareWithholding).toBe(1305);

      expect(result.summary.totalWithholding).toBeGreaterThan(0);
      expect(result.summary.netAmount).toBe(
        result.income.grossAmount - result.summary.totalWithholding
      );
    });

    it('should cap social security at wage base', () => {
      const params = {
        exercisePrice: 1.00,
        fmvAtExercise: 20.00,
        sharesExercised: 10000,
        employeeProfile: baseEmployeeProfile,
        ytdWages: 160000, // Close to $168,600 wage base
        ytdSocialSecurity: 160000
      };

      const result = TaxWithholdingService.calculateNSOExerciseWithholding(params);

      // Only $8,600 of the $190,000 income should be subject to SS
      // SS = 6.2% * $8,600 = $533.20
      expect(result.summary.socialSecurityWithholding).toBeLessThan(
        190000 * 0.062
      );
    });

    it('should apply additional Medicare tax over threshold', () => {
      const params = {
        exercisePrice: 1.00,
        fmvAtExercise: 30.00,
        sharesExercised: 10000,
        employeeProfile: baseEmployeeProfile,
        ytdWages: 180000 // $200,000 threshold for single
      };

      const result = TaxWithholdingService.calculateNSOExerciseWithholding(params);

      // Total wages = $180,000 + $290,000 = $470,000
      // Additional Medicare on amount over $200,000 = $270,000 * 0.9%
      expect(result.summary.additionalMedicare).toBeGreaterThan(0);
    });
  });

  describe('calculateISOExerciseWithholding', () => {
    it('should not withhold regular taxes on ISO exercise', () => {
      const params = {
        exercisePrice: 1.00,
        fmvAtExercise: 10.00,
        sharesExercised: 10000,
        employeeProfile: baseEmployeeProfile
      };

      const result = TaxWithholdingService.calculateISOExerciseWithholding(params);

      expect(result.income.ordinaryIncome).toBe(0);
      expect(result.income.amtIncome).toBe(90000);
      expect(result.summary.federalWithholding).toBe(0);
      expect(result.summary.stateWithholding).toBe(0);
      expect(result.summary.socialSecurityWithholding).toBe(0);
      expect(result.summary.medicareWithholding).toBe(0);
    });

    it('should calculate AMT withholding if subject to AMT', () => {
      const params = {
        exercisePrice: 1.00,
        fmvAtExercise: 10.00,
        sharesExercised: 10000,
        employeeProfile: {
          ...baseEmployeeProfile,
          isSubjectToAMT: true
        }
      };

      const result = TaxWithholdingService.calculateISOExerciseWithholding(params);

      // AMT = 26% of $90,000 = $23,400
      expect(result.summary.totalWithholding).toBe(23400);
      expect(result.withholdings).toHaveLength(1);
      expect(result.withholdings[0].type).toBe('amt');
    });
  });

  describe('calculateRSUVestWithholding', () => {
    it('should calculate withholding for RSU vest', () => {
      const params = {
        fmvAtVest: 50.00,
        sharesVested: 1000,
        employeeProfile: baseEmployeeProfile,
        ytdWages: 100000,
        ytdSocialSecurity: 100000
      };

      const result = TaxWithholdingService.calculateRSUVestWithholding(params);

      // Full FMV = $50 * 1000 = $50,000 is ordinary income
      expect(result.income.ordinaryIncome).toBe(50000);
      expect(result.summary.federalWithholding).toBe(11000); // 22%
    });
  });

  describe('calculateWithholding', () => {
    it('should handle no-income-tax states', () => {
      const params = {
        grossAmount: 100000,
        ordinaryIncome: 100000,
        eventType: 'nso_exercise',
        employeeProfile: {
          ...baseEmployeeProfile,
          stateCode: 'TX' // No state income tax
        }
      };

      const result = TaxWithholdingService.calculateWithholding(params);

      expect(result.summary.stateWithholding).toBe(0);
    });

    it('should include additional voluntary withholding', () => {
      const params = {
        grossAmount: 100000,
        ordinaryIncome: 100000,
        eventType: 'nso_exercise',
        employeeProfile: {
          ...baseEmployeeProfile,
          additionalWithholding: 5000
        }
      };

      const result = TaxWithholdingService.calculateWithholding(params);

      expect(result.summary.federalWithholding).toBe(22000 + 5000);
    });

    it('should handle various filing statuses', () => {
      const statuses = [
        'single',
        'married_filing_jointly',
        'married_filing_separately',
        'head_of_household'
      ];

      for (const status of statuses) {
        const params = {
          grossAmount: 100000,
          ordinaryIncome: 100000,
          eventType: 'nso_exercise',
          employeeProfile: {
            ...baseEmployeeProfile,
            filingStatus: status
          },
          ytdWages: 0
        };

        const result = TaxWithholdingService.calculateWithholding(params);
        expect(result.summary.totalWithholding).toBeGreaterThan(0);
      }
    });
  });

  describe('T0-8: $1M supplemental wage rate tiers', () => {
    it('should apply 22% rate for income entirely under $1M', () => {
      const result = TaxWithholdingService.calculateWithholding({
        grossAmount: 500000,
        ordinaryIncome: 500000,
        eventType: 'nso_exercise',
        employeeProfile: baseEmployeeProfile,
        ytdWages: 0,
        ytdSocialSecurity: 0
      });

      const federalWithholdings = result.withholdings.filter(w => w.type === 'federal' && w.rate > 0);
      expect(federalWithholdings).toHaveLength(1);
      expect(federalWithholdings[0].rate).toBe(0.22);
    });

    it('should apply 37% rate for income when ytdWages already over $1M', () => {
      const result = TaxWithholdingService.calculateWithholding({
        grossAmount: 500000,
        ordinaryIncome: 500000,
        eventType: 'nso_exercise',
        employeeProfile: baseEmployeeProfile,
        ytdWages: 1500000,
        ytdSocialSecurity: 0
      });

      const federalWithholdings = result.withholdings.filter(w => w.type === 'federal' && w.rate > 0);
      expect(federalWithholdings).toHaveLength(1);
      expect(federalWithholdings[0].rate).toBe(0.37);
      expect(federalWithholdings[0].withholdingAmount).toBeCloseTo(185000, 0);
    });

    it('should split 22%/37% when income crosses $1M threshold', () => {
      const result = TaxWithholdingService.calculateWithholding({
        grossAmount: 600000,
        ordinaryIncome: 600000,
        eventType: 'nso_exercise',
        employeeProfile: baseEmployeeProfile,
        ytdWages: 800000,
        ytdSocialSecurity: 0
      });

      const federalWithholdings = result.withholdings.filter(w => w.type === 'federal' && w.rate > 0);
      expect(federalWithholdings).toHaveLength(2);

      // First $200K at 22%
      const at22 = federalWithholdings.find(w => w.rate === 0.22);
      expect(at22.baseAmount).toBeCloseTo(200000, 0);
      expect(at22.withholdingAmount).toBeCloseTo(44000, 0);

      // Remaining $400K at 37%
      const at37 = federalWithholdings.find(w => w.rate === 0.37);
      expect(at37.baseAmount).toBeCloseTo(400000, 0);
      expect(at37.withholdingAmount).toBeCloseTo(148000, 0);
    });
  });

  describe('calculateSharesToWithhold', () => {
    it('should calculate shares needed for sell-to-cover', () => {
      const totalWithholding = 10000;
      const sharePrice = 50;

      const sharesToWithhold = TaxWithholdingService.calculateSharesToWithhold(
        totalWithholding,
        sharePrice
      );

      // Base shares = 10000 / 50 = 200
      // With 2% buffer = 204 (rounded up)
      expect(sharesToWithhold).toBe(204);
    });

    it('should round up to ensure coverage', () => {
      const totalWithholding = 10001;
      const sharePrice = 50;

      const sharesToWithhold = TaxWithholdingService.calculateSharesToWithhold(
        totalWithholding,
        sharePrice
      );

      // Should round up, not down
      expect(sharesToWithhold * sharePrice).toBeGreaterThanOrEqual(totalWithholding);
    });
  });

  describe('getWithholdingEstimate', () => {
    it('should route to correct calculation method based on event type', () => {
      const nsoParams = {
        eventType: 'nso_exercise',
        exercisePrice: 1,
        fmvAtExercise: 10,
        sharesExercised: 1000,
        employeeProfile: baseEmployeeProfile
      };

      const isoParams = {
        eventType: 'iso_exercise',
        exercisePrice: 1,
        fmvAtExercise: 10,
        sharesExercised: 1000,
        employeeProfile: baseEmployeeProfile
      };

      const rsuParams = {
        eventType: 'rsu_vest',
        fmvAtVest: 10,
        sharesVested: 1000,
        employeeProfile: baseEmployeeProfile
      };

      const nsoResult = TaxWithholdingService.getWithholdingEstimate(nsoParams);
      const isoResult = TaxWithholdingService.getWithholdingEstimate(isoParams);
      const rsuResult = TaxWithholdingService.getWithholdingEstimate(rsuParams);

      // NSO should have ordinary income
      expect(nsoResult.income.ordinaryIncome).toBe(9000);

      // ISO should have AMT income but no ordinary
      expect(isoResult.income.ordinaryIncome).toBe(0);
      expect(isoResult.income.amtIncome).toBe(9000);

      // RSU should have ordinary income at full FMV
      expect(rsuResult.income.ordinaryIncome).toBe(10000);
    });

    it('should handle unknown event types with default calculation', () => {
      const customParams = {
        eventType: 'bonus_payment',
        grossAmount: 50000,
        ordinaryIncome: 50000,
        employeeProfile: baseEmployeeProfile
      };

      const result = TaxWithholdingService.getWithholdingEstimate(customParams);

      // Should use default calculateWithholding method
      expect(result.income.ordinaryIncome).toBe(50000);
      expect(result.summary.federalWithholding).toBeGreaterThan(0);
    });
  });
});
