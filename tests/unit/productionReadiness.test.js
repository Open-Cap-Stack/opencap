/**
 * Production Readiness Validation Tests
 * GitHub Issue #35: Final validation and production readiness
 *
 * TDD approach: Tests written first to define expected behavior
 * for production readiness validation script and health check endpoints.
 */

const path = require('path');

// Mock axios before requiring zerodbService
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };
  return {
    create: jest.fn(() => mockAxiosInstance)
  };
});

// Mock zerodbService
jest.mock('../../services/zerodbService', () => ({
  projectId: null,
  token: null,
  getDatabaseStatus: jest.fn(),
  listTables: jest.fn(),
  initialize: jest.fn()
}));

const ProductionReadinessValidator = require('../../scripts/validate-production-readiness');
const zerodbService = require('../../services/zerodbService');

describe('Production Readiness Validation', () => {
  let validator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new ProductionReadinessValidator({
      skipApiTests: true,
      verbose: false
    });
  });

  describe('ProductionReadinessValidator', () => {
    describe('Given the validator is initialized', () => {
      test('When created with default options, Then it should have correct configuration', () => {
        const defaultValidator = new ProductionReadinessValidator();

        expect(defaultValidator).toBeDefined();
        expect(defaultValidator.config).toBeDefined();
        expect(defaultValidator.results).toBeDefined();
        expect(defaultValidator.results.passed).toEqual([]);
        expect(defaultValidator.results.failed).toEqual([]);
        expect(defaultValidator.results.warnings).toEqual([]);
      });

      test('When created with custom options, Then it should respect those options', () => {
        const customValidator = new ProductionReadinessValidator({
          skipApiTests: true,
          verbose: true,
          timeout: 5000
        });

        expect(customValidator.config.skipApiTests).toBe(true);
        expect(customValidator.config.verbose).toBe(true);
        expect(customValidator.config.timeout).toBe(5000);
      });
    });

    describe('Given environment validation is needed', () => {
      test('When checking for required environment variables, Then it should validate ZERODB_API_KEY', () => {
        const originalEnv = process.env.ZERODB_API_KEY;
        process.env.ZERODB_API_KEY = 'test-api-key';

        const result = validator.validateEnvironmentVariables();

        expect(result.checks).toContainEqual(
          expect.objectContaining({
            name: 'ZERODB_API_KEY',
            status: 'pass'
          })
        );

        process.env.ZERODB_API_KEY = originalEnv;
      });

      test('When required env var is missing, Then it should report failure', () => {
        const originalEnv = process.env.ZERODB_API_KEY;
        delete process.env.ZERODB_API_KEY;

        const result = validator.validateEnvironmentVariables();

        expect(result.checks).toContainEqual(
          expect.objectContaining({
            name: 'ZERODB_API_KEY',
            status: 'fail'
          })
        );

        if (originalEnv) process.env.ZERODB_API_KEY = originalEnv;
      });

      test('When NODE_ENV is production, Then it should validate production settings', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const result = validator.validateEnvironmentVariables();

        expect(result.checks).toContainEqual(
          expect.objectContaining({
            name: 'NODE_ENV',
            value: 'production'
          })
        );

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Given ZeroDB health check is needed', () => {
      test('When skipApiTests is true, Then health check should be skipped', async () => {
        const result = await validator.checkZeroDBHealth();

        expect(result.healthy).toBe(true);
        expect(result.skipped).toBe(true);
      });

      test('When ZeroDB is healthy with API tests enabled, Then health check should pass', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });

        zerodbService.getDatabaseStatus.mockResolvedValue({
          status: 'healthy',
          connections: 10,
          uptime: 86400
        });
        zerodbService.projectId = 'test-project-123';

        const result = await apiValidator.checkZeroDBHealth();

        expect(result.healthy).toBe(true);
        expect(result.status).toBe('healthy');
      });

      test('When ZeroDB is not initialized with API tests enabled, Then health check should fail', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });
        zerodbService.projectId = null;

        const result = await apiValidator.checkZeroDBHealth();

        expect(result.healthy).toBe(false);
        expect(result.error).toContain('not initialized');
      });

      test('When ZeroDB returns unhealthy status with API tests enabled, Then health check should fail', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });

        zerodbService.getDatabaseStatus.mockResolvedValue({
          status: 'degraded',
          connections: 0
        });
        zerodbService.projectId = 'test-project-123';

        const result = await apiValidator.checkZeroDBHealth();

        expect(result.healthy).toBe(false);
        expect(result.status).toBe('degraded');
      });

      test('When ZeroDB request times out with API tests enabled, Then it should handle gracefully', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });

        zerodbService.getDatabaseStatus.mockRejectedValue(new Error('Timeout'));
        zerodbService.projectId = 'test-project-123';

        const result = await apiValidator.checkZeroDBHealth();

        expect(result.healthy).toBe(false);
        expect(result.error).toContain('Timeout');
      });
    });

    describe('Given data integrity validation is needed', () => {
      test('When skipApiTests is true, Then data integrity check should be skipped', async () => {
        const result = await validator.validateDataIntegrity();

        expect(result.tablesExist).toBe(true);
        expect(result.skipped).toBe(true);
      });

      test('When checking table existence with API tests enabled, Then it should verify all required tables', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });

        zerodbService.listTables.mockResolvedValue([
          { name: 'users' },
          { name: 'companies' },
          { name: 'stakeholders' },
          { name: 'transactions' },
          { name: 'documents' },
          { name: 'equity_plans' },
          { name: 'fundraising_rounds' },
          { name: 'spvs' },
          { name: 'share_classes' },
          { name: 'financial_reports' },
          { name: 'activities' }
        ]);
        zerodbService.projectId = 'test-project-123';

        const result = await apiValidator.validateDataIntegrity();

        expect(result.tablesExist).toBe(true);
        expect(result.tableCount).toBeGreaterThanOrEqual(5);
      });

      test('When required tables are missing with API tests enabled, Then it should report which ones', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });

        zerodbService.listTables.mockResolvedValue([
          { name: 'users' }
        ]);
        zerodbService.projectId = 'test-project-123';

        const result = await apiValidator.validateDataIntegrity();

        expect(result.tablesExist).toBe(false);
        expect(result.missingTables).toBeDefined();
        expect(result.missingTables.length).toBeGreaterThan(0);
      });
    });

    describe('Given failover and recovery validation is needed', () => {
      test('When skipApiTests is true, Then failover test should be skipped', async () => {
        const result = await validator.testFailoverRecovery();

        expect(result.recoverySuccessful).toBe(true);
        expect(result.skipped).toBe(true);
      });

      test('When testing connection recovery with API tests enabled, Then it should verify reconnection works', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });

        zerodbService.getDatabaseStatus
          .mockRejectedValueOnce(new Error('Connection lost'))
          .mockResolvedValueOnce({ status: 'healthy' });
        zerodbService.projectId = 'test-project-123';

        const result = await apiValidator.testFailoverRecovery();

        expect(result.recoverySuccessful).toBe(true);
      });

      test('When recovery fails after retries with API tests enabled, Then it should report failure', async () => {
        const apiValidator = new ProductionReadinessValidator({
          skipApiTests: false,
          verbose: false
        });

        zerodbService.getDatabaseStatus.mockRejectedValue(new Error('Persistent failure'));
        zerodbService.projectId = 'test-project-123';

        const result = await apiValidator.testFailoverRecovery();

        expect(result.recoverySuccessful).toBe(false);
        expect(result.retryAttempts).toBeGreaterThan(0);
      });
    });

    describe('Given production deployment checklist validation', () => {
      test('When all checklist items pass, Then deployment should be approved', async () => {
        // Create a new validator and mock all validators to return passing results
        const testValidator = new ProductionReadinessValidator({
          skipApiTests: true,
          verbose: false
        });

        testValidator.validateEnvironmentVariables = jest.fn().mockReturnValue({ valid: true, checks: [] });
        testValidator.validateFileSystem = jest.fn().mockReturnValue({ valid: true });
        testValidator.validateSecurityConfig = jest.fn().mockReturnValue({ valid: true, checks: [] });
        testValidator.checkZeroDBHealth = jest.fn().mockResolvedValue({ healthy: true });
        testValidator.validateDataIntegrity = jest.fn().mockResolvedValue({ tablesExist: true });
        testValidator.testFailoverRecovery = jest.fn().mockResolvedValue({ recoverySuccessful: true });

        const result = await testValidator.runProductionChecklist();

        expect(result.deploymentReady).toBe(true);
        expect(result.passedChecks).toBeGreaterThan(0);
        expect(result.failedChecks).toBe(0);
      });

      test('When any checklist item fails, Then deployment should not be approved', async () => {
        // Create a new validator
        const testValidator = new ProductionReadinessValidator({
          skipApiTests: true,
          verbose: false
        });

        testValidator.validateEnvironmentVariables = jest.fn().mockReturnValue({ valid: false, checks: [] });
        testValidator.validateFileSystem = jest.fn().mockReturnValue({ valid: true });
        testValidator.validateSecurityConfig = jest.fn().mockReturnValue({ valid: true, checks: [] });
        testValidator.checkZeroDBHealth = jest.fn().mockResolvedValue({ healthy: true });
        testValidator.validateDataIntegrity = jest.fn().mockResolvedValue({ tablesExist: true });
        testValidator.testFailoverRecovery = jest.fn().mockResolvedValue({ recoverySuccessful: true });

        const result = await testValidator.runProductionChecklist();

        expect(result.deploymentReady).toBe(false);
        expect(result.failedChecks).toBeGreaterThan(0);
      });
    });

    describe('Given report generation is needed', () => {
      test('When generating report, Then it should include all sections', () => {
        validator.results = {
          passed: [{ name: 'test1', message: 'passed' }],
          failed: [],
          warnings: [{ name: 'test2', message: 'warning' }]
        };

        const report = validator.generateReport();

        expect(report).toContain('Production Readiness Report');
        expect(report).toContain('Passed');
        expect(report).toContain('Warnings');
      });

      test('When saving report to file, Then it should write to correct location', async () => {
        const fs = require('fs').promises;
        jest.spyOn(fs, 'writeFile').mockResolvedValue();

        validator.results = {
          passed: [],
          failed: [],
          warnings: []
        };

        await validator.saveReport('/tmp/test-report.md');

        expect(fs.writeFile).toHaveBeenCalled();
      });
    });
  });

  // Health check endpoint tests moved to healthRoutes.test.js

  describe('Validation Result Aggregation', () => {
    describe('Given multiple validation results', () => {
      test('When aggregating results, Then it should correctly count pass/fail/warn', () => {
        validator.addResult('pass', 'Test 1', 'Passed successfully');
        validator.addResult('fail', 'Test 2', 'Failed validation');
        validator.addResult('warn', 'Test 3', 'Warning issued');
        validator.addResult('pass', 'Test 4', 'Another pass');

        const summary = validator.getSummary();

        expect(summary.total).toBe(4);
        expect(summary.passed).toBe(2);
        expect(summary.failed).toBe(1);
        expect(summary.warnings).toBe(1);
      });

      test('When all validations pass, Then overall status should be ready', () => {
        validator.addResult('pass', 'Test 1', 'Passed');
        validator.addResult('pass', 'Test 2', 'Passed');

        expect(validator.isProductionReady()).toBe(true);
      });

      test('When any validation fails, Then overall status should be not ready', () => {
        validator.addResult('pass', 'Test 1', 'Passed');
        validator.addResult('fail', 'Test 2', 'Failed');

        expect(validator.isProductionReady()).toBe(false);
      });
    });
  });
});

describe('Production Readiness Script Integration', () => {
  describe('Given the validation script is executed', () => {
    test('When run with --dry-run flag, Then it should not make actual API calls', async () => {
      const validator = new ProductionReadinessValidator({
        dryRun: true,
        skipApiTests: true
      });

      const result = await validator.run();

      expect(result).toBeDefined();
      expect(result.dryRun).toBe(true);
    });

    test('When run with --verbose flag, Then it should include detailed output', async () => {
      const validator = new ProductionReadinessValidator({
        verbose: true,
        skipApiTests: true
      });

      const result = await validator.run();

      expect(result.verbose).toBe(true);
    });
  });
});
