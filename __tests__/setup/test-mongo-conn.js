/**
 * Standalone MongoDB connection test
 * 
 * This script tests various connection methods to identify 
 * the correct authentication approach
 */

const mongoose = require('mongoose');

// Test different connection strings
const connectionStrings = [
  {
    name: 'Root user from admin DB',
    uri: 'mongodb://opencap:password123@localhost:27017/opencap_test?authSource=admin'
  },
  {
    name: 'testapp user from opencap_test DB',
    uri: 'mongodb://testapp:password123@localhost:27017/opencap_test?authSource=opencap_test'
  },
  {
    name: 'Simplified connection without authSource',
    uri: 'mongodb://testapp:password123@localhost:27017/opencap_test'
  }
];

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  connectTimeoutMS: 5000,
  serverSelectionTimeoutMS: 5000
};

async function testConnection(connInfo) {
  console.log(`\nTesting: ${connInfo.name}`);
  console.log(`URI: ${connInfo.uri}`);
  
  try {
    const conn = await mongoose.createConnection(connInfo.uri, options);
    console.log('✅ Connection successful!');
    
    // Test a simple operation
    const collections = await conn.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(col => console.log(` - ${col.name}`));
    
    await conn.close();
    return true;
  } catch (err) {
    console.log(`❌ Connection failed: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing MongoDB Connection Options...');
  console.log('=======================================');
  
  let success = false;
  
  for (const connInfo of connectionStrings) {
    const result = await testConnection(connInfo);
    if (result) success = true;
  }
  
  if (success) {
    console.log('\n✅ At least one connection method succeeded!');
    process.exit(0);
  } else {
    console.log('\n❌ All connection methods failed!');
    process.exit(1);
  }
}

runTests();
