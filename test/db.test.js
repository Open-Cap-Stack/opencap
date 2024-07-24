const { connectDB, disconnectDB } = require('../db');
const mongoose = require('mongoose');

describe('Database Connection', () => {
  it('should connect and disconnect from the database', async () => {
    await connectDB();
    expect(mongoose.connection.readyState).toBe(1); // Check if connected
    await disconnectDB();
    expect(mongoose.connection.readyState).toBe(0); // Check if disconnected
  });
});
