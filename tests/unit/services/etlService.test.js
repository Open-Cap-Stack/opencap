/**
 * ETL Service Unit Tests
 * Issue #50: Implement Data Processing Pipeline
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';
process.env.NODE_ENV = 'test';

const ETLService = require('../../../services/etlService');

// Mock dependencies
jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  delete: jest.fn(),
  initialized: true
}));

jest.mock('../../../services/zerodbService', () => ({
  queryTable: jest.fn(),
  insertRow: jest.fn(),
  updateRows: jest.fn(),
  deleteRows: jest.fn(),
  initialize: jest.fn()
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn()
  },
  existsSync: jest.fn(() => true),
  createReadStream: jest.fn(() => ({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn((event, callback) => {
      if (event === 'end') callback();
      return { on: jest.fn() };
    })
  })),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn()
  }))
}));

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

const databaseAdapter = require('../../../services/databaseAdapter');
const zerodbService = require('../../../services/zerodbService');
const fs = require('fs').promises;
const axios = require('axios');

describe('ETLService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractData', () => {
    describe('from ZeroDB', () => {
      it('should extract data from ZeroDB collection', async () => {
        const mockData = [
          { id: '1', name: 'Company A', revenue: 100000 },
          { id: '2', name: 'Company B', revenue: 200000 }
        ];
        databaseAdapter.find.mockResolvedValue(mockData);

        const result = await ETLService.extractData({
          source: 'zerodb',
          collection: 'companies',
          query: { status: 'active' }
        });

        expect(result).toEqual(mockData);
        expect(databaseAdapter.find).toHaveBeenCalledWith('companies', { status: 'active' }, {});
      });

      it('should extract data with pagination options', async () => {
        const mockData = [{ id: '1', name: 'Company A' }];
        databaseAdapter.find.mockResolvedValue(mockData);

        const result = await ETLService.extractData({
          source: 'zerodb',
          collection: 'companies',
          query: {},
          options: { limit: 100, skip: 0, sort: { createdAt: -1 } }
        });

        expect(databaseAdapter.find).toHaveBeenCalledWith('companies', {}, {
          limit: 100,
          skip: 0,
          sort: { createdAt: -1 }
        });
      });

      it('should handle ZeroDB extraction errors', async () => {
        databaseAdapter.find.mockRejectedValue(new Error('Connection failed'));

        await expect(ETLService.extractData({
          source: 'zerodb',
          collection: 'companies'
        })).rejects.toThrow('Extraction failed: Connection failed');
      });
    });

    describe('from Files', () => {
      it('should extract data from JSON file', async () => {
        const mockData = [{ id: '1', name: 'Test' }];
        fs.readFile.mockResolvedValue(JSON.stringify(mockData));

        const result = await ETLService.extractData({
          source: 'file',
          filePath: '/data/input.json',
          fileType: 'json'
        });

        expect(result).toEqual(mockData);
        expect(fs.readFile).toHaveBeenCalledWith('/data/input.json', 'utf-8');
      });

      it('should extract data from CSV file', async () => {
        const csvContent = 'id,name,revenue\n1,Company A,100000\n2,Company B,200000';
        fs.readFile.mockResolvedValue(csvContent);

        const result = await ETLService.extractData({
          source: 'file',
          filePath: '/data/input.csv',
          fileType: 'csv'
        });

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('id', '1');
        expect(result[0]).toHaveProperty('name', 'Company A');
      });

      it('should handle file not found error', async () => {
        fs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));

        await expect(ETLService.extractData({
          source: 'file',
          filePath: '/data/missing.json',
          fileType: 'json'
        })).rejects.toThrow('Extraction failed');
      });
    });

    describe('from API', () => {
      it('should extract data from REST API', async () => {
        const mockResponse = { data: [{ id: '1', name: 'Test' }] };
        axios.get.mockResolvedValue(mockResponse);

        const result = await ETLService.extractData({
          source: 'api',
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: { 'Authorization': 'Bearer token123' }
        });

        expect(result).toEqual(mockResponse.data);
        expect(axios.get).toHaveBeenCalledWith('https://api.example.com/data', {
          headers: { 'Authorization': 'Bearer token123' }
        });
      });

      it('should handle API errors', async () => {
        axios.get.mockRejectedValue(new Error('API timeout'));

        await expect(ETLService.extractData({
          source: 'api',
          url: 'https://api.example.com/data',
          method: 'GET'
        })).rejects.toThrow('Extraction failed: API timeout');
      });
    });

    it('should throw error for unsupported source type', async () => {
      await expect(ETLService.extractData({
        source: 'unsupported'
      })).rejects.toThrow('Unsupported extraction source: unsupported');
    });
  });

  describe('transformData', () => {
    const sampleData = [
      { id: '1', name: 'Company A', revenue: 100000, expenses: 80000, date: '2024-01-15' },
      { id: '2', name: 'Company B', revenue: 200000, expenses: 150000, date: '2024-02-20' },
      { id: '3', name: 'Company C', revenue: null, expenses: 50000, date: '2024-03-10' }
    ];

    describe('Clean operations', () => {
      it('should remove null values', async () => {
        const result = await ETLService.transformData(sampleData, {
          operations: [
            { type: 'clean', action: 'removeNulls', fields: ['revenue'] }
          ]
        });

        expect(result).toHaveLength(2);
        expect(result.every(r => r.revenue !== null)).toBe(true);
      });

      it('should fill null values with default', async () => {
        const result = await ETLService.transformData(sampleData, {
          operations: [
            { type: 'clean', action: 'fillNulls', fields: ['revenue'], defaultValue: 0 }
          ]
        });

        expect(result).toHaveLength(3);
        expect(result[2].revenue).toBe(0);
      });

      it('should trim string values', async () => {
        const dataWithWhitespace = [
          { id: '1', name: '  Company A  ' },
          { id: '2', name: 'Company B   ' }
        ];

        const result = await ETLService.transformData(dataWithWhitespace, {
          operations: [
            { type: 'clean', action: 'trim', fields: ['name'] }
          ]
        });

        expect(result[0].name).toBe('Company A');
        expect(result[1].name).toBe('Company B');
      });

      it('should remove duplicates', async () => {
        const dataWithDupes = [
          { id: '1', name: 'Company A' },
          { id: '1', name: 'Company A' },
          { id: '2', name: 'Company B' }
        ];

        const result = await ETLService.transformData(dataWithDupes, {
          operations: [
            { type: 'clean', action: 'removeDuplicates', key: 'id' }
          ]
        });

        expect(result).toHaveLength(2);
      });
    });

    describe('Normalize operations', () => {
      it('should normalize numeric values to range [0, 1]', async () => {
        const result = await ETLService.transformData(sampleData.slice(0, 2), {
          operations: [
            { type: 'normalize', action: 'minMax', fields: ['revenue'] }
          ]
        });

        expect(result[0].revenue_normalized).toBeGreaterThanOrEqual(0);
        expect(result[0].revenue_normalized).toBeLessThanOrEqual(1);
        expect(result[1].revenue_normalized).toBeGreaterThanOrEqual(0);
        expect(result[1].revenue_normalized).toBeLessThanOrEqual(1);
      });

      it('should normalize field names to snake_case', async () => {
        const dataWithCamelCase = [
          { firstName: 'John', lastName: 'Doe', totalRevenue: 100000 }
        ];

        const result = await ETLService.transformData(dataWithCamelCase, {
          operations: [
            { type: 'normalize', action: 'fieldNames', format: 'snake_case' }
          ]
        });

        expect(result[0]).toHaveProperty('first_name');
        expect(result[0]).toHaveProperty('last_name');
        expect(result[0]).toHaveProperty('total_revenue');
      });

      it('should standardize date formats', async () => {
        const result = await ETLService.transformData(sampleData.slice(0, 2), {
          operations: [
            { type: 'normalize', action: 'dateFormat', fields: ['date'], format: 'YYYY-MM-DD' }
          ]
        });

        expect(result[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    describe('Aggregate operations', () => {
      it('should calculate sum aggregation', async () => {
        const result = await ETLService.transformData(sampleData.slice(0, 2), {
          operations: [
            { type: 'aggregate', action: 'sum', field: 'revenue' }
          ]
        });

        expect(result.aggregations.revenue_sum).toBe(300000);
      });

      it('should calculate average aggregation', async () => {
        const result = await ETLService.transformData(sampleData.slice(0, 2), {
          operations: [
            { type: 'aggregate', action: 'average', field: 'revenue' }
          ]
        });

        expect(result.aggregations.revenue_average).toBe(150000);
      });

      it('should calculate count aggregation', async () => {
        const result = await ETLService.transformData(sampleData, {
          operations: [
            { type: 'aggregate', action: 'count' }
          ]
        });

        expect(result.aggregations.count).toBe(3);
      });

      it('should group by field and aggregate', async () => {
        const dataWithCategories = [
          { category: 'A', value: 100 },
          { category: 'A', value: 200 },
          { category: 'B', value: 150 }
        ];

        const result = await ETLService.transformData(dataWithCategories, {
          operations: [
            { type: 'aggregate', action: 'groupBy', groupField: 'category', aggregateField: 'value', aggregateAction: 'sum' }
          ]
        });

        expect(result.groups['A']).toBe(300);
        expect(result.groups['B']).toBe(150);
      });
    });

    describe('Map operations', () => {
      it('should add computed field', async () => {
        const result = await ETLService.transformData(sampleData.slice(0, 2), {
          operations: [
            { type: 'map', action: 'addField', field: 'profit', computation: 'revenue - expenses' }
          ]
        });

        expect(result[0].profit).toBe(20000);
        expect(result[1].profit).toBe(50000);
      });

      it('should rename fields', async () => {
        const result = await ETLService.transformData(sampleData.slice(0, 1), {
          operations: [
            { type: 'map', action: 'renameField', from: 'name', to: 'companyName' }
          ]
        });

        expect(result[0]).toHaveProperty('companyName', 'Company A');
        expect(result[0]).not.toHaveProperty('name');
      });

      it('should select specific fields', async () => {
        const result = await ETLService.transformData(sampleData.slice(0, 1), {
          operations: [
            { type: 'map', action: 'selectFields', fields: ['id', 'name'] }
          ]
        });

        expect(Object.keys(result[0])).toEqual(['id', 'name']);
      });
    });

    describe('Filter operations', () => {
      it('should filter by condition', async () => {
        const result = await ETLService.transformData(sampleData, {
          operations: [
            { type: 'filter', condition: 'revenue > 150000' }
          ]
        });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Company B');
      });

      it('should filter by multiple conditions', async () => {
        const result = await ETLService.transformData(sampleData, {
          operations: [
            { type: 'filter', conditions: [
              { field: 'revenue', operator: '>=', value: 100000 },
              { field: 'expenses', operator: '<', value: 100000 }
            ]}
          ]
        });

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Company A');
      });
    });

    it('should apply multiple operations in sequence', async () => {
      const result = await ETLService.transformData(sampleData, {
        operations: [
          { type: 'clean', action: 'removeNulls', fields: ['revenue'] },
          { type: 'map', action: 'addField', field: 'profit', computation: 'revenue - expenses' },
          { type: 'filter', condition: 'profit > 30000' }
        ]
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Company B');
      expect(result[0].profit).toBe(50000);
    });

    it('should handle empty data array', async () => {
      const result = await ETLService.transformData([], {
        operations: [
          { type: 'clean', action: 'removeNulls', fields: ['revenue'] }
        ]
      });

      expect(result).toEqual([]);
    });

    it('should throw error for unknown operation type', async () => {
      await expect(ETLService.transformData(sampleData, {
        operations: [
          { type: 'unknown' }
        ]
      })).rejects.toThrow('Unknown transformation type: unknown');
    });
  });

  describe('loadData', () => {
    const sampleData = [
      { id: '1', name: 'Company A', revenue: 100000 },
      { id: '2', name: 'Company B', revenue: 200000 }
    ];

    describe('to ZeroDB', () => {
      it('should load data to ZeroDB collection', async () => {
        databaseAdapter.create.mockResolvedValue({ _id: 'new-id' });

        const result = await ETLService.loadData(sampleData, {
          destination: 'zerodb',
          collection: 'processed_companies',
          mode: 'insert'
        });

        expect(result.success).toBe(true);
        expect(result.recordsLoaded).toBe(2);
        expect(databaseAdapter.create).toHaveBeenCalledTimes(2);
      });

      it('should upsert data to ZeroDB', async () => {
        databaseAdapter.findByIdAndUpdate.mockResolvedValue({ _id: '1' });

        const result = await ETLService.loadData(sampleData, {
          destination: 'zerodb',
          collection: 'companies',
          mode: 'upsert',
          upsertKey: 'id'
        });

        expect(result.success).toBe(true);
        expect(result.recordsLoaded).toBe(2);
      });

      it('should handle batch loading', async () => {
        const largeData = Array(150).fill(null).map((_, i) => ({ id: String(i), value: i }));
        databaseAdapter.create.mockResolvedValue({ _id: 'id' });

        const result = await ETLService.loadData(largeData, {
          destination: 'zerodb',
          collection: 'data',
          mode: 'insert',
          batchSize: 50
        });

        expect(result.success).toBe(true);
        expect(result.recordsLoaded).toBe(150);
        expect(result.batches).toBe(3);
      });

      it('should handle ZeroDB load errors', async () => {
        databaseAdapter.create.mockRejectedValue(new Error('Write failed'));

        await expect(ETLService.loadData(sampleData, {
          destination: 'zerodb',
          collection: 'companies',
          mode: 'insert'
        })).rejects.toThrow('Load failed');
      });
    });

    describe('to Files', () => {
      it('should load data to JSON file', async () => {
        fs.writeFile.mockResolvedValue();

        const result = await ETLService.loadData(sampleData, {
          destination: 'file',
          filePath: '/data/output.json',
          fileType: 'json'
        });

        expect(result.success).toBe(true);
        expect(result.recordsLoaded).toBe(2);
        expect(fs.writeFile).toHaveBeenCalledWith(
          '/data/output.json',
          JSON.stringify(sampleData, null, 2),
          'utf-8'
        );
      });

      it('should load data to CSV file', async () => {
        fs.writeFile.mockResolvedValue();

        const result = await ETLService.loadData(sampleData, {
          destination: 'file',
          filePath: '/data/output.csv',
          fileType: 'csv'
        });

        expect(result.success).toBe(true);
        expect(fs.writeFile).toHaveBeenCalled();
        const csvContent = fs.writeFile.mock.calls[0][1];
        expect(csvContent).toContain('id,name,revenue');
      });

      it('should handle file write errors', async () => {
        fs.writeFile.mockRejectedValue(new Error('Permission denied'));

        await expect(ETLService.loadData(sampleData, {
          destination: 'file',
          filePath: '/data/output.json',
          fileType: 'json'
        })).rejects.toThrow('Load failed');
      });
    });

    it('should throw error for unsupported destination', async () => {
      await expect(ETLService.loadData(sampleData, {
        destination: 'unsupported'
      })).rejects.toThrow('Unsupported load destination: unsupported');
    });
  });

  describe('runETLPipeline', () => {
    it('should run complete ETL pipeline', async () => {
      const mockExtractedData = [
        { id: '1', name: 'Company A', revenue: 100000, expenses: 80000 },
        { id: '2', name: 'Company B', revenue: null, expenses: 50000 }
      ];

      databaseAdapter.find.mockResolvedValue(mockExtractedData);
      databaseAdapter.create.mockResolvedValue({ _id: 'new-id' });

      const pipelineConfig = {
        name: 'company_processing_pipeline',
        extract: {
          source: 'zerodb',
          collection: 'raw_companies',
          query: { status: 'active' }
        },
        transform: {
          operations: [
            { type: 'clean', action: 'removeNulls', fields: ['revenue'] },
            { type: 'map', action: 'addField', field: 'profit', computation: 'revenue - expenses' }
          ]
        },
        load: {
          destination: 'zerodb',
          collection: 'processed_companies',
          mode: 'insert'
        }
      };

      const result = await ETLService.runETLPipeline(pipelineConfig);

      expect(result.success).toBe(true);
      expect(result.pipelineName).toBe('company_processing_pipeline');
      expect(result.extractedRecords).toBe(2);
      expect(result.transformedRecords).toBe(1);
      expect(result.loadedRecords).toBe(1);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle pipeline with validation', async () => {
      const mockData = [
        { id: '1', name: 'Company A', revenue: 100000 },
        { id: '2', name: '', revenue: 200000 }
      ];

      databaseAdapter.find.mockResolvedValue(mockData);
      databaseAdapter.create.mockResolvedValue({ _id: 'new-id' });

      const pipelineConfig = {
        name: 'validated_pipeline',
        extract: {
          source: 'zerodb',
          collection: 'companies'
        },
        transform: {
          operations: [],
          validation: {
            rules: [
              { field: 'name', required: true, minLength: 1 },
              { field: 'revenue', required: true, type: 'number', min: 0 }
            ]
          }
        },
        load: {
          destination: 'zerodb',
          collection: 'valid_companies',
          mode: 'insert'
        }
      };

      const result = await ETLService.runETLPipeline(pipelineConfig);

      expect(result.validationResults).toBeDefined();
      expect(result.validationResults.passed).toBe(1);
      expect(result.validationResults.failed).toBe(1);
    });

    it('should track pipeline execution status', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      databaseAdapter.find.mockResolvedValue(mockData);
      databaseAdapter.create.mockResolvedValue({ _id: 'new-id' });

      const pipelineConfig = {
        name: 'tracked_pipeline',
        extract: { source: 'zerodb', collection: 'data' },
        transform: { operations: [] },
        load: { destination: 'zerodb', collection: 'output', mode: 'insert' }
      };

      const result = await ETLService.runETLPipeline(pipelineConfig);

      expect(result.status).toBe('completed');
      expect(result.stages).toHaveProperty('extract');
      expect(result.stages).toHaveProperty('transform');
      expect(result.stages).toHaveProperty('load');
      expect(result.stages.extract.status).toBe('completed');
      expect(result.stages.transform.status).toBe('completed');
      expect(result.stages.load.status).toBe('completed');
    });

    it('should handle extraction failure', async () => {
      databaseAdapter.find.mockRejectedValue(new Error('Database unavailable'));

      const pipelineConfig = {
        name: 'failing_pipeline',
        extract: { source: 'zerodb', collection: 'data' },
        transform: { operations: [] },
        load: { destination: 'zerodb', collection: 'output', mode: 'insert' }
      };

      const result = await ETLService.runETLPipeline(pipelineConfig);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Extraction failed');
      expect(result.stages.extract.status).toBe('failed');
    });

    it('should handle transformation failure', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      databaseAdapter.find.mockResolvedValue(mockData);

      const pipelineConfig = {
        name: 'transform_failing_pipeline',
        extract: { source: 'zerodb', collection: 'data' },
        transform: {
          operations: [
            { type: 'invalid_operation' }
          ]
        },
        load: { destination: 'zerodb', collection: 'output', mode: 'insert' }
      };

      const result = await ETLService.runETLPipeline(pipelineConfig);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.stages.extract.status).toBe('completed');
      expect(result.stages.transform.status).toBe('failed');
    });

    it('should handle load failure', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      databaseAdapter.find.mockResolvedValue(mockData);
      databaseAdapter.create.mockRejectedValue(new Error('Write failed'));

      const pipelineConfig = {
        name: 'load_failing_pipeline',
        extract: { source: 'zerodb', collection: 'data' },
        transform: { operations: [] },
        load: { destination: 'zerodb', collection: 'output', mode: 'insert' }
      };

      const result = await ETLService.runETLPipeline(pipelineConfig);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.stages.extract.status).toBe('completed');
      expect(result.stages.transform.status).toBe('completed');
      expect(result.stages.load.status).toBe('failed');
    });

    it('should support dry run mode', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      databaseAdapter.find.mockResolvedValue(mockData);

      const pipelineConfig = {
        name: 'dry_run_pipeline',
        extract: { source: 'zerodb', collection: 'data' },
        transform: { operations: [] },
        load: { destination: 'zerodb', collection: 'output', mode: 'insert' },
        dryRun: true
      };

      const result = await ETLService.runETLPipeline(pipelineConfig);

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(databaseAdapter.create).not.toHaveBeenCalled();
    });
  });

  describe('Pipeline Management', () => {
    it('should get pipeline status by ID', async () => {
      const pipelineId = 'pipeline-123';

      const status = ETLService.getPipelineStatus(pipelineId);

      expect(status).toHaveProperty('pipelineId');
      expect(status).toHaveProperty('status');
    });

    it('should list running pipelines', () => {
      const pipelines = ETLService.listRunningPipelines();

      expect(Array.isArray(pipelines)).toBe(true);
    });

    it('should cancel running pipeline', async () => {
      const pipelineId = 'pipeline-to-cancel';

      const result = await ETLService.cancelPipeline(pipelineId);

      expect(result).toHaveProperty('cancelled');
    });
  });

  describe('Utility Methods', () => {
    it('should validate extraction config', () => {
      const validConfig = {
        source: 'zerodb',
        collection: 'companies'
      };

      expect(() => ETLService.validateExtractionConfig(validConfig)).not.toThrow();
    });

    it('should throw for invalid extraction config', () => {
      const invalidConfig = {};

      expect(() => ETLService.validateExtractionConfig(invalidConfig))
        .toThrow('Extraction config must specify a source');
    });

    it('should validate transformation config', () => {
      const validConfig = {
        operations: [{ type: 'clean', action: 'removeNulls', fields: ['name'] }]
      };

      expect(() => ETLService.validateTransformConfig(validConfig)).not.toThrow();
    });

    it('should validate load config', () => {
      const validConfig = {
        destination: 'zerodb',
        collection: 'output'
      };

      expect(() => ETLService.validateLoadConfig(validConfig)).not.toThrow();
    });
  });
});
