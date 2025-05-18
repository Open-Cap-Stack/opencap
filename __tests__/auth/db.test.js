const mongoose = require('mongoose');
const { connectDB, clearDB, disconnectDB } = require('../setup/testDB');

describe('Database Connection Test', () => {
  beforeAll(async () => {
    console.log('Connecting to test database...');
    await connectDB();
  });

  afterEach(async () => {
    console.log('Clearing test database...');
    await clearDB();
  });

  afterAll(async () => {
    console.log('Disconnecting from test database...');
    await disconnectDB();
  });

  it('should connect to the test database', async () => {
    console.log('Checking database connection state...');
    console.log('Mongoose connection state:', mongoose.connection.readyState);
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
    
    // Test database operations
    const testCollection = mongoose.connection.db.collection('testCollection');
    await testCollection.insertOne({ test: 'data' });
    const count = await testCollection.countDocuments();
    console.log(`Test collection count: ${count}`);
    expect(count).toBe(1);
  });
});
