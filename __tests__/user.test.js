/**
 * User Model Tests
 * Following OpenCap TDD principles and Semantic Seed standards
 */
const mongoose = require('mongoose');
const User = require('../models/User');
// Use the shared test database setup instead of creating a new connection
const { clearDB } = require('./setup/testDB');

// We don't need to explicitly connect or disconnect because it's handled by jest.setup.js
beforeEach(async () => {
  // Clear test data before each test
  await clearDB();
});

describe('User Model Test', () => {
  it('create & save user successfully', async () => {
    const userData = {
      userId: 'user1',
      name: 'Test User',
      username: 'testuser', // added username
      email: 'test@example.com',
      password: 'password',
      role: 'admin',
    };
    const validUser = new User(userData);
    const savedUser = await validUser.save();
    expect(savedUser._id).toBeDefined();
    expect(savedUser.userId).toBe(userData.userId);
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.username).toBe(userData.username); // added username assertion
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.password).toBe(userData.password);
    expect(savedUser.role).toBe(userData.role);
  });
});
