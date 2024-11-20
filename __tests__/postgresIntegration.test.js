const { Client } = require('pg');
const { randomUUID } = require('crypto');

describe('PostgreSQL Integration Tests', () => {
  let pgClient;
  const testId = randomUUID();

  beforeAll(async () => {
    pgClient = new Client({
      user: 'lakehouse_user',
      host: 'localhost',
      database: 'lakehouse_metadata',
      password: 'password',
      port: 5432,
    });
    await pgClient.connect();
  });

  afterAll(async () => {
    await pgClient.end();
  });

  it('should handle metadata CRUD operations', async () => {
    const datasetName = `test-${testId}`;
    
    // Create
    const insertQuery = `
      INSERT INTO datasets (
        dataset_name, 
        storage_location, 
        description, 
        file_size, 
        record_count,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    
    const testMetadata = {
      schema: { fields: ['name', 'value'] },
      partitioning: 'daily',
      format: 'parquet'
    };

    const insertResult = await pgClient.query(insertQuery, [
      datasetName,
      's3://test-bucket/test.parquet',
      'Test dataset',
      1024,
      100,
      testMetadata
    ]);

    expect(insertResult.rows[0].dataset_name).toBe(datasetName);

    // Read
    const readResult = await pgClient.query(
      'SELECT * FROM datasets WHERE dataset_name = $1',
      [datasetName]
    );
    expect(readResult.rows[0].metadata).toEqual(testMetadata);

    // Update
    const updateResult = await pgClient.query(
      'UPDATE datasets SET record_count = $1 WHERE dataset_name = $2 RETURNING *',
      [200, datasetName]
    );
    expect(updateResult.rows[0].record_count).toBe(200);

    // Delete
    const deleteResult = await pgClient.query(
      'DELETE FROM datasets WHERE dataset_name = $1 RETURNING *',
      [datasetName]
    );
    expect(deleteResult.rows[0].dataset_name).toBe(datasetName);
  });

  it('should handle concurrent operations', async () => {
    const operations = Array(5).fill().map(async (_, i) => {
      const name = `concurrent-test-${testId}-${i}`;
      await pgClient.query(
        'INSERT INTO datasets (dataset_name, storage_location) VALUES ($1, $2)',
        [name, `s3://test-bucket/${name}.parquet`]
      );
    });

    await Promise.all(operations);
    
    const result = await pgClient.query(
      'SELECT COUNT(*) FROM datasets WHERE dataset_name LIKE $1',
      [`concurrent-test-${testId}-%`]
    );
    expect(Number(result.rows[0].count)).toBe(5);
  });
});
