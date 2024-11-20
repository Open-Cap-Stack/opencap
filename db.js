// utils/db.js
const mongoose = require('mongoose');

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/opencap_test', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false
      });
      console.log('MongoDB Connected...');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB Disconnected...');
  } catch (err) {
    console.error('MongoDB disconnection error:', err);
  }
}

async function clearDB() {
  if (process.env.NODE_ENV === 'test') {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }
}

module.exports = {
  connectDB,
  disconnectDB,
  clearDB
};