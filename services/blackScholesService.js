/**
 * Black-Scholes Option Pricing Service
 * Feature: Issue #73 - ASC 718 Reporting
 */

class BlackScholesService {
  /**
   * Standard normal cumulative distribution function
   */
  static normalCDF(x) {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Calculate d1 parameter
   */
  static calculateD1(stockPrice, strikePrice, timeToExpiry, riskFreeRate, volatility, dividendYield = 0) {
    const numerator = Math.log(stockPrice / strikePrice) +
      (riskFreeRate - dividendYield + (volatility * volatility) / 2) * timeToExpiry;
    const denominator = volatility * Math.sqrt(timeToExpiry);
    return numerator / denominator;
  }

  /**
   * Calculate d2 parameter
   */
  static calculateD2(d1, volatility, timeToExpiry) {
    return d1 - volatility * Math.sqrt(timeToExpiry);
  }

  /**
   * Calculate call option price using Black-Scholes formula
   * @param {Object} params - Option parameters
   * @param {number} params.stockPrice - Current stock price
   * @param {number} params.strikePrice - Strike/exercise price
   * @param {number} params.timeToExpiry - Time to expiration in years
   * @param {number} params.riskFreeRate - Risk-free interest rate (as decimal)
   * @param {number} params.volatility - Volatility (as decimal)
   * @param {number} params.dividendYield - Dividend yield (as decimal, default 0)
   * @returns {number} Option fair value
   */
  static calculateCallPrice(params) {
    const {
      stockPrice,
      strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility,
      dividendYield = 0
    } = params;

    // Handle edge cases
    if (timeToExpiry <= 0) {
      return Math.max(0, stockPrice - strikePrice);
    }

    if (volatility <= 0) {
      const discountedStrike = strikePrice * Math.exp(-riskFreeRate * timeToExpiry);
      const adjustedStock = stockPrice * Math.exp(-dividendYield * timeToExpiry);
      return Math.max(0, adjustedStock - discountedStrike);
    }

    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, riskFreeRate, volatility, dividendYield);
    const d2 = this.calculateD2(d1, volatility, timeToExpiry);

    const callPrice =
      stockPrice * Math.exp(-dividendYield * timeToExpiry) * this.normalCDF(d1) -
      strikePrice * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(d2);

    return Math.max(0, callPrice);
  }

  /**
   * Calculate put option price using Black-Scholes formula
   */
  static calculatePutPrice(params) {
    const {
      stockPrice,
      strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility,
      dividendYield = 0
    } = params;

    if (timeToExpiry <= 0) {
      return Math.max(0, strikePrice - stockPrice);
    }

    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, riskFreeRate, volatility, dividendYield);
    const d2 = this.calculateD2(d1, volatility, timeToExpiry);

    const putPrice =
      strikePrice * Math.exp(-riskFreeRate * timeToExpiry) * this.normalCDF(-d2) -
      stockPrice * Math.exp(-dividendYield * timeToExpiry) * this.normalCDF(-d1);

    return Math.max(0, putPrice);
  }

  /**
   * Calculate option fair value for ASC 718 purposes
   * Uses expected term instead of contractual term
   */
  static calculateASC718FairValue(params) {
    const {
      stockPrice,
      exercisePrice,
      expectedTermYears,
      volatility,
      riskFreeRate,
      dividendYield = 0
    } = params;

    return this.calculateCallPrice({
      stockPrice,
      strikePrice: exercisePrice,
      timeToExpiry: expectedTermYears,
      riskFreeRate,
      volatility,
      dividendYield
    });
  }

  /**
   * Calculate expected term using simplified method (SAB 107/110)
   * For companies without sufficient historical exercise data
   */
  static calculateExpectedTermSimplified(vestingPeriodYears, contractualTermYears) {
    return (vestingPeriodYears + contractualTermYears) / 2;
  }

  /**
   * Estimate volatility using comparable companies
   */
  static estimateVolatilityFromComparables(comparableVolatilities, weights = null) {
    if (!weights) {
      // Equal weighting
      return comparableVolatilities.reduce((a, b) => a + b, 0) / comparableVolatilities.length;
    }

    // Weighted average
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < comparableVolatilities.length; i++) {
      weightedSum += comparableVolatilities[i] * weights[i];
      totalWeight += weights[i];
    }
    return weightedSum / totalWeight;
  }

  /**
   * Calculate all Greeks for an option
   */
  static calculateGreeks(params) {
    const {
      stockPrice,
      strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility,
      dividendYield = 0
    } = params;

    const d1 = this.calculateD1(stockPrice, strikePrice, timeToExpiry, riskFreeRate, volatility, dividendYield);
    const d2 = this.calculateD2(d1, volatility, timeToExpiry);

    const sqrtT = Math.sqrt(timeToExpiry);
    const discountFactor = Math.exp(-riskFreeRate * timeToExpiry);
    const dividendFactor = Math.exp(-dividendYield * timeToExpiry);

    // Standard normal PDF
    const n_d1 = Math.exp(-d1 * d1 / 2) / Math.sqrt(2 * Math.PI);

    // Delta: rate of change of option price with respect to stock price
    const delta = dividendFactor * this.normalCDF(d1);

    // Gamma: rate of change of delta with respect to stock price
    const gamma = (dividendFactor * n_d1) / (stockPrice * volatility * sqrtT);

    // Theta: rate of change of option price with respect to time (daily)
    const theta = (
      -(stockPrice * dividendFactor * n_d1 * volatility) / (2 * sqrtT) -
      riskFreeRate * strikePrice * discountFactor * this.normalCDF(d2) +
      dividendYield * stockPrice * dividendFactor * this.normalCDF(d1)
    ) / 365;

    // Vega: rate of change of option price with respect to volatility (per 1% change)
    const vega = stockPrice * dividendFactor * sqrtT * n_d1 / 100;

    // Rho: rate of change of option price with respect to risk-free rate (per 1% change)
    const rho = strikePrice * timeToExpiry * discountFactor * this.normalCDF(d2) / 100;

    return {
      delta,
      gamma,
      theta,
      vega,
      rho
    };
  }

  /**
   * Calculate fair value for a batch of grants
   */
  static calculateBatchFairValues(grants, commonParams) {
    return grants.map(grant => {
      const fairValuePerShare = this.calculateASC718FairValue({
        stockPrice: commonParams.stockPrice,
        exercisePrice: grant.exercisePrice,
        expectedTermYears: grant.expectedTermYears || commonParams.expectedTermYears,
        volatility: commonParams.volatility,
        riskFreeRate: commonParams.riskFreeRate,
        dividendYield: commonParams.dividendYield || 0
      });

      return {
        grantId: grant.grantId,
        sharesGranted: grant.sharesGranted,
        exercisePrice: grant.exercisePrice,
        fairValuePerShare: Math.round(fairValuePerShare * 100) / 100,
        totalFairValue: Math.round(fairValuePerShare * grant.sharesGranted * 100) / 100
      };
    });
  }

  /**
   * Generate fair value sensitivity analysis
   */
  static sensitivityAnalysis(baseParams, ranges) {
    const results = {
      baseValue: this.calculateASC718FairValue(baseParams),
      volatilitySensitivity: [],
      stockPriceSensitivity: [],
      riskFreeRateSensitivity: []
    };

    // Volatility sensitivity
    if (ranges.volatility) {
      for (let v = ranges.volatility.min; v <= ranges.volatility.max; v += ranges.volatility.step) {
        results.volatilitySensitivity.push({
          volatility: v,
          fairValue: this.calculateASC718FairValue({ ...baseParams, volatility: v })
        });
      }
    }

    // Stock price sensitivity
    if (ranges.stockPrice) {
      for (let s = ranges.stockPrice.min; s <= ranges.stockPrice.max; s += ranges.stockPrice.step) {
        results.stockPriceSensitivity.push({
          stockPrice: s,
          fairValue: this.calculateASC718FairValue({ ...baseParams, stockPrice: s })
        });
      }
    }

    // Risk-free rate sensitivity
    if (ranges.riskFreeRate) {
      for (let r = ranges.riskFreeRate.min; r <= ranges.riskFreeRate.max; r += ranges.riskFreeRate.step) {
        results.riskFreeRateSensitivity.push({
          riskFreeRate: r,
          fairValue: this.calculateASC718FairValue({ ...baseParams, riskFreeRate: r })
        });
      }
    }

    return results;
  }
}

module.exports = BlackScholesService;
