/**
 * Database cleanup script for test environment
 * Following Semantic Seed Venture Studio Coding Standards V2.0
 */

const { MongoClient } = require('mongodb');

// MongoDB connection URI
const uri = 'mongodb://opencap:password123@localhost:27017/opencap_test?authSource=admin';

async function cleanTestDatabase() {
  console.log('Cleaning test database...');
  
  try {
    // Create a new MongoClient
    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Connect to the MongoDB server
    await client.connect();
    console.log('✅ Connected to MongoDB');

    // Get reference to the database
    const db = client.db('opencap_test');
    
    // Get list of all collections
    const collections = await db.listCollections().toArray();
    
    // Drop each collection
    for (const collection of collections) {
      console.log(`Dropping collection: ${collection.name}`);
      await db.collection(collection.name).drop().catch(err => {
        console.log(`Warning when dropping ${collection.name}: ${err.message}`);
      });
    }

    console.log('✅ All collections dropped successfully');
    
    // Close the connection
    await client.close();
    console.log('Connection closed');
    
    return true;
  } catch (error) {
    console.error('❌ Error cleaning test database:', error.message);
    return false;
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanTestDatabase()
    .then(() => {
      console.log('Database cleanup complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('Database cleanup failed:', err);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = cleanTestDatabase;
}
