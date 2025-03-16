/**
 * MongoDB Test Connection Script
 * Following Semantic Seed Venture Studio Coding Standards V2.0
 */

const { MongoClient } = require('mongodb');

// Test different connection configurations
const testConnections = async () => {
  // Connection options to try, using credentials from init-mongo.sh
  const connectionStrings = [
    {
      name: 'OpenCap user from Admin DB',
      uri: 'mongodb://opencap:password123@127.0.0.1:27017/opencap_test?authSource=admin'
    },
    {
      name: 'TestApp user from Test DB',
      uri: 'mongodb://testapp:password123@127.0.0.1:27017/opencap_test?authSource=opencap_test'
    },
    {
      name: 'OpenCap user with DirectConnection param',
      uri: 'mongodb://opencap:password123@127.0.0.1:27017/opencap_test?directConnection=true&authSource=admin'
    }
  ];
  
  // Test each connection string
  for (const conn of connectionStrings) {
    console.log(`\nTrying connection: ${conn.name}`);
    try {
      const client = new MongoClient(conn.uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000
      });
      
      await client.connect();
      console.log('✅ Connection successful!');
      
      // Test database access
      const db = client.db('opencap_test');
      const collections = await db.listCollections().toArray();
      console.log(`Available collections: ${collections.map(c => c.name).join(', ')}`);
      
      await client.close();
    } catch (err) {
      console.error(`❌ Connection failed: ${err.message}`);
    }
  }
};

// Run the test
testConnections()
  .then(() => console.log('\nConnection tests completed'))
  .catch(err => console.error('Error running tests:', err))
  .finally(() => process.exit(0));
