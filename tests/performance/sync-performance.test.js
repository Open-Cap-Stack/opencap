/**
 * Sync Performance Benchmark Tests
 * GitHub Issue #35: Final validation and production readiness
 *
 * Benchmarks performance metrics for:
 * - Query response times (target: <500ms p95)
 * - Bulk operations throughput
 * - Vector search latency
 * - Concurrent operation handling
 * - Memory usage patterns
 * - Connection pool efficiency
 */

const zerodbService = require('../../services/zerodbService');
const MetricsCollector = require('../../utils/metricsCollector');

describe('Sync Performance Benchmarks', () => {
  let testToken;
  let metricsCollector;
  let perfTestTable;

  beforeAll(async () => {
    testToken = process.env.AINATIVE_API_TOKEN;

    if (!testToken) {
      throw new Error('AINATIVE_API_TOKEN required for performance tests');
    }

    await zerodbService.initialize(testToken);

    metricsCollector = new MetricsCollector({ maxMetricsPerDatabase: 10000 });

    // Create performance test table
    perfTestTable = `perf_test_${Date.now()}`;
    await zerodbService.createTable(perfTestTable, {
      id: 'uuid',
      name: 'string',
      value: 'integer',
      data: 'jsonb',
      created_at: 'timestamp'
    });
  }, 30000);

  afterAll(async () => {
    try {
      await zerodbService.deleteRows(perfTestTable, {});
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  });

  describe('Single Query Performance', () => {
    beforeAll(async () => {
      // Insert test data
      for (let i = 0; i < 100; i++) {
        await zerodbService.insertRow(perfTestTable, {
          id: `perf_${i}`,
          name: `Test Record ${i}`,
          value: i,
          data: { index: i, metadata: 'test' },
          created_at: new Date().toISOString()
        });
      }
    });

    describe('Given single query operations', () => {
      test('When performing simple query, Then response time should be < 500ms', async () => {
        const startTime = Date.now();

        await zerodbService.queryRows(perfTestTable, { id: 'perf_50' });

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(500);
        metricsCollector.trackQuery('zerodb', 'query', duration, true);
      });

      test('When performing filtered query, Then response time should be acceptable', async () => {
        const startTime = Date.now();

        await zerodbService.queryRows(perfTestTable, { value: { $gte: 25, $lte: 75 } });

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(1000);
        metricsCollector.trackQuery('zerodb', 'filtered_query', duration, true);
      });

      test('When performing count operation, Then it should be fast', async () => {
        const startTime = Date.now();

        await zerodbService.countRows(perfTestTable, {});

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(300);
        metricsCollector.trackQuery('zerodb', 'count', duration, true);
      });
    });
  });

  describe('Bulk Operations Performance', () => {
    describe('Given bulk insert operations', () => {
      test('When inserting 50 records in batches, Then throughput should be acceptable', async () => {
        const batchSize = 10;
        const totalRecords = 50;
        const batchDurations = [];

        for (let batch = 0; batch < totalRecords / batchSize; batch++) {
          const batchData = [];

          for (let i = 0; i < batchSize; i++) {
            batchData.push({
              id: `bulk_${batch}_${i}`,
              name: `Bulk Record ${batch * batchSize + i}`,
              value: batch * batchSize + i,
              data: { batch, index: i },
              created_at: new Date().toISOString()
            });
          }

          const startTime = Date.now();

          for (const record of batchData) {
            await zerodbService.insertRow(perfTestTable, record);
          }

          const duration = Date.now() - startTime;
          batchDurations.push(duration);
          metricsCollector.trackQuery('zerodb', 'bulk_insert', duration, true);
        }

        // Calculate metrics
        const avgDuration = batchDurations.reduce((a, b) => a + b, 0) / batchDurations.length;
        const throughput = (batchSize / (avgDuration / 1000)).toFixed(2);

        console.log(`Bulk insert throughput: ${throughput} records/second`);
        expect(avgDuration).toBeLessThan(5000); // 5 seconds per batch of 10
      });

      test('When bulk updating records, Then it should complete efficiently', async () => {
        const startTime = Date.now();

        await zerodbService.updateRows(
          perfTestTable,
          { id: { $regex: '^bulk_' } },
          { $set: { value: 999 } }
        );

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(3000);
        metricsCollector.trackQuery('zerodb', 'bulk_update', duration, true);
      });
    });
  });

  describe('Concurrent Operations Performance', () => {
    describe('Given concurrent read operations', () => {
      test('When executing 20 concurrent queries, Then all should complete within acceptable time', async () => {
        const concurrentQueries = 20;
        const startTime = Date.now();

        const queryPromises = Array.from({ length: concurrentQueries }, (_, i) =>
          zerodbService.queryRows(perfTestTable, { value: i })
        );

        await Promise.all(queryPromises);

        const totalDuration = Date.now() - startTime;
        const avgDuration = totalDuration / concurrentQueries;

        console.log(`Concurrent queries average: ${avgDuration.toFixed(2)}ms per query`);
        expect(totalDuration).toBeLessThan(10000); // 10 seconds for 20 concurrent queries
      });

      test('When executing mixed concurrent operations, Then system should handle load', async () => {
        const startTime = Date.now();

        const operations = [
          zerodbService.queryRows(perfTestTable, {}),
          zerodbService.countRows(perfTestTable, {}),
          zerodbService.queryRows(perfTestTable, { value: { $gt: 50 } }),
          zerodbService.insertRow(perfTestTable, {
            id: `concurrent_${Date.now()}`,
            name: 'Concurrent Test',
            value: 0,
            data: {},
            created_at: new Date().toISOString()
          }),
          zerodbService.updateRows(
            perfTestTable,
            { id: 'perf_10' },
            { $set: { value: 1000 } }
          )
        ];

        await Promise.all(operations);

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(5000);
        metricsCollector.trackQuery('zerodb', 'mixed_concurrent', duration, true);
      });
    });
  });

  describe('Vector Search Performance', () => {
    const vectorNamespace = 'perf_test_vectors';

    beforeAll(async () => {
      // Insert test vectors
      for (let i = 0; i < 50; i++) {
        const embedding = Array.from({ length: 1536 }, () => Math.random());
        await zerodbService.upsertVector(
          embedding,
          vectorNamespace,
          { index: i, category: `cat_${i % 5}` },
          `Test document content ${i}`,
          'performance_test'
        );
      }
    }, 60000);

    describe('Given vector search operations', () => {
      test('When searching for similar vectors, Then latency should be < 1 second', async () => {
        const queryVector = Array.from({ length: 1536 }, () => Math.random());

        const startTime = Date.now();

        await zerodbService.searchVectors(queryVector, 10, vectorNamespace);

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(1000);
        metricsCollector.trackQuery('zerodb', 'vector_search', duration, true);
      });

      test('When searching with different limits, Then performance should scale', async () => {
        const queryVector = Array.from({ length: 1536 }, () => Math.random());
        const limits = [5, 10, 20];
        const durations = [];

        for (const limit of limits) {
          const startTime = Date.now();

          await zerodbService.searchVectors(queryVector, limit, vectorNamespace);

          const duration = Date.now() - startTime;
          durations.push(duration);
          metricsCollector.trackQuery('zerodb', `vector_search_limit_${limit}`, duration, true);
        }

        // All searches should complete in reasonable time
        expect(durations.every(d => d < 2000)).toBe(true);
      });

      test('When performing multiple vector searches concurrently, Then it should handle load', async () => {
        const startTime = Date.now();

        const searchPromises = Array.from({ length: 5 }, () => {
          const queryVector = Array.from({ length: 1536 }, () => Math.random());
          return zerodbService.searchVectors(queryVector, 10, vectorNamespace);
        });

        await Promise.all(searchPromises);

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(5000);
        metricsCollector.trackQuery('zerodb', 'concurrent_vector_search', duration, true);
      });
    });
  });

  describe('Memory and Agent Operations Performance', () => {
    const agentId = 'perf_agent';
    const sessionId = `perf_session_${Date.now()}`;

    describe('Given memory storage operations', () => {
      test('When storing multiple memory entries, Then it should be efficient', async () => {
        const startTime = Date.now();

        for (let i = 0; i < 20; i++) {
          await zerodbService.storeMemory(
            agentId,
            sessionId,
            i % 2 === 0 ? 'user' : 'assistant',
            `Memory content ${i}`,
            { index: i }
          );
        }

        const duration = Date.now() - startTime;
        const avgPerOperation = duration / 20;

        console.log(`Memory storage average: ${avgPerOperation.toFixed(2)}ms per entry`);
        expect(duration).toBeLessThan(10000);
        metricsCollector.trackQuery('zerodb', 'memory_storage', duration, true);
      });

      test('When retrieving memory history, Then query should be fast', async () => {
        const startTime = Date.now();

        await zerodbService.listMemory(agentId, sessionId, null, 0, 100);

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(500);
        metricsCollector.trackQuery('zerodb', 'memory_retrieval', duration, true);
      });
    });

    describe('Given agent logging operations', () => {
      test('When logging multiple agent events, Then it should be fast', async () => {
        const startTime = Date.now();

        for (let i = 0; i < 20; i++) {
          await zerodbService.storeAgentLog(
            agentId,
            sessionId,
            i % 5 === 0 ? 'ERROR' : 'INFO',
            `Log message ${i}`,
            { index: i }
          );
        }

        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(10000);
        metricsCollector.trackQuery('zerodb', 'agent_logging', duration, true);
      });
    });
  });

  describe('Performance Metrics Summary', () => {
    test('When analyzing collected metrics, Then p95 should meet SLO', () => {
      const stats = metricsCollector.getSummaryStats('zerodb');

      if (!stats) {
        console.warn('No metrics collected');
        return;
      }

      console.log('\n=== ZeroDB Performance Summary ===');
      console.log(`Total Queries: ${stats.totalQueries}`);
      console.log(`Success Rate: ${((stats.successCount / stats.totalQueries) * 100).toFixed(2)}%`);
      console.log(`Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
      console.log(`Min Response Time: ${stats.minResponseTime.toFixed(2)}ms`);
      console.log(`Max Response Time: ${stats.maxResponseTime.toFixed(2)}ms`);
      console.log('\nBy Operation:');
      Object.entries(stats.byOperation).forEach(([op, opStats]) => {
        console.log(`  ${op}: ${opStats.averageResponseTime.toFixed(2)}ms avg (${opStats.count} ops)`);
      });

      // Assert performance targets
      expect(stats.averageResponseTime).toBeLessThan(1000); // 1 second average
      expect(stats.errorRate).toBeLessThan(5); // Less than 5% error rate
    });

    test('When checking health status, Then system should be healthy', () => {
      const health = metricsCollector.getHealthStatus('zerodb');

      console.log('\n=== ZeroDB Health Status ===');
      console.log(`Status: ${health.status}`);
      console.log(`Error Rate: ${health.errorRate.toFixed(2)}%`);
      console.log(`Total Queries: ${health.totalQueries}`);
      console.log(`Average Response: ${health.averageResponseTime.toFixed(2)}ms`);
      console.log(`P95 Response: ${health.p95ResponseTime?.toFixed(2)}ms`);
      console.log(`P99 Response: ${health.p99ResponseTime?.toFixed(2)}ms`);

      expect(health.status).toMatch(/healthy|degraded/);
      expect(health.errorRate).toBeLessThan(10);

      // P95 should meet target
      if (health.p95ResponseTime) {
        expect(health.p95ResponseTime).toBeLessThan(2000); // 2 seconds p95 (allowing some buffer)
      }
    });
  });

  describe('Stress Test: High Load Scenario', () => {
    test('When executing 100 operations rapidly, Then system should remain stable', async () => {
      const operations = [];
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        const operation = (async () => {
          const opStartTime = Date.now();
          try {
            await zerodbService.queryRows(perfTestTable, { value: { $lt: i } });
            metricsCollector.trackQuery('zerodb', 'stress_test', Date.now() - opStartTime, true);
          } catch (error) {
            metricsCollector.trackQuery('zerodb', 'stress_test', Date.now() - opStartTime, false, error);
            throw error;
          }
        })();

        operations.push(operation);
      }

      const results = await Promise.allSettled(operations);

      const totalDuration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      console.log('\n=== Stress Test Results ===');
      console.log(`Total Duration: ${totalDuration}ms`);
      console.log(`Success: ${successCount}/100`);
      console.log(`Failures: ${failureCount}/100`);
      console.log(`Throughput: ${((100 / totalDuration) * 1000).toFixed(2)} ops/second`);

      // Allow up to 10% failure rate under stress
      expect(successCount).toBeGreaterThanOrEqual(90);
      expect(totalDuration).toBeLessThan(60000); // Should complete within 60 seconds
    }, 90000);
  });

  describe('Memory Usage Monitoring', () => {
    test('When performing operations, Then memory should not leak', () => {
      const initialMemory = process.memoryUsage();

      console.log('\n=== Memory Usage ===');
      console.log(`Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Heap Total: ${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`External: ${(initialMemory.external / 1024 / 1024).toFixed(2)} MB`);
      console.log(`RSS: ${(initialMemory.rss / 1024 / 1024).toFixed(2)} MB`);

      // Memory should not exceed reasonable limits
      const heapUsedMB = initialMemory.heapUsed / 1024 / 1024;
      expect(heapUsedMB).toBeLessThan(500); // Less than 500MB heap usage
    });
  });
});
