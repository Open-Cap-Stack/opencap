/**
 * Black-Scholes Service Tests
 * Issue #268: OPM/Black-Scholes calculator for pre-409A estimates
 * Issue #73: ASC 718 Reporting
 */
const {
  normalCDF,
  calculateCallPrice,
  calculatePutPrice,
  BlackScholesService
} = require('../../../services/blackScholesService');

describe('Standalone Black-Scholes Functions (Issue #268)', () => {
  describe('normalCDF', () => {
    it('should return 0.5 for x=0', () => {
      const result = normalCDF(0);
      expect(result).toBeCloseTo(0.5, 4);
    });

    it('should return approximately 0.8413 for x=1', () => {
      const result = normalCDF(1);
      expect(result).toBeCloseTo(0.8413, 3);
    });

    it('should return approximately 0.1587 for x=-1', () => {
      const result = normalCDF(-1);
      expect(result).toBeCloseTo(0.1587, 3);
    });

    it('should return approximately 0.9772 for x=2', () => {
      const result = normalCDF(2);
      expect(result).toBeCloseTo(0.9772, 3);
    });

    it('should be symmetric around 0.5', () => {
      const x = 1.5;
      expect(normalCDF(x) + normalCDF(-x)).toBeCloseTo(1.0, 4);
    });
  });

  describe('calculateCallPrice (standalone)', () => {
    it('should calculate call option price correctly', () => {
      const price = calculateCallPrice(100, 100, 1, 0.05, 0.20);
      // At-the-money option with these params should be around $10.45
      expect(price).toBeGreaterThan(8);
      expect(price).toBeLessThan(13);
    });

    it('should throw error for negative stock price', () => {
      expect(() => calculateCallPrice(-100, 100, 1, 0.05, 0.20)).toThrow(
        'Invalid inputs: all values must be positive'
      );
    });

    it('should throw error for zero strike price', () => {
      expect(() => calculateCallPrice(100, 0, 1, 0.05, 0.20)).toThrow(
        'Invalid inputs: all values must be positive'
      );
    });

    it('should throw error for zero time to expiry', () => {
      expect(() => calculateCallPrice(100, 100, 0, 0.05, 0.20)).toThrow(
        'Invalid inputs: all values must be positive'
      );
    });

    it('should throw error for negative volatility', () => {
      expect(() => calculateCallPrice(100, 100, 1, 0.05, -0.20)).toThrow(
        'Invalid inputs: all values must be positive'
      );
    });

    it('should increase price with higher volatility', () => {
      const lowVolPrice = calculateCallPrice(100, 100, 1, 0.05, 0.10);
      const highVolPrice = calculateCallPrice(100, 100, 1, 0.05, 0.40);
      expect(highVolPrice).toBeGreaterThan(lowVolPrice);
    });

    it('should be worth more when in-the-money', () => {
      const atmPrice = calculateCallPrice(100, 100, 1, 0.05, 0.20);
      const itmPrice = calculateCallPrice(120, 100, 1, 0.05, 0.20);
      expect(itmPrice).toBeGreaterThan(atmPrice);
    });
  });

  describe('calculatePutPrice (standalone)', () => {
    it('should calculate put option price correctly', () => {
      const price = calculatePutPrice(100, 100, 1, 0.05, 0.20);
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(15);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculatePutPrice(-100, 100, 1, 0.05, 0.20)).toThrow(
        'Invalid inputs: all values must be positive'
      );
    });

    it('should satisfy put-call parity', () => {
      const S = 100;
      const K = 100;
      const T = 1;
      const r = 0.05;
      const sigma = 0.20;

      const callPrice = calculateCallPrice(S, K, T, r, sigma);
      const putPrice = calculatePutPrice(S, K, T, r, sigma);
      const pvStrike = K * Math.exp(-r * T);

      // Put-call parity: C - P = S - PV(K)
      const parity = callPrice - putPrice;
      const expected = S - pvStrike;

      expect(parity).toBeCloseTo(expected, 2);
    });

    it('should be worth more when out-of-the-money for underlying', () => {
      const atmPrice = calculatePutPrice(100, 100, 1, 0.05, 0.20);
      const itmPrice = calculatePutPrice(80, 100, 1, 0.05, 0.20);
      expect(itmPrice).toBeGreaterThan(atmPrice);
    });
  });
});

describe('BlackScholesService', () => {
  describe('normalCDF', () => {
    it('should return 0.5 for x=0', () => {
      const result = BlackScholesService.normalCDF(0);
      expect(result).toBeCloseTo(0.5, 4);
    });

    it('should return approximately 0.8413 for x=1', () => {
      const result = BlackScholesService.normalCDF(1);
      expect(result).toBeCloseTo(0.8413, 3);
    });

    it('should return approximately 0.1587 for x=-1', () => {
      const result = BlackScholesService.normalCDF(-1);
      expect(result).toBeCloseTo(0.1587, 3);
    });
  });

  describe('calculateCallPrice', () => {
    it('should calculate call option price correctly', () => {
      const params = {
        stockPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1, // 1 year
        riskFreeRate: 0.05,
        volatility: 0.20,
        dividendYield: 0
      };

      const price = BlackScholesService.calculateCallPrice(params);

      // At-the-money option with these params should be around $10.45
      expect(price).toBeGreaterThan(8);
      expect(price).toBeLessThan(13);
    });

    it('should return intrinsic value when time is zero', () => {
      const params = {
        stockPrice: 110,
        strikePrice: 100,
        timeToExpiry: 0,
        riskFreeRate: 0.05,
        volatility: 0.20
      };

      const price = BlackScholesService.calculateCallPrice(params);
      expect(price).toBe(10); // Intrinsic value = 110 - 100
    });

    it('should return zero for deep out-of-money at expiry', () => {
      const params = {
        stockPrice: 90,
        strikePrice: 100,
        timeToExpiry: 0,
        riskFreeRate: 0.05,
        volatility: 0.20
      };

      const price = BlackScholesService.calculateCallPrice(params);
      expect(price).toBe(0);
    });

    it('should handle zero volatility', () => {
      const params = {
        stockPrice: 100,
        strikePrice: 95,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0
      };

      const price = BlackScholesService.calculateCallPrice(params);
      // Should return present value of intrinsic value
      expect(price).toBeGreaterThan(0);
    });

    it('should increase price with higher volatility', () => {
      const baseParams = {
        stockPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1,
        riskFreeRate: 0.05
      };

      const lowVolPrice = BlackScholesService.calculateCallPrice({
        ...baseParams,
        volatility: 0.10
      });

      const highVolPrice = BlackScholesService.calculateCallPrice({
        ...baseParams,
        volatility: 0.40
      });

      expect(highVolPrice).toBeGreaterThan(lowVolPrice);
    });

    it('should decrease price with higher dividend yield', () => {
      const baseParams = {
        stockPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0.20
      };

      const noDivPrice = BlackScholesService.calculateCallPrice({
        ...baseParams,
        dividendYield: 0
      });

      const withDivPrice = BlackScholesService.calculateCallPrice({
        ...baseParams,
        dividendYield: 0.03
      });

      expect(withDivPrice).toBeLessThan(noDivPrice);
    });
  });

  describe('calculatePutPrice', () => {
    it('should calculate put option price correctly', () => {
      const params = {
        stockPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0.20,
        dividendYield: 0
      };

      const price = BlackScholesService.calculatePutPrice(params);

      // Put-call parity check
      const callPrice = BlackScholesService.calculateCallPrice(params);
      const pvStrike = params.strikePrice * Math.exp(-params.riskFreeRate * params.timeToExpiry);

      // Call - Put = S - PV(K) (put-call parity)
      const parity = callPrice - price;
      const expected = params.stockPrice - pvStrike;

      expect(parity).toBeCloseTo(expected, 2);
    });

    it('should return intrinsic value at expiry', () => {
      const params = {
        stockPrice: 90,
        strikePrice: 100,
        timeToExpiry: 0,
        riskFreeRate: 0.05,
        volatility: 0.20
      };

      const price = BlackScholesService.calculatePutPrice(params);
      expect(price).toBe(10); // Intrinsic value = 100 - 90
    });
  });

  describe('calculateASC718FairValue', () => {
    it('should calculate fair value using expected term', () => {
      const params = {
        stockPrice: 10.00,
        exercisePrice: 10.00,
        expectedTermYears: 6.25, // SAB simplified method result
        volatility: 0.50,
        riskFreeRate: 0.03,
        dividendYield: 0
      };

      const fairValue = BlackScholesService.calculateASC718FairValue(params);

      // Should be reasonable for at-the-money option
      expect(fairValue).toBeGreaterThan(3);
      expect(fairValue).toBeLessThan(8);
    });
  });

  describe('calculateExpectedTermSimplified', () => {
    it('should calculate expected term using SAB 107/110 method', () => {
      const vestingPeriod = 4; // 4 years
      const contractualTerm = 10; // 10 years

      const expectedTerm = BlackScholesService.calculateExpectedTermSimplified(
        vestingPeriod,
        contractualTerm
      );

      expect(expectedTerm).toBe(7); // (4 + 10) / 2
    });
  });

  describe('estimateVolatilityFromComparables', () => {
    it('should calculate equally weighted average', () => {
      const volatilities = [0.30, 0.40, 0.50];

      const estimated = BlackScholesService.estimateVolatilityFromComparables(volatilities);

      expect(estimated).toBeCloseTo(0.40, 4);
    });

    it('should calculate weighted average when weights provided', () => {
      const volatilities = [0.30, 0.40, 0.50];
      const weights = [1, 2, 1]; // More weight on middle company

      const estimated = BlackScholesService.estimateVolatilityFromComparables(volatilities, weights);

      // (0.30*1 + 0.40*2 + 0.50*1) / 4 = 0.40
      expect(estimated).toBeCloseTo(0.40, 4);
    });
  });

  describe('calculateGreeks', () => {
    it('should calculate all Greeks', () => {
      const params = {
        stockPrice: 100,
        strikePrice: 100,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0.20,
        dividendYield: 0
      };

      const greeks = BlackScholesService.calculateGreeks(params);

      expect(greeks).toHaveProperty('delta');
      expect(greeks).toHaveProperty('gamma');
      expect(greeks).toHaveProperty('theta');
      expect(greeks).toHaveProperty('vega');
      expect(greeks).toHaveProperty('rho');

      // Delta should be around 0.5 for ATM option
      expect(greeks.delta).toBeGreaterThan(0.4);
      expect(greeks.delta).toBeLessThan(0.7);

      // Gamma should be positive
      expect(greeks.gamma).toBeGreaterThan(0);

      // Theta should be negative (time decay)
      expect(greeks.theta).toBeLessThan(0);

      // Vega should be positive
      expect(greeks.vega).toBeGreaterThan(0);
    });
  });

  describe('calculateBatchFairValues', () => {
    it('should calculate fair values for multiple grants', () => {
      const grants = [
        { grantId: 'grant1', sharesGranted: 10000, exercisePrice: 10.00 },
        { grantId: 'grant2', sharesGranted: 5000, exercisePrice: 8.00 },
        { grantId: 'grant3', sharesGranted: 15000, exercisePrice: 12.00 }
      ];

      const commonParams = {
        stockPrice: 10.00,
        expectedTermYears: 6.25,
        volatility: 0.50,
        riskFreeRate: 0.03,
        dividendYield: 0
      };

      const results = BlackScholesService.calculateBatchFairValues(grants, commonParams);

      expect(results).toHaveLength(3);
      expect(results[0].grantId).toBe('grant1');
      expect(results[0].fairValuePerShare).toBeGreaterThan(0);
      // totalFairValue is calculated independently with rounding, so check it's reasonably close
      expect(results[0].totalFairValue).toBeGreaterThan(0);
      expect(Math.abs(results[0].totalFairValue - results[0].fairValuePerShare * grants[0].sharesGranted)).toBeLessThan(50);

      // Lower exercise price = higher fair value
      expect(results[1].fairValuePerShare).toBeGreaterThan(results[0].fairValuePerShare);
    });
  });

  describe('sensitivityAnalysis', () => {
    it('should generate sensitivity analysis for volatility', () => {
      const baseParams = {
        stockPrice: 10.00,
        exercisePrice: 10.00,
        expectedTermYears: 6.25,
        volatility: 0.50,
        riskFreeRate: 0.03,
        dividendYield: 0
      };

      const ranges = {
        volatility: { min: 0.30, max: 0.70, step: 0.10 }
      };

      const analysis = BlackScholesService.sensitivityAnalysis(baseParams, ranges);

      expect(analysis.baseValue).toBeGreaterThan(0);
      expect(analysis.volatilitySensitivity).toHaveLength(5); // 0.30, 0.40, 0.50, 0.60, 0.70

      // Verify increasing volatility increases fair value
      for (let i = 1; i < analysis.volatilitySensitivity.length; i++) {
        expect(analysis.volatilitySensitivity[i].fairValue)
          .toBeGreaterThan(analysis.volatilitySensitivity[i - 1].fairValue);
      }
    });

    it('should generate sensitivity analysis for stock price', () => {
      const baseParams = {
        stockPrice: 10.00,
        exercisePrice: 10.00,
        expectedTermYears: 6.25,
        volatility: 0.50,
        riskFreeRate: 0.03
      };

      const ranges = {
        stockPrice: { min: 8, max: 12, step: 1 }
      };

      const analysis = BlackScholesService.sensitivityAnalysis(baseParams, ranges);

      expect(analysis.stockPriceSensitivity).toHaveLength(5);

      // Verify increasing stock price increases fair value
      for (let i = 1; i < analysis.stockPriceSensitivity.length; i++) {
        expect(analysis.stockPriceSensitivity[i].fairValue)
          .toBeGreaterThan(analysis.stockPriceSensitivity[i - 1].fairValue);
      }
    });
  });
});
