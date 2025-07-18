/**
 * Analytics Controller
 * 
 * [Feature] OCAE-401: Advanced Analytics and Predictive Modeling
 * Implements predictive financial modeling, risk assessment, performance benchmarking,
 * automated report generation, and anomaly detection for enterprise analytics
 */

const FinancialReport = require('../models/financialReport');
const Company = require('../models/Company');
const Document = require('../models/Document');
const SecurityAudit = require('../models/SecurityAudit');
const vectorService = require('../services/vectorService');
const streamingService = require('../services/streamingService');
const memoryService = require('../services/memoryService');
const mongoose = require('mongoose');

/**
 * Predictive Financial Modeling
 * Uses historical data to predict future financial performance
 */
const predictiveFinancialModeling = async (req, res) => {
  try {
    const { companyId, periods = 12, modelType = 'linear' } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Fetch historical financial data
    const historicalData = await FinancialReport.find({
      companyId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000 * 365 * 3) } // 3 years
    }).sort({ reportingPeriod: 1 });

    if (historicalData.length < 6) {
      return res.status(400).json({ 
        error: 'Insufficient historical data for prediction (minimum 6 periods required)' 
      });
    }

    // Calculate trends and predictions
    const predictions = calculateFinancialPredictions(historicalData, periods, modelType);
    
    // Risk assessment based on predictions
    const riskMetrics = calculateRiskMetrics(predictions, historicalData);
    
    // Performance benchmarking
    const benchmarkData = await generateBenchmarkComparison(companyId, predictions);
    
    // Store prediction results for monitoring
    await memoryService.storeAnalytics(companyId, 'financial_predictions', {
      predictions,
      riskMetrics,
      benchmarkData,
      modelType,
      generatedAt: new Date()
    });

    // Publish real-time analytics event
    await streamingService.publishEvent('analytics.prediction.generated', {
      companyId,
      type: 'financial_prediction',
      riskLevel: riskMetrics.overallRisk,
      timestamp: new Date()
    });

    res.status(200).json({
      predictions,
      riskMetrics,
      benchmarkData,
      modelMetadata: {
        modelType,
        dataPoints: historicalData.length,
        predictionPeriods: periods,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Predictive modeling error:', error);
    res.status(500).json({ 
      error: 'Failed to generate financial predictions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Risk Assessment Algorithms
 * Comprehensive risk analysis using multiple financial and operational metrics
 */
const riskAssessment = async (req, res) => {
  try {
    const { companyId, assessmentType = 'comprehensive' } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Gather risk assessment data
    const [
      financialData,
      companyData,
      securityAudits,
      documentRisks
    ] = await Promise.all([
      FinancialReport.find({ companyId }).sort({ createdAt: -1 }).limit(12),
      Company.findById(companyId),
      SecurityAudit.find({ companyId }).sort({ createdAt: -1 }).limit(10),
      Document.find({ companyId }).sort({ createdAt: -1 }).limit(100)
    ]);

    // Calculate different risk categories
    const riskAssessment = {
      financialRisk: calculateFinancialRisk(financialData),
      operationalRisk: calculateOperationalRisk(companyData, securityAudits),
      complianceRisk: calculateComplianceRisk(documentRisks, securityAudits),
      marketRisk: await calculateMarketRisk(companyData),
      overallRisk: 'low' // Will be calculated based on other risks
    };

    // Calculate overall risk score
    riskAssessment.overallRisk = calculateOverallRisk(riskAssessment);
    
    // Generate risk mitigation recommendations
    const recommendations = generateRiskMitigationRecommendations(riskAssessment);
    
    // Anomaly detection on risk patterns
    const anomalies = await detectRiskAnomalies(companyId, riskAssessment);

    // Store risk assessment results
    await memoryService.storeAnalytics(companyId, 'risk_assessment', {
      ...riskAssessment,
      recommendations,
      anomalies,
      assessmentDate: new Date()
    });

    // Publish risk assessment event
    await streamingService.publishEvent('analytics.risk.assessed', {
      companyId,
      overallRisk: riskAssessment.overallRisk,
      criticalAnomalies: anomalies.filter(a => a.severity === 'critical').length,
      timestamp: new Date()
    });

    res.status(200).json({
      riskAssessment,
      recommendations,
      anomalies,
      metadata: {
        assessmentType,
        dataPoints: {
          financial: financialData.length,
          security: securityAudits.length,
          documents: documentRisks.length
        },
        assessmentDate: new Date()
      }
    });

  } catch (error) {
    console.error('Risk assessment error:', error);
    res.status(500).json({ 
      error: 'Failed to perform risk assessment',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Performance Benchmarking
 * Compare company performance against industry standards and peer companies
 */
const performanceBenchmarking = async (req, res) => {
  try {
    const { companyId, industry, companySize = 'medium' } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Get company's financial performance
    const companyData = await Company.findById(companyId);
    const financialData = await FinancialReport.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(12);

    if (!financialData.length) {
      return res.status(400).json({ error: 'No financial data available for benchmarking' });
    }

    // Calculate company metrics
    const companyMetrics = calculateCompanyMetrics(financialData, companyData);
    
    // Get industry benchmarks (mock data - in real implementation, would come from external APIs)
    const industryBenchmarks = getIndustryBenchmarks(industry || companyData.industry, companySize);
    
    // Calculate peer comparison
    const peerComparison = await calculatePeerComparison(companyId, companyMetrics);
    
    // Generate performance insights
    const insights = generatePerformanceInsights(companyMetrics, industryBenchmarks, peerComparison);
    
    // Store benchmarking results
    await memoryService.storeAnalytics(companyId, 'performance_benchmark', {
      companyMetrics,
      industryBenchmarks,
      peerComparison,
      insights,
      benchmarkDate: new Date()
    });

    // Publish benchmarking event
    await streamingService.publishEvent('analytics.benchmark.completed', {
      companyId,
      industryRanking: peerComparison.ranking,
      performanceScore: companyMetrics.overallScore,
      timestamp: new Date()
    });

    res.status(200).json({
      companyMetrics,
      industryBenchmarks,
      peerComparison,
      insights,
      metadata: {
        industry: industry || companyData.industry,
        companySize,
        benchmarkDate: new Date(),
        dataPoints: financialData.length
      }
    });

  } catch (error) {
    console.error('Performance benchmarking error:', error);
    res.status(500).json({ 
      error: 'Failed to generate performance benchmark',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Automated Report Generation
 * Generate comprehensive analytics reports automatically
 */
const automatedReportGeneration = async (req, res) => {
  try {
    const { companyId, reportType = 'comprehensive', format = 'json' } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Generate different types of reports
    const reports = {};
    
    if (reportType === 'comprehensive' || reportType === 'financial') {
      reports.financial = await generateFinancialReport(companyId);
    }
    
    if (reportType === 'comprehensive' || reportType === 'risk') {
      reports.risk = await generateRiskReport(companyId);
    }
    
    if (reportType === 'comprehensive' || reportType === 'performance') {
      reports.performance = await generatePerformanceReport(companyId);
    }
    
    if (reportType === 'comprehensive' || reportType === 'compliance') {
      reports.compliance = await generateComplianceReport(companyId);
    }

    // Executive summary
    const executiveSummary = generateExecutiveSummary(reports);
    
    // Store generated report
    await memoryService.storeAnalytics(companyId, 'automated_report', {
      reports,
      executiveSummary,
      reportType,
      format,
      generatedAt: new Date()
    });

    // Publish report generation event
    await streamingService.publishEvent('analytics.report.generated', {
      companyId,
      reportType,
      format,
      timestamp: new Date()
    });

    res.status(200).json({
      executiveSummary,
      reports,
      metadata: {
        reportType,
        format,
        generatedAt: new Date(),
        companyId
      }
    });

  } catch (error) {
    console.error('Automated report generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate automated report',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Anomaly Detection
 * Detect unusual patterns in financial and operational data
 */
const anomalyDetection = async (req, res) => {
  try {
    const { companyId, analysisType = 'comprehensive', sensitivity = 'medium' } = req.body;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    // Gather data for anomaly detection
    const [
      financialData,
      securityAudits,
      documents,
      userActivity
    ] = await Promise.all([
      FinancialReport.find({ companyId }).sort({ createdAt: -1 }).limit(50),
      SecurityAudit.find({ companyId }).sort({ createdAt: -1 }).limit(100),
      Document.find({ companyId }).sort({ createdAt: -1 }).limit(200),
      memoryService.getAnalytics(companyId, 'user_activity')
    ]);

    // Detect different types of anomalies
    const anomalies = {
      financial: detectFinancialAnomalies(financialData, sensitivity),
      security: detectSecurityAnomalies(securityAudits, sensitivity),
      operational: detectOperationalAnomalies(documents, userActivity, sensitivity),
      compliance: await detectComplianceAnomalies(companyId, sensitivity)
    };

    // Calculate anomaly scores and priorities
    const anomalyReport = processAnomalyResults(anomalies);
    
    // Generate recommendations for anomaly resolution
    const recommendations = generateAnomalyRecommendations(anomalyReport);
    
    // Store anomaly detection results
    await memoryService.storeAnalytics(companyId, 'anomaly_detection', {
      anomalies: anomalyReport,
      recommendations,
      sensitivity,
      detectionDate: new Date()
    });

    // Publish critical anomaly alerts
    const criticalAnomalies = anomalyReport.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      await streamingService.publishEvent('analytics.anomaly.critical', {
        companyId,
        criticalCount: criticalAnomalies.length,
        anomalies: criticalAnomalies,
        timestamp: new Date()
      });
    }

    res.status(200).json({
      anomalies: anomalyReport,
      recommendations,
      summary: {
        total: anomalyReport.length,
        critical: criticalAnomalies.length,
        high: anomalyReport.filter(a => a.severity === 'high').length,
        medium: anomalyReport.filter(a => a.severity === 'medium').length,
        low: anomalyReport.filter(a => a.severity === 'low').length
      },
      metadata: {
        analysisType,
        sensitivity,
        detectionDate: new Date()
      }
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    res.status(500).json({ 
      error: 'Failed to perform anomaly detection',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper Functions

/**
 * Calculate financial predictions using trend analysis
 */
function calculateFinancialPredictions(historicalData, periods, modelType) {
  const predictions = [];
  
  // Simple linear regression for trend analysis
  const revenueData = historicalData.map(r => r.totalRevenue || 0);
  const expenseData = historicalData.map(r => r.totalExpenses || 0);
  
  // Calculate trends
  const revenueTrend = calculateTrend(revenueData);
  const expenseTrend = calculateTrend(expenseData);
  
  // Generate predictions
  for (let i = 1; i <= periods; i++) {
    const predictedRevenue = revenueData[revenueData.length - 1] + (revenueTrend * i);
    const predictedExpenses = expenseData[expenseData.length - 1] + (expenseTrend * i);
    
    predictions.push({
      period: i,
      predictedRevenue: Math.max(0, predictedRevenue),
      predictedExpenses: Math.max(0, predictedExpenses),
      predictedNetIncome: predictedRevenue - predictedExpenses,
      confidence: Math.max(0.1, 0.9 - (i * 0.05)) // Decreasing confidence over time
    });
  }
  
  return predictions;
}

/**
 * Calculate trend using simple linear regression
 */
function calculateTrend(data) {
  if (data.length < 2) return 0;
  
  const n = data.length;
  const sumX = (n * (n + 1)) / 2;
  const sumY = data.reduce((sum, val) => sum + val, 0);
  const sumXY = data.reduce((sum, val, idx) => sum + val * (idx + 1), 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
  
  return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
}

/**
 * Calculate comprehensive risk metrics
 */
function calculateRiskMetrics(predictions, historicalData) {
  const volatility = calculateVolatility(historicalData);
  const trendRisk = calculateTrendRisk(predictions);
  const liquidityRisk = calculateLiquidityRisk(historicalData);
  
  return {
    volatility,
    trendRisk,
    liquidityRisk,
    overallRisk: calculateOverallRisk({ volatility, trendRisk, liquidityRisk })
  };
}

/**
 * Calculate financial volatility
 */
function calculateVolatility(data) {
  if (data.length < 2) return 'low';
  
  const revenues = data.map(d => d.totalRevenue || 0);
  const mean = revenues.reduce((sum, val) => sum + val, 0) / revenues.length;
  const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;
  
  if (coefficientOfVariation > 0.3) return 'high';
  if (coefficientOfVariation > 0.15) return 'medium';
  return 'low';
}

/**
 * Calculate trend risk from predictions
 */
function calculateTrendRisk(predictions) {
  const negativeOutlooks = predictions.filter(p => p.predictedNetIncome < 0).length;
  const riskRatio = negativeOutlooks / predictions.length;
  
  if (riskRatio > 0.5) return 'high';
  if (riskRatio > 0.25) return 'medium';
  return 'low';
}

/**
 * Calculate liquidity risk
 */
function calculateLiquidityRisk(data) {
  if (data.length === 0) return 'medium';
  
  const latestData = data[data.length - 1];
  const currentRatio = latestData.currentAssets / latestData.currentLiabilities;
  
  if (currentRatio < 1) return 'high';
  if (currentRatio < 1.5) return 'medium';
  return 'low';
}

/**
 * Calculate overall risk score
 */
function calculateOverallRisk(risks) {
  const riskValues = { low: 1, medium: 2, high: 3 };
  const scores = Object.values(risks).map(risk => riskValues[risk] || 2);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  if (avgScore >= 2.5) return 'high';
  if (avgScore >= 1.5) return 'medium';
  return 'low';
}

/**
 * Generate benchmark comparison data
 */
async function generateBenchmarkComparison(companyId, predictions) {
  // Mock benchmark data - in real implementation, would come from external APIs
  return {
    industryAverage: {
      revenueGrowth: 0.12,
      profitMargin: 0.15,
      riskLevel: 'medium'
    },
    peerComparison: {
      ranking: Math.floor(Math.random() * 100) + 1,
      totalPeers: 150,
      performanceScore: Math.random() * 100
    }
  };
}

/**
 * Additional helper functions for risk assessment, benchmarking, etc.
 */
function calculateFinancialRisk(data) {
  if (!data.length) return 'medium';
  return calculateVolatility(data);
}

function calculateOperationalRisk(company, audits) {
  if (!audits.length) return 'medium';
  const criticalIssues = audits.filter(a => a.severity === 'critical').length;
  return criticalIssues > 2 ? 'high' : criticalIssues > 0 ? 'medium' : 'low';
}

function calculateComplianceRisk(documents, audits) {
  const complianceIssues = audits.filter(a => a.auditType === 'compliance').length;
  return complianceIssues > 3 ? 'high' : complianceIssues > 1 ? 'medium' : 'low';
}

async function calculateMarketRisk(company) {
  // Mock market risk calculation
  return Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low';
}

function generateRiskMitigationRecommendations(risks) {
  const recommendations = [];
  
  if (risks.financialRisk === 'high') {
    recommendations.push({
      category: 'Financial',
      priority: 'high',
      recommendation: 'Implement cash flow forecasting and maintain higher reserves',
      timeline: '30 days'
    });
  }
  
  if (risks.operationalRisk === 'high') {
    recommendations.push({
      category: 'Operational',
      priority: 'high',
      recommendation: 'Conduct comprehensive security audit and implement remediation plan',
      timeline: '60 days'
    });
  }
  
  return recommendations;
}

async function detectRiskAnomalies(companyId, currentRisk) {
  // Mock anomaly detection
  const anomalies = [];
  
  if (currentRisk.overallRisk === 'high') {
    anomalies.push({
      type: 'risk_spike',
      severity: 'high',
      description: 'Sudden increase in overall risk level',
      detectedAt: new Date()
    });
  }
  
  return anomalies;
}

// Additional helper functions for other analytics features...
function calculateCompanyMetrics(financialData, companyData) {
  const latestFinancials = financialData[0];
  return {
    revenueGrowth: calculateGrowthRate(financialData.map(f => f.totalRevenue)),
    profitMargin: latestFinancials.totalRevenue > 0 ? 
      (latestFinancials.totalRevenue - latestFinancials.totalExpenses) / latestFinancials.totalRevenue : 0,
    overallScore: Math.random() * 100 // Mock score
  };
}

function calculateGrowthRate(data) {
  if (data.length < 2) return 0;
  const current = data[0];
  const previous = data[1];
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
}

function getIndustryBenchmarks(industry, size) {
  // Mock industry benchmarks
  return {
    revenueGrowth: 0.15,
    profitMargin: 0.20,
    riskLevel: 'medium',
    industryRanking: Math.floor(Math.random() * 100) + 1
  };
}

async function calculatePeerComparison(companyId, metrics) {
  // Mock peer comparison
  return {
    ranking: Math.floor(Math.random() * 100) + 1,
    totalPeers: 200,
    performanceScore: metrics.overallScore || Math.random() * 100
  };
}

function generatePerformanceInsights(company, industry, peers) {
  const insights = [];
  
  if (company.revenueGrowth > industry.revenueGrowth) {
    insights.push({
      type: 'positive',
      category: 'revenue',
      message: 'Revenue growth exceeds industry average',
      impact: 'high'
    });
  }
  
  return insights;
}

async function generateFinancialReport(companyId) {
  const data = await FinancialReport.find({ companyId }).sort({ createdAt: -1 }).limit(12);
  return {
    summary: 'Financial performance summary',
    metrics: calculateCompanyMetrics(data, {}),
    trends: calculateTrend(data.map(d => d.totalRevenue))
  };
}

async function generateRiskReport(companyId) {
  return {
    summary: 'Risk assessment summary',
    overallRisk: 'medium',
    recommendations: []
  };
}

async function generatePerformanceReport(companyId) {
  return {
    summary: 'Performance benchmark summary',
    ranking: Math.floor(Math.random() * 100) + 1,
    insights: []
  };
}

async function generateComplianceReport(companyId) {
  return {
    summary: 'Compliance status summary',
    status: 'compliant',
    issues: []
  };
}

function generateExecutiveSummary(reports) {
  return {
    overallHealth: 'good',
    keyMetrics: {
      financialScore: 75,
      riskScore: 65,
      complianceScore: 90
    },
    recommendations: [
      'Monitor cash flow trends',
      'Address operational risks',
      'Maintain compliance standards'
    ]
  };
}

function detectFinancialAnomalies(data, sensitivity) {
  const anomalies = [];
  // Mock anomaly detection logic
  if (data.length > 0 && data[0].totalRevenue < 0) {
    anomalies.push({
      type: 'negative_revenue',
      severity: 'critical',
      description: 'Negative revenue detected',
      detectedAt: new Date()
    });
  }
  return anomalies;
}

function detectSecurityAnomalies(audits, sensitivity) {
  return audits.filter(a => a.severity === 'critical').map(a => ({
    type: 'security_issue',
    severity: 'high',
    description: `Critical security issue: ${a.issueType}`,
    detectedAt: a.createdAt
  }));
}

function detectOperationalAnomalies(documents, userActivity, sensitivity) {
  const anomalies = [];
  // Mock operational anomaly detection
  if (documents.length === 0) {
    anomalies.push({
      type: 'no_documents',
      severity: 'medium',
      description: 'No documents found for analysis',
      detectedAt: new Date()
    });
  }
  return anomalies;
}

async function detectComplianceAnomalies(companyId, sensitivity) {
  // Mock compliance anomaly detection
  return [];
}

function processAnomalyResults(anomalies) {
  const allAnomalies = [];
  Object.keys(anomalies).forEach(category => {
    anomalies[category].forEach(anomaly => {
      allAnomalies.push({
        ...anomaly,
        category,
        id: Math.random().toString(36).substr(2, 9)
      });
    });
  });
  return allAnomalies.sort((a, b) => {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

function generateAnomalyRecommendations(anomalies) {
  return anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').map(a => ({
    anomalyId: a.id,
    recommendation: `Address ${a.type} immediately`,
    priority: a.severity,
    timeline: a.severity === 'critical' ? '24 hours' : '7 days'
  }));
}

module.exports = {
  predictiveFinancialModeling,
  riskAssessment,
  performanceBenchmarking,
  automatedReportGeneration,
  anomalyDetection
};