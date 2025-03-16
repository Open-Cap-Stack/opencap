const axios = require('axios');
const { Client: MinioClient } = require('minio');
const MockAdapter = require('axios-mock-adapter');

describe('MinIO Data Storage Integration Test', () => {
  let mock;
  let minioClient;
  const testBucket = 'test-bucket';
  const airflowConfig = {
    baseURL: 'http://localhost:8080/api/v1', // Changed from 8081 to 8080
    auth: {
      username: 'admin',
      password: 'admin_password'
    },
    headers: {
      'Content-Type': 'application/json'
    }
  };

  beforeAll(async () => {
    // Setup MinIO client
    minioClient = new MinioClient({
      endPoint: 'localhost',
      port: 9090,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin'
    });

    // Setup axios mock
    mock = new MockAdapter(axios);

    try {
      // Ensure test bucket exists
      const bucketExists = await minioClient.bucketExists(testBucket);
      if (!bucketExists) {
        await minioClient.makeBucket(testBucket);
        console.log('Created test bucket');
      }
    } catch (error) {
      console.error('Setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    mock.restore();
    try {
      // Clean up test data
      const objectsList = await minioClient.listObjects(testBucket, '', true);
      for await (const obj of objectsList) {
        await minioClient.removeObject(testBucket, obj.name);
      }
      await minioClient.removeBucket(testBucket);
      console.log('Cleanup completed');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  beforeEach(() => {
    mock.reset();
  });

  it('should trigger the DAG and store the dataset in MinIO', async () => {
    const dagId = 'test_dag';
    const testData = {
      timestamp: new Date().toISOString(),
      records: [
        { id: 1, value: 'test1' },
        { id: 2, value: 'test2' }
      ]
    };
    const fileName = `test-${Date.now()}.json`;

    // Mock Airflow DAG trigger response
    mock.onPost(`${airflowConfig.baseURL}/dags/${dagId}/dagRuns`)
      .reply(200, {
        conf: {
          bucket: testBucket,
          file_name: fileName,
          data: testData
        },
        dag_id: dagId,
        dag_run_id: `manual__${new Date().toISOString()}`,
        state: 'queued'
      });

    try {
      // Trigger DAG
      const response = await axios.post(
        `${airflowConfig.baseURL}/dags/${dagId}/dagRuns`,
        {
          conf: {
            bucket: testBucket,
            file_name: fileName,
            data: testData
          }
        },
        airflowConfig
      );

      expect(response.status).toBe(200);
      expect(response.data.dag_id).toBe(dagId);

      // Upload test data directly to MinIO
      await minioClient.putObject(
        testBucket,
        fileName,
        JSON.stringify(testData),
        { 'Content-Type': 'application/json' }
      );

      // Verify data in MinIO
      const dataStream = await minioClient.getObject(testBucket, fileName);
      let retrievedData = '';

      await new Promise((resolve, reject) => {
        dataStream.on('data', chunk => retrievedData += chunk);
        dataStream.on('end', () => {
          try {
            const parsed = JSON.parse(retrievedData);
            expect(parsed).toEqual(testData);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        dataStream.on('error', reject);
      });

    } catch (error) {
      console.error('Test failed:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  });

  it('should handle large datasets', async () => {
    const largeData = {
      timestamp: new Date().toISOString(),
      records: Array(1000).fill().map((_, i) => ({
        id: i,
        value: `test${i}`,
        data: 'x'.repeat(1000)
      }))
    };
    const fileName = `large-test-${Date.now()}.json`;

    try {
      // Upload large dataset
      await minioClient.putObject(
        testBucket,
        fileName,
        JSON.stringify(largeData),
        { 'Content-Type': 'application/json' }
      );

      // Verify file stats
      const stats = await minioClient.statObject(testBucket, fileName);
      expect(stats.size).toBeGreaterThan(1000000); // Should be > 1MB

      // Verify data integrity
      const dataStream = await minioClient.getObject(testBucket, fileName);
      let retrievedData = '';

      await new Promise((resolve, reject) => {
        dataStream.on('data', chunk => retrievedData += chunk);
        dataStream.on('end', () => {
          try {
            const parsed = JSON.parse(retrievedData);
            expect(parsed.records.length).toBe(largeData.records.length);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
        dataStream.on('error', reject);
      });
    } catch (error) {
      console.error('Large dataset test failed:', error);
      throw error;
    }
  });

  it('should handle concurrent uploads', async () => {
    const numberOfUploads = 5;
    const uploads = Array(numberOfUploads).fill().map(async (_, i) => {
      const fileName = `concurrent-test-${i}-${Date.now()}.json`;
      const data = { id: i, timestamp: new Date().toISOString() };

      await minioClient.putObject(
        testBucket,
        fileName,
        JSON.stringify(data),
        { 'Content-Type': 'application/json' }
      );

      return fileName;
    });

    try {
      const fileNames = await Promise.all(uploads);
      
      // Verify all files exist
      for (const fileName of fileNames) {
        const exists = await minioClient.statObject(testBucket, fileName)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      }
    } catch (error) {
      console.error('Concurrent uploads test failed:', error);
      throw error;
    }
  });
});
