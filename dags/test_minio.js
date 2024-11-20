const { Client: MinioClient } = require('minio');

const minioClient = new MinioClient({
    endPoint: '127.0.0.1',
    port: 9000,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin'
});

async function testConnection() {
    try {
        const buckets = await minioClient.listBuckets();
        console.log('Connected to MinIO! Buckets:', buckets);
    } catch (err) {
        console.error('MinIO connection failed:', err);
    }
}

testConnection();
