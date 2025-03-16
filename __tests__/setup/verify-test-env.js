/**
 * Test Environment Verification Script
 * 
 * Following Semantic Seed Coding Standards V2.0 for BDD/TDD test environments,
 * this script verifies that our test environment is properly configured
 * by connecting to all three external services (MongoDB, PostgreSQL, and MinIO).
 */

const mongoose = require('mongoose');
const { Client } = require('pg');
const Minio = require('minio');
require('dotenv').config();

// Test environment configuration
const config = {
  mongodb: {
    uri: 'mongodb://opencap:password123@localhost:27017/opencap_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      authSource: 'admin'  // Root user authenticates against admin database
    }
  },
  postgres: {
    host: 'localhost',
    port: 5433,
    database: 'opencap_test',
    user: 'postgres',
    password: 'password'
  },
  minio: {
    endPoint: 'localhost',
    port: 9090,
    useSSL: false,
    accessKey: 'minioadmin',
    secretKey: 'minioadmin',
    testBucket: 'test-bucket'
  }
};

// MongoDB connection test
async function testMongoDBConnection() {
  console.log('Testing MongoDB connection...');
  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    
    // Simple connection test rather than admin operations
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ MongoDB connection successful! Found ${collections.length} collections.`);
    
    // Check for specific collections
    if (collections.some(col => col.name === 'users')) {
      console.log('✅ MongoDB "users" collection verified!');
    }
    
    await mongoose.disconnect();
    return true;
  } catch (err) {
    console.log(`❌ MongoDB connection failed: ${err.message}`);
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    return false;
  }
}

// PostgreSQL connection test
async function testPostgreSQLConnection() {
  console.log('Testing PostgreSQL connection...');
  const client = new Client({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password
  });
  
  try {
    await client.connect();
    
    // Verify by querying server time
    const result = await client.query('SELECT NOW() as now');
    console.log(`✅ PostgreSQL connection successful! Server time: ${result.rows[0].now}`);
    
    // Verify datasets table with file_size column exists
    try {
      const tableResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'datasets' AND column_name = 'file_size'`);
      
      if (tableResult.rows.length > 0) {
        console.log('✅ PostgreSQL "datasets" table with "file_size" column verified!');
      } else {
        console.log('❌ PostgreSQL "datasets" table or "file_size" column not found!');
      }
    } catch (err) {
      console.log(`❌ PostgreSQL schema validation failed: ${err.message}`);
    }
    
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ PostgreSQL connection failed: ${err.message}`);
    try {
      await client.end();
    } catch (e) {
      // Ignore error if client wasn't connected
    }
    return false;
  }
}

// MinIO connection test
async function testMinIOConnection() {
  console.log('Testing MinIO connection...');
  const minioClient = new Minio.Client({
    endPoint: config.minio.endPoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey
  });
  
  try {
    // Check if the test bucket exists
    const exists = await minioClient.bucketExists(config.minio.testBucket);
    if (exists) {
      console.log(`✅ MinIO connection successful! Bucket "${config.minio.testBucket}" exists.`);
      return true;
    } else {
      console.log(`❌ MinIO bucket "${config.minio.testBucket}" not found!`);
      return false;
    }
  } catch (err) {
    console.log(`❌ MinIO connection failed: ${err.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🔍 Verifying test environment connections...');
  console.log('===============================================');
  
  const mongoResult = await testMongoDBConnection();
  console.log('-----------------------------------------------');
  
  const postgresResult = await testPostgreSQLConnection();
  console.log('-----------------------------------------------');
  
  const minioResult = await testMinIOConnection();
  console.log('===============================================');
  
  if (mongoResult && postgresResult && minioResult) {
    console.log('✅ All connections verified successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ Some connections failed. See details above.');
    process.exit(1);
  }
}

// Execute tests
runTests();
