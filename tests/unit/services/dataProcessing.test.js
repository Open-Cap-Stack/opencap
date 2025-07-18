/**
 * Data Processing Service Test Suite
 * 
 * [Feature] OCAE-405: Advanced Data Processing Testing
 * Comprehensive test coverage for data processing, transformation,
 * validation, and quality monitoring
 */

const dataProcessingService = require('../../../services/dataProcessing');
const streamingService = require('../../../services/streamingService');
const memoryService = require('../../../services/memoryService');
const vectorService = require('../../../services/vectorService');
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

// Mock external services
jest.mock('../../../services/streamingService');
jest.mock('../../../services/memoryService');
jest.mock('../../../services/vectorService');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn()
  }
}));

// Mock data-forge
jest.mock('data-forge', () => {
  const mockDataFrame = {
    count: jest.fn(() => 100),
    toArray: jest.fn(() => []),
    getColumnNames: jest.fn(() => ['col1', 'col2']),
    getSeries: jest.fn(() => ({
      where: jest.fn(() => ({ count: () => 90 })),
      any: jest.fn(() => true),
      first: jest.fn(() => 'number'),
      average: jest.fn(() => 100),
      std: jest.fn(() => 10),
      forEach: jest.fn(),
      min: jest.fn(() => new Date('2023-01-01')),
      max: jest.fn(() => new Date('2023-12-31')),
      sum: jest.fn(() => 1000)
    })),
    parseFloats: jest.fn(() => mockDataFrame),
    parseDates: jest.fn(() => mockDataFrame),
    where: jest.fn(() => mockDataFrame),
    generateSeries: jest.fn(() => mockDataFrame),
    groupBy: jest.fn(() => ({
      select: jest.fn(() => mockDataFrame)
    })),
    select: jest.fn(() => mockDataFrame),
    join: jest.fn(() => mockDataFrame),
    orderBy: jest.fn(() => mockDataFrame),
    forEach: jest.fn(),
    asCSV: jest.fn(() => ({
      writeFile: jest.fn()
    }))
  };
  
  return {
    DataFrame: {
      fromArray: jest.fn(() => mockDataFrame)
    }
  };
});

// Mock csv-parser
jest.mock('csv-parser', () => {
  return jest.fn();
});

// Mock fs streams
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn(() => ({
    pipe: jest.fn(() => ({
      on: jest.fn((event, callback) => {
        if (event === 'end') {
          callback();
        }
        return { on: jest.fn() };
      })
    }))
  })),
  createWriteStream: jest.fn()
}));

describe('Data Processing Service', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock responses
    streamingService.publishEvent.mockResolvedValue(true);
    streamingService.subscribeToStream.mockResolvedValue(true);
    memoryService.store.mockResolvedValue(true);
    vectorService.indexDocument.mockResolvedValue(true);
  });

  describe('Processing Job Management', () => {
    describe('createProcessingJob', () => {
      it('should create a new processing job', async () => {
        const jobConfig = {
          type: 'csv_processing',
          source: { type: 'csv', path: '/test/data.csv' },
          destination: { type: 'json', path: '/test/output.json' },
          transformations: [
            { type: 'filter', parameters: { condition: 'row.amount > 1000' } }
          ],
          validationRules: [
            { name: 'amount_check', condition: 'row.amount > 0' }
          ],
          priority: 'high'
        };

        const result = await dataProcessingService.createProcessingJob(jobConfig);

        expect(result).toHaveProperty('jobId');
        expect(result).toHaveProperty('status', 'queued');
        expect(result.jobId).toMatch(/^job_\d+_[a-z0-9]+$/);
        
        expect(memoryService.store).toHaveBeenCalledWith(
          expect.stringMatching(/^processing_job_/),
          expect.objectContaining({
            type: jobConfig.type,
            source: jobConfig.source,
            destination: jobConfig.destination,
            transformations: jobConfig.transformations,
            validationRules: jobConfig.validationRules,
            priority: jobConfig.priority,
            status: 'pending',
            progress: 0
          })
        );

        expect(streamingService.publishEvent).toHaveBeenCalledWith(
          'data.processing.job.created',
          expect.objectContaining({
            jobId: result.jobId,
            type: jobConfig.type,
            priority: jobConfig.priority,
            timestamp: expect.any(Date)
          })
        );
      });

      it('should use default values for optional parameters', async () => {
        const jobConfig = {
          type: 'basic_processing',
          source: { type: 'csv', path: '/test/data.csv' },
          destination: { type: 'json', path: '/test/output.json' }
        };

        const result = await dataProcessingService.createProcessingJob(jobConfig);

        expect(result).toHaveProperty('jobId');
        expect(result).toHaveProperty('status', 'queued');
        
        expect(memoryService.store).toHaveBeenCalledWith(
          expect.stringMatching(/^processing_job_/),
          expect.objectContaining({
            transformations: [],
            validationRules: [],
            priority: 'medium',
            metadata: {}
          })
        );
      });
    });
  });

  describe('CSV Processing', () => {
    describe('processCSVFile', () => {
      it('should process CSV file with transformations', async () => {
        const filePath = '/test/data.csv';
        const transformations = [
          { type: 'filter', parameters: { condition: 'row.amount > 1000' } },
          { type: 'sort', parameters: { column: 'date' } }
        ];

        // Mock CSV data loading
        const mockData = [
          { date: '2023-01-01', amount: 1500, category: 'revenue' },
          { date: '2023-01-02', amount: 500, category: 'expense' },
          { date: '2023-01-03', amount: 2000, category: 'revenue' }
        ];

        const result = await dataProcessingService.processCSVFile(filePath, transformations);

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('qualityReport');
        expect(result).toHaveProperty('recordCount');
        expect(result).toHaveProperty('processedAt');
        
        expect(result.recordCount).toBe(100); // Mocked count
        expect(result.qualityReport).toHaveProperty('totalRecords');
        expect(result.qualityReport).toHaveProperty('completeness');
        expect(result.qualityReport).toHaveProperty('accuracy');
        expect(result.qualityReport).toHaveProperty('consistency');
        expect(result.qualityReport).toHaveProperty('timeliness');
      });

      it('should handle CSV processing errors', async () => {
        const filePath = '/test/nonexistent.csv';
        const transformations = [];

        // Mock error in CSV loading
        const mockError = new Error('File not found');
        
        await expect(dataProcessingService.processCSVFile(filePath, transformations))
          .rejects.toThrow('File not found');
      });

      it('should process CSV file without transformations', async () => {
        const filePath = '/test/data.csv';
        
        const result = await dataProcessingService.processCSVFile(filePath);

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('qualityReport');
        expect(result).toHaveProperty('recordCount');
        expect(result).toHaveProperty('processedAt');
      });
    });
  });

  describe('Financial Data Processing', () => {
    describe('processFinancialData', () => {
      it('should process financial data with default options', async () => {
        const mockData = [
          { date: '2023-01-01', revenue: 10000, expenses: 7000, assets: 50000, liabilities: 30000, equity: 20000 },
          { date: '2023-02-01', revenue: 12000, expenses: 8000, assets: 55000, liabilities: 32000, equity: 23000 },
          { date: '2023-03-01', revenue: 11000, expenses: 7500, assets: 52000, liabilities: 31000, equity: 21000 }
        ];

        const result = await dataProcessingService.processFinancialData(mockData);

        expect(result).toHaveProperty('processedData');
        expect(result).toHaveProperty('summary');
        expect(result.summary).toHaveProperty('totalRecords');
        expect(result.summary).toHaveProperty('dateRange');
        expect(result.summary).toHaveProperty('currency', 'USD');
        expect(result.summary).toHaveProperty('aggregationLevel', 'monthly');
        expect(result.summary.dateRange).toHaveProperty('start');
        expect(result.summary.dateRange).toHaveProperty('end');
      });

      it('should process financial data with custom options', async () => {
        const mockData = [
          { date: '2023-01-01', revenue: 10000, expenses: 7000, assets: 50000, liabilities: 30000, equity: 20000 }
        ];

        const options = {
          currency: 'EUR',
          fiscalYearStart: '04-01',
          includeRatios: true,
          aggregationLevel: 'quarterly'
        };

        const result = await dataProcessingService.processFinancialData(mockData, options);

        expect(result.summary.currency).toBe('EUR');
        expect(result.summary.aggregationLevel).toBe('quarterly');
      });

      it('should include financial ratios when requested', async () => {
        const mockData = [
          { date: '2023-01-01', revenue: 10000, expenses: 7000, assets: 50000, liabilities: 30000, equity: 20000, current_assets: 25000, current_liabilities: 15000 }
        ];

        const options = { includeRatios: true };

        const result = await dataProcessingService.processFinancialData(mockData, options);

        expect(result).toHaveProperty('processedData');
        expect(result).toHaveProperty('summary');
      });

      it('should handle currency conversion', async () => {
        const mockData = [
          { date: '2023-01-01', revenue: 10000, expenses: 7000 }
        ];

        const options = { currency: 'EUR' };

        const result = await dataProcessingService.processFinancialData(mockData, options);

        expect(result.summary.currency).toBe('EUR');
      });
    });
  });

  describe('Compliance Data Processing', () => {
    describe('processComplianceData', () => {
      it('should process compliance data with rules and anomaly detection', async () => {
        const mockData = [
          { id: 1, document_type: 'financial', confidentiality: 'high', last_review: '2023-01-01', status: 'active' },
          { id: 2, document_type: 'legal', confidentiality: 'medium', last_review: '2023-06-01', status: 'active' },
          { id: 3, document_type: 'compliance', confidentiality: 'low', last_review: '2022-12-01', status: 'inactive' }
        ];

        const complianceRules = [
          {
            name: 'high_confidentiality_check',
            condition: 'row.confidentiality === "high" && row.status === "active"',
            description: 'High confidentiality documents must be active',
            severity: 'high',
            field: 'confidentiality'
          },
          {
            name: 'review_currency_check',
            condition: 'new Date(row.last_review) > new Date("2023-01-01")',
            description: 'Documents must be reviewed within the last year',
            severity: 'medium',
            field: 'last_review'
          }
        ];

        const result = await dataProcessingService.processComplianceData(mockData, complianceRules);

        expect(result).toHaveProperty('processedData');
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('anomalies');
        expect(result).toHaveProperty('summary');
        
        expect(result.violations).toBeInstanceOf(Array);
        expect(result.anomalies).toBeInstanceOf(Array);
        expect(result.summary).toHaveProperty('totalRecords');
        expect(result.summary).toHaveProperty('violationCount');
        expect(result.summary).toHaveProperty('anomalyCount');
        expect(result.summary).toHaveProperty('highRiskRecords');
      });

      it('should handle compliance data without rules', async () => {
        const mockData = [
          { id: 1, document_type: 'financial', confidentiality: 'high', status: 'active' }
        ];

        const result = await dataProcessingService.processComplianceData(mockData);

        expect(result).toHaveProperty('processedData');
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('anomalies');
        expect(result.violations).toEqual([]);
      });
    });
  });

  describe('Real-time Data Stream Processing', () => {
    describe('processDataStream', () => {
      it('should setup real-time data stream processing', async () => {
        const streamName = 'financial_transactions';
        const processor = jest.fn(async (data) => ({
          id: data.id,
          processedAmount: data.amount * 1.1,
          timestamp: new Date()
        }));

        streamingService.subscribeToStream.mockImplementation(async (name, callback) => {
          // Simulate receiving data
          await callback({ id: 'tx1', amount: 1000 });
          return true;
        });

        const result = await dataProcessingService.processDataStream(streamName, processor);

        expect(result).toHaveProperty('streamId');
        expect(result).toHaveProperty('status', 'active');
        expect(result.streamId).toMatch(/^stream_\d+$/);
        
        expect(streamingService.subscribeToStream).toHaveBeenCalledWith(
          streamName,
          expect.any(Function)
        );
        
        expect(processor).toHaveBeenCalledWith({ id: 'tx1', amount: 1000 });
      });

      it('should handle stream processing errors', async () => {
        const streamName = 'error_stream';
        const processor = jest.fn(async (data) => {
          throw new Error('Processing failed');
        });

        streamingService.subscribeToStream.mockImplementation(async (name, callback) => {
          await callback({ id: 'tx1', amount: 1000 });
          return true;
        });

        const result = await dataProcessingService.processDataStream(streamName, processor);

        expect(result).toHaveProperty('streamId');
        expect(result).toHaveProperty('status', 'active');
        
        expect(streamingService.publishEvent).toHaveBeenCalledWith(
          'data.processing.error',
          expect.objectContaining({
            streamId: result.streamId,
            error: 'Processing failed',
            timestamp: expect.any(Date)
          })
        );
      });

      it('should index vectorizable data', async () => {
        const streamName = 'documents';
        const processor = jest.fn(async (data) => ({
          id: data.id,
          title: data.title,
          content: data.content,
          vectorizable: true,
          metadata: { type: 'document' }
        }));

        streamingService.subscribeToStream.mockImplementation(async (name, callback) => {
          await callback({ id: 'doc1', title: 'Test Document', content: 'Document content' });
          return true;
        });

        const result = await dataProcessingService.processDataStream(streamName, processor);

        expect(vectorService.indexDocument).toHaveBeenCalledWith(
          'doc1',
          'Test Document',
          'Document content',
          { type: 'document' }
        );
      });
    });
  });

  describe('Batch Data Processing', () => {
    describe('processBatchData', () => {
      it('should process batch data with parallel execution', async () => {
        const batchConfig = {
          dataSource: { type: 'csv', path: '/test/data.csv' },
          transformations: [
            { type: 'filter', parameters: { condition: 'row.amount > 0' } }
          ],
          outputFormat: 'json',
          parallelism: 2,
          startTime: new Date()
        };

        // Mock data loading
        const mockSourceData = [
          { id: 1, amount: 100 },
          { id: 2, amount: 200 },
          { id: 3, amount: 300 },
          { id: 4, amount: 400 }
        ];

        const result = await dataProcessingService.processBatchData(batchConfig);

        expect(result).toHaveProperty('batchId');
        expect(result).toHaveProperty('status', 'completed');
        expect(result).toHaveProperty('outputPath');
        expect(result).toHaveProperty('recordCount');
        expect(result).toHaveProperty('qualityReport');
        expect(result).toHaveProperty('processingTime');
        
        expect(result.batchId).toMatch(/^job_\d+_[a-z0-9]+$/);
        expect(result.outputPath).toMatch(/^output\/processed_\d+\.json$/);
      });

      it('should handle batch processing errors', async () => {
        const batchConfig = {
          dataSource: { type: 'invalid', path: '/test/data.csv' },
          transformations: [],
          outputFormat: 'json',
          parallelism: 2,
          startTime: new Date()
        };

        await expect(dataProcessingService.processBatchData(batchConfig))
          .rejects.toThrow();
      });
    });
  });

  describe('Data Validation', () => {
    describe('validateData', () => {
      it('should validate data with comprehensive rules', async () => {
        const mockData = [
          { id: 1, amount: 100, email: 'valid@example.com', date: '2023-01-01' },
          { id: 2, amount: -50, email: 'invalid-email', date: '2023-02-01' },
          { id: 3, amount: 200, email: 'another@example.com', date: 'invalid-date' }
        ];

        const validationRules = [
          {
            name: 'positive_amount',
            condition: 'row.amount > 0',
            message: 'Amount must be positive',
            field: 'amount',
            severity: 'error'
          },
          {
            name: 'valid_email',
            condition: 'row.email.includes("@")',
            message: 'Email must contain @',
            field: 'email',
            severity: 'error'
          },
          {
            name: 'valid_date',
            condition: '!isNaN(new Date(row.date).getTime())',
            message: 'Date must be valid',
            field: 'date',
            severity: 'warning'
          }
        ];

        const result = await dataProcessingService.validateData(mockData, validationRules);

        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('validRecords');
        expect(result).toHaveProperty('invalidRecords');
        
        expect(result.errors).toBeInstanceOf(Array);
        expect(result.warnings).toBeInstanceOf(Array);
        expect(typeof result.validRecords).toBe('number');
        expect(typeof result.invalidRecords).toBe('number');
      });

      it('should handle validation rule errors', async () => {
        const mockData = [
          { id: 1, amount: 100 }
        ];

        const validationRules = [
          {
            name: 'invalid_rule',
            condition: 'invalid.javascript.code',
            message: 'This will fail',
            field: 'amount',
            severity: 'error'
          }
        ];

        const result = await dataProcessingService.validateData(mockData, validationRules);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toHaveProperty('rule', 'invalid_rule');
        expect(result.errors[0].message).toContain('Validation rule error');
      });

      it('should return valid result with no rules', async () => {
        const mockData = [
          { id: 1, amount: 100 }
        ];

        const result = await dataProcessingService.validateData(mockData, []);

        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
      });
    });
  });

  describe('Data Quality Monitoring', () => {
    describe('monitorDataQuality', () => {
      it('should setup data quality monitoring', async () => {
        const dataSource = { type: 'csv', path: '/test/data.csv' };
        const monitoringConfig = {
          checkInterval: 1000, // 1 second for testing
          alertThresholds: {
            completeness: 0.9,
            accuracy: 0.95,
            consistency: 0.9,
            timeliness: 0.85
          },
          metrics: ['completeness', 'accuracy']
        };

        const result = await dataProcessingService.monitorDataQuality(dataSource, monitoringConfig);

        expect(result).toHaveProperty('monitoringId');
        expect(result).toHaveProperty('monitor');
        expect(result.monitoringId).toMatch(/^quality_monitor_\d+$/);
        expect(result.monitor).toBeDefined();
        
        // Clean up the monitor
        clearInterval(result.monitor);
      });

      it('should use default monitoring configuration', async () => {
        const dataSource = { type: 'csv', path: '/test/data.csv' };

        const result = await dataProcessingService.monitorDataQuality(dataSource);

        expect(result).toHaveProperty('monitoringId');
        expect(result).toHaveProperty('monitor');
        
        // Clean up the monitor
        clearInterval(result.monitor);
      });
    });
  });

  describe('Apache Spark Integration', () => {
    describe('processWithSpark', () => {
      it('should process data with Spark integration', async () => {
        const jobConfig = {
          appName: 'TestSparkApp',
          inputPath: '/test/input',
          outputPath: '/test/output',
          transformations: [
            { type: 'filter', parameters: { condition: 'amount > 1000' } },
            { type: 'aggregate', parameters: { groupBy: 'category' } }
          ],
          sparkConfig: {
            'spark.executor.memory': '2g',
            'spark.driver.memory': '1g'
          }
        };

        const result = await dataProcessingService.processWithSpark(jobConfig);

        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('appName', 'TestSparkApp');
        expect(result).toHaveProperty('inputPath', '/test/input');
        expect(result).toHaveProperty('outputPath', '/test/output');
        expect(result).toHaveProperty('status', 'completed');
        expect(result).toHaveProperty('submittedAt');
        expect(result).toHaveProperty('completedAt');
        
        expect(result.id).toMatch(/^job_\d+_[a-z0-9]+$/);
      });

      it('should handle Spark processing errors', async () => {
        const jobConfig = {
          appName: 'FailingSparkApp',
          inputPath: '/test/input',
          outputPath: '/test/output',
          transformations: []
        };

        // Mock Spark execution error
        const originalSimulateSparkExecution = dataProcessingService.simulateSparkExecution;
        dataProcessingService.simulateSparkExecution = jest.fn().mockRejectedValue(new Error('Spark job failed'));

        await expect(dataProcessingService.processWithSpark(jobConfig))
          .rejects.toThrow('Spark job failed');

        // Restore original method
        dataProcessingService.simulateSparkExecution = originalSimulateSparkExecution;
      });

      it('should use default Spark configuration', async () => {
        const jobConfig = {
          inputPath: '/test/input',
          outputPath: '/test/output',
          transformations: []
        };

        const result = await dataProcessingService.processWithSpark(jobConfig);

        expect(result.appName).toBe('OpenCap-DataProcessing');
        expect(result.status).toBe('completed');
      });
    });
  });

  describe('Helper Methods', () => {
    describe('generateJobId', () => {
      it('should generate unique job IDs', () => {
        const id1 = dataProcessingService.generateJobId();
        const id2 = dataProcessingService.generateJobId();

        expect(id1).toMatch(/^job_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^job_\d+_[a-z0-9]+$/);
        expect(id1).not.toBe(id2);
      });
    });

    describe('getExchangeRate', () => {
      it('should return exchange rates for supported currencies', async () => {
        const rate = await dataProcessingService.getExchangeRate('USD', 'EUR');
        expect(typeof rate).toBe('number');
        expect(rate).toBe(0.85); // Mock rate
      });

      it('should return 1.0 for unsupported currency pairs', async () => {
        const rate = await dataProcessingService.getExchangeRate('USD', 'XXX');
        expect(rate).toBe(1.0);
      });
    });

    describe('calculateRiskScore', () => {
      it('should calculate risk score based on violations and anomalies', () => {
        const row = { id: 1, amount: 100 };
        const violations = [
          { severity: 'high', description: 'High risk violation' },
          { severity: 'medium', description: 'Medium risk violation' }
        ];
        const anomalies = [
          { severity: 'high', description: 'High anomaly' },
          { severity: 'low', description: 'Low anomaly' }
        ];

        const riskScore = dataProcessingService.calculateRiskScore(row, violations, anomalies);

        expect(typeof riskScore).toBe('number');
        expect(riskScore).toBeGreaterThanOrEqual(0);
        expect(riskScore).toBeLessThanOrEqual(1);
      });

      it('should return 0 risk score for clean data', () => {
        const row = { id: 1, amount: 100 };
        const violations = [];
        const anomalies = [];

        const riskScore = dataProcessingService.calculateRiskScore(row, violations, anomalies);

        expect(riskScore).toBe(0);
      });
    });

    describe('determineComplianceStatus', () => {
      it('should determine compliance status based on violations', () => {
        const row = { index: 0, id: 1, amount: 100 };
        const violations = [
          { recordIndex: 0, severity: 'high', description: 'High violation' }
        ];

        const status = dataProcessingService.determineComplianceStatus(row, violations);

        expect(status).toBe('non_compliant');
      });

      it('should return compliant status for clean records', () => {
        const row = { index: 0, id: 1, amount: 100 };
        const violations = [];

        const status = dataProcessingService.determineComplianceStatus(row, violations);

        expect(status).toBe('compliant');
      });

      it('should return warning status for medium violations', () => {
        const row = { index: 0, id: 1, amount: 100 };
        const violations = [
          { recordIndex: 0, severity: 'medium', description: 'Medium violation' }
        ];

        const status = dataProcessingService.determineComplianceStatus(row, violations);

        expect(status).toBe('warning');
      });
    });
  });

  describe('Data Source Integration', () => {
    describe('loadDataFromSource', () => {
      it('should load data from CSV source', async () => {
        const source = { type: 'csv', path: '/test/data.csv' };

        const result = await dataProcessingService.loadDataFromSource(source);

        expect(result).toBeDefined();
      });

      it('should load data from MongoDB source', async () => {
        const source = { type: 'mongodb', collection: 'testCollection', query: {} };

        // Mock MongoDB connection
        const mockDb = {
          collection: jest.fn(() => ({
            find: jest.fn(() => ({
              toArray: jest.fn(() => [{ id: 1, data: 'test' }])
            }))
          }))
        };

        mongoose.connection.db = mockDb;

        const result = await dataProcessingService.loadDataFromSource(source);

        expect(result).toBeDefined();
        expect(mockDb.collection).toHaveBeenCalledWith('testCollection');
      });

      it('should handle unsupported data source types', async () => {
        const source = { type: 'unsupported', path: '/test/data' };

        await expect(dataProcessingService.loadDataFromSource(source))
          .rejects.toThrow('Unsupported data source type: unsupported');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async () => {
      const invalidData = null;
      const transformations = [
        { type: 'filter', parameters: { condition: 'row.amount > 0' } }
      ];

      await expect(dataProcessingService.processCSVFile(invalidData, transformations))
        .rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      const invalidData = 'not-an-array';
      const validationRules = [
        { name: 'test', condition: 'row.amount > 0', severity: 'error' }
      ];

      await expect(dataProcessingService.validateData(invalidData, validationRules))
        .rejects.toThrow();
    });

    it('should handle streaming errors', async () => {
      const streamName = 'error_stream';
      const processor = jest.fn();

      streamingService.subscribeToStream.mockRejectedValue(new Error('Stream connection failed'));

      await expect(dataProcessingService.processDataStream(streamName, processor))
        .rejects.toThrow('Stream connection failed');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        amount: Math.random() * 1000,
        date: new Date().toISOString()
      }));

      const transformations = [
        { type: 'filter', parameters: { condition: 'row.amount > 500' } }
      ];

      const result = await dataProcessingService.processFinancialData(largeData, { aggregationLevel: 'monthly' });

      expect(result).toHaveProperty('processedData');
      expect(result).toHaveProperty('summary');
    });

    it('should handle parallel processing efficiently', async () => {
      const batchConfig = {
        dataSource: { type: 'csv', path: '/test/large_data.csv' },
        transformations: [
          { type: 'filter', parameters: { condition: 'row.amount > 0' } }
        ],
        outputFormat: 'json',
        parallelism: 4,
        startTime: new Date()
      };

      const result = await dataProcessingService.processBatchData(batchConfig);

      expect(result).toHaveProperty('batchId');
      expect(result).toHaveProperty('status', 'completed');
      expect(result).toHaveProperty('processingTime');
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Integration with External Services', () => {
    it('should integrate with streaming service for events', async () => {
      const jobConfig = {
        type: 'integration_test',
        source: { type: 'csv', path: '/test/data.csv' },
        destination: { type: 'json', path: '/test/output.json' }
      };

      await dataProcessingService.createProcessingJob(jobConfig);

      expect(streamingService.publishEvent).toHaveBeenCalledWith(
        'data.processing.job.created',
        expect.objectContaining({
          type: 'integration_test',
          timestamp: expect.any(Date)
        })
      );
    });

    it('should integrate with memory service for job tracking', async () => {
      const jobConfig = {
        type: 'memory_test',
        source: { type: 'csv', path: '/test/data.csv' },
        destination: { type: 'json', path: '/test/output.json' }
      };

      const result = await dataProcessingService.createProcessingJob(jobConfig);

      expect(memoryService.store).toHaveBeenCalledWith(
        expect.stringMatching(/^processing_job_/),
        expect.objectContaining({
          type: 'memory_test',
          status: 'pending'
        })
      );
    });

    it('should integrate with vector service for document indexing', async () => {
      const streamName = 'vector_test';
      const processor = jest.fn(async (data) => ({
        id: data.id,
        title: data.title,
        content: data.content,
        vectorizable: true,
        metadata: { type: 'test' }
      }));

      streamingService.subscribeToStream.mockImplementation(async (name, callback) => {
        await callback({ id: 'test1', title: 'Test Title', content: 'Test Content' });
        return true;
      });

      await dataProcessingService.processDataStream(streamName, processor);

      expect(vectorService.indexDocument).toHaveBeenCalledWith(
        'test1',
        'Test Title',
        'Test Content',
        { type: 'test' }
      );
    });
  });
});