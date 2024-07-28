const mongoose = require('mongoose');
require('dotenv').config();
const opencap = process.env.MONGODB_URI;
const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect('mongodb://localhost:27017/opencap_test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('MongoDB Disconnected...');
  }
};

module.exports = { connectDB, disconnectDB };
