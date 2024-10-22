const mongoose = require('mongoose');
const { connectDB } = require('../db');
const User = require('../models/User');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
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
