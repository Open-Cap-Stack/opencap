require('dotenv').config();  // Load the .env file
const mongoose = require("mongoose");
const { Client } = require('pg');

module.exports = async () => {
  // Set up MongoDB
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/opencap_test';  // Fallback to hardcoded URI
  if (!mongoUri) {
    throw new Error('MongoDB URI is not defined.');
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Drop the MongoDB database to clean up before tests
  await mongoose.connection.dropDatabase();

  // Set up PostgreSQL for metadata management
  const pgClient = new Client({
    user: process.env.PG_USER || 'lakehouse_user',
    host: process.env.PG_HOST || 'localhost',
    database: process.env.PG_DATABASE || 'lakehouse_metadata',
    password: process.env.PG_PASSWORD || 'password',
    port: process.env.PG_PORT || 5432,
  });

  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL database.');

    // Clean up PostgreSQL data before tests (if necessary)
    await pgClient.query('TRUNCATE TABLE datasets, dataset_schema, ingestion_logs RESTART IDENTITY CASCADE;');
    console.log('PostgreSQL tables truncated.');

  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    throw new Error('PostgreSQL connection failed.');
  } finally {
    await pgClient.end();
  }

  // Set up MinIO client (mock or real)
  process.env.MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost';
  process.env.MINIO_PORT = process.env.MINIO_PORT || '9000';
  process.env.MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'your-access-key';
  process.env.MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'your-secret-key';
  console.log('MinIO environment variables set.');

  // Set up Airflow (mock or real)
  process.env.AIRFLOW_BASE_URL = process.env.AIRFLOW_BASE_URL || 'http://localhost:8080';
  process.env.AIRFLOW_USERNAME = process.env.AIRFLOW_USERNAME || 'admin';
  process.env.AIRFLOW_PASSWORD = process.env.AIRFLOW_PASSWORD || 'admin_password';
  console.log('Airflow environment variables set.');

  // Close the MongoDB connection
  await mongoose.connection.close();
};
