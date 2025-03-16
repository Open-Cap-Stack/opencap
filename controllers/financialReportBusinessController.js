// controllers/financialReportBusinessController.js

const calculateFinancialMetrics = (reportData) => {
    try {
      const revenue = Number(reportData.TotalRevenue);
      const expenses = Number(reportData.TotalExpenses);
      const reportedNetIncome = Number(reportData.NetIncome);
  
      // For very large numbers, use a tolerance for floating point arithmetic
      const calculatedNetIncome = revenue - expenses;
      const tolerance = Math.max(Math.abs(calculatedNetIncome), Math.abs(reportedNetIncome)) * 1e-10;
      const isValid = Math.abs(calculatedNetIncome - reportedNetIncome) <= tolerance;
  
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
        let hasAllQuarters = true;
        
        // More flexible validation to handle both object and Map structures
        if (Data.revenue instanceof Map) {
          hasAllQuarters = requiredQuarters.every(quarter => 
            Data.revenue.has(quarter) && Data.expenses.has(quarter)
          );
        } else {
          hasAllQuarters = requiredQuarters.every(quarter => 
            Data.revenue[quarter] !== undefined && 
            Data.expenses[quarter] !== undefined
          );
        }
  
        if (!hasAllQuarters) {
          return {
            isValid: false,
            error: 'Annual report must include data for all quarters'
          };
        }
      }
  
      if (Type === 'Quarterly') {
        let hasQuarterlyData = false;
        
        // Handle both object and Map structures
        if (Data.revenue instanceof Map && Data.expenses instanceof Map) {
          hasQuarterlyData = Data.revenue.size === 1 && Data.expenses.size === 1;
        } else {
          hasQuarterlyData = 
            Object.keys(Data.revenue).length === 1 && 
            Object.keys(Data.expenses).length === 1;
        }
  
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
  
      const missingFields = requiredFields.filter(field => reportData[field] === undefined);
      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }
  
      const financialFields = ['TotalRevenue', 'TotalExpenses', 'NetIncome'];
      const hasNegativeValues = financialFields.some(field => {
        const value = Number(reportData[field]);
        return isNaN(value) || value < 0;
      });
  
      if (hasNegativeValues) {
        return {
          isValid: false,
          error: 'Financial values cannot be negative or non-numeric'
        };
      }
  
      if (reportData.Data) {
        let hasNegativeQuarterlyData = false;
        
        // Handle both Map and regular object structures
        if (reportData.Data.revenue instanceof Map) {
          hasNegativeQuarterlyData = Array.from(reportData.Data.revenue.values()).some(v => v < 0) ||
                                     Array.from(reportData.Data.expenses.values()).some(v => v < 0);
        } else {
          hasNegativeQuarterlyData = Object.values(reportData.Data).some(category =>
            Object.values(category).some(value => value < 0)
          );
        }
  
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