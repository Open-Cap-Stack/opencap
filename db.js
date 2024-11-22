// utils/db.js
const mongoose = require('mongoose');

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/opencap_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
        // Add timeouts to prevent hanging connections
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('MongoDB Connected...');
      return conn;
    }
    return mongoose.connection;
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Ensure connection is closed on error
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await Promise.race([
        mongoose.connection.close(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection close timeout')), 5000)
        )
      ]);
      console.log('MongoDB Disconnected...');
    }
  } catch (err) {
    console.error('MongoDB disconnection error:', err);
    // Force close if normal close fails
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.destroy();
    }
  }
}

async function clearDB() {
  try {
    if (process.env.NODE_ENV === 'test') {
      const collections = mongoose.connection.collections;
      const clearPromises = Object.values(collections).map(collection => 
        collection.deleteMany({})
      );
      await Promise.all(clearPromises);
    }
  } catch (err) {
    console.error('Error clearing database:', err);
    throw err;
  }
}

// Add cleanup handler for process termination
process.on('SIGTERM', async () => {
  await disconnectDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  disconnectDB,
  clearDB
};