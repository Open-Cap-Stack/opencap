const { Client: MinioClient } = require('minio');
const { randomUUID } = require('crypto');

describe('MinIO Integration Test', () => {
  let minioClient;
  const bucketName = `test-bucket-${randomUUID()}`;
  
  beforeAll(async () => {
    minioClient = new MinioClient({
      endPoint: 'localhost',
      port: 9090,
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin'
    });

    try {
      // Create test bucket
      const exists = await minioClient.bucketExists(bucketName);
      if (!exists) {
        await minioClient.makeBucket(bucketName);
        console.log(`Created test bucket: ${bucketName}`);
      }
    } catch (error) {
      console.error('MinIO setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up test objects
      const objectsList = await minioClient.listObjects(bucketName, '', true);
      for await (const obj of objectsList) {
        await minioClient.removeObject(bucketName, obj.name);
      }
      
      // Remove test bucket
      await minioClient.removeBucket(bucketName);
      console.log('MinIO cleanup completed');
    } catch (error) {
      console.error('MinIO cleanup failed:', error);
    }
  });

  it('should upload and retrieve objects', async () => {
    const objectName = `test-${randomUUID()}.json`;
    const testData = {
      timestamp: new Date().toISOString(),
      data: { test: 'data' }
    };

    try {
      // Upload test data
      await minioClient.putObject(
        bucketName,
        objectName,
        JSON.stringify(testData),
        { 'Content-Type': 'application/json' }
      );

      // Verify object exists
      const stats = await minioClient.statObject(bucketName, objectName);
      expect(stats.size).toBeGreaterThan(0);

      // Retrieve and verify data
      const dataStream = await minioClient.getObject(bucketName, objectName);
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
      console.error('MinIO test failed:', error);
      throw error;
    }
  });

  it('should handle large objects', async () => {
    const objectName = `large-test-${randomUUID()}.json`;
    const largeData = Array(1000).fill().map((_, i) => ({
      id: i,
      data: 'test'.repeat(100)
    }));

    try {
      await minioClient.putObject(
        bucketName,
        objectName,
        JSON.stringify(largeData),
        { 'Content-Type': 'application/json' }
      );

      const stats = await minioClient.statObject(bucketName, objectName);
      expect(stats.size).toBeGreaterThan(100000); // Should be > 100KB
    } catch (error) {
      console.error('Large object test failed:', error);
      throw error;
    }
  });
});
