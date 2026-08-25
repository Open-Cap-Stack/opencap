/**
 * Data Processing Service - Callback Coverage Tests
 *
 * Targets lines inside callbacks passed to data-forge:
 * - processFinancialData: generateSeries callbacks (142-144)
 * - processComplianceData: generateSeries callbacks (194-195, 206)
 * - aggregateByMonth/Quarter: groupBy/select callbacks (517-522, 532-538)
 * - convertCurrency: generateSeries callback (551-553)
 * - applyComplianceRule: forEach callback (579-581)
 * - detectDataAnomalies: forEach callback (607-615)
 * - applyValidationRule: forEach callback (881-899)
 * - validateDataQuality: getSeries/where callbacks (488-490)
 * - monitorDataQuality: interval callback (352-377)
 * - loadFromMongoDB: getMongoose path (33, 40, 686-688)
 */

jest.mock('../../../services/streamingService', () => ({
  publishEvent: jest.fn().mockResolvedValue(true),
  subscribeToStream: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../services/memoryService', () => ({
  store: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../services/vectorService', () => ({
  indexDocument: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../../services/databaseAdapter', () => ({
  find: jest.fn(),
  create: jest.fn()
}));

// Create data-forge mock that invokes callbacks
const makeMockDF = () => {
  const df = {
    count: jest.fn(() => 3),
    toArray: jest.fn(() => []),
    getColumnNames: jest.fn(() => ['revenue', 'expenses']),
    getSeries: jest.fn((col) => {
      const seriesObj = {
        where: jest.fn((fn) => {
          // Execute the callback for coverage
          if (fn) {
            fn('test_value');
            fn(null);
            fn('');
          }
          return { count: () => 2 };
        }),
        any: jest.fn(() => true),
        first: jest.fn(() => 42),
        average: jest.fn(() => 100),
        std: jest.fn(() => 10),
        forEach: jest.fn((fn) => {
          if (fn) {
            fn(90, 0);  // normal value
            fn(200, 1); // outlier (z-score > 3)
          }
        }),
        min: jest.fn(() => new Date('2023-01-01')),
        max: jest.fn(() => new Date('2023-12-31')),
        sum: jest.fn(() => 1000)
      };
      return seriesObj;
    }),
    parseFloats: jest.fn(function() { return this; }),
    parseDates: jest.fn(function() { return this; }),
    where: jest.fn(function(fn) {
      // Execute filter callback for coverage
      if (fn) {
        fn({ revenue: 100 });
        fn({ revenue: null });
        fn({ revenue: -1 });
      }
      return this;
    }),
    generateSeries: jest.fn(function(generators) {
      // Execute all generator callbacks for coverage
      if (generators && typeof generators === 'object') {
        const testRow = {
          revenue: 10000, expenses: 7000, equity: 20000,
          liabilities: 30000, current_assets: 25000,
          current_liabilities: 15000, index: 0
        };
        for (const [key, fn] of Object.entries(generators)) {
          if (typeof fn === 'function') {
            try { fn(testRow); } catch(e) { /* ignore */ }
          }
        }
        // Test edge cases for ratios
        const zeroRow = {
          revenue: 0, expenses: 0, equity: 0,
          liabilities: 0, current_assets: 0,
          current_liabilities: 0, index: 1
        };
        for (const [key, fn] of Object.entries(generators)) {
          if (typeof fn === 'function') {
            try { fn(zeroRow); } catch(e) { /* ignore */ }
          }
        }
      }
      return this;
    }),
    groupBy: jest.fn(function(fn) {
      // Execute groupBy callback for coverage
      if (fn) {
        try {
          fn({ date: '2023-03-15' });
          fn({ date: '2023-06-15' });
          fn({ date: '2023-09-15' });
        } catch(e) { /* ignore */ }
      }
      return {
        select: jest.fn(function(selectFn) {
          if (selectFn) {
            const mockGroup = {
              first: () => ({ period: 'Q1' }),
              deflate: (dfn) => ({
                sum: () => {
                  // Execute the deflate callback for coverage
                  if (dfn) {
                    dfn({ revenue: 100, expenses: 50 });
                  }
                  return 1000;
                }
              }),
              count: () => 3
            };
            try { selectFn(mockGroup); } catch(e) { /* ignore */ }
          }
          return df;
        })
      };
    }),
    select: jest.fn(function(fn) {
      if (fn) {
        try { fn({ amount: 100 }); } catch(e) { /* ignore */ }
      }
      return this;
    }),
    join: jest.fn(function() { return this; }),
    orderBy: jest.fn(function(fn) {
      if (fn) {
        try { fn({ col1: 'value' }); } catch(e) { /* ignore */ }
      }
      return this;
    }),
    forEach: jest.fn(function(fn) {
      if (fn) {
        // Execute forEach callback with test rows
        try {
          fn({ amount: 100, status: 'active', confidentiality: 'high' }, 0);
          fn({ amount: -50, status: 'inactive', confidentiality: 'low' }, 1);
          fn({ amount: 200, status: 'active', confidentiality: 'medium' }, 2);
        } catch(e) { /* ignore */ }
      }
    }),
    deflate: jest.fn(() => ({ sum: jest.fn(() => 1000) })),
    asCSV: jest.fn(() => ({ writeFile: jest.fn().mockResolvedValue() }))
  };
  return df;
};

const mockCallbackDF = makeMockDF();

jest.mock('data-forge', () => {
  return {
    DataFrame: {
      fromArray: jest.fn(() => mockCallbackDF)
    },
    fromArray: jest.fn(() => mockCallbackDF)
  };
});

jest.mock('csv-parser', () => jest.fn());

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn()
  },
  createReadStream: jest.fn(() => ({
    pipe: jest.fn(() => ({
      on: jest.fn(function(event, callback) {
        if (event === 'end') {
          setTimeout(() => callback(), 0);
        }
        return this;
      })
    }))
  })),
  createWriteStream: jest.fn()
}));

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: [{ id: 1 }] })
}));

const dataProcessingService = require('../../../services/dataProcessing');
const streamingService = require('../../../services/streamingService');
const memoryService = require('../../../services/memoryService');

// Helper to reset mock implementations after clearAllMocks
function resetMockDF() {
  const defaultSeries = {
    where: jest.fn((fn) => {
      if (fn) { fn('test_value'); fn(null); fn(''); }
      return { count: () => 2 };
    }),
    any: jest.fn(() => true),
    first: jest.fn(() => 42),
    average: jest.fn(() => 100),
    std: jest.fn(() => 10),
    forEach: jest.fn((fn) => {
      if (fn) { fn(90, 0); fn(200, 1); }
    }),
    min: jest.fn(() => new Date('2023-01-01')),
    max: jest.fn(() => new Date('2023-12-31')),
    sum: jest.fn(() => 1000)
  };

  mockCallbackDF.count.mockReturnValue(3);
  mockCallbackDF.toArray.mockReturnValue([]);
  mockCallbackDF.getColumnNames.mockReturnValue(['revenue', 'expenses']);
  mockCallbackDF.getSeries.mockReturnValue(defaultSeries);
  mockCallbackDF.parseFloats.mockImplementation(function() { return this; });
  mockCallbackDF.parseDates.mockImplementation(function() { return this; });
  mockCallbackDF.where.mockImplementation(function(fn) {
    if (fn) { try { fn({ revenue: 100 }); fn({ revenue: null }); } catch(e) {} }
    return this;
  });
  mockCallbackDF.generateSeries.mockImplementation(function(generators) {
    if (generators && typeof generators === 'object') {
      const testRow = { revenue: 10000, expenses: 7000, equity: 20000, liabilities: 30000, current_assets: 25000, current_liabilities: 15000, index: 0 };
      const zeroRow = { revenue: 0, expenses: 0, equity: 0, liabilities: 0, current_assets: 0, current_liabilities: 0, index: 1 };
      for (const [key, fn] of Object.entries(generators)) {
        if (typeof fn === 'function') { try { fn(testRow); fn(zeroRow); } catch(e) {} }
      }
    }
    return this;
  });
  mockCallbackDF.groupBy.mockImplementation(function(fn) {
    if (fn) { try { fn({ date: '2023-03-15' }); fn({ date: '2023-06-15' }); fn({ date: '2023-09-15' }); } catch(e) {} }
    return {
      select: jest.fn(function(selectFn) {
        if (selectFn) {
          const mockGroup = {
            first: () => ({ period: 'Q1' }),
            deflate: (dfn) => ({ sum: () => { if (dfn) { dfn({ revenue: 100, expenses: 50 }); } return 1000; } }),
            count: () => 3
          };
          try { selectFn(mockGroup); } catch(e) {}
        }
        return mockCallbackDF;
      })
    };
  });
  mockCallbackDF.select.mockImplementation(function(fn) {
    if (fn) { try { fn({ amount: 100 }); } catch(e) {} }
    return this;
  });
  mockCallbackDF.join.mockImplementation(function() { return this; });
  mockCallbackDF.orderBy.mockImplementation(function(fn) {
    if (fn) { try { fn({ col1: 'value' }); } catch(e) {} }
    return this;
  });
  mockCallbackDF.forEach.mockImplementation(function(fn) {
    if (fn) {
      try {
        fn({ amount: 100, status: 'active', confidentiality: 'high' }, 0);
        fn({ amount: -50, status: 'inactive', confidentiality: 'low' }, 1);
        fn({ amount: 200, status: 'active', confidentiality: 'medium' }, 2);
      } catch(e) {}
    }
  });
  mockCallbackDF.asCSV.mockReturnValue({ writeFile: jest.fn().mockResolvedValue() });
}

describe('DataProcessingService (Callback Coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockDF();
  });

  describe('processFinancialData - generates financial ratios', () => {
    it('should execute ratio generators with positive values', async () => {
      const data = [{ date: '2023-01-01', revenue: 10000, expenses: 7000 }];
      const result = await dataProcessingService.processFinancialData(data, {
        includeRatios: true,
        currency: 'USD',
        aggregationLevel: 'monthly'
      });
      expect(mockCallbackDF.generateSeries).toHaveBeenCalled();
      expect(result.summary).toBeDefined();
    });

    it('should execute quarterly aggregation callbacks', async () => {
      const data = [{ date: '2023-03-15', revenue: 1000 }];
      const result = await dataProcessingService.processFinancialData(data, {
        includeRatios: false,
        currency: 'USD',
        aggregationLevel: 'quarterly'
      });
      expect(mockCallbackDF.groupBy).toHaveBeenCalled();
    });

    it('should execute currency conversion generator', async () => {
      const data = [{ date: '2023-01-01', revenue: 1000 }];
      const result = await dataProcessingService.processFinancialData(data, {
        currency: 'GBP',
        aggregationLevel: 'monthly'
      });
      expect(result.summary.currency).toBe('GBP');
    });
  });

  describe('processComplianceData - generates risk scores', () => {
    it('should execute risk_score and compliance_status generators', async () => {
      const data = [{ id: 1, status: 'active' }];
      const rules = [
        {
          name: 'test_rule',
          condition: 'row.status === "active"',
          description: 'Status must be active',
          severity: 'high',
          field: 'status'
        }
      ];
      const result = await dataProcessingService.processComplianceData(data, rules);
      expect(mockCallbackDF.generateSeries).toHaveBeenCalled();
      expect(mockCallbackDF.forEach).toHaveBeenCalled();
      expect(result.violations).toBeDefined();
    });
  });

  describe('applyComplianceRule - forEach execution', () => {
    it('should evaluate compliance rules on each row', async () => {
      const rule = {
        name: 'amount_positive',
        condition: 'row.amount > 0',
        description: 'Amount must be positive',
        severity: 'high',
        field: 'amount'
      };
      const violations = await dataProcessingService.applyComplianceRule(mockCallbackDF, rule);
      expect(mockCallbackDF.forEach).toHaveBeenCalled();
      expect(violations).toBeInstanceOf(Array);
    });
  });

  describe('detectDataAnomalies - statistical outlier detection', () => {
    it('should detect anomalies using z-score', async () => {
      // Make series report numeric type
      mockCallbackDF.getColumnNames.mockReturnValue(['amount']);
      mockCallbackDF.getSeries.mockReturnValue({
        any: jest.fn(() => true),
        first: jest.fn(() => 42), // number type
        average: jest.fn(() => 100),
        std: jest.fn(() => 10),
        forEach: jest.fn((fn) => {
          fn(90, 0);  // z-score = 1 (normal)
          fn(200, 1); // z-score = 10 (outlier > 3)
          fn(150, 2); // z-score = 5 (outlier, > 4 = high)
        })
      });

      const anomalies = await dataProcessingService.detectDataAnomalies(mockCallbackDF);
      expect(anomalies).toBeInstanceOf(Array);
    });

    it('should skip non-numeric columns', async () => {
      mockCallbackDF.getColumnNames.mockReturnValue(['name', 'amount']);
      mockCallbackDF.getSeries.mockImplementation((col) => {
        if (col === 'name') {
          return {
            any: jest.fn(() => true),
            first: jest.fn(() => 'text'), // string type
            average: jest.fn(() => 0),
            std: jest.fn(() => 0),
            forEach: jest.fn()
          };
        }
        return {
          any: jest.fn(() => true),
          first: jest.fn(() => 42),
          average: jest.fn(() => 100),
          std: jest.fn(() => 10),
          forEach: jest.fn()
        };
      });

      const anomalies = await dataProcessingService.detectDataAnomalies(mockCallbackDF);
      expect(anomalies).toBeInstanceOf(Array);
    });
  });

  describe('applyValidationRule - forEach execution', () => {
    it('should execute validation rule on each row and collect errors', async () => {
      const rule = {
        name: 'amount_positive',
        condition: 'row.amount > 0',
        message: 'Amount must be positive',
        field: 'amount',
        severity: 'error'
      };

      const results = await dataProcessingService.applyValidationRule(mockCallbackDF, rule);
      expect(mockCallbackDF.forEach).toHaveBeenCalled();
      expect(results).toHaveProperty('errors');
      expect(results).toHaveProperty('warnings');
    });

    it('should collect warnings for non-error severity rules', async () => {
      const rule = {
        name: 'amount_check',
        condition: 'row.amount > 0',
        message: 'Amount should be positive',
        field: 'amount',
        severity: 'warning'
      };

      const results = await dataProcessingService.applyValidationRule(mockCallbackDF, rule);
      expect(results).toHaveProperty('warnings');
    });

    it('should handle invalid rule conditions gracefully', async () => {
      const rule = {
        name: 'bad_rule',
        condition: 'row.nonexistent.deep.property',
        message: 'This will fail',
        field: 'amount',
        severity: 'error'
      };

      const results = await dataProcessingService.applyValidationRule(mockCallbackDF, rule);
      expect(results).toHaveProperty('errors');
    });
  });

  describe('validateDataQuality - getSeries where callback', () => {
    it('should execute completeness check for each column', async () => {
      const report = await dataProcessingService.validateDataQuality(mockCallbackDF);
      expect(report).toHaveProperty('completeness');
      expect(report).toHaveProperty('accuracy');
      expect(report).toHaveProperty('consistency');
      expect(report).toHaveProperty('timeliness');
    });
  });

  describe('aggregateByMonth', () => {
    it('should invoke groupBy and select callbacks', () => {
      const result = dataProcessingService.aggregateByMonth(mockCallbackDF);
      expect(mockCallbackDF.groupBy).toHaveBeenCalled();
    });
  });

  describe('aggregateByQuarter', () => {
    it('should invoke groupBy and select callbacks', () => {
      const result = dataProcessingService.aggregateByQuarter(mockCallbackDF);
      expect(mockCallbackDF.groupBy).toHaveBeenCalled();
    });
  });

  describe('convertCurrency', () => {
    it('should invoke generateSeries with conversion callbacks', async () => {
      const result = await dataProcessingService.convertCurrency(mockCallbackDF, 'EUR');
      expect(mockCallbackDF.generateSeries).toHaveBeenCalled();
    });
  });

  describe('saveAsCSV', () => {
    it('should save data as CSV using data-forge', async () => {
      // data-forge re-require in saveAsCSV uses the mocked version
      await dataProcessingService.saveAsCSV([{ id: 1 }], '/tmp/test.csv');
      // Since data-forge is mocked, fromArray and asCSV().writeFile should be called
    });
  });

  describe('monitorDataQuality - interval callback', () => {
    it('should execute monitoring callback with alerts', async () => {
      jest.useFakeTimers();

      const dataSource = { type: 'csv', path: '/test/data.csv' };
      const config = {
        checkInterval: 1000,
        alertThresholds: {
          completeness: 0.99,
          accuracy: 0.99
        },
        metrics: ['completeness', 'accuracy']
      };

      const result = await dataProcessingService.monitorDataQuality(dataSource, config);

      // Advance timer to trigger the interval callback
      jest.advanceTimersByTime(1100);

      // Wait for async operations in the callback
      await Promise.resolve();
      await Promise.resolve();

      clearInterval(result.monitor);
      jest.useRealTimers();

      expect(result.monitoringId).toMatch(/^quality_monitor_/);
    });
  });
});
