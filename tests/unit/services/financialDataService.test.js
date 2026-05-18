/**
 * Unit Tests for FinancialDataService
 *
 * Tests data import/export, validation, formatting, and error handling.
 * All filesystem and model dependencies are mocked.
 */

// Mock fs before requiring the service
jest.mock('fs');
jest.mock('csv-parser', () => jest.fn());
jest.mock('csv-parse', () => ({ parse: jest.fn() }));
jest.mock('csv-stringify', () => ({ stringify: jest.fn() }));
jest.mock('../../../middleware/securityAuditLogger', () => ({
  securityLogger: {
    logAuditEvent: jest.fn(),
    logSecurityEvent: jest.fn()
  }
}));
jest.mock('../../../models/Company', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/financialReport', () => {
  const MockReport = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  return MockReport;
});
jest.mock('../../../models/SPV', () => ({
  find: jest.fn()
}));
jest.mock('../../../models/Transaction', () => {
  const MockTransaction = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
  });
  MockTransaction.find = jest.fn();
  return MockTransaction;
});

const fs = require('fs');
const { stringify } = require('csv-stringify');
const { securityLogger } = require('../../../middleware/securityAuditLogger');
const Company = require('../../../models/Company');
const FinancialReport = require('../../../models/financialReport');
const SPV = require('../../../models/SPV');
const Transaction = require('../../../models/Transaction');

// Require service AFTER all mocks are set up
const financialDataService = require('../../../services/financialDataService');

describe('FinancialDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Constructor / initial state
  // ---------------------------------------------------------------------------
  describe('constructor', () => {
    it('exposes supported formats array', () => {
      expect(financialDataService.supportedFormats).toEqual(['csv', 'json', 'xlsx']);
    });

    it('exposes importValidationRules with required fields', () => {
      const rules = financialDataService.importValidationRules;
      expect(rules.requiredFields).toContain('date');
      expect(rules.requiredFields).toContain('amount');
      expect(rules.requiredFields).toContain('type');
    });

    it('exposes numericFields in validation rules', () => {
      expect(financialDataService.importValidationRules.numericFields).toContain('amount');
    });

    it('exposes dateFields in validation rules', () => {
      expect(financialDataService.importValidationRules.dateFields).toContain('date');
    });
  });

  // ---------------------------------------------------------------------------
  // validateImportFile
  // ---------------------------------------------------------------------------
  describe('validateImportFile', () => {
    it('throws when file does not exist', async () => {
      fs.existsSync.mockReturnValue(false);

      await expect(
        financialDataService.validateImportFile('/tmp/nonexistent.csv', 'csv')
      ).rejects.toThrow('Import file not found');
    });

    it('throws when file exceeds 50MB', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 51 * 1024 * 1024 });

      await expect(
        financialDataService.validateImportFile('/tmp/huge.csv', 'csv')
      ).rejects.toThrow('Import file too large');
    });

    it('throws when file extension does not match format', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 100 });

      await expect(
        financialDataService.validateImportFile('/tmp/data.json', 'csv')
      ).rejects.toThrow('File extension');
    });

    it('resolves true for valid csv file', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 1024 });

      const result = await financialDataService.validateImportFile('/tmp/data.csv', 'csv');
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // validateRecord
  // ---------------------------------------------------------------------------
  describe('validateRecord', () => {
    it('returns isValid false when required fields are missing', () => {
      const record = { type: 'income' }; // missing date and amount
      const result = financialDataService.validateRecord(record, 'transactions', 1);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('returns isValid true for a complete valid transaction record', () => {
      const record = {
        date: '2024-01-15',
        amount: '500.00',
        type: 'income',
        description: 'Revenue'
      };
      const result = financialDataService.validateRecord(record, 'transactions', 1);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('coerces numeric fields to numbers', () => {
      const record = { date: '2024-01-15', amount: '1234.56', type: 'income' };
      const result = financialDataService.validateRecord(record, 'transactions', 1);

      expect(result.cleanedRecord.amount).toBe(1234.56);
    });

    it('coerces date fields to Date objects', () => {
      const record = { date: '2024-01-15', amount: '100', type: 'income' };
      const result = financialDataService.validateRecord(record, 'transactions', 1);

      expect(result.cleanedRecord.date).toBeInstanceOf(Date);
    });

    it('adds error for invalid numeric value', () => {
      const record = { date: '2024-01-15', amount: 'not-a-number', type: 'income' };
      const result = financialDataService.validateRecord(record, 'transactions', 1);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('amount'))).toBe(true);
    });

    it('adds error for invalid date value', () => {
      const record = { date: 'not-a-date', amount: '100', type: 'income' };
      const result = financialDataService.validateRecord(record, 'transactions', 1);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('date'))).toBe(true);
    });

    it('adds error for invalid transaction type', () => {
      const record = { date: '2024-01-15', amount: '100', type: 'INVALID_TYPE' };
      const result = financialDataService.validateRecord(record, 'transactions', 1);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid transaction type'))).toBe(true);
    });

    it('accepts valid transaction types', () => {
      ['income', 'expense', 'transfer', 'investment'].forEach(type => {
        const record = { date: '2024-01-15', amount: '100', type };
        const result = financialDataService.validateRecord(record, 'transactions', 1);
        expect(result.errors.some(e => e.includes('Invalid transaction type'))).toBe(false);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // validateImportData
  // ---------------------------------------------------------------------------
  describe('validateImportData', () => {
    it('throws when data is not an array', async () => {
      await expect(
        financialDataService.validateImportData(null, 'transactions')
      ).rejects.toThrow('non-empty array');
    });

    it('throws when data is an empty array', async () => {
      await expect(
        financialDataService.validateImportData([], 'transactions')
      ).rejects.toThrow('non-empty array');
    });

    it('throws when all records fail validation', async () => {
      const allInvalid = [
        { description: 'no required fields' },
        { description: 'also no required fields' }
      ];
      await expect(
        financialDataService.validateImportData(allInvalid, 'transactions')
      ).rejects.toThrow('All records failed validation');
    });

    it('returns validData and error summary for mixed input', async () => {
      const records = [
        { date: '2024-01-15', amount: '100', type: 'income' }, // valid
        { description: 'missing required fields' }              // invalid
      ];
      const result = await financialDataService.validateImportData(records, 'transactions');

      expect(result.validData).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.totalRecords).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // parseJsonFile
  // ---------------------------------------------------------------------------
  describe('parseJsonFile', () => {
    it('parses a JSON file and returns the parsed object', async () => {
      const data = [{ date: '2024-01-01', amount: 100, type: 'income' }];
      fs.readFileSync.mockReturnValue(JSON.stringify(data));

      const result = await financialDataService.parseJsonFile('/tmp/data.json');

      expect(result).toEqual(data);
    });

    it('throws when file contains invalid JSON', async () => {
      fs.readFileSync.mockReturnValue('{ invalid json }');

      await expect(
        financialDataService.parseJsonFile('/tmp/bad.json')
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // parseExcelFile
  // ---------------------------------------------------------------------------
  describe('parseExcelFile', () => {
    it('returns empty array (not implemented)', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = await financialDataService.parseExcelFile('/tmp/data.xlsx');

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // importTransactions
  // ---------------------------------------------------------------------------
  describe('importTransactions', () => {
    it('saves each valid transaction and returns a result summary', async () => {
      const validatedData = {
        validData: [
          { date: new Date(), amount: 100, type: 'income' },
          { date: new Date(), amount: 200, type: 'expense' }
        ],
        errors: [],
        totalRecords: 2
      };

      const result = await financialDataService.importTransactions(validatedData, 'company-123');

      expect(result.recordsProcessed).toBe(2);
      expect(result.recordsSuccessful).toBe(2);
      expect(result.recordsFailed).toBe(0);
      expect(result.importedRecords).toHaveLength(2);
    });

    it('increments recordsFailed when Transaction.save throws', async () => {
      Transaction.mockImplementationOnce(function (data) {
        Object.assign(this, data);
        this.save = jest.fn().mockRejectedValue(new Error('DB error'));
      });

      const validatedData = {
        validData: [{ date: new Date(), amount: 100, type: 'income' }],
        errors: [],
        totalRecords: 1
      };

      const result = await financialDataService.importTransactions(validatedData, 'company-123');

      expect(result.recordsFailed).toBe(1);
      expect(result.recordsSuccessful).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // importFinancialReports
  // ---------------------------------------------------------------------------
  describe('importFinancialReports', () => {
    it('saves each valid report and returns a result summary', async () => {
      const validatedData = {
        validData: [
          { period: '2024-Q1', revenue: 1000000, expenses: 750000 }
        ],
        errors: [],
        totalRecords: 1
      };

      const result = await financialDataService.importFinancialReports(validatedData, 'company-abc');

      expect(result.recordsSuccessful).toBe(1);
      expect(result.recordsFailed).toBe(0);
    });

    it('counts pre-validation errors in recordsFailed', async () => {
      const validatedData = {
        validData: [],
        errors: ['Row 1 error', 'Row 2 error'],
        totalRecords: 2
      };

      const result = await financialDataService.importFinancialReports(validatedData, 'company-abc');

      expect(result.recordsFailed).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // importSPVData / importChartOfAccounts
  // ---------------------------------------------------------------------------
  describe('importSPVData', () => {
    it('returns a result object without processing (stub)', async () => {
      const validatedData = { validData: [], errors: [], totalRecords: 0 };
      const result = await financialDataService.importSPVData(validatedData, 'company-xyz');

      expect(result).toHaveProperty('recordsProcessed');
      expect(result).toHaveProperty('recordsSuccessful');
    });
  });

  describe('importChartOfAccounts', () => {
    it('returns a result object without processing (stub)', async () => {
      const validatedData = { validData: [], errors: [], totalRecords: 0 };
      const result = await financialDataService.importChartOfAccounts(validatedData, 'company-xyz');

      expect(result).toHaveProperty('recordsProcessed');
    });
  });

  // ---------------------------------------------------------------------------
  // formatDataAsJson
  // ---------------------------------------------------------------------------
  describe('formatDataAsJson', () => {
    it('returns a JSON string with exportType and data', async () => {
      const data = [{ id: 1, amount: 100 }];
      const output = await financialDataService.formatDataAsJson(data, 'transactions');
      const parsed = JSON.parse(output);

      expect(parsed.exportType).toBe('transactions');
      expect(parsed.data).toEqual(data);
      expect(parsed.recordCount).toBe(1);
      expect(parsed.exportDate).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // formatDataAsExcel / formatDataAsPdf (not implemented)
  // ---------------------------------------------------------------------------
  describe('formatDataAsExcel', () => {
    it('throws an error since Excel export is not implemented', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        financialDataService.formatDataAsExcel([], 'transactions')
      ).rejects.toThrow('Excel export not available');

      consoleSpy.mockRestore();
    });
  });

  describe('formatDataAsPdf', () => {
    it('throws an error since PDF export is not implemented', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        financialDataService.formatDataAsPdf([], 'transactions')
      ).rejects.toThrow('PDF export not available');

      consoleSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // buildMongoFilter
  // ---------------------------------------------------------------------------
  describe('buildMongoFilter', () => {
    it('returns an empty filter when query is empty', () => {
      const filter = financialDataService.buildMongoFilter({});
      expect(filter).toEqual({});
    });

    it('includes companyId when provided', () => {
      const filter = financialDataService.buildMongoFilter({ companyId: 'co-1' });
      expect(filter.companyId).toBe('co-1');
    });

    it('builds date range filter with startDate and endDate', () => {
      const filter = financialDataService.buildMongoFilter({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
      expect(filter.date.$gte).toBeInstanceOf(Date);
      expect(filter.date.$lte).toBeInstanceOf(Date);
    });

    it('builds date filter with only startDate', () => {
      const filter = financialDataService.buildMongoFilter({ startDate: '2024-01-01' });
      expect(filter.date.$gte).toBeInstanceOf(Date);
      expect(filter.date.$lte).toBeUndefined();
    });

    it('includes type filter when provided', () => {
      const filter = financialDataService.buildMongoFilter({ type: 'income' });
      expect(filter.type).toBe('income');
    });

    it('includes status filter when provided', () => {
      const filter = financialDataService.buildMongoFilter({ status: 'active' });
      expect(filter.status).toBe('active');
    });
  });

  // ---------------------------------------------------------------------------
  // getExportColumns
  // ---------------------------------------------------------------------------
  describe('getExportColumns', () => {
    it('returns transaction columns for transactions export type', () => {
      const columns = financialDataService.getExportColumns('transactions');
      expect(columns).toContain('date');
      expect(columns).toContain('amount');
      expect(columns).toContain('type');
    });

    it('returns financial report columns for financial_reports export type', () => {
      const columns = financialDataService.getExportColumns('financial_reports');
      expect(columns).toContain('revenue');
      expect(columns).toContain('expenses');
      expect(columns).toContain('netIncome');
    });

    it('returns SPV performance columns for spv_performance export type', () => {
      const columns = financialDataService.getExportColumns('spv_performance');
      expect(columns).toContain('irr');
      expect(columns).toContain('multiple');
    });
  });

  // ---------------------------------------------------------------------------
  // calculateSPVPerformance
  // ---------------------------------------------------------------------------
  describe('calculateSPVPerformance', () => {
    it('returns performance metrics object', () => {
      const spv = { totalCapital: 1000000, currentValue: 1200000 };
      const metrics = financialDataService.calculateSPVPerformance(spv);

      expect(metrics).toHaveProperty('totalInvestment');
      expect(metrics).toHaveProperty('currentValue');
      expect(metrics).toHaveProperty('irr');
      expect(metrics).toHaveProperty('multiple');
    });

    it('uses 0 as default when totalCapital is missing', () => {
      const metrics = financialDataService.calculateSPVPerformance({});
      expect(metrics.totalInvestment).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // sanitizeQueryForLogging
  // ---------------------------------------------------------------------------
  describe('sanitizeQueryForLogging', () => {
    it('removes password from query', () => {
      const sanitized = financialDataService.sanitizeQueryForLogging({
        companyId: 'co-1',
        password: 'secret'
      });
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.companyId).toBe('co-1');
    });

    it('removes token from query', () => {
      const sanitized = financialDataService.sanitizeQueryForLogging({ token: 'abc123' });
      expect(sanitized.token).toBeUndefined();
    });

    it('removes secret from query', () => {
      const sanitized = financialDataService.sanitizeQueryForLogging({ secret: 'mysecret' });
      expect(sanitized.secret).toBeUndefined();
    });

    it('does not mutate the original query', () => {
      const original = { token: 'tok', companyId: 'co-1' };
      financialDataService.sanitizeQueryForLogging(original);
      expect(original.token).toBe('tok');
    });
  });

  // ---------------------------------------------------------------------------
  // validateExportPermissions
  // ---------------------------------------------------------------------------
  describe('validateExportPermissions', () => {
    it('returns true (placeholder implementation)', async () => {
      const result = await financialDataService.validateExportPermissions(
        'user-1', 'transactions', {}
      );
      expect(result).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // generateImportTemplate
  // ---------------------------------------------------------------------------
  describe('generateImportTemplate', () => {
    it('throws for unsupported import types', () => {
      expect(() =>
        financialDataService.generateImportTemplate('unknown_type', 'json')
      ).toThrow('No template available for import type: unknown_type');
    });

    it('returns template object for JSON format', () => {
      const template = financialDataService.generateImportTemplate('transactions', 'json');
      expect(template).toBeDefined();
      expect(template.columns).toBeDefined();
      expect(template.sampleData).toBeDefined();
    });

    it('returns template object for financial_reports in JSON format', () => {
      const template = financialDataService.generateImportTemplate('financial_reports', 'json');
      expect(template.columns).toContain('revenue');
    });
  });

  // ---------------------------------------------------------------------------
  // exportFinancialData — error path (logs security event on failure)
  // ---------------------------------------------------------------------------
  describe('exportFinancialData', () => {
    it('logs security event and rethrows on unsupported export type', async () => {
      await expect(
        financialDataService.exportFinancialData({}, 'json', {
          userId: 'user-1',
          exportType: 'unsupported_type'
        })
      ).rejects.toThrow('Unsupported export type');

      expect(securityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'data.export_failure',
        'medium',
        expect.objectContaining({ error: 'Unsupported export type: unsupported_type' }),
        expect.any(Object)
      );
    });

    it('logs security event and rethrows on unsupported export format', async () => {
      Transaction.find = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      });

      await expect(
        financialDataService.exportFinancialData({}, 'unsupported_format', {
          userId: 'user-1',
          exportType: 'transactions'
        })
      ).rejects.toThrow('Unsupported export format');
    });
  });

  // ---------------------------------------------------------------------------
  // importFinancialData — error path
  // ---------------------------------------------------------------------------
  describe('importFinancialData', () => {
    it('throws on unsupported format and logs security event', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 100 });

      await expect(
        financialDataService.importFinancialData('/tmp/data.bad', 'bad', {
          userId: 'user-1'
        })
      ).rejects.toThrow();

      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });

    it('throws on unsupported import type and logs security event', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 100 });
      fs.readFileSync.mockReturnValue(
        JSON.stringify([{ date: '2024-01-01', amount: 100, type: 'income' }])
      );

      await expect(
        financialDataService.importFinancialData('/tmp/data.json', 'json', {
          userId: 'user-1',
          importType: 'unsupported_import_type'
        })
      ).rejects.toThrow('Unsupported import type');

      expect(securityLogger.logSecurityEvent).toHaveBeenCalled();
    });
  });
});
