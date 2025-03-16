/**
 * Simple MongoDB connection test script
 * Following Semantic Seed Venture Studio Coding Standards
 */

const { MongoClient } = require('mongodb');

// Create a MongoDB connection string with the root user
const uri = 'mongodb://opencap:password123@localhost:27017/opencap_test?authSource=admin';

async function testMongoConnection() {
  console.log('Testing MongoDB connection...');
  console.log('Connection URI:', uri);
  
  try {
    // Create a new MongoClient
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });

    // Connect to the MongoDB server
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');

    // List all databases
    const adminDb = client.db('admin');
    const dbs = await adminDb.admin().listDatabases();
    console.log('Available databases:');
    dbs.databases.forEach(db => console.log(` - ${db.name}`));

    // Try to access the test database
    const testDb = client.db('opencap_test');
    const collections = await testDb.listCollections().toArray();
    console.log('\nCollections in opencap_test:');
    collections.forEach(coll => console.log(` - ${coll.name}`));

    // Close the connection
    await client.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Error details:', error);
  }
}

// Run the test
testMongoConnection();
