/**
 * Report Aggregation Service Unit Tests
 * Issue #197: Build Custom Report Builder Engine
 *
 * Test suite for aggregation and grouping functionality for custom reports.
 */
process.env.SKIP_DB_SETUP = 'true';

jest.mock('../../../services/zerodbService', () => ({
  queryTable: jest.fn()
}));

jest.mock('../../../services/queryBuilderService', () => ({
  validateField: jest.fn()
}));

const reportAggregationService = require('../../../services/reportAggregationService');
const zeroDbService = require('../../../services/zerodbService');
const queryBuilderService = require('../../../services/queryBuilderService');

describe('ReportAggregationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilderService.validateField.mockReturnValue(true);
  });

  // ============================================================================
  // validateAggregationFunction
  // ============================================================================
  describe('validateAggregationFunction', () => {
    it('should accept valid aggregation functions', () => {
      const valid = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'DISTINCT_COUNT'];
      valid.forEach(func => {
        expect(reportAggregationService.validateAggregationFunction(func)).toBe(true);
      });
    });

    it('should reject invalid aggregation functions', () => {
      expect(reportAggregationService.validateAggregationFunction('MEDIAN')).toBe(false);
      expect(reportAggregationService.validateAggregationFunction('')).toBe(false);
      expect(reportAggregationService.validateAggregationFunction(null)).toBe(false);
    });
  });

  // ============================================================================
  // buildAggregationPipeline
  // ============================================================================
  describe('buildAggregationPipeline', () => {
    it('should build pipeline with match stage when filterQuery is non-empty', () => {
      const config = {};
      const filterQuery = { status: 'active' };

      const pipeline = reportAggregationService.buildAggregationPipeline(config, filterQuery);

      expect(pipeline).toContainEqual({ $match: { status: 'active' } });
    });

    it('should not include match stage when filterQuery is empty', () => {
      const config = {};
      const pipeline = reportAggregationService.buildAggregationPipeline(config, {});

      const matchStages = pipeline.filter(s => s.$match);
      expect(matchStages).toHaveLength(0);
    });

    it('should build group stage when groupBy is provided', () => {
      const config = {
        groupBy: ['department'],
        fields: ['department', 'amount'],
        aggregations: [{ function: 'SUM', field: 'amount' }]
      };

      const pipeline = reportAggregationService.buildAggregationPipeline(config);

      const groupStages = pipeline.filter(s => s.$group);
      expect(groupStages.length).toBeGreaterThan(0);
    });

    it('should build aggregation stage when aggregations present but no groupBy', () => {
      const config = {
        aggregations: [{ function: 'SUM', field: 'amount' }]
      };

      const pipeline = reportAggregationService.buildAggregationPipeline(config);

      const groupStages = pipeline.filter(s => s.$group);
      expect(groupStages.length).toBeGreaterThan(0);
      expect(groupStages[0].$group._id).toBeNull();
    });

    it('should not build aggregation stage when groupBy is present (handled in group stage)', () => {
      const config = {
        groupBy: ['department'],
        fields: ['department'],
        aggregations: [{ function: 'COUNT', field: 'id' }]
      };

      const pipeline = reportAggregationService.buildAggregationPipeline(config);

      // Only one $group stage should exist (from buildGroupStage)
      const groupStages = pipeline.filter(s => s.$group);
      expect(groupStages).toHaveLength(1);
      expect(groupStages[0].$group._id).not.toBeNull();
    });

    it('should build project stage when fields are provided', () => {
      const config = {
        fields: ['name', 'amount']
      };

      const pipeline = reportAggregationService.buildAggregationPipeline(config);

      const projectStages = pipeline.filter(s => s.$project);
      expect(projectStages).toHaveLength(1);
      expect(projectStages[0].$project._id).toBe(0);
      expect(projectStages[0].$project.name).toBe(1);
      expect(projectStages[0].$project.amount).toBe(1);
    });

    it('should build sort stage when sortBy is provided', () => {
      const config = {
        sortBy: { field: 'amount', order: 'DESC' }
      };

      const pipeline = reportAggregationService.buildAggregationPipeline(config);

      const sortStages = pipeline.filter(s => s.$sort);
      expect(sortStages).toHaveLength(1);
      expect(sortStages[0].$sort.amount).toBe(-1);
    });

    it('should build sort stage with ASC order by default', () => {
      const config = {
        sortBy: { field: 'name', order: 'ASC' }
      };

      const pipeline = reportAggregationService.buildAggregationPipeline(config);

      const sortStages = pipeline.filter(s => s.$sort);
      expect(sortStages).toHaveLength(1);
      expect(sortStages[0].$sort.name).toBe(1);
    });

    it('should build limit stage when limit is provided', () => {
      const config = {
        limit: 100
      };

      const pipeline = reportAggregationService.buildAggregationPipeline(config);

      expect(pipeline).toContainEqual({ $limit: 100 });
    });

    it('should build a complete pipeline with all stages', () => {
      const config = {
        groupBy: ['department'],
        fields: ['department', 'amount'],
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'totalAmount' }],
        sortBy: { field: 'totalAmount', order: 'DESC' },
        limit: 10
      };
      const filterQuery = { companyId: 'COMP-001' };

      const pipeline = reportAggregationService.buildAggregationPipeline(config, filterQuery);

      expect(pipeline.length).toBeGreaterThanOrEqual(4);
      expect(pipeline[0].$match).toBeDefined();
    });
  });

  // ============================================================================
  // buildGroupStage
  // ============================================================================
  describe('buildGroupStage', () => {
    it('should build group stage with groupBy fields in _id', () => {
      const config = {
        groupBy: ['department', 'region'],
        fields: ['department', 'region'],
        aggregations: []
      };

      const stage = reportAggregationService.buildGroupStage(config);

      expect(stage.$group._id.department).toBe('$department');
      expect(stage.$group._id.region).toBe('$region');
    });

    it('should throw error for invalid groupBy field', () => {
      queryBuilderService.validateField.mockReturnValue(false);
      const config = {
        groupBy: ['invalidField'],
        fields: ['validField']
      };

      expect(() => reportAggregationService.buildGroupStage(config))
        .toThrow('Invalid groupBy field: invalidField');
    });

    it('should add aggregation expressions to group stage', () => {
      const config = {
        groupBy: ['department'],
        fields: ['department'],
        aggregations: [
          { function: 'SUM', field: 'amount', alias: 'totalAmount' },
          { function: 'COUNT', field: 'id', alias: 'count' }
        ]
      };

      const stage = reportAggregationService.buildGroupStage(config);

      expect(stage.$group.totalAmount).toEqual({ $sum: '$amount' });
      expect(stage.$group.count).toEqual({ $sum: 1 });
    });

    it('should generate default alias when not provided', () => {
      const config = {
        groupBy: ['department'],
        fields: ['department'],
        aggregations: [
          { function: 'AVG', field: 'salary' }
        ]
      };

      const stage = reportAggregationService.buildGroupStage(config);

      expect(stage.$group['avg_salary']).toEqual({ $avg: '$salary' });
    });

    it('should throw error for invalid aggregation function in group stage', () => {
      const config = {
        groupBy: ['department'],
        fields: ['department'],
        aggregations: [
          { function: 'INVALID_FUNC', field: 'amount' }
        ]
      };

      expect(() => reportAggregationService.buildGroupStage(config))
        .toThrow('Invalid aggregation function: INVALID_FUNC');
    });
  });

  // ============================================================================
  // buildAggregationStage (non-grouped)
  // ============================================================================
  describe('buildAggregationStage', () => {
    it('should build aggregation stage with _id null', () => {
      const aggregations = [
        { function: 'SUM', field: 'amount', alias: 'total' }
      ];

      const stage = reportAggregationService.buildAggregationStage(aggregations);

      expect(stage.$group._id).toBeNull();
      expect(stage.$group.total).toEqual({ $sum: '$amount' });
    });

    it('should throw error for invalid aggregation function', () => {
      const aggregations = [
        { function: 'MEDIAN', field: 'amount' }
      ];

      expect(() => reportAggregationService.buildAggregationStage(aggregations))
        .toThrow('Invalid aggregation function: MEDIAN');
    });

    it('should generate default alias when not provided', () => {
      const aggregations = [
        { function: 'MAX', field: 'price' }
      ];

      const stage = reportAggregationService.buildAggregationStage(aggregations);

      expect(stage.$group['max_price']).toEqual({ $max: '$price' });
    });
  });

  // ============================================================================
  // buildAggregationExpression
  // ============================================================================
  describe('buildAggregationExpression', () => {
    it('should build SUM expression', () => {
      const result = reportAggregationService.buildAggregationExpression({ function: 'SUM', field: 'amount' });
      expect(result).toEqual({ $sum: '$amount' });
    });

    it('should build AVG expression', () => {
      const result = reportAggregationService.buildAggregationExpression({ function: 'AVG', field: 'price' });
      expect(result).toEqual({ $avg: '$price' });
    });

    it('should build COUNT expression', () => {
      const result = reportAggregationService.buildAggregationExpression({ function: 'COUNT', field: 'id' });
      expect(result).toEqual({ $sum: 1 });
    });

    it('should build MIN expression', () => {
      const result = reportAggregationService.buildAggregationExpression({ function: 'MIN', field: 'salary' });
      expect(result).toEqual({ $min: '$salary' });
    });

    it('should build MAX expression', () => {
      const result = reportAggregationService.buildAggregationExpression({ function: 'MAX', field: 'salary' });
      expect(result).toEqual({ $max: '$salary' });
    });

    it('should build DISTINCT_COUNT expression', () => {
      const result = reportAggregationService.buildAggregationExpression({ function: 'DISTINCT_COUNT', field: 'category' });
      expect(result).toEqual({ $addToSet: '$category' });
    });

    it('should throw error for unsupported function', () => {
      expect(() => reportAggregationService.buildAggregationExpression({ function: 'VARIANCE', field: 'x' }))
        .toThrow('Unsupported aggregation function: VARIANCE');
    });
  });

  // ============================================================================
  // buildProjectStage
  // ============================================================================
  describe('buildProjectStage', () => {
    it('should include selected fields in project stage', () => {
      const config = {
        fields: ['name', 'email']
      };

      const stage = reportAggregationService.buildProjectStage(config);

      expect(stage.$project._id).toBe(0);
      expect(stage.$project.name).toBe(1);
      expect(stage.$project.email).toBe(1);
    });

    it('should throw error for invalid field', () => {
      queryBuilderService.validateField.mockReturnValue(false);
      const config = {
        fields: ['invalidField']
      };

      expect(() => reportAggregationService.buildProjectStage(config))
        .toThrow('Invalid field: invalidField');
    });

    it('should include aggregation aliases in project stage', () => {
      const config = {
        fields: ['department'],
        aggregations: [
          { function: 'SUM', field: 'amount', alias: 'totalAmount' },
          { function: 'AVG', field: 'salary' }
        ]
      };

      const stage = reportAggregationService.buildProjectStage(config);

      expect(stage.$project.totalAmount).toBe(1);
      expect(stage.$project['avg_salary']).toBe(1);
    });

    it('should include groupBy fields mapped from _id', () => {
      const config = {
        fields: ['department'],
        groupBy: ['department', 'region']
      };

      const stage = reportAggregationService.buildProjectStage(config);

      expect(stage.$project.department).toBe('$_id.department');
      expect(stage.$project.region).toBe('$_id.region');
    });
  });

  // ============================================================================
  // executeAggregation
  // ============================================================================
  describe('executeAggregation', () => {
    it('should call zeroDbService.queryTable with correct params', async () => {
      zeroDbService.queryTable.mockResolvedValue([{ id: 1 }]);

      const result = await reportAggregationService.executeAggregation('stakeholders', []);

      expect(zeroDbService.queryTable).toHaveBeenCalledWith('stakeholders', {
        filter: {},
        limit: 10000
      });
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should throw error for invalid table name', async () => {
      queryBuilderService.validateField.mockReturnValue(false);

      await expect(reportAggregationService.executeAggregation('invalid; DROP TABLE', []))
        .rejects.toThrow('Aggregation execution failed');
    });

    it('should wrap zeroDbService errors', async () => {
      zeroDbService.queryTable.mockRejectedValue(new Error('Connection failed'));

      await expect(reportAggregationService.executeAggregation('stakeholders', []))
        .rejects.toThrow('Aggregation execution failed: Connection failed');
    });
  });

  // ============================================================================
  // performInMemoryAggregation
  // ============================================================================
  describe('performInMemoryAggregation', () => {
    it('should return empty array for null data', () => {
      const result = reportAggregationService.performInMemoryAggregation(null, {});
      expect(result).toEqual([]);
    });

    it('should return empty array for empty data', () => {
      const result = reportAggregationService.performInMemoryAggregation([], {});
      expect(result).toEqual([]);
    });

    it('should perform global aggregation when no groupBy', () => {
      const data = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 }
      ];
      const config = {
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'total' }]
      };

      const result = reportAggregationService.performInMemoryAggregation(data, config);

      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(600);
    });

    it('should perform grouped aggregation when groupBy is specified', () => {
      const data = [
        { department: 'Engineering', amount: 100 },
        { department: 'Engineering', amount: 200 },
        { department: 'Sales', amount: 150 }
      ];
      const config = {
        groupBy: ['department'],
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'total' }]
      };

      const result = reportAggregationService.performInMemoryAggregation(data, config);

      expect(result).toHaveLength(2);
      const eng = result.find(r => r.department === 'Engineering');
      const sales = result.find(r => r.department === 'Sales');
      expect(eng.total).toBe(300);
      expect(sales.total).toBe(150);
    });
  });

  // ============================================================================
  // performGlobalAggregation
  // ============================================================================
  describe('performGlobalAggregation', () => {
    it('should return single-element array with aggregated result', () => {
      const data = [{ amount: 10 }, { amount: 20 }, { amount: 30 }];
      const config = {
        aggregations: [{ function: 'AVG', field: 'amount', alias: 'avgAmount' }]
      };

      const result = reportAggregationService.performGlobalAggregation(data, config);

      expect(result).toHaveLength(1);
      expect(result[0].avgAmount).toBe(20);
    });

    it('should handle config with no aggregations', () => {
      const data = [{ amount: 10 }];
      const config = {};

      const result = reportAggregationService.performGlobalAggregation(data, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({});
    });
  });

  // ============================================================================
  // performGroupedAggregation
  // ============================================================================
  describe('performGroupedAggregation', () => {
    it('should group data by specified fields and aggregate', () => {
      const data = [
        { dept: 'A', region: 'US', amount: 100 },
        { dept: 'A', region: 'US', amount: 200 },
        { dept: 'A', region: 'EU', amount: 50 },
        { dept: 'B', region: 'US', amount: 300 }
      ];
      const config = {
        groupBy: ['dept', 'region'],
        aggregations: [
          { function: 'SUM', field: 'amount', alias: 'total' },
          { function: 'COUNT', field: 'id', alias: 'count' }
        ]
      };

      const result = reportAggregationService.performGroupedAggregation(data, config);

      expect(result).toHaveLength(3);
      const aUS = result.find(r => r.dept === 'A' && r.region === 'US');
      expect(aUS.total).toBe(300);
      expect(aUS.count).toBe(2);
    });

    it('should sort results when sortBy is provided', () => {
      const data = [
        { dept: 'Sales', amount: 100 },
        { dept: 'Engineering', amount: 300 },
        { dept: 'Marketing', amount: 200 }
      ];
      const config = {
        groupBy: ['dept'],
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'total' }],
        sortBy: { field: 'total', order: 'DESC' }
      };

      const result = reportAggregationService.performGroupedAggregation(data, config);

      expect(result[0].total).toBe(300);
      expect(result[2].total).toBe(100);
    });

    it('should sort results in ASC order', () => {
      const data = [
        { dept: 'Sales', amount: 300 },
        { dept: 'Engineering', amount: 100 }
      ];
      const config = {
        groupBy: ['dept'],
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'total' }],
        sortBy: { field: 'total', order: 'ASC' }
      };

      const result = reportAggregationService.performGroupedAggregation(data, config);

      expect(result[0].total).toBe(100);
      expect(result[1].total).toBe(300);
    });

    it('should apply limit to results', () => {
      const data = [
        { dept: 'A', amount: 1 },
        { dept: 'B', amount: 2 },
        { dept: 'C', amount: 3 }
      ];
      const config = {
        groupBy: ['dept'],
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'total' }],
        limit: 2
      };

      const result = reportAggregationService.performGroupedAggregation(data, config);

      expect(result).toHaveLength(2);
    });

    it('should handle groups without aggregations', () => {
      const data = [
        { dept: 'A', amount: 1 },
        { dept: 'B', amount: 2 }
      ];
      const config = {
        groupBy: ['dept']
      };

      const result = reportAggregationService.performGroupedAggregation(data, config);

      expect(result).toHaveLength(2);
      expect(result[0].dept).toBeDefined();
    });

    it('should handle equal values in sort without errors', () => {
      const data = [
        { dept: 'A', amount: 100 },
        { dept: 'B', amount: 100 }
      ];
      const config = {
        groupBy: ['dept'],
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'total' }],
        sortBy: { field: 'total', order: 'ASC' }
      };

      const result = reportAggregationService.performGroupedAggregation(data, config);

      expect(result).toHaveLength(2);
    });
  });

  // ============================================================================
  // calculateAggregation
  // ============================================================================
  describe('calculateAggregation', () => {
    const data = [
      { amount: 10, category: 'A' },
      { amount: 20, category: 'B' },
      { amount: 30, category: 'A' },
      { amount: null, category: 'C' }
    ];

    it('should calculate SUM', () => {
      const result = reportAggregationService.calculateAggregation(data, { function: 'SUM', field: 'amount' });
      expect(result).toBe(60);
    });

    it('should calculate AVG', () => {
      const result = reportAggregationService.calculateAggregation(data, { function: 'AVG', field: 'amount' });
      expect(result).toBe(20);
    });

    it('should calculate AVG returning 0 when no values', () => {
      const result = reportAggregationService.calculateAggregation(
        [{ amount: null }],
        { function: 'AVG', field: 'amount' }
      );
      expect(result).toBe(0);
    });

    it('should calculate COUNT (counts all rows including nulls)', () => {
      const result = reportAggregationService.calculateAggregation(data, { function: 'COUNT', field: 'amount' });
      expect(result).toBe(4);
    });

    it('should calculate MIN', () => {
      const result = reportAggregationService.calculateAggregation(data, { function: 'MIN', field: 'amount' });
      expect(result).toBe(10);
    });

    it('should calculate MIN returning null when no values', () => {
      const result = reportAggregationService.calculateAggregation(
        [{ amount: null }],
        { function: 'MIN', field: 'amount' }
      );
      expect(result).toBeNull();
    });

    it('should calculate MAX', () => {
      const result = reportAggregationService.calculateAggregation(data, { function: 'MAX', field: 'amount' });
      expect(result).toBe(30);
    });

    it('should calculate MAX returning null when no values', () => {
      const result = reportAggregationService.calculateAggregation(
        [{ amount: null }],
        { function: 'MAX', field: 'amount' }
      );
      expect(result).toBeNull();
    });

    it('should calculate DISTINCT_COUNT', () => {
      const result = reportAggregationService.calculateAggregation(data, { function: 'DISTINCT_COUNT', field: 'category' });
      expect(result).toBe(3);
    });

    it('should throw error for unsupported function', () => {
      expect(() => reportAggregationService.calculateAggregation(data, { function: 'STDDEV', field: 'amount' }))
        .toThrow('Unsupported aggregation function: STDDEV');
    });
  });

  // ============================================================================
  // executeReport
  // ============================================================================
  describe('executeReport', () => {
    it('should fetch raw data and perform in-memory aggregation', async () => {
      const rawData = [
        { department: 'Eng', amount: 100 },
        { department: 'Eng', amount: 200 },
        { department: 'Sales', amount: 150 }
      ];
      zeroDbService.queryTable.mockResolvedValue(rawData);

      const report = {
        dataSources: ['employees'],
        groupBy: ['department'],
        aggregations: [{ function: 'SUM', field: 'amount', alias: 'total' }]
      };

      const result = await reportAggregationService.executeReport(report);

      expect(zeroDbService.queryTable).toHaveBeenCalledWith('employees', {
        filter: {},
        limit: 10000
      });
      expect(result).toHaveLength(2);
    });

    it('should pass filter query to queryTable', async () => {
      zeroDbService.queryTable.mockResolvedValue([]);

      const report = {
        dataSources: ['transactions'],
        aggregations: []
      };
      const filterQuery = { companyId: 'COMP-001' };

      await reportAggregationService.executeReport(report, filterQuery);

      expect(zeroDbService.queryTable).toHaveBeenCalledWith('transactions', {
        filter: filterQuery,
        limit: 10000
      });
    });

    it('should wrap errors in Report execution failed message', async () => {
      zeroDbService.queryTable.mockRejectedValue(new Error('Table not found'));

      const report = {
        dataSources: ['nonexistent'],
        aggregations: []
      };

      await expect(reportAggregationService.executeReport(report))
        .rejects.toThrow('Report execution failed: Table not found');
    });
  });
});
