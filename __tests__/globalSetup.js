require('dotenv').config(); // Ensure dotenv loads
const mongoose = require('mongoose');

async function connectToMongoDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/opencap_test';
  if (!mongoUri) {
    throw new Error('MongoDB URI is not defined.');
  }
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB for setup.');
}

async function dropDatabaseWithRetry() {
  let attempts = 3;
  while (attempts > 0) {
    try {
      await mongoose.connection.dropDatabase();
      console.log('MongoDB test database dropped successfully.');
      return;
    } catch (error) {
      if (error.codeName === 'DatabaseDropPending') {
        console.log('Database drop pending, retrying...');
        attempts -= 1;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Failed to drop MongoDB test database.');
}

module.exports = async () => {
  await connectToMongoDB();
  await dropDatabaseWithRetry();
  await mongoose.connection.close();
  console.log('MongoDB connection closed after setup.');
};
