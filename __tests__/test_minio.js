const { Client } = require('minio');

const minioClient = new Client({
    endPoint: '127.0.0.1',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
});

async function testConnection() {
    try {
        // List all buckets
        const buckets = await minioClient.listBuckets();
        console.log('Existing buckets:', buckets);

        // Create test bucket if it doesn't exist
        const testBucket = 'test-bucket';
        const exists = await minioClient.bucketExists(testBucket);
        if (!exists) {
            await minioClient.makeBucket(testBucket);
            console.log('Created test bucket');
        }

        console.log('MinIO connection successful!');
    } catch (err) {
        console.error('MinIO Error:', err);
    }
}

testConnection();