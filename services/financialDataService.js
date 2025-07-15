/**
 * Financial Data Import/Export Service
 * 
 * [Feature] OCDI-201: Implement financial data import/export
 * 
 * This service handles importing and exporting financial data in various formats
 * including CSV, Excel, JSON, and integration with external accounting systems.
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');
const { securityLogger } = require('../middleware/securityAuditLogger');

// Import data models
const Company = require('../models/Company');
const FinancialReport = require('../models/financialReport');
const SPV = require('../models/SPV');
const Transaction = require('../models/Transaction');

class FinancialDataService {
  constructor() {
    this.supportedFormats = ['csv', 'json', 'xlsx'];
    this.importValidationRules = {
      requiredFields: ['date', 'amount', 'type'],
      numericFields: ['amount', 'quantity', 'price'],
      dateFields: ['date', 'transactionDate', 'settlementDate']
    };
  }

  /**
   * Import financial data from various formats
   */
  async importFinancialData(filePath, format, options = {}) {
    const { companyId, userId, importType = 'transactions' } = options;
    
    try {
      // Log import attempt
      securityLogger.logAuditEvent(
        'data.import_request',
        {
          action: 'financial_data_import',
          filePath: path.basename(filePath),
          format,
          importType,
          companyId
        },
        { user: { id: userId } }
      );

      // Validate file
      await this.validateImportFile(filePath, format);
      
      // Parse data based on format
      let rawData;
      switch (format.toLowerCase()) {
        case 'csv':
          rawData = await this.parseCsvFile(filePath);
          break;
        case 'json':
          rawData = await this.parseJsonFile(filePath);
          break;
        case 'xlsx':
          rawData = await this.parseExcelFile(filePath);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Validate and clean data
      const validatedData = await this.validateImportData(rawData, importType);
      
      // Process import based on type
      let importResult;
      switch (importType) {
        case 'transactions':
          importResult = await this.importTransactions(validatedData, companyId);
          break;
        case 'financial_reports':
          importResult = await this.importFinancialReports(validatedData, companyId);
          break;
        case 'spv_data':
          importResult = await this.importSPVData(validatedData, companyId);
          break;
        case 'chart_of_accounts':
          importResult = await this.importChartOfAccounts(validatedData, companyId);
          break;
        default:
          throw new Error(`Unsupported import type: ${importType}`);
      }

      // Log successful import
      securityLogger.logAuditEvent(
        'data.import_success',
        {
          action: 'financial_data_imported',
          recordsProcessed: importResult.recordsProcessed,
          recordsSuccessful: importResult.recordsSuccessful,
          recordsFailed: importResult.recordsFailed,
          importType
        },
        { user: { id: userId } }
      );

      return importResult;

    } catch (error) {
      // Log import failure
      securityLogger.logSecurityEvent(
        'data.import_failure',
        'medium',
        {
          action: 'financial_data_import_failed',
          error: error.message,
          filePath: path.basename(filePath),
          format,
          importType
        },
        { user: { id: userId } }
      );

      throw error;
    }
  }

  /**
   * Export financial data to various formats
   */
  async exportFinancialData(query, format, options = {}) {
    const { userId, exportType = 'transactions' } = options;
    
    try {
      // Log export attempt
      securityLogger.logAuditEvent(
        'data.export_request',
        {
          action: 'financial_data_export',
          exportType,
          format,
          query: this.sanitizeQueryForLogging(query)
        },
        { user: { id: userId } }
      );

      // Fetch data based on export type
      let data;
      switch (exportType) {
        case 'transactions':
          data = await this.fetchTransactionsForExport(query);
          break;
        case 'financial_reports':
          data = await this.fetchFinancialReportsForExport(query);
          break;
        case 'spv_performance':
          data = await this.fetchSPVPerformanceForExport(query);
          break;
        case 'compliance_report':
          data = await this.generateComplianceReport(query);
          break;
        default:
          throw new Error(`Unsupported export type: ${exportType}`);
      }

      // Format data for export
      let exportedData;
      switch (format.toLowerCase()) {
        case 'csv':
          exportedData = await this.formatDataAsCsv(data, exportType);
          break;
        case 'json':
          exportedData = await this.formatDataAsJson(data, exportType);
          break;
        case 'xlsx':
          exportedData = await this.formatDataAsExcel(data, exportType);
          break;
        case 'pdf':
          exportedData = await this.formatDataAsPdf(data, exportType);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Log successful export
      securityLogger.logAuditEvent(
        'data.export_success',
        {
          action: 'financial_data_exported',
          recordCount: data.length,
          exportType,
          format
        },
        { user: { id: userId } }
      );

      return exportedData;

    } catch (error) {
      // Log export failure
      securityLogger.logSecurityEvent(
        'data.export_failure',
        'medium',
        {
          action: 'financial_data_export_failed',
          error: error.message,
          exportType,
          format
        },
        { user: { id: userId } }
      );

      throw error;
    }
  }

  /**
   * Parse CSV file
   */
  async parseCsvFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  /**
   * Parse JSON file
   */
  async parseJsonFile(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  }

  /**
   * Parse Excel file (placeholder - would need xlsx library)
   */
  async parseExcelFile(filePath) {
    // This would require installing xlsx library
    // For now, return empty array as placeholder
    console.warn('Excel parsing not implemented - install xlsx library');
    return [];
  }

  /**
   * Validate import file
   */
  async validateImportFile(filePath, format) {
    if (!fs.existsSync(filePath)) {
      throw new Error('Import file not found');
    }

    const stats = fs.statSync(filePath);
    
    // Check file size (max 50MB)
    if (stats.size > 50 * 1024 * 1024) {
      throw new Error('Import file too large (max 50MB)');
    }

    // Check file extension
    const fileExtension = path.extname(filePath).toLowerCase().slice(1);
    if (fileExtension !== format.toLowerCase()) {
      throw new Error(`File extension .${fileExtension} does not match format ${format}`);
    }

    return true;
  }

  /**
   * Validate import data
   */
  async validateImportData(data, importType) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Import data must be a non-empty array');
    }

    const validatedData = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const validation = this.validateRecord(record, importType, i + 1);
      
      if (validation.isValid) {
        validatedData.push(validation.cleanedRecord);
      } else {
        errors.push(validation.errors);
      }
    }

    if (errors.length > 0 && errors.length === data.length) {
      throw new Error(`All records failed validation: ${JSON.stringify(errors.slice(0, 5))}`);
    }

    return {
      validData: validatedData,
      errors: errors,
      totalRecords: data.length,
      validRecords: validatedData.length
    };
  }

  /**
   * Validate individual record
   */
  validateRecord(record, importType, rowNumber) {
    const errors = [];
    const cleanedRecord = { ...record };

    // Check required fields
    this.importValidationRules.requiredFields.forEach(field => {
      if (!record[field] || record[field] === '') {
        errors.push(`Row ${rowNumber}: Missing required field '${field}'`);
      }
    });

    // Validate numeric fields
    this.importValidationRules.numericFields.forEach(field => {
      if (record[field] !== undefined && record[field] !== '') {
        const numValue = parseFloat(record[field]);
        if (isNaN(numValue)) {
          errors.push(`Row ${rowNumber}: Field '${field}' must be numeric`);
        } else {
          cleanedRecord[field] = numValue;
        }
      }
    });

    // Validate date fields
    this.importValidationRules.dateFields.forEach(field => {
      if (record[field] && record[field] !== '') {
        const date = new Date(record[field]);
        if (isNaN(date.getTime())) {
          errors.push(`Row ${rowNumber}: Field '${field}' must be a valid date`);
        } else {
          cleanedRecord[field] = date;
        }
      }
    });

    // Type-specific validations
    if (importType === 'transactions') {
      if (record.type && !['income', 'expense', 'transfer', 'investment'].includes(record.type)) {
        errors.push(`Row ${rowNumber}: Invalid transaction type '${record.type}'`);
      }
    }

    return {
      isValid: errors.length === 0,
      cleanedRecord,
      errors
    };
  }

  /**
   * Import transactions
   */
  async importTransactions(validatedData, companyId) {
    const { validData, errors } = validatedData;
    const results = {
      recordsProcessed: validatedData.totalRecords,
      recordsSuccessful: 0,
      recordsFailed: errors.length,
      importedRecords: [],
      errors: errors
    };

    for (const transactionData of validData) {
      try {
        const transaction = new Transaction({
          ...transactionData,
          companyId,
          importedAt: new Date(),
          source: 'import'
        });

        await transaction.save();
        results.importedRecords.push(transaction);
        results.recordsSuccessful++;

      } catch (error) {
        results.recordsFailed++;
        results.errors.push(`Failed to save transaction: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Import financial reports
   */
  async importFinancialReports(validatedData, companyId) {
    const { validData, errors } = validatedData;
    const results = {
      recordsProcessed: validatedData.totalRecords,
      recordsSuccessful: 0,
      recordsFailed: errors.length,
      importedRecords: [],
      errors: errors
    };

    for (const reportData of validData) {
      try {
        const report = new FinancialReport({
          ...reportData,
          companyId,
          importedAt: new Date(),
          source: 'import'
        });

        await report.save();
        results.importedRecords.push(report);
        results.recordsSuccessful++;

      } catch (error) {
        results.recordsFailed++;
        results.errors.push(`Failed to save financial report: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Import SPV data
   */
  async importSPVData(validatedData, companyId) {
    // Implementation for SPV data import
    const { validData, errors } = validatedData;
    const results = {
      recordsProcessed: validatedData.totalRecords,
      recordsSuccessful: 0,
      recordsFailed: errors.length,
      importedRecords: [],
      errors: errors
    };

    // Implementation would go here
    return results;
  }

  /**
   * Import chart of accounts
   */
  async importChartOfAccounts(validatedData, companyId) {
    // Implementation for chart of accounts import
    const { validData, errors } = validatedData;
    const results = {
      recordsProcessed: validatedData.totalRecords,
      recordsSuccessful: 0,
      recordsFailed: errors.length,
      importedRecords: [],
      errors: errors
    };

    // Implementation would go here
    return results;
  }

  /**
   * Fetch transactions for export
   */
  async fetchTransactionsForExport(query) {
    const filter = this.buildMongoFilter(query);
    return await Transaction.find(filter)
      .populate('companyId', 'name')
      .sort({ date: -1 })
      .limit(query.limit || 10000);
  }

  /**
   * Fetch financial reports for export
   */
  async fetchFinancialReportsForExport(query) {
    const filter = this.buildMongoFilter(query);
    return await FinancialReport.find(filter)
      .populate('companyId', 'name')
      .sort({ period: -1 })
      .limit(query.limit || 1000);
  }

  /**
   * Fetch SPV performance for export
   */
  async fetchSPVPerformanceForExport(query) {
    const filter = this.buildMongoFilter(query);
    const spvs = await SPV.find(filter)
      .populate('assets')
      .populate('investors')
      .limit(query.limit || 1000);

    // Calculate performance metrics
    return spvs.map(spv => ({
      ...spv.toObject(),
      performanceMetrics: this.calculateSPVPerformance(spv)
    }));
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(query) {
    // This would generate a comprehensive compliance report
    // Implementation would depend on specific compliance requirements
    
    const companies = await Company.find(query.companyFilter || {});
    const reports = [];

    for (const company of companies) {
      const complianceData = {
        companyId: company._id,
        companyName: company.name,
        reportDate: new Date(),
        // Add compliance metrics here
      };
      
      reports.push(complianceData);
    }

    return reports;
  }

  /**
   * Format data as CSV
   */
  async formatDataAsCsv(data, exportType) {
    return new Promise((resolve, reject) => {
      const columns = this.getExportColumns(exportType);
      
      stringify(data, {
        header: true,
        columns: columns
      }, (err, output) => {
        if (err) reject(err);
        else resolve(output);
      });
    });
  }

  /**
   * Format data as JSON
   */
  async formatDataAsJson(data, exportType) {
    return JSON.stringify({
      exportType,
      exportDate: new Date().toISOString(),
      recordCount: data.length,
      data: data
    }, null, 2);
  }

  /**
   * Format data as Excel (placeholder)
   */
  async formatDataAsExcel(data, exportType) {
    // Would require xlsx library
    console.warn('Excel export not implemented - install xlsx library');
    throw new Error('Excel export not available');
  }

  /**
   * Format data as PDF (placeholder)
   */
  async formatDataAsPdf(data, exportType) {
    // Would require pdf generation library
    console.warn('PDF export not implemented - install pdf library');
    throw new Error('PDF export not available');
  }

  /**
   * Build MongoDB filter from query parameters
   */
  buildMongoFilter(query) {
    const filter = {};

    if (query.companyId) {
      filter.companyId = query.companyId;
    }

    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.date.$lte = new Date(query.endDate);
      }
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    return filter;
  }

  /**
   * Get export columns based on export type
   */
  getExportColumns(exportType) {
    switch (exportType) {
      case 'transactions':
        return ['date', 'description', 'amount', 'type', 'category', 'account'];
      case 'financial_reports':
        return ['period', 'revenue', 'expenses', 'netIncome', 'assets', 'liabilities', 'equity'];
      case 'spv_performance':
        return ['name', 'totalCapital', 'currentValue', 'totalReturn', 'irr', 'multiple'];
      default:
        return Object.keys(data[0] || {});
    }
  }

  /**
   * Calculate SPV performance metrics
   */
  calculateSPVPerformance(spv) {
    // Placeholder for SPV performance calculation
    return {
      totalInvestment: spv.totalCapital || 0,
      currentValue: spv.currentValue || 0,
      totalReturn: 0,
      irr: 0,
      multiple: 1
    };
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  sanitizeQueryForLogging(query) {
    const sanitized = { ...query };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }

  /**
   * Validate export permissions
   */
  async validateExportPermissions(userId, exportType, query) {
    // Check if user has permission to export this type of data
    // Implementation would depend on RBAC system
    return true; // Placeholder
  }

  /**
   * Get import template for specific type
   */
  generateImportTemplate(importType, format = 'csv') {
    const templates = {
      transactions: {
        columns: ['date', 'description', 'amount', 'type', 'category', 'account'],
        sampleData: [
          {
            date: '2024-01-15',
            description: 'Office supplies',
            amount: -250.00,
            type: 'expense',
            category: 'Office',
            account: 'Operating Account'
          }
        ]
      },
      financial_reports: {
        columns: ['period', 'revenue', 'expenses', 'netIncome', 'assets', 'liabilities', 'equity'],
        sampleData: [
          {
            period: '2024-Q1',
            revenue: 1000000,
            expenses: 750000,
            netIncome: 250000,
            assets: 2000000,
            liabilities: 500000,
            equity: 1500000
          }
        ]
      }
    };

    const template = templates[importType];
    if (!template) {
      throw new Error(`No template available for import type: ${importType}`);
    }

    if (format === 'csv') {
      return this.formatDataAsCsv(template.sampleData, importType);
    } else {
      return template;
    }
  }
}

module.exports = new FinancialDataService();