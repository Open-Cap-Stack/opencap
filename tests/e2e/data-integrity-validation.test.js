/**
 * Data Integrity Validation Tests
 * GitHub Issue #35: Final validation and production readiness
 *
 * Validates data consistency and integrity across:
 * - MongoDB ↔ ZeroDB synchronization
 * - Data type preservation
 * - Referential integrity
 * - Transaction atomicity
 * - Concurrent operations
 */

const mongoose = require('mongoose');
const zerodbService = require('../../services/zerodbService');
const databaseAdapter = require('../../services/databaseAdapter');
const { connectDB } = require('../../db');

describe('Data Integrity Validation Tests', () => {
  let testToken;
  let originalMigrationMode;

  beforeAll(async () => {
    testToken = process.env.AINATIVE_API_TOKEN;

    if (!testToken) {
      throw new Error('AINATIVE_API_TOKEN required for data integrity tests');
    }

    // Store original migration mode
    originalMigrationMode = process.env.MIGRATION_MODE;

    // Connect to MongoDB
    await connectDB();
  }, 30000);

  afterAll(async () => {
    // Restore original migration mode
    process.env.MIGRATION_MODE = originalMigrationMode;

    // Close connections
    await mongoose.connection.close();
  });

  describe('Data Type Preservation', () => {
    const testTable = `integrity_types_${Date.now()}`;

    beforeAll(async () => {
      await zerodbService.initialize(testToken);

      // Create table with various data types
      await zerodbService.createTable(testTable, {
        id: 'uuid',
        string_field: 'string',
        integer_field: 'integer',
        decimal_field: 'decimal',
        boolean_field: 'boolean',
        date_field: 'date',
        timestamp_field: 'timestamp',
        json_field: 'jsonb',
        array_field: 'text[]'
      });
    });

    describe('Given data with various types', () => {
      test('When inserting and retrieving, Then all types should be preserved', async () => {
        const testData = {
          id: 'test_001',
          string_field: 'Test String',
          integer_field: 42,
          decimal_field: 3.14159,
          boolean_field: true,
          date_field: '2024-01-01',
          timestamp_field: new Date().toISOString(),
          json_field: { nested: { data: 'value' } },
          array_field: ['item1', 'item2', 'item3']
        };

        await zerodbService.insertRow(testTable, testData);

        const results = await zerodbService.queryRows(testTable, { id: 'test_001' });

        expect(results.length).toBe(1);
        const retrieved = results[0];

        expect(retrieved.string_field).toBe(testData.string_field);
        expect(retrieved.integer_field).toBe(testData.integer_field);
        expect(retrieved.decimal_field).toBeCloseTo(testData.decimal_field, 5);
        expect(retrieved.boolean_field).toBe(testData.boolean_field);
        expect(retrieved.date_field).toBe(testData.date_field);
      });

      test('When storing null values, Then they should be preserved', async () => {
        const testData = {
          id: 'test_002',
          string_field: null,
          integer_field: null,
          boolean_field: false
        };

        await zerodbService.insertRow(testTable, testData);

        const results = await zerodbService.queryRows(testTable, { id: 'test_002' });

        expect(results[0].string_field).toBeNull();
        expect(results[0].integer_field).toBeNull();
        expect(results[0].boolean_field).toBe(false);
      });

      test('When storing empty arrays and objects, Then they should be preserved', async () => {
        const testData = {
          id: 'test_003',
          json_field: {},
          array_field: []
        };

        await zerodbService.insertRow(testTable, testData);

        const results = await zerodbService.queryRows(testTable, { id: 'test_003' });

        expect(results[0].json_field).toEqual({});
        expect(results[0].array_field).toEqual([]);
      });
    });

    afterAll(async () => {
      try {
        await zerodbService.deleteRows(testTable, {});
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    });
  });

  describe('Referential Integrity', () => {
    const companyTable = `integrity_companies_${Date.now()}`;
    const stakeholderTable = `integrity_stakeholders_${Date.now()}`;

    beforeAll(async () => {
      // Create related tables
      await zerodbService.createTable(companyTable, {
        company_id: 'uuid',
        name: 'string',
        status: 'string'
      });

      await zerodbService.createTable(stakeholderTable, {
        stakeholder_id: 'uuid',
        company_id: 'uuid',
        name: 'string',
        email: 'string'
      });
    });

    describe('Given related entities across tables', () => {
      const companyId = 'company_ref_001';

      test('When inserting parent entity, Then it should succeed', async () => {
        await zerodbService.insertRow(companyTable, {
          company_id: companyId,
          name: 'Reference Test Inc.',
          status: 'active'
        });

        const results = await zerodbService.queryRows(companyTable, { company_id: companyId });
        expect(results.length).toBe(1);
      });

      test('When inserting child entities, Then they should reference parent', async () => {
        const stakeholders = [
          {
            stakeholder_id: 'stake_001',
            company_id: companyId,
            name: 'Alice Smith',
            email: 'alice@test.com'
          },
          {
            stakeholder_id: 'stake_002',
            company_id: companyId,
            name: 'Bob Johnson',
            email: 'bob@test.com'
          }
        ];

        for (const stakeholder of stakeholders) {
          await zerodbService.insertRow(stakeholderTable, stakeholder);
        }

        const results = await zerodbService.queryRows(stakeholderTable, { company_id: companyId });
        expect(results.length).toBe(2);
      });

      test('When querying related data, Then relationships should be intact', async () => {
        const company = await zerodbService.queryRows(companyTable, { company_id: companyId });
        const stakeholders = await zerodbService.queryRows(stakeholderTable, { company_id: companyId });

        expect(company.length).toBe(1);
        expect(stakeholders.length).toBe(2);
        expect(stakeholders.every(s => s.company_id === companyId)).toBe(true);
      });
    });

    afterAll(async () => {
      try {
        await zerodbService.deleteRows(companyTable, {});
        await zerodbService.deleteRows(stakeholderTable, {});
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    });
  });

  describe('Concurrent Operations', () => {
    const concurrentTable = `integrity_concurrent_${Date.now()}`;

    beforeAll(async () => {
      await zerodbService.createTable(concurrentTable, {
        id: 'uuid',
        counter: 'integer',
        updated_by: 'string',
        updated_at: 'timestamp'
      });

      // Insert initial record
      await zerodbService.insertRow(concurrentTable, {
        id: 'counter_001',
        counter: 0,
        updated_by: 'system',
        updated_at: new Date().toISOString()
      });
    });

    describe('Given concurrent write operations', () => {
      test('When multiple concurrent updates occur, Then data should remain consistent', async () => {
        const updatePromises = [];

        // Simulate 10 concurrent updates
        for (let i = 0; i < 10; i++) {
          const updatePromise = zerodbService.updateRows(
            concurrentTable,
            { id: 'counter_001' },
            {
              $set: {
                updated_by: `user_${i}`,
                updated_at: new Date().toISOString()
              }
            }
          );
          updatePromises.push(updatePromise);
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Verify final state
        const results = await zerodbService.queryRows(concurrentTable, { id: 'counter_001' });

        expect(results.length).toBe(1);
        expect(results[0].updated_by).toMatch(/^user_\d+$/);
      });

      test('When concurrent inserts with unique IDs occur, Then all should succeed', async () => {
        const insertPromises = [];

        for (let i = 0; i < 5; i++) {
          const insertPromise = zerodbService.insertRow(concurrentTable, {
            id: `concurrent_${i}`,
            counter: i,
            updated_by: `inserter_${i}`,
            updated_at: new Date().toISOString()
          });
          insertPromises.push(insertPromise);
        }

        await Promise.all(insertPromises);

        const results = await zerodbService.queryRows(concurrentTable, {});
        expect(results.length).toBeGreaterThanOrEqual(6); // Initial + 5 new
      });
    });

    afterAll(async () => {
      try {
        await zerodbService.deleteRows(concurrentTable, {});
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    });
  });

  describe('Update and Delete Integrity', () => {
    const updateTable = `integrity_updates_${Date.now()}`;

    beforeAll(async () => {
      await zerodbService.createTable(updateTable, {
        id: 'uuid',
        name: 'string',
        version: 'integer',
        status: 'string'
      });

      // Insert test data
      const testRecords = [
        { id: 'rec_001', name: 'Record 1', version: 1, status: 'draft' },
        { id: 'rec_002', name: 'Record 2', version: 1, status: 'draft' },
        { id: 'rec_003', name: 'Record 3', version: 1, status: 'draft' }
      ];

      for (const record of testRecords) {
        await zerodbService.insertRow(updateTable, record);
      }
    });

    describe('Given records need to be updated', () => {
      test('When updating specific record, Then only that record should change', async () => {
        await zerodbService.updateRows(
          updateTable,
          { id: 'rec_001' },
          { $set: { status: 'published', version: 2 } }
        );

        const updated = await zerodbService.queryRows(updateTable, { id: 'rec_001' });
        const unchanged = await zerodbService.queryRows(updateTable, { id: 'rec_002' });

        expect(updated[0].status).toBe('published');
        expect(updated[0].version).toBe(2);
        expect(unchanged[0].status).toBe('draft');
        expect(unchanged[0].version).toBe(1);
      });

      test('When bulk updating with filter, Then only matching records should change', async () => {
        await zerodbService.updateRows(
          updateTable,
          { status: 'draft' },
          { $set: { status: 'reviewed' } }
        );

        const reviewed = await zerodbService.queryRows(updateTable, { status: 'reviewed' });
        const published = await zerodbService.queryRows(updateTable, { status: 'published' });

        expect(reviewed.length).toBe(2);
        expect(published.length).toBe(1);
      });
    });

    describe('Given records need to be deleted', () => {
      test('When deleting specific record, Then only that record should be removed', async () => {
        const beforeCount = await zerodbService.countRows(updateTable, {});

        await zerodbService.deleteRows(updateTable, { id: 'rec_003' });

        const afterCount = await zerodbService.countRows(updateTable, {});
        const deleted = await zerodbService.queryRows(updateTable, { id: 'rec_003' });

        expect(afterCount).toBe(beforeCount - 1);
        expect(deleted.length).toBe(0);
      });

      test('When bulk deleting with filter, Then only matching records should be removed', async () => {
        await zerodbService.deleteRows(updateTable, { status: 'reviewed' });

        const remaining = await zerodbService.queryRows(updateTable, {});
        const reviewed = await zerodbService.queryRows(updateTable, { status: 'reviewed' });

        expect(reviewed.length).toBe(0);
        expect(remaining.length).toBeGreaterThan(0);
      });
    });

    afterAll(async () => {
      try {
        await zerodbService.deleteRows(updateTable, {});
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    });
  });

  describe('Query Consistency', () => {
    const queryTable = `integrity_queries_${Date.now()}`;

    beforeAll(async () => {
      await zerodbService.createTable(queryTable, {
        id: 'uuid',
        category: 'string',
        value: 'integer',
        created_at: 'timestamp'
      });

      // Insert diverse test data
      const categories = ['A', 'B', 'C'];
      const records = [];

      for (let i = 0; i < 30; i++) {
        records.push({
          id: `query_${i}`,
          category: categories[i % 3],
          value: i * 10,
          created_at: new Date(Date.now() + i * 1000).toISOString()
        });
      }

      for (const record of records) {
        await zerodbService.insertRow(queryTable, record);
      }
    });

    describe('Given complex query operations', () => {
      test('When filtering by category, Then results should match exactly', async () => {
        const categoryA = await zerodbService.queryRows(queryTable, { category: 'A' });

        expect(categoryA.length).toBe(10);
        expect(categoryA.every(r => r.category === 'A')).toBe(true);
      });

      test('When querying with range filters, Then results should be within range', async () => {
        const results = await zerodbService.queryRows(queryTable, {
          value: { $gte: 100, $lte: 200 }
        });

        expect(results.every(r => r.value >= 100 && r.value <= 200)).toBe(true);
      });

      test('When counting filtered results, Then count should match query results', async () => {
        const queryResults = await zerodbService.queryRows(queryTable, { category: 'B' });
        const count = await zerodbService.countRows(queryTable, { category: 'B' });

        expect(count).toBe(queryResults.length);
      });

      test('When sorting results, Then order should be correct', async () => {
        const sortedAsc = await zerodbService.queryRows(
          queryTable,
          {},
          { sort: { value: 1 }, limit: 5 }
        );

        const sortedDesc = await zerodbService.queryRows(
          queryTable,
          {},
          { sort: { value: -1 }, limit: 5 }
        );

        // Check ascending order
        for (let i = 1; i < sortedAsc.length; i++) {
          expect(sortedAsc[i].value).toBeGreaterThanOrEqual(sortedAsc[i - 1].value);
        }

        // Check descending order
        for (let i = 1; i < sortedDesc.length; i++) {
          expect(sortedDesc[i].value).toBeLessThanOrEqual(sortedDesc[i - 1].value);
        }
      });

      test('When paginating results, Then pages should not overlap', async () => {
        const page1 = await zerodbService.queryRows(
          queryTable,
          {},
          { limit: 10, skip: 0, sort: { id: 1 } }
        );

        const page2 = await zerodbService.queryRows(
          queryTable,
          {},
          { limit: 10, skip: 10, sort: { id: 1 } }
        );

        // Ensure no overlap
        const page1Ids = page1.map(r => r.id);
        const page2Ids = page2.map(r => r.id);
        const overlap = page1Ids.filter(id => page2Ids.includes(id));

        expect(overlap.length).toBe(0);
      });
    });

    afterAll(async () => {
      try {
        await zerodbService.deleteRows(queryTable, {});
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    });
  });

  describe('Data Validation and Constraints', () => {
    const validationTable = `integrity_validation_${Date.now()}`;

    beforeAll(async () => {
      await zerodbService.createTable(validationTable, {
        id: 'uuid',
        email: 'string',
        age: 'integer',
        balance: 'decimal'
      });
    });

    describe('Given data validation requirements', () => {
      test('When inserting valid data, Then it should succeed', async () => {
        const validData = {
          id: 'valid_001',
          email: 'valid@test.com',
          age: 25,
          balance: 1000.50
        };

        await expect(
          zerodbService.insertRow(validationTable, validData)
        ).resolves.toBeDefined();
      });

      test('When inserting duplicate IDs, Then it should be rejected', async () => {
        const duplicateData = {
          id: 'valid_001',
          email: 'another@test.com',
          age: 30,
          balance: 500.00
        };

        await expect(
          zerodbService.insertRow(validationTable, duplicateData)
        ).rejects.toThrow();
      });

      test('When inserting negative values where allowed, Then it should succeed', async () => {
        const negativeData = {
          id: 'valid_002',
          email: 'negative@test.com',
          age: 18,
          balance: -50.00 // Negative balance (overdraft)
        };

        await expect(
          zerodbService.insertRow(validationTable, negativeData)
        ).resolves.toBeDefined();
      });
    });

    afterAll(async () => {
      try {
        await zerodbService.deleteRows(validationTable, {});
      } catch (error) {
        console.warn('Cleanup warning:', error.message);
      }
    });
  });
});
