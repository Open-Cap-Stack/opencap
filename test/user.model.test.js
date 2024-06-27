const mongoose = require('mongoose');
const User = require('../models/User');
const connectDB = require('../db');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('User Model Test', () => {
  it('create & save user successfully', async () => {
    const userData = { userId: 'unique_user_id_1', name: 'John Doe', email: 'john@example.com', password: 'hashed_password', role: 'admin' };
    const validUser = new User(userData);
    const savedUser = await validUser.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.userId).toBe(userData.userId);
    expect(savedUser.name).toBe(userData.name);
    expect(savedUser.email).toBe(userData.email);
    expect(savedUser.password).toBe(userData.password);
    expect(savedUser.role).toBe(userData.role);
  });

  it('should not save user with undefined fields', async () => {
    const userWithoutRequiredField = new User({ userId: 'unique_user_id_2' });
    let err;
    try {
      const savedUserWithoutRequiredField = await userWithoutRequiredField.save();
      error = savedUserWithoutRequiredField;
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.name).toBeDefined();
    expect(err.errors.email).toBeDefined();
    expect(err.errors.password).toBeDefined();
    expect(err.errors.role).toBeDefined();
  });
});
