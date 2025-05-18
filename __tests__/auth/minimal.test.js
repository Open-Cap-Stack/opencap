const mongoose = require('mongoose');
const User = require('../../models/User');

// Import test database utilities
const { connectDB, clearDB, disconnectDB } = require('../setup/testDB');

describe('Minimal Test', () => {
  beforeAll(async () => {
    // Connect to the test database
    await connectDB();
  });

  afterEach(async () => {
    // Clear test data
    await clearDB();
  });

  afterAll(async () => {
    // Disconnect from the test database
    await disconnectDB();
  });

  it('should connect to the database and create a user', async () => {
    // Create a test user
    const testUser = new User({
      userId: new mongoose.Types.ObjectId().toString(),
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: 'user',
      companyId: 'company123'
    });

    // Save the user
    const savedUser = await testUser.save();

    // Verify the user was saved
    expect(savedUser).toBeDefined();
    expect(savedUser.email).toBe('test@example.com');
    expect(savedUser.firstName).toBe('Test');
    expect(savedUser.lastName).toBe('User');
  });
});
