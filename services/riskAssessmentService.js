/**
 * Risk Assessment Service
 *
 * [Feature] Issue #44: Implement Enhanced Financial Services
 * Provides comprehensive risk assessment features including:
 * - Financial risk scoring
 * - Anomaly detection in transactions
 * - Alert system for risk thresholds
 */

const databaseAdapter = require('./databaseAdapter');

class RiskAssessmentService {
  constructor() {
    // Risk thresholds
    this.riskThresholds = {
      liquidity: {
        currentRatio: { low: 2.0, medium: 1.5, high: 1.0 },
        quickRatio: { low: 1.5, medium: 1.0, high: 0.5 }
      },
      leverage: {
        debtToEquity: { low: 0.5, medium: 1.0, high: 2.0 },
        interestCoverage: { low: 5.0, medium: 2.5, high: 1.5 }
      },
      profitability: {
        netMargin: { low: 15, medium: 8, high: 3 }
      }
    };

    // Anomaly detection settings
    this.anomalySettings = {
      standardDeviationThreshold: 2.0,
      minDataPoints: 5
    };
  }

  /**
   * Calculate overall financial risk score
   * @param {string} companyId - Company identifier
   * @param {Object} options - Options for risk calculation
   * @returns {Object} Risk score and components
   */
  async calculateRiskScore(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Fetch latest financial data
    const financialData = await databaseAdapter.findOne('FinancialReport',
      { companyId },
      { sort: { reportDate: -1 } }
    );

    if (!financialData) {
      throw new Error('Financial data not found');
    }

    // Fetch historical data for trend analysis
    const historicalData = await databaseAdapter.find('FinancialReport',
      { companyId },
      { sort: { reportDate: 1 }, limit: 12 }
    );

    // Calculate individual risk components
    const liquidityRisk = this._calculateLiquidityRisk(financialData);
    const leverageRisk = this._calculateLeverageRisk(financialData);
    const profitabilityRisk = this._calculateProfitabilityRisk(financialData);
    const cashFlowRisk = this._calculateCashFlowRisk(financialData);
    const volatilityRisk = this._calculateVolatilityRisk(historicalData);

    // Calculate overall weighted score
    const weights = {
      liquidity: 0.25,
      leverage: 0.25,
      profitability: 0.20,
      cashFlow: 0.20,
      volatility: 0.10
    };

    const overallScore = Math.round(
      liquidityRisk.score * weights.liquidity +
      leverageRisk.score * weights.leverage +
      profitabilityRisk.score * weights.profitability +
      cashFlowRisk.score * weights.cashFlow +
      volatilityRisk.score * weights.volatility
    );

    // Determine risk level
    let riskLevel;
    if (overallScore < 30) {
      riskLevel = 'low';
    } else if (overallScore < 70) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    return {
      companyId,
      overallScore,
      riskLevel,
      components: {
        liquidityRisk,
        leverageRisk,
        profitabilityRisk,
        cashFlowRisk,
        volatilityRisk
      },
      weights,
      calculatedAt: new Date()
    };
  }

  /**
   * Detect anomalies in transactions
   * @param {string} companyId - Company identifier
   * @param {Object} options - Detection options
   * @returns {Object} Detected anomalies
   */
  async detectAnomalies(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const { period, detectionType = 'all' } = options;

    // Build query
    const query = { companyId };
    if (period) {
      // Parse period (e.g., 'Q4-2023')
      const periodDates = this._parsePeriod(period);
      if (periodDates) {
        query.date = {
          $gte: periodDates.start,
          $lte: periodDates.end
        };
      }
    }

    // Fetch transaction data
    const transactions = await databaseAdapter.find('Transaction', query, {
      sort: { date: 1 }
    });

    const result = {
      companyId,
      anomalies: [],
      volumeAnomalies: [],
      timingAnomalies: [],
      analyzedTransactions: transactions.length,
      analysisDate: new Date()
    };

    if (transactions.length < this.anomalySettings.minDataPoints) {
      result.message = 'Insufficient data for anomaly detection';
      return result;
    }

    // Detect amount anomalies
    if (detectionType === 'all' || detectionType === 'amount') {
      result.anomalies = this._detectAmountAnomalies(transactions);
    }

    // Detect volume anomalies
    if (detectionType === 'all' || detectionType === 'volume') {
      result.volumeAnomalies = this._detectVolumeAnomalies(transactions);
    }

    // Detect timing anomalies
    if (detectionType === 'all' || detectionType === 'timing') {
      result.timingAnomalies = this._detectTimingAnomalies(transactions);
    }

    return result;
  }

  /**
   * Create a risk alert
   * @param {string} companyId - Company identifier
   * @param {Object} alertData - Alert data
   * @returns {Object} Created alert
   */
  async createAlert(companyId, alertData) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    if (!alertData.type) {
      throw new Error('Alert type is required');
    }

    // Check for existing active alert of same type
    const existingAlert = await databaseAdapter.findOne('RiskAlert', {
      companyId,
      type: alertData.type,
      status: 'active'
    });

    if (existingAlert) {
      return {
        duplicate: true,
        existingAlertId: existingAlert.alertId,
        message: 'Active alert of this type already exists'
      };
    }

    // Calculate severity if not provided
    const severity = alertData.severity || this._calculateAlertSeverity(alertData);

    // Create alert
    const alert = await databaseAdapter.create('RiskAlert', {
      alertId: this._generateAlertId(),
      companyId,
      type: alertData.type,
      severity,
      threshold: alertData.threshold,
      currentValue: alertData.currentValue,
      message: alertData.message,
      status: 'active',
      createdAt: new Date()
    });

    return alert;
  }

  /**
   * Get alerts for a company
   * @param {string} companyId - Company identifier
   * @param {Object} options - Filter options
   * @returns {Object} Alerts list
   */
  async getAlerts(companyId, options = {}) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    const query = { companyId };

    if (options.status) {
      query.status = options.status;
    }

    if (options.severity) {
      query.severity = options.severity;
    }

    if (options.type) {
      query.type = options.type;
    }

    const alerts = await databaseAdapter.find('RiskAlert', query, {
      sort: { createdAt: -1 }
    });

    return {
      companyId,
      alerts,
      count: alerts.length,
      retrievedAt: new Date()
    };
  }

  /**
   * Resolve an alert
   * @param {string} alertId - Alert identifier
   * @param {Object} resolution - Resolution details
   * @returns {Object} Updated alert
   */
  async resolveAlert(alertId, resolution = {}) {
    if (!alertId) {
      throw new Error('Alert ID is required');
    }

    const updatedAlert = await databaseAdapter.findByIdAndUpdate(
      'RiskAlert',
      alertId,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: resolution.resolvedBy,
        resolutionNotes: resolution.notes
      }
    );

    if (!updatedAlert) {
      throw new Error('Alert not found');
    }

    return updatedAlert;
  }

  /**
   * Get comprehensive risk summary
   * @param {string} companyId - Company identifier
   * @returns {Object} Risk summary
   */
  async getRiskSummary(companyId) {
    if (!companyId) {
      throw new Error('Company ID is required');
    }

    // Get risk score
    const riskScore = await this.calculateRiskScore(companyId);

    // Get anomalies
    const anomalies = await this.detectAnomalies(companyId);

    // Get active alerts
    const alertsResult = await this.getAlerts(companyId, { status: 'active' });

    return {
      companyId,
      riskScore: riskScore.overallScore,
      riskLevel: riskScore.riskLevel,
      components: riskScore.components,
      anomalyCount: anomalies.anomalies.length,
      activeAlerts: alertsResult.alerts,
      activeAlertCount: alertsResult.count,
      summary: this._generateRiskSummaryText(riskScore, anomalies, alertsResult),
      generatedAt: new Date()
    };
  }

  // Private helper methods

  /**
   * Calculate liquidity risk score
   * @param {Object} data - Financial data
   * @returns {Object} Liquidity risk assessment
   */
  _calculateLiquidityRisk(data) {
    const { currentAssets = 0, currentLiabilities = 1, inventory = 0 } = data;

    const currentRatio = currentAssets / currentLiabilities;
    const quickRatio = (currentAssets - inventory) / currentLiabilities;

    let score = 0;
    const thresholds = this.riskThresholds.liquidity;

    // Current ratio scoring (higher is better, so invert)
    if (currentRatio < thresholds.currentRatio.high) {
      score += 40;
    } else if (currentRatio < thresholds.currentRatio.medium) {
      score += 25;
    } else if (currentRatio < thresholds.currentRatio.low) {
      score += 10;
    }

    // Quick ratio scoring
    if (quickRatio < thresholds.quickRatio.high) {
      score += 40;
    } else if (quickRatio < thresholds.quickRatio.medium) {
      score += 25;
    } else if (quickRatio < thresholds.quickRatio.low) {
      score += 10;
    }

    return {
      score: Math.min(score, 100),
      currentRatio,
      quickRatio,
      assessment: score > 50 ? 'high' : score > 25 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate leverage risk score
   * @param {Object} data - Financial data
   * @returns {Object} Leverage risk assessment
   */
  _calculateLeverageRisk(data) {
    const { totalDebt = 0, totalEquity = 1, interestExpense = 0, operatingIncome = 0 } = data;

    const debtToEquity = totalDebt / totalEquity;
    const interestCoverage = interestExpense > 0 ? operatingIncome / interestExpense : 999;

    let score = 0;
    const thresholds = this.riskThresholds.leverage;

    // Debt to equity scoring (lower is better)
    if (debtToEquity > thresholds.debtToEquity.high) {
      score += 40;
    } else if (debtToEquity > thresholds.debtToEquity.medium) {
      score += 25;
    } else if (debtToEquity > thresholds.debtToEquity.low) {
      score += 10;
    }

    // Interest coverage scoring (higher is better, so invert)
    if (interestCoverage < thresholds.interestCoverage.high) {
      score += 40;
    } else if (interestCoverage < thresholds.interestCoverage.medium) {
      score += 25;
    } else if (interestCoverage < thresholds.interestCoverage.low) {
      score += 10;
    }

    return {
      score: Math.min(score, 100),
      debtToEquity,
      interestCoverage,
      assessment: score > 50 ? 'high' : score > 25 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate profitability risk score
   * @param {Object} data - Financial data
   * @returns {Object} Profitability risk assessment
   */
  _calculateProfitabilityRisk(data) {
    const { netIncome = 0, totalRevenue = 1 } = data;

    const netMargin = (netIncome / totalRevenue) * 100;

    let score = 0;
    const thresholds = this.riskThresholds.profitability;

    // Net margin scoring (higher is better, so invert for risk)
    if (netMargin < thresholds.netMargin.high) {
      score = 80;
    } else if (netMargin < thresholds.netMargin.medium) {
      score = 50;
    } else if (netMargin < thresholds.netMargin.low) {
      score = 25;
    } else {
      score = 10;
    }

    // Additional penalty for negative margin
    if (netMargin < 0) {
      score = 100;
    }

    return {
      score: Math.min(score, 100),
      netMargin,
      assessment: score > 50 ? 'high' : score > 25 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate cash flow risk score
   * @param {Object} data - Financial data
   * @returns {Object} Cash flow risk assessment
   */
  _calculateCashFlowRisk(data) {
    const { operatingCashFlow = 0, totalDebt = 0, netIncome = 1 } = data;

    const cashFlowToDebt = totalDebt > 0 ? operatingCashFlow / totalDebt : 999;
    const cashFlowQuality = netIncome !== 0 ? operatingCashFlow / netIncome : 1;

    let score = 0;

    // Negative operating cash flow is high risk
    if (operatingCashFlow < 0) {
      score += 50;
    } else if (cashFlowToDebt < 0.2) {
      score += 35;
    } else if (cashFlowToDebt < 0.4) {
      score += 20;
    }

    // Cash flow quality (operating cash flow vs net income)
    if (cashFlowQuality < 0.5) {
      score += 30;
    } else if (cashFlowQuality < 0.8) {
      score += 15;
    }

    return {
      score: Math.min(score, 100),
      cashFlowToDebt,
      cashFlowQuality,
      operatingCashFlow,
      assessment: score > 50 ? 'high' : score > 25 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate volatility risk score from historical data
   * @param {Array} historicalData - Historical financial reports
   * @returns {Object} Volatility risk assessment
   */
  _calculateVolatilityRisk(historicalData) {
    if (!historicalData || historicalData.length < 3) {
      return {
        score: 0,
        volatility: null,
        assessment: 'insufficient_data'
      };
    }

    // Calculate revenue volatility
    const revenues = historicalData.map(d => d.totalRevenue || 0);
    const volatility = this._calculateCoeffientOfVariation(revenues);

    let score = 0;
    if (volatility > 0.3) {
      score = 70;
    } else if (volatility > 0.2) {
      score = 45;
    } else if (volatility > 0.1) {
      score = 20;
    }

    return {
      score: Math.min(score, 100),
      volatility,
      assessment: score > 50 ? 'high' : score > 25 ? 'medium' : 'low'
    };
  }

  /**
   * Calculate coefficient of variation
   * @param {Array} values - Numeric values
   * @returns {number} Coefficient of variation
   */
  _calculateCoeffientOfVariation(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    if (mean === 0) return 0;

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return stdDev / Math.abs(mean);
  }

  /**
   * Detect anomalies in transaction amounts using z-score method
   * @param {Array} transactions - Transaction data
   * @returns {Array} Detected anomalies
   */
  _detectAmountAnomalies(transactions) {
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = [];
    const threshold = this.anomalySettings.standardDeviationThreshold;

    transactions.forEach(transaction => {
      const zScore = stdDev > 0 ? Math.abs((transaction.amount - mean) / stdDev) : 0;

      if (zScore > threshold) {
        anomalies.push({
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          date: transaction.date,
          type: transaction.type,
          zScore,
          deviation: transaction.amount - mean,
          severity: this._getAnomalySeverity(zScore)
        });
      }
    });

    return anomalies;
  }

  /**
   * Detect volume anomalies (unusual number of transactions per day)
   * @param {Array} transactions - Transaction data
   * @returns {Array} Volume anomalies
   */
  _detectVolumeAnomalies(transactions) {
    // Group transactions by day
    const dailyCounts = {};
    transactions.forEach(t => {
      const dayKey = t.date.toISOString().split('T')[0];
      dailyCounts[dayKey] = (dailyCounts[dayKey] || 0) + 1;
    });

    const counts = Object.values(dailyCounts);
    if (counts.length < 3) return [];

    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / counts.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = [];
    const threshold = this.anomalySettings.standardDeviationThreshold;

    Object.entries(dailyCounts).forEach(([date, count]) => {
      const zScore = stdDev > 0 ? Math.abs((count - mean) / stdDev) : 0;

      if (zScore > threshold) {
        anomalies.push({
          date,
          transactionCount: count,
          expectedCount: Math.round(mean),
          zScore,
          severity: this._getAnomalySeverity(zScore)
        });
      }
    });

    return anomalies;
  }

  /**
   * Detect timing anomalies (transactions at unusual times)
   * @param {Array} transactions - Transaction data
   * @returns {Array} Timing anomalies
   */
  _detectTimingAnomalies(transactions) {
    const anomalies = [];

    // Business hours: 8 AM - 6 PM
    const businessHoursStart = 8;
    const businessHoursEnd = 18;

    transactions.forEach(transaction => {
      const hour = new Date(transaction.date).getHours();

      if (hour < businessHoursStart || hour > businessHoursEnd) {
        anomalies.push({
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          date: transaction.date,
          hour,
          reason: 'Transaction outside business hours',
          severity: hour >= 0 && hour < 6 ? 'high' : 'medium'
        });
      }
    });

    return anomalies;
  }

  /**
   * Get anomaly severity based on z-score
   * @param {number} zScore - Z-score value
   * @returns {string} Severity level
   */
  _getAnomalySeverity(zScore) {
    if (zScore > 4) return 'critical';
    if (zScore > 3.5) return 'high';
    if (zScore > 3) return 'medium';
    return 'low';
  }

  /**
   * Calculate alert severity based on threshold deviation
   * @param {Object} alertData - Alert data
   * @returns {string} Severity level
   */
  _calculateAlertSeverity(alertData) {
    if (!alertData.threshold || !alertData.currentValue) return 'medium';

    const deviation = Math.abs((alertData.currentValue - alertData.threshold) / alertData.threshold);

    if (deviation > 1.0) return 'critical';
    if (deviation > 0.5) return 'high';
    if (deviation > 0.25) return 'medium';
    return 'low';
  }

  /**
   * Parse period string to date range
   * @param {string} period - Period string (e.g., 'Q4-2023')
   * @returns {Object} Start and end dates
   */
  _parsePeriod(period) {
    const match = period.match(/Q(\d)-(\d{4})/);
    if (!match) return null;

    const quarter = parseInt(match[1]);
    const year = parseInt(match[2]);

    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;

    return {
      start: new Date(year, startMonth, 1),
      end: new Date(year, endMonth + 1, 0, 23, 59, 59)
    };
  }

  /**
   * Generate unique alert ID
   * @returns {string} Alert ID
   */
  _generateAlertId() {
    return `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate risk summary text
   * @param {Object} riskScore - Risk score data
   * @param {Object} anomalies - Anomaly data
   * @param {Object} alerts - Alert data
   * @returns {string} Summary text
   */
  _generateRiskSummaryText(riskScore, anomalies, alerts) {
    const parts = [];

    parts.push(`Overall risk level: ${riskScore.riskLevel} (score: ${riskScore.overallScore}/100)`);

    if (anomalies.anomalies.length > 0) {
      parts.push(`${anomalies.anomalies.length} transaction anomalies detected`);
    }

    if (alerts.count > 0) {
      parts.push(`${alerts.count} active risk alerts`);
    }

    // Highlight highest risk component
    const components = riskScore.components;
    const maxRisk = Object.entries(components)
      .filter(([key, val]) => val.score !== undefined)
      .sort((a, b) => b[1].score - a[1].score)[0];

    if (maxRisk && maxRisk[1].score > 50) {
      parts.push(`Primary concern: ${maxRisk[0].replace('Risk', '')} (score: ${maxRisk[1].score})`);
    }

    return parts.join('. ');
  }
}

// Export singleton instance
module.exports = new RiskAssessmentService();
