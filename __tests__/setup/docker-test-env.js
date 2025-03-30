/**
 * Docker Test Environment Configuration
 * 
 * This module configures test environment variables to connect to Docker containers
 * for external dependencies like MongoDB, PostgreSQL, and MinIO.
 * 
 * Following the BDD/TDD approach from our coding standards, this ensures:
 * 1. Tests are repeatable and isolated from production/development
 * 2. External dependencies are configured identically for all developers
 * 3. Tests can be run in CI/CD pipeline without local setup
 * 
 * Updated for: [Bug] OCDI-301: Fix MongoDB Connection Timeout Issues
 */

// Import the MongoDB connection utility
const mongoDbConnection = require('../../utils/mongoDbConnection');

// Set environment variables for Docker test containers
function setupDockerTestEnv() {
  // The container names and ports should match docker-compose.test.yml
  
  // MongoDB settings - use credentials from docker-compose.test.yml
  process.env.MONGO_URI = 'mongodb://opencap:password123@127.0.0.1:27018/opencap_test?authSource=admin';
  
  // PostgreSQL settings
  process.env.DATABASE_URL = 'postgres://postgres:password@127.0.0.1:5433/opencap_test';
  process.env.PG_HOST = '127.0.0.1';
  process.env.PG_PORT = '5433';
  process.env.PG_USER = 'postgres';
  process.env.PG_PASSWORD = 'password';
  process.env.PG_DATABASE = 'opencap_test';
  
  // MinIO settings
  process.env.MINIO_ENDPOINT = '127.0.0.1';
  process.env.MINIO_PORT = '9090';
  process.env.MINIO_ACCESS_KEY = 'minioadmin';
  process.env.MINIO_SECRET_KEY = 'minioadmin';
  process.env.MINIO_BUCKET = 'test-bucket';
  process.env.MINIO_USE_SSL = 'false';
  
  console.log('✅ Docker test environment variables set');
}

// Check if Docker containers are running
// This function pings the containers to verify they're up
async function checkDockerContainersRunning() {
  const { Client } = require('pg');
  const Minio = require('minio');
  
  const checks = [];
  
  // Check MongoDB - use the improved connection utility with retry logic
  checks.push(new Promise(async (resolve, reject) => {
    try {
      // Connect to MongoDB on port 27018 (updated port)
      const uri = 'mongodb://opencap:password123@127.0.0.1:27018/opencap_test?authSource=admin';
      const options = {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        useNewUrlParser: true,
        useUnifiedTopology: true
      };
      
      // Test connection with improved retry logic
      await mongoDbConnection.connectWithRetry(uri, options, 3, 500);
      console.log('✅ MongoDB test container is running');
      resolve(true);
    } catch (err) {
      console.error('❌ MongoDB test container not available:', err.message);
      reject(new Error('MongoDB test container not running'));
    }
  }));
  
  // Check PostgreSQL
  checks.push(new Promise(async (resolve, reject) => {
    const pgClient = new Client({
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      connectionTimeoutMillis: 5000
    });
    
    try {
      await pgClient.connect();
      const res = await pgClient.query('SELECT NOW()');
      await pgClient.end();
      console.log('✅ PostgreSQL test container is running');
      resolve(true);
    } catch (err) {
      console.error('❌ PostgreSQL test container not available:', err.message);
      reject(new Error('PostgreSQL test container not running'));
    }
  }));
  
  // Check MinIO
  checks.push(new Promise(async (resolve, reject) => {
    const minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: parseInt(process.env.MINIO_PORT),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY
    });
    
    try {
      await minioClient.bucketExists(process.env.MINIO_BUCKET);
      console.log('✅ MinIO test container is running');
      resolve(true);
    } catch (err) {
      console.error('❌ MinIO test container not available:', err.message);
      reject(new Error('MinIO test container not running'));
    }
  }));
  
  try {
    await Promise.all(checks);
    return true;
  } catch (err) {
    console.error('❌ Not all containers are running. Please start them with:');
    console.error('docker-compose -f docker-compose.test.yml up -d');
    return false;
  }
}

module.exports = {
  setupDockerTestEnv,
  checkDockerContainersRunning
};
