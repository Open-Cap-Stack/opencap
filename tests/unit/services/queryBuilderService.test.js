/**
 * QueryBuilderService Tests
 * Issue #197: Build Custom Report Builder Engine
 *
 * Test suite for dynamic query building including:
 * - Field validation and SQL injection prevention
 * - Value sanitization by data type
 * - Filter query construction
 * - Condition building for all operators
 * - Projection and sort building
 * - Query execution
 * - Report configuration validation
 */

const queryBuilderService = require('../../../services/queryBuilderService');

jest.mock('../../../services/zerodbService', () => ({
  queryTable: jest.fn().mockResolvedValue([])
}));

jest.mock('../../../models/ReportFilter', () => ({}));
jest.mock('../../../models/CustomReportField', () => ({
  find: jest.fn().mockReturnValue({
    sort: jest.fn().mockResolvedValue([])
  })
}));

const zeroDbService = require('../../../services/zerodbService');
const CustomReportField = require('../../../models/CustomReportField');

describe('QueryBuilderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateField', () => {
    it('should return true for valid field names', () => {
      expect(queryBuilderService.validateField('name', ['name', 'email'])).toBe(true);
      expect(queryBuilderService.validateField('email', ['name', 'email'])).toBe(true);
    });

    it('should return false for fields not in whitelist', () => {
      expect(queryBuilderService.validateField('password', ['name', 'email'])).toBe(false);
    });

    it('should return false for null or non-string fields', () => {
      expect(queryBuilderService.validateField(null, ['name'])).toBe(false);
      expect(queryBuilderService.validateField(123, ['name'])).toBe(false);
      expect(queryBuilderService.validateField('', ['name'])).toBe(false);
    });

    it('should reject SQL injection patterns', () => {
      expect(queryBuilderService.validateField('name; DROP TABLE', null)).toBe(false);
      expect(queryBuilderService.validateField('name--comment', null)).toBe(false);
      expect(queryBuilderService.validateField('UNION SELECT * FROM users', null)).toBe(false);
      expect(queryBuilderService.validateField('name/*comment*/', null)).toBe(false);
      expect(queryBuilderService.validateField('xp_cmdshell', null)).toBe(false);
      expect(queryBuilderService.validateField('exec(cmd)', null)).toBe(false);
      expect(queryBuilderService.validateField('INSERT INTO table', null)).toBe(false);
      expect(queryBuilderService.validateField('UPDATE table SET x', null)).toBe(false);
      expect(queryBuilderService.validateField('DELETE FROM table', null)).toBe(false);
      expect(queryBuilderService.validateField('DROP TABLE', null)).toBe(false);
      expect(queryBuilderService.validateField('CREATE TABLE', null)).toBe(false);
      expect(queryBuilderService.validateField('ALTER TABLE', null)).toBe(false);
      expect(queryBuilderService.validateField('<script>alert(1)</script>', null)).toBe(false);
    });

    it('should allow valid field without whitelist', () => {
      expect(queryBuilderService.validateField('companyName', null)).toBe(true);
      expect(queryBuilderService.validateField('total_amount', null)).toBe(true);
    });
  });

  describe('sanitizeValue', () => {
    it('should return null for null/undefined values', () => {
      expect(queryBuilderService.sanitizeValue(null, 'string')).toBeNull();
      expect(queryBuilderService.sanitizeValue(undefined, 'string')).toBeNull();
    });

    describe('number type', () => {
      it('should parse valid numbers', () => {
        expect(queryBuilderService.sanitizeValue('42', 'number')).toBe(42);
        expect(queryBuilderService.sanitizeValue(3.14, 'number')).toBe(3.14);
        expect(queryBuilderService.sanitizeValue('100.50', 'number')).toBe(100.50);
      });

      it('should throw for invalid numbers', () => {
        expect(() => queryBuilderService.sanitizeValue('not-a-number', 'number'))
          .toThrow('Invalid number value');
      });
    });

    describe('boolean type', () => {
      it('should handle boolean values', () => {
        expect(queryBuilderService.sanitizeValue(true, 'boolean')).toBe(true);
        expect(queryBuilderService.sanitizeValue(false, 'boolean')).toBe(false);
      });

      it('should parse string booleans', () => {
        expect(queryBuilderService.sanitizeValue('true', 'boolean')).toBe(true);
        expect(queryBuilderService.sanitizeValue('false', 'boolean')).toBe(false);
        expect(queryBuilderService.sanitizeValue('TRUE', 'boolean')).toBe(true);
      });

      it('should coerce other types', () => {
        expect(queryBuilderService.sanitizeValue(1, 'boolean')).toBe(true);
        expect(queryBuilderService.sanitizeValue(0, 'boolean')).toBe(false);
      });
    });

    describe('date type', () => {
      it('should parse valid dates', () => {
        const result = queryBuilderService.sanitizeValue('2026-06-15', 'date');
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2026);
      });

      it('should throw for invalid dates', () => {
        expect(() => queryBuilderService.sanitizeValue('not-a-date', 'date'))
          .toThrow('Invalid date value');
      });
    });

    describe('string type', () => {
      it('should strip dangerous characters', () => {
        const result = queryBuilderService.sanitizeValue("test'; DROP TABLE--", 'string');
        expect(result).not.toContain(';');
        expect(result).not.toContain("'");
      });

      it('should strip HTML tags', () => {
        const result = queryBuilderService.sanitizeValue('<script>alert(1)</script>', 'string');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
      });

      it('should trim whitespace', () => {
        expect(queryBuilderService.sanitizeValue('  hello  ', 'string')).toBe('hello');
      });
    });

    describe('array type', () => {
      it('should sanitize each element', () => {
        const result = queryBuilderService.sanitizeValue(['a', 'b', 'c'], 'array');
        expect(result).toEqual(['a', 'b', 'c']);
      });

      it('should throw for non-array values', () => {
        expect(() => queryBuilderService.sanitizeValue('not-array', 'array'))
          .toThrow('Value must be an array');
      });
    });

    describe('default type', () => {
      it('should convert to trimmed string', () => {
        expect(queryBuilderService.sanitizeValue(123, 'unknown')).toBe('123');
        expect(queryBuilderService.sanitizeValue('  test  ', 'unknown')).toBe('test');
      });
    });
  });

  describe('buildCondition', () => {
    it('should build equals condition', () => {
      expect(queryBuilderService.buildCondition('status', 'equals', 'active'))
        .toEqual({ status: 'active' });
    });

    it('should build not_equals condition', () => {
      expect(queryBuilderService.buildCondition('status', 'not_equals', 'deleted'))
        .toEqual({ status: { $ne: 'deleted' } });
    });

    it('should build comparison conditions', () => {
      expect(queryBuilderService.buildCondition('amount', 'greater_than', 100))
        .toEqual({ amount: { $gt: 100 } });
      expect(queryBuilderService.buildCondition('amount', 'greater_than_or_equal', 100))
        .toEqual({ amount: { $gte: 100 } });
      expect(queryBuilderService.buildCondition('amount', 'less_than', 100))
        .toEqual({ amount: { $lt: 100 } });
      expect(queryBuilderService.buildCondition('amount', 'less_than_or_equal', 100))
        .toEqual({ amount: { $lte: 100 } });
    });

    it('should build contains condition with regex escape', () => {
      const result = queryBuilderService.buildCondition('name', 'contains', 'test.value');
      expect(result.name.$regex).toBe('test\\.value');
      expect(result.name.$options).toBe('i');
    });

    it('should build not_contains condition', () => {
      const result = queryBuilderService.buildCondition('name', 'not_contains', 'test');
      expect(result.name.$not.$regex).toBe('test');
    });

    it('should build starts_with condition', () => {
      const result = queryBuilderService.buildCondition('name', 'starts_with', 'pre');
      expect(result.name.$regex).toBe('^pre');
    });

    it('should build ends_with condition', () => {
      const result = queryBuilderService.buildCondition('name', 'ends_with', 'fix');
      expect(result.name.$regex).toBe('fix$');
    });

    it('should build in condition', () => {
      expect(queryBuilderService.buildCondition('status', 'in', ['a', 'b']))
        .toEqual({ status: { $in: ['a', 'b'] } });
    });

    it('should build not_in condition', () => {
      expect(queryBuilderService.buildCondition('status', 'not_in', ['a', 'b']))
        .toEqual({ status: { $nin: ['a', 'b'] } });
    });

    it('should build is_null condition', () => {
      expect(queryBuilderService.buildCondition('email', 'is_null', null))
        .toEqual({ email: null });
    });

    it('should build is_not_null condition', () => {
      expect(queryBuilderService.buildCondition('email', 'is_not_null', null))
        .toEqual({ email: { $ne: null } });
    });

    it('should build between condition', () => {
      expect(queryBuilderService.buildCondition('amount', 'between', [100, 500]))
        .toEqual({ amount: { $gte: 100, $lte: 500 } });
    });

    it('should throw for unsupported operator', () => {
      expect(() => queryBuilderService.buildCondition('x', 'unknown_op', 1))
        .toThrow('Unsupported operator');
    });
  });

  describe('buildFilterQuery', () => {
    it('should return empty object for no filters', () => {
      expect(queryBuilderService.buildFilterQuery(null, [])).toEqual({});
      expect(queryBuilderService.buildFilterQuery([], [])).toEqual({});
    });

    it('should skip inactive filters', () => {
      const filters = [
        { field: 'name', operator: 'equals', value: 'test', isActive: false, dataType: 'string' }
      ];

      const result = queryBuilderService.buildFilterQuery(filters, ['name']);
      expect(result).toEqual({});
    });

    it('should build AND conditions by default', () => {
      const filters = [
        { field: 'status', operator: 'equals', value: 'active', isActive: true, dataType: 'string' },
        { field: 'amount', operator: 'greater_than', value: 100, isActive: true, dataType: 'number' }
      ];

      const result = queryBuilderService.buildFilterQuery(filters, ['status', 'amount']);

      expect(result.$and).toHaveLength(2);
    });

    it('should build OR conditions when logicalOperator is OR', () => {
      const filters = [
        { field: 'status', operator: 'equals', value: 'active', isActive: true, dataType: 'string', logicalOperator: 'OR' },
        { field: 'status', operator: 'equals', value: 'pending', isActive: true, dataType: 'string', logicalOperator: 'OR' }
      ];

      const result = queryBuilderService.buildFilterQuery(filters, ['status']);

      expect(result.$or).toHaveLength(2);
    });

    it('should combine AND and OR conditions', () => {
      const filters = [
        { field: 'companyId', operator: 'equals', value: 'c1', isActive: true, dataType: 'string' },
        { field: 'status', operator: 'equals', value: 'active', isActive: true, dataType: 'string', logicalOperator: 'OR' },
        { field: 'status', operator: 'equals', value: 'pending', isActive: true, dataType: 'string', logicalOperator: 'OR' }
      ];

      const result = queryBuilderService.buildFilterQuery(filters, ['companyId', 'status']);

      expect(result.$and).toBeDefined();
      // OR is nested inside $and
      expect(result.$and.some(c => c.$or)).toBe(true);
    });

    it('should throw for invalid field name', () => {
      const filters = [
        { field: 'evil; DROP TABLE', operator: 'equals', value: 'x', isActive: true, dataType: 'string' }
      ];

      expect(() => queryBuilderService.buildFilterQuery(filters, ['name']))
        .toThrow('Invalid field name');
    });
  });

  describe('buildProjection', () => {
    it('should return empty for no fields', () => {
      expect(queryBuilderService.buildProjection(null, [])).toEqual({});
      expect(queryBuilderService.buildProjection([], [])).toEqual({});
    });

    it('should build projection with valid fields', () => {
      const result = queryBuilderService.buildProjection(
        ['name', 'email'],
        ['name', 'email', 'phone']
      );

      expect(result).toEqual({ name: 1, email: 1 });
    });

    it('should throw for invalid field', () => {
      expect(() => queryBuilderService.buildProjection(['invalid'], ['name']))
        .toThrow('Invalid field name');
    });
  });

  describe('buildSort', () => {
    it('should return empty for no sort config', () => {
      expect(queryBuilderService.buildSort(null, [])).toEqual({});
      expect(queryBuilderService.buildSort({}, [])).toEqual({});
    });

    it('should build ascending sort', () => {
      const result = queryBuilderService.buildSort(
        { field: 'name', order: 'ASC' },
        ['name']
      );

      expect(result).toEqual({ name: 1 });
    });

    it('should build descending sort', () => {
      const result = queryBuilderService.buildSort(
        { field: 'amount', order: 'DESC' },
        ['amount']
      );

      expect(result).toEqual({ amount: -1 });
    });

    it('should default to ascending', () => {
      const result = queryBuilderService.buildSort(
        { field: 'name' },
        ['name']
      );

      expect(result).toEqual({ name: 1 });
    });

    it('should throw for invalid sort field', () => {
      expect(() => queryBuilderService.buildSort({ field: 'bad; DROP' }, ['name']))
        .toThrow('Invalid sort field');
    });
  });

  describe('executeQuery', () => {
    it('should execute query via ZeroDB service', async () => {
      const mockResults = [{ id: 1, name: 'Test' }];
      zeroDbService.queryTable.mockResolvedValue(mockResults);

      const result = await queryBuilderService.executeQuery('stakeholders', {
        filter: { status: 'active' },
        limit: 50
      });

      expect(zeroDbService.queryTable).toHaveBeenCalledWith('stakeholders', {
        filter: { status: 'active' },
        projection: {},
        sort: {},
        skip: 0,
        limit: 50
      });
      expect(result).toEqual(mockResults);
    });

    it('should throw for invalid table name', async () => {
      await expect(
        queryBuilderService.executeQuery('evil; DROP TABLE', {})
      ).rejects.toThrow('Invalid table name');
    });

    it('should wrap ZeroDB errors', async () => {
      zeroDbService.queryTable.mockRejectedValue(new Error('db error'));

      await expect(
        queryBuilderService.executeQuery('stakeholders', {})
      ).rejects.toThrow('Query execution failed');
    });

    it('should use default options when none provided', async () => {
      zeroDbService.queryTable.mockResolvedValue([]);

      await queryBuilderService.executeQuery('stakeholders');

      expect(zeroDbService.queryTable).toHaveBeenCalledWith('stakeholders', {
        filter: {},
        projection: {},
        sort: {},
        skip: 0,
        limit: 100
      });
    });
  });

  describe('getAvailableFields', () => {
    it('should return fields for valid data source', async () => {
      const mockFields = [
        { fieldName: 'name', displayName: 'Name' },
        { fieldName: 'email', displayName: 'Email' }
      ];
      CustomReportField.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockFields)
      });

      const result = await queryBuilderService.getAvailableFields('stakeholders');

      expect(CustomReportField.find).toHaveBeenCalledWith({
        dataSource: 'stakeholders',
        isActive: true
      });
      expect(result).toEqual(mockFields);
    });

    it('should throw for invalid data source name', async () => {
      await expect(
        queryBuilderService.getAvailableFields('evil; DROP')
      ).rejects.toThrow('Invalid data source');
    });
  });

  describe('validateReportConfig', () => {
    it('should return errors for missing data sources', async () => {
      const result = await queryBuilderService.validateReportConfig({
        fields: ['name']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one data source is required');
    });

    it('should return errors for empty data sources', async () => {
      const result = await queryBuilderService.validateReportConfig({
        dataSources: [],
        fields: ['name']
      });

      expect(result.isValid).toBe(false);
    });

    it('should return errors for missing fields', async () => {
      const result = await queryBuilderService.validateReportConfig({
        dataSources: ['stakeholders']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one field is required');
    });

    it('should validate fields against available fields', async () => {
      CustomReportField.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { fieldName: 'name' },
          { fieldName: 'email' }
        ])
      });

      const result = await queryBuilderService.validateReportConfig({
        dataSources: ['stakeholders'],
        fields: ['name', 'nonexistent']
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('nonexistent'))).toBe(true);
    });

    it('should validate filter values', async () => {
      CustomReportField.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ fieldName: 'amount' }])
      });

      const result = await queryBuilderService.validateReportConfig({
        dataSources: ['transactions'],
        fields: ['amount'],
        filters: [
          { field: 'amount', value: 'not-a-number', dataType: 'number' }
        ]
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid filter value'))).toBe(true);
    });

    it('should return valid for correct config', async () => {
      CustomReportField.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([
          { fieldName: 'name' },
          { fieldName: 'status' }
        ])
      });

      const result = await queryBuilderService.validateReportConfig({
        dataSources: ['stakeholders'],
        fields: ['name', 'status']
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
