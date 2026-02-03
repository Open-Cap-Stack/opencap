/**
 * Data Quality Service Unit Tests
 * Issue #50: Implement Data Processing Pipeline
 * TDD Red Phase: Tests written before implementation
 */
process.env.SKIP_DB_SETUP = 'true';
process.env.NODE_ENV = 'test';

const DataQualityService = require('../../../services/dataQualityService');

describe('DataQualityService', () => {
  describe('validateSchema', () => {
    const schema = {
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true, minLength: 2, maxLength: 100 },
        { name: 'email', type: 'string', required: true, pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
        { name: 'age', type: 'number', required: false, min: 0, max: 150 },
        { name: 'isActive', type: 'boolean', required: false },
        { name: 'createdAt', type: 'date', required: true }
      ]
    };

    it('should validate data that matches schema', () => {
      const data = [
        { id: '1', name: 'John Doe', email: 'john@example.com', age: 30, isActive: true, createdAt: '2024-01-15' }
      ];

      const result = DataQualityService.validateSchema(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validRecords).toBe(1);
      expect(result.invalidRecords).toBe(0);
    });

    it('should detect missing required fields', () => {
      const data = [
        { id: '1', email: 'john@example.com', createdAt: '2024-01-15' }
      ];

      const result = DataQualityService.validateSchema(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty('field', 'name');
      expect(result.errors[0]).toHaveProperty('type', 'required');
    });

    it('should detect type mismatches', () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com', age: 'thirty', isActive: true, createdAt: '2024-01-15' }
      ];

      const result = DataQualityService.validateSchema(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'age' && e.type === 'type_mismatch')).toBe(true);
    });

    it('should detect pattern violations', () => {
      const data = [
        { id: '1', name: 'John', email: 'invalid-email', createdAt: '2024-01-15' }
      ];

      const result = DataQualityService.validateSchema(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'email' && e.type === 'pattern')).toBe(true);
    });

    it('should detect min/max violations for numbers', () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com', age: -5, createdAt: '2024-01-15' }
      ];

      const result = DataQualityService.validateSchema(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'age' && e.type === 'min')).toBe(true);
    });

    it('should detect minLength/maxLength violations for strings', () => {
      const data = [
        { id: '1', name: 'J', email: 'john@example.com', createdAt: '2024-01-15' }
      ];

      const result = DataQualityService.validateSchema(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.type === 'minLength')).toBe(true);
    });

    it('should validate multiple records and aggregate results', () => {
      const data = [
        { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: '2024-01-15' },
        { id: '2', email: 'jane@example.com', createdAt: '2024-01-16' },
        { id: '3', name: 'Bob Smith', email: 'bob@example.com', createdAt: '2024-01-17' }
      ];

      const result = DataQualityService.validateSchema(data, schema);

      expect(result.validRecords).toBe(2);
      expect(result.invalidRecords).toBe(1);
      expect(result.recordErrors).toHaveProperty('1');
    });

    it('should handle empty data array', () => {
      const result = DataQualityService.validateSchema([], schema);

      expect(result.valid).toBe(true);
      expect(result.validRecords).toBe(0);
      expect(result.invalidRecords).toBe(0);
    });

    it('should validate enum values', () => {
      const enumSchema = {
        fields: [
          { name: 'status', type: 'string', required: true, enum: ['active', 'inactive', 'pending'] }
        ]
      };

      const invalidData = [{ status: 'unknown' }];
      const validData = [{ status: 'active' }];

      const invalidResult = DataQualityService.validateSchema(invalidData, enumSchema);
      const validResult = DataQualityService.validateSchema(validData, enumSchema);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.some(e => e.type === 'enum')).toBe(true);
      expect(validResult.valid).toBe(true);
    });
  });

  describe('checkCompleteness', () => {
    it('should calculate completeness score for data', () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com', phone: '123-456-7890' },
        { id: '2', name: 'Jane', email: null, phone: '234-567-8901' },
        { id: '3', name: null, email: 'bob@example.com', phone: null }
      ];

      const result = DataQualityService.checkCompleteness(data);

      expect(result.overallCompleteness).toBeGreaterThan(0);
      expect(result.overallCompleteness).toBeLessThanOrEqual(1);
      expect(result.fieldCompleteness).toHaveProperty('id');
      expect(result.fieldCompleteness).toHaveProperty('name');
      expect(result.fieldCompleteness).toHaveProperty('email');
      expect(result.fieldCompleteness).toHaveProperty('phone');
    });

    it('should identify fields with missing values', () => {
      const data = [
        { id: '1', name: 'John', email: null },
        { id: '2', name: null, email: 'jane@example.com' }
      ];

      const result = DataQualityService.checkCompleteness(data);

      expect(result.fieldCompleteness.id).toBe(1);
      expect(result.fieldCompleteness.name).toBe(0.5);
      expect(result.fieldCompleteness.email).toBe(0.5);
    });

    it('should check completeness against required fields', () => {
      const data = [
        { id: '1', name: 'John', email: null, optional: null },
        { id: '2', name: null, email: 'jane@example.com', optional: 'value' }
      ];

      const requiredFields = ['id', 'name', 'email'];

      const result = DataQualityService.checkCompleteness(data, { requiredFields });

      expect(result.requiredFieldCompleteness).toBeDefined();
      expect(result.missingRequiredFields).toContain('name');
      expect(result.missingRequiredFields).toContain('email');
    });

    it('should handle completely empty data', () => {
      const result = DataQualityService.checkCompleteness([]);

      expect(result.overallCompleteness).toBe(1);
      expect(result.recordCount).toBe(0);
    });

    it('should treat empty strings as missing values when configured', () => {
      const data = [
        { id: '1', name: '', email: 'john@example.com' }
      ];

      const result = DataQualityService.checkCompleteness(data, { treatEmptyAsNull: true });

      expect(result.fieldCompleteness.name).toBe(0);
    });

    it('should identify records with missing values', () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: null, email: 'jane@example.com' }
      ];

      const result = DataQualityService.checkCompleteness(data);

      expect(result.incompleteRecords).toBeDefined();
      expect(result.incompleteRecords).toHaveLength(1);
      expect(result.incompleteRecords[0].recordIndex).toBe(1);
    });
  });

  describe('detectAnomalies', () => {
    describe('Statistical anomalies', () => {
      it('should detect outliers using z-score method', () => {
        const data = [
          { id: '1', value: 100 },
          { id: '2', value: 105 },
          { id: '3', value: 98 },
          { id: '4', value: 102 },
          { id: '5', value: 101 },
          { id: '6', value: 99 },
          { id: '7', value: 103 },
          { id: '8', value: 97 },
          { id: '9', value: 104 },
          { id: '10', value: 500 }  // Outlier (much more extreme)
        ];

        const result = DataQualityService.detectAnomalies(data, {
          method: 'zscore',
          threshold: 2,
          fields: ['value']
        });

        expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
        expect(result.anomalies.some(a => a.recordId === '10')).toBe(true);
        expect(result.anomalies[0].field).toBe('value');
        expect(result.anomalies[0].type).toBe('outlier');
      });

      it('should detect outliers using IQR method', () => {
        const data = [
          { id: '1', value: 10 },
          { id: '2', value: 12 },
          { id: '3', value: 11 },
          { id: '4', value: 13 },
          { id: '5', value: 9 },
          { id: '6', value: 100 }  // Outlier
        ];

        const result = DataQualityService.detectAnomalies(data, {
          method: 'iqr',
          fields: ['value']
        });

        expect(result.anomalies.some(a => a.recordId === '6')).toBe(true);
      });

      it('should detect multiple field anomalies', () => {
        const data = [
          { id: '1', revenue: 100000, expenses: 80000 },
          { id: '2', revenue: 110000, expenses: 85000 },
          { id: '3', revenue: 105000, expenses: 82000 },
          { id: '4', revenue: 108000, expenses: 83000 },
          { id: '5', revenue: 102000, expenses: 81000 },
          { id: '6', revenue: 107000, expenses: 84000 },
          { id: '7', revenue: 103000, expenses: 79000 },
          { id: '8', revenue: 109000, expenses: 86000 },
          { id: '9', revenue: 1000000, expenses: 5000000 }  // Both anomalous
        ];

        const result = DataQualityService.detectAnomalies(data, {
          method: 'zscore',
          threshold: 2,
          fields: ['revenue', 'expenses']
        });

        expect(result.anomalies.length).toBeGreaterThanOrEqual(1);
        expect(result.anomalies.some(a => a.recordId === '9')).toBe(true);
      });
    });

    describe('Pattern anomalies', () => {
      it('should detect format anomalies in strings', () => {
        const data = [
          { id: '1', phone: '123-456-7890' },
          { id: '2', phone: '234-567-8901' },
          { id: '3', phone: '1234567890' }  // Different format
        ];

        const result = DataQualityService.detectAnomalies(data, {
          method: 'pattern',
          fields: ['phone'],
          patterns: { phone: '^\\d{3}-\\d{3}-\\d{4}$' }
        });

        expect(result.anomalies.some(a => a.recordId === '3' && a.type === 'pattern_violation')).toBe(true);
      });

      it('should detect unexpected null values', () => {
        const data = [
          { id: '1', name: 'John', status: 'active' },
          { id: '2', name: 'Jane', status: 'active' },
          { id: '3', name: null, status: 'active' }  // Unexpected null
        ];

        const result = DataQualityService.detectAnomalies(data, {
          method: 'null_detection',
          fields: ['name']
        });

        expect(result.anomalies.some(a => a.type === 'unexpected_null')).toBe(true);
      });
    });

    describe('Business rule anomalies', () => {
      it('should detect business rule violations', () => {
        const data = [
          { id: '1', revenue: 100000, expenses: 80000 },
          { id: '2', revenue: 50000, expenses: 100000 }  // Expenses > Revenue (loss)
        ];

        const result = DataQualityService.detectAnomalies(data, {
          method: 'business_rules',
          rules: [
            { condition: 'expenses > revenue', severity: 'warning', message: 'Expenses exceed revenue' }
          ]
        });

        expect(result.anomalies.some(a => a.recordId === '2' && a.type === 'business_rule_violation')).toBe(true);
      });

      it('should detect temporal anomalies', () => {
        const data = [
          { id: '1', startDate: '2024-01-01', endDate: '2024-06-01' },
          { id: '2', startDate: '2024-06-01', endDate: '2024-01-01' }  // End before start
        ];

        const result = DataQualityService.detectAnomalies(data, {
          method: 'business_rules',
          rules: [
            { condition: 'endDate < startDate', severity: 'error', message: 'End date before start date' }
          ]
        });

        expect(result.anomalies.some(a => a.recordId === '2')).toBe(true);
      });
    });

    it('should calculate anomaly statistics', () => {
      const data = [
        { id: '1', value: 100 },
        { id: '2', value: 105 },
        { id: '3', value: 500 }
      ];

      const result = DataQualityService.detectAnomalies(data, {
        method: 'zscore',
        threshold: 2,
        fields: ['value']
      });

      expect(result.statistics).toBeDefined();
      expect(result.statistics.totalRecords).toBe(3);
      expect(result.statistics.anomalyCount).toBeGreaterThanOrEqual(0);
      expect(result.statistics.anomalyRate).toBeDefined();
    });

    it('should handle empty data', () => {
      const result = DataQualityService.detectAnomalies([], {
        method: 'zscore',
        fields: ['value']
      });

      expect(result.anomalies).toEqual([]);
      expect(result.statistics.totalRecords).toBe(0);
    });
  });

  describe('generateQualityReport', () => {
    const sampleData = [
      { id: '1', name: 'John Doe', email: 'john@example.com', revenue: 100000 },
      { id: '2', name: null, email: 'jane@example.com', revenue: 150000 },
      { id: '3', name: 'Bob Smith', email: 'invalid-email', revenue: 5000000 }
    ];

    const schema = {
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'name', type: 'string', required: true },
        { name: 'email', type: 'string', required: true, pattern: '^[\\w.+-]+@[\\w.-]+\\.[a-zA-Z]{2,}$' },
        { name: 'revenue', type: 'number', required: true, min: 0 }
      ]
    };

    it('should generate comprehensive quality report', () => {
      const report = DataQualityService.generateQualityReport(sampleData, {
        schema,
        anomalyConfig: { method: 'zscore', threshold: 2, fields: ['revenue'] }
      });

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('schemaValidation');
      expect(report).toHaveProperty('completeness');
      expect(report).toHaveProperty('anomalies');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('generatedAt');
    });

    it('should calculate overall quality score', () => {
      const report = DataQualityService.generateQualityReport(sampleData, {
        schema,
        anomalyConfig: { method: 'zscore', threshold: 2, fields: ['revenue'] }
      });

      expect(report.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallScore).toBeLessThanOrEqual(100);
    });

    it('should include dimension scores', () => {
      const report = DataQualityService.generateQualityReport(sampleData, {
        schema,
        anomalyConfig: { method: 'zscore', threshold: 2, fields: ['revenue'] }
      });

      expect(report.summary.dimensionScores).toHaveProperty('completeness');
      expect(report.summary.dimensionScores).toHaveProperty('validity');
      expect(report.summary.dimensionScores).toHaveProperty('consistency');
      expect(report.summary.dimensionScores).toHaveProperty('accuracy');
    });

    it('should provide actionable recommendations', () => {
      const report = DataQualityService.generateQualityReport(sampleData, {
        schema,
        anomalyConfig: { method: 'zscore', threshold: 2, fields: ['revenue'] }
      });

      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0]).toHaveProperty('issue');
      expect(report.recommendations[0]).toHaveProperty('recommendation');
      expect(report.recommendations[0]).toHaveProperty('priority');
    });

    it('should include detailed field-level analysis', () => {
      const report = DataQualityService.generateQualityReport(sampleData, {
        schema,
        anomalyConfig: { method: 'zscore', threshold: 2, fields: ['revenue'] }
      });

      expect(report.fieldAnalysis).toBeDefined();
      expect(report.fieldAnalysis).toHaveProperty('id');
      expect(report.fieldAnalysis.id).toHaveProperty('completeness');
      expect(report.fieldAnalysis.id).toHaveProperty('validity');
    });

    it('should handle custom quality thresholds', () => {
      const report = DataQualityService.generateQualityReport(sampleData, {
        schema,
        thresholds: {
          completeness: 0.95,
          validity: 0.98,
          anomalyRate: 0.05
        }
      });

      expect(report.thresholdViolations).toBeDefined();
    });

    it('should generate report for empty data', () => {
      const report = DataQualityService.generateQualityReport([], { schema });

      expect(report.summary.recordCount).toBe(0);
      expect(report.summary.overallScore).toBeDefined();
    });

    it('should include timestamp and metadata', () => {
      const report = DataQualityService.generateQualityReport(sampleData, {
        schema,
        metadata: { dataSource: 'test', version: '1.0' }
      });

      expect(report.generatedAt).toBeDefined();
      expect(report.metadata).toHaveProperty('dataSource', 'test');
      expect(report.metadata).toHaveProperty('version', '1.0');
    });
  });

  describe('Quality Metrics Calculation', () => {
    it('should calculate precision metric', () => {
      const data = [
        { id: '1', value: 123.456789 },
        { id: '2', value: 234.567890 }
      ];

      const result = DataQualityService.calculatePrecision(data, 'value', 2);

      expect(result.precisionScore).toBeDefined();
      expect(result.valuesExceedingPrecision).toBeDefined();
    });

    it('should calculate uniqueness metric', () => {
      const data = [
        { id: '1', email: 'john@example.com' },
        { id: '2', email: 'jane@example.com' },
        { id: '3', email: 'john@example.com' }  // Duplicate
      ];

      const result = DataQualityService.calculateUniqueness(data, 'email');

      expect(result.uniquenessScore).toBe(2 / 3);
      expect(result.duplicates).toHaveLength(1);
    });

    it('should calculate timeliness metric', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const data = [
        { id: '1', updatedAt: now.toISOString() },
        { id: '2', updatedAt: yesterday.toISOString() },
        { id: '3', updatedAt: lastWeek.toISOString() }
      ];

      const result = DataQualityService.calculateTimeliness(data, 'updatedAt', {
        freshnessThreshold: 48 * 60 * 60 * 1000 // 48 hours
      });

      expect(result.timelinessScore).toBeDefined();
      expect(result.staleRecords).toHaveLength(1);
    });
  });

  describe('Data Profiling', () => {
    it('should generate field profile', () => {
      const data = [
        { id: '1', name: 'John', value: 100, date: '2024-01-15' },
        { id: '2', name: 'Jane', value: 200, date: '2024-02-20' },
        { id: '3', name: 'Bob', value: 150, date: '2024-03-10' }
      ];

      const profile = DataQualityService.profileField(data, 'value');

      expect(profile).toHaveProperty('fieldName', 'value');
      expect(profile).toHaveProperty('dataType');
      expect(profile).toHaveProperty('count');
      expect(profile).toHaveProperty('nullCount');
      expect(profile).toHaveProperty('uniqueCount');
      expect(profile.statistics).toHaveProperty('min');
      expect(profile.statistics).toHaveProperty('max');
      expect(profile.statistics).toHaveProperty('mean');
      expect(profile.statistics).toHaveProperty('median');
      expect(profile.statistics).toHaveProperty('stdDev');
    });

    it('should generate string field profile', () => {
      const data = [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane' },
        { id: '3', name: 'Bob Smith' }
      ];

      const profile = DataQualityService.profileField(data, 'name');

      expect(profile.statistics).toHaveProperty('minLength');
      expect(profile.statistics).toHaveProperty('maxLength');
      expect(profile.statistics).toHaveProperty('avgLength');
    });

    it('should generate date field profile', () => {
      const data = [
        { id: '1', date: '2024-01-15' },
        { id: '2', date: '2024-06-20' },
        { id: '3', date: '2024-12-10' }
      ];

      const profile = DataQualityService.profileField(data, 'date');

      expect(profile.statistics).toHaveProperty('earliest');
      expect(profile.statistics).toHaveProperty('latest');
      expect(profile.statistics).toHaveProperty('range');
    });

    it('should generate complete data profile', () => {
      const data = [
        { id: '1', name: 'John', value: 100 },
        { id: '2', name: 'Jane', value: 200 }
      ];

      const profile = DataQualityService.profileData(data);

      expect(profile).toHaveProperty('recordCount');
      expect(profile).toHaveProperty('fieldCount');
      expect(profile).toHaveProperty('fields');
      expect(profile.fields).toHaveProperty('id');
      expect(profile.fields).toHaveProperty('name');
      expect(profile.fields).toHaveProperty('value');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid schema gracefully', () => {
      const data = [{ id: '1', name: 'Test' }];

      expect(() => DataQualityService.validateSchema(data, null))
        .toThrow('Schema is required for validation');
    });

    it('should handle non-array data input', () => {
      expect(() => DataQualityService.validateSchema('not-an-array', {}))
        .toThrow('Data must be an array');
    });

    it('should handle invalid anomaly detection config', () => {
      const data = [{ id: '1', value: 100 }];

      expect(() => DataQualityService.detectAnomalies(data, { method: 'invalid' }))
        .toThrow('Unsupported anomaly detection method: invalid');
    });
  });
});
