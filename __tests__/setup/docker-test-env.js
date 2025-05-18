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
  
  // MongoDB settings - use credentials from docker-compose.yml
  process.env.MONGO_URI = 'mongodb://opencap:password123@mongodb:27017/opencap?authSource=admin';
  
  // PostgreSQL settings - use container service name instead of localhost
  process.env.DATABASE_URL = 'postgres://postgres:password@postgres:5432/opencap';
  process.env.PG_HOST = 'postgres';
  process.env.PG_PORT = '5432';
  process.env.PG_USER = 'postgres';
  process.env.PG_PASSWORD = 'password';
  process.env.PG_DATABASE = 'opencap';
  
  // MinIO settings - use container service name instead of localhost
  process.env.MINIO_ENDPOINT = 'minio';
  process.env.MINIO_PORT = '9000';
  process.env.MINIO_ACCESS_KEY = 'minio';
  process.env.MINIO_SECRET_KEY = 'minio123';
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
      // Use the new MongoDB connection utility with retry logic
      await mongoDbConnection.runCommand('ping', {}, 'admin');
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
    // Try to run all checks, but continue if some fail
    const results = await Promise.allSettled(checks);
    
    // Count successful tests
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    if (failed > 0) {
      console.warn(`⚠️ Warning: ${failed} of ${checks.length} container checks failed. Some tests may be skipped.`);
    }
    
    // As long as MongoDB is running, we can continue with tests
    // We're checking MongoDB specifically in the first check
    if (results[0]?.status === 'fulfilled') {
      console.log('✅ MongoDB is available, proceeding with tests');
      return true;
    } else {
      console.error('❌ MongoDB container is required but not available');
      console.error('docker-compose -f docker-compose.test.yml up -d');
      return false;
    }
  } catch (err) {
    console.error('❌ Error checking containers:', err.message);
    return false;
  }
}

module.exports = {
  setupDockerTestEnv,
  checkDockerContainersRunning
};
