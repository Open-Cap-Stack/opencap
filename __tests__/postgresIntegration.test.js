const { Client } = require('pg');
const { randomUUID } = require('crypto');

describe('PostgreSQL Integration Tests', () => {
  let pgClient;
  const testId = randomUUID();

  beforeAll(async () => {
    pgClient = new Client({
      user: 'postgres',
      host: 'localhost',
      database: 'opencap_test',
      password: 'password',
      port: 5433, // Updated port to match the Docker container port
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
        name, 
        description, 
        file_size,
        format,
        status
      ) VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `;
    
    const insertResult = await pgClient.query(insertQuery, [
      datasetName,
      'Test dataset',
      1024,
      'parquet',
      'active'
    ]);

    expect(insertResult.rows[0].name).toBe(datasetName);

    // Read
    const readResult = await pgClient.query(
      'SELECT * FROM datasets WHERE name = $1',
      [datasetName]
    );
    expect(readResult.rows[0].file_size).toEqual("1024");

    // Update
    await pgClient.query(
      'UPDATE datasets SET description = $1 WHERE name = $2',
      ['Updated test dataset', datasetName]
    );

    const updatedResult = await pgClient.query(
      'SELECT * FROM datasets WHERE name = $1',
      [datasetName]
    );
    expect(updatedResult.rows[0].description).toBe('Updated test dataset');

    // Delete
    await pgClient.query('DELETE FROM datasets WHERE name = $1', [datasetName]);

    const deleteCheckResult = await pgClient.query(
      'SELECT * FROM datasets WHERE name = $1',
      [datasetName]
    );
    expect(deleteCheckResult.rows.length).toBe(0);
  });

  it('should handle JSON data storage and retrieval', async () => {
    const reportId = `report-${testId}`;
    
    const reportData = {
      quarter: 'Q1',
      year: 2024,
      metrics: {
        revenue: 1500000,
        costs: 750000,
        profit: 750000
      }
    };
    
    await pgClient.query(`
      INSERT INTO financial_reports (
        report_id, 
        type, 
        data,
        total_revenue,
        total_expenses,
        net_income,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      reportId,
      'quarterly',
      reportData,
      reportData.metrics.revenue,
      reportData.metrics.costs,
      reportData.metrics.profit,
      'published'
    ]);
    
    const result = await pgClient.query(
      'SELECT * FROM financial_reports WHERE report_id = $1',
      [reportId]
    );
    
    expect(result.rows[0].data).toEqual(reportData);
    expect(result.rows[0].data.metrics.revenue).toBe(1500000);
    
    // Clean up
    await pgClient.query('DELETE FROM financial_reports WHERE report_id = $1', [reportId]);
  });
});
