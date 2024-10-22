const { Client } = require('pg');

const client = new Client({
  user: 'lakehouse_user',
  host: 'localhost',
  database: 'lakehouse_metadata',
  password: 'password',
  port: 5432,
});

describe('PostgreSQL Integration Test', () => {
  beforeAll(done => {
    client.connect(err => {
      if (err) return done(err);
      done();
    });
  });

  test('should log a new dataset to the metadata database', async () => {
    const query =
      'INSERT INTO datasets (dataset_name, description, storage_location) VALUES ($1, $2, $3) RETURNING *';
    const values = ['test_dataset', 'This is a test dataset', 's3://lakehouse-bucket/raw/test-file.csv'];

    const res = await client.query(query, values);
    expect(res.rows.length).toBe(1);
    console.log('Dataset logged:', res.rows[0]);
  });

  afterAll(done => {
    // Clean up the dataset after test
    client.query('DELETE FROM datasets WHERE dataset_name = $1', ['test_dataset'], err => {
      if (err) return done(err);
      client.end(done);
    });
  });
});
