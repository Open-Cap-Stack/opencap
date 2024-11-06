// controllers/financialReportBusinessController.js

const calculateFinancialMetrics = (reportData) => {
    try {
      const revenue = parseFloat(reportData.TotalRevenue);
      const expenses = parseFloat(reportData.TotalExpenses);
      const reportedNetIncome = parseFloat(reportData.NetIncome);
  
      const calculatedNetIncome = (revenue - expenses).toFixed(2);
      const isValid = calculatedNetIncome === reportedNetIncome.toFixed(2);
  
      return {
        isValid,
        calculatedNetIncome,
        error: isValid ? null : 'Net income does not match revenue minus expenses'
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Error calculating financial metrics'
      };
    }
  };
  
  const validateReportingPeriod = (reportData) => {
    try {
      const { Type, Data } = reportData;
  
      if (Type === 'Annual') {
        const requiredQuarters = ['q1', 'q2', 'q3', 'q4'];
        const hasAllQuarters = requiredQuarters.every(quarter => 
          Data.revenue[quarter] !== undefined && 
          Data.expenses[quarter] !== undefined
        );
  
        if (!hasAllQuarters) {
          return {
            isValid: false,
            error: 'Annual report must include data for all quarters'
          };
        }
      }
  
      if (Type === 'Quarterly') {
        const hasQuarterlyData = 
          Object.keys(Data.revenue).length === 1 && 
          Object.keys(Data.expenses).length === 1;
  
        if (!hasQuarterlyData) {
          return {
            isValid: false,
            error: 'Quarterly report must include data for exactly one quarter'
          };
        }
      }
  
      return {
        isValid: true,
        error: null
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Error validating reporting period'
      };
    }
  };
  
  const validateFinancialReport = (reportData) => {
    try {
      const requiredFields = [
        'ReportID', 
        'Type', 
        'Data', 
        'TotalRevenue',
        'TotalExpenses', 
        'NetIncome', 
        'Timestamp'
      ];
  
      const missingFields = requiredFields.filter(field => !reportData[field]);
      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }
  
      const financialFields = ['TotalRevenue', 'TotalExpenses', 'NetIncome'];
      const hasNegativeValues = financialFields.some(field => 
        parseFloat(reportData[field]) < 0
      );
  
      if (hasNegativeValues) {
        return {
          isValid: false,
          error: 'Financial values cannot be negative'
        };
      }
  
      if (reportData.Data) {
        const hasNegativeQuarterlyData = Object.values(reportData.Data).some(category =>
          Object.values(category).some(value => value < 0)
        );
  
        if (hasNegativeQuarterlyData) {
          return {
            isValid: false,
            error: 'Financial values cannot be negative'
          };
        }
      }
  
      const financialMetrics = calculateFinancialMetrics(reportData);
      if (!financialMetrics.isValid) return financialMetrics;
  
      const periodValidation = validateReportingPeriod(reportData);
      if (!periodValidation.isValid) return periodValidation;
  
      return {
        isValid: true,
        error: null
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Error validating financial report'
      };
    }
  };
  
  module.exports = {
    calculateFinancialMetrics,
    validateReportingPeriod,
    validateFinancialReport
  };