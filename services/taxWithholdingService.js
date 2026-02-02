/**
 * Tax Withholding Service
 * Feature: Issue #72 - Tax Withholding Calculator
 */
const TaxWithholding = require('../models/TaxWithholding');

// 2024 Federal Tax Brackets (Supplemental wage flat rate)
const FEDERAL_SUPPLEMENTAL_RATE = 0.22; // 22% flat rate for supplemental wages

// 2024 FICA rates
const SOCIAL_SECURITY_RATE = 0.062;
const SOCIAL_SECURITY_WAGE_BASE = 168600; // 2024 wage base
const MEDICARE_RATE = 0.0145;
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD = {
  single: 200000,
  married_filing_jointly: 250000,
  married_filing_separately: 125000,
  head_of_household: 200000
};

// State tax rates (simplified - major states only)
const STATE_TAX_RATES = {
  CA: { rate: 0.1023, hasSupplemental: true, supplementalRate: 0.1023 },
  NY: { rate: 0.0685, hasSupplemental: true, supplementalRate: 0.1125 },
  TX: { rate: 0, hasSupplemental: false },
  FL: { rate: 0, hasSupplemental: false },
  WA: { rate: 0, hasSupplemental: false },
  MA: { rate: 0.05, hasSupplemental: true, supplementalRate: 0.05 },
  IL: { rate: 0.0495, hasSupplemental: true, supplementalRate: 0.0495 },
  PA: { rate: 0.0307, hasSupplemental: true, supplementalRate: 0.0307 },
  NJ: { rate: 0.0637, hasSupplemental: true, supplementalRate: 0.0637 },
  CO: { rate: 0.044, hasSupplemental: true, supplementalRate: 0.044 }
};

class TaxWithholdingService {
  /**
   * Calculate withholding for NSO exercise
   */
  static calculateNSOExerciseWithholding(params) {
    const {
      exercisePrice,
      fmvAtExercise,
      sharesExercised,
      employeeProfile,
      ytdWages = 0,
      ytdSocialSecurity = 0
    } = params;

    // NSO spread is ordinary income
    const spread = fmvAtExercise - exercisePrice;
    const ordinaryIncome = spread * sharesExercised;

    return this.calculateWithholding({
      grossAmount: ordinaryIncome,
      ordinaryIncome,
      eventType: 'nso_exercise',
      employeeProfile,
      ytdWages,
      ytdSocialSecurity
    });
  }

  /**
   * Calculate withholding for ISO exercise (AMT only)
   */
  static calculateISOExerciseWithholding(params) {
    const {
      exercisePrice,
      fmvAtExercise,
      sharesExercised,
      employeeProfile
    } = params;

    // ISO spread is AMT preference item, not ordinary income
    const spread = fmvAtExercise - exercisePrice;
    const amtIncome = spread * sharesExercised;

    // ISOs don't have regular withholding, only potential AMT
    const withholdings = [];
    let totalWithholding = 0;

    if (employeeProfile.isSubjectToAMT && amtIncome > 0) {
      // Simplified AMT calculation (26% rate)
      const amtWithholding = amtIncome * 0.26;
      withholdings.push({
        type: 'amt',
        rate: 0.26,
        baseAmount: amtIncome,
        withholdingAmount: amtWithholding,
        notes: 'AMT preference item - voluntary withholding'
      });
      totalWithholding = amtWithholding;
    }

    return {
      income: {
        grossAmount: amtIncome,
        ordinaryIncome: 0,
        capitalGains: { shortTerm: 0, longTerm: 0 },
        amtIncome
      },
      withholdings,
      summary: {
        totalWithholding,
        federalWithholding: 0,
        stateWithholding: 0,
        localWithholding: 0,
        socialSecurityWithholding: 0,
        medicareWithholding: 0,
        additionalMedicare: 0,
        netAmount: amtIncome - totalWithholding
      }
    };
  }

  /**
   * Calculate withholding for RSU vest
   */
  static calculateRSUVestWithholding(params) {
    const {
      fmvAtVest,
      sharesVested,
      employeeProfile,
      ytdWages = 0,
      ytdSocialSecurity = 0
    } = params;

    // RSU vest is ordinary income at full FMV
    const ordinaryIncome = fmvAtVest * sharesVested;

    return this.calculateWithholding({
      grossAmount: ordinaryIncome,
      ordinaryIncome,
      eventType: 'rsu_vest',
      employeeProfile,
      ytdWages,
      ytdSocialSecurity
    });
  }

  /**
   * Main withholding calculation
   */
  static calculateWithholding(params) {
    const {
      grossAmount,
      ordinaryIncome,
      eventType,
      employeeProfile,
      ytdWages = 0,
      ytdSocialSecurity = 0
    } = params;

    const withholdings = [];
    let totalWithholding = 0;

    // Federal withholding (supplemental flat rate)
    const federalWithholding = ordinaryIncome * FEDERAL_SUPPLEMENTAL_RATE;
    withholdings.push({
      type: 'federal',
      rate: FEDERAL_SUPPLEMENTAL_RATE,
      baseAmount: ordinaryIncome,
      withholdingAmount: federalWithholding,
      notes: 'Federal supplemental wage rate'
    });
    totalWithholding += federalWithholding;

    // State withholding
    const stateInfo = STATE_TAX_RATES[employeeProfile.stateCode];
    let stateWithholding = 0;
    if (stateInfo && stateInfo.rate > 0) {
      const stateRate = stateInfo.hasSupplemental ? stateInfo.supplementalRate : stateInfo.rate;
      stateWithholding = ordinaryIncome * stateRate;
      withholdings.push({
        type: 'state',
        jurisdiction: employeeProfile.stateCode,
        rate: stateRate,
        baseAmount: ordinaryIncome,
        withholdingAmount: stateWithholding,
        notes: stateInfo.hasSupplemental ? 'State supplemental rate' : 'State flat rate'
      });
      totalWithholding += stateWithholding;
    }

    // Social Security
    const cumulativeWages = ytdWages + ordinaryIncome;
    let ssWages = ordinaryIncome;

    if (ytdSocialSecurity >= SOCIAL_SECURITY_WAGE_BASE) {
      ssWages = 0;
    } else if (cumulativeWages > SOCIAL_SECURITY_WAGE_BASE) {
      ssWages = SOCIAL_SECURITY_WAGE_BASE - ytdWages;
    }

    const ssWithholding = ssWages * SOCIAL_SECURITY_RATE;
    if (ssWithholding > 0) {
      withholdings.push({
        type: 'social_security',
        rate: SOCIAL_SECURITY_RATE,
        baseAmount: ssWages,
        withholdingAmount: ssWithholding,
        notes: ssWages < ordinaryIncome ? 'Partial - wage base reached' : 'Full OASDI'
      });
      totalWithholding += ssWithholding;
    }

    // Medicare
    const medicareWithholding = ordinaryIncome * MEDICARE_RATE;
    withholdings.push({
      type: 'medicare',
      rate: MEDICARE_RATE,
      baseAmount: ordinaryIncome,
      withholdingAmount: medicareWithholding,
      notes: 'Medicare HI'
    });
    totalWithholding += medicareWithholding;

    // Additional Medicare (over threshold)
    const threshold = ADDITIONAL_MEDICARE_THRESHOLD[employeeProfile.filingStatus];
    let additionalMedicare = 0;

    if (cumulativeWages > threshold) {
      const additionalMedicareBase = ytdWages > threshold
        ? ordinaryIncome
        : cumulativeWages - threshold;
      additionalMedicare = additionalMedicareBase * ADDITIONAL_MEDICARE_RATE;

      withholdings.push({
        type: 'medicare',
        rate: ADDITIONAL_MEDICARE_RATE,
        baseAmount: additionalMedicareBase,
        withholdingAmount: additionalMedicare,
        notes: 'Additional Medicare tax (over threshold)'
      });
      totalWithholding += additionalMedicare;
    }

    // Additional voluntary withholding
    if (employeeProfile.additionalWithholding > 0) {
      withholdings.push({
        type: 'federal',
        rate: 0,
        baseAmount: 0,
        withholdingAmount: employeeProfile.additionalWithholding,
        notes: 'Employee requested additional withholding'
      });
      totalWithholding += employeeProfile.additionalWithholding;
    }

    return {
      income: {
        grossAmount,
        ordinaryIncome,
        capitalGains: { shortTerm: 0, longTerm: 0 },
        amtIncome: 0
      },
      withholdings,
      summary: {
        totalWithholding,
        federalWithholding: federalWithholding + employeeProfile.additionalWithholding,
        stateWithholding,
        localWithholding: 0,
        socialSecurityWithholding: ssWithholding,
        medicareWithholding,
        additionalMedicare,
        netAmount: grossAmount - totalWithholding
      }
    };
  }

  /**
   * Calculate shares to withhold (sell-to-cover)
   */
  static calculateSharesToWithhold(totalWithholding, sharePrice) {
    // Add a small buffer for price fluctuation
    const buffer = 1.02; // 2% buffer
    return Math.ceil((totalWithholding * buffer) / sharePrice);
  }

  /**
   * Create and save a tax withholding record
   */
  static async createWithholdingRecord(params) {
    const {
      companyId,
      employeeId,
      eventType,
      sourceType,
      sourceId,
      taxYear,
      eventDate,
      calculationParams,
      userId
    } = params;

    let result;
    switch (eventType) {
      case 'nso_exercise':
        result = this.calculateNSOExerciseWithholding(calculationParams);
        break;
      case 'iso_exercise':
        result = this.calculateISOExerciseWithholding(calculationParams);
        break;
      case 'rsu_vest':
        result = this.calculateRSUVestWithholding(calculationParams);
        break;
      default:
        result = this.calculateWithholding(calculationParams);
    }

    const withholding = new TaxWithholding({
      companyId,
      employeeId,
      eventType,
      sourceType,
      sourceId,
      taxYear,
      eventDate,
      income: result.income,
      employeeProfile: calculationParams.employeeProfile,
      withholdings: result.withholdings,
      summary: result.summary,
      method: 'supplemental',
      createdBy: userId
    });

    await withholding.save();
    return withholding;
  }

  /**
   * Get withholding estimate for planning purposes
   */
  static getWithholdingEstimate(params) {
    const { eventType } = params;

    switch (eventType) {
      case 'nso_exercise':
        return this.calculateNSOExerciseWithholding(params);
      case 'iso_exercise':
        return this.calculateISOExerciseWithholding(params);
      case 'rsu_vest':
        return this.calculateRSUVestWithholding(params);
      default:
        return this.calculateWithholding(params);
    }
  }
}

module.exports = TaxWithholdingService;
